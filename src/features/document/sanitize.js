// What comes from outside — a file, a paste from another site, a co-editor,
// a PowerPoint or LibreOffice import — can't run code in Revela: its HTML
// loses scripts, embedded frames and event handlers; links and sources keep
// only safe addresses; style values can't break out of their attribute.
// Cheap when there is nothing to clean (the usual case): HTML with no tag at all isn't parsed, and HTML with nothing
// to take out comes back as it was, byte for byte.

import { unpackDeck } from '../../core/deckfile.js';
import { normalizeMap } from '../content/geomap.js';
import { isLive } from '../../core/mediastore.js';

// (Every tag is looked at — a quick test of the text first let «<img/src=x/onerror=…>», entities in a link and other
// spellings browsers accept go through untouched.)
const DROP = new Set(['SCRIPT', 'IFRAME', 'FRAME', 'FRAMESET', 'OBJECT', 'EMBED', 'LINK', 'META', 'STYLE', 'BASE', 'FORM', 'INPUT', 'TEXTAREA', 'BUTTON', 'SELECT', 'SVG', 'MATH', 'NOSCRIPT', 'TEMPLATE', 'PORTAL',
  'TITLE', 'XMP', 'NOEMBED', 'NOFRAMES', 'PLAINTEXT']);   // (and the ones whose text is read raw)
const URL_ATTRS = new Set(['href', 'src', 'xlink:href', 'action', 'formaction', 'poster', 'background', 'srcset', 'data', 'ping']);

// An address that can be followed or loaded: web, mail, in-page, relative, or
// embedded media and fonts (not HTML pages or scripts).
export function safeURL(u) {
  const s = String(u ?? '').replace(/[\u0000-\u0020]+/g, '');     // (browsers ignore these inside a scheme)
  if (!s || !/^[a-z][a-z0-9+.-]*:/i.test(s)) return true;             // relative
  return /^(https?|mailto|tel|blob):/i.test(s) || /^data:(image|video|audio|model|font)\//i.test(s) || /^data:application\/(octet-stream|pdf)[;,]/i.test(s)
    || /^rvmedia:[0-9a-f]{32}$/.test(s) || isLive(s);                  // (a file of this browser's store, or its address: core/mediastore.js)
}
export function cleanHTML(html) {
  const s = String(html ?? '');
  if (!s.includes('<')) return s;                                          // (no tag: nothing can run)
  const tpl = document.createElement('template'); tpl.innerHTML = s;        // (template content is inert: nothing runs or loads)
  let changed = false;
  const walk = node => {
    for (const el of [...node.children]) {
      if (DROP.has(el.tagName.toUpperCase())) { el.remove(); changed = true; continue; }
      for (const a of [...el.attributes]) {
        const n = a.name.toLowerCase();
        // (a.value comes with its entities read: «jav&#x61;script:» is javascript: here.)
        if (n.startsWith('on') || n === 'srcdoc' || (URL_ATTRS.has(n) && !safeURL(a.value))
          || (n === 'style' && /javascript:|expression\s*\(|url\s*\(\s*['"]?\s*(?!data:image|https?:)/i.test(a.value))) { el.removeAttribute(a.name); changed = true; }
      }
      walk(el);
    }
  };
  walk(tpl.content);
  return changed ? tpl.innerHTML : s;
}
// A CSS value (colour, font, bullet…) that stays inside its declaration.
export const safeCSS = v => typeof v !== 'string' || !/[<>"{};\\]|javascript:|expression\s*\(|url\s*\(\s*['"]?\s*(?!data:image|https?:)/i.test(v);
// A plain word used inside the presentation's scripts (transition names, formats…).
const safeToken = v => typeof v !== 'string' || /^[\w .\/:%#-]*$/.test(v);

const HTML_KEYS = new Set(['html']);                 // (other texts are escaped wherever they are shown)
const URL_KEYS = new Set(['src', 'href', 'poster', 'url', 'dataUrl', 'link', 'bgVideo', 'bgPoster', 'bgIframe', 'image', 'logo', 'soundSrc']);
const CSS_KEYS = new Set(['fontFamily', 'color', 'fill', 'fill2', 'stroke', 'bg', 'background', 'borderColor', 'bullet', 'numStyle', 'highlight', 'textColor', 'lineColor', 'shadowColor', 'accent', 'fg']);
const TOKEN_KEYS = new Set(['textLang', 'defaultTransition', 'transition', 'transitionOut', 'transitionSpeed', 'transitionDir', 'format', 'position', 'theme', 'effect', 'pathShape', 'start', 'dash', 'borderDash', 'fit', 'view', 'motion', 'gradType', 'device', 'until', 'goto', 'sound',
  'bgTransition', 'edge', 'ph', 'duration', 'delay', 'autoSlide', 'page', 'pages']);   // (numbers some files bring as text)
// The names that tie things together — an object's or a slide's id, its layout and section, the object a trigger, a
// lock, a magnifier or a slide link points at —: letters, digits and «_ : . -» only. They go inside attributes and
// selectors, so a deck from elsewhere can't break out of them; ours (core/model.js uid) never had anything else.
const ID_KEYS = new Set(['id', 'layoutId', 'sectionId', 'lp', 'masterId', 'trigger', 'target', 'openTo']);
const ID_LIST_KEYS = new Set(['reveal']);
const safeId = v => v.replace(/[^\w:.-]/g, '').slice(0, 80);
// (An address keeps its quotes and angle brackets only percent-encoded — what a browser does anyway —, so it can't
// close the attribute it is written in.)
const quietURL = v => v.replace(/["'<>`]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
const BAD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const CLASS_KEYS = new Set(['cls']);                // (an object's CSS classes: developer mode)
// The presentation's own CSS (developer mode: deck.css): its «<» as the CSS escape, so it can't close its <style>.
export const quietCSS = v => String(v ?? '').replace(/</g, '\\3c ');

// Clean a value in place (a whole deck, some blocks, or one field of them); returns it.
export function cleanValue(v, key = '') {
  if (typeof v === 'string') {
    if (HTML_KEYS.has(key)) return cleanHTML(v);
    if (URL_KEYS.has(key)) return safeURL(v) ? quietURL(v) : '';
    if (ID_KEYS.has(key)) return safeId(v);
    if (CSS_KEYS.has(key)) return safeCSS(v) ? v : '';
    if (TOKEN_KEYS.has(key)) return safeToken(v) ? v : '';
    if (CLASS_KEYS.has(key)) return /^[\w -]*$/.test(v) ? v : '';
    if (key === 'css') return quietCSS(v);
    return v;
  }
  if (Array.isArray(v)) {
    for (let i = 0; i < v.length; i++) v[i] = key === 'rows' || key === 'cells' ? cleanRow(v[i]) : ID_LIST_KEYS.has(key) && typeof v[i] === 'string' ? safeId(v[i]) : cleanValue(v[i]);
    return v;
  }
  if (v && typeof v === 'object') {
    for (const k of Object.keys(v)) {
      if (BAD_KEYS.has(k)) { delete v[k]; continue; }
      v[k] = key === 'cellBg' && typeof v[k] === 'string' ? (safeCSS(v[k]) ? v[k] : '') : cleanValue(v[k], k);   // (a cell's shading, by «r,c»)
    }
    // (A map's stops are numbers and words in their ranges, its pictures only embedded images: features/content/geomap.js.)
    if (v.type === 'map') normalizeMap(v);
  }
  return v;
}
const cleanRow = r => (Array.isArray(r) ? r.map(c => (typeof c === 'string' ? cleanHTML(c) : cleanValue(c))) : cleanValue(r));
// Anything under a table's rows or cells: every text in it is a cell's HTML, however deep.
const cleanCells = v => (typeof v === 'string' ? cleanHTML(v) : Array.isArray(v) ? v.map(cleanCells) : cleanValue(v));
// A co-editor's change, cleaned by where it goes (its whole path), not only by its last step: a new row added under
// a made-up name, or a cell's shading by «r,c», is still a table's.
export function cleanAt(v, path) {
  const p = (Array.isArray(path) ? path : []).map(String), key = p.at(-1) ?? '';
  if (p.some(k => k === 'rows' || k === 'cells')) return cleanCells(v);
  if (p.at(-2) === 'cellBg' && typeof v === 'string') return safeCSS(v) ? v : '';
  return cleanValue(v, key);
}
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
