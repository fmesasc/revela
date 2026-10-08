// The class gradebook («Cuaderno de clase»): what each student did across presentations and days — quizzes and
// activities saved from «Resultados del aula», and marks given with a rubric — per group («3.º A»), with a report
// for a term or any dates. Kept in this browser (as the classroom results are); nothing leaves it.
//
//   { v: 1, groups: [{ id, name, created }], names: { group: { student: name } },
//     sessions: [{ id, group, kind: 'quiz' | 'rubric', title, date, items: [{ label, max }], scores: { student: [pts | null] } }],
//     rubrics: [{ id, name, criteria: [{ name, levels: [{ label, pts, desc }] }] }] }
// A student is the device that answered (its voter id, the same in every presentation), or a name typed for a rubric.

const KEY = 'revela.gradebook';
const uid = () => Math.random().toString(36).slice(2, 10);
const blank = () => ({ v: 1, groups: [], names: {}, sessions: [], rubrics: [] });
let mem = null;                                                     // (when the browser's storage is not available)
export function load() {
  try { const g = JSON.parse(localStorage.getItem(KEY) || 'null'); return g && g.v === 1 ? { ...blank(), ...g } : mem || blank(); } catch { return mem || blank(); }
}
function save(g) { mem = g; try { localStorage.setItem(KEY, JSON.stringify(g)); } catch {} return g; }
const edit = fn => { const g = load(); const r = fn(g); save(g); return r; };

// ---- Groups ---------------------------------------------------------------------------------
export const groups = () => load().groups;
export const addGroup = name => edit(g => { const x = { id: uid(), name: String(name || '').trim().slice(0, 60) || 'Grupo', created: Date.now() }; g.groups.push(x); return x; });
export const renameGroup = (id, name) => edit(g => { const x = g.groups.find(y => y.id === id); if (x) x.name = String(name).trim().slice(0, 60) || x.name; });
export const deleteGroup = id => edit(g => { g.groups = g.groups.filter(x => x.id !== id); g.sessions = g.sessions.filter(s => s.group !== id); delete g.names[id]; });

// ---- Sessions -------------------------------------------------------------------------------
// From «Resultados del aula»: polls [{ label }], rows [{ id, name, pts: [..] }] (points out of 1000 each).
export function saveQuizSession(group, { title, date = Date.now(), polls, rows }) {
  return edit(g => {
    const s = { id: uid(), group, kind: 'quiz', title: String(title || '').slice(0, 120), date, items: polls.map(p => ({ label: String(p.label || '').slice(0, 120), max: 1000 })), scores: {} };
    const names = (g.names[group] ||= {});
    for (const r of rows) { s.scores[r.id] = r.pts.map(v => (v == null ? null : Math.max(0, Math.min(1000, +v)))); if (r.name && !names[r.id]) names[r.id] = r.name; }
    g.sessions.push(s); return s;
  });
}
// With a rubric: marks { student: [level index per criterion | null] }; students without an id get one from their name.
export function saveRubricSession(group, rubric, { title, date = Date.now(), marks, newNames = {} }) {
  return edit(g => {
    const names = (g.names[group] ||= {});
    for (const [k, n] of Object.entries(newNames)) if (n) names[k] = n;
    const s = { id: uid(), group, kind: 'rubric', rubric: rubric.id, title: String(title || rubric.name).slice(0, 120), date,
      items: rubric.criteria.map(c => ({ label: c.name, max: Math.max(...c.levels.map(l => +l.pts || 0), 0) })), scores: {} };
    for (const [k, lv] of Object.entries(marks)) s.scores[k] = rubric.criteria.map((c, i) => (lv[i] == null ? null : +c.levels[lv[i]]?.pts || 0));
    g.sessions.push(s); return s;
  });
}
export const deleteSession = id => edit(g => { g.sessions = g.sessions.filter(s => s.id !== id); });
export const newStudentKey = name => 'n:' + String(name || '').trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 60) + ':' + uid();

// ---- Students: the same person under two devices or names --------------------------------------
export const renameStudent = (group, key, name) => edit(g => { (g.names[group] ||= {})[key] = String(name).trim().slice(0, 60); });
export function mergeStudents(group, from, into) {
  return edit(g => {
    for (const s of g.sessions.filter(x => x.group === group && x.scores[from])) {
      const a = s.scores[into], b = s.scores[from];
      s.scores[into] = a ? a.map((v, i) => (v == null ? b[i] : b[i] == null ? v : Math.max(v, b[i]))) : b;
      delete s.scores[from];
    }
    if (g.names[group]) delete g.names[group][from];
  });
}

// ---- The report ---------------------------------------------------------------------------------
// The school year's terms (Spain): September–December, January–March, April–June, around a date.
export function terms(now = new Date()) {
  const y = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1, d = (yy, m, day) => new Date(yy, m, day).getTime();   // (from August: the new year)
  return [{ id: 't1', from: d(y, 8, 1), to: d(y + 1, 0, 1) - 1 }, { id: 't2', from: d(y + 1, 0, 1), to: d(y + 1, 3, 1) - 1 },
    { id: 't3', from: d(y + 1, 3, 1), to: d(y + 1, 6, 1) - 1 }, { id: 'year', from: d(y, 8, 1), to: d(y + 1, 7, 1) - 1 }];
}
// → { sessions: [{ id, title, date, kind, pct: { student: 0..1 | null } }], students: [{ key, name, mark (0–10) | null, done, of }] }
export function report(group, { from = 0, to = Infinity } = {}) {
  const g = load(), names = g.names[group] || {};
  const sessions = g.sessions.filter(s => s.group === group && s.date >= from && s.date <= to).sort((a, b) => a.date - b.date);
  const keys = new Set(); sessions.forEach(s => Object.keys(s.scores).forEach(k => keys.add(k)));
  const max = s => s.items.reduce((t, i) => t + (i.max || 0), 0);
  const out = sessions.map(s => ({ id: s.id, title: s.title, date: s.date, kind: s.kind, pct: Object.fromEntries([...keys].map(k => {
    const v = s.scores[k]; return [k, !v || v.every(x => x == null) || !max(s) ? null : v.reduce((t, x) => t + (x || 0), 0) / max(s)]; })) }));
  const students = [...keys].map(k => {
    const vals = out.map(s => s.pct[k]).filter(v => v != null);
    return { key: k, name: names[k] || (k.startsWith('n:') ? k.split(':')[1] : ''), mark: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 100) / 10 : null, done: vals.length, of: out.length };
  }).sort((a, b) => (a.name || '~').localeCompare(b.name || '~'));
  return { sessions: out, students };
}
// Item by item (the quizzes' questions and activities, the rubrics' criteria): the class's average share, the hardest first.
// → [{ session, date, label, pct (0..1), n }]
export function itemReport(group, { from = 0, to = Infinity } = {}) {
  const out = [];
  for (const s of load().sessions.filter(x => x.group === group && x.date >= from && x.date <= to))
    s.items.forEach((it, i) => { const v = Object.values(s.scores).map(x => x?.[i]).filter(x => x != null);
      if (v.length && it.max) out.push({ session: s.title, date: s.date, label: it.label, pct: v.reduce((a, b) => a + b, 0) / v.length / it.max, n: v.length }); });
  return out.sort((a, b) => a.pct - b.pct);
}
export function reportCSV(rep, L = { student: 'Alumno', mark: 'Nota (0-10)', done: 'Participación', none: 'Sin nombre' }) {
  const q = s => `"${String(s).replace(/"/g, '""')}"`, day = ts => new Date(ts).toISOString().slice(0, 10);
  return [[L.student, ...rep.sessions.map(s => `${day(s.date)} ${s.title}`), L.mark, L.done].map(q).join(','),
    ...rep.students.map(st => [q(st.name || L.none), ...rep.sessions.map(s => (s.pct[st.key] == null ? '' : (Math.round(s.pct[st.key] * 100) / 10).toString())), st.mark ?? '', `${st.done}/${st.of}`].join(','))].join('\n');
}

// ---- Rubrics ---------------------------------------------------------------------------------
export const rubrics = () => load().rubrics;
export function defaultRubric(name = 'Rúbrica', L = { levels: ['Excelente', 'Bien', 'Suficiente', 'Insuficiente'], criteria: ['Contenido', 'Organización', 'Presentación oral'] }) {
  return { name, criteria: L.criteria.map(c => ({ name: c, levels: L.levels.map((l, i) => ({ label: l, pts: L.levels.length - i, desc: '' })) })) };
}
export function saveRubric(r) {
  return edit(g => {
    const x = { id: r.id || uid(), name: String(r.name || '').trim().slice(0, 80) || 'Rúbrica',
      criteria: (r.criteria || []).slice(0, 20).map(c => ({ name: String(c.name || '').slice(0, 80), levels: (c.levels || []).slice(0, 6).map(l => ({ label: String(l.label || '').slice(0, 40), pts: Math.max(0, +l.pts || 0), desc: String(l.desc || '').slice(0, 300) })) })).filter(c => c.name && c.levels.length) };
    g.rubrics = g.rubrics.some(y => y.id === x.id) ? g.rubrics.map(y => (y.id === x.id ? x : y)) : [...g.rubrics, x];
    return x;
  });
}
export const deleteRubric = id => edit(g => { g.rubrics = g.rubrics.filter(r => r.id !== id); });
// As a table for a slide: criteria down, levels across (each cell: the level's words and points).
export function rubricRows(r) {
  const levels = r.criteria[0]?.levels || [];
  return [['', ...levels.map(l => `${l.label} (${l.pts})`)], ...r.criteria.map(c => [c.name, ...levels.map((_, i) => c.levels[i]?.desc || '')])];
}
