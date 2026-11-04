import { getStore, isSupabase, imgHTML, processImage, uploadVideo, youtubeId, uuid } from '/assets/js/store.js';

/* ================= helpers ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const el = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtAgo = d => { if (!d) return ''; const s = (Date.now() - new Date(d)) / 1000; if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + 'm ago'; if (s < 86400) return Math.floor(s / 3600) + 'h ago'; if (s < 604800) return Math.floor(s / 86400) + 'd ago'; return fmtDate(d); };
const inr = n => n == null || n === '' ? '—' : '₹' + Number(n).toLocaleString('en-IN');
const slugify = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, 60);
const today = () => new Date().toISOString().slice(0, 10);
const debounce = (f, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), ms); }; };
const I = {
  dash: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
  leads: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H8l-4 4z"/><path d="M8 9h8M8 12h5"/></svg>',
  photo: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-8 8"/></svg>',
  story: '<svg viewBox="0 0 24 24"><path d="M5 4h11l3 3v13H5z"/><path d="M9 10h6M9 14h6M9 18h3"/></svg>',
  film: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9.5v5l4.5-2.5z"/></svg>',
  hero: '<svg viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 21h12M9 3h6"/></svg>',
  page: '<svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 16h16"/></svg>',
  mk: '<svg viewBox="0 0 24 24"><path d="M3 11v2a1 1 0 001 1h3l6 4V6L7 10H4a1 1 0 00-1 1z"/><path d="M17 8a5 5 0 010 8M19.5 5.5a9 9 0 010 13"/></svg>',
  cog: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>', down: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
  grip: '<svg viewBox="0 0 24 24"><circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  dl: '<svg viewBox="0 0 24 24"><path d="M12 4v12M7 11l5 5 5-5M5 20h14"/></svg>',
  wa: '<svg viewBox="0 0 24 24"><path d="M4 20l1.3-4A8 8 0 1112 20a8 8 0 01-4-1.1z"/><path d="M9 9.5c.5 2 2.5 4 4.5 4.5l1-1.2 2 .8c-.3 1.3-1.4 2-2.6 1.8A7 7 0 018.3 10c-.2-1.2.5-2.3 1.8-2.6l.8 2z"/></svg>',
  phone: '<svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2"/></svg>',
  mail: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
  board: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="10" rx="1"/><rect x="17" y="4" width="4" height="13" rx="1"/></svg>',
  table: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16"/></svg>',
  copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3"/></svg>',
};
const STATUSES = [['new', 'New'], ['contacted', 'Contacted'], ['meeting', 'Meeting'], ['quoted', 'Quoted'], ['booked', 'Booked'], ['lost', 'Lost']];
const STATUS_LABEL = Object.fromEntries(STATUSES);
const PCATS = [['wedding', 'Wedding'], ['prewedding', 'Pre-wedding'], ['portraits', 'Portraits'], ['ceremony', 'Ceremony'], ['celebrations', 'Celebrations']];
const pill = s => `<span class="pill st-${esc(s)}">${esc(STATUS_LABEL[s] || s)}</span>`;
const thumb = o => o ? ((o.set && (o.set['600'] || o.set['800'] || Object.values(o.set)[0])) || o.src) : '';

let store, session, cache = {};

/* ================= toasts / modal / drawer ================= */
function toast(msg, err) { const t = el(`<div class="toast${err ? ' err' : ''}">${esc(msg)}</div>`); $('#toasts').appendChild(t); setTimeout(() => t.remove(), 3200); }
const fail = e => { console.error(e); toast(e.message || String(e), true); };

function modal(html, { big } = {}) {
  const m = $('#modal'), card = $('.modal-card', m);
  card.className = 'modal-card' + (big ? ' big' : ''); card.innerHTML = html; m.classList.add('open'); m.setAttribute('aria-hidden', 'false');
  return new Promise(res => {
    const close = v => { m.classList.remove('open'); m.setAttribute('aria-hidden', 'true'); m.onclick = null; document.removeEventListener('keydown', key); res(v); };
    const key = e => { if (e.key === 'Escape') close(null); };
    document.addEventListener('keydown', key);
    m.onclick = e => { if (e.target === m) close(null); const b = e.target.closest('[data-v]'); if (b) close(b.dataset.v === 'collect' ? card : b.dataset.v); };
  });
}
const confirmBox = async (title, text, ok = 'Delete') => (await modal(`<h3>${esc(title)}</h3><p class="muted">${esc(text)}</p><div class="acts"><button class="btn" data-v="">Cancel</button><button class="btn pri" data-v="ok">${esc(ok)}</button></div>`)) === 'ok';

let backdrop;
function drawer({ title, body, onSave, onDelete, wide, saveLabel = 'Save' }) {
  const d = $('#drawer');
  if (!backdrop) { backdrop = el('<div class="backdrop"></div>'); document.body.appendChild(backdrop); }
  $('#drawer-title').textContent = title; const b = $('.drawer-body', d); b.innerHTML = ''; b.appendChild(typeof body === 'string' ? el(`<div>${body}</div>`) : body); b.scrollTop = 0;
  d.classList.toggle('wide', !!wide);
  const del = $('[data-delete]', d), save = $('[data-save]', d); del.hidden = !onDelete; save.hidden = !onSave; save.textContent = saveLabel;
  const close = () => { d.classList.remove('open'); d.setAttribute('aria-hidden', 'true'); backdrop.classList.remove('on'); document.removeEventListener('keydown', key); };
  const key = e => { if (e.key === 'Escape' && !$('#modal').classList.contains('open')) close(); };
  document.addEventListener('keydown', key);
  $$('[data-close]', d).forEach(x => x.onclick = close); backdrop.onclick = close;
  save.onclick = async () => { save.disabled = true; try { if (await onSave(b) !== false) close(); } catch (e) { fail(e); } finally { save.disabled = false; } };
  del.onclick = async () => { if (await confirmBox('Delete this item?', 'This cannot be undone.')) { try { await onDelete(); close(); } catch (e) { fail(e); } } };
  requestAnimationFrame(() => { d.classList.add('open'); d.setAttribute('aria-hidden', 'false'); backdrop.classList.add('on'); setTimeout(() => { const f = $('input,select,textarea', b); f && window.innerWidth > 860 && f.focus(); }, 380); });
  return { close, body: b };
}

/* form values: [name] inputs; checkbox → bool, data-multi → array */
function vals(root) {
  const o = {};
  $$('[name]', root).forEach(i => {
    const k = i.name;
    if (i.type === 'checkbox') { if (i.dataset.multi != null) { o[k] = o[k] || []; if (i.checked) o[k].push(i.value); } else o[k] = i.checked; }
    else if (i.type === 'number') o[k] = i.value === '' ? null : Number(i.value);
    else if (i.type === 'date') o[k] = i.value || null;
    else o[k] = i.value.trim();
  });
  return o;
}
const field = (label, name, value = '', { type = 'text', help = '', ph = '', max, rows, attrs = '' } = {}) => {
  const cnt = max ? `<span class="count" data-count="${max}">${String(value || '').length}/${max}</span>` : '';
  const input = rows ? `<textarea name="${name}" rows="${rows}" placeholder="${esc(ph)}" ${attrs}>${esc(value)}</textarea>`
    : `<input type="${type}" name="${name}" value="${esc(value ?? '')}" placeholder="${esc(ph)}" ${attrs}>`;
  return `<label class="f"><span>${esc(label)}${cnt}</span>${input}${help ? `<p class="help">${help}</p>` : ''}</label>`;
};
const toggle = (label, name, on) => `<label class="switch"><input type="checkbox" name="${name}" ${on ? 'checked' : ''}> ${esc(label)}</label>`;
const select = (label, name, value, opts) => `<label class="f"><span>${esc(label)}</span><select name="${name}">${opts.map(([v, t]) => `<option value="${esc(v)}" ${v === value ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
const catChecks = (name, sel = [], cats = PCATS) => `<div class="checks">${cats.map(([v, t]) => `<label class="chk"><input type="checkbox" data-multi name="${name}" value="${v}" ${sel.includes(v) ? 'checked' : ''}>${t}</label>`).join('')}</div>`;
function liveCounts(root) { $$('[data-count]', root).forEach(c => { const inp = c.closest('.f').querySelector('input,textarea'); const max = +c.dataset.count; const u = () => { c.textContent = inp.value.length + '/' + max; c.classList.toggle('over', inp.value.length > max); }; inp.addEventListener('input', u); u(); }); }

/* ================= uploads ================= */
function dropzone({ accept = 'image/*', multiple = true, label = 'Drop photos here or click to upload', hint = 'JPG, PNG or WebP — resized to sharp WebP automatically', onFiles }) {
  const z = el(`<div class="drop" tabindex="0" role="button"><b>${esc(label)}</b><small>${esc(hint)}</small><input type="file" accept="${accept}" ${multiple ? 'multiple' : ''} hidden><div class="progress"></div></div>`);
  const inp = $('input', z);
  z.onclick = e => { if (!e.target.closest('.progress')) inp.click(); };
  z.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inp.click(); } };
  inp.onchange = () => { onFiles([...inp.files], z); inp.value = ''; };
  z.ondragover = e => { e.preventDefault(); z.classList.add('over'); };
  z.ondragleave = () => z.classList.remove('over');
  z.ondrop = e => { e.preventDefault(); z.classList.remove('over'); onFiles([...e.dataTransfer.files].filter(f => accept === '*' || f.type.match(accept.replace('*', '.*').replace(',', '|'))), z); };
  return z;
}
function progressRow(zone, name) {
  const r = el(`<div class="prog"><span>${esc(name)}</span><div class="bar"><i></i></div></div>`); $('.progress', zone).appendChild(r);
  return { set: p => $('i', r).style.width = Math.round(p * 100) + '%', done: () => setTimeout(() => r.remove(), 900) };
}
async function uploadImages(files, zone, widths) {
  const out = [];
  for (const f of files) {
    if (!f.type.startsWith('image/')) { toast(f.name + ' is not an image', true); continue; }
    const p = progressRow(zone, f.name);
    try { out.push({ image: await processImage(store, f, { widths, onProgress: p.set }), name: f.name }); } catch (e) { fail(e); }
    p.done();
  }
  return out;
}

/* image field: preview + upload/pick/remove; value on el._value */
function imageField(label, value, { widths, video = false, help = '' } = {}) {
  const w = el(`<div class="f"><span>${esc(label)}</span><div class="imgfield"><div class="thumb"></div><div><div class="acts"><button type="button" class="btn sm" data-up>Upload</button>${video ? '' : '<button type="button" class="btn sm" data-pick>From library</button>'}<button type="button" class="btn sm ghost danger" data-rm>Remove</button></div><p class="help">${help}</p><div class="progress"></div></div></div><input type="file" accept="${video ? 'video/mp4,video/webm' : 'image/*'}" hidden></div>`);
  const th = $('.thumb', w), inp = $('input[type=file]', w);
  const paint = () => { const v = w._value; th.innerHTML = !v ? 'No file' : video ? `<video src="${esc(v)}" muted playsinline loop autoplay></video>` : `<img src="${esc(thumb(v))}" alt="">`; };
  w._value = value || null; paint();
  $('[data-up]', w).onclick = () => inp.click();
  $('[data-rm]', w).onclick = () => { w._value = null; paint(); };
  const pk = $('[data-pick]', w); if (pk) pk.onclick = async () => { const m = await pickMedia(false); if (m && m[0]) { w._value = m[0].image; paint(); } };
  inp.onchange = async () => {
    const f = inp.files[0]; if (!f) return; const p = progressRow(w, f.name);
    try { w._value = video ? await uploadVideo(store, f, { onProgress: p.set }) : await processImage(store, f, { widths, onProgress: p.set }); paint(); } catch (e) { fail(e); }
    p.done(); inp.value = '';
  };
  return w;
}
async function pickMedia(multiple = true) {
  const media = await store.list('media');
  const card = await modal(`<h3>Choose from library</h3><p class="muted">${media.length} photos in your portfolio library.</p><div class="pick-grid">${media.map(m => `<label><input type="checkbox" value="${m.id}"><img src="${esc(thumb(m.image))}" alt="${esc(m.alt)}" loading="lazy"></label>`).join('')}</div><div class="acts"><button class="btn" data-v="">Cancel</button><button class="btn pri" data-v="collect">Add selected</button></div>`, { big: true });
  if (!card || typeof card === 'string') return null;
  const ids = $$('input:checked', card).map(i => i.value); return media.filter(m => ids.includes(m.id)).slice(0, multiple ? 999 : 1);
}

/* drag-to-reorder for a container's [data-id] children; handle optional */
function sortable(container, onEnd) {
  let dragEl = null;
  $$('[data-id]', container).forEach(it => {
    it.draggable = true;
    it.addEventListener('dragstart', e => { dragEl = it; it.classList.add('drag'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', it.dataset.id); });
    it.addEventListener('dragend', () => { it.classList.remove('drag'); dragEl = null; onEnd($$('[data-id]', container).map(x => x.dataset.id)); });
    it.addEventListener('dragover', e => { e.preventDefault(); if (!dragEl || dragEl === it) return; const r = it.getBoundingClientRect(); const after = (e.clientX - r.left) / r.width > .5 || (e.clientY - r.top) / r.height > .66; it.parentNode.insertBefore(dragEl, after ? it.nextSibling : it); });
  });
  container.addEventListener('click', e => {
    const b = e.target.closest('[data-move]'); if (!b) return; e.stopPropagation();
    const it = b.closest('[data-id]'); const sib = b.dataset.move === 'up' ? it.previousElementSibling : it.nextElementSibling;
    if (!sib) return; b.dataset.move === 'up' ? container.insertBefore(it, sib) : container.insertBefore(sib, it);
    onEnd($$('[data-id]', container).map(x => x.dataset.id));
  });
}
const moveBtns = `<div class="mv"><button type="button" data-move="up" aria-label="Move earlier">${I.up}</button><button type="button" data-move="down" aria-label="Move later">${I.down}</button></div>`;

function download(name, text, type = 'text/plain') { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
async function copy(text) { try { await navigator.clipboard.writeText(text); toast('Copied'); } catch (e) { toast('Copy failed — select and copy manually', true); } }

/* ================= router ================= */
const ROUTES = [
  ['dashboard', 'Dashboard', I.dash, viewDashboard, 'Studio'],
  ['leads', 'Enquiries', I.leads, viewLeads],
  ['portfolio', 'Portfolio', I.photo, viewPortfolio, 'Website'],
  ['stories', 'Stories', I.story, viewStories],
  ['films', 'Films', I.film, viewFilms],
  ['hero', 'Hero carousel', I.hero, viewHero],
  ['pages', 'Pages & footer', I.page, viewPages],
  ['marketing', 'Marketing', I.mk, viewMarketing, 'Growth'],
  ['settings', 'Settings', I.cog, viewSettings],
];
function renderNav(newCount) {
  let g = '';
  $('#nav').innerHTML = ROUTES.map(([k, t, ic, , grp]) => {
    const h = grp && grp !== g ? `<div class="grp">${grp}</div>` : ''; if (grp) g = grp;
    return `${h}<a href="#/${k}" data-k="${k}">${ic}<span>${t}</span>${k === 'leads' && newCount ? `<span class="badge">${newCount}</span>` : ''}</a>`;
  }).join('');
  markNav();
}
function markNav() { const k = (location.hash.slice(2) || 'dashboard').split('/')[0]; $$('#nav a').forEach(a => a.classList.toggle('on', a.dataset.k === k)); }
async function route() {
  const [k, arg] = (location.hash.slice(2) || 'dashboard').split('/');
  const r = ROUTES.find(x => x[0] === k) || ROUTES[0];
  $('#page-title').textContent = r[1]; document.title = r[1] + ' · MPF Studio Admin'; markNav();
  document.body.classList.remove('nav-open');
  const v = $('#view'); v.innerHTML = '<div class="empty">Loading…</div>'; v.style.animation = 'none'; void v.offsetWidth; v.style.animation = '';
  try { await r[3](v, arg); } catch (e) { v.innerHTML = `<div class="card empty"><b>Something went wrong</b>${esc(e.message)}</div>`; fail(e); }
  v.focus({ preventScroll: true }); window.scrollTo(0, 0);
}
async function refreshBadge() { try { const leads = await store.list('leads'); cache.leads = leads; renderNav(leads.filter(l => l.status === 'new').length); } catch (e) { renderNav(0); } }

/* ================= DASHBOARD ================= */
function barChart(data, { h = 200 } = {}) {
  const W = 560, pad = { l: 30, r: 8, t: 12, b: 26 }, iw = W - pad.l - pad.r, ih = h - pad.t - pad.b;
  const max = Math.max(4, ...data.map(d => d.v)), step = Math.ceil(max / 4), top = step * 4, bw = Math.min(46, iw / data.length * .56);
  const x = i => pad.l + (i + .5) * iw / data.length, y = v => pad.t + ih - v / top * ih;
  const grid = [0, 1, 2, 3, 4].map(i => `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(i * step)}" y2="${y(i * step)}"/>`).join('');
  const yl = [0, 2, 4].map(i => `<text x="${pad.l - 8}" y="${y(i * step) + 4}" text-anchor="end">${i * step}</text>`).join('');
  const bars = data.map((d, i) => { if (!d.v) return ''; const bh = Math.max(d.v ? 3 : 0, ih - (y(d.v) - pad.t)); const yy = pad.t + ih - bh; return `<path class="barp" data-i="${i}" d="M${x(i) - bw / 2},${pad.t + ih} V${yy + 4} q0,-4 4,-4 h${bw - 8} q4,0 4,4 V${pad.t + ih} z"/>`; }).join('');
  const hits = data.map((d, i) => `<rect class="hit" x="${x(i) - iw / data.length / 2}" y="${pad.t}" width="${iw / data.length}" height="${ih}" data-i="${i}"/>`).join('');
  const xl = data.map((d, i) => `<text x="${x(i)}" y="${h - 8}" text-anchor="middle">${esc(d.k)}</text>`).join('');
  const w = el(`<div class="chart"><svg viewBox="0 0 ${W} ${h}" role="img" aria-label="${esc(data.map(d => d.k + ': ' + d.v).join(', '))}"><g class="grid">${grid}</g><g class="axis">${yl}${xl}</g>${bars}${hits}</svg><div class="tip"></div></div>`);
  const tip = $('.tip', w), svg = $('svg', w);
  $$('.hit', w).forEach(r => { r.addEventListener('pointerenter', () => { const d = data[r.dataset.i], b = svg.getBoundingClientRect(), s = b.width / W; tip.innerHTML = `<b>${d.v}</b> enquir${d.v === 1 ? 'y' : 'ies'} · ${esc(d.k)}`; tip.style.left = x(+r.dataset.i) * s + 'px'; tip.style.top = y(d.v) * s + 'px'; tip.classList.add('on'); $$('.barp', w).forEach(p => p.style.opacity = p.dataset.i == r.dataset.i ? 1 : .35); }); r.addEventListener('pointerleave', () => { tip.classList.remove('on'); $$('.barp', w).forEach(p => p.style.opacity = 1); }); });
  return w;
}
function hbars(rows) {
  const max = Math.max(1, ...rows.map(r => r.v));
  return `<div class="hbars">${rows.map(r => `<div class="hbar" title="${esc(r.k)}: ${r.v}"><span>${esc(r.k)}</span><div class="tr"><i style="width:${r.v / max * 100}%"></i></div><b>${r.v}</b></div>`).join('') || '<p class="muted">No data yet.</p>'}</div>`;
}
const srcOf = l => (l.utm && (l.utm.utm_source || l.utm.source)) || l.source || (l.referrer ? (() => { try { return new URL(l.referrer).hostname.replace('www.', ''); } catch (e) { return 'Referral'; } })() : 'Direct');

async function viewDashboard(v) {
  const leads = cache.leads = await store.list('leads');
  const now = new Date(), month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`, wk = Date.now() - 7 * 864e5;
  const booked = leads.filter(l => l.status === 'booked'), open = leads.filter(l => !['booked', 'lost'].includes(l.status));
  const conv = leads.length ? Math.round(booked.length / leads.length * 100) : 0;
  const pipeline = leads.filter(l => ['quoted', 'booked'].includes(l.status)).reduce((s, l) => s + (+l.value || 0), 0);
  const mk = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; const months = [...Array(6)].map((_, i) => { const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1); const k = mk(d); return { k: d.toLocaleDateString('en-IN', { month: 'short' }), v: leads.filter(l => l.created_at && mk(new Date(l.created_at)) === k).length }; });
  const src = {}; leads.forEach(l => { const s = srcOf(l); src[s] = (src[s] || 0) + 1; });
  const srcRows = Object.entries(src).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, n]) => ({ k, v: n }));
  const upcoming = leads.filter(l => l.event_date && l.event_date >= today() && ['booked', 'quoted', 'meeting'].includes(l.status)).sort((a, b) => a.event_date.localeCompare(b.event_date)).slice(0, 5);
  const due = open.filter(l => l.follow_up && l.follow_up <= today()).slice(0, 5);
  v.innerHTML = `
  <div class="kpis">
    <div class="card kpi"><span>New enquiries</span><b>${leads.filter(l => l.status === 'new').length}</b><small>${leads.filter(l => new Date(l.created_at) > wk).length} in the last 7 days</small></div>
    <div class="card kpi"><span>This month</span><b>${leads.filter(l => l.created_at && mk(new Date(l.created_at)) === month).length}</b><small>${leads.length} all-time</small></div>
    <div class="card kpi"><span>Booked</span><b>${booked.length}</b><small>${conv}% conversion</small></div>
    <div class="card kpi"><span>Pipeline</span><b>${pipeline ? inr(pipeline) : '₹0'}</b><small>Quoted + booked value</small></div>
  </div>
  <div class="dash">
    <div class="card"><div class="card-h"><h3>Enquiries per month</h3><span class="sp"></span><a class="btn sm" href="#/leads">Open CRM</a></div><div class="card-b" id="ch"></div></div>
    <div class="card"><div class="card-h"><h3>Lead sources</h3></div><div class="card-b">${hbars(srcRows)}<p class="help">From UTM tags, referrers and manual entries. Build tagged links in <a href="#/marketing">Marketing</a>.</p></div></div>
    <div class="card"><div class="card-h"><h3>Recent enquiries</h3></div><div class="card-b"><ul class="list">${leads.slice(0, 6).map(l => `<li><div class="t"><b>${esc(l.name)}${l.partner ? ' &amp; ' + esc(l.partner) : ''}</b><small>${esc(l.event_type || 'Enquiry')} · ${fmtAgo(l.created_at)}</small></div>${pill(l.status)}<a class="btn sm" href="#/leads/${l.id}">Open</a></li>`).join('') || '<li class="muted">No enquiries yet — they appear here the moment someone submits the contact form.</li>'}</ul></div></div>
    <div class="card"><div class="card-h"><h3>Upcoming shoots</h3></div><div class="card-b"><ul class="list">${upcoming.map(l => { const d = new Date(l.event_date); return `<li><div class="date-badge"><i>${d.toLocaleDateString('en-IN', { month: 'short' })}</i><b>${d.getDate()}</b></div><div class="t"><b>${esc(l.name)}${l.partner ? ' &amp; ' + esc(l.partner) : ''}</b><small>${esc(l.event_type || '')} · ${esc(l.location || '')}</small></div>${pill(l.status)}</li>`; }).join('') || '<li class="muted">No upcoming booked dates.</li>'}</ul>
      ${due.length ? `<h4 class="section-title" style="font-size:18px;margin:18px 0 4px">Follow-ups due</h4><ul class="list">${due.map(l => `<li><div class="t"><b>${esc(l.name)}</b><small>Due ${fmtDate(l.follow_up)}</small></div><a class="btn sm" href="#/leads/${l.id}">Follow up</a></li>`).join('')}</ul>` : ''}</div></div>
  </div>`;
  $('#ch', v).appendChild(barChart(months));
}

/* ================= LEADS ================= */
let leadState = { q: '', status: 'all', src: 'all', view: (() => { try { return localStorage.getItem('mpf-leads-view') || 'table'; } catch (e) { return 'table'; } })() };
async function viewLeads(v, openId) {
  const leads = cache.leads = await store.list('leads');
  const sources = [...new Set(leads.map(srcOf))].sort();
  const draw = () => {
    const q = leadState.q.toLowerCase();
    const rows = leads.filter(l => (leadState.status === 'all' || l.status === leadState.status) && (leadState.src === 'all' || srcOf(l) === leadState.src) &&
      (!q || [l.name, l.partner, l.email, l.phone, l.location, l.event_type].join(' ').toLowerCase().includes(q)));
    const counts = Object.fromEntries(STATUSES.map(([s]) => [s, leads.filter(l => l.status === s).length]));
    v.innerHTML = `<div class="toolbar">
      <div class="chips"><button class="chip ${leadState.status === 'all' ? 'on' : ''}" data-st="all">All <b>${leads.length}</b></button>${STATUSES.map(([s, t]) => `<button class="chip ${leadState.status === s ? 'on' : ''}" data-st="${s}">${t} <b>${counts[s]}</b></button>`).join('')}</div>
      <span class="sp"></span>
      <select id="srcf" style="width:auto;height:38px"><option value="all">All sources</option>${sources.map(s => `<option ${leadState.src === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>
      <div class="seg"><button data-view="table" class="${leadState.view === 'table' ? 'on' : ''}">${I.table}Table</button><button data-view="board" class="${leadState.view === 'board' ? 'on' : ''}">${I.board}Board</button></div>
      <button class="btn" id="csv">${I.dl}CSV</button><button class="btn pri" id="add">${I.plus}Add enquiry</button></div>
      <div id="lv"></div>`;
    const lv = $('#lv', v);
    if (!rows.length) lv.innerHTML = `<div class="card empty"><b>${leads.length ? 'No matches' : 'No enquiries yet'}</b>${leads.length ? 'Try a different filter or search.' : 'Enquiries from the website contact form land here automatically.'}</div>`;
    else if (leadState.view === 'table') {
      lv.innerHTML = `<div class="card tbl-wrap"><table class="tbl"><thead><tr><th>Couple</th><th>Event</th><th class="hide-m">Date</th><th>Status</th><th class="hide-m">Source</th><th class="hide-m">Follow-up</th><th class="hide-m">Received</th></tr></thead><tbody>${rows.map(l => `<tr data-open="${l.id}"><td><b>${esc(l.name)}${l.partner ? ' &amp; ' + esc(l.partner) : ''}</b><small>${esc(l.phone || l.email || '')}</small></td><td>${esc(l.event_type || '—')}<small>${esc(l.location || '')}</small></td><td class="hide-m">${fmtDate(l.event_date)}</td><td>${pill(l.status)}</td><td class="hide-m">${esc(srcOf(l))}</td><td class="hide-m">${l.follow_up ? `<span style="color:${l.follow_up <= today() && !['booked', 'lost'].includes(l.status) ? 'var(--bad)' : 'inherit'}">${fmtDate(l.follow_up)}</span>` : '—'}</td><td class="hide-m">${fmtAgo(l.created_at)}</td></tr>`).join('')}</tbody></table></div>`;
    } else {
      lv.innerHTML = `<div class="board">${STATUSES.map(([s, t]) => `<div class="col" data-col="${s}"><h4>${t} <span>${rows.filter(l => l.status === s).length}</span></h4>${rows.filter(l => l.status === s).map(l => `<div class="lead-card" draggable="true" data-open="${l.id}" data-lead="${l.id}"><b>${esc(l.name)}${l.partner ? ' &amp; ' + esc(l.partner) : ''}</b><small>${esc(l.event_type || 'Enquiry')} · ${esc(l.location || '')}</small><div class="meta"><span>${l.event_date ? fmtDate(l.event_date) : 'Date TBC'}</span><span>${l.value ? inr(l.value) : ''}</span></div></div>`).join('')}</div>`).join('')}</div><p class="help">Drag cards between columns to update status.</p>`;
      let dragId = null;
      $$('.lead-card', lv).forEach(c => { c.ondragstart = e => { dragId = c.dataset.lead; c.classList.add('drag'); e.dataTransfer.setData('text/plain', dragId); }; c.ondragend = () => c.classList.remove('drag'); });
      $$('.col', lv).forEach(col => {
        col.ondragover = e => { e.preventDefault(); col.classList.add('over'); }; col.ondragleave = () => col.classList.remove('over');
        col.ondrop = async e => { e.preventDefault(); col.classList.remove('over'); const l = leads.find(x => x.id === dragId); if (!l || l.status === col.dataset.col) return;
          const prev = l.status; l.status = col.dataset.col; l.notes = [...(l.notes || []), { at: new Date().toISOString(), by: session.user.email, text: `Status: ${STATUS_LABEL[prev]} → ${STATUS_LABEL[l.status]}`, sys: true }];
          try { await store.upsert('leads', l); toast('Moved to ' + STATUS_LABEL[l.status]); draw(); refreshBadge(); } catch (er) { fail(er); } };
      });
    }
    $$('[data-st]', v).forEach(b => b.onclick = () => { leadState.status = b.dataset.st; draw(); });
    $$('[data-view]', v).forEach(b => b.onclick = () => { leadState.view = b.dataset.view; try { localStorage.setItem('mpf-leads-view', leadState.view); } catch (e) {} draw(); });
    $('#srcf', v).onchange = e => { leadState.src = e.target.value; draw(); };
    $$('[data-open]', v).forEach(r => r.onclick = () => openLead(leads.find(l => l.id === r.dataset.open), draw));
    $('#add', v).onclick = () => openLead({ status: 'new', notes: [], source: 'Manual' }, draw, leads);
    $('#csv', v).onclick = () => {
      const cols = ['created_at', 'name', 'partner', 'email', 'phone', 'event_type', 'event_date', 'location', 'status', 'value', 'follow_up', 'source', 'message'];
      const csv = [cols.join(',')].concat(rows.map(l => cols.map(c => `"${String(c === 'source' ? srcOf(l) : l[c] ?? '').replace(/"/g, '""')}"`).join(','))).join('\n');
      download(`mpf-enquiries-${today()}.csv`, csv, 'text/csv'); toast(`Exported ${rows.length} enquiries`);
    };
  };
  draw();
  const gs = $('#global-search'); if (gs.value && gs.value !== leadState.q) { leadState.q = gs.value; draw(); }
  if (openId) { const l = leads.find(x => x.id === openId); if (l) openLead(l, draw); }
}
function openLead(l, redraw, list) {
  const isNew = !l.id, phoneDigits = String(l.phone || '').replace(/\D/g, ''), wa = phoneDigits ? (phoneDigits.length === 10 ? '91' + phoneDigits : phoneDigits) : '';
  const hi = `Hi ${l.name || ''}, this is Million's Photography & Films. Thank you for your enquiry${l.event_date ? ' for ' + fmtDate(l.event_date) : ''}! `;
  const body = el(`<div>
    ${isNew ? '' : `<div class="quick">${wa ? `<a class="btn sm" target="_blank" rel="noopener" href="https://wa.me/${wa}?text=${encodeURIComponent(hi)}">${I.wa}WhatsApp</a>` : ''}${l.phone ? `<a class="btn sm" href="tel:${esc(l.phone)}">${I.phone}Call</a>` : ''}${l.email ? `<a class="btn sm" href="mailto:${esc(l.email)}?subject=${encodeURIComponent('Your enquiry — Million\'s Photography & Films')}&body=${encodeURIComponent(hi)}">${I.mail}Email</a>` : ''}</div>`}
    <div class="grid3">${select('Status', 'status', l.status || 'new', STATUSES)}${field('Follow-up date', 'follow_up', l.follow_up || '', { type: 'date' })}${field('Package value (₹)', 'value', l.value ?? '', { type: 'number', attrs: 'min="0" step="1000"' })}</div>
    <div class="grid2">${field('Name', 'name', l.name)}${field("Partner's name", 'partner', l.partner)}${field('Email', 'email', l.email, { type: 'email' })}${field('Phone', 'phone', l.phone, { type: 'tel' })}${field('Event type', 'event_type', l.event_type)}${field('Event date', 'event_date', l.event_date || '', { type: 'date' })}</div>
    ${field('Location', 'location', l.location)}
    ${isNew ? field('Message', 'message', l.message, { rows: 4 }) + field('Source', 'source', l.source || 'Manual', { help: 'e.g. Instagram, Referral, Walk-in, WeddingWire' }) : `<h4 class="section-title" style="font-size:18px">Their message</h4><div class="msg">${esc(l.message || '—')}</div>
    <dl class="kv"><dt>Source</dt><dd>${esc(srcOf(l))}</dd>${l.utm && Object.keys(l.utm).length ? `<dt>Campaign</dt><dd>${esc(Object.entries(l.utm).map(([k, v]) => k.replace('utm_', '') + ': ' + v).join(' · '))}</dd>` : ''}${l.page ? `<dt>Landing page</dt><dd>${esc(l.page)}</dd>` : ''}${l.referrer ? `<dt>Referrer</dt><dd>${esc(l.referrer)}</dd>` : ''}<dt>Received</dt><dd>${new Date(l.created_at).toLocaleString('en-IN')}</dd></dl>
    <h4 class="section-title" style="font-size:18px">Notes &amp; activity</h4><ul class="timeline">${(l.notes || []).slice().reverse().map(n => `<li>${esc(n.text)}<small>${esc(n.by || '')} · ${fmtAgo(n.at)}</small></li>`).join('') || '<li class="muted">No notes yet.</li>'}</ul>
    <div class="note-add"><input type="text" id="note" placeholder="Add a note — call summary, quote sent, preferences…"><button type="button" class="btn" id="addnote">Add</button></div>`}
  </div>`);
  const d = drawer({
    title: isNew ? 'New enquiry' : `${l.name}${l.partner ? ' & ' + l.partner : ''}`, body,
    onSave: async b => {
      const o = vals(b); if (!o.name) { toast('Name is required', true); return false; }
      const next = { ...l, ...o }; delete next.undefined;
      if (!isNew && o.status !== l.status) next.notes = [...(l.notes || []), { at: new Date().toISOString(), by: session.user.email, text: `Status: ${STATUS_LABEL[l.status]} → ${STATUS_LABEL[o.status]}`, sys: true }];
      const n = $('#note', b); if (n && n.value.trim()) next.notes = [...(next.notes || []), { at: new Date().toISOString(), by: session.user.email, text: n.value.trim() }];
      const saved = await store.upsert('leads', next); Object.assign(l, saved); if (isNew && list) list.unshift(saved);
      toast(isNew ? 'Enquiry added' : 'Saved'); refreshBadge(); if (isNew) route(); else redraw();
    },
    onDelete: isNew ? null : async () => { await store.remove('leads', l.id); toast('Deleted'); refreshBadge(); route(); }
  });
  const an = $('#addnote', body); if (an) an.onclick = async () => {
    const n = $('#note', body); if (!n.value.trim()) return;
    l.notes = [...(l.notes || []), { at: new Date().toISOString(), by: session.user.email, text: n.value.trim() }];
    try { await store.upsert('leads', l); n.value = ''; d.close(); openLead(l, redraw); redraw(); toast('Note added'); } catch (e) { fail(e); }
  };
}

/* ================= PORTFOLIO ================= */
let pfCat = 'all';
async function viewPortfolio(v) {
  let media = await store.list('media');
  const draw = () => {
    const rows = media.filter(m => pfCat === 'all' || (m.categories || []).includes(pfCat));
    v.innerHTML = `<div class="toolbar"><div class="chips"><button class="chip ${pfCat === 'all' ? 'on' : ''}" data-c="all">All <b>${media.length}</b></button>${PCATS.map(([c, t]) => `<button class="chip ${pfCat === c ? 'on' : ''}" data-c="${c}">${t} <b>${media.filter(m => (m.categories || []).includes(c)).length}</b></button>`).join('')}</div><span class="sp"></span><span class="muted" style="font-size:13px">Drag to reorder · order matches the website</span></div><div id="dz"></div><div class="mgrid" id="mg" style="margin-top:16px">${rows.map(m => `<div class="mcard" data-id="${m.id}"><span class="handle" title="Drag to reorder">${I.grip}</span>${m.featured ? '<span class="star">★ Featured</span>' : ''}<div class="ph" data-edit="${m.id}"><img src="${esc(thumb(m.image))}" alt="${esc(m.alt)}" loading="lazy"></div><div class="bd"><b>${esc(m.alt || 'Untitled')}</b><div class="tags">${(m.categories || []).map(c => `<span class="tag">${esc(c)}</span>`).join('')}</div></div>${moveBtns}</div>`).join('')}</div>${rows.length ? '' : '<div class="card empty"><b>No photos here yet</b>Upload some above.</div>'}`;
    $('#dz', v).appendChild(dropzone({ onFiles: async (files, z) => {
      const ups = await uploadImages(files, z); if (!ups.length) return;
      const base = media.length;
      for (const [i, u] of ups.entries()) media.push(await store.upsert('media', { image: u.image, alt: u.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '), categories: pfCat === 'all' ? ['wedding'] : [pfCat], featured: false, sort: base + i }));
      toast(`${ups.length} photo${ups.length > 1 ? 's' : ''} added`); draw();
    } }));
    $$('[data-c]', v).forEach(b => b.onclick = () => { pfCat = b.dataset.c; draw(); });
    $$('[data-edit]', v).forEach(p => p.onclick = () => editMedia(media.find(m => m.id === p.dataset.edit)));
    sortable($('#mg', v), async ids => { const rest = media.filter(m => !ids.includes(m.id)).map(m => m.id); const all = pfCat === 'all' ? ids : [...ids, ...rest]; await store.bulkSort('media', all); media = await store.list('media'); toast('Order saved'); });
  };
  const editMedia = m => drawer({
    title: 'Edit photo', body: `<div><img src="${esc(thumb(m.image))}" alt="" style="border-radius:10px;max-height:340px;margin:14px auto;object-fit:contain">${field('Description (alt text)', 'alt', m.alt, { help: 'Describes the photo for Google and screen readers, e.g. "Bride in red lehenga at the mandap".', max: 140 })}<div class="f"><span>Categories</span>${catChecks('categories', m.categories || [])}</div>${toggle('Feature on home page', 'featured', m.featured)}</div>`,
    onSave: async b => { Object.assign(m, vals(b)); await store.upsert('media', m); toast('Saved'); draw(); },
    onDelete: async () => { await store.remove('media', m.id); media = media.filter(x => x.id !== m.id); toast('Photo removed'); draw(); }
  });
  draw();
}

/* ================= STORIES ================= */
async function viewStories(v) {
  let stories = await store.list('stories');
  const draw = () => {
    v.innerHTML = `<div class="toolbar"><span class="muted">${stories.length} couple stories · drag to reorder</span><span class="sp"></span><button class="btn pri" id="new">${I.plus}New story</button></div><div class="mgrid" id="sg">${stories.map(s => `<div class="mcard" data-id="${s.id}"><span class="handle">${I.grip}</span>${s.published ? '' : '<span class="off">Draft</span>'}<div class="ph" data-edit="${s.id}">${s.cover ? `<img src="${esc(thumb(s.cover))}" alt="" loading="lazy">` : ''}</div><div class="bd"><b>${esc(s.names)}</b><small>${esc(s.kind)} · ${(s.gallery || []).length} photos${s.youtube_id ? ' · film' : ''}</small></div>${moveBtns}</div>`).join('')}</div>`;
    $('#new', v).onclick = () => editStory({ names: '', kind: 'Wedding', gallery: [], published: false, sort: stories.length });
    $$('[data-edit]', v).forEach(p => p.onclick = () => editStory(stories.find(s => s.id === p.dataset.edit)));
    sortable($('#sg', v), async ids => { await store.bulkSort('stories', ids); stories = await store.list('stories'); toast('Order saved'); });
  };
  const editStory = s => {
    const isNew = !s.id; let gallery = [...(s.gallery || [])];
    const body = el(`<div>${field('Couple / story title', 'names', s.names, { ph: 'Anisha & Aditya' })}<div class="grid3">${field('URL slug', 'slug', s.slug || '', { help: 'Auto-filled from the title' })}${select('Type', 'kind', s.kind, [['Wedding', 'Wedding'], ['Pre-Wedding', 'Pre-wedding'], ['Engagement', 'Engagement'], ['Reception', 'Reception']])}${field('Setting', 'setting', s.setting, { ph: 'Palace wedding, Udaipur' })}</div>
      ${field('Intro', 'intro', s.intro, { rows: 2, max: 240 })}${field('Story (optional)', 'body', s.body, { rows: 4, help: 'A longer write-up shown under the intro.' })}
      <div id="imgs" class="grid2"></div>${field('Wedding film (YouTube link)', 'youtube', s.youtube_id ? 'https://youtu.be/' + s.youtube_id : '', { type: 'url', ph: 'https://youtu.be/…' })}<div class="yt" id="ytp"></div>
      ${toggle('Published on website', 'published', s.published)}
      <h4 class="section-title" style="font-size:20px">Gallery <span class="muted" style="font-size:14px;font-family:var(--f-ui)">— drag to reorder, set each photo's filter tab</span></h4><div id="gdz"></div><div class="toolbar" style="margin:10px 0 0"><button type="button" class="btn sm" id="gpick">Add from library</button><span class="muted" id="gcount"></span></div><div class="gallery-edit" id="gal"></div></div>`);
    const cover = imageField('Cover (client grid)', s.cover, { help: 'Portrait or square works best.' }), hero = imageField('Banner image', s.hero, { widths: [800, 1600, 2400], help: 'Wide landscape, shown at the top of the story.' });
    $('#imgs', body).append(cover, hero);
    const nameIn = $('[name=names]', body), slugIn = $('[name=slug]', body); let slugTouched = !!s.slug;
    slugIn.oninput = () => slugTouched = true; nameIn.oninput = () => { if (!slugTouched) slugIn.value = slugify(nameIn.value); };
    const yt = $('[name=youtube]', body), ytp = $('#ytp', body); const ytDraw = () => { const id = youtubeId(yt.value); ytp.innerHTML = id ? `<img src="https://img.youtube.com/vi/${id}/mqdefault.jpg" alt=""><span class="status-dot" style="--c:var(--ok)">Film linked</span>` : yt.value ? '<span class="status-dot" style="--c:var(--bad)">Not a valid YouTube link</span>' : ''; }; yt.oninput = ytDraw; ytDraw();
    const gal = $('#gal', body);
    const gdraw = () => {
      gal.innerHTML = gallery.map((g, i) => `<div class="gi" data-id="${i}"><img src="${esc(thumb(g.image))}" alt=""><button type="button" data-rm="${i}" aria-label="Remove">${I.x}</button><select data-cat="${i}" aria-label="Filter tab">${[['ceremony', 'Ceremony'], ['portraits', 'Portraits'], ['celebrations', 'Celebrations']].map(([c, t]) => `<option value="${c}" ${(g.categories || [])[0] === c ? 'selected' : ''}>${t}</option>`).join('')}</select></div>`).join('');
      $('#gcount', body).textContent = gallery.length + ' photos';
      $$('[data-rm]', gal).forEach(b => b.onclick = e => { e.stopPropagation(); gallery.splice(+b.dataset.rm, 1); gdraw(); });
      $$('[data-cat]', gal).forEach(sel => { sel.onclick = e => e.stopPropagation(); sel.onchange = () => { const g = gallery[+sel.dataset.cat]; g.categories = [sel.value, ...(g.categories || []).filter(c => c !== sel.value && !['ceremony', 'portraits', 'celebrations'].includes(c))]; }; });
      sortable(gal, ids => { gallery = ids.map(i => gallery[+i]); gdraw(); });
    };
    $('#gdz', body).appendChild(dropzone({ onFiles: async (files, z) => { const ups = await uploadImages(files, z); ups.forEach(u => gallery.push({ image: u.image, alt: s.names || '', categories: ['portraits'] })); gdraw(); } }));
    $('#gpick', body).onclick = async () => { const m = await pickMedia(true); if (m) { m.forEach(x => gallery.push({ image: x.image, alt: x.alt, categories: (x.categories || []).filter(c => ['ceremony', 'portraits', 'celebrations'].includes(c)).concat(['portraits']).slice(0, 1) })); gdraw(); } };
    gdraw(); liveCounts(body);
    drawer({ title: isNew ? 'New story' : s.names, body, wide: true,
      onSave: async b => {
        const o = vals(b); if (!o.names) { toast('Add a title', true); return false; }
        const next = { ...s, names: o.names, slug: o.slug || slugify(o.names), kind: o.kind, setting: o.setting, intro: o.intro, body: o.body, published: o.published, youtube_id: youtubeId(o.youtube), cover: cover._value, hero: hero._value || cover._value, gallery };
        if (stories.some(x => x.slug === next.slug && x.id !== s.id)) next.slug += '-' + Math.random().toString(36).slice(2, 5);
        await store.upsert('stories', next); stories = await store.list('stories'); toast('Story saved'); draw();
      },
      onDelete: isNew ? null : async () => { await store.remove('stories', s.id); stories = stories.filter(x => x.id !== s.id); toast('Story deleted'); draw(); } });
  };
  draw();
}

/* ================= FILMS ================= */
async function viewFilms(v) {
  let films = await store.list('films');
  const draw = () => {
    v.innerHTML = `<div class="toolbar"><span class="muted">${films.length} films · ★ = shown on home page · drag to reorder</span><span class="sp"></span><button class="btn pri" id="new">${I.plus}Add film</button></div><div class="mgrid" id="fg" style="grid-template-columns:repeat(auto-fill,minmax(240px,1fr))">${films.map(f => `<div class="mcard wide-card" data-id="${f.id}"><span class="handle">${I.grip}</span>${f.published ? (f.featured ? '<span class="star">★ Home</span>' : '') : '<span class="off">Hidden</span>'}<div class="ph" data-edit="${f.id}">${f.cover ? `<img src="${esc(thumb(f.cover))}" alt="" loading="lazy">` : ''}</div><div class="bd"><b>${esc(f.title)}</b><small>${esc(f.subtitle || '')}${f.duration ? ' · ' + esc(f.duration) : ''} · ${f.youtube_id ? '<span style="color:var(--ok)">YouTube linked</span>' : '<span style="color:var(--warn)">No video yet</span>'}</small></div>${moveBtns}</div>`).join('')}</div>`;
    $('#new', v).onclick = () => editFilm({ title: '', featured: true, published: true, sort: films.length });
    $$('[data-edit]', v).forEach(p => p.onclick = () => editFilm(films.find(f => f.id === p.dataset.edit)));
    sortable($('#fg', v), async ids => { await store.bulkSort('films', ids); films = await store.list('films'); toast('Order saved'); });
  };
  const editFilm = f => {
    const isNew = !f.id;
    const body = el(`<div>${field('Title', 'title', f.title, { ph: 'A Timeless Beginning' })}<div class="grid2">${field('Subtitle', 'subtitle', f.subtitle, { ph: 'Wedding film' })}${field('Duration', 'duration', f.duration, { ph: '04:12' })}</div>${field('YouTube link', 'youtube', f.youtube_id ? 'https://youtu.be/' + f.youtube_id : '', { type: 'url', ph: 'https://www.youtube.com/watch?v=…', help: 'Paste any YouTube URL — watch, share, Shorts or embed links all work.' })}<div class="yt" id="ytp"></div><div id="cv"></div>${toggle('Show on home page', 'featured', f.featured)} ${toggle('Published', 'published', f.published)}</div>`);
    const cover = imageField('Cover image', f.cover, { help: 'Landscape 16:9. Or use the YouTube thumbnail →' }); $('#cv', body).appendChild(cover);
    const yt = $('[name=youtube]', body), ytp = $('#ytp', body);
    const ytDraw = () => { const id = youtubeId(yt.value); ytp.innerHTML = id ? `<img src="https://img.youtube.com/vi/${id}/mqdefault.jpg" alt=""><button type="button" class="btn sm" id="usey">Use as cover</button>` : yt.value ? '<span class="status-dot" style="--c:var(--bad)">Not a valid YouTube link</span>' : ''; const u = $('#usey', ytp); if (u) u.onclick = () => { cover._value = { src: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`, set: {} }; $('.thumb', cover).innerHTML = `<img src="https://img.youtube.com/vi/${id}/mqdefault.jpg" alt="">`; toast('YouTube thumbnail set as cover'); }; };
    yt.oninput = ytDraw; ytDraw();
    drawer({ title: isNew ? 'Add film' : f.title, body,
      onSave: async b => { const o = vals(b); if (!o.title) { toast('Add a title', true); return false; }
        const next = { ...f, title: o.title, subtitle: o.subtitle, duration: o.duration, youtube_id: youtubeId(o.youtube), featured: o.featured, published: o.published, cover: cover._value, slug: f.slug || slugify(o.title) || uuid().slice(0, 8) };
        await store.upsert('films', next); films = await store.list('films'); toast('Film saved'); draw(); },
      onDelete: isNew ? null : async () => { await store.remove('films', f.id); films = films.filter(x => x.id !== f.id); toast('Film removed'); draw(); } });
  };
  draw();
}

/* ================= HERO CAROUSEL ================= */
async function viewHero(v) {
  let slides = await store.list('hero_slides');
  const draw = () => {
    v.innerHTML = `<div class="toolbar"><span class="muted">The full-screen slideshow at the top of the home page. Images or looping videos · drag to reorder.</span><span class="sp"></span><button class="btn pri" id="new">${I.plus}Add slide</button></div><div class="mgrid" id="hg" style="grid-template-columns:repeat(auto-fill,minmax(300px,1fr))">${slides.map((s, i) => `<div class="mcard wide-card" data-id="${s.id}"><span class="handle">${I.grip}</span>${s.active ? `<span class="star">${s.kind === 'video' ? '▶ Video' : 'Slide ' + (i + 1)}</span>` : '<span class="off">Hidden</span>'}<div class="ph" data-edit="${s.id}">${s.kind === 'video' && s.video_url ? `<video src="${esc(s.video_url)}" muted loop playsinline autoplay ${s.poster ? `poster="${esc(thumb(s.poster))}"` : ''}></video>` : s.image ? `<img src="${esc(thumb(s.image))}" alt="">` : ''}</div><div class="bd"><b>${esc((s.heading || '').replace(/\n/g, ' ') || 'No heading')}</b><small>${esc(s.eyebrow || '')}</small></div>${moveBtns}</div>`).join('')}</div>${slides.length ? '' : '<div class="card empty"><b>No slides</b>The website keeps its built-in slides until you add one.</div>'}`;
    $('#new', v).onclick = () => editSlide({ kind: 'image', active: true, sort: slides.length, eyebrow: slides[0]?.eyebrow || '', heading: slides[0]?.heading || '', button_label: 'Explore portfolio', button_link: 'portfolio.html' });
    $$('[data-edit]', v).forEach(p => p.onclick = () => editSlide(slides.find(s => s.id === p.dataset.edit)));
    sortable($('#hg', v), async ids => { await store.bulkSort('hero_slides', ids); slides = await store.list('hero_slides'); toast('Order saved'); });
  };
  const editSlide = s => {
    const isNew = !s.id;
    const body = el(`<div><div class="seg" style="margin:14px 0 4px"><button type="button" data-k="image" class="${s.kind !== 'video' ? 'on' : ''}">${I.photo}Image</button><button type="button" data-k="video" class="${s.kind === 'video' ? 'on' : ''}">${I.film}Video</button></div>
      <div id="media"></div>${field('Small line above heading', 'eyebrow', s.eyebrow, { max: 70 })}${field('Heading', 'heading', s.heading, { rows: 2, help: 'Use a line break for two lines.', max: 60 })}<div class="grid2">${field('Button label', 'button_label', s.button_label)}${field('Button link', 'button_link', s.button_link, { ph: 'portfolio.html' })}</div>${toggle('Show this slide', 'active', s.active)}</div>`);
    let kind = s.kind || 'image';
    const img = imageField('Slide image', s.image, { widths: [800, 1600, 2400], help: 'Landscape, at least 2000px wide. Faces near the centre stay visible on phones.' });
    const vid = imageField('Video file', s.video_url, { video: true, help: 'MP4 or WebM, under 50 MB. Best: 10–20 s, 1080p, no sound needed (it plays muted).' });
    const poster = imageField('Poster image (shown while video loads)', s.poster, { widths: [800, 1600, 2400] });
    const m = $('#media', body); const paint = () => { m.innerHTML = ''; kind === 'video' ? m.append(vid, poster) : m.append(img); };
    $$('[data-k]', body).forEach(b => b.onclick = () => { kind = b.dataset.k; $$('[data-k]', body).forEach(x => x.classList.toggle('on', x === b)); paint(); });
    paint(); liveCounts(body);
    drawer({ title: isNew ? 'Add slide' : 'Edit slide', body,
      onSave: async b => { const o = vals(b);
        if (kind === 'image' && !img._value) { toast('Upload an image', true); return false; }
        if (kind === 'video' && !vid._value) { toast('Upload a video', true); return false; }
        await store.upsert('hero_slides', { ...s, ...o, kind, image: kind === 'image' ? img._value : (poster._value || s.image || null), video_url: kind === 'video' ? vid._value : null, poster: kind === 'video' ? poster._value : null });
        slides = await store.list('hero_slides'); toast('Slide saved'); draw(); },
      onDelete: isNew ? null : async () => { await store.remove('hero_slides', s.id); slides = slides.filter(x => x.id !== s.id); toast('Slide removed'); draw(); } });
  };
  draw();
}

/* ================= PAGES & FOOTER ================= */
let pageTab = 'home';
async function viewPages(v) {
  const S = await store.settings();
  const home = S.home || {}, footer = S.footer || {}, contact = S.contact || {}, social = S.social || {};
  const tabs = [['home', 'Home page'], ['footer', 'Footer'], ['contact', 'Contact details'], ['social', 'Social links'], ['faqs', 'FAQs'], ['team', 'Team']];
  v.innerHTML = `<div class="tabs">${tabs.map(([k, t]) => `<button data-t="${k}" class="${pageTab === k ? 'on' : ''}">${t}</button>`).join('')}</div><div class="panel" id="pp"></div>`;
  $$('[data-t]', v).forEach(b => b.onclick = () => { pageTab = b.dataset.t; viewPages(v); });
  const pp = $('#pp', v);
  const saveBar = (fn) => { const b = el('<div style="margin-top:18px"><button class="btn pri">Save changes</button></div>'); $('button', b).onclick = async () => { $('button', b).disabled = true; try { await fn(); toast('Saved — live on the website'); } catch (e) { fail(e); } $('button', b).disabled = false; }; return b; };
  if (pageTab === 'home') {
    pp.innerHTML = `<div class="card"><div class="card-b">${field('Intro label', 'intro_eyebrow', home.intro_eyebrow)}${field('Intro headline', 'intro_title', home.intro_title, { rows: 2, max: 140 })}${field('Intro paragraph', 'intro_body', home.intro_body, { rows: 4 })}
      <div class="f"><span>Stats strip</span>${(home.stats || []).map((s, i) => `<div class="rowline"><label class="f"><span>Value</span><input type="text" name="sv${i}" value="${esc(s.value)}"></label><label class="f"><span>Label</span><input type="text" name="sl${i}" value="${esc(s.label)}"></label><span></span></div>`).join('')}</div>
      ${field('Quote band', 'quote', home.quote)}${field('Banner headline', 'cta_banner', home.cta_banner)}</div></div>`;
    liveCounts(pp);
    pp.appendChild(saveBar(async () => { const o = vals(pp); const stats = (home.stats || []).map((_, i) => ({ value: o['sv' + i], label: o['sl' + i] })); await store.setSetting('home', { intro_eyebrow: o.intro_eyebrow, intro_title: o.intro_title, intro_body: o.intro_body, quote: o.quote, cta_banner: o.cta_banner, stats }); }));
  } else if (pageTab === 'footer') {
    let links = [...(footer.links || [])];
    pp.innerHTML = `<div class="card"><div class="card-b">${field('Tagline', 'tagline', footer.tagline, { rows: 2 })}<div class="grid2">${field('Left column title', 'cta_title', footer.cta_title)}${field('Left column text', 'cta_text', footer.cta_text)}</div>${field('Copyright text', 'copyright', footer.copyright, { help: '© and the current year are added automatically.' })}<div class="f"><span>Footer links</span><div id="fl"></div><button type="button" class="btn sm" id="addl">${I.plus}Add link</button></div></div></div>`;
    const fl = $('#fl', pp); const ldraw = () => { fl.innerHTML = links.map((l, i) => `<div class="rowline"><label class="f"><span>Label</span><input type="text" data-l="${i}" data-k="label" value="${esc(l.label)}"></label><label class="f"><span>Link</span><input type="text" data-l="${i}" data-k="href" value="${esc(l.href)}"></label><button type="button" class="btn ghost danger" data-rml="${i}">${I.x}</button></div>`).join(''); $$('[data-l]', fl).forEach(i => i.oninput = () => links[i.dataset.l][i.dataset.k] = i.value); $$('[data-rml]', fl).forEach(b => b.onclick = () => { links.splice(+b.dataset.rml, 1); ldraw(); }); };
    ldraw(); $('#addl', pp).onclick = () => { links.push({ label: '', href: '' }); ldraw(); };
    pp.appendChild(saveBar(async () => { const o = vals($('.card-b', pp)); await store.setSetting('footer', { tagline: o.tagline, cta_title: o.cta_title, cta_text: o.cta_text, copyright: o.copyright, links: links.filter(l => l.label && l.href) }); }));
  } else if (pageTab === 'contact') {
    pp.innerHTML = `<div class="card"><div class="card-b"><div class="grid2">${field('Email', 'email', contact.email, { type: 'email' })}${field('Phone (display)', 'phone', contact.phone, { type: 'tel', ph: '+91 98765 43210' })}</div>${field('WhatsApp number', 'whatsapp', contact.whatsapp, { ph: '919876543210', help: 'Country code + number, digits only. Turns on WhatsApp enquiries, the mobile WhatsApp button and the floating chat button.' })}${field('Studio address', 'address', contact.address, { rows: 2 })}${field('Map search text', 'map_query', contact.map_query, { help: 'What Google Maps should search for — usually the business name and area.' })}${field('Hours', 'hours', contact.hours, { ph: 'Mon–Sat, 10am–7pm' })}</div></div>`;
    pp.appendChild(saveBar(async () => { const o = vals(pp); o.whatsapp = o.whatsapp.replace(/\D/g, ''); await store.setSetting('contact', o); }));
  } else if (pageTab === 'social') {
    pp.innerHTML = `<div class="card"><div class="card-b">${['instagram', 'facebook', 'youtube', 'pinterest'].map(k => field(k[0].toUpperCase() + k.slice(1), k, social[k], { type: 'url', ph: `https://www.${k}.com/yourstudio` })).join('')}</div></div>`;
    pp.appendChild(saveBar(async () => store.setSetting('social', vals(pp))));
  } else if (pageTab === 'faqs') {
    let faqs = await store.list('faqs');
    const fdraw = () => { pp.innerHTML = `<div class="toolbar"><span class="muted">Shown on the Contact page and to Google as FAQ results.</span><span class="sp"></span><button class="btn pri" id="nf">${I.plus}Add question</button></div><div class="stack" id="fq">${faqs.map(f => `<div class="card" data-id="${f.id}" style="cursor:pointer"><div class="card-b" style="display:flex;gap:12px;align-items:center"><span class="handle" style="position:static;box-shadow:none">${I.grip}</span><div style="flex:1"><b>${esc(f.q)}</b><p class="help">${esc(f.a).slice(0, 140)}</p></div>${f.published ? '' : '<span class="tag">Hidden</span>'}</div></div>`).join('')}</div>`;
      $('#nf', pp).onclick = () => efaq({ q: '', a: '', published: true, sort: faqs.length });
      $$('#fq [data-id]', pp).forEach(c => c.onclick = e => { if (!e.target.closest('.handle')) efaq(faqs.find(f => f.id === c.dataset.id)); });
      sortable($('#fq', pp), async ids => { await store.bulkSort('faqs', ids); faqs = await store.list('faqs'); }); };
    const efaq = f => drawer({ title: f.id ? 'Edit question' : 'New question', body: `<div>${field('Question', 'q', f.q)}${field('Answer', 'a', f.a, { rows: 5 })}${toggle('Published', 'published', f.published)}</div>`,
      onSave: async b => { const o = vals(b); if (!o.q || !o.a) { toast('Add a question and an answer', true); return false; } await store.upsert('faqs', { ...f, ...o }); faqs = await store.list('faqs'); fdraw(); toast('Saved'); },
      onDelete: f.id ? async () => { await store.remove('faqs', f.id); faqs = faqs.filter(x => x.id !== f.id); fdraw(); } : null });
    fdraw();
  } else if (pageTab === 'team') {
    let team = await store.list('team');
    const tdraw = () => { pp.innerHTML = `<div class="toolbar"><span class="muted">Founders and team on the About page · drag to reorder</span><span class="sp"></span><button class="btn pri" id="nt">${I.plus}Add person</button></div><div class="mgrid" id="tg">${team.map(t => `<div class="mcard" data-id="${t.id}"><span class="handle">${I.grip}</span>${t.is_founder ? '<span class="star">Founder</span>' : ''}<div class="ph" data-edit="${t.id}">${t.photo ? `<img src="${esc(thumb(t.photo))}" alt="">` : ''}</div><div class="bd"><b>${esc(t.name)}</b><small>${esc(t.role || '')}</small></div>${moveBtns}</div>`).join('')}</div>`;
      $('#nt', pp).onclick = () => eteam({ name: '', role: '', is_founder: false, sort: team.length });
      $$('[data-edit]', pp).forEach(c => c.onclick = () => eteam(team.find(t => t.id === c.dataset.edit)));
      sortable($('#tg', pp), async ids => { await store.bulkSort('team', ids); team = await store.list('team'); }); };
    const eteam = t => { const body = el(`<div>${field('Name', 'name', t.name)}${field('Role', 'role', t.role, { ph: 'Lead photographer' })}${field('Short bio', 'bio', t.bio, { rows: 3 })}<div id="ph"></div>${toggle('Show as founder (large card)', 'is_founder', t.is_founder)}</div>`);
      const ph = imageField('Photo', t.photo); $('#ph', body).appendChild(ph);
      drawer({ title: t.id ? t.name : 'Add person', body, onSave: async b => { const o = vals(b); if (!o.name) { toast('Add a name', true); return false; } await store.upsert('team', { ...t, ...o, photo: ph._value }); team = await store.list('team'); tdraw(); toast('Saved'); },
        onDelete: t.id ? async () => { await store.remove('team', t.id); team = team.filter(x => x.id !== t.id); tdraw(); } : null }); };
    tdraw();
  }
}

/* ================= MARKETING ================= */
async function viewMarketing(v) {
  const S = await store.settings(); const mk = S.marketing || {}, seo = S.seo || {}, ann = mk.announcement || {};
  const leads = cache.leads || await store.list('leads');
  const bySrc = {}; leads.forEach(l => { const s = srcOf(l); bySrc[s] = bySrc[s] || { n: 0, b: 0, v: 0 }; bySrc[s].n++; if (l.status === 'booked') { bySrc[s].b++; bySrc[s].v += +l.value || 0; } });
  const ok = (re, x) => x && re.test(x);
  const checks = { ga4: /^G-[A-Z0-9]{6,}$/, gtm: /^GTM-[A-Z0-9]{4,}$/, meta_pixel: /^\d{10,20}$/, gads_id: /^AW-\d{6,}$/ };
  const dot = (k) => { const x = mk[k]; return !x ? '<span class="status-dot" style="--c:var(--line-2)">Not set</span>' : ok(checks[k], x) ? '<span class="status-dot" style="--c:var(--ok)">Active</span>' : '<span class="status-dot" style="--c:var(--bad)">Check format</span>'; };
  const pages = [['index', 'Home', ''], ['about', 'About', 'about'], ['portfolio', 'Portfolio', 'portfolio'], ['films', 'Films', 'films'], ['clients', 'Clients', 'clients'], ['contact', 'Contact', 'contact']];
  v.innerHTML = `<div class="mk-grid">
   <div class="card"><div class="card-h"><h3>Tracking &amp; ads</h3></div><div class="card-b" id="trk">
     <div class="grid2"><div>${field('Google Analytics 4', 'ga4', mk.ga4, { ph: 'G-XXXXXXXXXX' })}${dot('ga4')}</div><div>${field('Google Tag Manager', 'gtm', mk.gtm, { ph: 'GTM-XXXXXXX' })}${dot('gtm')}</div>
     <div>${field('Meta (Facebook/Instagram) Pixel', 'meta_pixel', mk.meta_pixel, { ph: '123456789012345' })}${dot('meta_pixel')}</div><div>${field('Google Ads ID', 'gads_id', mk.gads_id, { ph: 'AW-123456789' })}${dot('gads_id')}</div></div>
     ${field('Google Ads conversion label', 'gads_label', mk.gads_label, { ph: 'AbCdEfGhIj', help: 'Fires on every successful enquiry. GA4 gets a <code>generate_lead</code> event and Meta Pixel a <code>Lead</code> event automatically.' })}
     ${toggle('Floating WhatsApp button on website', 'whatsapp_button', mk.whatsapp_button !== false)}<p class="help">Needs a WhatsApp number in Pages &amp; footer → Contact details.</p>
     <button class="btn pri" id="savetrk" style="margin-top:12px">Save tracking</button></div></div>
   <div class="card"><div class="card-h"><h3>Announcement bar</h3></div><div class="card-b" id="annf">
     <div class="ann-preview" id="annp"></div>${toggle('Show on website', 'active', ann.active)}${field('Message', 'text', ann.text, { max: 90 })}<div class="grid2">${field('Link', 'link', ann.link, { ph: 'contact.html' })}${field('Link label', 'link_label', ann.link_label)}</div><button class="btn pri" id="saveann">Save announcement</button></div></div>
   <div class="card"><div class="card-h"><h3>Campaign link builder</h3></div><div class="card-b" id="utm">
     <p class="help" style="margin-top:0">Tag links you share in ads, Instagram bio, WhatsApp broadcasts or QR codes. Every enquiry from them shows its source in the CRM.</p>
     <div class="grid2">${select('Page', 'page', '', pages.map(p => [p[2] ? p[2] + '.html' : '', p[1]]))}${select('Source', 'utm_source', 'instagram', [['instagram', 'Instagram'], ['facebook', 'Facebook'], ['google', 'Google'], ['whatsapp', 'WhatsApp'], ['youtube', 'YouTube'], ['weddingwire', 'WeddingWire'], ['qr', 'QR code / print'], ['email', 'Email']])}
     ${select('Medium', 'utm_medium', 'social', [['social', 'Organic social'], ['paid_social', 'Paid social'], ['cpc', 'Search ads (CPC)'], ['referral', 'Referral'], ['broadcast', 'Broadcast'], ['print', 'Print'], ['email', 'Email']])}${field('Campaign name', 'utm_campaign', 'wedding-season-2027')}</div>${field('Content / ad variant (optional)', 'utm_content', '')}
     <div class="copyline"><input type="text" id="utmout" readonly><button class="btn" id="cpy">${I.copy}Copy</button></div></div></div>
   <div class="card"><div class="card-h"><h3>Lead sources performance</h3></div><div class="card-b"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Source</th><th>Leads</th><th>Booked</th><th>Conv.</th><th>Booked value</th></tr></thead><tbody>${Object.entries(bySrc).sort((a, b) => b[1].n - a[1].n).map(([k, s]) => `<tr style="cursor:default"><td><b>${esc(k)}</b></td><td>${s.n}</td><td>${s.b}</td><td>${Math.round(s.b / s.n * 100)}%</td><td>${inr(s.v)}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">No enquiries yet.</td></tr>'}</tbody></table></div></div></div>
  </div>
  <h3 class="section-title">SEO — search titles &amp; descriptions</h3><p class="help" style="margin-top:-6px">Leave blank to keep the built-in text. Titles ≈ 60 characters, descriptions ≈ 155.</p>
  <div class="mk-grid" id="seo">${pages.map(([k, t]) => `<div class="card"><div class="card-h"><h3>${t}</h3></div><div class="card-b">${field('Title', 'title_' + k, (seo[k] || {}).title, { max: 60 })}${field('Description', 'desc_' + k, (seo[k] || {}).description, { rows: 2, max: 160 })}<div class="serp" data-serp="${k}"></div></div></div>`).join('')}</div>
  <div style="margin-top:16px"><button class="btn pri" id="saveseo">Save SEO</button></div>`;
  liveCounts(v);
  const site = location.origin + '/';
  $('#savetrk', v).onclick = async () => { const o = vals($('#trk', v)); ['ga4', 'gtm', 'gads_id'].forEach(k => o[k] = (o[k] || '').toUpperCase()); try { const cur = (await store.settings()).marketing || {}; await store.setSetting('marketing', { ...cur, ...o }); toast('Tracking saved'); viewMarketing(v); } catch (e) { fail(e); } };
  const annDraw = () => { const o = vals($('#annf', v)); $('#annp', v).innerHTML = o.active ? `${esc(o.text)}${o.link ? `<a>${esc(o.link_label || 'Learn more')} →</a>` : ''}` : '<span style="opacity:.6">Hidden</span>'; };
  $('#annf', v).addEventListener('input', annDraw); annDraw();
  $('#saveann', v).onclick = async () => { const o = vals($('#annf', v)); try { const cur = (await store.settings()).marketing || {}; await store.setSetting('marketing', { ...cur, announcement: o }); toast('Announcement saved'); } catch (e) { fail(e); } };
  const utm = () => { const o = vals($('#utm', v)); const u = new URL(o.page || '', site); ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].forEach(k => o[k] && u.searchParams.set(k, slugify(o[k]))); $('#utmout', v).value = u.toString(); };
  $('#utm', v).addEventListener('input', utm); $('#utm', v).addEventListener('change', utm); utm();
  $('#cpy', v).onclick = () => copy($('#utmout', v).value);
  const serp = () => pages.forEach(([k, t, p]) => { const o = vals($('#seo', v)); $(`[data-serp="${k}"]`, v).innerHTML = `<div class="u">${esc(site + (p ? p : ''))}</div><div class="t">${esc(o['title_' + k] || t + " | Million's Photography & Films")}</div><div class="d">${esc(o['desc_' + k] || 'Built-in description')}</div>`; });
  $('#seo', v).addEventListener('input', serp); serp();
  $('#saveseo', v).onclick = async () => { const o = vals($('#seo', v)); const out = {}; pages.forEach(([k]) => out[k] = { title: o['title_' + k], description: o['desc_' + k] }); try { await store.setSetting('seo', out); toast('SEO saved'); } catch (e) { fail(e); } };
}

/* ================= SETTINGS ================= */
async function viewSettings(v) {
  const sup = isSupabase();
  v.innerHTML = `<div class="mk-grid">
    <div class="card"><div class="card-h"><h3>Your account</h3></div><div class="card-b"><dl class="kv"><dt>Signed in as</dt><dd>${esc(session.user.email)}</dd><dt>Role</dt><dd>${esc(session.role || '—')}</dd></dl>
      ${sup ? `<label class="f"><span>New password</span><input type="password" id="np" minlength="8" autocomplete="new-password"></label><button class="btn" id="cp">Change password</button>` : ''}
      <div style="margin-top:14px"><button class="btn danger" id="so">Sign out</button></div></div></div>
    <div class="card"><div class="card-h"><h3>Database connection</h3><span class="sp"></span>${sup ? '<span class="status-dot" style="--c:var(--ok)">Supabase connected</span>' : '<span class="status-dot" style="--c:var(--warn)">Demo mode</span>'}</div><div class="card-b">
      ${sup ? '<p>Content and enquiries are stored in Supabase. Photos and videos go to the <code>media</code> storage bucket.</p>' : `<p>Right now everything you change is saved <b>only in this browser</b>, and website enquiries go by email. To go live:</p><ol style="padding-left:18px;line-height:1.8"><li>Create a Supabase project.</li><li>Run <code>supabase/schema.sql</code>, then <code>supabase/seed.sql</code>, in its SQL editor.</li><li>Put the project URL and anon key in <code>assets/js/config.js</code> → <code>supabase</code>.</li><li>Sign up here — the first account becomes the owner.</li></ol>`}</div></div>
    <div class="card"><div class="card-h"><h3>Backup</h3></div><div class="card-b"><p class="help" style="margin-top:0">Download every enquiry, setting and content item as JSON.</p><button class="btn" id="bk">${I.dl}Download backup</button>
      ${sup ? '' : '<p class="help" style="margin-top:18px">Reset demo data to the original website content (deletes demo enquiries and edits in this browser).</p><button class="btn danger" id="rs">Reset demo data</button>'}</div></div>
  </div>`;
  $('#so', v).onclick = async () => { await store.signOut(); location.hash = ''; location.reload(); };
  $('#bk', v).onclick = async () => { const d = await store.exportAll(); download(`mpf-backup-${today()}.json`, JSON.stringify(d, null, 2), 'application/json'); };
  const rs = $('#rs', v); if (rs) rs.onclick = async () => { if (await confirmBox('Reset demo data?', 'All demo edits and test enquiries in this browser will be removed.', 'Reset')) { await store.reset(); toast('Demo data reset'); location.reload(); } };
  const cp = $('#cp', v); if (cp) cp.onclick = async () => { const p = $('#np', v).value; if (p.length < 8) return toast('Use at least 8 characters', true); const { error } = await store.sb.auth.updateUser({ password: p }); error ? fail(error) : toast('Password changed'); };
}

/* ================= boot ================= */
async function showApp() {
  $('#login').hidden = true; $('#app').hidden = false;
  const name = session.user.email || 'admin';
  $('#user').innerHTML = `<span class="who">${esc(name)}</span><span class="avatar">${esc(name[0].toUpperCase())}</span>`;
  const mb = $('#mode-badge'); mb.textContent = store.mode === 'supabase' ? 'Live · Supabase' : 'Demo mode'; mb.style.setProperty('--c', store.mode === 'supabase' ? '#7fbf95' : '#e0a85a');
  await refreshBadge();
  window.addEventListener('hashchange', route); route();
}
async function boot() {
  store = await getStore();
  $$('[data-demo]').forEach(x => x.hidden = store.mode !== 'local');
  $('#burger').onclick = () => document.body.classList.toggle('nav-open');
  $('#scrim').onclick = () => document.body.classList.remove('nav-open');
  const gs = $('#global-search'); gs.addEventListener('input', debounce(() => { leadState.q = gs.value; if (!location.hash.startsWith('#/leads')) location.hash = '#/leads'; else route(); }, 300));
  try { session = await store.session(); } catch (e) { session = null; }
  $('#boot').classList.add('gone'); setTimeout(() => $('#boot').remove(), 500);
  if (session && session.role) return showApp();
  $('#login').hidden = false;
  if (session && !session.role) $('.form-err').textContent = 'This account is signed in but is not on the studio staff list. Ask the owner to add you.';
  const f = $('#login-form');
  f.onsubmit = async e => {
    e.preventDefault(); const o = vals(f), err = $('.form-err', f), btn = $('button[type=submit]', f); err.textContent = ''; btn.disabled = true; btn.textContent = 'Signing in…';
    try { session = await store.signIn(o.email, o.password); if (!session || !session.role) throw new Error('Signed in, but this account is not on the studio staff list.'); showApp(); }
    catch (x) { err.textContent = x.message; } finally { btn.disabled = false; btn.textContent = 'Sign in'; }
  };
  $('#forgot').onclick = async () => { const em = $('[name=email]', f).value; if (!em) return $('.form-err', f).textContent = 'Enter your email above first.'; try { await store.resetPassword(em); toast('Reset link sent — check your inbox'); } catch (x) { $('.form-err', f).textContent = x.message; } };
}
boot();
