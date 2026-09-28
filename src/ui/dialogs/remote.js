// "Connect phone": the code, QR and status of the phone remote (host side in
// features/live/remote.js).

import { QRCODE, loadScript } from '../../core/vendor.js';
import { startHost, stopHost } from '../../features/live/remote.js';
import { t } from '../../i18n/index.js';

function renderQR(canvas, text) {
  loadScript(QRCODE, 'QRCode').then(Q => Q.toCanvas(canvas, text, { width: 176, margin: 1 }, () => {}))
    .catch(() => { canvas.style.display = 'none'; });
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
