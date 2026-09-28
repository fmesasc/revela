// Non‑interactive block rendering, shared by slide thumbnails.

import { pollEditorHTML } from '../features/poll.js';
import { currentPalette } from '../features/palettes.js';
import { shapeSVG, imgFilter, imgOpacity, imgClip, chartSVG, iconSVG, wordartCSS, tableRowsHTML, inkSVG, tableClass, tableVars, tableCSS } from './shape.js';

// Table look for thumbnails (same rules as the exports), injected once.
function ensurePreviewCSS() {
  if (document.getElementById('pv-css')) return;
  const st = document.createElement('style'); st.id = 'pv-css'; st.textContent = tableCSS('.pv ');
  document.head.appendChild(st);
}

export function blockPreview(b) {
  const el = document.createElement('div');
  el.className = 'pv-block';
  el.style.cssText = `position:absolute;left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;`
    + `transform:rotate(${b.rotation || 0}deg)${b.flipH ? ' scaleX(-1)' : ''}${b.flipV ? ' scaleY(-1)' : ''}`;
  if (b.type === 'text') {
    el.innerHTML = `<div style="font-size:${b.fontSize || 40}px;color:inherit;`
      + `text-align:${b.textAlign || 'left'};${b.fontFamily ? `font-family:${b.fontFamily};` : ''}`
      + `${b.lineHeight ? `line-height:${b.lineHeight};` : ''}`
      + `${b.letterSpacing ? `letter-spacing:${b.letterSpacing}px;` : ''}`
      + `${b.indent ? `padding-left:${b.indent}px;` : ''}`
      + `${b.dir === 'rtl' ? 'direction:rtl;' : ''}`
      + `${b.vertical ? 'writing-mode:vertical-rl;' : ''}`
      + `${b.bg ? `background:${b.bg};` : ''}${b.borderColor ? `border:2px solid ${b.borderColor};` : ''}`
      + `${b.radius ? `border-radius:${b.radius}px;` : ''}box-sizing:border-box;`
      + `${b.fontWeight ? `font-weight:${b.fontWeight};` : ''}${b.fontStyle ? `font-style:${b.fontStyle};` : ''}`
      + `${b.columns > 1 ? `column-count:${b.columns};column-gap:32px;` : ''}`
      + `${b.wordart ? wordartCSS(b.wordart) : ''}">`
      + `${b.html || ''}</div>`;
  } else if (b.type === 'image') {
    el.innerHTML = `<img src="${b.src}" style="width:100%;height:100%;object-fit:${b.fit || 'contain'};`
      + `filter:${imgFilter(b)};opacity:${imgOpacity(b)};clip-path:${imgClip(b)}">`;
  } else if (b.type === 'video') {
    el.innerHTML = `<div style="width:100%;height:100%;background:#000;display:grid;place-items:center;color:#fff;font-size:60px">▶</div>`;
  } else if (b.type === 'audio') {
    el.innerHTML = `<div style="width:100%;height:100%;background:#0004;display:grid;place-items:center;font-size:32px">🔊</div>`;
  } else if (b.type === 'model') {
    el.innerHTML = `<div style="width:100%;height:100%;background:#0003;display:grid;place-items:center;font-size:80px">🧊</div>`;
  } else if (b.type === 'embed') {
    el.innerHTML = `<div style="width:100%;height:100%;background:#fff;display:grid;place-items:center;font-size:64px">🌐</div>`;
  } else if (b.type === 'shape') {
    el.innerHTML = shapeSVG(b);
  } else if (b.type === 'chart') {
    el.innerHTML = chartSVG(b);
  } else if (b.type === 'icon') {
    el.innerHTML = iconSVG(b);
  } else if (b.type === 'ink') {
    el.innerHTML = inkSVG(b);
  } else if (b.type === 'poll') {
    el.innerHTML = pollEditorHTML(b, currentPalette().accents);
  } else if (b.type === 'camera') {
    el.innerHTML = `<div style="width:100%;height:100%;background:#223;border-radius:${b.shape === 'circle' ? '50%' : b.shape === 'rounded' ? '14%' : '0'};display:grid;place-items:center;color:#fff;font-size:60px">●</div>`;
  } else if (b.type === 'math') {
    el.innerHTML = `<div style="width:100%;height:100%;display:grid;place-items:center;color:inherit;font-size:40px">∑</div>`;
  } else if (b.type === 'figindex') {
    el.innerHTML = `<div style="width:100%;height:100%;display:grid;place-items:center;color:#fff;font-size:40px">📑</div>`;
  } else if (b.type === 'table') {
    ensurePreviewCSS();
    el.innerHTML = `<div class="pv" style="width:100%;height:100%"><table class="${tableClass(b)}" style="${tableVars(b)}">`
      + tableRowsHTML(b) + `</table></div>`;
  } else if (b.type === 'code') {
    const pre = document.createElement('pre');
    pre.style.cssText = `margin:0;width:100%;height:100%;overflow:hidden;background:#0b0e14;color:#e6e6e6;`
      + `padding:8px;font-size:${b.fontSize || 22}px;font-family:monospace;white-space:pre-wrap`;
    pre.textContent = b.code || ''; el.appendChild(pre);
  }
  return el;
}
