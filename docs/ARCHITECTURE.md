# Architecture

Revela is a client-side application written as plain ES modules. There is no
build step, no framework and no runtime dependencies beyond two libraries loaded
from a CDN at presentation/export time: reveal.js and `<model-viewer>`.

## Data model

A presentation is a single serialisable object (`deck`):

```
deck = {
  version, size:{w,h}, theme, defaultTransition, transitionSpeed,
  sections: [ { id, name } ],
  slides:   [ slide ]
}

slide = { id, sectionId|null, background, transition|null, blocks:[ block ] }

block = { id, type, x, y, w, h, rotation, animation|null, ...payload }
  text  -> { html, fontSize }
  model -> { src, autoRotate }
  image -> { src, fit }
  video -> { src }
```

Coordinates are expressed in the deck's own pixel space (`size`), which maps
1∶1 to the reveal.js output, so no scaling maths is needed when exporting.

A slide's `transition` overrides `deck.defaultTransition`; an object's
`animation` (`{ effect, order }`) becomes a reveal.js *fragment*.

## Store and rendering

`src/core/store.js` holds:

- `state.deck` — the document.
- `state.ui` — transient state (current slide, selection, active tab, guides).
- an undo/redo history of document snapshots.
- a set of subscribers.

All changes go through:

- `commit(fn)` — records history, runs `fn`, persists to `localStorage`, and
  notifies subscribers (which triggers a re-render).
- `mutate(fn)` — same, but without pushing to the undo stack (used for
  high-frequency changes such as dragging).

`src/apps/editor/main.js` subscribes a single `render()` that repaints the ribbon, canvas
and navigator. Because rendering is a pure function of the store, the UI never
holds its own copy of the document.

## Layers

- **core** — model, persistence, store. Knows nothing about the DOM.
- **features** — document operations, expressed as store mutations. Pure logic.
- **io** — serialisation to reveal.js and import from `.pptx`.
- **ui** — the only layer that touches the DOM. It renders from the store and
  translates user input into feature calls.

## Direct manipulation

`src/ui/canvas/canvas.js` implements dragging, resizing and text editing with pointer
events. During a drag it updates element styles directly and only commits on
release, to avoid re-rendering mid-interaction (which would reset the caret or
the drag). Alignment guides are computed against the slide centre, the slide
edges and every other block's edges and centres, with a small snapping
threshold.

## Output

`src/io/formats/html.js` serialises the deck into a single self-contained HTML file:
each slide becomes a `<section>` containing an absolutely-positioned stage, and
each block becomes the corresponding element. The same function powers both the
in-app *Present* action and *Export*.
