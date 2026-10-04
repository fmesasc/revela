// Recording and live camera, all in the browser (nothing is uploaded):
// - Screen recording / camera recording (PowerPoint "Screen Recording",
//   "Record video") → a video object on the slide.
// - Cameo: a live camera feed placed on the slide, shown while presenting.
// - Record the slideshow (with narration) → a .webm file.

import { commit, currentSlide, setSelection } from '../../core/store.js';
import { uid } from '../../core/model.js';

export const canRecord = () => typeof window.MediaRecorder === 'function' && !!navigator.mediaDevices;

const pickMime = () => ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
  .find(m => window.MediaRecorder?.isTypeSupported?.(m)) || '';

// Mix the tracks of several streams: one video track + all audio mixed down.
function mix(video, ...audioStreams) {
  const tracks = [...video.getVideoTracks()];
  const withAudio = audioStreams.filter(s => s && s.getAudioTracks().length);
  if (withAudio.length === 1) tracks.push(...withAudio[0].getAudioTracks());
  else if (withAudio.length > 1) {
    const ac = new AudioContext(), dest = ac.createMediaStreamDestination();
    for (const s of withAudio) ac.createMediaStreamSource(s).connect(dest);
    tracks.push(...dest.stream.getAudioTracks());
  }
  return new MediaStream(tracks);
}

// Start a recording. Returns { stream, stop(): Promise<Blob>, cancel() }.
export async function startRecording(kind = 'camera', { audio = true } = {}) {
  if (!canRecord()) throw new Error('MediaRecorder');
  const md = navigator.mediaDevices;
  const sources = [];
  let stream;
  if (kind === 'screen' || kind === 'tab') {
    const scr = await md.getDisplayMedia({ video: true, audio: true, preferCurrentTab: kind === 'tab', selfBrowserSurface: 'include' });
    sources.push(scr);
    let mic = null;
    if (audio) { try { mic = await md.getUserMedia({ audio: true }); sources.push(mic); } catch {} }
    stream = mix(scr, scr, mic);
  } else {
    const cam = await md.getUserMedia({ video: true, audio });
    sources.push(cam); stream = cam;
  }
  const chunks = [], rec = new MediaRecorder(stream, pickMime() ? { mimeType: pickMime() } : undefined);
  rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  rec.start(250);
  const release = () => sources.forEach(s => s.getTracks().forEach(tr => tr.stop()));
  // If the user stops sharing from the browser's own bar, finish too.
  const ended = new Promise(res => stream.getVideoTracks()[0]?.addEventListener('ended', res));
  return {
    stream, ended,
    stop: () => new Promise(res => {
      if (rec.state === 'inactive') { release(); return res(new Blob(chunks, { type: rec.mimeType || 'video/webm' })); }
      rec.onstop = () => { release(); res(new Blob(chunks, { type: rec.mimeType || 'video/webm' })); };
      rec.stop();
    }),
    cancel: () => { try { rec.stop(); } catch {} release(); },
  };
}

export const blobToDataURL = blob => new Promise((res, rej) => {
  const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob);
});

// Cameo: live camera object. `shape` rounds it (circle / rounded / rect).
export function addCamera(shape = 'circle') {
  const b = { id: uid(), type: 'camera', shape, mirror: true, x: 960, y: 420, w: 260, h: 260, rotation: 0, animation: null };
  commit(() => { currentSlide().blocks.push(b); setSelection(b.id); });
  return b;
}
export const cameraRadius = b => (b.shape === 'circle' ? '50%' : b.shape === 'rounded' ? '14%' : '0');

// Its look: a colour filter, the brightness and the background behind the
// person (blurred, removed so the slide shows through, a colour or a picture).
// The background needs the person segmenter (io/runtime/camera.js); a filter alone doesn't.
export const CAMERA_FILTERS = [['', 'Sin filtro'], ['bw', 'Blanco y negro'], ['sepia', 'Sepia'], ['warm', 'Cálido'], ['cool', 'Frío'],
  ['contrast', 'Alto contraste'], ['vivid', 'Colores intensos'], ['faded', 'Desvaído'], ['soft', 'Desenfoque suave']];
export const CAMERA_BACKGROUNDS = [['', 'Normal'], ['blur', 'Desenfocar fondo'], ['remove', 'Quitar fondo'], ['color', 'Fondo de color'], ['image', 'Imagen de fondo']];
const FILTER_CSS = { bw: 'grayscale(1) contrast(1.1)', sepia: 'sepia(.8)', warm: 'url(#rv-cam-warm)', cool: 'url(#rv-cam-cool)',
  contrast: 'contrast(1.5) saturate(1.15)', vivid: 'saturate(1.7) contrast(1.05)', faded: 'contrast(.82) saturate(.55) brightness(1.08)', soft: 'blur(1.5px) brightness(1.04)' };
// Warm and cool tint the colours (a colour matrix: CSS has no such filter).
const MATRIX = { warm: '1.1 0 0 0 .04 0 1.02 0 0 .01 0 0 .82 0 0 0 0 0 1 0', cool: '.88 0 0 0 0 0 .98 0 0 .02 0 0 1.12 0 .06 0 0 0 1 0' };
export const DEFAULT_CAMERA_COLOR = '#1e3a5f';
export const cameraBrightness = b => Math.max(30, Math.min(200, Math.round(+b.brightness || 100)));
export const cameraFilterCSS = b => [FILTER_CSS[b.filter], cameraBrightness(b) !== 100 && `brightness(${cameraBrightness(b) / 100})`].filter(Boolean).join(' ');
// What the segmenter does: 'blur' (the background, blurred) or 'cut' (only the person; behind, the box's own background).
export const cameraSegment = b => (b.bg === 'blur' ? 'blur' : ['remove', 'color', 'image'].includes(b.bg) ? 'cut' : '');
const cssURL = u => String(u).replace(/['"\\()\s<>&]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'));
// The box: its shape and what is behind the person.
export function cameraBoxCSS(b) {
  const bg = b.bg === 'remove' ? 'transparent' : b.bg === 'color' ? (/^#[0-9a-f]{3,8}$/i.test(b.bgColor || '') ? b.bgColor : DEFAULT_CAMERA_COLOR)
    : b.bg === 'image' && b.bgImage ? `#223 url('${cssURL(b.bgImage)}') center/cover no-repeat` : '#223';
  return `border-radius:${cameraRadius(b)};overflow:hidden;background:${bg};`;
}
// Inside the box: the video, and the canvas the segmenter draws on (at the box's size).
export function cameraInnerHTML(b) {
  const fx = cameraFilterCSS(b), seg = cameraSegment(b);
  const st = `position:absolute;left:0;top:0;width:100%;height:100%;margin:0;object-fit:cover;pointer-events:none;${fx ? `filter:${fx};` : ''}${b.mirror !== false ? 'transform:scaleX(-1);' : ''}`;
  return (MATRIX[b.filter] ? `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="rv-cam-${b.filter}" color-interpolation-filters="sRGB"><feColorMatrix values="${MATRIX[b.filter]}"/></filter></svg>` : '')
    + `<video data-camera autoplay muted playsinline data-ignore style="${st}${seg ? 'opacity:0;' : ''}"></video>`
    + (seg ? `<canvas width="${Math.max(1, Math.round(b.w))}" height="${Math.max(1, Math.round(b.h))}" style="${st}visibility:hidden"></canvas>` : '');
}
export const cameraSig = b => JSON.stringify([b.shape, b.mirror !== false, b.filter || '', cameraBrightness(b), b.bg || '', b.bgColor || '',
  b.bgImage ? b.bgImage.length + b.bgImage.slice(-24) : '']);
// Change its look; an empty value goes back to the default.
export function setCameraLook(id, props) {
  commit(() => {
    const b = currentSlide().blocks.find(x => x.id === id); if (!b || b.type !== 'camera') return;
    for (const [k, v] of Object.entries(props)) {
      if (k === 'brightness') { const n = cameraBrightness({ brightness: v }); if (n === 100) delete b.brightness; else b.brightness = n; }
      else if (v == null || v === '' || (k === 'filter' && !FILTER_CSS[v]) || (k === 'bg' && !cameraSegment({ bg: v }))) delete b[k];
      else b[k] = v;
    }
  });
}

// ---- Video and GIF playback ------------------------------------------------------
// A video or an animated GIF can play in segments (each click of the
// presentation plays the next: from second X to second Y), start by itself
// when the slide appears, loop, be muted, and have a colour made transparent
// (chroma key). Those need the media player (io/runtime/media.js).
export const isGif = b => b?.type === 'image' && /^data:image\/gif|\.gif(\?|$)/i.test(b.src || '');
export const mediaKind = b => (b?.type === 'video' ? 'video' : isGif(b) ? 'gif' : null);
export const needsPlayer = b => !!(mediaKind(b) && (b.segments?.length || b.key?.color || b.autoplay || b.loop || b.muted));
export const mediaConfig = b => ({ kind: mediaKind(b), src: b.src, fit: b.fit || 'contain', segments: (b.segments || []).filter(s => s.to > s.from),
  autoplay: !!b.autoplay, loop: !!b.loop, muted: !!b.muted, ...(b.key?.color && { key: b.key }) });
export function setMediaPlayback(id, props) {
  commit(() => {
    const b = currentSlide().blocks.find(x => x.id === id); if (!b) return;
    for (const [k, v] of Object.entries(props)) { if (v === null || v === undefined || v === false || (Array.isArray(v) && !v.length)) delete b[k]; else b[k] = v; }
  });
}
