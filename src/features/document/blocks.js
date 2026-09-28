// Block insertion and manipulation.

import { state, commit, currentSlide, selectedBlock,
  selectedBlocks, selectedIds, setSelection, setMulti } from '../../core/store.js';
import { uid, textBlock, tableBlock, codeBlock, chartBlock, mathBlock, figindexBlock, slideRefBlock } from '../../core/model.js';
import { currentLang } from '../../i18n/index.js';

function insert(block) {
  commit(() => { currentSlide().blocks.push(block); setSelection(block.id); });
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

export function addImage(src) {
  insert({ id: uid(), type: 'image', x: 340, y: 130, w: 600, h: 460,
    rotation: 0, animation: null, src, fit: 'contain' });
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
  return url;
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

// Fill / border for a text box (also used by diagrams).
export function setBoxStyle(props) {
  const b = selectedBlock(); if (!b || (b.type !== 'text' && b.type !== 'math')) return;
  commit(() => Object.assign(b, props));
}

// SmartArt‑lite: a row of boxes (process, with arrows) or a column (list).
export function addDiagram(kind = 'process') {
  const { w, h } = state.deck.size;
  commit(() => {
    const s = currentSlide();
    const n = 3, box = (x, y, bw, bh, i) => ({
      id: uid(), type: 'text', x, y, w: bw, h: bh, rotation: 0, animation: null,
      fontSize: 26, textAlign: 'center', html: `Paso ${i + 1}`,
      bg: '#3f6497', borderColor: '#1e2a3a', radius: 10,
    });
    const ids = [];
    if (kind === 'hierarchy') {
      const top = box((w - 240) / 2, h * 0.14, 240, 100, 0); top.html = 'Principal'; s.blocks.push(top);
      const cn = 3, cw = 200, ch = 90, gap = 40, totalW = cn * cw + (cn - 1) * gap, x0 = (w - totalW) / 2, y = h * 0.56;
      for (let i = 0; i < cn; i++) {
        const c = box(x0 + i * (cw + gap), y, cw, ch, i); c.html = `Sub ${i + 1}`; s.blocks.push(c);
        s.blocks.push({ id: uid(), type: 'connector', from: top.id, to: c.id, color: '#8a8a8a', arrow: true, x: 0, y: 0, w, h, rotation: 0, animation: null });
      }
    } else if (kind === 'cycle') {
      const bw = 220, bh = 100, R = Math.min(w, h) * 0.32, cx = w / 2, cy = h / 2;
      for (let i = 0; i < n; i++) {
        const ang = -Math.PI / 2 + i * 2 * Math.PI / n;
        const b = box(cx + R * Math.cos(ang) - bw / 2, cy + R * Math.sin(ang) - bh / 2, bw, bh, i);
        s.blocks.push(b); ids.push(b.id);
      }
      for (let i = 0; i < n; i++)
        s.blocks.push({ id: uid(), type: 'connector', from: ids[i], to: ids[(i + 1) % n], color: '#8a8a8a', arrow: true, x: 0, y: 0, w, h, rotation: 0, animation: null });
    } else if (kind === 'list') {
      const bw = 640, bh = 90, gap = 24, totalH = n * bh + (n - 1) * gap;
      let y = (h - totalH) / 2;
      for (let i = 0; i < n; i++) { const b = box((w - bw) / 2, y, bw, bh, i); s.blocks.push(b); ids.push(b.id); y += bh + gap; }
    } else {
      const bw = 280, bh = 130, gap = 70, totalW = n * bw + (n - 1) * gap;
      const x0 = (w - totalW) / 2, y = (h - bh) / 2;
      for (let i = 0; i < n; i++) { const b = box(x0 + i * (bw + gap), y, bw, bh, i); s.blocks.push(b); ids.push(b.id); }
      for (let i = 0; i < n - 1; i++)
        s.blocks.push({ id: uid(), type: 'connector', from: ids[i], to: ids[i + 1], color: '#8a8a8a', arrow: true, x: 0, y: 0, w, h, rotation: 0, animation: null });
    }
    setSelection(null);
  });
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
export function addCode() { insert(codeBlock()); }
export function setCode(props) {
  const b = selectedBlock(); if (!b || b.type !== 'code') return;
  commit(() => Object.assign(b, props));
}
export function addChart() { insert(chartBlock()); }
export function addMath() { insert(mathBlock()); }
export function addFigIndex(kind = 'all') { insert(figindexBlock({ kind })); }

// Slide zoom: an embedded thumbnail of another slide, clickable in the show.
export function addSlideRef() {
  const cur = currentSlide();
  const other = state.deck.slides.find(s => s.id !== cur.id) || cur;
  const { w, h } = state.deck.size; const bw = 420;
  insert(slideRefBlock({ target: other.id, w: bw, h: Math.round(bw * h / w) }));
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

export function addShape(kind) {
  const linear = kind === 'line' || kind === 'arrow';
  insert({
    id: uid(), type: 'shape', shape: kind,
    x: 460, y: 250, w: linear ? 420 : 320, h: linear ? 120 : 240,
    rotation: 0, animation: null,
    fill: linear ? 'none' : '#3f6497', stroke: '#1e2a3a', strokeWidth: linear ? 6 : 2,
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
export function setShapeStyle(prop, value) {
  const b = selectedBlock(); if (!b || b.type !== 'shape') return;
  commit(() => { b[prop] = value; });
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
export function resetImageCrop() {
  const b = selectedBlock(); if (!b || b.type !== 'image') return;
  commit(() => { delete b.crop; });
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

export function duplicateBlock() {
  const b = selectedBlock(); if (!b) return;
  commit(() => {
    const copy = structuredClone(b); copy.id = uid(); copy.x += 24; copy.y += 24;
    currentSlide().blocks.push(copy); state.ui.selection = copy.id;
  });
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
