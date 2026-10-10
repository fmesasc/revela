// Spell checking of our own, as Word's and PowerPoint's: the browser's only marks the text being written, in the
// interface's language, with whatever dictionaries it happens to have. Here every text of the slide is checked in its
// own language (proofing.js), with Hunspell and the LibreOffice dictionaries, in a worker (spellworker.js): a dictionary
// is downloaded the first time its language is used and kept in the browser (Cache Storage) for the next ones.
//
// What the page asks is answered from what is known already (isBad: true, false or undefined — not asked yet); the rest
// is asked in batches and onSpellChange() tells when there is more to show.
//
// The personal dictionary («Agregar al diccionario») stays in this browser, by language (es, en…: both Englishes
// share it); «Omitir todo» lasts while the editor is open, as in Word.

import { HUNSPELL, SPELL_DICTS } from '../../core/vendor.js';
import { lookupForm } from './proofing.js';

const PERSONAL_KEY = 'revela.spell.words';
const urls = { ...SPELL_DICTS };
const status = new Map();                              // tag → 'loading' | 'ready' | 'failed'
const loading = new Map();                             // tag → its promise
const known = new Map();                               // tag → Map(word → bad?)
const asked = new Map();                               // tag → Set of words on their way
const suggestions = new Map();                         // tag → Map(word → Promise<string[]>)
const ignored = new Map();                             // base language → Set («Omitir todo»)
const listeners = new Set();
let worker = null, seq = 0, broken = false;
const waiting = new Map();

export const onSpellChange = fn => { listeners.add(fn); return () => listeners.delete(fn); };
let told = 0;
const tell = () => { if (told) return; told = setTimeout(() => { told = 0; for (const fn of listeners) try { fn(); } catch {} }, 0); };

// Other dictionary files for a language (the tests' small one; a school's own): the same path as the real ones.
export function useDictionary(tag, { aff, dic }) {
  const abs = u => new URL(u, document.baseURI).href;
  urls[tag] = { aff: abs(aff), dic: abs(dic) };
  known.delete(tag); asked.delete(tag); suggestions.delete(tag);
  worker?.terminate(); worker = null; broken = false;   // (a fresh engine: the tag may be loaded with the old files)
  for (const [id, w] of waiting) { w.rej(new Error('restarted')); waiting.delete(id); }
  for (const t of [...status.keys()]) { status.delete(t); loading.delete(t); }
  tell();
}
// The test harness: no dictionary from the network (the rest of the suite stays as with the browser's checker; the
// spelling tests give their own, tests/fixtures/spell).
export function noDownloads() { for (const k of Object.keys(urls)) delete urls[k]; tell(); }
export const hasDict = tag => !!urls[tag];
// 'missing' (no dictionary for it), 'idle' (not loaded yet), 'loading', 'ready' or 'failed' (no connection the first time…).
export const dictStatus = tag => (!urls[tag] ? 'missing' : status.get(tag) || 'idle');

function call(op, data = {}) {
  if (broken) return Promise.reject(new Error('spell worker'));
  if (!worker) {
    worker = new Worker(new URL('./spellworker.js', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data: m }) => { const w = waiting.get(m.id); if (!w) return; waiting.delete(m.id); m.ok ? w.res(m.value) : w.rej(new Error(m.error)); };
    worker.onerror = e => { broken = true; for (const w of waiting.values()) w.rej(new Error(e.message || 'spell worker')); waiting.clear(); };
  }
  return new Promise((res, rej) => { const id = ++seq; waiting.set(id, { res, rej }); worker.postMessage({ id, op, ...data }); });
}

// The language's dictionary, loaded (once) → whether it is ready.
export function ensureDict(tag) {
  if (!urls[tag]) return Promise.resolve(false);
  if (status.get(tag) === 'ready') return Promise.resolve(true);
  if (!loading.has(tag)) {
    status.set(tag, 'loading'); tell();
    const p = call('load', { tag, ...urls[tag], engine: HUNSPELL })
      .then(() => { status.set(tag, 'ready'); for (const w of personal()[base(tag)] || []) call('add', { tag, word: w }).catch(() => {}); return true; })
      .catch(e => { if (loading.get(tag) !== p) return false; console.warn('Ortografía:', tag, e.message); status.set(tag, 'failed'); loading.delete(tag); return false; })
      .finally(tell);
    loading.set(tag, p);
  }
  return loading.get(tag);
}

const base = tag => String(tag).split('-')[0];
function personal() { try { const v = JSON.parse(localStorage.getItem(PERSONAL_KEY) || '{}'); return v && typeof v === 'object' ? v : {}; } catch { return {}; } }
// Accepted without asking the dictionary: added by the user, or ignored for now.
export function isAccepted(tag, word) {
  const w = lookupForm(word), b = base(tag), mine = personal()[b] || [];
  return mine.includes(w) || mine.includes(w.toLocaleLowerCase()) || !!ignored.get(b)?.has(w);
}

// Is it misspelt? true / false, or undefined while it isn't known (then it is asked: onSpellChange says when).
export function isBad(tag, word) {
  if (isAccepted(tag, word)) return false;
  const w = lookupForm(word), k = known.get(tag)?.get(w);
  if (k !== undefined) return k;
  queue(tag, w);
  return undefined;
}
const pending = new Map();                             // tag → Set (asked in one batch, a moment later)
function queue(tag, w) {
  if (status.get(tag) !== 'ready') { if (dictStatus(tag) === 'idle') ensureDict(tag); return; }
  if (asked.get(tag)?.has(w)) return;
  (asked.get(tag) || asked.set(tag, new Set()).get(tag)).add(w);
  const first = !pending.size; (pending.get(tag) || pending.set(tag, new Set()).get(tag)).add(w);
  if (first) queueMicrotask(flush);
}
function flush() {
  for (const [tag, set] of pending) {
    const words = [...set];
    call('check', { tag, words }).then(bad => {
      const m = known.get(tag) || known.set(tag, new Map()).get(tag), b = new Set(bad);
      for (const w of words) m.set(w, b.has(w));
      tell();
    }).catch(() => {}).finally(() => { for (const w of words) asked.get(tag)?.delete(w); });
  }
  pending.clear();
}
// The words of a list that are misspelt, once the dictionary has answered (it is loaded if needed).
export async function check(tag, words) {
  if (!(await ensureDict(tag))) return [];
  const list = [...new Set(words.map(lookupForm))].filter(w => !isAccepted(tag, w)), m = known.get(tag) || known.set(tag, new Map()).get(tag);
  const todo = list.filter(w => !m.has(w));
  if (todo.length) { const bad = new Set(await call('check', { tag, words: todo })); for (const w of todo) m.set(w, bad.has(w)); }
  return list.filter(w => m.get(w) && !isAccepted(tag, w));
}
// Its suggestions, the best first (asked once).
export function suggest(tag, word) {
  const w = lookupForm(word), m = suggestions.get(tag) || suggestions.set(tag, new Map()).get(tag);
  if (!m.has(w)) m.set(w, ensureDict(tag).then(ok => (ok ? call('suggest', { tag, word: w }) : [])).catch(() => { m.delete(w); return []; }));
  return m.get(w);
}
// «Agregar al diccionario»: from now on, in every presentation (in this browser).
export function addWord(tag, word) {
  const w = lookupForm(word), all = personal(), b = base(tag);
  all[b] = [...new Set([...(all[b] || []), w])].sort();
  try { localStorage.setItem(PERSONAL_KEY, JSON.stringify(all)); } catch {}
  if (status.get(tag) === 'ready') call('add', { tag, word: w }).catch(() => {});
  tell();
}
export const personalWords = tag => personal()[base(tag)] || [];
// «Omitir todo»: while the editor is open.
export function ignoreAll(tag, word) { const b = base(tag); (ignored.get(b) || ignored.set(b, new Set()).get(b)).add(lookupForm(word)); tell(); }
