// Built‑in and user templates. A template is a set of blocks applied to the
// current slide. User templates are stored locally.

import { state, commit, currentSlide } from '../../core/store.js';
import { uid } from '../../core/model.js';

const USER_KEY = 'revela.templates.v1';

export const BUILTIN = {
  title: {
    name: 'Portada',
    blocks: [
      { type: 'text', ph: 'title', x: 140, y: 280, w: 1000, h: 120, fontSize: 72, fontWeight: '700', html: '' },
      { type: 'text', ph: 'subtitle', x: 140, y: 410, w: 1000, h: 80, fontSize: 32, html: '' },
    ],
  },
  titleContent: {
    name: 'Título y contenido',
    blocks: [
      { type: 'text', ph: 'title', x: 100, y: 70, w: 1080, h: 90, fontSize: 48, fontWeight: '700', html: '' },
      { type: 'text', ph: 'body', x: 100, y: 190, w: 1080, h: 460, fontSize: 30, html: '' },
    ],
  },
  showcase3D: {
    name: 'Escaparate 3D',
    blocks: [
      { type: 'text', x: 80, y: 120, w: 520, h: 400, fontSize: 34, html: '<b>Modelo</b><br>Descripción del objeto 3D.' },
      { type: 'text', x: 700, y: 600, w: 480, h: 60, fontSize: 22, html: 'Arrastra aquí un modelo 3D' },
    ],
  },
  twoContent: {
    name: 'Dos contenidos',
    blocks: [
      { type: 'text', ph: 'title', x: 100, y: 70, w: 1080, h: 90, fontSize: 48, fontWeight: '700', html: '' },
      { type: 'text', ph: 'body', x: 100, y: 190, w: 520, h: 460, fontSize: 28, html: '' },
      { type: 'text', ph: 'body', x: 660, y: 190, w: 520, h: 460, fontSize: 28, html: '' },
    ],
  },
  sectionHeader: {
    name: 'Encabezado de sección',
    blocks: [
      { type: 'text', ph: 'title', x: 120, y: 300, w: 1040, h: 120, fontSize: 64, fontWeight: '700', textAlign: 'center', html: '' },
      { type: 'text', ph: 'subtitle', x: 120, y: 430, w: 1040, h: 60, fontSize: 28, textAlign: 'center', html: '' },
    ],
  },
  comparison: {
    name: 'Comparación',
    blocks: [
      { type: 'text', x: 100, y: 70, w: 1080, h: 80, fontSize: 44, html: '<b>Comparación</b>' },
      { type: 'text', x: 100, y: 180, w: 520, h: 60, fontSize: 30, html: '<b>Opción A</b>' },
      { type: 'text', x: 660, y: 180, w: 520, h: 60, fontSize: 30, html: '<b>Opción B</b>' },
      { type: 'text', x: 100, y: 250, w: 520, h: 400, fontSize: 26, html: '<ul><li>…</li></ul>' },
      { type: 'text', x: 660, y: 250, w: 520, h: 400, fontSize: 26, html: '<ul><li>…</li></ul>' },
    ],
  },
  blank: { name: 'En blanco', blocks: [] },
};

// Apply a layout. Like PowerPoint's "Layout", what was already written moves
// into the new placeholders (title into the title, the rest in order into the
// other placeholders) and pictures, charts, etc. are kept.
export function applyTemplate(tpl) {
  commit(() => {
    const s = currentSlide(), old = s.blocks;
    const texts = old.filter(b => b.type === 'text' && b.html && b.html.replace(/<[^>]*>/g, '').trim());
    const title = texts.find(b => b.ph === 'title') || texts[0];
    const rest = texts.filter(b => b !== title);
    // (New ids: a saved template keeps those of the slide it came from.)
    const fresh = structuredClone(tpl.blocks).map(b => Object.assign({ rotation: 0, animation: null }, b, { id: uid() }));
    for (const b of fresh) {
      if (!b.ph) continue;
      const src = b.ph === 'title' ? title : rest.shift();
      if (src) b.html = src.html;
    }
    s.blocks = [...fresh, ...old.filter(b => b.type !== 'text' && b.type !== 'connector')];
    state.ui.selection = null;
  });
}

export function userTemplates() {
  try { return JSON.parse(localStorage.getItem(USER_KEY)) || {}; } catch { return {}; }
}

export function saveCurrentAsTemplate(name) {
  const all = userTemplates();
  all[uid()] = { name, blocks: structuredClone(currentSlide().blocks) };
  localStorage.setItem(USER_KEY, JSON.stringify(all));
}
