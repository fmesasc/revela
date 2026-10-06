// «Loading…», said on a slow connection: while something someone waits for is on its way (core/busy.js counts
// it — the app's requests, counted here; its own modules loaded on first use, as the service worker tells; and
// the libraries vendor.js downloads), a thin bar runs along the top
// of the window and the button that was pressed shows a spinner. Only after a moment (DELAY): what's quick shows
// nothing, so nothing flickers. Background work (syncing the cloud, polls, autosave — which has its own status)
// is left out (QUIET).
import { busy, onBusy } from '../../core/busy.js';
import { t } from '../../i18n/index.js';

const DELAY = 350;
// Requests nobody is waiting for: the cloud's sync and autosave, statistics, notices, live connections' relays.
const QUIET = /\/api\/docs\/[\w-]+\/(since|ops|view|thumb)\b|\/api\/notices|\/api\/ice\b|\/api\/call\/room\b|\/api\/me$|\/api\/collab\/|peerjs|\/api\/lti\/answer|stun:|turn:/;

let bar = null, timer = 0, pressed = null, pressedAt = 0, marked = null;

export function initBusy() {
  // Every request the app makes goes through here (fetch): counted unless it's background work.
  const real = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const url = typeof input === 'string' ? input : input?.url || String(input);
    if (QUIET.test(url)) return real(input, init);
    const end = busy();
    return real(input, init).finally(end);
  };
  // The button just pressed is the one that's waiting.
  const press = e => { const b = e.target.closest?.('button, [role="button"], a.btn, .mini2, .fr-do'); if (b) { pressed = b; pressedAt = performance.now(); } };
  document.addEventListener('pointerdown', press, true);
  document.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') press(e); }, true);
  // The app's own modules and styles on their way (the service worker says so, sw.js): counted too.
  const loading = new Map();
  navigator.serviceWorker?.addEventListener('message', e => {
    const { revelaBusy: kind, id } = e.data || {}; if (!kind || !id) return;
    if (kind === 'start' && !loading.has(id)) loading.set(id, busy());
    else if (kind === 'end') { loading.get(id)?.(); loading.delete(id); }
  });
  onBusy(n => (n ? start() : stop()));
}

function start() {
  if (bar?.classList.contains('on')) return markPressed();       // (already showing: a button pressed now waits too)
  if (timer) return;
  timer = setTimeout(() => {
    timer = 0;
    if (!bar) { bar = document.createElement('div'); bar.id = 'busy-bar'; bar.setAttribute('role', 'progressbar'); bar.setAttribute('aria-label', t('Cargando…')); document.body.appendChild(bar); }
    bar.classList.add('on'); document.body.setAttribute('aria-busy', 'true');
    markPressed();
  }, DELAY);
}
// The button pressed just before (it's what started the wait), with its spinner.
function markPressed() {
  let who = pressed && performance.now() - pressedAt < 5000 ? pressed : null;   // (pressed in the last seconds: what started the wait)
  // (Drawn again meanwhile — the ribbon redraws itself —: the same button, by its action.)
  if (who && !who.isConnected) who = who.dataset.action ? document.querySelector(`[data-action="${CSS.escape(who.dataset.action)}"]`) : null;
  if (!who || who === marked) return;
  if (marked) { marked.classList.remove('is-busy'); marked.removeAttribute('aria-busy'); }
  marked = who; who.classList.add('is-busy'); who.setAttribute('aria-busy', 'true');
}
function stop() {
  clearTimeout(timer); timer = 0;
  bar?.classList.remove('on'); document.body.removeAttribute('aria-busy');
  if (marked) { marked.classList.remove('is-busy'); marked.removeAttribute('aria-busy'); marked = null; }
  pressed = null;
}
