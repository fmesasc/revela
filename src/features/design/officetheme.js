// Office themes (PowerPoint's Design ▸ Themes): the colours, fonts, masters and
// layouts of a presentation, a template (.potx) or a theme file (.thmx),
// detected when importing (io/formats/pptx-import.js) and kept in
// deck.officeTheme = { name, colors, fonts }:
// - colors: the custom palette (palettes.js customPalette, with the Office
//   colour scheme and colour map);
// - fonts: the heading (major) and body (minor) fonts by their Office names
//   (fonts.js officeStack gives their web equivalents).
// "Use the theme of another presentation" applies all of it to the open one,
// as PowerPoint's Browse for Themes does: colours (palettes.js swapPalette),
// fonts, master text styles, layouts and their backgrounds; each slide moves to
// the new layout of the same name or kind, keeping what was written in it.

import { state, commit } from '../../core/store.js';
import { swapPalette, swapThemeFonts, customPalette, themeFontStacks } from './palettes.js';
import { ensureLayouts, layoutOf, relayoutSlide, layoutBackground, masterOf, styleKind, commonBackground } from '../document/master.js';

const clone = o => structuredClone(o);
// The theme record kept in the deck (only what's known; colours checked by customPalette).
export function cleanTheme(t) {
  if (!t || typeof t !== 'object') return null;
  const colors = t.colors ? customPalette(t.colors) : null;
  const fonts = t.fonts && themeFontStacks(t.fonts) ? t.fonts : null;
  if (!colors && !fonts) return null;
  return { name: String(t.name || colors?.name || fonts?.name || 'Tema').slice(0, 60), ...(colors && { colors }), ...(fonts && { fonts: clone(fonts) }) };
}

// The kinds of placeholder a layout or slide has ("title+body+body"), to find its match.
const kinds = blocks => blocks.map(b => (b.type === 'placeholder' ? b.ph : styleKind(b))).filter(Boolean).sort().join('+');
const norm = s => String(s || '').trim().toLowerCase();
function matchLayout(s, oldLay, lays) {
  const k = kinds(oldLay ? oldLay.blocks.filter(b => b.ph) : s.blocks.filter(b => b.ph));
  return (oldLay && lays.find(l => norm(l.name) === norm(oldLay.name)))
    || lays.find(l => kinds(l.blocks.filter(b => b.ph)) === k)
    || (k.includes('body') && lays.find(l => kinds(l.blocks.filter(b => b.ph)) === 'body+title'))
    || (k.includes('subtitle') && lays.find(l => /subtitle/.test(kinds(l.blocks.filter(b => b.ph)))))
    || (k.includes('title') && lays.find(l => kinds(l.blocks.filter(b => b.ph)).includes('title')))
    || lays.find(l => l.blocks.some(b => b.ph === 'body')) || lays[0];
}

// Another presentation's theme (`src`: a deck as the importers return it, or
// { officeTheme } alone, from a .thmx) on this deck, as one change.
export function applyThemeFrom(src, deck = state.deck) {
  const theme = cleanTheme(src?.officeTheme); if (!theme) return false;
  commit(() => {
    // Which slides keep the usual background of their layout (they take the new one).
    const before = new Map(deck.slides.map(s => {
      const lay = layoutOf(s, deck), usual = (lay && layoutBackground(lay, deck)) || commonBackground(masterOf(s, deck), deck);
      return [s, { lay: lay && clone(lay), follows: !s.background || s.background === usual }];
    }));
    if (theme.colors) swapPalette('custom', deck, theme.colors);
    if (theme.fonts) swapThemeFonts(theme.fonts, deck);
    if (src.master && src.layouts?.length) {
      deck.master = { ...clone(src.master), id: 'master' };
      if (src.masters?.length) deck.masters = clone(src.masters); else delete deck.masters;
      deck.layouts = clone(src.layouts);
      const lays = ensureLayouts(deck);
      for (const s of deck.slides) {
        const { lay: old, follows } = before.get(s);
        const hasPh = s.blocks.some(b => b.ph);
        if (old || hasPh) relayoutSlide(s, matchLayout(s, old, lays), deck);
        if (!follows) continue;
        // The new layout's background, else the one its slides had in the other file.
        const nl = layoutOf(s, deck), mine = src.slides?.find(x => x.layoutId === nl?.id)?.background;
        s.background = (nl && layoutBackground(nl, deck)) || mine || src.master.background || theme.colors?.bg || s.background;
      }
    } else if (theme.colors) {
      for (const s of deck.slides) if (before.get(s).follows && !s.background) s.background = theme.colors.bg;
    }
    deck.officeTheme = theme;
  });
  return true;
}

// Back to the imported theme's colours or fonts (from the Colours / Fonts menus).
export const themeColours = (deck = state.deck) => (deck.officeTheme?.colors ? customPalette(deck.officeTheme.colors) : null);
export const isThemeColours = (deck = state.deck) => deck.palette === 'custom' && !!deck.officeTheme?.colors && deck.customPalette?.name === deck.officeTheme.colors.name
  && ['bg', 'fg'].every(k => deck.customPalette[k] === deck.officeTheme.colors[k]) && deck.customPalette.accents?.join() === deck.officeTheme.colors.accents?.join();
