// Block insertion and manipulation.

import { state, commit, currentSlide, selectedBlock,
  selectedBlocks, selectedIds, setSelection, setMulti } from '../core/store.js';
import { uid, textBlock, tableBlock, codeBlock } from '../core/model.js';

function insert(block) {
  commit(() => { currentSlide().blocks.push(block); setSelection(block.id); });
}

// Delete / duplicate the whole selection (one or many).
export function deleteSelected() {
  const ids = new Set(selectedIds()); if (!ids.size) return;
  commit(() => {
    const s = currentSlide();
    s.blocks = s.blocks.filter(b => !ids.has(b.id));
    setSelection(null);
  });
}
export function duplicateSelected() {
  const bs = selectedBlocks(); if (!bs.length) return;
  commit(() => {
    const s = currentSlide();
    const copies = bs.map(b => { const c = structuredClone(b); c.id = uid(); c.x += 24; c.y += 24; return c; });
    s.blocks.push(...copies);
    setMulti(copies.map(c => c.id));
  });
}

export function addText() { insert(textBlock({ html: 'Escribe aquí' })); }

export function addModel(src) {
  insert({ id: uid(), type: 'model', x: 440, y: 130, w: 400, h: 400,
    rotation: 0, animation: null, src, autoRotate: true });
}

export function addImage(src) {
  insert({ id: uid(), type: 'image', x: 340, y: 130, w: 600, h: 460,
    rotation: 0, animation: null, src, fit: 'contain' });
}

export function addVideo(src) {
  insert({ id: uid(), type: 'video', x: 300, y: 140, w: 680, h: 440,
    rotation: 0, animation: null, src });
}

export function addEmbed(url) {
  insert({ id: uid(), type: 'embed', x: 260, y: 120, w: 760, h: 480,
    rotation: 0, animation: null, src: url });
}

export function addTable() { insert(tableBlock()); }
export function addCode() { insert(codeBlock()); }

// Table row/column edits act on the selected table.
function withTable(fn) { const b = selectedBlock(); if (b && b.type === 'table') commit(() => fn(b)); }
export const tableAddRow = () => withTable(b => b.rows.push(Array(b.rows[0]?.length || 1).fill('')));
export const tableAddCol = () => withTable(b => b.rows.forEach(r => r.push('')));
export const tableDelRow = () => withTable(b => { if (b.rows.length > 1) b.rows.pop(); });
export const tableDelCol = () => withTable(b => { if ((b.rows[0]?.length || 0) > 1) b.rows.forEach(r => r.pop()); });

export function addShape(kind) {
  const linear = kind === 'line' || kind === 'arrow';
  insert({
    id: uid(), type: 'shape', shape: kind,
    x: 460, y: 250, w: linear ? 420 : 320, h: linear ? 120 : 240,
    rotation: 0, animation: null,
    fill: linear ? 'none' : '#3f6497', stroke: '#1e2a3a', strokeWidth: linear ? 6 : 2,
  });
}

export function setShapeStyle(prop, value) {
  const b = selectedBlock(); if (!b || b.type !== 'shape') return;
  commit(() => { b[prop] = value; });
}

export function deleteBlock(id = state.ui.selection) {
  if (!id) return;
  commit(() => {
    const s = currentSlide();
    s.blocks = s.blocks.filter(b => b.id !== id);
    if (state.ui.selection === id) state.ui.selection = null;
  });
}

export function bringForward() {
  const b = selectedBlock(); if (!b) return;
  commit(() => {
    const arr = currentSlide().blocks; const i = arr.indexOf(b);
    if (i < arr.length - 1) { arr.splice(i, 1); arr.splice(i + 1, 0, b); }
  });
}
export function sendBackward() {
  const b = selectedBlock(); if (!b) return;
  commit(() => {
    const arr = currentSlide().blocks; const i = arr.indexOf(b);
    if (i > 0) { arr.splice(i, 1); arr.splice(i - 1, 0, b); }
  });
}
export function bringToFront() {
  const b = selectedBlock(); if (!b) return;
  commit(() => { const arr = currentSlide().blocks; arr.splice(arr.indexOf(b), 1); arr.push(b); });
}
export function sendToBack() {
  const b = selectedBlock(); if (!b) return;
  commit(() => { const arr = currentSlide().blocks; arr.splice(arr.indexOf(b), 1); arr.unshift(b); });
}

export function duplicateBlock() {
  const b = selectedBlock(); if (!b) return;
  commit(() => {
    const copy = structuredClone(b); copy.id = uid(); copy.x += 24; copy.y += 24;
    currentSlide().blocks.push(copy); state.ui.selection = copy.id;
  });
}

// Align: with several objects selected, align them to each other (as in
// PowerPoint); with one, align it to the slide.
export function alignSelected(where) {
  const bs = selectedBlocks(); if (!bs.length) return;
  const { w, h } = state.deck.size;
  commit(() => {
    if (bs.length > 1) {
      const minX = Math.min(...bs.map(b => b.x)), maxX = Math.max(...bs.map(b => b.x + b.w));
      const minY = Math.min(...bs.map(b => b.y)), maxY = Math.max(...bs.map(b => b.y + b.h));
      const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
      for (const b of bs) {
        if (where === 'left') b.x = Math.round(minX);
        if (where === 'right') b.x = Math.round(maxX - b.w);
        if (where === 'hcenter') b.x = Math.round(cx - b.w / 2);
        if (where === 'top') b.y = Math.round(minY);
        if (where === 'bottom') b.y = Math.round(maxY - b.h);
        if (where === 'vcenter') b.y = Math.round(cy - b.h / 2);
      }
      return;
    }
    const b = bs[0];
    if (where === 'hcenter') b.x = Math.round((w - b.w) / 2);
    if (where === 'vcenter') b.y = Math.round((h - b.h) / 2);
    if (where === 'left') b.x = 40;
    if (where === 'right') b.x = w - b.w - 40;
    if (where === 'top') b.y = 40;
    if (where === 'bottom') b.y = h - b.h - 40;
  });
}

// Flip / reset rotation for the selection.
export function flipSelected(axis) {
  const bs = selectedBlocks(); if (!bs.length) return;
  commit(() => { for (const b of bs) { if (axis === 'h') b.flipH = !b.flipH; else b.flipV = !b.flipV; } });
}
export function resetRotation() {
  const bs = selectedBlocks(); if (!bs.length) return;
  commit(() => { for (const b of bs) { b.rotation = 0; b.flipH = false; b.flipV = false; } });
}

// Group the selection so they select and move together; ungroup releases them.
export function groupSelected() {
  const bs = selectedBlocks(); if (bs.length < 2) return;
  commit(() => { const g = uid(); for (const b of bs) b.groupId = g; });
}
export function ungroupSelected() {
  const bs = selectedBlocks(); if (!bs.length) return;
  commit(() => { for (const b of bs) delete b.groupId; });
}

// Distribute the selected objects evenly (needs 3+): equal gaps between centres.
export function distributeSelected(axis) {
  const bs = selectedBlocks(); if (bs.length < 3) return;
  commit(() => {
    const key = axis === 'h' ? 'x' : 'y', size = axis === 'h' ? 'w' : 'h';
    const sorted = [...bs].sort((a, b) => (a[key] + a[size] / 2) - (b[key] + b[size] / 2));
    const first = sorted[0], lastB = sorted[sorted.length - 1];
    const c0 = first[key] + first[size] / 2, cN = lastB[key] + lastB[size] / 2;
    const step = (cN - c0) / (sorted.length - 1);
    sorted.forEach((b, i) => { if (i && i < sorted.length - 1) b[key] = Math.round(c0 + step * i - b[size] / 2); });
  });
}
