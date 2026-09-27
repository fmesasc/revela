// Basic PowerPoint (.pptx) import.
//
// A .pptx is an OOXML zip. This reads the slide size, the slide order and, for
// each slide, the text shapes and pictures with their positions, mapping
// EMU units (914400 per inch) onto the Revela canvas. It is intentionally
// pragmatic: it recovers text and images, not every PowerPoint effect.

import { uid } from '../core/model.js';

const EMU_PER_CANVAS_W = 1280; // slide width maps to this many px

const localName = (parent, name) => [...parent.getElementsByTagName(name)];
const parseXML = str => new DOMParser().parseFromString(str, 'application/xml');
const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp', webp: 'image/webp' };

async function loadJSZip() {
  const mod = await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm');
  return mod.default || mod;
}

function relationships(xmlStr) {
  const doc = parseXML(xmlStr);
  const map = {};
  for (const r of localName(doc, 'Relationship'))
    map[r.getAttribute('Id')] = r.getAttribute('Target');
  return map;
}

function offExt(shape) {
  const xfrm = localName(shape, 'a:xfrm')[0];
  if (!xfrm) return null;
  const off = localName(xfrm, 'a:off')[0], ext = localName(xfrm, 'a:ext')[0];
  if (!off || !ext) return null;
  return {
    x: +off.getAttribute('x'), y: +off.getAttribute('y'),
    w: +ext.getAttribute('cx'), h: +ext.getAttribute('cy'),
  };
}

function shapeText(shape) {
  const paras = localName(shape, 'a:p').map(p =>
    localName(p, 'a:t').map(t => t.textContent).join(''));
  return paras.filter(Boolean).map(t =>
    t.replace(/&/g, '&amp;').replace(/</g, '&lt;')).join('<br>');
}

export async function importPPTX(file) {
  const JSZip = await loadJSZip();
  const zip = await JSZip.loadAsync(file);

  const pres = parseXML(await zip.file('ppt/presentation.xml').async('string'));
  const sldSz = localName(pres, 'p:sldSz')[0];
  const cx = +sldSz.getAttribute('cx'), cy = +sldSz.getAttribute('cy');
  const scale = EMU_PER_CANVAS_W / cx;
  const size = { w: EMU_PER_CANVAS_W, h: Math.round(cy * scale) };

  const presRels = relationships(await zip.file('ppt/_rels/presentation.xml.rels').async('string'));
  const order = localName(pres, 'p:sldId').map(n =>
    presRels[n.getAttribute('r:id')]).filter(Boolean);

  const slides = [];
  for (const target of order) {
    const path = 'ppt/' + target.replace(/^\.\.\//, '').replace(/^\//, '');
    const slFile = zip.file(path);
    if (!slFile) continue;
    const doc = parseXML(await slFile.async('string'));

    // Per‑slide relationships (for images).
    const relPath = path.replace(/slides\/(.+)\.xml$/, 'slides/_rels/$1.xml.rels');
    const rels = zip.file(relPath) ? relationships(await zip.file(relPath).async('string')) : {};

    const blocks = [];
    // Text shapes.
    for (const sp of localName(doc, 'p:sp')) {
      const geo = offExt(sp); const html = shapeText(sp);
      if (!geo || !html) continue;
      blocks.push({ id: uid(), type: 'text', rotation: 0, animation: null,
        x: Math.round(geo.x * scale), y: Math.round(geo.y * scale),
        w: Math.round(geo.w * scale), h: Math.round(geo.h * scale),
        fontSize: 28, html });
    }
    // Pictures.
    for (const pic of localName(doc, 'p:pic')) {
      const geo = offExt(pic); const blip = localName(pic, 'a:blip')[0];
      if (!geo || !blip) continue;
      const rid = blip.getAttribute('r:embed');
      const mediaTarget = rels[rid];
      if (!mediaTarget) continue;
      const mediaPath = 'ppt/' + mediaTarget.replace(/^\.\.\//, '').replace(/^\//, '');
      const mediaFile = zip.file(mediaPath);
      if (!mediaFile) continue;
      const ext = mediaPath.split('.').pop().toLowerCase();
      const b64 = await mediaFile.async('base64');
      blocks.push({ id: uid(), type: 'image', rotation: 0, animation: null,
        x: Math.round(geo.x * scale), y: Math.round(geo.y * scale),
        w: Math.round(geo.w * scale), h: Math.round(geo.h * scale),
        fit: 'contain', src: `data:${MIME[ext] || 'image/png'};base64,${b64}` });
    }

    slides.push({ id: uid(), sectionId: null, background: '#ffffff', transition: null, blocks });
  }

  if (!slides.length) throw new Error('No se encontraron diapositivas en el archivo.');
  return { version: 3, size, theme: 'white', defaultTransition: 'slide',
    transitionSpeed: 'default', sections: [], slides };
}
