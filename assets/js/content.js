/* Million's Photography & Films — live content + marketing layer for the public site.
   Runs before site.js; site.js waits on window.MPF_READY. */
import { getStore, isSupabase, demoHasEdits, imgHTML } from './store.js';

const C = window.MPF_CONFIG = window.MPF_CONFIG || {};
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nl = s => esc(s).replace(/\n/g, '<br>');
const page = document.body.dataset.page || 'index';
const PLAY = '<svg viewBox="0 0 24 24"><path d="M6 4l14 8-14 8z"/></svg>';

/* ---------- first-touch attribution (always on) ---------- */
(() => {
  try {
    const p = new URLSearchParams(location.search), utm = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid'].forEach(k => p.get(k) && (utm[k] = p.get(k).slice(0, 100)));
    if (!sessionStorage.getItem('mpf-touch')) sessionStorage.setItem('mpf-touch', JSON.stringify({ utm, page: location.pathname + location.search, referrer: document.referrer && !document.referrer.startsWith(location.origin) ? document.referrer : '' }));
    else if (Object.keys(utm).length) { const t = JSON.parse(sessionStorage.getItem('mpf-touch')); t.utm = utm; sessionStorage.setItem('mpf-touch', JSON.stringify(t)); }
  } catch (e) {}
})();

const live = isSupabase() || demoHasEdits();
let storeP = null; const store = () => (storeP = storeP || getStore());

/* ---------- lead submission used by site.js ---------- */
window.MPF_SUBMIT_LEAD = async lead => {
  let t = {}; try { t = JSON.parse(sessionStorage.getItem('mpf-touch') || '{}'); } catch (e) {}
  let source = (t.utm && t.utm.utm_source) || '';
  if (!source && t.referrer) { try { const h = new URL(t.referrer).hostname.replace('www.', ''); source = /google\./.test(h) ? 'google' : /instagram|facebook|fb\./.test(h) ? h.split('.')[0] : h; } catch (e) {} }
  const row = { ...lead, source: source || 'Website', utm: t.utm || {}, page: t.page || location.pathname, referrer: t.referrer || '' };
  const s = await store();
  await s.insertLead(row);
  fireConversion();
  return { mode: s.mode };
};
function fireConversion() {
  try { window.dataLayer && window.dataLayer.push({ event: 'generate_lead' }); } catch (e) {}
  try { if (window.gtag) { gtag('event', 'generate_lead', { currency: 'INR' }); const m = C._marketing || {}; if (m.gads_id && m.gads_label) gtag('event', 'conversion', { send_to: `${m.gads_id}/${m.gads_label}` }); } } catch (e) {}
  try { window.fbq && fbq('track', 'Lead'); } catch (e) {}
}

/* ---------- marketing tags ---------- */
function addScript(src, inline) { const s = document.createElement('script'); if (src) { s.async = true; s.src = src; } else s.textContent = inline; document.head.appendChild(s); }
function marketing(m = {}) {
  C._marketing = m;
  if (/^GTM-[A-Z0-9]+$/.test(m.gtm || '')) {
    window.dataLayer = window.dataLayer || []; window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    addScript('https://www.googletagmanager.com/gtm.js?id=' + m.gtm);
  }
  const gid = /^G-[A-Z0-9]+$/.test(m.ga4 || '') ? m.ga4 : null, aw = /^AW-\d+$/.test(m.gads_id || '') ? m.gads_id : null;
  if (gid || aw) {
    addScript('https://www.googletagmanager.com/gtag/js?id=' + (gid || aw));
    window.dataLayer = window.dataLayer || []; window.gtag = function () { dataLayer.push(arguments); };
    gtag('js', new Date()); gid && gtag('config', gid); aw && gtag('config', aw);
  }
  if (/^\d{10,20}$/.test(m.meta_pixel || '')) {
    addScript(null, `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${m.meta_pixel}');fbq('track','PageView');`);
  }
  // click tracking on contact intents
  document.addEventListener('click', e => { const a = e.target.closest('a[href^="https://wa.me"],a[href^="tel:"],a[href^="mailto:"]'); if (!a) return; const k = a.href.startsWith('https://wa.me') ? 'whatsapp' : a.href.startsWith('tel:') ? 'call' : 'email'; try { window.gtag && gtag('event', 'contact_click', { method: k }); window.fbq && fbq('track', 'Contact'); window.dataLayer && dataLayer.push({ event: 'contact_click', method: k }); } catch (x) {} });
}

/* ---------- settings → DOM ---------- */
function applySettings(S) {
  const contact = S.contact || {}, social = S.social || {}, footer = S.footer || {}, home = S.home || {}, mk = S.marketing || {};
  if (contact.email) C.email = contact.email;
  if (contact.whatsapp) { C.whatsapp = contact.whatsapp; C.phoneDisplay = contact.phone || ''; }
  C.social = { ...(C.social || {}), ...Object.fromEntries(Object.entries(social).filter(([, v]) => v)) };
  const bind = (key, val, html) => $$(`[data-bind="${key}"]`).forEach(el => { if (val == null || val === '') return; html ? el.innerHTML = html : el.textContent = val; });
  bind('footer.tagline', footer.tagline, nl(footer.tagline)); bind('footer.cta_title', footer.cta_title); bind('footer.cta_text', footer.cta_text);
  bind('footer.copyright', footer.copyright); bind('contact.address', contact.address);
  if (contact.hours) $$('[data-bind="contact.hours"]').forEach(e => { e.textContent = contact.hours; e.closest('li') && (e.closest('li').hidden = false); });
  if (footer.links && footer.links.length) $$('[data-bind="footer.links"]').forEach(e => e.innerHTML = footer.links.map(l => `<a href="${esc(l.href)}">${esc(l.label)}</a>`).join(' · '));
  if (contact.map_query) { const q = encodeURIComponent(contact.map_query); $$('iframe[data-map]').forEach(f => f.src = `https://www.google.com/maps?q=${q}&output=embed`); $$('a[data-maplink]').forEach(a => a.href = `https://www.google.com/maps/search/?api=1&query=${q}`); }
  ['intro_eyebrow', 'intro_title', 'intro_body', 'quote', 'cta_banner'].forEach(k => bind('home.' + k, home[k]));
  if (home.stats) $$('[data-bind="home.stats"] .stat').forEach((st, i) => { const s = home.stats[i]; if (!s) return; const b = $('b', st); b.removeAttribute('data-count'); b.textContent = s.value; $('span', st).textContent = s.label; });
  // SEO
  const seo = (S.seo || {})[page.replace('.html', '')] || {};
  if (seo.title) { document.title = seo.title; $('meta[property="og:title"]')?.setAttribute('content', seo.title); }
  if (seo.description) { $('meta[name="description"]')?.setAttribute('content', seo.description); $('meta[property="og:description"]')?.setAttribute('content', seo.description); }
  // announcement
  const ann = mk.announcement || {}; let dismissed = false; try { dismissed = sessionStorage.getItem('mpf-ann') === ann.text; } catch (e) {}
  if (ann.active && ann.text && !dismissed) {
    const bar = document.createElement('div'); bar.className = 'ann';
    bar.innerHTML = `<span>${esc(ann.text)}</span>${ann.link ? `<a href="${esc(ann.link)}">${esc(ann.link_label || 'Learn more')} →</a>` : ''}<button aria-label="Dismiss">×</button>`;
    document.body.prepend(bar); document.documentElement.classList.add('has-ann');
    $('button', bar).onclick = () => { bar.remove(); document.documentElement.classList.remove('has-ann'); try { sessionStorage.setItem('mpf-ann', ann.text); } catch (e) {} };
  }
  // floating WhatsApp
  if (C.whatsapp && mk.whatsapp_button !== false) {
    const a = document.createElement('a'); a.className = 'wa-float'; a.target = '_blank'; a.rel = 'noopener'; a.setAttribute('aria-label', 'Chat on WhatsApp');
    a.href = `https://wa.me/${C.whatsapp}?text=${encodeURIComponent("Hi Million's Photography & Films, I'd like to check availability for my wedding.")}`;
    a.innerHTML = '<svg viewBox="0 0 32 32"><path fill="currentColor" d="M16 3a13 13 0 00-11.2 19.6L3 29l6.6-1.7A13 13 0 1016 3zm0 23.8a10.8 10.8 0 01-5.5-1.5l-.4-.2-3.9 1 1-3.8-.2-.4A10.8 10.8 0 1116 26.8zm6-8.1c-.3-.2-2-1-2.3-1.1s-.5-.2-.7.2-.8 1.1-1 1.3-.4.2-.7 0a8.8 8.8 0 01-4.4-3.8c-.3-.6.3-.5 1-1.7.1-.2 0-.4 0-.5l-1-2.5c-.3-.7-.6-.6-.8-.6h-.7a1.3 1.3 0 00-1 .4 4 4 0 00-1.2 3 7 7 0 001.5 3.7 16 16 0 006.1 5.4c2.3 1 3.2 1 4.3.9a3.7 3.7 0 002.4-1.7 3 3 0 00.2-1.7c-.1-.2-.3-.3-.6-.4z"/></svg>';
    document.body.appendChild(a);
  }
  marketing(mk);
}

/* ---------- content regions ---------- */
const filmCard = f => `<div class="film" role="button" tabindex="0" data-film="${esc(f.slug)}" data-yt="${esc(f.youtube_id || '')}" data-title="${esc(f.title)}" data-poster="${esc(f.cover ? (f.cover.set && Object.values(f.cover.set).pop()) || f.cover.src : '')}" data-cursor="Play"><div class="thumb">${imgHTML(f.cover, f.title + ' — wedding film still', { sizes: '(max-width:720px) 80vw, 33vw' })}<span class="play">${PLAY}</span><span class="bar">▶<i></i>${esc(f.duration || '')}</span></div><h3>${esc(f.title)}</h3><p>${esc(f.subtitle || '')}</p></div>`;
const storyCard = s => `<a class="card" href="story.html?s=${encodeURIComponent(s.slug)}" data-cursor="View"><div class="ph">${imgHTML(s.cover || s.hero, s.names, { sizes: '(max-width:720px) 80vw, 33vw' })}<div class="ov"><span>View story</span></div></div><h3>${esc(s.kind)}</h3><p>${esc(s.names)}</p></a>`;
const galleryItem = (g, i) => `<figure class="it" data-cat="${esc((g.categories || []).join(' '))}" data-cursor="View" data-reveal style="--d:${(i % 3) * 0.08}s">${imgHTML(g.image, g.alt, { sizes: '(max-width:720px) 50vw, 33vw' })}<figcaption>${esc((g.categories || [''])[0])}</figcaption></figure>`;

async function hydrate() {
  const s = await store();
  const want = (sel) => $$(sel).length > 0;
  const jobs = { settings: s.settings() };
  if (want('[data-region="hero"]')) jobs.hero = s.list('hero_slides');
  if (want('[data-region="films"]') || want('[data-region="story"]')) jobs.films = s.list('films');
  if (want('[data-region="stories"]') || want('[data-region="story"]')) jobs.stories = s.list('stories');
  if (want('[data-region="portfolio"]')) jobs.media = s.list('media');
  if (want('[data-region="faqs"]')) jobs.faqs = s.list('faqs');
  if (want('[data-region="founders"]') || want('[data-region="team"]')) jobs.team = s.list('team');
  const keys = Object.keys(jobs), res = await Promise.all(keys.map(k => jobs[k].catch(() => null)));
  const D = Object.fromEntries(keys.map((k, i) => [k, res[i]]));
  if (D.settings) applySettings(D.settings);

  const hero = $('[data-region="hero"]'), slides = (D.hero || []).filter(x => x.active !== false);
  if (hero && slides.length) {
    $$('.slide', hero).forEach(x => x.remove());
    const cap = $('.cap', hero);
    hero.insertAdjacentHTML('afterbegin', slides.map((x, i) => `<div class="slide${i ? '' : ' on'}" data-eyebrow="${esc(x.eyebrow || '')}" data-heading="${esc(x.heading || '')}" data-btn="${esc(x.button_label || '')}" data-link="${esc(x.button_link || '')}">${x.kind === 'video' && x.video_url
      ? `<video autoplay muted loop playsinline preload="${i ? 'none' : 'auto'}" ${x.poster || x.image ? `poster="${esc((x.poster || x.image).set ? Object.values((x.poster || x.image).set).pop() : (x.poster || x.image).src)}"` : ''}><source src="${esc(x.video_url)}"></video>`
      : imgHTML(x.image, (x.heading || '').replace(/\n/g, ' '), { sizes: '100vw', lazy: i > 0 })}</div>`).join(''));
    const f = slides[0];
    if (cap && f.heading) { $('.eyebrow', cap).textContent = f.eyebrow || ''; $('h1', cap).innerHTML = f.heading.split('\n').map(l => `<span class="ln"><span>${esc(l)}</span></span>`).join(''); const b = $('.btn', cap); if (f.button_label) { b.firstChild.textContent = f.button_label + ' '; b.href = f.button_link || '#'; } }
  }
  const films = (D.films || []).filter(f => f.published !== false);
  $$('[data-region="films"]').forEach(g => { const list = g.dataset.featured ? films.filter(f => f.featured) : films; if (list.length) g.innerHTML = list.slice(0, +g.dataset.limit || 99).map(filmCard).join(''); });
  if (films.length) C.films = Object.fromEntries(films.map(f => [f.slug, f.youtube_id || ''])); else C.films = C.films || {};
  const stories = (D.stories || []).filter(x => x.published !== false);
  $$('[data-region="stories"]').forEach(g => { if (stories.length) g.innerHTML = stories.map(storyCard).join(''); });
  const pf = $('[data-region="portfolio"]');
  if (pf && D.media && D.media.length) pf.innerHTML = D.media.map((m, i) => galleryItem({ image: m.image, alt: m.alt, categories: m.categories }, i)).join('');
  const fq = $('[data-region="faqs"]'), faqs = (D.faqs || []).filter(f => f.published !== false);
  if (fq && faqs.length) fq.innerHTML = faqs.map(f => `<details data-reveal><summary>${esc(f.q)}</summary><div class="ans"><p>${esc(f.a)}</p></div></details>`).join('');
  const person = t => `<div class="person"><div class="ph">${imgHTML(t.photo, t.name + ' — ' + (t.role || ''))}</div><h3>${esc(t.name)}</h3><span class="role">${esc(t.role || '')}</span>${t.bio ? `<p><em>${esc(t.bio)}</em></p>` : ''}</div>`;
  if (D.team && D.team.length) {
    const fo = $('[data-region="founders"]'), tm = $('[data-region="team"]');
    if (fo) fo.innerHTML = D.team.filter(t => t.is_founder).map(person).join('');
    if (tm) tm.innerHTML = D.team.filter(t => !t.is_founder).map(person).join('');
  }
  if ($('[data-region="story"]')) renderStory(stories, films);
}

function renderStory(stories, films) {
  const root = $('[data-region="story"]'); const slug = new URLSearchParams(location.search).get('s');
  const i = Math.max(0, stories.findIndex(x => x.slug === slug)), s = stories[i];
  if (!s) { root.innerHTML = '<section class="nf"><div><h1 class="h-display h-sm">Story not found</h1><a class="btn" href="clients.html">Back to clients</a></div></section>'; return; }
  const prev = stories[(i - 1 + stories.length) % stories.length], next = stories[(i + 1) % stories.length];
  document.title = `${s.names} — ${s.kind} Story | Million's Photography & Films`;
  $('meta[name="description"]')?.setAttribute('content', s.intro || '');
  $('[data-s="names"]', root).textContent = s.names;
  $('[data-s="kind"]', root).textContent = `A ${String(s.kind).toLowerCase()} story`;
  $('[data-s="crumb"]', root).textContent = `${s.kind} Story`;
  $('[data-s="banner"]', root).innerHTML = imgHTML(s.hero || s.cover, s.names, { sizes: '100vw', lazy: false, extra: 'data-parallax="70"' });
  $('[data-s="intro"]', root).textContent = s.intro || '';
  const body = $('[data-s="body"]', root); body.textContent = s.body || ''; body.hidden = !s.body;
  $('[data-s="meta"]', root).innerHTML = `<div><dt>Story</dt><dd>${esc(s.kind)}</dd></div>${s.setting ? `<div><dt>Setting</dt><dd>${esc(s.setting)}</dd></div>` : ''}<div><dt>Coverage</dt><dd>Photo${s.youtube_id ? ' + Film' : ''}</dd></div>`;
  $('[data-s="gallery"]', root).innerHTML = (s.gallery || []).map(galleryItem).join('');
  const fw = $('[data-s="film"]', root);
  if (s.youtube_id) { C.films = { ...(C.films || {}), ['story-' + s.slug]: s.youtube_id }; fw.hidden = false; const sf = $('.story-film', fw); sf.dataset.film = 'story-' + s.slug; sf.dataset.title = s.names + ' — The Film'; sf.dataset.poster = (s.hero && s.hero.src) || ''; $('img', sf).outerHTML = imgHTML(s.hero || s.cover, s.names + ' — wedding film', { sizes: '100vw' }); }
  else fw.hidden = true;
  $('[data-s="prev"]', root).href = 'story.html?s=' + encodeURIComponent(prev.slug);
  $('[data-s="next"]', root).href = 'story.html?s=' + encodeURIComponent(next.slug);
}

/* story.html without live data: render from bundled seed */
async function storyFromSeed() {
  const r = await fetch(new URL('../data/seed.json', import.meta.url)); const d = await r.json();
  renderStory(d.stories, d.films);
}

window.MPF_READY = (async () => {
  const timeout = new Promise(r => setTimeout(r, 3500));
  const work = (async () => {
    try {
      if (live) await hydrate();
      else if ($('[data-region="story"]')) await storyFromSeed();
    } catch (e) { console.warn('[MPF] live content unavailable, using built-in content', e); }
  })();
  await Promise.race([work, timeout]);
})();
