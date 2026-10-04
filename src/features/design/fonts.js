// Font catalogue. Web‑safe families need no loading; Google families are
// fetched on demand (only when actually used) so the editor stays light, and
// the export embeds just the families the deck really uses.

import { styleFont } from './palettes.js';          // (each imports the other: used only when called)

export const FONTS = [
  { name: 'Predeterminada', stack: '' },
  // Web‑safe
  { name: 'Arial', stack: 'Arial, sans-serif' },
  { name: 'Helvetica', stack: "'Helvetica Neue', Helvetica, sans-serif" },
  { name: 'Verdana', stack: 'Verdana, sans-serif' },
  { name: 'Tahoma', stack: 'Tahoma, sans-serif' },
  { name: 'Trebuchet MS', stack: "'Trebuchet MS', sans-serif" },
  { name: 'Georgia', stack: 'Georgia, serif' },
  { name: 'Times New Roman', stack: "'Times New Roman', Times, serif" },
  { name: 'Garamond', stack: 'Garamond, serif' },
  { name: 'Palatino', stack: "'Palatino Linotype', Palatino, serif" },
  { name: 'Courier New', stack: "'Courier New', monospace" },
  { name: 'Impact', stack: 'Impact, sans-serif' },
  { name: 'Comic Sans MS', stack: "'Comic Sans MS', cursive" },
  // Google — sans‑serif
  { name: 'Inter', stack: "'Inter', sans-serif", google: 'Inter' },
  { name: 'Roboto', stack: "'Roboto', sans-serif", google: 'Roboto' },
  { name: 'Open Sans', stack: "'Open Sans', sans-serif", google: 'Open Sans' },
  { name: 'Lato', stack: "'Lato', sans-serif", google: 'Lato' },
  { name: 'Montserrat', stack: "'Montserrat', sans-serif", google: 'Montserrat' },
  { name: 'Poppins', stack: "'Poppins', sans-serif", google: 'Poppins' },
  { name: 'Nunito', stack: "'Nunito', sans-serif", google: 'Nunito' },
  { name: 'Raleway', stack: "'Raleway', sans-serif", google: 'Raleway' },
  { name: 'Work Sans', stack: "'Work Sans', sans-serif", google: 'Work Sans' },
  { name: 'DM Sans', stack: "'DM Sans', sans-serif", google: 'DM Sans' },
  { name: 'Rubik', stack: "'Rubik', sans-serif", google: 'Rubik' },
  { name: 'Ubuntu', stack: "'Ubuntu', sans-serif", google: 'Ubuntu' },
  { name: 'PT Sans', stack: "'PT Sans', sans-serif", google: 'PT Sans' },
  { name: 'Fira Sans', stack: "'Fira Sans', sans-serif", google: 'Fira Sans' },
  { name: 'Josefin Sans', stack: "'Josefin Sans', sans-serif", google: 'Josefin Sans' },
  { name: 'Quicksand', stack: "'Quicksand', sans-serif", google: 'Quicksand' },
  { name: 'Space Grotesk', stack: "'Space Grotesk', sans-serif", google: 'Space Grotesk' },
  { name: 'Oswald', stack: "'Oswald', sans-serif", google: 'Oswald' },
  { name: 'Bebas Neue', stack: "'Bebas Neue', sans-serif", google: 'Bebas Neue' },
  { name: 'Anton', stack: "'Anton', sans-serif", google: 'Anton' },
  // Google — serif
  { name: 'Merriweather', stack: "'Merriweather', serif", google: 'Merriweather' },
  { name: 'Playfair Display', stack: "'Playfair Display', serif", google: 'Playfair Display' },
  { name: 'Lora', stack: "'Lora', serif", google: 'Lora' },
  { name: 'PT Serif', stack: "'PT Serif', serif", google: 'PT Serif' },
  { name: 'Cormorant Garamond', stack: "'Cormorant Garamond', serif", google: 'Cormorant Garamond' },
  { name: 'Abril Fatface', stack: "'Abril Fatface', serif", google: 'Abril Fatface' },
  // Google — display / handwriting / mono
  { name: 'Lobster', stack: "'Lobster', cursive", google: 'Lobster' },
  { name: 'Pacifico', stack: "'Pacifico', cursive", google: 'Pacifico' },
  { name: 'Dancing Script', stack: "'Dancing Script', cursive", google: 'Dancing Script' },
  { name: 'Caveat', stack: "'Caveat', cursive", google: 'Caveat' },
  { name: 'JetBrains Mono', stack: "'JetBrains Mono', monospace", google: 'JetBrains Mono' },
  { name: 'Fira Code', stack: "'Fira Code', monospace", google: 'Fira Code' },
];

const byStack = new Map(FONTS.map(f => [f.stack, f]));
// Google's icon fonts (Material Icons in Google Slides decks): words drawn as
// icons through ligatures. They have their own stylesheet URLs.
const ICON_FONTS = {
  'Material Icons': 'https://fonts.googleapis.com/icon?family=Material+Icons',
  'Material Icons Outlined': 'https://fonts.googleapis.com/icon?family=Material+Icons+Outlined',
  'Material Icons Round': 'https://fonts.googleapis.com/icon?family=Material+Icons+Round',
  'Material Symbols Outlined': 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined',
  'Material Symbols Rounded': 'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded',
};
// Office and system fonts the browser may not have (Linux, Android, ChromeOS…),
// with a free equivalent on Google Fonts: metric-compatible where one exists
// (Carlito ↔ Calibri, Caladea ↔ Cambria, Arimo ↔ Arial, Tinos ↔ Times New Roman,
// Cousine ↔ Courier New, Gelasio ↔ Georgia), else the closest in look (Aptos
// and Segoe UI → Open Sans, by Aptos' own designer; Century Gothic → Questrial…).
// The original name stays first, so whoever has it installed sees it.
export const OFFICE_FONTS = {
  'aptos': 'Open Sans', 'aptos display': 'Open Sans', 'aptos narrow': 'Open Sans', 'aptos light': 'Open Sans', 'aptos serif': 'Gelasio',
  'calibri': 'Carlito', 'calibri light': 'Carlito', 'cambria': 'Caladea', 'cambria math': 'Caladea',
  'segoe ui': 'Open Sans', 'segoe ui light': 'Open Sans', 'segoe ui semibold': 'Open Sans', 'segoe ui semilight': 'Open Sans', 'segoe print': 'Caveat',
  'arial': 'Arimo', 'helvetica': 'Arimo', 'helvetica neue': 'Arimo', 'liberation sans': 'Arimo', 'arial narrow': 'Arimo',
  'times new roman': 'Tinos', 'times': 'Tinos', 'liberation serif': 'Tinos', 'courier new': 'Cousine', 'liberation mono': 'Cousine',
  'georgia': 'Gelasio', 'century gothic': 'Questrial', 'tw cen mt': 'Questrial', 'gill sans mt': 'Cabin', 'gill sans': 'Cabin',
  'franklin gothic book': 'Libre Franklin', 'franklin gothic medium': 'Libre Franklin', 'trebuchet ms': 'Fira Sans', 'corbel': 'Open Sans',
  'candara': 'Cabin', 'garamond': 'EB Garamond', 'consolas': 'Inconsolata', 'rockwell': 'Arvo', 'tahoma': 'PT Sans', 'verdana': 'PT Sans',
  'book antiqua': 'EB Garamond', 'palatino linotype': 'EB Garamond', 'constantia': 'Caladea', 'source sans pro': 'Source Sans 3',
  'meiryo': 'Noto Sans JP', 'yu gothic': 'Noto Sans JP', 'yu gothic light': 'Noto Sans JP', '游ゴシック': 'Noto Sans JP', '游ゴシック light': 'Noto Sans JP',
  'ms gothic': 'Noto Sans JP', 'ms mincho': 'Noto Serif JP', 'dengxian': 'Noto Sans SC', '等线': 'Noto Sans SC', '等线 light': 'Noto Sans SC',
  'microsoft yahei': 'Noto Sans SC', 'simsun': 'Noto Serif SC', 'malgun gothic': 'Noto Sans KR', '맑은 고딕': 'Noto Sans KR',
};
const SERIF = /^(cambria|caladea|times|tinos|georgia|gelasio|garamond|eb garamond|book antiqua|palatino|constantia|rockwell|arvo|ms mincho|simsun|noto serif|aptos serif|liberation serif)/i;
const MONO = /^(courier|cousine|consolas|inconsolata|liberation mono)/i;
const SAFE_NAME = /^[\p{L}\p{N} ._&+-]{1,60}$/u;
// The web equivalent of a font named in an Office file (null: it needs none, or there is none).
// (A weight or width in the name — "Segoe UI Black", "Source Sans Pro Semibold" — is the family's.)
const WEIGHT = / (thin|extralight|extra light|light|semilight|regular|medium|semibold|demibold|bold|extrabold|black|heavy|condensed|narrow|display)$/;
export function webEquivalent(name) {
  let n = String(name || '').trim().toLowerCase();
  for (let i = 0; i < 3 && n; i++) { if (OFFICE_FONTS[n]) return OFFICE_FONTS[n]; n = WEIGHT.test(n) ? n.replace(WEIGHT, '') : ''; }
  return null;
}
// A CSS stack for a font named in an Office file: the font itself, its web
// equivalent, the generic family. '' for a name that can't go into a style.
export function officeStack(name) {
  const n = String(name || '').trim(); if (!SAFE_NAME.test(n)) return '';
  const eq = webEquivalent(n), generic = MONO.test(n) ? 'monospace' : SERIF.test(n) ? 'serif' : 'sans-serif';
  return [`'${n}'`, ...(eq && eq.toLowerCase() !== n.toLowerCase() ? [`'${eq}'`] : []), generic].join(', ');
}
const GOOGLE = new Map([...FONTS.filter(f => f.google).map(f => [f.google.toLowerCase(), f.google]),
  ...Object.values(OFFICE_FONTS).map(g => [g.toLowerCase(), g]),
  ...Object.keys(ICON_FONTS).map(k => [k.toLowerCase(), k])]);
const googleUrl = family => ICON_FONTS[family]
  || `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@400;700&display=swap`;
// The first Google family named in a CSS font-family value, if any (an Office
// font's stack names its web equivalent second).
const googleIn = value => String(value || '').split(',').map(f => GOOGLE.get(f.replace(/["']|&quot;|&#39;/g, '').trim().toLowerCase())).find(Boolean) || null;

// Fonts that come with the systems (not fetched from Google even if a theme names them).
const LOCAL = /^(arial|helvetica|verdana|tahoma|trebuchet|georgia|times|courier|impact|comic sans|segoe|calibri|cambria|candara|consolas|constantia|corbel|franklin|gill sans|century|garamond|palatino|book antiqua|lucida|symbol|wingdings|webdings|marlett|ms |microsoft|meiryo|yu |simsun|mangal|aptos|dejavu|liberation|noto sans$|sans-serif|serif|monospace|\+m[nj]-)/i;
const themeFontNames = deck => { const f = deck?.officeTheme?.fonts; return f ? [f.major, f.minor].filter(x => typeof x === 'string' && x) : []; };
const loaded = new Set();
function inject(family, doc = document) {
  const key = doc === document ? family : 'x:' + family; // per‑document guard
  if (loaded.has(key)) return;
  loaded.add(key);
  const link = doc.createElement('link');
  link.rel = 'stylesheet'; link.href = googleUrl(family);
  doc.head.appendChild(link);
}

// Load the font for a stack, if it is a Google family, so it shows immediately.
export function ensureFont(stack) {
  const f = byStack.get(stack);
  if (f && f.google) inject(f.google);
}

// The distinct Google families used by any text block in the deck.
export function googleFamiliesInDeck(deck) {
  const used = new Set();
  const add = stack => { const f = byStack.get(stack); if (f && f.google) used.add(f.google); else if (googleIn(stack)) used.add(googleIn(stack)); };
  add(deck.bodyFont);                                // theme body font (default for text)
  // An imported theme's fonts: their web equivalents, or the font itself when it
  // may be a Google one (Google Slides themes use any of them).
  for (const f of themeFontNames(deck)) { const g = webEquivalent(f); if (g) used.add(g); else if (!LOCAL.test(f) && SAFE_NAME.test(f)) used.add(f); }
  // The masters' text styles: the headings' font (and any other the styles name).
  const masters = [deck.master, ...(deck.masters || [])].filter(Boolean);
  for (const m of masters) for (const st of Object.values(m.styles || {})) {
    if (st?.font) add(styleFont(st.font, deck));                 // (a theme font named by reference: the one it is now)
    for (const lv of st?.levels || []) if (lv?.font) add(styleFont(lv.font, deck));
  }
  // Named by the box, or inside the text (imported decks: 'Roboto', sans-serif…); layouts' boxes too.
  for (const b of [...masters.flatMap(m => m.blocks || []), ...(deck.layouts || []).flatMap(l => l.blocks || []), ...deck.slides.flatMap(s => s.blocks)]) for (const g of familiesOf(b)) used.add(g);
  return [...used];
}
// A block's families, remembered while its font and text stay the same (this runs at every redraw).
const seen = new WeakMap();
function familiesOf(b) {
  const c = seen.get(b); if (c && c.font === b.fontFamily && c.html === b.html) return c.list;
  const out = new Set(), f = byStack.get(b.fontFamily);
  if (f && f.google) out.add(f.google); else if (googleIn(b.fontFamily)) out.add(googleIn(b.fontFamily));
  for (const m of String(b.html || '').matchAll(/font-family:\s*([^;"]+)/g)) if (googleIn(m[1])) out.add(googleIn(m[1]));
  const list = [...out]; seen.set(b, { font: b.fontFamily, html: b.html, list }); return list;
}

// Load every Google family the deck uses (idempotent), e.g. after opening a
// saved or imported project so its text renders in the right fonts.
export function ensureDeckFonts(deck) {
  for (const f of googleFamiliesInDeck(deck)) inject(f);
}

// <link> tags to embed those families in the exported presentation (and the
// presentation's own fonts, below, inside it).
export function googleFontLinks(deck) {
  const fams = googleFamiliesInDeck(deck);
  return fams.map(f => `<link rel="stylesheet" href="${googleUrl(f)}">`).join('\n') + (customFonts(deck).length ? `\n<style>${customFontCSS(deck)}</style>` : '');
}

// The presentation's own fonts (a school's or a brand's .ttf, .otf, .woff):
// kept inside it, like its pictures, so they travel with it. Only names made
// of letters, numbers, spaces, dots and dashes, and fonts as data.
const FONT_DATA = /^data:font\/(ttf|otf|woff2?|sfnt);base64,[A-Za-z0-9+/=]+$/;
const FONT_NAME = /^[\p{L}\p{N} ._-]{1,40}$/u;
export const customFonts = deck => (deck?.fonts || []).filter(f => f && FONT_NAME.test(f.name || '') && FONT_DATA.test(f.src || ''));
export const customStack = name => `"${name}", sans-serif`;
export const customFontCSS = deck => customFonts(deck).map(f => `@font-face{font-family:"${f.name}";src:url(${f.src});font-display:swap}`).join('');
// In the editor: the page knows the presentation's fonts (a style element kept up to date).
let fontKey = '';
export function syncCustomFonts(deck, doc = document) {
  const list = customFonts(deck), key = list.map(f => f.name + f.src.length).join('|'); if (key === fontKey) return; fontKey = key;
  let st = doc.getElementById('rv-custom-fonts'); if (!st) { st = doc.createElement('style'); st.id = 'rv-custom-fonts'; doc.head.appendChild(st); }
  st.textContent = customFontCSS(deck);
}
// A font file as a data URL with the right type (browsers don't always say it).
export function fontDataURL(dataURL, fileName) {
  const ext = (/\.(ttf|otf|woff2?)$/i.exec(fileName || '')?.[1] || 'ttf').toLowerCase();
  return dataURL.replace(/^data:[^;,]*/, 'data:font/' + ext);
}
