// Object clipboard: copy / cut / paste the selection (one or many objects,
// keeping connectors and groups between them), across slides, and across tabs
// through localStorage. Ctrl+C / Ctrl+X / Ctrl+V, the Home ribbon and the
// context menu (long-press on touch screens) all use it.
// Copying also puts a marked JSON on the system clipboard so a paste in
// another Revela tab works too.

import { cleanValue } from './sanitize.js';
import { state, commit, currentSlide, selectedBlocks, setMulti } from '../../core/store.js';
import { uid } from '../../core/model.js';

const KEY = 'revela.clipboard.v1', MARK = 'revela-objects:';
let mem = null;

export function copySelected() {
  const bs = selectedBlocks(); if (!bs.length) return 0;
  const ids = new Set(bs.map(b => b.id));
  // Include connectors whose two ends are copied.
  const conns = currentSlide().blocks.filter(b => b.type === 'connector' && ids.has(b.from) && ids.has(b.to) && !ids.has(b.id));
  mem = { from: currentSlide().id, blocks: structuredClone([...bs, ...conns]) };
  try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch {}
  try { navigator.clipboard?.writeText?.(MARK + JSON.stringify(mem)).catch(() => {}); } catch {}
  commit(() => {}, { history: false });                 // refresh the UI (Paste becomes available)
  return bs.length;
}
export function cutSelected() {
  const n = copySelected(); if (!n) return 0;
  const ids = new Set(mem.blocks.map(b => b.id));
  commit(() => {
    const s = currentSlide();
    s.blocks = s.blocks.filter(b => !ids.has(b.id) && !(b.type === 'connector' && (ids.has(b.from) || ids.has(b.to))));
    state.ui.selection = null; state.ui.multi = [];
  });
  return n;
}
// (What another tab copied is read once, not at every redraw; a copy made there tells us.)
let stored;
export function clipboardData() {
  if (mem) return mem;
  if (stored === undefined) { try { stored = JSON.parse(localStorage.getItem(KEY)) || null; } catch { stored = null; } }
  return stored;
}
if (typeof window !== 'undefined') window.addEventListener('storage', e => { if (e.key === KEY) stored = undefined; });
// Whether system-clipboard data is the same copy we hold (keep its paste offset).
export const isCurrent = d => !!(mem && d?.blocks?.[0]?.id === mem.blocks[0]?.id);
export const hasClipboard = () => !!clipboardData()?.blocks?.length;
// Text from the system clipboard that came from a Revela copy.
export function fromSystemText(text) {
  if (!String(text || '').startsWith(MARK)) return null;
  try { const d = JSON.parse(text.slice(MARK.length)); return d?.blocks?.length ? d : null; } catch { return null; }
}

export function paste(data = clipboardData()) {
  if (!data?.blocks?.length) return 0;
  cleanValue(data.blocks);                                    // (it may come from any site, through the system clipboard)
  const s = currentSlide(), idMap = new Map(), groups = new Map();
  const copies = structuredClone(data.blocks);
  copies.forEach(b => { const n = uid(); idMap.set(b.id, n); b.id = n; });
  // Same slide: offset so the copy doesn't hide the original (again on each paste).
  const same = data.from === s.id, off = same ? 24 * (1 + (data.pasted || 0)) : 0;
  for (const b of copies) {
    if (b.type === 'connector') { b.from = idMap.get(b.from) || b.from; b.to = idMap.get(b.to) || b.to; }
    else { b.x += off; b.y += off; }
    if (b.groupId) { if (!groups.has(b.groupId)) groups.set(b.groupId, uid()); b.groupId = groups.get(b.groupId); }
    if (b.type === 'poll') b.pollId = uid();                  // a pasted poll starts with no votes
  }
  commit(() => { s.blocks.push(...copies); setMulti(copies.filter(b => b.type !== 'connector').map(b => b.id)); });
  if (same) { data.pasted = (data.pasted || 0) + 1; if (data === mem) try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch {} }
  return copies.length;
}
