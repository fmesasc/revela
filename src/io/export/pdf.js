// «Exportar PDF»: a PDF file made here, one page per slide, each the slide as it looks (drawn as a
// picture, html2canvas: 3D posters, equations, gradients and Text Art included). No print dialog, no
// printer picked by mistake, and it works on phones without «Save as PDF». (Notes pages, handouts and
// selectable text: «Imprimir», print.js.)

import { state } from '../../core/store.js';
import { slideImageBlob } from './images.js';
import { download, slug } from '../files.js';

const enc = new TextEncoder();
// A PDF from JPEG pages: [{ bytes (Uint8Array), w, h (pixels) }] at w×h points scaled to the slide's size.
export function pdfFromJpegs(pages, { width = 960, height = 540, title = '' } = {}) {
  const parts = [], offs = [];
  let len = 0;
  const put = x => { const b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); len += b.length; };
  const obj = (n, body) => { offs[n] = len; put(`${n} 0 obj\n`); for (const b of [].concat(body)) put(b); put('\nendobj\n'); };
  const esc = s => String(s).replace(/[\\()]/g, m => '\\' + m).replace(/[^\x20-\x7e]/g, '');
  put('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n');
  const n = pages.length, pageIds = pages.map((_, i) => 4 + i * 3);
  obj(1, `<< /Type /Catalog /Pages 2 0 R >>`);
  obj(2, `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${n} >>`);
  obj(3, `<< /Producer (Revela) /Title (${esc(title)}) >>`);
  pages.forEach((p, i) => {
    const id = pageIds[i], content = `q ${width} 0 0 ${height} 0 0 cm /Im0 Do Q`;
    obj(id, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Im0 ${id + 2} 0 R >> >> /Contents ${id + 1} 0 R >>`);
    obj(id + 1, [`<< /Length ${content.length} >>\nstream\n`, content, '\nendstream']);
    obj(id + 2, [`<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.bytes.length} >>\nstream\n`, p.bytes, '\nendstream']);
  });
  const xref = len, last = 3 + n * 3;
  put(`xref\n0 ${last + 1}\n0000000000 65535 f \n`);
  for (let k = 1; k <= last; k++) put(String(offs[k]).padStart(10, '0') + ' 00000 n \n');
  put(`trailer\n<< /Size ${last + 1} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(parts, { type: 'application/pdf' });
}

// The presentation's visible slides as a PDF. onProgress(done, total).
export async function buildPDF(deck = state.deck, { onProgress = () => {} } = {}) {
  const slides = deck.slides.filter(s => !s.hidden), pages = [];
  const k = 1920 / deck.size.w;
  for (const [i, s] of slides.entries()) {
    const blob = await slideImageBlob(s, 'jpg', deck, { scale: k, quality: 0.9 });
    const bmp = await createImageBitmap(blob);
    pages.push({ bytes: new Uint8Array(await blob.arrayBuffer()), w: bmp.width, h: bmp.height });
    bmp.close?.(); onProgress(i + 1, slides.length);
  }
  // (Points: the slide's size in pixels × 0.75, the usual 96 → 72 dpi; 1280×720 → 960×540 pt.)
  return pdfFromJpegs(pages, { width: Math.round(deck.size.w * 0.75), height: Math.round(deck.size.h * 0.75), title: deck.name || '' });
}
export async function exportPDFFile(deck = state.deck, opts = {}) {
  download(await buildPDF(deck, opts), slug(deck.name || 'presentacion') + '.pdf');
}
