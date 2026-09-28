// What every ribbon button does, by its data-action (also used by keyboard
// shortcuts, the context menu and the tests).

import { state, commit, undo, redo, replaceDeck, currentSlide, selectedBlock, selectedBlocks } from '../../core/store.js';
import { emptyDeck } from '../../core/model.js';
import * as slides from '../../features/document/slides.js';
import * as blocks from '../../features/document/blocks.js';
import * as format from '../../features/document/format.js';
import * as trans from '../../features/animation/transitions.js';
import * as templates from '../../features/document/templates.js';
import { exportHTML } from '../../io/formats/html.js';
import { saveProject } from '../../io/formats/project.js';
import { exportPDF } from '../../io/export/print.js';
import { present } from '../shell/present.js';
import { importPPTX } from '../../io/formats/pptx-import.js';
import * as gdrive from '../../io/cloud/gdrive.js';
import { exportPPTX } from '../../io/formats/pptx-export.js';
import * as odp from '../../io/formats/odp.js';
import { pickReuseFile } from '../dialogs/reuse.js';
import { openA11yCheck, openReadingOrder } from '../panels/a11y.js';
import { openHandoutDialog, openImageDialog, openVideoDialog } from '../dialogs/print.js';
import { openSaveAsPicture } from '../dialogs/picture.js';
import { openShare } from '../dialogs/share.js';
import { openTextStyles } from '../dialogs/textstyles.js';
import * as recorder from '../shell/recorder.js';
import * as master from '../../features/document/master.js';
import * as clip from '../../features/document/clipboard.js';
import { openGallery, openDesignIdeas } from '../dialogs/gallery.js';
import { autocorrectOn, setAutocorrect } from '../../features/document/autocorrect.js';
import { openPlugins, openMacros } from '../dialogs/plugins.js';
import { openVersions } from '../dialogs/versions.js';
import * as protect from '../../features/collab/protect.js';
import { toggleComments } from '../panels/comments.js';
import * as media from '../../features/live/media.js';
import * as poll from '../../features/live/poll.js';
import { openPollEditor } from '../dialogs/poll.js';
import { openCodeEditor } from '../dialogs/code.js';
import { openBackgroundDialog } from '../dialogs/background.js';
import { openSettings } from '../dialogs/settings.js';
import { markdownToSlides } from '../../io/formats/markdown.js';
import { openAppearance } from '../shell/appearance.js';
import { openDashboardDialog } from '../dialogs/data.js';
import { openStockImages, openOnlineIcons } from '../dialogs/stock.js';
import { playAnimations } from '../canvas/preview.js';
import { openHostPanel } from '../dialogs/remote.js';
import * as search from '../../features/document/search.js';
import { t } from '../../i18n/index.js';
import { confirmDialog, promptDialog, alertDialog } from '../dialogs/dialog.js';
import { renderRibbon } from './ribbon.js';
import { openShortcuts } from '../dialogs/shortcuts.js';
import { openHeaderFooter } from '../dialogs/headerfooter.js';
import { openAnimPanel } from '../panels/animation.js';
import { setZoom, fitZoom } from './zoom.js';
import { setNavHidden } from '../shell/navigator.js';
import { AI_ACTIONS } from '../dialogs/ai.js';

const $ = s => document.querySelector(s);

export const readFile = (accept, cb, as = 'DataURL') => {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = accept;
  inp.onchange = () => { const f = inp.files[0]; if (!f) return;
    if (as === 'file') { cb(f); return; }
    const r = new FileReader(); r.onload = () => cb(r.result);
    if (as === 'text') r.readAsText(f); else r.readAsDataURL(f); };
  inp.click();
};
export let animPaint = null;       // animation being copied with the painter
export function endAnimPaint() { animPaint = null; document.body.classList.remove('anim-painting'); $('[data-action="anim-paint"]')?.classList.remove('on'); }
export const ACTIONS = {
  'new': () => confirmDialog(t('¿Nueva presentación? Se perderá la actual si no la has guardado.'))
    .then(ok => { if (ok) replaceDeck(emptyDeck()); }),
  'open': () => readFile('.json,application/json', async txt => {
    let obj; try { obj = JSON.parse(txt); } catch { alertDialog(t('Proyecto no válido.')); return; }
    if (protect.isEncrypted(obj)) {
      const pw = await promptDialog(t('Este proyecto está protegido. Contraseña:'), ''); if (!pw) return;
      try { obj = await protect.decryptDeck(obj, pw); } catch { alertDialog(t('Contraseña incorrecta.')); return; }
    }
    if (!obj || !Array.isArray(obj.slides)) { alertDialog(t('Proyecto no válido.')); return; }
    replaceDeck(obj);
  }, 'text'),
  'save-protected': async () => {
    const pw = await promptDialog(t('Contraseña para cifrar el proyecto (no se puede recuperar si la olvidas):'), ''); if (!pw) return;
    const pw2 = await promptDialog(t('Repite la contraseña:'), ''); if (pw2 !== pw) { alertDialog(t('Las contraseñas no coinciden.')); return; }
    const env = await protect.encryptDeck(state.deck, pw);
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(env)], { type: 'application/json' }));
    a.download = (state.deck.name || 'presentacion').replace(/[^\p{L}\p{N}]+/gu, '-') + '.revela.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  },
  'mark-final': () => protect.setFinal(!protect.isFinal()),
  'save': saveProject,
  'gallery': () => openGallery(),
  'versions': () => openVersions(),
  'design-ideas': () => openDesignIdeas(),
  'gdrive-open': () => gdrive.openWithUI(),
  'gdrive-save': () => gdrive.saveWithUI(),
  'gdrive-html': () => gdrive.saveHtmlWithUI(),
  'gdrive-config': () => gdrive.openGdriveSetup(),
  'export': exportHTML,
  'export-pptx': () => exportPPTX(),
  'export-pdf': exportPDF,
  'export-png': () => openImageDialog(),
  'share': () => openShare(),
  'toggle-nav': () => { setNavHidden(!document.body.classList.contains('nav-hidden')); requestAnimationFrame(fitZoom); },
  'save-picture': () => (selectedBlocks().length ? openSaveAsPicture() : alertDialog(t('Selecciona primero uno o varios objetos.'))),
  'export-video': () => openVideoDialog(),
  'present': () => present(),
  'rehearse': () => present({ rehearse: true }),
  'record-show': () => recorder.recordSlideshow(),
  'record-screen': () => recorder.recordToSlide('screen'),
  'record-camera': () => recorder.recordToSlide('camera'),
  'insert-camera': () => media.addCamera('circle'),
  'insert-poll': () => openPollEditor(poll.addPoll()),
  'insert-dashboard': () => openDashboardDialog(),
  'insert-stock': () => openStockImages(),
  'insert-online-icon': () => openOnlineIcons(),
  'trans-apply-all': () => trans.applyTransitionToAll(),
  'import-pptx': () => readFile('.pptx,.odp', async file => {
    try { replaceDeck(/\.odp$/i.test(file.name) ? await odp.importODP(file) : await importPPTX(file)); }
    catch (e) { alertDialog(t('No se pudo importar la presentación: ') + e.message); } }, 'file'),
  'export-odp': async () => {
    try {
      const blob = await odp.buildODP();
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = (state.deck.name || 'presentacion').replace(/[^\p{L}\p{N}]+/gu, '-') + '.odp'; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch (e) { alertDialog(t('No se pudo exportar: ') + e.message); }
  },
  'reuse-slides': () => pickReuseFile(),
  'import-md': () => readFile('.md,.markdown,.txt,text/markdown', md => {
    const list = markdownToSlides(md, state.deck.size);
    if (!list.length) { alertDialog(t('El archivo no contiene diapositivas.')); return; }
    const bg = currentSlide()?.background || '#101317';
    list.forEach(s => { s.background = bg; });
    slides.importSlides({ size: state.deck.size, slides: list });
  }, 'text'),
  'a11y-check': () => openA11yCheck(),
  'reading-order': () => openReadingOrder(),
  'comments': () => toggleComments(),
  ...AI_ACTIONS,
  'plugins': () => openPlugins(),
  'macros': () => openMacros(),
  'autocorrect': () => { setAutocorrect(!autocorrectOn()); renderRibbon(); },
  'master-edit': () => master.toggleMasterEdit(),
  'master-close': () => master.toggleMasterEdit(false),
  'master-styles': () => openTextStyles(),
  'layout-new': () => master.addLayout(),
  'layout-dup': () => master.addLayout(state.ui.editMaster),
  'layout-rename': () => { const l = state.deck.layouts?.find(x => x.id === state.ui.editMaster); if (l) promptDialog(t('Nombre del diseño:'), l.name).then(v => { if (v && v.trim()) master.renameLayout(l.id, v.trim()); }); },
  'layout-delete': () => confirmDialog(t('¿Eliminar este diseño?')).then(ok => { if (ok) master.deleteLayout(state.ui.editMaster); }),
  'hide-master': () => master.toggleHideMaster(),
  'export-handout': () => openHandoutDialog(),
  'undo': undo, 'redo': redo,
  'slide-add': slides.addSlide, 'slide-duplicate': slides.duplicateSlide,
  'slide-vertical': () => slides.toggleVertical(),
  'bg-advanced': () => openBackgroundDialog(),
  'deck-settings': () => openSettings(),
  'appearance': () => openAppearance(),
  'slide-delete': () => slides.deleteSlide(),
  'section-add': () => slides.addSection(),   // creates + renames inline (no prompt)
  'insert-text': blocks.addText,
  'insert-image': () => readFile('image/*', blocks.addImage),
  'insert-table': blocks.addTable,
  'insert-table-csv': () => readFile('.csv,.tsv,.txt,text/csv', async f => blocks.addTableFromText(await f.text()), 'file'),
  'insert-table-paste': () => promptDialog(t('Pega aquí las celdas copiadas de una hoja de cálculo (o texto CSV):'), '')
    .then(v => { if (v) blocks.addTableFromText(v); }),
  'insert-code': () => { blocks.addCode(); const b = selectedBlock(); if (b?.type === 'code') openCodeEditor(b); },
  'insert-chart': blocks.addChart,
  'insert-math': blocks.addMath,
  'insert-model': () => readFile('.glb,.gltf', blocks.addModel),
  'insert-video': () => readFile('video/*', blocks.addVideo),
  'insert-audio': () => readFile('audio/*', blocks.addAudio),
  'insert-embed': () => promptDialog(t('Dirección de la página web (URL):'), 'https://').then(url => {
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    blocks.addEmbed(url);
  }),
  'obj-delete': () => blocks.deleteSelected(),
  'clip-copy': () => clip.copySelected(),
  'clip-cut': () => clip.cutSelected(),
  'clip-paste': () => clip.paste(),
  'obj-duplicate': () => blocks.duplicateSelected(),
  'group': () => blocks.groupSelected(),
  'ungroup': () => blocks.ungroupSelected(),
  'connect-blocks': () => blocks.addConnector(),
  'insert-link': format.link,
  'forward': blocks.bringForward, 'backward': blocks.sendBackward,
  'front': blocks.bringToFront, 'back': blocks.sendToBack,
  'obj-anim-clear': trans.clearAnimation,
  'anim-paint': () => {
    const a = trans.copyAnimationFrom();
    if (!a) { alertDialog(t('Selecciona primero un objeto con animación.')); return; }
    animPaint = a; document.body.classList.add('anim-painting');
    $('[data-action="anim-paint"]')?.classList.add('on');
  },
  'template-save': () => promptDialog(t('Nombre de la plantilla')).then(n => { if (n) templates.saveCurrentAsTemplate(n); }),
  'toggle-guides': () => commit(() => (state.ui.showGuides = !state.ui.showGuides), { history: false }),
  'toggle-ruler': () => commit(() => (state.ui.showRuler = !state.ui.showRuler), { history: false }),
  'toggle-snap': () => commit(() => (state.ui.snap = state.ui.snap === false), { history: false }),
  'toggle-slidenum': () => commit(() => (state.deck.slideNumber.show = !state.deck.slideNumber.show)),
  'toggle-footer': () => commit(() => (state.deck.footer.show = !state.deck.footer.show)),
  'toggle-footerdate': () => commit(() => (state.deck.footer.date = !state.deck.footer.date)),
  'toggle-loop': () => commit(() => (state.deck.loop = !state.deck.loop)),
  'toggle-autoanimate': () => slides.toggleAutoAnimate(),
  'dup-animate': () => slides.duplicateForAnimate(),
  'toggle-notes': () => commit(() => (state.ui.showNotes = !state.ui.showNotes), { history: false }),
  'connect-mobile': () => openHostPanel(),
  'shortcuts': () => openShortcuts(),
  'insert-hf': () => openHeaderFooter(),
  'anim-panel': () => openAnimPanel(),
  'anim-play': () => playAnimations(),
  'insert-date': () => blocks.addDate(),
  'insert-figindex': () => blocks.addFigIndex(),
  'insert-slideref': () => blocks.addSlideRef(),
  'insert-summary': () => blocks.addSummaryZoom(),
  'find-replace': () => search.openFindPanel(),
  'copy-style': () => format.copyStyle(),
  'paste-style': () => format.pasteStyle(),
  'bg-gradient': () => {
    const a = $('[data-grad1]')?.value || '#3f6497', b = $('[data-grad2]')?.value || '#101317';
    commit(() => { currentSlide().background = `linear-gradient(135deg, ${a}, ${b})`; });
  },
  'bg-image': () => readFile('image/*', src => commit(() => { currentSlide().background = `#000 url(${src}) center/cover no-repeat`; })),
  'bg-all': () => { const bg = currentSlide().background; commit(() => { for (const s of state.deck.slides) s.background = bg; }); },
  'set-logo': () => readFile('image/*', src => commit(() => { state.deck.logo.src = src; })),
  'clear-logo': () => commit(() => { state.deck.logo.src = ''; }),
  'zoom-in': () => setZoom((state.ui.zoom || 1) + 0.1),
  'zoom-out': () => setZoom((state.ui.zoom || 1) - 0.1),
  'zoom-reset': () => setZoom(1),
  'zoom-fit': () => fitZoom(),
};
