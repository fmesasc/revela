// Code and formulas for the assistant: native code blocks (type 'code', highlighted)
// and equations (type 'math', LaTeX through KaTeX) instead of code or formulas typed
// into text boxes. The languages it may give a code block, the code and the LaTeX
// cleaned and capped, a type size that fits the box, whether a request is about code,
// and whether a text only repeats what a code block or an equation already shows
// (that is never a replacement for them).

import { uid } from '../../core/model.js';

// The languages a code block made by the assistant may have (the names the model may use → ours).
// (Besides Power BI's and Excel's — render/codelangs.js —, those of highlight.js's common bundle: every language a
// class or a talk is likely to show, so a deck on Swift gets Swift, highlighted.)
export const AI_LANGS = ['dax', 'powerquery', 'sql', 'python', 'javascript', 'typescript', 'excel', 'r', 'json', 'swift', 'kotlin', 'java', 'c', 'cpp', 'csharp',
  'go', 'rust', 'php', 'ruby', 'html', 'css', 'bash', 'xml', 'yaml', 'markdown', 'plaintext'];
const ALIAS = { m: 'powerquery', 'power query': 'powerquery', 'power-query': 'powerquery', pq: 'powerquery', mquery: 'powerquery', 'm query': 'powerquery',
  tsql: 'sql', 't-sql': 'sql', mysql: 'sql', postgresql: 'sql', sqlite: 'sql', py: 'python', js: 'javascript', ts: 'typescript',
  'c++': 'cpp', 'c#': 'csharp', cs: 'csharp', golang: 'go', rs: 'rust', kt: 'kotlin', sh: 'bash', shell: 'bash', zsh: 'bash', console: 'bash', terminal: 'bash',
  yml: 'yaml', md: 'markdown', htm: 'html', objc: 'plaintext',
  formula: 'excel', 'excel formula': 'excel', xlsx: 'excel', sheets: 'excel', text: 'plaintext', txt: 'plaintext', plain: 'plaintext', none: 'plaintext', '': 'plaintext' };
// → one of AI_LANGS, or null.
export function codeLang(v) {
  const s = String(v ?? '').toLowerCase().trim();
  return AI_LANGS.includes(s) ? s : ALIAS[s] ?? null;
}
export const CODE_MAX = { chars: 4000, lines: 60 };
// The code as it is (verbatim): no Markdown fence, \n line ends, tabs as 4 spaces, no
// blank lines around it. → the code, or null (empty or too long).
export function cleanCode(v, { chars = CODE_MAX.chars, lines = CODE_MAX.lines } = {}) {
  if (typeof v !== 'string') return null;
  let s = v.replace(/\r\n?/g, '\n').replace(/\t/g, '    ');
  const fence = /^\s*```[\w+-]*[ \t]*\n([\s\S]*?)\n?```\s*$/.exec(s); if (fence) s = fence[1];
  s = s.split('\n').map(l => l.replace(/\s+$/, '')).join('\n').replace(/^\n+|\n+$/g, '');
  if (!s.trim() || s.length > chars || s.split('\n').length > lines) return null;
  return s;
}
// LaTeX without its delimiters ($$…$$, \[…\], $…$), balanced braces, ≤ 1000 characters. → it, or null.
export function cleanLatex(v) {
  if (typeof v !== 'string') return null;
  let s = v.trim();
  for (const [a, b] of [['$$', '$$'], ['\\[', '\\]'], ['\\(', '\\)'], ['$', '$']]) if (s.startsWith(a) && s.endsWith(b) && s.length > a.length + b.length) { s = s.slice(a.length, -b.length).trim(); break; }
  if (!s || s.length > 1000) return null;
  let d = 0; for (let i = 0; i < s.length; i++) { if (s[i] === '\\') { i++; continue; } if (s[i] === '{') d++; if (s[i] === '}' && --d < 0) return null; }
  return d ? null : s;
}
// A text that is only a formula ("$$…$$", "\[…\]"): its LaTeX, or null.
export function formulaOf(text) {
  const s = String(text ?? '').trim();
  return /^(\$\$[\s\S]+\$\$|\\\[[\s\S]+\\\]|\$[^$\n]+\$)$/.test(s) ? cleanLatex(s) : null;
}

// A type size for code in a box: every line fits its width (monospace ≈ 0.6 em) and all of them its height.
export function codeFontSize(code, w, h, { max = 28, min = 12 } = {}) {
  const ls = String(code || '').split('\n'), longest = Math.max(8, ...ls.map(l => l.length));
  // (The block's padding is 10 px a side, the highlighting's 1 em.)
  return Math.round(Math.max(min, Math.min(max, (w - 24) / (longest * 0.64 + 2), (h - 24) / (ls.length * 1.5 + 2))));
}
// The height the code needs at that size.
export const codeHeight = (code, fs) => Math.round((String(code || '').split('\n').length * 1.5 + 2) * fs + 24);
export const codeBlockAt = (code, lang, r, extra = {}) => {
  const fontSize = codeFontSize(code, r.w, r.h);
  return { id: uid(), type: 'code', x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(Math.min(r.h, Math.max(80, codeHeight(code, fontSize)))),
    rotation: 0, animation: null, lang: lang || 'plaintext', fontSize, code, ...extra };
};
// A size for an equation in a box (KaTeX ≈ 0.55 em per visible character).
export function mathFontSize(latex, w, h, { max = 48, min = 14 } = {}) {
  let vis = String(latex || '').replace(/\\(?:text|mathrm|operatorname)\{([^}]*)\}/g, '$1');
  // (A fraction is as wide as the longer of its two parts.)
  for (let i = 0; i < 4; i++) vis = vis.replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, (_, a, b) => (a.length >= b.length ? a : b));
  vis = vis.replace(/\\[a-zA-Z]+/g, 'x').replace(/[{}^_]/g, '');
  const tall = /\\frac|\\sum|\\int|\\prod/.test(latex) ? 2.2 : 1.4;
  return Math.round(Math.max(min, Math.min(max, w / (Math.max(6, vis.length) * 0.52), h / tall)));
}
export const mathBlockAt = (latex, r, extra = {}) => ({ id: uid(), type: 'math', x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h),
  rotation: 0, animation: null, latex, fontSize: mathFontSize(latex, r.w, r.h), ...extra });

// Whether a request is about code or a formula (a DAX measure, an M query, SQL…).
export const CODE_WORDS = /(c[oó]digo|\bcode\b|f[oó]rmula|formula|\bdax\b|\bsql\b|power ?query|\blenguaje m\b|\bm language\b|\bscript\b|\bmedida\b|\bmeasure\b|\bconsulta\b|\bquery\b|\bpython\b|\bfunci[oó]n de excel\b)/i;
export const wantsCode = text => CODE_WORDS.test(String(text || ''));

// The words of a formula or code, to compare with a text: LaTeX commands become what they show.
const words = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().match(/[\p{L}\p{N}_]{2,}/gu) || [];
const latexWords = l => words(String(l || '').replace(/\\(?:text|mathrm|mathit|textbf|operatorname)\{([^}]*)\}/g, ' $1 ').replace(/\\(?:times|cdot|div|frac|left|right|quad|,|;|%)/g, ' ').replace(/\\[a-zA-Z]+/g, ' '));
// Whether `text` repeats what the code block or equation `b` shows: most of its words, in a text
// that is little more than that (an explanation that mentions some of them is not a copy).
export function repeats(text, b) {
  const own = b?.type === 'math' ? latexWords(b.latex) : b?.type === 'code' ? words(b.code) : [];
  const uniq = [...new Set(own)]; if (uniq.length < 3) return false;
  const tw = words(text), have = new Set(tw);
  return uniq.filter(w => have.has(w)).length >= 0.7 * uniq.length && tw.length <= 2 * own.length + 4;
}
