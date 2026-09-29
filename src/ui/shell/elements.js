// "Elementos": a side panel like Canva's, to search free images, icons, GIFs,
// stickers and 3D models while seeing the slide. It stays open (keep adding),
// docks on the left or the right (remembered), a click adds to the slide and
// dragging a result onto the slide drops it there.
// Searches that reach a service ask once for consent (stock.js).

import { state, currentSlide, amend } from '../../core/store.js';
import * as R from '../../features/content/resources.js';
import { searchImages, insertStockImage, searchIcons, iconPreview, insertOnlineIcon, consented, giveConsent } from '../../features/content/stock.js';
import { deckFg } from '../../features/design/palettes.js';
import { factor } from '../canvas/interact.js';
import { fitZoom } from '../ribbon/zoom.js';
import { alertDialog, confirmDialog } from '../dialogs/dialog.js';
import { t } from '../../i18n/index.js';

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
// key, label, icon, service (for consent: its key and name; null = nothing leaves the browser)
const TABS = [
  ['images', 'Imágenes', 'image', 'openverse', 'Openverse (openverse.org)'],
  ['icons', 'Iconos', 'interests', 'iconify', 'Iconify (iconify.design)'],
  ['gif', 'GIF', 'gif_box', 'gif', 'Openverse (openverse.org)'],
  ['stickers', 'Stickers', 'add_reaction', null, null],
  ['anim3d', '3D con movimiento', 'view_in_ar', null, null],
  ['poly', 'Modelos 3D', 'deployed_code', 'poly', 'Poly Haven (polyhaven.com)'],
  ['sketchfab', 'Sketchfab', 'travel_explore', 'sketchfab', 'Sketchfab (sketchfab.com)'],
];
const HELP = {
  images: 'Imágenes con licencias libres de Openverse. Se añade la atribución como pie de foto: mantenla si la licencia lo pide.',
  icons: 'Más de 200 000 iconos de colecciones libres (Material, Tabler, Font Awesome…) vía Iconify.',
  gif: 'GIF animados con licencias libres (Wikimedia y otros). Se añade la atribución como pie: mantenla si la licencia lo pide.',
  stickers: 'Emojis animados de Google (Noto, CC BY 4.0). Se pueden animar por tramos y quitar el fondo como cualquier GIF.',
  anim3d: 'Modelos 3D con licencia libre, varios con animaciones propias (andar, bailar…). Se guardan dentro de la presentación. Muévelos con clic derecho ▸ Movimiento 3D.',
  poly: 'Más de 500 modelos 3D de Poly Haven, de dominio público (CC0). Se guardan dentro de la presentación.',
  sketchfab: 'Millones de modelos 3D de Sketchfab, muchos animados. Se muestran con el visor de Sketchfab (necesita internet al presentar).',
};
const TYPING = new Set(['images', 'icons', 'gif', 'sketchfab']);          // need words to search
const DRAG = 'application/x-revela-element';

const SIDE = 'revela.elements.side';
export const elementsSide = () => { try { return localStorage.getItem(SIDE) === 'right' ? 'right' : 'left'; } catch { return 'left'; } };
export const elementsOpen = () => !!document.getElementById('elements-panel');

async function consent(svc, name) {
  if (!svc || consented(svc)) return true;
  const ok = await confirmDialog(t('La búsqueda se envía a {s}. Solo se envían las palabras que escribas, nada de tu presentación. ¿Continuar?').replace('{s}', name));
  if (ok) giveConsent(svc); return ok;
}

let panel = null, cur = 'images', picks = [], dropReady = false;
const q = s => panel.querySelector(s);

// Where the panel goes in the editor: next to the thumbnails, or at the far side.
function dock(side) {
  const main = document.querySelector('main');
  panel.classList.toggle('right', side === 'right');
  if (side === 'right') main.appendChild(panel);
  else main.insertBefore(panel, document.getElementById('canvas-wrap'));
}
export function setElementsSide(side) {
  try { localStorage.setItem(SIDE, side); } catch {}
  if (panel) dock(side);
}

export function closeElements() { if (!panel) return; panel.remove(); panel = null; fitZoom(); }
// Open the panel (on a tab); the same tab again closes it, like a toggle.
export function openElements(tab = cur) {
  if (panel && tab === cur) { closeElements(); return; }
  if (!panel) { build(); fitZoom(); }                // the slide makes room for the panel
  show(tab);
}

function build() {
  panel = document.createElement('aside'); panel.id = 'elements-panel'; panel.setAttribute('aria-label', t('Recursos'));
  panel.innerHTML = `<div class="cm-head"><b><i class="ms">interests</i> ${t('Recursos')}</b><span>
      <button type="button" class="el-side mini2" title="${t('Pasar al otro lado')}"><i class="ms">swap_horiz</i></button>
      <button type="button" class="cm-close" title="${t('Cerrar')}">✕</button></span></div>
    <div class="el-tabs" role="tablist">${TABS.map(([k, l, i]) => `<button type="button" role="tab" data-et="${k}" title="${t(l)}"><i class="ms">${i}</i><span>${t(l)}</span></button>`).join('')}</div>
    <div class="sk-bar"><input type="search" class="sk-q" placeholder="${t('Buscar…')}"><button type="button" class="fr-do sk-go" title="${t('Buscar')}"><i class="ms">search</i></button></div>
    <div class="el-opts">
      <label class="fr-chk el-com"><input type="checkbox" class="el-comm"> ${t('Uso comercial')}</label>
      <label class="fr-chk el-anim"><input type="checkbox" class="el-onlyanim"> ${t('Solo animados')}</label>
      <label class="el-col" title="${t('Color')}">${t('Color')} <input type="color" class="el-color" value="${/^#[0-9a-f]{6}$/i.test(deckFg()) ? deckFg() : '#ffffff'}"></label></div>
    <p class="host-help el-help"></p>
    <div class="el-grid" aria-live="polite"></div>
    <div class="el-foot"><span class="el-tip">${t('Clic: añadir a la diapositiva · Arrastrar: soltar donde quieras')}</span><button type="button" class="mini2 sk-more" hidden>${t('Más resultados')}</button></div>`;
  dock(elementsSide());
  q('.cm-close').addEventListener('click', closeElements);
  q('.el-side').addEventListener('click', () => setElementsSide(elementsSide() === 'left' ? 'right' : 'left'));
  q('.el-tabs').addEventListener('click', e => { const b = e.target.closest('[data-et]'); if (b) show(b.dataset.et); });
  q('.sk-go').addEventListener('click', () => run());
  q('.sk-q').addEventListener('keydown', e => { if (e.key === 'Enter') run(); if (e.key === 'Escape') closeElements(); });
  q('.el-onlyanim').addEventListener('change', () => run());
  q('.el-comm').addEventListener('change', () => q('.sk-q').value.trim() && run());
  q('.el-color').addEventListener('change', () => cur === 'icons' && q('.sk-q').value.trim() && run());
  q('.sk-more').addEventListener('click', () => run(true));
  initDrop();
}

let terms = {}, page = 1, cursor = null;
function show(tab) {
  if (cur !== tab) terms[cur] = q('.sk-q').value;
  cur = tab;
  panel.querySelectorAll('.el-tabs [data-et]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.et === tab)));
  q('.el-help').textContent = t(HELP[tab]);
  q('.el-com').hidden = tab !== 'images';
  q('.el-anim').hidden = !(tab === 'anim3d' || tab === 'sketchfab');
  q('.el-col').hidden = tab !== 'icons';
  q('.el-grid').className = 'el-grid' + (tab === 'icons' || tab === 'stickers' ? ' small' : '');
  q('.sk-q').value = terms[tab] || '';
  q('.el-grid').innerHTML = ''; q('.sk-more').hidden = true; q('.sk-go').disabled = false; picks = [];
  const svc = TABS.find(x => x[0] === tab);
  if (q('.sk-q').value.trim() || !TYPING.has(tab) && (!svc[3] || consented(svc[3]))) run();          // browsable without typing
  else if (TYPING.has(tab)) q('.el-grid').innerHTML = `<p class="host-help">${t('Escribe qué buscas (en inglés hay más resultados).')}</p>`;
  q('.sk-q').focus();
}

// One result: click adds it; dragging it onto the slide drops it there.
function item(thumb, title, badge, pick) {
  const i = picks.push(pick) - 1;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'sk-item'; b.title = title; b.draggable = true;
  b.innerHTML = `<img loading="lazy" src="${esc(thumb)}" alt="${esc(title)}" referrerpolicy="no-referrer" draggable="false">${badge ? `<span>${esc(badge)}</span>` : ''}`;
  b.addEventListener('click', () => add(b, pick));
  b.addEventListener('dragstart', e => { e.dataTransfer.setData(DRAG, String(i)); e.dataTransfer.effectAllowed = 'copy'; });
  q('.el-grid').appendChild(b);
}
async function add(b, pick, at = null) {
  if (!currentSlide()) return;
  b.disabled = true; b.classList.add('busy');
  try {
    const block = await pick();
    if (at && block) amend(() => {                 // the same undo step as adding it
      const x = currentSlide().blocks.find(o => o.id === block.id); if (!x) return;
      const { w, h } = state.deck.size;
      x.x = Math.round(Math.min(Math.max(at[0] - x.w / 2, -x.w / 2), w - x.w / 2));
      x.y = Math.round(Math.min(Math.max(at[1] - x.h / 2, -x.h / 2), h - x.h / 2));
    });
  } catch (e) { alertDialog(t('No se pudo añadir: ') + (e.message || e)); }
  finally { b.disabled = false; b.classList.remove('busy'); }
}

function initDrop() {
  if (dropReady) return; dropReady = true;
  const stage = document.getElementById('stage');
  const ours = e => panel && [...(e.dataTransfer?.types || [])].includes(DRAG);
  stage.addEventListener('dragover', e => { if (ours(e)) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; stage.classList.add('el-drop'); } });
  stage.addEventListener('dragleave', () => stage.classList.remove('el-drop'));
  stage.addEventListener('drop', e => {
    stage.classList.remove('el-drop');
    if (!ours(e)) return;
    e.preventDefault();
    const i = +e.dataTransfer.getData(DRAG), pick = picks[i], b = q('.el-grid').children[i]; if (!pick) return;
    const r = stage.getBoundingClientRect(), k = factor();
    add(b || document.createElement('button'), pick, [(e.clientX - r.left) * k, (e.clientY - r.top) * k]);
  });
}

let runs = 0;
async function run(more = false) {
  if (!panel) return;
  const tab = cur, term = q('.sk-q').value.trim(), svc = TABS.find(x => x[0] === tab);
  if (TYPING.has(tab) && !term) return;
  if (!(await consent(svc[3], svc[4]))) return;
  const id = ++runs;
  if (!more) { page = 1; cursor = null; } else page++;
  q('.sk-go').disabled = true; q('.sk-more').hidden = true;
  let list = [], full = false;                     // [thumb, title, badge, pick]; full: there may be more
  try {
    if (tab === 'images') {
      const res = await searchImages(term, page, { commercial: q('.el-comm').checked }); full = res.length >= 20;
      list = res.map(img => [img.thumb, `${img.title} — ${img.creator} (${img.license})`, img.license, () => insertStockImage(img)]);
    } else if (tab === 'icons') {
      const { icons, collections } = await searchIcons(term), col = q('.el-color').value;
      list = icons.map(name => { const c = collections[name.split(':')[0]];
        return [iconPreview(name, col), `${name}${c ? ' — ' + c.name + ' (' + c.license?.title + ')' : ''}`, '', () => insertOnlineIcon(name, panel ? q('.el-color').value : col, c?.license)]; });
    } else if (tab === 'gif') {
      const res = await R.searchGifs(term, page); full = res.length >= 20;
      list = res.map(g => [g.thumb, `${g.title} — ${g.creator} (${g.license})`, g.license, () => R.insertGif(g)]);
    } else if (tab === 'stickers') {
      list = R.searchStickers(term).map(s => [s.thumb, s.words, '', () => R.insertSticker(s.code, s.words)]);
    } else if (tab === 'anim3d') {
      list = R.searchLibrary3D(term, { animated: q('.el-onlyanim').checked }).map(m => [m.thumb, `${m.label} — ${m.credit}`, `${m.animated ? '▶ ' : ''}${m.label}`, () => R.insertLibraryModel(m)]);
    } else if (tab === 'poly') {
      list = (await R.searchPolyHaven(term)).slice(0, 120).map(a => [a.thumb, `${a.name} (CC0)`, a.name, () => R.insertPolyHaven(a)]);
    } else if (tab === 'sketchfab') {
      const r = await R.searchSketchfab(term, { animated: q('.el-onlyanim').checked, cursor: more ? cursor : null });
      cursor = r.next; full = !!cursor;
      list = r.results.map(m => [m.thumb, `${m.name} — ${m.user} (${m.license})`, `${m.animated ? '▶ ' : ''}${m.name}`, () => R.insertSketchfab(m)]);
    }
  } catch (e) { if (id === runs) alertDialog(t('No se pudo buscar: ') + (e.message || e)); }
  if (!panel || id !== runs || cur !== tab) return;                 // a newer search (or another tab) wins
  q('.sk-go').disabled = false;
  if (!more) { q('.el-grid').innerHTML = ''; picks = []; }
  // Light icons on a dark tile (and dark ones on a light tile), so they can be seen.
  const c = q('.el-color').value, lum = (parseInt(c.slice(1, 3), 16) * 299 + parseInt(c.slice(3, 5), 16) * 587 + parseInt(c.slice(5, 7), 16) * 114) / 255000;
  q('.el-grid').classList.toggle('dark', tab === 'icons' && lum > 0.6);
  list.forEach(x => item(...x));
  q('.sk-more').hidden = !full;
  if (!q('.el-grid').children.length) q('.el-grid').innerHTML = `<p class="host-help">${t('Sin resultados.')}</p>`;
}
