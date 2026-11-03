// HEIC / HEIF pictures (what an iPhone takes): they become JPEG on the way in, so everything else (the editor, the
// exports, the browsers that can't show them) only ever sees ordinary pictures.
// The browser's own decoder first (Safari, and Chrome / Edge with the system's HEIF codec); otherwise libheif in
// WebAssembly (core/vendor.js HEIC_TO), downloaded only then.
import { HEIC_TO } from '../../core/vendor.js';

export const isHeicFile = f => !!f && (/^image\/hei[cf]/i.test(f.type || '') || /\.(heic|heif)$/i.test(f.name || ''));
// The accept list of a picture chooser, with HEIC added when it takes any picture.
export const withHeic = accept => (/image\/\*/.test(accept) && !/heic/i.test(accept) ? accept + ',.heic,.heif,image/heic,image/heif' : accept);

const jpegName = n => String(n || 'foto').replace(/\.(heic|heif)$/i, '') + '.jpg';
async function natively(file) {
  const bmp = await createImageBitmap(file);
  try {
    const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
    c.getContext('2d').drawImage(bmp, 0, 0);
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.92));
    if (!blob) throw new Error('JPEG');
    return blob;
  } finally { bmp.close?.(); }
}
// A picture file → the same one, or, if it is HEIC, a JPEG File. (If it can't be read: the error says so.)
export async function webImage(file) {
  if (!isHeicFile(file)) return file;
  let blob;
  try { blob = await natively(file); }
  catch { blob = await (await import(/* @vite-ignore */ HEIC_TO)).heicTo({ blob: file, type: 'image/jpeg', quality: 0.92 }); }
  return new File([blob], jpegName(file.name), { type: 'image/jpeg', lastModified: file.lastModified });
}
// The same for a list (a drop): the ones that are not HEIC stay as they are. A failed one is left out; failed = [names].
export async function webImages(files) {
  const out = [], failed = [];
  for (const f of files) {
    if (!isHeicFile(f)) { out.push(f); continue; }
    try { out.push(await webImage(f)); } catch { failed.push(f.name); }
  }
  return { files: out, failed };
}
