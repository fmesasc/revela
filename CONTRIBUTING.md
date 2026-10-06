# Contributing to Revela

Thanks for your interest in improving Revela.

## Development setup

No build step and no packages to install. You need `python3`, **Node.js 22 or
later** and Chrome or Chromium (the last two for the tests).

```bash
git clone https://github.com/fmesasc/revela.git
cd revela
npm start                     # = python3 -m http.server 8000 (or any static server)
```

Open `http://localhost:8000` and edit the files under `src/`; refresh to see
changes. The server (`server/cloudflare`) is optional for working on the app;
see its [README](server/cloudflare/README.md).

## Project layout

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full map. In short:

- `src/apps/` — the entry points of the four pages: editor, phone remote, voting, viewer.
- `src/core/` — data model, store (undo/redo), persistence and the ports
  (`notify`, `session`, `vendor`) that let lower layers reach the interface.
- `src/features/<domain>/` — what can be done to a document, as store changes.
- `src/io/` — formats, exports, sharing, cloud services and the code embedded in presentations.
- `src/ui/` — everything on screen: shell, canvas, ribbon, dialogs, panels, styles.
- `src/api/` — the public `window.Revela` API for add-ins and macros.
- `server/cloudflare/` — Revela's server (Cloudflare Worker); `tests/` and `tools/`.

Each layer imports only from itself or the layers below
(apps → ui → api → io → features → render · i18n → core); the tests fail
otherwise. The golden rule: **all document changes go through
`commit`/`mutate` in the store**, so undo/redo, autosave and re-render stay
consistent.

## Tests

The tests need `python3`, Node.js 22+ and Chrome/Chromium:

```bash
npm test                    # = ./tests/run.sh: everything (below)
npm run test:server         # only the server's tests (Node.js, no browser)
./tests/run.sh --only=io    # the browser suite for some areas (text, objects, slides, animation, present, io, editor, services)
./tests/run.sh --e2e        # also two real pages over WebRTC: phone remote, live poll, audience Q&A (needs network)
```

`tests/run.sh` runs, in order: the architecture check (`tests/layers.py`); the
Node.js tests — the server (`server.mjs`, `server-api.mjs`, `server-lti.mjs`,
`server-blender.mjs`), the account client, the example presentations'
translations and `tools/template-texts.mjs --check`; then `tests/run.py`, which
drives the real app in headless Chrome: the suite in `tests/suites/*.js`, real
touch checks on a phone-sized page, the equation keyboard and mouse checks (and
the website's checks when the private `site/` is cloned).

On GitHub, `.github/workflows/tests.yml` runs the whole suite for every pull
request and branch, and the publishing workflows (GitHub Pages, the server, the
desktop app) call it first: nothing is published unless it passes.

Add a test to the matching `tests/suites/<area>.js` for every feature and every
bug fixed; the suite drives the real app through `window.__revela` (loaded with
`?test`). Each test starts from `reset()` and must not depend on the others.
Services that need an account (OpenRouter, Google Drive, Revela's cloud) are
tested with simulated responses; the server's tests use in-memory Durable
Objects. `tests/index.html` also runs in a normal browser
(`?only=io` works there too).

To move a file or split a module without breaking imports, use
`tools/move.py old=new` and `tools/extract.py SRC DEST "comment" names…`.

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

Use GitHub issues. Security problems: please don't open a public issue; see
[SECURITY.md](SECURITY.md). For bugs, include steps to reproduce and your browser.
Feature ideas and design feedback are equally welcome.
