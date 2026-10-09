// Accessibility checker (PowerPoint "Check Accessibility", Google Slides/OnlyOffice
// equivalents). Pure analysis of the deck model; returns a list of issues that the
// UI shows and lets the user jump to.

import { plainText } from '../../core/text.js';
import { state } from '../../core/store.js';
import { styled, layoutBackground } from './master.js';
import { currentPalette, deckFg } from '../design/palettes.js';


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
const plain = html => plainText(html);

// Colours actually used by the text: explicit colour runs, plus the theme colour
// if some text is left without one.
function textColours(html, themeFg) {
  const d = new DOMParser().parseFromString(html || '', 'text/html').body;       // (inert: nothing in it loads or runs)
  const cols = [];
  d.querySelectorAll('[style*="color"], font[color]').forEach(el => {
    const c = el.getAttribute('color') || el.style.color;
    if (c && el.textContent.trim()) cols.push(c);
  });
  d.querySelectorAll('[style*="color"], font[color]').forEach(el => { if (el.style.color || el.getAttribute('color')) el.remove(); });
  if ((d.textContent || '').trim()) cols.push(themeFg);
  return cols;
}

// What a text box's words are read against, and their own colour: its box's fill, else the topmost filled
// shape or box under its middle, else the slide's background (its own, its layout's or the theme's). null: a
// picture, a gradient or a video under it — it can't be judged from here.
function textBack(deck, s, b) {
  if (b.bg && rgb(b.bg)) return b.bg;
  const bs = s.blocks || [], j = bs.indexOf(b), mx = b.x + b.w / 2, my = b.y + b.h / 2;
  const below = bs.slice(0, Math.max(0, j)).reverse().find(x => !x.hidden && mx >= x.x && mx <= x.x + x.w && my >= x.y && my <= x.y + x.h
    && (['shape', 'image', 'video', 'model', 'chart', 'embed', 'camera'].includes(x.type) || (x.type === 'text' && x.bg)));
  if (below) return below.type === 'shape' && !below.fill2 && rgb(below.fill) && !(below.fillOpacity < 0.9) ? below.fill : below.type === 'text' && rgb(below.bg) ? below.bg : null;
  let bg = s.background; try { bg = bg || layoutBackground(s, deck); } catch {}
  bg = bg || currentPalette(deck).bg;
  return rgb(bg) ? bg : null;
}
// (Old presentations with a reveal.js theme and no palette: that theme's text colour.)
const THEME_FG = { black: '#ffffff', white: '#222222', league: '#eeeeee', night: '#eeeeee', serif: '#000000', solarized: '#657b83', moon: '#93a1a1', dracula: '#f8f8f2',
  beige: '#333333', sky: '#333333', simple: '#000000', blood: '#eeeeee', 'black-contrast': '#ffffff', 'white-contrast': '#000000' };
const styledOf = (deck, s, b) => { try { return styled(b, s, deck) || b; } catch { return b; } };
const textBase = (deck, s, b) => b.color || (!deck.palette && THEME_FG[deck.theme]) || styledOf(deck, s, b).color || deckFg(deck);
const textSize = (deck, s, b) => +styledOf(deck, s, b).fontSize || b.fontSize || 40;

// Objects that need a text alternative (unless marked decorative).
const NEEDS_ALT = { image: 'Imagen sin texto alternativo', chart: 'Gráfico sin texto alternativo',
  model: 'Modelo 3D sin texto alternativo', video: 'Vídeo sin texto alternativo', icon: 'Icono sin texto alternativo' };

// Accessible name of an object: its alt text, else its text, else its kind.
const KIND = { diagram: 'Diagrama', file: 'Archivo', text: 'Texto', image: 'Imagen', shape: 'Forma', chart: 'Gráfico', table: 'Tabla', icon: 'Icono', math: 'Ecuación',
  model: '3D', video: 'Vídeo', audio: 'Audio', embed: 'Web', code: 'Código', figindex: 'Índice de figuras', slideref: 'Diapositiva', magnify: 'Lupa',
  connector: 'Conector', ink: 'Tinta', camera: 'Cámara en directo', poll: 'Votación', lock: 'Candado' };
export function blockLabel(b, tr = x => x) {
  if (b.label) return b.label;                                    // (named in the selection pane)
  const txt = (b.alt || '').trim() || (b.type === 'text' ? plain(b.html).slice(0, 60) : '') || (b.type === 'code' ? (b.code || '').slice(0, 40) : '');
  return tr(KIND[b.type] || b.type) + (txt ? ': ' + txt : '');
}

// Title of a slide = its first text box (reading order = block order).
export const slideTitle = s => plain((s.blocks || []).find(b => b.type === 'text' && plain(b.html))?.html);

export function checkAccessibility(deck = state.deck) {
  const issues = [];
  const add = (kind, slide, msg, blockId = null, extra = '') => issues.push({ kind, slide, blockId, msg, extra });
  const titles = new Map();
  if (deck.autoSlide && deck.autoSlide < 5000) add('fast', 0, 'Avanza sola demasiado rápido', null, (deck.autoSlide / 1000).toLocaleString() + ' s');
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
    if (s.autoSlide && s.autoSlide < 5000 && !s.hidden) add('fast', i, 'Avanza sola demasiado rápido', null, (s.autoSlide / 1000).toLocaleString() + ' s');
    for (const b of bs) {
      if (NEEDS_ALT[b.type] && !b.decorative && !(b.alt || '').trim()) add('alt', i, NEEDS_ALT[b.type], b.id);
      if (b.type === 'table' && !b.header) add('tablehead', i, 'Tabla sin fila de encabezado', b.id);
      const back = b.type === 'text' && plain(b.html) && !b.wordart ? textBack(deck, s, b) : null;
      if (back) {
        const fg = textColours(b.html, textBase(deck, s, b));
        const worst = Math.min(...fg.map(c => contrast(c, back) ?? 21));
        const need = textSize(deck, s, b) >= 24 ? 3 : 4.5;          // WCAG: large text needs 3:1
        if (worst < need) add('contrast', i, 'Contraste de texto bajo', b.id, worst.toFixed(1) + ':1');
      }
    }
  });
  return issues;
}

// ---- Fixing low contrast ------------------------------------------------------------------
const hex = a => '#' + a.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
// The same colour, darker or lighter (towards black on light backgrounds, white on dark ones), until it reads.
export function readableColour(c, back, need = 4.5) {
  const A = rgb(c), B = rgb(back); if (!A || !B) return c;
  const to = lum(B) > 0.18 ? [0, 0, 0] : [255, 255, 255];
  for (let k = 1; k <= 20; k++) { const m = hex(A.map((v, i) => v + (to[i] - v) * k / 20)); if (contrast(m, back) >= need + 0.05) return m; }
  return hex(to);
}
// Give a text box's colours enough contrast against what's behind it. true if something changed.
export function fixContrast(deck, slideIndex, blockId) {
  const s = deck.slides[slideIndex], b = s?.blocks.find(x => x.id === blockId); if (!b || b.type !== 'text') return false;
  const back = textBack(deck, s, b); if (!back) return false;
  const need = textSize(deck, s, b) >= 24 ? 3 : 4.5;
  let changed = false;
  const d = new DOMParser().parseFromString(b.html || '', 'text/html').body;
  d.querySelectorAll('[style*="color"], font[color]').forEach(el => {
    const c = el.getAttribute('color') || el.style.color;
    if (!c || !el.textContent.trim() || (contrast(c, back) ?? 21) >= need) return;
    const n = readableColour(c, back, need);
    if (el.getAttribute('color')) el.setAttribute('color', n); else el.style.color = n;
    changed = true;
  });
  if (changed) b.html = d.innerHTML;
  const base = textBase(deck, s, b);
  if ((contrast(base, back) ?? 21) < need) { b.color = readableColour(base, back, need); changed = true; }
  return changed;
}

// ---- Style guide: things that look careless when projected ----------------------------------
// Hints, not errors: many fonts, titles of different sizes, text too small to
// read from the back of a room, too much text on a slide, objects almost (but
// not quite) aligned, objects off the slide.
const words = html => plain(html).split(/\s+/).filter(Boolean).length;
const fontsOf = b => [b.font, ...[...String(b.html || '').matchAll(/font-family:\s*([^;"]+)/gi)].map(m => m[1])].filter(Boolean)
  .map(f => f.split(',')[0].replace(/&quot;|["']/g, '').trim().toLowerCase()).filter(Boolean);
export function checkStyle(deck = state.deck) {
  const out = [], add = (kind, slide, msg, blockId = null, extra = '') => out.push({ kind, slide, blockId, msg, extra });
  const W = deck.size?.w || 1280, H = deck.size?.h || 720;
  const fonts = new Set(deck.slides.flatMap(s => s.blocks.flatMap(fontsOf)));
  if (fonts.size > 3) add('fonts', 0, 'Demasiados tipos de letra', null, [...fonts].slice(0, 6).join(', '));
  const titleSizes = new Map();
  deck.slides.forEach((s, i) => {
    const texts = s.blocks.filter(b => b.type === 'text' && plain(b.html));
    const title = texts.find(b => b.ph === 'title');
    if (title && s.layoutId !== 'title') titleSizes.set(i, title.fontSize || 40);
    const n = texts.reduce((t, b) => t + words(b.html), 0);
    if (n > 90) add('wordy', i, 'Demasiado texto en una diapositiva', null, n);
    for (const b of texts) if ((b.fontSize || 40) < 16 && !b.caption) add('small', i, 'Texto muy pequeño para proyectar', b.id, (b.fontSize || 40) + ' px');
    for (const b of s.blocks) if (!b.hidden && (b.x + b.w < 1 || b.y + b.h < 1 || b.x > W - 1 || b.y > H - 1)) add('offslide', i, 'Objeto fuera de la diapositiva', b.id);
    // Almost aligned: left edges (or centres) 1–6 px apart.
    const vis = s.blocks.filter(b => !b.hidden && b.type !== 'connector' && !b.groupId);
    const flagged = new Set();
    for (let a = 0; a < vis.length; a++) for (let c = a + 1; c < vis.length; c++) {
      const A = vis[a], C = vis[c], dl = Math.abs(A.x - C.x), dc = Math.abs(A.x + A.w / 2 - (C.x + C.w / 2));
      if (((dl >= 1 && dl <= 6) || (dc >= 1 && dc <= 6 && dl > 6)) && !flagged.has(C.id)) { flagged.add(C.id); add('nearalign', i, 'Objetos casi alineados', C.id, A.id); }
    }
  });
  const sizes = [...titleSizes.values()], common = sizes.sort((a, b) => sizes.filter(x => x === b).length - sizes.filter(x => x === a).length)[0];
  for (const [i, size] of titleSizes) if (size !== common) add('titlesize', i, 'Título de otro tamaño que los demás', deck.slides[i].blocks.find(b => b.ph === 'title')?.id, `${size} px ≠ ${common} px`);
  return out;
}
// Line an almost-aligned object up with the one it nearly matches (left edges, or centres).
export function fixAlign(deck, slideIndex, blockId, refId) {
  const bs = deck.slides[slideIndex]?.blocks || [], b = bs.find(x => x.id === blockId), r = bs.find(x => x.id === refId);
  if (!b || !r) return false;
  const dl = Math.abs(b.x - r.x);
  b.x = dl <= 6 ? r.x : Math.round(r.x + r.w / 2 - b.w / 2);
  return true;
}
