// Phone companion (host side, runs in the editor/presenter).
//
// The site is static, so pairing uses WebRTC through PeerJS's public broker: the
// presenter hosts a peer whose id embeds a short CODE, the phone (remote.html)
// connects to that id, and a data channel carries slide state one way and
// commands (next/prev/pointer/blackout) the other. No backend of our own.
//
// The command logic (applyCommand) and the state it sends (presentationState)
// are plain functions so they can be unit‑tested without a live connection.

import { state, subscribe } from '../core/store.js';
import * as slides from './slides.js';
import * as io from '../io/reveal.js';
import { t } from '../i18n.js';

const PEERJS = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I

let peer = null, conn = null, code = null, statusCb = null, unsub = null;

const genCode = () => Array.from({ length: 5 }, () =>
  CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('');

function loadScript(src) {
  return new Promise((res, rej) => {
    if (window.Peer) return res();
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = () => rej(new Error('no se pudo cargar PeerJS'));
    document.head.appendChild(s);
  });
}

export function remoteCode() { return code; }
export function remoteLink() {
  const base = location.href.replace(/[^/]*(\?.*)?$/, '');
  return `${base}remote.html?code=${code || ''}`;
}

export async function startHost(onStatus) {
  statusCb = onStatus;
  onStatus?.({ state: 'loading' });
  await loadScript(PEERJS);
  hostWithFreshCode(0);
  return code;
}

function hostWithFreshCode(attempt) {
  code = genCode();
  peer = new window.Peer('revela-' + code);
  peer.on('open', () => statusCb?.({ state: 'waiting', code, link: remoteLink() }));
  peer.on('connection', c => {
    conn = c;
    c.on('open', () => { statusCb?.({ state: 'connected', code, link: remoteLink() }); pushState(); });
    c.on('data', d => handleCommand(d));
    c.on('close', () => { conn = null; statusCb?.({ state: 'waiting', code, link: remoteLink() }); });
  });
  peer.on('error', e => {
    if (e.type === 'unavailable-id' && attempt < 5) { peer.destroy(); hostWithFreshCode(attempt + 1); return; }
    statusCb?.({ state: 'error', error: e.type || String(e) });
  });
  // Push fresh state to the phone on any document/slide change.
  unsub?.();
  unsub = subscribe(() => pushState());
  window.addEventListener('revela:present-slide', pushState);
}

export function stopHost() {
  try { conn?.close(); } catch {}
  try { peer?.destroy(); } catch {}
  unsub?.(); window.removeEventListener('revela:present-slide', pushState);
  peer = conn = code = null;
  statusCb?.({ state: 'off' });
}

export function pushState() {
  if (conn && conn.open) { try { conn.send(presentationState()); } catch {} }
}

// ---- Host panel (code + QR + status) --------------------------------------
const QRLIB = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js';
function renderQR(canvas, text) {
  const draw = () => window.QRCode?.toCanvas(canvas, text, { width: 176, margin: 1 }, () => {});
  if (window.QRCode) return draw();
  const s = document.createElement('script');
  s.src = QRLIB; s.onload = draw; s.onerror = () => { canvas.style.display = 'none'; };
  document.head.appendChild(s);
}

export function openHostPanel() {
  if (document.getElementById('host-modal')) return;
  const back = document.createElement('div');
  back.id = 'host-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal">
    <button class="modal-close" title="Cerrar">✕</button>
    <h3>${t('Conectar móvil')}</h3>
    <p class="host-help">En el móvil, abre <b class="host-url">remote.html</b> e introduce el código
      (o escanea el QR). Podrás ver las notas, pasar diapositivas y usar el puntero.</p>
    <div class="host-code">·····</div>
    <canvas class="host-qr" width="176" height="176"></canvas>
    <div class="host-status">Iniciando…</div>
    <a class="host-link" target="_blank" rel="noopener">Abrir el mando ↗</a>
  </div>`;
  document.body.appendChild(back);
  const q = sel => back.querySelector(sel);
  const close = () => { stopHost(); back.remove(); };
  q('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });

  startHost(s => {
    if (s.state === 'loading') q('.host-status').textContent = 'Cargando conexión…';
    if (s.code) q('.host-code').textContent = s.code;
    if (s.link) {
      q('.host-link').href = s.link;
      q('.host-url').textContent = s.link.replace(/^https?:\/\//, '');
      renderQR(q('.host-qr'), s.link);
    }
    if (s.state === 'waiting') q('.host-status').textContent = 'Esperando al móvil…';
    if (s.state === 'connected') { const el = q('.host-status'); el.textContent = '📱 Móvil conectado'; el.classList.add('on'); }
    if (s.state === 'error') q('.host-status').textContent = 'Error: ' + s.error;
  });
}

// ---- Pure logic (testable) -------------------------------------------------
export function presentationState() {
  const visible = state.deck.slides.filter(s => !s.hidden);
  const ap = io.activePresent;
  let cur;
  if (ap && ap.frame.contentWindow.Reveal) cur = visible[ap.frame.contentWindow.Reveal.getSlidePastCount()];   // flat position (vertical stacks too)
  else cur = state.deck.slides[state.ui.slideIndex];
  const i = visible.indexOf(cur);
  return {
    kind: 'state',
    presenting: !!ap,
    index: i < 0 ? 0 : i,
    total: visible.length,
    title: state.deck.name || 'Presentación',
    notes: cur?.notes || '',
    nextNotes: visible[i + 1]?.notes || '',
  };
}

export function applyCommand(cmd) {
  switch (cmd && cmd.type) {
    case 'next': nav(+1); break;
    case 'prev': nav(-1); break;
    case 'goto': nav(0, cmd.index); break;
    case 'pointer': laser(cmd.x, cmd.y); break;
    case 'laseroff': laserOff(); break;
    case 'black': black(!!cmd.on); break;
  }
}
function handleCommand(cmd) { applyCommand(cmd); pushState(); }

function nav(delta, absolute) {
  const ap = io.activePresent;
  if (ap && ap.frame.contentWindow.Reveal) {
    const Rv = ap.frame.contentWindow.Reveal;
    if (absolute != null) { const el = Rv.getSlides()[absolute]; if (el) { const ix = Rv.getIndices(el); Rv.slide(ix.h, ix.v); } }
    else delta > 0 ? Rv.next() : Rv.prev();
  } else {
    const n = state.deck.slides.length;
    const to = absolute != null ? absolute : Math.max(0, Math.min(n - 1, state.ui.slideIndex + delta));
    slides.goToSlide(to);
  }
}

// Laser pointer and blackout drawn inside the presentation overlay (same origin).
function presentDoc() { return io.activePresent?.frame.contentDocument || null; }
function laser(x, y) {
  const doc = presentDoc(); if (!doc) return;
  let dot = doc.getElementById('__laser');
  if (!dot) {
    dot = doc.createElement('div'); dot.id = '__laser';
    dot.style.cssText = 'position:fixed;width:26px;height:26px;border-radius:50%;pointer-events:none;'
      + 'z-index:99999;transform:translate(-50%,-50%);background:radial-gradient(circle,#ff2d2d 30%,rgba(255,45,45,.35) 55%,transparent 70%)';
    doc.body.appendChild(dot);
  }
  dot.style.left = (x * doc.documentElement.clientWidth) + 'px';
  dot.style.top = (y * doc.documentElement.clientHeight) + 'px';
  dot.style.display = 'block';
}
function laserOff() { const d = presentDoc()?.getElementById('__laser'); if (d) d.style.display = 'none'; }
function black(on) {
  const doc = presentDoc(); if (!doc) return;
  let b = doc.getElementById('__black');
  if (!b) { b = doc.createElement('div'); b.id = '__black'; b.style.cssText = 'position:fixed;inset:0;background:#000;z-index:99998'; doc.body.appendChild(b); }
  b.style.display = on ? 'block' : 'none';
}
