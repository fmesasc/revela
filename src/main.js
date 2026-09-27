// Application bootstrap: wire the modules together and subscribe the render.

import { subscribe, state, undo, redo, selectedBlock } from './core/store.js';
import { initCanvas, renderCanvas, nudge } from './ui/canvas.js';
import { initPanel, renderPanel } from './ui/panel.js';
import { initRibbon, renderRibbon } from './ui/ribbon.js';
import { initContextMenu } from './ui/contextmenu.js';
import { deleteBlock, duplicateBlock } from './features/blocks.js';

function render() {
  renderRibbon();
  renderCanvas();
  renderPanel();
  const s = document.getElementById('status-slide');
  if (s) s.textContent = `Diapositiva ${state.ui.slideIndex + 1} de ${state.deck.slides.length}`;
}

function keyboard(e) {
  const editing = document.activeElement?.isContentEditable;
  if (editing) return;
  const meta = e.ctrlKey || e.metaKey;
  if (meta && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (meta && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
  if (meta && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicateBlock(); return; }
  if (e.key === 'Delete' && state.ui.selection) { e.preventDefault(); deleteBlock(); return; }
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
