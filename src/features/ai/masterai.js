// The AI designs the template: from a description («congreso médico, sobrio, azul marino», «para niños de
// primaria», a logo attached) it proposes three clearly different designs, each one whole — the theme (colours and
// fonts, features/design/theme.js), the background, the titles' alignment and colour, the master's decorations
// (shapes behind every slide) and the covers' own (Portada, Encabezado de sección). Only proposals: the person
// sees them drawn (ui/dialogs/masterai.js) and applies one, in one undo step.
//
// Decorations are drawn in a 1280×720 slide and scaled to the deck's size. They stay out of the text: a shape over
// where titles and text go is made faint (opacity ≤ 15 %), so nothing is ever hard to read.

import { state, commit } from '../../core/store.js';
import { uid } from '../../core/model.js';
import { chat, lang, parseJSON, plain } from './openrouter.js';
import { THEME_DOC } from './themeai.js';
import { withAttachments } from './attach.js';
import { themeOf, cleanTheme, contrast, themeChanges } from '../design/theme.js';
import { swapPalette, swapFonts } from '../design/palettes.js';
import { ensureMaster, ensureLayouts, masterStyles } from '../document/master.js';

const HEX6 = /^#[0-9a-f]{6}$/i;
export const DECOR_SHAPES = ['rect', 'rounded', 'ellipse', 'triangle', 'rtriangle', 'diamond', 'hexagon', 'donut', 'frame', 'line'];
const MAX_DECOR = 8;
// Where the text goes on a content slide (1280×720): a shape over it, faint.
const TEXT_AREA = { x: 100, y: 60, w: 1080, h: 600 };

export const MASTER_DOC = () => `A design is {"name":"2-4 words","why":"one short sentence","theme":{…},"background":{"color":"#rrggbb","to":"#rrggbb (optional: a gradient)","angle":0-359},
"title":{"align":"left"|"center","color":"fg"|"accent1".."accent6"},"decor":[shape, …],"cover":{"background":{…} (optional),"decor":[shape, …]}}.
${THEME_DOC()}
"decor": up to ${MAX_DECOR} shapes drawn behind EVERY slide of a 1280x720 slide — bands, bars, corners, circles, frames, thin rules; subtle and at the edges:
titles and text go in x 100–1180, y 60–660, so keep that area clear (a shape there is made faint). "cover": the cover and section slides' own decoration (it replaces "decor" there) — it may be bolder.
A shape: {"shape":"${DECOR_SHAPES.join('|')}","x":0,"y":0,"w":0,"h":0,"color":"accent1".."accent6"|"fg"|"bg"|"#rrggbb","to":"(optional) a second colour: a gradient","angle":0-359,"opacity":10-100,"outline":false,"rotation":0}.
Shapes may go partly off the slide (negative x/y, or past 1280/720) to look cut by its edge.`;

const num = (v, lo, hi, d = 0) => { const n = Math.round(+v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; };
// A colour of the design: a theme slot's or a hex one.
function colourOf(v, th) {
  const s = String(v || '').trim().toLowerCase();
  if (HEX6.test(s)) return s;
  const m = /^accent([1-6])$/.exec(s); if (m) return th.accents[+m[1] - 1];
  return s === 'fg' ? th.fg : s === 'bg' ? th.bg : null;
}
function cleanBackground(x, th) {
  if (!x || typeof x !== 'object') return th.bg;
  const a = colourOf(x.color, th) || th.bg, b = colourOf(x.to, th);
  return b && b !== a ? `linear-gradient(${num(x.angle, 0, 359, 135)}deg, ${a}, ${b})` : a;
}
// The background's main colour (for the text's contrast): a gradient's first.
export const bgColour = bg => (String(bg).match(/#[0-9a-f]{6}/i) || ['#ffffff'])[0].toLowerCase();

// One shape from the model → a decorative block of the slide (1280×720), or null.
export function cleanShape(x, th) {
  if (!x || typeof x !== 'object') return null;
  const shape = DECOR_SHAPES.includes(x.shape) ? x.shape : 'rect', fill = colourOf(x.color, th) || th.accents[0];
  const b = { id: uid(), type: 'shape', shape, x: num(x.x, -640, 1280), y: num(x.y, -360, 720), w: num(x.w, 1, 2560, 100), h: num(x.h, 1, 1440, 100),
    rotation: num(x.rotation, -180, 180), animation: null, decorative: true, aiDecor: true, fill, stroke: fill, strokeWidth: 0 };
  if (b.x + b.w <= 0 || b.y + b.h <= 0 || b.x >= 1280 || b.y >= 720) return null;   // (all of it off the slide)
  const to = colourOf(x.to, th); if (to && to !== fill) { b.fill2 = to; b.gradAngle = num(x.angle, 0, 359, 90); }
  let op = num(x.opacity, 5, 100, 100);
  if (x.outline || shape === 'frame') { b.fill = 'none'; b.strokeWidth = Math.max(2, Math.min(12, num(x.strokeWidth, 1, 12, 3))); delete b.fill2; }
  if (shape === 'line') { b.strokeWidth = Math.max(2, num(x.strokeWidth, 1, 12, 3)); b.h = Math.max(1, b.h); }
  // (Over the text: faint.)
  const ix = Math.max(0, Math.min(b.x + b.w, TEXT_AREA.x + TEXT_AREA.w) - Math.max(b.x, TEXT_AREA.x)), iy = Math.max(0, Math.min(b.y + b.h, TEXT_AREA.y + TEXT_AREA.h) - Math.max(b.y, TEXT_AREA.y));
  if (b.fill !== 'none' && ix * iy > 0.08 * TEXT_AREA.w * TEXT_AREA.h) op = Math.min(op, 15);
  if (op < 100) b.opacity = op;
  return b;
}

// A design from the model, checked: → { name, why, theme, background, title, decor, cover } or null.
export function cleanDesign(d, base = themeOf()) {
  if (!d || typeof d !== 'object') return null;
  const th = cleanTheme(d.theme && typeof d.theme === 'object' ? d.theme : d, base); if (!th) return null;
  const background = cleanBackground(d.background, th);
  // (Text that can't be read on its background: black or white, whichever reads better.)
  const under = bgColour(background); if (contrast(th.fg, under) < 4.5) th.fg = contrast('#111111', under) >= contrast('#ffffff', under) ? '#111111' : '#ffffff';
  const shapes = list => (Array.isArray(list) ? list : []).slice(0, MAX_DECOR).map(x => cleanShape(x, th)).filter(Boolean);
  const t = d.title && typeof d.title === 'object' ? d.title : {}, tc = colourOf(t.color, th);
  const cover = d.cover && typeof d.cover === 'object' ? { background: d.cover.background ? cleanBackground(d.cover.background, th) : null, decor: shapes(d.cover.decor) } : null;
  // (A cover with a background of its own: its texts in a colour that reads on it — the title's if it does.)
  if (cover?.background) {
    const cb = bgColour(cover.background), readable = c => [c, '#ffffff', '#111111'].filter(Boolean).sort((a, b) => contrast(b, cb) - contrast(a, cb))[0];
    cover.fg = contrast(th.fg, cb) >= 4.5 ? th.fg : readable(null);
    cover.title = tc && contrast(tc, cb) >= 3 ? tc : cover.fg;
  }
  return { name: String(d.name || th.name || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 60), why: String(d.why || '').slice(0, 300),
    theme: th, background, title: { align: t.align === 'center' ? 'center' : 'left', color: tc && contrast(tc, under) >= 3 ? tc : null }, decor: shapes(d.decor), cover: cover && (cover.background || cover.decor.length) ? cover : null };
}

// → [design, design, design] ; Error 'BAD_ANSWER' if none came right.
export async function proposeMasterDesigns(description, { deck = state.deck, signal = null, onUsage = null, attachments = [] } = {}) {
  const now = themeOf(deck);
  const titles = deck.slides.slice(0, 8).map(s => plain(s.blocks.find(b => b.ph === 'title' && b.type === 'text')?.html || '').slice(0, 60)).filter(Boolean);
  const msgs = [
    { role: 'system', content: `You are a presentation template designer. Propose 3 CLEARLY DIFFERENT, professional designs for the presentation's template (its master), following the request. Answer ONE JSON object: {"designs":[design, design, design]}.
${MASTER_DOC()}
Each design's "name" and "why" in ${lang()}. Good design: restraint, two or three accents at most in the decoration, strong contrast for the text, consistent shapes (all straight, or all round).
Attached pictures (a logo, a photo, a brand's material): take the colours from them — their real colours, the logo's first — unless the request says otherwise.` },
    { role: 'user', content: withAttachments(`Current theme: ${JSON.stringify(now)}\nThe presentation's titles: ${JSON.stringify(titles)}\n\nRequest: ${String(description || (attachments.length ? 'A template from the attached pictures.' : 'Three good templates for this presentation.')).slice(0, 800)}`, attachments) }];
  const out = await chat(msgs, { json: true, maxTokens: 4000, signal, feature: 'theme', onUsage });
  let r; try { r = parseJSON(out); } catch { r = null; }
  const list = (Array.isArray(r?.designs) ? r.designs : Array.isArray(r) ? r : r ? [r] : []).map(d => cleanDesign(d, now)).filter(Boolean).slice(0, 3);
  if (!list.length) throw new Error('BAD_ANSWER');
  return list;
}

// The layouts that are covers: title and subtitle, nothing else (Portada, Encabezado de sección).
export const isCover = l => l.id === 'title' || l.id === 'section' || (l.blocks.some(b => b.ph === 'title') && l.blocks.some(b => b.ph === 'subtitle') && !l.blocks.some(b => b.ph && !['title', 'subtitle'].includes(b.ph)));
const scaled = (b, k) => ({ ...b, id: uid(), x: Math.round(b.x * k.x), y: Math.round(b.y * k.y), w: Math.max(1, Math.round(b.w * k.x)), h: Math.max(1, Math.round(b.h * k.y)) });
const isOurs = b => b.aiDecor || (b.decorative && b.type === 'shape');

// Apply it to the presentation, in one undo step: the theme everywhere, the background (where slides had the usual
// one), the titles' alignment and colour in the master's styles, and the decorations — the earlier decorative shapes
// of the master and the covers go, pictures (a logo) and the rest stay.
export function applyMasterDesign(d, deck = state.deck) {
  const k = { x: deck.size.w / 1280, y: deck.size.h / 720 };
  commit(() => {
    const m = ensureMaster(deck), lays = ensureLayouts(deck), usual = new Set([m.background, themeOf(deck).bg, d.theme.bg].filter(Boolean));
    // (As features/design/theme.js applyTheme, inside this same step.)
    const ch = themeChanges(d.theme, deck);
    if (ch.colours) swapPalette('custom', deck, { name: d.theme.name || d.name || 'Personalizada', bg: d.theme.bg, fg: d.theme.fg, accents: d.theme.accents });
    if (ch.fonts) swapFonts(d.theme.heading, d.theme.body, deck);
    // (The slides and layouts that showed the usual background take the new one; ones with their own keep it.)
    for (const s of deck.slides) if (!s.background || usual.has(s.background)) s.background = d.background;
    m.background = d.background;
    for (const l of lays) {
      if (l.background && usual.has(l.background)) l.background = null;
      if (!isCover(l)) continue;
      l.blocks = l.blocks.filter(b => !isOurs(b));
      if (d.cover) {
        l.hideMaster = d.cover.decor.length > 0 || undefined; if (!l.hideMaster) delete l.hideMaster;
        l.blocks.unshift(...d.cover.decor.map(b => scaled(b, k)));
        if (d.cover.background) {
          l.background = d.cover.background; for (const s of deck.slides) if (s.layoutId === l.id) s.background = d.cover.background;
          for (const b of l.blocks) if (b.ph === 'title') b.color = d.cover.title; else if (b.ph === 'subtitle') b.color = d.cover.fg;
        }
      } else delete l.hideMaster;
    }
    m.blocks = [...d.decor.map(b => scaled(b, k)), ...m.blocks.filter(b => !isOurs(b))];
    // Titles: alignment and colour in the master's styles (the title placeholders follow them; one with its own
    // alignment — the section's, centred — keeps it).
    const ts = masterStyles(deck, m).title; ts.align = d.title.align;
    if (d.title.color) ts.color = d.title.color; else delete ts.color;
  });
}
