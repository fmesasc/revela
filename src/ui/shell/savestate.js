// Two quiet signs in the editor:
//  - kept only in this browser, the title bar's state says it is saved and how long ago («Guardado en este
//    navegador · hace 2 s»), counting on its own, where there is room; the ribbon (ui/ribbon/ribbon.js) still
//    decides whether it shows, and its words («En este navegador», «Sin guardar») stay for narrow windows;
//  - an empty slide says what can be done on it: «/» for the commands, files dropped on it.
import { state, currentSlide, subscribe } from '../../core/store.js';
import { savedHere } from '../../core/model.js';
import { t } from '../../i18n/index.js';

// «hace 2 s», «hace 3 min», «hace 2 h», or the time it was if longer ago.
export function agoText(at, now = Date.now()) {
  if (!at) return '';
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 5) return t('ahora mismo');
  if (s < 60) return t('hace {n} s').replace('{n}', s);
  if (s < 3600) return t('hace {n} min').replace('{n}', Math.floor(s / 60));
  if (s < 86400) return t('hace {n} h').replace('{n}', Math.floor(s / 3600));
  return new Date(at).toLocaleString();
}
export function refreshSaveState() {
  const ss = document.getElementById('save-state'); if (!ss) return;
  const at = state.deck.savedAt;
  // (Nothing written yet — «En este navegador» — or it couldn't be: «Sin guardar», the ribbon's.)
  if (!at || ss.classList.contains('failed') || !savedHere()) { ss.querySelector('time.ss-ago')?.remove(); ss.classList.remove('has-ago'); return; }
  // Beside the ribbon's own words (which a narrow window keeps, shorter: ui/styles/features.css).
  let ago = ss.querySelector('time.ss-ago');
  if (!ago) { ago = document.createElement('time'); ago.className = 'ss-ago'; ss.appendChild(ago); }
  const txt = t('Guardado en este navegador') + ' · ' + agoText(at);
  if (ago.textContent !== txt) ago.textContent = txt;
  ago.dateTime = new Date(at).toISOString(); ss.classList.add('has-ago');
}

// ---- The empty slide's hint ----
export function refreshEmptyHint() {
  const stage = document.getElementById('stage'), s = currentSlide(); if (!stage) return;
  const want = !!s && !s.blocks.length && !state.ui.editMaster && !state.deck.final && !state.ui.lock && !s.bgVideo && !s.bgIframe;
  let el = stage.querySelector(':scope > .empty-hint');
  if (!want) { el?.remove(); return; }
  if (!el) { el = document.createElement('div'); el.className = 'empty-hint'; el.setAttribute('aria-hidden', 'true'); }
  const html = `<span><kbd>/</kbd> ${t('Pulsa / para buscar comandos')}</span><span>${t('o arrastra aquí imágenes y archivos')}</span>`;
  if (el.innerHTML !== html) el.innerHTML = html;
  if (el.parentNode !== stage) stage.appendChild(el);
}

export function initSaveState() {
  const tick = () => { refreshSaveState(); refreshEmptyHint(); };
  subscribe(tick); tick();
  setInterval(refreshSaveState, 5000);
  window.addEventListener('revela:lang', tick);
}
