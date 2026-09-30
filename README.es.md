<div align="center">

# Revela

**Editor visual de presentaciones interactivas con 3D en vivo, construido sobre
[reveal.js](https://revealjs.com/).**

[English](README.md) · [Español](README.es.md) · [Demo](https://fmesasc.github.io/revela/) · [App de escritorio](https://github.com/fmesasc/revela/releases/latest) · [Hoja de ruta](ROADMAP.md)

</div>

![Editor Revela](docs/screenshot.png)

Revela es un editor de presentaciones que funciona en el navegador. Combina una
experiencia de edición similar a una suite ofimática con una función que ninguna
suite nativa de Linux ofrece: **modelos 3D en vivo** incrustados en las
diapositivas. Las presentaciones se crean visualmente y se renderizan con
reveal.js, de modo que el resultado es una página web estándar y autónoma.

## Funciones

- **Editor completo tipo ofimática** (Archivo, Inicio, Insertar, Dibujar,
  Diseño, Transiciones, Animaciones, Ver, IA): texto con formato, listas
  anidadas, estilos, columnas, WordArt, más de 70 formas (con texto dentro,
  botones de acción, forma libre) y combinar formas, tablas con celdas
  combinadas, estilos y fórmulas (=SUMA(ARRIBA)…), gráficos (varias series,
  combinados, apilados, 100 %, histograma, cascada, embudo, rectángulos,
  burbujas, mapas; desde tabla o CSV en vivo),
  iconos, ecuaciones, código, **modelos 3D**, vídeo, PDF y archivos adjuntos,
  tabulaciones, fuentes propias y dictado por voz.
- **Copiar, cortar y pegar** (Ctrl+C/X/V, cinta y menú contextual; también
  con pulsación larga en el móvil), deshacer/rehacer, alineación con guías y
  espaciado inteligente, agrupar, bloquear, panel de selección (ocultar,
  renombrar, reordenar), copiar formato de cualquier objeto y orden de lectura.
- **Diseño:** paletas y fuentes del tema, kit de marca (colores, fuentes y
  logotipos), cambiar tamaño recolocando el contenido (A4, cuadrado, 9:16…),
  patrón de diapositivas, marcadores de posición, galería de plantillas e
  ideas de diseño.
- **Objetos:** formas con degradado o a mano alzada, vínculos en cualquier
  objeto, conectores rectos, en ángulo o curvos, texto curvo, texto
  alrededor de una imagen, imágenes dentro de un móvil, portátil o navegador,
  cuenta atrás, sonido de fondo que sigue al cambiar de diapositiva, y
  personajes 3D que andan por un recorrido y saludan sin cortarse.
- **Todo lo de reveal.js:** diapositivas verticales, fondos de vídeo, web,
  mosaico y parallax, todos los efectos de fragmento y temas, vista de
  desplazamiento, zoom y búsqueda, código paso a paso con desplazamiento
  automático, ajustar texto al cuadro e importar Markdown.
- **Animaciones y transiciones:** entrada, énfasis, salida, trayectorias
  dibujadas a mano, varias por objeto, «Dibujar» (la tinta se traza sola),
  disparadores, «después de la anterior», sonidos, Morph y 22 transiciones.
- **Presentar:** vista del orador, mando desde el móvil (QR), lápiz y
  resaltador, láser, subtítulos en directo, ensayar intervalos y grabar.
- **Votaciones en directo con QR**, **concursos con puntos y clasificación**
  y **preguntas del público**: el público responde desde el móvil y los
  resultados se actualizan al instante.
- **Datos en vivo:** paneles de Power BI, Looker Studio, Tableau, Google
  Sheets, Grafana… y gráficos enlazados a un CSV.
- **IA con OpenRouter** (tu cuenta): crear presentaciones completas desde un
  tema o un documento, asistente que edita la presentación, mejorar
  diapositivas, notas, traducir, texto alternativo e imágenes.
- **Importar y exportar:** PowerPoint (.pptx) y OpenDocument (.odp) en ambos
  sentidos, HTML autónomo, PDF, documentos y notas, imágenes, vídeo MP4/GIF, y
  Google Drive, OneDrive y Dropbox.
- **Recursos libres** en un panel lateral: imágenes (con filtros y fondo
  transparente), iconos, GIF, vídeos, sonidos y música, stickers y modelos 3D
  (Openverse, Iconify, Wikimedia Commons, Poly Haven, NASA, Sketchfab).
- **Colaboración local:** comentarios (también con PowerPoint y LibreOffice)
  con tareas asignadas a personas (con
  fecha límite), historial de versiones, proteger con contraseña y marcar
  como final.
- **Accesibilidad e idiomas:** comprobador, texto alternativo, lector de
  pantalla; 11 idiomas, incluida interfaz de derecha a izquierda.
- **Apariencia del editor:** clara, oscura, automática o con tus colores.
- **Funciona sin conexión** (aplicación instalable), en móvil y con
  complementos y macros mediante una API.

Consulta la [hoja de ruta](ROADMAP.md) para el detalle y lo que viene después.

## Puesta en marcha

**App de escritorio** (Windows, macOS, Linux): instaladores en la [última versión](https://github.com/fmesasc/revela/releases/latest), que se genera sola con cada cambio (aún sin firmar: Windows y macOS avisan la primera vez). Una vez instalada se actualiza sola: al abrirla ofrece la versión nueva, comprobada con la clave de actualizaciones de Revela.

Revela es una aplicación estática sin compilación.

```bash
git clone https://github.com/fmesasc/revela.git
cd revela
python3 -m http.server 8000
# abre http://localhost:8000
```

Sirve con cualquier servidor estático; es preferible a abrir `index.html`
directamente para que el navegador cargue bien los módulos ES.

## API, complementos y macros

El editor expone `window.Revela` (ver `src/api/index.js`): leer la presentación,
añadir diapositivas y objetos, modificarlos (un paso de deshacer cada vez),
escuchar cambios, exportar y añadir botones a la cinta. **Ver › Complementos**
carga un módulo ES por URL que exporta `default function (Revela)`;
**Ver › Macros** ejecuta fragmentos guardados con `Revela` disponible. Ambos se
guardan solo en tu navegador.

```js
// mi-complemento.js
export default Revela => Revela.ui.addButton({
  id: 'agenda', label: 'Agenda', icon: 'list',
  onClick: R => {
    R.slides.add();
    R.add.text('<b>Agenda</b>', { x: 90, y: 60, w: 1100, h: 90 });
  },
});
```

## Arquitectura

Módulos ES estándar, sin framework ni empaquetador, sin servidor propio. Un
store central mantiene el documento y el estado de la interfaz y avisa a las
vistas en cada cambio. El código está organizado en capas, y cada una importa
solo de las inferiores (lo comprueban los tests):

```
src/
  apps/      puntos de entrada: editor, mando del móvil, página de votación
  ui/        estructura, lienzo, cinta, diálogos, paneles, estilos
  api/       window.Revela para complementos y macros
  io/        formatos (reveal.js, PowerPoint, OpenDocument, Markdown), exportación, nube
  features/  operaciones sobre el documento por dominio: documento, diseño, animación, IA, colaboración, en directo
  render/    dibujo a SVG · i18n/  idiomas de la interfaz
  core/      modelo, store con deshacer/rehacer, persistencia, librerías del CDN
```

Más detalles en [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Contribuir

Las aportaciones son bienvenidas. Lee [CONTRIBUTING.md](CONTRIBUTING.md).

## Contribuciones

Si este proyecto te ha sido útil y te gustaría ver más proyectos similares, considera invitarme a un café :) para ayudarme a continuar desarrollando y mejorando el código. ¡Tu apoyo es muy apreciado y ayuda a mantener vivo este proyecto!

[![PayPal](https://www.paypalobjects.com/webstatic/mktg/logo/AM_SbyPP_mc_vs_dc_ae.jpg)](https://paypal.me/fmesasc)

## Licencia

[MIT](LICENSE) © Francisco Mesas Cervilla.
