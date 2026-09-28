# Architecture

Revela is a client-side application written as plain ES modules: no build step,
no framework, no server of its own. The repository root is the website
(GitHub Pages). Third-party libraries (reveal.js, KaTeX, PeerJS, html2canvas…)
are loaded from a CDN only when a feature needs them, at versions pinned in
`src/core/vendor.js`.

## Applications

Three pages, three entry points. The page URLs stay at the root because QR codes
and links already printed point to them.

| Page          | Entry point                 | What it is                                   |
|---------------|-----------------------------|----------------------------------------------|
| `index.html`  | `src/apps/editor/main.js`   | The editor (installable PWA, works offline)  |
| `remote.html` | `src/apps/remote/main.js`   | Phone remote: notes, next/previous, pointer  |
| `vote.html`   | `src/apps/vote/main.js`     | Audience page for live polls and Q&A         |
| `view.html`   | `src/apps/view/main.js`     | Viewer of shared (sealed) presentations      |

The exported presentation is a fourth, standalone "application": a single HTML
file with reveal.js plus the scripts in `src/io/runtime/`.

## Layers

```
apps      entry points: wire everything together, register the UI's services
  ↓
ui        the only layer that builds interface: shell, canvas, ribbon, dialogs, panels
  ↓
api       window.Revela: the public API for plugins and macros (no interface)
  ↓
io        formats (HTML/reveal.js, PowerPoint, OpenDocument, Markdown, project),
          exports (print, images, video), cloud (Drive), runtime (code that runs
          inside the exported presentation)
  ↓
features  what can be done to a document, by domain: document, design,
          animation, ai, collab, live, content
  ↓
render · i18n   pure drawing to SVG/HTML strings · interface languages
  ↓
core      data model, store (undo/redo), persistence, and the ports below
```

**Rule: a module imports only from its own layer or the layers below.**
`tests/layers.py` enforces it (and that every imported name exists, and that
every file the pages link to exists); `tests/run.sh` runs it first and fails on
any violation. `render` and `i18n` share a rank but do not know each other.

When a lower layer needs something only a higher one can provide, it goes
through a small **port** in `core`, which the editor fills in at start-up:

- `core/notify.js` — `alertUser`, `confirmUser`, `promptUser`. io and features
  ask the user through these; the editor registers its own styled dialogs
  (`ui/dialogs/dialog.js`); other apps get the browser's.
- `core/session.js` — what is live in this tab besides the document: the
  presentation on screen, set by `ui/shell/present.js` and read by the phone
  remote (`features/live/remote.js`).
- `core/vendor.js` — every CDN library with its version, and one `loadScript`
  that loads each once (concurrent calls share the request).

## Source map

```
src/
  apps/{editor,remote,vote}/main.js
  api/index.js                 window.Revela, plugins and macros
  core/
    model.js                   deck/slide/block factories, load/save, IndexedDB for big decks
    store.js                   state, commit/mutate, undo/redo, subscribers, autosave
    idb.js  config.js  notify.js  session.js  vendor.js
  i18n/index.js  strings.js    t(), languages; the string tables
  render/svg.js                shapes, charts, icons, ink, tables → SVG/HTML strings
  features/
    document/                  slides, blocks, format, master, templates, captions,
                               clipboard, shape operations, search, autocorrect, a11y
    design/                    palettes, fonts, designer (design ideas), gallery
    animation/transitions.js   effects, timeline, transitions, motion paths
    ai/                        openrouter.js (sign-in, calls), authoring.js (decks, rewriting)
    collab/                    comments, versions, protect (password, mark as final)
    live/                      remote (phone), poll, dashboards (live data), media (camera)
    content/stock.js           Openverse images, Iconify icons
  io/
    formats/                   html (reveal.js), project (.revela.json), pptx-import,
                               pptx-export, odp, markdown
    export/                    print (PDF, handouts), images (PNG/JPG/zip), video (MP4/GIF)
    runtime/                   scripts and ink: code embedded in the exported presentation
    share/                     seal (encrypt), publish (file, Drive, server), shares list
    cloud/                     gdrive.js (Google Drive), shareserver.js (own share server)
    files.js                   download(), file names
  ui/
    shell/                     navigator, context menu, present, draw, preview,
                               recorder, appearance
    canvas/                    canvas (render/reconcile), content (per object type),
                               interact (drag/resize/guides/snap), preview (animations)
    ribbon/                    ribbon (build/sync), actions (what each button does),
                               popovers (group galleries), zoom
    dialogs/                   one module per dialog
    panels/                    side panels: accessibility, comments, animation pane
    styles/                    CSS in cascade order: tokens, ribbon, layout, canvas,
                               chrome, responsive, features
tests/
  run.sh  run.py               headless Chrome runner (+ touch and two-device checks)
  layers.py                    architecture check
  suite.js  suites/*.js        the browser test suite, one file per area
server/
  cloudflare/                  optional share server (Worker + R2), tested by tests/server.mjs
tools/
  move.py  extract.py          move files / declarations and rewrite imports
```

## Data model

A presentation is one serialisable object:

```
deck  = { version, name, size:{w,h}, theme, defaultTransition, transitionSpeed,
          slideNumber, footer, logo, loop, guides, palette, reveal:{…options},
          sections:[{id,name}], master:{blocks,background,styles}, layouts:[layout], slides:[slide] }

layout = { id, name, background, hideMaster, blocks:[placeholders (ph) and objects] }

slide = { id, layoutId, sectionId, background, transition, transitionOut, hidden,
          vertical, autoSlide, notes, bgVideo, bgIframe, … , blocks:[block] }

block = { id, type, x, y, w, h, rotation, opacity, animation, alt, … }
        type: text, shape, image, video, audio, model, embed, chart, table,
              icon, math, code, poll, camera, ink, slideref, connector, …
```

Coordinates are in the deck's own pixel space (`size`), which maps 1∶1 to the
reveal.js output. Master objects appear on every slide unless it hides them;
a layout's objects appear on the slides that use it.

Text placeholders (`ph`: title, subtitle, body; `lp` = the layout placeholder
they follow) take their formatting from the master's styles, then the layout
placeholder, then their own properties (`features/document/master.js`
`styled()`); body text has five list levels with their own size and bullet.
Every renderer (canvas, thumbnails, reveal.js export, print, images, PPTX,
ODP) draws the `styled()` copy, never the stored block, so a change in the
master reaches every slide that didn't override it.
A vertical slide goes below the previous one (reveal.js stacks).

## Store and rendering

`core/store.js` holds `state.deck` (the document), `state.ui` (current slide,
selection, tab, zoom… — never saved) and the history. Every change goes
through:

- `commit(fn)` — snapshot for undo, run `fn`, autosave, notify subscribers.
- `mutate(fn)` — the same without a history entry (dragging, typing).

Snapshots share unchanged strings, so history stays cheap with large images.
A deck marked as final refuses changes. Autosave uses `localStorage`, or
IndexedDB when the deck is too large; versions are kept in IndexedDB.

`apps/editor/main.js` subscribes one `render()` that repaints the ribbon,
canvas and navigator from the store; the UI never keeps its own copy of the
document. The canvas reconciles objects by id and a signature of what they
show, so unchanged objects are not rebuilt (and text being edited keeps its
caret). During a drag it moves elements directly and commits on release.

## Presenting and exporting

`io/formats/html.js` turns the deck into one self-contained reveal.js page:
each slide is a `<section>` with an absolutely positioned stage, each object an
element with inline styles; animations become fragments, and only the runtime
scripts the deck needs are embedded (polls, live data, camera, triggers,
lightbox, ink and live captions). The same page is what *Present* shows
(`ui/shell/present.js`, in a full-screen overlay from a blob URL) and what
*Export* downloads. Print, handouts and images reuse each object's inline HTML.

## Live features without a backend

The phone remote and live polls connect the presenter and the phones directly
over WebRTC (PeerJS; its public broker only introduces the peers). The
presenter hosts a peer `revela-CODE` (remote) or `revela-vote-CODE` (polls);
the phone pages connect to it. Nothing is stored on a server: votes are kept in
the presenter's browser.

## Sharing privately

A shared presentation is **sealed** in the browser before it leaves it
(`io/share/seal.js`): gzip, then AES-GCM-256 with either a random key that
travels in the link after `#` (never sent to any server) or a key derived from
a password (PBKDF2-SHA-256, 600 000 rounds). The sealed copy can then be a
single self-opening HTML file, a file in the user's Google Drive readable by
link, or an object on the optional share server; none of them can read it.
`view.html` fetches a sealed copy and opens it; `io/runtime/unseal.js` is the
only decryption code, embedded as source in the self-opening file. Pages and
the server say `noindex`, identifiers are 128-bit random values.

## Adding a feature

1. The operation on the document goes in `features/<domain>/`, as functions
   that change the deck inside `commit`. No DOM, no dialogs (use `core/notify`).
2. If it has to appear in the exported presentation, extend
   `io/formats/html.js` (and `io/runtime/` if it needs code while presenting).
3. Its interface goes in `ui/`: a button in `index.html` with a `data-action`
   handled in `ui/ribbon/actions.js`, a dialog in `ui/dialogs/`, styles in the
   matching `ui/styles/` file, strings through `t()` with translations in
   `i18n/strings.js`.
4. A library from a CDN: add its pinned URL to `core/vendor.js`.
5. Tests in the matching `tests/suites/<area>.js`; run `./tests/run.sh`.
