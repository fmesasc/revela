// Template gallery (PowerPoint "New", Google Slides "Template gallery",
// OnlyOffice templates): whole starter decks built from a palette, a font pair,
// master decorations and layouts with placeholders. Everything is generated
// here, so no files or network are needed.

import { emptyDeck, uid } from '../../core/model.js';
import { PALETTES, pairStacks } from './palettes.js';

const T = (ph, x, y, w, h, fontSize, extra = {}) => ({ id: uid(), type: 'text', ph, html: '', x, y, w, h, fontSize, rotation: 0, animation: null, ...extra });
const R = (x, y, w, h, fill, extra = {}) => ({ id: uid(), type: 'shape', shape: 'rect', fill, stroke: fill, strokeWidth: 0, x, y, w, h, rotation: 0, animation: null, ...extra });

// Slide skeletons shared by the templates (placeholders only, no sample text).
const layouts = (hs, bs) => [
  { name: 'Portada', blocks: () => [T('title', 120, 250, 1040, 130, 72, { fontFamily: hs, fontWeight: '700' }), T('subtitle', 120, 390, 1040, 70, 30, { fontFamily: bs })] },
  { name: 'Título y contenido', blocks: () => [T('title', 90, 60, 1100, 90, 46, { fontFamily: hs, fontWeight: '700' }), T('body', 90, 175, 1100, 460, 28, { fontFamily: bs })] },
  { name: 'Dos contenidos', blocks: () => [T('title', 90, 60, 1100, 90, 46, { fontFamily: hs, fontWeight: '700' }), T('body', 90, 175, 530, 460, 26, { fontFamily: bs }), T('body', 660, 175, 530, 460, 26, { fontFamily: bs })] },
  { name: 'Encabezado de sección', blocks: () => [T('title', 120, 290, 1040, 120, 60, { fontFamily: hs, fontWeight: '700', textAlign: 'center' }), T('subtitle', 120, 420, 1040, 60, 26, { fontFamily: bs, textAlign: 'center' })] },
  { name: 'Cierre', blocks: () => [T('title', 120, 300, 1040, 120, 64, { fontFamily: hs, fontWeight: '700', textAlign: 'center' })] },
];

export const GALLERY = {
  corporate: { name: 'Corporativa', palette: 'office', fonts: 'modern',
    master: p => [R(0, 0, 1280, 14, p.accents[0]), R(0, 700, 1280, 20, p.accents[0])] },
  academic: { name: 'Académica', palette: 'paper', fonts: 'editorial',
    master: p => [R(60, 150, 1160, 3, p.accents[0])] },
  minimal: { name: 'Minimalista', palette: 'grayscale', fonts: 'clean', master: () => [] },
  tech: { name: 'Tecnológica', palette: 'midnight', fonts: 'tech',
    master: p => [R(0, 0, 10, 720, p.accents[0]), R(1180, 650, 60, 6, p.accents[1]), R(1250, 650, 6, 6, p.accents[2])] },
  education: { name: 'Educativa', palette: 'forest', fonts: 'friendly',
    master: p => [{ id: uid(), type: 'shape', shape: 'ellipse', fill: p.accents[3], stroke: p.accents[3], strokeWidth: 0, x: 1150, y: -60, w: 200, h: 200, rotation: 0, animation: null, decorative: true }] },
  pitch: { name: 'Pitch', palette: 'violet', fonts: 'bold',
    master: p => [R(0, 690, 1280, 30, p.accents[0]), R(0, 690, 420, 30, p.accents[1])] },
  warm: { name: 'Cálida', palette: 'warm', fonts: 'classic',
    master: p => [R(40, 40, 1200, 640, 'none', { stroke: p.accents[1], strokeWidth: 2 })] },
  ocean: { name: 'Océano', palette: 'ocean', fonts: 'modern',
    master: p => [R(0, 0, 1280, 120, p.accents[0], { opacity: 35 })] },
};

// Build a complete deck from a gallery entry.
export function buildFromGallery(key) {
  const g = GALLERY[key]; if (!g) return null;
  const p = PALETTES[g.palette], st = pairStacks(g.fonts);
  const deck = emptyDeck();
  deck.name = 'Presentación sin título';
  deck.palette = g.palette; deck.fontPair = g.fonts; deck.bodyFont = st.body;
  deck.master = { id: 'master', background: null, blocks: g.master(p).map(b => ({ ...b, decorative: true })) };
  deck.slides = layouts(st.heading, st.body).map(l => ({
    id: uid(), background: p.bg, blocks: l.blocks(), sectionId: null, transition: null, hidden: false, notes: '', autoSlide: 0,
  }));
  return deck;
}
