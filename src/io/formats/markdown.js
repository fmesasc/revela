// Markdown → slides, with reveal.js's markdown conventions:
//   ---  new slide      --  new vertical slide (below)      Note:  speaker notes
// Inside a slide: the first heading is the title; paragraphs and lists form
// the body; ``` fenced code becomes a code block (```js [1|2-3] steps the
// highlighted lines, like reveal); ![alt](url) becomes a picture.

import { esc } from '../../core/text.js';
import { uid } from '../../core/model.js';

function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, (m, a, b) => `<b>${a || b}</b>`)
    .replace(/(^|[^*])\*([^*]+)\*|(^|[^_])_([^_]+)_/g, (m, p1, a, p2, b) => `${p1 ?? p2 ?? ''}<i>${a || b}</i>`)
    .replace(/~~([^~]+)~~/g, '<s>$1</s>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, txt, url) => (/^(https?:|mailto:|#|\/|\.)/i.test(url) || !/^[a-z][\w+.-]*:/i.test(url) ? `<a href="${url.replace(/"/g, '&quot;')}">${txt}</a>` : txt));   // (no javascript: links)
}

// Markdown body lines → HTML (paragraphs, bullet and numbered lists, nesting by indent).
function bodyHTML(lines) {
  let html = ''; const stack = [];
  const close = (depth = 0) => { while (stack.length > depth) html += `</${stack.pop().tag}>`; };
  for (const raw of lines) {
    if (!raw.trim()) { close(); continue; }
    const m = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(raw);
    if (m) {
      const depth = Math.floor(m[1].replace(/\t/g, '  ').length / 2) + 1, tag = /\d/.test(m[2]) ? 'ol' : 'ul';
      if (stack.length < depth) { while (stack.length < depth) { html += `<${tag}>`; stack.push({ tag }); } }
      else { close(depth); if (stack[depth - 1].tag !== tag) { close(depth - 1); html += `<${tag}>`; stack.push({ tag }); } }
      html += `<li>${inline(m[3])}</li>`;
    } else { close(); html += `<div>${inline(raw.trim())}</div>`; }
  }
  close();
  return html;
}

export function markdownToSlides(md, size = { w: 1280, h: 720 }) {
  const W = size.w, H = size.h;
  const text = String(md || '').replace(/\r\n?/g, '\n').replace(/^---\n[\s\S]*?\n---\n/, '');   // drop front matter
  // Split on slide separators outside code fences.
  const chunks = []; let cur = [], vertical = false, inFence = false;
  for (const line of text.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    if (!inFence && /^---\s*$/.test(line)) { chunks.push({ lines: cur, vertical }); cur = []; vertical = false; continue; }
    if (!inFence && /^--\s*$/.test(line)) { chunks.push({ lines: cur, vertical }); cur = []; vertical = true; continue; }
    cur.push(line);
  }
  chunks.push({ lines: cur, vertical });
  return chunks.filter(c => c.lines.some(l => l.trim())).map((c, idx) => {
    let lines = c.lines, notes = '';
    const ni = lines.findIndex(l => /^\s*(Note|Notes|Notas?):/i.test(l));
    if (ni >= 0) { notes = lines.slice(ni).join('\n').replace(/^\s*(Note|Notes|Notas?):\s*/i, '').trim(); lines = lines.slice(0, ni); }
    const blocks = [];
    let title = null, body = [], y = 60;
    const code = [], images = [];
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const fence = /^\s*(```|~~~)\s*([\w+-]*)\s*(\[([^\]]*)\])?/.exec(l);
      if (fence) {
        const end = lines.findIndex((x, j) => j > i && /^\s*(```|~~~)/.test(x));
        code.push({ lang: fence[2] || 'plaintext', steps: fence[4] || '', src: lines.slice(i + 1, end < 0 ? lines.length : end).join('\n') });
        i = end < 0 ? lines.length : end; continue;
      }
      const img = /^\s*!\[([^\]]*)\]\(([^)\s]+)\)\s*$/.exec(l);
      if (img) { images.push({ alt: img[1], src: img[2] }); continue; }
      const h = /^\s*(#{1,6})\s+(.*)$/.exec(l);
      if (h && title == null) { title = { level: h[1].length, text: h[2] }; continue; }
      body.push(h ? `**${h[2]}**` : l);
    }
    const onlyTitle = title && !body.some(l => l.trim()) && !code.length && !images.length;
    if (title) {
      const big = onlyTitle || title.level === 1;
      blocks.push({ id: uid(), type: 'text', ph: 'title', fontWeight: '700', x: 80, y: onlyTitle ? H * 0.38 : 50, w: W - 160, h: onlyTitle ? 130 : 90,
        fontSize: big ? (onlyTitle ? 64 : 52) : 44, ...(onlyTitle && { textAlign: 'center' }), html: inline(title.text), rotation: 0, animation: null });
      y = onlyTitle ? H : 160;
    }
    const side = images.length && (body.some(l => l.trim()) || code.length);
    const cw = side ? W * 0.52 : W - 160;
    const bodyHtml = bodyHTML(body);
    if (bodyHtml) {
      const bh = code.length ? Math.min(220, 44 * body.filter(l => l.trim()).length + 20) : H - y - 60;
      blocks.push({ id: uid(), type: 'text', ph: 'body', x: 80, y, w: cw, h: bh, fontSize: 28, html: bodyHtml, rotation: 0, animation: null });
      y += bh + 20;
    }
    for (const c of code) {
      const hh = Math.max(120, Math.min(H - y - 40, 30 * c.src.split('\n').length + 30));
      blocks.push({ id: uid(), type: 'code', lang: c.lang, code: c.src, lineSteps: c.steps.replace(/\s/g, ''), showLines: !!c.steps, fontSize: 22,
        x: 80, y, w: cw, h: hh, rotation: 0, animation: null });
      y += hh + 20;
    }
    images.forEach((im, k) => {
      const w = side ? W * 0.36 : W * 0.6, hgt = side ? H * 0.55 : H - (title ? 200 : 100);
      blocks.push({ id: uid(), type: 'image', src: im.src, alt: im.alt, fit: 'contain', x: side ? W * 0.58 : (W - w) / 2, y: (title ? 170 : 60) + k * 20, w, h: hgt, rotation: 0, animation: null });
    });
    return { id: uid(), sectionId: null, background: null, transition: null, hidden: false, notes, autoSlide: 0, blocks,
      ...(c.vertical && idx > 0 && { vertical: true }) };
  });
}
