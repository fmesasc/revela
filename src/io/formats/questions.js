// Question banks in and out: Moodle XML, GIFT (Moodle's text format), Kahoot's spreadsheet and a simple CSV.
// Coming in, each question becomes the props of a poll (features/live/quizslides.js puts each on its own slide);
// what doesn't fit Revela's quizzes and activities is skipped, saying why. Going out, the presentation's quizzes and
// activities are written in the format chosen, and what that format can't hold is listed as left out.
//   quiz   options, correct: [indices] (any of them counts as right) → multichoice / truefalse
//   match  "left = right" → matching        gaps "text [a|b]" → shortanswer (one gap), cloze (several)
//   number answer (+ tolerance) → numerical
// Everything here runs in the browser and nothing leaves it.

import { t } from '../../i18n/index.js';
import { readXlsx } from './xlsx-import.js';
import { JSZIP, loadScript } from '../../core/vendor.js';

const clean = s => String(s ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
// HTML (Moodle's question texts) as plain text: paragraphs and line breaks as spaces, entities decoded; and whether
// it had a picture, which isn't brought in (Moodle keeps it in its own files: @@PLUGINFILE@@).
export function htmlText(html) {
  const s = String(html ?? ''), img = /<img\b|@@PLUGINFILE@@/i.test(s);
  if (!/[<&]/.test(s)) return { text: clean(s), img };
  const doc = new DOMParser().parseFromString(s.replace(/<(br|\/p|\/div|\/li|\/h\d)\b[^>]*>/gi, ' $&'), 'text/html');
  return { text: clean(doc.body.textContent), img };
}
// The same shuffle every time for the same question (a CSV row has its right answer first: it mustn't stay there).
function shuffled(list, key) {
  let seed = 7; for (const ch of String(key)) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const a = list.slice();
  for (let k = a.length - 1; k > 0; k--) { seed = (seed * 1103515245 + 12345) >>> 0; const j = Math.floor(seed / 4294967296 * (k + 1)); [a[k], a[j]] = [a[j], a[k]]; }
  return a;
}
const TIMES = [10, 20, 30, 45, 60, 90];                                   // (the poll editor's choices)
const nearTime = s => (+s > 0 ? TIMES.reduce((a, b) => (Math.abs(b - +s) < Math.abs(a - +s) ? b : a)) : 20);
const MAX_OPTS = 6;                                                        // (the phones' six colours)
// A gap's answers inside «[…|…]»: without the characters that would end it.
const gapAlt = s => clean(s).replace(/[[\]|]/g, ' ').trim();

// ---- What a question becomes -------------------------------------------------------------------------------------
// Each builder → { poll, notes, warn: [] } or { skip: why }.
function choiceQ(question, opts, notes = '') {
  const warn = [];
  let o = opts.map(x => ({ text: clean(x.text), right: !!x.right })).filter(x => x.text);
  if (o.length > MAX_OPTS) {                                               // (the wrong ones go first)
    const keep = [...o.filter(x => x.right), ...o.filter(x => !x.right)].slice(0, MAX_OPTS); o = o.filter(x => keep.includes(x));
    warn.push(t('Solo caben {n} opciones: se han quitado las demás.').replace('{n}', MAX_OPTS));
  }
  if (o.length < 2) return { skip: t('Tiene menos de dos opciones.') };
  const correct = o.map((x, i) => (x.right ? i : -1)).filter(i => i >= 0);
  if (!correct.length) return { skip: t('No tiene ninguna respuesta correcta.') };
  if (correct.length > 1) warn.push(t('Varias respuestas correctas: en Revela vale elegir cualquiera de ellas.'));
  return { poll: { kind: 'quiz', question, options: o.map(x => x.text), correct, time: 20 }, notes: notes || `${question} → ${correct.map(i => o[i].text).join(' / ')}`, warn };
}
const trueFalseQ = (question, isTrue, notes) => choiceQ(question, [{ text: t('Verdadero'), right: isTrue }, { text: t('Falso'), right: !isTrue }], notes);
function matchQ(question, pairs, notes = '') {
  const o = pairs.map(([a, b]) => [clean(a).replace(/=/g, '-'), clean(b).replace(/=/g, '-')]).filter(([a, b]) => a && b);
  if (o.length < 2) return { skip: t('Tiene menos de dos parejas.') };
  return { poll: { kind: 'match', question, options: o.map(([a, b]) => `${a} = ${b}`) }, notes: notes || question, warn: [] };
}
// A short answer: the question and a gap after it — or the gap inside the sentence (before + gap + after).
function shortQ(question, answers, notes = '', after = null) {
  const alts = [...new Set(answers.map(gapAlt).filter(Boolean))];
  if (!alts.length) return { skip: t('No tiene ninguna respuesta correcta.') };
  const gap = `[${alts.join('|')}]`;
  const poll = after == null ? { kind: 'gaps', question, text: gap, options: [] }
    : { kind: 'gaps', question: t('Completa el texto'), text: clean(`${question} ${gap} ${after}`).replace(/ ([.,;:!?)])/g, '$1'), options: [] };
  return { poll, notes: notes || `${question} → ${alts.join(' / ')}`, warn: [] };
}
function numberQ(question, value, tol = 0, unit = '', notes = '') {
  const v = +value; if (!Number.isFinite(v)) return { skip: t('No tiene ninguna respuesta correcta.') };
  const span = Math.max(Math.abs(v) * 0.5, Math.abs(+tol || 0) * 5, 10), round = x => +x.toPrecision(3);
  return { poll: { kind: 'number', question, answer: v, tolerance: Math.abs(+tol || 0), min: round(v - span), max: round(v + span), unit: clean(unit).slice(0, 12), options: [] },
    notes: notes || `${question} → ${v}${unit ? ' ' + unit : ''}`, warn: [] };
}
// The list the dialog shows: what came in (with any note) and what didn't, and why.
function collect() {
  const items = [], skipped = [];
  return { items, skipped, add(name, r, extra = []) {
    if (r.skip) skipped.push({ name: clean(name).slice(0, 120) || '?', why: r.skip });
    else items.push({ ...r, warn: [...r.warn, ...extra] });
  } };
}
const IMG = () => t('La imagen de la pregunta no se ha importado.');

// ---- Moodle XML ------------------------------------------------------------------------------------------------------
const kids = (el, tag) => [...(el?.children || [])].filter(c => c.localName === tag);
const kid = (el, tag) => kids(el, tag)[0] || null;
const textIn = el => kid(el, 'text')?.textContent ?? '';
export function parseMoodleXML(xml) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror') || doc.documentElement.localName !== 'quiz') throw new Error(t('No es un archivo XML de Moodle válido.'));
  const out = collect();
  for (const q of kids(doc.documentElement, 'question')) {
    const type = q.getAttribute('type') || '';
    if (type === 'category') continue;
    const name = clean(textIn(kid(q, 'name'))), qt = htmlText(textIn(kid(q, 'questiontext'))), stem = qt.text || name;
    const notes = htmlText(textIn(kid(q, 'generalfeedback'))).text, warn = qt.img ? [IMG()] : [];
    const label = stem || name;
    const answers = kids(q, 'answer').map(a => ({ text: htmlText(textIn(a)).text, raw: textIn(a), fraction: +(a.getAttribute('fraction') || 0), el: a }));
    if (type === 'multichoice') {
      const single = clean(kid(q, 'single')?.textContent) !== 'false', best = Math.max(0, ...answers.map(a => a.fraction));
      out.add(label, choiceQ(stem, answers.map(a => ({ text: a.text, right: single ? a.fraction > 0 && a.fraction === best : a.fraction > 0 })), notes), warn);
    } else if (type === 'truefalse') {
      // (Moodle writes «true» and «false», true first; other tools, the words in their language.)
      const right = answers.find(a => a.fraction > 0), said = clean(right?.raw).toLowerCase();
      const isTrue = /^(true|verdadero|vrai|wahr|vero|verdadeiro|cert|waar|egia)$/.test(said) || (!/^(false|falso|faux|falsch|fals|onwaar|gezurra)$/.test(said) && right === answers[0]);
      out.add(label, right ? trueFalseQ(stem, isTrue, notes) : { skip: t('No tiene ninguna respuesta correcta.') }, warn);
    } else if (type === 'matching') {
      const subs = kids(q, 'subquestion').map(s => [htmlText(textIn(s)).text, htmlText(textIn(kid(s, 'answer'))).text]);
      const extra = subs.filter(([a]) => !a).length;
      out.add(label, matchQ(stem, subs.filter(([a]) => a), notes), extra ? [...warn, t('Las respuestas de más (distractores) no se han importado.')] : warn);
    } else if (type === 'shortanswer') {
      const full = answers.filter(a => a.fraction >= 100).map(a => a.text), wild = full.filter(a => a.includes('*'));
      const w = wild.length ? [...warn, t('Las respuestas con comodín (*) no se han importado.')] : warn, ok = full.filter(a => !a.includes('*'));
      const blank = /_{3,}/.exec(stem);
      out.add(label, blank ? shortQ(stem.slice(0, blank.index).trim(), ok, notes, stem.slice(blank.index + blank[0].length).trim()) : shortQ(stem, ok, notes), w);
    } else if (type === 'numerical') {
      const a = answers.find(x => x.fraction >= 100) || answers[0], unit = kids(kid(q, 'units'), 'unit').find(u => +(kid(u, 'multiplier')?.textContent || 1) === 1);
      out.add(label, a ? numberQ(stem, a.text, clean(kid(a.el, 'tolerance')?.textContent), clean(textIn(unit) || kid(unit, 'unit_name')?.textContent || ''), notes) : { skip: t('No tiene ninguna respuesta correcta.') }, warn);
    } else if (type === 'cloze') {
      out.add(label, clozeQ(qt.text, name, notes), warn);
    } else if (type === 'essay') out.add(label, { skip: t('Respuesta larga: no tiene una respuesta que corregir sola.') });
    else if (type === 'description') out.add(label, { skip: t('Es un texto informativo, no una pregunta.') });
    else out.add(label, { skip: t('Tipo de pregunta que Revela no tiene: {type}.').replace('{type}', type || '?') });
  }
  return out;
}
// Cloze (Moodle's «embedded answers»): only when every gap is a short answer or a number, as a text with gaps.
function clozeQ(text, name, notes) {
  const re = /\{(\d*):([A-Z_]+):((?:\\.|[^}])*)\}/g;
  if (!re.test(text)) return { skip: t('No tiene ninguna respuesta correcta.') };
  let bad = false;
  const body = text.replace(re, (m, w, type, list) => {
    if (!/^(SHORTANSWER|SA|MW|SHORTANSWER_C|SAC|MWC|NUMERICAL|NM)$/.test(type)) { bad = true; return m; }
    const alts = list.split(/~(?=(?:%\d+%|=))/).filter(x => /^(=|%100%)/.test(x)).map(x => x.replace(/^(=|%100%)/, '').split('#')[0].replace(/:[\d.]+$/, ''));
    if (!alts.length) bad = true;
    return `[${alts.map(gapAlt).join('|')}]`;
  });
  if (bad) return { skip: t('Respuestas incrustadas (cloze) con menús u opciones: Revela solo trae las de escribir la respuesta.') };
  return { poll: { kind: 'gaps', question: name || t('Completa el texto'), text: clean(body), options: [] }, notes: notes || name, warn: [] };
}

// ---- GIFT ----------------------------------------------------------------------------------------------------------
// Escaped characters (\~ \= \# \{ \} \: \\ \n) are swapped for private-use ones while parsing, and back at the end.
const ESC = { '~': '\ue001', '=': '\ue002', '#': '\ue003', '{': '\ue004', '}': '\ue005', ':': '\ue006', '\\': '\ue007', n: '\n' };
const UNESC = Object.fromEntries(Object.entries(ESC).filter(([k]) => k !== 'n').map(([k, v]) => [v, k]));
const unesc = s => String(s).replace(/[\ue001-\ue007]/g, c => UNESC[c]);
const giftText = s => { let x = unesc(s).trim(); const f = /^\[(html|moodle|markdown|plain)\]/i.exec(x); if (f) x = x.slice(f[0].length);
  return f && /html/i.test(f[1]) || /<[a-z][^>]*>/i.test(x) ? htmlText(x) : { text: clean(x), img: false }; };
export function parseGIFT(src) {
  const out = collect();
  const text = String(src).replace(/^\ufeff/, '').replace(/\r\n?/g, '\n').replace(/\\([~=#{}:\\n])/g, (m, c) => ESC[c])
    .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  for (let block of text.split(/\n\s*\n/)) {
    block = block.trim(); if (!block || /^\$CATEGORY:/i.test(block)) continue;
    let title = ''; const tm = /^::([\s\S]*?)::/.exec(block); if (tm) { title = clean(unesc(tm[1])); block = block.slice(tm[0].length); }
    const open = block.indexOf('{'), close = block.lastIndexOf('}');
    if (open < 0 || close < open) { out.add(title || giftText(block).text, { skip: t('Es un texto informativo, no una pregunta.') }); continue; }
    const before = giftText(block.slice(0, open)), after = giftText(block.slice(close + 1)).text, ans = block.slice(open + 1, close).trim();
    const label = before.text || title, warn = before.img ? [IMG()] : [];
    const stem = after ? clean(`${before.text} ___ ${after}`) : before.text;
    const general = /####([\s\S]*)$/.exec(ans), notes = general ? giftText(general[1]).text : '', body = general ? ans.slice(0, general.index).trim() : ans;
    if (!body) { out.add(label, { skip: t('Respuesta larga: no tiene una respuesta que corregir sola.') }); continue; }
    const tf = /^(T|TRUE|F|FALSE)\b/i.exec(body);
    if (tf) { out.add(label, trueFalseQ(stem, /^t/i.test(tf[1]), notes), warn); continue; }
    if (body[0] === '#') {                                     // numerical: #value:tolerance, #min..max, or several =#…
      const first = body.slice(1).split(/(?=[=~])/).map(x => x.replace(/^=(%100%)?/, '')).find(x => x && x[0] !== '~') || '';
      const v = first.split('#')[0].trim(), range = /^(-?[\d.]+)\.\.(-?[\d.]+)$/.exec(v), tol = /^(-?[\d.eE+-]+):([\d.]+)$/.exec(v);
      out.add(label, range ? numberQ(stem, (+range[1] + +range[2]) / 2, (+range[2] - +range[1]) / 2, '', notes) : tol ? numberQ(stem, tol[1], tol[2], '', notes) : numberQ(stem, v, 0, '', notes), warn);
      continue;
    }
    // Answers: =right ~wrong (each with its #feedback, dropped), ~%50%partly right.
    const parts = body.split(/(?=[=~])/).map(x => x.trim()).filter(Boolean).map(x => {
      const right = x[0] === '=', w = /^[=~]%(-?[\d.]+)%/.exec(x), txt = x.replace(/^[=~](%-?[\d.]+%)?/, '').split('#')[0];
      return { right: w ? +w[1] > 0 : right, full: w ? +w[1] >= 100 : right, txt };
    });
    if (parts.some(p => p.txt.includes('->'))) {
      out.add(label, matchQ(stem, parts.filter(p => p.txt.includes('->')).map(p => { const [a, ...b] = p.txt.split('->'); return [unesc(a), unesc(b.join('->'))]; }), notes), warn);
    } else if (body.includes('~')) {
      out.add(label, choiceQ(stem, parts.map(p => ({ text: giftText(p.txt).text, right: p.right })), notes), warn);
    } else out.add(label, after ? shortQ(before.text, parts.filter(p => p.full).map(p => giftText(p.txt).text), notes, after) : shortQ(stem, parts.filter(p => p.full).map(p => giftText(p.txt).text), notes), warn);
  }
  return out;
}

// ---- CSV and spreadsheets: question, right answer, wrong answers… -----------------------------------------------------
export function parseCSVRows(text) {
  const src = String(text).replace(/^\ufeff/, ''), first = src.split('\n')[0] || '';
  const count = c => first.replace(/"[^"]*"/g, '').split(c).length - 1;
  const sep = ['\t', ';', ','].reduce((a, b) => (count(b) > count(a) ? b : a));
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) { if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; continue; }
    if (c === '"' && !cell.trim()) { q = true; cell = ''; } else if (c === sep) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && src[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.map(r => r.map(clean)).filter(r => r.some(Boolean));
}
const HEAD = /^(pregunta|preguntas|enunciado|question|questions|frage|domanda|pergunta|questi[oó]|vraag|galdera|سؤال)$/i;
export function rowsToQuestions(rows) {
  const out = collect();
  if (rows[0] && (HEAD.test(rows[0][0]) || /correct|richtig|corret|bona|juist|zuzen|صحيح/i.test(rows[0][1] || ''))) rows = rows.slice(1);
  for (const r of rows) {
    const [question, right = '', ...wrong] = r, w = wrong.filter(Boolean);
    if (!question) continue;
    if (!right) { out.add(question, { skip: t('No tiene ninguna respuesta correcta.') }); continue; }
    out.add(question, w.length ? choiceQ(question, shuffled([{ text: right, right: true }, ...w.map(text => ({ text, right: false }))], question))
      : shortQ(question, right.split('|')));
  }
  return out;
}
export const parseCSV = text => rowsToQuestions(parseCSVRows(text));

// ---- Kahoot's spreadsheet ----------------------------------------------------------------------------------------------
// Its template has a few rows of title and instructions, then the table: Question · Answer 1…4 · Time limit (sec) ·
// Correct answer(s) («1» or «1,3»). Found by its headings, wherever they are. A sheet without them: the simple table.
export function parseKahootRows(rows) {
  const h = rows.findIndex(r => r.some(c => /^question\b/i.test(c)) && r.some(c => /^answer\s*1\b/i.test(c)));
  if (h < 0) return null;
  const head = rows[h], col = re => head.findIndex(c => re.test(c)), qc = col(/^question\b/i), tc = col(/^time/i), cc = col(/^correct/i);
  const ac = head.map((c, i) => [i, /^answer\s*(\d+)/i.exec(c)]).filter(([, m]) => m).sort((a, b) => +a[1][1] - +b[1][1]).map(([i]) => i);
  const out = collect();
  for (const r of rows.slice(h + 1)) {
    const question = clean(r[qc]); if (!question) continue;
    const right = String(r[cc] ?? '').split(/[^\d]+/).filter(Boolean).map(n => +n - 1);
    const res = choiceQ(question, ac.map((i, k) => ({ text: r[i], right: right.includes(k) })));
    if (res.poll) res.poll.time = nearTime(r[tc]);
    out.add(question, res);
  }
  return out;
}
export async function parseXlsxQuestions(data) {
  const sheets = await readXlsx(data);
  for (const s of sheets) { const k = parseKahootRows(s.rows); if (k) return k; }
  return rowsToQuestions(sheets[0]?.rows || []);
}

// A file of any of them → { items, skipped, format }.
export const QUESTION_ACCEPT = '.xml,.gift,.txt,.csv,.tsv,.xlsx,text/xml,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export async function readQuestionFile(file) {
  const name = file.name || '';
  if (/\.xlsx$/i.test(name)) return { ...(await parseXlsxQuestions(await file.arrayBuffer())), format: 'Kahoot / Excel' };
  const text = await file.text();
  if (/\.xml$/i.test(name) || /^\s*(<\?xml[^>]*>\s*)?<quiz[\s>]/.test(text)) return { ...parseMoodleXML(text), format: 'Moodle XML' };
  if (/\.(csv|tsv)$/i.test(name) || !/\{[\s\S]*\}/.test(text)) return { ...parseCSV(text), format: 'CSV' };
  return { ...parseGIFT(text), format: 'GIFT' };
}

// ---- Out --------------------------------------------------------------------------------------------------------------
// The presentation's quizzes and activities, in order, with their slide number.
export function deckQuestions(deck) {
  const out = [];
  deck.slides.forEach((s, i) => (s.blocks || []).forEach(b => { if (b.type === 'poll' && (['quiz', 'match', 'gaps', 'order', 'sort', 'label'].includes(b.kind) || (b.kind === 'number' && isFinite(parseFloat(b.answer))))) out.push({ poll: b, slide: i + 1 }); }));
  return out;
}
const gapsOf = p => [...String(p.text || '').matchAll(/\[([^\]]+)\]/g)].map(m => ({ at: m.index, end: m.index + m[0].length, alts: m[1].split('|').map(clean).filter(Boolean) }));
const pairsOf = p => (p.options || []).map(l => { const x = String(l).split('='); return [clean(x[0]), clean(x.slice(1).join('='))]; }).filter(([a, b]) => a && b);
const NOT_IN = () => t('Este tipo de actividad no existe en ese formato.');
const nameOf = (x, i) => `${String(i + 1).padStart(2, '0')} ${clean(x.poll.question).slice(0, 60)}`;
// The quiz's text when it is a gaps activity with a single gap: the sentence, and the gap's answers.
const oneGap = p => { const g = gapsOf(p); return g.length === 1 ? { before: clean(String(p.text).slice(0, g[0].at)), after: clean(String(p.text).slice(g[0].end)), alts: g[0].alts } : null; };
const quizQ = p => clean(p.question);
const gapQ = (p, g) => g.before || quizQ(p);           // (the sentence the gap is in, or else the question)

const giftEsc = s => clean(s).replace(/[~=#{}:\\]/g, '\\$&');
export function toGIFT(list) {
  const out = [], left = [];
  list.forEach((x, i) => {
    const p = x.poll, title = `::${giftEsc(nameOf(x, i))}::`;
    if (p.kind === 'quiz') { const ok = p.correct?.length ? p.correct : [0];
      out.push(`${title}${giftEsc(quizQ(p))} {\n${(p.options || []).map((o, k) => `\t${ok.includes(k) ? '=' : '~'}${giftEsc(o)}`).join('\n')}\n}`); }
    else if (p.kind === 'match') out.push(`${title}${giftEsc(quizQ(p))} {\n${pairsOf(p).map(([a, b]) => `\t=${giftEsc(a)} -> ${giftEsc(b)}`).join('\n')}\n}`);
    else if (p.kind === 'number') out.push(`${title}${giftEsc(quizQ(p))} {#${+p.answer}${+p.tolerance ? ':' + +p.tolerance : ''}}`);
    else if (p.kind === 'gaps' && oneGap(p)) { const g = oneGap(p), alts = g.alts.map(a => `=${giftEsc(a)}`).join(' ');
      out.push(g.after ? `${title}${giftEsc(gapQ(p, g))} {${alts}} ${giftEsc(g.after)}` : `${title}${giftEsc(gapQ(p, g))} {${alts}}`); }
    else left.push({ name: nameOf(x, i), why: p.kind === 'gaps' ? t('GIFT solo admite un hueco por pregunta.') : NOT_IN() });
  });
  return { text: out.length ? `// ${t('Preguntas exportadas desde Revela')}\n\n${out.join('\n\n')}\n` : '', count: out.length, left };
}

const xmlEsc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const htmlField = (tag, s, extra = '') => `<${tag} format="html"${extra}><text><![CDATA[<p>${xmlEsc(s)}</p>]]></text></${tag}>`;
const plainField = (tag, s, extra = '') => `<${tag}${extra}><text>${xmlEsc(s)}</text></${tag}>`;
export function toMoodleXML(list) {
  const out = [], left = [];
  list.forEach((x, i) => {
    const p = x.poll, head = (type, text) => `  <question type="${type}">\n    <name><text>${xmlEsc(nameOf(x, i))}</text></name>\n    ${htmlField('questiontext', text)}\n    <defaultgrade>1</defaultgrade>\n    <penalty>0</penalty>\n    <hidden>0</hidden>\n`;
    if (p.kind === 'quiz') { const ok = p.correct?.length ? p.correct : [0];
      out.push(`${head('multichoice', quizQ(p))}    <single>true</single>\n    <shuffleanswers>true</shuffleanswers>\n    <answernumbering>abc</answernumbering>\n${(p.options || []).map((o, k) => `    ${htmlField('answer', o, ` fraction="${ok.includes(k) ? 100 : 0}"`)}`).join('\n')}\n  </question>`); }
    else if (p.kind === 'match') out.push(`${head('matching', quizQ(p))}    <shuffleanswers>true</shuffleanswers>\n${pairsOf(p).map(([a, b]) => `    <subquestion format="html"><text><![CDATA[<p>${xmlEsc(a)}</p>]]></text><answer><text>${xmlEsc(b)}</text></answer></subquestion>`).join('\n')}\n  </question>`);
    else if (p.kind === 'number') out.push(`${head('numerical', quizQ(p))}    <answer fraction="100"><text>${+p.answer}</text><tolerance>${+p.tolerance || 0}</tolerance></answer>\n${p.unit ? `    <units><unit><multiplier>1</multiplier><unit_name>${xmlEsc(p.unit)}</unit_name></unit></units>\n` : ''}  </question>`);
    else if (p.kind === 'gaps' && gapsOf(p).length === 1 && !oneGap(p).after) { const g = oneGap(p);
      out.push(`${head('shortanswer', gapQ(p, g))}    <usecase>0</usecase>\n${g.alts.map(a => `    ${plainField('answer', a, ' fraction="100"')}`).join('\n')}\n  </question>`); }
    else if (p.kind === 'gaps' && gapsOf(p).length) {        // (several gaps, or one inside the sentence: Moodle's cloze)
      const cloze = s => String(s).replace(/[{}~=#\\]/g, c => '\\' + c);
      let body = '', last = 0; const src = String(p.text);
      for (const g of gapsOf(p)) { body += cloze(src.slice(last, g.at)) + `{1:SHORTANSWER:${g.alts.map(a => '=' + cloze(a)).join('~')}}`; last = g.end; }
      body += cloze(src.slice(last));
      out.push(`  <question type="cloze">\n    <name><text>${xmlEsc(nameOf(x, i))}</text></name>\n    <questiontext format="html"><text><![CDATA[<p>${xmlEsc(quizQ(p))}</p><p>${xmlEsc(clean(body))}</p>]]></text></questiontext>\n    <penalty>0</penalty>\n    <hidden>0</hidden>\n  </question>`);
    } else left.push({ name: nameOf(x, i), why: NOT_IN() });
  });
  return { text: out.length ? `<?xml version="1.0" encoding="UTF-8"?>\n<quiz>\n${out.join('\n')}\n</quiz>\n` : '', count: out.length, left };
}

const csvCell = s => (/[",;\n]/.test(s) ? `"${String(s).replace(/"/g, '""')}"` : String(s));
export function toCSV(list) {
  const rows = [], left = [];
  list.forEach((x, i) => {
    const p = x.poll;
    if (p.kind === 'quiz') { const ok = p.correct?.length ? p.correct : [0], o = p.options || [];
      rows.push([quizQ(p), o[ok[0]] ?? '', ...o.filter((_, k) => !ok.includes(k))]);
      if (ok.length > 1) left.push({ name: nameOf(x, i), why: t('Solo va la primera respuesta correcta: el CSV tiene una por pregunta.') }); }
    else if (p.kind === 'gaps' && oneGap(p)) { const g = oneGap(p); rows.push([g.after ? clean(`${gapQ(p, g)} ___ ${g.after}`) : gapQ(p, g), g.alts.join('|')]); }
    else if (p.kind === 'number') rows.push([quizQ(p), String(+p.answer)]);
    else left.push({ name: nameOf(x, i), why: NOT_IN() });
  });
  const head = [t('Pregunta'), t('Correcta'), t('Incorrecta 1'), t('Incorrecta 2'), t('Incorrecta 3')];
  return { text: rows.length ? [head, ...rows].map(r => r.map(csvCell).join(',')).join('\n') + '\n' : '', count: rows.length, left };
}

// Kahoot's own template, as its importer reads it: the table's headings in row 8 (columns B to H), questions below.
export const KAHOOT_HEAD = ['Question - max 120 characters', 'Answer 1 - max 75 characters', 'Answer 2 - max 75 characters', 'Answer 3 - max 75 characters', 'Answer 4 - max 75 characters', 'Time limit (sec) – 5, 10, 20, 30, 60, 90, 120, or 240 secs', 'Correct answer(s) - choose at least one'];
const KAHOOT_TIMES = [5, 10, 20, 30, 60, 90, 120, 240];
export function kahootRows(list) {
  const rows = [], left = [];
  list.forEach((x, i) => {
    const p = x.poll, ok = p.correct?.length ? p.correct : [0], o = p.options || [];
    if (p.kind !== 'quiz') { left.push({ name: nameOf(x, i), why: NOT_IN() }); return; }
    // (Four answers at most: the right ones kept, then the first wrong ones.)
    const keep = o.map((_, k) => k).filter(k => ok.includes(k) || k < 4).sort((a, b) => (ok.includes(b) - ok.includes(a)) || a - b).slice(0, 4).sort((a, b) => a - b);
    const long = quizQ(p).length > 120 || keep.some(k => o[k].length > 75);
    if (keep.length < o.length || long) left.push({ name: nameOf(x, i), why: keep.length < o.length ? t('Kahoot admite 4 respuestas: se han quitado las demás.') : t('Texto acortado: Kahoot admite 120 caracteres en la pregunta y 75 en cada respuesta.'), partial: true });
    const time = KAHOOT_TIMES.reduce((a, b) => (Math.abs(b - (+p.time || 20)) < Math.abs(a - (+p.time || 20)) ? b : a));
    rows.push([quizQ(p).slice(0, 120), ...[0, 1, 2, 3].map(j => (keep[j] != null ? o[keep[j]].slice(0, 75) : '')), time, keep.map((k, j) => (ok.includes(k) ? j + 1 : 0)).filter(Boolean).join(',')]);
  });
  return { rows, count: rows.length, left };
}
export async function toKahootXlsx(list) {
  const { rows, count, left } = kahootRows(list);
  const JSZip = await loadScript(JSZIP, 'JSZip'), z = new JSZip(), ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const cell = (ref, v) => (typeof v === 'number' ? `<c r="${ref}"><v>${v}</v></c>` : v === '' ? '' : `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`);
  const line = (n, cells, from = 1) => `<row r="${n}">${cells.map((v, k) => cell(String.fromCharCode(64 + from + k) + n, v)).join('')}</row>`;
  const sheet = [line(1, ['Quiz template'], 2), line(3, ['Questions: 120 characters at most; answers: 75. Several right answers: their numbers separated by commas.'], 2),
    line(8, KAHOOT_HEAD, 2), ...rows.map((r, k) => line(9 + k, [k + 1, ...r]))].join('');
  z.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>');
  z.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
  z.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>`);
  z.file('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>');
  z.file('xl/worksheets/sheet1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="${ns}"><cols><col min="1" max="1" width="4" customWidth="1"/><col min="2" max="2" width="50" customWidth="1"/><col min="3" max="6" width="25" customWidth="1"/><col min="7" max="8" width="18" customWidth="1"/></cols><sheetData>${sheet}</sheetData></worksheet>`);
  const blob = count ? await z.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }) : null;
  return { blob, count, left };
}
