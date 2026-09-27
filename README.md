# Revela

*Read this in other languages: **English** · [Español](README.es.md)*

**A visual editor for presentations with live 3D, powered by
[reveal.js](https://revealjs.com/).** Drag text, images and **3D models
(`.glb`)** onto your slides, watch them spin in real time, then present or
export to a self‑contained web page. No PowerPoint, no cloud, no Office
license — free software that runs in the browser.

> *Revelar* is Spanish for *to reveal* (and *to develop* a photo). A nod to
> **reveal**.js.

🔗 **Live demo:** https://fmesasc.github.io/revela/ · **License:** MIT

## Why

There is no free, open‑source visual editor with **live 3D models** that
outputs reveal.js. PowerPoint's flagship feature — inserting a 3D model and
animating it inside the slide — is missing from every native Linux office
suite, and the web alternatives are paid or closed. Revela fills that gap.

## Status

**Very early MVP (v0.1).** Already working:

- Slides: add, delete, reorder.
- **Text** blocks (inline editing) and **3D model** blocks (`.glb`, with
  auto‑rotate and camera controls).
- Place and move blocks on the slide (drag), resize with a handle.
- **Present** with reveal.js (fullscreen, keyboard, progress).
- **Export** to a standalone `presentacion.html` that opens in any browser.
- Local autosave (kept in the browser) plus import/export of the project as
  `.json`.

Roadmap: images, transitions (incl. *Morph* between 3D models), themes,
templates, a desktop build with [Tauri](https://tauri.app/), and collaboration.

## Try it

No build step. From the project folder:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Or just use the [live demo](https://fmesasc.github.io/revela/).

## How it's built

All free, nothing to compile:

- **reveal.js** — the presentation engine.
- **`<model-viewer>`** (Google) — the live 3D.
- **Vanilla JavaScript** — the editor, lightweight and framework‑free.
- *(later)* **Tauri** for the desktop build.

## Contributing

It's a young project — issues and ideas help as much as code. Fork it, try it,
and open a PR or an issue.

## License

[MIT](LICENSE) © Francisco Mesas Cervilla ([fmesasc](https://github.com/fmesasc)).
