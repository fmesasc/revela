// A presentation in several languages: one table with each of its texts — titles, boxes, notes, tables, charts,
// polls… (tplang.js textsOf) — and how it reads in each language. The slides are made once, in their own language
// (the base); whoever opens it sees it in theirs, if the table has it, or in the one the author chose for everyone.
// The texts are the keys: changing one in the slide leaves its row without translations until they are written (or
// the AI completes them) again; the old ones stay, unused, until «Quitar las que ya no se usan».
//
//   deck.i18n = { base: 'es', langs: ['en', 'ro'], texts: { en: { '<b>Hola</b>': '<b>Hello</b>', … }, … },
//                 force: null | 'en' }      (force: everyone sees it in that language, with no menu to change it)
//
// Seeing it in a language (deckIn) is the same deck with its texts replaced — the template translation's code: a
// text that needs more lines is made a little smaller, and right-to-left languages are aligned to the right —, and
// cleaned again (sanitize.js), since the table's texts are HTML too.

import { textsOf, translateDeck, TEXT_KEYS } from '../content/tplang.js';
import { sanitizeDeck } from './sanitize.js';

// Languages offered (any other code also works): those of Revela and those most spoken in classrooms here.
export const LANG_CODES = ['es', 'en', 'fr', 'de', 'it', 'pt', 'ca', 'gl', 'eu', 'nl', 'ar', 'ro', 'uk', 'ru', 'zh', 'ur', 'pl', 'bg', 'hi', 'ja', 'ko', 'tr', 'el', 'sv', 'he', 'fa', 'am', 'wo', 'tl', 'vi'];
export const RTL = ['ar', 'ur', 'he', 'fa'];
const CODE = /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/;
// A language's name, in that language («English», «Română»); in English for the AI.
export const langName = (code, inLang = code) => { let n = code; try { n = new Intl.DisplayNames([inLang], { type: 'language' }).of(code) || code; } catch {} return n.charAt(0).toLocaleUpperCase(inLang) + n.slice(1); };

export const i18nOf = deck => deck?.i18n && typeof deck.i18n === 'object' ? deck.i18n : null;
export const baseOf = deck => i18nOf(deck)?.base || 'es';
export const langsOf = deck => (i18nOf(deck)?.langs || []).filter(l => CODE.test(l) && l !== baseOf(deck));
// All the languages it can be seen in, the base first.
export const allLangs = deck => [baseOf(deck), ...langsOf(deck)];
export const isMultilingual = deck => langsOf(deck).length > 0;

// The table's rows: each text once, in order, with the slides it is on (1-based; 0 = the deck's name or its layouts).
export function textRows(deck) {
  const where = new Map();
  (deck.slides || []).forEach((s, i) => { for (const tx of textsOf({ slides: [s] })) { if (!where.has(tx)) where.set(tx, []); where.get(tx).push(i + 1); } });
  // (Only what is seen: the slides' texts and the presentation's name — not the names of the layouts, for instance.)
  const { i18n, ...rest } = deck;
  return textsOf(rest).filter(text => where.has(text) || text === deck.name).map(text => ({ text, slides: where.get(text) || [] }));
}
// How many texts still have no translation, by language.
export function missingByLang(deck) {
  const rows = textRows(deck), t = i18nOf(deck)?.texts || {};
  return Object.fromEntries(langsOf(deck).map(l => [l, rows.filter(r => !str(t[l]?.[r.text]).trim()).length]));
}
const str = v => (typeof v === 'string' ? v : '');

// ---- Changes (inside a store commit) ----
export function ensureI18n(deck, base) {
  if (!i18nOf(deck)) deck.i18n = { base: CODE.test(base || '') ? base : 'es', langs: [], texts: {}, force: null };
  deck.i18n.texts ||= {}; deck.i18n.langs ||= [];
  return deck.i18n;
}
export function addLang(deck, code, base) {
  if (!CODE.test(code)) return false;
  const i = ensureI18n(deck, base); if (code === i.base || i.langs.includes(code)) return false;
  i.langs.push(code); i.texts[code] ||= {}; return true;
}
export function removeLang(deck, code) {
  const i = i18nOf(deck); if (!i) return;
  i.langs = i.langs.filter(l => l !== code); delete i.texts[code]; if (i.force === code) i.force = null;
}
export function setBase(deck, code) { if (CODE.test(code)) { const i = ensureI18n(deck); i.base = code; removeLang(deck, code); } }
export function setText(deck, lang, text, value) {
  const i = ensureI18n(deck); i.texts[lang] ||= {};
  if (str(value).trim()) i.texts[lang][text] = str(value); else delete i.texts[lang][text];
}
export function setForce(deck, code) { const i = ensureI18n(deck); i.force = code && allLangs(deck).includes(code) ? code : null; }
// Translations of texts that are no longer in the deck: out. → how many.
export function pruneTexts(deck) {
  const i = i18nOf(deck); if (!i) return 0;
  const live = new Set(textRows(deck).map(r => r.text)); let n = 0;
  for (const l of Object.keys(i.texts)) for (const k of Object.keys(i.texts[l])) if (!live.has(k)) { delete i.texts[l][k]; n++; }
  return n;
}

// ---- Seeing it in a language ----
// A copy of the deck in that language (the deck itself for its base or a language it doesn't have).
export function deckIn(deck, lang) {
  if (!lang || lang === baseOf(deck) || !langsOf(deck).includes(lang)) return deck;
  const d = structuredClone(deck);
  translateDeck(d, d.i18n.texts?.[lang] || {}, { rtl: RTL.includes(lang) });
  d.lang = lang;
  return sanitizeDeck(d);
}
// The language for someone: the one the author forces, else the one asked for (?lang=), else the first of the
// browser's that it has, else its base.
export function pickLang(deck, { asked = '', browser = globalThis.navigator?.languages || [] } = {}) {
  const all = allLangs(deck), i = i18nOf(deck);
  if (i?.force && all.includes(i.force)) return i.force;
  const has = c => all.find(l => l === c) || all.find(l => l.split('-')[0] === String(c).split('-')[0]);
  if (asked && has(asked)) return has(asked);
  for (const b of browser) { const l = has(String(b).toLowerCase()); if (l) return l; }
  return baseOf(deck);
}

// The same presentation written in another of its languages: that language's texts become the slides' (and the
// table's keys), and the old base one more column. (Old and new texts paired by walking both decks side by side:
// seeing it in a language may also change a text's markup — a smaller letter so it keeps its lines.)
export function rebase(deck, lang) {
  if (!langsOf(deck).includes(lang)) return deck;
  const old = baseOf(deck), T = deck.i18n.texts || {}, d = deckIn(deck, lang), pairs = new Map();
  const walk = (a, b, k) => {
    if (typeof a === 'string') { if (typeof b === 'string' && TEXT_KEYS.has(k) && !pairs.has(a)) pairs.set(a, b); return; }
    if (Array.isArray(a) && Array.isArray(b)) { a.forEach((v, i) => walk(v, b[i], k)); return; }
    if (a && typeof a === 'object' && b && typeof b === 'object') for (const kk of Object.keys(a)) if (kk !== 'i18n') walk(a[kk], b[kk], kk);
  };
  walk(deck, d, '');
  const others = [old, ...langsOf(deck).filter(l => l !== lang)], texts = Object.fromEntries(others.map(l => [l, {}]));
  for (const { text } of textRows(deck)) {
    const key = pairs.get(text) ?? text;
    texts[old][key] = text;                                    // (also when it reads the same: it's translated)
    for (const l of others.slice(1)) if (str(T[l]?.[text]).trim()) texts[l][key] = T[l][text];
  }
  d.i18n = { base: lang, langs: others, texts, force: i18nOf(deck).force || null };
  delete d.lang;
  return d;
}
