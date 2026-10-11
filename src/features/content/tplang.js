// The example presentations in the interface's language. They're written in Spanish
// (templates/*.js); templates/i18n/<lang>/<file>.js says how each of their texts reads in
// that language ({ Spanish: translation }); their names and summaries are in templates/names/.
// Opening an example applies its language's texts; a text without a
// translation stays as it is. Every language of the interface has its own; a file not yet
// translated into Dutch or Arabic shows its English, and into Galician or Basque, its Spanish.
// Arabic reads from right to left: its texts too (see translateDeck).
// `node tools/template-texts.mjs` lists the texts and checks every language has them all.

import { styled } from '../document/master.js';
import { linesAt } from '../../render/textfit.js';
import { isSheetFormula } from '../../core/formulas.js';

export const TEMPLATE_LANGS = ['en', 'fr', 'de', 'it', 'pt', 'ca', 'gl', 'nl', 'eu', 'ar'];
export const templateLang = lang => (TEMPLATE_LANGS.includes(lang) ? lang : null);
const FALLBACK = { nl: 'en', ar: 'en' };
export const RTL_LANGS = ['ar'];

// Where an example's texts are: these properties of the deck, its slides, layouts and
// objects (text, notes, table cells, chart labels and titles, poll questions and options,
// diagram outlines, pictures' descriptions…). Not code, formulas nor credits; of an equation, only the words
// inside it (mathTexts, below).
export const TEXT_KEYS = new Set(['html', 'notes', 'name', 'rows', 'label', 'alt', 'options', 'question', 'text', 'seriesName', 'yTitle', 'xTitle', 'endText']);
// (A table's formula — =SUMA(ARRIBA), =B2*C2 — is not a text; a text that only starts with «=» — «= 52 años: la rueda
// calendárica», under a sum — is: core/formulas.js isSheetFormula tells them apart.)
const isText = v => typeof v === 'string' && /\p{L}/u.test(v.replace(/<[^>]*>/g, '')) && !isSheetFormula(v) && !/^(data:|https?:|assets\/)/.test(v);

// The words inside an equation (an object's `latex`): what \text{…}, \textrm{…}, \mbox{…}, \mathrm{…}… hold —
// «E = \dfrac{\text{alquiler}}{\text{ingresos netos}}» — are text too, and were left in Spanish in every language.
// Each one is a text of its own (its content, without LaTeX's escapes: «eFG%»), so the same table translates it;
// the symbols, variables and the rest of the formula are not touched. Only plain words: a content with commands
// or groups inside (\text{$x$ veces}, \mathrm{CO_2}) stays as it is, and so does one without two letters together
// (\text{m} after a number, \text{m/s}, \mathrm{C}, \text{–}) — units and symbols; «km», «min»… are texts
// (they read the same in most languages, and «lpm» doesn't: «bpm»).
const MATH_TEXT = /\\(text(?:rm|it|bf|sf|up|normal)?|mbox|mathrm|operatorname)\s*\{/g;
function mathPieces(latex) {
  const out = [];
  if (typeof latex !== 'string' || !latex.includes('\\')) return out;
  for (const m of latex.matchAll(MATH_TEXT)) {
    const from = m.index + m[0].length; let i = from, depth = 1;
    for (; i < latex.length && depth; i++) { if (latex[i] === '\\') i++; else if (latex[i] === '{') depth++; else if (latex[i] === '}') depth--; }
    if (depth) continue;
    const raw = latex.slice(from, i - 1);
    // (escapes of LaTeX's special characters are fine; any other command, group, $, ^, _ or ~: not plain words)
    if (/\\(?![%&$#_{}])|(?<!\\)[{}$^_~]/.test(raw)) continue;
    const text = raw.replace(/\\([%&$#_{}])/g, '$1').replace(BIDI_ISOLATES, '');      // (and without the isolates added below)
    if (!/\p{L}\.?\p{L}/u.test(text)) continue;                  // (two letters together, or an abbreviation: «م.م.أ»)
    out.push({ start: m.index, from, to: i - 1, cmd: m[1], text: text.trim(), lead: text.match(/^\s*/)[0], trail: text.match(/\s*$/)[0] });
  }
  return out;
}
const BIDI_ISOLATES = /[\u2066-\u2069]/g, RTL_LETTER = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;
// The texts inside an equation, in order.
export const mathTexts = latex => mathPieces(latex).map(p => p.text);
// A translation back into LaTeX: its special characters escaped (text mode), and as plain text — a table's
// translations are HTML (an «&amp;» there is an «&» here).
const TEX_ESC = { '\\': '\\textbackslash{}', '~': '\\textasciitilde{}', '^': '\\textasciicircum{}', '&': '\\&', '%': '\\%', '$': '\\$', '#': '\\#', '_': '\\_', '{': '\\{', '}': '\\}' };
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
const plainOf = s => String(s).replace(/<[^>]*>/g, '').replace(/&(amp|lt|gt|quot|apos|nbsp|#39);/g, (m, e) => ENTITIES[e]);
export const texEscape = s => s.replace(/[\\~^&%$#_{}]/g, c => TEX_ESC[c]);
// The equation with its texts in another language (those the table has). \mathrm and \operatorname are math mode:
// spaces vanish there and accents or Arabic letters are not math, so a translation that isn't a plain Latin
// abbreviation («mcm» → «lcm» stays \mathrm) goes in text mode instead — \textrm, upright like \mathrm (and as an
// operator, \mathop{\textrm{…}}, for \operatorname).
// (Arabic, and any right-to-left translation: the equation keeps reading from left to right — its variables and
// numbers are Latin, as in most Arabic school books from secondary on — and the Arabic words, inside their \text{},
// are drawn joined and from right to left by the browser. But KaTeX's spans don't isolate them: the numbers and
// brackets after them were taken as part of the Arabic and reordered — «18 980 \text{أيام} \textrm{م.م.أ}(2,3)»
// came out «18 980 (3 ,2)م.م.أ أيام» —, and a Latin word inside an Arabic phrase landed at the wrong end. So each
// such translation goes between U+2067 and U+2069 (right-to-left isolate … pop): a piece of its own, read from
// right to left inside, a neutral block for the formula around it. Checked with KaTeX in Chrome: tmp/shot.sh
// data_city --lang ar.)
export function translateLatex(latex, dict) {
  let out = latex;
  for (const p of mathPieces(latex).reverse()) {
    if (!p.text || !dict || !Object.hasOwn(dict, p.text)) continue;
    const tr = plainOf(dict[p.text]).trim();
    if (!tr || tr === p.text) continue;
    const body = p.lead + (RTL_LETTER.test(tr) ? '\u2067' + texEscape(tr) + '\u2069' : texEscape(tr)) + p.trail;
    let piece = latex.slice(p.start, p.from) + body + '}';
    if ((p.cmd === 'mathrm' || p.cmd === 'operatorname') && !/^[A-Za-z0-9./]+$/.test(tr)) piece = p.cmd === 'mathrm' ? `\\textrm{${body}}` : `\\mathop{\\textrm{${body}}}`;
    out = out.slice(0, p.start) + piece + out.slice(p.to + 1);
  }
  return out;
}

// Every text of a deck, once each, in order.
export function textsOf(deck) {
  const out = new Set();
  const walk = (o, k) => {
    if (Array.isArray(o)) o.forEach(v => walk(v, k));
    else if (o && typeof o === 'object') for (const [kk, v] of Object.entries(o)) walk(v, kk);
    else if (TEXT_KEYS.has(k) && isText(o)) out.add(o);
    else if (k === 'latex') for (const t of mathTexts(o)) out.add(t);
  };
  walk(deck, '');
  return [...out];
}

// The deck with its texts in another language (changed in place, and returned). A text that
// now needs more lines than the original is made smaller (down to 70 %) so it keeps the
// original's lines: the slide was designed around them. rtl (Arabic): the translated texts
// read from right to left, and what was aligned to the left is aligned to the right (centred
// and right-aligned texts stay: they were placed for it).
export function translateDeck(deck, dict, { rtl = false } = {}) {
  if (!dict) return deck;
  const was = new Map();                                          // object → its text before
  const walk = o => {
    if (Array.isArray(o)) o.forEach(walk);
    else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) {
      if (typeof v === 'string') {
        if (TEXT_KEYS.has(k) && isText(v) && Object.hasOwn(dict, v)) { if (k === 'html') was.set(o, v); o[k] = dict[v]; }
        else if (k === 'latex') o[k] = translateLatex(v, dict);           // (the words inside an equation)
      }
      else if (Array.isArray(v) && TEXT_KEYS.has(k)) translateList(v, dict);
      else walk(v);
    }
  };
  walk(deck);
  // (Right to left: tables too — the first column on the right.)
  if (rtl) for (const slide of deck.slides || []) for (const b of slide.blocks || []) if (b.type === 'table') b.dir = 'rtl';
  for (const slide of deck.slides || []) for (const b of slide.blocks || []) if (was.has(b)) {
    ORIGINAL.set(b, was.get(b)); keepLines(b, was.get(b), slide, deck);
    if (rtl && b.type === 'text' && !b.vertical) {
      // (A text left in its own language — a verse, an example word, a quote in a language lesson — has no Arabic
      // letters: read right to left, its punctuation went to the wrong end — «.luceros». It keeps its direction,
      // aligned to the right like the rest.)
      if (ARABIC.test(b.html.replace(/<[^>]*>/g, '')) || !LATIN.test(b.html.replace(/<[^>]*>/g, ''))) {
        b.dir = 'rtl';
        // (And inside an Arabic text, each piece left in its language — «Olá!» over its gloss — on its own, read left
        // to right: an element with dir isolates it, and its «!» stays at its end.)
        // (Arabic letters are joined: spaced out, the browser draws them apart — «ب ل ا غ». No spacing between them.)
        if (ARABIC.test(b.html.replace(/<[^>]*>/g, ''))) { if (+b.letterSpacing) b.letterSpacing = 0; b.html = b.html.replace(/letter-spacing:\s*[^;"]+;?/g, ''); }
        b.html = ('>' + b.html + '<').replace(/>([^<]+)</g, (m, x) => (LATIN.test(x) && !ARABIC.test(x) ? `><span dir="ltr">${x}</span><` : m)).slice(1, -1);
      }
      if ((styled(b, slide, deck).textAlign || 'left') === 'left') b.textAlign = 'right';
      b.html = b.html.replace(/float:\s*left/g, 'float:right');                  // (a drop cap: at the start of the line, its right)
    }
  }
  return deck;
}
const ARABIC = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/, LATIN = /[A-Za-zÀ-ɏ0-9]/;   // (and digits: «5,6–6,4 %», «2:55–3:00» came reordered right to left)
// A translated text object's Spanish text (to compare how much room each takes: ui/canvas/fittext.js).
const ORIGINAL = new WeakMap();
export const originalText = b => ORIGINAL.get(b);
function keepLines(b, before, slide, deck) {
  if (b.type !== 'text' || b.wordart || b.vertical || b.curve) return;                 // (Text Art shrinks by itself)
  const st = styled(b, slide, deck), fs = +st.fontSize || 32, pad = Array.isArray(b.pad) ? b.pad[1] + b.pad[3] : 12;
  const w = (b.w || 0) - pad - (b.indent || 0), ls = +b.letterSpacing || 0;
  if (w <= 0) return;
  const n0 = linesAt(before, fs, w, ls);
  if (linesAt(b.html, fs, w, ls) <= n0) return;
  let f = fs;
  while (f > fs * 0.7 && linesAt(b.html, f, w, ls) > n0) f -= Math.max(1, Math.round(f * 0.03));
  const k = Math.max(0.7, f / fs);
  if (b.fontSize != null) b.fontSize = Math.round(b.fontSize * k);
  else b.fit = Math.round((b.fit || 1) * k * 100) / 100;
  // (Sizes written inside the text shrink with it.)
  b.html = b.html.replace(/font-size:\s*([\d.]+)px/g, (m, n) => `font-size:${Math.round(n * k)}px`);
}
// (A list under a text property: its strings, and the strings of lists inside it — table rows.)
function translateList(list, dict) {
  for (let i = 0; i < list.length; i++) {
    const v = list[i];
    if (typeof v === 'string') { if (isText(v) && Object.hasOwn(dict, v)) list[i] = dict[v]; }
    else if (Array.isArray(v)) translateList(v, dict);
    else if (v && typeof v === 'object') translateDeck(v, dict);
  }
}

// A language's texts for one file of examples (null if none).
const cache = new Map();
const load = path => {
  if (!cache.has(path)) cache.set(path, import(path).then(m => m.default).catch(() => null));
  return cache.get(path);
};
// → { dict, lang } (the language they are in: its own, or the one it falls back to).
export async function textsIn(lang, file) {
  const own = templateLang(lang) && await load(`./templates/i18n/${lang}/${file}.js`);
  if (own) return { dict: own, lang };
  const fb = FALLBACK[lang], dict = fb ? await load(`./templates/i18n/${fb}/${file}.js`) : null;
  return { dict, lang: dict ? fb : 'es' };
}
