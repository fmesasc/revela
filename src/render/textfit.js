// Text Art that doesn't fit its box: its letters made smaller until it does
// (lines still break between words), as "Shrink text on overflow" does for a
// text box. Text Art paints its letters with the box's background (gradients:
// background-clip: text), so what spilled out of the box was simply not seen.
// An estimate from the text (no measuring), so the editor, the thumbnails and
// every export agree. b.shrink === false keeps the size as it is.

// Width of a character, in ems, for heavy (800) letters.
// (Measured on the usual sans-serif faces, a little generous: other fonts may be wider.)
const em = ch => (ch === ' ' ? 0.3 : /[.,;:!¡'|ijlíI1]/.test(ch) ? 0.36 : /[MWmw@%]/.test(ch) ? 1 : /[A-ZÁÉÍÓÚÑÜ]/.test(ch) ? 0.78 : /[0-9]/.test(ch) ? 0.7 : 0.66);
const widthOf = (s, fs, ls) => [...s].reduce((a, ch) => a + em(ch) * fs + ls, 0);

// The paragraphs of the text (line breaks, <div>, <p>, <br>, <li>), as plain text.
export function paragraphs(html) {
  return String(html ?? '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(div|p|li|h\d)>/gi, '\n').replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .split('\n').map(x => x.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

// How many lines a paragraph takes at this size (greedy, between words; a word longer than the line counts as wrapped).
function lines(p, fs, w, ls) {
  let n = 1, cur = 0;
  for (const word of p.split(' ')) {
    const ww = widthOf(word, fs, ls), sp = widthOf(' ', fs, ls);
    if (ww > w) { n += Math.ceil(ww / w) - (cur ? 0 : 1); cur = ww % w; continue; }
    if (cur && cur + sp + ww > w) { n++; cur = ww; } else cur += (cur ? sp : 0) + ww;
  }
  return n;
}

// The size Text Art is drawn at: its own (b.fontSize), or smaller if that doesn't fit.
export function wordartSize(b) {
  const base = b.fontSize || 40;
  if (!b.wordart || b.shrink === false || b.curve || b.vertical) return base;
  const [t, r, bt, l] = Array.isArray(b.pad) ? b.pad : [6, 6, 6, 6];
  const W = (b.w || 0) - r - l - (b.indent || 0), H = (b.h || 0) - t - bt, lh = +b.lineHeight || 1.2, ls = +b.letterSpacing || 0;
  const ps = paragraphs(b.html); if (!ps.length || W <= 0 || H <= 0) return base;
  const fits = fs => ps.reduce((a, p) => a + lines(p, fs, W * 0.95, ls), 0) * fs * lh <= H;
  for (let fs = base; fs > 8; fs -= Math.max(1, Math.round(fs * 0.04))) if (fits(fs)) return fs;
  return 8;
}
