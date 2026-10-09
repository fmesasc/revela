// AutoCorrect while typing (PowerPoint/OnlyOffice "AutoCorrect options"):
// replaces common sequences with typographic symbols right after they are
// typed, inside the text node at the caret. Can be switched off.

const KEY = 'revela.autocorrect';
export const RULES = [
  ['--', '—'], ['->', '→'], ['<-', '←'], ['=>', '⇒'], ['<=', '≤'], ['>=', '≥'], ['!=', '≠'],
  ['(c)', '©'], ['(C)', '©'], ['(r)', '®'], ['(R)', '®'], ['(tm)', '™'], ['(TM)', '™'], ['...', '…'], ['+-', '±'],
  ['1/2', '½'], ['1/4', '¼'], ['3/4', '¾'],
];
export function autocorrectOn() { try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; } }
export function setAutocorrect(on) { try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch {} }

// Apply to the text right before the caret. Returns true when it replaced.
// Fractions only at a word boundary, so "11/2" or "1/25" are left alone.
export function autocorrectAtCaret(root) {
  if (!autocorrectOn()) return false;
  const sel = root.ownerDocument.getSelection();
  if (!sel || !sel.rangeCount || !sel.isCollapsed) return false;
  const node = sel.anchorNode, off = sel.anchorOffset;
  if (!node || node.nodeType !== 3 || !root.contains(node)) return false;
  const before = node.data.slice(0, off);
  for (const [from, to] of RULES) {
    if (!before.endsWith(from)) continue;
    const start = off - from.length, prev = node.data[start - 1] || '';
    if (/^\d/.test(from) && (/\d/.test(prev) || /\d/.test(node.data[off] || ''))) continue;
    if (from === '<=' && prev === '<') continue;
    node.data = node.data.slice(0, start) + to + node.data.slice(off);
    const r = root.ownerDocument.createRange(); r.setStart(node, start + to.length); r.collapse(true);
    sel.removeAllRanges(); sel.addRange(r);
    return true;
  }
  return false;
}

// ---- Automatic lists (Word, PowerPoint) -------------------------------------
// «- » or «* » typed at the start of a paragraph makes it a bulleted list, «1. » or «1) » a numbered one, with
// the same switch as the rest of AutoCorrect. Ctrl+Z right after brings back what was typed (undoAutoList).

// What is written in the caret's line before the caret (its paragraph, or since the last line break) → string or null.
export function lineBeforeCaret(root) {
  const doc = root.ownerDocument, sel = doc.getSelection();
  if (!sel?.rangeCount || !sel.isCollapsed || !root.contains(sel.anchorNode)) return null;
  const at = sel.getRangeAt(0), start = at.startContainer;
  const el = start.nodeType === 1 ? start : start.parentElement;
  const blk = el.closest('div,p,li,h1,h2,h3,h4,h5,h6,blockquote,td');
  const block = blk && blk !== root && root.contains(blk) ? blk : root;
  const r = doc.createRange(); r.setStart(block, 0); r.setEnd(at.startContainer, at.startOffset);
  const frag = r.cloneContents(), brs = frag.querySelectorAll('br');
  if (!brs.length) return frag.textContent.replace(/ /g, ' ');
  const rr = doc.createRange(); rr.setStartAfter(brs[brs.length - 1]); rr.setEnd(frag, frag.childNodes.length);
  return rr.toString().replace(/ /g, ' ');
}
const pathOf = (root, n) => { const p = []; for (; n && n !== root; n = n.parentNode) p.unshift([...n.parentNode.childNodes].indexOf(n)); return p; };
const nodeAt = (root, p) => p.reduce((n, i) => n?.childNodes[i], root);
let lastList = null;                 // { root, before (the HTML with what was typed), after, path, offset }
export function autoListAtCaret(root) {
  if (!autocorrectOn()) return false;
  const doc = root.ownerDocument, sel = doc.getSelection(), node = sel?.anchorNode, off = sel?.anchorOffset;
  if (!node || node.nodeType !== 3 || !sel.isCollapsed || !root.contains(node) || node.parentElement.closest('li,td')) return false;
  const typed = lineBeforeCaret(root), m = typed && /^(?:([-*•])|(1)[.)]) $/.exec(typed);
  if (!m || node.data.slice(0, off).replace(/ /g, ' ') !== typed) return false;     // (all of it in this text)
  const before = root.innerHTML, path = pathOf(root, node), tag = m[1] ? 'UL' : 'OL';
  // The line becomes a list item (the browser's own command, so undo and the rest of the text behave), then the
  // characters typed go. A line straight in the box, alone, the browser may not wrap: done by hand then.
  doc.execCommand(m[1] ? 'insertUnorderedList' : 'insertOrderedList');
  let li = sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement)?.closest('li');
  if (!li || !root.contains(li) || li.parentElement.tagName !== tag) {
    if (root.innerHTML !== before) root.innerHTML = before;
    if ([...root.childNodes].some(n => n.nodeType === 1 && !/^(B|I|U|S|SPAN|FONT|STRONG|EM|A|SUB|SUP)$/.test(n.tagName))) return false;   // (only that simple case)
    const list = doc.createElement(tag); li = doc.createElement('li'); li.append(...root.childNodes); list.append(li); root.append(list);
  }
  // The marker: the first characters of the item's text.
  const walk = doc.createTreeWalker(li, NodeFilter.SHOW_TEXT); let left = typed.length;
  for (let t; left > 0 && (t = walk.nextNode());) { const k = Math.min(left, t.data.length); t.data = t.data.slice(k); left -= k; }
  if (!li.textContent && !li.querySelector('br')) li.append(doc.createElement('br'));
  const r = doc.createRange(), first = doc.createTreeWalker(li, NodeFilter.SHOW_TEXT).nextNode();
  if (first && first.data) r.setStart(first, 0); else r.setStart(li, 0);
  r.collapse(true); sel.removeAllRanges(); sel.addRange(r);
  lastList = { root, before, after: root.innerHTML, path, offset: off };
  return true;
}
// Ctrl+Z right after a list was made: the text as typed, the caret after it. → whether it did.
export function undoAutoList(root) {
  const l = lastList; lastList = null;
  if (!l || l.root !== root || root.innerHTML !== l.after) return false;
  root.innerHTML = l.before;
  const n = nodeAt(root, l.path), sel = root.ownerDocument.getSelection();
  if (n) { const r = root.ownerDocument.createRange(); r.setStart(n, Math.min(l.offset, n.length ?? 0)); r.collapse(true); sel.removeAllRanges(); sel.addRange(r); }
  return true;
}
