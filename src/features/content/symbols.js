// The data behind Insert ▸ Symbols and emojis (ui/dialogs/symbols.js): the gallery's categories, every character's
// name in the app's languages, every Unicode block with its official names, searching them, and the characters
// used recently or kept as favourites.
//
// The data is Revela's own (assets/symbols/, made by tools/build-symbols.mjs from Unicode's and CLDR's), read from the
// app's own address only when the gallery is opened, a piece at a time: the categories and names first (a few dozen
// KB), a block's official names when that block is opened or a search needs them. The service worker keeps what was
// read, so it also works offline afterwards.

const BASE = new URL('../../../assets/symbols/', import.meta.url);
const cache = new Map();
// (Once per file; a failure isn't kept, so it is tried again next time.)
function json(path) {
  if (!cache.has(path)) cache.set(path, fetch(new URL(path, BASE)).then(r => { if (!r.ok) throw new Error(`${r.status} ${path}`); return r.json(); })
    .catch(e => { cache.delete(path); throw e; }));
  return cache.get(path);
}

// (Without accents, and the letters that are two: «coeur» finds «cœur», «strasse» «Straße».)
export const fold = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/ß/g, 'ss');
const bare = s => s.replace(/\uFE0F/g, '');

// ---- The gallery's categories ------------------------------------------------------------------------------------
// Symbols first, then the emojis by their Unicode group (as in index.json).
export const SYMBOL_CATS = ['arrows', 'math', 'greek', 'currency', 'bullets', 'shapes', 'marks', 'stars', 'scripts', 'units', 'music', 'games', 'punct', 'misc'];
export const EMOJI_CATS = ['smileys', 'people', 'nature', 'food', 'travel', 'activities', 'objects', 'emojisym', 'flags'];

let indexP = null;
// { cats: Map id → [chars], all: [chars] (the names' order), pos: Map char → its place in all, catsOf: [ids] by place,
//   version: Map emoji → its Emoji version, for those newer than 13 }
export function loadIndex() {
  return indexP ||= json('index.json').then(d => {
    const cats = new Map(d.cats.map(([id, s]) => [id, s.split(' ')])), all = [], pos = new Map(), catsOf = [];
    for (const [id, list] of cats) for (const ch of list) {
      if (!pos.has(ch)) { pos.set(ch, all.length); all.push(ch); catsOf.push([]); }
      catsOf[pos.get(ch)].push(id);
    }
    const version = new Map();
    for (const [v, s] of Object.entries(d.newer || {})) for (const ch of s.split(' ')) version.set(ch, v);
    return { cats, all, pos, catsOf, version };
  }).catch(e => { indexP = null; throw e; });
}

// A language's names, in the index's order: [name, keyword, …] each (empty when CLDR has none in that language).
const namesP = new Map();
export function loadNames(lang) {
  if (!namesP.has(lang)) namesP.set(lang, json(`names/${lang}.json`).then(list => list.map(s => (s ? s.split('|') : [])))
    .catch(e => { namesP.delete(lang); throw e; }));
  return namesP.get(lang);
}

// ---- Searching by name -------------------------------------------------------------------------------------------
// What a search looks in for each character, per language: its name and its words, folded (no accents, lower case).
const hay = new Map();
function haystack(lang, names) {
  if (!hay.has(lang)) hay.set(lang, names.map(([name = '', ...kws]) => {
    const n = fold(name), k = kws.map(fold);
    return { n, words: [...new Set([...n.split(/[^\p{L}\p{N}+]+/u), ...k.flatMap(x => x.split(/[^\p{L}\p{N}+]+/u))])].filter(Boolean), kws: k };
  }));
  return hay.get(lang);
}
// The characters whose names match every word of the query, best first: in the first language (the app's) a little
// ahead of the others (Spanish, English); a whole word ahead of a word's start, the start of the name ahead of the rest;
// the category's name («flechas», «griego») finds all of its characters, last. catLabels: id → [folded names].
export function searchNames(query, index, namesByLang, catLabels = {}) {
  const words = fold(query).trim().split(/\s+/).filter(Boolean), q = words.join(' ');
  if (!words.length) return [];
  const langs = Object.entries(namesByLang).map(([lang, names], li) => [haystack(lang, names), li ? 0.9 : 1]);
  const catHits = new Map();
  for (const [id, labels] of Object.entries(catLabels)) catHits.set(id, words.map(w => labels.some(l => l.split(/\s+/).some(x => x.startsWith(w)))));
  const out = [];
  for (let i = 0; i < index.all.length; i++) {
    let best = 0;
    for (const [h, weight] of langs) {
      const e = h[i]; if (!e || (!e.n && !e.words.length)) continue;
      let score = 0;
      for (const w of words) {
        let s = 0;
        if (e.words.includes(w)) s = 10;
        else if (e.words.some(x => x.startsWith(w))) s = 5;
        else if (w.length > 2 && (e.n.includes(w) || e.kws.some(k => k.includes(w)))) s = 3;
        if (!s) { score = 0; break; }
        score += s;
      }
      if (!score) continue;
      // (The name is the query, or begins with it as whole words: «pi» is π's «pi…», not «pizza».)
      if (e.n === q) score += 30; else if (e.n.startsWith(q + ' ')) score += 12; else if (e.n.startsWith(q)) score += 3;
      // (A keyword of several words that is the whole query: the official name, «rightwards arrow» for →. One word as a
      // keyword is common: «flecha» for every arrow.)
      if (words.length > 1 && e.kws.includes(q)) score += 25;
      best = Math.max(best, score * weight - e.n.length * 0.02);   // (of two alike, the shorter name: «cœur rouge» before «cœur anatomique»)
    }
    // (Found by name and also in the category that the query names: «flecha» puts the arrows before the emojis with
    // an arrow.)
    if (best && index.catsOf[i].some(id => catHits.get(id)?.every(Boolean))) best += 6;
    if (!best) {
      // (Only through its category: «flecha» for every arrow.)
      if (index.catsOf[i].some(id => catHits.get(id)?.every(Boolean))) best = 1;
    }
    if (best) out.push([best, i]);
  }
  out.sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  return out.map(([, i]) => index.all[i]);
}
// A character's name and keywords in the first of the languages that has one.
export function nameIn(ch, index, namesByLang) {
  const i = index.pos.get(ch) ?? index.pos.get(bare(ch)); if (i === undefined) return null;
  for (const names of Object.values(namesByLang)) if (names?.[i]?.[0]) return names[i][0];
  return null;
}

// ---- Every Unicode block, with the official names ------------------------------------------------------------------
let blocksP = null;
// [{ name, start, end, chunk } | { name, start, end, algo, ranges }], by code point.
export function loadBlocks() {
  return blocksP ||= json('ucd/blocks.json').then(list => list.map(([name, start, end, where, ranges]) =>
    (typeof where === 'number' ? { name, start, end, chunk: where } : { name, start, end, algo: where, ranges })))
    .catch(e => { blocksP = null; throw e; });
}
export const blockOf = (blocks, cp) => blocks.find(b => cp >= b.start && cp <= b.end) || null;
const hex = cp => cp.toString(16).toUpperCase().padStart(4, '0');
export const codeLabel = cp => 'U+' + hex(cp);

// A block's names as stored (see tools/build-symbols.mjs): one line per code point, «~» a combining mark, «^» an
// invisible one, «#» its own code.
const linesP = new Map();
function blockLines(b) {
  if (!linesP.has(b.start)) linesP.set(b.start, json(`ucd/${b.chunk}.json`).then(d => (d[b.start] || '').split('\n')));
  return linesP.get(b.start);
}
// The names made from the code point (tens of thousands of ideographs and syllables).
const L = 'G GG N D DD R M B BB S SS _ J JJ C K T P H'.split(' ').map(x => (x === '_' ? '' : x));
const V = 'A AE YA YAE EO E YEO YE O WA WAE OE YO U WEO WE WI YU EU YI I'.split(' ');
const T = ['', ...'G GG GS N NJ NH D L LG LM LB LS LT LP LH M B BS S SS NG J C K T P H'.split(' ')];
function madeName(b, cp) {
  if (!b.ranges.some(([a, z]) => cp >= a && cp <= z)) return null;
  if (b.algo === 'hangul') { const s = cp - 0xAC00; return 'HANGUL SYLLABLE ' + L[Math.floor(s / 588)] + V[Math.floor((s % 588) / 28)] + T[s % 28]; }
  return (b.algo === 'tangut' ? 'TANGUT IDEOGRAPH-' : 'CJK UNIFIED IDEOGRAPH-') + hex(cp);
}
const entry = (cp, line) => {
  if (!line) return null;
  const kind = line[0] === '~' ? 'mark' : line[0] === '^' ? 'blank' : '';
  const name = (kind ? line.slice(1) : line).replace(/-#$/, '-' + hex(cp));
  return { cp, name, kind };
};
// What a block has to insert: [{ cp, name, kind }] (kind: '' | 'mark' — combining | 'blank' — invisible).
export async function blockEntries(b) {
  if (b.algo) {
    const out = [];
    for (const [a, z] of b.ranges) for (let cp = a; cp <= z; cp++) out.push({ cp, name: null, kind: '' });   // (named when asked: unicodeName)
    return out;
  }
  const lines = await blockLines(b), out = [];
  lines.forEach((line, i) => { const e = entry(b.start + i, line); if (e) out.push(e); });
  return out;
}
// The official name of a code point (null: nothing to insert there). kind too: { name, kind }.
export async function unicodeInfo(cp) {
  const b = blockOf(await loadBlocks(), cp); if (!b) return null;
  if (b.algo) { const name = madeName(b, cp); return name && { cp, name, kind: '', block: b.name }; }
  const e = entry(cp, (await blockLines(b))[cp - b.start]);
  return e && { ...e, block: b.name };
}
export const unicodeName = async cp => (await unicodeInfo(cp))?.name || null;

// Searching the official names of everything (some 40,000; the ideographs and syllables only by their code): every
// word of the query starts a word of the name. Loads all the names the first time (about 1 MB, 150 KB compressed).
let allNamesP = null;
function allNames() {
  return allNamesP ||= loadBlocks().then(async blocks => {
    const out = [];
    for (const b of blocks.filter(x => !x.algo)) for (const e of await blockEntries(b)) out.push([e.cp, e.name.toLowerCase(), e.kind]);
    return out;
  }).catch(e => { allNamesP = null; throw e; });
}
export async function searchUnicode(query, limit = 600) {
  const words = fold(query).trim().split(/\s+/).filter(Boolean); if (!words.length) return [];
  const q = words.join(' '), out = [];
  for (const [cp, name, kind] of await allNames()) {
    const parts = name.split(/[ -]/);
    if (words.every(w => parts.some(p => p.startsWith(w)))) out.push([name === q ? 0 : name.length, cp, kind]);
  }
  out.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return out.slice(0, limit).map(([, cp, kind]) => ({ cp, kind }));
}

// A code typed as Word or a web page writes it: U+2192, 2192, 0x2192, →, &#x2192; (hexadecimal) or &#8594;
// (decimal). Bare digits are hexadecimal, as in Word, and need four of them (so «12» stays a search).
export function parseCode(s) {
  const t = String(s).trim();
  let m = t.match(/^&#(\d{1,7});?$/);
  if (m) return valid(parseInt(m[1], 10));
  m = t.match(/^(?:u\+|\\u\{?|0x|&#x|#x)([0-9a-f]{1,6})\}?;?$/i) || t.match(/^([0-9a-f]{4,6})$/i);
  return m ? valid(parseInt(m[1], 16)) : null;
}
const valid = cp => (Number.isFinite(cp) && cp >= 0 && cp <= 0x10FFFF ? cp : null);

// ---- Recently used and favourites (this browser only) -------------------------------------------------------------
const RECENT = 'revela.symbols.recent', FAV = 'revela.symbols.fav';
const read = key => { try { const v = JSON.parse(localStorage.getItem(key)); return Array.isArray(v) ? v.filter(x => typeof x === 'string') : []; } catch { return []; } };
const save = (key, list) => { try { localStorage.setItem(key, JSON.stringify(list)); } catch {} };
export const recentSymbols = () => read(RECENT);
export const favoriteSymbols = () => read(FAV);
export function rememberSymbol(ch) { save(RECENT, [ch, ...read(RECENT).filter(x => x !== ch)].slice(0, 48)); }
export const isFavorite = ch => read(FAV).includes(ch);
export function toggleFavorite(ch) {
  const list = read(FAV), on = !list.includes(ch);
  save(FAV, on ? [...list, ch] : list.filter(x => x !== ch));
  return on;
}
