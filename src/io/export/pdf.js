// «Exportar PDF»: a PDF file made here, one page per slide, each the slide as it looks (drawn as a
// picture, html2canvas: 3D posters, equations, gradients and Text Art included). No print dialog, no
// printer picked by mistake, and it works on phones without «Save as PDF». Two ways: just the pictures,
// or with the slides' text as an invisible layer over them (selectable, copyable, searchable — as a
// scanned document with OCR). (Notes pages and handouts: «Documentos y notas», print.js.)

import { state } from '../../core/store.js';
import { slidePicture } from './images.js';
import { download, slug } from '../files.js';

const enc = new TextEncoder();
// Helvetica's widths (its standard metrics, /1000 of the size) for ' '…'~'; accented letters as their base letter.
const HW = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
const widthOf = s => [...s.normalize('NFD').replace(/[̀-ͯ]/g, '')].reduce((a, ch) => { const c = ch.charCodeAt(0); return a + (c >= 32 && c <= 126 ? HW[c - 32] : 556); }, 0) / 1000;
// The text in WinAnsi (the standard fonts' encoding: Latin letters with accents, € and typographic quotes), as hex.
const WIN = { '€': 0x80, '‚': 0x82, '„': 0x84, '…': 0x85, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '™': 0x99 };
const winHex = s => [...s].map(ch => { const c = ch.charCodeAt(0); const b = WIN[ch] ?? (c < 128 || (c >= 160 && c < 256) ? c : 63); return b.toString(16).padStart(2, '0'); }).join('');
const num = v => (Math.round(v * 100) / 100).toString();
// A PDF from JPEG pages: [{ bytes (Uint8Array), w, h (pixels), runs? }] at width×height points. With runs —
// the slide's lines of text, in slide pixels (k: points per pixel) —, an invisible text layer over each picture:
// the page looks the same, and its text can be selected, copied and searched.
export function pdfFromJpegs(pages, { width = 960, height = 540, title = '', k = 0.75 } = {}) {
  const parts = [], offs = [];
  let len = 0;
  const put = x => { const b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); len += b.length; };
  const obj = (n, body) => { offs[n] = len; put(`${n} 0 obj\n`); for (const b of [].concat(body)) put(b); put('\nendobj\n'); };
  const esc = s => String(s).replace(/[\\()]/g, m => '\\' + m).replace(/[^\x20-\x7e]/g, '');
  put('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n');
  const n = pages.length, pageIds = pages.map((_, i) => 4 + i * 3), font = 4 + n * 3;
  obj(1, `<< /Type /Catalog /Pages 2 0 R >>`);
  obj(2, `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${n} >>`);
  obj(3, `<< /Producer (Revela) /Title (${esc(title)}) >>`);
  pages.forEach((p, i) => {
    const id = pageIds[i];
    let content = `q ${width} 0 0 ${height} 0 0 cm /Im0 Do Q`;
    if (p.runs?.length) {
      // (Render mode 3: invisible. Each line at its place and size, stretched to the width it has on the slide.)
      content += '\nBT 3 Tr';
      for (const r of p.runs) {
        const fs = r.h * k * 0.78, natural = widthOf(r.text) * fs; if (fs < 1 || natural <= 0) continue;
        const tz = Math.max(20, Math.min(400, (r.w * k) / natural * 100));
        content += `\n/F1 ${num(fs)} Tf ${num(tz)} Tz 1 0 0 1 ${num(r.x * k)} ${num(height - (r.y + r.h * 0.8) * k)} Tm <${winHex(r.text)}> Tj`;
      }
      content += '\nET';
    }
    obj(id, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Im0 ${id + 2} 0 R >> /Font << /F1 ${font} 0 R >> >> /Contents ${id + 1} 0 R >>`);
    obj(id + 1, [`<< /Length ${enc.encode(content).length} >>\nstream\n`, content, '\nendstream']);
    obj(id + 2, [`<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.bytes.length} >>\nstream\n`, p.bytes, '\nendstream']);
  });
  obj(font, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const xref = len, last = font;
  put(`xref\n0 ${last + 1}\n0000000000 65535 f \n`);
  for (let i = 1; i <= last; i++) put(String(offs[i]).padStart(10, '0') + ' 00000 n \n');
  put(`trailer\n<< /Size ${last + 1} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(parts, { type: 'application/pdf' });
}

// The presentation's visible slides as a PDF. onProgress(done, total).
// text: with the invisible text layer (selectable and searchable).
export async function buildPDF(deck = state.deck, { onProgress = () => {}, text = false } = {}) {
  const slides = deck.slides.filter(s => !s.hidden), pages = [];
  const k = 1920 / deck.size.w;
  for (const [i, s] of slides.entries()) {
    const { blob, runs } = await slidePicture(s, 'jpg', deck, { scale: k, quality: 0.9, text });
    const bmp = await createImageBitmap(blob);
    pages.push({ bytes: new Uint8Array(await blob.arrayBuffer()), w: bmp.width, h: bmp.height, runs });
    bmp.close?.(); onProgress(i + 1, slides.length);
  }
  // (Points: the slide's size in pixels × 0.75, the usual 96 → 72 dpi; 1280×720 → 960×540 pt.)
  const width = Math.round(deck.size.w * 0.75), height = Math.round(deck.size.h * 0.75);
  return pdfFromJpegs(pages, { width, height, title: deck.name || '', k: width / deck.size.w });
}
export async function exportPDFFile(deck = state.deck, opts = {}) {
  download(await buildPDF(deck, opts), slug(deck.name || 'presentacion') + '.pdf');
}
