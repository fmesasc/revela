// Template gallery (PowerPoint "New", Google Slides "Template gallery",
// OnlyOffice templates): whole starter decks built from a palette, a font pair,
// master decorations and layouts with placeholders. Everything is generated
// here, so no files or network are needed.

import { emptyDeck, uid } from '../../core/model.js';
import { PALETTES, pairStacks } from './palettes.js';

const T = (ph, x, y, w, h, fontSize, extra = {}) => ({ id: uid(), type: 'text', ph, html: '', x, y, w, h, fontSize, rotation: 0, animation: null, ...extra });
const R = (x, y, w, h, fill, extra = {}) => ({ id: uid(), type: 'shape', shape: 'rect', fill, stroke: fill, strokeWidth: 0, x, y, w, h, rotation: 0, animation: null, ...extra });
const E = (x, y, w, h, fill, extra = {}) => R(x, y, w, h, fill, { shape: 'ellipse', ...extra });

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
  // More looks: gradients, sketched shapes, circles and bands.
  sunset: { name: 'Atardecer', palette: 'warm', fonts: 'friendly',
    master: p => [R(0, 600, 1280, 120, p.accents[0], { fill2: p.accents[1], gradAngle: 0 })] },
  neon: { name: 'Neón', palette: 'violet', fonts: 'tech',
    master: p => [E(-120, -120, 360, 360, p.accents[0], { opacity: 55, fill2: p.accents[1], gradType: 'radial' }), E(1080, 560, 280, 280, p.accents[4], { opacity: 40 })] },
  notebook: { name: 'Cuaderno', palette: 'paper', fonts: 'friendly',
    master: p => [R(90, 0, 3, 720, p.accents[3]), ...Array.from({ length: 11 }, (_, i) => R(0, 90 + i * 58, 1280, 1, p.accents[2], { opacity: 30 }))] },
  sketch: { name: 'Boceto', palette: 'office', fonts: 'friendly',
    master: p => [R(40, 40, 1200, 640, 'none', { stroke: p.fg, strokeWidth: 2, sketch: true }), E(1120, 60, 90, 90, p.accents[1], { sketch: true, stroke: p.fg, strokeWidth: 2 })] },
  nature: { name: 'Naturaleza', palette: 'forest', fonts: 'classic',
    master: p => [E(-160, 520, 420, 420, p.accents[1], { opacity: 45 }), E(1060, -140, 360, 360, p.accents[0], { opacity: 35 })] },
  night: { name: 'Noche', palette: 'midnight', fonts: 'clean',
    master: p => [R(0, 0, 1280, 720, 'none', { fill: p.bg, fill2: '#1b2440', gradAngle: 90, strokeWidth: 0 }), R(90, 668, 180, 6, p.accents[0])] },
  bold: { name: 'Contraste', palette: 'grayscale', fonts: 'bold',
    master: p => [R(0, 0, 56, 720, p.accents[3]), R(56, 0, 8, 720, p.accents[1])] },
  mono: { name: 'Revista', palette: 'office', fonts: 'editorial',
    master: p => [R(60, 60, 1160, 2, p.fg), R(60, 658, 1160, 2, p.fg), R(60, 60, 12, 12, p.accents[1])] },
  // More looks (a new presentation by the AI shouldn't always come out in the same few): each its own palette, font pair and decoration.
  glaciar: { name: 'Glaciar', palette: 'glaciar', fonts: 'humanist',
    master: p => [E(-200, -200, 520, 520, p.accents[0], { opacity: 14 }), R(90, 640, 260, 4, p.accents[1])] },
  citrico: { name: 'Cítrico', palette: 'citrico', fonts: 'rounded',
    master: p => [E(1100, 14, 34, 34, p.accents[0]), E(1146, 14, 34, 34, p.accents[1]), E(1192, 14, 34, 34, p.accents[2])] },
  frambuesa: { name: 'Frambuesa', palette: 'frambuesa', fonts: 'display',
    master: p => [R(0, 0, 24, 720, p.accents[0], { fill2: p.accents[1], gradAngle: 90 }), R(24, 0, 4, 720, p.accents[2])] },
  salvia: { name: 'Salvia', palette: 'salvia', fonts: 'elegant',
    master: p => [E(-120, 560, 360, 360, p.accents[0], { opacity: 25 }), E(60, 610, 240, 240, p.accents[1], { opacity: 22 })] },
  pizarra: { name: 'Pizarra', palette: 'pizarra', fonts: 'geometric',
    master: p => [R(0, 0, 1280, 36, p.accents[0]), R(1190, 664, 36, 36, p.accents[2])] },
  mostaza: { name: 'Mostaza', palette: 'mostaza', fonts: 'condensed',
    master: p => [R(1244, 0, 36, 720, p.accents[0]), E(1190, 664, 34, 34, p.accents[1])] },
  laguna: { name: 'Laguna', palette: 'laguna', fonts: 'humanist',
    master: p => [R(0, 650, 1280, 70, p.accents[0], { fill2: p.accents[1], gradAngle: 0, opacity: 85 })] },
  lavanda: { name: 'Lavanda', palette: 'lavanda', fonts: 'rounded',
    master: p => [E(920, 430, 520, 520, p.accents[0], { opacity: 14 }), E(980, 490, 400, 400, 'none', { stroke: p.accents[1], strokeWidth: 3 })] },
  grafito: { name: 'Grafito', palette: 'grafito', fonts: 'geometric',
    master: p => [R(60, 40, 64, 4, p.accents[0]), R(60, 668, 1160, 1, p.fg, { opacity: 30 }), R(1156, 662, 64, 6, p.accents[0])] },
  esmeralda: { name: 'Esmeralda', palette: 'esmeralda', fonts: 'elegant',
    master: p => [R(70, 0, 3, 720, p.accents[0]), R(82, 0, 1, 720, p.accents[0], { opacity: 60 })] },
  burdeos: { name: 'Burdeos', palette: 'burdeos', fonts: 'display',
    master: p => [R(0, 0, 1280, 10, p.accents[0], { fill2: p.accents[1], gradAngle: 0 }), E(1090, 520, 300, 300, p.accents[3], { opacity: 18 })] },
  cobalto: { name: 'Cobalto', palette: 'cobalto', fonts: 'condensed',
    master: p => [E(-180, -180, 420, 420, p.accents[0], { opacity: 90 }), R(0, 704, 1280, 16, p.accents[1])] },
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
