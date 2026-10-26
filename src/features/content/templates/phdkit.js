// Shared pieces of the long defences (sci_phd.js, sci_cong.js): the small drawings, the cards, the section openers, the
// «backup» marks, a NASA satellite and a map that flies from stop to stop (one click per stop).
import { text, card, shape, A, withAnims, base, deep, nasa, uid } from './kit.js';

export const svgURL = (w, h, body, bg = '') => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${body}</svg>`);
export const img = (src, x, y, w, h, alt, props = {}) => ({ ...base(x, y, w, h), type: 'image', src, alt, fit: 'contain', ...props });
export const on = (b, effect, props = {}) => withAnims(b, A(effect, props));
export const after = (b, effect, props = {}) => withAnims(b, A(effect, { start: 'afterPrev', ...props }));
export const label = (t, x, y, w, color, props = {}) => text(t, x, y, w, 34, { fontSize: 18, letterSpacing: 4, fontWeight: 700, color, ...props });
export const tcard = (t, d, x, y, w, h, col, { bg = '#ffffff', fg = '#1f2430', ts = 25, ds = 20 } = {}) =>
  card(`<b style="font-size:${ts}px;color:${deep(col, bg)}">${t}</b><br><span style="font-size:${ds}px;color:${fg}">${d}</span>`, x, y, w, h, bg, { color: fg, radius: 14, borderColor: col, pad: [18, 22, 16, 22] });
export const takeaway = (big, small, x, y, w, h, col, { bg = '#ffffff', fg = '#1f2430', font = '' } = {}) =>
  card(`<div style="font-size:52px;font-weight:800;line-height:1.05;color:${deep(col, bg)};${font ? `font-family:${font};` : ''}">${big}</div><div style="font-size:21px;margin-top:10px">${small}</div>`,
    x, y, w, h, bg, { color: fg, radius: 14, pad: [22, 24, 20, 24] });
export const section = (n, name, sub, bg, fg, accent, font) => ({ layout: 'blank', bg, transition: 'fade', extra: [
  text(String(n), 90, 150, 260, 260, { fontSize: 220, fontWeight: 800, color: accent, lineHeight: 1, fontFamily: font }),
  shape('rect', 380, 200, 4, 220, accent),
  text(name, 420, 200, 760, 110, { fontSize: 62, fontWeight: 800, color: fg, fontFamily: font, lineHeight: 1.05 }),
  text(sub, 422, 320, 760, 100, { fontSize: 26, color: fg, opacity: 80, lineHeight: 1.4 })] });
export const backup = (q, col, bg) => [shape('rounded', 84, 52, 400, 40, deep(col, bg), { radius: 20 }), text('RESPALDO · PREGUNTA PREVISIBLE', 84, 58, 400, 30, { fontSize: 14, letterSpacing: 2, fontWeight: 700, color: '#ffffff', textAlign: 'center' }),
  text(q, 84, 104, 1110, 92, { fontSize: 30, fontWeight: 700, color: deep(col, bg), lineHeight: 1.15 })];
export const sample = (x, y, w, color) => text('Datos de ejemplo', x, y, w, 26, { fontSize: 15, color, fontStyle: 'italic' });
// A NASA satellite (3D): spins by itself, fades into the slide.
export const sat = (id, x, y, w, h, props = {}) => nasa(id, x, y, w, h, { caption: '', autoRotate: true, spin: 14, view: 'three', edge: 'fade', ...props });
// A map as the editor writes it: its stops, and a click (a flight) for each one after the first.
export const mapBlock = (x, y, w, h, props, stops) => {
  const st = stops.map(q => ({ id: uid(), pitch: 0, bearing: 0, ...q })), { flyMs = 3500, ...rest } = props;
  const steps = props.mode === 'all' ? [] : st.slice(1).map((q, i) => ({ effect: 'mapfly', order: i + 1, seq: i + 1, start: 'click', duration: flyMs, delay: 0, stop: q.id }));
  return { id: uid(), type: 'map', look: 'satellite', route: 'none', routeColor: '#e39a3b', arrive: 'drop', marker: { kind: 'dot', color: '#e39a3b', size: 1 },
    x, y, w, h, rotation: 0, ...rest, stops: st, animation: steps[0] || null, ...(steps.length > 1 && { anims: steps.slice(1) }) };
};

