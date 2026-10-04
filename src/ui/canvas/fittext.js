// A translated example presentation, measured as the editor draws it: a text that now
// spills out of its box (and in Spanish didn't) is made smaller until it fits — down to
// 55 % of its size. tplang.js has already estimated it without measuring; this is exact.

import { styled } from '../../features/document/master.js';
import { originalText } from '../../features/content/tplang.js';
import { styleRich } from './content.js';
import { ensureDeckFonts } from '../../features/design/fonts.js';

export async function fitTranslated(deck) {
  const todo = [];
  for (const slide of deck.slides || []) for (const b of slide.blocks || []) if (b.type === 'text' && !b.curve && originalText(b) != null) todo.push([b, slide]);
  if (!todo.length || typeof document === 'undefined') return deck;
  // (Measured with the presentation's own letters: their styles and faces loaded first, 4 s at most.)
  ensureDeckFonts(deck);
  const wait = (p, ms) => Promise.race([p, new Promise(r => setTimeout(r, ms))]);
  const links = [...document.querySelectorAll('link[rel=stylesheet][href*="fonts.googleapis"]')];
  await wait(Promise.all(links.map(l => (l.sheet ? 1 : new Promise(r => { l.addEventListener('load', r); l.addEventListener('error', r); })))), 4000);
  const fams = new Set([deck.bodyFont, ...todo.map(([b, slide]) => styled(b, slide, deck).fontFamily)].filter(Boolean));
  try { await wait(Promise.all([...fams].map(f => document.fonts.load(`16px ${f}`).catch(() => {}))), 4000); await document.fonts.ready; } catch {}
  const stage = document.createElement('div');
  stage.className = 'stage';
  stage.style.cssText = `position:fixed;left:-20000px;top:0;width:${deck.size?.w || 1280}px;height:${deck.size?.h || 720}px;visibility:hidden;pointer-events:none`;
  stage.style.fontFamily = deck.bodyFont || '';                    // (as the canvas: the presentation's letters by default)
  document.body.appendChild(stage);
  const block = document.createElement('div'), rich = document.createElement('div');
  block.className = 'block'; rich.className = 'rich'; block.appendChild(rich); stage.appendChild(block);
  // (Does the text's ink go past the box? As tools/audit-templates.py checks it.)
  const spills = (b, slide, html) => {
    if (b.vertical) return false;                                   // (vertical text: left as it is)
    block.style.cssText = `position:absolute;left:0;top:0;width:${b.w}px;height:${b.h}px`;
    styleRich(rich, styled(b, slide, deck)); rich.innerHTML = html;
    const box = block.getBoundingClientRect(), w = document.createTreeWalker(rich, NodeFilter.SHOW_TEXT), r = document.createRange();
    for (let n; (n = w.nextNode());) {
      if (!n.textContent.trim()) continue;
      r.selectNodeContents(n);
      for (const q of r.getClientRects()) if (q.bottom > box.bottom + 3 || q.right > box.right + 3) return true;
    }
    return false;
  };
  try {
    for (const [b, slide] of todo) {
      if (!spills(b, slide, b.html) || spills(b, slide, originalText(b))) continue;
      const own = b.fontSize != null, base = own ? b.fontSize : (b.fit || 1), html = b.html;
      for (let k = 0.95; k >= 0.55; k -= 0.05) {
        if (own) b.fontSize = Math.round(base * k); else b.fit = Math.round(base * k * 100) / 100;
        b.html = html.replace(/font-size:\s*([\d.]+)px/g, (m, v) => `font-size:${Math.round(v * k)}px`);
        if (!spills(b, slide, b.html)) break;
      }
    }
  } finally { stage.remove(); }
  return deck;
}
