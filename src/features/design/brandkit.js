// Brand kits (Canva's Brand Kit, Pitch's workspace styles): a school's or a
// company's colours, fonts and logos, kept in this browser and applied to a
// presentation in one go. A kit can be saved as a file (.json) to share it with
// the team, and read back. Applying one: its colours become the theme's
// (background, text and six accents, each in its role), its two fonts the
// headings' and the text's, and its first logo the presentation's logo.

import { state, commit } from '../../core/store.js';
import { uid } from '../../core/model.js';
import { currentPalette, applyPalette, applyFonts } from './palettes.js';
import { FONTS } from './fonts.js';
import { safeURL } from '../document/sanitize.js';

const KEY = 'revela.brandKits';
const HEX6 = /^#[0-9a-f]{6}$/i;
const fontName = stack => (stack ? FONTS.find(f => f.stack === stack || f.name === stack)?.name || '' : '');

// A kit as it may be kept: only known fields, valid colours, catalogue fonts, pictures as data.
export function cleanKit(k) {
  if (!k || typeof k !== 'object') return null;
  const colors = (Array.isArray(k.colors) ? k.colors : []).filter(c => HEX6.test(c)).slice(0, 8);
  const font = n => (FONTS.some(f => f.name === n) ? n : '');
  const logos = (Array.isArray(k.logos) ? k.logos : []).filter(l => typeof l === 'string' && /^data:image\//.test(l) && safeURL(l) && l.length < 3e6).slice(0, 4);
  if (!colors.length && !logos.length && !font(k.fonts?.heading) && !font(k.fonts?.body)) return null;
  return { id: typeof k.id === 'string' ? k.id.slice(0, 40) : uid(), name: String(k.name || 'Mi marca').slice(0, 60),
    colors, fonts: { heading: font(k.fonts?.heading), body: font(k.fonts?.body) }, logos };
}
export function listKits() {
  try { return (JSON.parse(localStorage.getItem(KEY)) || []).map(cleanKit).filter(Boolean); } catch { return []; }
}
let colourCache = null;                              // (the kits' colours, read once: offered in every colour picker)
export const kitColours = () => (colourCache ||= [...new Set(listKits().flatMap(k => k.colors))]);
function store(list) { colourCache = null; try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch { return false; } }
export function saveKit(kit) {
  const k = cleanKit(kit); if (!k) return null;
  const list = listKits(), i = list.findIndex(x => x.id === k.id);
  if (i >= 0) list[i] = k; else list.push(k);
  return store(list) ? k : null;                    // (a browser without room says no)
}
export function deleteKit(id) { store(listKits().filter(k => k.id !== id)); }

// This presentation's colours, fonts and logo, as a kit to start from.
export function kitFromDeck(deck = state.deck) {
  const p = currentPalette(deck), styles = deck.master?.styles || {};
  return { id: uid(), name: deck.name && deck.name !== 'Presentación sin título' ? deck.name : 'Mi marca',
    colors: [p.bg, deck.textColor || p.fg, ...p.accents],
    fonts: { heading: fontName(styles.title?.font) || fontName(deck.bodyFont), body: fontName(deck.bodyFont) },
    logos: deck.logo?.src && /^data:image\//.test(deck.logo.src) ? [deck.logo.src] : [] };
}

// Apply a kit to the presentation (each part only if the kit has it).
export function applyKit(kit, deck = state.deck) {
  const k = cleanKit(kit); if (!k) return;
  if (k.colors.length) {
    const base = currentPalette(deck);
    applyPalette('custom', deck, { name: k.name, bg: k.colors[0] || base.bg, fg: k.colors[1] || base.fg, accents: base.accents.map((c, i) => k.colors[i + 2] || c) });
  }
  if (k.fonts.heading || k.fonts.body) applyFonts(k.fonts.heading, k.fonts.body, deck);
  if (k.logos[0]) commit(() => { deck.logo = { position: 'br', size: 120, ...deck.logo, src: k.logos[0] }; });
}

// As a file to share, and back.
export const kitFile = kit => new Blob([JSON.stringify({ revelaBrandKit: 1, ...cleanKit(kit) }, null, 1)], { type: 'application/json' });
export function kitFromFile(text) {
  let o; try { o = JSON.parse(text); } catch { return null; }
  if (!o?.revelaBrandKit) return null;
  return cleanKit({ ...o, id: uid() });
}
