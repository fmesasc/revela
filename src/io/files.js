// Handing files to the user.

import { modelFile } from '../features/content/model3d.js';

// A file name from the presentation title.
export const slug = s => (String(s || '').trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'presentacion');

export function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// A file name from an object (its alt text or caption, before any credit).
export const fileBase = (b, fallback = 'archivo') => String(b.alt || b.caption || fallback).split(' — ')[0].replace(/[\\/:*?"<>|]+/g, '').trim().slice(0, 60) || fallback;
// An object's own file, whole: a 3D model as one .glb (textures and animations
// inside), a picture, video or sound as it was embedded.
export async function blockFile(b) {
  if (b.type === 'model') return modelFile(b);
  const blob = await (await fetch(b.src || '')).blob(), ext = (blob.type.split('/')[1] || 'bin').replace('jpeg', 'jpg').replace(/\+.*/, '');
  return { blob, name: fileBase(b, b.type) + '.' + ext };
}
