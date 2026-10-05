// Attachments for a request to the AI (the assistant, the theme editor): a paperclip to choose files,
// files dropped on the area or pictures pasted into its text, shown as chips that can be removed.
// Read with features/ai/attach.js; nothing leaves the browser until the request is sent.

import { readAttachment, ATTACH, ATTACH_ACCEPT } from '../../features/ai/attach.js';
import { toast } from './toast.js';
import { t } from '../../i18n/index.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const ERR = { ATTACH_TYPE: 'Ese tipo de archivo no se puede adjuntar: fotos, PDF o textos.', ATTACH_BIG: 'El archivo es demasiado grande (25 MB como mucho).' };

// → { chips (the element to place), button (the paperclip), list(), clear(), add(files), busy() }
// zone: where files may be dropped; input: a text field where pictures may be pasted; onChange().
export function attachments({ zone = null, input = null, onChange = () => {} } = {}) {
  const items = [];
  let reading = 0;
  const chips = document.createElement('div'); chips.className = 'att-chips'; chips.hidden = true;
  const button = Object.assign(document.createElement('button'), { type: 'button', className: 'att-clip', title: t('Adjuntar fotos o documentos (PDF, textos): la IA los lee'),
    innerHTML: '<i class="ms">attach_file</i>' });
  button.setAttribute('aria-label', t('Adjuntar fotos o documentos'));
  const paint = () => {
    chips.hidden = !items.length && !reading;
    chips.innerHTML = items.map((a, i) => `<span class="att-chip">${a.kind === 'image' ? `<img src="${a.url}" alt="">` : '<i class="ms">description</i>'}<b>${esc(a.name)}</b>`
      + `<button type="button" data-rm="${i}" aria-label="${esc(t('Quitar'))} ${esc(a.name)}">✕</button></span>`).join('')
      + (reading ? `<span class="att-chip"><span class="btn-spin"></span>${esc(t('Leyendo…'))}</span>` : '');
    onChange();
  };
  chips.addEventListener('click', e => { const i = e.target.closest('[data-rm]')?.dataset.rm; if (i != null) { items.splice(+i, 1); paint(); } });
  async function add(files) {
    for (const f of [...files]) {
      if (items.length >= ATTACH.count) { toast(t('Como mucho {n} adjuntos.').replace('{n}', ATTACH.count)); break; }
      reading++; paint();
      try { items.push(...(await readAttachment(f)).slice(0, ATTACH.count - items.length)); }
      catch (e) { toast(t(ERR[e.message] || 'No se pudo leer «{n}».').replace('{n}', f.name), { error: true }); }
      finally { reading--; paint(); }
    }
  }
  button.addEventListener('click', () => {
    const inp = Object.assign(document.createElement('input'), { type: 'file', multiple: true, accept: ATTACH_ACCEPT });
    inp.addEventListener('change', () => add(inp.files)); inp.click();
  });
  if (zone) {
    zone.addEventListener('dragover', e => { if ([...(e.dataTransfer?.types || [])].includes('Files')) { e.preventDefault(); zone.classList.add('att-over'); } });
    zone.addEventListener('dragleave', e => { if (!zone.contains(e.relatedTarget)) zone.classList.remove('att-over'); });
    zone.addEventListener('drop', e => { if (!e.dataTransfer?.files?.length) return; e.preventDefault(); e.stopPropagation(); zone.classList.remove('att-over'); add(e.dataTransfer.files); });
  }
  input?.addEventListener('paste', e => {
    const files = [...(e.clipboardData?.files || [])]; if (!files.length) return;
    e.preventDefault(); add(files);
  });
  return { chips, button, add, list: () => items.slice(), busy: () => reading > 0, clear: () => { items.length = 0; paint(); } };
}
