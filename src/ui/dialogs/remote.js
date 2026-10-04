// "Connect phone": the code, QR and status of the phone remote (host side in
// features/live/remote.js), the presenter's say on who controls the slides
// (allow a phone that typed the code, cut the connected one off), and the same
// controls as a small chip over the presentation.

import { QRCODE, loadScript } from '../../core/vendor.js';
import { session } from '../../core/session.js';
import { state } from '../../core/store.js';
import { startHost, stopHost, disconnectRemote, hostRunning } from '../../features/live/remote.js';
import { slideImageBlob } from '../../io/export/images.js';
import { t } from '../../i18n/index.js';

function renderQR(canvas, text) {
  loadScript(QRCODE, 'QRCode').then(Q => Q.toCanvas(canvas, text, { width: 176, margin: 1 }, () => {}))
    .catch(() => { canvas.style.display = 'none'; });
}

// A small JPG of a slide (about 360 px wide) for the phone's touchpad.
async function thumb(s) {
  const blob = await slideImageBlob(s, 'jpg', state.deck, { scale: 360 / (state.deck.size?.w || 1280), quality: 0.6 });
  return await new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = ko; r.readAsDataURL(blob); });
}

let last = null, chipWired = false;                       // the latest status (for the chip)

export function openHostPanel(opts = {}) {
  if (document.getElementById('host-modal')) return;
  const back = document.createElement('div');
  back.id = 'host-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal">
    <button class="modal-close" title="${t('Cerrar')}">✕</button>
    <h3>${t('Conectar móvil')}</h3>
    <p class="host-help">${t('En el móvil, escanea el QR (o abre esta dirección e introduce el código). Podrás ver las notas, pasar diapositivas y usar el panel táctil: puntero, foco, lupa y tocar la diapositiva.')}
      <b class="host-url">remote.html</b></p>
    <div class="host-code">·····</div>
    <canvas class="host-qr" width="176" height="176"></canvas>
    <div class="host-status">${t('Iniciando…')}</div>
    <div class="host-ask" hidden><span>${t('Un móvil ha escrito el código y pide controlar la presentación.')}</span>
      <span class="host-ask-btns"><button class="fr-do host-allow">${t('Permitir')}</button><button class="host-deny">${t('Rechazar')}</button></span></div>
    <button class="host-cut" hidden>${t('Desconectar el móvil')}</button>
    <p class="host-help host-keep">${t('Puedes cerrar esta ventana: el móvil sigue conectado mientras presentas.')} <button type="button" class="mini2 host-stop">${t('Apagar el mando')}</button></p>
    <a class="host-link" target="_blank" rel="noopener">${t('Abrir el mando')} ↗</a>
    <p class="host-help host-safe">${t('Solo un móvil a la vez puede controlar la presentación. El enlace del QR lleva una clave; quien escriba solo el código necesita tu permiso. Al desconectarlo, el enlace anterior deja de valer.')}</p>
  </div>`;
  document.body.appendChild(back);
  const q = sel => back.querySelector(sel);
  // Closing the dialog keeps the phone connected (to present full screen with it); «Stop» switches it off.
  const close = () => { back.remove(); syncChip(); };
  q('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  q('.host-cut').addEventListener('click', () => disconnectRemote());
  q('.host-stop').addEventListener('click', () => { stopHost(); last = null; close(); });
  if (!chipWired) { chipWired = true; window.addEventListener('revela:present-slide', syncChip); }   // (presenting starts or ends: the chip follows)

  startHost(s => {
    last = s.state === 'off' ? null : s;
    const st = q('.host-status');
    if (s.state === 'loading') st.textContent = t('Cargando conexión…');
    if (s.code) q('.host-code').textContent = s.code;
    if (s.link && q('.host-link').href !== s.link) {
      q('.host-link').href = s.link;
      q('.host-url').textContent = s.link.replace(/^https?:\/\//, '').replace(/[?#].*$/, '');
      renderQR(q('.host-qr'), s.link);
    }
    if (s.state === 'waiting') st.textContent = t('Esperando al móvil…');
    if (s.state === 'connected') st.textContent = '📱 ' + t('Móvil conectado');
    if (s.state === 'error') st.textContent = t('Error: ') + s.error;
    st.classList.toggle('on', s.state === 'connected');
    q('.host-cut').hidden = s.state !== 'connected';
    const ask = q('.host-ask'); ask.hidden = s.state !== 'request';
    if (s.state === 'request') { q('.host-allow').onclick = s.allow; q('.host-deny').onclick = s.deny; }
    syncChip();
  }, { thumb, ...opts }).catch(e => { q('.host-status').textContent = t('Error: ') + (e?.message || e); });
}

// Over the presentation: "📱 Remote ✕" (cut it off), or the request to allow.
function syncChip() {
  const ov = session.present?.overlay, live = hostRunning() && last;
  let chip = document.getElementById('remote-chip');
  const want = ov && live && (last.state === 'connected' || last.state === 'request') ? last.state : null;
  if (!want) { chip?.remove(); return; }
  if (!chip || chip.parentNode !== ov) { chip?.remove(); chip = document.createElement('div'); chip.id = 'remote-chip'; ov.appendChild(chip); }
  if (chip.dataset.state === want) return;
  chip.dataset.state = want;
  if (want === 'connected') {
    chip.innerHTML = `<span>📱 ${t('Mando conectado')}</span><button class="rc-cut" title="${t('Desconectar el móvil')}">✕</button>`;
    chip.querySelector('.rc-cut').addEventListener('click', () => disconnectRemote());
  } else {
    chip.innerHTML = `<span>📱 ${t('Un móvil pide el control')}</span><button class="rc-yes">${t('Permitir')}</button><button class="rc-no">${t('Rechazar')}</button>`;
    chip.querySelector('.rc-yes').addEventListener('click', () => last.allow?.());
    chip.querySelector('.rc-no').addEventListener('click', () => last.deny?.());
  }
}
