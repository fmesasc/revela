// Search dialogs for Openverse images and Iconify icons (with consent).

import { searchImages, insertStockImage, searchIcons, iconPreview, insertOnlineIcon, consented, giveConsent } from '../../features/content/stock.js';
import { deckFg } from '../../features/design/palettes.js';
import { confirmDialog, alertDialog } from './dialog.js';
import { t } from '../../i18n/index.js';

async function consent(svc, name) {
  if (consented(svc)) return true;
  const ok = await confirmDialog(t('La búsqueda se envía a {s}. Solo se envían las palabras que escribas, nada de tu presentación. ¿Continuar?').replace('{s}', name));
  if (ok) giveConsent(svc); return ok;
}
function modal(id, title, body) {
  document.getElementById(id)?.remove();
  const back = document.createElement('div'); back.id = id; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;width:min(820px,94vw);max-width:94vw"><button class="modal-close">✕</button><h3>${title}</h3>${body}</div>`;
  document.body.appendChild(back);
  back.querySelector('.modal-close').addEventListener('click', () => back.remove());
  back.addEventListener('click', e => { if (e.target === back) back.remove(); });
  return back;
}
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

export async function openStockImages() {
  if (!(await consent('openverse', 'Openverse (openverse.org)'))) return;
  const back = modal('stock-modal', t('Imágenes libres en línea'), `
    <div class="sk-bar"><input type="search" class="sk-q" placeholder="${t('Buscar imágenes…')}"><label class="fr-chk"><input type="checkbox" class="sk-com"> ${t('Uso comercial')}</label><button class="fr-do sk-go">${t('Buscar')}</button></div>
    <p class="host-help">${t('Imágenes con licencias libres de Openverse. Se añade la atribución como pie de foto: mantenla si la licencia lo pide.')}</p>
    <div class="sk-grid"></div><div class="fr-actions"><button class="sk-more" hidden>${t('Más resultados')}</button></div>`);
  const q = s => back.querySelector(s); let page = 1, term = '';
  const run = async (more = false) => {
    if (!more) { term = q('.sk-q').value.trim(); page = 1; q('.sk-grid').innerHTML = ''; } else page++;
    if (!term) return;
    q('.sk-go').disabled = true;
    try {
      const res = await searchImages(term, page, { commercial: q('.sk-com').checked });
      if (!res.length && page === 1) q('.sk-grid').innerHTML = `<p class="host-help">${t('Sin resultados.')}</p>`;
      for (const img of res) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'sk-item'; b.title = `${img.title} — ${img.creator} (${img.license})`;
        b.innerHTML = `<img loading="lazy" src="${esc(img.thumb)}" alt="${esc(img.title)}"><span>${esc(img.license)}</span>`;
        b.addEventListener('click', async () => {
          b.disabled = true;
          try { await insertStockImage(img); back.remove(); } catch (e) { b.disabled = false; alertDialog(t('No se pudo descargar la imagen: ') + e.message); }
        });
        q('.sk-grid').appendChild(b);
      }
      q('.sk-more').hidden = res.length < 20;
    } catch (e) { alertDialog(t('No se pudo buscar: ') + e.message); }
    finally { q('.sk-go').disabled = false; }
  };
  q('.sk-go').addEventListener('click', () => run());
  q('.sk-q').addEventListener('keydown', e => { if (e.key === 'Enter') run(); });
  q('.sk-more').addEventListener('click', () => run(true));
  q('.sk-q').focus();
}

export async function openOnlineIcons() {
  if (!(await consent('iconify', 'Iconify (iconify.design)'))) return;
  const back = modal('icons-modal', t('Iconos en línea'), `
    <div class="sk-bar"><input type="search" class="sk-q" placeholder="${t('Buscar iconos (en inglés funciona mejor)…')}">
      <label class="color" title="${t('Color')}"><input type="color" class="sk-col" value="${/^#[0-9a-f]{6}$/i.test(deckFg()) ? deckFg() : '#ffffff'}"></label><button class="fr-do sk-go">${t('Buscar')}</button></div>
    <p class="host-help">${t('Más de 200 000 iconos de colecciones libres (Material, Tabler, Font Awesome…) vía Iconify.')}</p>
    <div class="sk-grid icons"></div>`);
  const q = s => back.querySelector(s);
  const run = async () => {
    const term = q('.sk-q').value.trim(); if (!term) return;
    q('.sk-grid').innerHTML = '';
    try {
      const { icons, collections } = await searchIcons(term);
      if (!icons.length) q('.sk-grid').innerHTML = `<p class="host-help">${t('Sin resultados.')}</p>`;
      for (const name of icons) {
        const col = collections[name.split(':')[0]];
        const b = document.createElement('button'); b.type = 'button'; b.className = 'sk-item'; b.title = `${name}${col ? ' — ' + col.name + ' (' + col.license?.title + ')' : ''}`;
        b.innerHTML = `<img loading="lazy" src="${esc(iconPreview(name))}" alt="${esc(name)}">`;
        b.addEventListener('click', async () => {
          try { await insertOnlineIcon(name, q('.sk-col').value, col?.license); back.remove(); } catch (e) { alertDialog(t('No se pudo buscar: ') + e.message); }
        });
        q('.sk-grid').appendChild(b);
      }
    } catch (e) { alertDialog(t('No se pudo buscar: ') + e.message); }
  };
  q('.sk-go').addEventListener('click', run);
  q('.sk-q').addEventListener('keydown', e => { if (e.key === 'Enter') run(); });
  q('.sk-q').focus();
}
