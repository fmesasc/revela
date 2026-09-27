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
const googleUrl = family =>
  `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@400;700&display=swap`;

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
  for (const s of deck.slides)
    for (const b of s.blocks) {
      const f = byStack.get(b.fontFamily);
      if (f && f.google) used.add(f.google);
    }
  return [...used];
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
