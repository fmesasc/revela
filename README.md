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

- **Full office-style editor** (File, Home, Insert, Draw, Design, Transitions,
  Animations, View, AI): rich text, nested lists, styles, columns, WordArt,
  shapes and shape merging, tables with merged cells and styles, charts
  (multi-series, combo, from a table or a live CSV), icons, equations, code,
  **3D models** and video.
- **Copy, cut and paste** (Ctrl+C/X/V, ribbon and context menu; long-press on
  phones), undo/redo, alignment guides and smart spacing, grouping, locking,
  reading order.
- **Design:** theme colours and fonts, slide master, placeholders, template
  gallery and design ideas.
- **Everything reveal.js offers:** vertical slides, video, web page, tiled
  and parallax backgrounds, every fragment style and theme, scroll view, zoom
  and search, step-by-step code with auto-scroll, fit text and Markdown import.
- **Animations & transitions:** entrance, emphasis, exit, motion paths,
  triggers, "after previous", Morph and 10 transitions.
- **Presenting:** speaker view, phone remote (QR), pen and highlighter, laser,
  live captions, rehearse timings and recording.
- **Live polls with QR** and **audience Q&A**: people vote from their phones
  and results update instantly.
- **Live data:** Power BI, Looker Studio, Tableau, Google Sheets, Grafana…
  dashboards, and charts linked to a CSV.
- **AI via OpenRouter** (your own account): whole decks from a topic or a
  document, an assistant that edits the deck, improve slides, notes,
  translation, alt text and images.
- **Import & export:** PowerPoint (.pptx) and OpenDocument (.odp) both ways,
  self-contained HTML, PDF, handouts and notes, images, MP4/GIF video and
  Google Drive.
- **Online free images and icons** (Openverse, Iconify).
- **Local collaboration:** comments, version history, password protection and
  mark as final.
- **Accessibility & languages:** checker, alt text, screen reader support;
  11 languages including a right-to-left interface.
- **Editor appearance:** light, dark, automatic or your own colours.
- **Works offline** (installable app), on phones, and with add-ins and macros
  through an API.

See the [roadmap](ROADMAP.md) for details and what comes next.

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

## Support

If this project is useful to you and you'd like to see more like it, consider buying me a coffee :) — it helps me keep developing and improving Revela. Thank you!

[![PayPal](https://www.paypalobjects.com/webstatic/mktg/logo/AM_SbyPP_mc_vs_dc_ae.jpg)](https://paypal.me/fmesasc)

## License

[MIT](LICENSE) © Francisco Mesas Cervilla.
