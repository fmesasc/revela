// A picture's border («Borde» in the ribbon and the menu). The fields are the ones the other boxes have (text, equations):
//   b.borderColor  colour (#rrggbb, or with its opacity #rrggbbaa)       b.radius       rounded corners, in px
//   b.borderDash   '' (solid), 'dash' or 'dot'                           b.borderWidth  thickness in px (a picture's own: 1…40)
// Drawn just outside the picture, in its look's filter (render/imagelook.js frameOf), so that it never covers it and is
// the same in the canvas, thumbnails, presentation, PNG/PDF and PowerPoint (where it goes in with the picture).
// These helpers only change those fields (call them inside a commit: one undo step).
import { frameOf, BORDER_DEFAULT } from '../../render/imagelook.js';
export const BORDER_MAX = 40, RADIUS_MAX = 200, BORDER_STYLES = [['', '━ Continua'], ['dash', '╍ Guiones'], ['dot', '┈ Puntos']];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(+v || 0)));
export function borderOf(b) {
  const f = frameOf(b);
  return { on: !!f, color: /^#[0-9a-f]{6}/i.test(b?.borderColor || '') ? b.borderColor.slice(0, 7) : '#ffffff', width: f ? f.w : 0, dash: b?.borderDash || '', radius: b?.radius || 0 };
}
// patch: { color?, width? (0 takes the border away), dash?, radius? }. Colour or width alone turn it on.
export function setBorder(b, patch = {}) {
  const cur = borderOf(b);
  if ('width' in patch) { const w = clamp(patch.width, 0, BORDER_MAX); if (w) { b.borderWidth = w; if (!b.borderColor) b.borderColor = patch.color || cur.color; } else clearBorder(b, true); }
  if ('color' in patch && patch.color) { b.borderColor = patch.color; if (!cur.on) b.borderWidth = b.borderWidth || BORDER_DEFAULT; }
  if ('dash' in patch) { if (patch.dash) b.borderDash = patch.dash; else delete b.borderDash; }
  if ('radius' in patch) { const r = clamp(patch.radius, 0, RADIUS_MAX); if (r) b.radius = r; else delete b.radius; }
  return b;
}
// keepCorners: the rounded corners stay (they round the picture itself, with or without a border).
export function clearBorder(b, keepCorners = false) { delete b.borderColor; delete b.borderWidth; delete b.borderDash; if (!keepCorners) delete b.radius; return b; }
