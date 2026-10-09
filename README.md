<div align="center">

# Revela

**A visual editor for interactive presentations with live 3D, built on
[reveal.js](https://revealjs.com/).**

[English](README.md) · [Español](README.es.md) · [Official site](https://revelaslides.com) · [Live demo](https://fmesasc.github.io/revela/) · [Desktop app](https://github.com/fmesasc/revela/releases/latest) · [Roadmap](ROADMAP.md)

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
  70+ shapes (with text inside, action buttons, freeform) and shape merging,
  SmartArt-style diagrams (15 layouts written as an outline, editable in
  PowerPoint),
  tables with merged cells, styles and formulas (=SUM(ABOVE)…), charts
  (multi-series, combo, stacked, 100 %, histogram, waterfall, funnel, treemap,
  bubble, maps; from a table or a
  live CSV), icons, equations, code, **3D models**, video, PDFs and attached
  files, tab stops, custom fonts and voice dictation.
- **Command search** (Ctrl+K, Alt+Q or «/»): type what you want («code»,
  «3D image», «footer»…) in any language and run it; it shows where it lives
  in the ribbon.
- **Copy, cut and paste** (Ctrl+C/X/V, ribbon and context menu; long-press on
  phones), undo/redo, alignment guides and smart spacing, grouping, locking,
  selection pane (hide, rename, reorder), format painter for any object,
  reading order.
- **Design:** theme colours and fonts, theme editor (background, text, six
  accents and two fonts, with a preview; the AI suggests one from a description
  and nothing changes until you apply it), brand kit (colours, fonts and logos),
  resize with the content rearranged (A4, square, 9:16…), slide master,
  placeholders, template gallery and design ideas.
- **Objects:** gradient or sketched shapes, links on any object, straight,
  elbow or curved connectors, curved text, text wrapped round a
  picture, pictures inside a phone, laptop or browser, countdown timer, code locks
  for escape rooms,
  background sound that keeps playing across slides, and 3D characters that
  walk along a path and wave without being cut off.
- **Everything reveal.js offers:** vertical slides, video, web page, tiled
  and parallax backgrounds, every fragment style and theme, scroll view, zoom
  and search, step-by-step code with auto-scroll, fit text and Markdown import.
- **Animations & transitions:** entrance, emphasis, exit, hand-drawn motion
  paths, several per object, "Draw" (ink traces itself), triggers, "after
  previous", sounds, Morph and 22 transitions.
- **Presenting:** speaker view, phone remote (QR), pen and highlighter, laser,
  live captions, rehearse timings and recording.
- **Live polls with QR**, **quizzes with points and a leaderboard** (a list
  or an animated race) and **audience Q&A**: people answer from their phones
  (also drawing, with a photo or with their voice) and results update instantly.
- **Question banks:** import quizzes from Moodle (XML or GIFT), Kahoot's
  spreadsheet or a CSV, export them back to those formats, and turn them
  into an offline page of flashcards and practice for students.
- **Live data:** Power BI, Looker Studio, Tableau, Google Sheets, Grafana…
  dashboards, and charts linked to a CSV.
- **AI via OpenRouter** (your own account): whole decks from a topic or a
  documents or photos (of notes, a whiteboard), an assistant that edits the
  deck and reads what you attach (photos, PDFs, text; it asks when something
  is unclear), improve slides, notes, translation, alt text and images, and a
  lesson plan or a study guide from the deck.
- **Import & export:** PowerPoint (.pptx) and OpenDocument (.odp) both ways,
  self-contained HTML (works offline), PDF (made directly), handouts and
  notes, images, MP4/GIF video, and Google Drive, OneDrive and Dropbox; all
  from the File page (New, Open, Save, Share, Export, Print, Protect).
- **Free resources** in a side panel: pictures (with filters and transparent
  background), icons, GIFs, videos, sounds and music, stickers and 3D models
  (Openverse, Iconify, Wikimedia Commons, Poly Haven, NASA, Sketchfab).
- **Collaboration:** live co-editing with chat and view / comment / edit
  links, comments (also to and from PowerPoint and LibreOffice) with tasks
  assigned to people (with due dates), track changes, version history,
  digital signatures, password protection and mark as final. In the official
  edition and the desktop app, presentations kept in Revela's cloud and shared with people or by link
  (present, view, comment or edit), and video calls (Pro).
- **Accessibility & languages:** checker, alt text, screen reader support;
  11 languages including a right-to-left interface.
- **Editor appearance:** light, dark, automatic or your own colours.
- **Works offline** (installable app), on phones, and with add-ins and macros
  through an API.

See the [roadmap](ROADMAP.md) for details and what comes next.

## Getting started

**Desktop app** (Windows, macOS, Linux): installers in the [latest release](https://github.com/fmesasc/revela/releases/latest), built for every published version (each one kept, with its number) (not code-signed yet: Windows/macOS warn the first time). Once installed it updates itself: on start it offers the new version, verified with Revela's update key.

The app is static files with no build step.

```bash
git clone https://github.com/fmesasc/revela.git
cd revela
npm start            # = python3 -m http.server 8000; open http://localhost:8000
npm test             # all the tests (python3, Node.js 22+ and Chrome/Chromium)
```

Any static file server works; a server is preferred over opening `index.html`
directly so the browser loads the ES modules correctly. Nothing needs
installing to run the app; the tests need Node.js 22 or later.

## Scripting API, add-ins and macros

The editor exposes `window.Revela` (see `src/api/index.js`): read the deck, add
slides and objects, update them (one undo step each), listen to changes,
export, and add buttons to the ribbon. **View › Add-ins** loads an ES module
by URL that exports `default function (Revela)`; **View › Macros** runs saved
snippets with `Revela` in scope. Both are stored only in your browser.
The full guide, the API reference and three working examples are in
[docs/COMPLEMENTOS.md](docs/COMPLEMENTOS.md) (in Spanish) and
[examples/complementos/](examples/complementos/).

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

Plain ES modules, no framework or bundler. The app runs on its own in the
browser; the official edition adds Revela's server (`server/cloudflare`, a
Cloudflare Worker) for accounts, cloud documents, sharing and co-editing rooms,
checked by the server itself. A central
store holds the document and UI state and notifies the views on every committed
change. The code is organised in layers, each importing only from the ones
below (checked by the tests):

```
src/
  apps/      entry points: editor, phone remote, voting page, viewer
  ui/        shell, canvas, ribbon, dialogs, panels, styles
  api/       window.Revela for plugins and macros
  io/        formats (reveal.js, PowerPoint, OpenDocument, Markdown), exports, cloud
  features/  document operations by domain: document, design, animation, ai, collab, live, content
  render/    drawing to SVG · i18n/  interface languages
  core/      model, store with undo/redo, persistence, CDN libraries
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for details.

## Editions and official site

The same code is published three ways, with no duplicated project
(`tools/build-site.mjs` copies files; nothing is compiled):

- **Open edition** — [fmesasc.github.io/revela](https://fmesasc.github.io/revela/): the app only
  (`npm run build:open`), free, with AI through your own OpenRouter key.
- **Official site** — [revelaslides.com](https://revelaslides.com): its own pages (home, plans, support;
  a private repository, not this one) and the app in `/app/`, built by `node tools/build-site.mjs` (Cloudflare Pages). The app there
  is marked as the official edition; paid features depend on its server, which checks accounts, plans and
  credits itself (secrets never go in this repository).
- **Desktop app** — the same app in Tauri (`npm run build:desktop`), which uses the official server for accounts.

Nothing is published unless the whole test suite passes (GitHub Actions).

## Trademark

The code is MIT-licensed, but the name **Revela**, its logo and the domain **revelaslides.com** identify
the official project. Copies and forks are welcome under another name; please don't present them as the
official Revela.

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md).

## Support

If this project is useful to you and you'd like to see more like it, consider buying me a coffee :) — it helps me keep developing and improving Revela. Thank you!

[![PayPal](https://www.paypalobjects.com/webstatic/mktg/logo/AM_SbyPP_mc_vs_dc_ae.jpg)](https://paypal.me/fmesasc)

## License

[MIT](LICENSE) © Francisco Mesas Cervilla.

The built-in icons in `src/render/icons.js` come from [Lucide](https://lucide.dev) (ISC licence; some derived from Feather, MIT); their notices are in that file.
