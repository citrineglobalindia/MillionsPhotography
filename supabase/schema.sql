-- Million's Photography & Films — Supabase schema
-- Apply once in the Supabase SQL editor (or via the MCP apply_migration tool).
-- Then run seed.sql to load the current website content.

create extension if not exists "pgcrypto";

-- ---------- staff & roles ----------
create table if not exists public.staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'editor' check (role in ('owner','admin','editor')),
  created_at timestamptz not null default now()
);

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff where user_id = auth.uid());
$$;

-- First person to sign up and call this becomes owner. No-op afterwards.
create or replace function public.claim_first_admin() returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;
  if exists (select 1 from public.staff) then
    return exists (select 1 from public.staff where user_id = auth.uid());
  end if;
  insert into public.staff(user_id, email, role)
  values (auth.uid(), (select email from auth.users where id = auth.uid()), 'owner');
  return true;
end $$;
revoke all on function public.claim_first_admin() from public, anon;
grant execute on function public.claim_first_admin() to authenticated;

-- ---------- content ----------
create table if not exists public.settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.hero_slides (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'image' check (kind in ('image','video')),
  image jsonb,            -- {src, set:{w:url}, w, h}
  video_url text,
  poster jsonb,
  eyebrow text, heading text, button_label text, button_link text,
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  image jsonb not null,
  alt text not null default '',
  categories text[] not null default '{}',
  featured boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.films (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  subtitle text, duration text,
  youtube_id text,
  cover jsonb,
  featured boolean not null default true,
  published boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  names text not null,
  kind text not null default 'Wedding',
  setting text, intro text, body text,
  cover jsonb, hero jsonb,
  gallery jsonb not null default '[]'::jsonb,   -- [{image, alt, categories}]
  youtube_id text,
  published boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  q text not null, a text not null,
  published boolean not null default true,
  sort int not null default 0
);

create table if not exists public.team (
  id uuid primary key default gen_random_uuid(),
  name text not null, role text, bio text,
  photo jsonb,
  is_founder boolean not null default false,
  sort int not null default 0
);

-- ---------- leads ----------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
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
  source text, utm jsonb, page text, referrer text,
  notes jsonb not null default '[]'::jsonb,
  follow_up date,
  value numeric,
  updated_at timestamptz not null default now()
);
create index if not exists leads_created_idx on public.leads(created_at desc);
create index if not exists leads_status_idx on public.leads(status);

-- ---------- row level security ----------
alter table public.staff enable row level security;
alter table public.settings enable row level security;
alter table public.hero_slides enable row level security;
alter table public.media enable row level security;
alter table public.films enable row level security;
alter table public.stories enable row level security;
alter table public.faqs enable row level security;
alter table public.team enable row level security;
alter table public.leads enable row level security;

create policy staff_self_read on public.staff for select to authenticated using (user_id = auth.uid() or public.is_staff());

-- public read of published content
create policy settings_read on public.settings for select using (true);
create policy hero_read on public.hero_slides for select using (active or public.is_staff());
create policy media_read on public.media for select using (true);
create policy films_read on public.films for select using (published or public.is_staff());
create policy stories_read on public.stories for select using (published or public.is_staff());
create policy faqs_read on public.faqs for select using (published or public.is_staff());
create policy team_read on public.team for select using (true);

-- staff write everything
do $$ declare t text; begin
  foreach t in array array['settings','hero_slides','media','films','stories','faqs','team'] loop
    execute format('create policy %I on public.%I for all to authenticated using (public.is_staff()) with check (public.is_staff())', t||'_staff_write', t);
  end loop;
end $$;

-- leads: anyone may submit, only staff may read/manage
create policy leads_public_insert on public.leads for insert to anon, authenticated
  with check (status = 'new' and notes = '[]'::jsonb and value is null);
create policy leads_staff_all on public.leads for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ---------- storage ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 52428800, array['image/webp','image/jpeg','image/png','video/mp4','video/webm'])
on conflict (id) do nothing;

create policy media_public_read on storage.objects for select using (bucket_id = 'media');
create policy media_staff_insert on storage.objects for insert to authenticated with check (bucket_id = 'media' and public.is_staff());
create policy media_staff_update on storage.objects for update to authenticated using (bucket_id = 'media' and public.is_staff());
create policy media_staff_delete on storage.objects for delete to authenticated using (bucket_id = 'media' and public.is_staff());
