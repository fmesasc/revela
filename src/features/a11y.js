// Accessibility checker (PowerPoint "Check Accessibility", Google Slides/OnlyOffice
// equivalents). Pure analysis of the deck model; returns a list of issues that the
// UI shows and lets the user jump to.

import { state } from '../core/store.js';

// Default text / background colour of each reveal.js theme (what the export uses
// when a text box has no explicit colour).
const THEME_FG = { black: '#ffffff', white: '#222222', league: '#eeeeee', night: '#eeeeee',
  serif: '#000000', solarized: '#657b83', moon: '#93a1a1', dracula: '#f8f8f2' };

function rgb(c) {
  c = String(c || '').trim();
  let m = c.match(/^#([0-9a-f]{3})$/i);
  if (m) return m[1].split('').map(x => parseInt(x + x, 16));
  m = c.match(/^#([0-9a-f]{6})/i);
  if (m) return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16));
  m = c.match(/^rgba?\(\s*(\d+)\D+(\d+)\D+(\d+)/i);
  return m ? [+m[1], +m[2], +m[3]] : null;
}
const lum = ([r, g, b]) => {
  const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
export function contrast(a, b) {
  const A = rgb(a), B = rgb(b); if (!A || !B) return null;
  const [l1, l2] = [lum(A), lum(B)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
const plain = html => { const d = document.createElement('div'); d.innerHTML = html || ''; return (d.textContent || '').trim(); };

// Colours actually used by the text: explicit colour runs, plus the theme colour
// if some text is left without one.
function textColours(html, themeFg) {
  const d = document.createElement('div'); d.innerHTML = html || '';
  const cols = [];
  d.querySelectorAll('[style*="color"], font[color]').forEach(el => {
    const c = el.getAttribute('color') || el.style.color;
    if (c && el.textContent.trim()) cols.push(c);
  });
  d.querySelectorAll('[style*="color"], font[color]').forEach(el => { if (el.style.color || el.getAttribute('color')) el.remove(); });
  if ((d.textContent || '').trim()) cols.push(themeFg);
  return cols;
}

// Title of a slide = its first text box (reading order = block order).
export const slideTitle = s => plain((s.blocks || []).find(b => b.type === 'text' && plain(b.html))?.html);

export function checkAccessibility(deck = state.deck) {
  const issues = [];
  const add = (kind, slide, msg, blockId = null, extra = '') => issues.push({ kind, slide, blockId, msg, extra });
  const titles = new Map();
  deck.slides.forEach((s, i) => {
    const bs = s.blocks || [];
    if (!bs.length) { add('empty', i, 'Diapositiva vacía'); return; }
    const title = slideTitle(s);
    if (!title) add('notitle', i, 'Diapositiva sin título');
    else {
      const k = title.toLowerCase();
      if (titles.has(k)) add('duptitle', i, 'Título duplicado', null, titles.get(k) + 1);
      else titles.set(k, i);
    }
    const bg = rgb(s.background) ? s.background : null;       // gradients/images: can't judge
    for (const b of bs) {
      if (b.type === 'image' && !(b.alt || '').trim()) add('alt', i, 'Imagen sin texto alternativo', b.id);
      if (b.type === 'table' && !b.header) add('tablehead', i, 'Tabla sin fila de encabezado', b.id);
      if (b.type === 'text' && bg && plain(b.html) && !b.wordart) {
        const back = b.bg && rgb(b.bg) ? b.bg : bg;
        const fg = textColours(b.html, THEME_FG[deck.theme] || '#ffffff');
        const worst = Math.min(...fg.map(c => contrast(c, back) ?? 21));
        const need = (b.fontSize || 40) >= 24 ? 3 : 4.5;          // WCAG: large text needs 3:1
        if (worst < need) add('contrast', i, 'Contraste de texto bajo', b.id, worst.toFixed(1) + ':1');
      }
    }
  });
  return issues;
}
