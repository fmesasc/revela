// Block insertion and manipulation.

import { shrinkImage } from './imgshrink.js';
import { diagramLayout, DIAGRAM_SAMPLES, DEFAULT_DIAGRAM_TEXT } from '../../render/diagrams.js';
import { cellNumber } from '../../core/formulas.js';
import { plainText, esc } from '../../core/text.js';
import { state, commit, currentSlide, selectedBlock,
  selectedBlocks, selectedIds, setSelection, setMulti } from '../../core/store.js';
import { DEFAULT_SHADOW } from '../../render/svg.js';
import { uid, textBlock, tableBlock, codeBlock, chartBlock, mathBlock, figindexBlock, slideRefBlock } from '../../core/model.js';
import { currentLang, t } from '../../i18n/index.js';
import { deckFg, currentPalette } from '../design/palettes.js';
import { ACTION_GOTO, SHAPE_NAMES, isLineShape, isOpenShape, mapMatch } from '../../render/svg.js';
import { loadMap, MAP_SAMPLES } from '../content/maps.js';

function insert(block) {
  commit(() => {
    // Not exactly on top of another one inserted there before: a little lower and to the right.
    const s = currentSlide(), { w, h } = state.deck.size;
    for (let k = 0; k < 20 && s.blocks.some(b => Math.abs(b.x - block.x) < 2 && Math.abs(b.y - block.y) < 2); k++) {
      if (block.x + block.w + 24 > w || block.y + block.h + 24 > h) break;
      block.x += 24; block.y += 24;
    }
    s.blocks.push(block); setSelection(block.id);
  });
}

// Delete / duplicate the whole selection (one or many).
export function deleteSelected() {
  const ids = new Set(selectedIds()); if (!ids.size) return;
  commit(() => {
    const s = currentSlide();
    s.blocks = s.blocks.filter(b => !ids.has(b.id));
    // Drop connectors whose endpoints no longer exist.
    const alive = new Set(s.blocks.map(b => b.id));
    s.blocks = s.blocks.filter(b => b.type !== 'connector' || (alive.has(b.from) && alive.has(b.to)));
    setSelection(null);
  });
}
export function duplicateSelected() {
  const bs = selectedBlocks(); if (!bs.length) return;
  commit(() => {
    const s = currentSlide();
    const copies = bs.map(b => { const c = structuredClone(b); c.id = uid(); c.x += 24; c.y += 24; return c; });
    s.blocks.push(...copies);
    setMulti(copies.map(c => c.id));
  });
}

export function addText(html = 'Escribe aquí') { insert(textBlock({ html })); }
export function addWordArt(preset) {
  insert(textBlock({ html: 'Text Art', fontSize: 80, w: 620, h: 160, textAlign: 'center', wordart: preset }));
}
export function addDate() {
  const d = new Date().toLocaleDateString(currentLang());
  insert(textBlock({ html: d, fontSize: 28, w: 320, h: 60, x: 900, y: 650, textAlign: 'right' }));
}

export function addModel(src) {
  insert({ id: uid(), type: 'model', x: 440, y: 130, w: 400, h: 400,
    rotation: 0, animation: null, src, autoRotate: true });
}

// The box takes the picture's own proportion (within 600 × 460, about the same centre)
// once it has loaded, so its handles sit on the picture's edges.
export function addImage(src) {
  const b = { id: uid(), type: 'image', x: 340, y: 130, w: 600, h: 460, rotation: 0, animation: null, src, fit: 'contain' };
  insert(b);
  if (typeof Image !== 'function') return;
  const i = new Image();
  i.onload = () => {
    const r = i.naturalWidth / i.naturalHeight; if (!(r > 0) || b.w !== 600 || b.h !== 460) return;   // (already resized by hand)
    const w = r > 600 / 460 ? 600 : Math.round(460 * r), h = r > 600 / 460 ? Math.round(600 / r) : 460;
    commit(() => { Object.assign(b, { x: Math.round(b.x + (b.w - w) / 2), y: Math.round(b.y + (b.h - h) / 2), w, h }); }, { history: false });
  };
  i.src = src;
  // (A big one gets smaller in a moment — as each person chose: imgshrink.js —, without an undo step of its own.)
  shrinkImage(src).then(small => { if (small && b.src === src) commit(() => { b.src = small; }, { history: false }); }).catch(() => {});
}

export function addVideo(src) {
  insert({ id: uid(), type: 'video', x: 300, y: 140, w: 680, h: 440,
    rotation: 0, animation: null, src });
}

export function addAudio(src) {
  insert({ id: uid(), type: 'audio', x: 320, y: 320, w: 440, h: 56, rotation: 0, animation: null, src });
}

// A web page embedded ('frame', the default) or as a card that opens it ('card').
export function setEmbedDisplay(id, display) {
  const b = currentSlide().blocks.find(x => x.id === id); if (!b || b.type !== 'embed') return;
  commit(() => { if (display === 'card') b.display = 'card'; else delete b.display; });
}
export function setWebCard(id, props) {
  const b = currentSlide().blocks.find(x => x.id === id); if (!b || b.type !== 'embed') return;
  commit(() => { for (const [k, v] of Object.entries(props)) { if (v) b[k] = v; else delete b[k]; } });
}

// The address a site allows inside other pages: a video's normal page refuses
// to be framed, its player doesn't. Other addresses are left as they are.
export function embedUrl(input) {
  const url = String(input || '').trim();
  let u; try { u = new URL(url); } catch { return url; }
  const host = u.hostname.replace(/^(www\.|m\.)/, '');
  const t = u.searchParams.get('t') || u.searchParams.get('start');
  const start = t && /^\d+s?$/.test(t) ? `?start=${parseInt(t, 10)}` : '';
  let id = null;
  if (host === 'youtu.be') id = u.pathname.slice(1);
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (u.pathname === '/watch') id = u.searchParams.get('v');
    else { const m = u.pathname.match(/^\/(?:shorts|live|embed)\/([\w-]+)/); if (m) id = m[1]; }
  }
  if (id && /^[\w-]{6,}$/.test(id)) return `https://www.youtube.com/embed/${id}${start}`;
  if (host === 'vimeo.com') { const m = u.pathname.match(/^\/(\d+)/); if (m) return `https://player.vimeo.com/video/${m[1]}`; }
  // Design and whiteboard tools, and Google's documents: their "embed" addresses.
  if (host === 'figma.com' && /^\/(file|design|proto|board|slides)\//.test(u.pathname)) return `https://www.figma.com/embed?embed_host=revela&url=${encodeURIComponent(url)}`;
  if (host === 'miro.com') { const m = u.pathname.match(/^\/app\/board\/([^/]+)/); if (m) return `https://miro.com/app/live-embed/${m[1]}/?embedMode=view_only_without_ui`; }
  if (host === 'canva.com') { const m = u.pathname.match(/^\/design\/([\w-]+)\/([\w-]+)/); if (m) return `https://www.canva.com/design/${m[1]}/${m[2]}/view?embed`; }
  if (host === 'loom.com') { const m = u.pathname.match(/^\/share\/([\w-]+)/); if (m) return `https://www.loom.com/embed/${m[1]}`; }
  if (host === 'docs.google.com') {
    const m = u.pathname.match(/^\/(presentation|document|spreadsheets|forms)\/d\/(e\/)?([\w-]+)/);
    if (m) return `https://docs.google.com/${m[1]}/d/${m[2] || ''}${m[3]}/${m[1] === 'presentation' ? 'embed' : m[1] === 'forms' ? 'viewform?embedded=true' : 'preview'}`;
  }
  return url;
}
// A video clip (YouTube, Vimeo): from/to in seconds (0 or empty: from the start / to the end).
// Each slide can show its own part of the same video, like chapters.
export const parseTime = s => { s = String(s ?? '').trim(); if (!s) return 0; const p = s.split(':').map(Number); return p.some(isNaN) ? NaN : p.reduce((t, v) => t * 60 + v, 0); };
export const isVideoEmbed = src => /^https:\/\/(www\.youtube\.com\/embed|player\.vimeo\.com\/video)\//.test(src || '');
export function clipOf(src) {
  let u; try { u = new URL(src); } catch { return { start: 0, end: 0 }; }
  if (u.hostname === 'player.vimeo.com') { const m = u.hash.match(/t=(\d+)/); return { start: m ? +m[1] : 0, end: 0 }; }
  return { start: +u.searchParams.get('start') || 0, end: +u.searchParams.get('end') || 0 };
}
export function withClip(src, start, end) {
  const u = new URL(src);
  if (u.hostname === 'player.vimeo.com') { u.hash = start > 0 ? `t=${Math.round(start)}s` : ''; return u.toString(); }
  for (const [k, v] of [['start', start], ['end', end]]) { if (v > 0) u.searchParams.set(k, String(Math.round(v))); else u.searchParams.delete(k); }
  return u.toString();
}
export function setVideoClip(id, start, end) {
  const b = currentSlide().blocks.find(x => x.id === id); if (!b || b.type !== 'embed' || !isVideoEmbed(b.src)) return false;
  if (!(start >= 0) || !(end >= 0) || (end && end <= start)) return false;
  commit(() => { b.src = withClip(b.src, start, end); });
  return true;
}

export function addEmbed(url) {
  insert({ id: uid(), type: 'embed', x: 260, y: 120, w: 760, h: 480,
    rotation: 0, animation: null, src: embedUrl(url) });
}

export function setAlt(text, decorative = false) {
  const b = selectedBlock(); if (!b) return;
  commit(() => { b.alt = decorative ? '' : text; if (decorative) b.decorative = true; else delete b.decorative; });
}
// Reading order (= stacking order, as in PowerPoint's Selection pane): move one
// object earlier (-1) or later (+1) in the slide.
export function moveInOrder(id, dir) {
  commit(() => {
    const arr = currentSlide().blocks, i = arr.findIndex(b => b.id === id), j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  });
}

// Selection pane (PowerPoint's): hide an object (in the editor, the thumbnails
// and the presentation; PowerPoint keeps it hidden too), give it a name, or
// move it to another place in the stacking order (0 = at the back).
export function setHidden(id, on) {
  const b = currentSlide().blocks.find(x => x.id === id); if (!b) return;
  commit(() => { if (on) b.hidden = true; else delete b.hidden; });
}
export function setAllHidden(on) {
  commit(() => { for (const b of currentSlide().blocks) if (on) b.hidden = true; else delete b.hidden; });
}
export function renameBlock(id, name) {
  const b = currentSlide().blocks.find(x => x.id === id); if (!b) return;
  name = String(name || '').trim().slice(0, 80);
  commit(() => { if (name) b.label = name; else delete b.label; });
}
export function moveToIndex(id, to) {
  commit(() => {
    const arr = currentSlide().blocks, i = arr.findIndex(b => b.id === id); if (i < 0) return;
    const [b] = arr.splice(i, 1); arr.splice(Math.max(0, Math.min(arr.length, to)), 0, b);
  });
}

// Fill / border for a text box (also used by diagrams).
export function setBoxStyle(props) {
  const b = selectedBlock(); if (!b || (b.type !== 'text' && b.type !== 'math')) return;
  commit(() => Object.assign(b, props));
}

// Diagrams (SmartArt): one object, its text as an outline, laid out and
// coloured by render/diagrams.js. Its colours follow the theme's.
// (`back`: the slide's background, so that the words on it read — see readableOn.)
export const diagramOpts = (deck = state.deck, slide = deck === state.deck ? currentSlide() : null) => ({ accents: currentPalette(deck).accents, fg: deckFg(deck), back: slide?.background || currentPalette(deck).bg });
export function addDiagram(layout = 'process') {
  const { w, h } = state.deck.size, bw = Math.round(w * 0.78), bh = Math.round(h * 0.62);
  // (The sample text in the app's language, line by line, keeping its indentation.)
  const text = (DIAGRAM_SAMPLES[layout] || DEFAULT_DIAGRAM_TEXT).split('\n').map(l => l.match(/^\s*/)[0] + t(l.trim())).join('\n');
  insert({ id: uid(), type: 'diagram', layout, colors: 'colorful', text,
    x: Math.round((w - bw) / 2), y: Math.round(h * 0.22), w: bw, h: bh, rotation: 0, animation: null });
}
export function setDiagram(id, props) {
  const b = currentSlide().blocks.find(x => x.id === id); if (!b || b.type !== 'diagram') return;
  commit(() => { for (const [k, v] of Object.entries(props)) if (v == null || v === false) delete b[k]; else b[k] = v; });
}
// "Convert to shapes": each part a shape of its own (boxes keep their text inside), all grouped, in its place.
export function diagramToShapes(id) {
  const s = currentSlide(), at = s.blocks.findIndex(x => x.id === id), b = s.blocks[at]; if (!b || b.type !== 'diagram') return;
  const parts = diagramLayout(b, diagramOpts()), g = uid(), made = [], f = v => +v.toFixed(2);
  const htmlOf = p => `<div><b>${esc(p.text)}</b></div>` + (p.sub ? p.sub.split('\n').map(l => `<div style="font-size:${Math.max(10, Math.round(p.fs * 0.72))}px">${esc(l)}</div>`).join('') : '');
  const texts = parts.filter(p => p.type === 'text');
  for (const p of parts) {
    if (p.type === 'text') continue;
    const box = p.type === 'poly' ? (() => { const xs = p.pts.map(q => q[0]), ys = p.pts.map(q => q[1]), x = Math.min(...xs), y = Math.min(...ys);
      return { x, y, w: Math.max(2, Math.max(...xs) - x), h: Math.max(2, Math.max(...ys) - y) }; })() : { x: p.x, y: p.y, w: p.w, h: p.h };
    const o = { id: uid(), type: 'shape', groupId: g, x: Math.round(b.x + box.x), y: Math.round(b.y + box.y), w: Math.round(box.w), h: Math.round(box.h), rotation: 0, animation: null,
      fill: p.fill, stroke: p.stroke === 'none' ? (p.fill === 'none' ? '#888888' : p.fill) : p.stroke, strokeWidth: p.stroke === 'none' ? 0 : (p.sw || 2) };
    if (p.type === 'rect') Object.assign(o, p.r > 1 ? { shape: 'rounded', radius: Math.round(p.r) } : { shape: 'rect' });
    else if (p.type === 'ellipse') o.shape = 'ellipse';
    else {
      const pts = p.pts.map(([x, y]) => [f((x - box.x) / box.w * 100), f((y - box.y) / box.h * 100)]);
      Object.assign(o, { shape: 'custom', path: 'M' + pts.map(q => q.join(' ')).join('L') + (p.closed ? 'Z' : ''), ...(p.closed && { rings: [pts] }) });
      if (!p.closed) { o.fill = 'none'; o.stroke = p.stroke; o.strokeWidth = p.sw || 2; }
    }
    if (p.opacity != null && p.opacity < 1) o.opacity = Math.round(p.opacity * 100);
    // Its text, if a text box sits on it (the box's own words, in the shape).
    const t = (p.type === 'rect' || p.type === 'ellipse' || p.closed) && texts.find(q => !q.used && q.i === p.i && q.x >= box.x - 1 && q.y >= box.y - 1 && q.x + q.w <= box.x + box.w + 1 && q.y + q.h <= box.y + box.h + 1);
    if (t) { t.used = true; Object.assign(o, { html: htmlOf(t), fontSize: t.fs, color: t.color, textAlign: t.align }); }
    made.push(o);
  }
  for (const t of texts.filter(q => !q.used))
    made.push({ id: uid(), type: 'text', groupId: g, x: Math.round(b.x + t.x), y: Math.round(b.y + t.y), w: Math.round(t.w), h: Math.round(t.h), rotation: 0, animation: null,
      html: htmlOf(t), fontSize: t.fs, color: t.color, textAlign: t.align, vAlign: t.valign === 'bottom' ? 'bottom' : t.valign === 'top' ? 'top' : 'middle' });
  commit(() => { s.blocks.splice(at, 1, ...made); state.ui.selection = made[0]?.id || null; state.ui.multi = made.map(x => x.id); });
}

export function addTable() { insert(tableBlock()); }
// CSV / TSV (a file, or a range pasted from a spreadsheet) → rows of cells.
// Handles quoted fields with separators, doubled quotes and line breaks.
export function parseDelimited(text) {
  text = String(text || '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').replace(/\n+$/, '');
  const first = text.split('\n')[0] || '';
  const sep = first.includes('\t') ? '\t' : (first.split(';').length > first.split(',').length ? ';' : ',');
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"' && cell === '') q = true;
    else if (c === sep) { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  row.push(cell); rows.push(row);
  const cols = Math.max(...rows.map(r => r.length));
  return rows.map(r => Array.from({ length: cols }, (_, i) => (r[i] ?? '').trim()));
}
const escCell = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
// Insert a table from delimited text (first row as header).
export function addTableFromText(text) {
  const rows = parseDelimited(text).slice(0, 60).map(r => r.slice(0, 12).map(escCell));
  if (!rows.length || !rows[0].length) return null;
  const { w, h } = state.deck.size;
  const tb = tableBlock({ rows, header: true, x: 80, y: 120, w: w - 160, h: Math.min(h - 180, 44 * rows.length + 10) });
  insert(tb);
  return tb;
}
// Insert a table from rows of plain text (a rubric, for instance; first row as header).
export function addTableRows(rows) {
  const r = rows.slice(0, 60).map(x => x.slice(0, 12).map(c => escCell(String(c ?? ''))));
  if (!r.length) return null;
  const { w, h } = state.deck.size;
  const tb = tableBlock({ rows: r, header: true, x: 60, y: 110, w: w - 120, h: Math.min(h - 160, 70 * r.length), fontSize: r.length > 5 ? 14 : 16 });
  insert(tb);
  return tb;
}
export function addCode() { insert(codeBlock()); }
export function setCode(props) {
  const b = selectedBlock(); if (!b || b.type !== 'code') return;
  commit(() => Object.assign(b, props));
}
// Tab stops of a text box ({ pos: px from the text's left edge, align: left | center | right | decimal }).
export function setTabs(id, list) {
  const b = currentSlide().blocks.find(x => x.id === id); if (!b) return;
  const ok = (list || []).filter(s => s.pos > 0 && ['left', 'center', 'right', 'decimal'].includes(s.align || 'left'))
    .map(s => ({ pos: Math.round(s.pos * 10) / 10, align: s.align || 'left' })).sort((a, c) => a.pos - c.pos);
  commit(() => { if (ok.length) b.tabs = ok; else delete b.tabs; });
}
// An attached file or PDF (features/content/files.js makes the block).
export function addFileBlock(b) { insert(b); }
export function addChart() { insert(chartBlock()); }
export function addMath() { insert(mathBlock()); }
// A countdown (5 minutes, a ring; starts when its slide is shown, beeps at the end).
export function addTimer(seconds = 300) {
  const { w, h } = state.deck.size, s = 300;
  insert({ id: uid(), type: 'timer', seconds, style: 'ring', color: deckFg(), auto: true, sound: true,
    x: Math.round((w - s) / 2), y: Math.round((h - s) / 2), w: s, h: s, rotation: 0, animation: null });
}
export function addFigIndex(kind = 'all') { insert(figindexBlock({ kind })); }

// Slide zoom: an embedded thumbnail of another slide, clickable in the show.
// An object as a link (PowerPoint's "Link"): to a web page (href) or to a slide (goto: next,
// prev, first, last or a slide's id). Neither: no link.
export function setObjectLink(id, { href = '', goto = '' } = {}) {
  commit(() => {
    const b = currentSlide().blocks.find(x => x.id === id); if (!b) return;
    if (href) b.href = href; else delete b.href;
    if (goto) b.goto = goto; else delete b.goto;
  });
}
// A chart becomes a map (or another map): its outlines are loaded once and kept in
// the chart; if its data don't name any region of the map, the map's sample data.
export async function setChartMap(id, scope = 'world') {
  const map = await loadMap(scope);
  commit(() => {
    const b = state.deck.slides.flatMap(s => s.blocks).find(x => x.id === id); if (!b) return;
    b.chartType = 'map'; b.mapScope = scope; b.map = map;
    if (!mapMatch(map, b.data || []).size) { b.data = MAP_SAMPLES[scope].map(([label, value]) => ({ label, value })); delete b.series; }
  });
}
// One of the presentation's own fonts (a .ttf, .otf or .woff file): kept inside it; returns its CSS stack.
export function addCustomFont(name, dataURL) {
  name = String(name || '').replace(/[^\p{L}\p{N} ._-]+/gu, ' ').trim().slice(0, 40) || 'Fuente propia';
  commit(() => { state.deck.fonts = [...(state.deck.fonts || []).filter(f => f.name !== name), { name, src: dataURL }]; });
  return `"${name}", sans-serif`;
}
// A freeform shape drawn by hand: its outline (slide points) as a closed shape
// in its own box (points 0…100, kept as a ring so it merges and exports to PowerPoint).
export function addFreeform(points) {
  if (points.length < 3) return null;
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]), x = Math.min(...xs), y = Math.min(...ys);
  const w = Math.max(8, Math.max(...xs) - x), h = Math.max(8, Math.max(...ys) - y), accent = currentPalette().accents[0];
  const ring = points.map(([px, py]) => [+((px - x) / w * 100).toFixed(1), +((py - y) / h * 100).toFixed(1)]);
  const block = { id: uid(), type: 'shape', shape: 'custom', rings: [ring], path: 'M' + ring.map(p => p.join(' ')).join('L') + 'Z',
    x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), rotation: 0, animation: null, fill: accent, stroke: darker(accent), strokeWidth: 2 };
  insert(block);
  return block;
}
// A slide zoom: to another slide (the first other one if not said), centred on
// a point of the slide if given (a thumbnail dropped there), inside the slide.
export function addSlideRef(target = null, at = null) {
  const cur = currentSlide();
  const other = (target && state.deck.slides.find(s => s.id === target)) || state.deck.slides.find(s => s.id !== cur.id) || cur;
  const { w, h } = state.deck.size; const bw = 420, bh = Math.round(bw * h / w);
  const pos = at ? { x: Math.round(Math.min(Math.max(0, at[0] - bw / 2), w - bw)), y: Math.round(Math.min(Math.max(0, at[1] - bh / 2), h - bh)) } : {};
  insert(slideRefBlock({ target: other.id, w: bw, h: bh, ...pos }));
}
// Summary zoom: a grid of slide zooms — one per section (its first slide), or
// one per slide if there are no sections.
export function addSummaryZoom() {
  const { w, h } = state.deck.size; const cur = currentSlide();
  let targets = [];
  if (state.deck.sections.length) {
    for (const sec of state.deck.sections) { const first = state.deck.slides.find(s => s.sectionId === sec.id); if (first) targets.push(first); }
  }
  if (!targets.length) targets = state.deck.slides.filter(s => s.id !== cur.id);
  if (!targets.length) return;
  commit(() => {
    const cols = Math.min(3, targets.length);
    const pad = 60, gap = 30, cw = (w - pad * 2 - gap * (cols - 1)) / cols, ch = cw * h / w;
    targets.forEach((tg, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      cur.blocks.push(slideRefBlock({ target: tg.id, x: Math.round(pad + c * (cw + gap)), y: Math.round(160 + r * (ch + gap)), w: Math.round(cw), h: Math.round(ch), returnBack: true }));
    });
    setSelection(null);
  });
}

export function setSlideRefTarget(id) {
  const b = selectedBlock(); if (!b || b.type !== 'slideref') return;
  commit(() => { b.target = id; });
}
export function toggleSlideRefReturn() {
  const b = selectedBlock(); if (!b || b.type !== 'slideref') return;
  commit(() => { b.returnBack = !b.returnBack; });
}
export function setFigIndexKind(kind) {
  const b = selectedBlock(); if (!b || b.type !== 'figindex') return;
  commit(() => { b.kind = kind; });
}
export function setCaption(text) {
  const b = selectedBlock(); if (!b) return;
  commit(() => { if (text) b.caption = text; else delete b.caption; });
}
export function setMath(latex, id = null) {
  const b = id ? currentSlide().blocks.find(x => x.id === id) : selectedBlock(); if (!b || b.type !== 'math') return;
  commit(() => { b.latex = latex; });
}
// Freehand ink stroke from absolute slide points → an 'ink' block fitted to it.
// It isn't selected, so the user can keep drawing.
export function addInk(points, { color = '#ff2d2d', width = 4, hl = false } = {}) {
  if (!points || !points.length) return null;
  const pad = width / 2 + 2;
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
  const x = Math.floor(Math.min(...xs) - pad), y = Math.floor(Math.min(...ys) - pad);
  const w = Math.max(4, Math.ceil(Math.max(...xs) + pad) - x), h = Math.max(4, Math.ceil(Math.max(...ys) + pad) - y);
  const rel = points.map(([px, py]) => [+(px - x).toFixed(1), +(py - y).toFixed(1)]);
  const b = { id: uid(), type: 'ink', points: rel, vw: w, vh: h, color, width, hl, x, y, w, h, rotation: 0, animation: null };
  commit(() => { currentSlide().blocks.push(b); });
  return b;
}
export function addIcon(name) {
  insert({ id: uid(), type: 'icon', icon: name, color: '#ffffff', x: 560, y: 280, w: 160, h: 160, rotation: 0, animation: null });
}
// Another icon in its place (same size, colour and position).
export function setIcon(id, name) {
  const b = currentSlide().blocks.find(x => x.id === id); if (!b || b.type !== 'icon' || !name) return;
  commit(() => { b.icon = name; });
}
export function setIconColor(color) {
  const b = selectedBlock(); if (!b || b.type !== 'icon') return;
  commit(() => { b.color = color; }, { history: false });
}

// Connect the two selected blocks with a line/arrow that follows them.
export function addConnector() {
  const bs = selectedBlocks().filter(b => b.type !== 'connector');
  if (bs.length !== 2) return;
  const { w, h } = state.deck.size;
  commit(() => {
    const c = { id: uid(), type: 'connector', from: bs[0].id, to: bs[1].id, color: '#8a8a8a', arrow: true,
      x: 0, y: 0, w, h, rotation: 0, animation: null };
    currentSlide().blocks.push(c); setSelection(c.id);
  });
}
// Chart data as a grid of text: first column labels, one column per series,
// optional header row with the series names. Accepts commas, semicolons or tabs
// (so a range copied from a spreadsheet can be pasted as is).
export function parseChartGrid(text) {
  const rows = String(text || '').split(/\r?\n/).filter(l => l.trim())
    .map(l => (l.includes('\t') ? l.split('\t') : l.includes(';') ? l.split(';') : l.split(',')).map(c => c.trim()));
  if (!rows.length) return { data: [], series: [], names: [] };
  const num = c => c !== '' && isFinite(parseFloat(c.replace(',', '.')));
  const hasHead = rows[0].slice(1).some(c => c && !num(c));
  const names = hasHead ? rows.shift().slice(1) : [];
  const cols = Math.max(2, ...rows.map(r => r.length));
  const val = c => parseFloat(String(c || '').replace(',', '.')) || 0;
  return {
    names,
    data: rows.map(r => ({ label: r[0] || '', value: val(r[1]) })),
    series: Array.from({ length: cols - 2 }, (_, k) => ({ name: names[k + 1] || '', values: rows.map(r => val(r[k + 2])) })),
  };
}
export function chartGridText(b) {
  const extra = b.series || [];
  const head = extra.length || b.seriesName ? [['', b.seriesName || 'Serie 1', ...extra.map((x, i) => x.name || `Serie ${i + 2}`)].join(',')] : [];
  return head.concat((b.data || []).map((d, i) => [d.label, d.value, ...extra.map(x => (x.values || [])[i] ?? 0)].join(','))).join('\n');
}
export function setChartGrid(text, props = {}) {
  const { data, series, names } = parseChartGrid(text);
  const b = selectedBlock(); if (!b || b.type !== 'chart') return;
  const old = b.series || [];
  commit(() => {
    Object.assign(b, props, { data });
    for (const k in props) if (props[k] === undefined) delete b[k];   // (an option left empty: automatic again)
    if (names[0]) b.seriesName = names[0]; else delete b.seriesName;
    if (series.length) b.series = series.map((x, i) => ({ ...x, color: old[i]?.color })).map(x => (x.color ? x : { name: x.name, values: x.values }));
    else delete b.series;
  });
}
// Insert a chart built from the selected table: first column = labels, other
// columns = series, header row (if any) = series names.
export function chartFromTable() {
  const tb = selectedBlock(); if (!tb || tb.type !== 'table') return;
  const txt = h => { const d = document.createElement('div'); d.innerHTML = h || ''; return (d.textContent || '').trim().replace(/[,;\t]/g, ' '); };
  const grid = tb.rows.map(r => r.map(txt).join('\t')).join('\n');
  const { data, series, names } = parseChartGrid(grid);
  const c = chartBlock({ data, x: Math.min(tb.x + 40, state.deck.size.w - 640), y: Math.min(tb.y + 40, state.deck.size.h - 360) });
  if (names[0]) c.seriesName = names[0];
  if (series.length) c.series = series;
  insert(c);
}

export function setChart(props) {
  const b = selectedBlock(); if (!b || b.type !== 'chart') return;
  commit(() => Object.assign(b, props));
}

// Table row/column edits act on the selected table.
function withTable(fn) { const b = selectedBlock(); if (b && b.type === 'table') commit(() => fn(b)); }
export const tableAddRow = () => withTable(b => b.rows.push(Array(b.rows[0]?.length || 1).fill('')));
export const tableAddCol = () => withTable(b => b.rows.forEach(r => r.push('')));
// A row of totals under the numbers (Excel's AutoSum): "Total" and, under each column with numbers, a formula adding them.
export const tableAddTotal = () => withTable(b => {
  const cols = b.rows[0]?.length || 1, from = b.header ? 1 : 0;
  const row = Array.from({ length: cols }, (_, c) => (b.rows.slice(from).some(r => cellNumber(plainText(r[c] || ''))) ? t('=SUMA(ARRIBA)') : ''));
  if (!row[0]) row[0] = `<b>${t('Total')}</b>`;
  b.rows.push(row);
});
export const tableDelRow = () => withTable(b => { if (b.rows.length > 1) { b.rows.pop(); clampMerges(b); } });
export const tableDelCol = () => withTable(b => { if ((b.rows[0]?.length || 0) > 1) { b.rows.forEach(r => r.pop()); clampMerges(b); } });
// Merged cells live in b.merges = [{r, c, rs, cs}] (top-left cell + span).
function clampMerges(b) {
  const R = b.rows.length, C = b.rows[0]?.length || 0;
  b.merges = (b.merges || []).map(m => ({ ...m, rs: Math.min(m.rs, R - m.r), cs: Math.min(m.cs, C - m.c) }))
    .filter(m => m.r < R && m.c < C && (m.rs > 1 || m.cs > 1));
  if (!b.merges.length) delete b.merges;
}
export const mergeAt = (b, r, c) => (b.merges || []).find(m => r >= m.r && r < m.r + m.rs && c >= m.c && c < m.c + m.cs);
// Merge the cell at (r,c) (or the merge containing it) with its right / lower neighbour.
export function tableMerge(r, c, dir) {
  withTable(b => {
    const R = b.rows.length, C = b.rows[0]?.length || 0;
    const cur = mergeAt(b, r, c) || { r, c, rs: 1, cs: 1 };
    const next = dir === 'down'
      ? { r: cur.r, c: cur.c, rs: cur.rs + 1, cs: cur.cs }
      : { r: cur.r, c: cur.c, rs: cur.rs, cs: cur.cs + 1 };
    if (next.r + next.rs > R || next.c + next.cs > C) return;
    // Absorb any merges that overlap the new area; grow the area to cover them fully.
    let ms = b.merges || [], grew = true;
    while (grew) {
      grew = false;
      for (const m of ms) {
        const hit = m.r < next.r + next.rs && m.r + m.rs > next.r && m.c < next.c + next.cs && m.c + m.cs > next.c;
        if (!hit) continue;
        const r2 = Math.max(next.r + next.rs, m.r + m.rs), c2 = Math.max(next.c + next.cs, m.c + m.cs);
        const r1 = Math.min(next.r, m.r), c1 = Math.min(next.c, m.c);
        if (r1 !== next.r || c1 !== next.c || r2 - r1 !== next.rs || c2 - c1 !== next.cs) { Object.assign(next, { r: r1, c: c1, rs: r2 - r1, cs: c2 - c1 }); grew = true; }
      }
    }
    if (next.r + next.rs > R || next.c + next.cs > C) return;
    const inside = m => m.r >= next.r && m.c >= next.c && m.r + m.rs <= next.r + next.rs && m.c + m.cs <= next.c + next.cs;
    // Join the text of the absorbed cells into the top-left one, like the office suites do.
    const texts = [];
    for (let i = next.r; i < next.r + next.rs; i++) for (let j = next.c; j < next.c + next.cs; j++) {
      const v = b.rows[i][j]; if (v && String(v).trim()) texts.push(v);
      if (i !== next.r || j !== next.c) b.rows[i][j] = '';
    }
    b.rows[next.r][next.c] = texts.join(' ');
    b.merges = ms.filter(m => !inside(m)).concat(next);
  });
}
export function tableSplit(r, c) {
  withTable(b => { const m = mergeAt(b, r, c); if (!m) return; b.merges = b.merges.filter(x => x !== m); if (!b.merges.length) delete b.merges; });
}
export const tableToggleHeader = () => withTable(b => { b.header = !b.header; });
// Table style: a preset (colours from the palette) and/or the option toggles.
export const setTableStyle = props => withTable(b => {
  for (const [k, v] of Object.entries(props)) { if (v === '' || v == null || v === false) delete b[k]; else b[k] = v; }
});

// A new shape takes the theme's first accent, with an outline a shade darker (as PowerPoint does).
const darker = (hex, k = 0.72) => '#' + [1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0')).join('');
export function addShape(kind) {
  const linear = isLineShape(kind), accent = currentPalette().accents[0];
  if (ACTION_GOTO[kind]) {                                          // an action button: small, square, and it already goes somewhere
    const { w, h } = state.deck.size;
    insert({ id: uid(), type: 'shape', shape: kind, x: w - 150, y: h - 150, w: 96, h: 96, rotation: 0, animation: null, fill: accent, stroke: darker(accent), strokeWidth: 2,
      goto: ACTION_GOTO[kind], alt: t(SHAPE_NAMES[kind]) });
    return;
  }
  if (isOpenShape(kind)) {                                          // arcs, brackets and braces: a line, not a filled shape
    const narrow = kind !== 'arc';
    insert({ id: uid(), type: 'shape', shape: kind, x: narrow ? 560 : 510, y: 230, w: narrow ? 120 : 260, h: narrow ? 260 : 200, rotation: 0, animation: null,
      fill: 'none', stroke: accent, strokeWidth: 4 });
    return;
  }
  const square = ['ellipse', 'star', 'star4', 'star6', 'star8', 'seal', 'burst', 'heart', 'donut', 'plus', 'minus', 'multiply', 'divide', 'equal', 'octagon',
    'heptagon', 'decagon', 'hexagon', 'pentagon', 'quadarrow', 'moon', 'teardrop', 'cloud', 'lightning',
    'pie', 'chord', 'cube', 'smiley', 'sun', 'nosymbol', 'thought', 'foldedcorner'].includes(kind);
  insert({
    id: uid(), type: 'shape', shape: kind,
    x: square ? 510 : 460, y: 230, w: linear ? 420 : square ? 260 : 320, h: linear ? 120 : 260 - (square ? 0 : 20),
    rotation: 0, animation: null,
    fill: linear ? 'none' : accent, stroke: linear ? accent : darker(accent), strokeWidth: linear ? 6 : 2,
  });
}

// Line style of the selected objects: shapes, lines and connectors, and the
// border of text boxes and equations.
export function setLineDash(dash) {
  const list = selectedBlocks(); if (!list.length) return;
  commit(() => { for (const b of list) {
    const key = b.type === 'shape' || b.type === 'connector' ? 'dash' : (b.type === 'text' || b.type === 'math') ? 'borderDash' : null;
    if (!key) continue;
    if (dash && dash !== 'solid') b[key] = dash; else delete b[key];
  } });
}
// Shadow on/off for the selected objects.
export function toggleShadow() {
  const list = selectedBlocks(); if (!list.length) return;
  const on = !list.every(b => b.shadow);
  commit(() => { for (const b of list) { if (on) b.shadow = { ...DEFAULT_SHADOW }; else delete b.shadow; } });
}
// (Every selected shape.)
export function setShapeStyle(prop, value) {
  const list = selectedBlocks().filter(b => b.type === 'shape'); if (!list.length) return;
  commit(() => { for (const b of list) b[prop] = value; });
}

const DEF_ADJ = { brightness: 100, contrast: 100, saturate: 100, opacity: 100 };
export function setImageAdj(prop, value) {
  const b = selectedBlock(); if (!b || b.type !== 'image') return;
  commit(() => { b.adj = Object.assign({ ...DEF_ADJ }, b.adj); b.adj[prop] = +value; }, { history: false });
}
export function resetImageAdj() {
  const b = selectedBlock(); if (!b || b.type !== 'image') return;
  commit(() => { delete b.adj; });
}

const DEF_CROP = { top: 0, right: 0, bottom: 0, left: 0 };
export function setImageCrop(side, value) {
  const b = selectedBlock(); if (!b || b.type !== 'image') return;
  commit(() => { b.crop = Object.assign({ ...DEF_CROP }, b.crop); b.crop[side] = +value; }, { history: false });
}
// Crop to a proportion (PowerPoint's Crop ▸ Aspect ratio): the picture's box
// takes that shape around the same centre and about the same area, and the
// picture fills it ("cover"); which part shows is its focus (0-100 across and
// down, 50 = the middle). 'original' goes back to the whole picture.
export const CROP_RATIOS = [['original', 'Original'], ['1:1', '1:1'], ['4:3', '4:3'], ['3:4', '3:4'], ['16:9', '16:9'], ['9:16', '9:16'], ['3:2', '3:2'], ['2:3', '2:3']];
export async function cropToRatio(id, ratio) {
  const b = currentSlide().blocks.find(x => x.id === id); if (!b || b.type !== 'image') return;
  let r;
  if (ratio === 'original') r = await new Promise(res => { const i = new Image(); i.onload = () => res(i.naturalWidth / i.naturalHeight || b.w / b.h); i.onerror = () => res(b.w / b.h); i.src = b.src; });
  else { const [a, c] = String(ratio).split(':').map(Number); if (!(a > 0 && c > 0)) return; r = a / c; }
  commit(() => {
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2, area = b.w * b.h;
    b.w = Math.round(Math.sqrt(area * r)); b.h = Math.round(b.w / r);
    b.x = Math.round(cx - b.w / 2); b.y = Math.round(cy - b.h / 2);
    delete b.crop;
    if (ratio === 'original') { b.fit = 'contain'; delete b.focusX; delete b.focusY; delete b.ratio; }
    else { b.fit = 'cover'; b.ratio = ratio; }
  });
}
export function setImageFocus(id, axis, value) {
  const b = currentSlide().blocks.find(x => x.id === id); if (!b) return;
  commit(() => { const k = axis === 'y' ? 'focusY' : 'focusX', v = Math.max(0, Math.min(100, Math.round(+value))); if (v === 50) delete b[k]; else b[k] = v; }, { history: false });
}
export function resetImageCrop() {
  const b = selectedBlock(); if (!b || b.type !== 'image') return;
  commit(() => { delete b.crop; delete b.focusX; delete b.focusY; });
}

export function deleteBlock(id = state.ui.selection) {
  if (!id) return;
  commit(() => {
    const s = currentSlide();
    s.blocks = s.blocks.filter(b => b.id !== id);
    if (state.ui.selection === id) state.ui.selection = null;
  });
}

export function bringForward() {
  const b = selectedBlock(); if (!b) return;
  commit(() => {
    const arr = currentSlide().blocks; const i = arr.indexOf(b);
    if (i < arr.length - 1) { arr.splice(i, 1); arr.splice(i + 1, 0, b); }
  });
}
export function sendBackward() {
  const b = selectedBlock(); if (!b) return;
  commit(() => {
    const arr = currentSlide().blocks; const i = arr.indexOf(b);
    if (i > 0) { arr.splice(i, 1); arr.splice(i - 1, 0, b); }
  });
}
export function bringToFront() {
  const b = selectedBlock(); if (!b) return;
  commit(() => { const arr = currentSlide().blocks; arr.splice(arr.indexOf(b), 1); arr.push(b); });
}
export function sendToBack() {
  const b = selectedBlock(); if (!b) return;
  commit(() => { const arr = currentSlide().blocks; arr.splice(arr.indexOf(b), 1); arr.unshift(b); });
}


// Align: with several objects selected, align them to each other (as in
// PowerPoint); with one, align it to the slide.
export function alignSelected(where) {
  const bs = selectedBlocks().filter(b => b.type !== 'connector'); if (!bs.length) return;
  const { w, h } = state.deck.size;
  commit(() => {
    if (bs.length > 1) {
      const minX = Math.min(...bs.map(b => b.x)), maxX = Math.max(...bs.map(b => b.x + b.w));
      const minY = Math.min(...bs.map(b => b.y)), maxY = Math.max(...bs.map(b => b.y + b.h));
      const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
      for (const b of bs) {
        if (where === 'left') b.x = Math.round(minX);
        if (where === 'right') b.x = Math.round(maxX - b.w);
        if (where === 'hcenter') b.x = Math.round(cx - b.w / 2);
        if (where === 'top') b.y = Math.round(minY);
        if (where === 'bottom') b.y = Math.round(maxY - b.h);
        if (where === 'vcenter') b.y = Math.round(cy - b.h / 2);
      }
      return;
    }
    const b = bs[0];
    if (where === 'hcenter') b.x = Math.round((w - b.w) / 2);
    if (where === 'vcenter') b.y = Math.round((h - b.h) / 2);
    if (where === 'left') b.x = 40;
    if (where === 'right') b.x = w - b.w - 40;
    if (where === 'top') b.y = 40;
    if (where === 'bottom') b.y = h - b.h - 40;
  });
}

export function setOpacity(v) {
  const bs = selectedBlocks(); if (!bs.length) return;
  const o = Math.max(0, Math.min(100, +v));
  commit(() => { for (const b of bs) b.opacity = o; }, { history: false });
}

// Lock prevents moving/resizing/rotating (still selectable).
export function toggleLock() {
  const bs = selectedBlocks(); if (!bs.length) return;
  const lock = !bs.every(b => b.locked);
  commit(() => { for (const b of bs) b.locked = lock; });
}

// Flip / reset rotation for the selection.
export function flipSelected(axis) {
  const bs = selectedBlocks(); if (!bs.length) return;
  commit(() => { for (const b of bs) { if (axis === 'h') b.flipH = !b.flipH; else b.flipV = !b.flipV; } });
}
export function resetRotation() {
  const bs = selectedBlocks(); if (!bs.length) return;
  commit(() => { for (const b of bs) { b.rotation = 0; b.flipH = false; b.flipV = false; } });
}

// Group the selection so they select and move together; ungroup releases them.
export function groupSelected() {
  const bs = selectedBlocks(); if (bs.length < 2) return;
  commit(() => { const g = uid(); for (const b of bs) b.groupId = g; });
}
export function ungroupSelected() {
  const bs = selectedBlocks(); if (!bs.length) return;
  commit(() => { for (const b of bs) delete b.groupId; });
}

// Distribute the selected objects evenly (needs 3+): equal gaps between centres.
export function distributeSelected(axis) {
  const bs = selectedBlocks().filter(b => b.type !== 'connector'); if (bs.length < 3) return;
  commit(() => {
    const key = axis === 'h' ? 'x' : 'y', size = axis === 'h' ? 'w' : 'h';
    const sorted = [...bs].sort((a, b) => (a[key] + a[size] / 2) - (b[key] + b[size] / 2));
    const first = sorted[0], lastB = sorted[sorted.length - 1];
    const c0 = first[key] + first[size] / 2, cN = lastB[key] + lastB[size] / 2;
    const step = (cN - c0) / (sorted.length - 1);
    sorted.forEach((b, i) => { if (i && i < sorted.length - 1) b[key] = Math.round(c0 + step * i - b[size] / 2); });
  });
}
