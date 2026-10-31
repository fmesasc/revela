// Third-party libraries, loaded from the CDN only when a feature needs them.
// Every version is pinned here, in one place, so upgrading one is a one-line
// change (and the service worker caches them as immutable).

import { whileBusy } from './busy.js';

const NPM = 'https://cdn.jsdelivr.net/npm/';
export const REVEAL = NPM + 'reveal.js@5.1.0';
export const KATEX = NPM + 'katex@0.16.11/dist';
export const MODEL_VIEWER = NPM + '@google/model-viewer@3.5.0/dist/model-viewer.min.js';
// Three.js as ES modules (jsDelivr's +esm: the add-ons import this same copy): «Crear 3D con IA» builds the model in the browser.
export const THREE_BASE = NPM + 'three@0.170.0/';
// Lottie animations (Insertar ▸ Elementos ▸ Animaciones): lottie-web's light build (MIT; SVG only, no expressions or effects).
export const LOTTIE = NPM + 'lottie-web@5.12.2/build/player/lottie_light.min.js';
export const HTML2CANVAS = NPM + 'html2canvas@1.4.1/dist/html2canvas.min.js';
export const JSZIP = NPM + 'jszip@3.10.1/dist/jszip.min.js';
// PptxGenJS without its bundled JSZip (load JSZIP first: it takes window.JSZip). The bundle's, 3.5, waits for a timer
// (≥ 4 ms) after every 16 KB, its setImmediate shim having found none — 20 MB took 5.4 s, writing a 300-slide .pptx
// ~20 s of waiting —, and it replaced window.JSZip for everything else. 3.10.1 writes those 20 MB in 0.2 s.
export const PPTXGEN = NPM + 'pptxgenjs@3.12.0/dist/pptxgen.min.js';
export const PEERJS = NPM + 'peerjs@1.5.4/dist/peerjs.min.js';
export const QRCODE = NPM + 'qrcode@1.5.1/build/qrcode.min.js';
// 360° photos (equirectangular) walked through while presenting: Pannellum (MIT). + '.js' / '.css'.
export const PANNELLUM = NPM + 'pannellum@2.5.6/build/pannellum';
// Maps that fly from place to place while presenting (Insertar ▸ Mapa: features/content/geomap.js, io/runtime/geomap.js):
// MapLibre GL JS (BSD-3), its 5.x line — the last one shipped as one classic script with its worker inside (6.x is
// ES modules only, its worker a separate module, which a page from a blob: address can't start). + '.js' / '.css'.
// And the plugin that shapes right-to-left place names (Arabic) on the map, loaded only for those (BSD-2).
export const MAPLIBRE = NPM + 'maplibre-gl@5.24.0/dist/maplibre-gl';
// Countries' flags for a map's stops (flag-icons, MIT): one small SVG each, by its ISO code (+ 'es.svg').
export const FLAG_ICONS = NPM + 'flag-icons@7.5.0/flags/4x3/';
export const MAPLIBRE_RTL = NPM + '@mapbox/mapbox-gl-rtl-text@0.3.0/dist/mapbox-gl-rtl-text.js';
export const POLYGON_CLIPPING = NPM + 'polygon-clipping@0.15.7/dist/polygon-clipping.umd.min.js';
export const MATHLIVE = NPM + 'mathlive@0.100.0/dist/mathlive.min.js';
export const HIGHLIGHT = NPM + '@highlightjs/cdn-assets@11.9.0';
export const MP4_MUXER = NPM + 'mp4-muxer@5.1.3/+esm';
export const GIFENC = NPM + 'gifenc@1.0.3/+esm';
export const JSZIP_ESM = NPM + 'jszip@3.10.1/+esm';
export const PDFJS = NPM + 'pdfjs-dist@4.10.38/build';
export const BG_REMOVAL = NPM + '@imgly/background-removal@1.5.5/+esm';
export const GIFUCT = NPM + 'gifuct-js@2.1.2/+esm';
// Compressed 3D models, unpacked in the browser (features/content/gltfunpack.js): Google's
// Draco decoder, its glTF-only build (~60 KB of JS + ~190 KB of wasm, not on npm: from its
// repository, by tag), and meshoptimizer's (~32 KB, the wasm inside).
export const DRACO = 'https://cdn.jsdelivr.net/gh/google/draco@1.5.7/javascript/';
export const MESHOPT = NPM + 'meshoptimizer@1.0.1/meshopt_decoder.mjs';
// Live camera background (blur / remove): MediaPipe's person segmenter, run in
// the browser (the camera's picture never leaves it); the model, a fixed version.
export const VISION = NPM + '@mediapipe/tasks-vision@1.0.1';
export const SELFIE_MODEL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite';
// A 3D model following the presenter (io/runtime/puppet.js), also in the browser:
// the lightest pose model (the body, ~6 MB) and the face one (head turns, mouth and blinks, ~4 MB).
export const POSE_MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
export const FACE_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
// Spelling (features/document/spelling.js): Hunspell compiled to WebAssembly (the wrapper MIT; Hunspell itself
// MPL 1.1 / GPL 2 / LGPL 2.1), its browser build: ~1 MB with the wasm inside. (nspell, in plain JavaScript, took
// over two minutes to build the Italian or Portuguese dictionary; Hunspell, under two seconds the biggest.)
export const HUNSPELL = NPM + '@farscrl/hunspell-wasm@1.0.1/dist/lib/hunspell.web.mjs';
// The dictionaries, each under its own free licence: wooorm's packages (LibreOffice's, SCOWL's…, as .aff + .dic), and
// Arabic (Ayaspell, GPL/LGPL/MPL) from LibreOffice's repository, by commit. Downloaded only when that language is used.
const WOOORM = p => ({ aff: `${NPM}dictionary-${p}/index.aff`, dic: `${NPM}dictionary-${p}/index.dic` });
const LIBREOFFICE = 'https://cdn.jsdelivr.net/gh/LibreOffice/dictionaries@32b006a2c22a4ac7e8ed3f03346f7b3d85a970a4/';
export const SPELL_DICTS = {
  'es-ES': WOOORM('es@4.0.0'), 'ca-ES': WOOORM('ca@3.0.0'), 'gl-ES': WOOORM('gl@3.0.0'), 'eu-ES': WOOORM('eu@4.0.0'),
  'en-US': WOOORM('en@4.0.0'), 'en-GB': WOOORM('en-gb@3.0.0'), 'fr-FR': WOOORM('fr@3.0.0'), 'de-DE': WOOORM('de@3.0.0'),
  'it-IT': WOOORM('it@2.0.0'), 'pt-PT': WOOORM('pt-pt@2.0.0'), 'pt-BR': WOOORM('pt@4.0.0'), 'nl-NL': WOOORM('nl@2.0.0'),
  ar: { aff: LIBREOFFICE + 'ar/ar.aff', dic: LIBREOFFICE + 'ar/ar.dic' },
};

// A classic script (or an ES module), once: resolves at once if `global` already
// exists, and concurrent calls for the same URL share one request.
const pending = new Map();
export function loadScript(src, global, module = false) {
  if (global && window[global]) return Promise.resolve(window[global]);
  if (!pending.has(src)) pending.set(src, whileBusy(new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = src; s.async = true; if (module) s.type = 'module';
    s.onload = () => res(global ? window[global] : undefined);
    // (From the other CDN once, if the first doesn't answer: unpkg serves the same npm packages.)
    s.onerror = () => {
      s.remove();
      if (src.startsWith(NPM) && !s.dataset.mirror) {
        const m = document.createElement('script'); m.src = 'https://unpkg.com/' + src.slice(NPM.length); m.async = true; if (module) m.type = 'module'; m.dataset.mirror = '1';
        m.onload = () => res(global ? window[global] : undefined);
        m.onerror = () => { pending.delete(src); m.remove(); rej(new Error('No se pudo cargar ' + (src.split('/npm/')[1] || src))); };
        document.head.appendChild(m); return;
      }
      pending.delete(src); rej(new Error('No se pudo cargar ' + (src.split('/npm/')[1] || src)));
    };
    document.head.appendChild(s);
  })));                                                   // (counted: someone waits for it — core/busy.js)
  return pending.get(src);
}
// <model-viewer>, unless the page has it already (it is an ES module: as a classic script it fails).
// (A graphics context, tried once: the page's own answer, or a throw-away canvas.)
let gl3d = null;
const canDrawGL = () => gl3d ??= !window.__rvGS?.dead && (() => { try { const c = document.createElement('canvas'), g = c.getContext('webgl2') || c.getContext('webgl'); g?.getExtension('WEBGL_lose_context')?.loseContext(); return !!g; } catch { return false; } })();
export const loadModelViewer = () => (customElements.get('model-viewer') ? Promise.resolve()
  : !canDrawGL() ? Promise.reject(new Error('no WebGL'))      // (without a graphics context every model fails with an uncaught error)
  : loadScript(MODEL_VIEWER, null, true));
// A stylesheet, once.
export function loadStyle(href) {
  if (![...document.querySelectorAll('link[rel=stylesheet]')].some(l => l.href === href)) {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l);
  }
}
