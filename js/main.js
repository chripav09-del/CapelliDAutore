import { avviaMarmo } from './marmo.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fermo = matchMedia('(prefers-reduced-motion: reduce)');

document.documentElement.classList.add('js');
avviaMarmo($('[data-marmo]'));

/* ---------- testata e barra del banco ---------- */
const testata = $('[data-testata]');
const banco = $('[data-banco]');
const piede = $('.piede');
let ultimoY = scrollY, piedeVisibile = false;
if (piede) new IntersectionObserver(([v]) => { piedeVisibile = v.isIntersecting; aggiornaScroll(); }).observe(piede);
function aggiornaScroll() {
  const y = scrollY;
  testata?.classList.toggle('solida', y > 20);
  const giu = y > ultimoY && y > 480;
  testata?.classList.toggle('nascosta', giu && !$('.foglio.aperto'));
  banco?.classList.toggle('visibile', y > innerHeight * 0.55 && !piedeVisibile);
  ultimoY = y;
}
addEventListener('scroll', aggiornaScroll, { passive: true });
aggiornaScroll();

/* ---------- foglio: menu che sale dal basso ---------- */
const foglio = $('[data-foglio]');
const pannello = $('[data-foglio-pannello]');
let ritorno = null;
function apriFoglio() {
  ritorno = document.activeElement;
  foglio.hidden = false;
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => requestAnimationFrame(() => foglio.classList.add('aperto')));
  setTimeout(() => $('a', pannello)?.focus(), 60);
}
function chiudiFoglio() {
  foglio.classList.remove('aperto');
  foglio.style.removeProperty('--trascina');
  document.body.style.overflow = '';
  setTimeout(() => { foglio.hidden = true; }, fermo.matches ? 0 : 420);
  ritorno?.focus();
}
$$('[data-apri-foglio]').forEach(b => b.addEventListener('click', apriFoglio));
$$('[data-chiudi-foglio]').forEach(b => b.addEventListener('click', chiudiFoglio));
foglio?.addEventListener('keydown', e => {
  if (e.key === 'Escape') chiudiFoglio();
  if (e.key !== 'Tab') return;
  const f = $$('a, button', pannello);
  if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
  else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
});
// trascina verso il basso per chiudere
if (pannello) {
  let y0 = null, dy = 0, t0 = 0;
  pannello.addEventListener('pointerdown', e => {
    if (e.target.closest('a, button') || pannello.scrollTop > 0) return;
    y0 = e.clientY; dy = 0; t0 = performance.now(); foglio.classList.add('trascino');
    pannello.setPointerCapture(e.pointerId);
  });
  pannello.addEventListener('pointermove', e => {
    if (y0 === null) return;
    dy = Math.max(0, e.clientY - y0);
    foglio.style.setProperty('--trascina', `${dy < 0 ? dy * 0.3 : dy}px`);
  });
  const fine = () => {
    if (y0 === null) return;
    foglio.classList.remove('trascino');
    const velocita = dy / (performance.now() - t0);
    if (dy > pannello.offsetHeight * 0.3 || velocita > 0.6) chiudiFoglio();
    else foglio.style.removeProperty('--trascina');
    y0 = null;
  };
  pannello.addEventListener('pointerup', fine);
  pannello.addEventListener('pointercancel', fine);
}

/* ---------- voce di menu attiva nel foglio ---------- */
const qui = location.pathname.split('/').pop() || '';
$$('.foglio__voci a').forEach(a => {
  const h = a.getAttribute('href');
  if (h === qui || (h === './' && (qui === '' || qui === 'index.html'))) a.setAttribute('aria-current', 'page');
});

/* ---------- caroselli ---------- */
$$('[data-carosello]').forEach(c => {
  const b = $('[data-binario]', c);
  const prec = $('[data-prec]', c), succ = $('[data-succ]', c);
  const passo = () => (b.firstElementChild?.getBoundingClientRect().width || 300) + 16;
  prec?.addEventListener('click', () => b.scrollBy({ left: -passo(), behavior: fermo.matches ? 'auto' : 'smooth' }));
  succ?.addEventListener('click', () => b.scrollBy({ left: passo(), behavior: fermo.matches ? 'auto' : 'smooth' }));
  const stato = () => {
    if (prec) prec.disabled = b.scrollLeft < 4;
    if (succ) succ.disabled = b.scrollLeft + b.clientWidth >= b.scrollWidth - 4;
  };
  b.addEventListener('scroll', stato, { passive: true });
  addEventListener('resize', stato);
  stato();
  // trascinamento col mouse (il touch scorre da sé)
  let x0 = null, s0 = 0, mosso = false;
  b.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; x0 = e.clientX; s0 = b.scrollLeft; mosso = false; });
  addEventListener('pointermove', e => {
    if (x0 === null) return;
    const dx = e.clientX - x0;
    if (Math.abs(dx) > 5) { mosso = true; b.classList.add('trascino'); }
    if (mosso) b.scrollLeft = s0 - dx;
  });
  addEventListener('pointerup', () => {
    if (x0 === null) return;
    x0 = null;
    if (mosso) {
      b.classList.remove('trascino');
      const w = passo();
      b.scrollTo({ left: Math.round(b.scrollLeft / w) * w, behavior: 'smooth' });
    }
  });
});

/* ---------- ingressi allo scorrimento ---------- */
const osserva = new IntersectionObserver(voci => {
  voci.forEach(v => {
    if (!v.isIntersecting) return;
    v.target.classList.add('visto');
    osserva.unobserve(v.target);
  });
}, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
$$('[data-rivela]').forEach(el => {
  const fratelli = [...el.parentElement.children].filter(x => x.hasAttribute('data-rivela'));
  el.style.setProperty('--ritardo', `${Math.min(fratelli.indexOf(el), 5) * 70}ms`);
  // quello che è già nella prima schermata si mostra subito, senza aspettare l'osservatore
  if (el.getBoundingClientRect().top < innerHeight) requestAnimationFrame(() => el.classList.add('visto'));
  osserva.observe(el);
});
// rete di sicurezza: se l'osservatore non parte (pagina in background, browser vecchi), dopo 2,5 s si vede tutto
setTimeout(() => $$('[data-rivela]:not(.visto)').forEach(el => { if (el.getBoundingClientRect().top < innerHeight * 1.2) el.classList.add('visto'); }), 2500);

/* ---------- «esci come vuoi» si scrive in oro ---------- */
const scrivi = $('[data-scrivi]');
if (scrivi) requestAnimationFrame(() => setTimeout(() => scrivi.classList.add('scritto'), 80));

/* ---------- lo specchio: lavori che scorrono + inclinazione 3D ---------- */
const specchio = $('[data-specchio]');
if (specchio) {
  const corpo = $('[data-specchio-corpo]', specchio);
  const foto = $$('.specchio__vetro img', specchio);
  const didascalia = $('[data-specchio-didascalia]', specchio);
  const nomi = ['Sfumatura e mullet', 'Colore e disegno a mano', 'La prima sfumatura', 'Il salone in Via Ferreria'];
  let i = 0, pausa = false, inVista = true;
  const mostra = n => {
    foto[i].classList.remove('attiva');
    i = (n + foto.length) % foto.length;
    foto[i].classList.add('attiva');
    if (didascalia) { didascalia.style.opacity = 0; setTimeout(() => { didascalia.textContent = nomi[i]; didascalia.style.opacity = 1; }, 250); }
  };
  foto.slice(1).forEach(im => { im.loading = 'eager'; });
  setInterval(() => { if (!pausa && inVista && !document.hidden && !fermo.matches) mostra(i + 1); }, 3600);
  specchio.addEventListener('pointerenter', () => { pausa = true; });
  specchio.addEventListener('pointerleave', () => { pausa = false; bersaglio.x = 0; bersaglio.y = 0; });
  specchio.addEventListener('click', () => mostra(i + 1));
  new IntersectionObserver(([v]) => { inVista = v.isIntersecting; }).observe(specchio);

  // molla: stiffness 170, damping 22
  const stato = { x: 0, y: 0, vx: 0, vy: 0 }, bersaglio = { x: 0, y: 0 };
  let raf = 0, prima = 0;
  const passo = ora => {
    const dt = Math.min((ora - prima) / 1000, 1 / 30); prima = ora;
    for (const k of ['x', 'y']) {
      const v = k === 'x' ? 'vx' : 'vy';
      const forza = 170 * (bersaglio[k] - stato[k]) - 22 * stato[v];
      stato[v] += forza * dt; stato[k] += stato[v] * dt;
    }
    corpo.style.setProperty('--ry', `${stato.x * 10}deg`);
    corpo.style.setProperty('--rx', `${-stato.y * 10}deg`);
    corpo.style.setProperty('--lx', `${50 - stato.x * 30}%`);
    corpo.style.setProperty('--ly', `${30 - stato.y * 25}%`);
    const fermoOra = Math.abs(bersaglio.x - stato.x) + Math.abs(bersaglio.y - stato.y) + Math.abs(stato.vx) + Math.abs(stato.vy) < 0.001;
    raf = fermoOra ? 0 : requestAnimationFrame(passo);
  };
  const muovi = (x, y) => {
    if (fermo.matches) return;
    bersaglio.x = Math.max(-1, Math.min(1, x)); bersaglio.y = Math.max(-1, Math.min(1, y));
    if (!raf) { prima = performance.now(); raf = requestAnimationFrame(passo); }
  };
  addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const r = corpo.getBoundingClientRect();
    muovi((e.clientX - (r.left + r.width / 2)) / (r.width * 1.2), (e.clientY - (r.top + r.height / 2)) / (r.height * 1.2));
  }, { passive: true });
  specchio.addEventListener('pointermove', e => {
    if (e.pointerType === 'mouse') return;
    const r = corpo.getBoundingClientRect();
    muovi((e.clientX - (r.left + r.width / 2)) / (r.width / 2), (e.clientY - (r.top + r.height / 2)) / (r.height / 2));
  }, { passive: true });
  addEventListener('deviceorientation', e => {
    if (e.gamma == null || !inVista) return;
    muovi(e.gamma / 30, (e.beta - 45) / 30);
  }, { passive: true });
}

/* ---------- orari: aperto ora ---------- */
const ORARI = { // minuti dalla mezzanotte, ora di Roma
  0: [],
  1: [[420, 785]],
  2: [[510, 780], [810, 1200]],
  3: [[510, 780], [810, 1170]],
  4: [[510, 780], [810, 1200]],
  5: [[510, 780], [810, 1200]],
  6: [[510, 1200]],
};
const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
const hhmm = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
function adessoRoma() {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const g = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[p.find(x => x.type === 'weekday').value];
  return { g, m: +p.find(x => x.type === 'hour').value * 60 + +p.find(x => x.type === 'minute').value };
}
function statoOrario() {
  const { g, m } = adessoRoma();
  const aperta = ORARI[g].find(([a, c]) => m >= a && m < c);
  if (aperta) return { aperto: true, testo: `Aperto ora · chiude alle ${hhmm(aperta[1])}`, g };
  const dopo = ORARI[g].find(([a]) => a > m);
  if (dopo) return { aperto: false, testo: `Chiuso ora · riapre alle ${hhmm(dopo[0])}`, g };
  for (let k = 1; k <= 7; k++) {
    const gg = (g + k) % 7;
    if (ORARI[gg].length) return { aperto: false, testo: `Chiuso ora · riapre ${k === 1 ? 'domani' : GIORNI[gg]} alle ${hhmm(ORARI[gg][0][0])}`, g };
  }
}
const s = statoOrario();
$$('[data-stato-orario]').forEach(el => { el.textContent = s.testo; el.classList.toggle('aperto', s.aperto); });
$$(`.orari tr[data-giorno="${s.g}"]`).forEach(tr => tr.classList.add('oggi'));

/* ---------- filo d'oro della storia ---------- */
const linea = $('[data-filo]');
if (linea) {
  const aggiorna = () => {
    const r = linea.getBoundingClientRect();
    const avanza = Math.max(0, Math.min(1, (innerHeight * 0.7 - r.top) / r.height));
    linea.style.setProperty('--avanza', avanza.toFixed(3));
  };
  addEventListener('scroll', aggiorna, { passive: true });
  aggiorna();
}

/* ---------- modulo contatti → messaggio WhatsApp ---------- */
const modulo = $('[data-modulo]');
if (modulo) {
  const campi = ['nome', 'servizio', 'quando', 'privacy'].map(n => modulo.elements[n]);
  const errore = (c, msg) => {
    c.setAttribute('aria-invalid', msg ? 'true' : 'false');
    $(`#errore-${c.name}`).textContent = msg;
  };
  const verifica = c => {
    if (c.name === 'nome') return c.value.trim().length < 2 ? 'Scrivi il tuo nome.' : '';
    if (c.name === 'servizio') return c.value ? '' : 'Scegli un servizio.';
    if (c.name === 'quando') return c.value.trim() ? '' : 'Indica un giorno o un momento.';
    if (c.name === 'privacy') return c.checked ? '' : 'Serve la conferma per continuare.';
    return '';
  };
  campi.forEach(c => c.addEventListener(c.type === 'checkbox' ? 'change' : 'blur', () => errore(c, verifica(c))));
  modulo.addEventListener('submit', e => {
    e.preventDefault();
    let primo = null;
    campi.forEach(c => { const m = verifica(c); errore(c, m); if (m && !primo) primo = c; });
    if (primo) { primo.focus(); return; }
    const f = modulo.elements;
    const testo = `Ciao, sono ${f.nome.value.trim()}. Vorrei prenotare: ${f.servizio.value}. Quando: ${f.quando.value.trim()}.${f.note.value.trim() ? ' Note: ' + f.note.value.trim() : ''}`;
    window.open(`https://wa.me/393770805533?text=${encodeURIComponent(testo)}`, '_blank', 'noopener');
  });
}

/* ---------- anno nel piede ---------- */
$$('[data-anno]').forEach(el => { el.textContent = new Date().getFullYear(); });
