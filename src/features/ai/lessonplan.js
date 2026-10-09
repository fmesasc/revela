// A lesson plan for the teacher and a study guide for the pupils, from the presentation (IA ▸ «Plan de clase y guía»):
// the AI reads its texts, notes and quizzes and writes them as data; here they become a document (HTML to read, print
// or paste in a word processor, and Markdown), the plan's parts go to the notes of their slides, and the guide can
// become slides. In the presentation's own language; with the Spanish curriculum's words (LOMLOE: competencias
// específicas, criterios de evaluación, saberes básicos…) when the interface is in one of Spain's languages — never
// with official codes made up by the model: the teacher adds the real ones.

import { state, commit } from '../../core/store.js';
import { esc, plainText } from '../../core/text.js';
import { chat, lang, parseJSON } from './openrouter.js';
import { slideFromSpec } from './authoring.js';
import { t, currentLang } from '../../i18n/index.js';

const str = (v, n = 2000) => (v == null ? '' : String(v)).trim().slice(0, n);
const list = (v, n = 12, len = 600) => (Array.isArray(v) ? v : []).map(x => str(x, len)).filter(Boolean).slice(0, n);
// The Spanish curriculum's vocabulary: an interface in Spanish, Catalan, Galician or Basque (schools in Spain).
export const spanishCurriculum = () => ['es', 'ca', 'gl', 'eu'].includes(currentLang());

// What the AI reads: each visible slide's text (tables, charts' data), its notes and its quizzes and activities —
// with their right answers, which the plan's assessment and the guide's questions can build on.
export function deckDigest(deck = state.deck) {
  const block = b => {
    if (b.type === 'text' || (b.type === 'shape' && b.html)) return plainText(b.html || '');
    if (b.type === 'table') return (b.rows || []).map(r => r.map(c => plainText(String(c ?? ''))).join(' | ')).join('\n');
    if (b.type === 'chart') return `[chart: ${(b.data || []).map(d => `${d.label}=${d.value}`).join(', ')}]`;
    if (b.type === 'code') return `[code]\n${str(b.code, 1500)}`;
    if (b.type === 'math') return `[formula: ${str(b.latex, 300)}]`;
    if (b.type === 'diagram') return str(b.text, 1000);
    if (b.type === 'image' && b.alt && !b.decorative) return `[picture: ${str(b.alt, 200)}]`;
    if (b.type === 'poll') {
      const opts = (b.options || []).map((o, i) => `${(b.correct || []).includes(i) && b.kind === 'quiz' ? '✓ ' : ''}${str(o, 200)}`);
      return `[${b.kind === 'quiz' ? 'quiz' : `activity: ${b.kind}`}] ${str(b.question, 300)}${opts.length ? ' — ' + opts.join(' / ') : ''}${b.text ? ' — ' + str(b.text, 400) : ''}`;
    }
    return '';
  };
  return deck.slides.map((s, i) => [s, i]).filter(([s]) => !s.hidden)
    .map(([s, i]) => `[slide ${i + 1}]\n${s.blocks.map(block).filter(x => x.trim()).join('\n')}${s.notes ? `\n(notes: ${plainText(s.notes).slice(0, 800)})` : ''}`)
    .join('\n---\n').slice(0, 50000);
}

const LANGUAGE = () => `Write in the language the presentation is written in (if it can't be told, in ${lang()}).`;
const CURRICULUM = () => (spanishCurriculum()
  ? `Use the vocabulary of Spain's curriculum (LOMLOE) for the fields: "competences" are the subject's «competencias específicas» (and the key competences they develop), "criteria" are «criterios de evaluación», "contents" are «saberes básicos», the whole is a «situación de aprendizaje», and "diversity" follows Universal Design for Learning (DUA). NEVER write official codes or numbers (such as "CE1", "CCL2", "STEM3", "1.2", "Real Decreto 217/2022, art. …") — describe each one in words; the teacher adds the official references for their region and course.`
  : 'Never write official curriculum codes or standard numbers — describe each competence or criterion in words; the teacher adds the official references.');

// A lesson plan: { title, level, minutes, objectives, competences, prior, contents, sections: [{ name, minutes, slides, teacher, pupils }],
// activities: [{ name, text }], diversity, criteria, instruments, materials }. opts: { minutes, level, notes (anything else) }.
export async function lessonPlan(opts = {}) {
  const minutes = Math.max(10, Math.min(600, Math.round(+opts.minutes || 55)));
  const out = await chat([
    { role: 'system', content: `You are an experienced teacher writing the lesson plan for a class taught with this presentation. ${LANGUAGE()} ${CURRICULUM()}
The class lasts ${minutes} minutes in total${opts.level ? `, for ${str(opts.level, 120)}` : ''}. Split it into 3-7 sections (warm-up, explanation, practice, close…) whose minutes add up to ${minutes}; map each one to the slides it uses (their numbers). Base everything on the presentation: its content, its notes and its quizzes and activities (use them in the sections and the assessment). Be concrete and brief: what the teacher does and what the pupils do.
Answer only JSON: {"title":"…","objectives":["the pupils will…"],"competences":["…"],"prior":["prior knowledge the pupils need"],"contents":["…"],"sections":[{"name":"…","minutes":10,"slides":[1,2],"teacher":"…","pupils":"…"}],"activities":[{"name":"…","text":"…"}],"diversity":["measures for pupils who need more support and for those who go faster; accessibility"],"criteria":["assessment criteria, observable"],"instruments":["how it is assessed: rubric, quiz, observation…"],"materials":["…"]}` },
    { role: 'user', content: `Presentation: ${str(state.deck.name, 200)}${opts.notes ? `\nFrom the teacher: ${str(opts.notes, 1000)}` : ''}\n\n${deckDigest()}` },
  ], { json: true, maxTokens: 5000, feature: 'review' });
  const r = parseJSON(out) || {}, n = state.deck.slides.length;
  const sections = (Array.isArray(r.sections) ? r.sections : []).filter(x => x && str(x.name)).slice(0, 10).map(x => ({ name: str(x.name, 200),
    minutes: Math.max(0, Math.min(600, Math.round(+x.minutes) || 0)), slides: [...new Set((Array.isArray(x.slides) ? x.slides : []).map(v => Math.round(+v)).filter(v => v >= 1 && v <= n))].sort((a, b) => a - b),
    teacher: str(x.teacher, 1500), pupils: str(x.pupils, 1500) }));
  if (!sections.length && !list(r.objectives).length) throw new Error('EMPTY');
  return { kind: 'plan', title: str(r.title, 200) || str(state.deck.name, 200), level: str(opts.level, 120), minutes, objectives: list(r.objectives), competences: list(r.competences),
    prior: list(r.prior), contents: list(r.contents), sections, activities: (Array.isArray(r.activities) ? r.activities : []).filter(x => x && str(x.name)).slice(0, 10).map(x => ({ name: str(x.name, 200), text: str(x.text, 1500) })),
    diversity: list(r.diversity), criteria: list(r.criteria), instruments: list(r.instruments), materials: list(r.materials) };
}

// A study guide for the pupils: { title, summary: [paragraphs], terms: [{ term, def }], questions: [{ q, a }] } — the answers
// at the end of the document, so they can check themselves after trying. opts: { questions (how many), level }.
export async function studyGuide(opts = {}) {
  const nq = Math.max(3, Math.min(20, Math.round(+opts.questions || 8)));
  const out = await chat([
    { role: 'system', content: `You write a study guide for pupils from the presentation their teacher used in class. ${LANGUAGE()} Address the pupils directly, clearly${opts.level ? `, for ${str(opts.level, 120)}` : ''}. Only what the presentation says (its slides, notes and quizzes); no new facts.
Answer only JSON: {"title":"…","summary":["2-5 short paragraphs that sum up the lesson"],"terms":[{"term":"…","def":"one-sentence definition"}],"questions":[{"q":"a question to check themselves","a":"its answer, brief"}]} with 5-12 key terms and ${nq} questions, from easy to harder (remember, understand, apply).` },
    { role: 'user', content: `Presentation: ${str(state.deck.name, 200)}\n\n${deckDigest()}` },
  ], { json: true, maxTokens: 4000, feature: 'review' });
  const r = parseJSON(out) || {};
  const questions = (Array.isArray(r.questions) ? r.questions : []).filter(x => x && str(x.q)).slice(0, nq).map(x => ({ q: str(x.q, 500), a: str(x.a, 1000) }));
  const summary = list(r.summary, 8, 2000);
  if (!summary.length && !questions.length) throw new Error('EMPTY');
  return { kind: 'guide', title: str(r.title, 200) || str(state.deck.name, 200), summary, questions,
    terms: (Array.isArray(r.terms) ? r.terms : []).filter(x => x && str(x.term)).slice(0, 20).map(x => ({ term: str(x.term, 120), def: str(x.def, 500) })) };
}

// The headings, in the interface's language (with the curriculum's names in Spanish).
const H = () => (spanishCurriculum() && currentLang() === 'es'
  ? { objectives: 'Objetivos didácticos', competences: 'Competencias específicas', prior: 'Conocimientos previos', contents: 'Saberes básicos', sections: 'Secuencia y temporalización',
    activities: 'Actividades', diversity: 'Atención a la diversidad (DUA)', criteria: 'Criterios de evaluación', instruments: 'Instrumentos de evaluación', materials: 'Materiales y recursos' }
  : { objectives: t('Objetivos'), competences: t('Competencias'), prior: t('Conocimientos previos'), contents: t('Contenidos'), sections: t('Secuencia y tiempos'),
    activities: t('Actividades'), diversity: t('Atención a la diversidad'), criteria: t('Criterios de evaluación'), instruments: t('Instrumentos de evaluación'), materials: t('Materiales') });
const slidesOf = x => (x.slides.length ? `${t('Diapositivas')} ${x.slides.join(', ')}` : '');

// The document as HTML: a whole page (standalone) or its body only, for the dialog's preview. Everything escaped.
export function docHTML(d, { page = true } = {}) {
  const ul = a => (a.length ? `<ul>${a.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '');
  const sec = (h, a) => (a.length ? `<h2>${esc(h)}</h2>${ul(a)}` : '');
  let body = `<h1>${esc(d.title)}</h1>`;
  if (d.kind === 'plan') {
    const h = H();
    body += `<p class="meta">${[d.level, `${d.minutes} min`].filter(Boolean).map(esc).join(' · ')}</p>`
      + sec(h.objectives, d.objectives) + sec(h.competences, d.competences) + sec(h.contents, d.contents) + sec(h.prior, d.prior)
      + (d.sections.length ? `<h2>${esc(h.sections)}</h2><table><thead><tr><th>${esc(t('Parte'))}</th><th>${esc(t('Minutos'))}</th><th>${esc(t('Docente'))}</th><th>${esc(t('Alumnado'))}</th></tr></thead><tbody>`
        + d.sections.map(x => `<tr><td><b>${esc(x.name)}</b>${x.slides.length ? `<br><small>${esc(slidesOf(x))}</small>` : ''}</td><td>${x.minutes}</td><td>${esc(x.teacher)}</td><td>${esc(x.pupils)}</td></tr>`).join('') + '</tbody></table>' : '')
      + (d.activities.length ? `<h2>${esc(h.activities)}</h2>${d.activities.map(a => `<h3>${esc(a.name)}</h3><p>${esc(a.text)}</p>`).join('')}` : '')
      + sec(h.diversity, d.diversity) + sec(h.criteria, d.criteria) + sec(h.instruments, d.instruments) + sec(h.materials, d.materials);
  } else {
    body += (d.summary.length ? `<h2>${esc(t('Resumen'))}</h2>${d.summary.map(p => `<p>${esc(p)}</p>`).join('')}` : '')
      + (d.terms.length ? `<h2>${esc(t('Términos clave'))}</h2><dl>${d.terms.map(x => `<dt>${esc(x.term)}</dt><dd>${esc(x.def)}</dd>`).join('')}</dl>` : '')
      + (d.questions.length ? `<h2>${esc(t('Comprueba lo que sabes'))}</h2><ol>${d.questions.map(x => `<li>${esc(x.q)}</li>`).join('')}</ol>`
        + `<h2 class="answers">${esc(t('Soluciones'))}</h2><ol>${d.questions.map(x => `<li>${esc(x.a)}</li>`).join('')}</ol>` : '');
  }
  if (!page) return body;
  return `<!doctype html><html lang="${esc(currentLang())}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(d.title)}</title>
<style>body{font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;max-width:860px;margin:32px auto;padding:0 20px;color:#1d1f24}h1{font-size:28px;margin:0 0 4px}h2{font-size:20px;margin:28px 0 8px;border-bottom:2px solid #e3e6ea;padding-bottom:4px}
h3{font-size:16px;margin:16px 0 4px}.meta{color:#5b6470;margin:0 0 12px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #cfd5dc;padding:6px 8px;vertical-align:top;text-align:start}th{background:#f1f3f5}
dt{font-weight:700;margin-top:8px}dd{margin:0 0 0 18px}.answers{page-break-before:always;break-before:page}@media print{body{margin:0}}</style></head><body>${body}</body></html>`;
}

// The same as Markdown (for notes apps, Moodle, a repository…).
export function docMarkdown(d) {
  const md = s => String(s).replace(/([\\`*_[\]#|<>])/g, '\\$1').replace(/\n+/g, ' ');
  const sec = (h, a) => (a.length ? `## ${h}\n\n${a.map(x => `- ${md(x)}`).join('\n')}\n\n` : '');
  let out = `# ${md(d.title)}\n\n`;
  if (d.kind === 'plan') {
    const h = H();
    out += `${[d.level, `${d.minutes} min`].filter(Boolean).map(md).join(' · ')}\n\n` + sec(h.objectives, d.objectives) + sec(h.competences, d.competences) + sec(h.contents, d.contents) + sec(h.prior, d.prior)
      + (d.sections.length ? `## ${h.sections}\n\n| ${t('Parte')} | ${t('Minutos')} | ${t('Docente')} | ${t('Alumnado')} |\n|---|---|---|---|\n`
        + d.sections.map(x => `| **${md(x.name)}**${x.slides.length ? ` (${md(slidesOf(x))})` : ''} | ${x.minutes} | ${md(x.teacher)} | ${md(x.pupils)} |`).join('\n') + '\n\n' : '')
      + (d.activities.length ? `## ${h.activities}\n\n${d.activities.map(a => `### ${md(a.name)}\n\n${md(a.text)}\n`).join('\n')}\n` : '')
      + sec(h.diversity, d.diversity) + sec(h.criteria, d.criteria) + sec(h.instruments, d.instruments) + sec(h.materials, d.materials);
  } else {
    out += (d.summary.length ? `## ${t('Resumen')}\n\n${d.summary.map(md).join('\n\n')}\n\n` : '')
      + (d.terms.length ? `## ${t('Términos clave')}\n\n${d.terms.map(x => `- **${md(x.term)}**: ${md(x.def)}`).join('\n')}\n\n` : '')
      + (d.questions.length ? `## ${t('Comprueba lo que sabes')}\n\n${d.questions.map((x, i) => `${i + 1}. ${md(x.q)}`).join('\n')}\n\n## ${t('Soluciones')}\n\n${d.questions.map((x, i) => `${i + 1}. ${md(x.a)}`).join('\n')}\n` : '');
  }
  return out.trim() + '\n';
}

// The plan's sections in the notes of the slides where they start (after what the notes had; doing it again replaces
// it). → how many slides.
export function planToNotes(d) {
  const at = new Map(); d.sections.forEach(x => { const n = x.slides[0]; if (n) at.set(n, [...(at.get(n) || []), x]); });
  const mark = `— ${t('Plan de clase')}: `, part = x => `${mark}${x.name} (${x.minutes} min)\n${[x.teacher && `${t('Docente')}: ${x.teacher}`, x.pupils && `${t('Alumnado')}: ${x.pupils}`].filter(Boolean).join('\n')}`;
  let made = 0;
  commit(() => {
    for (const s of state.deck.slides) { const i = String(s.notes || '').indexOf(mark); if (i >= 0) s.notes = s.notes.slice(0, i).trimEnd(); }
    at.forEach((xs, n) => {
      const s = state.deck.slides[n - 1]; if (!s) return;
      const kept = String(s.notes || '').trimEnd();
      s.notes = `${kept}${kept ? '\n\n' : ''}${xs.map(part).join('\n\n')}`; made++;
    });
  });
  return made;
}

// The guide as slides at the end: the summary, the key terms (a table, six per slide), the questions — their answers in
// the notes and on a last slide. → how many slides.
export function guideToSlides(d) {
  const specs = [];
  if (d.summary.length) specs.push({ kind: 'bullets', title: t('Resumen'), bullets: d.summary.slice(0, 6).map(p => p.split(/(?<=[.!?])\s/)[0].slice(0, 160)), notes: d.summary.join('\n\n') });
  for (let i = 0; i < d.terms.length; i += 6) specs.push({ kind: 'table', title: t('Términos clave'), header: [t('Término'), t('Definición')], rows: d.terms.slice(i, i + 6).map(x => [x.term, x.def]) });
  for (let i = 0; i < d.questions.length; i += 5) {
    const qs = d.questions.slice(i, i + 5);
    specs.push({ kind: 'bullets', title: t('Comprueba lo que sabes'), bullets: qs.map((x, k) => `${i + k + 1}. ${x.q}`), notes: qs.map((x, k) => `${i + k + 1}. ${x.a}`).join('\n') });
  }
  for (let i = 0; i < d.questions.length; i += 5)
    specs.push({ kind: 'bullets', title: t('Soluciones'), bullets: d.questions.slice(i, i + 5).map((x, k) => `${i + k + 1}. ${x.a}`) });
  if (!specs.length) return 0;
  commit(() => {
    const at = state.deck.slides.length;
    specs.forEach((sp, k) => state.deck.slides.push(slideFromSpec(sp, undefined, state.deck, { at: at + k })));
    state.ui.slideIndex = at; state.ui.selection = null;
  });
  return specs.length;
}
