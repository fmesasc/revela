// «Incluir las librerías dentro del HTML» (Exportar ▸ Página web): the libraries a presentation uses — 3D viewer, maps,
// Lottie, PDFs, GIFs, 360° photos, formulas, the web fonts and the map's flags — put inside the page, so it opens
// without a connection. The page is the same one buildHTML makes (parity with Presentar and the viewer): only where it
// takes each library from changes. Each runtime asks `window.__rvLib(url)` for the address to load (the same url when
// nothing is embedded: an editor, a viewer), and this puts the table that answers with blob: addresses of the texts
// carried in <script type="text/rv-lib"> blocks. Only what the page uses goes in (detected from the page itself).
// A new library in core/vendor.js that a page loads must be registered in GROUPS below, and its runtime must load it
// through `window.__rvLib` (CONTRIBUTING.md); the export test fails on any CDN address left in an offline page.

import { KATEX, MODEL_VIEWER, GIFUCT, PDFJS, PANNELLUM, MAPLIBRE, MAPLIBRE_RTL, LOTTIE, FLAG_ICONS } from '../../core/vendor.js';

const NPM_ROOT = 'https://cdn.jsdelivr.net';
const has = (h, u) => h.includes(JSON.stringify(u));
const arabicMap = h => /lang(?:"|&quot;)?:(?:"|&quot;)ar(?:"|&quot;)/.test(h);

// What a page may carry. `sizeKB`: measured (gzip off), for the dialog's «+ N MB»; the web fonts and flags are counted apart.
export const GROUPS = [
  { id: 'reveal', name: 'Presentación (reveal.js)', always: true, sizeKB: 0, files: [] },   // (always inside: offlineHTML)
  { id: '3d', name: 'Modelos 3D', sizeKB: 913, when: h => /<model-viewer[\s>]/.test(h), files: () => [{ u: MODEL_VIEWER }] },
  { id: 'map', name: 'Mapas', sizeKB: 1090, when: h => has(h, MAPLIBRE), files: h => [{ u: MAPLIBRE + '.js' }, { u: MAPLIBRE + '.css' }, ...(arabicMap(h) && has(h, MAPLIBRE_RTL) ? [{ u: MAPLIBRE_RTL }] : [])] },
  { id: 'lottie', name: 'Animación Lottie', sizeKB: 165, when: h => has(h, LOTTIE), files: () => [{ u: LOTTIE }] },
  { id: 'pdf', name: 'PDF', sizeKB: 1690, when: h => has(h, PDFJS), files: () => [{ u: PDFJS + '/pdf.min.mjs' }, { u: PDFJS + '/pdf.worker.min.mjs' }] },
  { id: 'gif', name: 'GIF animados', sizeKB: 15, when: h => has(h, GIFUCT), files: () => [{ u: GIFUCT, esm: true }] },
  { id: 'pano', name: 'Foto de 360°', sizeKB: 66, when: h => h.includes(PANNELLUM), files: () => [{ u: PANNELLUM + '.js' }, { u: PANNELLUM + '.css' }] },
  { id: 'math', name: 'Fórmulas', sizeKB: 300, when: h => h.includes(KATEX + '/katex.min.js'), files: [] },   // (in place: see inlineKatex)
];

// The theme's own fonts (measured, woff inside) and one Google family's latin subsets, for the dialog's «+ N MB».
const THEME_FONTS_KB = { black: 557, white: 557, 'black-contrast': 557, 'white-contrast': 557, league: 166, beige: 166, moon: 166, solarized: 166, sky: 763, night: 714, simple: 161, blood: 300 };
export const fontsKB = (theme, families = 0) => (THEME_FONTS_KB[theme] ?? 0) + families * 45;
// → the groups this page needs (with their files), for the dialog and for the export.
export function usedGroups(html) {
  return GROUPS.filter(g => !g.always && g.when(html)).map(g => ({ ...g, files: typeof g.files === 'function' ? g.files(html) : g.files }));
}
// What a page still needs a connection for, whatever is inside it: tiles, remote pictures and videos, embedded webs, the camera.
export function needsNetwork(html) {
  const out = [];
  if (/ data-geomap="/.test(html)) out.push('map');
  if (/<iframe[\s>]/i.test(html) || /\sdata-web="/.test(html)) out.push('web');
  if (/<(video|model-viewer)[^>]+src="https?:/i.test(html) || /<img[^>]+src="https?:\/\/(?!cdn\.jsdelivr\.net)/i.test(html)) out.push('media');
  if (html.includes('tasks-vision')) out.push('camera');
  return out;
}

const cache = new Map();
const fetchText = url => { if (!cache.has(url)) cache.set(url, fetch(url).then(r => (r.ok ? r.text() : Promise.reject(new Error(r.status))))); return cache.get(url); };
const fetchBuf = async url => { const r = await fetch(url); if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); };
const b64 = buf => { const a = new Uint8Array(buf); let s = ''; for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(s); };
const dataURI = async (url, mime) => `data:${mime};base64,${b64(await fetchBuf(url))}`;
// (Text inside a <script>: no «</script», and no «<!--» that opens the double-escaped state.)
const safeText = s => s.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');

// The characters of the page's own text (data: pictures left out), to keep only the font subsets it needs.
export function usedCodePoints(html) {
  const set = new Set(); let from = 0;
  const take = to => { for (const ch of html.slice(from, to)) set.add(ch.codePointAt(0)); };
  for (let i = html.indexOf('base64,'); i >= 0; i = html.indexOf('base64,', from)) {
    take(i); let j = i + 7; while (j < html.length && /[A-Za-z0-9+/=]/.test(html[j])) j++; from = j;
  }
  take(html.length); return set;
}
function inRange(range, used) {
  for (const part of range.split(',')) {
    const m = /U\+([0-9A-Fa-f?]+)(?:-([0-9A-Fa-f]+))?/.exec(part); if (!m) continue;
    let a, b;
    if (m[1].includes('?')) { a = parseInt(m[1].replace(/\?/g, '0'), 16); b = parseInt(m[1].replace(/\?/g, 'F'), 16); }
    else { a = parseInt(m[1], 16); b = m[2] ? parseInt(m[2], 16) : a; }
    if (b - a > 20000) { for (const c of used) if (c >= a && c <= b) return true; }
    else for (let c = a; c <= b; c++) if (used.has(c)) return true;
  }
  return false;
}
const LATIN = /U\+0000-00FF/;
// A Google Fonts stylesheet with its font files inside (only the subsets whose letters the page uses).
async function googleCss(url, used) {
  const css = await fetchText(url), blocks = css.match(/@font-face\s*{[^}]*}/g) || [], out = [];
  for (const b of blocks) {
    const range = /unicode-range:\s*([^;]+)/.exec(b)?.[1];
    if (range && !LATIN.test(range) && !inRange(range, used)) continue;
    const src = /url\((https:[^)]+)\)/.exec(b); if (!src) continue;
    const mime = /format\(['"]?(\w+)/.exec(b)?.[1], type = { woff2: 'font/woff2', woff: 'font/woff', truetype: 'font/ttf' }[mime] || 'font/woff2';
    out.push(b.replace(src[0], `url(${await dataURI(src[1], type)})`));
  }
  return out.join('\n');
}
// A @font-face that lists several formats (eot, woff, ttf…) keeps one: woff2, else woff, else truetype — every browser that draws these does read it.
function slimFace(b) {
  const list = [...b.matchAll(/url\(\s*['"]?([^'")]+?)['"]?\s*\)\s*format\(\s*['"]?([\w-]+)['"]?\s*\)/g)];
  const pick = ['woff2', 'woff', 'truetype'].map(f => list.find(m => m[2] === f)).find(Boolean);
  if (!pick) return b;
  return b.replace(/\bsrc\s*:[^;}]*;?/g, '').replace(/}\s*$/, `src:url(${pick[1]}) format("${pick[2]}");}`);
}
// A stylesheet from the CDN with what it pulls in inside it: @imports (the themes' fonts, Google's) and url() fonts.
async function inlineCss(css, base, used) {
  css = css.replace(/@font-face\s*{[^}]*}/g, slimFace);
  const imports = [...css.matchAll(/@import\s+url\(\s*['"]?([^'")]+)['"]?\s*\)\s*;?/g)];
  for (const m of imports) {
    const u = new URL(m[1], base).href;
    const text = /^https:\/\/fonts\.googleapis\.com\//.test(u) ? await googleCss(u, used) : await inlineCss(await fetchText(u), u, used);
    css = css.replace(m[0], () => text);
  }
  const fonts = [...new Set([...css.matchAll(/url\(\s*(['"]?)(?!data:|https?:\/\/fonts\.g|#)([^'")]+)\1\s*\)/g)].map(m => m[2]))];
  for (const u of fonts) {
    const abs = new URL(u, base).href, ext = (/\.(\w+)(?:[?#]|$)/.exec(abs) || [])[1];
    const mime = { woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf', otf: 'font/otf', svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', gif: 'image/gif' }[ext];
    if (!mime) continue;
    css = css.split(u).join(await dataURI(abs, mime));
  }
  return css;
}

// KaTeX: its styles (fonts as woff2 inside) and its two scripts, in the place of the tags.
async function inlineKatex(html, used) {
  const done = await inlineCss(await fetchText(KATEX + '/katex.min.css'), KATEX + '/katex.min.css', used);
  html = html.replace(`<link rel="stylesheet" href="${KATEX}/katex.min.css">`, () => `<style>${done.replace(/<\/style/gi, '<\\/style')}</style>`);
  for (const f of ['katex.min.js', 'contrib/auto-render.min.js']) {
    const tag = `<script defer src="${KATEX}/${f}"></script>`;
    if (html.includes(tag)) { const text = await fetchText(`${KATEX}/${f}`); html = html.replace(tag, () => `<script>${safeText(text)}</script>`); }
  }
  return html;
}

// An ES module's own imports (jsDelivr's +esm bundles import each other by path): collected, to be wired at run time.
async function esmDeps(url, seen = new Map()) {
  if (seen.has(url)) return seen;
  const text = await fetchText(url); seen.set(url, []);
  const deps = [...new Set([...text.matchAll(/(?:from|import)\s*["'](\/npm\/[^"']+)["']/g)].map(m => m[1]))];
  seen.set(url, deps);
  for (const d of deps) await esmDeps(NPM_ROOT + d, seen);
  return seen;
}

const TABLE_JS = `(function(){var B={};function blob(u){if(B[u])return B[u];var e=document.querySelector('script[data-rv-lib="'+u+'"]');if(!e)return u;
var x=e.textContent.split('<\\\\/script').join('</script').split('<\\\\!--').join('<!--'),d=(e.getAttribute('data-d')||'').split(' ').filter(Boolean);
d.forEach(function(p){x=x.split('"'+p+'"').join('"'+blob('${NPM_ROOT}'+p)+'"');});
return B[u]=URL.createObjectURL(new Blob([x],{type:/\\.css$/.test(u)?'text/css':'text/javascript'}));}window.__rvLib=blob;})();`;

// → { html, libs: [ids embedded], missing: [ids that could not be fetched: they stay on the CDN], fonts: bool }
export async function inlineLibs(html, { say, used = usedCodePoints(html) } = {}) {
  const libs = [], missing = [], blocks = [];
  let fonts = true;
  // The fonts of the web (Google's) and of the theme (@import inside reveal's CSS is dealt with in offlineHTML).
  const gl = [...html.matchAll(/<link rel="stylesheet" href="(https:\/\/fonts\.googleapis\.com\/[^"]+)">/g)];
  for (const m of gl) {
    try { const css = await googleCss(m[1].replace(/&amp;/g, '&'), used); html = html.replace(m[0], () => `<style>${css}</style>`); }
    catch { fonts = false; }
  }
  for (const g of usedGroups(html)) {
    say?.(g.name);
    try {
      if (g.id === 'math') { html = await inlineKatex(html, used); libs.push(g.id); continue; }
      for (const f of g.files) {
        const deps = f.esm ? [...(await esmDeps(f.u)).entries()] : [[f.u, []]];
        for (const [u, d] of deps) blocks.push(`<script type="text/rv-lib" data-rv-lib="${u}"${d.length ? ` data-d="${d.join(' ')}"` : ''}>${safeText(await fetchText(u))}</script>`);
      }
      libs.push(g.id);
    } catch { missing.push(g.id); }
  }
  // The map's flags (one small SVG each): data: addresses in place of the CDN's.
  const flagRe = new RegExp(FLAG_ICONS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[a-z-]+\\.svg', 'g');
  const flags = [...new Set(html.match(flagRe) || [])];
  if (flags.length) {
    try {
      const uris = await Promise.all(flags.map(u => dataURI(u, 'image/svg+xml')));
      flags.forEach((u, i) => { html = html.split(u).join(uris[i]); });
    } catch { missing.push('flags'); }
  }
  // 3D viewer asked for in the head although the page has no model: nothing to load (offline there is nothing to ask).
  if (!libs.includes('3d') && html.includes(JSON.stringify(MODEL_VIEWER))) html = html.split(JSON.stringify(MODEL_VIEWER)).join('"data:text/javascript,"');
  if (blocks.length) {
    const head = `<script>${TABLE_JS}</script>\n${blocks.join('\n')}\n`, at = html.indexOf('<style>aside.notes{display:none}</style>');
    const pos = at >= 0 ? at + '<style>aside.notes{display:none}</style>'.length + 1 : html.indexOf('<script');
    html = html.slice(0, pos) + head + html.slice(pos);
  }
  return { html, libs, missing, fonts };
}
export { inlineCss };
