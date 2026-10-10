# tools/

Scripts for working on Revela. None of them runs in the app; each one explains
itself in its first lines.

## Building and publishing

| Script | What it does |
|---|---|
| `build-site.mjs` | Builds what gets published: the official site with the app in `/app/` (Cloudflare Pages, needs the private `site/`), `--open` the app alone (GitHub Pages), `--app-only` the desktop app's bundle. `--missing` lists the website's untranslated texts. |
| `site-i18n.mjs` | The website in several languages (used by `build-site.mjs`): pages per language, hreflang links and the sitemap. |
| `lti-key.mjs` | Makes the key Revela signs its LTI messages with: `node tools/lti-key.mjs \| npx wrangler secret put LTI_PRIVATE_JWK` (run once, from `server/cloudflare`). |

## Example presentations (the template gallery)

| Script | What it does |
|---|---|
| `build-catalog.mjs` | Writes `templates/catalog.js`: names, summaries and groups, so the gallery lists a thousand presentations without loading them. |
| `check-templates.mjs` | Checks every example builds and uses only things that exist (layouts, models, effects, charts…). |
| `template-names.mjs` | Adds translations of the examples' names and summaries. |
| `template-texts.mjs` | The examples' texts for translating them; `--check` (run by the tests) fails if a language lacks any. |
| `audit-templates.py` | How the examples look in the editor, slide by slide: text that doesn’t fit, objects off the slide, overlaps, low contrast; exits with 1 if there are any. |
| `shot-template.py` | Pictures of an example's slides in one sheet, to look at them. |

## App data

| Script | What it does |
|---|---|
| `build-symbols.mjs` | Writes `assets/symbols/`: Insert ▸ Symbols' categories and every emoji, their names in the 11 languages (CLDR) and the official names of every Unicode block, from fixed versions on jsDelivr. |

## Checking by hand

| Script | What it does |
|---|---|
| `perf.mjs` | Revela on a slow computer (CPU throttled, slow network): what a teacher waits for. Heavy: run it alone. |
| `pptx-compare.py` | PowerPoint import fidelity: each slide as LibreOffice draws it beside Revela's. |
| `shot.py` | A screenshot of the editor after running some JavaScript. |
| `embeddable.py` | Which web pages can be shown inside a presentation (an iframe), and why not. |
| `blender-try.py` | Tries «Crear modelo 3D con IA»'s Blender script with this computer's Blender. |
| `nasa3d.py` | Rebuilds the index of NASA's free 3D models. |

## Refactoring

| Script | What it does |
|---|---|
| `move.py` | Moves source files and rewrites every import that points at them (`git mv`, so history follows). |
| `extract.py` | Moves top-level declarations from one module to another, fixing imports. |
