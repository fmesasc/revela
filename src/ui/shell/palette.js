// Command search (Office's "Tell me", VS Code's palette): Ctrl/⌘+K, Alt+Q, «/»
// or the field in the title bar. It lists everything that can be run — every
// ribbon control (also the selected object's tab, the dropdowns and the
// galleries), the right-click menu, dialogs, slides, templates and help — read
// from the ribbon itself, so a new button shows up here with no extra work.
// Running a result clicks the very same control (same code, same undo) after
// opening its tab, and flashes it there so its place is learnt.

import { state, commit, selectedBlocks, currentSlide } from '../../core/store.js';
import { goToSlide } from '../../features/document/slides.js';
import { EXAMPLES, CATEGORIES, exampleNames } from '../../features/content/examples.js';
import { OFFICIAL_SITE } from '../../core/config.js';
import { hasAccounts } from '../../io/cloud/account.js';
import { t, translations, untranslate, currentLang, LANGS } from '../../i18n/index.js';
import { POPS, openPop } from '../ribbon/popovers.js';
import { contextItems } from './contextmenu.js';
import { openGallery } from '../dialogs/gallery.js';
import { openAccount } from '../dialogs/account.js';
import { toggleAssistant } from '../dialogs/assistant.js';
import { ACTIONS } from '../ribbon/actions.js';
import { editText } from '../canvas/content.js';

const MAC = /Mac|iPhone|iPad/.test(globalThis.navigator?.platform || '');
const STORE = 'revela.palette.v1';
const MAX = 60;

// Accent-, case- and punctuation-free words.
export const fold = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const words = s => fold(s).split(' ').filter(Boolean);
const clean = h => String(h || '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
// A tooltip's shortcut, "Deshacer (Ctrl+Z)": the name and the keys.
const SHORT = /\s*\(((?:Ctrl|⌘|Mayús|Shift|Alt|F\d)[^)]*)\)\s*$/;
const unkey = s => String(s || '').replace(SHORT, '').trim();
// A long tooltip as a name: up to its first explanation («Ajuste a la pantalla: qué se ve…»).
const brief = s => (s.length > 30 ? s.split(/\s*[:(]\s*/)[0] : s);

// Words that say what to do but not which command ("poner código", "add a chart"): they count only when they match.
const SOFT = new Set(words('poner añadir anadir agregar insertar meter crear nuevo nueva hacer quiero como usar abrir ver mostrar cambiar '
  + 'add insert put create new make want how use open show change ajouter inserer creer nouveau hinzufugen einfugen neu erstellen '
  + 'aggiungere inserire nuovo creare adicionar inserir novo criar afegir inserir nou crear'));
const STOP = new Set(words('de la el los las un una unos unas a al del en y o con para por mi tu su the a an of to in on for with my and or '
  + 'le les des du un une et pour avec der die das ein eine und mit fur il lo gli i di da e per con o os as um uma do da no na e com els les i amb per'));

// Synonyms (Spanish, English and more), by command: words people type that the button doesn't say.
const SYN = {
  'a:insert-code': 'código|programa|programación|script|snippet|fragmento de código|bloque de código|code|source code|programming|code block|codi|code source|quellcode|codice',
  'a:insert-model': '3d|imagen 3d|modelo|objeto 3d|modelo 3d|glb|gltf|tridimensional|3d model|model|3d object|3d image|modèle 3d|3d modell|modello 3d',
  'a:resources-3d': '3d|imagen 3d|modelos 3d|objeto 3d|buscar 3d|modelos gratis|3d models|3d object|free 3d|sketchfab',
  'a:model-ai': '3d|crear 3d|generar 3d|ia 3d|modelar|blender|ai 3d|generate 3d|text to 3d',
  'a:insert-math': 'fórmula|fórmulas|ecuación|latex|tex|matemáticas|integral|fracción|raíz|math|maths|equation|formula|équation|gleichung|formel|equazione',
  'ctx:Quitar fondo': 'quitar fondo|eliminar fondo|borrar fondo|fondo transparente|recortar persona|remove background|background remover|transparent background|supprimer l arrière plan|hintergrund entfernen',
  'ctx:Opacidad': 'transparencia|transparente|translúcido|opacidad|transparency|transparent|opacity|alpha|transparence|transparenz|trasparenza',
  'a:insert-hf': 'pie de página|pie|encabezado|número de diapositiva|numerar|numeración|numerar diapositivas|número de página|paginar|footer|header|slide number|page number|numbering|pied de page|fußzeile|piè di pagina|rodapé|peu de pàgina',
  'a:insert-magnify': 'lupa|zoom zona|ampliar zona|ampliar una parte|detalle|magnifier|magnify|zoom area|loupe|zoom in on|lente',
  'a:connect-mobile': 'mando|móvil|teléfono|celular|control remoto|mando a distancia|pasar diapositivas con el móvil|remote|remote control|phone|mobile|clicker|smartphone|télécommande|fernbedienung|telecomando',
  'a:share': 'compartir|enlace|link|publicar|url|insertar en web|share|publish|embed|iframe|partager|teilen|condividi|partilhar',
  'a:export-pdf': 'pdf|exportar pdf|guardar como pdf|save as pdf|export pdf|descargar pdf',
  'a:print': 'imprimir|impresora|print|printer|imprimer|drucken|stampa|imprimir pdf',
  'a:export-pptx': 'powerpoint|pptx|ppt|office|microsoft|guardar como powerpoint|export powerpoint|save as powerpoint',
  'a:import-pptx': 'powerpoint|pptx|ppt|abrir powerpoint|keynote|odp|open powerpoint|import powerpoint|libreoffice',
  'a:ai-voiceover': 'voz|narración|narrar|locución|voz en off|leer en voz alta|tts|voice|narration|voiceover|voice over|read aloud|speech|narrateur|sprecher',
  'a:record-show': 'grabar|grabación|grabar vídeo|record|recording|screencast|enregistrer|aufnehmen',
  'a:dictate': 'dictar|voz|micrófono|hablar|dictado|dictation|speech to text|voice typing|dictée|diktieren',
  'a:insert-poll': 'votación|encuesta|preguntar al público|quiz|preguntas|público|kahoot|mentimeter|poll|vote|survey|audience|sondage|umfrage|sondaggio|enquete',
  'a:insert-chart': 'gráfico|gráfica|barras|tarta|quesitos|líneas|chart|graph|plot|pie chart|bar chart|graphique|diagramm|grafico',
  'a:insert-table': 'tabla|celdas|filas|columnas|table|grid|cells|rows|tableau|tabelle|tabella',
  'b:diagrams-open': 'diagrama|smartart|organigrama|esquema|proceso|ciclo|flujo|diagram|org chart|flowchart|process|cycle',
  'a:insert-image': 'imagen|foto|fotografía|dibujo|picture|image|photo|png|jpg|bild|immagine|imatge',
  'a:insert-stock': 'imágenes gratis|fotos gratis|banco de imágenes|buscar imágenes|stock|free images|stock photos|openverse|unsplash',
  'a:insert-video': 'vídeo|video|película|mp4|youtube|movie|clip',
  'a:insert-audio': 'audio|música|sonido|canción|mp3|music|sound|song',
  'a:insert-text': 'texto|cuadro de texto|caja de texto|escribir|text|text box|textbox|zone de texte|textfeld|casella di testo',
  'a:insert-embed': 'web|página web|incrustar|iframe|embed|website|webpage|url',
  'a:insert-timer': 'temporizador|cronómetro|cuenta atrás|reloj|timer|countdown|clock|stopwatch',
  'a:insert-camera': 'cámara|webcam|mi cara|camera|face cam',
  'a:insert-link': 'enlace|vínculo|hipervínculo|link|hyperlink|url|lien',
  'a:slide-add': 'nueva diapositiva|añadir diapositiva|agregar diapositiva|insertar diapositiva|otra diapositiva|new slide|add slide|insert slide',
  'a:slide-delete': 'borrar diapositiva|eliminar diapositiva|quitar diapositiva|delete slide|remove slide',
  'a:slide-duplicate': 'duplicar diapositiva|copiar diapositiva|duplicate slide|copy slide',
  'a:present': 'presentar|proyectar|empezar|reproducir|pase de diapositivas|play|start|slideshow|present|f5|diaporama',
  'a:deck-settings': 'ajustes|configuración|opciones|preferencias|settings|options|preferences|config',
  'a:ai-assistant': 'asistente|ia|inteligencia artificial|chat|chatgpt|claude|copilot|assistant|ai|gpt',
  'a:report-problem': 'error|fallo|bug|problema|soporte|contactar|report|support|feedback|contact|issue',
  'a:shortcuts': 'atajos|teclado|combinaciones de teclas|teclas|shortcuts|keyboard|hotkeys|keys|raccourcis|tastenkürzel',
  'a:cloud-docs': 'mi nube|nube|mis presentaciones|mis archivos|cloud|my cloud|my files|my presentations',
  'a:find-replace': 'buscar|reemplazar|sustituir|find|replace|search|rechercher|suchen|cerca',
  'a:export-png': 'png|jpg|exportar imagen|guardar como imagen|images|export image|picture|screenshot',
  'a:export-video': 'vídeo|video|mp4|gif|exportar vídeo|export video|movie',
  'a:export': 'html|página web|web|sin conexión|export html|offline|website',
  'a:save': 'guardar|descargar|copia|save|download|backup|speichern|enregistrer',
  'a:open': 'abrir|cargar|open|load|ouvrir|öffnen|aprire',
  'a:gallery': 'plantillas|plantilla|ejemplos|templates|template|examples|modèles|vorlagen|modelli|modelos',
  'a:design-ideas': 'ideas de diseño|sugerencias|maquetar|diseñador|designer|design ideas|suggestions|layout',
  'b:themes-open': 'tema|temas|estilo|aspecto|theme|themes|look|style|thème|design',
  'b:palettes-open': 'colores|paleta|esquema de colores|colors|colours|palette|color scheme|couleurs|farben',
  'b:fontpairs-open': 'fuentes|tipografía|tipo de letra|letra|fonts|typography|typeface|polices|schriftarten',
  'b:layout-open': 'diseño|disposición|maquetación|plantilla de diapositiva|layout|slide layout|mise en page',
  'b:shapes-open': 'formas|figura|figuras|flecha|estrella|rectángulo|círculo|shapes|arrow|star|rectangle|circle|formes|formen|forme',
  'b:icons': 'icono|iconos|pictograma|dibujito|icon|icons|icône|symbol',
  'b:wordart': 'wordart|texto artístico|efecto de texto|letras bonitas|neón|text effect|fancy text',
  'b:symbols': 'símbolo|símbolos|emoji|emojis|carácter especial|flecha|euro|symbol|special character',
  'a:a11y-check': 'accesibilidad|lector de pantalla|ciegos|accessibility|a11y|screen reader|accessibilité|barrierefreiheit',
  'a:comments': 'comentarios|comentar|anotar|revisar|comments|comment|review|commentaires|kommentare',
  'a:toggle-notes': 'notas|notas del orador|guion|speaker notes|notes|notizen',
  'a:slide-sorter': 'clasificador|ordenar diapositivas|reordenar|cuadrícula|vista general|sorter|reorder slides|grid|overview',
  'a:collab': 'colaborar|tiempo real|coeditar|editar a la vez|collaborate|co-edit|real time|together',
  'a:ai-translate-deck': 'traducir|traducción|idioma|translate|translation|language|traduire|übersetzen|tradurre',
  'a:resize-deck': 'tamaño|redimensionar|a4|cuadrado|vertical|instagram|historias|proporción|size|resize|aspect ratio|format|dimensions',
  'a:bg-advanced': 'fondo|imagen de fondo|vídeo de fondo|background|wallpaper|fond|hintergrund|sfondo',
  'a:brand-kit': 'marca|logo|logotipo|corporativo|identidad|brand|branding|corporate|marque|marke',
  'a:appearance': 'modo oscuro|modo claro|tema oscuro|oscuro|claro|apariencia|dark mode|light mode|dark|appearance|mode sombre|dunkelmodus',
  'a:canvas-mode': 'prezi|lienzo|zoom|no lineal|canvas|infinite canvas',
  'a:anim-panel': 'panel de animación|orden de animaciones|línea de tiempo|animation pane|timeline',
  'a:anim-add': 'animar|animación|efecto|animate|animation|effect',
  'a:toggle-autoanimate': 'morph|transformar|transición suave|auto animate|magic move',
  'a:classroom': 'aula|clase|alumnos|estudiantes|profesor|classroom|class|students|school|teacher',
  'a:save-protected': 'contraseña|cifrar|proteger|password|encrypt|protect|mot de passe|passwort',
  'a:versions': 'historial|versiones|restaurar|recuperar|history|versions|restore|version history',
  'a:plugins': 'complementos|plugins|extensiones|add-ins|extensions|addons',
  'a:undo': 'deshacer|volver atrás|undo|annuler|rückgängig|annulla',
  'a:redo': 'rehacer|redo|rétablir|wiederholen|ripeti',
  'a:section-add': 'sección|secciones|capítulo|section|chapter|abschnitt|sezione',
  'a:insert-slideref': 'zoom de diapositiva|enlace a diapositiva|ir a diapositiva|slide zoom|link to slide',
  'a:insert-summary': 'índice|resumen|agenda|tabla de contenidos|summary zoom|table of contents|toc|index',
  'a:ai-image': 'generar imagen|crear imagen con ia|dall-e|midjourney|ai image|generate image',
  'a:ai-deck': 'crear presentación|generar presentación|presentación con ia|ai presentation|generate presentation|generate deck',
  'a:insert-file': 'archivo|adjuntar|documento|descargable|attach|attachment|file|document',
  'a:resources': 'gif|gifs|stickers|pegatinas|animados|giphy|animated',
  'a:insert-dashboard': 'power bi|looker|tableau|dashboard|panel de datos|grafana|google sheets|hoja de cálculo',
  'a:record-screen': 'grabar pantalla|captura de pantalla en vídeo|screen recording|record screen|screencast',
  'a:present-call': 'meet|teams|zoom|videollamada|reunión|video call|meeting',
  'a:coach': 'ensayar|practicar|entrenador|muletillas|coach|rehearse|practice',
  'a:rehearse': 'ensayar|cronometrar|tiempos|rehearse timings|timing',
  'a:mark-final': 'solo lectura|bloquear presentación|final|read only|lock',
  'a:signatures': 'firma|firmar|firma digital|signature|sign',
  'a:master-edit': 'patrón|plantilla maestra|maestro|slide master|master',
  'a:selection-pane': 'capas|panel de selección|ocultar objeto|layers|selection pane',
  'a:toggle-ruler': 'regla|reglas|ruler|rulers',
  'a:toggle-guides': 'guías|cuadrícula|rejilla|guides|grid|gridlines',
  'a:insert-date': 'fecha|hora|date|time',
  'a:clip-paste': 'pegar|paste|coller|einfügen|incolla',
  'a:clip-copy': 'copiar|copy|copier|kopieren|copia',
  'a:obj-duplicate': 'duplicar|clonar|duplicate|clone',
  'a:group': 'agrupar|juntar|unir|group',
  'a:ungroup': 'desagrupar|separar|ungroup',
  'a:front': 'traer al frente|delante|encima|bring to front|front',
  'a:back': 'enviar al fondo|detrás|debajo|send to back|back',
  'a:toggle-nav': 'miniaturas|panel de diapositivas|ocultar panel|thumbnails|slides panel',
  'a:zoom-fit': 'ajustar zoom|ver todo|fit|zoom to fit',
  'b:fmt=bold': 'negrita|grueso|resaltar|bold|gras|fett|grassetto',
  'b:fmt=italic': 'cursiva|itálica|inclinada|italic|kursiv|corsivo',
  'b:fmt=underline': 'subrayar|subrayado|underline|souligner|unterstreichen',
  'b:list=insertOrderedList': 'numerar|numeración|números|lista numerada|enumerar|numbered list|numbering|numbers',
  'b:list=insertUnorderedList': 'viñetas|puntos|lista|bullets|bullet list|bullet points|puces',
  'b:fmt=removeFormat': 'quitar formato|limpiar formato|clear formatting|remove formatting',
  'b:draw=pen': 'lápiz|dibujar|pintar|tinta|a mano alzada|pen|draw|ink|freehand',
  'b:symbols=': 'símbolo|emoji',
  'x:account': 'cuenta|mi cuenta|perfil|plan|créditos|suscripción|pro|iniciar sesión|account|profile|credits|subscription|login|sign in',
  'x:table-paste': 'excel|hoja de cálculo|pegar celdas|spreadsheet|paste cells|google sheets',
};
// The selected object's tab: commands that need an object (shown greyed, with what to select, when there isn't one).
const NEEDS = {
  image: ['Imagen', 'Selecciona una imagen', [['Ajustar', 'auto_fix_high', 'Quitar fondo'], ['Ajustar', 'crop', 'Recortar'], ['Ajustar', 'tune', 'Ajustes de imagen'], ['Lupa', 'loupe', 'Ampliar una zona de la imagen']]],
  any: ['Objeto', 'Selecciona un objeto', [['Organizar', 'opacity', 'Opacidad'], ['Organizar', 'shadow', 'Sombra'], ['Organizar', 'lock_open', 'Bloquear'], ['Organizar', 'flip', 'Voltear'],
    ['Organizar', 'rotate_left', 'Quitar el giro'], ['Accesibilidad', 'accessibility', 'Texto alternativo']]],
  model: ['Modelo 3D', 'Selecciona un modelo 3D', [['Animación', 'motion_photos_on', 'Movimiento 3D'], ['Animación', 'autorenew', 'Girar solo'], ['Esqueleto', 'accessibility_new', 'Esqueleto automático'],
    ['Con la cámara', 'video_camera_front', 'Controlar con la cámara']]],
  table: ['Tabla', 'Selecciona una tabla', [['Filas y columnas', 'table_rows', 'Añadir fila'], ['Filas y columnas', 'view_column', 'Añadir columna'], ['Cálculos', 'functions', 'Fila de totales'], ['Estilo', 'palette', 'Estilo de tabla']]],
  chart: ['Gráfico', 'Selecciona un gráfico', [['Datos', 'edit', 'Editar datos']]],
  text: ['Cuadro de texto', 'Selecciona un cuadro de texto', [['Cuadro', 'format_color_fill', 'Relleno y borde'], ['Cuadro', 'format_size', 'Ajustar letra al cuadro']]],
  code: ['Código', 'Selecciona un bloque de código', [['Código', 'code', 'Editar código y pasos']]],
};
// Why a ribbon button is greyed out (see renderRibbon).
const WHY = { front: 'Selecciona un objeto', back: 'Selecciona un objeto', forward: 'Selecciona un objeto', backward: 'Selecciona un objeto', 'copy-style': 'Selecciona un objeto',
  'clip-copy': 'Selecciona un objeto', 'clip-cut': 'Selecciona un objeto', 'obj-duplicate': 'Selecciona un objeto', group: 'Selecciona dos o más objetos', ungroup: 'Selecciona un grupo',
  'connect-blocks': 'Selecciona dos objetos', 'paste-style': 'Copia antes un formato', 'obj-anim-clear': 'Selecciona un objeto con animación', 'anim-play': 'Esta diapositiva no tiene animaciones',
  'clip-paste': 'No hay nada copiado', undo: 'No hay nada que deshacer', redo: 'No hay nada que rehacer', 'slide-vertical': 'No en la primera diapositiva' };
const KEYS = { 'a:undo': 'Ctrl+Z', 'a:redo': 'Ctrl+Y', 'a:save': 'Ctrl+S', 'a:present': 'F5', 'a:present-current': 'Mayús+F5', 'a:find-replace': 'Ctrl+F', 'a:slide-add': 'Ctrl+M',
  'a:obj-duplicate': 'Ctrl+D', 'a:group': 'Ctrl+G', 'a:ungroup': 'Ctrl+Mayús+G', 'a:clip-copy': 'Ctrl+C', 'a:clip-cut': 'Ctrl+X', 'a:clip-paste': 'Ctrl+V',
  'b:fmt=bold': 'Ctrl+B', 'b:fmt=italic': 'Ctrl+I', 'b:fmt=underline': 'Ctrl+U' };
const SUGGEST = ['a:insert-text', 'a:insert-image', 'b:shapes-open', 'a:insert-table', 'a:insert-chart', 'a:insert-code', 'a:insert-model', 'a:share', 'a:export-pdf'];
const HELP = [['start', 'Ayuda: primeros pasos'], ['powerpoint', 'Ayuda: traer un PowerPoint'], ['present', 'Ayuda: presentar'], ['save', 'Ayuda: dónde guardar'],
  ['offline', 'Ayuda: usar sin conexión'], ['share', 'Ayuda: compartir una presentación'], ['audience', 'Ayuda: el público con el móvil'], ['plugins', 'Ayuda: complementos y macros'], ['privacy', 'Ayuda: tus datos y tu privacidad']];
// Galleries a ribbon button opens, and what each item is called.
const LAUNCHERS = { 'shapes-open': 'shapes', 'diagrams-open': 'diagrams', 'palettes-open': 'palettes', 'fontpairs-open': 'fontpairs', 'themes-open': 'themes', 'layout-open': 'layout', 'newslide-open': 'newslide', icons: 'icons' };

// ---- Remembered use: how often and when (to rank and to show the recent ones) ----
function used() { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; } }
function remember(id) {
  const u = used(), [n = 0] = u[id] || []; u[id] = [n + 1, Date.now()];
  const keep = Object.entries(u).sort((a, b) => b[1][1] - a[1][1]).slice(0, 60);
  try { localStorage.setItem(STORE, JSON.stringify(Object.fromEntries(keep))); } catch {}
}
export const recentIds = () => Object.entries(used()).sort((a, b) => b[1][1] - a[1][1]).map(([id]) => id);

// ---- The index ----
// An entry: { id, label, icon, path[], keys, tip, alt[] (other names: translations, synonyms), ctx, why (greyed: the reason), kind, run() }.
const firstData = el => { for (const a of el.attributes) if (a.name.startsWith('data-') && !['data-i18n', 'data-i18nt', 'data-sel-tip', 'data-st', 'data-ctx'].includes(a.name)) return a.name.slice(5) + (a.value ? '=' + a.value : ''); return ''; };
const srcOf = (el, attr, shown) => (attr && el.dataset[attr] !== undefined ? clean(el.dataset[attr]) : untranslate(shown));
const allLangs = s => (s ? translations(s).map(clean) : []);
const shown = el => !el.hidden && !el.closest('[hidden]') && !(el.closest('.accounts-only') && !hasAccounts());

function tabs() {
  return [...document.querySelectorAll('#ribbon .tabs [data-tab]')].filter(b => !b.hidden)
    .map(b => ({ key: b.dataset.tab, label: b.textContent.trim(), src: b.dataset.tab === 'ctx' ? untranslate(b.textContent.trim().replace(/\s*\(\d+\)$/, '')) : srcOf(b, 'i18n', b.textContent.trim()) }));
}
function ribbonEntries(out) {
  const seen = new Map();
  const add = e => { const old = seen.get(e.id); if (old && !(e.big && !old.big)) return; if (old) out.splice(out.indexOf(old), 1); seen.set(e.id, e); out.push(e); };
  for (const tb of tabs()) {
    const page = document.querySelector(`#ribbon .ribbon-page[data-page="${tb.key}"]`); if (!page) continue;
    const ctx = tb.key === 'ctx';
    out.push({ id: 'tab:' + tb.key, label: tb.label, icon: 'tab', path: [t('Pestañas')], alt: allLangs(tb.src), kind: 'tab', ctx, run: () => openTab(tb.key) });
    for (const g of page.querySelectorAll('.group')) {
      if (!shown(g)) continue;
      const gl = g.querySelector(':scope > label'), gName = gl ? clean(gl.innerHTML) : '', gSrc = gl ? srcOf(gl, 'i18n', gName) : '';
      const base = { path: [tb.label, gName].filter(Boolean), pathAlt: [...allLangs(tb.src), ...allLangs(gSrc)], ctx, tab: tb.key };
      for (const el of g.querySelectorAll('button, select, label.color, input:not([type=color]):not([type=checkbox])')) {
        if (!shown(el) || el.closest('.eyedrop, .rb-more') || el.matches('.eyedrop, .caret, .group-more, [data-more]')) continue;
        if (el.tagName === 'BUTTON') add(buttonEntry(el, base));
        else if (el.tagName === 'SELECT') selectEntries(el, base).forEach(add);
        else if (el.tagName === 'LABEL') { const e = colourEntry(el, base); if (e) add(e); }
        else if (!el.closest('label.color')) { const e = fieldEntry(el, base); if (e) add(e); }
      }
    }
  }
  // The title bar (quick access, Present, Appearance) and the status bar (zoom).
  for (const [sel, where] of [['.titlebar .qat button, .titlebar .tb-play button, #ap-btn', 'Acceso rápido'], ['#statusbar button', 'Barra de estado']])
    for (const el of document.querySelectorAll(sel)) if (shown(el)) add({ ...buttonEntry(el, { path: [t(where)], pathAlt: allLangs(where) }), bar: true });
  return out.filter(e => e.label);
}
function buttonEntry(el, base) {
  const span = el.querySelector(':scope > span'), key = firstData(el);
  const tip = el.getAttribute('title') || '', tipSrc = srcOf(el, 'i18nt', tip);
  let label = span ? clean(span.innerHTML) : unkey(el.getAttribute('aria-label') || tip), src = span ? srcOf(span, 'i18n', label) : unkey(el.getAttribute('aria-label') ? untranslate(el.getAttribute('aria-label')) : tipSrc);
  if (!label) label = clean(el.textContent);
  const action = el.dataset.action, id = action ? 'a:' + action : key ? 'b:' + key : 'ctx:' + src;
  const keys = KEYS[id] || (tip.match(SHORT) || [])[1] || '';
  return { ...base, id, el, label, icon: el.querySelector('.ms')?.textContent || '', tip: unkey(tip), keys, big: el.classList.contains('lg'),
    alt: [...allLangs(src), ...allLangs(unkey(tipSrc))], why: el.disabled ? t(WHY[action] || 'No disponible ahora') : '', kind: LAUNCHERS[key.split('=')[0]] ? 'launcher' : 'button',
    run: () => clickIn(base.tab, live(el, id)) };
}
function selectEntries(sel, base) {
  if (sel.matches('[data-anim-pick], [data-anim-trigger], #lang-select')) return [];
  const lab = sel.closest('label')?.querySelector(':scope > span'), name = lab ? clean(lab.innerHTML) : brief(unkey(sel.getAttribute('title') || ''));
  const nameSrc = lab ? srcOf(lab, 'i18n', name) : srcOf(sel, 'i18nt', name), key = firstData(sel) || 'ctx:' + nameSrc, font = sel.matches('[data-font]');
  return [...sel.options].filter(o => o.value && o.value !== '__upload' && !o.disabled).map(o => {
    const text = o.textContent.trim(), src = srcOf(o, 'i18n', text);
    return { ...base, id: `s:${key}=${o.value}`, el: sel, label: name && !text.toLowerCase().startsWith(name.toLowerCase().slice(0, 6)) ? `${name}: ${text}` : text,
      term: text, pathAlt: [...base.pathAlt, name, ...allLangs(nameSrc)], icon: font ? 'font_download' : 'arrow_drop_down_circle', alt: allLangs(src), kind: font ? 'font' : 'option', on: sel.value === o.value,
      why: sel.disabled ? t('No disponible ahora') : '', run: () => chooseIn(base.tab, live(sel, `s:${key}=${o.value}`), o.value) };
  });
}
function colourEntry(lab, base) {
  const inp = lab.querySelector('input[type=color]'); if (!inp) return null;
  const span = lab.querySelector(':scope > span'), tip = lab.getAttribute('title') || inp.getAttribute('title') || '', label = unkey(tip) || (span ? clean(span.innerHTML) : '');
  const src = lab.dataset.i18nt ?? inp.dataset.i18nt ?? untranslate(label);
  return label && { ...base, id: 'c:' + (firstData(inp) || src), el: lab, label, icon: lab.querySelector('.ms')?.textContent || 'palette', alt: allLangs(unkey(src)), kind: 'colour',
    run: () => { show(base.tab, lab); try { inp.showPicker?.(); } catch { inp.click(); } } };
}
function fieldEntry(inp, base) {
  const lab = inp.closest('label')?.querySelector(':scope > span'), tip = inp.getAttribute('title') || '', label = lab ? clean(lab.innerHTML) : unkey(tip);
  if (!label) return null;
  const src = lab ? srcOf(lab, 'i18n', label) : unkey(srcOf(inp, 'i18nt', tip));
  return { ...base, id: 'f:' + (firstData(inp) || src), el: inp, label, icon: 'edit', alt: allLangs(src), kind: 'field', why: inp.disabled ? t('No disponible ahora') : '',
    run: () => { show(base.tab, inp); inp.focus(); inp.select?.(); } };
}
// The galleries' items (shapes, diagrams, colours, fonts, layouts, icons): drawn as their gallery would be, read, not shown.
let popCache = null;
function galleryEntries(out, ribbon) {
  if (!popCache) {
    popCache = [];
    for (const launcher of ribbon.filter(e => e.kind === 'launcher')) {
      const type = LAUNCHERS[firstData(launcher.el).split('=')[0]];
      let html = ''; try { html = POPS[type](); } catch { continue; }
      const tpl = document.createElement('template'); tpl.innerHTML = html;
      let head = '', headSrc = '';
      for (const el of tpl.content.querySelectorAll('h4, h5, button')) {
        if (el.tagName !== 'BUTTON') { head = el.textContent.trim(); headSrc = untranslate(head); continue; }
        const key = firstData(el); if (!key || el.disabled || key.startsWith('wa=')) continue;
        const label = el.getAttribute('title') || el.querySelector(':scope > span:last-child')?.textContent || el.querySelector('small')?.textContent || el.textContent;
        if (!label?.trim()) continue;
        const sel = '[data-' + key.replace(/=(.*)$/, '="$1"') + ']';
        popCache.push({ id: `p:${type}:${key}`, label: (type === 'icons' ? t('Icono') + ': ' : '') + label.trim(), term: label.trim(), icon: type === 'icons' ? 'interests' : launcher.icon, tab: launcher.tab, ctx: launcher.ctx,
          path: [...launcher.path, launcher.label, head].filter((x, i, a) => x && a.indexOf(x) === i), pathAlt: [...(launcher.pathAlt || []), ...launcher.alt, ...allLangs(headSrc)],
          alt: allLangs(untranslate(label.trim())), kind: type === 'icons' ? 'icon' : 'gallery', launcher: launcher.el,
          run() { show(this.tab, this.launcher); this.launcher.click(); const it = openPop?.querySelector(sel); if (it) it.click(); } });
      }
    }
  }
  out.push(...popCache);
}
function contextEntries(out) {
  const have = new Set(out.map(e => fold(e.label)));
  for (const [label, fn] of contextItems()) {
    const name = t(label); if (have.has(fold(name))) continue; have.add(fold(name));
    out.push({ id: 'm:' + label, label: name, icon: 'right_click', path: [t('Menú contextual')], alt: allLangs(label), ctx: true, kind: 'menu', run: fn });
  }
}
function needEntries(out) {
  const ids = new Set(out.map(e => e.id)), sel = selectedBlocks();
  for (const [type, [tab, why, cmds]] of Object.entries(NEEDS)) {
    if (sel.length === 1 && (type === 'any' || sel[0].type === type)) continue;     // (its own tab lists them)
    for (const [group, icon, label] of cmds) if (!ids.has('ctx:' + label)) {
      ids.add('ctx:' + label);
      out.push({ id: 'ctx:' + label, label: t(label), icon, path: [t(tab), t(group)], pathAlt: [...allLangs(tab), ...allLangs(group)], alt: allLangs(label), kind: 'button', why: t(why), run: () => {} });
    }
  }
}
function slideEntries(out) {
  state.deck.slides.forEach((s, i) => {
    const tb = s.blocks.find(b => b.ph === 'title' && b.html) || s.blocks.find(b => b.type === 'text' && b.html), title = clean(tb?.html || '').slice(0, 60);
    const label = t('Ir a la diapositiva {n}').replace('{n}', i + 1) + (title ? ': ' + title : '');
    out.push({ id: 'g:' + i, label, icon: 'slideshow', path: [t('Diapositivas')], alt: ['ir a la diapositiva', 'go to slide', 'slide', 'diapositiva', 'diapo'], kind: 'slide', num: i + 1, on: i === state.ui.slideIndex,
      run: () => goToSlide(i) });
  });
}
let names = null;
function templateEntries(out) {
  if (!names) { names = {}; exampleNames(currentLang()).then(n => { names = n || {}; }).catch(() => {}); }
  const cats = Object.fromEntries(CATEGORIES);
  for (const [key, e] of Object.entries(EXAMPLES)) {
    const label = names[key]?.[0] || t(e.name);
    out.push({ id: 'tpl:' + key, label, icon: 'auto_awesome_mosaic', path: [t('Plantillas'), t(cats[e.cat] || '')].filter(Boolean), alt: [e.name, ...allLangs('Plantillas')], tip: names[key]?.[1] || t(e.summary || ''),
      kind: 'template', run: () => openTemplate(key, label) });
  }
}
function extraEntries(out) {
  if (hasAccounts()) out.push({ id: 'x:account', label: t('Mi cuenta'), icon: 'account_circle', path: [t('Barra de título')], alt: allLangs('Mi cuenta'), kind: 'dialog', run: () => openAccount() });
  out.push({ id: 'x:table-paste', label: t('Tabla desde celdas copiadas'), icon: 'table', path: [t('Insertar'), t('Tablas y gráficos')], alt: allLangs('Tabla desde celdas copiadas'), kind: 'dialog',
    run: () => ACTIONS['insert-table-paste']() });
  const sel = document.getElementById('lang-select');
  for (const l of LANGS) out.push({ id: 'x:lang:' + l.code, label: `${t('Idioma')}: ${l.name}`, icon: 'translate', path: [t('Barra de título')], alt: [...allLangs('Idioma'), 'language', 'idioma', l.name],
    on: currentLang() === l.code, kind: 'option', run: () => { if (sel) { sel.value = l.code; sel.dispatchEvent(new Event('change')); } } });
  for (const [id, label] of HELP) out.push({ id: 'h:' + id, label: t(label), icon: 'help', path: ['revelaslides.com/support'], alt: [...allLangs(label), 'ayuda', 'help', 'soporte', 'support', 'faq'], kind: 'help',
    run: () => window.open(`${OFFICIAL_SITE}/support#${id}`, '_blank', 'noopener') });
}
// Everything, now (what is selected changes what's there).
export function buildIndex({ deep = true } = {}) {
  const out = [];
  ribbonEntries(out);
  const ribbon = out.slice();
  extraEntries(out);
  contextEntries(out);
  needEntries(out);
  slideEntries(out);
  if (deep) { galleryEntries(out, ribbon); templateEntries(out); }
  for (const e of out) prep(e);
  return out;
}
function prep(e) {
  if (e.f) return;
  const syn = (SYN[e.id] || '').split('|').filter(Boolean);
  const term = e.term || e.label;
  e.f = { label: words(term), lstr: fold(term), squash: fold(term).replace(/ /g, ''),
    alt: [...new Set([...e.alt || [], ...syn].flatMap(words))], phrases: [...new Set([...e.alt || [], ...syn].map(fold))],
    path: [...new Set([...(e.path || []), ...(e.pathAlt || [])].flatMap(words))], tip: words(e.tip || '') };
}

// ---- Matching ----
function lev(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]; let low = i;
    for (let j = 1; j <= b.length; j++) { cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); low = Math.min(low, cur[j]); }
    if (low > max) return max + 1; prev = cur;
  }
  return prev[b.length];
}
const inWords = (tk, list, exact, prefix) => { let s = 0; for (const w of list) { if (w === tk) return exact; if (!s && w.startsWith(tk)) s = prefix; } return s; };
function typo(tk, list) { const max = tk.length >= 9 ? 2 : 1; for (const w of list) if (w.length >= 3 && (lev(tk, w, max) <= max || (tk.length >= 5 && lev(tk, w.slice(0, tk.length), 1) <= 1))) return true; return false; }
function subseq(tk, s) { let i = 0; for (const c of s) if (c === tk[i]) i++; return i === tk.length; }
function tokenScore(tk, f) {
  let s = Math.max(inWords(tk, f.label, 10, 7), inWords(tk, f.alt, 8, 6), inWords(tk, f.path, 4, 3), inWords(tk, f.tip, 3, 2));
  if (!s && tk.length >= 4) s = typo(tk, f.label) ? 5 : typo(tk, f.alt) ? 4 : 0;
  if (!s && tk.length >= 3 && subseq(tk, f.squash)) s = 1.5;
  return s;
}
const KIND = { template: -6, icon: -20, font: -2, option: -1, gallery: -1, menu: -1, help: -1, tab: -1, slide: 0 };
// The entries that match the query, best first.
export function search(index, query, { u = used(), now = Date.now() } = {}) {
  const q = fold(query); if (!q) return [];
  const toks = q.split(' '), hard = toks.filter(x => !SOFT.has(x) && !STOP.has(x)), soft = toks.filter(x => SOFT.has(x));
  const need = hard.length ? hard : soft.length ? soft : toks, opt = hard.length ? soft : [];
  const qPhrase = need.concat().join(' '), num = /^\d+$/.test(q) ? +q : 0;
  const hasSel = selectedBlocks().length > 0, res = [];
  for (const e of index) {
    if ((e.kind === 'template' || e.kind === 'icon') && q.length < 3) continue;
    const f = e.f; let s = 0, miss = 0;
    for (const tk of need) { const x = tokenScore(tk, f); if (x) s += x; else miss++; }
    if (miss > (need.length >= 2 ? 1 : 0) || miss === need.length) continue;
    s -= miss * 8;
    for (const tk of opt) s += tokenScore(tk, f) / 2;
    if (f.lstr === q || f.lstr === qPhrase) s += 15; else if (f.lstr.startsWith(q)) s += 8;
    if (f.phrases.includes(q) || f.phrases.includes(qPhrase)) s += 12; else if (q.length > 3 && f.phrases.some(p => p.startsWith(q))) s += 5;
    if (num && e.num === num) s += 20;
    const [n = 0, last = 0] = u[e.id] || [];
    if (n) s += Math.min(6, 2 * Math.log2(1 + n)) + (now - last < 7 * 864e5 ? 2 : 0);
    if (hasSel && e.ctx) s += 5;
    if (e.why) s -= 4;
    s += KIND[e.kind] || 0;
    if (s >= 3) res.push([s, e]);
  }
  res.sort((a, b) => b[0] - a[0] || a[1].label.length - b[1].label.length);
  const seen = new Set();
  return res.map(r => r[1]).filter(e => { const k = fold(e.label) + '|' + (e.path || []).join('|'); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, MAX);
}

// ---- Running ----
function openTab(tab) {
  if (!tab || state.ui.activeTab === tab) return;
  const b = document.querySelector(`#ribbon .tabs [data-tab="${tab}"]`);
  if (b && !b.hidden) b.click(); else commit(() => (state.ui.activeTab = tab), { history: false });
}
// Its tab open and the control in view, flashing a moment so its place is learnt.
function show(tab, el) { openTab(tab); flash(el); }
export function flash(el) {
  if (!el?.isConnected || !el.getClientRects().length) return;
  el.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  el.classList.remove('cmdp-flash'); void el.offsetWidth; el.classList.add('cmdp-flash');
  setTimeout(() => el.classList.remove('cmdp-flash'), 1800);
}
// The control itself, or the one drawn in its place (the object's tab is redrawn as it changes).
function live(el, id) { return el.isConnected ? el : ribbonEntries([]).find(e => e.id === id)?.el || el; }
function clickIn(tab, el) {
  if (!document.activeElement?.isContentEditable) openTab(tab);     // (typing: the tab stays, so the text keeps its selection)
  if (!el.isConnected) return;
  el.click();
  requestAnimationFrame(() => flash(el));
}
function chooseIn(tab, sel, value) {
  show(tab, sel.closest('label') || sel);
  sel.value = value; sel.dispatchEvent(new Event('change', { bubbles: true }));
}
function openTemplate(key, label) {
  openGallery();
  const m = document.getElementById('gallery-modal'), q = m?.querySelector('.gal-q'); if (!q) return;
  q.value = label; q.dispatchEvent(new Event('input'));
  requestAnimationFrame(() => flash(m.querySelector(`[data-example="${CSS.escape(key)}"]`)));
}
function askAssistant(text) {
  toggleAssistant(true);
  requestAnimationFrame(() => { const ta = document.querySelector('#assistant-panel textarea'); if (!ta) return; ta.value = text; ta.dispatchEvent(new Event('input')); ta.focus(); });
}

// ---- The window ----
let back = null, input = null, list = null, index = [], items = [], active = 0, before = null, range = null, deepDone = false;
export const paletteOpen = () => !!back?.isConnected;
const keyText = k => (MAC ? k.replace(/Ctrl\+/g, '⌘').replace(/Alt\+/g, '⌥') : k).replace('Mayús', t('Mayús'));

export function openPalette(query = '') {
  if (paletteOpen()) { input.focus(); input.select(); return; }
  if (document.getElementById('present-overlay')) return;
  before = document.activeElement; range = null;
  const s = getSelection(); if (before?.isContentEditable && s.rangeCount && before.contains(s.anchorNode)) range = offsetsOf(before, s.getRangeAt(0));
  popCache = null; deepDone = false; index = buildIndex({ deep: false });
  back = document.createElement('div'); back.id = 'cmd-palette'; back.className = 'modal-backdrop cmdp-back';
  back.innerHTML = `<div class="cmdp" role="dialog" aria-label="${t('Buscar comandos')}">
    <div class="cmdp-field"><i class="ms" aria-hidden="true">search</i>
      <input type="text" role="combobox" aria-expanded="true" aria-controls="cmdp-list" aria-autocomplete="list" autocomplete="off" spellcheck="false"
        placeholder="${t('¿Qué quieres hacer? Escribe: código, imagen 3D, pie de página…')}" aria-label="${t('Buscar comandos')}">
      <kbd class="cmdp-esc">Esc</kbd></div>
    <div id="cmdp-list" class="cmdp-list" role="listbox" aria-label="${t('Resultados')}"></div>
    <div class="cmdp-foot"><span><kbd>↑</kbd><kbd>↓</kbd> ${t('elegir')}</span><span><kbd>Intro</kbd> ${t('ejecutar')}</span><span><kbd>Esc</kbd> ${t('cerrar')}</span></div></div>`;
  input = back.querySelector('input'); list = back.querySelector('.cmdp-list');
  back.addEventListener('mousedown', e => { if (e.target === back) { e.preventDefault(); closePalette(); } });
  input.addEventListener('input', () => fill());
  input.addEventListener('keydown', onKey);
  list.addEventListener('mousemove', e => { const o = e.target.closest('[role=option]'); if (o && +o.dataset.i !== active) setActive(+o.dataset.i, false); });
  list.addEventListener('mousedown', e => e.preventDefault());       // (the field keeps the focus)
  list.addEventListener('click', e => { const o = e.target.closest('[role=option]'); if (o) runAt(+o.dataset.i); });
  document.body.appendChild(back);
  input.value = query; input.focus(); fill();
  document.getElementById('cmd-search')?.setAttribute('aria-expanded', 'true');
}
// The text selection as character offsets (the text may be drawn again meanwhile), and back.
function offsetsOf(root, r) { const pre = document.createRange(); pre.selectNodeContents(root); pre.setEnd(r.startContainer, r.startOffset); const a = pre.toString().length; return [a, a + r.toString().length]; }
function rangeAt(root, [a, b]) {
  const r = document.createRange(), walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n, pos = 0, start = false;
  r.selectNodeContents(root); r.collapse(false);
  while ((n = walk.nextNode())) {
    const len = n.nodeValue.length;
    if (!start && a <= pos + len) { r.setStart(n, a - pos); start = true; }
    if (start && b <= pos + len) { r.setEnd(n, b - pos); break; }
    pos += len;
  }
  return r;
}
export function closePalette({ restore = true } = {}) {
  if (!back) return;
  back.remove(); back = null;
  document.getElementById('cmd-search')?.setAttribute('aria-expanded', 'false');
  if (restore && before?.isConnected && before !== document.body) {
    // (Leaving the text to type here ended its editing: back into it, with what was selected.)
    const blk = range && !before.isContentEditable && before.matches('.rich') && before.closest('#stage .block');
    if (blk) editText(blk.dataset.id, { selectAll: false }); else before.focus({ preventScroll: true });
    if (range && before.isContentEditable) { const s = getSelection(); s.removeAllRanges(); s.addRange(rangeAt(before, range)); }
  }
  before = range = null;
}
function onKey(e) {
  const n = items.length, k = e.key;
  if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); closePalette(); return; }
  if (k === 'ArrowDown' || k === 'ArrowUp') { e.preventDefault(); if (n) setActive((active + (k === 'ArrowDown' ? 1 : -1) + n) % n); return; }
  if (k === 'PageDown' || k === 'PageUp') { e.preventDefault(); if (n) setActive(Math.max(0, Math.min(n - 1, active + (k === 'PageDown' ? 8 : -8)))); return; }
  if (k === 'Enter') { e.preventDefault(); e.stopPropagation(); runAt(active); return; }
  if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === 'k') { e.preventDefault(); e.stopPropagation(); closePalette(); }
}
// The list for what's typed: or, empty, the recent commands and a few suggestions.
function fill() {
  const q = input.value.trim();
  if (q && !deepDone) { deepDone = true; const more = []; galleryEntries(more, index); templateEntries(more); more.forEach(prep); index = index.concat(more); }
  const byId = new Map(index.map(e => [e.id, e])), sections = [];
  if (!q) {
    const recent = recentIds().map(id => byId.get(id)).filter(e => e && !e.why).slice(0, 6), had = new Set(recent.map(e => e.id));
    const ctx = selectedBlocks().length ? index.filter(e => e.ctx && e.kind === 'button' && !e.why).slice(0, 4) : [];
    const sug = [...ctx, ...SUGGEST.map(id => byId.get(id))].filter(e => e && !had.has(e.id) && (had.add(e.id), true)).slice(0, 8);
    if (recent.length) sections.push([t('Recientes'), recent]);
    sections.push([t('Sugerencias'), sug]);
  } else {
    sections.push(['', search(index, q)]);
    sections.push(['', [{ id: 'x:ask', label: `${t('Preguntar al asistente')}: “${q}”`, icon: 'forum', path: [t('IA'), t('Asistente')], kind: 'ask', run: () => askAssistant(q) }]]);
  }
  items = []; list.replaceChildren();
  for (const [title, group] of sections) {
    if (!group.length) continue;
    if (title) { const h = document.createElement('div'); h.className = 'cmdp-head'; h.setAttribute('role', 'presentation'); h.textContent = title; list.appendChild(h); }
    for (const e of group) list.appendChild(row(e, items.push(e) - 1));
  }
  if (q && items.length === 1) { const p = document.createElement('div'); p.className = 'cmdp-none'; p.setAttribute('role', 'presentation'); p.textContent = t('Ningún comando coincide.'); list.prepend(p); }
  setActive(0);
}
function row(e, i) {
  const o = document.createElement('div'); o.className = 'cmdp-item' + (e.why ? ' off' : '') + (e.kind === 'ask' ? ' ask' : ''); o.id = 'cmdp-o' + i; o.dataset.i = i; o.dataset.id = e.id;
  o.setAttribute('role', 'option'); o.setAttribute('aria-selected', 'false'); if (e.why) o.setAttribute('aria-disabled', 'true');
  const ic = document.createElement('i'); ic.className = 'ms'; ic.setAttribute('aria-hidden', 'true'); ic.textContent = e.icon || 'bolt';
  const main = document.createElement('span'); main.className = 'cmdp-main';
  const lab = document.createElement('span'); lab.className = 'cmdp-label'; lab.textContent = e.label;
  if (e.on) { const c = document.createElement('i'); c.className = 'ms cmdp-on'; c.textContent = 'check'; c.setAttribute('aria-label', t('Activado')); lab.append(' ', c); }
  const where = document.createElement('span'); where.className = 'cmdp-path';
  where.textContent = [e.why, (e.path || []).filter(Boolean).join(' ▸ ')].filter(Boolean).join(' · ');
  main.append(lab, where); o.append(ic, main);
  if (e.keys) { const k = document.createElement('kbd'); k.textContent = keyText(e.keys); o.appendChild(k); }
  return o;
}
function setActive(i, scroll = true) {
  active = i;
  list.querySelectorAll('[aria-selected="true"]').forEach(x => x.setAttribute('aria-selected', 'false'));
  const o = list.querySelector('#cmdp-o' + i);
  if (o) { o.setAttribute('aria-selected', 'true'); input.setAttribute('aria-activedescendant', o.id); if (scroll) o.scrollIntoView({ block: 'nearest' }); }
  else input.removeAttribute('aria-activedescendant');
}
function runAt(i) {
  const e = items[i]; if (!e) return;
  if (e.why) { const o = list.querySelector('#cmdp-o' + i); o?.classList.remove('shake'); void o?.offsetWidth; o?.classList.add('shake'); return; }
  if (e.kind !== 'ask') remember(e.id);
  closePalette();
  e.run();
}
// Run the first result for a query (the tests, and macros).
export function runQuery(query) { const r = search(buildIndex(), query); if (r[0] && !r[0].why) { remember(r[0].id); r[0].run(); } return r[0] || null; }

// The keys that open it, and the title bar's field.
const TYPING = 'input, textarea, select, math-field, [contenteditable=""], [contenteditable="true"]';
export function initPalette() {
  const btn = document.getElementById('cmd-search');
  const label = () => { if (!btn) return; btn.querySelector('.cmd-search-text').textContent = t('Buscar…'); btn.querySelector('kbd').textContent = MAC ? '⌘K' : 'Ctrl+K'; };
  btn?.addEventListener('click', () => (paletteOpen() ? closePalette() : openPalette()));
  label(); window.addEventListener('revela:lang', label);
  document.addEventListener('keydown', e => {
    if (e.defaultPrevented || e.isComposing || paletteOpen()) return;
    const mod = e.ctrlKey || e.metaKey, other = document.querySelector('.modal-backdrop:not(#cmd-palette)') || document.getElementById('present-overlay');
    const ctrlK = mod && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k', altQ = e.altKey && !mod && e.code === 'KeyQ';
    const slash = e.key === '/' && !mod && !e.altKey && !(e.composedPath?.()[0] || e.target).closest?.(TYPING) && !document.activeElement?.isContentEditable;
    if ((ctrlK || altQ || slash) && !other) { e.preventDefault(); e.stopPropagation(); openPalette(); }
  }, true);
}
