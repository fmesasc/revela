// «Desde una web» in the brand kit (Prezi AI's and Presentations.ai's brand from a URL): a site's colours, fonts, logo
// and name, read from its page and stylesheets — no AI, nothing kept. Route /api/brand/site (signed in; a few a minute).
//
// What it looks at: the page's theme-color, the colours its CSS gives most (named brand ones —--primary, --brand… —
// count most), the background and the text that are most used, the font families of the headings and the body (and
// of a Google Fonts link), and the logo: an <img> or inline <svg> called «logo», else the large touch icon.

import { call } from './api.js';

const PAGE_MAX = 1_500_000, CSS_MAX = 600_000, IMG_MAX = 600_000, CSS_FILES = 4;
const UA = 'Mozilla/5.0 (compatible; RevelaBrand/1.0; +https://revelaslides.com)';

// A public http(s) address (not this machine nor a private network: the Worker can't reach them anyway; said plainly).
export function publicURL(u) {
  let x; try { x = new URL(/^https?:\/\//i.test(u) ? u : 'https://' + u); } catch { return null; }
  if (!/^https?:$/.test(x.protocol) || x.username || x.password) return null;
  const h = x.hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || !h.includes('.')) return null;
  if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h) || h.startsWith('[')) return null;
  return x;
}

// At most `max` bytes of a response (a page that goes on and on is cut there).
async function readCapped(r, max) {
  const reader = r.body?.getReader(); if (!reader) return new Uint8Array();
  const parts = []; let n = 0;
  for (;;) { const { done, value } = await reader.read(); if (done) break; parts.push(value); n += value.length; if (n >= max) { reader.cancel().catch(() => {}); break; } }
  const out = new Uint8Array(Math.min(n, max)); let o = 0;
  for (const p of parts) { const take = Math.min(p.length, out.length - o); out.set(p.subarray(0, take), o); o += take; if (o >= out.length) break; }
  return out;
}
const get = (env, u, accept) => (env.FETCH || fetch)(u, { headers: { 'User-Agent': UA, Accept: accept }, redirect: 'follow', signal: AbortSignal.timeout?.(8000) }).catch(() => null);

// ---- Colours ----
const hex2 = n => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
export function parseColour(s) {
  s = String(s).trim().toLowerCase(); let m;
  if ((m = s.match(/^#([0-9a-f]{3,4})$/))) return '#' + [...m[1].slice(0, 3)].map(c => c + c).join('');
  if ((m = s.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/))) return m[2] && parseInt(m[2], 16) < 128 ? null : '#' + m[1];
  if ((m = s.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/))) {
    const a = m[4] == null ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : +m[4]; if (a < 0.5) return null;
    return '#' + hex2(+m[1]) + hex2(+m[2]) + hex2(+m[3]);
  }
  return null;
}
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const light = h => { const [r, g, b] = rgb(h); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
const chroma = h => { const c = rgb(h); return Math.max(...c) - Math.min(...c); };
const near = (a, b) => { const x = rgb(a), y = rgb(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) < 30; };
const COLOUR_RE = /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)/gi;
// (A framework's own colours — Bootstrap's, left as they come — say nothing of the brand: they count little.)
const STOCK = new Set(['#007bff', '#0d6efd', '#6610f2', '#6f42c1', '#d63384', '#e83e8c', '#dc3545', '#fd7e14', '#ffc107', '#28a745', '#198754', '#20c997', '#17a2b8', '#0dcaf0', '#6c757d', '#0056b3', '#0a58ca', '#138496', '#218838', '#c82333', '#e0a800',
  '#337ab7', '#286090', '#23527c', '#204d74', '#5cb85c', '#449d44', '#4cae4c', '#5bc0de', '#31b0d5', '#269abc', '#f0ad4e', '#ec971f', '#d9534f', '#c9302c', '#d43f3a']);   // (Bootstrap 4 and 5; 3)

// The rules of some CSS: [selector, declarations] (nested @media blocks: their inner rules, as the rest).
function rules(css) {
  const out = [], re = /([^{}]*)\{([^{}]*)\}/g; let m;
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  while ((m = re.exec(css))) out.push([m[1].trim(), m[2]]);
  return out;
}

export function brandOf(html, cssList, base) {
  const css = cssList.join('\n') + '\n' + [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(m => m[1]).join('\n');
  const attr = (tag, name) => { const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>"']+))`, 'i')); return m ? m[1] ?? m[2] ?? m[3] ?? '' : ''; };
  const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map(m => m[0]);
  const meta = k => { const t = metas.find(x => new RegExp(`(name|property)\\s*=\\s*["']?${k}["']?`, 'i').test(x)); return t ? decode(attr(t, 'content')) : ''; };
  const abs = u => { try { return new URL(decode(u), base).href; } catch { return ''; } };

  // Colours, with a score: brand-named variables most, then buttons and links, then any; backgrounds and texts apart.
  const score = new Map(), bgs = new Map(), texts = new Map();
  const add = (map, c, w) => { const k = [...map.keys()].find(x => near(x, c)) || c; map.set(k, (map.get(k) || 0) + w); };
  const tc = parseColour(meta('theme-color')); if (tc) add(score, tc, 30);
  const tile = parseColour(meta('msapplication-TileColor')); if (tile) add(score, tile, 12);
  for (const [sel, body] of rules(css)) {
    for (const d of body.split(';')) {
      const i = d.indexOf(':'); if (i < 0) continue;
      const prop = d.slice(0, i).trim().toLowerCase(), val = d.slice(i + 1);
      const cols = (val.match(COLOUR_RE) || []).map(parseColour).filter(Boolean); if (!cols.length) continue;
      const brandVar = /^--.*(primary|brand|accent|main|secondary|highlight|theme)/.test(prop);
      const button = /\b(btn|button|cta|nav|header)\b|\ba\b|:hover/i.test(sel);
      for (const c of cols) {
        if (chroma(c) > 45 && light(c) > 0.08 && light(c) < 0.93) add(score, c, (brandVar ? 8 : button ? 3 : 1) * (STOCK.has(c) ? 0.1 : 1));
        if (/^(background|background-color)$/.test(prop) && /^(html|body|:root|main)\b/i.test(sel)) add(bgs, c, 5);
        else if (/^(background|background-color)$/.test(prop)) add(bgs, c, 1);
        if (prop === 'color' && /^(html|body|p|:root|main)\b/i.test(sel)) add(texts, c, 5);
        else if (prop === 'color') add(texts, c, 1);
        if (brandVar && /(bg|background)/.test(prop)) add(bgs, c, 2);
        if (brandVar && /(text|fg|foreground|body-color)/.test(prop)) add(texts, c, 2);
      }
    }
  }
  const top = m => [...m.entries()].sort((a, b) => b[1] - a[1]).map(x => x[0]);
  const bg = top(bgs).find(c => light(c) > 0.85 || light(c) < 0.15) || '#ffffff';
  const text = top(texts).find(c => Math.abs(light(c) - light(bg)) > 0.5) || (light(bg) > 0.5 ? '#1d1f24' : '#f4f4f4');
  const ranked = top(score).filter(c => !near(c, bg) && !near(c, text)), own = ranked.filter(c => !STOCK.has(c));
  const accents = (own.length >= 2 ? own : ranked).slice(0, 6);           // (a framework's, only for want of the site's own)

  // Fonts: the headings' and the body's first family (a Google Fonts link counts too).
  const generic = /^(inherit|initial|unset|serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-[a-z-]+|-apple-system|blinkmacsystemfont|segoe ui|emoji|math|var\(.*)$/i;
  // (A family's own name: «Roboto-Bold», «sohne-var» → «Roboto», «sohne».)
  const fam = v => (v.split(',').map(s => s.trim().replace(/^["']|["']$/g, '').replace(/\s*!important$/, '')).find(s => s && !generic.test(s)) || '')
    .replace(/[-_ ]?(bold|regular|medium|light|semibold|extrabold|black|thin|italic|var|variable|vf)$/i, '');
  const heads = new Map(), bodies = new Map();
  for (const [sel, body] of rules(css)) {
    const m = body.match(/(?:^|;)\s*font-family\s*:\s*([^;]+)/i) || body.match(/(?:^|;)\s*font\s*:[^;]*?\d[\w.%]*\s+([^;]+)/i); if (!m) continue;
    const f = fam(m[1]); if (!f) continue;
    if (/\bh[1-3]\b|title|heading|display/i.test(sel)) add2(heads, f, 2);
    if (/^(html|body|:root|p)\b/i.test(sel)) add2(bodies, f, 3); else add2(bodies, f, 0.2);
  }
  for (const m of html.matchAll(/fonts\.googleapis\.com\/css2?\?[^"'>]*/gi))
    for (const f of decode(m[0]).matchAll(/family=([^&:;|]+)/g)) { const n = decodeURIComponent(f[1].replace(/\+/g, ' ')).trim(); add2(heads, n, 1); add2(bodies, n, 1); }
  const body = top(bodies)[0] || '', heading = top(heads)[0] || body;

  // The logo: candidates in order (an <img> or <svg> called so, the header's first picture, the big touch icon).
  const logos = [];
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const t = m[0], src = attr(t, 'src') || (attr(t, 'srcset').split(/\s+/)[0] || '') || attr(t, 'data-src');
    if (src && /logo/i.test([attr(t, 'class'), attr(t, 'id'), attr(t, 'alt'), src].join(' '))) logos.push(abs(src));
  }
  for (const m of html.matchAll(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi)) {
    const open = m[0].match(/<svg\b[^>]*>/i)[0];
    if (/logo/i.test([attr(open, 'class'), attr(open, 'id'), attr(open, 'aria-label')].join(' ')) && m[0].length < 120000) {
      const svg = /xmlns=/.test(open) ? m[0] : m[0].replace(/<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"');
      logos.push('data:image/svg+xml;base64,' + b64(new TextEncoder().encode(svg))); break;
    }
  }
  const header = html.match(/<header\b[\s\S]*?<\/header>/i)?.[0];
  const firstImg = header?.match(/<img\b[^>]*>/i)?.[0]; if (firstImg && attr(firstImg, 'src')) logos.push(abs(attr(firstImg, 'src')));
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) if (/apple-touch-icon|icon/i.test(attr(m[0], 'rel')) && (/\.svg/i.test(attr(m[0], 'href')) || +(attr(m[0], 'sizes').split('x')[0]) >= 120 || /apple-touch/i.test(attr(m[0], 'rel')))) logos.push(abs(attr(m[0], 'href')));

  const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || '';
  // (The name: the site's own, else the part of the title that is the domain's name — «Muebles… - IKEA» —, else its first.)
  const label = new URL(base).hostname.replace(/^www\./, '').split('.').slice(-2)[0], parts = decode(title).split(/\s+[|\-–—·:]\s+/).map(x => x.trim()).filter(Boolean);
  const fold = x => x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  const name = (meta('og:site_name') || parts.find(x => fold(x).includes(fold(label))) || parts[0] || label).trim().slice(0, 60);
  return { name, colors: [bg, text, ...accents], fonts: { heading, body }, logos: [...new Set(logos.filter(Boolean))].slice(0, 4) };
}
function b64(bytes) { let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(bin); }
function add2(map, k, w) { const key = [...map.keys()].find(x => x.toLowerCase() === k.toLowerCase()) || k; map.set(key, (map.get(key) || 0) + w); }
function decode(s) { return String(s).replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)); }

// The route: the page, its first stylesheets, and its logos brought here as pictures (the app can't fetch other sites).
export async function brandFromSite(env, A, body, json) {
  const u = publicURL(String(body?.url || '').trim().slice(0, 500)); if (!u) return json({ error: 'bad url' }, 400);
  if (!(await call(A, 'ratek', { key: 'brand', per: 6 })).ok) return json({ error: 'too many requests' }, 429);
  const r = await get(env, u.href, 'text/html,*/*;q=0.5');
  if (!r || !r.ok || !/html/i.test(r.headers.get('content-type') || 'text/html')) return json({ error: 'unreachable', status: r?.status || 0 }, 502);
  const base = r.url || u.href, html = new TextDecoder().decode(await readCapped(r, PAGE_MAX));
  const sheets = [...html.matchAll(/<link\b[^>]*>/gi)].map(m => m[0]).filter(t => /rel\s*=\s*["']?[^"'>]*stylesheet/i.test(t))
    .map(t => (t.match(/href\s*=\s*["']([^"']+)["']/i) || [])[1]).filter(Boolean).map(h => { try { return new URL(h.replace(/&amp;/g, '&'), base).href; } catch { return ''; } })
    .filter(h => publicURL(h) && !/fonts\.googleapis\.com/.test(h)).slice(0, CSS_FILES);
  const css = await Promise.all(sheets.map(async h => { const s = await get(env, h, 'text/css,*/*;q=0.1'); return s?.ok ? new TextDecoder().decode(await readCapped(s, CSS_MAX)) : ''; }));
  const b = brandOf(html, css, base);
  const pics = [];
  for (const l of b.logos) {
    if (pics.length >= 2) break;
    if (l.startsWith('data:image/')) { pics.push(l); continue; }
    if (!publicURL(l)) continue;
    const p = await get(env, l, 'image/*'); const type = (p?.headers.get('content-type') || '').split(';')[0].trim();
    if (!p?.ok || !/^image\/(png|jpeg|webp|gif|svg\+xml|x-icon|vnd\.microsoft\.icon)$/.test(type)) continue;
    const bytes = await readCapped(p, IMG_MAX + 1); if (bytes.length > IMG_MAX) continue;
    pics.push(`data:${type === 'image/vnd.microsoft.icon' ? 'image/x-icon' : type};base64,${b64(bytes)}`);
  }
  return json({ name: b.name, colors: b.colors, fonts: b.fonts, logos: pics, site: new URL(base).hostname });
}
