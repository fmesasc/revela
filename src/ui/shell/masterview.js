// The master view (PowerPoint's View ▸ Slide Master): instead of the slides,
// the panel shows a tree — each master, bigger, with its layouts under it —
// and the «Patrón de diapositivas» ribbon tab edits the one selected. Layouts
// inherit the master's background, objects and text styles unless they say
// otherwise («Usar fondo del patrón», «Ocultar gráficos del patrón»).

import { esc, shortSig } from '../../core/text.js';
import { state, commit } from '../../core/store.js';
import { t } from '../../i18n/index.js';
import * as master from '../../features/document/master.js';
import { deckFg, deckBodyFont } from '../../features/design/palettes.js';
import { blockPreview } from './preview.js';
import { sorterOn, setSorter } from './sorter.js';
import { confirmDialog, promptDialog, alertDialog } from '../dialogs/dialog.js';
import { openTextStyles } from '../dialogs/textstyles.js';
import { openBackgroundDialog } from '../dialogs/background.js';

const PH_LABEL = { title: 'Título', subtitle: 'Subtítulo', body: 'Texto', picture: '🖼 Imagen', table: '▦ Tabla', chart: '📊 Gráfico' };
const LAYOUT_DRAG = 'application/x-revela-layout';

// What is being edited: { lay } for a layout, { m } for a master.
export function editing(e = state.ui.editMaster) {
  const d = state.deck; if (!e) return {};
  if (e === true) return { m: master.ensureMaster(d), main: true };
  const lay = d.layouts?.find(l => l.id === e); if (lay) return { lay };
  const m = d.masters?.find(x => x.id === e); return m ? { m } : { m: master.ensureMaster(d), main: true };
}
export const usedBy = n => (n === 0 ? t('No lo usa ninguna diapositiva') : n === 1 ? t('Usado por 1 diapositiva') : t('Usado por {n} diapositivas').replace('{n}', n));

// ---- Panel ---------------------------------------------------------------------
let lastSig = '';
export function renderMasterPanel(panel) {
  if (sorterOn()) setSorter(false);
  const d = state.deck, lays = master.ensureLayouts(d);
  const sig = shortSig([d.size, d.master, d.masters, d.layouts, d.slides.map(s => [s.layoutId, s.background]), state.ui.editMaster, deckFg(), deckBodyFont(), t('Patrón')]);
  if (sig === lastSig && panel.querySelector('.master-tree')) return fitMasterThumbs(panel);
  lastSig = sig;
  const sel = state.ui.editMaster, nodes = [];
  master.allMasters(d).forEach((m, i) => {
    const main = i === 0, mine = lays.filter(l => master.masterOf(l, d) === m), n = d.slides.filter(s => master.masterOf(s, d) === m).length;
    const tree = document.createElement('div'); tree.className = 'master-tree';
    const name = m.name || (main ? t('Patrón') : `${t('Patrón')} ${i + 1}`);
    tree.appendChild(card(m, name, main ? sel === true : sel === m.id, [...m.blocks, ...sampleText(m)],
      `${name}: ${t('lo que cambies aquí (fondo, objetos, estilos de texto) pasa a todos sus diseños y a sus diapositivas.')} ${usedBy(n)}.`, true));
    const kids = document.createElement('div'); kids.className = 'master-kids';
    for (const l of mine) {
      const c = card(l, t(l.name), sel === l.id, [...master.masterBlocksFor(l, d), ...l.blocks], `${t(l.name)} · ${usedBy(master.layoutInUse(l.id))}`, false);
      kids.appendChild(c);
    }
    tree.appendChild(kids); nodes.push(tree);
  });
  panel.replaceChildren(...nodes);
  fitMasterThumbs(panel);
  panel.querySelector('.layout-thumb.active')?.scrollIntoView?.({ block: 'nearest' });
}
// The master's thumbnail shows its text styles as PowerPoint's does: a title and a body (when it has none of its own).
const sampleText = m => (m.blocks.some(b => b.ph) ? [] : [
  { id: 'ph-t', type: 'text', ph: 'title', x: 100, y: 60, w: state.deck.size.w - 200, h: 100 },
  { id: 'ph-b', type: 'text', ph: 'body', x: 100, y: 180, w: state.deck.size.w - 200, h: state.deck.size.h - 260 }]);
// Each thumbnail scales to its own width (the master's is bigger).
export function fitMasterThumbs(panel) {
  for (const c of panel.querySelectorAll('.master-tree .thumb-canvas')) if (c.clientWidth) c.style.setProperty('--tk', c.clientWidth / state.deck.size.w);
}
function card(x, label, active, blocks, tip, isMaster) {
  const d = state.deck, { w, h } = d.size, el = document.createElement('div');
  el.className = 'thumb layout-thumb' + (isMaster ? ' is-master' : ' indent') + (active ? ' active' : '');
  el.dataset.edit = x === master.ensureMaster(d) ? 'master' : x.id;      // (the main master: editMaster = true)
  el.title = tip;
  const canvas = document.createElement('div'); canvas.className = 'thumb-canvas';
  canvas.style.background = master.viewBackground(x, d); canvas.style.setProperty('--ar', w / h);
  const inner = document.createElement('div'); inner.className = 'thumb-inner';
  inner.style.cssText = `width:${w}px;height:${h}px;transform:scale(var(--tk,${188 / w}));color:${deckFg()};font-family:${deckBodyFont() || 'inherit'}`;
  for (const b of blocks) {
    if (b.ph) {
      const f = document.createElement('div'), st = master.styled(b, x);
      f.style.cssText = `position:absolute;left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;border:6px dashed currentColor;opacity:.55;`
        + `font-size:${st.fontSize || 40}px;${st.color ? `color:${st.color};` : ''}${st.fontFamily ? `font-family:${st.fontFamily};` : ''}font-weight:${st.fontWeight || 400};padding:12px;box-sizing:border-box;text-align:${st.textAlign || 'left'}`;
      f.textContent = t(PH_LABEL[master.styleKind(b) || b.ph] || b.ph); inner.appendChild(f);
    } else inner.appendChild(blockPreview(b));
  }
  canvas.appendChild(inner);
  // What it doesn't take from the master, and how many slides use it.
  const marks = [];
  if (!isMaster && x.hideMaster) marks.push(['layers_clear', t('Oculta los gráficos del patrón')]);
  if (!isMaster && x.background) marks.push(['wallpaper', t('Con fondo propio')]);
  const n = isMaster ? d.slides.filter(s => master.masterOf(s, d) === x).length : master.layoutInUse(x.id);
  const cap = document.createElement('div'); cap.className = 'layout-name';
  cap.innerHTML = `<span>${esc(label)}</span>${marks.map(([i, l]) => `<i class="ms" title="${esc(l)}">${i}</i>`).join('')}${n ? `<b class="lt-count" title="${esc(usedBy(n))}">${n}</b>` : ''}`;
  el.append(canvas, cap);
  el.addEventListener('click', () => master.editLayout(el.dataset.edit === 'master' ? true : x.id));
  if (!isMaster) {                                         // drag to reorder among its master's layouts
    el.draggable = true;
    el.addEventListener('dragstart', e => { e.dataTransfer?.setData(LAYOUT_DRAG, x.id); el.classList.add('dragging'); });
    el.addEventListener('dragend', () => { el.classList.remove('dragging'); document.querySelectorAll('.layout-thumb.drop-target').forEach(n => n.classList.remove('drop-target')); });
    el.addEventListener('dragover', e => { if ([...(e.dataTransfer?.types || [])].includes(LAYOUT_DRAG)) { e.preventDefault(); el.classList.add('drop-target'); } });
    el.addEventListener('dragleave', () => el.classList.remove('drop-target'));
    el.addEventListener('drop', e => { const id = e.dataTransfer?.getData(LAYOUT_DRAG); if (!id) return; e.preventDefault(); el.classList.remove('drop-target'); master.moveLayoutTo(id, x.id); });
  }
  return el;
}

// ---- Commands (ribbon tab and context menu) -------------------------------------
export function renameItem(e = state.ui.editMaster) {
  const { lay, m } = editing(e); if (!lay && !m) return;
  promptDialog(lay ? t('Nombre del diseño:') : t('Nombre del patrón:'), lay ? t(lay.name) : m.name || t('Patrón')).then(v => {
    if (!v || !v.trim()) return;
    if (lay) master.renameLayout(lay.id, v.trim()); else commit(() => { m.name = v.trim(); });
  });
}
// A layout in use can go too: its slides move to another layout of the master (PowerPoint refuses).
export async function deleteItem(e = state.ui.editMaster) {
  const { lay, m, main } = editing(e);
  if (lay) {
    const n = master.layoutInUse(lay.id), to = master.fallbackLayout(lay.id);
    if (!to) return;
    const msg = !n ? t('¿Eliminar este diseño?') : (n === 1 ? t('Lo usa 1 diapositiva: pasará al diseño «{to}», con lo que tenga escrito. ¿Eliminar el diseño?')
      : t('Lo usan {n} diapositivas: pasarán al diseño «{to}», con lo que tengan escrito. ¿Eliminar el diseño?')).replace('{n}', n).replace('{to}', t(to.name));
    if (await confirmDialog(msg)) master.deleteLayout(lay.id, to.id);
  } else if (m && !main) {
    if (master.masterInUse(m.id)) { alertDialog(t('Lo usan diapositivas: cámbialas de diseño antes.')); return; }
    if (await confirmDialog(t('¿Eliminar este patrón y sus diseños?'))) master.deleteMaster(m.id);
  }
}
export function toggleLayoutGraphics(e = state.ui.editMaster) { const { lay } = editing(e); if (lay) master.setLayoutOptions(lay.id, { hideMaster: !lay.hideMaster }); }
export function toggleLayoutMasterBg(e = state.ui.editMaster) { const { lay } = editing(e); if (lay) master.setLayoutOptions(lay.id, { masterBg: !!lay.background }); }

// The panel's right-click menu in the master view (items as contextmenu.js draws them).
export function masterMenu(edit) {
  const id = edit === 'master' ? true : edit; master.editLayout(id);
  const { lay, m, main } = editing(id), close = [null, ['Cerrar vista Patrón', () => master.toggleMasterEdit(false)]];
  if (lay) {
    const sibs = master.ensureLayouts().filter(l => master.masterOf(l) === master.masterOf(lay)), i = sibs.indexOf(lay);
    return [
      ['Insertar diseño', () => master.addLayout()],
      ['Duplicar diseño', () => master.addLayout(lay.id)],
      ['Cambiar nombre…', () => renameItem(id)],
      ['Eliminar diseño', master.fallbackLayout(lay.id) ? () => deleteItem(id) : null],
      null,
      ['Subir', i > 0 ? () => master.moveLayout(lay.id, -1) : null],
      ['Bajar', i < sibs.length - 1 ? () => master.moveLayout(lay.id, 1) : null],
      null,
      [lay.hideMaster ? 'Mostrar gráficos del patrón' : 'Ocultar gráficos del patrón', () => toggleLayoutGraphics(id)],
      lay.background ? ['Usar fondo del patrón', () => toggleLayoutMasterBg(id)] : null,
      ['Formato del fondo…', () => openBackgroundDialog()],
      ...close,
    ];
  }
  return [
    ['Insertar diseño', () => master.addLayout()],
    ['Insertar patrón', () => master.addMaster()],
    ['Cambiar nombre…', () => renameItem(id)],
    ...(main ? [] : [['Eliminar patrón', master.masterInUse(m.id) ? null : () => deleteItem(id)]]),
    null,
    ['Estilos de texto…', () => openTextStyles()],
    ['Formato del fondo…', () => openBackgroundDialog()],
    ...close,
  ];
}

// ---- Ribbon --------------------------------------------------------------------
// The «Patrón de diapositivas» tab: shown (and opened) only in the master view.
let was = false;
export function syncMasterRibbon() {
  const on = !!state.ui.editMaster, tab = document.querySelector('#ribbon [data-tab="master"]');
  document.body.classList.toggle('master-view', on);
  if (tab) tab.hidden = !on;
  if (on && !was) state.ui.activeTab = 'master';
  if (!on && state.ui.activeTab === 'master') state.ui.activeTab = 'home';
  was = on;
  const banner = document.getElementById('master-banner'); if (banner) banner.hidden = !on;
  const page = document.querySelector('#ribbon [data-page="master"]'); if (!page || !on) return;
  const { lay, m, main } = editing();
  // What is being edited, and what it takes from where.
  const txt = banner?.querySelector('.mb-text');
  if (txt) txt.textContent = lay ? `${t('Diseño')} «${t(lay.name)}» · ${usedBy(master.layoutInUse(lay.id))}. ${t('Hereda el fondo, los gráficos y los estilos de texto del patrón; lo que cambies aquí afecta solo a las diapositivas con este diseño.')}`
    : `${m.name || t('Patrón')}: ${t('lo que cambies aquí (fondo, objetos, estilos de texto) pasa a todos sus diseños y a sus diapositivas.')}`;
  page.querySelectorAll('.mb-lay').forEach(x => { x.disabled = !lay; });
  page.querySelector('[data-action="layout-hide-graphics"]')?.classList.toggle('on', !!lay?.hideMaster);
  page.querySelector('[data-action="layout-master-bg"]')?.classList.toggle('on', !!lay && !lay.background);
  const del = page.querySelector('[data-action="master-item-delete"]');
  if (del) {
    del.disabled = lay ? !master.fallbackLayout(lay.id) : main || master.masterInUse(m.id) > 0;
    del.title = lay ? `${t('Eliminar el diseño')} (${usedBy(master.layoutInUse(lay.id)).toLowerCase()})` : main ? t('El patrón principal no se puede eliminar') : t('Eliminar el patrón añadido y sus diseños');
  }
  const bg = page.querySelector('[data-master-bg]'), hex = (master.viewBackground(lay || m) || '').match(/^#[0-9a-f]{6}$/i);
  if (bg && hex && document.activeElement !== bg) bg.value = hex[0].toLowerCase();
}
