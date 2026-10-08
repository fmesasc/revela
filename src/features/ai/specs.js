// Slide specs as the model writes them, made usable: the kinds and fields it
// is told about (SPEC_DOC in authoring.js), read loosely — other names for the
// same kind or field, items as "Title: text" strings or objects, numbers as
// strings, text with typed bullets — and a better kind chosen when the content
// asks for it (bullets that are numbered steps, labelled points, two lists
// with headings, an agenda…), or two slides when it is too much for one.

import { outline, shapeOf, splitLabel, cleanLine, cleanTitle, itemsToBullets } from './richtext.js';
import { codeLang, cleanCode, cleanLatex } from './codeobj.js';

export const KINDS = ['title', 'section', 'bullets', 'two_columns', 'comparison', 'quote', 'key_idea', 'stats', 'steps', 'timeline', 'features', 'agenda', 'chart', 'table', 'image', 'code', 'math', 'closing'];
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
  graph: 'chart', bar_chart: 'chart', picture: 'image', photo: 'image', image_text: 'image', quotation: 'quote', citation: 'quote', cita: 'quote',
};
const kindOf = k => { const s = String(k ?? '').toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\s-]+/g, '_');
  return KINDS.includes(s) ? s : ALIAS[s] || null; };
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
  for (const k of ['notes', 'icon', 'image_prompt', 'author']) if (sp[k] != null && typeof sp[k] !== 'object') out[k] = String(sp[k]);
  // (Where a slide's figures come from: shown under them, authoring.js sourceBlock.)
  if (sp.source != null && typeof sp.source !== 'object' && cleanLine(String(sp.source))) out.source = cleanLine(String(sp.source)).slice(0, 140);
  if (out.notes == null && sp.speaker_notes) out.notes = String(sp.speaker_notes);
  const bullets = bulletsOf(first(sp, ['bullets', 'points', 'list', 'content', 'body', 'items'])); if (bullets.length) out.bullets = bullets;
  if (sp.plain) out.plain = true;
  if (Number.isInteger(+sp.figure) && +sp.figure > 0) out.figure = +sp.figure;      // (a figure of the source document: attach.js pdfFigures)
  if (+sp.figureRatio > 0) out.figureRatio = +sp.figureRatio;                        // (its width / height: authoring.js insertSpecs)
  if (sp.columns === 2) out.columns = 2;
  switch (kind) {
    case 'two_columns': case 'comparison': {
      const cols = Array.isArray(sp.columns) ? sp.columns.map(column).filter(Boolean)
        : [column(first(sp, ['left', 'pros', 'before', 'a'])), column(first(sp, ['right', 'cons', 'after', 'b']))].filter(Boolean);
      if (!sp.left && !sp.right && sp.pros && sp.cons) { cols[0].tone = 'good'; cols[1].tone = 'bad'; }
      const ok = cols.filter(c => c.heading || c.bullets.length);
      if (ok.length < 2) { out.kind = 'bullets'; out.bullets = [...(out.bullets || []), ...ok.flatMap(c => [c.heading, c.bullets].filter(x => x.length))]; break; }
      if (kind === 'two_columns' || ok.length === 2) { out.left = ok[0]; out.right = ok[1]; }
      if (kind === 'comparison') out.columns = ok.slice(0, 3);
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
const AGENDA = /^(agenda|[ií]ndice|contenidos?|sumario|outline|contents|today|hoy|plan de la sesi[oó]n|lo que veremos|qu[eé] veremos|table of contents)\b/i;
export function upgradeSpec(spec) {
  if (spec.kind !== 'bullets' || spec.plain || !spec.bullets?.length) return spec;
  const groups = outline(spec.bullets), sh = shapeOf(groups), top = groups[0]?.items || [];
  const base = { ...spec }; delete base.bullets;
  if (sh.groups >= 2 && sh.groups <= 3 && groups.every(g => g.heading && g.items.length) && sh.all <= 14)
    return { ...base, kind: 'comparison', columns: groups.map(g => ({ heading: g.heading, bullets: itemsToBullets(g.items) })) };
  if (sh.groups !== 1 || groups[0].heading || sh.nested) return spec;
  if (AGENDA.test(spec.title || '') && sh.items >= 3 && sh.items <= 8 && sh.longest <= 60) return { ...base, kind: 'agenda', items: top.map(i => cleanTitle(i.text)) };
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
