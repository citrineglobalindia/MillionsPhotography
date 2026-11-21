-- Million's Photography & Films — Supabase schema v2
-- Applied to project fujbndmgnaikmkdacqdk. Re-runnable on a fresh project (SQL editor), then run seed.sql.

create extension if not exists "pgcrypto";
create extension if not exists "pg_net" schema extensions;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- =========================================================
-- Staff, invites, roles
-- =========================================================
create table if not exists public.staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  role text not null default 'editor' check (role in ('owner','admin','editor')),
  created_at timestamptz not null default now()
);
create table if not exists public.staff_invites (
  email text primary key check (email = lower(email)),
  role text not null default 'editor' check (role in ('owner','admin','editor')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create or replace function public.staff_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.staff where user_id = auth.uid();
$$;
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff where user_id = auth.uid());
$$;
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff where user_id = auth.uid() and role in ('owner','admin'));
$$;
create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff where user_id = auth.uid() and role = 'owner');
$$;

-- Called by the admin after sign-in: already staff → true; invited → joins with the invited role; otherwise false.
create or replace function public.claim_first_admin() returns boolean
language plpgsql security definer set search_path = public as $$
declare v_email text; v_role text;
begin
  if auth.uid() is null then return false; end if;
  if exists (select 1 from public.staff where user_id = auth.uid()) then return true; end if;
  select lower(email) into v_email from auth.users where id = auth.uid() and email_confirmed_at is not null;
  if v_email is null then return false; end if;
  select role into v_role from public.staff_invites where email = v_email;
  if v_role is null then return false; end if;
  insert into public.staff(user_id, email, role) values (auth.uid(), v_email, v_role);
  delete from public.staff_invites where email = v_email;
  insert into public.audit_log(user_id, email, action, table_name, summary) values (auth.uid(), v_email, 'join', 'staff', 'Joined the studio team as ' || v_role);
  return true;
end $$;

-- =========================================================
-- Content
-- =========================================================
create table if not exists public.settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.hero_slides (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'image' check (kind in ('image','video')),
  image jsonb, video_url text, poster jsonb,
  eyebrow text, heading text, button_label text, button_link text,
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  image jsonb not null,
  alt text not null default '',
  categories text[] not null default '{}',
  featured boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.films (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null, subtitle text, duration text,
  youtube_id text check (youtube_id is null or youtube_id = '' or youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  cover jsonb,
  featured boolean not null default true,
  published boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9-]+$'),
  names text not null, kind text not null default 'Wedding',
  setting text, intro text, body text,
  cover jsonb, hero jsonb,
  gallery jsonb not null default '[]'::jsonb,
  youtube_id text,
  published boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  q text not null, a text not null,
  published boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.team (
  id uuid primary key default gen_random_uuid(),
  name text not null, role text, bio text, photo jsonb,
  is_founder boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

-- =========================================================
-- Leads (CRM)
-- =========================================================
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  ref text unique,
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 120),
  partner text check (char_length(partner) <= 120),
  email text check (char_length(email) <= 200),
  phone text check (char_length(phone) <= 40),
  event_type text check (char_length(event_type) <= 80),
  event_date date,
  location text check (char_length(location) <= 200),
  message text check (char_length(message) <= 4000),
  status text not null default 'new' check (status in ('new','contacted','meeting','quoted','booked','lost')),
  source text check (char_length(source) <= 120),
  utm jsonb check (utm is null or pg_column_size(utm) < 4000),
  page text check (char_length(page) <= 500),
  referrer text check (char_length(referrer) <= 500),
  notes jsonb not null default '[]'::jsonb,
  follow_up date,
  value numeric check (value is null or value >= 0),
  updated_at timestamptz not null default now()
);
create index if not exists leads_created_idx on public.leads(created_at desc);
create index if not exists leads_status_idx on public.leads(status);
create index if not exists leads_followup_idx on public.leads(follow_up) where follow_up is not null;
create sequence if not exists public.lead_ref_seq start 1001;

-- Public submissions: reference number, normalisation and anti-spam rate limits
create or replace function public.leads_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare digits text;
begin
  new.ref := 'MPF-' || nextval('public.lead_ref_seq');
  new.email := nullif(lower(trim(new.email)), '');
  digits := regexp_replace(coalesce(new.phone, ''), '\D', '', 'g');
  if not public.is_staff() then
    new.status := 'new'; new.notes := '[]'::jsonb; new.value := null; new.follow_up := null;
    if new.email is not null and new.email !~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' then raise exception 'Invalid email' using errcode = '22023'; end if;
    if exists (select 1 from public.leads where created_at > now() - interval '10 minutes'
               and ((new.email is not null and email = new.email) or (digits <> '' and regexp_replace(coalesce(phone,''), '\D', '', 'g') = digits))) then
      raise exception 'Duplicate enquiry — we already have your details' using errcode = 'P0001';
    end if;
    if (select count(*) from public.leads where created_at > now() - interval '1 minute') >= 20 then
      raise exception 'Too many enquiries right now, please try again shortly' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists leads_before_insert on public.leads;
create trigger leads_before_insert before insert on public.leads for each row execute function public.leads_before_insert();

-- =========================================================
-- Activity log
-- =========================================================
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  user_id uuid, email text,
  action text not null, table_name text, row_id text, summary text
);
create index if not exists audit_at_idx on public.audit_log(at desc);

create or replace function public.audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
declare r jsonb; o jsonb; label text; who text;
begin
  r := to_jsonb(coalesce(new, old));
  o := case when tg_op = 'UPDATE' then to_jsonb(old) else null end;
  label := coalesce(r->>'names', r->>'title', r->>'name', r->>'q', r->>'alt', r->>'heading', r->>'key', r->>'email', '');
  select email into who from public.staff where user_id = auth.uid();
  if tg_table_name = 'leads' then
    if tg_op = 'INSERT' and auth.uid() is null then
      who := 'website'; label := coalesce(r->>'name','') || coalesce(' & ' || (r->>'partner'), '') || ' (' || coalesce(r->>'ref','') || ')';
    elsif tg_op = 'UPDATE' and (o->>'status') is distinct from (r->>'status') then
      label := label || ': ' || (o->>'status') || ' → ' || (r->>'status');
    end if;
  end if;
  insert into public.audit_log(user_id, email, action, table_name, row_id, summary)
  values (auth.uid(), who, lower(tg_op), tg_table_name, coalesce(r->>'id', r->>'key'), left(label, 200));
  return null;
end $$;

-- updated_at
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

do $$ declare t text; begin
  foreach t in array array['settings','hero_slides','media','films','stories','faqs','team','leads'] loop
    execute format('drop trigger if exists %I on public.%I', t||'_touch', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.touch_updated_at()', t||'_touch', t);
    execute format('drop trigger if exists %I on public.%I', t||'_audit', t);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.audit_row()', t||'_audit', t);
  end loop;
end $$;

-- =========================================================
-- Row level security
-- =========================================================
alter table public.staff enable row level security;
alter table public.staff_invites enable row level security;
alter table public.settings enable row level security;
alter table public.hero_slides enable row level security;
alter table public.media enable row level security;
alter table public.films enable row level security;
alter table public.stories enable row level security;
alter table public.faqs enable row level security;
alter table public.team enable row level security;
alter table public.leads enable row level security;
alter table public.audit_log enable row level security;

create policy staff_read on public.staff for select to authenticated using (public.is_staff());
create policy staff_owner_update on public.staff for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy staff_owner_delete on public.staff for delete to authenticated using (public.is_owner() and user_id <> auth.uid());
create policy staff_self_name on public.staff for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and role = public.staff_role());
create policy invites_admin_all on public.staff_invites for all to authenticated using (public.is_admin()) with check (public.is_admin() and (role <> 'owner' or public.is_owner()));

create policy settings_read on public.settings for select using (true);
create policy hero_read on public.hero_slides for select using (active or public.is_staff());
create policy media_read on public.media for select using (true);
create policy films_read on public.films for select using (published or public.is_staff());
create policy stories_read on public.stories for select using (published or public.is_staff());
create policy faqs_read on public.faqs for select using (published or public.is_staff());
create policy team_read on public.team for select using (true);
do $$ declare t text; begin
  foreach t in array array['settings','hero_slides','media','films','stories','faqs','team'] loop
    execute format('create policy %I on public.%I for all to authenticated using (public.is_staff()) with check (public.is_staff())', t||'_staff_write', t);
  end loop;
end $$;

create policy leads_public_insert on public.leads for insert to anon, authenticated with check (true);
create policy leads_staff_read on public.leads for select to authenticated using (public.is_staff());
create policy leads_staff_update on public.leads for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy leads_admin_delete on public.leads for delete to authenticated using (public.is_admin());

create policy audit_staff_read on public.audit_log for select to authenticated using (public.is_staff());

-- Lock down direct access to helper functions
revoke all on function public.leads_before_insert() from public, anon, authenticated;
revoke all on function public.audit_row() from public, anon, authenticated;
revoke all on function public.claim_first_admin() from public, anon;
grant execute on function public.claim_first_admin() to authenticated;

-- =========================================================
-- Realtime: new enquiries appear live in the admin
-- =========================================================
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'leads') then
    execute 'alter publication supabase_realtime add table public.leads';
  end if;
end $$;

-- =========================================================
-- Storage
-- =========================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 52428800, array['image/webp','image/jpeg','image/png','video/mp4','video/webm'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
create policy media_staff_insert on storage.objects for insert to authenticated with check (bucket_id = 'media' and public.is_staff());
create policy media_staff_update on storage.objects for update to authenticated using (bucket_id = 'media' and public.is_staff());
create policy media_staff_delete on storage.objects for delete to authenticated using (bucket_id = 'media' and public.is_staff());

-- =========================================================
-- Email alerts for new enquiries (Edge Function "notify-lead")
-- =========================================================
create table if not exists private.config (key text primary key, value text not null);
insert into private.config(key, value) values ('webhook_secret', encode(gen_random_bytes(24), 'hex')) on conflict (key) do nothing;
-- set to your project's functions URL
insert into private.config(key, value) values ('functions_url', 'https://fujbndmgnaikmkdacqdk.supabase.co/functions/v1') on conflict (key) do nothing;

create or replace function private.notify_new_lead() returns trigger
language plpgsql security definer set search_path = public, private as $$
declare secret text; base text;
begin
  select value into secret from private.config where key = 'webhook_secret';
  select value into base from private.config where key = 'functions_url';
  if base is null then return null; end if;
  perform net.http_post(
    url := base || '/notify-lead',
    body := jsonb_build_object('lead_id', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', secret),
    timeout_milliseconds := 5000);
  return null;
exception when others then return null;  -- never block a submission because of alerts
end $$;
drop trigger if exists leads_notify on public.leads;
create trigger leads_notify after insert on public.leads for each row execute function private.notify_new_lead();


-- =========================================================
-- v2.1 — applied after initial migration
-- =========================================================
revoke execute on function public.staff_role() from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_owner() from public, anon;
grant execute on function public.staff_role(), public.is_admin(), public.is_owner() to authenticated;
revoke all on function public.touch_updated_at() from public, anon, authenticated;

-- write policies split from reads (performance)
do $$ declare t text; begin
  foreach t in array array['settings','hero_slides','media','films','stories','faqs','team'] loop
    execute format('drop policy if exists %I on public.%I', t||'_staff_write', t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select public.is_staff()))', t||'_staff_ins', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()))', t||'_staff_upd', t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select public.is_staff()))', t||'_staff_del', t);
  end loop;
end $$;
drop policy if exists staff_owner_delete on public.staff;
create policy staff_owner_delete on public.staff for delete to authenticated using ((select public.is_owner()) and user_id <> (select auth.uid()));
create index if not exists staff_invites_invited_by_idx on public.staff_invites(invited_by);

-- notification settings are private
drop policy if exists settings_read on public.settings;
create policy settings_read on public.settings for select using (key not in ('notifications') or (select public.is_staff()));

-- alert bookkeeping (one notification per lead)
create table if not exists public.lead_notifications (
  lead_id uuid primary key references public.leads(id) on delete cascade,
  at timestamptz not null default now(),
  studio_sent boolean not null default false, autoreply_sent boolean not null default false, detail text);
alter table public.lead_notifications enable row level security;
create policy lead_notif_staff_read on public.lead_notifications for select to authenticated using ((select public.is_staff()));
insert into public.settings(key, value) values ('notifications', '{"emails":["mirrorlessbusiness@gmail.com"],"autoreply":true}'::jsonb) on conflict (key) do nothing;

-- explicit role grants (newer Supabase projects do not grant table access by default)
grant usage on schema public to anon, authenticated, service_role;
grant select on public.settings, public.hero_slides, public.media, public.films, public.stories, public.faqs, public.team to anon, authenticated;
grant insert on public.leads to anon, authenticated;
grant insert, update, delete on public.settings, public.hero_slides, public.media, public.films, public.stories, public.faqs, public.team to authenticated;
grant select, update, delete on public.leads to authenticated;
grant select, update, delete on public.staff to authenticated;
grant select, insert, update, delete on public.staff_invites to authenticated;
grant select on public.audit_log, public.lead_notifications to authenticated;
grant execute on function public.is_staff() to anon, authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;

-- =========================================================
-- Bootstrap: authorise the first owner(s). Run once, by hand, with real addresses.
-- insert into public.staff_invites(email, role) values ('you@example.com', 'owner');
-- =========================================================

-- invite emails are normalised to lowercase automatically
create or replace function public.staff_invites_normalize() returns trigger language plpgsql set search_path = public as $$
begin new.email := lower(trim(new.email)); return new; end $$;
revoke all on function public.staff_invites_normalize() from public, anon, authenticated;
drop trigger if exists staff_invites_normalize on public.staff_invites;
create trigger staff_invites_normalize before insert or update on public.staff_invites for each row execute function public.staff_invites_normalize();
