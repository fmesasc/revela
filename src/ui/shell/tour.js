// The guided tour: once, the first time someone signs in with a new account (created in the last days) in this
// browser, and whenever they ask for it (Ver ▸ Ayuda ▸ Tutorial). Each step lights up a real button — opening its
// ribbon tab first — and waits for the person to click it: they learn the most striking things by trying them, not by
// reading. A click that opens something (the AI, the 3D library, the presentation…) hides the tour until it closes;
// «Saltar» or Esc ends it. Nothing is blocked: the rest of the editor stays usable around the light.

import { state, commit } from '../../core/store.js';
import { esc } from '../../core/text.js';
import { t } from '../../i18n/index.js';
import { account, onAccount } from '../../io/cloud/account.js';

const SEEN = 'revela.tour.v1';
const NEW_DAYS = 7;

// The steps: the ribbon tab to open (if any), the element to click (`at`), what it is. A step with `next` is read and
// goes on with its button (the welcome and the end); a step whose element can't be seen (a narrow screen, an edition
// without it) gets that button too, so the tour never gets stuck.
export const TOUR = [
  { title: 'Te damos la bienvenida a Revela', text: 'En dos minutos te enseñamos lo más llamativo. Haz clic en lo que se ilumina: lo pruebas tú. Puedes saltarlo cuando quieras.', next: 'Empezar' },
  { tab: 'ai', at: '[data-action="ai-deck"]', title: 'Una presentación entera con IA', text: 'Dile el tema y para quién es: la IA investiga, escribe las diapositivas con sus notas y busca imágenes, vídeos y modelos 3D. Haz clic para probarlo.' },
  { at: '[data-tab="file"]', title: 'Cientos de plantillas', text: 'En Archivo ▸ Nuevo tienes presentaciones de ejemplo para clase y para empresa —escape rooms, laboratorios, informes…— listas para usar.' },
  { tab: 'insert', at: '[data-action="resources-3d"]', title: 'Modelos 3D que se mueven', text: 'Un corazón que late, un planeta, una máquina: búscalos y gíralos con el ratón en la propia diapositiva.' },
  { tab: 'insert', at: '[data-action="insert-poll"]', title: 'Votaciones en directo', text: 'El público vota con el móvil escaneando un QR y los resultados aparecen al momento en la pantalla.' },
  { tab: 'transitions', at: '[data-action="toggle-autoanimate"]', title: 'Transformar', text: 'Lo que se repite entre dos diapositivas se desplaza y cambia de tamaño suavemente al pasar de una a otra.' },
  { tab: 'animations', at: '.ribbon-page[data-page="animations"]', title: 'Animaciones', text: 'Entradas, énfasis, salidas y trayectorias, con sonido si quieres: selecciona un objeto y elige su efecto aquí.', next: 'Siguiente' },
  { tab: 'view', at: '[data-action="connect-mobile"]', title: 'Tu móvil, el mando', text: 'Escanea el QR: pasas las diapositivas, lees tus notas y señalas con un puntero láser desde el móvil.' },
  { at: '.titlebar [data-action="present"]', title: 'Y a presentar', text: 'Pantalla completa, con todo lo anterior funcionando. Para salir, pulsa Esc.' },
  { title: '¡Ya lo tienes!', text: 'Puedes volver a hacer este tutorial cuando quieras en Ver ▸ Ayuda ▸ Tutorial interactivo.', next: 'Terminar' },
];

let step = -1, el = null, timer = null, hiddenSince = 0;

const visible = node => { if (!node) return false; const r = node.getBoundingClientRect(); return r.width > 4 && r.height > 4 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth; };
const target = s => (s.at ? [...document.querySelectorAll(s.at)].find(visible) || null : null);
// Something open over the editor (a dialog, Archivo, the presentation): the tour waits behind it.
const busy = () => !!document.querySelector('.modal-backdrop:not([hidden]), #backstage:not([hidden]), #present-overlay:not([hidden])');

export const tourRunning = () => step >= 0;
export function startTour() {
  stopTour(false);
  step = 0; hiddenSince = 0;
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
const go = n => { if (n >= TOUR.length) return stopTour(); step = Math.max(0, n); show(); };

function show() {
  const s = TOUR[step]; if (!s || !el) return;
  if (s.tab && state.ui.activeTab !== s.tab) commit(() => (state.ui.activeTab = s.tab), { history: false });
  const tg = target(s), read = !!s.next || !tg;
  el.innerHTML = `<div class="tour-ring" hidden></div><div class="tour-card">
    <div class="tour-n">${step + 1} / ${TOUR.length}</div>
    <h3>${esc(t(s.title))}</h3><p>${esc(t(s.text))}</p>
    ${!read ? `<p class="tour-do"><i class="ms">touch_app</i>${esc(t('Haz clic en lo que se ilumina'))}</p>` : ''}
    <div class="tour-btns">${step > 0 ? `<button type="button" data-tour="back">${esc(t('Atrás'))}</button>` : ''}
      <button type="button" data-tour="skip">${esc(step === TOUR.length - 1 ? t('Cerrar') : t('Saltar tutorial'))}</button>
      ${read ? `<button type="button" class="go" data-tour="next">${esc(t(s.next || 'Siguiente'))}</button>` : ''}</div></div>`;
  place();
  el.querySelector('.tour-btns .go, .tour-btns button')?.focus({ preventScroll: true });
}
// Where the light and the card go: around the element, the card below it (or above, if it doesn't fit); centred
// when the step has no element. Also hidden while something is open over the editor.
function place() {
  if (!el) return;
  const s = TOUR[step], wait = busy();
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
  if (b && el.contains(b)) { e.preventDefault(); e.stopPropagation(); const k = b.dataset.tour; if (k === 'skip') stopTour(); else if (k === 'back') go(step - 1); else go(step + 1); return; }
  // (The lit element itself: it does what it does — opens its dialog, presents… — and the tour goes on after.)
  const s = TOUR[step], tg = s && !s.next && target(s);
  if (tg && tg.contains(e.target)) setTimeout(() => go(step + 1), 0);
}
function onKey(e) {
  if (!el || el.hidden) return;
  if (e.key === 'Escape') { e.stopPropagation(); stopTour(); }
}

// The first sign-in with a new account, once per browser: after the welcome (the gallery of the first visit, if it is
// open, goes first — the tour waits behind it).
const isNew = a => +a?.created > 0 && Date.now() - +a.created < NEW_DAYS * 864e5;
const seen = () => { try { return !!localStorage.getItem(SEEN); } catch { return true; } };
export function initTour() {
  let asked = false;
  const check = a => { if (asked || !a || !isNew(a) || seen() || tourRunning()) return; asked = true; setTimeout(startTour, 900); };
  onAccount(check); check(account());
}
