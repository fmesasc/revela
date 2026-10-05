// Phone companion (client side, runs in remote.html on the phone).
// Connects to the presenter's peer id (revela-<CODE>) over WebRTC, pairs with the
// key from the QR link (or waits for the presenter to allow it), shows the
// current slide's notes and sends navigation, blackout and touchpad commands:
// laser, spotlight, arrow, magnifier, and taps / drags / two-finger scrolls and
// pinches on the slide (host side: features/live/remote.js and remotepad.js).

import { PEERJS, loadScript } from '../../core/vendor.js';
import { peerOptions } from '../../core/ice.js';
import { t } from '../../i18n/index.js';

const $ = id => document.getElementById(id);
const store = (k, v) => { try { if (v === undefined) return localStorage.getItem('revela.remote.' + k); localStorage.setItem('revela.remote.' + k, v); } catch {} return null; };

let conn = null, peer = null, blackOn = false, startAt = null, timerInt = null, cur = { index: 0, presenting: false, aspect: 16 / 9 };
let tool = store('tool') || 'laser', view = store('view') || 'notes', zoom = 1, wake = null, paired = false;
const params = new URLSearchParams(location.search);
let key = params.get('k') || '';
// The token this phone got when it was let in (for coming back after a drop), for the code it was for.
let resume = (() => { try { const [c, r] = (sessionStorage.getItem('revela.remote.resume') || '').split(':'); return c && c === (params.get('code') || '').toUpperCase() ? r : ''; } catch { return ''; } })();

// ---- Interface text ------------------------------------------------------------
document.documentElement.lang = document.documentElement.lang || 'es';
document.querySelectorAll('[data-t]').forEach(el => { el.textContent = t(el.dataset.t); });
document.querySelectorAll('[data-tt]').forEach(el => { el.title = t(el.dataset.tt); });
document.title = 'Revela · ' + t('Mando');

const HINTS = {
  laser: 'Mueve el dedo: el público ve un punto rojo con estela. Pellizca con dos dedos para ampliar la diapositiva.',
  spot: 'Ilumina una zona y oscurece el resto. Cuanto más aprietes o más tiempo mantengas el dedo, mayor es el foco; pellizca para cambiar su tamaño.',
  arrow: 'Una flecha que se queda donde levantes el dedo.',
  lens: 'Amplía ×2 la zona bajo el dedo. Pellizca para cambiar el tamaño de la lupa.',
  touch: 'Toca para pulsar; arrastra para mover; desliza con dos dedos para desplazar; pellizca para ampliar y toca dos veces para volver. Las webs de otros sitios no se pueden tocar desde aquí.',
};

// ---- Little helpers --------------------------------------------------------------
const buzz = ms => { try { navigator.vibrate?.(ms); } catch {} };
let toastT = 0;
function toast(msg) { const el = $('toast'); el.textContent = msg; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 3500); }
function setStatus(text, on) { const s = $('status'); s.textContent = text; s.classList.toggle('on', !!on); }
function show(screen) { document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === screen)); if (screen === 'control') fitPad(); }
function send(cmd) { if (conn && conn.open && paired) { try { conn.send(cmd); } catch {} } }
function err(text, info = false) { $('err').textContent = text; $('err').classList.toggle('info', info); }

function startTimer() {
  startAt = Date.now();
  clearInterval(timerInt);
  const tick = () => {
    const s = Math.floor((Date.now() - startAt) / 1000);
    $('timer').textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  };
  tick(); timerInt = setInterval(tick, 500);
}

// The screen stays on while connected (Wake Lock API, where there is one).
async function keepAwake(on) {
  try {
    if (!on) { await wake?.release(); wake = null; return; }
    if (!wake && document.visibilityState === 'visible' && navigator.wakeLock) {
      wake = await navigator.wakeLock.request('screen');
      wake.addEventListener('release', () => { wake = null; });
    }
  } catch { wake = null; }
}
document.addEventListener('visibilitychange', () => { if (paired) keepAwake(true); });

// ---- Connection ------------------------------------------------------------------
const loadPeerJS = () => loadScript(PEERJS, 'Peer').catch(() => { throw new Error(t('No se pudo cargar la librería de conexión.')); });

let slow = 0;
// Coming back after a drop: a few tries, sooner while the phone is in use.
let back = false, lastCode = '', tries = 0, retryT = 0;
function retry() {
  clearTimeout(retryT);
  if (!back || paired) return;
  if (tries++ >= 8) { back = false; setStatus(t('Desconectado')); show('connect'); $('go').disabled = false; err(t('Se ha perdido la conexión. Pulsa «Conectar» para volver.')); return; }
  retryT = setTimeout(() => { if (document.visibilityState === 'visible') connect(lastCode); else retry(); }, Math.min(8000, 800 * tries));
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && back && !paired) { tries = 0; clearTimeout(retryT); connect(lastCode); } });

async function connect(code, again = false) {
  lastCode = code;
  err(''); $('go').disabled = true; setStatus(back || again ? t('Reconectando…') : t('Conectando…'));
  try { await loadPeerJS(); } catch { err(t('No se puede conectar: comprueba la conexión a internet del móvil y vuelve a intentarlo.')); $('go').disabled = false; setStatus(t('Sin conectar')); return; }
  try { peer?.destroy(); } catch {}
  clearTimeout(slow);
  peer = new window.Peer(await peerOptions());
  const mine = peer;
  // Never «Connecting…» for ever: after 10 s, once more from the start (the first try sometimes sticks);
  // then, say what to try. (A direct connection is always tried first; relays only if there's no way.)
  const fresh = !again;
  slow = setTimeout(() => {
    if (peer !== mine || paired || conn?.open) return;
    try { mine.destroy(); } catch {}
    if (back) { retry(); return; }
    if (fresh) { connect(code, true); return; }
    err(t('No se pudo conectar. Comprueba el código en el ordenador; si sigue sin ir, conecta el móvil a la misma wifi que el ordenador y vuelve a intentarlo.'));
    $('go').disabled = false; setStatus(t('Sin conectar'));
  }, 10000);
  peer.on('error', e => {
    if (peer !== mine) return;
    clearTimeout(slow);
    if (back) { retry(); return; }                       // (still coming back: try again a little later)
    err(e.type === 'peer-unavailable' ? t('No hay ninguna presentación con ese código.') : (t('Error de conexión: ') + (e.type || e)));
    $('go').disabled = false; setStatus(t('Sin conectar'));
  });
  peer.on('open', () => {
    conn = peer.connect('revela-' + code, { reliable: true });
    conn.on('open', () => { clearTimeout(slow); try { conn.send({ type: 'hello', key, ...(resume && { resume }) }); } catch {} });
    conn.on('data', onMessage);
    const mineConn = conn;
    conn.on('close', () => {
      if (conn !== mineConn) return;                     // (an older connection, replaced)
      const was = paired; paired = false; keepAwake(false);
      // Dropped (the phone locked, the network changed…): back by itself, with its key.
      if (was && back && resume) { setStatus(t('Reconectando…')); retry(); return; }
      setStatus(t('Desconectado')); show('connect'); $('go').disabled = false;
    });
  });
}

function onMessage(m) {
  if (!m || typeof m !== 'object') return;
  switch (m.kind) {
    case 'welcome': {
      const again = back; paired = true; back = true; tries = 0; err(''); setStatus(t('Conectado'), true); show('control'); if (!again) startTimer(); keepAwake(true); buzz(20);
      // Its own token to come back with (also when the code was typed): kept for this tab, reloads included.
      if (typeof m.resume === 'string' && /^[A-Z0-9]{8,32}$/.test(m.resume)) { resume = m.resume; try { sessionStorage.setItem('revela.remote.resume', lastCode + ':' + resume); } catch {}
        if (params.get('code') !== lastCode) { params.set('code', lastCode); history.replaceState(null, '', location.pathname + '?' + params); } }
      break;
    }
    case 'pending': err(t('Esperando a que quien presenta lo permita…'), true); setStatus(t('Esperando…')); break;
    case 'busy': if (back) { retry(); break; } err(t('Ya hay otro móvil controlando esta presentación.')); break;
    case 'denied': err(t('Quien presenta no ha permitido la conexión.')); break;
    case 'revoked':
      // That link is spent: clear its key so a reconnection asks the presenter.
      key = ''; resume = ''; params.delete('k'); history.replaceState(null, '', location.pathname + (params.toString() ? '?' + params : ''));
      try { sessionStorage.removeItem('revela.remote.resume'); } catch {}
      back = false; paired = false; show('connect'); err(t('Quien presenta ha desconectado este mando.')); buzz([30, 60, 30]); break;
    case 'state': renderState(m); break;
    case 'thumb': if (m.index === cur.index && typeof m.src === 'string' && /^data:image\//.test(m.src)) { $('thumb').src = m.src; $('thumb').hidden = false; } break;
    case 'note': if (m.what === 'blocked') toast(t('Esa web es de otro sitio: el navegador no deja que el mando la toque ni la desplace.')); break;
  }
}

function renderState(s) {
  const moved = s.index !== cur.index;
  cur = { ...cur, ...s };
  $('title').textContent = s.title || '';
  $('pos').textContent = `${(s.index ?? 0) + 1}/${s.total ?? 1}`;
  $('notes').textContent = s.notes || t('— sin notas —');
  $('nextnotes').textContent = s.nextNotes || '—';
  if (moved) { $('thumb').hidden = true; zoom = 1; paintZoom(); }
  if (s.aspect > 0) { $('pad').style.setProperty('--ar', String(s.aspect)); fitPad(); }
  $('padempty').textContent = s.presenting ? '' : t('Empieza a presentar en el ordenador para usar el panel.');
  $('pad').classList.toggle('live', !!s.presenting);
}

// ---- Views, tools, notes size ----------------------------------------------------
function setView(v) {
  view = v; store('view', v);
  document.querySelectorAll('.tabs [data-view]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.view === v)));
  $('v-notes').classList.toggle('on', v === 'notes'); $('v-pad').classList.toggle('on', v === 'pad');
  if (v !== 'pad') send({ type: 'laseroff' });
  fitPad();
}
function setTool(v) {
  if (!HINTS[v]) v = 'laser';
  if (v !== tool) send({ type: 'clear' });
  tool = v; store('tool', v);
  document.querySelectorAll('.toolsel [data-tool]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tool === v)));
  $('padhint').textContent = t(HINTS[v]); fitPad();
}
let notesPx = Math.max(12, Math.min(40, +store('notes') || 18));
function setNotes(px) { notesPx = Math.max(12, Math.min(40, px)); document.documentElement.style.setProperty('--notes', notesPx + 'px'); store('notes', notesPx); }

// The pad keeps the slide's proportions inside the space it has.
function fitPad() {
  const wrap = $('padwrap'), p = $('pad');
  if (!wrap.offsetParent) return;
  const ar = cur.aspect || 16 / 9, W = wrap.clientWidth, H = wrap.clientHeight - $('padhint').offsetHeight - 8;
  const w = Math.min(W, H * ar);
  p.style.width = w + 'px'; p.style.height = (w / ar) + 'px';
}
new ResizeObserver(fitPad).observe($('padwrap'));

function paintZoom() { const z = $('zoomtag'); z.style.display = zoom > 1.02 ? 'block' : 'none'; z.textContent = '×' + zoom.toFixed(1); }

// ---- Touchpad ---------------------------------------------------------------------
// Touches → slide fractions; finger moves go out once per frame (coalesced).
const pts = new Map();                                    // pointerId → { x, y, sx, sy }
let g = null;                                             // the gesture: { kind, ... }
let spotR = +store('spotR') || 0.12, lensR = +store('lensR') || 0.15, lastTap = null;
let queued = null, raf = 0;
function frac(e) { const r = $('pad').getBoundingClientRect(); return { u: (e.clientX - r.left) / r.width, v: (e.clientY - r.top) / r.height, x: e.clientX, y: e.clientY }; }
function queue(m) {
  if (queued && queued.type === m.type && m.type === 'wheel') { m.dx += queued.dx; m.dy += queued.dy; }
  else if (queued && queued.type === m.type && m.type === 'zoom') m.factor *= queued.factor;
  else if (queued && queued.type !== m.type) send(queued);
  queued = m;
  if (!raf) { raf = requestAnimationFrame(flush); setTimeout(flush, 50); }   // (no frames while the page is hidden)
}
function flush() { cancelAnimationFrame(raf); raf = 0; if (queued) { const m = queued; queued = null; send(m); } }
const now = () => performance.now();
function finger(u, v, cls, r) {
  const f = $('finger'), p = $('pad');
  f.className = cls || ''; f.style.display = 'block';
  f.style.left = (u * 100) + '%'; f.style.top = (v * 100) + '%';
  if (r) { const d = r * 2 * p.clientWidth; f.style.width = f.style.height = d + 'px'; f.style.margin = `${-d / 2}px 0 0 ${-d / 2}px`; }
  else { f.style.width = f.style.height = f.style.margin = ''; }
}
const unfinger = () => { $('finger').style.display = 'none'; };

// Spotlight radius: from the touch pressure when the screen reports it, else growing while held.
function radius(e) {
  const base = tool === 'lens' ? lensR : spotR;
  if (tool !== 'spot') return base;
  const p = e?.pressure;
  if (e && e.pointerType !== 'mouse' && p > 0 && p !== 0.5 && p <= 1) return Math.min(0.45, base * (0.6 + p * 1.4));
  return Math.min(0.45, base * (1 + Math.min(1.5, (now() - g.t0) / 1000 * 0.35)));
}
function pointAt(e) {
  const r = radius(e); g.r = r; g.e = e;
  queue({ type: 'pointer', tool, x: g.u, y: g.v, r });
  finger(g.u, g.v, tool, tool === 'spot' || tool === 'lens' ? r : 0);
}
// While a spotlight is held still it still grows: re-send it every frame.
function holdLoop() { if (!g || g.kind !== 'point' || tool !== 'spot') return; pointAt(g.e); g.hold = requestAnimationFrame(holdLoop); }

function down(e) {
  e.preventDefault();
  try { $('pad').setPointerCapture(e.pointerId); } catch {}
  const f = frac(e); pts.set(e.pointerId, f);
  if (!cur.presenting) return;
  if (pts.size === 1) {
    g = { kind: tool === 'touch' ? 'press' : 'point', u: f.u, v: f.v, sx: f.x, sy: f.y, t0: now() };
    if (g.kind === 'point') { pointAt(e); if (tool === 'spot') g.hold = requestAnimationFrame(holdLoop); }
    else finger(f.u, f.v, 'touch');
  } else if (pts.size === 2) {
    // Two fingers: whatever one finger was doing ends; pinch or two-finger scroll begins.
    if (g?.kind === 'drag') { flush(); send({ type: 'drag', phase: 'end', x: g.u, y: g.v }); }
    if (g?.kind === 'point' && tool !== 'spot' && tool !== 'lens') send({ type: 'laseroff' });
    cancelAnimationFrame(g?.hold);
    const [a, b] = [...pts.values()];
    g = { kind: 'two', d0: Math.hypot(a.x - b.x, a.y - b.y), dl: Math.hypot(a.x - b.x, a.y - b.y), cu: (a.u + b.u) / 2, cv: (a.v + b.v) / 2, pinch: false, r0: tool === 'lens' ? lensR : spotR };
  }
}
function move(e) {
  if (!pts.has(e.pointerId)) return;
  const f = frac(e); pts.set(e.pointerId, f);
  if (!g || !cur.presenting) return;
  if (g.kind === 'point' && pts.size === 1) { g.u = f.u; g.v = f.v; pointAt(e); return; }
  if ((g.kind === 'press' || g.kind === 'drag') && pts.size === 1) {
    if (g.kind === 'press' && Math.hypot(f.x - g.sx, f.y - g.sy) > 8) {
      g.kind = 'drag'; send({ type: 'drag', phase: 'start', x: g.u, y: g.v }); buzz(8);
    }
    g.u = f.u; g.v = f.v; finger(f.u, f.v, 'touch');
    if (g.kind === 'drag') queue({ type: 'drag', phase: 'move', x: f.u, y: f.v });
    return;
  }
  if (g.kind === 'two' && pts.size >= 2) {
    const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y), cu = (a.u + b.u) / 2, cv = (a.v + b.v) / 2;
    if (!g.pinch && Math.abs(d / g.d0 - 1) > 0.12) g.pinch = true;
    if (tool === 'spot' || tool === 'lens') {
      // The pinch sizes the spotlight / magnifier.
      const r = Math.max(0.04, Math.min(0.45, g.r0 * d / g.d0));
      if (tool === 'spot') spotR = r; else lensR = r;
      queue({ type: 'pointer', tool, x: cu, y: cv, r }); finger(cu, cv, tool, r);
    } else if (g.pinch) {
      const k = d / g.dl;
      if (Math.abs(k - 1) > 0.01) { queue({ type: 'zoom', x: cu, y: cv, factor: k }); g.dl = d; zoom = Math.max(1, Math.min(6, zoom * k)); paintZoom(); }
    } else if (tool === 'touch') {
      queue({ type: 'wheel', x: cu, y: cv, dx: cu - g.cu, dy: cv - g.cv });
    }
    g.cu = cu; g.cv = cv;
  }
}
function up(e) {
  if (!pts.has(e.pointerId)) return;
  pts.delete(e.pointerId);
  if (!g) { if (!pts.size) unfinger(); return; }
  if (pts.size > 0) { if (g.kind === 'two') g.kind = 'done'; return; }
  flush();
  cancelAnimationFrame(g.hold);
  const was = g; g = null; unfinger();
  if (was.kind === 'point') send({ type: 'laseroff' });
  else if (was.kind === 'drag') send({ type: 'drag', phase: 'end', x: was.u, y: was.v });
  else if (was.kind === 'press' && now() - was.t0 < 600) {
    // Tap = click; a second tap close by soon after = back to normal size.
    const t1 = now();
    if (lastTap && t1 - lastTap.t < 320 && Math.hypot(was.u - lastTap.u, was.v - lastTap.v) < 0.05) {
      send({ type: 'zoomreset' }); zoom = 1; paintZoom(); lastTap = null;
    } else { send({ type: 'tap', x: was.u, y: was.v }); lastTap = { t: t1, u: was.u, v: was.v }; }
    buzz(10);
  } else if (was.kind === 'two') { store('spotR', spotR); store('lensR', lensR); if (tool === 'spot' || tool === 'lens') send({ type: 'laseroff' }); }
}
const pad = $('pad');
pad.addEventListener('pointerdown', down);
pad.addEventListener('pointermove', move);
pad.addEventListener('pointerup', up);
pad.addEventListener('pointercancel', up);
pad.addEventListener('contextmenu', e => e.preventDefault());

// ---- Wiring ----------------------------------------------------------------
const preset = params.get('code');
if (preset) $('code').value = preset.toUpperCase();

$('go').addEventListener('click', () => {
  const code = $('code').value.trim().toUpperCase();
  if (code.length >= 4) connect(code); else err(t('Escribe el código completo.'));
});
$('code').addEventListener('keydown', e => { if (e.key === 'Enter') $('go').click(); });
$('prev').addEventListener('click', () => { send({ type: 'prev' }); buzz(15); });
$('next').addEventListener('click', () => { send({ type: 'next' }); buzz(15); });
$('reset-timer').addEventListener('click', () => { startTimer(); buzz(10); });
$('zoomreset').addEventListener('click', () => { send({ type: 'zoomreset' }); zoom = 1; paintZoom(); buzz(10); });
$('black').addEventListener('click', () => {
  blackOn = !blackOn; send({ type: 'black', on: blackOn }); buzz(15);
  $('black').classList.toggle('armed', blackOn);
  $('black').textContent = blackOn ? t('Quitar pantalla negra') : t('Pantalla negra');
});
document.querySelectorAll('.tabs [data-view]').forEach(b => b.addEventListener('click', () => { setView(b.dataset.view); buzz(8); }));
document.querySelectorAll('.toolsel [data-tool]').forEach(b => b.addEventListener('click', () => { setTool(b.dataset.tool); buzz(8); }));
$('font-dn').addEventListener('click', () => setNotes(notesPx - 2));
$('font-up').addEventListener('click', () => setNotes(notesPx + 2));
setNotes(notesPx); setTool(tool); setView(view);
// Full screen (Android and others); on an iPhone, where a page can't, «Add to Home Screen» does it.
{
  const fs = $('fs'), root = document.documentElement;
  const standalone = matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches || navigator.standalone === true;
  if (document.fullscreenEnabled && !standalone) {
    fs.hidden = false;
    fs.addEventListener('click', () => { buzz(8); (document.fullscreenElement ? document.exitFullscreen() : root.requestFullscreen({ navigationUI: 'hide' })).catch(() => {}); });
    document.addEventListener('fullscreenchange', () => { fs.textContent = document.fullscreenElement ? '🗗' : '⛶'; });
  } else if (!standalone && /iPhone|iPod/.test(navigator.userAgent) && store('a2hs') !== 'no') {
    $('a2hs').hidden = false;
    $('a2hs-x').addEventListener('click', () => { $('a2hs').hidden = true; store('a2hs', 'no'); });
  }
}
// Opened from the QR code / link: connect straight away.
if (preset && preset.length >= 4) connect(preset.toUpperCase());
