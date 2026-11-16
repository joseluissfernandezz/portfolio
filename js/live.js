/* Panel "Datos en vivo".
   En Netlify habla con la API (/api/stats, /api/games) que guarda en Netlify Blobs.
   En local, sin API, funciona en "modo demo" guardando en localStorage. */
window.Live = (() => {
  'use strict';
  const $ = s => document.querySelector(s);
  let t = k => k;
  let demo = false;
  let ready = false;
  let pending = null;          // partida terminada pendiente de firmar { id, token, rank }
  let lastRanking = [];

  /* ---------- Transporte: API real o demo local ---------- */
  async function api(method, path, body) {
    const t0 = performance.now();
    if (!demo) {
      try {
        const res = await fetch(path, {
          method,
          headers: body ? { 'Content-Type': 'application/json' } : undefined,
          body: body ? JSON.stringify(body) : undefined
        });
        const isJson = (res.headers.get('content-type') || '').includes('application/json');
        if (!isJson) throw new Error('no-api');
        const data = await res.json();
        const timing = /dur=([\d.]+)/.exec(res.headers.get('server-timing') || '');
        log(method, path, res.status, performance.now() - t0, timing ? +timing[1] : null);
        if (!res.ok) throw Object.assign(new Error(data.error || res.status), { status: res.status });
        return data;
      } catch (e) {
        if (e.status) throw e;
        setDemo();
      }
    }
    const data = demoApi(method, path, body);
    log(method, path, data.__status || 200, performance.now() - t0, null);
    if (data.__status >= 400) throw Object.assign(new Error(data.error), { status: data.__status });
    return data;
  }

  /* ---------- Demo con localStorage (misma forma de respuesta que la API) ---------- */
  function demoDb() {
    try { return JSON.parse(localStorage.getItem('demo-db')) || { visits: {}, games: [] }; }
    catch { return { visits: {}, games: [] }; }
  }
  function demoSave(db) { try { localStorage.setItem('demo-db', JSON.stringify(db)); } catch {} }
  const today = () => new Date().toISOString().slice(0, 10);
  const rankRows = db => db.games.filter(g => g.name)
    .sort((a, b) => a.moves - b.moves || a.seconds - b.seconds || a.id - b.id)
    .slice(0, 10).map(({ name, moves, seconds, day }) => ({ name, moves, seconds, day }));

  function demoApi(method, path, body) {
    const db = demoDb();
    if (path === '/api/stats') {
      if (method === 'POST') { db.visits[today()] = (db.visits[today()] || 0) + 1; demoSave(db); }
      const series = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
        series.push({ day: d, count: db.visits[d] || 0 });
      }
      return {
        visits_total: Object.values(db.visits).reduce((a, b) => a + b, 0),
        visits_today: db.visits[today()] || 0,
        games_total: db.games.length,
        series
      };
    }
    if (method === 'GET') return { ranking: rankRows(db) };
    if (method === 'POST') {
      const id = db.games.length + 1, token = crypto.randomUUID ? crypto.randomUUID() : String(Math.random());
      db.games.push({ id, token, name: null, moves: body.moves, seconds: body.seconds, day: today() });
      demoSave(db);
      const rank = db.games.filter(g => g.name && (g.moves < body.moves || (g.moves === body.moves && g.seconds < body.seconds))).length + 1;
      return { id, token, rank, __status: 201 };
    }
    if (method === 'PATCH') {
      const g = db.games.find(x => x.id === body.id && x.token === body.token && !x.name);
      if (!g) return { error: 'not found', __status: 404 };
      g.name = body.name; demoSave(db);
      return { ranking: rankRows(db) };
    }
    return { error: 'bad request', __status: 400 };
  }

  function setDemo() {
    if (demo) return;
    demo = true;
    $('#live-badge').classList.add('is-demo');
    renderSource();
  }
  function renderSource() {
    $('#live-source').textContent = demo ? t('live.demo') : 'API REST · Netlify Blobs';
  }

  /* ---------- Render ---------- */
  function log(method, path, status, ms, dbMs) {
    const li = document.createElement('li');
    const ok = status < 400;
    li.innerHTML = `<b class="m m--${method.toLowerCase()}">${method}</b> <span>${path}</span>
      <em class="${ok ? 'ok' : 'ko'}">${status}</em>
      <span class="muted">${Math.round(ms)} ms${dbMs != null ? ` · db ${dbMs.toFixed(0)} ms` : demo ? ' · localStorage' : ''}</span>`;
    const ol = $('#lv-log');
    ol.prepend(li);
    while (ol.children.length > 4) ol.lastChild.remove();
  }

  const fmt = n => new Intl.NumberFormat(document.documentElement.lang).format(n);

  function renderStats(s) {
    $('#lv-total').textContent = fmt(s.visits_total);
    $('#lv-today').textContent = fmt(s.visits_today);
    $('#lv-games').textContent = fmt(s.games_total);
    renderChart(s.series || []);
  }

  function renderChart(series) {
    const svg = $('#lv-chart');
    if (!series.length) { svg.innerHTML = ''; return; }
    const W = 280, H = 70, pad = 4;
    const max = Math.max(1, ...series.map(p => p.count));
    const step = (W - pad * 2) / (series.length - 1);
    const pts = series.map((p, i) => [pad + i * step, H - pad - (p.count / max) * (H - pad * 2 - 6)]);
    const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const area = `${line} L ${pts.at(-1)[0]} ${H} L ${pts[0][0]} ${H} Z`;
    const last = pts.at(-1);
    svg.innerHTML = `
      <defs><linearGradient id="lvg" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="var(--accent)" stop-opacity=".35"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/>
      </linearGradient></defs>
      <path d="${area}" fill="url(#lvg)" stroke="none"/>
      <path d="${line}" fill="none" stroke="var(--accent)" stroke-width="2" vector-effect="non-scaling-stroke"/>
      <circle cx="${last[0]}" cy="${last[1]}" r="3" fill="var(--accent)" stroke="none"/>
      ${series.map((p, i) => `<rect x="${pts[i][0] - step / 2}" y="0" width="${step}" height="${H}" fill="transparent" stroke="none"><title>${p.day}: ${p.count}</title></rect>`).join('')}`;
  }

  function renderRanking(rows) {
    lastRanking = rows;
    const ol = $('#lv-ranking');
    if (!rows.length) { ol.innerHTML = `<li class="ranking__empty">${t('live.empty')}</li>`; return; }
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    ol.innerHTML = rows.map((r, i) => `
      <li class="${i < 3 ? 'top top--' + (i + 1) : ''}">
        <span class="pos">${i + 1}</span>
        <span class="who">${esc(r.name)}</span>
        <span class="mono">${r.moves} <small>${t('live.mv')}</small></span>
        <span class="mono muted">${r.seconds}s</span>
      </li>`).join('');
  }

  /* ---------- Acciones ---------- */
  async function loadAll() {
    let firstVisit = false;
    try { firstVisit = !sessionStorage.getItem('visited'); sessionStorage.setItem('visited', '1'); } catch {}
    try {
      renderStats(await api(firstVisit ? 'POST' : 'GET', '/api/stats'));
      renderRanking((await api('GET', '/api/games')).ranking);
    } catch (e) {
      $('#lv-ranking').innerHTML = `<li class="ranking__empty">${t('live.error')}</li>`;
    }
  }

  async function onGameWon(moves, seconds) {
    try {
      pending = await api('POST', '/api/games', { moves, seconds });
      $('#lv-sign-msg').textContent = t('live.sign_msg').replace('{rank}', pending.rank);
      $('#lv-sign').hidden = false;
      $('#lv-name').focus({ preventScroll: true });
      renderStats(await api('GET', '/api/stats'));
    } catch (e) {
      if (e.status === 429) toast(t('live.too_many'));
    }
  }

  async function sign(e) {
    e.preventDefault();
    if (!pending) return;
    const name = $('#lv-name').value.trim();
    try {
      const res = await api('PATCH', '/api/games', { id: pending.id, token: pending.token, name });
      renderRanking(res.ranking);
      $('#lv-sign').hidden = true;
      $('#lv-name').value = '';
      pending = null;
      toast(t('live.saved'));
    } catch (err) {
      toast(err.status === 400 ? t('live.bad_name') : t('live.error'));
    }
  }

  function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('is-shown');
    clearTimeout(toast.tm);
    toast.tm = setTimeout(() => el.classList.remove('is-shown'), 2600);
  }

  return {
    init(translate) {
      t = translate;
      ready = true;
      $('#lv-sign').addEventListener('submit', sign);
      loadAll();
    },
    onLang() { if (!ready) return; renderSource(); if (lastRanking.length) renderRanking(lastRanking); },
    onGameWon
  };
})();
