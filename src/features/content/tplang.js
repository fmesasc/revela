// The example presentations in the interface's language. They're written in Spanish
// (templates/*.js); templates/i18n/<lang>/<file>.js says how each of their texts reads in
// that language ({ Spanish: translation }); their names and summaries are in templates/names/.
// Opening an example applies its language's texts; a text without a
// translation stays as it is. Galician and Basque keep Spanish; Dutch and Arabic, English.
// `node tools/template-texts.mjs` lists the texts and checks every language has them all.

import { styled } from '../document/master.js';
import { linesAt } from '../../render/textfit.js';

export const TEMPLATE_LANGS = ['en', 'fr', 'de', 'it', 'pt', 'ca'];
export const templateLang = lang => (TEMPLATE_LANGS.includes(lang) ? lang : lang === 'nl' || lang === 'ar' ? 'en' : null);

// Where an example's texts are: these properties of the deck, its slides, layouts and
// objects (text, notes, table cells, chart labels and titles, poll questions and options,
// diagram outlines, pictures' descriptions…). Not code, equations, formulas nor credits.
const TEXT_KEYS = new Set(['html', 'notes', 'name', 'rows', 'label', 'alt', 'options', 'question', 'text', 'seriesName', 'yTitle', 'xTitle', 'endText']);
const isText = v => typeof v === 'string' && /\p{L}/u.test(v.replace(/<[^>]*>/g, '')) && !/^\s*=/.test(v) && !/^(data:|https?:|assets\/)/.test(v);

// Every text of a deck, once each, in order.
export function textsOf(deck) {
  const out = new Set();
  const walk = (o, k) => {
    if (Array.isArray(o)) o.forEach(v => walk(v, k));
    else if (o && typeof o === 'object') for (const [kk, v] of Object.entries(o)) walk(v, kk);
    else if (TEXT_KEYS.has(k) && isText(o)) out.add(o);
  };
  walk(deck, '');
  return [...out];
}

// The deck with its texts in another language (changed in place, and returned). A text that
// now needs more lines than the original is made smaller (down to 70 %) so it keeps the
// original's lines: the slide was designed around them.
export function translateDeck(deck, dict) {
  if (!dict) return deck;
  const was = new Map();                                          // object → its text before
  const walk = o => {
    if (Array.isArray(o)) o.forEach(walk);
    else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) {
      if (typeof v === 'string') { if (TEXT_KEYS.has(k) && isText(v) && Object.hasOwn(dict, v)) { if (k === 'html') was.set(o, v); o[k] = dict[v]; } }
      else if (Array.isArray(v) && TEXT_KEYS.has(k)) translateList(v, dict);
      else walk(v);
    }
  };
  walk(deck);
  for (const slide of deck.slides || []) for (const b of slide.blocks || []) if (was.has(b)) keepLines(b, was.get(b), slide, deck);
  return deck;
}
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
export const textsFor = (lang, file) => (templateLang(lang) ? load(`./templates/i18n/${templateLang(lang)}/${file}.js`) : Promise.resolve(null));
