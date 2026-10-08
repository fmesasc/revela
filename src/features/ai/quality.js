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

// All the words of a slide (title, points, cards, columns), to compare slides; and how much two sets share (of the smaller).
const listOf = v => (Array.isArray(v) ? v : []);
const contentWords = sp => new Set([sp.title, sp.statement, ...bulletsOf(sp), ...listOf(sp.steps).flatMap(s => [s?.title, s?.text, s?.label]), ...listOf(sp.items).flatMap(s => (s && typeof s === 'object' ? [s.title, s.text] : [s])),
  ...listOf(sp.columns).flatMap(c => [c?.heading, ...listOf(c?.bullets)])].map(str).join(' ').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^\p{L}\p{N}]+/u).filter(w => w.length >= 5));
const overlap = (a, b) => { let n = 0; for (const w of a) if (b.has(w)) n++; return n / Math.max(1, Math.min(a.size, b.size)); };

// Forecasts, projections, estimates: figures about what hasn't happened.
const FORECAST = /proyecc|previsi|pron[oó]stic|forecast|projec|estimaci|estimat|expected|esperad|prevista|outlook/i;
// The amounts a text says — «2,4 M€» and «2.400.000» are the same; «12 %» is 12 —, as numbers.
export function amounts(text) {
  const out = [];
  for (const [, n, unit] of str(text).matchAll(/(\d[\d.,\s]*\d|\d)\s*(millones|millón|million|mill\.?|mil\b|M\b|k\b|K\b|bn|billion)?/g)) {
    let t = n.replace(/\s/g, '');
    // (A dot or comma followed by exactly three digits groups thousands; otherwise it is the decimal point.)
    t = /^\d{1,3}([.,]\d{3})+$/.test(t) ? t.replace(/[.,]/g, '') : t.replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.');
    let v = parseFloat(t); if (!Number.isFinite(v)) continue;
    const u = (unit || '').toLowerCase();
    if (/^(millones|millón|million|mill|m)/.test(u)) v *= 1e6; else if (u === 'mil' || u === 'k') v *= 1e3; else if (/^(bn|billion)/.test(u)) v *= 1e9;
    out.push(v);
  }
  return out;
}
// → { score (0-100), problems: [{ code, slides?: [i], detail }], stats }
// problems' codes: all-lists, thin-lists, no-code, few-kinds, notes-missing, notes-off, empty.
// sourced: the person gave data (a document, the research) — figures may come from it; images: pictures were asked for.
// given: that data, as text — a forecast's figures are checked against it.
export function deckQuality(specs, { topic = '', sourced = false, images = false, given = '' } = {}) {
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
  // Figures with no data behind them (none given) and no source said: invented. A placeholder for the person's own
  // («[ventas]») is fine, and so are figures that say where they come from (or that they are an example).
  const hasFigure = v => /\d/.test(str(v)) && !/\[[^\]]+\]/.test(str(v));
  // («Internal data», «company figures»: a source the model can't have when none was given — the figure is invented.)
  const ownData = /intern|interno|propi|compañ|company|empresa|organi[sz]a|corporat|nuestr|\bour\b|objetivo|target|meta/i;
  // («Example data» on a claim about the world, not a tutorial's dataset: invented too.)
  const example = /ejemplo|example|exemple|illustrat|ilustrativ|hipot[eé]tic|hypothetic/i;
  const unbacked = sp => !str(sp.source) || ownData.test(sp.source) || (!tech && example.test(sp.source));
  const figures = sp => (sp.kind === 'stats' && (sp.stats || []).some(s => hasFigure(s.value))) || (sp.kind === 'chart' && (sp.chart?.values || []).length > 0);
  // (With data given, a forecast is still the model's: «Proyección T4: 3,1 M€» from a T3 of 2,4 — unless its figures are
  // the person's own.)
  const forecast = sp => FORECAST.test([sp.title, sp.source, sp.chart?.series_name, ...(sp.chart?.labels || []), ...(sp.stats || []).map(s => s.label)].map(str).join(' '));
  // (Theirs, or worked out from theirs: a difference, a sum, a ratio, a percentage change — 2,6 − 2,4 M€ = 200.000.)
  const base = amounts(given).slice(0, 40), known = [...base, ...base.flatMap(a => base.flatMap(b => (a === b ? [] : [a - b, b - a, a + b, a / b * 100, (a - b) / b * 100, a / b])))];
  const backed = v => known.some(k => Math.abs(Math.abs(k) - Math.abs(v)) <= Math.abs(v) * 0.01 + 0.05);
  const ownFigures = sp => [...(sp.kind === 'stats' ? (sp.stats || []).filter(s => hasFigure(s.value)).flatMap(s => amounts(s.value)) : []), ...(sp.kind === 'chart' ? (sp.chart?.values || []).map(Number) : []),
    ...bulletsOf(sp).filter(hasFigure).flatMap(amounts)].filter(v => Number.isFinite(v) && Math.abs(v) >= 10 && !(v >= 1900 && v <= 2100));   // (not «T4» nor a year)
  // (And with data given, figures said to be «internal» or «an example» — a thesis's validation chart «ejemplo
  // ilustrativo», an error of 7,3 % nobody gave — are invented unless they are the person's.)
  // (A series over «Año 1, Año 2…», «Month 1…»: no real data has such labels — made up to draw a trend.)
  // (And a pie of round shares adding up to 100 — «Invasions 40 %, Economy 30 %…» —: weights nobody measured.)
  const roundPie = sp => sp.kind === 'chart' && /pie|doughnut/.test(str(sp.chart?.type)) && (sp.chart?.values || []).length >= 3
    && sp.chart.values.every(v => +v % 5 === 0) && Math.abs(sp.chart.values.reduce((a, v) => a + +v, 0) - 100) < 1;
  const generic = sp => roundPie(sp) || sp.kind === 'chart' && (sp.chart?.labels || []).length >= 3 && sp.chart.labels.every(l => /^\s*(año|year|mes|month|semana|week|d[ií]a|day|periodo|period|trimestre|quarter|any|mois|jahr)\s*\d+\s*$/i.test(str(l)));
  const ownCase = sp => !str(sp.source) || ownData.test(sp.source) || example.test(sp.source);
  const invented = body.filter(x => generic(x.sp) || (!sourced && unbacked(x.sp) && figures(x.sp)) || (sourced && (forecast(x.sp) || (str(given) && figures(x.sp) && ownCase(x.sp) && !tech)) && ownFigures(x.sp).some(v => !backed(v))));
  // The same thing twice — a lesson's four steps of adding fractions on two slides in a row —: its words, mostly the
  // ones of an earlier slide.
  const said = body.map(x => ({ i: x.i, w: contentWords(x.sp) }));
  const repeated = said.filter((a, k) => a.w.size >= 6 && said.slice(0, k).some(b => b.w.size >= 6 && overlap(a.w, b.w) >= 0.6))
    .map(a => ({ i: a.i, of: said.find(b => b.i < a.i && b.w.size >= 6 && overlap(a.w, b.w) >= 0.6).i }));
  const noPicture = images ? [] : body.filter(x => x.sp.kind === 'image' && !x.sp.figure);
  const offCode = tech ? [] : code;
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
  if (invented.length) problems.push({ code: 'invented-figures', slides: invented.map(x => x.i), detail: `${invented.length} con cifras sin datos que las respalden (inventadas)` });
  if (noPicture.length) problems.push({ code: 'no-picture', slides: noPicture.map(x => x.i), detail: `${noPicture.length} de imagen sin imagen` });
  if (offCode.length) problems.push({ code: 'off-code', slides: offCode.map(x => x.i), detail: `${offCode.length} con código en un tema que no es de programación` });
  if (repeated.length) problems.push({ code: 'repeated', slides: repeated.map(x => x.i), detail: `${repeated.length} que repiten otra (${repeated.map(x => `${x.i + 1} ≈ ${x.of + 1}`).join(', ')}): decir algo nuevo` });
  const W = { repeated: 15, 'all-lists': 25, 'thin-lists': 15, 'no-code': 25, 'few-kinds': 10, 'notes-missing': 10, 'notes-off': 10, empty: 15, 'invented-figures': 20, 'no-picture': 10, 'off-code': 10 };
  const score = Math.max(0, 100 - problems.reduce((s, p) => s + W[p.code], 0));
  return { score, problems, stats: { slides: n, kinds: [...kinds], lists: lists.length, code: code.length, technical: tech } };
}
// The slides worth making again: the thin lists, the empty ones, and — when lists are too many or code is missing —
// the lists, up to half of the deck.
export function weakSlides(q, specs) {
  const set = new Set();
  for (const p of q.problems) if (['thin-lists', 'empty', 'invented-figures', 'no-picture', 'off-code', 'repeated'].includes(p.code)) p.slides.forEach(i => set.add(i));
  if (q.problems.some(p => p.code === 'all-lists' || p.code === 'no-code' || p.code === 'few-kinds')) specs.forEach((sp, i) => { if (sp.kind === 'bullets') set.add(i); });
  return [...set].sort((a, b) => a - b).slice(0, Math.max(3, Math.ceil(specs.length / 2)));
}
