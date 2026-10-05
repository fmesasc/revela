// The presentation's theme as one thing to edit: its colours (background, text and six accents) and
// its two fonts (headings and text). Read from the deck, checked, and applied in one undo step.
// Design ▸ Themes ▸ «Personalizar el tema» edits it (ui/dialogs/theme.js); the assistant only
// proposes one (features/ai/themeai.js), and the person applies it there.

import { state, commit } from '../../core/store.js';
import { currentPalette, swapPalette, swapFonts } from './palettes.js';
import { FONTS } from './fonts.js';
import { kitFromDeck } from './brandkit.js';

const HEX6 = /^#[0-9a-f]{6}$/i;
const low = c => String(c || '').trim().toLowerCase();
// The fonts a theme may use: the catalogue's (they load on any computer).
export const themeFonts = () => FONTS.filter(f => f.stack).map(f => f.name);

// The deck's theme now: { name, bg, fg, accents: [6], heading, body } (a font not in the catalogue: '').
export function themeOf(deck = state.deck) {
  const p = currentPalette(deck), k = kitFromDeck(deck);
  return { name: p.name || '', bg: low(p.bg), fg: low(deck.textColor || p.fg), accents: p.accents.map(low), heading: k.fonts.heading || '', body: k.fonts.body || '' };
}

// A theme as given (by the editor, the AI or a file): only valid colours and catalogue fonts;
// what is missing or wrong stays as in `base`. → the theme, or null.
export function cleanTheme(th, base = themeOf()) {
  if (!th || typeof th !== 'object' || Array.isArray(th)) return null;
  const c = v => (HEX6.test(String(v || '').trim()) ? low(v) : null);
  const font = n => { const f = FONTS.find(x => x.stack && x.name.toLowerCase() === String(n || '').trim().toLowerCase()); return f ? f.name : ''; };
  const acc = Array.isArray(th.accents) ? th.accents : [];
  return { name: String(th.name || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 60) || base.name,
    bg: c(th.bg) || base.bg, fg: c(th.fg) || base.fg, accents: base.accents.map((x, i) => c(acc[i]) || x),
    heading: font(th.heading) || base.heading, body: font(th.body) || base.body };
}

// What would change: { colours, fonts } (booleans).
export function themeChanges(th, deck = state.deck) {
  const now = themeOf(deck), x = cleanTheme(th, now);
  if (!x) return { colours: false, fonts: false };
  return { colours: x.bg !== now.bg || x.fg !== now.fg || x.accents.some((c, i) => c !== now.accents[i]),
    fonts: (!!x.heading && x.heading !== now.heading) || (!!x.body && x.body !== now.body) };
}

// Apply it to the whole presentation, in one undo step: the colours replace the theme's own
// everywhere they are used (slides, layouts, masters), the fonts go to every text. → whether anything changed.
export function applyTheme(th, deck = state.deck) {
  const now = themeOf(deck), x = cleanTheme(th, now); if (!x) return false;
  const ch = themeChanges(x, deck); if (!ch.colours && !ch.fonts) return false;
  commit(() => {
    if (ch.colours) swapPalette('custom', deck, { name: x.name && x.name !== now.name ? x.name : 'Personalizada', bg: x.bg, fg: x.fg, accents: x.accents });
    if (ch.fonts) swapFonts(x.heading, x.body, deck);
  });
  return true;
}

// Contrast between two colours (WCAG ratio, 1–21): the text on the background should be ≥ 4.5.
const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const lum = h => { const n = parseInt(h.slice(1), 16); return 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255); };
export function contrast(a, b) {
  if (!HEX6.test(a) || !HEX6.test(b)) return 21;
  const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
