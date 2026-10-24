// The guided tours. The main one — the most striking things — once, the first time someone signs in with a new
// account (created in the last days) in this browser; that one and the others, one per subject (maps, animations,
// 3D, live activities, AI, presenting), whenever they ask for them (Ver ▸ Ayuda ▸ Tutorial interactivo: a menu).
// Each step lights up a real button — opening its ribbon tab first — and waits for the person to click it: they
// learn by trying, not by reading. A click that opens something (the AI, the map editor, the presentation…) hides
// the tour until it closes; «Saltar» or Esc ends it, and the last step offers to repeat it or to pick another one.
// Nothing is blocked: the rest of the editor stays usable around the light.

import { state, commit } from '../../core/store.js';
import { esc } from '../../core/text.js';
import { t } from '../../i18n/index.js';
import { account, onAccount, api, refreshAccount } from '../../io/cloud/account.js';
import { popupMenu } from './menu.js';
import { toast } from './toast.js';

const SEEN = 'revela.tour.v1', DONE = 'revela.tours.done';
const NEW_DAYS = 7;

// The steps of each tour: the ribbon tab to open (if any), the element to click (`at`), what it is. A step with
// `next` is read and goes on with its button; one whose element can't be seen or is disabled (a narrow screen,
// nothing selected) gets that button too, so a tour never gets stuck. Every tour ends with END.
const END = { title: '¡Ya lo tienes!', text: 'Repite este tutorial o elige otro de un tema concreto. Están siempre en Ver ▸ Ayuda ▸ Tutorial interactivo.', end: true };
const MOBILE = { tab: 'view', at: '[data-action="connect-mobile"]', title: 'Tu móvil, el mando', text: 'Escanea el QR: pasas las diapositivas, lees tus notas y señalas con un puntero láser desde el móvil.' };
export const TOURS = {
  basics: { name: 'Lo básico', icon: 'school', steps: [
    { title: 'Empecemos por lo básico', text: 'Con esto ya puedes hacer cualquier presentación: diapositivas, su diseño, texto, imágenes, formas, deshacer y guardar.', next: 'Empezar' },
    { tab: 'home', at: '.ribbon-page[data-page="home"] [data-action="slide-add"]', title: 'Una diapositiva nueva', text: 'Añade una diapositiva después de la actual. Con la flechita de al lado la eliges con otro diseño.' },
    { tab: 'home', at: '[data-layout-open]', title: 'Su diseño', text: 'Portada, título y contenido, dos columnas…: cambia cómo se reparte la diapositiva.' },
    { tab: 'home', at: '.ribbon-page[data-page="home"] [data-action="insert-text"]', title: 'Escribe', text: 'Un cuadro de texto nuevo. Escribe, y con la cinta cambias la letra, el tamaño y el color.' },
    { tab: 'home', at: '.ribbon-page[data-page="home"] [data-action="insert-image"]', title: 'Una imagen', text: 'Desde tu ordenador, o arrastrándola directamente a la diapositiva.' },
    { tab: 'insert', at: '[data-shapes-open]', title: 'Formas', text: 'Flechas, estrellas, bocadillos, diagramas de flujo…: elige una y dibújala.' },
    { at: '.titlebar [data-action="undo"]', title: 'Deshacer', text: 'Si algo sale mal, vuelve atrás (Ctrl+Z). Rehacer está justo al lado.' },
    { at: '.titlebar [data-action="save"]', title: 'Se guarda sola', text: 'Revela guarda cada cambio en este navegador. Para tenerla en tu nube o en Drive, guárdala desde aquí.' },
    END] },
  main: { name: 'Lo más llamativo', icon: 'auto_awesome', steps: [
    { title: 'Te damos la bienvenida a Revela', text: 'En dos minutos te enseñamos lo más llamativo. Haz clic en lo que se ilumina: lo pruebas tú. Puedes saltarlo cuando quieras.', next: 'Empezar' },
    { tab: 'ai', at: '[data-action="ai-deck"]', title: 'Una presentación entera con IA', text: 'Dile el tema y para quién es: la IA investiga, escribe las diapositivas con sus notas y busca imágenes, vídeos y modelos 3D. Haz clic para probarlo.' },
    { at: '[data-tab="file"]', title: 'Cientos de plantillas', text: 'En Archivo ▸ Nuevo tienes presentaciones de ejemplo para clase y para empresa —escape rooms, laboratorios, informes…— listas para usar.' },
    { tab: 'insert', at: '[data-action="resources-3d"]', title: 'Modelos 3D que se mueven', text: 'Un corazón que late, un planeta, una máquina: búscalos y gíralos con el ratón en la propia diapositiva.' },
    { tab: 'insert', at: '[data-action="insert-map"]', title: 'Mapas que vuelan', text: 'Un mapa, un globo 3D o una vista de satélite que viaja de un lugar a otro con cada clic al presentar: rutas, viajes, exploraciones.' },
    { tab: 'insert', at: '[data-action="insert-poll"]', title: 'Votaciones en directo', text: 'El público vota con el móvil escaneando un QR y los resultados aparecen al momento en la pantalla.' },
    { tab: 'transitions', at: '[data-action="toggle-autoanimate"]', title: 'Transformar', text: 'Lo que se repite entre dos diapositivas se desplaza y cambia de tamaño suavemente al pasar de una a otra.' },
    { tab: 'animations', at: '.ribbon-page[data-page="animations"]', title: 'Animaciones', text: 'Entradas, énfasis, salidas y trayectorias, con sonido si quieres: selecciona un objeto y elige su efecto aquí.', next: 'Siguiente' },
    MOBILE,
    { at: '.titlebar [data-action="present"]', title: 'Y a presentar', text: 'Pantalla completa, con todo lo anterior funcionando. Para salir, pulsa Esc.' },
    END] },
  maps: { name: 'Mapas y viajes', icon: 'map', steps: [
    { title: 'Mapas que vuelan', text: 'Un mapa, un globo 3D o una vista de satélite que viaja de un lugar a otro con cada clic al presentar: rutas, viajes, exploraciones.', next: 'Empezar' },
    { tab: 'insert', at: '[data-action="insert-map"]', title: 'Inserta un mapa', text: 'Haz clic: se abre su editor. Escribe un lugar —una ciudad, un monumento— y añádelo como parada; luego otro. Cuando lo tengas, ciérralo.' },
    { title: 'Cada parada, un clic', text: 'Al presentar, el mapa vuela a la primera parada; con cada clic viaja a la siguiente, y puede ir dibujando la ruta. En su editor eliges mapa, globo 3D o satélite.', next: 'Siguiente' },
    { tab: 'view', at: '.ribbon-page[data-page="view"] [data-action="present-current"]', title: 'Míralo volar', text: 'Presenta desde esta diapositiva y avanza con un clic o con la flecha para ir de parada en parada. Para salir, pulsa Esc.' },
    END] },
  anim: { name: 'Animaciones y Transformar', icon: 'animation', steps: [
    { title: 'Que las cosas se muevan', text: 'Las animaciones hacen que cada objeto entre, destaque o salga cuando tú quieras; Transformar convierte una diapositiva en la siguiente.', next: 'Empezar' },
    { tab: 'animations', at: '[data-action="anim-more"]', title: 'Elige un efecto', text: 'Selecciona antes un objeto de la diapositiva y abre aquí todos los efectos de entrada, énfasis y salida.' },
    { tab: 'animations', at: '[data-action="anim-panel"]', title: 'El panel de animación', text: 'Aquí ordenas las animaciones y decides cuándo empieza cada una —al hacer clic, con la anterior o después— y cuánto dura.' },
    { tab: 'animations', at: '[data-action="anim-play"]', title: 'Pruébalo', text: 'Reproduce las animaciones de la diapositiva sin salir del editor.' },
    { tab: 'transitions', at: '[data-action="dup-animate"]', title: 'Transformar en dos pasos', text: 'Duplica la diapositiva así, mueve o cambia de tamaño algo en la copia… y al pasar de una a otra se transforma sola.' },
    END] },
  threed: { name: 'Modelos 3D', icon: 'view_in_ar', steps: [
    { title: 'El 3D en tus diapositivas', text: 'Modelos que se giran con el ratón, y muchos se mueven solos: un corazón, un esqueleto, un planeta, un motor.', next: 'Empezar' },
    { tab: 'insert', at: '[data-action="resources-3d"]', title: 'Busca un modelo', text: 'Miles de modelos 3D gratis, muchos con su animación: escribe qué buscas y elige uno.' },
    { tab: 'insert', at: '[data-action="model-ai"]', title: 'O créalo con IA', text: 'Describe un objeto y la IA lo modela en 3D, revisando el resultado.' },
    { tab: 'insert', at: '.ribbon-page[data-page="insert"] [data-action="insert-model"]', title: 'O sube el tuyo', text: 'Si ya tienes un modelo (.glb), insértalo tal cual: se ve igual al presentar y en el móvil.' },
    END] },
  live: { name: 'Actividades en directo', icon: 'how_to_vote', steps: [
    { title: 'Que participe todo el mundo', text: 'El público responde desde su móvil escaneando un QR, sin instalar nada ni crear una cuenta.', next: 'Empezar' },
    { tab: 'insert', at: '[data-action="insert-poll"]', title: 'Una votación', text: 'Haz una pregunta con opciones: los resultados aparecen en directo en la diapositiva.' },
    { tab: 'ai', at: '[data-action="ai-livequiz"]', title: 'Un cuestionario con IA', text: 'La IA prepara preguntas y actividades sobre tu presentación para jugar en directo.' },
    { tab: 'view', at: '[data-action="present-live"]', title: 'Para un público grande', text: 'Emite en directo: quien abra el enlace sigue tus diapositivas y tu puntero en su navegador, aunque sean miles.' },
    END] },
  ai: { name: 'La IA de Revela', icon: 'smart_toy', steps: [
    { title: 'Tu ayudante con IA', text: 'La IA crea, mejora, traduce y pone voz a tus presentaciones. Cada acción gasta unos pocos créditos.', next: 'Empezar' },
    { tab: 'ai', at: '[data-action="ai-deck"]', title: 'Una presentación entera con IA', text: 'Dile el tema y para quién es: la IA investiga, escribe las diapositivas con sus notas y busca imágenes, vídeos y modelos 3D. Haz clic para probarlo.' },
    { tab: 'ai', at: '[data-action="ai-improve"]', title: 'Mejorar diapositiva', text: 'Te propone tres versiones mejores de la diapositiva actual: eliges una, o ninguna.' },
    { tab: 'ai', at: '[data-action="ai-image"]', title: 'Crear imagen', text: 'Describe la imagen que necesitas y la IA la dibuja.' },
    { tab: 'ai', at: '[data-action="ai-translate-deck"]', title: 'Traducir presentación', text: 'La presentación entera a otro idioma, con el mismo diseño.' },
    { tab: 'ai', at: '[data-action="ai-voiceover"]', title: 'Voz en off', text: 'Una voz lee las notas de cada diapositiva: suena al presentar y va en el vídeo exportado.' },
    END] },
  present: { name: 'Presentar como un profesional', icon: 'co_present', steps: [
    { title: 'Presenta con soltura', text: 'Notas que solo ves tú, el móvil como mando, un entrenador para ensayar y un modo para repasar en casa.', next: 'Empezar' },
    { tab: 'view', at: '[data-action="toggle-notes"]', title: 'Tus notas', text: 'Escribe debajo de cada diapositiva lo que vas a decir: al presentar, solo las ves tú.' },
    MOBILE,
    { tab: 'view', at: '[data-action="coach"]', title: 'Ensaya con el entrenador', text: 'Presenta en voz alta: te dice tu ritmo, tus muletillas y lo que repites.' },
    { tab: 'view', at: '[data-action="present-self"]', title: 'A su ritmo', text: 'Para repasar en casa: cada cual avanza a su paso y responde las actividades sin móviles.' },
    END] },
  collab: { name: 'Colaborar y compartir', icon: 'group', steps: [
    { title: 'Trabaja en equipo', text: 'Edita a la vez con otras personas, deja comentarios y comparte con un enlace.', next: 'Empezar' },
    { at: '.titlebar .collab-open', title: 'Colaborar en directo', text: 'Crea enlaces para ver, comentar o editar a la vez, con chat: cada cual ve dónde está el resto.' },
    { tab: 'view', at: '[data-action="comments"]', title: 'Comentarios', text: 'Deja notas en una diapositiva y responde a las de los demás, sin tocar el contenido.' },
    { at: '[data-tab="file"]', title: 'Compartir', text: 'En Archivo tienes enlaces privados o con contraseña, compartir con personas concretas y el código para insertarla en Moodle o en una web.' },
    END] },
  design: { name: 'Diseño', icon: 'palette', steps: [
    { title: 'Que quede bonita sin esfuerzo', text: 'Temas, colores y fuentes para toda la presentación de una vez, y un patrón para lo que se repite en todas.', next: 'Empezar' },
    { tab: 'design', at: '[data-themes-open]', title: 'El tema', text: 'Colores, fuentes y diseños de toda la presentación a la vez. También puedes usar un tema de Office.' },
    { tab: 'design', at: '.ribbon-page[data-page="design"] [data-palettes-open]', title: 'Los colores', text: 'Cambia la paleta y todo lo que usa un color del tema cambia a la vez.' },
    { tab: 'design', at: '[data-action="design-ideas"]', title: 'Ideas de diseño', text: 'Propuestas de composición para la diapositiva actual: elige la que más te guste.' },
    { tab: 'design', at: '.ribbon-page[data-page="design"] [data-action="master-edit"]', title: 'El patrón', text: 'El fondo, el logo y los estilos que comparten todas las diapositivas: lo cambias una vez y se aplica en todas.', next: 'Siguiente' },
    END] },
  io: { name: 'Importar y exportar', icon: 'swap_horiz', steps: [
    { title: 'Entra y sal con tus archivos', text: 'Abre presentaciones de PowerPoint, Google Slides o LibreOffice, y llévate la tuya en el formato que necesites.', next: 'Empezar' },
    { at: '[data-tab="file"]', title: 'Todo está en Archivo', text: 'Ahí tienes Importar PowerPoint u ODP, Desde Google Slides y Exportar a PowerPoint, PDF, vídeo, imágenes o SCORM para Moodle.' },
    { title: 'Lo que se conserva', text: 'Al importar un PowerPoint se conservan el patrón, las animaciones, Transformar y las notas; al exportarlo, también.', next: 'Siguiente' },
    END] },
  data: { name: 'Gráficos y tablas', icon: 'bar_chart', steps: [
    { title: 'Datos que se entienden', text: 'Gráficos y tablas que se editan como en PowerPoint, y tablas que salen directamente de tu Excel.', next: 'Empezar' },
    { tab: 'insert', at: '[data-action="insert-chart"]', title: 'Un gráfico', text: 'Barras, líneas, tarta…: escribe los datos en su tabla y el gráfico cambia al momento.' },
    { tab: 'insert', at: '.ribbon-page[data-page="insert"] [data-action="insert-table"]', title: 'Una tabla', text: 'Con estilos, celdas combinadas y sombreado, como en PowerPoint.' },
    { tab: 'insert', at: '[data-action="insert-table-csv"]', title: 'Desde Excel o CSV', text: 'Trae los datos de un libro de Excel (.xlsx) o de un archivo CSV directamente.' },
    END] },
};
// (Kept for the tests and for whoever reads the main tour's steps.)
export const TOUR = TOURS.main.steps;

let cur = 'main', step = -1, el = null, timer = null, hiddenSince = 0, ended = false;
// The tours finished in this browser (a ✓ in the menu); with an account, the server keeps them too — and, when the
// admin turned it on, gives credits once for finishing them all (server/cloudflare/api.js /tours).
const doneHere = () => { try { return JSON.parse(localStorage.getItem(DONE)) || []; } catch { return []; } };
export const toursDone = () => doneHere().filter(k => TOURS[k]);
function finished(name) {
  try { localStorage.setItem(DONE, JSON.stringify([...new Set([...doneHere(), name])])); } catch {}
  if (!account()) return;
  api('tours/done', { tour: name }).then(r => {
    if (!(r?.granted > 0)) return;
    toast(t(r.all ? '¡Has completado todos los tutoriales! Te regalamos {n} créditos.' : '¡Tutorial completado! Te regalamos {n} créditos.').replace('{n}', r.granted), { ms: 9000 });
    refreshAccount().catch(() => {});
  }).catch(() => {});
}
const steps = () => TOURS[cur].steps;

const visible = node => { if (!node) return false; const r = node.getBoundingClientRect(); return r.width > 4 && r.height > 4 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth; };
const target = s => (s.at ? [...document.querySelectorAll(s.at)].find(visible) || null : null);
const usable = node => !!node && !node.disabled && node.getAttribute('aria-disabled') !== 'true';
// Something open over the editor (a dialog, Archivo, the presentation): the tour waits behind it.
const busy = () => !!document.querySelector('.modal-backdrop:not([hidden]), #backstage:not([hidden]), #present-overlay:not([hidden])');

export const tourRunning = () => step >= 0;
export const tourName = () => (step >= 0 ? cur : null);
export function startTour(name = 'main') {
  stopTour(false);
  cur = TOURS[name] ? name : 'main'; step = 0; hiddenSince = 0; ended = false;
  el = document.createElement('div'); el.id = 'tour'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-live', 'polite');
  document.body.appendChild(el);
  document.addEventListener('click', onClick, true); document.addEventListener('keydown', onKey, true);
  timer = setInterval(place, 250); show();
}
export function stopTour(done = true) {
  if (done) try { localStorage.setItem(SEEN, '1'); } catch {}
  clearInterval(timer); timer = null; step = -1;
  document.removeEventListener('click', onClick, true); document.removeEventListener('keydown', onKey, true);
  el?.remove(); el = null;
}
const go = n => { if (n >= steps().length) return stopTour(); step = Math.max(0, n); show(); };
// (A step by its number: the tests, to reach the last one without presenting.)
export const showStep = n => { if (step >= 0) go(n); };

// The menu of tours (Ver ▸ Ayuda ▸ Tutorial interactivo, and «Otros tutoriales» at the end of one).
export function openTourMenu(anchor) {
  if (!anchor) return startTour();
  // (Each tour with its ✓ when done, or the credits it still gives; above, the bonus for finishing them all.)
  const item = (k, v, done, per) => `<button type="button" data-tourpick="${k}"><i class="ms">${v.icon}</i>${esc(t(v.name))}${done.includes(k) ? ' <i class="ms tour-done" aria-label="✓">check_circle</i>'
    : per > 0 ? ` <span class="tour-plus">+${+per}</span>` : ''}</button>`;
  const paint = (done, reward) => (reward?.credits > 0 ? `<p class="tour-reward">${esc(t('Completa los {n} tutoriales y te regalamos {c} créditos.').replace('{n}', Object.keys(TOURS).length).replace('{c}', +reward.credits))}</p>` : '')
    + Object.entries(TOURS).map(([k, v]) => item(k, v, done, reward?.perTour?.[k])).join('');
  const m = popupMenu(anchor, { id: 'tour-menu', className: 'tour-menu', attr: 'tourpick', html: paint(toursDone(), null), onPick: k => startTour(k) });
  // (With an account: the ones finished elsewhere too, and the credits on offer, if any.)
  if (account()) api('tours').then(r => { if (m.isConnected) m.innerHTML = paint([...new Set([...toursDone(), ...(r?.done || [])])], r?.reward); }).catch(() => {});
}

function show() {
  const all = steps(), s = all[step]; if (!s || !el) return;
  if (s.tab && state.ui.activeTab !== s.tab) commit(() => (state.ui.activeTab = s.tab), { history: false });
  const tg = target(s), read = !!s.next || s.end || !usable(tg);
  if (s.end && !ended) { ended = true; finished(cur); }
  el.innerHTML = `<div class="tour-ring" hidden></div><div class="tour-card">
    <div class="tour-n">${esc(t(TOURS[cur].name))} · ${step + 1} / ${all.length}</div>
    <h3>${esc(t(s.title))}</h3><p>${esc(t(s.text))}</p>
    ${!read ? `<p class="tour-do"><i class="ms">touch_app</i>${esc(t('Haz clic en lo que se ilumina'))}</p>` : ''}
    <div class="tour-btns">${s.end
      ? `<button type="button" data-tour="again">${esc(t('Repetir'))}</button><button type="button" data-tour="others">${esc(t('Otros tutoriales'))}</button><button type="button" class="go" data-tour="next">${esc(t('Terminar'))}</button>`
      : `${step > 0 ? `<button type="button" data-tour="back">${esc(t('Atrás'))}</button>` : ''}<button type="button" data-tour="skip">${esc(t('Saltar tutorial'))}</button>${read ? `<button type="button" class="go" data-tour="next">${esc(t(s.next || 'Siguiente'))}</button>` : ''}`}</div></div>`;
  place();
  el.querySelector('.tour-btns .go, .tour-btns button')?.focus({ preventScroll: true });
}
// Where the light and the card go: around the element, the card below it (or above, if it doesn't fit); centred
// when the step has no element. Also hidden while something is open over the editor.
function place() {
  if (!el) return;
  const s = steps()[step], wait = busy();
  el.hidden = wait;
  if (wait) { hiddenSince ||= Date.now(); return; }
  if (hiddenSince) { hiddenSince = 0; show(); return; }   // (back from the dialog: the step again, its tab open)
  const tg = target(s), ring = el.querySelector('.tour-ring'), card = el.querySelector('.tour-card');
  if (!card) return;
  if (!tg) { ring.hidden = true; card.style.cssText = 'left:50%;top:50%;transform:translate(-50%,-50%)'; return; }
  const r = tg.getBoundingClientRect(), pad = 6;
  ring.hidden = false;
  ring.style.cssText = `left:${r.left - pad}px;top:${r.top - pad}px;width:${r.width + pad * 2}px;height:${r.height + pad * 2}px`;
  const cw = Math.min(360, innerWidth - 24), ch = card.offsetHeight || 200;
  const left = Math.min(Math.max(12, r.left + r.width / 2 - cw / 2), innerWidth - cw - 12);
  const below = r.bottom + 14 + ch < innerHeight;
  card.style.cssText = `left:${left}px;top:${below ? r.bottom + 14 : Math.max(12, r.top - 14 - ch)}px;width:${cw}px`;
}
function onClick(e) {
  if (!el) return;
  const b = e.target.closest?.('[data-tour]');
  if (b && el.contains(b)) {
    e.preventDefault(); e.stopPropagation();
    const k = b.dataset.tour;
    if (k === 'skip') stopTour(); else if (k === 'back') go(step - 1); else if (k === 'again') go(0);
    else if (k === 'others') { stopTour(); openTourMenu(document.querySelector('.ribbon-page.active [data-action="tour"]') || document.querySelector('[data-action="tour"]')); }
    else go(step + 1);
    return;
  }
  // (The lit element itself: it does what it does — opens its dialog, presents… — and the tour goes on after.)
  const s = steps()[step], tg = s && !s.next && !s.end && target(s);
  if (tg && usable(tg) && tg.contains(e.target)) setTimeout(() => go(step + 1), 0);
}
function onKey(e) {
  if (!el || el.hidden) return;
  if (e.key === 'Escape') { e.stopPropagation(); stopTour(); }
}

// The first sign-in with a new account, once per browser: the main tour, after the welcome (the gallery of the first
// visit, if it is open, goes first — the tour waits behind it).
const isNew = a => +a?.created > 0 && Date.now() - +a.created < NEW_DAYS * 864e5;
const seen = () => { try { return !!localStorage.getItem(SEEN); } catch { return true; } };
export function initTour() {
  let asked = false;
  const check = a => { if (asked || !a || !isNew(a) || seen() || tourRunning()) return; asked = true; setTimeout(() => startTour('main'), 900); };
  onAccount(check); check(account());
}
