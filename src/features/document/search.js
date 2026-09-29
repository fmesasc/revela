// Find & replace across the text of the deck. Replacement walks text nodes so
// it never corrupts the inline formatting (bold, colour, links…) in the HTML.

import { state, commit, currentSlide } from '../../core/store.js';

const escapeRegExp = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function replaceInHtml(html, find, repl) {
  const d = document.createElement('div'); d.innerHTML = html;
  const walker = document.createTreeWalker(d, NodeFilter.SHOW_TEXT);
  let n, count = 0;
  while ((n = walker.nextNode())) {
    const re = new RegExp(escapeRegExp(find), 'gi');
    n.nodeValue = n.nodeValue.replace(re, () => { count++; return repl; });
  }
  return { html: d.innerHTML, count };
}

function textBlocks(all) {
  const list = [];
  const slides = all ? state.deck.slides : [currentSlide()];
  for (const s of slides) for (const b of s.blocks) if (b.type === 'text' && b.html) list.push(b);
  return list;
}

export function countMatches(find, all = true) {
  if (!find) return 0;
  let count = 0;
  for (const b of textBlocks(all)) count += replaceInHtml(b.html, find, '\0').count;
  return count;
}

export function replaceAll(find, repl, all = true) {
  if (!find) return 0;
  let count = 0;
  commit(() => {
    for (const b of textBlocks(all)) {
      const r = replaceInHtml(b.html, find, repl);
      if (r.count) { b.html = r.html; count += r.count; }
    }
  });
  return count;
}
