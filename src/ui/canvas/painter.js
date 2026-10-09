// The format painter as a mode, as in PowerPoint and Canva: one click on «Copiar formato» copies the selected
// object's look and arms the brush for one target; a double click keeps it armed for as many as wanted, until
// Esc or the button again. Clicking an object gives it the look (features/document/format.js pasteStyle, which
// «Pegar formato» still uses); while editing text, the text then selected with the mouse takes the characters'
// look (bold, italic, underline, strikethrough, colour, font, size). Same pattern as the animation painter
// (ribbon/actions.js anim-paint): a body class for the cursor, a click on the stage applies it.
import { commit, selectedBlock, currentSlide, setSelection, subscribe, docEpoch } from '../../core/store.js';
import * as format from '../../features/document/format.js';
import { styled } from '../../features/document/master.js';

let brush = null;                  // { sticky, at (when armed: a second click soon after is a double click), run, epoch }
export const painting = () => !!brush;
export const painterSticky = () => !!brush?.sticky;
const BUTTONS = '[data-action="copy-style"],[data-ctx="copy-style"]';
const DOUBLE = 500;                // ms between the two clicks of a double click

const editingRich = () => { const a = document.activeElement; return a?.isContentEditable && a.classList.contains('rich') && a.closest('#stage .block') ? a : null; };
// The characters' look where the text is selected (or the caret is).
function runAtSelection() {
  const sel = getSelection(), n = sel.anchorNode, el = n && (n.nodeType === 1 ? n : n.parentElement); if (!el) return null;
  const q = c => { try { return document.queryCommandState(c); } catch { return null; } }, cs = getComputedStyle(el);
  return { bold: q('bold'), italic: q('italic'), underline: q('underline'), strike: q('strikeThrough'),
    color: cs.color, font: cs.fontFamily, size: Math.round(parseFloat(cs.fontSize) || 0) || null };
}
// A whole object's (not editing): its box's.
function runOfBlock(b) {
  const s = styled(b, currentSlide()); if (!(b.type === 'text' || b.type === 'shape')) return null;
  return { bold: +(s.fontWeight || 400) >= 600, italic: s.fontStyle === 'italic', underline: false, strike: false,
    color: s.color || null, font: s.fontFamily || null, size: s.fontSize || null };
}

function reflect() {
  document.body.classList.toggle('format-painting', !!brush);
  document.body.classList.toggle('format-painting-sticky', !!brush?.sticky);
  document.querySelectorAll(BUTTONS).forEach(x => { x.classList.toggle('on', !!brush); x.setAttribute('aria-pressed', String(!!brush)); });
}
export function endPainter() { if (!brush) return; brush = null; reflect(); }

// «Copiar formato» clicked: arm (one target), make it stay (the second click of a double click), or put it away.
export function togglePainter() {
  const now = Date.now();
  if (brush) {
    if (!brush.sticky && now - brush.at < DOUBLE) { brush.sticky = true; reflect(); return true; }
    endPainter(); return false;
  }
  const b = selectedBlock(); if (!b) return false;
  format.copyStyle();
  brush = { sticky: false, at: now, run: editingRich() ? runAtSelection() : runOfBlock(b), epoch: docEpoch() };
  reflect(); return true;
}
// Painting a whole object (the clicked one).
export function paintObject(id) {
  if (!brush || !currentSlide()?.blocks.some(x => x.id === id)) return;
  commit(() => setSelection(id), { history: false });
  format.pasteStyle();
  if (!brush.sticky) endPainter();
}
// The text selected in the box being edited takes the copied characters' look.
export function paintRun(rich = editingRich()) {
  const run = brush?.run, sel = getSelection(); if (!run || !rich || !sel.rangeCount || sel.isCollapsed || !rich.contains(sel.anchorNode)) return false;
  const b = currentSlide()?.blocks.find(x => x.id === rich.closest('.block')?.dataset.id); if (!b) return false;
  const q = c => { try { return document.queryCommandState(c); } catch { return null; } };
  for (const [k, cmd] of [['bold', 'bold'], ['italic', 'italic'], ['underline', 'underline'], ['strike', 'strikeThrough']])
    if (run[k] != null && q(cmd) !== run[k]) document.execCommand(cmd);
  const now = runAtSelection() || {};                    // (only what differs: no needless tags around the text)
  if (run.color && run.color !== now.color) document.execCommand('foreColor', false, run.color);
  if (run.font && run.font !== now.font) document.execCommand('fontName', false, run.font);
  if (run.size && run.size !== now.size) {                    // (execCommand only knows sizes 1-7: the largest, then made the size wanted)
    document.execCommand('fontSize', false, '7');
    rich.querySelectorAll('font[size="7"]').forEach(f => { f.removeAttribute('size'); f.style.fontSize = run.size + 'px'; });
  }
  commit(() => { b.html = rich.innerHTML; }, { history: false });   // (the typing's undo step, on leaving the text)
  if (!brush.sticky) endPainter();
  return true;
}

export function initPainter() {
  const stage = document.getElementById('stage'); if (!stage) return;
  // The button keeps the text being edited (and its selection) when clicked.
  document.addEventListener('mousedown', e => { if (e.target.closest?.(BUTTONS) && editingRich()) e.preventDefault(); }, true);
  // Text selected with the mouse while the brush is armed: painted on release.
  document.addEventListener('mouseup', e => { const r = editingRich(); if (brush && r && r.contains(e.target)) setTimeout(() => paintRun(r)); });
  stage.addEventListener('click', e => {
    if (!brush || e.target.closest('.rich[contenteditable="true"]')) return;   // (selecting text: on release)
    const el = e.target.closest('.block');
    if (el?.dataset.id) paintObject(el.dataset.id);
    else if (!brush.sticky) endPainter();                                        // (a click on nothing puts it away)
  });
  document.addEventListener('keydown', e => { if (brush && e.key === 'Escape') { e.stopPropagation(); endPainter(); } }, true);
  // Another presentation, or the buttons drawn again (the object's tab): as it is.
  subscribe(() => { if (brush && brush.epoch !== docEpoch()) endPainter(); else if (brush) reflect(); });
}
