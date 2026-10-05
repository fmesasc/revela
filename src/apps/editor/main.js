// Application bootstrap: wire the modules together and subscribe the render.

import { hasAccounts, cloudAi, refreshAccount, onAccount, account } from '../../io/cloud/account.js';
import { mountCloudStatus, openFromLink } from '../../ui/dialogs/cloud.js';
import { mountNotices } from '../../ui/shell/notices.js';
import { docIdFrom } from '../../io/cloud/clouddocs.js';
import * as clouddocs from '../../io/cloud/clouddocs.js';
import { setCloudAi } from '../../features/ai/openrouter.js';
import { openAccount, handleDesktopRequest, BUYABLE, watchTerms } from '../../ui/dialogs/account.js';
import { initModelAi } from '../../ui/dialogs/model3dai.js';
import { openReport } from '../../ui/dialogs/report.js';
import { handleOpenWith } from '../../ui/shell/openwith.js';
import { editText } from '../../ui/canvas/content.js';
import { ACTIONS } from '../../ui/ribbon/actions.js';
import { initFileDrop } from '../../ui/shell/openfile.js';
import * as openfile from '../../ui/shell/openfile.js';
import * as files from '../../features/content/files.js';
import { subscribe, state, undo, redo, selectedBlock, selectedBlocks } from '../../core/store.js';
import * as clip from '../../features/document/clipboard.js';
import { sanitizeDeck } from '../../features/document/sanitize.js';
import { initCanvas, renderCanvas, cycleSelection } from '../../ui/canvas/canvas.js';
import { nudge } from '../../ui/canvas/interact.js';
import { initPanel, renderPanel } from '../../ui/shell/navigator.js';
import { sorterOn, setSorter, sorterColumns } from '../../ui/shell/sorter.js';
import { renderComments } from '../../ui/panels/comments.js';
import { renderReview } from '../../ui/panels/review.js';
import * as review from '../../features/collab/review.js';
import { renderSelectionPane } from '../../ui/panels/selection.js';
import { renderAnimPane } from '../../ui/panels/animation.js';
import { renderAssistant } from '../../ui/dialogs/assistant.js';
import * as aiDeck from '../../features/ai/authoring.js';
import * as aiAgent from '../../features/ai/agent.js';
import * as poll from '../../features/live/poll.js';
import * as dashboards from '../../features/live/dashboards.js';
import * as stock from '../../features/content/stock.js';
import * as markdown from '../../io/formats/markdown.js';
import { refreshLinkedCharts } from '../../features/live/dashboards.js';
import * as comments from '../../features/collab/comments.js';
import * as protect from '../../features/collab/protect.js';
import { initRibbon, renderRibbon } from '../../ui/ribbon/ribbon.js';
import { initContextMenu } from '../../ui/shell/contextmenu.js';
import * as palette from '../../ui/shell/palette.js';
import { initDraw } from '../../ui/shell/draw.js';
import { initI18n, t } from '../../i18n/index.js';
import { deleteSelected, duplicateSelected, groupSelected, ungroupSelected, addImage, addTableFromText, addText } from '../../features/document/blocks.js';
import { openFindPanel } from '../../ui/dialogs/find.js';
// Namespaces exposed to the test harness (see tests/).
import { initHome } from '../../ui/shell/home.js';
import { initCollabUI } from '../../ui/shell/collab.js';
import * as store from '../../core/store.js';
import { toast } from '../../ui/shell/toast.js';
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
import { openGdriveSetup } from '../../ui/dialogs/gdrive.js';
import * as pptx from '../../io/formats/pptx-export.js';
import * as html from '../../io/formats/html.js';
import * as printing from '../../io/export/print.js';
import * as images from '../../io/export/images.js';
import * as objects from '../../io/export/objects.js';
import * as picture from '../../ui/dialogs/picture.js';
import * as presenting from '../../ui/shell/present.js';
import { publish as publishShare } from '../../io/share/publish.js';
import * as shares from '../../io/share/shares.js';
import * as shareServer from '../../io/cloud/shareserver.js';
import * as a11y from '../../features/document/a11y.js';
import * as reuse from '../../ui/dialogs/reuse.js';
import * as ribbon from '../../ui/ribbon/ribbon.js';
import * as palettes from '../../features/design/palettes.js';
import * as shapeops from '../../features/document/shapeops.js';
import * as master from '../../features/document/master.js';
import * as gallery from '../../features/design/gallery.js';
import * as examples from '../../features/content/examples.js';
import * as designer from '../../features/design/designer.js';
import * as pptxImport from '../../io/formats/pptx-import.js';
import * as odp from '../../io/formats/odp.js';
import { Revela, loadPlugins } from '../../api/index.js';
import { loadNewerDeck } from '../../core/model.js';
import { startAutoVersions } from '../../features/collab/versions.js';
import * as versions from '../../features/collab/versions.js';
import { finishOpenRouterLogin } from '../../features/ai/openrouter.js';
import { alertDialog, confirmDialog, promptDialog } from '../../ui/dialogs/dialog.js';
import { initModalKeys } from '../../ui/dialogs/modalkeys.js';
import * as notify from '../../core/notify.js';
import * as vendor from '../../core/vendor.js';
import { session } from '../../core/session.js';
import * as ai from '../../features/ai/openrouter.js';
import * as api from '../../api/index.js';

// Every deck from outside (files, Drive, imports, co-editors) is cleaned before use; so is the one saved here.
store.setDeckFilter(sanitizeDeck);
gdrive.setGdriveSetup(openGdriveSetup);
review.startTracking();
sanitizeDeck(state.deck);

// io and features ask the user through core/notify: here, with our dialogs.
notify.setNotifier({ alert: alertDialog, confirm: confirmDialog, prompt: promptDialog });
// Presenting from here: the presentation may ask for its live captions translated for the audience (with this editor's AI, if connected).
window.__revelaTranslate = (text, to) => (ai.aiConnected() ? aiDeck.translateLine(text, to) : Promise.resolve(null));
// Slides' placeholders follow their layout's when it is moved in the master view.
master.followLayouts();
// Output of the document (HTML, print, images) and presenting, together for the tests.
const io = { ...html, ...printing, ...images, ...presenting, publishShare };

function render() {
  renderRibbon();
  renderCanvas();
  renderPanel();
  renderComments();
  renderReview();
  renderSelectionPane();
  renderAnimPane();
  renderAssistant();
  const s = document.getElementById('status-slide');
  const ns = store.slideSelCount();
  if (s) s.textContent = `${t('Diapositiva')} ${state.ui.slideIndex + 1} ${t('de')} ${state.deck.slides.length}` + (ns > 1 ? ' · ' + t('{n} diapositivas seleccionadas').replace('{n}', ns) : '');
}

// Keys typed into a field (a dialog's input, the equation editor…) are the
// field's: Backspace must not delete the selected object, nor arrows move it.
// composedPath()[0] sees inside shadow DOM (MathLive's math-field).
const TYPING = 'input, textarea, select, math-field, [contenteditable=""], [contenteditable="true"]';
function inField(e) {
  const t = e.composedPath?.()[0] || e.target;
  return !!(t instanceof Element && (t.closest(TYPING) || t.isContentEditable)) || !!document.querySelector('.modal-backdrop');
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
  // Ctrl+Z while typing undoes the typing (the browser's own undo); once the
  // text is back as it was, it leaves the text and undoes the previous step.
  if (editing && (e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
    const ed = document.activeElement;
    if (ed.dataset.start !== undefined && ed.innerHTML === ed.dataset.start) { e.preventDefault(); ed.blur(); undo(); }
    return;
  }
  if (editing || inField(e)) return;
  // Tab on the slide moves the selection through the objects (reading order);
  // past the last one, focus leaves the slide as usual.
  if (e.key === 'Tab' && document.activeElement?.id === 'stage' && !e.ctrlKey && !e.altKey) {
    if (cycleSelection(e.shiftKey ? -1 : 1)) e.preventDefault();
    return;
  }
  const meta = e.ctrlKey || e.metaKey;
  // As in PowerPoint: F5 presents from the start, Shift+F5 from this slide.
  if (e.key === 'F5') { e.preventDefault(); ACTIONS[e.shiftKey ? 'present-current' : 'present'](); return; }
  if (meta && e.key.toLowerCase() === 'm') { e.preventDefault(); slides.addSlide(); return; }
  if (meta && e.key.toLowerCase() === 's') { e.preventDefault(); ACTIONS.save(); return; }
  if (meta && e.key.toLowerCase() === 'a' && !((sorterOn() || state.ui.navFocus) && !state.ui.selection)) {   // every object of the slide (from the panel: below)
    e.preventDefault(); const ids = (store.currentSlide()?.blocks || []).filter(b => !b.locked).map(b => b.id);
    store.commit(() => { store.setMulti(ids); }, { history: false }); return;
  }
  // The slides panel (or the sorter) was clicked last and no object is selected: keys act on
  // the selected slides, as in PowerPoint (Ctrl+A all, Shift+arrows extend, Esc just the current one).
  if ((sorterOn() || state.ui.navFocus) && !state.ui.selection) {
    const k = e.key.toLowerCase(), back = e.key === 'ArrowUp' || (sorterOn() && e.key === 'ArrowLeft'), fwd = e.key === 'ArrowDown' || (sorterOn() && e.key === 'ArrowRight');
    const shown = () => document.querySelector('#navigator .thumb.active')?.scrollIntoView?.({ block: 'nearest' });
    if (meta && k === 'a') { e.preventDefault(); slides.selectAllSlides(); return; }
    if (e.shiftKey && !meta && (back || fwd)) { e.preventDefault(); const by = sorterOn() && /Up|Down/.test(e.key) ? sorterColumns() : 1; slides.extendSlideSel(back ? -by : by); shown(); return; }
    if (e.key === 'Escape' && (store.slideSelCount() > 1 || state.ui.slidePick)) { e.preventDefault(); slides.collapseSlideSel(); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); slides.deleteSlides(); return; }
    if (meta && k === 'd') { e.preventDefault(); slides.duplicateSlide(); return; }
    if (meta && !e.shiftKey && k === 'c') { e.preventDefault(); slides.copySlides(); return; }
    if (meta && !e.shiftKey && k === 'x') { e.preventDefault(); slides.cutSlides(); return; }
  }
  // The slide sorter: arrows through the grid, Enter/Esc to edit the slide, Delete, Ctrl+D.
  if (sorterOn()) {
    const n = state.deck.slides.length, i = state.ui.slideIndex, cols = sorterColumns();
    const to = { ArrowRight: i + 1, ArrowLeft: i - 1, ArrowDown: i + cols, ArrowUp: i - cols, Home: 0, End: n - 1 }[e.key];
    if (to !== undefined) { e.preventDefault(); slides.goToSlide(Math.max(0, Math.min(n - 1, to))); document.querySelector('#navigator .thumb.active')?.scrollIntoView?.({ block: 'nearest' }); return; }
    if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); setSorter(false); return; }
    if ((e.key === 'Delete' || e.key === 'Backspace') && n > 1) { e.preventDefault(); slides.deleteSlide(i); return; }
    if (meta && e.key.toLowerCase() === 'd') { e.preventDefault(); slides.duplicateSlide(); return; }
  }
  if (e.key === 'Escape' && state.ui.selection) { store.commit(() => store.setSelection(null), { history: false }); return; }
  // Moving between slides: Page Up/Down, Home/End, and the arrows when nothing is selected.
  const go = i => { if (i >= 0 && i < state.deck.slides.length && i !== state.ui.slideIndex) slides.goToSlide(i); };
  if (e.key === 'PageDown' || (!state.ui.selection && (e.key === 'ArrowDown' || e.key === 'ArrowRight'))) { e.preventDefault(); go(state.ui.slideIndex + 1); return; }
  if (e.key === 'PageUp' || (!state.ui.selection && (e.key === 'ArrowUp' || e.key === 'ArrowLeft'))) { e.preventDefault(); go(state.ui.slideIndex - 1); return; }
  if (e.key === 'Home' && !state.ui.selection) { e.preventDefault(); go(0); return; }
  if (e.key === 'End' && !state.ui.selection) { e.preventDefault(); go(state.deck.slides.length - 1); return; }
  if (meta && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (meta && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
  if (meta && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicateSelected(); return; }
  // Ctrl+C / Ctrl+X on selected objects (Ctrl+V arrives as a paste event below).
  if (meta && !e.shiftKey && e.key.toLowerCase() === 'c' && selectedBlocks().length) { e.preventDefault(); clip.copySelected(); return; }
  if (meta && !e.shiftKey && e.key.toLowerCase() === 'x' && selectedBlocks().length) { e.preventDefault(); clip.cutSelected(); return; }
  if (meta && e.key.toLowerCase() === 'g') { e.preventDefault(); e.shiftKey ? ungroupSelected() : groupSelected(); return; }
  // A text box selected: Enter or F2 edits it; typing replaces its text (PowerPoint, Google Slides).
  const one = selectedBlocks().length === 1 ? selectedBlock() : null;
  if ((one?.type === 'text' || (one?.type === 'shape' && !['line', 'arrow'].includes(one.shape))) && !one.locked && !meta && !e.altKey) {
    if (e.key === 'Enter' || e.key === 'F2') { e.preventDefault(); editText(one.id, { selectAll: false }); return; }
    if (e.key.length === 1 && e.key !== ' ') { editText(one.id); return; }   // (the key then types over it)
  }
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
initModalKeys();
palette.initPalette();
document.addEventListener('keydown', keyboard);
// Paste onto the slide (not while typing): an image becomes a picture, cells
// copied from a spreadsheet become a table, other text a text box.
document.addEventListener('paste', e => {
  const a = document.activeElement;
  if (a?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a?.tagName || '') || document.querySelector('.modal-backdrop')) return;
  const cd = e.clipboardData; if (!cd) return;
  // Slides copied in the panel, pasted there.
  if (state.ui.navFocus && slides.hasSlideClip() && ![...cd.files].length) { e.preventDefault(); slides.pasteSlides(); return; }
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
// What an object's text was when editing began (for Ctrl+Z while typing).
document.addEventListener('focusin', e => { const el = e.target; if (el.isContentEditable && el.closest?.('.block')) el.dataset.start = el.innerHTML; });
window.addEventListener('revela:lang', render);
render();
initI18n();

// Test hook: exposes the module graph so the headless suite (tests/) can drive
// and inspect the real app. Only active with ?test in the URL.
const testing = new URLSearchParams(location.search).has('test');
if (testing)
  window.__revela = { state, render, store, model, blocks, format, slides, trans, fonts, remote, search, i18n, gdrive, pptx, io, a11y, reuse, ribbon, palettes, shapeops, master, gallery, examples, designer, pptxImport, odp, api, ai, versions, comments, protect, aiDeck, aiAgent, poll, dashboards, stock, clipboard: clip, markdown, notify, vendor, session, objects, picture, shares, shareServer, clouddocs, review, files, openfile, palette, video: () => import('../../io/export/video.js') };

// Public scripting API for plugins, macros and the console; installed plugins
// load after the editor is ready (not in the test harness).
window.Revela = Revela;
// A deck too big for localStorage lives in IndexedDB: load it if it's newer.
// (Not when opening someone's shared session: that document comes from them.)
if (!testing && !['collab', 'doc'].some(k => new URLSearchParams(location.search).has(k))) loadNewerDeck(state.deck).then(d => { if (d) store.adoptDeck(d, { sameDocument: true }); });
initCollabUI();
initHome();
initFileDrop();
// First visit (nothing saved in this browser, no shared link): start from the
// templates, as PowerPoint and Canva do; closing it leaves the blank slide.
{ const q = new URLSearchParams(location.search), fresh = (() => { try { return !localStorage.getItem(model.STORAGE_KEY) && !localStorage.getItem('revela.welcomed'); } catch { return false; } })();
  if (!testing && fresh && !['collab', 'open', 'u', 'd', 'state', 'dropbox', 'doc', 'lti', 'report', 'comprar', 'desktop', 'plantilla'].some(k => q.has(k))) {
    try { localStorage.setItem('revela.welcomed', '1'); } catch {}
    import('../../ui/dialogs/gallery.js').then(g => g.openGallery());
  } }
// Leaving the page: what is still waiting to be written is written now.
window.addEventListener('pagehide', () => model.flushSave());
startAutoVersions();
// Opening another presentation over one with changes: a copy of it stays in this browser (Versions).
// If it wasn't saved anywhere else (Drive, Revela's cloud), a note offers it back at once.
{
  versions.keepBeforeReplacing();
  let onlyHere = false;
  store.onBeforeReplace(() => { onlyHere = !gdrive.linkedFile() && !clouddocs.cloudDoc(); }, { first: true });
  versions.onKept(({ id, title }) => {
    if (!onlyHere) return;
    toast(t('«{n}» tenía cambios: se ha guardado una copia en este navegador (Archivo ▸ Versiones).').replace('{n}', title || t('Presentación sin título')),
      { action: { label: t('Recuperar'), run: () => versions.restoreVersion(id) } });
  });
}
if (!testing) loadPlugins();
// Charts linked to a CSV load fresh data when the editor opens.
if (!testing) refreshLinkedCharts().catch(() => {});
// Back from OpenRouter sign-in (?code=…): exchange it for the key.
// The official edition and the desktop app: the Revela account (its AI, credits,
// payments). The button shows the credits; the desktop app's sign-in is confirmed here.
if (hasAccounts()) {
  setCloudAi(cloudAi);
  const btn = document.getElementById('plan-btn'), paint = me => { btn.hidden = false;
    btn.querySelector('span').textContent = me ? `${Math.max(0, me.credits | 0)}` : t('Iniciar sesión'); btn.classList.toggle('in', !!me); };
  onAccount(paint); paint(null); mountCloudStatus(); watchTerms(); mountNotices();
  initModelAi();
  btn.addEventListener('click', () => openAccount());
  window.addEventListener('revela:lang', () => paint(account()));
  if (!testing) {
    // (A shared link, ?doc=: asked for at once, alongside the account, under a loading screen —
    // not the empty editor first and the presentation popping in later.)
    const opening = docIdFrom() ? openingScreen() : null;
    if (opening) openFromLink(undefined, { settle: opening }).finally(opening);
    refreshAccount().catch(() => {}).finally(() => { handleDesktopRequest(); });
    if (new URLSearchParams(location.search).has('paid')) { history.replaceState(null, '', location.pathname); alertDialog(t('¡Gracias! Tu compra se ha registrado.')); }
    // From the prices page (revelaslides.com/pricing): the account, with the product chosen.
    const buy = new URLSearchParams(location.search).get('comprar');
    if (BUYABLE.includes(buy)) { history.replaceState(null, '', location.pathname); refreshAccount().catch(() => {}).finally(() => openAccount({ buy })); }
  }
}
// From the website's support page (revelaslides.com/support): «Informar de un problema».
if (!testing && new URLSearchParams(location.search).has('report')) { history.replaceState(null, '', location.pathname); (hasAccounts() ? refreshAccount().catch(() => {}) : Promise.resolve()).finally(() => openReport()); }
// Opened from Drive's or Dropbox's "Open with ▸ Revela" (or Drive's "New ▸ Revela").
if (!testing) handleOpenWith();
// From a demo (revelaslides.com, fmesasc.com/revela): ?plantilla=<name> opens that sample presentation,
// in the interface's language, ready to change (whatever was open stays in Versions, as always).
{ const k = new URLSearchParams(location.search).get('plantilla');
  if (!testing && k && Object.hasOwn(examples.EXAMPLES, k)) {
    history.replaceState(null, '', location.pathname);
    examples.loadExample(k, i18n.currentLang()).then(d => { if (d) store.replaceDeck(d); }).catch(() => {});
  } }
if (!testing) finishOpenRouterLogin().then(ok => { if (ok) alertDialog(t('IA conectada con OpenRouter.')); })
  .catch(e => alertDialog(t('No se pudo conectar con OpenRouter: ') + e.message));

// Offline support (PWA). Not for the test harness nor file:// pages.
if (!testing && 'serviceWorker' in navigator && location.protocol !== 'file:')
  navigator.serviceWorker.register('sw.js').catch(() => {});

// The loading screen while a shared presentation opens; returns what removes it.
function openingScreen() {
  const el = document.createElement('div');
  el.id = 'opening-doc'; el.setAttribute('role', 'status');
  el.innerHTML = `<div class="od-box"><span class="od-spin" aria-hidden="true"></span><span>${t('Abriendo la presentación…')}</span></div>`;
  document.body.appendChild(el);
  return () => { if (el.classList.contains('done')) return; el.classList.add('done'); setTimeout(() => el.remove(), 250); };
}
