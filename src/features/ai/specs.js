// Slide specs as the model writes them, made usable: the kinds and fields it
// is told about (SPEC_DOC in authoring.js), read loosely — other names for the
// same kind or field, items as "Title: text" strings or objects, numbers as
// strings, text with typed bullets — and a better kind chosen when the content
// asks for it (bullets that are numbered steps, labelled points, two lists
// with headings, an agenda…), or two slides when it is too much for one —
// a list cut in half, or code too long to be read from the back of a room.
// And titles in sentence case where the language writes them so (sentenceCase).

import { outline, shapeOf, splitLabel, cleanLine, cleanTitle, itemsToBullets } from './richtext.js';
import { codeLang, cleanCode, cleanLatex } from './codeobj.js';

export const KINDS = ['title', 'section', 'bullets', 'two_columns', 'comparison', 'quote', 'key_idea', 'stats', 'steps', 'timeline', 'features', 'diagram', 'exercise', 'agenda', 'chart', 'table', 'image', 'code', 'math', 'closing'];
// Kinds laid out as a composition of their own under the title (not the layout's body placeholder).
export const RICH = ['comparison', 'key_idea', 'stats', 'steps', 'timeline', 'features', 'agenda'];

const ALIAS = {
  bullet: 'bullets', list: 'bullets', bulleted_list: 'bullets', text: 'bullets', content: 'bullets', title_and_content: 'bullets',
  cover: 'title', title_slide: 'title', intro: 'title', portada: 'title', end: 'closing', thanks: 'closing', thank_you: 'closing', outro: 'closing', cierre: 'closing',
  section_header: 'section', divider: 'section', header: 'section', chapter: 'section',
  columns: 'two_columns', two_column: 'two_columns', twocolumns: 'two_columns', two_col: 'two_columns',
  compare: 'comparison', versus: 'comparison', vs: 'comparison', pros_cons: 'comparison', pros_and_cons: 'comparison', before_after: 'comparison', comparativa: 'comparison',
  statement: 'key_idea', big_idea: 'key_idea', highlight: 'key_idea', key_message: 'key_idea', idea: 'key_idea', takeaway: 'key_idea', keyidea: 'key_idea', key_point: 'key_idea', idea_clave: 'key_idea',
  numbers: 'stats', kpi: 'stats', kpis: 'stats', metrics: 'stats', big_number: 'stats', big_numbers: 'stats', figures: 'stats', stat: 'stats', cifras: 'stats',
  process: 'steps', step: 'steps', how_to: 'steps', procedure: 'steps', numbered: 'steps', numbered_list: 'steps', pasos: 'steps', proceso: 'steps',
  cards: 'features', icons: 'features', icon_list: 'features', grid: 'features', benefits: 'features', feature: 'features', icon_cards: 'features', tarjetas: 'features',
  roadmap: 'timeline', history: 'timeline', milestones: 'timeline', chronology: 'timeline', cronologia: 'timeline',
  toc: 'agenda', contents: 'agenda', table_of_contents: 'agenda', index: 'agenda', indice: 'agenda',
  snippet: 'code', code_block: 'code', codigo: 'code', source: 'code', query: 'code', dax: 'code', sql: 'code',
  formula: 'math', equation: 'math', ecuacion: 'math', latex: 'math', maths: 'math',
  diagram: 'diagram', smartart: 'diagram', diagrama: 'diagram', cycle: 'diagram', loop: 'diagram', ciclo: 'diagram', cicle: 'diagram', hierarchy: 'diagram', org_chart: 'diagram',
  tree: 'diagram', jerarquia: 'diagram', venn: 'diagram', pyramid: 'diagram', piramide: 'diagram', funnel: 'diagram', radial: 'diagram', mind_map: 'diagram', matrix: 'diagram',
  practice: 'exercise', exercise_slide: 'exercise', challenge: 'exercise', ejercicio: 'exercise', exercici: 'exercise', problem: 'exercise', worked_problem: 'exercise', reto: 'exercise', repte: 'exercise',
  graph: 'chart', bar_chart: 'chart', picture: 'image', photo: 'image', image_text: 'image', quotation: 'quote', citation: 'quote', cita: 'quote',
};
const kindName = k => String(k ?? '').toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\s-]+/g, '_');
const kindOf = k => { const s = kindName(k); return KINDS.includes(s) ? s : ALIAS[s] || null; };

// Diagrams (render/diagrams.js): the layouts a slide may ask for, by the names a model uses.
export const DIAGRAM_TYPES = ['cycle', 'process', 'hierarchy', 'radial', 'venn', 'pyramid', 'funnel', 'matrix', 'target'];
const DIAGRAM_ALIAS = { circle: 'cycle', loop: 'cycle', ciclo: 'cycle', cicle: 'cycle', circular: 'cycle', flow: 'process', flowchart: 'process', chain: 'process', proceso: 'process', proces: 'process',
  tree: 'hierarchy', org: 'hierarchy', org_chart: 'hierarchy', organigram: 'hierarchy', organigrama: 'hierarchy', jerarquia: 'hierarchy', jerarquia_: 'hierarchy', hub: 'radial', mind_map: 'radial',
  mindmap: 'radial', star: 'radial', overlap: 'venn', sets: 'venn', quadrant: 'matrix', quadrants: 'matrix', piramide: 'pyramid', embudo: 'funnel', diana: 'target' };
const diagramType = v => { const s = kindName(v); return DIAGRAM_TYPES.includes(s) ? s : DIAGRAM_ALIAS[s] || null; };
// (A diagram's words are plain: no `code` marks, no markdown; short, or they shrink in their shapes.)
const plainWords = t => cleanLine(String(t ?? '')).replace(/`([^`]*)`/g, '$1').replace(/\*\*/g, '').trim().slice(0, 70);
// Its items as the diagram's outline: a line each, sub-items (a hierarchy's children, a node's detail) indented.
function diagramText(list, depth = 0) {
  return arr(list).slice(0, 8).flatMap(x => {
    if (Array.isArray(x)) return [];
    if (x && typeof x === 'object') {
      const text = plainWords(first(x, ['title', 'text', 'label', 'name', 'heading'])); if (!text) return [];
      const sub = plainWords(x.title != null || x.label != null || x.name != null ? first(x, ['text', 'sub', 'detail', 'description', 'desc']) : first(x, ['sub', 'detail', 'description', 'desc']));
      const kids = first(x, ['children', 'items', 'kids', 'nodes']);
      return ['  '.repeat(depth) + text, ...(sub && sub !== text ? ['  '.repeat(depth + 1) + sub] : []), ...(depth < 3 && kids ? diagramText(kids, depth + 1) : [])];
    }
    const t = plainWords(x); return t ? ['  '.repeat(depth) + t] : [];
  });
}
// An exercise's parts: a problem and its solution — {heading, bullets} (the solution may be code instead).
const part = v => (!v ? null : typeof v === 'string' || Array.isArray(v) ? { heading: '', bullets: bulletsOf(v) }
  : { heading: cleanLine(str(first(v, ['heading', 'title', 'label', 'name']))), bullets: bulletsOf(first(v, ['bullets', 'steps', 'items', 'points', 'list', 'text', 'content'])),
    ...((c => (c ? { code: { language: codeLang(v.language ?? v.code?.language) || 'plaintext', code: c } } : {}))(cleanCode(typeof v.code === 'string' ? v.code : v.code?.code))) });
// Two columns that are an exercise and its answer: «El problema» | «La solució (pas a pas)».
const SOLUTION = /soluci|solution|soluç|soluzion|resposta|respuesta|answer|resultat|resultado|ebazpen|oplossing|antwoord|r[ée]ponse|risposta/i;
const EXERCISE = /exerc|ejerc|pr[aà]ctic|problem|repte|reto|challenge|task|tarea|tasca|activit|ariketa|oefening|esercizi/i;
const str = v => (v == null ? '' : typeof v === 'object' ? '' : String(v));
const first = (o, keys) => { for (const k of keys) if (o?.[k] != null && o[k] !== '') return o[k]; return undefined; };
// A list: an array, or the lines of a string.
const arr = v => (Array.isArray(v) ? v.filter(x => x != null && x !== '') : typeof v === 'string' && v.trim() ? v.split(/\r?\n/).filter(l => l.trim()) : []);
const bulletsOf = v => arr(v).map(x => (Array.isArray(x) ? bulletsOf(x) : x && typeof x === 'object' ? str(first(x, ['text', 'title', 'label', 'name', 'heading'])) : str(x))).filter(x => (Array.isArray(x) ? x.length : x.trim()));
const num = v => { const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/[^\d,.\-−]/g, '').replace('−', '-').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.')); return Number.isFinite(n) ? n : null; };

// An item: { title, text, icon, value, label } from a string ("Title: text", "42 %: label") or an object.
const STEP = /^(paso|step|fase|phase|etapa|stage)\s*\d+$/i;
const VALUE = /^([-+−]?\s?[$€£]?\s?\d[\d.,]*\s?(?:%|‰|[kKMB]€?|M€|mil|millones|bn|x|×|€|\$|£|h|min|años|days|días)?\+?)\s*[:\-–—]?\s+(\S.*)$/;
function item(x) {
  if (x && typeof x === 'object' && !Array.isArray(x)) {
    const title = cleanTitle(cleanLine(str(first(x, ['title', 'heading', 'name', 'label', 'step', 'date', 'year', 'when']))));
    const text = cleanLine(str(first(x, ['text', 'description', 'desc', 'detail', 'details', 'body', 'summary', 'content', 'explanation', 'caption'])));
    const value = cleanLine(str(first(x, ['value', 'number', 'figure', 'stat', 'metric', 'amount'])));
    const label = cleanLine(str(first(x, ['label', 'caption', 'description', 'title', 'text', 'name'])));
    return { title, text, value, label, icon: str(x.icon) };
  }
  const s = cleanLine(Array.isArray(x) ? x.join(' ') : str(x)), lab = splitLabel(s), v = VALUE.exec(s);
  // ("Paso 2: Reducir el consumo": the label is only the number.)
  if (lab && STEP.test(lab[0])) return { title: lab[1], text: '', value: '', label: lab[1], icon: '' };
  return { title: lab ? cleanTitle(lab[0]) : '', text: lab ? lab[1].replace(/\*\*/g, '') : cleanTitle(s), value: v ? v[1].trim() : '', label: v ? v[2] : s, icon: '' };
}
const items = (spec, keys, max) => arr(first(spec, keys)).map(item).filter(i => i.title || i.text || i.value).slice(0, max);
const column = c => (!c ? null : typeof c === 'string' || Array.isArray(c) ? { heading: '', bullets: bulletsOf(c) }
  : { heading: cleanLine(str(first(c, ['heading', 'title', 'name', 'label']))), bullets: bulletsOf(first(c, ['bullets', 'items', 'points', 'list', 'text', 'content'])), icon: str(c.icon) });

// The spec cleaned: a known kind and the fields it needs (else a plainer kind).
// Gaps to fill in, in words: «[periodo_recuperacion_ROI]» → «[periodo recuperacion ROI]» (one long word overflowed a
// table's cell). Not in code nor formulas, where «_» means something.
const gapWords = (v, key = '') => (typeof v === 'string' ? v.replace(/\[([^\]\n]*_[^\]\n]*)\]/g, (m, g) => `[${g.replace(/_+/g, ' ').trim()}]`)
  : Array.isArray(v) ? v.map(x => gapWords(x, key)) : v && typeof v === 'object' && !/^(code|latex)$/.test(key) ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, /^(code|latex)$/.test(k) ? x : gapWords(x, k)])) : v);
export function normalizeSpec(raw) {
  raw = gapWords(raw);
  const sp = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : { kind: 'bullets', bullets: arr(raw) };
  let kind = kindOf(sp.kind ?? sp.type ?? sp.layout) || (sp.stats ? 'stats' : sp.steps ? 'steps' : sp.quote ? 'quote' : sp.chart ? 'chart' : sp.rows ? 'table' : sp.code ? 'code' : sp.latex ? 'math' : 'bullets');
  // ("formula" with code and no LaTeX: an Excel or DAX formula, as code.)
  if (kind === 'math' && !sp.latex && (sp.code || sp.from_image)) kind = 'code';
  const out = { kind, title: cleanLine(str(first(sp, ['title', 'heading', 'headline', 'name']))) };
  const sub = cleanLine(str(first(sp, ['subtitle', 'subheading', 'tagline', 'kicker']))); if (sub) out.subtitle = sub;
  for (const k of ['notes', 'icon', 'image_prompt', 'image_search', 'video_search', 'model_search', 'author']) if (sp[k] != null && typeof sp[k] !== 'object') out[k] = String(sp[k]);
  // (Where a slide's figures come from: shown under them, authoring.js sourceBlock.)
  if (sp.source != null && typeof sp.source !== 'object' && cleanLine(String(sp.source))) out.source = cleanLine(String(sp.source)).slice(0, 140);
  if (out.notes == null && sp.speaker_notes) out.notes = String(sp.speaker_notes);
  // (Notes are read aloud from the presenter's view: «`var`» there is just var.)
  if (out.notes) out.notes = out.notes.replace(/`([^`\n]+)`/g, '$1').replace(/\*\*([^*]+)\*\*/g, '$1');
  const bullets = bulletsOf(first(sp, ['bullets', 'points', 'list', 'content', 'body', 'items'])); if (bullets.length) out.bullets = bullets;
  if (sp.plain) out.plain = true;
  if (Number.isInteger(+sp.figure) && +sp.figure > 0) out.figure = +sp.figure;      // (a figure of the source document: attach.js pdfFigures)
  if (+sp.figureRatio > 0) out.figureRatio = +sp.figureRatio;                        // (its width / height: authoring.js insertSpecs)
  if (sp.columns === 2) out.columns = 2;
  if (sp.below === true || sp.below === 'true') out.below = true;                  // (under the previous slide: authoring.js slideFromSpec)
  switch (kind) {
    case 'two_columns': case 'comparison': {
      const cols = Array.isArray(sp.columns) ? sp.columns.map(column).filter(Boolean)
        : [column(first(sp, ['left', 'pros', 'before', 'a'])), column(first(sp, ['right', 'cons', 'after', 'b']))].filter(Boolean);
      if (!sp.left && !sp.right && sp.pros && sp.cons) { cols[0].tone = 'good'; cols[1].tone = 'bad'; }
      const ok = cols.filter(c => c.heading || c.bullets.length);
      if (ok.length < 2) { out.kind = 'bullets'; out.bullets = [...(out.bullets || []), ...ok.flatMap(c => [c.heading, c.bullets].filter(x => x.length))]; break; }
      // (An exercise next to its solution: the solution is shown with a click — never both at once.)
      if (ok.length === 2 && SOLUTION.test(ok[1].heading) && (EXERCISE.test(out.title) || EXERCISE.test(ok[0].heading))) { out.kind = 'exercise'; out.problem = ok[0]; out.solution = ok[1]; break; }
      if (kind === 'two_columns' || ok.length === 2) { out.left = ok[0]; out.right = ok[1]; }
      if (kind === 'comparison') out.columns = ok.slice(0, 3);
      break;
    }
    case 'exercise': {
      const problem = part(first(sp, ['problem', 'task', 'question', 'exercise', 'statement', 'left'])) || (bullets.length ? { heading: '', bullets } : null);
      const solution = part(first(sp, ['solution', 'answer', 'solucion', 'right']));
      if (!problem || !(problem.bullets.length || problem.heading) || !solution || !(solution.bullets.length || solution.code)) {
        out.kind = 'bullets'; out.bullets = [...(problem?.bullets || bullets), ...(solution?.bullets || [])]; if (!out.bullets.length) delete out.bullets; break; }
      out.problem = problem; out.solution = solution; delete out.bullets;
      break;
    }
    case 'diagram': {
      const d = sp.diagram && typeof sp.diagram === 'object' && !Array.isArray(sp.diagram) ? sp.diagram : sp;
      const type = diagramType(first(d, ['type', 'layout', 'shape', 'style'])) || diagramType(sp.kind ?? sp.type) || 'process';
      const list = first(d, ['items', 'nodes', 'parts', 'elements', 'steps', 'children']) ?? (Array.isArray(sp.diagram) ? sp.diagram : null);
      // (Or already an outline — a spec prepared before, as layoutSlide and styledSlide get them —: its lines as they are.)
      let lines = list == null && typeof d.text === 'string' ? d.text.split('\n').map(l => (/^\s*/.exec(l)[0].replace(/\t/g, '  ')) + plainWords(l)).filter(l => l.trim()) : diagramText(list);
      const top = lines.filter(l => !/^ /.test(l));
      const cap = { venn: 3, matrix: 4 }[type] || 8;
      if (top.length > cap) { let n = 0; lines = lines.filter(l => (/^ /.test(l) ? n <= cap : ++n <= cap)); }
      if (top.length < 2 && !(type === 'radial' || type === 'hierarchy') || !top.length) { out.kind = 'bullets'; if (!out.bullets) out.bullets = top; break; }
      out.diagram = { type, text: lines.join('\n') };
      if (out.bullets) out.bullets = out.bullets.filter(b => !Array.isArray(b)).slice(0, 3);
      break;
    }
    case 'quote': out.quote = cleanLine(str(first(sp, ['quote', 'text', 'statement', 'title']))).replace(/^["“«]|["”»]$/g, ''); if (!out.quote) out.kind = 'bullets'; break;
    case 'key_idea': {
      const st = cleanLine(str(first(sp, ['statement', 'idea', 'message', 'key_message', 'quote', 'text']))) || (bullets[0] && cleanLine(String(bullets[0])));
      if (!st) { out.kind = out.bullets ? 'bullets' : 'section'; break; }
      out.statement = st;
      const tx = cleanLine(str(first(sp, ['text', 'detail', 'details', 'support', 'explanation', 'description'])));
      if (tx && tx !== st) out.text = tx; else if (bullets.length > 1 && bullets[0] === st) out.text = cleanLine(String(bullets[1]));
      delete out.bullets;
      break;
    }
    case 'stats': {
      const st = items(sp, ['stats', 'numbers', 'metrics', 'figures', 'kpis', 'items', 'bullets'], 4).map(i => ({ value: i.value || '', label: i.value && i.label !== i.value ? i.label : i.text || i.label }))
        .filter(s => s.value && String(s.value).length <= 12);
      if (!st.length) { out.kind = 'bullets'; break; }
      out.stats = st.map(s => ({ value: s.value, label: s.label === s.value ? '' : s.label })); delete out.bullets;
      break;
    }
    case 'steps': case 'features': case 'timeline': {
      const keys = kind === 'timeline' ? ['steps', 'events', 'milestones', 'items', 'stages', 'phases', 'bullets'] : kind === 'steps'
        ? ['steps', 'items', 'stages', 'phases', 'points', 'bullets'] : ['items', 'features', 'cards', 'benefits', 'points', 'steps', 'bullets'];
      const its = items(sp, keys, 8);
      if (its.length < 2) { out.kind = 'bullets'; break; }
      if (kind === 'timeline') out.steps = its.slice(0, 6).map(i => ({ label: i.title || i.value || i.label, text: i.title ? i.text : i.value ? i.label : i.text !== i.label ? i.text : '' }));
      else out[kind === 'steps' ? 'steps' : 'items'] = its.map(i => ({ title: i.title, text: i.text, ...(i.icon && { icon: i.icon }) }));
      delete out.bullets;
      break;
    }
    case 'agenda': {
      const its = bulletsOf(first(sp, ['items', 'bullets', 'sections', 'topics', 'points', 'agenda'])).filter(x => !Array.isArray(x)).map(x => cleanTitle(cleanLine(x)));
      if (its.length < 2) { out.kind = 'bullets'; break; }
      out.items = its.slice(0, 10); delete out.bullets;
      break;
    }
    case 'chart': {
      const c = sp.chart && typeof sp.chart === 'object' ? sp.chart : sp;
      let labels = arr(c.labels).map(x => cleanLine(str(x))), values = arr(c.values).map(num);
      let raw = arr(c.values);
      if (Array.isArray(c.data) && c.data.length) { labels = c.data.map(d => cleanLine(str(Array.isArray(d) ? d[0] : d?.label ?? d?.name))); raw = c.data.map(d => (Array.isArray(d) ? d[1] : d?.value)); values = raw.map(num); }
      // (Values that are gaps to fill in — «[previsión del T4]» —: no chart to draw; a list of them. Read as numbers, the
      // «4» of «T4» was drawn as a value.)
      if (raw.some(v => /\[[^\]]+\]/.test(str(v)))) { out.kind = 'bullets'; out.bullets = [...labels.map((l, i) => `${l}: ${cleanLine(str(raw[i] ?? '[…]'))}`), ...(out.bullets || [])].slice(0, 8); break; }
      const ok = labels.map((l, i) => [l, values[i]]).filter(([, v]) => v != null).slice(0, 24);
      if (ok.length < 2) { out.kind = 'bullets'; break; }
      const type = String(c.type || c.chart_type || c.chartType || 'bar').toLowerCase();
      out.chart = { type: ['bar', 'line', 'pie', 'doughnut', 'area'].includes(type) ? type : 'bar', labels: ok.map(x => x[0]), values: ok.map(x => x[1]), ...(c.series_name && { series_name: String(c.series_name) }) };
      break;
    }
    case 'table': {
      let rows = arr(sp.rows).map(r => (Array.isArray(r) ? r : r && typeof r === 'object' ? Object.values(r) : [r]).map(c => cleanLine(str(c))));
      let header = arr(sp.header ?? sp.headers ?? sp.columns_names).map(c => cleanLine(str(c)));
      if (!header.length && Array.isArray(sp.rows) && sp.rows[0] && typeof sp.rows[0] === 'object' && !Array.isArray(sp.rows[0])) header = Object.keys(sp.rows[0]);
      if (!rows.length) { out.kind = 'bullets'; break; }
      out.header = header; out.rows = rows;
      break;
    }
    case 'image': if (!out.bullets) out.bullets = []; break;
    // Code as it is (verbatim, a known language) or taken from a picture's transcription (from_image: its id); a formula in LaTeX.
    case 'code': {
      const c = sp.code && typeof sp.code === 'object' ? sp.code : sp;
      const language = codeLang(first(c, ['language', 'lang'])) || 'plaintext', code = cleanCode(typeof c.code === 'string' ? c.code : typeof sp.code === 'string' ? sp.code : '');
      const from = str(first(c, ['from_image', 'fromImage', 'image'])) || str(sp.from_image);
      if (!code && !from) { out.kind = 'bullets'; break; }
      out.code = { language, code: code || '', ...(from && { from_image: from }) };
      const cap = cleanLine(str(first(sp, ['caption']) ?? c.caption)); if (cap) out.caption = cap;
      break;
    }
    case 'math': {
      const latex = cleanLatex(str(first(sp, ['latex', 'formula', 'equation', 'math'])));
      if (!latex) { out.kind = 'bullets'; break; }
      out.latex = latex;
      const cap = cleanLine(str(sp.caption)); if (cap) out.caption = cap;
      break;
    }
    case 'title': case 'section': case 'closing': if (!out.subtitle && bullets.length === 1) out.subtitle = cleanLine(String(bullets[0])); break;
  }
  if (!out.title && out.kind !== 'quote' && out.kind !== 'key_idea') out.title = '';
  return out;
}

// Bullets that would read better as something else: that something else.
const CYCLE = /\b(cicl[eo]s?|cycles?|bucles?|loops?|circular|retroaliment|feedback)\b/i;
const AGENDA = /^(agenda|[ií]ndice|contenidos?|sumario|outline|contents|today|hoy|plan de la sesi[oó]n|lo que veremos|qu[eé] veremos|table of contents)\b/i;
export function upgradeSpec(spec) {
  if (spec.kind !== 'bullets' || spec.plain || !spec.bullets?.length) return spec;
  const groups = outline(spec.bullets), sh = shapeOf(groups), top = groups[0]?.items || [];
  const base = { ...spec }; delete base.bullets;
  if (sh.groups >= 2 && sh.groups <= 3 && groups.every(g => g.heading && g.items.length) && sh.all <= 14)
    return { ...base, kind: 'comparison', columns: groups.map(g => ({ heading: g.heading, bullets: itemsToBullets(g.items) })) };
  if (sh.groups !== 1 || groups[0].heading || sh.nested) return spec;
  if (AGENDA.test(spec.title || '') && sh.items >= 3 && sh.items <= 8 && sh.longest <= 60) return { ...base, kind: 'agenda', items: top.map(i => cleanTitle(i.text)) };
  // (A cycle told as a list — «Retain cycles: A refers to B, B refers to A, neither is freed» —: drawn as one.)
  if (CYCLE.test(spec.title || '') && sh.items >= 2 && sh.items <= 6 && sh.longest <= 70)
    return { ...base, kind: 'diagram', diagram: { type: 'cycle', text: top.map(i => plainWords(i.text)).join('\n') } };
  const its = top.map(i => { const l = splitLabel(i.text);
    return !l ? { title: '', text: i.text } : STEP.test(l[0]) ? { title: l[1], text: '' } : { title: cleanTitle(l[0]), text: l[1] }; });
  const stepLabels = top.length > 1 && top.every(i => STEP.test(splitLabel(i.text)?.[0] || ''));
  if ((sh.numbered || stepLabels) && sh.items >= 2 && sh.items <= 6 && sh.longest <= 170) return { ...base, kind: 'steps', steps: its };
  if (sh.labelled && sh.items >= 3 && sh.items <= 6 && sh.longest <= 150) return { ...base, kind: 'features', items: its };
  if (sh.items === 1 && sh.chars >= 30 && sh.chars <= 160) return { ...base, kind: 'key_idea', statement: top[0].text.replace(/\*\*/g, '') };
  return spec;
}
export const prepareSpec = raw => upgradeSpec(normalizeSpec(raw));

// Too much for one slide: two (the list cut in half), or the list in two columns.
export function splitSpec(spec) {
  if (spec.kind === 'code') return splitCode(spec);
  if (spec.kind !== 'bullets' || !spec.bullets?.length) return [spec];
  const groups = outline(spec.bullets), sh = shapeOf(groups);
  if (sh.all <= 6 && sh.chars <= 420) return [spec];
  if (sh.groups === 1 && !groups[0].heading && !sh.nested && sh.items <= 10 && sh.longest <= 70) return [{ ...spec, columns: 2 }];
  if (sh.all <= 8 && sh.chars <= 560) return [spec];
  // (Cut at the top-level item nearest the middle, by length.)
  const flat = groups.flatMap(g => [...(g.heading ? [{ head: g.heading }] : []), ...g.items.map(i => ({ i }))]);
  const len = x => (x.head || '').length + (x.i ? JSON.stringify(itemsToBullets([x.i])).length : 0), total = flat.reduce((s, x) => s + len(x), 0);
  let acc = 0, cut = flat.length - 1;
  for (let k = 0; k < flat.length; k++) { acc += len(flat[k]); if (acc >= total / 2) { cut = k + 1; break; } }
  cut = Math.max(1, Math.min(flat.length - 1, cut));
  if (flat[cut - 1].head && cut > 1) cut--;                    // (a heading goes with its items)
  const back = part => part.flatMap(x => (x.head ? [x.head + ':'] : itemsToBullets([x.i])));
  const a = { ...spec, bullets: back(flat.slice(0, cut)) }, b = { ...spec, bullets: back(flat.slice(cut)), title: spec.title ? `${spec.title} (2)` : '', notes: '' };
  return [upgradeSpec(a), upgradeSpec(b)];
}
// The spec for a slide whose body text (from set_text) reads better as a composition: or null.
export function specFromText(title, text) {
  const sp = upgradeSpec(normalizeSpec({ kind: 'bullets', title, bullets: [String(text ?? '')] }));
  return sp.kind === 'bullets' ? null : sp;
}

// ---- Code that reads from the back of a room -------------------------------------------------
// At 20 px — the least that reads projected — a slide's area under the title (some 1100 × 470) holds 13 lines of
// code. Its explanation goes beside it (fromspec.js codeCard) while the lines leave it a column of 360 px — up to some
// 48 characters —; longer lines take the width, the explanation goes under in a row, and then some 11 lines fit.
export const CODE_ROOM = { lines: 13, withPoints: 11, sideChars: 48 };
const blank = l => !l.trim();
const trimBlank = ls => { let a = 0, b = ls.length; while (a < b && blank(ls[a])) a++; while (b > a && blank(ls[b - 1])) b--; return ls.slice(a, b); };
// Lines over `max`: the blank ones inside go first (what is accessory when room is short).
const squeeze = (ls, max) => { const out = [...ls]; for (let i = out.length - 1; i > 0 && out.length > max; i--) if (blank(out[i])) out.splice(i, 1); return out; };
// Where to cut: before a top-level line that follows a blank line or a closing brace (a declaration, a block of
// use), the cut that leaves the parts most even; else at a blank line; else in the middle.
function cutLines(ls, max, parts = 3) {
  ls = trimBlank(ls);
  if (ls.length <= max || parts < 2) return [squeeze(ls, max)];
  const n = ls.length, top = i => /^\S/.test(ls[i]) && (blank(ls[i - 1]) || /^[}\])]/.test(ls[i - 1].trim()) && /^\S/.test(ls[i - 1]));
  let cands = []; for (let i = 1; i < n; i++) if (!blank(ls[i]) && top(i)) cands.push(i);
  if (!cands.length) for (let i = 1; i < n; i++) if (!blank(ls[i]) && blank(ls[i - 1])) cands.push(i);
  if (!cands.length) cands = [Math.ceil(n / 2)];
  const size = i => [trimBlank(ls.slice(0, i)).length, trimBlank(ls.slice(i)).length];
  // (Both parts fitting first; then the most even.)
  const cost = i => { const [a, b] = size(i); return (a > max ? 1000 + a : 0) + (b > max ? (parts > 2 ? 100 : 1000) + b : 0) + Math.abs(a - b); };
  const at = cands.reduce((best, i) => (cost(i) < cost(best) ? i : best), cands[0]);
  return [squeeze(trimBlank(ls.slice(0, at)), max), ...cutLines(ls.slice(at), max, parts - 1)];
}
// The words of an explanation's point that name something in the code (`intercanviar`, Persona, esParell).
const codeWords = t => [...String(t).matchAll(/`([^`]+)`/g)].flatMap(m => m[1].match(/[A-Za-z_]\w*/g) || []).concat(String(t).match(/\b[A-Za-z_]*[a-z][A-Z]\w*|\b[A-Z][a-z]+[A-Z]\w*/g) || []);
// The notes of code cut in parts, shared out: each sentence with the part whose names it speaks of (in order — the talk
// goes through the code from top to bottom); a part none speaks of, its share of the sentences by position. So the
// presenter has a script on every slide, and the right one.
function notesFor(notes, texts) {
  // (Sentences end at «. » — not at the dot of «meuNumero.esParell».)
  const ss = String(notes || '').split(/(?<=[.!?…]["»”)]?)\s+(?=\S)/).map(x => x.trim()).filter(Boolean);
  const n = texts.length, out = Array.from({ length: n }, () => []);
  if (ss.length < n) return [String(notes || ''), ...Array(n - 1).fill(ss.at(-1) || '')].slice(0, n).map((x, k) => (k ? x : String(notes || '')));
  // (The code's names that only one part has — «guard», «mostraEdat» — tell which part a sentence speaks of.)
  const ids = texts.map(c => new Set(c.match(/[A-Za-z_]\w{2,}/g) || [])), only = ids.map((set, k) => new Set([...set].filter(w => ids.every((o, j) => j === k || !o.has(w)))));
  let at = 0;
  const where = ss.map(t => { const ws = t.match(/[A-Za-z_]\w{2,}/g) || [], hits = only.map(set => ws.filter(w => set.has(w)).length);
    const best = Math.max(...hits); if (best > 0 && hits.indexOf(best) >= at) at = hits.indexOf(best); return at; });
  // (A part left without a sentence: the sentences cut evenly instead.)
  if (new Set(where).size < n) ss.forEach((t, i) => out[Math.min(n - 1, Math.floor(i * n / ss.length))].push(t));
  else ss.forEach((t, i) => out[where[i]].push(t));
  return out.map(x => x.join(' '));
}
// Code too long for one slide at a size that reads: two slides (three at most), each with the points that speak
// of its part. Runs of blank lines become one.
export function splitCode(spec) {
  const src = spec.code?.code; if (!src) return [spec];
  const ls = src.split('\n').filter((l, i, a) => !(blank(l) && i && blank(a[i - 1])));
  const pts = (spec.bullets || []).filter(b => !Array.isArray(b)), longest = Math.max(0, ...ls.map(l => l.length));
  const max = !pts.length || longest <= CODE_ROOM.sideChars ? CODE_ROOM.lines : CODE_ROOM.withPoints;
  // (Two slides if they hold it; three only when two can't.)
  // (Two slides if they hold it — with its points, or else the code alone, its points then said in the notes
  // (codeCard) —; three only when two can't.)
  let parts = cutLines(ls, max, 2);
  if (parts.some(p => p.length > max)) parts = cutLines(ls, CODE_ROOM.lines, 2);
  if (parts.some(p => p.length > CODE_ROOM.lines)) parts = cutLines(ls, max, 3);
  if (parts.length === 1) return [{ ...spec, code: { ...spec.code, code: parts[0].join('\n') } }];
  const texts = parts.map(p => p.join('\n'));
  const has = (code, w) => new RegExp(`\\b${w.replace(/[^\w]/g, '')}\\b`).test(code);
  const own = parts.map(() => []);
  pts.forEach((b, k) => {
    const ws = codeWords(b), hits = texts.map(c => ws.filter(w => has(c, w)).length), best = Math.max(...hits);
    own[best > 0 ? hits.indexOf(best) : Math.min(parts.length - 1, Math.floor(k * parts.length / pts.length))].push(b);
  });
  const notes = notesFor(spec.notes, texts);
  return parts.map((p, k) => {
    const sp = { ...spec, code: { ...spec.code, code: texts[k] }, bullets: own[k], notes: notes[k] };
    if (!own[k].length) delete sp.bullets;
    if (k) { sp.title = spec.title ? `${spec.title} (${k + 1})` : ''; delete sp.caption; }
    return sp;
  });
}

// ---- Titles in sentence case ---------------------------------------------------------------------
// Models write titles the English way, a capital on every word: «Un Nou Horitzó en la Programació». Most languages
// capitalise only the first word and proper names. Made right only when it is safe: the language writes so (not
// English nor German, whose nouns go capitalised), the deck's titles do it as a habit, and in a text every long word
// starts with a capital (a title with one capital mid-way has a name in it). Proper names — those the deck's own
// running text writes capitalised mid-sentence, and the code's names —, acronyms (ARC), mixed case (iOS,
// GitHub), numbers and `code` stay as they are.
const SENTENCE_LANGS = /^(es|ca|gl|fr|it|pt|eu|nl|ro|espa|castell|spanish|catal|galeg|galic|fran[cç]|french|ital|portug|euskar|basque|nederl|dutch|rom[aâ]n)/i;
const LONG = /^[\p{L}'’·-]{4,}$/u;
const core = w => w.replace(/^[¿¡«“"'(\[]+|[»”"')\].,;:!?…]+$/g, '').replace(/^(?:[dlnsmt]|qu)['’](?=\p{L})/iu, '');
const allCapped = t => { const ws = String(t || '').replace(/`[^`]*`/g, ' ').split(/\s+/).map(core).filter(w => LONG.test(w)); return ws.length >= 2 && ws.every(w => /^\p{Lu}/u.test(w)); };
const ABBR = /^(vs|etc|ex|p|e\.g|i\.e|sr|sra|dr|núm|no)\.$/i;
function lowerWords(t, proper) {
  let start = true;
  return String(t).split(/(`[^`]*`|\s+)/).map(tok => {
    if (!tok || /^\s+$/.test(tok)) return tok;
    if (tok.startsWith('`')) { start = false; return tok; }
    const w = core(tok), was = start;
    start = /[.!?]["»”)]?$/.test(tok) && !ABBR.test(tok);
    if (was || !/^\p{Lu}[\p{Ll}'’·-]*$/u.test(w) || proper.has(w)) return tok;
    const at = tok.indexOf(w); return tok.slice(0, at) + w.charAt(0).toLocaleLowerCase() + w.slice(1) + tok.slice(at + w.length);
  }).join('');
}
const textsOf = v => (Array.isArray(v) ? v.flatMap(textsOf) : v && typeof v === 'object' ? Object.values(v).flatMap(textsOf) : typeof v === 'string' ? [v] : []);
export function sentenceCase(specs, language = '') {
  if (!SENTENCE_LANGS.test(String(language).trim())) return specs;
  const titles = specs.map(sp => sp.title).filter(t => t && t.trim().split(/\s+/).length >= 3);
  if (titles.filter(allCapped).length < Math.max(2, titles.length * 0.4)) return specs;
  // The names: capitalised in the middle of a sentence of the deck's text (not its titles) and never written in
  // lower case there — «Hem explorat ARC, Protocols, Extensions…» doesn't make «extensions» a name —, or named in its code.
  const named = new Set(), mid = new Set(), lower = new Set();
  for (const sp of specs) {
    const { title, items, steps, columns, left, right, problem, solution, code, kind, ...rest } = sp;
    for (const w of String(code?.code || '').match(/\b\p{Lu}[\p{L}\d_]*/gu) || []) named.add(w);
    // (Not the titles, headings nor an agenda's items: those are what may be wrongly capitalised.)
    const own = [...[items, steps].flatMap(l => (Array.isArray(l) && kind !== 'agenda' ? l.map(i => (i && typeof i === 'object' ? i.text : null)) : [])),
      ...[...(columns || []), left, right, problem, solution].flatMap(c => (c && typeof c === 'object' ? [c.bullets] : []))];
    for (const t of [...textsOf(rest), ...textsOf(own)]) {
      for (const m of t.matchAll(/`([^`]+)`/g)) for (const w of m[1].match(/[\p{L}_][\p{L}\d_]*/gu) || []) if (/^\p{Lu}/u.test(w)) named.add(w);
      const toks = t.replace(/`[^`]*`/g, ' x ').split(/\s+/);
      toks.forEach((tok, k) => { const w = core(tok); if (/^\p{Ll}/u.test(w)) lower.add(w.toLocaleLowerCase()); else if (k && /^\p{Lu}\p{Ll}/u.test(w) && !/[.!?:]["»”)]?$/.test(toks[k - 1])) mid.add(w); });
    }
  }
  const proper = new Set([...named, ...[...mid].filter(w => !lower.has(w.toLocaleLowerCase()))]);
  const fix = t => (typeof t === 'string' && allCapped(t) ? lowerWords(t, proper) : t);
  for (const sp of specs) {
    sp.title = fix(sp.title);
    if (sp.kind === 'agenda' && Array.isArray(sp.items)) sp.items = sp.items.map(fix);
    for (const k of ['steps', 'items']) if (Array.isArray(sp[k]) && sp.kind !== 'agenda') sp[k] = sp[k].map(i => (i && typeof i === 'object' && i.title ? { ...i, title: fix(i.title) } : i));
    for (const c of [...(sp.columns || []), sp.left, sp.right, sp.problem, sp.solution]) if (c && typeof c === 'object' && c.heading) c.heading = fix(c.heading);
  }
  return specs;
}
