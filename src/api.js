// Public scripting API (window.Revela), used by plugins and macros — the
// counterpart of the Office/OnlyOffice/Google Slides add-on APIs, kept small
// and stable. Everything goes through the same store as the editor, so undo,
// autosave and rendering keep working.
//
//   Revela.deck()                         → the current deck (read only copy)
//   Revela.slides.add() / .goTo(i) / .count()
//   Revela.add.text(html, box?) / .shape(kind, box?) / .image(src, box?)
//   Revela.selection() / Revela.select(id)
//   Revela.update(id, props)              → change an object (one undo step)
//   Revela.on('change', fn) → unsubscribe
//   Revela.export.html() / .pptx() / .odp() / .pdf()
//   Revela.ui.addButton({ id, label, icon, title, onClick })   (ribbon "Complementos")
//
// Plugins are ES modules (by URL) exporting `default function (Revela) {…}`.
// Macros are snippets run with `Revela` in scope. Both are stored only in this
// browser and only run when the user adds them.

import { state, commit, subscribe, currentSlide, setSelection } from './core/store.js';
import * as blocks from './features/blocks.js';
import * as slides from './features/slides.js';
import * as io from './io/reveal.js';
import { buildPptxBlob } from './io/pptx-export.js';
import { buildODP } from './io/odp.js';

const find = id => { for (const s of [state.deck.master, ...state.deck.slides]) { const b = s?.blocks.find(x => x.id === id); if (b) return b; } return null; };
const last = () => currentSlide().blocks.at(-1);
const placed = (b, box) => { if (b && box) commit(() => Object.assign(b, box)); return b?.id ?? null; };

const buttons = new Map();
function renderButtons() {
  const row = document.getElementById('plugin-buttons'); if (!row) return;
  row.closest('.group').hidden = !buttons.size;
  row.innerHTML = '';
  for (const b of buttons.values()) {
    const el = document.createElement('button'); el.type = 'button'; el.className = 'lg'; el.dataset.plugin = b.id;
    el.title = b.title || b.label; el.innerHTML = `<i class="ms">${b.icon || 'extension'}</i><span></span>`;
    el.querySelector('span').textContent = b.label;
    el.addEventListener('click', () => { try { b.onClick(Revela); } catch (e) { console.error(e); } });
    row.appendChild(el);
  }
}

export const Revela = Object.freeze({
  version: 1,
  deck: () => structuredClone(state.deck),
  slides: Object.freeze({
    add: () => { slides.addSlide(); return state.ui.slideIndex; },
    goTo: i => slides.goToSlide(i),
    count: () => state.deck.slides.length,
    current: () => state.ui.slideIndex,
  }),
  add: Object.freeze({
    text: (html, box) => { blocks.addText(html); return placed(last(), box); },
    shape: (kind = 'rect', box) => { blocks.addShape(kind); return placed(last(), box); },
    image: (src, box) => { blocks.addImage(src); return placed(last(), box); },
  }),
  selection: () => (state.ui.multi?.length ? [...state.ui.multi] : state.ui.selection ? [state.ui.selection] : []),
  select: id => commit(() => setSelection(id), { history: false }),
  get: id => { const b = find(id); return b ? structuredClone(b) : null; },
  update: (id, props) => { const b = find(id); if (b) commit(() => Object.assign(b, props)); return !!b; },
  remove: id => { const s = currentSlide(); commit(() => { s.blocks = s.blocks.filter(b => b.id !== id); }); },
  on: (ev, fn) => (ev === 'change' ? subscribe(() => fn(Revela)) : () => {}),
  export: Object.freeze({ html: () => io.buildHTML(), pptx: () => buildPptxBlob(), odp: () => buildODP(), pdf: () => io.exportPDF() }),
  ui: Object.freeze({
    addButton: b => { if (!b?.id || typeof b.onClick !== 'function') throw new Error('addButton({ id, label, onClick })'); buttons.set(b.id, b); renderButtons(); },
    removeButton: id => { buttons.delete(id); renderButtons(); },
  }),
});

// ---- Plugins & macros (stored locally) ------------------------------------
const PKEY = 'revela.plugins.v1', MKEY = 'revela.macros.v1';
const load = k => { try { return JSON.parse(localStorage.getItem(k)) || []; } catch { return []; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
export const pluginList = () => load(PKEY);
export const macroList = () => load(MKEY);

export async function runPlugin(url) {
  const mod = await import(/* @vite-ignore */ url);
  if (typeof mod.default !== 'function') throw new Error('El complemento debe exportar una función por defecto');
  await mod.default(Revela);
}
export async function addPlugin(url) {
  await runPlugin(url);                                   // only kept if it loads
  const list = pluginList().filter(u => u !== url); list.push(url); save(PKEY, list);
}
export const removePlugin = url => save(PKEY, pluginList().filter(u => u !== url));
export async function loadPlugins() {
  for (const url of pluginList()) { try { await runPlugin(url); } catch (e) { console.warn('Complemento no cargado:', url, e); } }
}

export function runMacro(code) {
  // eslint-disable-next-line no-new-func
  return new Function('Revela', `"use strict"; return (async () => { ${code}\n })();`)(Revela);
}
export function saveMacro(name, code) {
  const list = macroList().filter(m => m.name !== name); list.push({ name, code }); save(MKEY, list);
}
export const deleteMacro = name => save(MKEY, macroList().filter(m => m.name !== name));
