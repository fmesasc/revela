// Third-party libraries, loaded from the CDN only when a feature needs them.
// Every version is pinned here, in one place, so upgrading one is a one-line
// change (and the service worker caches them as immutable).

const NPM = 'https://cdn.jsdelivr.net/npm/';
export const REVEAL = NPM + 'reveal.js@5.1.0';
export const KATEX = NPM + 'katex@0.16.11/dist';
export const MODEL_VIEWER = NPM + '@google/model-viewer@3.5.0/dist/model-viewer.min.js';
export const HTML2CANVAS = NPM + 'html2canvas@1.4.1/dist/html2canvas.min.js';
export const JSZIP = NPM + 'jszip@3.10.1/dist/jszip.min.js';
export const PPTXGEN = NPM + 'pptxgenjs@3.12.0/dist/pptxgen.bundle.js';
export const PEERJS = NPM + 'peerjs@1.5.4/dist/peerjs.min.js';
export const QRCODE = NPM + 'qrcode@1.5.1/build/qrcode.min.js';
export const POLYGON_CLIPPING = NPM + 'polygon-clipping@0.15.7/dist/polygon-clipping.umd.min.js';
export const MATHLIVE = NPM + 'mathlive@0.100.0/dist/mathlive.min.js';
export const HIGHLIGHT = NPM + '@highlightjs/cdn-assets@11.9.0';
export const MP4_MUXER = NPM + 'mp4-muxer@5.1.3/+esm';
export const GIFENC = NPM + 'gifenc@1.0.3/+esm';
export const JSZIP_ESM = NPM + 'jszip@3.10.1/+esm';
export const PDFJS = NPM + 'pdfjs-dist@4.10.38/build';
export const BG_REMOVAL = NPM + '@imgly/background-removal@1.5.5/+esm';

// A classic script, once: resolves at once if `global` already exists, and
// concurrent calls for the same URL share one request.
const pending = new Map();
export function loadScript(src, global) {
  if (global && window[global]) return Promise.resolve(window[global]);
  if (!pending.has(src)) pending.set(src, new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = src; s.async = true;
    s.onload = () => res(global ? window[global] : undefined);
    s.onerror = () => { pending.delete(src); s.remove(); rej(new Error('No se pudo cargar ' + (src.split('/npm/')[1] || src))); };
    document.head.appendChild(s);
  }));
  return pending.get(src);
}
// A stylesheet, once.
export function loadStyle(href) {
  if (![...document.querySelectorAll('link[rel=stylesheet]')].some(l => l.href === href)) {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l);
  }
}
