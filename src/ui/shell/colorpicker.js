// Revela's own colour picker, for every <input type="color"> of the app (ribbon, panels, dialogs): the same everywhere.
//
// The browser's own was a different thing in each place: Chrome's small box; in the desktop app (WebKitGTK) a GTK
// dialog of its own, which took the focus — and the selected text with it, so a text colour wasn't applied — and
// told the page nothing until it closed; no eyedropper outside Chrome (the EyeDropper API is Chrome's). Francisco:
// «el cambio de color me falla, y no hay un analizar color para copiarlo».
//
// A click on a colour input (or its label) opens this instead: the theme's and brand kits' colours, standard ones and
// the last used; a square of shade and a strip of hue; the code (#rrggbb, rgb(…) or a CSS name), to copy or paste;
// and an eyedropper — the browser's where there is one, else a click on the slide (drawn as it is: a picture's
// pixels too) or on anything of the window. What is chosen goes into the input with its usual «input» event (and
// «change» when done), so everything bound to it works as before, undo included; a text selection is kept.
// Fills, borders and highlights (inputs marked data-alpha) may be see-through: a «Transparencia» slider, and the colour
// as #rrggbbaa — which a colour input can't hold, so every colour input keeps the whole value aside (initColourPicker).

import { t } from '../../i18n/index.js';
import { state, currentSlide } from '../../core/store.js';
import { paletteColours } from '../../features/design/palettes.js';
import { kitColours } from '../../features/design/brandkit.js';
import { toast } from './toast.js';
import { textCaret, caretOf, editAt } from '../../features/document/format.js';

const STANDARD = ['#000000', '#404040', '#7f7f7f', '#bfbfbf', '#ffffff', '#c00000', '#ff0000', '#ffc000', '#ffff00', '#92d050',
  '#00b050', '#00b0f0', '#0070c0', '#002060', '#7030a0', '#e6194b', '#f58231', '#3cb44b', '#4363d8', '#911eb4'];
const RECENT = 'revela.colours.recent', MAX_RECENT = 10;
const recent = () => { try { return JSON.parse(localStorage.getItem(RECENT) || '[]').filter(isHex).slice(0, MAX_RECENT); } catch { return []; } };
function remember(hex) { try { localStorage.setItem(RECENT, JSON.stringify([hex, ...recent().filter(c => c !== hex)].slice(0, MAX_RECENT))); } catch {} }

// ---- Colours as text ----------------------------------------------------------------------------------------
const isHex = c => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c);
const isHexA = c => typeof c === 'string' && /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(c);
// #rrggbb and an opacity 0–1 → #rrggbb, or #rrggbbaa when see-through.
const withAlpha = (hex, a) => (a >= 0.999 ? hex : hex + hex2(a * 255));
const hex2 = n => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
export const rgbHex = (r, g, b) => '#' + hex2(r) + hex2(g) + hex2(b);
// Whatever is typed or pasted (#abc, #aabbcc, aabbcc, rgb(…), a CSS name…) → #rrggbb, or null.
export function parseColour(s) {
  s = String(s || '').trim(); if (!s) return null;
  if (/^#?[0-9a-f]{3}$/i.test(s)) { const h = s.replace('#', ''); return ('#' + h[0] + h[0] + h[1] + h[1] + h[2] + h[2]).toLowerCase(); }
  if (/^#?[0-9a-f]{6}$/i.test(s)) return ('#' + s.replace('#', '')).toLowerCase();
  const c = document.createElement('canvas').getContext('2d'); c.fillStyle = '#010203'; c.fillStyle = s;
  const v = c.fillStyle; if (v === '#010203' && !/^#?010203$/i.test(s)) return null;
  if (isHex(v)) return v.toLowerCase();
  const m = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(v); return m ? rgbHex(+m[1], +m[2], +m[3]) : null;
}
function toHsv(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), d = max - Math.min(r, g, b);
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s: max ? d / max : 0, v: max };
}
function fromHsv({ h, s, v }) {
  const f = n => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  return rgbHex(f(5) * 255, f(3) * 255, f(1) * 255);
}

// ---- The open one -----------------------------------------------------------------------------------------
let cur = null;                  // { input, pop, caret, hsv, value }
const keepFocus = el => el.addEventListener('mousedown', e => { if (e.target.tagName !== 'INPUT') e.preventDefault(); });   // (the text selection stays)

// (The selected words kept as offsets in their text box — they survive the box being redrawn, which a Range doesn't,
// e.g. when the code field takes the focus —: that box back into editing with them selected, before each colour.)
function restoreSelection() {
  const c = cur?.caret; if (!c) return;
  const el = document.querySelector(`.block[data-id="${CSS.escape(c.id)}"] .rich`); if (!el) return;
  if (!(el.isContentEditable && document.activeElement === el && caretOf(el)?.start === c.start && caretOf(el)?.end === c.end)) editAt(el, c);
}
// The colour into the input, as its own picker would (live: «input»; done: «change» too).
function apply(hex, done = false) {
  if (!cur || !isHex(hex)) return;
  cur.value = hex; paint();
  restoreSelection();
  cur.input.value = withAlpha(hex, cur.alpha); cur.input.dispatchEvent(new Event('input', { bubbles: true }));
  if (done) { cur.input.dispatchEvent(new Event('change', { bubbles: true })); remember(hex); }
}
function paint() {
  const { pop, value, hsv } = cur;
  pop.querySelector('.cp-sv').style.background = `linear-gradient(to top,#000,transparent),linear-gradient(to right,#fff,transparent),hsl(${hsv.h},100%,50%)`;
  const dot = pop.querySelector('.cp-dot'); dot.style.left = hsv.s * 100 + '%'; dot.style.top = (1 - hsv.v) * 100 + '%'; dot.style.background = value;
  pop.querySelector('.cp-hue').value = String(Math.round(hsv.h));
  pop.querySelector('.cp-now').style.background = value;
  const code = pop.querySelector('.cp-code'); if (document.activeElement !== code) code.value = value;
  const al = pop.querySelector('.cp-alpha');
  if (al) { al.value = String(Math.round((1 - cur.alpha) * 100)); pop.querySelector('.cp-alpha-v').textContent = al.value + ' %';
    al.style.background = `linear-gradient(to right,${value},${value}00),repeating-conic-gradient(#ccc 0 25%,#fff 0 50%) 0 0/10px 10px`; }
}
const swatches = (cols, label) => (cols.length ? `<div class="cp-row"><span>${label}</span><div class="cp-sw">${cols.map(c => `<button type="button" data-c="${c}" title="${c}" style="background:${c}"></button>`).join('')}</div></div>` : '');

export function openColourPicker(input) {
  closeColourPicker();
  // (Words selected in the text being edited: selected again before each colour goes in — it is applied to them.)
  const tc = textCaret(), caret = tc && tc.end > tc.start && getSelection().toString() ? tc : null;
  const full = [input.value, input.getAttribute('value')].find(isHexA)?.toLowerCase() || '#000000';
  const value = full.slice(0, 7), canAlpha = input.dataset.alpha != null;
  const alpha = canAlpha && full.length === 9 ? parseInt(full.slice(7), 16) / 255 : 1;
  const theme = (() => { try { return [...new Set([...paletteColours(), ...kitColours()].map(c => String(c).toLowerCase()).filter(isHex))].slice(0, 20); } catch { return []; } })();
  const pop = document.createElement('div');
  pop.className = 'popover cp-pop'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', t('Color'));
  pop.innerHTML = `${swatches(theme, t('Tema'))}${swatches(STANDARD, t('Estándar'))}${swatches(recent(), t('Recientes'))}
    <div class="cp-sv"><span class="cp-dot"></span></div>
    <input type="range" class="cp-hue" min="0" max="359" step="1" aria-label="${t('Tono')}">
    ${canAlpha ? `<label class="cp-al"><span>${t('Transparencia')}</span><input type="range" class="cp-alpha" min="0" max="100" step="1"><b class="cp-alpha-v"></b></label>` : ''}
    <div class="cp-bar"><span class="cp-now"></span><input class="cp-code" spellcheck="false" aria-label="${t('Código del color')}">
      <button type="button" class="cp-copy" title="${t('Copiar el código')}"><i class="ms">content_copy</i></button>
      <button type="button" class="cp-drop" title="${t('Cuentagotas: toma el color de un punto de la diapositiva o de la ventana')}"><i class="ms">colorize</i></button></div>`;
  document.body.appendChild(pop);
  cur = { input, pop, caret, value, alpha, hsv: toHsv(value) };
  keepFocus(pop);
  place(pop, input);
  paint();
  pop.addEventListener('click', e => {
    const sw = e.target.closest('[data-c]'); if (sw) { cur.hsv = toHsv(sw.dataset.c); apply(sw.dataset.c, true); return; }
    if (e.target.closest('.cp-copy')) copyCode();
    if (e.target.closest('.cp-drop')) eyedrop();
  });
  // The square: shade (left to right) and light (top to bottom), dragged.
  const sv = pop.querySelector('.cp-sv');
  sv.addEventListener('pointerdown', e => {
    e.preventDefault(); sv.setPointerCapture(e.pointerId);
    let frame = 0;
    const at = ev => {
      const r = sv.getBoundingClientRect();
      cur.hsv = { ...cur.hsv, s: Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)), v: Math.max(0, Math.min(1, 1 - (ev.clientY - r.top) / r.height)) };
      cur.value = fromHsv(cur.hsv); paint();
      if (!frame) frame = requestAnimationFrame(() => { frame = 0; apply(cur.value); });
    };
    at(e);
    const move = ev => at(ev), up = () => { sv.removeEventListener('pointermove', move); sv.removeEventListener('pointerup', up); cancelAnimationFrame(frame); apply(cur.value, true); };
    sv.addEventListener('pointermove', move); sv.addEventListener('pointerup', up);
  });
  const hue = pop.querySelector('.cp-hue');
  hue.addEventListener('input', () => { cur.hsv = { ...cur.hsv, h: +hue.value, s: cur.hsv.s || 1, v: cur.hsv.v || 1 }; apply(fromHsv(cur.hsv)); });
  hue.addEventListener('change', () => apply(cur.value, true));
  const al = pop.querySelector('.cp-alpha');
  al?.addEventListener('input', () => { cur.alpha = 1 - +al.value / 100; apply(cur.value); });
  al?.addEventListener('change', () => apply(cur.value, true));
  // The code: typed or pasted, applied with Enter (or on leaving it).
  const code = pop.querySelector('.cp-code');
  const typed = () => { const c = parseColour(code.value); if (c) { cur.hsv = toHsv(c); apply(c, true); } else code.value = cur.value; };
  code.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); typed(); } if (e.key === 'Escape') { e.stopPropagation(); closeColourPicker(); } });
  code.addEventListener('change', typed);
  setTimeout(() => document.addEventListener('pointerdown', outside, true), 0);
  document.addEventListener('keydown', onKey, true);
  return pop;
}
export function closeColourPicker() {
  if (!cur) return;
  cur.pop.remove(); cur = null;
  document.removeEventListener('pointerdown', outside, true); document.removeEventListener('keydown', onKey, true);
}
const outside = e => { if (cur && !cur.pop.contains(e.target) && !e.target.closest?.('.cp-eyedrop')) closeColourPicker(); };
// (Esc closes only the picker: the object stays selected.)
const onKey = e => { if (e.key === 'Escape' && cur && !e.target.closest?.('.cp-code')) { e.preventDefault(); e.stopImmediatePropagation(); closeColourPicker(); } };
function place(pop, input) {
  const a = (input.closest('label') || input).getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
  let x = Math.min(Math.max(8, a.left), innerWidth - w - 8), y = a.bottom + 6;
  if (y + h > innerHeight - 8) y = Math.max(8, a.top - h - 6);
  pop.style.left = x + 'px'; pop.style.top = y + 'px';
}
async function copyCode() {
  const code = cur.pop.querySelector('.cp-code'), v = cur.value;
  try { await navigator.clipboard.writeText(v); }
  catch { code.focus(); code.select(); try { document.execCommand('copy'); } catch {} }
  toast(t('Copiado: {c}').replace('{c}', v));
}

// ---- The eyedropper -----------------------------------------------------------------------------------------
let nativeDropper = true;
export const useNativeEyedropper = on => { nativeDropper = !!on; };        // (tests: Revela's own, as in the desktop app)
async function eyedrop() {
  if (nativeDropper && 'EyeDropper' in window) {                     // (the browser's: anything on the screen)
    try { const { sRGBHex } = await new window.EyeDropper().open(); const c = parseColour(sRGBHex); if (c) { cur.hsv = toHsv(c); apply(c, true); } } catch {}
    return;
  }
  // Else: a click on the slide (drawn as a picture now, so a photo's pixel counts too) or on the window.
  const was = cur; was.pop.style.visibility = 'hidden';
  const shield = document.createElement('div'); shield.className = 'cp-eyedrop';
  document.body.appendChild(shield);
  const note = toast(t('Haz clic en la diapositiva (o en cualquier punto de la ventana) para tomar su color. Esc: cancelar.'), { busy: true });
  let picture = null;
  const drawn = (async () => {
    try {
      const { slidePicture } = await import('../../io/export/images.js');
      const { blob } = await slidePicture(currentSlide(), 'png', state.deck, { scale: 1 });
      const bmp = await createImageBitmap(blob), c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
      const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(bmp, 0, 0); bmp.close?.(); picture = g;
    } catch {}
  })();
  const picked = await new Promise(done => {
    const key = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(null); } };
    const click = e => { e.preventDefault(); e.stopPropagation(); finish({ x: e.clientX, y: e.clientY }); };
    function finish(v) { shield.removeEventListener('pointerdown', click); document.removeEventListener('keydown', key, true); shield.remove(); done(v); }
    shield.addEventListener('pointerdown', click); document.addEventListener('keydown', key, true);
  });
  note.close();
  if (cur !== was) return;
  was.pop.style.visibility = '';
  if (!picked) return;
  const c = await colourAt(picked.x, picked.y, drawn, () => picture);
  if (c) { cur.hsv = toHsv(c); apply(c, true); }
}
async function colourAt(x, y, drawn, picture) {
  const stage = document.getElementById('stage'), r = stage?.getBoundingClientRect();
  if (r && x >= r.left && x < r.right && y >= r.top && y < r.bottom) {
    await drawn;
    const g = picture();
    if (g) {
      const px = Math.floor((x - r.left) / r.width * g.canvas.width), py = Math.floor((y - r.top) / r.height * g.canvas.height);
      const d = g.getImageData(Math.min(px, g.canvas.width - 1), Math.min(py, g.canvas.height - 1), 1, 1).data;
      return rgbHex(d[0], d[1], d[2]);
    }
  }
  // (Elsewhere, or the slide couldn't be drawn: the colour of what is there — its background, else its text.)
  for (let el = document.elementFromPoint(x, y); el; el = el.parentElement) {
    const s = getComputedStyle(el), bg = parseColour(s.backgroundColor);
    if (bg && !/rgba\([^)]*,\s*0\)|transparent/.test(s.backgroundColor)) return bg;
    if (el.childNodes.length && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return parseColour(s.color);
  }
  return null;
}

// ---- Every colour input -------------------------------------------------------------------------------------
// A click on one (or on its label; or Enter / Space on it): this picker, not the browser's.
// (Every colour input holds its whole value — #rrggbbaa too — beside the #rrggbb it can show: set as usual, read as
// usual, by every part of the app.)
let patched = false;
function keepWholeValues() {
  if (patched || typeof HTMLInputElement === 'undefined') return; patched = true;
  const d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  Object.defineProperty(HTMLInputElement.prototype, 'value', { ...d,
    get() { const v = d.get.call(this); if (this.type !== 'color') return v; const w = this.dataset.value; return w && w.slice(0, 7) === v.toLowerCase() ? w : v; },
    set(v) {
      if (this.type === 'color' && typeof v === 'string' && /^#[0-9a-f]{8}$/i.test(v)) { this.dataset.value = v.toLowerCase(); d.set.call(this, v.slice(0, 7)); return; }
      if (this.type === 'color') delete this.dataset.value;
      d.set.call(this, v);
    } });
}
export function initColourPicker() {
  keepWholeValues();
  const onClick = e => {
    const inp = e.target instanceof HTMLInputElement && e.target.type === 'color' ? e.target : null;
    if (!inp || inp.disabled || inp.dataset.native != null) return;
    e.preventDefault();
    if (cur?.input === inp) { closeColourPicker(); return; }
    openColourPicker(inp);
  };
  document.addEventListener('click', onClick, true);
  return () => document.removeEventListener('click', onClick, true);
}
