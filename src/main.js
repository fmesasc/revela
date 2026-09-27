// Application bootstrap: wire the modules together and subscribe the render.

import { subscribe, state, undo, redo, selectedBlock } from './core/store.js';
import { initCanvas, renderCanvas, nudge } from './ui/canvas.js';
import { initPanel, renderPanel } from './ui/panel.js';
import { initRibbon, renderRibbon } from './ui/ribbon.js';
import { initContextMenu } from './ui/contextmenu.js';
import { deleteSelected, duplicateSelected, groupSelected, ungroupSelected } from './features/blocks.js';
// Namespaces exposed to the test harness (see tests/).
import * as store from './core/store.js';
import * as model from './core/model.js';
import * as blocks from './features/blocks.js';
import * as format from './features/format.js';
import * as slides from './features/slides.js';
import * as fonts from './features/fonts.js';
import * as remote from './features/remote.js';
import * as io from './io/reveal.js';

function render() {
  renderRibbon();
  renderCanvas();
  renderPanel();
  const s = document.getElementById('status-slide');
  if (s) s.textContent = `Diapositiva ${state.ui.slideIndex + 1} de ${state.deck.slides.length}`;
}

function keyboard(e) {
  const editing = document.activeElement?.isContentEditable;
  // Esc leaves text edit mode (the block stays selected and can be moved).
  if (e.key === 'Escape' && editing) { e.preventDefault(); document.activeElement.blur(); return; }
  if (editing) return;
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
document.addEventListener('keydown', keyboard);
subscribe(render);
render();

// Test hook: exposes the module graph so the headless suite (tests/) can drive
// and inspect the real app. Only active with ?test in the URL.
if (new URLSearchParams(location.search).has('test'))
  window.__revela = { state, render, store, model, blocks, format, slides, fonts, remote, io };







