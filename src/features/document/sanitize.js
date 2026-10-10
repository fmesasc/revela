// What comes from outside — a file, a paste from another site, a co-editor,
// a PowerPoint or LibreOffice import — can't run code in Revela: its HTML
// loses scripts, embedded frames and event handlers; links and sources keep
// only safe addresses; style values can't break out of their attribute.
// Cheap when there is nothing to clean (the usual case).

import { unpackDeck } from '../../core/deckfile.js';

const RISKY_HTML = /<\s*\/?\s*(script|iframe|frame|object|embed|link|meta|style|base|form|input|textarea|button|select|svg|math|noscript|template|portal)\b|\son[a-z]+\s*=|javascript:|vbscript:|srcdoc|expression\s*\(/i;
const DROP = new Set(['SCRIPT', 'IFRAME', 'FRAME', 'FRAMESET', 'OBJECT', 'EMBED', 'LINK', 'META', 'STYLE', 'BASE', 'FORM', 'INPUT', 'TEXTAREA', 'BUTTON', 'SELECT', 'SVG', 'MATH', 'NOSCRIPT', 'TEMPLATE', 'PORTAL']);
const URL_ATTRS = new Set(['href', 'src', 'xlink:href', 'action', 'formaction', 'poster', 'background', 'srcset', 'data', 'ping']);

// An address that can be followed or loaded: web, mail, in-page, relative, or
// embedded media and fonts (not HTML pages or scripts).
export function safeURL(u) {
  const s = String(u ?? '').replace(/[\u0000-\u0020]+/g, '');     // (browsers ignore these inside a scheme)
  if (!s || !/^[a-z][a-z0-9+.-]*:/i.test(s)) return true;             // relative
  return /^(https?|mailto|tel|blob):/i.test(s) || /^data:(image|video|audio|model|font)\//i.test(s) || /^data:application\/(octet-stream|pdf)[;,]/i.test(s);
}
export function cleanHTML(html) {
  const s = String(html ?? '');
  if (!RISKY_HTML.test(s)) return s;
  const tpl = document.createElement('template'); tpl.innerHTML = s;        // (template content is inert: nothing runs or loads)
  const walk = node => {
    for (const el of [...node.children]) {
      if (DROP.has(el.tagName.toUpperCase())) { el.remove(); continue; }
      for (const a of [...el.attributes]) {
        const n = a.name.toLowerCase();
        if (n.startsWith('on') || n === 'srcdoc' || (URL_ATTRS.has(n) && !safeURL(a.value))
          || (n === 'style' && /javascript:|expression\s*\(|url\s*\(\s*['"]?\s*(?!data:image|https?:)/i.test(a.value))) el.removeAttribute(a.name);
      }
      walk(el);
    }
  };
  walk(tpl.content);
  return tpl.innerHTML;
}
// A CSS value (colour, font, bullet…) that stays inside its declaration.
export const safeCSS = v => typeof v !== 'string' || !/[<>"{};\\]|javascript:|expression\s*\(|url\s*\(\s*['"]?\s*(?!data:image|https?:)/i.test(v);
// A plain word used inside the presentation's scripts (transition names, formats…).
const safeToken = v => typeof v !== 'string' || /^[\w .\/:%#-]*$/.test(v);

const HTML_KEYS = new Set(['html']);                 // (other texts are escaped wherever they are shown)
const URL_KEYS = new Set(['src', 'href', 'poster', 'url', 'dataUrl', 'link', 'bgVideo', 'bgIframe', 'image', 'logo', 'soundSrc']);
const CSS_KEYS = new Set(['fontFamily', 'color', 'fill', 'fill2', 'stroke', 'bg', 'background', 'borderColor', 'bullet', 'numStyle', 'highlight', 'textColor', 'lineColor', 'shadowColor', 'accent', 'fg']);
const TOKEN_KEYS = new Set(['textLang', 'defaultTransition', 'transition', 'transitionOut', 'transitionSpeed', 'transitionDir', 'format', 'position', 'theme', 'effect', 'pathShape', 'start', 'dash', 'borderDash', 'fit', 'view', 'motion', 'gradType', 'device', 'until', 'goto', 'sound']);
const BAD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const CLASS_KEYS = new Set(['cls']);                // (an object's CSS classes: developer mode)

// Clean a value in place (a whole deck, some blocks, or one field of them); returns it.
export function cleanValue(v, key = '') {
  if (typeof v === 'string') {
    if (HTML_KEYS.has(key)) return cleanHTML(v);
    if (URL_KEYS.has(key)) return safeURL(v) ? v : '';
    if (CSS_KEYS.has(key)) return safeCSS(v) ? v : '';
    if (TOKEN_KEYS.has(key)) return safeToken(v) ? v : '';
    if (CLASS_KEYS.has(key)) return /^[\w -]*$/.test(v) ? v : '';
    return v;
  }
  if (Array.isArray(v)) {
    for (let i = 0; i < v.length; i++) v[i] = key === 'rows' || key === 'cells' ? cleanRow(v[i]) : cleanValue(v[i]);
    return v;
  }
  if (v && typeof v === 'object') {
    for (const k of Object.keys(v)) {
      if (BAD_KEYS.has(k)) { delete v[k]; continue; }
      v[k] = cleanValue(v[k], k);
    }
  }
  return v;
}
const cleanRow = r => (Array.isArray(r) ? r.map(c => (typeof c === 'string' ? cleanHTML(c) : cleanValue(c))) : cleanValue(r));
// (A file's shared pictures, videos and sounds go back to their places first: core/deckfile.js.)
export const sanitizeDeck = deck => (deck && typeof deck === 'object' ? cleanValue(unpackDeck(deck)) : deck);

// Sandbox of an embedded page: a web page from elsewhere keeps its own origin
// (players need it); anything else — this site, data:, javascript: — gets none,
// so it can't reach Revela's data.
export function embedSandbox(url, base = 'allow-scripts allow-popups allow-forms allow-presentation') {
  let foreign = false;
  try { const u = new URL(url, location.href); foreign = /^https?:$/.test(u.protocol) && u.origin !== location.origin; } catch {}
  return foreign ? base + ' allow-same-origin' : base;
}
