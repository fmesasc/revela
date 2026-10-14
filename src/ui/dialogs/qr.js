// A sharing link as a QR code: to show it big on the projector (the class points their phones at it), to download
// it as an image (for a worksheet or a poster), or to put it on a slide. Black on white with a quiet margin and
// error correction M: a projected or printed code still reads from the back of the room.

import { QRCODE, loadScript } from '../../core/vendor.js';
import { addImage } from '../../features/document/blocks.js';
import { download } from '../../io/files.js';
import { state } from '../../core/store.js';
import { esc } from '../../core/text.js';
import { t } from '../../i18n/index.js';
import { alertDialog } from './dialog.js';

const OPTS = { margin: 2, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#ffffff' } };
const lib = () => loadScript(QRCODE, 'QRCode');
const draw = async (canvas, link, width) => { const Q = await lib(); await new Promise((ok, ko) => Q.toCanvas(canvas, link, { ...OPTS, width }, e => (e ? ko(e) : ok()))); };
// (Shown without «https://»: shorter to read out or type.)
const shortLink = link => link.replace(/^https?:\/\//, '');

// A small button that opens it: next to a «Copy» of the same link.
export const qrButton = cls => `<button type="button" class="mini2 ${cls}" title="${t('Código QR del enlace')}"><i class="ms" aria-hidden="true">qr_code_2</i> QR</button>`;

export function openQR(link, name = state.deck.name || '') {
  document.getElementById('qr-modal')?.remove();
  const back = document.createElement('div'); back.id = 'qr-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:center;width:min(380px,94vw);max-width:none"><button class="modal-close">✕</button>
    <h3>${t('Código QR')}</h3>
    <canvas class="qr-code" width="256" height="256" role="img" aria-label="${esc(t('Código QR de {link}').replace('{link}', link))}" style="background:#fff;border-radius:8px;max-width:100%"></canvas>
    <p class="host-help qr-link" dir="ltr" style="word-break:break-all">${esc(shortLink(link))}</p>
    <div class="fr-actions" style="justify-content:center;flex-wrap:wrap;gap:6px">
      <button type="button" class="mini2 qr-big"><i class="ms" aria-hidden="true">fullscreen</i> ${t('Mostrar en grande')}</button>
      <button type="button" class="mini2 qr-png"><i class="ms" aria-hidden="true">download</i> ${t('Descargar PNG')}</button>
      <button type="button" class="mini2 qr-slide"><i class="ms" aria-hidden="true">add_photo_alternate</i> ${t('Añadir a la diapositiva')}</button>
      <button type="button" class="mini2 qr-more"><i class="ms" aria-hidden="true">tune</i> ${t('Más opciones…')}</button></div></div>`;
  document.body.appendChild(back);
  const q = s => back.querySelector(s), close = () => back.remove();
  q('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  const failed = e => alertDialog(t('No se pudo crear el código QR: ') + (e?.message || e));
  draw(q('.qr-code'), link, 256).catch(e => { q('.qr-code').hidden = true; failed(e); });
  q('.qr-big').addEventListener('click', () => showQRBig(link, name));
  // The colours, the margin, a logo, the SVG: the same code with everything in hand. (Loaded only if asked for: a
  // link's QR is three clicks and nobody should pay for the maker to see it.)
  q('.qr-more').addEventListener('click', () => import('./qrmaker.js').then(m => { close(); m.openQRMaker({ text: link }); }).catch(failed));
  q('.qr-png').addEventListener('click', async () => {
    try {
      const c = document.createElement('canvas'); await draw(c, link, 1024);
      const blob = await new Promise(ok => c.toBlob(ok, 'image/png'));
      download(blob, `${(name || 'Revela').replace(/[\\/:*?"<>|]+/g, '').trim().slice(0, 60) || 'Revela'} - QR.png`);
    } catch (e) { failed(e); }
  });
  q('.qr-slide').addEventListener('click', async () => {
    try {
      const c = document.createElement('canvas'); await draw(c, link, 512);
      addImage(c.toDataURL('image/png'), { alt: t('Código QR de {link}').replace('{link}', shortLink(link)) });
      close();
    } catch (e) { failed(e); }
  });
}

// Over the whole screen, as large as it fits, with the text under it (for whoever can't scan): a click or Esc closes
// it. Exported because the QR maker (dialogs/qrmaker.js) shows its code the same way — one «show it big», not two.
export function showQRBig(link, name) {
  const el = document.createElement('div'); el.id = 'qr-big'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', t('Código QR'));
  el.style.cssText = 'position:fixed;inset:0;z-index:100000;background:#fff;color:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2vh;cursor:zoom-out;padding:16px;outline:none';
  const side = Math.floor(Math.min(innerWidth * 0.9, innerHeight * 0.72));
  el.innerHTML = `${name ? `<div style="font:600 clamp(18px,3.5vh,40px) system-ui,sans-serif;text-align:center">${esc(name)}</div>` : ''}
    <canvas width="${side}" height="${side}" aria-hidden="true"></canvas>
    <div dir="ltr" style="font:500 clamp(14px,2.6vh,30px) system-ui,sans-serif;text-align:center;word-break:break-all">${esc(shortLink(link))}</div>`;
  document.body.appendChild(el);
  draw(el.querySelector('canvas'), link, side).catch(() => {});
  const done = () => { el.remove(); removeEventListener('keydown', key, true); if (document.fullscreenElement === el) document.exitFullscreen?.().catch(() => {}); };
  const key = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(); } };
  el.addEventListener('click', done); addEventListener('keydown', key, true);
  el.requestFullscreen?.().catch(() => {});
  el.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && el.isConnected) done(); });
  el.tabIndex = -1; el.focus();
}
