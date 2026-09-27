<div align="center">

# Revela

**Editor visual de presentaciones interactivas con 3D en vivo, construido sobre
[reveal.js](https://revealjs.com/).**

[English](README.md) · [Español](README.es.md) · [Demo](https://fmesasc.github.io/revela/) · [Hoja de ruta](ROADMAP.md)

</div>

![Editor Revela](docs/screenshot.png)

Revela es un editor de presentaciones que funciona en el navegador. Combina una
experiencia de edición similar a una suite ofimática con una función que ninguna
suite nativa de Linux ofrece: **modelos 3D en vivo** incrustados en las
diapositivas. Las presentaciones se crean visualmente y se renderizan con
reveal.js, de modo que el resultado es una página web estándar y autónoma.

## Funciones

- **Cinta tipo ofimática** organizada en pestañas: Archivo, Inicio, Insertar,
  Diseño, Transiciones, Animaciones y Ver.
- **Lienzo por bloques** con manipulación directa: arrastrar desde cualquier
  punto, guías de alineación con ajuste, redimensionado por las esquinas y
  desplazamiento con el teclado.
- **Bloques de contenido:** texto enriquecido, imágenes, vídeo y **modelos 3D
  interactivos** (`.glb` / `.gltf`).
- **Menú contextual** (clic derecho) con acciones por objeto, incluida la
  **eliminación de fondo de imágenes** por IA.
- **Transiciones por diapositiva** y **animaciones de entrada por objeto**.
- **Secciones** y **reordenación de diapositivas** arrastrando en el navegador.
- **Plantillas** (integradas y propias).
- **Importación de PowerPoint** (`.pptx`): recupera texto e imágenes con su
  posición.
- **Diseño:** fondo por diapositiva, temas de reveal.js, 16∶9 / 4∶3.
- **Deshacer / rehacer**, autoguardado local e importar/exportar el proyecto
  como JSON.
- **Presentar** a pantalla completa y **exportar** a un HTML autónomo.

Consulta la [hoja de ruta](ROADMAP.md) para lo que viene después.

## Puesta en marcha

Revela es una aplicación estática sin compilación.

```bash
git clone https://github.com/fmesasc/revela.git
cd revela
python3 -m http.server 8000
# abre http://localhost:8000
```

Sirve con cualquier servidor estático; es preferible a abrir `index.html`
directamente para que el navegador cargue bien los módulos ES.

## Arquitectura

Módulos ES estándar, sin framework ni empaquetador. Un store central mantiene
el documento y el estado de la interfaz y avisa a las vistas en cada cambio.

```
src/
  core/      modelo y persistencia, store central con deshacer/rehacer
  features/  diapositivas, bloques, formato, transiciones, plantillas
  io/         salida a reveal.js, importación de PowerPoint
  ui/         cinta, lienzo, navegador, menú contextual
  main.js    arranque
```

Más detalles en [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Contribuir

Las aportaciones son bienvenidas. Lee [CONTRIBUTING.md](CONTRIBUTING.md).

## Licencia

[MIT](LICENSE) © Francisco Mesas Cervilla.
