// DrawingML colour transforms (a:lumMod, a:lumOff, a:tint, a:shade, a:satMod,
// a:alpha…): how PowerPoint, Google Slides and LibreOffice derive "Accent 1,
// darker 25 %" and the like from a theme colour. Luminance, saturation and hue
// work in HSL; tint and shade in linear RGB (as LibreOffice does, which matches
// PowerPoint). Values are the file's: 100000 = 100 %, hues in 60000ths of a degree.

const HEX6 = /^#[0-9a-f]{6}$/i;
const lin = c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const srgb = c => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);
const clamp = v => Math.max(0, Math.min(1, v));

function toHSL([r, g, b]) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function fromHSL([h, s, l]) {
  if (!s) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = t => { t = ((t % 1) + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [f(h / 360 + 1 / 3), f(h / 360), f(h / 360 - 1 / 3)];
}

// The names this understands (others are ignored, as PowerPoint's rarer ones: gamma…).
export const COLOR_MODS = new Set(['alpha', 'alphaMod', 'alphaOff', 'lumMod', 'lumOff', 'lum', 'satMod', 'satOff', 'sat',
  'hueMod', 'hueOff', 'hue', 'tint', 'shade', 'comp', 'inv', 'gray']);

// hex (#rrggbb) + [[name, value], …] in file order → '#rrggbb', '#rrggbbaa' (translucent) or 'none' (fully transparent).
export function colorMods(hex, mods = []) {
  if (!HEX6.test(hex || '')) return hex;
  let rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255), a = 1;
  const hsl = fn => { const x = toHSL(rgb); fn(x); x[1] = clamp(x[1]); x[2] = clamp(x[2]); x[0] = ((x[0] % 360) + 360) % 360; rgb = fromHSL(x); };
  for (const [name, raw] of mods) {
    const v = +raw / 100000; if (!Number.isFinite(v) && !['comp', 'inv', 'gray'].includes(name)) continue;
    switch (name) {
      case 'alpha': a = v; break;
      case 'alphaMod': a *= v; break;
      case 'alphaOff': a += v; break;
      case 'lumMod': hsl(x => { x[2] *= v; }); break;
      case 'lumOff': hsl(x => { x[2] += v; }); break;
      case 'lum': hsl(x => { x[2] = v; }); break;
      case 'satMod': hsl(x => { x[1] *= v; }); break;
      case 'satOff': hsl(x => { x[1] += v; }); break;
      case 'sat': hsl(x => { x[1] = v; }); break;
      case 'hueMod': hsl(x => { x[0] *= v; }); break;
      case 'hueOff': hsl(x => { x[0] += +raw / 60000; }); break;
      case 'hue': hsl(x => { x[0] = +raw / 60000; }); break;
      case 'comp': hsl(x => { x[0] += 180; }); break;
      case 'tint': rgb = rgb.map(c => srgb(1 - (1 - lin(c)) * clamp(v))); break;
      case 'shade': rgb = rgb.map(c => srgb(lin(c) * clamp(v))); break;
      case 'inv': rgb = rgb.map(c => 1 - c); break;
      case 'gray': { const y = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]; rgb = [y, y, y]; break; }
    }
  }
  a = clamp(a);
  if (a <= 0) return 'none';
  const h2 = x => Math.round(clamp(x) * 255).toString(16).padStart(2, '0');
  return '#' + rgb.map(h2).join('') + (a < 1 ? h2(a) : '');
}
// The transforms of a colour element (a:schemeClr…) as [[name, value], …].
export const modsOf = el => (el ? [...el.children].map(m => [m.localName, m.getAttribute('val')]).filter(([n]) => COLOR_MODS.has(n)) : []);
