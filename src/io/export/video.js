// Export the slideshow as a video (MP4, H.264 via WebCodecs) or an animated
// GIF, rendered in the browser: each visible slide is rasterised, held for its
// auto-advance time (or a default) and cross-faded into the next one.
// Object animations and 3D/video content are not rendered (still frames).

import { state } from '../../core/store.js';
import { slideImageBlob } from '../formats/html.js';

const MP4 = 'https://cdn.jsdelivr.net/npm/mp4-muxer@5.1.3/+esm';
const GIF = 'https://cdn.jsdelivr.net/npm/gifenc@1.0.3/+esm';

export const canEncodeMP4 = () => typeof window.VideoEncoder === 'function';

async function frames(deck, width, onProgress) {
  const vis = deck.slides.filter(s => !s.hidden);
  const out = [];
  for (let i = 0; i < vis.length; i++) {
    const blob = await slideImageBlob(vis[i], 'png', deck);
    const bmp = await createImageBitmap(blob);
    const h = Math.round(width * deck.size.h / deck.size.w / 2) * 2;        // even sizes for the encoder
    const c = new OffscreenCanvas(width, h); c.getContext('2d').drawImage(bmp, 0, 0, width, h);
    out.push({ canvas: c, hold: vis[i].autoSlide || 0 });
    onProgress?.((i + 1) / vis.length / 2);
  }
  return out;
}
// Timeline: [{ canvas, ms }] including cross-fade steps between slides.
function timeline(fr, { holdMs, fadeMs, fps }) {
  const seq = [], steps = Math.max(0, Math.round(fadeMs / 1000 * fps));
  fr.forEach((f, i) => {
    seq.push({ canvas: f.canvas, ms: f.hold || holdMs });
    const next = fr[i + 1];
    if (!next || !steps) return;
    for (let k = 1; k <= steps; k++) {
      const c = new OffscreenCanvas(f.canvas.width, f.canvas.height), g = c.getContext('2d');
      g.drawImage(f.canvas, 0, 0); g.globalAlpha = k / (steps + 1); g.drawImage(next.canvas, 0, 0);
      seq.push({ canvas: c, ms: 1000 / fps });
    }
  });
  return seq;
}

export async function buildMP4(deck = state.deck, { width = 1280, holdMs = 5000, fadeMs = 500, fps = 30, onProgress } = {}) {
  if (!canEncodeMP4()) throw new Error('WebCodecs');
  const { Muxer, ArrayBufferTarget } = await import(MP4);
  const fr = await frames(deck, width, onProgress);
  const seq = timeline(fr, { holdMs, fadeMs, fps });
  const W = fr[0].canvas.width, H = fr[0].canvas.height;
  const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: 'avc', width: W, height: H }, fastStart: 'in-memory' });
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
  muxer.finalize();
  return new Blob([muxer.target.buffer], { type: 'video/mp4' });
}

export async function buildGIF(deck = state.deck, { width = 640, holdMs = 3000, fadeMs = 400, fps = 10, onProgress } = {}) {
  const { GIFEncoder, quantize, applyPalette } = await import(GIF);
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
