// Diagrams (PowerPoint's SmartArt): one object with its text as an outline — a
// line per item, indented lines are its sub-items (or, in a hierarchy, its
// children) — laid out by one of the layouts below and coloured from the
// theme. The layout gives plain geometry (rectangles, ellipses, polygons, lines,
// text boxes) in the object's own pixels, drawn the same way in the editor, the
// presentation and PowerPoint (as native, editable shapes).

import { escSvg } from './svg.js';

export const DIAGRAM_LAYOUTS = [
  ['Lista', [['list', 'Lista vertical'], ['bullets', 'Lista numerada'], ['cards', 'Tarjetas']]],
  ['Proceso', [['process', 'Proceso'], ['chevrons', 'Galones'], ['steps', 'Escalera'], ['timeline', 'Cronología']]],
  ['Ciclo', [['cycle', 'Ciclo'], ['radial', 'Radial']]],
  ['Jerarquía', [['hierarchy', 'Organigrama']]],
  ['Relación', [['venn', 'Venn'], ['matrix', 'Matriz 2 × 2'], ['pyramid', 'Pirámide'], ['funnel', 'Embudo'], ['target', 'Diana']]],
];
export const DIAGRAM_NAMES = Object.fromEntries(DIAGRAM_LAYOUTS.flatMap(([, l]) => l));
export const DIAGRAM_COLORS = [['colorful', 'Colorido'], ['accent', 'Un color'], ['light', 'Claro'], ['outline', 'Contorno']];
// Sample text for each layout when it is inserted.
export const DIAGRAM_SAMPLES = {
  hierarchy: 'Dirección\n  Proyectos\n    Diseño\n    Desarrollo\n  Operaciones\n    Ventas\n    Soporte',
  radial: 'Idea central\n  Personas\n  Recursos\n  Tiempo\n  Resultados',
  venn: 'Deseable\nViable\nFactible',
  matrix: 'Urgente e importante\nImportante\nUrgente\nNi urgente ni importante',
  timeline: '2023\n  Idea\n2024\n  Prototipo\n2025\n  Lanzamiento\n2026\n  Crecimiento',
  cycle: 'Planificar\nHacer\nComprobar\nActuar',
  target: 'Visión\nMisión\nObjetivos\nAcciones',
};
export const DEFAULT_DIAGRAM_TEXT = 'Primero\n  Una explicación breve\nSegundo\n  Otra explicación\nTercero\n  Y la última';

// Outline → tree: [{ text, kids: [...] }]. Indentation: two spaces or a tab per level.
export function parseOutline(text) {
  const root = { kids: [] }, stack = [{ level: -1, node: root }];
  for (const raw of String(text || '').replace(/\r/g, '').split('\n')) {
    if (!raw.trim()) continue;
    const ind = raw.match(/^[\t ]*/)[0].replace(/\t/g, '  ').length, level = Math.floor(ind / 2), node = { text: raw.trim().replace(/^[-•*]\s+/, ''), kids: [] };
    while (stack.at(-1).level >= level) stack.pop();
    stack.at(-1).node.kids.push(node); stack.push({ level, node });
  }
  return root.kids;
}
const subText = n => n.kids.map(k => k.text).join('\n');

// Colours: from the theme's accents.
const hexRGB = h => { const m = String(h).match(/^#?([0-9a-f]{6})/i); const v = m ? parseInt(m[1], 16) : 0x3f6497; return [v >> 16, (v >> 8) & 255, v & 255]; };
const mix = (a, b, t) => { const x = hexRGB(a), y = hexRGB(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const light = c => { const [r, g, b] = hexRGB(c); return (0.299 * r + 0.587 * g + 0.114 * b) > 170; };
function paint(scheme, accents, fg, i, n) {
  const a = accents.length ? accents : ['#3f6497'], base = a[0];
  if (scheme === 'accent') { const f = mix(base, '#000000', 0.25 * (n > 1 ? i / (n - 1) : 0)); return { fill: f, stroke: 'none', text: light(f) ? '#1e2a3a' : '#ffffff' }; }
  if (scheme === 'light') { const c = a[i % a.length]; return { fill: mix(c, '#ffffff', 0.8), stroke: c, text: '#1e2a3a' }; }
  if (scheme === 'outline') { const c = a[i % a.length]; return { fill: 'none', stroke: c, text: fg }; }
  const f = a[i % a.length]; return { fill: f, stroke: 'none', text: light(f) ? '#1e2a3a' : '#ffffff' };
}
// Letters that fit: by the box and its longest word.
// Title and explanation together (the explanation 0.72 as big): the largest size where both fit.
const fitBoth = (w, h, text, sub, max = 30) => {
  const long = Math.max(4, ...`${text} ${sub}`.split(/\s+/).map(x => x.length)), len = s => Math.max(1, s.length);
  for (let fs = Math.min(max, w / (long * 0.8)); fs > 11; fs -= 1) {
    const per = f => Math.max(1, Math.floor(w / (f * 0.66))), lines = (s, f) => s.split('\n').reduce((n, l) => n + Math.ceil(len(l) / per(f)), 0);
    if (lines(text, fs) * fs * 1.25 + (sub ? lines(sub, fs * 0.72) * fs * 0.72 * 1.25 + fs * 0.25 : 0) <= h) return Math.round(fs);
  }
  return 11;
};
const fitFont = (w, h, text, max = 30) => {
  // (Bold letters are about 0.62 of their size wide on average: a word never has to be split.)
  const s = String(text || ''), long = Math.max(4, ...s.split(/\s+/).map(x => x.length));
  let fs = Math.min(max, w / (long * 0.8));
  for (; fs > 11; fs -= 1) { const perLine = Math.max(1, Math.floor(w / (fs * 0.66))), lines = Math.ceil(s.length / perLine); if (lines * fs * 1.25 <= h) break; }
  return Math.max(11, Math.round(fs));
};

// The geometry of a diagram: a list of shapes in its own pixels (W × H).
export function diagramLayout(b, { accents = ['#3f6497', '#e0873b', '#4caf7d', '#c94f4f', '#8e6cc9', '#3bb3c3'], fg = '#ffffff' } = {}) {
  const W = b.w || 900, H = b.h || 460, items = parseOutline(b.text ?? DEFAULT_DIAGRAM_TEXT), n = Math.max(1, items.length);
  const scheme = b.colors || 'colorful', P = (i, m = n) => paint(scheme, accents, fg, i, m), out = [];
  const rect = (x, y, w, h, i, text, sub, o = {}) => { const c = P(i, o.m); out.push({ type: 'rect', x, y, w, h, r: o.r ?? Math.min(w, h) * 0.12, fill: c.fill, stroke: c.stroke, i: o.item ?? i });
    if (text != null) out.push(textBox(x, y, w, h, text, sub, c.text, o)); };
  const textBox = (x, y, w, h, text, sub, color, o = {}) => {
    const pad = Math.min(w, h) * 0.08, fs = o.fs || (sub ? fitBoth(w - 2 * pad, h - 2 * pad, text, sub, o.max || 30) : fitFont(w - 2 * pad, h - 2 * pad, text, o.max || 30));
    return { type: 'text', x: x + pad, y: y + pad, w: w - 2 * pad, h: h - 2 * pad, text, sub: sub || '', fs, color, align: o.align || 'center', valign: o.valign || 'middle', bold: o.bold ?? true, i: o.item ?? o.i ?? 0 };
  };
  const line = (pts, color, width = 2, o = {}) => out.push({ type: 'poly', pts, closed: false, fill: 'none', stroke: color, sw: width, i: o.item ?? -1 });
  const arrowHead = (x, y, ang, size, color, item = -1) => out.push({ type: 'poly', closed: true, fill: color, stroke: 'none', i: item,
    pts: [[x, y], [x - size * Math.cos(ang - 0.45), y - size * Math.sin(ang - 0.45)], [x - size * Math.cos(ang + 0.45), y - size * Math.sin(ang + 0.45)]] });
  const lineColor = scheme === 'outline' || scheme === 'light' ? accents[0] : mix(fg, '#808080', 0.5);
  const gap = Math.min(W, H) * 0.04;

  switch (b.layout || 'process') {
    case 'list': {
      const rh = (H - gap * (n - 1)) / n;
      items.forEach((it, i) => {
        const y = i * (rh + gap), sub = subText(it);
        if (sub) { const tw = W * 0.34; rect(0, y, tw, rh, i, it.text, '', { max: 28 }); const c = P(i);
          out.push({ type: 'rect', x: tw + gap * 0.5, y, w: W - tw - gap * 0.5, h: rh, r: rh * 0.1, fill: mix(c.fill === 'none' ? accents[i % accents.length] : c.fill, '#ffffff', 0.85), stroke: c.stroke === 'none' ? 'none' : c.stroke, i });
          out.push(textBox(tw + gap * 0.5, y, W - tw - gap * 0.5, rh, sub, '', '#1e2a3a', { align: 'left', bold: false, max: 22, item: i })); }
        else rect(0, y, W, rh, i, it.text, '', { max: 30 });
      });
      break;
    }
    case 'bullets': {
      const rh = (H - gap * (n - 1)) / n, d = Math.min(rh * 0.86, 90);
      items.forEach((it, i) => {
        const y = i * (rh + gap), c = P(i);
        out.push({ type: 'ellipse', x: 0, y: y + (rh - d) / 2, w: d, h: d, fill: c.fill, stroke: c.stroke, i });
        out.push({ ...textBox(0, y + (rh - d) / 2, d, d, String(i + 1), '', c.text, { fs: Math.round(d * 0.42), item: i }), fixed: true });
        out.push(textBox(d + gap, y, W - d - gap, rh, it.text, subText(it), fg, { align: 'left', max: 30, item: i }));
      });
      break;
    }
    case 'cards': {
      const cols = n <= 4 ? n : Math.ceil(n / 2), rows = Math.ceil(n / cols), cw = (W - gap * (cols - 1)) / cols, ch = (H - gap * (rows - 1)) / rows;
      items.forEach((it, i) => {
        const x = (i % cols) * (cw + gap), y = Math.floor(i / cols) * (ch + gap), c = P(i), band = Math.min(ch * 0.34, 90), sub = subText(it);
        out.push({ type: 'rect', x, y, w: cw, h: ch, r: 12, fill: scheme === 'outline' ? 'none' : mix(c.fill === 'none' ? accents[i % accents.length] : c.fill, '#ffffff', 0.88), stroke: c.stroke === 'none' ? mix(c.fill, '#ffffff', 0.4) : c.stroke, i });
        out.push({ type: 'rect', x, y, w: cw, h: sub ? band : ch, r: 12, fill: c.fill === 'none' ? 'none' : c.fill, stroke: c.stroke, i });
        out.push(textBox(x, y, cw, sub ? band : ch, it.text, '', c.fill === 'none' ? fg : c.text, { max: 34, item: i }));
        if (sub) out.push(textBox(x, y + band, cw, ch - band, sub, '', scheme === 'outline' ? fg : '#1e2a3a', { bold: false, max: 30, valign: 'middle', item: i }));
      });
      break;
    }
    case 'process': {
      const aw = Math.min(40, W * 0.04), bw = (W - (n - 1) * (aw + gap * 2)) / n, bh = Math.min(H, bw * 0.9);
      items.forEach((it, i) => {
        const x = i * (bw + aw + gap * 2), y = (H - bh) / 2;
        rect(x, y, bw, bh, i, it.text, subText(it), { max: 28 });
        if (i < n - 1) { const ax = x + bw + gap, ay = H / 2, c = lineColor;
          out.push({ type: 'poly', closed: true, fill: c, stroke: 'none', i: i + 1, pts: [[ax, ay - aw * 0.45], [ax + aw * 0.55, ay - aw * 0.45], [ax + aw * 0.55, ay - aw * 0.8], [ax + aw, ay], [ax + aw * 0.55, ay + aw * 0.8], [ax + aw * 0.55, ay + aw * 0.45], [ax, ay + aw * 0.45]] }); }
      });
      break;
    }
    case 'chevrons': {
      const ov = Math.min(H * 0.18, W / n * 0.2), cw = (W + ov * (n - 1)) / n, hasSub = items.some(it => it.kids.length), ch = hasSub ? H * 0.42 : Math.min(H, cw * 0.55), y = hasSub ? 0 : (H - ch) / 2, tip = ch * 0.3;
      items.forEach((it, i) => {
        const x = i * (cw - ov), c = P(i);
        const pts = i === 0 ? [[x, y], [x + cw - tip, y], [x + cw, y + ch / 2], [x + cw - tip, y + ch], [x, y + ch]]
          : [[x, y], [x + cw - tip, y], [x + cw, y + ch / 2], [x + cw - tip, y + ch], [x, y + ch], [x + tip, y + ch / 2]];
        out.push({ type: 'poly', closed: true, pts, fill: c.fill, stroke: c.stroke === 'none' && c.fill === 'none' ? accents[0] : c.stroke, i });
        // (The words sit round the middle, where the notch and the point leave more room than at the edges.)
        out.push(textBox(x + (i ? tip * 0.6 : 0), y, cw - tip * 0.7 - (i ? tip * 0.6 : 0), ch, it.text, '', c.fill === 'none' ? fg : c.text, { max: 34, item: i }));
        if (hasSub) out.push(textBox(x + tip * 0.5, y + ch + gap, cw - ov - tip * 0.5, H - ch - gap, subText(it), '', fg, { bold: false, valign: 'top', align: 'left', max: 20, item: i }));
      });
      break;
    }
    case 'steps': {
      const sw = (W - gap * (n - 1)) / n;
      items.forEach((it, i) => {
        const h = H * (0.3 + 0.7 * (i + 1) / n), x = i * (sw + gap), y = H - h, c = P(i), head = Math.min(h, H * 0.22);
        out.push({ type: 'rect', x, y, w: sw, h, r: 6, fill: c.fill, stroke: c.stroke, i });
        out.push(textBox(x, y, sw, head, it.text, '', c.fill === 'none' ? fg : c.text, { max: 26, item: i }));
        const sub = subText(it); if (sub) out.push(textBox(x, y + head, sw, h - head, sub, '', c.fill === 'none' ? fg : c.text, { bold: false, valign: 'top', max: 18, item: i }));
      });
      break;
    }
    case 'timeline': {
      const y = H / 2, d = Math.min(28, H * 0.07), step = W / n;
      line([[0, y], [W, y]], lineColor, 4);
      arrowHead(W, y, 0, 18, lineColor);
      items.forEach((it, i) => {
        const cx = step * (i + 0.5), up = i % 2 === 0, c = P(i), lh = H * 0.42 - d;
        out.push({ type: 'ellipse', x: cx - d / 2, y: y - d / 2, w: d, h: d, fill: c.fill === 'none' ? accents[i % accents.length] : c.fill, stroke: '#ffffff', i });
        line([[cx, up ? y - d / 2 : y + d / 2], [cx, up ? y - d * 1.4 : y + d * 1.4]], lineColor, 2, { item: i });
        out.push(textBox(cx - step * 0.55, up ? 0 : y + d * 1.5, step * 1.1, lh, it.text, subText(it), fg, { valign: up ? 'bottom' : 'top', max: 36, item: i }));
      });
      break;
    }
    case 'cycle': {
      // Items round an ellipse that fills the box; arcs with heads between them.
      const nw = Math.min(W * 0.3, W * 0.95 / Math.max(2, n / 2 + 1)), nh = Math.min(H * 0.26, nw * 0.6), Rx = W / 2 - nw / 2 - 4, Ry = H / 2 - nh / 2 - 4, cx = W / 2, cy = H / 2;
      const pos = i => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Rx * Math.cos(a), cy + Ry * Math.sin(a), a]; };
      // (Where the arc leaves a node: the angle past the node's edge, found by walking out along the ellipse.)
      const clear = (a0, dir) => { let a = a0; const x0 = cx + Rx * Math.cos(a0), y0 = cy + Ry * Math.sin(a0);
        for (let k = 0; k < 200; k++) { a += dir * 0.01; const x = cx + Rx * Math.cos(a), y = cy + Ry * Math.sin(a); if (Math.abs(x - x0) > nw / 2 + 6 || Math.abs(y - y0) > nh / 2 + 6) break; } return a; };
      if (n > 1) for (let i = 0; i < n; i++) {
        const [, , a0] = pos(i), a1 = a0 + 2 * Math.PI / n, from = clear(a0, 1), to = clear(a1, -1), pts = [];
        if (to - from > 0.05) {
          for (let k = 0; k <= 20; k++) { const a = from + (to - from) * k / 20; pts.push([cx + Rx * Math.cos(a), cy + Ry * Math.sin(a)]); }
          const [px, py] = pts.at(-2), [qx, qy] = pts.at(-1);
          line(pts, lineColor, 3, { item: (i + 1) % n }); arrowHead(qx, qy, Math.atan2(qy - py, qx - px), 14, lineColor, (i + 1) % n);
        }
      }
      items.forEach((it, i) => { const [x, y] = pos(i), c = P(i);
        out.push({ type: 'ellipse', x: x - nw / 2, y: y - nh / 2, w: nw, h: nh, fill: c.fill, stroke: c.stroke, i });
        out.push(textBox(x - nw * 0.4, y - nh * 0.4, nw * 0.8, nh * 0.8, it.text, subText(it), c.fill === 'none' ? fg : c.text, { max: 26, item: i })); });
      break;
    }
    case 'radial': {
      const center = items.length === 1 && items[0].kids.length ? items[0] : items[0], sats = items.length === 1 ? items[0].kids : items.slice(1);
      // The centre and its satellites round it, as ellipses that use the box's width.
      const m = Math.max(1, sats.length), cx = W / 2, cy = H / 2, nw = Math.min(W * 0.24, W * 0.9 / Math.max(2, m / 2 + 1)), nh = Math.min(H * 0.24, nw * 0.62);
      const Dw = Math.min(W * 0.26, nw * 1.2), Dh = Math.min(H * 0.34, Dw * 0.7), Rx = W / 2 - nw / 2 - 4, Ry = H / 2 - nh / 2 - 4;
      sats.forEach((it, i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / m, x = cx + Rx * Math.cos(a), y = cy + Ry * Math.sin(a), c = P(i + 1, m + 1);
        line([[cx + Dw / 2 * Math.cos(a), cy + Dh / 2 * Math.sin(a)], [x - nw / 2 * Math.cos(a), y - nh / 2 * Math.sin(a)]], lineColor, 3, { item: i + 1 });
        out.push({ type: 'ellipse', x: x - nw / 2, y: y - nh / 2, w: nw, h: nh, fill: c.fill, stroke: c.stroke, i: i + 1 });
        out.push(textBox(x - nw * 0.4, y - nh * 0.4, nw * 0.8, nh * 0.8, it.text, subText(it), c.fill === 'none' ? fg : c.text, { max: 24, item: i + 1 })); });
      const c = P(0, m + 1);
      out.push({ type: 'ellipse', x: cx - Dw / 2, y: cy - Dh / 2, w: Dw, h: Dh, fill: c.fill, stroke: c.stroke, i: 0 });
      out.push({ ...textBox(cx - Dw * 0.4, cy - Dh * 0.4, Dw * 0.8, Dh * 0.8, center?.text || '', '', c.fill === 'none' ? fg : c.text, { max: 30, item: 0 }), fixed: true });
      break;
    }
    case 'hierarchy': {
      // Tidy tree: each leaf a column; a parent over the middle of its children.
      const depth = t => 1 + Math.max(0, ...t.kids.map(depth)), leaves = t => (t.kids.length ? t.kids.reduce((s, k) => s + leaves(k), 0) : 1);
      const roots = items, L = Math.max(...roots.map(depth)), cols = roots.reduce((s, r) => s + leaves(r), 0);
      const colW = W / cols, rowH = H / L, bw = Math.min(colW * 0.86, 260), bh = Math.min(rowH * 0.62, 110);
      let col = 0, k = 0;
      const place = (t, lvl) => {
        let x; const kids = t.kids.map(c => place(c, lvl + 1));
        if (kids.length) x = (kids[0].x + kids.at(-1).x) / 2; else x = (col++ + 0.5) * colW;
        const y = lvl * rowH + (rowH - bh) / 2, me = { x, y, lvl, t, kids, i: k++ };
        return me;
      };
      const tree = roots.map(r => place(r, 0));
      const draw = node => {
        node.kids.forEach(c => { const midY = node.y + bh + (c.y - node.y - bh) / 2;
          line([[node.x, node.y + bh], [node.x, midY], [c.x, midY], [c.x, c.y]], lineColor, 2, { item: c.i }); draw(c); });
        rect(node.x - bw / 2, node.y, bw, bh, node.lvl, node.t.text, '', { m: L, max: 24, item: node.i });
      };
      tree.forEach(draw);
      break;
    }
    case 'venn': {
      // (How many radii the group takes across and down, to fit the box.)
      const m = Math.min(n, 4), [wf, hf] = { 1: [2, 2], 2: [3.2, 2], 3: [3.2, 3.02], 4: [4.7, 2] }[m], R = Math.min(W / wf, H / hf) * 0.98, cx = W / 2, cy = H / 2 - (m === 3 ? 0.11 * R : 0);
      const centres = m === 1 ? [[cx, cy]] : m === 2 ? [[cx - R * 0.6, cy], [cx + R * 0.6, cy]] : m === 3 ? [[cx - R * 0.6, cy - R * 0.4], [cx + R * 0.6, cy - R * 0.4], [cx, cy + R * 0.62]]
        : [[cx - R * 1.35, cy], [cx - R * 0.45, cy], [cx + R * 0.45, cy], [cx + R * 1.35, cy]];
      const tOff = m === 3 ? [[-0.35, -0.3], [0.35, -0.3], [0, 0.4]] : m === 2 ? [[-0.4, 0], [0.4, 0]] : m === 4 ? [[-0.3, 0], [0, -0.45], [0, 0.45], [0.3, 0]] : [[0, 0]];
      items.slice(0, m).forEach((it, i) => { const [x, y] = centres[i], c = P(i, m);
        out.push({ type: 'ellipse', x: x - R, y: y - R, w: 2 * R, h: 2 * R, fill: c.fill === 'none' ? 'none' : (scheme === 'light' ? c.fill : accents[i % accents.length]), stroke: c.stroke === 'none' ? '#ffffff' : c.stroke, opacity: scheme === 'outline' ? 1 : 0.6, i }); });
      items.slice(0, m).forEach((it, i) => { const [x, y] = centres[i], [ox, oy] = tOff[i];
        out.push(textBox(x + ox * R - R * 0.55, y + oy * R - R * 0.35, R * 1.1, R * 0.7, it.text, subText(it), scheme === 'light' || scheme === 'outline' ? (scheme === 'outline' ? fg : '#1e2a3a') : '#ffffff', { max: 26, item: i })); });
      break;
    }
    case 'matrix': {
      const cw = (W - gap) / 2, ch = (H - gap) / 2;
      items.slice(0, 4).forEach((it, i) => rect((i % 2) * (cw + gap), Math.floor(i / 2) * (ch + gap), cw, ch, i, it.text, subText(it), { m: 4, max: 28 }));
      break;
    }
    case 'pyramid': case 'funnel': {
      const up = b.layout === 'pyramid', lh = (H - gap * 0.5 * (n - 1)) / n, pw = Math.min(W, H * 1.25), x0 = (W - pw) / 2;
      const half = y => (up ? (y / H) : (1 - y / H) * 0.85 + 0.15) * pw / 2;       // half-width at height y
      items.forEach((it, i) => {
        const y0 = i * (lh + gap * 0.5), y1 = y0 + lh, a = half(y0), bb = half(y1), c = P(i);
        const pts = [[W / 2 - a, y0], [W / 2 + a, y0], [W / 2 + bb, y1], [W / 2 - bb, y1]];
        out.push({ type: 'poly', closed: true, pts, fill: c.fill, stroke: c.stroke === 'none' && c.fill === 'none' ? accents[0] : c.stroke, i });
        const tw = Math.max(Math.max(a, bb) * 1.6, pw * 0.34);           // (the narrow top may spill a little over its edges)
        out.push(textBox(W / 2 - tw / 2, y0, tw, lh, it.text, subText(it), c.fill === 'none' ? fg : c.text, { max: 26, item: i }));
      });
      void x0;
      break;
    }
    case 'target': {
      const cy = H / 2, Rm = Math.min(H / 2, W * 0.28), cx = Rm + 4;
      items.forEach((it, i) => { const r = Rm * (1 - i / (n + 0.4)), c = P(i);
        out.push({ type: 'ellipse', x: cx - r, y: cy - r, w: 2 * r, h: 2 * r, fill: c.fill, stroke: c.stroke === 'none' ? '#ffffff' : c.stroke, i }); });
      const lx = cx + Rm + gap * 2, lh = H / n;
      items.forEach((it, i) => { const r = Rm * (1 - i / (n + 0.4)), ry = cy - r + Rm / (n + 0.4) * 0.5, ty = i * lh;
        line([[cx, ry], [lx - 6, ty + lh / 2]], lineColor, 1.5, { item: i });
        out.push({ type: 'ellipse', x: cx - 4, y: ry - 4, w: 8, h: 8, fill: lineColor, stroke: 'none', i });
        out.push(textBox(lx, ty, W - lx, lh, it.text, subText(it), fg, { align: 'left', max: 28, item: i })); });
      break;
    }
  }
  // The same size of letters for the items' titles (and for their explanations): the smallest that fits all.
  for (const bold of [true, false]) {
    const same = out.filter(p => p.type === 'text' && p.bold === bold && !p.fixed); if (!same.length) continue;
    const fs = Math.min(...same.map(p => p.fs)); same.forEach(p => { p.fs = fs; });
  }
  return out;
}

// As HTML: the shapes in an SVG, the text over it (so it wraps and takes the
// presentation's font). `step` marks each item's parts for "one by one".
export function diagramHTML(b, opts = {}) {
  const W = b.w || 900, H = b.h || 460, parts = diagramLayout(b, opts), f = v => (+v).toFixed(1);
  const svg = parts.filter(p => p.type !== 'text').map(p => {
    const common = `fill="${p.fill}" stroke="${p.stroke === 'none' ? 'none' : p.stroke}" stroke-width="${p.sw || (p.stroke === 'none' ? 0 : 2)}"${p.opacity != null && p.opacity < 1 ? ` fill-opacity="${p.opacity}"` : ''}${opts.step ? ` data-dg="${p.i}"` : ''}`;
    if (p.type === 'rect') return `<rect x="${f(p.x)}" y="${f(p.y)}" width="${f(p.w)}" height="${f(p.h)}" rx="${f(p.r || 0)}" ${common}/>`;
    if (p.type === 'ellipse') return `<ellipse cx="${f(p.x + p.w / 2)}" cy="${f(p.y + p.h / 2)}" rx="${f(p.w / 2)}" ry="${f(p.h / 2)}" ${common}/>`;
    return `<path d="M${p.pts.map(q => `${f(q[0])} ${f(q[1])}`).join('L')}${p.closed ? 'Z' : ''}" stroke-linejoin="round" stroke-linecap="round" ${common}/>`;
  }).join('');
  const texts = parts.filter(p => p.type === 'text').map(p => `<div${opts.step ? ` data-dg="${p.i}"` : ''} style="position:absolute;left:${f(p.x)}px;top:${f(p.y)}px;width:${f(p.w)}px;height:${f(p.h)}px;display:flex;flex-direction:column;`
    + `justify-content:${{ top: 'flex-start', bottom: 'flex-end' }[p.valign] || 'center'};text-align:${p.align};color:${p.color};font-size:${p.fs}px;line-height:1.15;overflow:hidden;overflow-wrap:break-word">`
    + `<div style="font-weight:${p.bold ? 700 : 400};white-space:pre-line">${escSvg(p.text)}</div>`
    + (p.sub ? `<div style="font-size:${Math.max(10, Math.round(p.fs * 0.72))}px;opacity:.9;margin-top:.25em;white-space:pre-line">${escSvg(p.sub)}</div>` : '') + `</div>`).join('');
  return `<div class="rv-diagram" style="position:relative;width:100%;height:100%"><svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="none" style="position:absolute;inset:0;overflow:visible">${svg}</svg>${texts}</div>`;
}
export const diagramSig = b => JSON.stringify([b.layout, b.colors, b.text, b.w, b.h]);
