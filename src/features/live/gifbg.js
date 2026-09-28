// Background removal for animated GIFs: every frame is composed at full size,
// passed through the remover (the same AI as for photos, by default) and the
// result encoded again as a GIF with a transparent colour.

import { GIFUCT, GIFENC, BG_REMOVAL } from '../../core/vendor.js';

// Frames of a GIF as full images: [{ rgba: Uint8ClampedArray, delay }], plus the size.
export async function gifFrames(src) {
  const { parseGIF, decompressFrames } = await import(GIFUCT);
  const parsed = parseGIF(await (await fetch(src)).arrayBuffer());
  const frames = decompressFrames(parsed, true);
  const W = parsed.lsd.width, H = parsed.lsd.height;
  const work = document.createElement('canvas'); work.width = W; work.height = H;
  const g = work.getContext('2d', { willReadFrequently: true }), patch = document.createElement('canvas');
  const out = [];
  let saved = null;
  frames.forEach((f, i) => {
    const prev = frames[i - 1];
    if (prev?.disposalType === 2) g.clearRect(prev.dims.left, prev.dims.top, prev.dims.width, prev.dims.height);
    else if (prev?.disposalType === 3 && saved) g.putImageData(saved, 0, 0);
    if (f.disposalType === 3) saved = g.getImageData(0, 0, W, H);
    patch.width = f.dims.width; patch.height = f.dims.height;
    patch.getContext('2d').putImageData(new ImageData(f.patch, f.dims.width, f.dims.height), 0, 0);
    g.drawImage(patch, f.dims.left, f.dims.top);
    out.push({ rgba: g.getImageData(0, 0, W, H).data, delay: f.delay || 100 });
  });
  return { width: W, height: H, frames: out };
}

// Frames → animated GIF (data URL). Pixels more than half transparent become
// the transparent colour; GIF has no partial transparency.
export async function encodeGif({ width, height, frames }) {
  const { GIFEncoder, quantize, applyPalette } = await import(GIFENC);
  const gif = GIFEncoder();
  for (const f of frames) {
    const palette = quantize(f.rgba, 256, { format: 'rgba4444', oneBitAlpha: true, clearAlpha: true, clearAlphaThreshold: 128 });
    const index = applyPalette(f.rgba, palette, 'rgba4444');
    const ti = palette.findIndex(c => c[3] === 0);
    gif.writeFrame(index, width, height, { palette, delay: f.delay, dispose: 2, ...(ti >= 0 && { transparent: true, transparentIndex: ti }) });
  }
  gif.finish();
  const bytes = gif.bytes();
  let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return 'data:image/gif;base64,' + btoa(bin);
}

// The AI remover: an image (canvas) in, a cut-out image (Blob) out.
async function aiRemover() {
  const { removeBackground } = await import(BG_REMOVAL);
  return canvas => new Promise(res => canvas.toBlob(res, 'image/png')).then(b => removeBackground(b));
}

// remove(canvas) → Blob | canvas with the background gone; onProgress(done, total).
export async function gifRemoveBackground(src, { remove, onProgress } = {}) {
  const gif = await gifFrames(src);
  const fn = remove || await aiRemover();
  const c = document.createElement('canvas'); c.width = gif.width; c.height = gif.height;
  const cx = c.getContext('2d', { willReadFrequently: true });
  for (let i = 0; i < gif.frames.length; i++) {
    const f = gif.frames[i];
    cx.putImageData(new ImageData(new Uint8ClampedArray(f.rgba), gif.width, gif.height), 0, 0);
    let r = await fn(c);
    if (r instanceof Blob) r = await createImageBitmap(r);
    if (r !== c) { cx.clearRect(0, 0, gif.width, gif.height); cx.drawImage(r, 0, 0, gif.width, gif.height); }
    f.rgba = cx.getImageData(0, 0, gif.width, gif.height).data;
    onProgress?.(i + 1, gif.frames.length);
  }
  return encodeGif(gif);
}
