// Application bootstrap: wire the modules together and subscribe the render.

import { subscribe, state, undo, redo, selectedBlock } from './core/store.js';
import { initCanvas, renderCanvas, nudge, cycleSelection } from './ui/canvas.js';
import { initPanel, renderPanel } from './ui/panel.js';
import { initRibbon, renderRibbon } from './ui/ribbon.js';
import { initContextMenu } from './ui/contextmenu.js';
import { initDraw } from './ui/draw.js';
import { initI18n, t } from './i18n.js';
import { deleteSelected, duplicateSelected, groupSelected, ungroupSelected } from './features/blocks.js';
import { openFindPanel } from './features/search.js';
// Namespaces exposed to the test harness (see tests/).
import * as store from './core/store.js';
import * as model from './core/model.js';
import * as blocks from './features/blocks.js';
import * as format from './features/format.js';
import * as slides from './features/slides.js';
import * as trans from './features/transitions.js';
import * as fonts from './features/fonts.js';
import * as remote from './features/remote.js';
import * as search from './features/search.js';
import * as i18n from './i18n.js';
import * as gdrive from './io/gdrive.js';
import * as pptx from './io/pptx-export.js';
import * as io from './io/reveal.js';
import * as a11y from './features/a11y.js';
import * as reuse from './ui/reuse.js';
import * as ribbon from './ui/ribbon.js';
import * as palettes from './features/palettes.js';
import * as shapeops from './features/shapeops.js';

function render() {
  renderRibbon();
  renderCanvas();
  renderPanel();
  const s = document.getElementById('status-slide');
  if (s) s.textContent = `${t('Diapositiva')} ${state.ui.slideIndex + 1} ${t('de')} ${state.deck.slides.length}`;
}

function keyboard(e) {
  const editing = document.activeElement?.isContentEditable;
  // Esc leaves text edit mode (the block stays selected and can be moved).
  if (e.key === 'Escape' && editing) { e.preventDefault(); document.activeElement.blur(); return; }
  // Find & replace works anywhere, including while editing text.
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') { e.preventDefault(); openFindPanel(); return; }
  // Paste without formatting while editing text.
  if (editing && (e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'v') {
    e.preventDefault();
    navigator.clipboard?.readText?.().then(t => document.execCommand('insertText', false, t)).catch(() => {});
    return;
  }
  if (editing) return;
  // Tab on the slide moves the selection through the objects (reading order);
  // past the last one, focus leaves the slide as usual.
  if (e.key === 'Tab' && document.activeElement?.id === 'stage' && !e.ctrlKey && !e.altKey) {
    if (cycleSelection(e.shiftKey ? -1 : 1)) e.preventDefault();
    return;
  }
  const meta = e.ctrlKey || e.metaKey;
  if (meta && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (meta && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
  if (meta && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicateSelected(); return; }
  if (meta && e.key.toLowerCase() === 'g') { e.preventDefault(); e.shiftKey ? ungroupSelected() : groupSelected(); return; }
  if ((e.key === 'Delete' || e.key === 'Backspace') && state.ui.selection) { e.preventDefault(); deleteSelected(); return; }
  if (selectedBlock()) {
    const step = e.shiftKey ? 10 : 1;
    if (e.key === 'ArrowLeft')  { e.preventDefault(); nudge(-step, 0); }
    if (e.key === 'ArrowRight') { e.preventDefault(); nudge(step, 0); }
    if (e.key === 'ArrowUp')    { e.preventDefault(); nudge(0, -step); }
    if (e.key === 'ArrowDown')  { e.preventDefault(); nudge(0, step); }
  }
}

initCanvas();
initPanel();
initRibbon();
initContextMenu();
initDraw();
document.addEventListener('keydown', keyboard);
subscribe(render);
render();
initI18n();

// Test hook: exposes the module graph so the headless suite (tests/) can drive
// and inspect the real app. Only active with ?test in the URL.
const testing = new URLSearchParams(location.search).has('test');
if (testing)
  window.__revela = { state, render, store, model, blocks, format, slides, trans, fonts, remote, search, i18n, gdrive, pptx, io, a11y, reuse, ribbon, palettes, shapeops };

// Offline support (PWA). Not for the test harness nor file:// pages.
if (!testing && 'serviceWorker' in navigator && location.protocol !== 'file:')
  navigator.serviceWorker.register('sw.js').catch(() => {});
