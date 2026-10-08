// The editor's three ways of looking (Ver ▸ Interfaz), for the habits people bring:
// - classic: PowerPoint's — the ribbon with its tabs, the slides on the left (as it always was);
// - studio: Canva's — a rail of big icons on the left (design, templates, elements, text, uploads, activities…),
//   the tools of what was chosen in one row on top, the slides in a strip below;
// - simple: slides.com's — a thin column of objects to add, nothing else on top until something is selected or a
//   tool is asked for, the slides in a strip below.
// Only the interface changes: the same document, the same actions (each button is one of the ribbon's own,
// data-action or data-tab), so a deck made in one view is the same in the others and nothing can be lost by
// switching. Remembered in this browser; index.html applies it before the first paint (html[data-view]).
// Phones keep their own layout (the ribbon and the quick bar at the thumb): the views are for bigger screens.

import { state, subscribe, selectedIds } from '../../core/store.js';
import { t } from '../../i18n/index.js';

export const VIEWS = ['classic', 'studio', 'simple'];
const KEY = 'revela.view';
// [kind (tab | action), what, label, icon]
const RAILS = {
  studio: [
    ['tab', 'file', 'Archivo', 'folder_open'], ['tab', 'home', 'Inicio', 'edit'], ['tab', 'design', 'Diseño', 'palette'],
    ['action', 'gallery', 'Plantillas', 'dashboard'], ['action', 'insert-stock', 'Elementos', 'category'], ['action', 'insert-text', 'Texto', 'title'],
    ['action', 'insert-image', 'Subir imagen', 'upload'], ['tab', 'insert', 'Insertar', 'add_box'], ['action', 'insert-poll', 'Actividades', 'how_to_vote'],
    ['tab', 'animations', 'Animar', 'animation'], ['tab', 'ai', 'IA', 'auto_awesome'], ['tab', 'view', 'Más herramientas', 'more_horiz'],
  ],
  simple: [
    ['tab', 'file', 'Archivo', 'folder_open'], ['action', 'insert-text', 'Texto', 'title'], ['action', 'insert-image', 'Imagen', 'image'],
    ['action', 'insert-video', 'Vídeo', 'movie'], ['action', 'insert-table', 'Tabla', 'table'], ['action', 'insert-chart', 'Gráfico', 'bar_chart'],
    ['action', 'insert-code', 'Código', 'code'], ['action', 'insert-math', 'Ecuación', 'functions'], ['action', 'insert-embed', 'Web', 'language'],
    ['action', 'insert-poll', 'Votación', 'how_to_vote'], ['sep'], ['tab', 'insert', 'Más objetos', 'add_box'], ['tab', 'home', 'Formato', 'format_paint'],
    ['tab', 'design', 'Estilo', 'palette'], ['tab', 'animations', 'Animar', 'animation'], ['tab', 'view', 'Más herramientas', 'more_horiz'],
  ],
};

export const currentView = () => { try { const v = localStorage.getItem(KEY); return VIEWS.includes(v) ? v : 'classic'; } catch { return 'classic'; } };

let actions = null;          // ribbon/actions.js ACTIONS (given by initViews: no import cycle)
function paintRail(view) {
  let rail = document.getElementById('view-rail');
  if (view === 'classic') { rail?.remove(); return; }
  if (!rail) {
    rail = document.createElement('nav'); rail.id = 'view-rail'; rail.setAttribute('aria-label', t('Herramientas'));
    document.querySelector('main')?.prepend(rail);
    rail.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.tab) {
        // (The same tab again in the simple view: its row closes.)
        if (document.documentElement.dataset.view === 'simple' && state.ui.activeTab === b.dataset.tab && document.body.classList.contains('view-pages')) { document.body.classList.remove('view-pages'); return; }
        document.querySelector(`#ribbon .tabs [data-tab="${b.dataset.tab}"]`)?.click();
        if (b.dataset.tab !== 'file') document.body.classList.add('view-pages');
        return;
      }
      if (b.dataset.action) actions?.[b.dataset.action]?.();
    });
  }
  rail.dataset.view = view;
  rail.innerHTML = RAILS[view].map(([kind, what, label, icon]) => (kind === 'sep' ? '<hr>'
    : `<button type="button" data-${kind}="${what}" title="${t(label)}"><i class="ms">${icon}</i><span>${t(label)}</span></button>`)).join('');
  // (The tab on show is marked, as the ribbon's own tabs: renderRibbon marks every [data-tab].)
  rail.querySelectorAll('[data-tab]').forEach(x => x.classList.toggle('active', x.dataset.tab === state.ui.activeTab));
}

export function setView(view) {
  if (!VIEWS.includes(view)) view = 'classic';
  try { localStorage.setItem(KEY, view); } catch {}
  document.documentElement.dataset.view = view;
  document.body.classList.remove('view-pages');
  paintRail(view);
  document.querySelectorAll('[data-view-set]').forEach(b => b.classList.toggle('on', b.dataset.viewSet === view));
  // (The slide is fitted again to the room it has now: the zoom's own observers see the canvas change size.)
  window.dispatchEvent(new Event('resize'));
}

export function initViews(ACTIONS) {
  actions = ACTIONS;
  // (?view=studio in the address: that one, and remembered — a link can open the editor in the interface it shows.)
  const asked = new URLSearchParams(location.search).get('view');
  setView(VIEWS.includes(asked) ? asked : currentView());
  addEventListener('revela:lang', () => paintRail(currentView()));
  // The simple view: the row of tools shows when something is selected (to format it) or a tool was asked for.
  let had = false;
  subscribe(() => {
    if (document.documentElement.dataset.view !== 'simple') return;
    const has = selectedIds().length > 0;
    if (has && !had) document.body.classList.add('view-sel');
    if (!has && had) document.body.classList.remove('view-sel');
    had = has;
  });
}
