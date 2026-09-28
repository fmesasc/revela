// Phone companion (client side, runs in remote.html on the phone).
// Connects to the presenter's peer id (revela-<CODE>) over WebRTC and shows the
// current slide's notes while sending navigation / pointer / blackout commands.

const PEERJS = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
const $ = id => document.getElementById(id);

let conn = null, blackOn = false, startAt = null, timerInt = null;

function startTimer() {
  startAt = Date.now();
  clearInterval(timerInt);
  const tick = () => {
    const s = Math.floor((Date.now() - startAt) / 1000);
    $('timer').textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  };
  tick(); timerInt = setInterval(tick, 500);
}

function loadPeerJS() {
  return new Promise((res, rej) => {
    if (window.Peer) return res();
    const s = document.createElement('script');
    s.src = PEERJS; s.onload = res; s.onerror = () => rej(new Error('No se pudo cargar la librería de conexión.'));
    document.head.appendChild(s);
  });
}

function setStatus(text, on) { const s = $('status'); s.textContent = text; s.classList.toggle('on', !!on); }
function show(screen) { document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === screen)); }
function send(cmd) { if (conn && conn.open) { try { conn.send(cmd); } catch {} } }

async function connect(code) {
  $('err').textContent = ''; $('go').disabled = true; setStatus('Conectando…');
  try { await loadPeerJS(); } catch (e) { $('err').textContent = e.message; $('go').disabled = false; return; }

  const peer = new window.Peer();
  peer.on('error', e => {
    $('err').textContent = e.type === 'peer-unavailable'
      ? 'No hay ninguna presentación con ese código.' : ('Error de conexión: ' + (e.type || e));
    $('go').disabled = false; setStatus('Sin conectar');
  });
  peer.on('open', () => {
    conn = peer.connect('revela-' + code, { reliable: true });
    conn.on('open', () => { setStatus('Conectado', true); show('control'); startTimer(); });
    conn.on('data', renderState);
    conn.on('close', () => { setStatus('Desconectado'); show('connect'); $('go').disabled = false; });
  });
}

function renderState(s) {
  if (!s || s.kind !== 'state') return;
  $('title').textContent = s.title || '';
  $('pos').textContent = `${(s.index ?? 0) + 1}/${s.total ?? 1}`;
  $('notes').textContent = s.notes || '— sin notas —';
  $('nextnotes').textContent = s.nextNotes || '—';
}

// ---- Pointer pad -----------------------------------------------------------
function openPad() {
  const pad = $('pad'), dot = $('dot');
  pad.style.display = 'block';
  const move = e => {
    const t = e.touches ? e.touches[0] : e;
    const x = t.clientX / window.innerWidth, y = t.clientY / window.innerHeight;
    dot.style.display = 'block'; dot.style.left = t.clientX + 'px'; dot.style.top = t.clientY + 'px';
    send({ type: 'pointer', x, y });
  };
  const up = () => { dot.style.display = 'none'; send({ type: 'laseroff' }); };
  pad._move = move; pad._up = up;
  pad.addEventListener('pointermove', move);
  pad.addEventListener('pointerup', up);
  pad.addEventListener('pointerleave', up);
}
function closePad() {
  const pad = $('pad');
  pad.style.display = 'none'; send({ type: 'laseroff' });
  pad.removeEventListener('pointermove', pad._move);
  pad.removeEventListener('pointerup', pad._up);
  pad.removeEventListener('pointerleave', pad._up);
}

// ---- Wiring ----------------------------------------------------------------
const preset = new URLSearchParams(location.search).get('code');
if (preset) $('code').value = preset.toUpperCase();

$('go').addEventListener('click', () => {
  const code = $('code').value.trim().toUpperCase();
  if (code.length >= 4) connect(code); else $('err').textContent = 'Escribe el código completo.';
});
$('code').addEventListener('keydown', e => { if (e.key === 'Enter') $('go').click(); });
$('prev').addEventListener('click', () => send({ type: 'prev' }));
$('next').addEventListener('click', () => send({ type: 'next' }));
$('pointer').addEventListener('click', openPad);
$('reset-timer').addEventListener('click', startTimer);
$('padclose').addEventListener('click', closePad);
$('black').addEventListener('click', () => {
  blackOn = !blackOn; send({ type: 'black', on: blackOn });
  $('black').classList.toggle('armed', blackOn);
  $('black').textContent = blackOn ? 'Quitar pantalla negra' : 'Pantalla negra';
});
