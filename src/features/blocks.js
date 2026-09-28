// Block insertion and manipulation.

import { state, commit, currentSlide, selectedBlock,
  selectedBlocks, selectedIds, setSelection, setMulti } from '../core/store.js';
import { uid, textBlock, tableBlock, codeBlock, chartBlock } from '../core/model.js';

function insert(block) {
  commit(() => { currentSlide().blocks.push(block); setSelection(block.id); });
}

// Delete / duplicate the whole selection (one or many).
export function deleteSelected() {
  const ids = new Set(selectedIds()); if (!ids.size) return;
  commit(() => {
    const s = currentSlide();
    s.blocks = s.blocks.filter(b => !ids.has(b.id));
    // Drop connectors whose endpoints no longer exist.
    const alive = new Set(s.blocks.map(b => b.id));
    s.blocks = s.blocks.filter(b => b.type !== 'connector' || (alive.has(b.from) && alive.has(b.to)));
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

export function addAudio(src) {
  insert({ id: uid(), type: 'audio', x: 320, y: 320, w: 440, h: 56, rotation: 0, animation: null, src });
}

export function addEmbed(url) {
  insert({ id: uid(), type: 'embed', x: 260, y: 120, w: 760, h: 480,
    rotation: 0, animation: null, src: url });
}

export function setAlt(text) {
  const b = selectedBlock(); if (!b) return;
  commit(() => { b.alt = text; });
}

// Fill / border for a text box (also used by diagrams).
export function setBoxStyle(props) {
  const b = selectedBlock(); if (!b || b.type !== 'text') return;
  commit(() => Object.assign(b, props));
}

// SmartArt‑lite: a row of boxes (process, with arrows) or a column (list).
export function addDiagram(kind = 'process') {
  const { w, h } = state.deck.size;
  commit(() => {
    const s = currentSlide();
    const n = 3, box = (x, y, bw, bh, i) => ({
      id: uid(), type: 'text', x, y, w: bw, h: bh, rotation: 0, animation: null,
      fontSize: 26, textAlign: 'center', html: `Paso ${i + 1}`,
      bg: '#3f6497', borderColor: '#1e2a3a', radius: 10,
    });
    const ids = [];
    if (kind === 'cycle') {
      const bw = 220, bh = 100, R = Math.min(w, h) * 0.32, cx = w / 2, cy = h / 2;
      for (let i = 0; i < n; i++) {
        const ang = -Math.PI / 2 + i * 2 * Math.PI / n;
        const b = box(cx + R * Math.cos(ang) - bw / 2, cy + R * Math.sin(ang) - bh / 2, bw, bh, i);
        s.blocks.push(b); ids.push(b.id);
      }
      for (let i = 0; i < n; i++)
        s.blocks.push({ id: uid(), type: 'connector', from: ids[i], to: ids[(i + 1) % n], color: '#8a8a8a', arrow: true, x: 0, y: 0, w, h, rotation: 0, animation: null });
    } else if (kind === 'list') {
      const bw = 640, bh = 90, gap = 24, totalH = n * bh + (n - 1) * gap;
      let y = (h - totalH) / 2;
      for (let i = 0; i < n; i++) { const b = box((w - bw) / 2, y, bw, bh, i); s.blocks.push(b); ids.push(b.id); y += bh + gap; }
    } else {
      const bw = 280, bh = 130, gap = 70, totalW = n * bw + (n - 1) * gap;
      const x0 = (w - totalW) / 2, y = (h - bh) / 2;
      for (let i = 0; i < n; i++) { const b = box(x0 + i * (bw + gap), y, bw, bh, i); s.blocks.push(b); ids.push(b.id); }
      for (let i = 0; i < n - 1; i++)
        s.blocks.push({ id: uid(), type: 'connector', from: ids[i], to: ids[i + 1], color: '#8a8a8a', arrow: true, x: 0, y: 0, w, h, rotation: 0, animation: null });
    }
    setSelection(null);
  });
}

export function addTable() { insert(tableBlock()); }
export function addCode() { insert(codeBlock()); }
export function setCode(props) {
  const b = selectedBlock(); if (!b || b.type !== 'code') return;
  commit(() => Object.assign(b, props));
}
export function addChart() { insert(chartBlock()); }
export function addIcon(name) {
  insert({ id: uid(), type: 'icon', icon: name, color: '#ffffff', x: 560, y: 280, w: 160, h: 160, rotation: 0, animation: null });
}
export function setIconColor(color) {
  const b = selectedBlock(); if (!b || b.type !== 'icon') return;
  commit(() => { b.color = color; }, { history: false });
}

// Connect the two selected blocks with a line/arrow that follows them.
export function addConnector() {
  const bs = selectedBlocks().filter(b => b.type !== 'connector');
  if (bs.length !== 2) return;
  const { w, h } = state.deck.size;
  commit(() => {
    const c = { id: uid(), type: 'connector', from: bs[0].id, to: bs[1].id, color: '#8a8a8a', arrow: true,
      x: 0, y: 0, w, h, rotation: 0, animation: null };
    currentSlide().blocks.push(c); setSelection(c.id);
  });
}
export function setChart(props) {
  const b = selectedBlock(); if (!b || b.type !== 'chart') return;
  commit(() => Object.assign(b, props));
}

// Table row/column edits act on the selected table.
function withTable(fn) { const b = selectedBlock(); if (b && b.type === 'table') commit(() => fn(b)); }
export const tableAddRow = () => withTable(b => b.rows.push(Array(b.rows[0]?.length || 1).fill('')));
export const tableAddCol = () => withTable(b => b.rows.forEach(r => r.push('')));
export const tableDelRow = () => withTable(b => { if (b.rows.length > 1) b.rows.pop(); });
export const tableDelCol = () => withTable(b => { if ((b.rows[0]?.length || 0) > 1) b.rows.forEach(r => r.pop()); });
export const tableToggleHeader = () => withTable(b => { b.header = !b.header; });

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

const DEF_ADJ = { brightness: 100, contrast: 100, saturate: 100, opacity: 100 };
export function setImageAdj(prop, value) {
  const b = selectedBlock(); if (!b || b.type !== 'image') return;
  commit(() => { b.adj = Object.assign({ ...DEF_ADJ }, b.adj); b.adj[prop] = +value; }, { history: false });
}
export function resetImageAdj() {
  const b = selectedBlock(); if (!b || b.type !== 'image') return;
  commit(() => { delete b.adj; });
}

const DEF_CROP = { top: 0, right: 0, bottom: 0, left: 0 };
export function setImageCrop(side, value) {
  const b = selectedBlock(); if (!b || b.type !== 'image') return;
  commit(() => { b.crop = Object.assign({ ...DEF_CROP }, b.crop); b.crop[side] = +value; }, { history: false });
}
export function resetImageCrop() {
  const b = selectedBlock(); if (!b || b.type !== 'image') return;
  commit(() => { delete b.crop; });
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
  const bs = selectedBlocks().filter(b => b.type !== 'connector'); if (!bs.length) return;
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

// Lock prevents moving/resizing/rotating (still selectable).
export function toggleLock() {
  const bs = selectedBlocks(); if (!bs.length) return;
  const lock = !bs.every(b => b.locked);
  commit(() => { for (const b of bs) b.locked = lock; });
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
  const bs = selectedBlocks().filter(b => b.type !== 'connector'); if (bs.length < 3) return;
  commit(() => {
    const key = axis === 'h' ? 'x' : 'y', size = axis === 'h' ? 'w' : 'h';
    const sorted = [...bs].sort((a, b) => (a[key] + a[size] / 2) - (b[key] + b[size] / 2));
    const first = sorted[0], lastB = sorted[sorted.length - 1];
    const c0 = first[key] + first[size] / 2, cN = lastB[key] + lastB[size] / 2;
    const step = (cN - c0) / (sorted.length - 1);
    sorted.forEach((b, i) => { if (i && i < sorted.length - 1) b[key] = Math.round(c0 + step * i - b[size] / 2); });
  });
}
