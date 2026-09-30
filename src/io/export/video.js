// Export the slideshow as a video (MP4, H.264 via WebCodecs) or an animated
// GIF, rendered in the browser: each visible slide is rasterised, held for its
// auto-advance time (or a default) and cross-faded into the next one.
// Object animations and 3D/video content are not rendered (still frames).

import { state } from '../../core/store.js';
import { slideImageBlob } from './images.js';
import { MP4_MUXER, GIFENC } from '../../core/vendor.js';


export const canEncodeMP4 = () => typeof window.VideoEncoder === 'function';

async function frames(deck, width, onProgress) {
  const vis = deck.slides.filter(s => !s.hidden);
  const out = [];
  for (let i = 0; i < vis.length; i++) {
    const blob = await slideImageBlob(vis[i], 'png', deck);
    const bmp = await createImageBitmap(blob);
    const h = Math.round(width * deck.size.h / deck.size.w / 2) * 2;        // even sizes for the encoder
    const c = new OffscreenCanvas(width, h); c.getContext('2d').drawImage(bmp, 0, 0, width, h);
    // (A slide with a voice-over lasts at least as long as its voice.)
    out.push({ canvas: c, hold: Math.max(vis[i].autoSlide || 0, vis[i].narration?.ms ? vis[i].narration.ms + 600 : 0), narration: vis[i].narration?.src || null });
    onProgress?.((i + 1) / vis.length / 2);
  }
  return out;
}
// Timeline: [{ canvas, ms }] including cross-fade steps between slides.
function timeline(fr, { holdMs, fadeMs, fps }) {
  const seq = [], steps = Math.max(0, Math.round(fadeMs / 1000 * fps));
  let at = 0;
  fr.forEach((f, i) => {
    f.start = at;                                             // (when its slide appears: its voice starts there)
    seq.push({ canvas: f.canvas, ms: f.hold || holdMs }); at += f.hold || holdMs;
    const next = fr[i + 1];
    if (!next || !steps) return;
    for (let k = 1; k <= steps; k++) {
      const c = new OffscreenCanvas(f.canvas.width, f.canvas.height), g = c.getContext('2d');
      g.drawImage(f.canvas, 0, 0); g.globalAlpha = k / (steps + 1); g.drawImage(next.canvas, 0, 0);
      seq.push({ canvas: c, ms: 1000 / fps }); at += 1000 / fps;
    }
  });
  return seq;
}

export async function buildMP4(deck = state.deck, { width = 1280, holdMs = 5000, fadeMs = 500, fps = 30, onProgress } = {}) {
  if (!canEncodeMP4()) throw new Error('WebCodecs');
  const { Muxer, ArrayBufferTarget } = await import(MP4_MUXER);
  const fr = await frames(deck, width, onProgress);
  const seq = timeline(fr, { holdMs, fadeMs, fps });
  const W = fr[0].canvas.width, H = fr[0].canvas.height;
  const sound = await voiceTrack(fr, seq.reduce((t, x) => t + x.ms, 0));
  const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: 'avc', width: W, height: H },
    ...(sound && { audio: { codec: sound.codec[1], numberOfChannels: sound.numberOfChannels, sampleRate: sound.sampleRate } }), fastStart: 'in-memory' });
  let failed = null;
  const enc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: e => { failed = e; } });
  const config = { codec: W * H > 1280 * 720 ? 'avc1.640028' : 'avc1.42001f', width: W, height: H, bitrate: 4e6, framerate: fps };
  if (!(await VideoEncoder.isConfigSupported(config)).supported) throw new Error('H.264');
  enc.configure(config);
  let t = 0;
  for (let i = 0; i < seq.length; i++) {
    const f = new VideoFrame(seq[i].canvas, { timestamp: t * 1000, duration: seq[i].ms * 1000 });
    enc.encode(f, { keyFrame: i === 0 || seq[i].ms >= 1000 });
    f.close(); t += seq[i].ms;
    onProgress?.(0.5 + (i + 1) / seq.length / 2);
  }
  await enc.flush(); enc.close();
  if (failed) throw failed;
  if (sound) await encodeAudio(sound, muxer);
  muxer.finalize();
  return new Blob([muxer.target.buffer], { type: 'video/mp4' });
}

// The voice-overs laid on one track at the times their slides appear (null if there are none, or the browser can't encode audio).
const RATE = 48000;
async function voiceTrack(fr, totalMs) {
  if (!fr.some(f => f.narration) || typeof window.AudioEncoder !== 'function' || typeof OfflineAudioContext !== 'function') return null;
  // AAC where the browser has it (plays everywhere); else Opus (browsers, VLC, most players).
  let codec = null;
  for (const c of [['mp4a.40.2', 'aac'], ['opus', 'opus']]) if ((await AudioEncoder.isConfigSupported({ codec: c[0], sampleRate: RATE, numberOfChannels: 2, bitrate: 128000 })).supported) { codec = c; break; }
  if (!codec) return null;
  const ctx = new OfflineAudioContext(2, Math.max(1, Math.ceil(totalMs / 1000 * RATE)), RATE);
  for (const f of fr) {
    if (!f.narration) continue;
    try {
      const buf = await ctx.decodeAudioData(await (await fetch(f.narration)).arrayBuffer());
      const src = ctx.createBufferSource(); src.buffer = buf; src.connect(ctx.destination); src.start(f.start / 1000);
    } catch { /* (an audio the browser can't read: that slide stays silent) */ }
  }
  const buf = await ctx.startRendering(); buf.codec = codec; return buf;
}
async function encodeAudio(buf, muxer) {
  let failed = null;
  const enc = new AudioEncoder({ output: (chunk, meta) => muxer.addAudioChunk(chunk, meta), error: e => { failed = e; } });
  enc.configure({ codec: buf.codec[0], sampleRate: RATE, numberOfChannels: 2, bitrate: 128000 });
  const L = buf.getChannelData(0), R = buf.numberOfChannels > 1 ? buf.getChannelData(1) : L, N = 1024;
  for (let i = 0; i < buf.length; i += N) {
    const n = Math.min(N, buf.length - i), data = new Float32Array(n * 2);
    data.set(L.subarray(i, i + n), 0); data.set(R.subarray(i, i + n), n);
    const a = new AudioData({ format: 'f32-planar', sampleRate: RATE, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(i / RATE * 1e6), data });
    enc.encode(a); a.close();
  }
  await enc.flush(); enc.close();
  if (failed) throw failed;
}

export async function buildGIF(deck = state.deck, { width = 640, holdMs = 3000, fadeMs = 400, fps = 10, onProgress } = {}) {
  const { GIFEncoder, quantize, applyPalette } = await import(GIFENC);
  const fr = await frames(deck, width, onProgress);
  const seq = timeline(fr, { holdMs, fadeMs, fps });
  const gif = GIFEncoder();
  seq.forEach((s, i) => {
    const { width: w, height: h } = s.canvas;
    const data = s.canvas.getContext('2d').getImageData(0, 0, w, h).data;
    const palette = quantize(data, 256), index = applyPalette(data, palette);
    gif.writeFrame(index, w, h, { palette, delay: Math.round(s.ms) });
    onProgress?.(0.5 + (i + 1) / seq.length / 2);
  });
  gif.finish();
  return new Blob([gif.bytes()], { type: 'image/gif' });
}
