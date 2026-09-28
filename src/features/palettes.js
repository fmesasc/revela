// Theme colours and theme fonts (PowerPoint Design > Variants > Colors / Fonts,
// Google Slides theme colours, OnlyOffice colour schemes).
//
// A palette is a background, a text colour and six accents. Applying another
// palette recolours the deck the way the suites do: every colour that came from
// the previous palette (backgrounds, shapes, charts, icons, tables, connectors,
// box fills and coloured text) is swapped for the colour in the same role of the
// new one; colours the user picked by hand stay as they are.

import { state, commit } from '../core/store.js';
import { FONTS, ensureFont } from './fonts.js';

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

export const currentPalette = (deck = state.deck) => PALETTES[deck.palette] || PALETTES.revela;
// The deck's default text colour (editor, thumbnails and every export use it).
export const deckFg = (deck = state.deck) => deck.textColor || currentPalette(deck).fg;
export const deckBodyFont = (deck = state.deck) => deck.bodyFont || '';
export const paletteColours = (deck = state.deck) => { const p = currentPalette(deck); return [p.bg, p.fg, ...p.accents]; };

const COLOUR_PROPS = ['fill', 'stroke', 'color', 'bg', 'borderColor'];
const HEX = /#[0-9a-f]{6}\b/gi;

export function applyPalette(key, deck = state.deck) {
  const to = PALETTES[key]; if (!to) return;
  const from = currentPalette(deck);
  const map = new Map([[from.bg, to.bg], [from.fg, to.fg], ...from.accents.map((c, i) => [c, to.accents[i]])]
    .map(([a, b]) => [a.toLowerCase(), b]));
  const swap = str => String(str).replace(HEX, m => map.get(m.toLowerCase()) || m);
  commit(() => {
    for (const s of deck.slides) {
      if (s.background) s.background = swap(s.background);
      for (const b of s.blocks) {
        for (const k of COLOUR_PROPS) if (typeof b[k] === 'string') b[k] = swap(b[k]);
        if (b.type === 'text' && b.html) b.html = swap(b.html);
      }
    }
    if (deck.textColor) deck.textColor = swap(deck.textColor);
    deck.palette = key;
    if (!deck.textColor || deck.textColor.toLowerCase() === to.fg.toLowerCase()) delete deck.textColor;
  });
}

export function setDeckTextColor(c, deck = state.deck) {
  commit(() => { if (c && c.toLowerCase() !== currentPalette(deck).fg.toLowerCase()) deck.textColor = c; else delete deck.textColor; });
}

// Heading = title/subtitle/heading styles, or big text; body = everything else.
const isHeading = b => ['title', 'subtitle', 'heading'].includes(b.textStyle) || (!b.textStyle && (b.fontSize || 40) >= 44);
export function applyFontPair(key, deck = state.deck) {
  const st = pairStacks(key); if (!st) return;
  ensureFont(st.heading); ensureFont(st.body);
  commit(() => {
    for (const s of deck.slides) for (const b of s.blocks)
      if (b.type === 'text' && !b.wordart) b.fontFamily = isHeading(b) ? st.heading : st.body;
    deck.fontPair = key; deck.bodyFont = st.body;
  });
}
