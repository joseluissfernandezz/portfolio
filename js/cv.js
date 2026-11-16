/* Página del CV: modo texto + modo juego 3D (carga diferida). */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} }
};
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let lang = store.get('lang') || ((navigator.language || 'es').match(/^(es|ca)/) ? 'es' : 'en');
let game = null;

const D = () => window.CV_DATA[lang];
const UI = () => window.CV_UI[lang];

const ORBS = ['Java', 'Spring Boot', 'SQL', 'SQL Server', 'JDBC', 'Hibernate', 'Git', 'JasperReports', 'React', 'Python', 'C#', 'Angular'];

/* ---------------- Modo texto ---------------- */
function renderText() {
  const d = D(), L = d.labels;
  const list = pts => pts.length ? `<ul>${pts.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : '';
  $('#cv-doc').innerHTML = `
    <header class="cv-head">
      <img src="assets/img/profile.jpg" alt="" width="112" height="112" />
      <div>
        <h1>${esc(d.name)}</h1>
        <p class="cv-role gradient-text">${esc(d.role)}</p>
        <ul class="cv-contact">
          <li>📍 ${esc(d.location)}</li>
          <li>✉️ <a href="mailto:${d.email}">${d.email}</a></li>
          <li>in <a href="https://www.${d.linkedin}/" target="_blank" rel="noopener">${d.linkedin}</a></li>
        </ul>
      </div>
    </header>

    <div class="cv-cols">
      <div class="cv-main-col">
        <section class="cv-sec">
          <h2>${L.profile}</h2>
          <p>${esc(d.summary)}</p>
        </section>
        <section class="cv-sec">
          <h2>${L.experience}</h2>
          ${d.experience.map(e => `
            <div class="cv-item">
              <div class="cv-item__top"><h3>${esc(e.role)}</h3><span class="cv-date">${esc(e.date)}</span></div>
              <p class="cv-org">${esc(e.org)}</p>
              ${list(e.points)}
            </div>`).join('')}
        </section>
        <section class="cv-sec">
          <h2>${L.education}</h2>
          ${d.education.map(e => `
            <div class="cv-item">
              <div class="cv-item__top"><h3>${esc(e.title)}</h3><span class="cv-date">${esc(e.date)}</span></div>
              <p class="cv-org">${esc(e.org)}</p>
            </div>`).join('')}
        </section>
      </div>

      <aside class="cv-side">
        <section class="cv-sec">
          <h2>${L.skills}</h2>
          ${d.skills.map(g => `<h4>${esc(g.group)}</h4><div class="chips">${g.items.map(i => `<span>${esc(i)}</span>`).join('')}</div>`).join('')}
        </section>
        <section class="cv-sec">
          <h2>${L.languages}</h2>
          <ul class="cv-plain">${d.languages.map(([n, l]) => `<li><b>${esc(n)}</b><span>${esc(l)}</span></li>`).join('')}</ul>
        </section>
        <section class="cv-sec">
          <h2>${L.soft}</h2>
          <ul class="cv-dots">${d.soft.map(s => `<li>${esc(s)}</li>`).join('')}</ul>
        </section>
        <section class="cv-sec">
          <h2>${L.extra}</h2>
          <ul class="cv-dots">${d.extra.map(s => `<li>${esc(s)}</li>`).join('')}</ul>
        </section>
      </aside>
    </div>

    <div class="cv-cta no-print">
      <button class="btn btn--game" type="button" data-play>
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><rect x="2" y="7" width="20" height="11" rx="5"/><path d="M7 11v3M5.5 12.5h3M15.5 12h.01M18 13.5h.01"/></svg>
        ${UI().game}
      </button>
    </div>`;
}

/* ---------------- Estaciones del juego (de pasado a presente) ---------------- */
function buildStations() {
  const d = D(), L = d.labels, [geyce, mga, t1, t2] = d.experience;
  const ul = pts => `<ul>${pts.map(p => `<li>${esc(p)}</li>`).join('')}</ul>`;
  return [
    { label: L.profile, title: esc(d.name), sub: esc(d.role),
      html: `<p>${esc(d.summary)}</p><p class="g-meta">📍 ${esc(d.location)}</p>` },
    { label: L.education, title: L.education,
      html: d.education.map(e => `<div class="g-item"><b>${esc(e.title)}</b><span>${esc(e.date)}</span><p>${esc(e.org)}</p></div>`).join('') },
    { label: t1.short, title: esc(t1.role),
      html: [t1, t2].map(e => `<div class="g-item"><b>${esc(e.org)}</b><span>${esc(e.date)}</span></div>`).join('') },
    { label: mga.short, title: esc(mga.role), sub: `${esc(mga.org)} · ${esc(mga.date)}`, html: ul(mga.points) },
    { label: geyce.short, title: esc(geyce.role), sub: `${esc(geyce.org)} · ${esc(geyce.date)}`, html: ul(geyce.points) },
    { label: L.skills, title: L.skills,
      html: d.skills.map(g => `<p class="g-group">${esc(g.group)}</p><div class="chips">${g.items.map(i => `<span>${esc(i)}</span>`).join('')}</div>`).join('') },
    { label: L.languages, title: `${L.languages} · ${L.soft}`,
      html: `<ul class="g-langs">${d.languages.map(([n, l]) => `<li><b>${esc(n)}</b> ${esc(l)}</li>`).join('')}</ul>
             <div class="chips">${d.soft.map(s => `<span>${esc(s)}</span>`).join('')}</div>` },
    { label: L.contact, title: L.contact,
      html: `<p>${esc(UI().end_text)}</p>
             <ul class="g-links">
               <li>✉️ <a href="mailto:${d.email}">${d.email}</a></li>
               <li>in <a href="https://www.${d.linkedin}/" target="_blank" rel="noopener">${d.linkedin}</a></li>
             </ul>` }
  ];
}

/* ---------------- Modos ---------------- */
async function openGame() {
  setTab('game');
  if (location.hash !== '#jugar') history.replaceState(null, '', '#jugar');
  document.body.classList.add('in-game');
  $('#game-view').hidden = false;
  if (game) return;
  $('#game-loading').hidden = false;
  try {
    const { createGame } = await import('./cv-game.js');
    game = createGame($('#game-root'), {
      stations: buildStations(), orbs: ORBS, ui: UI(),
      onExit: closeGame,
      onContact: () => { location.href = 'index.html#contacto'; }
    });
  } catch (e) {
    console.error(e);
    closeGame();
    toast(UI().nowebgl);
  } finally {
    $('#game-loading').hidden = true;
  }
}

function closeGame() {
  game?.destroy();
  game = null;
  $('#game-view').hidden = true;
  document.body.classList.remove('in-game');
  setTab('text');
  if (location.hash) history.replaceState(null, '', location.pathname);
}

function setTab(mode) {
  $('#mode-text').classList.toggle('is-active', mode === 'text');
  $('#mode-game').classList.toggle('is-active', mode === 'game');
  $('#mode-text').setAttribute('aria-selected', mode === 'text');
  $('#mode-game').setAttribute('aria-selected', mode === 'game');
}

/* ---------------- Idioma / tema / varios ---------------- */
function applyLang() {
  document.documentElement.lang = lang;
  $$('[data-cvui]').forEach(el => { el.textContent = UI()[el.dataset.cvui]; });
  $('.lang-label').textContent = lang === 'es' ? 'EN' : 'ES';
  $('#print').setAttribute('aria-label', UI().print);
  $('#print').title = UI().print;
  renderText();
  game?.setContent(buildStations(), ORBS, UI());
}

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('is-shown');
  setTimeout(() => el.classList.remove('is-shown'), 3200);
}

$('#lang-toggle').addEventListener('click', () => { lang = lang === 'es' ? 'en' : 'es'; store.set('lang', lang); applyLang(); });
$('#theme-toggle').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  store.set('theme', next);
});
$('#print').addEventListener('click', () => { if (game) closeGame(); print(); });
$('#mode-text').addEventListener('click', closeGame);
$('#mode-game').addEventListener('click', openGame);
document.addEventListener('click', e => { if (e.target.closest('[data-play]')) openGame(); });
addEventListener('hashchange', () => { if (location.hash === '#jugar') openGame(); });

applyLang();
if (location.hash === '#jugar') openGame();
