// Application bootstrap: wire the modules together and subscribe the render.

import { subscribe, state, undo, redo, selectedBlock } from './core/store.js';
import { initCanvas, renderCanvas, nudge, cycleSelection } from './ui/canvas.js';
import { initPanel, renderPanel } from './ui/panel.js';
import { renderComments } from './ui/comments-panel.js';
import { renderAssistant } from './ui/ai-dialog.js';
import * as aiDeck from './features/ai-deck.js';
import * as comments from './features/comments.js';
import * as protect from './features/protect.js';
import { initRibbon, renderRibbon } from './ui/ribbon.js';
import { initContextMenu } from './ui/contextmenu.js';
import { initDraw } from './ui/draw.js';
import { initI18n, t } from './i18n.js';
import { deleteSelected, duplicateSelected, groupSelected, ungroupSelected, addImage, addTableFromText, addText } from './features/blocks.js';
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
import * as master from './features/master.js';
import * as gallery from './features/gallery.js';
import * as designer from './features/designer.js';
import * as pptxImport from './io/pptx.js';
import * as odp from './io/odp.js';
import { Revela, loadPlugins } from './api.js';
import { loadNewerDeck } from './core/model.js';
import { startAutoVersions } from './features/versions.js';
import * as versions from './features/versions.js';
import { finishOpenRouterLogin } from './features/ai.js';
import { alertDialog } from './ui/dialog.js';
import * as ai from './features/ai.js';
import * as api from './api.js';

function render() {
  renderRibbon();
  renderCanvas();
  renderPanel();
  renderComments();
  renderAssistant();
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
// Paste onto the slide (not while typing): an image becomes a picture, cells
// copied from a spreadsheet become a table, other text a text box.
document.addEventListener('paste', e => {
  const a = document.activeElement;
  if (a?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a?.tagName || '') || document.querySelector('.modal-backdrop')) return;
  const cd = e.clipboardData; if (!cd) return;
  const img = [...cd.files].find(f => f.type.startsWith('image/'));
  if (img) {
    e.preventDefault();
    const r = new FileReader(); r.onload = () => addImage(r.result); r.readAsDataURL(img);
    return;
  }
  const txt = cd.getData('text/plain');
  if (!txt || !txt.trim()) return;
  e.preventDefault();
  if (txt.includes('\t')) addTableFromText(txt);
  else addText(txt.trim().split(/\n/).map(l => l.replace(/&/g, '&amp;').replace(/</g, '&lt;')).join('<br>'));
});
subscribe(render);
window.addEventListener('revela:lang', render);
render();
initI18n();

// Test hook: exposes the module graph so the headless suite (tests/) can drive
// and inspect the real app. Only active with ?test in the URL.
const testing = new URLSearchParams(location.search).has('test');
if (testing)
  window.__revela = { state, render, store, model, blocks, format, slides, trans, fonts, remote, search, i18n, gdrive, pptx, io, a11y, reuse, ribbon, palettes, shapeops, master, gallery, designer, pptxImport, odp, api, ai, versions, comments, protect, aiDeck, video: () => import('./io/video.js') };

// Public scripting API for plugins, macros and the console; installed plugins
// load after the editor is ready (not in the test harness).
window.Revela = Revela;
// A deck too big for localStorage lives in IndexedDB: load it if it's newer.
if (!testing) loadNewerDeck(state.deck).then(d => { if (d) { state.deck = d; state.ui.slideIndex = 0; render(); } });
startAutoVersions();
if (!testing) loadPlugins();
// Back from OpenRouter sign-in (?code=…): exchange it for the key.
if (!testing) finishOpenRouterLogin().then(ok => { if (ok) alertDialog(t('IA conectada con OpenRouter.')); })
  .catch(e => alertDialog(t('No se pudo conectar con OpenRouter: ') + e.message));

// Offline support (PWA). Not for the test harness nor file:// pages.
if (!testing && 'serviceWorker' in navigator && location.protocol !== 'file:')
  navigator.serviceWorker.register('sw.js').catch(() => {});
