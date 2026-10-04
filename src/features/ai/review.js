// Reviewing a proposal before applying it: what each change takes away from what is
// there (shown, never lost silently), «Conservar lo que había» (merge instead of
// replace: the original first and the new points not already in it; a deletion
// not done; notes appended) and the user's own version of a proposed text, notes
// or picture description. Pure: the panel (ui/dialogs/assistant.js) keeps the state
// and applies the resulting operations in one undo step.

import { state } from '../../core/store.js';
import { plain } from './openrouter.js';
import { textOf, toHTML, touchesContent } from './agent.js';
import { isEmptyPlaceholder } from '../document/master.js';
import { isNative } from './authoring.js';
import { cleanHTML } from '../document/sanitize.js';

const find = (o, deck) => { const s = o.sid ? deck.slides.find(x => x.id === o.sid) : null; return { s, b: s && o.id ? s.blocks.find(x => x.id === o.id) : null }; };
// A line compared loosely: no bullet or number, case, punctuation or spacing.
export const norm = l => String(l || '').toLowerCase().replace(/^\s*(?:[-•*]|\d{1,2}[.)])\s+/, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const linesOf = t => String(t || '').split('\n').map(l => l.replace(/\s+$/, '')).filter(l => l.trim());
const objText = b => (!b ? '' : b.type === 'text' || b.html ? textOf(b.html) : b.type === 'table' ? (b.rows || []).map(r => r.map(c => plain(c || '')).join(' | ')).join('\n')
  : b.type === 'chart' ? (b.data || []).map(d => `${d.label} ${d.value}`).join(', ') : b.type === 'math' ? String(b.latex || '') : b.type === 'code' ? String(b.code || '') : b.alt || '');
// (A slide made again keeps its pictures, equations, code, charts…: only the rest is replaced.)
const slideText = (s, remade = false) => s.blocks.filter(b => !isEmptyPlaceholder(b) && !b.decorative && !(remade && isNative(b))).map(objText).filter(Boolean).join('\n');
const opText = o => (o.html != null ? textOf(o.html) : o.text != null ? textOf(toHTML(o.text)) : '');

// Longest common subsequence of two lists → matching index pairs [[i, j]…].
function lcs(A, B, eq = (x, y) => x === y) {
  const L = Array.from({ length: A.length + 1 }, () => new Uint16Array(B.length + 1));
  for (let i = A.length - 1; i >= 0; i--) for (let j = B.length - 1; j >= 0; j--) L[i][j] = eq(A[i], B[j]) ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = [];
  for (let i = 0, j = 0; i < A.length && j < B.length;) {
    if (eq(A[i], B[j])) out.push([i++, j++]); else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++;
  }
  return out;
}
const words = l => l.split(/\s+/).filter(Boolean);
// One line changed, word by word — or null when the two have too little in common to read so.
function lineDiff(a, b) {
  const A = words(a), B = words(b);
  if (A.length * B.length > 40000) return null;
  const m = lcs(A, B);
  if (m.length < 0.5 * Math.max(A.length, B.length)) return null;
  const out = []; let i = 0, j = 0;
  for (const [x, y] of [...m, [A.length, B.length]]) {
    while (i < x) out.push({ t: A[i++], k: 'del' });
    while (j < y) out.push({ t: B[j++], k: 'ins' });
    if (x < A.length) { out.push({ t: A[i++], k: 'same' }); j++; }
  }
  return out;
}
// What goes and comes between two texts: lines matched loosely, and a line that changed
// word by word → [{ t, k: 'same' | 'del' | 'ins' }], '\n' between lines.
export function diffWords(a, b) {
  const lines = s => String(s || '').split('\n').filter(l => l.trim()), A = lines(a), B = lines(b), out = [];
  const nl = () => { if (out.length) out.push({ t: '\n', k: 'same' }); };
  const line = (l, k) => { nl(); out.push(...words(l).map(t => ({ t, k }))); };
  const anchors = A.length * B.length > 250000 ? [] : lcs(A, B, (x, y) => norm(x) === norm(y));
  let i = 0, j = 0;
  for (const [x, y] of [...anchors, [A.length, B.length]]) {
    // (Between two matching lines: old and new paired up while they look alike.)
    while (i < x || j < y) {
      const d = i < x && j < y ? lineDiff(A[i], B[j]) : null;
      if (d) { nl(); out.push(...d); i++; j++; } else if (i < x) line(A[i++], 'del'); else line(B[j++], 'ins');
    }
    if (x < A.length) { line(A[i++], 'same'); j++; }
  }
  return out;
}
const removesWords = (a, b) => diffWords(a, b).some(x => x.k === 'del' && x.t !== '\n' && norm(x.t));

// What a change takes away from what is there now: null, or
// { kind: 'remove' | 'replace', what: 'text' | 'notes' | 'object' | 'slide' | 'table' | 'chart' | 'alt', before, after } (plain text).
export function lossOf(o, deck = state.deck) {
  if (!o || !touchesContent(o, deck)) return null;
  const { s, b } = find(o, deck);
  switch (o.op) {
    case 'set_text': { const before = textOf(b.html), after = opText(o);
      return removesWords(before, after) ? { kind: after.trim() ? 'replace' : 'remove', what: 'text', before, after } : null; }
    case 'set_notes': { const before = String(s.notes || ''), after = String(o.notes || '');
      return removesWords(before, after) ? { kind: after.trim() ? 'replace' : 'remove', what: 'notes', before, after } : null; }
    case 'delete_object': return { kind: 'remove', what: 'object', before: objText(b), after: '' };
    case 'set_props': return { kind: 'replace', what: 'alt', before: String(b.alt || ''), after: String(o.props.alt || '') };
    case 'set_table': return { kind: 'replace', what: 'table', before: objText(b), after: o.rows.map(r => r.map(c => plain(c || '')).join(' | ')).join('\n') };
    case 'set_chart_data': return { kind: 'replace', what: 'chart', before: objText(b), after: o.data.map(d => `${d.label} ${d.value}`).join(', ') };
    case 'set_code': return { kind: 'replace', what: 'code', before: String(b.code || ''), after: o.code };
    case 'set_math': return { kind: 'replace', what: 'math', before: String(b.latex || ''), after: o.latex };
    case 'replace_slide': return { kind: 'replace', what: 'slide', before: slideText(s, true), after: [o.spec.title, ...(o.spec.bullets || o.spec.points || [])].filter(x => typeof x === 'string').join('\n') };
    case 'delete_slide': return { kind: 'remove', what: 'slide', before: slideText(s), after: '' };
  }
  return null;
}
// Whether «Conservar lo que había» means something for this change.
export const keepable = (o, deck = state.deck) => !!lossOf(o, deck);

// Two lists one after the other become one.
const joinHTML = (a, b) => (/<\/ul>\s*$/i.test(a) && /^\s*<ul>/i.test(b) ? a.replace(/<\/ul>\s*$/i, '') + b.replace(/^\s*<ul>/i, '')
  : /<\/ol>\s*$/i.test(a) && /^\s*<ol>/i.test(b) ? a.replace(/<\/ol>\s*$/i, '') + b.replace(/^\s*<ol>/i, '') : a + b);
// «Conservar lo que había»: the change made to keep what is there — or null (then nothing to apply).
// Text: the original as it is (formatting too) and the new lines not already in it; a title (one
// line) stays as it was. Notes: appended. A deletion, a table, a chart, a description: not done.
// A remade slide: the new one added after it instead.
export function keepOp(o, deck = state.deck) {
  if (!keepable(o, deck)) return o;
  const { s, b } = find(o, deck);
  switch (o.op) {
    case 'set_text': {
      if (/title/i.test(b.ph || '')) return null;
      const had = new Set(linesOf(textOf(b.html)).map(norm)), seen = new Set();
      const add = linesOf(o.html != null ? textOf(o.html) : o.text).filter(l => { const k = norm(l); if (!k || had.has(k) || seen.has(k)) return false; seen.add(k); return true; });
      if (!add.length) return null;
      const html = joinHTML(b.html || '', toHTML(add.join('\n')));
      return { ...o, html, text: textOf(html), kept: true };
    }
    case 'set_notes': {
      const old = String(s.notes || '').trim(), had = new Set(linesOf(old).map(norm));
      const add = linesOf(o.notes).filter(l => !had.has(norm(l)));
      return add.length ? { ...o, notes: `${old}\n\n${add.join('\n')}`, kept: true } : null;
    }
    case 'set_props': { const { alt, ...rest } = o.props; return Object.keys(rest).length ? { ...o, props: rest, kept: true } : null; }
    case 'replace_slide': {
      const t = o.fromText && s.blocks.find(x => x.ph === 'title' && x.type === 'text');
      return { op: 'add_slide', ok: true, after: o.slide, afterId: o.sid, spec: t ? { ...o.spec, title: textOf(t.html) } : o.spec, newId: o.sid + '-k', ...(o.style && { style: o.style }), kept: true };
    }
  }
  return null;
}

// Which proposed texts the user can rewrite: { field: 'html' | 'notes' | 'alt', value } or null.
export function editable(o) {
  if (!o) return null;
  if (o.op === 'set_text') return { field: 'html', value: o.html != null ? o.html : toHTML(o.text) };
  if (o.op === 'add_object' && o.object.type === 'text') return { field: 'html', value: o.object.html };
  if (o.op === 'set_notes') return { field: 'notes', value: o.notes };
  if (o.op === 'set_props' && 'alt' in o.props) return { field: 'alt', value: o.props.alt };
  return null;
}
// The change with the user's version: edit { html } | { notes } | { alt }.
export function editOp(o, edit) {
  if (!o || !edit) return o;
  if (o.op === 'set_text' && edit.html != null) { const html = cleanHTML(edit.html); return { ...o, html, text: textOf(html), edited: true }; }
  if (o.op === 'add_object' && edit.html != null) return { ...o, object: { ...o.object, html: cleanHTML(edit.html) }, edited: true };
  if (o.op === 'set_notes' && edit.notes != null) return { ...o, notes: String(edit.notes).slice(0, 8000), edited: true };
  if (o.op === 'set_props' && edit.alt != null) return { ...o, props: { ...o.props, alt: String(edit.alt).slice(0, 250) }, edited: true };
  return o;
}
// What gets applied for one change: kept and/or edited by the user (null: nothing).
export function effectiveOp(o, { keep = false, edit = null } = {}, deck = state.deck) {
  const k = keep ? keepOp(o, deck) : o;
  return edit ? editOp(k || o, edit) : k;
}

// «Proteger mi contenido»: for each change, whether it starts ticked and kept. Deleting something
// the author made starts unticked; replacing it starts as «conservar + añadir».
export function protectDefaults(ops, deck = state.deck) {
  return ops.map(o => { const l = lossOf(o, deck); return !l ? { on: true, keep: false } : o.op === 'delete_object' || o.op === 'delete_slide' ? { on: false, keep: false } : { on: true, keep: true }; });
}
// Whether a change removes a picture, equation, code block, chart, table, diagram or 3D model:
// such a change always starts unticked (the user ticks it if that is what they asked for).
export function removesNative(o, deck = state.deck) {
  if (o?.op !== 'delete_object') return false;
  const { b } = find(o, deck);
  return isNative(b);
}
