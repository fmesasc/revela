// Non‑interactive block rendering, shared by slide thumbnails.

import { shapeSVG, imgFilter, imgOpacity } from './shape.js';

export function blockPreview(b) {
  const el = document.createElement('div');
  el.className = 'pv-block';
  el.style.cssText = `position:absolute;left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;`
    + `transform:rotate(${b.rotation || 0}deg)${b.flipH ? ' scaleX(-1)' : ''}${b.flipV ? ' scaleY(-1)' : ''}`;
  if (b.type === 'text') {
    el.innerHTML = `<div style="font-size:${b.fontSize || 40}px;color:#fff;`
      + `text-align:${b.textAlign || 'left'};${b.fontFamily ? `font-family:${b.fontFamily};` : ''}`
      + `${b.lineHeight ? `line-height:${b.lineHeight};` : ''}`
      + `${b.letterSpacing ? `letter-spacing:${b.letterSpacing}px;` : ''}`
      + `${b.indent ? `padding-left:${b.indent}px;` : ''}">`
      + `${b.html || ''}</div>`;
  } else if (b.type === 'image') {
    el.innerHTML = `<img src="${b.src}" style="width:100%;height:100%;object-fit:${b.fit || 'contain'};`
      + `filter:${imgFilter(b)};opacity:${imgOpacity(b)}">`;
  } else if (b.type === 'video') {
    el.innerHTML = `<div style="width:100%;height:100%;background:#000;display:grid;place-items:center;color:#fff;font-size:60px">▶</div>`;
  } else if (b.type === 'model') {
    el.innerHTML = `<div style="width:100%;height:100%;background:#0003;display:grid;place-items:center;font-size:80px">🧊</div>`;
  } else if (b.type === 'embed') {
    el.innerHTML = `<div style="width:100%;height:100%;background:#fff;display:grid;place-items:center;font-size:64px">🌐</div>`;
  } else if (b.type === 'shape') {
    el.innerHTML = shapeSVG(b);
  } else if (b.type === 'table') {
    el.innerHTML = `<table style="border-collapse:collapse;width:100%;height:100%;--stroke:${b.stroke || '#fff'}">`
      + b.rows.map(row => `<tr>${row.map(c => `<td style="border:1px solid ${b.stroke || '#fff'};color:#fff;padding:2px 4px">${c || ''}</td>`).join('')}</tr>`).join('')
      + `</table>`;
  } else if (b.type === 'code') {
    const pre = document.createElement('pre');
    pre.style.cssText = `margin:0;width:100%;height:100%;overflow:hidden;background:#0b0e14;color:#e6e6e6;`
      + `padding:8px;font-size:${b.fontSize || 22}px;font-family:monospace;white-space:pre-wrap`;
    pre.textContent = b.code || ''; el.appendChild(pre);
  }
  return el;
}
