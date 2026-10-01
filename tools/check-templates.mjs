// Checks the example presentations (src/features/content/examples.js and
// templates/*.js): each one builds, and what it uses exists — layouts, objects
// inside the slide, 3D models from the libraries, animation effects,
// transitions, chart types, diagram layouts, poll kinds, palettes and fonts.
//   node tools/check-templates.mjs            all of them
//   node tools/check-templates.mjs edu sci    only those groups
// Exits with 1 and lists the problems if there are any.
import { execFileSync } from 'node:child_process';
execFileSync(process.execPath, [new URL('./build-catalog.mjs', import.meta.url).pathname], { stdio: 'inherit' });   // (the list, up to date first)
const { EXAMPLES, loadExample, CATEGORIES } = await import('../src/features/content/examples.js');
import { LIBRARY_3D } from '../src/features/content/library3d.js';
import { NASA_3D } from '../src/features/content/nasa3d.js';
import { EFFECT_KF } from '../src/features/animation/transitions.js';
import { PALETTES, FONT_PAIRS } from '../src/features/design/palettes.js';
import { DIAGRAM_LAYOUTS } from '../src/render/diagrams.js';

const only = process.argv.slice(2), problems = [];
// (Groups or files: node tools/check-templates.mjs edu edu_math)
for (const f of (await import('../src/features/content/templates/catalog.js')).BROKEN) if (!only.length || only.includes(f)) problems.push(`${f}.js: no se carga (mira el aviso de arriba)`);
const MODELS = new Set([...LIBRARY_3D.map(m => m.src), ...NASA_3D.map(m => m.src)]);
const EFFECTS = new Set([...Object.keys(EFFECT_KF), 'path', 'clip3d', 'pdfview']);
const TRANSITIONS = new Set(['none', 'fade', 'slide', 'convex', 'concave', 'zoom', 'flip', 'push', 'push-top', 'push-right', 'push-left', 'wipe', 'rise', 'split', 'circle', 'diamond', 'cube', 'cover', 'page', 'gallery', 'fall', 'drop', 'swirl', 'shrink', 'blur', 'flash']);
const CHARTS = new Set(['bar', 'stacked', 'stacked100', 'hbar', 'histogram', 'line', 'area', 'pie', 'doughnut', 'scatter', 'radar', 'waterfall', 'funnel', 'treemap', 'bubble', 'map']);
const LAYOUTS = new Set(DIAGRAM_LAYOUTS.flatMap(([, l]) => l.map(x => x[0])));
const POLLS = new Set(['choice', 'multi', 'rating', 'word', 'qa', 'quiz', 'board', 'order', 'match', 'gaps', 'label']);
const TYPES = new Set(['text', 'shape', 'image', 'icon', 'chart', 'table', 'code', 'math', 'model', 'video', 'audio', 'embed', 'poll', 'timer', 'connector', 'ink', 'diagram', 'camera', 'slideref', 'figindex', 'file']);
// (The first twenty, from before this check, are held to a lighter rule.)
const LEGACY = new Set(['lesson', 'report', 'pitch', 'coding', 'maths', 'science', 'history', 'meeting', 'event', 'portfolio', 'moving3d', 'effects', 'diagrams', 'classroom', 'launch', 'travel', 'quiz', 'dashboard', 'folio', 'canvas']);
let n = 0, slides = 0;
const counts = {};
for (const [key, meta] of Object.entries(EXAMPLES)) {
  if (only.length && !only.includes(meta.cat) && !only.includes(meta.file)) continue;
  const bad = m => problems.push(`${key}: ${m}`);
  if (!meta.name || !meta.summary || !CATEGORIES.some(([c]) => c === meta.cat)) bad('falta nombre, resumen o categoría válida');
  let d; try { d = await loadExample(key); if (!d) throw new Error('no existe'); } catch (e) { bad('no se construye: ' + e.message); continue; }
  n++; counts[meta.cat] = (counts[meta.cat] || 0) + 1; slides += d.slides.length;
  const W = d.size?.w || 1280, H = d.size?.h || 720;
  if ((d.slides.length < (LEGACY.has(key) ? 4 : 5)) || d.slides.length > 14) bad(`${d.slides.length} diapositivas (entre 5 y 14)`);
  if (d.palette && !PALETTES[d.palette] && d.palette !== 'custom') bad('paleta desconocida ' + d.palette);
  if (d.fontPair && !FONT_PAIRS[d.fontPair]) bad('tipos de letra desconocidos ' + d.fontPair);
  const ids = new Set();
  const noNotes = d.slides.filter(s => !String(s.notes || '').trim()).length;
  if (!LEGACY.has(key) && noNotes > d.slides.length / 2) bad(`${noNotes} diapositivas sin notas del orador`);
  d.slides.forEach((s, i) => {
    const at = `diapositiva ${i + 1}`;
    if (s.transition && !TRANSITIONS.has(String(s.transition).split(' ')[0])) bad(`${at}: transición «${s.transition}»`);
    if (!d.layouts?.some(l => l.id === s.layoutId)) bad(`${at}: diseño «${s.layoutId}»`);
    if (!s.blocks?.length) bad(`${at}: vacía`);
    for (const b of s.blocks || []) {
      const what = `${at}, ${b.type} ${String(b.html || b.alt || b.id || '').replace(/<[^>]*>/g, '').slice(0, 24)}`;
      if (ids.has(s.id + b.id)) bad(`${what}: id repetido`); ids.add(s.id + b.id);
      if (!TYPES.has(b.type)) bad(`${what}: tipo desconocido`);
      if (!(b.w > 0 && b.h > 0)) bad(`${what}: sin tamaño`);
      const deco = b.decorative || b.type === 'shape';
      const slack = deco ? 600 : 40;                      // (decorations may bleed off the slide; content may not)
      if (b.type !== 'connector' && (b.x < -slack || b.y < -slack || b.x + b.w > W + slack || b.y + b.h > H + slack)) bad(`${what}: fuera de la diapositiva (${b.x},${b.y} ${b.w}×${b.h})`);
      if (b.type === 'text' && !String(b.html || '').trim() && !b.ph) bad(`${what}: texto vacío`);
      if (b.type === 'model' && !MODELS.has(b.src)) bad(`${what}: modelo 3D que no está en las bibliotecas`);
      if (b.type === 'chart' && !CHARTS.has(b.chartType || 'bar')) bad(`${what}: gráfico «${b.chartType}»`);
      if (b.type === 'diagram' && !LAYOUTS.has(b.layout)) bad(`${what}: diagrama «${b.layout}»`);
      if (b.type === 'poll' && !POLLS.has(b.kind || 'choice')) bad(`${what}: votación «${b.kind}»`);
      for (const a of [b.animation, ...(b.anims || [])].filter(Boolean)) if (!EFFECTS.has(a.effect)) bad(`${what}: efecto «${a.effect}»`);
      if ((b.type === 'image' || b.type === 'video' || b.type === 'audio') && !/^(data:|https:\/\/|assets\/)/.test(b.src || '')) bad(`${what}: dirección «${String(b.src).slice(0, 40)}»`);
    }
  });
}
console.log(`${n} presentaciones, ${slides} diapositivas · ` + Object.entries(counts).map(([c, k]) => `${c} ${k}`).join(', '));
if (problems.length) { console.log(problems.map(p => '✗ ' + p).join('\n')); process.exit(1); }
console.log('PLANTILLAS OK');
