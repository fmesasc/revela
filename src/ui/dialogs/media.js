// "Playback" of a video or an animated GIF: segments played one per click
// (from second X to second Y), start by itself, loop, mute, and a colour made
// transparent (chroma key) picked from the preview. GIFs can also have their
// background removed with the AI, frame by frame. And the live camera's look.

import { createMediaPlayer } from '../../io/runtime/media.js';
import { mediaKind, setMediaPlayback, CAMERA_FILTERS, CAMERA_BACKGROUNDS, DEFAULT_CAMERA_COLOR, cameraBrightness, setCameraLook } from '../../features/live/media.js';
import { cameraLive, setCameraLive, setCameraBackground, pickCameraImage } from '../canvas/cameraview.js';
import { gifRemoveBackground } from '../../features/live/gifbg.js';
import { commit, currentSlide } from '../../core/store.js';
import { GIFUCT } from '../../core/vendor.js';
import { t } from '../../i18n/index.js';
import { alertDialog, confirmDialog } from './dialog.js';

const fmt = s => (Math.round(s * 10) / 10).toFixed(1);

export function openMediaPlayback(b) {
  const kind = mediaKind(b); if (!kind) return;
  document.getElementById('mp-modal')?.remove();
  const back = document.createElement('div');
  back.id = 'mp-modal'; back.className = 'modal-backdrop';
  let segs = (b.segments || []).map(s => ({ ...s }));
  const key = { color: b.key?.color || '#00ff00', tol: b.key?.tol ?? 0.3, soft: b.key?.soft ?? 0.1 };
  back.innerHTML = `<div class="modal mp" style="text-align:start;min-width:320px;max-width:min(620px,96vw)">
    <button class="modal-close">✕</button><h3>${t('Reproducción')}</h3>
    <div class="mp-view"></div>
    <div class="mp-bar"><button type="button" class="mini2 mp-play"><i class="ms">play_arrow</i></button>
      <input type="range" class="mp-time" min="0" max="1" step="0.01" value="0"><span class="mp-now">0.0 s</span></div>
    <fieldset><legend>${t('Al presentar')}</legend>
      <label class="fr-chk"><input type="checkbox" class="mp-auto"${b.autoplay ? ' checked' : ''}> ${t('Empezar solo al llegar a la diapositiva')}</label>
      <label class="fr-chk"><input type="checkbox" class="mp-loop"${b.loop ? ' checked' : ''}> ${t('Repetir en bucle')}</label>
      ${kind === 'video' ? `<label class="fr-chk"><input type="checkbox" class="mp-muted"${b.muted ? ' checked' : ''}> ${t('Sin sonido')}</label>` : ''}
    </fieldset>
    <fieldset><legend>${t('Tramos (uno por clic)')}</legend>
      <p class="host-help">${t('Cada clic de «siguiente» reproduce el tramo siguiente y se para al final. Si empieza solo, el primer tramo se reproduce al llegar. Sin tramos, un clic lo reproduce entero.')}</p>
      <div class="mp-segs"></div>
      <button type="button" class="mini2 mp-add">${t('Añadir tramo')}</button>
    </fieldset>
    <fieldset><legend>${t('Quitar un color (croma)')}</legend>
      <label class="fr-chk"><input type="checkbox" class="mp-key"${b.key?.color ? ' checked' : ''}> ${t('Hacer transparente un color (pantalla verde, fondo liso…)')}</label>
      <div class="mp-keyopts">
        <input type="color" class="mp-kc" value="${key.color}"> <button type="button" class="mini2 mp-pick">${t('Elegir de la imagen')}</button>
        <label class="fr-l">${t('Tolerancia')} <input type="range" class="mp-tol" min="0" max="0.8" step="0.01" value="${key.tol}"></label>
        <label class="fr-l">${t('Suavizado del borde')} <input type="range" class="mp-soft" min="0" max="0.5" step="0.01" value="${key.soft}"></label>
      </div>
      ${kind === 'gif' ? `<p class="host-help">${t('O quita el fondo con IA, fotograma a fotograma (en este navegador; tarda más cuantos más fotogramas tenga).')}</p>
        <button type="button" class="mini2 mp-ai">${t('Quitar fondo (IA)')}</button> <span class="mp-prog"></span>`
      : `<p class="host-help">${t('Para un vídeo sin fondo, usa un color de fondo liso y el croma, o un vídeo WebM con transparencia.')}</p>`}
    </fieldset>
    <div class="fr-actions"><span></span><button class="fr-do mp-ok">${t('Aplicar')}</button></div></div>`;
  document.body.appendChild(back);
  const q = s => back.querySelector(s);
  const opts = { kind, src: b.src, fit: 'contain', muted: true, loop: false, key: b.key?.color ? { ...key } : null, gifLib: GIFUCT };
  const p = createMediaPlayer(q('.mp-view'), opts);
  const close = () => { p.pause(); back.remove(); };
  q('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });

  // Preview and timeline.
  const time = q('.mp-time'), now = q('.mp-now');
  p.onframe = s => { if (document.activeElement !== time) time.value = s; now.textContent = fmt(s) + ' s'; q('.mp-play i').textContent = p.playing() ? 'pause' : 'play_arrow'; };
  p.ready.then(() => { time.max = p.duration() || 1; renderSegs(); if (p.error) alertDialog(t('No se pudo abrir el archivo.')); });
  time.addEventListener('input', () => p.seek(+time.value));
  q('.mp-play').addEventListener('click', () => (p.playing() ? p.pause() : p.play(p.time() >= p.duration() - 0.05 ? 0 : null, null)));
  const redraw = () => p.ready.then(() => { if (!p.playing()) p.seek(p.time()); });

  // Segments.
  function renderSegs() {
    q('.mp-segs').innerHTML = segs.map((s, i) => `<div class="mp-seg" data-i="${i}"><b>${i + 1}</b>
      <label>${t('Desde')} <input type="number" data-k="from" min="0" step="0.1" value="${fmt(s.from)}"></label>
      <button type="button" class="mini2" data-now="from" title="${t('Usar el momento actual')}"><i class="ms">schedule</i></button>
      <label>${t('Hasta')} <input type="number" data-k="to" min="0" step="0.1" value="${fmt(s.to)}"></label>
      <button type="button" class="mini2" data-now="to" title="${t('Usar el momento actual')}"><i class="ms">schedule</i></button>
      <button type="button" class="mini2" data-test title="${t('Probar')}"><i class="ms">play_arrow</i></button>
      <button type="button" class="mini2" data-rm title="${t('Quitar')}"><i class="ms">close</i></button></div>`).join('');
  }
  q('.mp-segs').addEventListener('input', e => {
    const i = +e.target.closest('.mp-seg')?.dataset.i, k = e.target.dataset.k;
    if (k) segs[i][k] = Math.max(0, +e.target.value || 0);
  });
  q('.mp-segs').addEventListener('click', e => {
    const btn = e.target.closest('button'); if (!btn) return;
    const i = +btn.closest('.mp-seg').dataset.i;
    if (btn.dataset.now) { segs[i][btn.dataset.now] = Math.round(p.time() * 10) / 10; renderSegs(); }
    else if (btn.hasAttribute('data-test')) p.play(segs[i].from, segs[i].to);
    else if (btn.hasAttribute('data-rm')) { segs.splice(i, 1); renderSegs(); }
  });
  q('.mp-add').addEventListener('click', () => {
    const from = segs.length ? segs[segs.length - 1].to : 0, d = p.duration() || 0;
    segs.push({ from, to: d > from ? Math.min(d, from + 2) : from + 2 });
    renderSegs();
  });

  // Colour key: live on the preview; "pick" reads a pixel of the unkeyed image.
  const syncKey = () => {
    const on = q('.mp-key').checked;
    q('.mp-keyopts').hidden = !on;
    Object.assign(key, { color: q('.mp-kc').value, tol: +q('.mp-tol').value, soft: +q('.mp-soft').value });
    opts.key = on ? { ...key } : null; redraw();
  };
  ['.mp-key', '.mp-kc', '.mp-tol', '.mp-soft'].forEach(s => q(s).addEventListener('input', syncKey));
  q('.mp-pick').addEventListener('click', () => {
    const view = q('.mp-view'); opts.key = null; redraw();
    view.classList.add('picking');
    view.addEventListener('click', e => {
      const c = view.querySelector('canvas'), r = c.getBoundingClientRect();
      const x = Math.floor((e.clientX - r.left) * c.width / r.width), y = Math.floor((e.clientY - r.top) * c.height / r.height);
      const d = c.getContext('2d').getImageData(x, y, 1, 1).data;
      q('.mp-kc').value = '#' + [d[0], d[1], d[2]].map(v => v.toString(16).padStart(2, '0')).join('');
      q('.mp-key').checked = true; view.classList.remove('picking'); syncKey();
    }, { once: true });
  });
  syncKey();

  // GIF: background removed by the AI, frame by frame.
  q('.mp-ai')?.addEventListener('click', async e => {
    if (!(await confirmDialog(t('Se descarga el modelo de IA (unos 40 MB, solo la primera vez) y se procesa cada fotograma en este navegador. ¿Continuar?')))) return;
    const btn = e.target.closest('button'); btn.disabled = true;
    try {
      const src = await gifRemoveBackground(b.src, { onProgress: (i, n) => (q('.mp-prog').textContent = `${i} / ${n}`) });
      commit(() => { const x = currentSlide().blocks.find(y => y.id === b.id); if (x) x.src = src; });
      close(); openMediaPlayback(currentSlide().blocks.find(y => y.id === b.id) || b);
    } catch (err) { alertDialog(t('No se pudo quitar el fondo: ') + (err.message || err)); btn.disabled = false; }
  });

  q('.mp-ok').addEventListener('click', () => {
    setMediaPlayback(b.id, {
      autoplay: q('.mp-auto').checked, loop: q('.mp-loop').checked, muted: kind === 'video' && q('.mp-muted').checked,
      segments: segs.filter(s => s.to > s.from).map(s => ({ from: s.from, to: s.to })),
      key: q('.mp-key').checked ? { ...key } : null,
    });
    close();
  });
}

// The live camera's look: filter, brightness and background (also in its ribbon tab).
export function openCameraEffects(b) {
  document.getElementById('cam-modal')?.remove();
  const cur = () => currentSlide().blocks.find(x => x.id === b.id) || b;
  const opts = (list, v) => list.map(([k, l]) => `<option value="${k}"${k === (v || '') ? ' selected' : ''}>${t(l)}</option>`).join('');
  const back = document.createElement('div');
  back.id = 'cam-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;min-width:300px">
    <button class="modal-close">✕</button><h3>${t('Filtros y fondo')}</h3>
    <label class="fr-l">${t('Filtro')} <select class="cam-filter">${opts(CAMERA_FILTERS, b.filter)}</select></label>
    <label class="fr-l">${t('Brillo')} <span class="cam-bv">${cameraBrightness(b)}%</span> <input type="range" class="cam-bright" min="30" max="200" step="5" value="${cameraBrightness(b)}"></label>
    <label class="fr-l">${t('Fondo')} <select class="cam-bg">${opts(CAMERA_BACKGROUNDS, b.bg)}</select></label>
    <label class="fr-l cam-color-l">${t('Color del fondo')} <input type="color" class="cam-color" value="${/^#[0-9a-f]{6}$/i.test(b.bgColor || '') ? b.bgColor : DEFAULT_CAMERA_COLOR}"></label>
    <div class="fr-l cam-img-l"><button type="button" class="fr-do cam-img">${t('Cambiar imagen')}</button></div>
    <p style="opacity:.75;font-size:13px;max-width:340px">${t('El fondo se separa de la persona en el propio navegador: la imagen de la cámara no sale de tu equipo.')}</p>
    <label class="fr-l"><input type="checkbox" class="cam-live"${cameraLive() ? ' checked' : ''}> ${t('Ver la cámara en el editor')}</label>
  </div>`;
  document.body.appendChild(back);
  const $ = s => back.querySelector(s);
  const sync = () => { const v = $('.cam-bg').value; $('.cam-color-l').hidden = v !== 'color'; $('.cam-img-l').hidden = v !== 'image'; };
  sync();
  const close = () => back.remove();
  $('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  $('.cam-filter').addEventListener('change', e => setCameraLook(b.id, { filter: e.target.value }));
  $('.cam-bright').addEventListener('input', e => { $('.cam-bv').textContent = e.target.value + '%'; setCameraLook(b.id, { brightness: e.target.value }); });
  $('.cam-bg').addEventListener('change', e => { setCameraBackground(cur(), e.target.value); sync(); });
  $('.cam-color').addEventListener('input', e => setCameraLook(b.id, { bgColor: e.target.value }));
  $('.cam-img').addEventListener('click', () => pickCameraImage(cur()));
  $('.cam-live').addEventListener('change', e => setCameraLive(e.target.checked));
}
