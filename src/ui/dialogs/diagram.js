// A diagram's text (SmartArt's text pane): one line per item; two spaces (or
// Tab) in front make it a sub-item — a description under it, or in an org
// chart a person under another. The diagram changes as it is typed. And each line's picture (openDiagramPictures).

import { t } from '../../i18n/index.js';
import { commit } from '../../core/store.js';
import * as blocks from '../../features/document/blocks.js';
import { DIAGRAM_NAMES, PIC_FITS, parseOutline, pictureOf } from '../../render/diagrams.js';
import { readFile } from '../shell/openfile.js';

export function openDiagramText(b) {
  document.getElementById('dg-modal')?.remove();
  const back = document.createElement('div'); back.id = 'dg-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;width:min(520px,96vw)"><button class="modal-close">✕</button>
    <h3>${t('Texto del diagrama')} · ${t(DIAGRAM_NAMES[b.layout] || '')}</h3>
    <p class="host-help">${t('Una línea por elemento. Con dos espacios (o Tab) delante, es un subelemento: su explicación, o en un organigrama, quien depende de él.')}</p>
    <textarea class="dg-text" rows="12" spellcheck="true" style="width:100%;box-sizing:border-box;font:15px/1.5 ui-monospace,monospace;tab-size:2"></textarea>
    <div class="fr-actions"><button type="button" class="fr-do dg-ok">${t('Aceptar')}</button></div></div>`;
  document.body.appendChild(back);
  const ta = back.querySelector('.dg-text'), before = b.text;
  ta.value = b.text ?? '';
  // Live, without an undo step per key; one step when closing.
  let timer = 0;
  ta.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => commit(() => { b.text = ta.value; }, { history: false }), 120); });
  ta.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return; e.preventDefault();
    const s = ta.selectionStart, line0 = ta.value.lastIndexOf('\n', s - 1) + 1;
    if (e.shiftKey) { if (ta.value.slice(line0, line0 + 2) === '  ') { ta.value = ta.value.slice(0, line0) + ta.value.slice(line0 + 2); ta.selectionStart = ta.selectionEnd = Math.max(line0, s - 2); } }
    else { ta.value = ta.value.slice(0, line0) + '  ' + ta.value.slice(line0); ta.selectionStart = ta.selectionEnd = s + 2; }
    ta.dispatchEvent(new Event('input'));
  });
  const close = () => {
    clearTimeout(timer); back.remove();
    const text = ta.value;
    if (text !== before) { commit(() => { b.text = before; }, { history: false }); blocks.setDiagram(b.id, { text, ...carried(b, before, text) }); }   // (one undo step)
  };
  back.querySelector('.modal-close').addEventListener('click', close);
  back.querySelector('.dg-ok').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  ta.focus();
}

// The pictures follow their lines (kept by their words): a line whose words changed, in the same place of an outline
// with as many lines, keeps its picture. → { pictures } when any changed, else {}.
function carried(b, before, after) {
  const lines = v => String(v || '').split('\n').map(l => l.trim()).filter(Boolean), a = lines(before), z = lines(after);
  if (!b.pictures?.length || a.length !== z.length) return {};
  let moved = false;
  const pictures = b.pictures.map(p => { const i = a.indexOf(String(p.text).trim()); if (i < 0 || z[i] === a[i] || z.includes(a[i])) return p; moved = true; return { ...p, text: z[i] }; });
  return moved ? { pictures } : {};
}

// A picture made small enough to travel inside the presentation: at most 640 px; PNG keeps its transparency (logos),
// a photo goes as JPEG; SVG and GIF as they are.
export function smallPicture(src, max = 640) {
  if (/^data:image\/(svg|gif)/i.test(src)) return Promise.resolve(src);
  return new Promise(res => {
    const i = new Image();
    i.onload = () => { const k = Math.min(1, max / Math.max(i.naturalWidth, i.naturalHeight)); if (k === 1 && src.length < 400e3) return res(src);
      const c = document.createElement('canvas'); c.width = Math.round(i.naturalWidth * k); c.height = Math.round(i.naturalHeight * k); c.getContext('2d').drawImage(i, 0, 0, c.width, c.height);
      res(/^data:image\/jpe?g/i.test(src) ? c.toDataURL('image/jpeg', 0.86) : c.toDataURL('image/png')); };
    i.onerror = () => res(src); i.src = src;
  });
}

// Each line of the outline with its picture: choose one (or drop or paste it on its row), remove it; how they fit.
export function openDiagramPictures(b) {
  document.getElementById('dgp-modal')?.remove();
  const back = document.createElement('div'); back.id = 'dgp-modal'; back.className = 'modal-backdrop';
  const esc = v => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  back.innerHTML = `<div class="modal" style="text-align:start;width:min(560px,96vw)"><button class="modal-close">✕</button>
    <h3>${t('Imágenes del diagrama')}</h3>
    <p class="host-help">${t('Cada línea puede llevar una imagen: un logo, una foto, un icono… Sale con su texto (encima o al lado, según el hueco). Elige el archivo, o arrástralo o pégalo en su fila.')}</p>
    <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center"><label class="fr-l" style="margin:0">${t('Encaje')} <select class="dgp-fit">${PIC_FITS.map(([v, l]) => `<option value="${v}"${(b.picFit || 'contain') === v ? ' selected' : ''}>${t(l)}</option>`).join('')}</select></label>
      <label class="fr-chk" style="margin:0"><input type="checkbox" class="dgp-only"${b.picOnly ? ' checked' : ''}> ${t('Solo la imagen (su texto queda como descripción)')}</label></div>
    <div class="dgp-rows" style="max-height:55vh;overflow:auto;margin-top:10px"></div>
    <div class="fr-actions"><button type="button" class="fr-do dgp-ok">${t('Aceptar')}</button></div></div>`;
  document.body.appendChild(back);
  const q = sel => back.querySelector(sel);
  const rows = () => {
    const flat = [], walk = (l, d) => l.forEach(n => { flat.push([n.text, d]); walk(n.kids, d + 1); }); walk(parseOutline(b.text), 0);
    q('.dgp-rows').innerHTML = flat.map(([text, d]) => { const src = pictureOf(b, text);
      return `<div class="sh-row dgp-row" data-text="${esc(text)}" tabindex="0" style="align-items:center;gap:8px;padding:4px 0 4px ${d * 20}px;border-top:1px solid var(--line)">
        ${src ? `<img src="${esc(src)}" alt="" style="width:56px;height:42px;object-fit:contain;border-radius:6px;background:#8881">` : '<span style="width:56px;height:42px;border-radius:6px;border:1px dashed #8889;display:inline-block"></span>'}
        <span style="flex:1;min-width:0;overflow-wrap:anywhere">${esc(text)}</span>
        <button type="button" class="mini2 dgp-pick">${t(src ? 'Cambiar…' : 'Elegir imagen…')}</button>${src ? `<button type="button" class="mini2 dgp-del" title="${esc(t('Quitar la imagen'))}">✕</button>` : ''}</div>`; }).join('');
  };
  const set = (text, src) => {
    const list = (b.pictures || []).filter(p => String(p.text).trim() !== text.trim());
    blocks.setDiagram(b.id, { pictures: src ? [...list, { text, src }] : list.length ? list : null }); rows();
  };
  const use = async (text, file) => { if (!file || !/^image\//.test(file.type)) return;
    const src = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(file); }); set(text, await smallPicture(src)); };
  q('.dgp-rows').addEventListener('click', e => { const row = e.target.closest('.dgp-row'); if (!row) return;
    if (e.target.closest('.dgp-del')) set(row.dataset.text, null);
    else if (e.target.closest('.dgp-pick')) readFile('image/*', f => use(row.dataset.text, f), 'file'); });
  q('.dgp-rows').addEventListener('dragover', e => { if (e.target.closest('.dgp-row')) { e.preventDefault(); e.stopPropagation(); } });
  q('.dgp-rows').addEventListener('drop', e => { const row = e.target.closest('.dgp-row'); if (!row) return; e.preventDefault(); e.stopPropagation(); use(row.dataset.text, e.dataTransfer.files[0]); });
  q('.dgp-rows').addEventListener('paste', e => { const row = e.target.closest('.dgp-row'); const f = [...(e.clipboardData?.files || [])][0]; if (row && f) { e.preventDefault(); use(row.dataset.text, f); } });
  q('.dgp-fit').addEventListener('change', e => blocks.setDiagram(b.id, { picFit: e.target.value === 'contain' ? null : e.target.value }));
  q('.dgp-only').addEventListener('change', e => blocks.setDiagram(b.id, { picOnly: e.target.checked || null }));
  const close = () => back.remove();
  q('.modal-close').addEventListener('click', close); q('.dgp-ok').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  rows();
}
