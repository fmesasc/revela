// "Recursos": free elements to add to the slide, like Canva's — animated GIFs,
// animated stickers, 3D models (animated library, Poly Haven, Sketchfab).
// Searches that reach a service ask once for consent (stock.js).

import * as R from '../../features/content/resources.js';
import { consented, giveConsent } from '../../features/content/stock.js';
import { t } from '../../i18n/index.js';
import { alertDialog, confirmDialog } from './dialog.js';

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const TABS = [
  ['gif', 'GIF animados', 'Openverse (openverse.org)'],
  ['stickers', 'Stickers animados', null],
  ['anim3d', '3D con movimiento', null],
  ['poly', 'Modelos 3D', 'Poly Haven (polyhaven.com)'],
  ['sketchfab', 'Sketchfab', 'Sketchfab (sketchfab.com)'],
];
const HELP = {
  gif: 'GIF animados con licencias libres (Wikimedia y otros). Se añade la atribución como pie: mantenla si la licencia lo pide.',
  stickers: 'Emojis animados de Google (Noto, CC BY 4.0). Se pueden animar por tramos y quitar el fondo como cualquier GIF.',
  anim3d: 'Modelos 3D con licencia libre, varios con animaciones propias (andar, bailar…). Se guardan dentro de la presentación. Muévelos con clic derecho ▸ Movimiento 3D.',
  poly: 'Más de 500 modelos 3D de Poly Haven, de dominio público (CC0). Se guardan dentro de la presentación.',
  sketchfab: 'Millones de modelos 3D de Sketchfab, muchos animados. Se muestran con el visor de Sketchfab (necesita internet al presentar).',
};

async function consent(svc, name) {
  if (!name || consented(svc)) return true;
  const ok = await confirmDialog(t('La búsqueda se envía a {s}. Solo se envían las palabras que escribas, nada de tu presentación. ¿Continuar?').replace('{s}', name));
  if (ok) giveConsent(svc); return ok;
}

export function openResources(tab = 'gif') {
  document.getElementById('res-modal')?.remove();
  const back = document.createElement('div'); back.id = 'res-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal res" style="text-align:start;width:min(900px,96vw);max-width:96vw">
    <button class="modal-close">✕</button><h3>${t('Recursos')}</h3>
    <div class="res-tabs" role="tablist">${TABS.map(([k, l]) => `<button type="button" role="tab" data-tab="${k}">${t(l)}</button>`).join('')}</div>
    <div class="sk-bar"><input type="search" class="sk-q" placeholder="${t('Buscar…')}"><label class="fr-chk res-anim" hidden><input type="checkbox" class="res-onlyanim"> ${t('Solo animados')}</label><button class="fr-do sk-go">${t('Buscar')}</button></div>
    <p class="host-help res-help"></p><div class="sk-grid res-grid"></div><div class="fr-actions"><span></span><button class="mini2 sk-more" hidden>${t('Más resultados')}</button></div></div>`;
  document.body.appendChild(back);
  const q = s => back.querySelector(s);
  const close = () => back.remove();
  q('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  let cur = tab, page = 1, cursor = null;

  const item = (thumb, title, badge, onPick) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'sk-item'; b.title = title;
    b.innerHTML = `<img loading="lazy" src="${esc(thumb)}" alt="${esc(title)}" referrerpolicy="no-referrer"><span>${esc(badge || title)}</span>`;
    b.addEventListener('click', async () => {
      b.disabled = true; b.classList.add('busy');
      try { await onPick(); close(); } catch (e) { b.disabled = false; b.classList.remove('busy'); alertDialog(t('No se pudo añadir: ') + (e.message || e)); }
    });
    q('.res-grid').appendChild(b);
  };
  const run = async (more = false) => {
    const term = q('.sk-q').value.trim();
    const svc = TABS.find(x => x[0] === cur);
    if (!(await consent(cur, svc[2]))) return;
    if (!more) { q('.res-grid').innerHTML = ''; page = 1; cursor = null; } else page++;
    q('.sk-go').disabled = true; q('.sk-more').hidden = true;
    try {
      if (cur === 'gif') {
        if (!term) { q('.res-grid').innerHTML = `<p class="host-help">${t('Escribe qué buscas (en inglés hay más resultados).')}</p>`; return; }
        const res = await R.searchGifs(term, page);
        res.forEach(g => item(g.thumb, `${g.title} — ${g.creator} (${g.license})`, g.license, () => R.insertGif(g)));
        q('.sk-more').hidden = res.length < 20;
      } else if (cur === 'stickers') {
        R.searchStickers(term).forEach(s => item(s.thumb, s.words, s.words.split(' ')[0], () => R.insertSticker(s.code, s.words)));
      } else if (cur === 'anim3d') {
        R.searchLibrary3D(term, { animated: q('.res-onlyanim').checked }).forEach(m => item(m.thumb, `${m.label} — ${m.credit}`, `${m.animated ? '▶ ' : ''}${m.label}`, () => R.insertLibraryModel(m)));
      } else if (cur === 'poly') {
        (await R.searchPolyHaven(term)).slice(0, 120).forEach(a => item(a.thumb, `${a.name} (CC0)`, a.name, () => R.insertPolyHaven(a)));
      } else if (cur === 'sketchfab') {
        if (!term) { q('.res-grid').innerHTML = `<p class="host-help">${t('Escribe qué buscas (en inglés hay más resultados).')}</p>`; return; }
        const r = await R.searchSketchfab(term, { animated: q('.res-onlyanim').checked, cursor: more ? cursor : null });
        cursor = r.next;
        r.results.forEach(m => item(m.thumb, `${m.name} — ${m.user} (${m.license})`, `${m.animated ? '▶ ' : ''}${m.name}`, () => R.insertSketchfab(m)));
        q('.sk-more').hidden = !cursor;
      }
      if (!q('.res-grid').children.length) q('.res-grid').innerHTML = `<p class="host-help">${t('Sin resultados.')}</p>`;
    } catch (e) { alertDialog(t('No se pudo buscar: ') + (e.message || e)); }
    finally { q('.sk-go').disabled = false; }
  };
  const show = k => {
    cur = k;
    back.querySelectorAll('.res-tabs [data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === k)));
    q('.res-help').textContent = t(HELP[k]);
    q('.res-anim').hidden = !(k === 'anim3d' || k === 'sketchfab');
    q('.res-grid').innerHTML = '';
    if (k === 'stickers' || k === 'anim3d' || (k === 'poly' && consented('poly'))) run();          // browsable without typing
    q('.sk-q').focus();
  };
  back.querySelector('.res-tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) show(b.dataset.tab); });
  q('.sk-go').addEventListener('click', () => run());
  q('.sk-q').addEventListener('keydown', e => { if (e.key === 'Enter') run(); });
  q('.res-onlyanim').addEventListener('change', () => run());
  q('.sk-more').addEventListener('click', () => run(true));
  show(tab);
}
