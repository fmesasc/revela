// Recording UI: a floating bar with a timer and Stop while recording the
// screen, the camera, or the whole slideshow.

import { startRecording, blobToDataURL, canRecord } from '../../features/live/media.js';
import { addVideo } from '../../features/document/blocks.js';
import { present } from './present.js';
import { state } from '../../core/store.js';
import { alertDialog } from '../dialogs/dialog.js';
import { t } from '../../i18n/index.js';

let active = null;

function bar(label, onStop, onCancel) {
  const el = document.createElement('div'); el.id = 'rec-bar';
  el.innerHTML = `<span class="rec-dot"></span><span class="rec-label"></span><span class="rec-time">0:00</span>`
    + `<button type="button" class="rec-stop">■ ${t('Detener')}</button><button type="button" class="rec-cancel" title="${t('Cancelar')}">✕</button>`;
  el.querySelector('.rec-label').textContent = label;
  const t0 = Date.now(), tick = setInterval(() => {
    const s = Math.round((Date.now() - t0) / 1000); el.querySelector('.rec-time').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }, 500);
  const done = () => { clearInterval(tick); el.remove(); };
  el.querySelector('.rec-stop').addEventListener('click', () => { done(); onStop(); });
  el.querySelector('.rec-cancel').addEventListener('click', () => { done(); onCancel(); });
  document.body.appendChild(el);
  return done;
}

const fail = e => alertDialog(t('No se pudo grabar: ') + (e?.message || e));

// Screen or camera → a video object on the current slide.
export async function recordToSlide(kind) {
  if (active) return;
  if (!canRecord()) return fail(new Error(t('el navegador no permite grabar')));
  let rec;
  try { rec = await startRecording(kind, { audio: true }); } catch (e) { if (e?.name !== 'NotAllowedError') fail(e); return; }
  active = rec;
  const finish = async () => {
    const blob = await rec.stop(); active = null;
    if (blob.size) addVideo(await blobToDataURL(blob));
  };
  const hide = bar(kind === 'camera' ? t('Grabando cámara') : t('Grabando pantalla'), finish, () => { rec.cancel(); active = null; });
  rec.ended.then(() => { if (active === rec) { hide(); finish(); } });
}

// Record the slideshow (this tab, with the microphone as narration) to a file.
export async function recordSlideshow() {
  if (active) return;
  if (!canRecord()) return fail(new Error(t('el navegador no permite grabar')));
  let rec;
  try { rec = await startRecording('tab', { audio: true }); } catch (e) { if (e?.name !== 'NotAllowedError') fail(e); return; }
  active = rec;
  const save = async () => {
    if (active !== rec) return; active = null;
    const blob = await rec.stop(); if (!blob.size) return;
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = (state.deck.name || 'presentacion').replace(/[^\p{L}\p{N}]+/gu, '-') + '.webm'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  present({ fullscreen: false, onEnd: save });
  rec.ended.then(save);
}
