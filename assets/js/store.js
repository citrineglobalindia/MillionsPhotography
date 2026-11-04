/* Million's Photography & Films — data layer.
   Supabase when MPF_CONFIG.supabase.url + anonKey are set, otherwise a local IndexedDB "demo" store. */
const TABLES = ['hero_slides', 'media', 'films', 'stories', 'faqs', 'team', 'leads'];
const cfg = () => (window.MPF_CONFIG || {});
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2));
const bySort = (a, b) => (a.sort ?? 0) - (b.sort ?? 0) || String(a.created_at || '').localeCompare(String(b.created_at || ''));

/* ---------------- IndexedDB demo store ---------------- */
function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('mpf-demo', 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('kv'); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function kv(mode, key, val) {
  const db = await idb();
  return new Promise((res, rej) => {
    const tx = db.transaction('kv', mode === 'get' ? 'readonly' : 'readwrite'), st = tx.objectStore('kv');
    const r = mode === 'get' ? st.get(key) : mode === 'del' ? st.delete(key) : st.put(val, key);
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function seedData() {
  const r = await fetch(new URL('../data/seed.json', import.meta.url)); return r.json();
}

class LocalStore {
  constructor() { this.mode = 'local'; this._listeners = []; }
  async _db() {
    if (this._cache) return this._cache;
    let d = await kv('get', 'db');
    if (!d) { d = await seedData(); d.leads = d.leads || []; await kv('put', 'db', d); }
    TABLES.forEach(t => d[t] = d[t] || []);
    this._cache = d; return d;
  }
  async _save() { await kv('put', 'db', this._cache); try { localStorage.setItem('mpf-demo-dirty', String(Date.now())); } catch (e) {} }
  static hasEdits() { try { return !!localStorage.getItem('mpf-demo-dirty'); } catch (e) { return false; } }
  async reset() { await kv('del', 'db'); this._cache = null; try { localStorage.removeItem('mpf-demo-dirty'); } catch (e) {} }
  /* auth (demo) */
  async session() { try { return JSON.parse(sessionStorage.getItem('mpf-demo-session')); } catch (e) { return null; } }
  async signIn(email, password) {
    if (!email || !password || password.length < 4) throw new Error('Enter an email and a password of at least 4 characters.');
    const s = { user: { email, id: 'demo' }, role: 'owner', demo: true };
    sessionStorage.setItem('mpf-demo-session', JSON.stringify(s)); return s;
  }
  async signOut() { sessionStorage.removeItem('mpf-demo-session'); }
  async resetPassword() { throw new Error('Password reset is available once Supabase is connected.'); }
  /* data */
  async list(t, { filter } = {}) { const d = await this._db(); let rows = [...d[t]]; if (filter) rows = rows.filter(filter); return t === 'leads' ? rows.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))) : rows.sort(bySort); }
  async upsert(t, row) {
    const d = await this._db(); const now = new Date().toISOString();
    if (!row.id) row = { id: uuid(), created_at: now, ...row };
    row.updated_at = now;
    const i = d[t].findIndex(r => r.id === row.id);
    if (i >= 0) d[t][i] = { ...d[t][i], ...row }; else d[t].push(row);
    await this._save(); return i >= 0 ? d[t][i] : row;
  }
  async bulkSort(t, ids) { const d = await this._db(); ids.forEach((id, i) => { const r = d[t].find(x => x.id === id); if (r) r.sort = i; }); await this._save(); }
  async remove(t, id) { const d = await this._db(); d[t] = d[t].filter(r => r.id !== id); await this._save(); }
  async settings() { return (await this._db()).settings || {}; }
  async setSetting(key, value) { const d = await this._db(); d.settings = d.settings || {}; d.settings[key] = value; await this._save(); }
  async upload(path, blob) {
    return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(blob); });
  }
  async insertLead(lead) { return this.upsert('leads', { status: 'new', notes: [], ...lead }); }
  async exportAll() { return JSON.parse(JSON.stringify(await this._db())); }
}

/* ---------------- Supabase store ---------------- */
class SupaStore {
  constructor(client) { this.mode = 'supabase'; this.sb = client; }
  _e(r) { if (r.error) throw new Error(r.error.message); return r.data; }
  async session() {
    const { data } = await this.sb.auth.getSession(); if (!data.session) return null;
    const ok = this._e(await this.sb.rpc('claim_first_admin'));
    if (!ok) return { user: data.session.user, role: null };
    const st = this._e(await this.sb.from('staff').select('role').eq('user_id', data.session.user.id).maybeSingle());
    return { user: data.session.user, role: st && st.role };
  }
  async signIn(email, password) { this._e(await this.sb.auth.signInWithPassword({ email, password })); return this.session(); }
  async signOut() { await this.sb.auth.signOut(); }
  async resetPassword(email) { this._e(await this.sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/admin/' })); }
  async list(t, { filter } = {}) {
    let q = this.sb.from(t).select('*');
    q = t === 'leads' ? q.order('created_at', { ascending: false }) : q.order('sort', { ascending: true });
    let rows = this._e(await q); if (filter) rows = rows.filter(filter); return rows;
  }
  async upsert(t, row) { const r = { ...row }; if (t !== 'leads') delete r.updated_at; if (t === 'leads') r.updated_at = new Date().toISOString(); return this._e(await this.sb.from(t).upsert(r).select().single()); }
  async bulkSort(t, ids) { await Promise.all(ids.map((id, i) => this.sb.from(t).update({ sort: i }).eq('id', id))); }
  async remove(t, id) { this._e(await this.sb.from(t).delete().eq('id', id)); }
  async settings() { const rows = this._e(await this.sb.from('settings').select('key,value')); return Object.fromEntries(rows.map(r => [r.key, r.value])); }
  async setSetting(key, value) { this._e(await this.sb.from('settings').upsert({ key, value, updated_at: new Date().toISOString() })); }
  async upload(path, blob, contentType) {
    this._e(await this.sb.storage.from('media').upload(path, blob, { contentType: contentType || blob.type, upsert: true, cacheControl: '31536000' }));
    return this.sb.storage.from('media').getPublicUrl(path).data.publicUrl;
  }
  async insertLead(lead) { this._e(await this.sb.from('leads').insert({ ...lead, status: 'new', notes: [] })); return true; }
  async exportAll() {
    const out = { settings: await this.settings() };
    for (const t of TABLES) out[t] = await this.list(t);
    return out;
  }
}

let _store;
export async function getStore() {
  if (_store) return _store;
  const s = cfg().supabase || {};
  if (s.url && s.anonKey) {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    _store = new SupaStore(createClient(s.url, s.anonKey, { auth: { persistSession: true, autoRefreshToken: true } }));
  } else _store = new LocalStore();
  return _store;
}
export const isSupabase = () => { const s = cfg().supabase || {}; return !!(s.url && s.anonKey); };
export const demoHasEdits = () => LocalStore.hasEdits();
export { uuid };

/* ---------------- image helpers ---------------- */
export function imgHTML(o, alt = '', { sizes = '(max-width:720px) 100vw, 50vw', lazy = true, cls = '', extra = '' } = {}) {
  if (!o) return '';
  const set = Object.entries(o.set || {}).sort((a, b) => a[0] - b[0]);
  const ss = set.length ? ` srcset="${set.map(([w, u]) => `${u} ${w}w`).join(', ')}" sizes="${sizes}"` : '';
  const full = set.length ? set[set.length - 1][1] : o.src;
  const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  return `<img src="${esc(o.src || full)}"${ss} data-full="${esc(full)}" alt="${esc(alt)}"${o.w ? ` width="${o.w}" height="${o.h}"` : ''}${lazy ? ' loading="lazy" decoding="async"' : ' fetchpriority="high"'}${cls ? ` class="${cls}"` : ''} ${extra}>`;
}

/* Resize an image File in the browser into WebP variants and upload them. Returns an image object. */
export async function processImage(store, file, { widths = [600, 1200, 1800], folder = 'media', onProgress } = {}) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => null);
  let src = bmp;
  if (!src) { src = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); }); }
  const W = src.width, H = src.height, id = uuid(), base = `${folder}/${new Date().toISOString().slice(0, 7)}/${id}`;
  const use = widths.filter(w => w < W); if (!use.length || use[use.length - 1] < W) use.push(Math.min(W, widths[widths.length - 1]));
  const uniq = [...new Set(use)].sort((a, b) => a - b);
  const out = { set: {}, w: 0, h: 0 }; let n = 0;
  for (const w of uniq) {
    const h = Math.round(H * w / W), c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d'); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(src, 0, 0, w, h);
    const blob = await new Promise(r => c.toBlob(r, 'image/webp', 0.82));
    out.set[w] = await store.upload(`${base}-${w}.webp`, blob, 'image/webp');
    onProgress && onProgress(++n / (uniq.length + 1));
    if (w === uniq[Math.min(1, uniq.length - 1)]) { out.w = w; out.h = h; }
  }
  // JPEG fallback at the middle size
  const fw = uniq[Math.min(1, uniq.length - 1)], fh = Math.round(H * fw / W), c = document.createElement('canvas'); c.width = fw; c.height = fh;
  c.getContext('2d').drawImage(src, 0, 0, fw, fh);
  out.src = await store.upload(`${base}.jpg`, await new Promise(r => c.toBlob(r, 'image/jpeg', 0.84)), 'image/jpeg');
  onProgress && onProgress(1);
  return out;
}

export async function uploadVideo(store, file, { onProgress } = {}) {
  if (file.size > 50 * 1024 * 1024) throw new Error('Video is over 50 MB. Compress it (e.g. 1080p H.264, 8–12 Mbps, 10–20 s loop) and try again.');
  onProgress && onProgress(.1);
  const ext = (file.name.split('.').pop() || 'mp4').toLowerCase();
  const url = await store.upload(`video/${uuid()}.${ext}`, file, file.type || 'video/mp4');
  onProgress && onProgress(1); return url;
}

export function youtubeId(v) {
  if (!v) return '';
  const m = String(v).match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/); if (m) return m[1];
  return /^[\w-]{11}$/.test(v.trim()) ? v.trim() : '';
}
