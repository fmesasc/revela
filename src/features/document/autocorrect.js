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
