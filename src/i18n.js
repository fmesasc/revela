// Interface localisation. Spanish is the source language; each row lists the
// translations in LANG order. Strings not in the table fall back to Spanish, so
// the table can be extended language‑by‑language without breaking anything.

export const LANGS = [
  { code: 'es', name: 'Español' },
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' },
  { code: 'ca', name: 'Català' },
];
const ORDER = ['en', 'fr', 'de', 'it', 'pt', 'ca'];

// es | en | fr | de | it | pt | ca
const ROWS = [
  // Tabs
  ['Archivo', 'File', 'Fichier', 'Datei', 'File', 'Ficheiro', 'Fitxer'],
  ['Inicio', 'Home', 'Accueil', 'Start', 'Home', 'Início', 'Inici'],
  ['Insertar', 'Insert', 'Insertion', 'Einfügen', 'Inserisci', 'Inserir', 'Insereix'],
  ['Diseño', 'Design', 'Création', 'Entwurf', 'Progettazione', 'Design', 'Disseny'],
  ['Transiciones', 'Transitions', 'Transitions', 'Übergänge', 'Transizioni', 'Transições', 'Transicions'],
  ['Animaciones', 'Animations', 'Animations', 'Animationen', 'Animazioni', 'Animações', 'Animacions'],
  ['Ver', 'View', 'Affichage', 'Ansicht', 'Visualizza', 'Ver', 'Visualitza'],
  // Group labels
  ['Proyecto', 'Project', 'Projet', 'Projekt', 'Progetto', 'Projeto', 'Projecte'],
  ['Importar', 'Import', 'Importer', 'Importieren', 'Importa', 'Importar', 'Importa'],
  ['Salida', 'Output', 'Sortie', 'Ausgabe', 'Uscita', 'Saída', 'Sortida'],
  ['Diapositivas', 'Slides', 'Diapositives', 'Folien', 'Diapositive', 'Slides', 'Diapositives'],
  ['Tipo de letra', 'Font', 'Police', 'Schriftart', 'Carattere', 'Tipo de letra', 'Tipus de lletra'],
  ['Fuente', 'Font', 'Police', 'Schrift', 'Carattere', 'Fonte', 'Lletra'],
  ['Párrafo', 'Paragraph', 'Paragraphe', 'Absatz', 'Paragrafo', 'Parágrafo', 'Paràgraf'],
  ['Texto', 'Text', 'Texte', 'Text', 'Testo', 'Texto', 'Text'],
  ['Alinear / distribuir', 'Align / distribute', 'Aligner / répartir', 'Ausrichten / verteilen', 'Allinea / distribuisci', 'Alinhar / distribuir', 'Alinea / distribueix'],
  ['Organizar', 'Arrange', 'Organiser', 'Anordnen', 'Disponi', 'Organizar', 'Organitza'],
  ['Básico', 'Basic', 'Base', 'Basis', 'Base', 'Básico', 'Bàsic'],
  ['Diagramas', 'Diagrams', 'Diagrammes', 'Diagramme', 'Diagrammi', 'Diagramas', 'Diagrames'],
  ['Multimedia', 'Media', 'Multimédia', 'Medien', 'Multimedia', 'Multimédia', 'Multimèdia'],
  ['Plantillas', 'Templates', 'Modèles', 'Vorlagen', 'Modelli', 'Modelos', 'Plantilles'],
  ['Formas', 'Shapes', 'Formes', 'Formen', 'Forme', 'Formas', 'Formes'],
  ['Fondo', 'Background', 'Arrière-plan', 'Hintergrund', 'Sfondo', 'Fundo', 'Fons'],
  ['Marca', 'Brand', 'Marque', 'Marke', 'Marchio', 'Marca', 'Marca'],
  ['Tema', 'Theme', 'Thème', 'Design', 'Tema', 'Tema', 'Tema'],
  ['Tamaño', 'Size', 'Taille', 'Größe', 'Dimensione', 'Tamanho', 'Mida'],
  ['Numeración', 'Numbering', 'Numérotation', 'Nummerierung', 'Numerazione', 'Numeração', 'Numeració'],
  ['Pie de página', 'Footer', 'Pied de page', 'Fußzeile', 'Piè di pagina', 'Rodapé', 'Peu de pàgina'],
  ['Transición de esta diapositiva', 'Transition of this slide', 'Transition de cette diapositive', 'Übergang dieser Folie', 'Transizione di questa diapositiva', 'Transição deste slide', 'Transició d’aquesta diapositiva'],
  ['Por defecto', 'Default', 'Par défaut', 'Standard', 'Predefinito', 'Padrão', 'Per defecte'],
  ['Avance automático (s)', 'Auto-advance (s)', 'Avance auto (s)', 'Autom. Wechsel (s)', 'Avanzamento auto (s)', 'Avanço automático (s)', 'Avanç automàtic (s)'],
  ['Transformar', 'Transform', 'Transformer', 'Transformieren', 'Trasforma', 'Transformar', 'Transforma'],
  ['Entrada del objeto seleccionado', 'Entrance of the selected object', 'Entrée de l’objet sélectionné', 'Eingang des ausgewählten Objekts', 'Entrata dell’oggetto selezionato', 'Entrada do objeto selecionado', 'Entrada de l’objecte seleccionat'],
  ['Énfasis y salida', 'Emphasis and exit', 'Accentuation et sortie', 'Betonung und Ausgang', 'Enfasi e uscita', 'Ênfase e saída', 'Èmfasi i sortida'],
  ['Quitar', 'Remove', 'Supprimer', 'Entfernen', 'Rimuovi', 'Remover', 'Treu'],
  ['Presentación', 'Slide show', 'Diaporama', 'Präsentation', 'Presentazione', 'Apresentação', 'Presentació'],
  ['Ayudas', 'Aids', 'Repères', 'Hilfen', 'Aiuti', 'Auxílios', 'Ajudes'],
  // Button captions (some with <br>)
  ['Nuevo', 'New', 'Nouveau', 'Neu', 'Nuovo', 'Novo', 'Nou'],
  ['Abrir', 'Open', 'Ouvrir', 'Öffnen', 'Apri', 'Abrir', 'Obre'],
  ['Guardar', 'Save', 'Enregistrer', 'Speichern', 'Salva', 'Guardar', 'Desa'],
  ['Importar<br>PowerPoint', 'Import<br>PowerPoint', 'Importer<br>PowerPoint', 'PowerPoint<br>importieren', 'Importa<br>PowerPoint', 'Importar<br>PowerPoint', 'Importa<br>PowerPoint'],
  ['Exportar<br>HTML', 'Export<br>HTML', 'Exporter<br>HTML', 'HTML<br>exportieren', 'Esporta<br>HTML', 'Exportar<br>HTML', 'Exporta<br>HTML'],
  ['Exportar<br>PDF', 'Export<br>PDF', 'Exporter<br>PDF', 'PDF<br>exportieren', 'Esporta<br>PDF', 'Exportar<br>PDF', 'Exporta<br>PDF'],
  ['Imagen<br>(PNG)', 'Image<br>(PNG)', 'Image<br>(PNG)', 'Bild<br>(PNG)', 'Immagine<br>(PNG)', 'Imagem<br>(PNG)', 'Imatge<br>(PNG)'],
  ['Presentar', 'Present', 'Présenter', 'Präsentieren', 'Presenta', 'Apresentar', 'Presenta'],
  ['Conectar<br>móvil', 'Connect<br>phone', 'Connecter<br>mobile', 'Handy<br>verbinden', 'Collega<br>telefono', 'Ligar<br>telemóvel', 'Connecta<br>mòbil'],
  ['Nueva', 'New', 'Nouvelle', 'Neu', 'Nuova', 'Nova', 'Nova'],
  ['Duplicar', 'Duplicate', 'Dupliquer', 'Duplizieren', 'Duplica', 'Duplicar', 'Duplica'],
  ['Eliminar', 'Delete', 'Supprimer', 'Löschen', 'Elimina', 'Eliminar', 'Elimina'],
  ['Sección', 'Section', 'Section', 'Abschnitt', 'Sezione', 'Seção', 'Secció'],
  ['Imagen', 'Image', 'Image', 'Bild', 'Immagine', 'Imagem', 'Imatge'],
  ['Tabla', 'Table', 'Tableau', 'Tabelle', 'Tabella', 'Tabela', 'Taula'],
  ['Gráfico', 'Chart', 'Graphique', 'Diagramm', 'Grafico', 'Gráfico', 'Gràfic'],
  ['Iconos', 'Icons', 'Icônes', 'Symbole', 'Icone', 'Ícones', 'Icones'],
  ['Proceso', 'Process', 'Processus', 'Prozess', 'Processo', 'Processo', 'Procés'],
  ['Ciclo', 'Cycle', 'Cycle', 'Zyklus', 'Ciclo', 'Ciclo', 'Cicle'],
  ['Jerarquía', 'Hierarchy', 'Hiérarchie', 'Hierarchie', 'Gerarchia', 'Hierarquia', 'Jerarquia'],
  ['Lista', 'List', 'Liste', 'Liste', 'Elenco', 'Lista', 'Llista'],
  ['Cuadro<br>de texto', 'Text<br>box', 'Zone<br>de texte', 'Text<br>feld', 'Casella<br>di testo', 'Caixa<br>de texto', 'Quadre<br>de text'],
  ['Modelo 3D<br>(.glb)', '3D model<br>(.glb)', 'Modèle 3D<br>(.glb)', '3D-Modell<br>(.glb)', 'Modello 3D<br>(.glb)', 'Modelo 3D<br>(.glb)', 'Model 3D<br>(.glb)'],
  ['Vídeo', 'Video', 'Vidéo', 'Video', 'Video', 'Vídeo', 'Vídeo'],
  ['Audio', 'Audio', 'Audio', 'Audio', 'Audio', 'Áudio', 'Àudio'],
  ['Página<br>web', 'Web<br>page', 'Page<br>web', 'Web<br>seite', 'Pagina<br>web', 'Página<br>web', 'Pàgina<br>web'],
  ['Código', 'Code', 'Code', 'Code', 'Codice', 'Código', 'Codi'],
  ['Portada', 'Title', 'Titre', 'Titelseite', 'Copertina', 'Capa', 'Portada'],
  ['Título y<br>contenido', 'Title and<br>content', 'Titre et<br>contenu', 'Titel und<br>Inhalt', 'Titolo e<br>contenuto', 'Título e<br>conteúdo', 'Títol i<br>contingut'],
  ['Dos<br>contenidos', 'Two<br>contents', 'Deux<br>contenus', 'Zwei<br>Inhalte', 'Due<br>contenuti', 'Dois<br>conteúdos', 'Dos<br>continguts'],
  ['Comparación', 'Comparison', 'Comparaison', 'Vergleich', 'Confronto', 'Comparação', 'Comparació'],
  ['Encabezado<br>sección', 'Section<br>header', 'En-tête<br>section', 'Abschnitts-<br>kopf', 'Intestazione<br>sezione', 'Cabeçalho<br>seção', 'Capçalera<br>secció'],
  ['Escaparate<br>3D', '3D<br>showcase', 'Vitrine<br>3D', '3D-<br>Schaufenster', 'Vetrina<br>3D', 'Vitrine<br>3D', 'Aparador<br>3D'],
  ['En blanco', 'Blank', 'Vierge', 'Leer', 'Vuoto', 'Em branco', 'En blanc'],
  ['Guardar<br>plantilla', 'Save<br>template', 'Enregistrer<br>modèle', 'Vorlage<br>speichern', 'Salva<br>modello', 'Guardar<br>modelo', 'Desa<br>plantilla'],
  ['Color', 'Color', 'Couleur', 'Farbe', 'Colore', 'Cor', 'Color'],
  ['Números', 'Numbers', 'Numéros', 'Nummern', 'Numeri', 'Números', 'Números'],
  ['Pie', 'Footer', 'Pied', 'Fußzeile', 'Piè', 'Rodapé', 'Peu'],
  ['Fecha', 'Date', 'Date', 'Datum', 'Data', 'Data', 'Data'],
  ['Logo', 'Logo', 'Logo', 'Logo', 'Logo', 'Logótipo', 'Logotip'],
  ['Heredar', 'Inherit', 'Hériter', 'Erben', 'Eredita', 'Herdar', 'Hereta'],
  ['Ninguna', 'None', 'Aucune', 'Keine', 'Nessuna', 'Nenhuma', 'Cap'],
  ['Fundido', 'Fade', 'Fondu', 'Überblenden', 'Dissolvenza', 'Fundido', 'Fosa'],
  ['Deslizar', 'Slide', 'Glisser', 'Schieben', 'Scorri', 'Deslizar', 'Llisca'],
  ['Aparecer', 'Appear', 'Apparaître', 'Erscheinen', 'Compari', 'Aparecer', 'Apareix'],
  ['Subir', 'Up', 'Monter', 'Nach oben', 'Su', 'Subir', 'Amunt'],
  ['Bajar', 'Down', 'Descendre', 'Nach unten', 'Giù', 'Descer', 'Avall'],
  ['Izquierda', 'Left', 'Gauche', 'Links', 'Sinistra', 'Esquerda', 'Esquerra'],
  ['Derecha', 'Right', 'Droite', 'Rechts', 'Destra', 'Direita', 'Dreta'],
  ['Agrandar', 'Grow', 'Agrandir', 'Vergrößern', 'Ingrandisci', 'Ampliar', 'Amplia'],
  ['Encoger', 'Shrink', 'Réduire', 'Verkleinern', 'Riduci', 'Encolher', 'Encongeix'],
  ['Tachar', 'Strike', 'Barrer', 'Durchstreichen', 'Barra', 'Riscar', 'Ratlla'],
  ['Desaparecer', 'Disappear', 'Disparaître', 'Verschwinden', 'Scompari', 'Desaparecer', 'Desapareix'],
  ['Resaltar', 'Highlight', 'Surligner', 'Hervorheben', 'Evidenzia', 'Realçar', 'Ressalta'],
  ['Sin<br>animación', 'No<br>animation', 'Sans<br>animation', 'Keine<br>Animation', 'Nessuna<br>animazione', 'Sem<br>animação', 'Sense<br>animació'],
  ['Duplicar<br>animando', 'Duplicate to<br>animate', 'Dupliquer pour<br>animer', 'Zum Animieren<br>duplizieren', 'Duplica per<br>animare', 'Duplicar para<br>animar', 'Duplica per<br>animar'],
  ['Guías', 'Grid', 'Grille', 'Raster', 'Griglia', 'Grade', 'Graella'],
  ['Regla', 'Ruler', 'Règle', 'Lineal', 'Righello', 'Régua', 'Regle'],
  ['Ajustar', 'Snap', 'Aligner', 'Einrasten', 'Aggancia', 'Ajustar', 'Ajusta'],
  ['Notas', 'Notes', 'Notes', 'Notizen', 'Note', 'Notas', 'Notes'],
  // Select options
  ['Predeterminada', 'Default', 'Par défaut', 'Standard', 'Predefinito', 'Padrão', 'Predeterminada'],
  ['Oscuro', 'Dark', 'Sombre', 'Dunkel', 'Scuro', 'Escuro', 'Fosc'],
  ['Claro', 'Light', 'Clair', 'Hell', 'Chiaro', 'Claro', 'Clar'],
  ['Normal', 'Normal', 'Normale', 'Normal', 'Normale', 'Normal', 'Normal'],
  ['Rápida', 'Fast', 'Rapide', 'Schnell', 'Veloce', 'Rápida', 'Ràpida'],
  ['Lenta', 'Slow', 'Lente', 'Langsam', 'Lenta', 'Lenta', 'Lenta'],
  ['Abajo dcha.', 'Bottom right', 'Bas droite', 'Unten rechts', 'In basso a destra', 'Inferior direita', 'A baix dreta'],
  ['Abajo izq.', 'Bottom left', 'Bas gauche', 'Unten links', 'In basso a sinistra', 'Inferior esquerda', 'A baix esquerra'],
  ['Arriba dcha.', 'Top right', 'Haut droite', 'Oben rechts', 'In alto a destra', 'Superior direita', 'A dalt dreta'],
  ['Arriba izq.', 'Top left', 'Haut gauche', 'Oben links', 'In alto a sinistra', 'Superior esquerda', 'A dalt esquerra'],
  // Status bar
  ['Clic para seleccionar · doble clic para editar · arrastra para mover · clic derecho para más opciones',
    'Click to select · double-click to edit · drag to move · right-click for more options',
    'Cliquez pour sélectionner · double-cliquez pour modifier · glissez pour déplacer · clic droit pour plus d’options',
    'Klicken zum Auswählen · Doppelklick zum Bearbeiten · Ziehen zum Verschieben · Rechtsklick für mehr Optionen',
    'Clic per selezionare · doppio clic per modificare · trascina per spostare · clic destro per altre opzioni',
    'Clique para selecionar · duplo clique para editar · arraste para mover · clique direito para mais opções',
    'Clic per seleccionar · doble clic per editar · arrossega per moure · clic dret per a més opcions'],
  // Context menu (common)
  ['Cortar', 'Cut', 'Couper', 'Ausschneiden', 'Taglia', 'Cortar', 'Retalla'],
  ['Copiar', 'Copy', 'Copier', 'Kopieren', 'Copia', 'Copiar', 'Copia'],
  ['Pegar', 'Paste', 'Coller', 'Einfügen', 'Incolla', 'Colar', 'Enganxa'],
  ['Editar texto', 'Edit text', 'Modifier le texte', 'Text bearbeiten', 'Modifica testo', 'Editar texto', 'Edita el text'],
  ['Agrupar', 'Group', 'Grouper', 'Gruppieren', 'Raggruppa', 'Agrupar', 'Agrupa'],
  ['Desagrupar', 'Ungroup', 'Dissocier', 'Gruppierung aufheben', 'Separa', 'Desagrupar', 'Desagrupa'],
  ['Conectar', 'Connect', 'Connecter', 'Verbinden', 'Collega', 'Ligar', 'Connecta'],
  ['Bloquear', 'Lock', 'Verrouiller', 'Sperren', 'Blocca', 'Bloquear', 'Bloqueja'],
  ['Desbloquear', 'Unlock', 'Déverrouiller', 'Entsperren', 'Sblocca', 'Desbloquear', 'Desbloqueja'],
  ['Traer al frente', 'Bring to front', 'Mettre au premier plan', 'In den Vordergrund', 'Porta in primo piano', 'Trazer para a frente', 'Porta al davant'],
  ['Enviar al fondo', 'Send to back', 'Mettre à l’arrière-plan', 'In den Hintergrund', 'Porta in fondo', 'Enviar para trás', 'Envia al fons'],
  ['Adelantar', 'Bring forward', 'Avancer', 'Nach vorne', 'Porta avanti', 'Avançar', 'Avança'],
  ['Atrasar', 'Send backward', 'Reculer', 'Nach hinten', 'Porta indietro', 'Recuar', 'Endarrere'],
  ['Centrar horizontalmente', 'Center horizontally', 'Centrer horizontalement', 'Horizontal zentrieren', 'Centra orizzontalmente', 'Centrar horizontalmente', 'Centra horitzontalment'],
  ['Centrar verticalmente', 'Center vertically', 'Centrer verticalement', 'Vertikal zentrieren', 'Centra verticalmente', 'Centrar verticalmente', 'Centra verticalment'],
  ['Voltear horizontalmente', 'Flip horizontally', 'Retourner horizontalement', 'Horizontal spiegeln', 'Capovolgi orizzontalmente', 'Virar horizontalmente', 'Capgira horitzontalment'],
  ['Voltear verticalmente', 'Flip vertically', 'Retourner verticalement', 'Vertikal spiegeln', 'Capovolgi verticalmente', 'Virar verticalmente', 'Capgira verticalment'],
  ['Restablecer giro', 'Reset rotation', 'Réinitialiser la rotation', 'Drehung zurücksetzen', 'Reimposta rotazione', 'Repor rotação', 'Restableix el gir'],
  ['Opacidad…', 'Opacity…', 'Opacité…', 'Deckkraft…', 'Opacità…', 'Opacidade…', 'Opacitat…'],
  ['Copiar formato', 'Copy formatting', 'Copier la mise en forme', 'Formatierung kopieren', 'Copia formato', 'Copiar formatação', 'Copia el format'],
  ['Pegar formato', 'Paste formatting', 'Coller la mise en forme', 'Formatierung einfügen', 'Incolla formato', 'Colar formatação', 'Enganxa el format'],
  ['Nueva diapositiva', 'New slide', 'Nouvelle diapositive', 'Neue Folie', 'Nuova diapositiva', 'Novo slide', 'Nova diapositiva'],
  ['Duplicar diapositiva', 'Duplicate slide', 'Dupliquer la diapositive', 'Folie duplizieren', 'Duplica diapositiva', 'Duplicar slide', 'Duplica la diapositiva'],
  ['Eliminar diapositiva', 'Delete slide', 'Supprimer la diapositive', 'Folie löschen', 'Elimina diapositiva', 'Eliminar slide', 'Elimina la diapositiva'],
  ['Ocultar diapositiva', 'Hide slide', 'Masquer la diapositive', 'Folie ausblenden', 'Nascondi diapositiva', 'Ocultar slide', 'Amaga la diapositiva'],
  ['Mostrar diapositiva', 'Show slide', 'Afficher la diapositive', 'Folie einblenden', 'Mostra diapositiva', 'Mostrar slide', 'Mostra la diapositiva'],
  ['Crear sección aquí', 'Create section here', 'Créer une section ici', 'Abschnitt hier erstellen', 'Crea sezione qui', 'Criar seção aqui', 'Crea una secció aquí'],
];

const DICT = {};
for (const code of ORDER) DICT[code] = {};
for (const row of ROWS) {
  const es = row[0];
  ORDER.forEach((code, i) => { if (row[i + 1]) DICT[code][es] = row[i + 1]; });
}

const KEY = 'revela.lang';
let lang = 'es';
try { lang = localStorage.getItem(KEY) || 'es'; } catch {}

export function currentLang() { return lang; }
export function t(es) { return (DICT[lang] && DICT[lang][es]) || es; }

export function applyI18n() {
  const scope = ['#ribbon', '#statusbar', '.titlebar'];
  for (const sel of scope) {
    document.querySelectorAll(`${sel} [title]`).forEach(el => {
      if (el.dataset.i18nt === undefined) el.dataset.i18nt = el.getAttribute('title');
      el.setAttribute('title', t(el.dataset.i18nt));
    });
  }
  document.querySelectorAll('#ribbon .tabs button, #ribbon .group>label, #ribbon .row button span, #ribbon select option, #statusbar .hint')
    .forEach(el => {
      if (el.dataset.i18n === undefined) el.dataset.i18n = el.innerHTML.trim();
      el.innerHTML = t(el.dataset.i18n);
    });
  document.documentElement.lang = lang;
}

export function setLang(code) {
  lang = code;
  try { localStorage.setItem(KEY, code); } catch {}
  const sel = document.getElementById('lang-select'); if (sel) sel.value = code;
  applyI18n();
}

// Build the language picker and apply the stored language.
export function initI18n() {
  const sel = document.getElementById('lang-select');
  if (sel) {
    sel.innerHTML = LANGS.map(l => `<option value="${l.code}">${l.name}</option>`).join('');
    sel.value = lang;
    sel.addEventListener('change', () => setLang(sel.value));
  }
  applyI18n();
}
