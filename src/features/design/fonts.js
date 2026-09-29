// Font catalogue. Web‑safe families need no loading; Google families are
// fetched on demand (only when actually used) so the editor stays light, and
// the export embeds just the families the deck really uses.

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
const GOOGLE = new Map([...FONTS.filter(f => f.google).map(f => [f.google.toLowerCase(), f.google]),
  ...Object.keys(ICON_FONTS).map(k => [k.toLowerCase(), k])]);
const googleUrl = family => ICON_FONTS[family]
  || `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@400;700&display=swap`;
// The Google family named first in a CSS font-family value, if any.
const googleIn = value => GOOGLE.get(String(value || '').split(',')[0].replace(/["']|&quot;/g, '').trim().toLowerCase()) || null;

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
  const df = byStack.get(deck.bodyFont);            // theme body font (default for text)
  if (df && df.google) used.add(df.google);
  // Named by the box, or inside the text (imported decks: 'Roboto', sans-serif…).
  for (const b of [...(deck.master?.blocks || []), ...deck.slides.flatMap(s => s.blocks)]) for (const g of familiesOf(b)) used.add(g);
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

// <link> tags to embed those families in the exported presentation.
export function googleFontLinks(deck) {
  const fams = googleFamiliesInDeck(deck);
  if (!fams.length) return '';
  return fams.map(f => `<link rel="stylesheet" href="${googleUrl(f)}">`).join('\n');
}
