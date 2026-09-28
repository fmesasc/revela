// Application bootstrap: wire the modules together and subscribe the render.

import { subscribe, state, undo, redo, selectedBlock, selectedBlocks } from '../../core/store.js';
import * as clip from '../../features/document/clipboard.js';
import { initCanvas, renderCanvas, nudge, cycleSelection } from '../../ui/shell/canvas.js';
import { initPanel, renderPanel } from '../../ui/shell/navigator.js';
import { renderComments } from '../../ui/panels/comments.js';
import { renderAssistant } from '../../ui/dialogs/ai.js';
import * as aiDeck from '../../features/ai/authoring.js';
import * as poll from '../../features/live/poll.js';
import * as dashboards from '../../features/live/dashboards.js';
import * as stock from '../../features/content/stock.js';
import * as markdown from '../../io/formats/markdown.js';
import { refreshLinkedCharts } from '../../features/live/dashboards.js';
import * as comments from '../../features/collab/comments.js';
import * as protect from '../../features/collab/protect.js';
import { initRibbon, renderRibbon } from '../../ui/shell/ribbon.js';
import { initContextMenu } from '../../ui/shell/contextmenu.js';
import { initDraw } from '../../ui/shell/draw.js';
import { initI18n, t } from '../../i18n/index.js';
import { deleteSelected, duplicateSelected, groupSelected, ungroupSelected, addImage, addTableFromText, addText } from '../../features/document/blocks.js';
import { openFindPanel } from '../../features/document/search.js';
// Namespaces exposed to the test harness (see tests/).
import * as store from '../../core/store.js';
import * as model from '../../core/model.js';
import * as blocks from '../../features/document/blocks.js';
import * as format from '../../features/document/format.js';
import * as slides from '../../features/document/slides.js';
import * as trans from '../../features/animation/transitions.js';
import * as fonts from '../../features/design/fonts.js';
import * as remote from '../../features/live/remote.js';
import * as search from '../../features/document/search.js';
import * as i18n from '../../i18n/index.js';
import * as gdrive from '../../io/cloud/gdrive.js';
import * as pptx from '../../io/formats/pptx-export.js';
import * as io from '../../io/formats/html.js';
import * as a11y from '../../features/document/a11y.js';
import * as reuse from '../../ui/dialogs/reuse.js';
import * as ribbon from '../../ui/shell/ribbon.js';
import * as palettes from '../../features/design/palettes.js';
import * as shapeops from '../../features/document/shapeops.js';
import * as master from '../../features/document/master.js';
import * as gallery from '../../features/design/gallery.js';
import * as designer from '../../features/design/designer.js';
import * as pptxImport from '../../io/formats/pptx-import.js';
import * as odp from '../../io/formats/odp.js';
import { Revela, loadPlugins } from '../../api/index.js';
import { loadNewerDeck } from '../../core/model.js';
import { startAutoVersions } from '../../features/collab/versions.js';
import * as versions from '../../features/collab/versions.js';
import { finishOpenRouterLogin } from '../../features/ai/openrouter.js';
import { alertDialog } from '../../ui/dialogs/dialog.js';
import * as ai from '../../features/ai/openrouter.js';
import * as api from '../../api/index.js';

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
  // Ctrl+C / Ctrl+X on selected objects (Ctrl+V arrives as a paste event below).
  if (meta && !e.shiftKey && e.key.toLowerCase() === 'c' && selectedBlocks().length) { e.preventDefault(); clip.copySelected(); return; }
  if (meta && !e.shiftKey && e.key.toLowerCase() === 'x' && selectedBlocks().length) { e.preventDefault(); clip.cutSelected(); return; }
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
  // Objects copied in Revela (this tab or another one).
  const own = clip.fromSystemText(cd.getData('text/plain'));
  if (own || (!cd.getData('text/plain') && ![...cd.files].length && clip.hasClipboard())) { e.preventDefault(); clip.paste(own && !clip.isCurrent(own) ? own : undefined); return; }
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
  window.__revela = { state, render, store, model, blocks, format, slides, trans, fonts, remote, search, i18n, gdrive, pptx, io, a11y, reuse, ribbon, palettes, shapeops, master, gallery, designer, pptxImport, odp, api, ai, versions, comments, protect, aiDeck, poll, dashboards, stock, clipboard: clip, markdown, video: () => import('../../io/export/video.js') };

// Public scripting API for plugins, macros and the console; installed plugins
// load after the editor is ready (not in the test harness).
window.Revela = Revela;
// A deck too big for localStorage lives in IndexedDB: load it if it's newer.
if (!testing) loadNewerDeck(state.deck).then(d => { if (d) { state.deck = d; state.ui.slideIndex = 0; render(); } });
startAutoVersions();
if (!testing) loadPlugins();
// Charts linked to a CSV load fresh data when the editor opens.
if (!testing) refreshLinkedCharts().catch(() => {});
// Back from OpenRouter sign-in (?code=…): exchange it for the key.
if (!testing) finishOpenRouterLogin().then(ok => { if (ok) alertDialog(t('IA conectada con OpenRouter.')); })
  .catch(e => alertDialog(t('No se pudo conectar con OpenRouter: ') + e.message));

// Offline support (PWA). Not for the test harness nor file:// pages.
if (!testing && 'serviceWorker' in navigator && location.protocol !== 'file:')
  navigator.serviceWorker.register('sw.js').catch(() => {});
