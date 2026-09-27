# Contributing to Revela

Thanks for your interest in improving Revela.

## Development setup

No build step or dependencies are required.

```bash
git clone https://github.com/fmesasc/revela.git
cd revela
python3 -m http.server 8000   # or any static server
```

Open `http://localhost:8000` and edit the files under `src/`; refresh to see
changes.

## Project layout

- `src/core/` — data model, persistence and the central store (with undo/redo).
- `src/features/` — document operations (slides, blocks, formatting,
  transitions, templates). These mutate the store through `commit`.
- `src/io/` — reveal.js output and PowerPoint import.
- `src/ui/` — presentation layer (ribbon, canvas, navigator, context menu).
  UI modules read the store and render; they never persist state directly.
- `src/main.js` — wires everything and subscribes the render.

The golden rule: **all document changes go through `commit`/`mutate` in the
store**, so undo/redo, autosave and re-render stay consistent.

## Coding style

- Modern JavaScript (ES modules), no framework.
- Small, focused modules with clear responsibilities.
- Comments explain *why*, not *what*.
- User-facing strings are in Spanish; code identifiers and comments in English.

## Pull requests

1. Open an issue first for anything non-trivial, so we can agree on the approach.
2. Keep pull requests focused on a single change.
3. Describe what changed and how to test it.
4. Update `ROADMAP.md` if your change completes or adds a roadmap item.

## Reporting bugs and ideas

Use GitHub issues. For bugs, include steps to reproduce and your browser.
Feature ideas and design feedback are equally welcome.
