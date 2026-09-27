// Block insertion and manipulation.

import { state, commit, currentSlide, selectedBlock } from '../core/store.js';
import { uid, textBlock } from '../core/model.js';

function insert(block) {
  commit(() => { currentSlide().blocks.push(block); state.ui.selection = block.id; });
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

export function alignSelected(where) {
  const b = selectedBlock(); if (!b) return;
  const { w, h } = state.deck.size;
  commit(() => {
    if (where === 'hcenter') b.x = Math.round((w - b.w) / 2);
    if (where === 'vcenter') b.y = Math.round((h - b.h) / 2);
    if (where === 'left') b.x = 40;
    if (where === 'right') b.x = w - b.w - 40;
    if (where === 'top') b.y = 40;
    if (where === 'bottom') b.y = h - b.h - 40;
  });
}
