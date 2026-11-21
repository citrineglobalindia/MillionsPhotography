# Million's Photography & Films — website

Static multi-page site (HTML/CSS/vanilla JS), deployed on Vercel. No build step.

- Edit contact details, WhatsApp number, social links and YouTube film IDs in `assets/js/config.js`.
- Replace photos in `assets/img/` keeping the same file names.
- Pages: index, about, portfolio, films, clients, contact, story-*.html, 404.

## Studio admin (`/admin`) — live on Supabase
Project `fujbndmgnaikmkdacqdk` (Singapore). Schema, policies and triggers: `supabase/schema.sql`. Alert function: `supabase/functions/notify-lead`.

- **Accounts are invite-only.** An owner/admin invites an email in Admin → Settings → Team; that person creates an account at `/admin`, confirms their email, and is in.
  First owner (one-time, Supabase SQL editor): `insert into public.staff_invites(email, role) values ('you@example.com','owner');`
- **CRM:** enquiries get a reference (MPF-1001…), source/UTM attribution, status pipeline, notes, follow-ups, CSV export, and appear live in the admin.
- **Spam protection:** honeypot, server-side email validation, duplicate block (same email/phone within 10 min), global rate limit.
- **Security:** row-level security on every table; visitors can only read published content and submit enquiries; editors manage content and enquiries; admins also manage the team and delete enquiries; owners control roles.
- **Activity log:** every create/update/delete and status change, with who did it.
- **Email alerts:** add `RESEND_API_KEY` (and optionally `RESEND_FROM`) under Supabase → Edge Functions → Secrets to email the studio and auto-reply to couples.
- **Content:** on first sign-in, Dashboard → "Import website content" loads the current site into the database.
