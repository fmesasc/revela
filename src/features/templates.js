// Built‑in and user templates. A template is a set of blocks applied to the
// current slide. User templates are stored locally.

import { state, commit, currentSlide } from '../core/store.js';
import { uid } from '../core/model.js';

const USER_KEY = 'revela.templates.v1';

export const BUILTIN = {
  title: {
    name: 'Portada',
    blocks: [
      { type: 'text', x: 140, y: 280, w: 1000, h: 120, fontSize: 72, html: '<b>Título</b>' },
      { type: 'text', x: 140, y: 410, w: 1000, h: 80, fontSize: 32, html: 'Subtítulo' },
    ],
  },
  titleContent: {
    name: 'Título y contenido',
    blocks: [
      { type: 'text', x: 100, y: 70, w: 1080, h: 90, fontSize: 48, html: '<b>Título</b>' },
      { type: 'text', x: 100, y: 190, w: 1080, h: 460, fontSize: 30, html: '<ul><li>Punto uno</li><li>Punto dos</li></ul>' },
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
      { type: 'text', x: 100, y: 70, w: 1080, h: 90, fontSize: 48, html: '<b>Título</b>' },
      { type: 'text', x: 100, y: 190, w: 520, h: 460, fontSize: 28, html: '<ul><li>Columna A</li></ul>' },
      { type: 'text', x: 660, y: 190, w: 520, h: 460, fontSize: 28, html: '<ul><li>Columna B</li></ul>' },
    ],
  },
  sectionHeader: {
    name: 'Encabezado de sección',
    blocks: [
      { type: 'text', x: 120, y: 300, w: 1040, h: 120, fontSize: 64, textAlign: 'center', html: '<b>Sección</b>' },
      { type: 'text', x: 120, y: 430, w: 1040, h: 60, fontSize: 28, textAlign: 'center', html: 'Descripción' },
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

export function applyTemplate(tpl) {
  commit(() => {
    currentSlide().blocks = structuredClone(tpl.blocks).map(b =>
      Object.assign({ id: uid(), rotation: 0, animation: null }, b));
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
