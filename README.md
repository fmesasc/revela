<div align="center">

# Revela

**A visual editor for interactive presentations with live 3D, built on
[reveal.js](https://revealjs.com/).**

[English](README.md) · [Español](README.es.md) · [Live demo](https://fmesasc.github.io/revela/) · [Roadmap](ROADMAP.md)

</div>

![Revela editor](docs/screenshot.png)

Revela is a browser-based presentation editor. It combines a familiar
office-style editing experience with a feature no traditional office suite
offers on Linux: **live 3D models** embedded directly in slides. Presentations
are authored visually and rendered with reveal.js, so the output is a
standard, self-contained web page.

## Features

- **Office-style ribbon** organised into tabs: File, Home, Insert, Design,
  Transitions, Animations and View.
- **Block-based canvas** with direct manipulation: drag from anywhere,
  alignment guides with snapping, corner resizing and keyboard nudging.
- **Content blocks:** rich text, images, video and **interactive 3D models**
  (`.glb` / `.gltf`).
- **Right-click context menu** with per-object actions, including AI-based
  **image background removal**.
- **Per-slide transitions** and **per-object entrance animations**.
- **Sections** and **drag-and-drop slide reordering** in the navigator.
- **Templates** (built-in and user-defined).
- **PowerPoint import** (`.pptx`): recovers text and images with their layout.
- **Design controls:** per-slide background, reveal.js themes, 16∶9 / 4∶3.
- **Undo / redo**, local autosave, and project import/export as JSON.
- **Present** in fullscreen and **export** to a standalone HTML file.

See the [roadmap](ROADMAP.md) for what is planned next.

## Getting started

Revela is a static application with no build step.

```bash
git clone https://github.com/fmesasc/revela.git
cd revela
python3 -m http.server 8000
# open http://localhost:8000
```

Any static file server works; a server is preferred over opening `index.html`
directly so the browser loads the ES modules correctly.

## Scripting API, add-ins and macros

The editor exposes `window.Revela` (see `src/api.js`): read the deck, add
slides and objects, update them (one undo step each), listen to changes,
export, and add buttons to the ribbon. **View › Add-ins** loads an ES module
by URL that exports `default function (Revela)`; **View › Macros** runs saved
snippets with `Revela` in scope. Both are stored only in your browser.

```js
// my-addin.js
export default Revela => Revela.ui.addButton({
  id: 'agenda', label: 'Agenda', icon: 'list',
  onClick: R => {
    R.slides.add();
    R.add.text('<b>Agenda</b>', { x: 90, y: 60, w: 1100, h: 90 });
  },
});
```

## Architecture

Plain ES modules, no framework or bundler. A central store holds the document
and UI state and notifies the views on every committed change.

```
src/
  core/      model and persistence, central store with undo/redo
  features/  slides, blocks, formatting, transitions, templates
  io/         reveal.js output, PowerPoint import
  ui/         ribbon, canvas, navigator, context menu
  main.js    bootstrap
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for details.

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) © Francisco Mesas Cervilla.
