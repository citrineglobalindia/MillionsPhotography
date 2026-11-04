/* Million's Photography & Films — interactions */
(() => {
  const C = window.MPF_CONFIG || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const ICON = {
    prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M15 4l-8 8 8 8"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M9 4l8 8-8 8"/></svg>'
  };

  /* ---------- preloader (first visit per session only) ---------- */
  const loader = $('.loader');
  if (loader) {
    const bar = $('.bar i', loader);
    let p = 0; const tick = setInterval(() => { p = Math.min(p + Math.random() * 18, 92); bar.style.transform = `scaleX(${p / 100})`; }, 120);
    const finish = () => {
      clearInterval(tick); bar.style.transform = 'scaleX(1)';
      setTimeout(() => { loader.classList.add('done'); document.dispatchEvent(new Event('mpf:ready')); try { sessionStorage.setItem('mpf-seen', '1'); } catch (e) {} }, 350);
    };
    if (document.documentElement.classList.contains('no-loader')) document.dispatchEvent(new Event('mpf:ready'));
    else if (document.readyState === 'complete') setTimeout(finish, 600);
    else addEventListener('load', () => setTimeout(finish, 300));
    setTimeout(finish, 4000);
  }

  /* ---------- page transition veil ---------- */
  const veil = $('.veil');
  addEventListener('pageshow', () => veil && veil.classList.remove('on'));
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || reduce || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || a.hasAttribute('download') || (url.pathname === location.pathname && url.hash)) return;
    e.preventDefault(); veil.classList.add('on'); setTimeout(() => location.href = url.href, 520);
  });

  /* ---------- config → DOM ---------- */
  $$('[data-social]').forEach(a => { const u = C.social && C.social[a.dataset.social]; if (u) a.href = u; });
  $$('[data-email]').forEach(a => { a.href = 'mailto:' + C.email; if (!a.children.length) a.textContent = C.email; });
  if (C.whatsapp) $$('.mbar a[data-email]').forEach(a => { a.href = 'https://wa.me/' + C.whatsapp; a.target = '_blank'; a.lastChild.textContent = 'WhatsApp'; });
  $$('[data-phone]').forEach(el => {
    if (C.whatsapp) { el.innerHTML = `<a href="https://wa.me/${C.whatsapp}" target="_blank" rel="noopener">${C.phoneDisplay || '+' + C.whatsapp}</a>`; }
    else el.closest('li') && el.closest('li').remove();
  });

  /* ---------- header ---------- */
  const hdr = $('.hdr'); let lastY = scrollY;
  const onScrollHdr = () => {
    const y = scrollY;
    hdr.classList.toggle('scrolled', y > 40);
    hdr.classList.toggle('hide', y > 400 && y > lastY && !document.body.classList.contains('menu-open'));
    lastY = y;
  };
  $('.burger').addEventListener('click', () => {
    const open = document.body.classList.toggle('menu-open');
    $('.burger').setAttribute('aria-expanded', open);
    $$('.mnav a.big').forEach((a, i) => a.style.transitionDelay = open ? (0.25 + i * 0.07) + 's' : '0s');
  });
  addEventListener('keydown', e => { if (e.key === 'Escape') document.body.classList.remove('menu-open'); });

  /* ---------- hero slider ---------- */
  const hero = $('.hero');
  if (hero) {
    const slides = $$('.slide', hero), dotsWrap = $('.dots', hero); let i = 0, timer;
    const DUR = 6500; hero.style.setProperty('--dur', DUR + 'ms');
    slides.forEach((_, n) => { const b = document.createElement('button'); b.setAttribute('aria-label', 'Slide ' + (n + 1)); b.innerHTML = '<i></i>'; b.onclick = () => go(n); dotsWrap.appendChild(b); });
    const dots = $$('button', dotsWrap);
    const go = n => {
      slides[i].classList.remove('on'); dots[i].classList.remove('on');
      i = (n + slides.length) % slides.length;
      slides[i].classList.add('on'); void dots[i].offsetWidth; dots[i].classList.add('on');
      clearTimeout(timer); if (!reduce) timer = setTimeout(() => go(i + 1), DUR);
    };
    $('.prev', hero).innerHTML = ICON.prev; $('.next', hero).innerHTML = ICON.next;
    $('.prev', hero).onclick = () => go(i - 1); $('.next', hero).onclick = () => go(i + 1);
    let sx = null;
    hero.addEventListener('touchstart', e => sx = e.touches[0].clientX, { passive: true });
    hero.addEventListener('touchend', e => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) go(i + (dx < 0 ? 1 : -1)); sx = null; });
    const start = () => { hero.classList.add('ready'); go(0); };
    if (loader && !document.documentElement.classList.contains('no-loader')) document.addEventListener('mpf:ready', start, { once: true }); else start();
    document.addEventListener('visibilitychange', () => { if (document.hidden) clearTimeout(timer); else go(i); });
  }

  /* ---------- split headings into chars ---------- */
  $$('.split-h').forEach(h => {
    const text = h.textContent; h.setAttribute('aria-label', text); h.textContent = '';
    let n = 0;
    text.split(/(\s+)/).forEach(w => {
      if (/^\s+$/.test(w)) { h.appendChild(document.createTextNode(' ')); return; }
      const word = document.createElement('span'); word.style.whiteSpace = 'nowrap'; word.setAttribute('aria-hidden', 'true');
      [...w].forEach(ch => { const s = document.createElement('span'); s.className = 'ch'; s.textContent = ch; s.style.transitionDelay = (n++ * 0.035) + 's'; word.appendChild(s); });
      h.appendChild(word);
    });
  });

  /* ---------- reveal on scroll ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  if (matchMedia('(max-width:720px)').matches) $$('.films,.cards,.svc').forEach(g => g.removeAttribute('data-stagger'));
  $$('[data-stagger]').forEach(g => [...g.children].forEach((c, n) => { if (!c.hasAttribute('data-reveal')) c.setAttribute('data-reveal', ''); c.style.setProperty('--d', (n % 6) * 0.09 + 's'); }));
  $$('[data-reveal], .mask, .split-h').forEach(el => io.observe(el));

  /* ---------- counters ---------- */
  const cio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; cio.unobserve(e.target);
    const el = e.target, to = +el.dataset.count, suf = el.dataset.suffix || '', t0 = performance.now(), d = reduce ? 1 : 1800;
    const step = t => { const k = Math.min((t - t0) / d, 1), v = Math.round(to * (1 - Math.pow(1 - k, 4))); el.textContent = v.toLocaleString('en-IN') + suf; if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }), { threshold: .5 });
  $$('[data-count]').forEach(el => cio.observe(el));

  /* ---------- parallax ---------- */
  const px = $$('[data-parallax]');
  const onScrollPx = () => {
    if (reduce) return; const vh = innerHeight;
    px.forEach(el => { const r = el.parentElement.getBoundingClientRect(); if (r.bottom < 0 || r.top > vh) return; const k = (r.top + r.height / 2 - vh / 2) / vh; el.style.transform = `translate3d(0,${k * -(+el.dataset.parallax || 60)}px,0)`; });
  };

  /* ---------- back to top + enquire button ---------- */
  const top = $('.totop'), ring = top && $('circle', top), enq = $('.enq');
  const onScrollUi = () => {
    const h = document.documentElement.scrollHeight - innerHeight, k = h > 0 ? scrollY / h : 0;
    if (top) { top.classList.toggle('on', scrollY > 600); ring.style.strokeDashoffset = 151 * (1 - k); }
    if (enq) enq.classList.toggle('on', scrollY > 700 && k < .93);
    const mb = $('.mbar'); if (mb) mb.classList.toggle('on', scrollY > 300);
  };
  top && top.addEventListener('click', () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));

  let ticking = false;
  addEventListener('scroll', () => { if (ticking) return; ticking = true; requestAnimationFrame(() => { onScrollHdr(); onScrollPx(); onScrollUi(); ticking = false; }); }, { passive: true });
  onScrollHdr(); onScrollPx(); onScrollUi();

  /* ---------- marquee (duplicate for seamless loop) ---------- */
  $$('.marq .track').forEach(t => { t.innerHTML += t.innerHTML; [...t.children].slice(t.children.length / 2).forEach(a => a.setAttribute('aria-hidden', 'true')); });

  /* ---------- custom cursor ---------- */
  if (fine && !reduce) {
    const cur = document.createElement('div'); cur.className = 'cursor'; cur.innerHTML = '<span></span>'; document.body.appendChild(cur);
    let x = 0, y = 0, cx = 0, cy = 0;
    addEventListener('mousemove', e => { x = e.clientX; y = e.clientY; cur.classList.add('on'); }, { passive: true });
    document.addEventListener('mouseleave', () => cur.classList.remove('on'));
    const loop = () => { cx += (x - cx) * .2; cy += (y - cy) * .2; cur.style.transform = `translate3d(${cx}px,${cy}px,0)`; requestAnimationFrame(loop); }; loop();
    document.addEventListener('mouseover', e => {
      const t = e.target.closest('[data-cursor]');
      cur.classList.toggle('big', !!t); $('span', cur).textContent = t ? t.dataset.cursor : '';
    });
  }

  /* ---------- overlay helpers ---------- */
  let lastFocus;
  const openOverlay = el => { lastFocus = document.activeElement; el.classList.add('open'); el.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; setTimeout(() => $('.x', el).focus(), 50); };
  const closeOverlay = el => { el.classList.remove('open'); el.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; lastFocus && lastFocus.focus(); };

  /* ---------- film modal ---------- */
  const modal = $('#film-modal');
  if (modal) {
    const player = $('.player', modal), title = $('.t', modal);
    const open = el => {
      const key = el.dataset.film, id = (C.films || {})[key], name = el.dataset.title || 'Wedding Film', poster = el.dataset.poster;
      title.textContent = name.toUpperCase();
      player.innerHTML = id
        ? `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1" title="${name}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`
        : `<div class="soon"><img src="${poster}" alt=""><div><p class="eyebrow gold">Million's Films</p><h3>${name}</h3><p>The full film is being prepared for the web.<br>Enquire to see our complete showreel.</p><a class="btn light sm" href="contact.html">Enquire now <span class="arr"></span></a></div></div>`;
      openOverlay(modal);
    };
    $$('[data-film]').forEach(el => { el.addEventListener('click', e => { e.preventDefault(); open(el); }); el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(el); } }); });
    const close = () => { closeOverlay(modal); setTimeout(() => player.innerHTML = '', 400); };
    $('.x', modal).onclick = close;
    modal.addEventListener('click', e => { if (e.target.classList.contains('stage')) close(); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('open')) close(); });
  }

  /* ---------- gallery filter + lightbox ---------- */
  const gal = $('.masonry');
  if (gal) {
    const items = $$('.it', gal), tabs = $$('.tabs button');
    tabs.forEach(t => { const f = t.dataset.filter; const n = f === '*' ? items.length : items.filter(i => i.dataset.cat.split(' ').includes(f)).length; t.insertAdjacentHTML('beforeend', `<sup>${n}</sup>`); });
    tabs.forEach(t => t.addEventListener('click', () => {
      tabs.forEach(x => x.setAttribute('aria-selected', x === t)); const f = t.dataset.filter;
      items.forEach(i => i.classList.add('fade'));
      setTimeout(() => {
        items.forEach(i => { const show = f === '*' || i.dataset.cat.split(' ').includes(f); i.classList.toggle('out', !show); });
        requestAnimationFrame(() => items.filter(i => !i.classList.contains('out')).forEach((i, n) => setTimeout(() => i.classList.remove('fade'), n * 40)));
      }, 380);
    }));

    const lb = $('#lightbox'), img = $('.stage img', lb), cnt = $('.count', lb), cap = $('.cap', lb), strip = $('.strip', lb);
    let list = [], k = 0;
    const show = n => {
      k = (n + list.length) % list.length; const it = list[k], src = $('img', it).dataset.full || $('img', it).currentSrc || $('img', it).src;
      img.classList.add('swap');
      const pre = new Image(); pre.onload = () => { img.src = src; img.alt = $('img', it).alt; img.classList.remove('swap'); }; pre.src = src;
      cnt.textContent = String(k + 1).padStart(2, '0') + ' / ' + String(list.length).padStart(2, '0');
      cap.textContent = $('img', it).alt;
      $$('button', strip).forEach((b, j) => b.classList.toggle('on', j === k));
      const on = $$('button', strip)[k]; on && on.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    };
    items.forEach(it => {
      it.tabIndex = 0; it.setAttribute('role', 'button');
      const go = () => { list = items.filter(i => !i.classList.contains('out')); strip.innerHTML = list.map(i => `<button aria-label="View image"><img src="${$('img', i).currentSrc || $('img', i).src}" alt=""></button>`).join(''); $$('button', strip).forEach((b, j) => b.onclick = () => show(j)); openOverlay(lb); show(list.indexOf(it)); };
      it.addEventListener('click', go); it.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    });
    $('.pv', lb).innerHTML = ICON.prev; $('.nx', lb).innerHTML = ICON.next;
    $('.pv', lb).onclick = () => show(k - 1); $('.nx', lb).onclick = () => show(k + 1);
    $('.x', lb).onclick = () => closeOverlay(lb);
    lb.addEventListener('click', e => { if (e.target.classList.contains('stage')) closeOverlay(lb); });
    addEventListener('keydown', e => { if (!lb.classList.contains('open')) return; if (e.key === 'ArrowRight') show(k + 1); if (e.key === 'ArrowLeft') show(k - 1); if (e.key === 'Escape') closeOverlay(lb); });
    let sx = null; lb.addEventListener('touchstart', e => sx = e.touches[0].clientX, { passive: true });
    lb.addEventListener('touchend', e => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) show(k + (dx < 0 ? 1 : -1)); sx = null; });
  }

  /* ---------- FAQ smooth open ---------- */
  $$('.faq details').forEach(d => {
    const s = $('summary', d), a = $('.ans', d);
    s.addEventListener('click', e => {
      if (reduce) return; e.preventDefault();
      if (d.open) { a.animate([{ height: a.scrollHeight + 'px' }, { height: 0 }], { duration: 400, easing: 'ease' }).onfinish = () => d.open = false; }
      else { d.open = true; a.animate([{ height: 0 }, { height: a.scrollHeight + 'px' }], { duration: 450, easing: 'ease' }); }
    });
  });

  /* ---------- enquiry form ---------- */
  const form = $('#enquiry');
  if (form) {
    const KEY = 'mpf-enquiry-draft';
    const dt = $('[name=date]', form); if (dt) dt.min = new Date().toISOString().slice(0, 10);
    try { const d = JSON.parse(localStorage.getItem(KEY) || '{}'); Object.entries(d).forEach(([k, v]) => { const f = form.elements[k]; if (f && f.type !== 'checkbox') f.value = v; }); } catch (e) {}
    form.addEventListener('input', () => { const d = {}; [...form.elements].forEach(f => { if (f.name && f.type !== 'checkbox') d[f.name] = f.value; }); try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} });
    const rules = {
      name: v => v.trim().length >= 2 || 'Please tell us your name',
      partner: v => v.trim().length >= 2 || "Please add your partner's name",
      email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || 'Please enter a valid email',
      phone: v => /^[+\d][\d\s-]{8,15}$/.test(v.trim()) || 'Please enter a valid phone number',
      type: v => !!v || 'Please choose an event type',
      date: v => !!v || 'Please choose a date',
      location: v => v.trim().length >= 2 || 'Where is the celebration?',
      message: v => v.trim().length >= 10 || 'A few words about your celebration, please'
    };
    const check = f => { const r = rules[f.name]; if (!r) return true; const res = r(f.value); const w = f.closest('.fld'); w.classList.toggle('bad', res !== true); $('.err', w).textContent = res === true ? '' : res; return res === true; };
    [...form.elements].forEach(f => f.addEventListener('blur', () => f.value && check(f)));
    form.addEventListener('submit', e => {
      e.preventDefault();
      const bad = [...form.elements].filter(f => rules[f.name] && !check(f));
      const ok = form.elements.consent.checked; $('.check', form).style.color = ok ? '' : 'var(--maroon)';
      if (bad.length || !ok) { (bad[0] || form.elements.consent).focus(); return; }
      const v = n => form.elements[n].value.trim();
      const when = new Date(v('date')).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
      const text = `Hello Million's Photography & Films,\n\nWe'd love to enquire about our date.\n\nNames: ${v('name')} & ${v('partner')}\nEvent: ${v('type')}\nDate: ${when}\nLocation: ${v('location')}\nEmail: ${v('email')}\nPhone: ${v('phone')}\n\n${v('message')}`;
      const url = C.whatsapp ? `https://wa.me/${C.whatsapp}?text=${encodeURIComponent(text)}` : `mailto:${C.email}?subject=${encodeURIComponent('Wedding enquiry — ' + v('name') + ' & ' + v('partner') + ' (' + when + ')')}&body=${encodeURIComponent(text)}`;
      try { localStorage.removeItem(KEY); } catch (e) {}
      form.hidden = true; const s = $('.sent'); s.classList.add('on'); $('.who', s).textContent = v('name'); $('.via', s).textContent = C.whatsapp ? 'WhatsApp' : 'Email';
      const sl = $('.send-link', s); sl.href = url; if (!C.whatsapp) sl.removeAttribute('target');
      $('.copy-enq', s).onclick = e => { const btn = e.currentTarget; navigator.clipboard.writeText(text).then(() => btn.firstChild.textContent = 'Copied ✓', () => btn.firstChild.textContent = 'Copy failed'); };
      s.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  /* year */
  $$('[data-year]').forEach(el => el.textContent = new Date().getFullYear());
})();
