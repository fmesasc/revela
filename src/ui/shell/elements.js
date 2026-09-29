// "Elementos": a side panel like Canva's, to search free images, icons, GIFs,
// stickers and 3D models while seeing the slide. It stays open (keep adding),
// docks on the left or the right (remembered), a click adds to the slide and
// dragging a result onto the slide drops it there.
// Searches that reach a service ask once for consent (stock.js).

import { esc } from '../../core/text.js';
import { state, currentSlide, amend } from '../../core/store.js';
import * as R from '../../features/content/resources.js';
import { searchImages, insertStockImage, hasTransparentBackground, searchIcons, iconPreview, insertOnlineIcon, consented, giveConsent } from '../../features/content/stock.js';
import { removeBackground } from '../dialogs/object.js';
import { deckFg } from '../../features/design/palettes.js';
import { factor } from '../canvas/interact.js';
import { fitZoom } from '../ribbon/zoom.js';
import { alertDialog, confirmDialog } from '../dialogs/dialog.js';
import { t } from '../../i18n/index.js';

// key, label, icon, service (for consent: its key and name; null = nothing leaves the browser)
const TABS = [
  ['images', 'Imágenes', 'image', 'openverse', 'Openverse (openverse.org)'],
  ['icons', 'Iconos', 'interests', 'iconify', 'Iconify (iconify.design)'],
  ['gif', 'GIF', 'gif_box', 'gif', 'Openverse (openverse.org)'],
  ['stickers', 'Stickers', 'add_reaction', null, null],
  ['anim3d', '3D con movimiento', 'view_in_ar', null, null],
  ['poly', 'Modelos 3D', 'deployed_code', 'poly', 'Poly Haven (polyhaven.com)'],
  ['nasa', 'NASA', 'rocket_launch', null, null],
  ['commons3d', 'Museos y ciencia', 'museum', 'commons3d', 'Wikimedia Commons (commons.wikimedia.org)'],
  ['sketchfab', 'Sketchfab', 'travel_explore', 'sketchfab', 'Sketchfab (sketchfab.com)'],
];
const HELP = {
  images: 'Imágenes con licencias libres de Openverse. Se añade la atribución como pie de foto: mantenla si la licencia lo pide.',
  icons: 'Más de 200 000 iconos de colecciones libres (Material, Tabler, Font Awesome…) vía Iconify.',
  gif: 'GIF animados con licencias libres (Wikimedia y otros). Se añade la atribución como pie: mantenla si la licencia lo pide.',
  stickers: 'Emojis animados de Google (Noto, CC BY 4.0). Se pueden animar por tramos y quitar el fondo como cualquier GIF.',
  anim3d: 'Modelos 3D con licencia libre, varios con animaciones propias (andar, bailar…). Se guardan dentro de la presentación. Muévelos con clic derecho ▸ Movimiento 3D.',
  poly: 'Más de 500 modelos 3D de Poly Haven, de dominio público (CC0). Se guardan dentro de la presentación.',
  nasa: 'Más de 250 modelos de la NASA: naves, satélites, cohetes, róveres, asteroides… Libres y sin copyright (sin usar sus logotipos como aval). Se guardan dentro de la presentación.',
  commons3d: 'Miles de modelos 3D de Wikimedia Commons (fósiles, piezas de museo, anatomía, edificios…) con licencias libres; se añade la atribución como pie. Busca en inglés para más resultados.',
  sketchfab: 'Millones de modelos 3D de Sketchfab, muchos animados. Se muestran con el visor de Sketchfab (necesita internet al presentar).',
};
// Ideas to start with (shown in the interface's language, searched in English: more results).
// Nothing is searched until one is chosen.
const IDEAS = {
  images: [['Naturaleza', 'nature'], ['Ciudad', 'city'], ['Espacio', 'space'], ['Ciencia', 'science'], ['Tecnología', 'technology'], ['Escuela', 'school'], ['Oficina', 'office'], ['Mapas', 'map']],
  icons: [['Casa', 'home'], ['Persona', 'person'], ['Flecha', 'arrow'], ['Estrella', 'star'], ['Correo', 'mail'], ['Idea', 'lightbulb'], ['Gráfico', 'chart'], ['Ajustes', 'settings']],
  gif: [['Aplausos', 'applause'], ['Hola', 'hello'], ['Gracias', 'thank you'], ['Fuegos artificiales', 'fireworks'], ['Gatos', 'cat'], ['Baile', 'dance']],
  commons3d: [['Cráneo', 'skull'], ['Fósil', 'fossil'], ['Estatua', 'statue'], ['Corazón', 'heart'], ['Dinosaurio', 'dinosaur'], ['Edificio', 'building']],
  sketchfab: [['Robot', 'robot'], ['Coche', 'car'], ['Avión', 'airplane'], ['Animales', 'animal'], ['Casa', 'house'], ['Planeta', 'planet']],
};
const TYPING = new Set(['images', 'icons', 'gif', 'sketchfab', 'commons3d']);          // need words to search
const DRAG = 'application/x-revela-element';
const sel = (cls, opts) => `<select class="${cls}">${opts.map(([v, l]) => `<option value="${v}">${esc(t(l))}</option>`).join('')}</select>`;
// The picture search's filters, as the service takes them.
const FILTERS = 'revela.elements.imageFilters', RECENT = 'revela.elements.recentImages';
const FIELDS = ['el-f-type', 'el-f-ext', 'el-f-shape', 'el-f-size', 'el-f-transp', 'el-f-cut', 'el-comm'];
// (Remembered in this browser, like the side of the panel: a convenience only.)
function saveFilters() {
  const v = Object.fromEntries(FIELDS.map(c => { const el = q('.' + c); return [c, el.type === 'checkbox' ? el.checked : el.value]; }));
  try { localStorage.setItem(FILTERS, JSON.stringify(v)); } catch {}
  countFilters();
}
function loadFilters() {
  let v = {}; try { v = JSON.parse(localStorage.getItem(FILTERS)) || {}; } catch {}
  for (const c of FIELDS) { const el = q('.' + c); if (!(c in v)) continue;
    if (el.type === 'checkbox') el.checked = !!v[c]; else if ([...el.options].some(o => o.value === v[c])) el.value = v[c]; }
  countFilters();
}
// How many are on, next to the button that shows them (they stay out of the way).
const countOn = () => FIELDS.filter(c => c !== 'el-f-cut' && (q('.' + c).type === 'checkbox' ? q('.' + c).checked : q('.' + c).value)).length;
function countFilters() {
  const n = FIELDS.filter(c => { const el = q('.' + c); return el.type === 'checkbox' ? el.checked : el.value; }).length, b = q('.el-fcount');
  b.textContent = n; b.hidden = !n;
}
// Recently added pictures, to use again without searching.
function recentImages() { try { return JSON.parse(localStorage.getItem(RECENT)) || []; } catch { return []; } }
function rememberImage(img) {
  const keep = ['id', 'title', 'url', 'thumb', 'previews', 'width', 'height', 'filetype', 'creator', 'license', 'licenseUrl', 'source', 'attribution', 'transparent'];
  const one = Object.fromEntries(keep.filter(k => img[k] !== undefined).map(k => [k, img[k]]));
  try { localStorage.setItem(RECENT, JSON.stringify([one, ...recentImages().filter(x => x.id !== img.id)].slice(0, 24))); } catch {}
}
function imageFilters() {
  const ext = q('.el-f-ext').value, transparent = q('.el-f-transp').checked;
  return { commercial: q('.el-comm').checked, category: q('.el-f-type').value, aspect: q('.el-f-shape').value, size: q('.el-f-size').value,
    extension: transparent ? (['png', 'svg'].includes(ext) ? ext : 'png,svg') : ext, transparent };
}
const mb = n => (n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + ' MB' : Math.max(1, Math.round(n / 1e3)) + ' KB');

const SIDE = 'revela.elements.side';
export const elementsSide = () => { try { return localStorage.getItem(SIDE) === 'right' ? 'right' : 'left'; } catch { return 'left'; } };

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
    <div class="sk-bar"><input type="search" class="sk-q" placeholder="${t('Buscar…')}"><button type="button" class="fr-do sk-go" title="${t('Buscar')}"><i class="ms">search</i></button>
      <button type="button" class="mini2 el-ftoggle" title="${t('Filtros')}" aria-expanded="false" hidden><i class="ms">tune</i><b class="el-fcount" hidden></b></button></div>
    <div class="el-filters" hidden>
      ${sel('el-f-type', [['', 'Todo tipo'], ['photograph', 'Fotos'], ['illustration', 'Ilustraciones'], ['digitized_artwork', 'Arte digitalizado']])}
      ${sel('el-f-ext', [['', 'Cualquier formato'], ['png', 'PNG'], ['svg', 'SVG (vectorial)'], ['jpg', 'JPG'], ['gif', 'GIF']])}
      ${sel('el-f-shape', [['', 'Cualquier forma'], ['wide', 'Horizontal'], ['tall', 'Vertical'], ['square', 'Cuadrada']])}
      ${sel('el-f-size', [['', 'Cualquier tamaño'], ['large', 'Grande'], ['medium', 'Mediano'], ['small', 'Pequeño']])}
      <label class="fr-chk" title="${t('Solo PNG y SVG cuyo fondo se ve a través (recortes, logotipos, dibujos): se comprueba cada una')}"><input type="checkbox" class="el-f-transp"> ${t('Fondo transparente')}</label>
      <label class="fr-chk" title="${t('Al añadir una foto, se le quita el fondo aquí mismo, en tu equipo')}"><input type="checkbox" class="el-f-cut"> ${t('Quitar el fondo al añadir')}</label>
      <label class="fr-chk"><input type="checkbox" class="el-comm"> ${t('Uso comercial')}</label>
    </div>
    <div class="el-opts">
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
  q('.el-filters').addEventListener('change', e => { saveFilters(); if (!e.target.classList.contains('el-f-cut') && q('.sk-q').value.trim()) run(); });
  q('.el-ftoggle').addEventListener('click', () => { const open = q('.el-filters').hidden; q('.el-filters').hidden = !open; q('.el-ftoggle').setAttribute('aria-expanded', String(open)); });
  // Near the end of the results, the next ones come by themselves (the button stays, for the keyboard).
  q('.el-grid').addEventListener('scroll', () => { const g = q('.el-grid');
    if (!q('.sk-more').hidden && !busy && g.scrollTop + g.clientHeight > g.scrollHeight - 160) run(true); }, { passive: true });
  loadFilters();
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
  q('.el-ftoggle').hidden = tab !== 'images';
  if (tab !== 'images') { q('.el-filters').hidden = true; q('.el-ftoggle').setAttribute('aria-expanded', 'false'); }
  q('.el-help').hidden = false;
  q('.el-anim').hidden = !(tab === 'anim3d' || tab === 'sketchfab');
  q('.el-col').hidden = tab !== 'icons';
  q('.el-grid').className = 'el-grid' + (tab === 'icons' || tab === 'stickers' ? ' small' : '') + (tab === 'images' ? ' checker justify' : tab === 'gif' ? ' justify' : '');
  q('.sk-q').value = terms[tab] || '';
  q('.el-grid').innerHTML = ''; q('.sk-more').hidden = true; q('.sk-go').disabled = false; picks = [];
  const svc = TABS.find(x => x[0] === tab);
  if (q('.sk-q').value.trim() || !TYPING.has(tab) && (!svc[3] || consented(svc[3]))) run();          // browsable without typing
  else if (TYPING.has(tab)) {
    q('.el-grid').innerHTML = `<p class="host-help">${t('Escribe qué buscas (en inglés hay más resultados).')}</p>`
      + `<div class="el-ideas">${(IDEAS[tab] || []).map(([l, w]) => `<button type="button" class="mini2" data-idea="${esc(w)}">${esc(t(l))}</button>`).join('')}</div>`;
    q('.el-grid').querySelectorAll('[data-idea]').forEach(b => b.addEventListener('click', () => { q('.sk-q').value = b.dataset.idea; run(); }));
    const recent = tab === 'images' ? recentImages() : [];
    if (recent.length) {
      q('.el-grid').insertAdjacentHTML('beforeend', `<h4 class="el-sub">${t('Usadas recientemente')}</h4>`);
      recent.forEach(img => item(...imageResult(img)));
    }
  }
  q('.sk-q').focus();
}

// One result: click adds it; dragging it onto the slide drops it there.
// ar: its proportions (width / height), for rows of pictures as they are, not cropped.
function item(thumb, title, badge, pick, ar = 0) {
  const i = picks.push(pick) - 1;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'sk-item'; b.title = title; b.draggable = true; b.dataset.i = i;
  if (ar > 0) b.style.setProperty('--ar', Math.min(3, Math.max(0.4, ar)).toFixed(3));
  b.innerHTML = `<img loading="lazy" src="${esc([].concat(thumb)[0])}" alt="${esc(title)}" referrerpolicy="no-referrer" draggable="false">${badge ? `<span>${esc(badge)}</span>` : ''}`;
  // A preview that can't load (no connection, the service busy): a clear placeholder, not a broken image.
  // (thumb can be a list of addresses, tried in turn.)
  // If even the original is gone, the result can't be added either: it goes.
  const alts = [].concat(thumb).slice(1), withOriginal = alts.length > 0, im = b.querySelector('img');
  im.addEventListener('error', () => {
    if (alts.length) { im.src = alts.shift(); return; }
    if (withOriginal) { b.remove(); return; }
    im.replaceWith(Object.assign(document.createElement('i'), { className: 'ms el-noimg', textContent: 'image_not_supported', title }));
  });
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
    const i = +e.dataTransfer.getData(DRAG), pick = picks[i], b = q(`.el-grid [data-i="${i}"]`); if (!pick) return;
    const r = stage.getBoundingClientRect(), k = factor();
    add(b || document.createElement('button'), pick, [(e.clientX - r.left) * k, (e.clientY - r.top) * k]);
  });
}

// A picture found (or used before): its preview, description, format and licence, and how to add it.
function imageResult(img) {
  return [img.previews || img.thumb, `${img.title} — ${img.creator} (${img.license})${img.transparent ? ' · ' + t('Fondo transparente') : ''}`,
    [(img.filetype || '').toUpperCase(), img.license].filter(Boolean).join(' · '), async () => {
      const b = await insertStockImage(img);
      rememberImage(img);
      if (panel && q('.el-f-cut').checked && !img.transparent && !/svg|gif/.test(img.filetype || '')) await removeBackground(currentSlide().blocks.find(x => x.id === b.id) || b);
      return b;
    }, img.width && img.height ? img.width / img.height : 0];
}

let runs = 0, busy = false;
async function run(more = false) {
  if (!panel) return;
  const tab = cur, term = q('.sk-q').value.trim(), svc = TABS.find(x => x[0] === tab);
  if (TYPING.has(tab) && !term) return;
  if (!(await consent(svc[3], svc[4]))) return;
  const id = ++runs;
  if (!more) { page = 1; cursor = null; } else page++;
  q('.sk-go').disabled = true; q('.sk-more').hidden = true; busy = true;
  if (!more) { q('.el-grid').innerHTML = `<p class="host-help el-loading">${t('Buscando…')}</p>`; q('.el-grid').scrollTop = 0; }
  else q('.el-grid').insertAdjacentHTML('beforeend', `<p class="host-help el-loading">${t('Buscando…')}</p>`);
  let list = [], full = false;                     // [thumb, title, badge, pick]; full: there may be more
  try {
    if (tab === 'images') {
      const f = imageFilters(), found = [];
      // A see-through background: PNG and SVG only, each one checked on its preview;
      // a few pages if needed, so that there is something to choose from.
      if (f.transparent) q('.el-grid').innerHTML = more ? q('.el-grid').innerHTML : `<p class="host-help">${t('Buscando imágenes con fondo transparente…')}</p>`;
      for (let tries = 0; ; tries++) {
        const res = await searchImages(term, page, f); full = res.length >= 20;
        if (!f.transparent) { found.push(...res); break; }
        const ok = await Promise.all(res.map(img => hasTransparentBackground(img.previews[0])));
        res.forEach((img, i) => { if (ok[i]) found.push({ ...img, transparent: true }); });
        if (found.length >= 8 || !full || tries >= 2 || id !== runs) break;
        page++;
      }
      list = found.map(imageResult);
    } else if (tab === 'icons') {
      const { icons, collections } = await searchIcons(term), col = q('.el-color').value;
      list = icons.map(name => { const c = collections[name.split(':')[0]];
        return [iconPreview(name, col), `${name}${c ? ' — ' + c.name + ' (' + c.license?.title + ')' : ''}`, '', () => insertOnlineIcon(name, panel ? q('.el-color').value : col, c?.license)]; });
    } else if (tab === 'gif') {
      const res = await R.searchGifs(term, page); full = res.length >= 20;
      list = res.map(g => [g.previews || g.thumb, `${g.title} — ${g.creator} (${g.license})`, g.license, () => R.insertGif(g), g.width && g.height ? g.width / g.height : 0]);
    } else if (tab === 'stickers') {
      list = R.searchStickers(term).map(s => [s.thumb, s.words, '', () => R.insertSticker(s.code, s.words)]);
    } else if (tab === 'anim3d') {
      list = R.searchLibrary3D(term, { animated: q('.el-onlyanim').checked }).map(m => [m.thumb, `${m.label} — ${m.credit}`, `${m.animated ? '▶ ' : ''}${m.label}`, () => R.insertLibraryModel(m)]);
    } else if (tab === 'poly') {
      list = (await R.searchPolyHaven(term)).slice(0, 120).map(a => [a.thumb, `${a.name} (CC0)`, a.name, () => R.insertPolyHaven(a)]);
    } else if (tab === 'nasa') {
      list = R.searchNASA3D(term).map(m => [m.thumb || 'icons/icon.svg', `${m.name} — NASA`, m.name, () => R.insertNASA3D(m)]);
    } else if (tab === 'commons3d') {
      const r = await R.searchCommons3D(term, more ? cursor || 0 : 0);
      cursor = r.next; full = r.next != null;
      list = r.results.map(m => [m.thumb, `${m.title} — ${m.artist} (${m.license}) · ${mb(m.size)}`, mb(m.size), async () => {
        if (m.size > 15e6 && !(await confirmDialog(t('Este modelo pesa {n}: la presentación crecerá mucho. ¿Añadirlo?').replace('{n}', mb(m.size))))) return null;
        return R.insertCommons3D(m);
      }]);
    } else if (tab === 'sketchfab') {
      const r = await R.searchSketchfab(term, { animated: q('.el-onlyanim').checked, cursor: more ? cursor : null });
      cursor = r.next; full = !!cursor;
      list = r.results.map(m => [m.thumb, `${m.name} — ${m.user} (${m.license})`, `${m.animated ? '▶ ' : ''}${m.name}`, () => R.insertSketchfab(m)]);
    }
  } catch (e) {
    if (id === runs) alertDialog(/\b429\b/.test(e.message) ? t('El servicio está recibiendo demasiadas búsquedas desde tu conexión. Espera un minuto y vuelve a probar.') : t('No se pudo buscar: ') + (e.message || e));
  }
  if (id === runs) busy = false;
  if (!panel || id !== runs || cur !== tab) return;                 // a newer search (or another tab) wins
  q('.sk-go').disabled = false;
  q('.el-grid').querySelectorAll('.el-loading').forEach(x => x.remove());
  if (!more) { q('.el-grid').innerHTML = ''; picks = []; }
  // Light icons on a dark tile (and dark ones on a light tile), so they can be seen.
  const c = q('.el-color').value, lum = (parseInt(c.slice(1, 3), 16) * 299 + parseInt(c.slice(3, 5), 16) * 587 + parseInt(c.slice(5, 7), 16) * 114) / 255000;
  q('.el-grid').classList.toggle('dark', tab === 'icons' && lum > 0.6);
  list.forEach(x => item(...x));
  q('.sk-more').hidden = !full;
  const none = !q('.el-grid').children.length;
  if (none) q('.el-grid').innerHTML = `<p class="host-help">${t('Sin resultados.')} ${tab === 'images' && countOn() ? t('Prueba a quitar algún filtro.') : t('Prueba con otras palabras (en inglés hay más).')}</p>`;
  q('.el-help').hidden = !none;                                     // (the explanation makes room for the results)
}
