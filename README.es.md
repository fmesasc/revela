# Revela

*Léelo en otros idiomas: [English](README.md) · **Español***

**Editor visual de presentaciones con 3D en vivo, que por debajo usa
[reveal.js](https://revealjs.com/).** Arrastra texto, imágenes y **modelos 3D
(`.glb`)** a tus diapositivas, míralos girar en directo, y presenta o exporta a
una web autónoma. Sin PowerPoint, sin nube, sin licencia de Office: software
libre y nativo del navegador.

> *Revelar*: mostrar algo… y también como se «revelaba» una foto para darle
> vida. Un guiño a **reveal**.js.

🔗 **Demo en vivo:** https://fmesasc.github.io/revela/ · **Licencia:** MIT

## Por qué

No existe una herramienta libre, con **editor visual** y **modelos 3D vivos**,
que genere reveal.js. La función estrella de PowerPoint —insertar un modelo 3D
y animarlo dentro de la diapositiva— no la tiene ninguna suite nativa de Linux,
y las alternativas web son de pago o cerradas. Revela llena ese hueco.

## Estado

**MVP muy temprano (v0.1).** Ya funciona:

- Diapositivas: añadir, borrar, reordenar.
- Bloques de **texto** (edición en línea) y **modelo 3D** (`.glb`, con giro
  automático y controles de cámara).
- Colocar y mover los bloques sobre la diapositiva (arrastrar), redimensionar.
- **Presentar** con reveal.js (pantalla completa, teclas, progreso).
- **Exportar** a un `presentacion.html` autónomo que se abre en cualquier
  navegador.
- Guardado local (en el navegador) e importar/exportar el proyecto como `.json`.

Hoja de ruta: imágenes, transiciones (incl. *Transformación/Morph* entre
modelos 3D), temas, plantillas, versión de escritorio con
[Tauri](https://tauri.app/), y colaboración.

## Probarlo

No necesita compilar nada. Desde la carpeta del proyecto:

```bash
python3 -m http.server 8000
# abre http://localhost:8000
```

O usa la [demo en vivo](https://fmesasc.github.io/revela/).

## Cómo está hecho

Todo libre y sin nada que compilar:

- **reveal.js** — el motor de la presentación.
- **`<model-viewer>`** (Google) — el 3D en vivo.
- **JavaScript puro** — el editor, ligero y sin framework.
- *(más adelante)* **Tauri** para la versión de escritorio.

## Contribuir

Es un proyecto joven: las ideas y los *issues* ayudan tanto como el código.
Haz un fork, pruébalo, y abre un PR o un issue.

## Licencia

[MIT](LICENSE) © Francisco Mesas Cervilla ([fmesasc](https://github.com/fmesasc)).
