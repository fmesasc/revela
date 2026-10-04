// The ribbon shows what the selection has (PowerPoint's): character formatting,
// colours, paragraph and box options of the selected text (several objects:
// their common value, or "mixed"), and the selected slides' transition.
// Each part redoes its work only when what it shows has changed.

import { currentSlide, selectedBlocks, targetSlides } from '../../core/store.js';
import { shortSig } from '../../core/text.js';
import { styled } from '../../features/document/master.js';
import * as trans from '../../features/animation/transitions.js';
import { MATH_SIZE, hasShapeText } from '../../render/svg.js';

export const MIXED = 'mixed';
const $ = s => document.querySelector(s);
// The value all of them share, else MIXED (undefined for none).
export const common = (list, f) => { if (!list.length) return undefined; const v = f(list[0]); return list.every(x => f(x) === v) ? v : MIXED; };
// A toggle: on, off or partly (aria-pressed="mixed", drawn dashed).
export function press(el, v) {
  if (!el) return;
  el.classList.toggle('on', v === true); el.classList.toggle('mixed', v === MIXED);
  el.setAttribute('aria-pressed', v === MIXED ? 'mixed' : String(v === true));
}
// A list or a field: its value, or blank when they differ (never while typing in it).
export function showValue(el, v) {
  if (!el || document.activeElement === el) return;
  const mixed = v === MIXED; el.classList.toggle('mixed', mixed);
  if (el.tagName === 'SELECT') { if (mixed) el.selectedIndex = -1; else if (el.value !== v) el.value = v ?? ''; }
  else { const s = mixed ? '' : String(v ?? ''); if (el.value !== s) el.value = s; el.placeholder = mixed ? '—' : ''; }
}
// A colour picker: the colour (#rrggbb), or its swatch marked as mixed.
function showColour(sel, v) {
  const inp = $(sel); if (!inp || document.activeElement === inp) return;
  inp.closest('label')?.classList.toggle('mixed', v === MIXED);
  const hex = toHex(v); if (hex && inp.value !== hex) inp.value = hex;
}
function toHex(c) {
  if (!c || c === MIXED) return null;
  if (/^#[0-9a-f]{6}$/i.test(c)) return c.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(c)) return '#' + [...c.slice(1)].map(x => x + x).join('').toLowerCase();
  const m = String(c).match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
  if (!m || (m[4] !== undefined && +m[4] === 0)) return null;
  return '#' + m.slice(1, 4).map(n => (+n).toString(16).padStart(2, '0')).join('');
}

// ---- Character formatting -------------------------------------------------
const upTo = (el, root, f) => { for (let x = el; x; x = x === root ? null : x.parentElement) if (f(x)) return true; return false; };
const cs = el => getComputedStyle(el);
const CHAR = {
  bold: el => +cs(el).fontWeight >= 600,
  italic: el => /italic|oblique/.test(cs(el).fontStyle),
  underline: (el, root) => upTo(el, root, x => cs(x).textDecorationLine.includes('underline')),
  strikeThrough: (el, root) => upTo(el, root, x => cs(x).textDecorationLine.includes('line-through')),
  superscript: (el, root) => upTo(el, root, x => cs(x).verticalAlign === 'super'),
  subscript: (el, root) => upTo(el, root, x => cs(x).verticalAlign === 'sub'),
  insertUnorderedList: (el, root) => upTo(el, root, x => x.tagName === 'UL'),
  insertOrderedList: (el, root) => upTo(el, root, x => x.tagName === 'OL'),
};
const richOf = b => document.querySelector(`#stage .block[data-id="${b.id}"] .rich`);
// The elements holding a box's text (at most 300 runs).
function runsOf(b) {
  const root = richOf(b); if (!root) return null;
  const out = [], w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n && out.length < 300; n = w.nextNode()) if (n.data.trim()) out.push(n.parentElement);
  return { root, runs: out };
}
// Whether the whole text has it (true), part of it (MIXED) or none (false).
function boxState(boxes, cmd) {
  let on = 0, all = 0;
  for (const { root, runs } of boxes) for (const el of runs) { all++; if (CHAR[cmd](el, root)) on++; }
  return !all ? false : on === all ? true : on ? MIXED : false;
}
const textish = b => b.type === 'text' || hasShapeText(b);
let charSig = '';
export function syncCharState(force = false) {
  const editing = document.activeElement?.classList?.contains('rich'), sel = selectedBlocks();
  const sig = editing ? null : shortSig([sel.map(b => ({ ...b, x: 0, y: 0, w: 0, h: 0 })), currentSlide()?.id]);
  if (!force && sig && sig === charSig && !document.querySelector('#ribbon [data-st]:not([aria-pressed])')) return;
  charSig = sig || '';
  const boxes = editing ? [] : sel.filter(textish).map(runsOf).filter(Boolean), math = sel.length === 1 && sel[0].type === 'math' ? sel[0] : null;
  for (const btn of document.querySelectorAll('#ribbon [data-fmt], #ribbon [data-list], #ribbon [data-st]')) {
    const cmd = btn.dataset.fmt || btn.dataset.list || btn.dataset.st; if (!CHAR[cmd]) continue;
    let v = false;
    if (math) v = !!math[cmd];
    else if (editing) { try { v = document.queryCommandState(cmd); } catch {} }
    else v = boxState(boxes, cmd);
    press(btn, v);
  }
  // The text colour (and the highlight under the caret).
  if (editing) {
    let fg = null, hi = null; try { fg = document.queryCommandValue('foreColor'); hi = document.queryCommandValue('backColor'); } catch {}
    showColour('[data-color]', fg); if (toHex(hi)) showColour('[data-highlight]', hi);
  } else if (math) showColour('[data-color]', math.color);
  else if (boxes.length) showColour('[data-color]', common(boxes.flatMap(x => x.runs), el => toHex(cs(el).color)));
}

// ---- Paragraph, box and drawing options of the selected objects -----------
export function syncBoxFormat() {
  const sel = selectedBlocks(), texts = sel.filter(b => b.type === 'text'), boxes = sel.filter(textish), slide = currentSlide();
  const math = sel.length === 1 && sel[0].type === 'math' ? sel[0] : null;
  showValue($('[data-font]'), texts.length ? common(texts, b => b.fontFamily || '') : '');
  showValue($('[data-size]'), texts.length ? common(texts, b => String(styled(b, slide).fontSize || 40)) : math ? String(math.fontSize || MATH_SIZE) : '');
  showValue($('[data-linespacing]'), texts.length ? common(texts, b => String(b.lineHeight || 1)) : '1');
  showValue($('[data-textstyle]'), texts.length ? common(texts, b => b.textStyle || '') : '');
  const align = math ? math.textAlign || 'center' : common(texts, b => b.textAlign || 'left');
  document.querySelectorAll('#ribbon [data-para]').forEach(x => press(x, align === x.dataset.para ? true : align === MIXED && texts.some(b => (b.textAlign || 'left') === x.dataset.para) ? MIXED : false));
  const va = common(boxes, b => b.vAlign || 'top');
  document.querySelectorAll('#ribbon [data-valign]').forEach(x => press(x, va === x.dataset.valign ? true : va === MIXED && boxes.some(b => (b.vAlign || 'top') === x.dataset.valign) ? MIXED : false));
  const flag = f => { const v = common(texts, f); return v === MIXED ? MIXED : !!v; };
  press($('#ribbon [data-dir]'), flag(b => b.dir === 'rtl'));
  press($('#ribbon [data-vertical]'), flag(b => !!b.vertical));
  // Lines and borders: the objects that have one.
  const dashKey = b => (b.type === 'shape' || b.type === 'connector' ? 'dash' : b.type === 'text' || b.type === 'math' ? 'borderDash' : null);
  const dashed = sel.filter(dashKey);
  showValue($('[data-line-dash]'), dashed.length ? common(dashed, b => b[dashKey(b)] || 'solid') : 'solid');
  // Home ▸ Drawing: the shapes' fill and border.
  const shapes = sel.filter(b => b.type === 'shape');
  if (shapes.length) {
    showColour('[data-shape-fill]', common(shapes, b => toHex(b.fill) || ''));
    showColour('[data-shape-stroke]', common(shapes, b => toHex(b.stroke) || ''));
  }
}

// ---- Transitions and the slide's background (the selected slides) --------
export function syncSlideState() {
  const ss = targetSlides().filter(Boolean); if (!ss.length) return;
  const tr = common(ss, s => s.transition || 'inherit');
  document.querySelectorAll('#ribbon [data-slide-transition]').forEach(b => {
    const k = b.dataset.slideTransition;
    press(b, tr === k ? true : tr === MIXED && ss.some(s => (s.transition || 'inherit') === k) ? MIXED : false);
  });
  const am = common(ss, s => !!s.autoAnimate);
  press($('#ribbon [data-action="toggle-autoanimate"]'), am);
  showValue($('[data-morphby]'), common(ss, s => s.morphBy || 'objects'));
  showValue($('[data-slide-trans-out]'), common(ss, s => s.transitionOut || ''));
  showValue($('[data-slide-speed]'), common(ss, s => s.transitionSpeed || ''));
  // Effect options: only those of this transition (wipe, push, split); none while they differ.
  const dsel = $('[data-slide-trans-dir]');
  if (dsel) {
    const dirs = tr === MIXED ? [] : trans.TRANSITION_DIRS[tr] || [];
    dsel.disabled = !dirs.length;
    [...dsel.options].forEach(o => (o.hidden = o.value ? !dirs.includes(o.value) : dirs.length > 0));
    showValue(dsel, dirs.length ? common(ss, s => (dirs.includes(s.transitionDir) ? s.transitionDir : dirs[0])) : '');
  }
  showValue($('[data-autoslide]'), common(ss, s => String((s.autoSlide || 0) / 1000)));
  showColour('[data-bg]', common(ss, s => toHex(s.background) || ''));
}
