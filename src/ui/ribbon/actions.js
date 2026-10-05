// What every ribbon button does, by its data-action (also used by keyboard
// shortcuts, the context menu and the tests).

import { editText } from '../canvas/content.js';
import { readFile, openProject, openPresentation, insertMarkdown, insertFiles, openAnyPresentation } from '../shell/openfile.js';
import { openSaveWhere } from '../shell/where.js';
import * as clouddocs from '../../io/cloud/clouddocs.js';
import { openFindPanel } from '../dialogs/find.js';
import { toggleDictation } from '../shell/dictate.js';
import { toggleSelectionPane } from '../panels/selection.js';
import { openGdriveSetup, driveSaveUI, driveSaveAsUI } from '../dialogs/gdrive.js';
import { openCloud } from '../dialogs/othercloud.js';
import { state, commit, undo, redo, replaceDeck, currentSlide, selectedBlock, selectedBlocks, targetSlides } from '../../core/store.js';
import { isBlankDeck, emptyDeck, savedHere } from '../../core/model.js';
import * as slides from '../../features/document/slides.js';
import * as blocks from '../../features/document/blocks.js';
import * as format from '../../features/document/format.js';
import * as trans from '../../features/animation/transitions.js';
import * as templates from '../../features/document/templates.js';
import { exportHTML } from '../../io/formats/html.js';
import { saveProject } from '../../io/formats/project.js';
import { exportPDF } from '../../io/export/print.js';
import { exportPDFFile } from '../../io/export/pdf.js';
import { present, openCallPresent } from '../shell/present.js';
import { sorterOn, setSorter } from '../shell/sorter.js';
import { startCoach } from '../shell/coach.js';
import { openCollab } from '../shell/collab.js';
import { openHome } from '../shell/home.js';
import { openElements } from '../shell/elements.js';
import { canvasOn, setCanvasMode } from '../../features/design/canvasmode.js';
import { toggleCanvasView } from '../shell/canvasview.js';
import { openSignatures, toggleFinal } from '../dialogs/signature.js';
import * as gdrive from '../../io/cloud/gdrive.js';
import { exportPPTX } from '../../io/formats/pptx-export.js';
import * as odp from '../../io/formats/odp.js';
import { pickReuseFile } from '../dialogs/reuse.js';
import { openA11yCheck, openReadingOrder } from '../panels/a11y.js';
import { openHandoutDialog, openImageDialog, openVideoDialog } from '../dialogs/print.js';
import { openSaveAsPicture } from '../dialogs/picture.js';
import { openShare } from '../dialogs/share.js';
import { openTextStyles } from '../dialogs/textstyles.js';
import * as mv from '../shell/masterview.js';
import * as recorder from '../shell/recorder.js';
import * as master from '../../features/document/master.js';
import * as clip from '../../features/document/clipboard.js';
import { openGallery, openDesignIdeas } from '../dialogs/gallery.js';
import { autocorrectOn, setAutocorrect } from '../../features/document/autocorrect.js';
import { openPlugins, openMacros } from '../dialogs/plugins.js';
import { openVersions } from '../dialogs/versions.js';
import { openClassResults, shareToClassroom } from '../dialogs/classroom.js';
import { openCloudDocs, openCloudShare } from '../dialogs/cloud.js';
import { toggleCall } from '../panels/call.js';
import * as protect from '../../features/collab/protect.js';
import { toggleComments } from '../panels/comments.js';
import { toggleReview } from '../panels/review.js';
import * as media from '../../features/live/media.js';
import * as poll from '../../features/live/poll.js';
import { openPollEditor } from '../dialogs/poll.js';
import { openCodeEditor } from '../dialogs/code.js';
import { openBackgroundDialog } from '../dialogs/background.js';
import { openBrandKit } from '../dialogs/brandkit.js';
import { openResize } from '../dialogs/resize.js';
import { openSettings } from '../dialogs/settings.js';
import { openAppearance } from '../shell/appearance.js';
import { openDashboardDialog } from '../dialogs/data.js';
import { playAnimations } from '../canvas/preview.js';
import { startPathDraw } from '../canvas/pathdraw.js';
import { startMagnifyDraw } from '../canvas/magnifyview.js';
import { openAddAnimation } from './animadd.js';
import { openHostPanel } from '../dialogs/remote.js';
import { t } from '../../i18n/index.js';
import { confirmDialog, promptDialog, alertDialog } from '../dialogs/dialog.js';
import { renderRibbon } from './ribbon.js';
import { toast, withProgress } from '../shell/toast.js';
import { openShortcuts } from '../dialogs/shortcuts.js';
import { openReport } from '../dialogs/report.js';
import { openHeaderFooter } from '../dialogs/headerfooter.js';
import { toggleAnimPane } from '../panels/animation.js';
import { setZoom, fitZoom } from './zoom.js';
import { setNavHidden } from '../shell/navigator.js';
import { AI_ACTIONS } from '../dialogs/ai.js';
import { openModelAi } from '../dialogs/model3dai.js';
import { toggleAssistant } from '../dialogs/assistant.js';

const $ = s => document.querySelector(s);

export { readFile };                                        // (it lives in ui/shell/openfile.js)
// The slides panel (or the sorter) was the last place clicked, with no object selected.
export const slidesFocused = () => (state.ui.navFocus || document.body.classList.contains('sorter')) && !selectedBlocks().length;
export let animPaint = null;       // animation being copied with the painter
export function endAnimPaint() { animPaint = null; document.body.classList.remove('anim-painting'); $('[data-action="anim-paint"]')?.classList.remove('on'); }
export const ACTIONS = {
  'new': () => (isBlankDeck(state.deck) ? Promise.resolve(true) : confirmDialog(t('¿Nueva presentación? Se perderá la actual si no la has guardado.'), { ok: t('Descartar la actual'), danger: true }))
    .then(ok => { if (ok) replaceDeck(emptyDeck()); }),
  'open': () => openAnyPresentation(),
  'save-protected': async () => {
    const pw = await promptDialog(t('Contraseña para cifrar el proyecto (no se puede recuperar si la olvidas):'), ''); if (!pw) return;
    const pw2 = await promptDialog(t('Repite la contraseña:'), ''); if (pw2 !== pw) { alertDialog(t('Las contraseñas no coinciden.')); return; }
    const env = await protect.encryptDeck(state.deck, pw);
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(env)], { type: 'application/json' }));
    a.download = (state.deck.name || 'presentacion').replace(/[^\p{L}\p{N}]+/gu, '-') + '.revela.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  },
  'mark-final': () => toggleFinal(),
  'signatures': () => openSignatures(),
  // Save (Ctrl+S, the disk): where it is kept — its Drive file now, its cloud copy now —; kept only in
  // this browser, the choice of where. (A file to keep oneself: «Descargar».)
  'save': () => {
    if (gdrive.linkedFile()) return driveSaveUI();
    if (clouddocs.cloudDoc()) return clouddocs.flushCloud().then(() => toast(t('Guardado en la nube de Revela.')));
    const at = [document.getElementById('save-state'), document.querySelector('.qat [data-action="save"]')].find(x => x && x.offsetParent);
    if (savedHere() && at) return openSaveWhere(at);
    ACTIONS['download-project']();
  },
  'download-project': () => { saveProject(); toast(t('Proyecto descargado (.revela.json). Para seguir con él otro día: Archivo ▸ Abrir.')); },
  'gallery': () => openGallery(),
  'home': () => openHome(),
  'versions': () => openVersions(),
  'review-panel': () => toggleReview(),
  'cloud-docs': () => openCloudDocs(),
  'cloud-share': () => openCloudShare(),
  'cloud-call': () => toggleCall(),
  'design-ideas': () => openDesignIdeas(),
  'gdrive-open': () => gdrive.openWithUI(),
  'gslides-import': () => gdrive.pickSlidesFile().then(f => f && openPresentation(f)).catch(e => alertDialog(e.message === 'NO_TOKEN' ? t('Vuelve a iniciar sesión con Google.') : e.message)),
  'gdrive-save': () => driveSaveUI(),
  'gdrive-save-as': () => driveSaveAsUI(),
  'gdrive-html': () => gdrive.saveHtmlWithUI(),
  'gdrive-config': () => openGdriveSetup(),
  'cloud-onedrive': () => openCloud('onedrive'),
  'cloud-dropbox': () => openCloud('dropbox'),
  // (A download alone is easy to miss: each one says what it was and what next.)
  'export': async () => {
    const offline = await exportHTML();
    toast(offline ? t('Página web descargada: se abre con cualquier navegador, también sin conexión (los modelos 3D, mapas y vídeos de internet sí la necesitan).')
      : t('Página web descargada: para verla hace falta conexión a internet.'));
  },
  'export-pptx': () => withProgress(t('Creando el archivo de PowerPoint…'), exportPPTX, t('PowerPoint descargado.')),
  // (The file itself, made here; printing — or the browser's «Save as PDF», with selectable text — is «Imprimir».)
  'export-pdf': () => withProgress(t('Creando el PDF…'), () => exportPDFFile(), t('PDF descargado.')),
  'print': () => exportPDF(msg => toast(msg, { ms: 9000 })),
  'export-png': () => openImageDialog(),
  'share': () => openShare(),
  'collab': () => openCollab(),
  'slide-sorter': () => setSorter(!sorterOn()),
  'toggle-nav': () => { setNavHidden(!document.body.classList.contains('nav-hidden')); requestAnimationFrame(fitZoom); },
  'save-picture': () => (selectedBlocks().length ? openSaveAsPicture() : alertDialog(t('Selecciona primero uno o varios objetos.'))),
  'export-video': () => openVideoDialog(),
  'present': () => present(),
  'present-current': () => present({ fromCurrent: true }),
  'present-call': () => openCallPresent(),
  'rehearse': () => present({ rehearse: true }),
  'classroom': () => commit(() => { if (state.deck.classroom) delete state.deck.classroom; else state.deck.classroom = true; }),
  'classroom-results': () => openClassResults(),
  'present-self': () => present({ selfPaced: true }),
  'share-classroom': () => shareToClassroom(),
  'coach': () => startCoach(),
  'record-show': () => recorder.recordSlideshow(),
  'record-screen': () => recorder.recordToSlide('screen'),
  'record-camera': () => recorder.recordToSlide('camera'),
  'insert-camera': () => media.addCamera('circle'),
  'insert-poll': () => openPollEditor(poll.addPoll(), { fresh: true }),
  'insert-dashboard': () => openDashboardDialog(),
  'insert-stock': () => openElements('images'),
  'insert-online-icon': () => openElements('icons'),
  'trans-apply-all': () => trans.applyTransitionToAll(),
  'import-pptx': () => readFile('.pptx,.pptm,.potx,.odp,.otp,.key', openPresentation, 'file'),
  'export-odp': () => withProgress(t('Creando el archivo ODP…'), async () => {
    try {
      const blob = await odp.buildODP();
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = (state.deck.name || 'presentacion').replace(/[^\p{L}\p{N}]+/gu, '-') + '.odp'; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch (e) { alertDialog(t('No se pudo exportar: ') + e.message); return false; }
  }, t('Archivo ODP descargado.')),
  'reuse-slides': () => pickReuseFile(),
  'import-md': () => readFile('.md,.markdown,.txt,text/markdown', insertMarkdown, 'text'),
  'a11y-check': () => openA11yCheck(),
  'reading-order': () => openReadingOrder(),
  'comments': () => toggleComments(),
  ...AI_ACTIONS,
  'ai-assistant': () => toggleAssistant(),
  'plugins': () => openPlugins(),
  'macros': () => openMacros(),
  'autocorrect': () => { setAutocorrect(!autocorrectOn()); renderRibbon(); },
  'master-edit': () => master.toggleMasterEdit(),
  'master-close': () => master.toggleMasterEdit(false),
  'master-styles': () => openTextStyles(),
  'layout-new': () => master.addLayout(),
  'master-new': () => master.addMaster(),
  'master-delete': () => mv.deleteItem(),
  'layout-dup': () => master.addLayout(state.ui.editMaster),
  'layout-rename': () => mv.renameItem(),
  'layout-delete': () => mv.deleteItem(),
  'master-item-delete': () => mv.deleteItem(),
  'layout-hide-graphics': () => mv.toggleLayoutGraphics(),
  'layout-master-bg': () => mv.toggleLayoutMasterBg(),
  'hide-master': () => master.toggleHideMaster(),
  'export-handout': () => openHandoutDialog(),
  'undo': undo, 'redo': redo,
  'slide-add': slides.addSlide, 'slide-duplicate': slides.duplicateSlide,
  'slide-vertical': () => slides.toggleVertical(),
  'bg-advanced': () => openBackgroundDialog(),
  'brand-kit': () => openBrandKit(),
  'resize-deck': () => openResize(),
  'deck-settings': () => openSettings(),
  'appearance': () => openAppearance(),
  'slide-delete': () => slides.deleteSlide(),
  'section-add': () => slides.addSection(),   // creates + renames inline (no prompt)
  'insert-text': () => { blocks.addText(); requestAnimationFrame(() => editText(state.ui.selection)); },   // (ready to type, as in PowerPoint)
  'insert-image': () => readFile('image/*', blocks.addImage),
  'insert-table': blocks.addTable,
  'insert-table-csv': () => readFile('.csv,.tsv,.txt,text/csv', async f => blocks.addTableFromText(await f.text()), 'file'),
  'insert-table-paste': () => promptDialog(t('Pega aquí las celdas copiadas de una hoja de cálculo (o texto CSV):'), '')
    .then(v => { if (v) blocks.addTableFromText(v); }),
  'insert-code': () => { blocks.addCode(); const b = selectedBlock(); if (b?.type === 'code') openCodeEditor(b); },
  'insert-chart': blocks.addChart,
  'insert-math': blocks.addMath,
  'insert-timer': () => blocks.addTimer(),
  'insert-file': () => { const i = document.createElement('input'); i.type = 'file'; i.addEventListener('change', () => { if (i.files.length) insertFiles(i.files); }); i.click(); },
  'insert-model': () => readFile('.glb,.gltf', blocks.addModel),
  'resources': () => openElements('gif'),
  // Canvas mode (Prezi-like), off by default; turning it on opens the canvas view.
  'canvas-mode': () => { const on = !canvasOn(); setCanvasMode(on); toggleCanvasView(on); },
  'canvas-view': () => { if (!canvasOn()) setCanvasMode(true); toggleCanvasView(); },
  'resources-3d': () => openElements('anim3d'),
  'model-ai': () => openModelAi(),
  // A GIF is inserted as an image (it can have segments and a colour key too).
  'insert-video': () => readFile('video/*,image/gif', src => (/^data:image\/gif/.test(src) ? blocks.addImage(src) : blocks.addVideo(src))),
  'insert-audio': () => readFile('audio/*', blocks.addAudio),
  'insert-embed': () => promptDialog(t('Dirección de la página web (URL):'), 'https://').then(url => {
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    blocks.addEmbed(url);
  }),
  'obj-delete': () => blocks.deleteSelected(),
  // (From the slides panel, with no object selected: the selected slides.)
  'clip-copy': () => (slidesFocused() ? slides.copySlides() : clip.copySelected()),
  'clip-cut': () => (slidesFocused() ? slides.cutSlides() : clip.cutSelected()),
  'clip-paste': () => (state.ui.navFocus && slides.hasSlideClip() ? slides.pasteSlides() : clip.paste()),
  'obj-duplicate': () => (slidesFocused() ? slides.duplicateSlide() : blocks.duplicateSelected()),
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
  'toggle-loop': () => commit(() => (state.deck.loop = !state.deck.loop)),
  'toggle-autoanimate': () => slides.toggleAutoAnimate(),
  'dup-animate': () => slides.duplicateForAnimate(),
  'toggle-notes': () => commit(() => (state.ui.showNotes = !state.ui.showNotes), { history: false }),
  'connect-mobile': () => openHostPanel(),
  'shortcuts': () => openShortcuts(),
  'report-problem': () => openReport(),
  'insert-hf': () => openHeaderFooter(),
  'anim-panel': () => toggleAnimPane(),
  'anim-play': () => playAnimations(),
  'draw-path': () => startPathDraw(),
  'anim-add': () => openAddAnimation(document.querySelector('[data-action="anim-add"]')),
  'insert-date': () => blocks.addDate(),
  'insert-figindex': () => blocks.addFigIndex(),
  'insert-slideref': () => blocks.addSlideRef(),
  'insert-summary': () => blocks.addSummaryZoom(),
  'insert-magnify': () => startMagnifyDraw(),
  'find-replace': () => openFindPanel(),
  dictate: () => toggleDictation(),
  'selection-pane': () => toggleSelectionPane(),
  'copy-style': () => { format.copyStyle(); commit(() => {}, { history: false }); },   // refresh: Pegar formato becomes available
  'paste-style': () => format.pasteStyle(),
  'bg-gradient': () => {
    const a = $('[data-grad1]')?.value || '#3f6497', b = $('[data-grad2]')?.value || '#101317';
    commit(() => targetSlides().forEach(s => { s.background = `linear-gradient(135deg, ${a}, ${b})`; }));
  },
  'bg-image': () => readFile('image/*', src => commit(() => targetSlides().forEach(s => { s.background = `#000 url(${src}) center/cover no-repeat`; }))),
  'bg-all': () => { const bg = currentSlide().background; commit(() => { for (const s of state.deck.slides) s.background = bg; }); },
  'set-logo': () => readFile('image/*', src => commit(() => { state.deck.logo.src = src; })),
  'clear-logo': () => commit(() => { state.deck.logo.src = ''; }),
  'zoom-in': () => setZoom((state.ui.zoom || 1) + 0.1),
  'zoom-out': () => setZoom((state.ui.zoom || 1) - 0.1),
  'zoom-reset': () => setZoom(1),
  'zoom-fit': () => fitZoom(),
};
