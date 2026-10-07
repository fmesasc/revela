// How good a deck the AI made is, measured — not guessed —: what made the Swift deck mediocre (every slide a list of
// two copied phrases, no code on a programming topic, notes one slide off) as numbers. Used:
// - by createDeck (authoring.js): a deck that comes out weak gets its weak slides made again, once, before it's shown;
// - by tools/ai-eval.py (and the «Evaluar la IA» workflow): a set of topics through the real model, scored, so a
//   change in the instructions or the model is measured.
// Pure (specs in, a report out): no requests, no DOM.

import { AI_LANGS } from './codeobj.js';

const str = v => (v == null ? '' : String(v)).trim();
// A technical topic: programming, a language, a library, a query language… (it should show code).
const TECH = new RegExp(`(programaci|programming|programar|lenguaje de|llenguatge|language|c[oó]digo|\\bcode\\b|software|desarroll|develop|framework|librer|library|\\bapi\\b|algoritm|algorithm|base de datos|database|\\bdax\\b|power ?query|excel|\\bsql\\b|${AI_LANGS.filter(l => l.length > 2 && !['plaintext', 'excel', 'markdown'].includes(l)).join('|')}|c\\+\\+|c#|node\\.?js|react|vue|angular|django|flask|spring|kubernetes|docker|git\\b)`, 'i');
export const isTechnical = topic => TECH.test(str(topic));

const bulletsOf = sp => (Array.isArray(sp.bullets) ? sp.bullets.flat(2).map(str).filter(Boolean) : []);
const words = s => str(s).split(/\s+/).filter(Boolean).length;
const MID = ['title', 'section', 'closing', 'agenda'];
// The words of a slide that say what it's about (its title and main text), lower-case, 4 letters or more.
const keyWords = sp => new Set([sp.title, sp.statement, sp.subtitle].map(str).join(' ').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^\p{L}\p{N}]+/u).filter(w => w.length >= 4));

// → { score (0-100), problems: [{ code, slides?: [i], detail }], stats }
// problems' codes: all-lists, thin-lists, no-code, few-kinds, notes-missing, notes-off, empty.
export function deckQuality(specs, { topic = '' } = {}) {
  const n = specs.length, body = specs.map((sp, i) => ({ sp, i })).filter(x => !MID.includes(x.sp.kind));
  const lists = body.filter(x => x.sp.kind === 'bullets'), kinds = new Set(body.map(x => x.sp.kind));
  const thin = lists.filter(x => bulletsOf(x.sp).length < 3 || bulletsOf(x.sp).reduce((s, b) => s + words(b), 0) / Math.max(1, bulletsOf(x.sp).length) < 3);
  const code = body.filter(x => x.sp.kind === 'code' && str(x.sp.code?.code || x.sp.code).length > 10), tech = isTechnical(topic);
  const noNotes = specs.map((sp, i) => (str(sp.notes) ? -1 : i)).filter(i => i >= 0);
  // Notes about another slide: they share no word with their own slide, but do with the next one's.
  const off = specs.map((sp, i) => {
    if (!str(sp.notes) || i === n - 1 || MID.includes(sp.kind)) return -1;
    const note = str(sp.notes).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''), own = [...keyWords(sp)], next = [...keyWords(specs[i + 1])].filter(w => !own.includes(w));
    return own.length && next.length && !own.some(w => note.includes(w)) && next.some(w => note.includes(w)) ? i : -1;
  }).filter(i => i >= 0);
  const empty = body.filter(x => { const sp = x.sp; return sp.kind === 'bullets' ? !bulletsOf(sp).length : sp.kind === 'code' ? !str(sp.code?.code || sp.code) : sp.kind === 'steps' || sp.kind === 'timeline' ? !(sp.steps || []).length : sp.kind === 'features' ? !(sp.items || []).length : false; });
  const problems = [];
  const share = body.length ? lists.length / body.length : 0;
  if (body.length >= 4 && share > 0.4) problems.push({ code: 'all-lists', slides: lists.map(x => x.i), detail: `${Math.round(share * 100)} % de listas` });
  if (thin.length) problems.push({ code: 'thin-lists', slides: thin.map(x => x.i), detail: `${thin.length} listas pobres (menos de 3 puntos o de 3 palabras por punto)` });
  const wantCode = tech ? Math.max(1, Math.round(body.length / 4)) : 0;
  if (code.length < wantCode) problems.push({ code: 'no-code', detail: `tema técnico con ${code.length} diapositivas de código (al menos ${wantCode})` });
  if (body.length >= 5 && kinds.size < 3) problems.push({ code: 'few-kinds', detail: `solo ${kinds.size} tipos de diapositiva` });
  if (noNotes.length > n * 0.2) problems.push({ code: 'notes-missing', slides: noNotes, detail: `${noNotes.length} sin notas` });
  if (off.length) problems.push({ code: 'notes-off', slides: off, detail: `${off.length} con notas de otra diapositiva` });
  if (empty.length) problems.push({ code: 'empty', slides: empty.map(x => x.i), detail: `${empty.length} vacías` });
  const W = { 'all-lists': 25, 'thin-lists': 15, 'no-code': 25, 'few-kinds': 10, 'notes-missing': 10, 'notes-off': 10, empty: 15 };
  const score = Math.max(0, 100 - problems.reduce((s, p) => s + W[p.code], 0));
  return { score, problems, stats: { slides: n, kinds: [...kinds], lists: lists.length, code: code.length, technical: tech } };
}
// The slides worth making again: the thin lists, the empty ones, and — when lists are too many or code is missing —
// the lists, up to half of the deck.
export function weakSlides(q, specs) {
  const set = new Set();
  for (const p of q.problems) if (['thin-lists', 'empty'].includes(p.code)) p.slides.forEach(i => set.add(i));
  if (q.problems.some(p => p.code === 'all-lists' || p.code === 'no-code' || p.code === 'few-kinds')) specs.forEach((sp, i) => { if (sp.kind === 'bullets') set.add(i); });
  return [...set].sort((a, b) => a - b).slice(0, Math.max(3, Math.ceil(specs.length / 2)));
}
