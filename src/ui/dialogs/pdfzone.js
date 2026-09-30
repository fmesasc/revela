// "Page and zoom" of a PDF step: choose the page and drag a rectangle over the
// part that should fill the object (or "Whole page"). Resolves to
// { page, zx, zy, zs } — the part's centre (0-1) and the zoom — or null.

import { t } from '../../i18n/index.js';
import { openPdf, pageImage, zoomForRect, rectForZoom } from '../../features/content/files.js';

export async function openPdfZone(b, start = {}) {
  const pdf = await openPdf(b.src), pages = pdf.numPages;
  let page = Math.min(pages, Math.max(1, +start.page || b.page || 1)), ratio = 0.77, rect = null;
  return new Promise(resolve => {
    const back = document.createElement('div');
    back.id = 'pdfzone-modal'; back.className = 'modal-backdrop';
    back.innerHTML = `<div class="modal" style="text-align:start;width:min(760px,96vw)"><button class="modal-close">✕</button>
      <h3>${t('Página y zoom del PDF')}</h3>
      <p class="host-help">${t('Arrastra sobre la página para marcar la zona que se ampliará.')}</p>
      <div class="pz-nav"><button type="button" class="mini2" data-go="-1">◀</button><span class="pz-n"></span><button type="button" class="mini2" data-go="1">▶</button>
        <button type="button" class="mini2 pz-whole">${t('Página entera')}</button></div>
      <div class="pz-stage"><img class="pz-img" alt="" draggable="false"><div class="pz-rect" hidden></div></div>
      <div class="fr-actions"><button type="button" class="fr-do pz-ok">${t('Aceptar')}</button></div></div>`;
    document.body.appendChild(back);
    const img = back.querySelector('.pz-img'), box = back.querySelector('.pz-rect'), stage = back.querySelector('.pz-stage');
    const done = v => { back.remove(); resolve(v); };
    const paintRect = () => {
      box.hidden = !rect || (rect.w >= 0.999 && rect.h >= 0.999);
      if (rect) Object.assign(box.style, { left: rect.x * 100 + '%', top: rect.y * 100 + '%', width: rect.w * 100 + '%', height: rect.h * 100 + '%' });
    };
    const show = async first => {
      back.querySelector('.pz-n').textContent = `${page} / ${pages}`;
      const im = await pageImage(pdf, page, 900); ratio = im.w / im.h; img.src = im.src;
      stage.style.aspectRatio = `${im.w} / ${im.h}`; stage.style.width = `min(100%, calc(62vh * ${ratio.toFixed(4)}))`;
      rect = first && start.zs > 1 ? rectForZoom(b.w, b.h, ratio, start) : null; paintRect();
    };
    back.querySelectorAll('[data-go]').forEach(x => x.addEventListener('click', () => { const p = Math.min(pages, Math.max(1, page + +x.dataset.go)); if (p !== page) { page = p; show(false); } }));
    back.querySelector('.pz-whole').addEventListener('click', () => { rect = null; paintRect(); });
    // Drag a rectangle (it keeps inside the page).
    stage.addEventListener('pointerdown', e => {
      e.preventDefault(); stage.setPointerCapture(e.pointerId);
      const r = stage.getBoundingClientRect(), fx = v => Math.min(1, Math.max(0, (v - r.left) / r.width)), fy = v => Math.min(1, Math.max(0, (v - r.top) / r.height));
      const x0 = fx(e.clientX), y0 = fy(e.clientY);
      const move = ev => { const x1 = fx(ev.clientX), y1 = fy(ev.clientY); rect = { x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) }; paintRect(); };
      const up = () => { stage.removeEventListener('pointermove', move); stage.removeEventListener('pointerup', up); if (rect && (rect.w < 0.02 || rect.h < 0.02)) { rect = null; paintRect(); } };
      stage.addEventListener('pointermove', move); stage.addEventListener('pointerup', up);
    });
    back.querySelector('.modal-close').addEventListener('click', () => done(null));
    back.addEventListener('click', e => { if (e.target === back) done(null); });
    back.querySelector('.pz-ok').addEventListener('click', () => done({ page, ...(rect ? zoomForRect(b.w, b.h, ratio, rect) : { zx: 0.5, zy: 0.5, zs: 1 }) }));
    show(true);
  });
}
