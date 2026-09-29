// Brand kit dialog (Design ▸ Brand kit): the kits kept in this browser, each with
// its colours, fonts and logos; apply one, edit it, save it as a file to share
// with the team, read one from a file, or start one from this presentation.

import { esc } from '../../core/text.js';
import { listKits, saveKit, deleteKit, kitFromDeck, applyKit, kitFile, kitFromFile, cleanKit } from '../../features/design/brandkit.js';
import { FONTS, ensureFont } from '../../features/design/fonts.js';
import { readFile } from '../shell/openfile.js';
import { alertDialog, confirmDialog } from './dialog.js';
import { t } from '../../i18n/index.js';

const ROLES = ['Fondo', 'Texto', 'Acento 1', 'Acento 2', 'Acento 3', 'Acento 4', 'Acento 5', 'Acento 6'];

export function openBrandKit() {
  document.getElementById('bk-modal')?.remove();
  const back = document.createElement('div');
  back.id = 'bk-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal bk" style="text-align:start;width:min(560px,94vw);max-width:none;box-sizing:border-box">
    <button class="modal-close">✕</button><h3>${t('Kit de marca')}</h3>
    <p class="host-help">${t('Los colores, las fuentes y el logotipo de tu centro o empresa, para aplicarlos con un clic. Se guardan en este navegador; guárdalos como archivo para compartirlos con tu equipo.')}</p>
    <div class="bk-list"></div>
    <div class="fr-actions" style="justify-content:flex-start;flex-wrap:wrap">
      <button type="button" class="fr-do bk-new">${t('Nuevo desde esta presentación')}</button>
      <button type="button" class="mini2 bk-import">${t('Abrir un kit (.json)')}</button></div>
    <div class="bk-edit" hidden></div></div>`;
  document.body.appendChild(back);
  const q = s => back.querySelector(s), close = () => back.remove();
  q('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });

  function list() {
    const kits = listKits();
    q('.bk-list').innerHTML = kits.length ? kits.map(k => `<div class="bk-kit" data-id="${esc(k.id)}">
        <div class="bk-sw">${k.colors.map(c => `<i style="background:${c}" title="${c}"></i>`).join('')}${k.logos.map(l => `<img src="${esc(l)}" alt="">`).join('')}</div>
        <b>${esc(k.name)}</b><small>${esc([k.fonts.heading, k.fonts.body].filter(Boolean).join(' · '))}</small>
        <span class="bk-acts"><button type="button" class="fr-do" data-a="apply">${t('Aplicar')}</button><button type="button" class="mini2" data-a="edit">${t('Editar')}</button>
        <button type="button" class="mini2" data-a="file" title="${t('Guardar como archivo')}"><i class="ms">download</i></button><button type="button" class="mini2" data-a="del" title="${t('Borrar')}"><i class="ms">delete</i></button></span></div>`).join('')
      : `<p class="host-help">${t('Aún no tienes ningún kit.')}</p>`;
  }
  q('.bk-list').addEventListener('click', async e => {
    const a = e.target.closest('[data-a]')?.dataset.a, id = e.target.closest('.bk-kit')?.dataset.id; if (!a || !id) return;
    const k = listKits().find(x => x.id === id); if (!k) return;
    if (a === 'apply') { applyKit(k); close(); }
    else if (a === 'edit') edit(k);
    else if (a === 'file') { const u = URL.createObjectURL(kitFile(k)), l = document.createElement('a'); l.href = u; l.download = (k.name || 'kit').replace(/[^\w\-áéíóúñü ]+/gi, '') + '.json'; l.click(); setTimeout(() => URL.revokeObjectURL(u), 1000); }
    else if (a === 'del' && await confirmDialog(t('¿Borrar el kit «{n}»?').replace('{n}', k.name))) { deleteKit(id); list(); }
  });
  q('.bk-new').addEventListener('click', () => edit(kitFromDeck()));
  q('.bk-import').addEventListener('click', () => readFile('.json,application/json', txt => {
    const k = kitFromFile(txt); if (!k) { alertDialog(t('Ese archivo no es un kit de marca.')); return; }
    saveKit(k); list();
  }, 'text'));

  // Editing one: name, the eight colours by role, two fonts, up to four logos.
  function edit(kit) {
    const k = structuredClone(kit), box = q('.bk-edit'); box.hidden = false;
    const fonts = FONTS.filter(f => f.stack).map(f => `<option${f.name === k.fonts.heading ? ' selected' : ''}>${esc(f.name)}</option>`).join('');
    const fontsB = FONTS.filter(f => f.stack).map(f => `<option${f.name === k.fonts.body ? ' selected' : ''}>${esc(f.name)}</option>`).join('');
    box.innerHTML = `<fieldset><legend>${t('Kit')}</legend>
      <label class="fr-l">${t('Nombre')}<input type="text" class="bk-name" maxlength="60" value="${esc(k.name)}"></label>
      <div class="bk-cols">${ROLES.map((r, i) => `<label>${t(r)}<input type="color" data-i="${i}" value="${k.colors[i] || '#888888'}"></label>`).join('')}</div>
      <label class="fr-l">${t('Fuente de los títulos')}<select class="bk-fh"><option value="">—</option>${fonts}</select></label>
      <label class="fr-l">${t('Fuente del texto')}<select class="bk-fb"><option value="">—</option>${fontsB}</select></label>
      <div class="bk-logos"></div><button type="button" class="mini2 bk-addlogo">${t('Añadir logotipo')}</button>
      <div class="fr-actions"><button type="button" class="mini2 bk-cancel">${t('Cancelar')}</button><button type="button" class="fr-do bk-save">${t('Guardar')}</button></div></fieldset>`;
    const logos = () => { box.querySelector('.bk-logos').innerHTML = k.logos.map((l, i) => `<span><img src="${esc(l)}" alt=""><button type="button" data-rm="${i}" title="${t('Quitar')}">✕</button></span>`).join(''); };
    logos();
    box.querySelector('.bk-logos').addEventListener('click', e => { const i = e.target.dataset.rm; if (i != null) { k.logos.splice(+i, 1); logos(); } });
    box.querySelector('.bk-addlogo').addEventListener('click', () => readFile('image/*', src => { if (k.logos.length < 4) { k.logos.push(src); logos(); } }));
    box.querySelector('.bk-cancel').addEventListener('click', () => { box.hidden = true; box.innerHTML = ''; });
    box.querySelector('.bk-save').addEventListener('click', () => {
      k.name = box.querySelector('.bk-name').value.trim() || t('Mi marca');
      k.colors = [...box.querySelectorAll('.bk-cols input')].map(x => x.value);
      k.fonts = { heading: box.querySelector('.bk-fh').value, body: box.querySelector('.bk-fb').value };
      [k.fonts.heading, k.fonts.body].forEach(n => { const f = FONTS.find(x => x.name === n); if (f) ensureFont(f.stack); });
      if (!cleanKit(k) || !saveKit(k)) { alertDialog(t('No se pudo guardar el kit (¿logotipos demasiado grandes?).')); return; }
      box.hidden = true; box.innerHTML = ''; list();
    });
    box.scrollIntoView?.({ block: 'nearest' });
  }
  list();
}
