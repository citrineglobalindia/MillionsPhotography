# Million's Photography & Films — website

Static multi-page site (HTML/CSS/vanilla JS), deployed on Vercel. No build step.

- Edit contact details, WhatsApp number, social links and YouTube film IDs in `assets/js/config.js`.
- Replace photos in `assets/img/` keeping the same file names.
- Pages: index, about, portfolio, films, clients, contact, story-*.html, 404.

## Studio admin (`/admin`)
Enquiries CRM (table + drag-and-drop board, notes, follow-ups, CSV), portfolio uploads with in-browser WebP resizing,
stories, films (YouTube), hero carousel (image or video), pages & footer, FAQs, team, marketing (GA4, GTM, Meta Pixel,
Google Ads conversions, announcement bar, WhatsApp button, UTM builder, SEO), backups.

Runs in **demo mode** (browser-only storage) until Supabase is connected:
1. Create a Supabase project, run `supabase/schema.sql` then `supabase/seed.sql` in the SQL editor.
2. Set `supabase.url` and `supabase.anonKey` in `assets/js/config.js`, push.
3. Sign up at `/admin` — the first account becomes the owner.
