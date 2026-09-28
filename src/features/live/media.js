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
