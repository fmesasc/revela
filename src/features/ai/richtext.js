// Text written by the AI made into proper slide text. Models write lists the
// way they would in a chat: "1." typed by hand, "•" inside "- " lines, nesting
// with spaces, headings as one more bullet ("Why:"), "Label: text" without
// bold, **markdown**. Here that becomes an outline (groups: a heading and a
// tree of items, numbered or not) and then HTML: <ol> for numbered items,
// nested lists, the heading as a bold line, "Label:" lead-ins in bold.
// Also what the outline looks like (numbered, labelled, how long), so the
// slide builder can choose a richer composition (features/ai/fromspec.js).

import { esc } from '../../core/text.js';

const str = v => (v == null ? '' : String(v));
// Bullet characters (any number of them, a "- •" pair too); "-", "*" and "+" only before a space ("-5 %", "*bold*" stay).
const BULLET = /^(?:[-*+](?=\s)|[•·▪▫►▸‣◦○●■□◆◇→⇒✓✔➢➤–—])/;
// Numbers typed by hand: "1.", "2)", "(3)", "4.-", "5 -" (before a space: "3.200" is a number).
const NUMBER = /^(?:\(?(\d{1,2})[.)]-?(?=\s)|(\d{1,2})\s*[-–—](?=\s))/;
const ENTITY = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
const decode = s => s.replace(/&(#?\w+);/g, (m, k) => ENTITY[k] ?? (/^#\d+$/.test(k) ? String.fromCharCode(+k.slice(1)) : m));

// ---- Lines: { text, ind (indentation), mark: 'num' | 'bullet' | null, md (a markdown heading) } ----
function htmlLines(html) {
  const out = [], stack = [];
  let cur = null;
  const flush = () => { if (cur && cur.text.trim()) out.push(cur); cur = null; };
  const open = (props = {}) => { flush(); cur = { text: '', ind: 0, mark: null, ...props }; };
  for (const part of str(html).split(/(<[^>]+>)/)) {
    const m = /^<(\/?)([a-z0-9]+)/i.exec(part);
    if (!m) { if (!part) continue; if (!cur) open(); cur.text += decode(part.replace(/[\r\n]+/g, ' ')); continue; }
    const close = !!m[1], tag = m[2].toLowerCase();
    if (tag === 'ul' || tag === 'ol') { flush(); if (close) stack.pop(); else stack.push(tag); }
    else if (tag === 'li') { if (close) flush(); else open({ ind: Math.max(0, stack.length - 1) * 4, mark: stack.at(-1) === 'ol' ? 'num' : 'bullet', inList: true }); }
    else if (/^(p|div|h[1-6]|br)$/.test(tag)) { flush(); if (!close && /^h/.test(tag)) open({ md: true }); }
    else if (tag === 'b' || tag === 'strong') { if (!cur) open(); cur.text += '**'; }
  }
  flush();
  // (What is typed inside an item counts too: "<li>1. x", "<li>    • y".)
  return out.map(l => {
    const p = plainLine(l.text.replace(/\*\*\s*\*\*/g, '')), num = p.marks.some(m => m.kind === 'num');
    return { ...l, text: p.text.replace(/\s+/g, ' '), ind: l.ind + p.lead + p.marks.slice(0, -1).reduce((s, m) => s + (m.ws > 1 ? m.ws : 0), 0),
      mark: num ? 'num' : l.mark || (p.marks.length ? 'bullet' : null), explicit: p.marks.length > 0, md: l.md || p.md };
  }).filter(l => l.text);
}
// One line of plain text: its indentation, then markers peeled off ("- 1. x", "-    • y").
function plainLine(raw) {
  let s = raw.replace(/\t/g, '    ').replace(/ /g, ' ');
  const lead = /^\s*/.exec(s)[0].length;
  s = s.slice(lead);
  const marks = [];
  for (let k = 0; k < 4; k++) {
    let m = BULLET.exec(s), kind = 'bullet';
    if (!m) { m = NUMBER.exec(s); kind = 'num'; }
    if (!m) break;
    s = s.slice(m[0].length);
    const ws = /^\s*/.exec(s)[0].length;
    marks.push({ kind, c: m[0], ws, n: +(m[1] || m[2] || 0) });
    s = s.slice(ws);
  }
  const md = /^#{1,6}\s+/.exec(s);
  if (md) s = s.slice(md[0].length);
  return { text: s.trim(), lead, marks, md: !!md };
}
function textLines(text) {
  const raw = str(text).split(/\r?\n/).map(plainLine).filter(l => l.text);
  // (One line after a dash is a signature or an aside, not a list: "— Author".)
  if (raw.length === 1 && /^[–—]$/.test(raw[0].marks[0]?.c || '')) return [{ text: str(text).trim(), ind: 0, mark: null, md: false, inList: false, explicit: false }];
  // ("- " in front of every line is the list convention: what comes after it decides.)
  const first = raw.length && raw.every(l => l.marks[0] && l.marks[0].c === raw[0].marks[0].c && /^[-*+]$/.test(l.marks[0].c));
  return raw.map(l => {
    const marks = first ? l.marks.slice(1) : l.marks;
    // (Spaces after the first marker, beyond one, indent too: "-     • nested".)
    const ind = l.lead + (first && l.marks[0].ws > 1 ? l.marks[0].ws : 0) + marks.slice(0, -1).reduce((s, m) => s + (m.ws > 1 ? m.ws : 0), 0);
    const mark = marks.some(m => m.kind === 'num') ? 'num' : marks.length ? 'bullet' : first ? 'bullet' : null;
    return { text: l.text, ind, mark, md: l.md, inList: first || !!marks.length, explicit: marks.length > 0 };
  });
}
// Lines of anything: a string (text or HTML), or an array (strings, nested arrays, {text, bullets}).
export function linesOf(input, depth = 0) {
  if (Array.isArray(input)) return input.flatMap(x => (Array.isArray(x) ? linesOf(x, depth + 1)
    : x && typeof x === 'object' ? [...linesOf(str(x.text ?? x.title ?? x.label ?? ''), depth), ...linesOf(x.bullets || x.children || x.items || [], depth + 1)]
    : linesOf(str(x), depth).map(l => ({ ...l, ind: l.ind + depth * 4, inList: true, mark: l.mark || 'bullet' }))));
  const s = str(input);
  return /<(ul|ol|li|p|br|div|b|strong|h[1-6])\b/i.test(s) ? htmlLines(s) : textLines(s);
}

// ---- The outline: groups of { heading, items: [{ text, num, children }] } -------------------
const endsColon = t => /[:：]\s*$/.test(t.replace(/\*+$/, ''));
const wholeBold = t => /^\*\*[^*]+\*\*:?$/.test(t);
export function outline(input) {
  const lines = linesOf(input);
  if (!lines.length) return [];
  // Depths: the indentations, ranked (2 spaces or 4, all the same).
  const levels = [...new Set(lines.map(l => Math.round(l.ind / 2)))].sort((a, b) => a - b);
  lines.forEach(l => { l.depth = levels.indexOf(Math.round(l.ind / 2)); });
  const groups = [];
  let g = null;
  lines.forEach((l, i) => {
    const next = lines[i + 1];
    // A heading: at the top, not marked as an item, ending in ":" (or a markdown heading, or all bold) with items after it.
    const heading = l.depth === 0 && (l.md || ((l.mark !== 'num' && !l.explicit) && (endsColon(l.text) || wholeBold(l.text)) && next
      && (next.depth > 0 || next.explicit || next.mark === 'num' || !l.inList || endsColon(l.text))));
    if (heading) { g = { heading: l.text.replace(/^\*\*|\*\*$/g, '').replace(/\*\*(:?)$/, '$1').replace(/\s*[:：]\s*$/, '').replace(/^\*\*/, '').trim(), items: [] }; groups.push(g); return; }
    if (!g) { g = { heading: null, items: [] }; groups.push(g); }
    g.items.push(l);
  });
  return groups.map(gr => ({ heading: gr.heading, items: tree(gr.items) })).filter(gr => gr.heading || gr.items.length);
}
function tree(lines) {
  const root = { children: [] }, stack = [{ depth: -1, node: root }];
  const base = Math.min(...lines.map(l => l.depth));
  for (const l of lines) {
    const d = l.depth - base;
    while (stack.length > 1 && stack.at(-1).depth >= d) stack.pop();
    const node = { text: l.text, num: l.mark === 'num', item: l.inList || l.mark != null, children: [] };
    stack.at(-1).node.children.push(node);
    stack.push({ depth: d, node });
  }
  return root.children;
}

// ---- Inline text: escaped, **bold**, *italic*, and the "Label:" lead-in in bold ---------------
// "Label: text" with a short label (≤ 6 words, no sentence in it) → [label, text].
export function splitLabel(t) {
  const s = str(t).trim(), b = /^\*\*([^*]{1,60}?)\*\*\s*[:：–—-]\s*(\S.*)$/.exec(s) || /^\*\*([^*]{1,60}?)[:：]\*\*\s*(\S.*)$/.exec(s);
  if (b) return [b[1].trim(), b[2].trim()];
  const m = /^([^:：.!?;]{2,48}?)\s*[:：]\s+(\S.*)$/.exec(s);
  if (!m || m[1].split(/\s+/).length > 6 || /https?$|^\d+$/i.test(m[1])) return null;
  return [m[1].trim(), m[2].trim()];
}
const emph = s => esc(s).replace(/\*\*([^*]+?)\*\*/g, '<b>$1</b>').replace(/__([^_]+?)__/g, '<b>$1</b>').replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=$|[\s).,;:!?])/g, '$1<i>$2</i>').replace(/\*\*/g, '');
// `code` as the model writes it in a chat: <code> (the slide's inline-code style, canvas.css), its insides as they
// are — «`a*b*`» is no italics. (A lone backtick stays one.)
const md = s => str(s).split(/(`[^`\n]+`)/).map((p, i) => (i % 2 ? `<code>${esc(p.slice(1, -1))}</code>` : emph(p))).join('');
// A title, heading, label or cell of a spec as slide HTML: escaped, with its `code` and **bold**.
export const inlineHTML = t => md(str(t));
export function inline(t, { labels = false } = {}) {
  const lab = labels && splitLabel(t);
  return lab ? `<b>${md(lab[0].replace(/\*\*/g, ''))}:</b> ${md(lab[1])}` : md(str(t));
}
// "Paso 1", "1.", "2)" in front of a short title: away (the composition numbers it).
export const cleanTitle = t => str(t).replace(/^\s*(?:paso|step|fase|phase|etapa)\s+\d+\s*[:.\-–—]\s*/i, '').replace(/^\s*\d{1,2}[.)]\s+/, '').replace(/\*\*/g, '').trim();
// One line made plain: no markers, no markdown (for titles, labels, cells).
export const cleanLine = t => { const l = linesOf(str(t).split('\n')[0])[0]; return l ? l.text.replace(/\*\*/g, '').replace(/^#+\s*/, '').trim() : ''; };

// ---- HTML ----------------------------------------------------------------------------------
const listHTML = items => {
  const ordered = items.length > 1 && items.every(i => i.num) || (items.length === 1 && items[0].num);
  const tag = ordered ? 'ol' : 'ul';
  return `<${tag}>${items.map(i => `<li>${inline(i.text, { labels: true })}${i.children.length ? listHTML(i.children) : ''}</li>`).join('')}</${tag}>`;
};
// opts: { accent: colour of the headings, plain: no list for unmarked lines }
export function groupsHTML(groups, { accent = '' } = {}) {
  return groups.map(g => {
    const h = g.heading ? `<p><b>${accent ? `<span style="color:${accent}">${inline(g.heading)}</span>` : inline(g.heading)}</b></p>` : '';
    const items = g.items, listy = items.some(i => i.item || i.children.length) || (!!g.heading && items.length > 1);
    return h + (!items.length ? '' : listy ? listHTML(items) : items.map(i => inline(i.text)).join('<br>'));
  }).join('');
}
// AI text (or bullets) → slide HTML. A single plain line stays plain (no list).
export const richHTML = (input, opts = {}) => groupsHTML(outline(input), opts);

// ---- What it looks like ----------------------------------------------------------------------
const count = items => items.reduce((n, i) => n + 1 + count(i.children), 0);
const chars = items => items.reduce((n, i) => n + i.text.length + chars(i.children), 0);
export function shapeOf(groups) {
  const top = groups.flatMap(g => g.items), labelled = top.filter(i => splitLabel(i.text)).length;
  return { groups: groups.length, headings: groups.filter(g => g.heading).length, items: top.length, all: groups.reduce((n, g) => n + count(g.items), 0),
    chars: groups.reduce((n, g) => n + (g.heading || '').length + chars(g.items), 0), numbered: top.length > 1 && top.every(i => i.num),
    labelled: top.length > 0 && labelled === top.length, nested: top.some(i => i.children.length), longest: Math.max(0, ...top.map(i => i.text.length)) };
}
// Items back to strings ("1. x", nested as arrays: kit.ul style), for a spec. (An item ending in ":" keeps
// a bullet, or it would be read back as a heading.)
export const itemsToBullets = items => items.flatMap(i => [(i.num ? '1. ' : endsColon(i.text) ? '• ' : '') + i.text, ...(i.children.length ? [itemsToBullets(i.children)] : [])]);
