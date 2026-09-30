// Attached files (PowerPoint's Insert ▸ Object, Canva's uploads): any file
// dropped or chosen goes inside the presentation. A PDF shows one of its pages
// (or the browser's PDF viewer when presenting, or an icon); any other file is
// an icon with its name, which downloads it when clicked. A PDF can also become
// slides, one per page. Pages are drawn with pdf.js, here in the browser.

import { state, commit, currentSlide } from '../../core/store.js';
import { uid, blankSlide } from '../../core/model.js';
import { PDFJS } from '../../core/vendor.js';

export const FILE_LIMIT = 25e6;                                 // (bigger files would make the presentation too heavy to keep)
export const isPdf = f => f?.mime === 'application/pdf' || /\.pdf$/i.test(f?.name || '');

let lib = null;
async function pdfjs() {
  if (!lib) { lib = await import(`${PDFJS}/pdf.min.mjs`); lib.GlobalWorkerOptions.workerSrc = `${PDFJS}/pdf.worker.min.mjs`; }
  return lib;
}
const bytesOf = dataURL => Uint8Array.from(atob(dataURL.slice(dataURL.indexOf(',') + 1)), c => c.charCodeAt(0));
export async function openPdf(src) { return (await pdfjs()).getDocument({ data: bytesOf(src) }).promise; }
// A page as a PNG picture, `width` pixels wide; with its size.
export async function pageImage(pdf, n, width = 1400) {
  const page = await pdf.getPage(Math.min(Math.max(1, n), pdf.numPages)), v1 = page.getViewport({ scale: 1 });
  const vp = page.getViewport({ scale: width / v1.width }), c = document.createElement('canvas');
  c.width = Math.round(vp.width); c.height = Math.round(vp.height);
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  await page.render({ canvasContext: g, viewport: vp }).promise;
  return { src: c.toDataURL('image/png'), w: v1.width, h: v1.height };
}

// Where a new object of this proportion fits, centred (at most 70 % of the slide).
function place(ratio) {
  const { w: W, h: H } = state.deck.size; let w = W * 0.5, h = w / ratio;
  if (h > H * 0.7) { h = H * 0.7; w = h * ratio; }
  return { x: Math.round((W - w) / 2), y: Math.round((H - h) / 2), w: Math.round(w), h: Math.round(h) };
}
// A block for a file: { name, type, size } and its data URL. A PDF: its first page, unless as = 'icon'.
export async function fileBlock(file, src, as = 'page') {
  // (Kept as a generic download unless it is a PDF: the presentation only takes
  // data of known kinds — see sanitize.js — and the name keeps its extension.)
  src = src.replace(/^data:[^;,]*/, isPdf({ mime: file.type, name: file.name }) ? 'data:application/pdf' : 'data:application/octet-stream');
  const b = { id: uid(), type: 'file', name: String(file.name || 'archivo').slice(0, 120), mime: file.type || 'application/octet-stream', bytes: file.size || 0,
    src, rotation: 0, animation: null };
  if (isPdf(b) && as !== 'icon') {
    const pdf = await openPdf(src), img = await pageImage(pdf, 1);
    Object.assign(b, { display: as, page: 1, pages: pdf.numPages, poster: img.src }, place(img.w / img.h));
  } else Object.assign(b, { display: 'icon', w: 200, h: 250, x: Math.round((state.deck.size.w - 200) / 2), y: Math.round((state.deck.size.h - 250) / 2) });
  return b;
}
// Show another page of a PDF.
export async function setPdfPage(b, n) {
  const pdf = await openPdf(b.src), page = Math.min(Math.max(1, Math.round(n) || 1), pdf.numPages), img = await pageImage(pdf, page);
  commit(() => { b.page = page; b.poster = img.src; b.pages = pdf.numPages; });
}
// A PDF as slides, one per page, after the current one (each page as big as fits).
export async function pdfToSlides(src, onProgress) {
  const pdf = await openPdf(src), { w: W, h: H } = state.deck.size, made = [];
  for (let n = 1; n <= Math.min(pdf.numPages, 200); n++) {
    const img = await pageImage(pdf, n, 1600), k = Math.min(W / img.w, H / img.h), w = Math.round(img.w * k), h = Math.round(img.h * k);
    const s = blankSlide('#ffffff', currentSlide()?.sectionId || null);
    s.blocks.push({ id: uid(), type: 'image', src: img.src, x: Math.round((W - w) / 2), y: Math.round((H - h) / 2), w, h, rotation: 0, animation: null, alt: `${n}` });
    made.push(s); onProgress?.(n / pdf.numPages);
  }
  commit(() => { state.deck.slides.splice(state.ui.slideIndex + 1, 0, ...made); state.ui.slideIndex += 1; state.ui.selection = null; state.ui.multi = []; });
  return made.length;
}
// "12,3 MB"
export const sizeText = (n, lang) => (n >= 1e6 ? `${(n / 1e6).toLocaleString(lang, { maximumFractionDigits: 1 })} MB` : `${Math.max(1, Math.round(n / 1e3)).toLocaleString(lang)} KB`);

// Show a PDF as its page, its viewer or an icon (the icon keeps the centre, the page its proportions).
export async function setFileDisplay(b, mode) {
  let poster = b.poster, ratio = null;
  if (mode !== 'icon' && isPdf(b)) {
    if (!poster) { const pdf = await openPdf(b.src), img = await pageImage(pdf, b.page || 1); poster = img.src; ratio = img.w / img.h; b.pages = pdf.numPages; }
    else ratio = await new Promise(res => { const i = new Image(); i.onload = () => res(i.naturalWidth / i.naturalHeight || 0.77); i.onerror = () => res(0.77); i.src = poster; });
  }
  commit(() => {
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    b.display = mode; if (poster) b.poster = poster;
    if (mode === 'icon') { b.w = 200; b.h = 250; } else if (ratio && b.display !== 'icon') { const h = Math.max(b.h, 300); b.h = Math.round(h); b.w = Math.round(h * ratio); }
    b.x = Math.round(cx - b.w / 2); b.y = Math.round(cy - b.h / 2);
  });
}
// The file itself: opened in a new tab (a PDF) or downloaded.
export function fileURL(b) {
  const i = b.src.indexOf(','), bin = atob(b.src.slice(i + 1)), a = new Uint8Array(bin.length);
  for (let k = 0; k < bin.length; k++) a[k] = bin.charCodeAt(k);
  return URL.createObjectURL(new Blob([a], { type: isPdf(b) ? 'application/pdf' : (b.mime || 'application/octet-stream') }));
}
export function openFile(b) {
  const u = fileURL(b);
  if (isPdf(b)) window.open(u, '_blank', 'noopener');
  else { const a = document.createElement('a'); a.href = u; a.download = b.name || 'archivo'; document.body.appendChild(a); a.click(); a.remove(); }
  setTimeout(() => URL.revokeObjectURL(u), 60000);
}
export function downloadFile(b) {
  const u = fileURL(b), a = document.createElement('a'); a.href = u; a.download = b.name || 'archivo'; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 60000);
}
