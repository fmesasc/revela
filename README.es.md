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

**MVP temprano (v0.2).** Ya funciona, con una **cinta tipo OnlyOffice**
(pestañas: Archivo, Inicio, Insertar, Diseño, Transiciones, Animación, Ver):

- Diapositivas: añadir, duplicar, borrar, reordenar.
- Bloques: **texto** (edición en línea + negrita/cursiva/subrayado/color/
  tamaño/alineación), **modelo 3D** (`.glb`, giro automático + cámara),
  **imagen** y **vídeo**.
- Mover los bloques (tirador) y redimensionarlos.
- **Diseño:** color de fondo por diapositiva, **temas** de reveal.js, 16:9 / 4:3.
- **Transiciones** entre diapositivas (fundido, deslizar, zoom, convex, concave)
  y velocidad.
- **Animación:** que un bloque aparezca al avanzar (fragments de reveal.js).
- **Presentar** con reveal.js (pantalla completa, teclas, progreso).
- **Exportar** a un `presentacion.html` autónomo.
- Guardado local e importar/exportar el proyecto como `.json`.

Hoja de ruta: formas y tablas, la transición *Transformación/Morph* entre
modelos 3D, plantillas, versión de escritorio con
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
