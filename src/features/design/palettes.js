// Theme colours and theme fonts (PowerPoint Design > Variants > Colors / Fonts,
// Google Slides theme colours, OnlyOffice colour schemes).
//
// A palette is a background, a text colour and six accents. Applying another
// palette recolours the deck the way the suites do: every colour that came from
// the previous palette (backgrounds, shapes, charts, icons, tables, connectors,
// box fills and coloured text) is swapped for the colour in the same role of the
// new one; colours the user picked by hand stay as they are.

import { state, commit } from '../../core/store.js';
import { FONTS, ensureFont, officeStack } from './fonts.js';
import { colorMods, COLOR_MODS } from './colormods.js';

export const PALETTES = {
  revela:    { name: 'Revela',            bg: '#101317', fg: '#ffffff', accents: ['#3f6497', '#e0873b', '#4caf7d', '#c94f4f', '#8e6cc9', '#3bb3c3'] },
  office:    { name: 'Office',            bg: '#ffffff', fg: '#1f1f1f', accents: ['#156082', '#e97132', '#196b24', '#0f9ed5', '#a02b93', '#4ea72e'] },
  ocean:     { name: 'Océano',            bg: '#0f2940', fg: '#f2f6fa', accents: ['#4a90d9', '#7fb8e6', '#f5a623', '#50e3c2', '#b8e986', '#9b6cf0'] },
  forest:    { name: 'Bosque',            bg: '#f4f8f1', fg: '#1e3320', accents: ['#2e7d32', '#66bb6a', '#8d6e63', '#fbc02d', '#0277bd', '#ad1457'] },
  warm:      { name: 'Cálido',            bg: '#2b1512', fg: '#fff4ec', accents: ['#e4572e', '#f3a712', '#a8c686', '#669bbc', '#f0c987', '#db2b39'] },
  paper:     { name: 'Papel',             bg: '#f7f1e3', fg: '#3b3228', accents: ['#b5651d', '#6b8e23', '#4682b4', '#8b3a62', '#cd853f', '#556b2f'] },
  violet:    { name: 'Violeta',           bg: '#1b1030', fg: '#f3eefe', accents: ['#9b5de5', '#f15bb5', '#fee440', '#00bbf9', '#00f5d4', '#ff8fab'] },
  midnight:  { name: 'Medianoche',        bg: '#0b0f19', fg: '#e6e9ef', accents: ['#7aa2f7', '#bb9af7', '#9ece6a', '#e0af68', '#f7768e', '#2ac3de'] },
  grayscale: { name: 'Escala de grises',  bg: '#ffffff', fg: '#000000', accents: ['#404040', '#7f7f7f', '#a5a5a5', '#262626', '#595959', '#d9d9d9'] },
};

// Heading / body font pairs, from the catalogue in fonts.js.
export const FONT_PAIRS = {
  modern:   { name: 'Moderna',   heading: 'Montserrat',       body: 'Open Sans' },
  classic:  { name: 'Clásica',   heading: 'Playfair Display', body: 'Lato' },
  editorial:{ name: 'Editorial', heading: 'Merriweather',     body: 'PT Sans' },
  clean:    { name: 'Limpia',    heading: 'Inter',            body: 'Inter' },
  tech:     { name: 'Técnica',   heading: 'Space Grotesk',    body: 'DM Sans' },
  bold:     { name: 'Impacto',   heading: 'Bebas Neue',       body: 'Roboto' },
  friendly: { name: 'Amable',    heading: 'Poppins',          body: 'Nunito' },
  websafe:  { name: 'Sin descargas', heading: 'Georgia',      body: 'Verdana' },
};

const stackOf = name => FONTS.find(f => f.name === name)?.stack || '';
export const pairStacks = key => {
  const p = FONT_PAIRS[key]; if (!p) return null;
  return { heading: stackOf(p.heading), body: stackOf(p.body) };
};

// A palette of one's own (a brand kit's colours, an imported Office theme's):
// deck.palette 'custom' and its colours in deck.customPalette (only #rrggbb
// values count: they go into styles). An Office theme's also keeps its whole
// colour scheme (dk1, lt1, dk2, lt2, accent1–6, hlink, folHlink) and which of
// them is the background and the text (its master's colour map), to write
// them back to PowerPoint as they were.
const HEX6 = /^#[0-9a-f]{6}$/i;
export const SCHEME_SLOTS = ['dk1', 'lt1', 'dk2', 'lt2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink'];
const MAP_SLOTS = ['dk1', 'lt1', 'dk2', 'lt2'];
export function customPalette(p, base = PALETTES.revela) {
  if (!p) return null;
  const ok = c => (HEX6.test(c || '') ? c.toLowerCase() : null);
  const out = { name: String(p.name || 'Personalizada').slice(0, 60), bg: ok(p.bg) || base.bg, fg: ok(p.fg) || base.fg,
    accents: base.accents.map((c, i) => ok(p.accents?.[i]) || c) };
  if (p.scheme && SCHEME_SLOTS.every(k => ok(p.scheme[k]))) {
    out.scheme = Object.fromEntries(SCHEME_SLOTS.map(k => [k, ok(p.scheme[k])]));
    const m = p.clrMap || {};
    out.clrMap = { bg1: MAP_SLOTS.includes(m.bg1) ? m.bg1 : 'lt1', tx1: MAP_SLOTS.includes(m.tx1) ? m.tx1 : 'dk1',
      bg2: MAP_SLOTS.includes(m.bg2) ? m.bg2 : 'lt2', tx2: MAP_SLOTS.includes(m.tx2) ? m.tx2 : 'dk2' };
  }
  return out;
}
export const currentPalette = (deck = state.deck) => (deck.palette === 'custom' && customPalette(deck.customPalette)) || PALETTES[deck.palette] || PALETTES.revela;
// The deck's default text colour (editor, thumbnails and every export use it).
export const deckFg = (deck = state.deck) => deck.textColor || currentPalette(deck).fg;
export const deckBodyFont = (deck = state.deck) => deck.bodyFont || '';
export const paletteColours = (deck = state.deck) => { const p = currentPalette(deck); return [p.bg, p.fg, ...p.accents]; };

const COLOUR_PROPS = ['fill', 'stroke', 'color', 'bg', 'borderColor', 'headBg', 'headFg', 'band'];
const HEX = /#[0-9a-f]{6}\b/gi;

export function applyPalette(key, deck = state.deck, custom = null) {
  if (key === 'custom' ? !customPalette(custom) : !PALETTES[key]) return;
  commit(() => swapPalette(key, deck, custom));
}
// The same change, without recording it (for a copy, or inside another commit).
// Colours made from a theme colour (an imported "Accent 1, darker 25 %":
// deck.themeTints, colour → [role, transforms]) follow it too: role 'bg', 'fg'
// or 'a0'…'a5', made again from the new palette's colour in that role.
const roleColour = (p, r) => (r === 'bg' ? p.bg : r === 'fg' ? p.fg : /^a[0-5]$/.test(r) ? p.accents[+r[1]] : null);
const cleanMods = m => (Array.isArray(m) ? m.filter(x => Array.isArray(x) && COLOR_MODS.has(x[0]) && Number.isFinite(+x[1])) : []);
export function swapPalette(key, deck, custom = null) {
  const to = key === 'custom' ? customPalette(custom) : PALETTES[key]; if (!to) return false;
  const from = currentPalette(deck);
  const map = new Map(), tints = {};
  for (const [hex, link] of Object.entries(deck.themeTints || {})) {
    if (!HEX6.test(hex) || !Array.isArray(link)) continue;
    const c = roleColour(to, link[0]), mods = cleanMods(link[1]); if (!c) continue;
    const now = colorMods(c, mods); if (!HEX6.test(now)) continue;
    map.set(hex.toLowerCase(), now); tints[now] = [link[0], mods];
  }
  // (The palette's own colours win over a tint that happens to be the same.)
  for (const [a, b] of [[from.bg, to.bg], [from.fg, to.fg], ...from.accents.map((c, i) => [c, to.accents[i]])]) map.set(a.toLowerCase(), b);
  const swap = str => String(str).replace(HEX, m => map.get(m.toLowerCase()) || m);
  const blocks = list => { for (const b of list || []) {
    for (const k of COLOUR_PROPS) if (typeof b[k] === 'string') b[k] = swap(b[k]);
    if (b.type === 'text' && b.html) b.html = swap(b.html);
  } };
  for (const s of deck.slides) { if (s.background) s.background = swap(s.background); blocks(s.blocks); }
  // The masters and layouts: their backgrounds, objects and text styles.
  for (const m of [deck.master, ...(deck.masters || []), ...(deck.layouts || [])].filter(Boolean)) {
    if (m.background) m.background = swap(m.background);
    blocks(m.blocks);
    for (const st of Object.values(m.styles || {})) {
      if (st?.color) st.color = swap(st.color);
      for (const lv of st?.levels || []) if (lv?.color) lv.color = swap(lv.color);
    }
  }
  if (deck.textColor) deck.textColor = swap(deck.textColor);
  if (deck.themeTints) deck.themeTints = tints;
  deck.palette = key;
  if (key === 'custom') deck.customPalette = to; else delete deck.customPalette;
  if (!deck.textColor || deck.textColor.toLowerCase() === to.fg.toLowerCase()) delete deck.textColor;
  return true;
}

export function setDeckTextColor(c, deck = state.deck) {
  commit(() => { if (c && c.toLowerCase() !== currentPalette(deck).fg.toLowerCase()) deck.textColor = c; else delete deck.textColor; });
}

// Heading = title/subtitle/heading styles, or big text; body = everything else.
const isHeading = b => ['title', 'subtitle', 'heading'].includes(b.textStyle) || (!b.textStyle && (b.fontSize || 40) >= 44);
// The masters' text styles follow (new slides and placeholders get the pair too).
function styleFonts(deck, st) {
  for (const m of [deck.master, ...(deck.masters || [])].filter(Boolean))
    for (const [k, s] of Object.entries(m.styles || {})) if (s) s.font = k === 'title' ? st.heading : st.body;
}
// Two fonts of the catalogue by name (a brand kit's): headings and body text.
export function applyFonts(heading, body, deck = state.deck) {
  const h = stackOf(heading), b0 = stackOf(body); if (!h && !b0) return;
  const st = { heading: h || stackOf(body), body: b0 || h };
  ensureFont(st.heading); ensureFont(st.body);
  commit(() => {
    for (const s of deck.slides) for (const b of s.blocks)
      if (b.type === 'text' && !b.wordart) b.fontFamily = isHeading(b) ? st.heading : st.body;
    delete deck.fontPair; deck.bodyFont = st.body; styleFonts(deck, st);
  });
}
// An imported theme's fonts (Office names: { name, major, minor }) as CSS stacks.
export function themeFontStacks(fonts) {
  if (!fonts) return null;
  const heading = officeStack(fonts.major), body = officeStack(fonts.minor);
  return heading || body ? { heading: heading || body, body: body || heading } : null;
}
// The deck's current heading and body fonts, as stacks (to know which to change).
function currentStacks(deck) {
  if (deck.fontPair === 'theme') return themeFontStacks(deck.officeTheme?.fonts);
  if (deck.fontPair && pairStacks(deck.fontPair)) return pairStacks(deck.fontPair);
  const t = deck.master?.styles?.title?.font, b = deck.bodyFont;
  return t || b ? { heading: t || b, body: b || t } : null;
}
// Another theme's fonts on the whole deck, the way PowerPoint changes them:
// text in the old heading font gets the new one, text in the old body font the
// new body font, fonts picked by hand stay; the masters' styles too.
export function swapThemeFonts(fonts, deck) {
  const to = themeFontStacks(fonts); if (!to) return false;
  const from = currentStacks(deck);
  const map = new Map(from ? [[from.body, to.body], [from.heading, to.heading]] : []);
  const swap = v => (map.has(v) ? map.get(v) : v);
  const unq = f => f.trim().replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  const swapHTML = h => String(h).replace(/font-family:\s*([^;"]+)/g, (m, f) => (map.has(unq(f)) ? `font-family:${map.get(unq(f))}` : m));
  const blocks = list => { for (const b of list || []) if (b.type === 'text' || b.type === 'table') {
    if (b.fontFamily) b.fontFamily = swap(b.fontFamily);
    if (b.html && map.size) b.html = swapHTML(b.html);
  } };
  for (const s of deck.slides) blocks(s.blocks);
  for (const m of [deck.master, ...(deck.masters || []), ...(deck.layouts || [])].filter(Boolean)) {
    blocks(m.blocks);
    for (const [k, st] of Object.entries(m.styles || {})) {
      if (!st) continue;
      st.font = k === 'title' ? to.heading : to.body;
      for (const lv of st.levels || []) if (lv?.font) lv.font = swap(lv.font);
    }
  }
  ensureFont(to.heading); ensureFont(to.body);
  deck.officeTheme = { ...(deck.officeTheme || {}), fonts: { name: String(fonts.name || '').slice(0, 60), major: fonts.major || '', minor: fonts.minor || '',
    ...Object.fromEntries(['majorEa', 'minorEa', 'majorCs', 'minorCs'].filter(k => fonts[k]).map(k => [k, String(fonts[k]).slice(0, 60)])) } };
  deck.fontPair = 'theme'; deck.bodyFont = to.body;
  return true;
}
export function applyThemeFonts(fonts, deck = state.deck) {
  if (!themeFontStacks(fonts)) return;
  commit(() => swapThemeFonts(fonts, deck));
}
export function applyFontPair(key, deck = state.deck) {
  if (!pairStacks(key)) return;
  commit(() => swapFontPair(key, deck));
}
// (Without recording it: for a copy, or inside another commit.)
export function swapFontPair(key, deck) {
  const st = pairStacks(key); if (!st) return false;
  ensureFont(st.heading); ensureFont(st.body);
  for (const s of deck.slides) for (const b of s.blocks)
    if (b.type === 'text' && !b.wordart) b.fontFamily = isHeading(b) ? st.heading : st.body;
  deck.fontPair = key; deck.bodyFont = st.body; styleFonts(deck, st);
  return true;
}
