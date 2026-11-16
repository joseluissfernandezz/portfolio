(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  /* ---------------- i18n ---------------- */
  const ES = {};
  $$('[data-i18n]').forEach(el => { ES[el.dataset.i18n] = el.innerHTML; });
  Object.assign(ES, window.I18N_ES_EXTRA || {});
  const EN = window.I18N_EN || {};
  let lang = store.get('lang') || ((navigator.language || 'es').startsWith('es') || (navigator.language || '').startsWith('ca') ? 'es' : 'en');

  const t = (key, vars = {}) => {
    let s = (lang === 'en' ? EN[key] : ES[key]) ?? ES[key] ?? key;
    for (const k in vars) s = s.replace(`{${k}}`, vars[k]);
    return s;
  };

  function applyLang() {
    document.documentElement.lang = lang;
    $$('[data-i18n]').forEach(el => {
      const v = lang === 'en' ? EN[el.dataset.i18n] : ES[el.dataset.i18n];
      if (v != null) el.innerHTML = v;
    });
    $$('[data-i18n-placeholder]').forEach(el => {
      const k = el.dataset.i18nPlaceholder;
      el.placeholder = (lang === 'en' ? EN[k] : ES[k]) || el.placeholder;
    });
    $('.lang-label').textContent = lang === 'es' ? 'EN' : 'ES';
    restartTyping();
    window.Live?.onLang();
  }
  $('#lang-toggle').addEventListener('click', () => {
    lang = lang === 'es' ? 'en' : 'es';
    store.set('lang', lang);
    applyLang();
  });

  /* ---------------- Tema ---------------- */
  $('#theme-toggle').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    store.set('theme', next);
    $('meta[name="theme-color"]').setAttribute('content', next === 'dark' ? '#0b0f17' : '#f6f8fb');
  });

  /* ---------------- Nav: scroll, progreso, menú móvil, sección activa ---------------- */
  const nav = $('#nav');
  const bar = $('#progress-bar');
  const onScroll = () => {
    const y = scrollY;
    nav.classList.toggle('is-scrolled', y > 10);
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const burger = $('#burger');
  const links = $('#nav-links');
  const setMenu = open => {
    burger.setAttribute('aria-expanded', open);
    links.classList.toggle('is-open', open);
    nav.classList.toggle('menu-open', open);
  };
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  links.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  const navLinks = $$('.nav__links a');
  const spy = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      navLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach(s => spy.observe(s));

  /* ---------------- Reveal + contadores ---------------- */
  const groups = new Map();
  $$('.reveal').forEach(el => {
    const parent = el.parentElement;
    const i = groups.get(parent) || 0;
    el.style.setProperty('--d', `${Math.min(i, 6) * 0.08}s`);
    groups.set(parent, i + 1);
  });

  const countUp = el => {
    const end = +el.dataset.count, pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
    if (reduceMotion) { el.textContent = pre + end + suf; return; }
    const t0 = performance.now(), dur = 1400;
    const step = now => {
      const p = Math.min((now - t0) / dur, 1);
      el.textContent = pre + Math.round(end * (1 - Math.pow(1 - p, 3))) + suf;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      en.target.classList.add('is-visible');
      $$('[data-count]', en.target).forEach(countUp);
      io.unobserve(en.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach(el => io.observe(el));

  /* ---------------- Typing ---------------- */
  const typedEl = $('#typed');
  let typingTimer;
  function restartTyping() {
    clearTimeout(typingTimer);
    const roles = (window.TYPED_ROLES || {})[lang] || ['Java Backend Developer'];
    if (reduceMotion) { typedEl.textContent = roles[0]; return; }
    let r = 0, c = 0, del = false;
    const tick = () => {
      const word = roles[r];
      c += del ? -1 : 1;
      typedEl.textContent = word.slice(0, c);
      let delay = del ? 35 : 75;
      if (!del && c === word.length) { del = true; delay = 1800; }
      else if (del && c === 0) { del = false; r = (r + 1) % roles.length; delay = 350; }
      typingTimer = setTimeout(tick, delay);
    };
    tick();
  }

  /* ---------------- Tabs experiencia/formación ---------------- */
  const tabs = $$('.tab');
  tabs.forEach(tab => tab.addEventListener('click', () => {
    tabs.forEach(b => {
      const on = b === tab;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on);
      const panel = document.getElementById(b.getAttribute('aria-controls'));
      panel.hidden = !on;
      if (on) $$('.reveal', panel).forEach(el => el.classList.add('is-visible'));
    });
  }));

  /* ---------------- Filtro de proyectos ---------------- */
  const projects = $$('.project');
  $$('.filter').forEach(btn => btn.addEventListener('click', () => {
    $$('.filter').forEach(b => b.classList.toggle('is-active', b === btn));
    const f = btn.dataset.filter;
    projects.forEach(p => {
      const show = f === 'all' || p.dataset.tags.split(' ').includes(f);
      p.classList.toggle('is-hidden', !show);
      if (show) p.classList.add('is-visible');
    });
  }));

  /* ---------------- Tilt + brillo en tarjetas ---------------- */
  if (matchMedia('(hover: hover)').matches && !reduceMotion) {
    projects.forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.style.setProperty('--mx', `${x * 100}%`);
        card.style.setProperty('--my', `${y * 100}%`);
        card.style.transform = `perspective(900px) rotateX(${(0.5 - y) * 5}deg) rotateY(${(x - 0.5) * 5}deg) translateY(-4px)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });

    const glow = $('.cursor-glow');
    addEventListener('pointermove', e => {
      glow.style.left = e.clientX + 'px';
      glow.style.top = e.clientY + 'px';
    }, { passive: true });
  }

  /* ---------------- Toast ---------------- */
  const toast = $('#toast');
  let toastTimer;
  const showToast = msg => {
    toast.textContent = msg;
    toast.classList.add('is-shown');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-shown'), 2400);
  };

  /* ---------------- Copiar email ---------------- */
  $('#copy-email').addEventListener('click', async e => {
    const email = e.currentTarget.dataset.email;
    try { await navigator.clipboard.writeText(email); showToast(t('contact.copied')); }
    catch { location.href = 'mailto:' + email; }
  });

  /* ---------------- Formulario ----------------
     En Netlify se envía con Netlify Forms (data-netlify).
     En local (sin Netlify) abre el cliente de correo como alternativa. */
  const form = $('#contact-form');
  const status = $('#form-status');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const data = new FormData(form);
    const onNetlify = /netlify\.app$/.test(location.hostname) || form.dataset.forceNetlify;
    if (!onNetlify) {
      const body = encodeURIComponent(`${data.get('message')}\n\n— ${data.get('name')} (${data.get('email')})`);
      status.textContent = t('form.mailto');
      location.href = `mailto:joseluiscanrull@gmail.com?subject=${encodeURIComponent('Portfolio · ' + data.get('name'))}&body=${body}`;
      return;
    }
    status.textContent = t('form.sending');
    try {
      const res = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(data).toString()
      });
      if (!res.ok) throw new Error(res.status);
      form.reset();
      status.textContent = t('form.ok');
    } catch {
      status.textContent = '';
      form.submit();
    }
  });

  /* ---------------- Juego de memoria ---------------- */
  const PAIRS = [
    ['☕', 'Java'], ['🍃', 'Spring'], ['🗄️', 'SQL'], ['🔀', 'Git'],
    ['⚛️', 'React'], ['🐍', 'Python'], ['🎮', 'C#'], ['📊', 'Jasper']
  ];
  const board = $('#memory');
  const movesEl = $('#moves'), timerEl = $('#timer'), bestEl = $('#best'), winEl = $('#win');
  let first, lock, moves, matched, start, clock;

  const renderBest = () => { const b = store.get('memory-best'); bestEl.textContent = b ? b : '—'; };

  function newGame() {
    clearInterval(clock);
    first = null; lock = false; moves = 0; matched = 0; start = 0;
    movesEl.textContent = '0'; timerEl.textContent = '0s'; winEl.textContent = '';
    const deck = [...PAIRS, ...PAIRS]
      .map(v => ({ v, r: Math.random() }))
      .sort((a, b) => a.r - b.r)
      .map(o => o.v);
    board.innerHTML = '';
    deck.forEach(([icon, name], i) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'mcard';
      card.dataset.key = name;
      card.setAttribute('aria-label', `Carta ${i + 1}`);
      card.innerHTML = `<span class="mcard__face mcard__front">{ }</span><span class="mcard__face mcard__back"><span><b>${icon}</b>${name}</span></span>`;
      card.addEventListener('click', () => flip(card));
      board.appendChild(card);
    });
    renderBest();
  }

  function flip(card) {
    if (lock || card === first || card.classList.contains('is-matched')) return;
    if (!start) {
      start = Date.now();
      clock = setInterval(() => { timerEl.textContent = Math.floor((Date.now() - start) / 1000) + 's'; }, 1000);
    }
    card.classList.add('is-flipped');
    card.setAttribute('aria-label', card.dataset.key);
    if (!first) { first = card; return; }

    moves++; movesEl.textContent = moves;
    if (first.dataset.key === card.dataset.key) {
      first.classList.add('is-matched'); card.classList.add('is-matched');
      first = null; matched++;
      if (matched === PAIRS.length) win();
    } else {
      lock = true;
      const a = first; first = null;
      setTimeout(() => {
        a.classList.remove('is-flipped'); card.classList.remove('is-flipped');
        a.setAttribute('aria-label', 'Carta'); card.setAttribute('aria-label', 'Carta');
        lock = false;
      }, 800);
    }
  }

  function win() {
    clearInterval(clock);
    const secs = Math.max(1, Math.round((Date.now() - start) / 1000));
    timerEl.textContent = secs + 's';
    winEl.textContent = t('play.win', { moves, time: secs });
    const best = parseInt(store.get('memory-best'), 10);
    if (!best || moves < best) store.set('memory-best', moves);
    renderBest();
    window.Live?.onGameWon(moves, secs);
  }
  $('#restart').addEventListener('click', newGame);

  /* ---------------- Init ---------------- */
  $('#year').textContent = new Date().getFullYear();
  newGame();
  applyLang();
  window.Live?.init(t);
})();
