// Very big presentations — hundreds of MB of video and pictures, such as a 417 MB PowerPoint — work in the browser,
// but there they live at the edge of what a tab may hold (Francisco, 2026-10-20: «en casos extremos que se indique bajar
// el programa en local, y un botón de abrir desde la aplicación de escritorio»). The desktop app has no such limits.
// Said once per presentation, with three ways on: open it in the desktop app, download the app, or go on here.
//
// Opening it there: a presentation of Revela's cloud by its link (revela://open?doc=…); any other one as a .revela
// package, downloaded, then revela://open?downloaded=<its name>: the app looks for it in Downloads — only there, only
// a .revela, only one just downloaded — and opens it (desktop/src-tauri/src/main.rs).

import { state, subscribe } from '../../core/store.js';
import { approxSize } from '../../core/model.js';
import { liveBytes } from '../../core/mediastore.js';
import { EDITION, OFFICIAL_SITE } from '../../core/config.js';
import { t } from '../../i18n/index.js';
import { slug } from '../../io/files.js';
import { saveProject } from '../../io/formats/project.js';
import * as cd from '../../io/cloud/clouddocs.js';
import { withProgress, toast } from './toast.js';
import { footHTML } from '../dialogs/dlgkit.js';

let BIG_DECK = 200e6;                                   // characters (its files as base64: some 150 MB)
export const setBigDeckLimit = n => { BIG_DECK = n; };   // (for the tests)
// (Revela's page for it — the installers and a one-line command for each system —, in the interface's language.)
export const DESKTOP_DOWNLOAD = OFFICIAL_SITE + '/download';
// (Its files by address — core/mediastore.js — count as the base64 they would be.)
const charsOf = deck => approxSize(deck) + liveBytes(deck) * 4 / 3;
export const deckMB = (deck = state.deck) => Math.round(charsOf(deck) * 0.75 / 1e6);
export const isBigDeck = (deck = state.deck) => charsOf(deck) > BIG_DECK;
// (How the app is opened: an address the system gives to it. For the tests, another.)
let launch = url => { location.href = url; };
export const setLauncher = fn => { launch = fn; };

// Open it in the desktop app. → 'doc' (by its cloud link) | 'file' (downloaded, then opened there) | null.
export async function openInDesktop() {
  const doc = cd.cloudDoc();
  if (doc?.id) { await cd.flushCloud().catch(() => {}); launch(`revela://open?doc=${encodeURIComponent(doc.id)}`); return 'doc'; }
  const name = slug(state.deck.name) + '.revela';
  try {
    await withProgress(t('Preparando el paquete (.revela)…'), say => saveProject({ onProgress: (a, b) => say(b ? Math.round(a * 100 / b) + ' %' : '') }));
  } catch (e) { toast(t('No se pudo preparar el paquete:') + ' ' + (e?.message || e), { error: true }); return null; }
  launch(`revela://open?downloaded=${encodeURIComponent(name)}`);
  toast(t('Descargado «{f}». Se abre en la aplicación de escritorio en cuanto termina de bajar; si no la tienes, descárgala, o abre el archivo con doble clic.').replace('{f}', name),
    { ms: 15000, action: { label: t('Descargar la aplicación'), run: () => window.open(DESKTOP_DOWNLOAD, '_blank', 'noopener') } });
  return 'file';
}

// The notice: what it weighs, why the app, and the three buttons. → the choice ('open' | 'download' | 'later').
export function bigDeckNotice({ asked = false } = {}) {
  document.getElementById('bigdeck-modal')?.remove();
  return new Promise(resolve => {
    const back = document.createElement('div'); back.id = 'bigdeck-modal'; back.className = 'modal-backdrop';
    back.innerHTML = `<div class="modal" style="text-align:start;width:min(520px,94vw);max-width:none"><button class="modal-close">✕</button>
      <h3>${t(asked && !isBigDeck() ? 'Aplicación de escritorio' : 'Una presentación muy grande')}</h3>
      <p class="host-help">${asked && !isBigDeck() ? t('La aplicación de escritorio de Revela abre lo mismo, sin los límites del navegador: para presentaciones con mucho vídeo, o para trabajar sin conexión. Se descarga gratis para Windows, macOS y Linux.')
        : t('Lleva unos {n} MB de vídeos e imágenes. El navegador funciona, pero al límite de lo que le deja a una pestaña: algo pesado (copiar mucho, exportar) puede cerrarla. La aplicación de escritorio de Revela no tiene ese límite y abre lo mismo.').replace('{n}', deckMB())}</p>
      ${footHTML(`<button type="button" class="mini2 bd-later">${t('Seguir aquí')}</button><button type="button" class="mini2 bd-get">${t('Descargar la aplicación')}</button><button type="button" class="fr-do bd-open">${t('Abrir en la aplicación de escritorio')}</button>`)}</div>`;
    document.body.appendChild(back);
    const done = v => { back.remove(); resolve(v); };
    back.querySelector('.modal-close').addEventListener('click', () => done('later'));
    back.querySelector('.bd-later').addEventListener('click', () => done('later'));
    back.querySelector('.bd-get').addEventListener('click', () => { window.open(DESKTOP_DOWNLOAD, '_blank', 'noopener'); done('download'); });
    back.querySelector('.bd-open').addEventListener('click', () => { done('open'); openInDesktop(); });
    back.querySelector('.bd-open').focus();
  });
}

// Said once per presentation (this tab), when it gets that big — opened, imported or grown —, not in the app itself.
const told = new Set();
export function watchBigDecks({ every = 4000 } = {}) {
  if (EDITION === 'desktop' || globalThis.__TAURI__) return () => {};
  let timer = null;
  const check = () => {
    timer = null;
    const key = state.deck.id || state.deck.name || '';
    if (told.has(key) || document.querySelector('.modal-backdrop') || !isBigDeck()) return;
    told.add(key); bigDeckNotice();
  };
  check();
  return subscribe(() => { if (!timer) timer = setTimeout(check, every); });
}
