# Architecture

Revela is a client-side application written as plain ES modules: no build step,
no framework, no server of its own. The repository root is the website
(GitHub Pages). Third-party libraries (reveal.js, KaTeX, PeerJS, html2canvas…)
are loaded from a CDN only when a feature needs them, at versions pinned in
`src/core/vendor.js`.

## Applications

Four pages, four entry points. The page URLs stay at the root because QR codes
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
  apps/{editor,remote,vote,view}/main.js
  api/index.js                 window.Revela, plugins and macros
  core/
    model.js                   deck/slide/block factories, load/save, IndexedDB for big decks
    store.js                   state, commit/mutate, undo/redo, subscribers, document version,
                               the filter every outside deck goes through (sanitizer)
    text.js                    esc, plainText, jsData (data inside <script>), shortSig
    idb.js  config.js  notify.js  session.js  vendor.js
  i18n/index.js  strings.js    t(), languages; the string tables (+ langs/ loaded on demand)
  render/svg.js                shapes, charts, icons, ink, tables → SVG/HTML strings
  features/
    document/                  slides, blocks, format, master, templates, captions,
                               clipboard, shape operations, search, autocorrect, a11y,
                               magnify (the magnifier: lines, placement, picture crop),
                               sanitize (what comes from outside can't run code)
    design/                    palettes, fonts, designer (design ideas), gallery,
                               canvasmode + canvasdesigns (Prezi-like canvas and its pictures)
    animation/                 transitions.js (effects, several per object, timeline,
                               transitions, motion paths), morph.js (Morph pairing)
    ai/                        openrouter.js (sign-in, calls), authoring.js (decks, rewriting), agent.js (the assistant: proposals, scope, permissions, checks), rigkind.js (what a 3D model is, seen by a vision model)
    collab/                    comments, versions, protect (password, mark as final), signature
    live/                      remote (phone), poll, dashboards (live data), media (camera,
                               video/GIF playback), gifbg (GIF background removal), coach,
                               collab + collabsync (co-editing: ops, roles, messages)
    content/                   stock (Openverse, Iconify), resources (GIFs, stickers, 3D search:
                               library3d, nasa3d, Poly Haven, Wikimedia STL, Sketchfab),
                               model3d (3D attributes, views, walking), gltf (read/write GLB),
                               gltfunpack (Draco/meshopt/quantized models and .gltf with separate files → plain GLB),
                               stl (STL → glTF), autorig (automatic skeleton and animations: people, animals, birds, dragons, fish, snakes, spiders, octopuses, objects; guesses the kind from the shape),
                               examples (templates)
  io/
    formats/                   html (reveal.js), project (.revela.json), pptx-import,
                               pptx-export, odp + odp-anim, markdown
    export/                    print (PDF, handouts), images (PNG/JPG/zip), video (MP4/GIF), objects
    runtime/                   code that runs inside the exported presentation, embedded
                               as source: scripts (polls, live data, triggers, overview),
                               ink, media (video/GIF player), model3d (3D motion and
                               walking), camera (Cameo), puppet (a 3D model following
                               the presenter's camera), canvas (canvas mode camera), unseal
    share/                     seal (encrypt), publish (file, Drive, server), shares list
    cloud/                     gdrive.js (Google Drive), shareserver.js, collabserver.js
    files.js                   download(), file names, an object's own file (blockFile)
  ui/
    shell/                     navigator, context menu, present, draw, preview (thumbnails),
                               recorder, appearance, elements (resources side panel), home,
                               canvasview (canvas mode), coach, collab, morphhint,
                               menu (popup menus), files (saving an object's file),
                               sorter (slide sorter: the navigator as a grid), openfile
    canvas/                    canvas (render/reconcile), content (per object type),
                               interact (drag/resize/guides/snap), preview (animations),
                               pathdraw (drawn motion paths), mediaview (video/GIF/3D),
                               magnifyview (the magnifier: drawing it, its area's handles)
    ribbon/                    ribbon (build/sync), actions (what each button does),
                               popovers (group galleries), zoom, contextual (the selected
                               object's tab), animadd (Add animation palette)
    dialogs/                   one module per dialog (find, gdrive, autorig, model3d…)
    panels/                    accessibility, comments, animation pane
    styles/                    CSS in cascade order: tokens, ribbon, layout, canvas,
                               chrome, responsive, features
assets/                        small files served with the app: 3D thumbnails (library3d/, nasa3d/)
tests/
  run.sh  run.py               headless Chrome runner (+ touch and two-device checks)
  layers.py                    architecture check
  suite.js  suites/*.js        the browser test suite, one file per area
  server.mjs                   the collaboration/share server, with fake Durable Objects
server/
  cloudflare/                  optional server (Worker + Durable Objects with SQLite storage):
                               sealed shares and co-editing rooms, daily quotas
  blender/                     revela-blender: Blender in Cloudflare Containers for
                               «Crear modelo 3D con IA» (signed requests only; docs/NUBE.md)
desktop/                       Tauri app (Windows, macOS, Linux) with self-update
tools/
  move.py  extract.py          move files / declarations and rewrite imports
  shot.py  embeddable.py       screenshots; which web pages can be embedded
  pptx-compare.py              compare a PowerPoint file with Revela's rendering
  nasa3d.py                    NASA's 3D model index and thumbnails
  blender-try.py               run the Blender wrapper of the AI 3D models with this computer's Blender
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

block = { id, type, x, y, w, h, rotation, opacity, animation, anims, alt, … }
        type: text, shape, image, video, audio, model, embed, chart, table,
              icon, math, code, poll, camera, ink, slideref, connector, magnify, …

animation = { effect, order (click), seq (play order), start, duration, delay,
              dx, dy, pathShape, points, turn, spin, clip, once, trigger }
        The first one is `animation`; the ones after it, `anims` (use
        `animsOf(b)`/`animEntries(slide)` from features/animation).

model (3D) block: src (GLB data URL), clip (rest animation), walk:{clip, end,
        endOnce, face, look} (what it does while moving), view, motion, autoRotate

magnify block: source:{x,y,w,h} (the area, in slide coordinates; the block's own
        box shows it enlarged, same proportion), target (the picture under it),
        border:{color,width,style,radius}, sourceFrame, lines (corners|center|none),
        lineColor, lineWidth, lineDash, insetShadow

deck.canvas = { on, bg, image:{src,x,y,w,h} }   slide.frame = { x, y, s, r }   (canvas mode)
slide.autoAnimate, morphBy, morphHint (Morph and its suggestion)
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

- `commit(fn)` — snapshot for undo, run `fn`, save if the content changed, notify subscribers.
- `mutate(fn)` — the same without a history entry (dragging, typing).

Saving happens only when the document's content changed (selection, tabs and
zoom don't count): `docVersion()` goes up then, and Drive autosave and the
automatic versions compare that number instead of serialising the deck.

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

## Security

Anything that comes from outside — a file, Drive, an import, a paste from
another site, a co-editor's changes — goes through `features/document/
sanitize.js` before it is used (the store's deck filter, the clipboard and
co-editing apply it): HTML without scripts, frames or event handlers; links
and sources only to safe addresses; style and script-bound values that can't
break out. Data written inside the exported page's scripts uses `jsData`.
Shared presentations open in a sandboxed frame without Revela's origin
(`view.html`); embedded web pages only keep their own origin when they are
from another site. Co-editing operations never walk `__proto__`-like paths, a
commenter can only touch comments, and long messages have limits (also on
the server).

## Adding a feature

1. The operation on the document goes in `features/<domain>/`, as functions
   that change the deck inside `commit`. No DOM, no dialogs (use `core/notify`).
2. If it has to appear in the exported presentation, extend
   `io/formats/html.js` (and `io/runtime/` if it needs code while presenting).
3. Its interface goes in `ui/`: a button in `index.html` with a `data-action`
   handled in `ui/ribbon/actions.js`, and — if it acts on the selected object —
   an entry in that object's contextual tab (`ui/ribbon/contextual.js`) and
   context menu; a dialog in `ui/dialogs/` (any `.modal-backdrop` with a
   `.modal-close` or `.dlg-cancel` gets Esc, focus in and back, and Tab kept
   inside from `ui/dialogs/modalkeys.js`), a small menu with
   `ui/shell/menu.js`, a note when something slow ends or a file is downloaded
   with `ui/shell/toast.js`, styles in the matching `ui/styles/` file, strings
   through `t()` with translations in `i18n/strings.js` (and `i18n/langs/`).
   Text into HTML goes through `esc` (`core/text.js`).
4. A library from a CDN: add its pinned URL to `core/vendor.js`.
5. Tests in the matching `tests/suites/<area>.js`; run `./tests/run.sh`.
