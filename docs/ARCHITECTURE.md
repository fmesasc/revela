# Architecture

Revela is a client-side application written as plain ES modules: no build step,
no bundler, no framework. The app works on its own in the browser (documents in
the browser, Google Drive, OneDrive or Dropbox; the phone remote and live polls
peer to peer). The official edition adds **Revela's server** (`server/cloudflare`:
a Cloudflare Worker with Durable Objects) for accounts, cloud documents, sharing,
co-editing rooms and the paid features; it is optional for anyone running their
own copy. Third-party libraries (reveal.js, KaTeX, PeerJS, html2canvas…) are
loaded from a CDN only when a feature needs them, at versions pinned in
`src/core/vendor.js`.

## Editions

The same code is published three ways; `tools/build-site.mjs` copies files and
compiles nothing, and `src/core/config.js` (`EDITION`) reads which one it is
from `<meta name="revela-edition">`:

| Edition   | Where                                   | Built with                                        |
|-----------|-----------------------------------------|---------------------------------------------------|
| `open`    | GitHub Pages (fmesasc.github.io/revela) | `node tools/build-site.mjs _site --open`: only the app, unmarked |
| `cloud`   | revelaslides.com (the app in `/app/`)   | `node tools/build-site.mjs` on Cloudflare Pages: the website (the private `fmesasc/revela-site`, cloned in `site/`) plus the app marked `cloud` |
| `desktop` | the Tauri app (`desktop/`)              | `node tools/build-site.mjs desktop/dist --app-only`: the app marked `desktop`, using the official server |

### The website and its covers: two Cloudflare Pages deployments

Cloudflare Pages takes **20,000 files at most** in a deployment and refuses the rest only when it is already building. The
website outgrew it on 2026-10-31 (23,800 files, almost all of them the templates' covers: two pictures in each of 11
languages for every template), and for a day neither test nor production got a new app. So there are two deployments:

| Project        | Address                      | What it holds                                   | How it is published |
|----------------|------------------------------|-------------------------------------------------|---------------------|
| `revelaslides` | revelaslides.com, test.…     | the website and the app (`/app/`), ~9,500 files | git: Cloudflare builds `node tools/build-site.mjs` on every push (`main` → test, `production` → revelaslides.com) |
| `revela-img`   | img.revelaslides.com         | the covers, `templates/*.webp`, ~14,300 files   | by hand: `node tools/build-site.mjs <dir> --images`, then `npx wrangler pages deploy <dir> --project-name revela-img --branch main` |

`site/tools/pages.mjs` (`IMG_HOST`) points every page, structured-data entry and sitemap image at the second. After adding
templates (`site/tools/export-templates.py`) the covers have to be deployed again, or their pages show missing pictures.
`tests/build-limits.mjs` fails when either deployment passes 18,500 files; from there on, split the covers over a second
project (say `img2`, by language) or move them to R2. (`revela-admin` is a third, separate project: the administration.)

The app is exactly the files listed in `APP_FILES` (`tools/build-site.mjs`):
the root pages below, `icons/`, `assets/` and `src/` — no tests, tools or server
code. Every publishing workflow (`pages.yml`, `server.yml`, `desktop.yml`) first
calls `tests.yml`, which runs the whole suite, so nothing is published without
passing.

## Applications

Four pages have their own entry point in `src/apps/`; a few more small pages
complete the app. They all stay at the root of the app, because each address
is fixed somewhere outside this repository:

| Page          | Entry point                 | What it is                                   | Why it stays at the root |
|---------------|-----------------------------|----------------------------------------------|--------------------------|
| `index.html`  | `src/apps/editor/main.js`   | The editor (installable PWA, works offline)  | The PWA's start URL and scope (`manifest.webmanifest`: `./`) |
| `remote.html` | `src/apps/remote/main.js`   | Phone remote: notes, next/previous, touchpad (pointer, spotlight, taps) | Installed on phones with its own `remote.webmanifest` (start URL and scope `./remote.html`), and in QR codes |
| `vote.html`   | `src/apps/vote/main.js`     | Audience page for live polls and Q&A         | `VOTE_URL` (`features/live/poll.js`) is hard-coded in exported presentations and their QR codes |
| `view.html`   | `src/apps/view/main.js`     | Viewer: sealed shares (`?d=` Drive, `?u=` address), a cloud document shared by link (`?doc=`), «Solo presentar» and the «Insert in a web page» iframe | Links and embeds already handed out |
| `auth.html`   | inline script               | End of a Dropbox/OneDrive sign-in (`io/cloud/oauth.js`): hands the one-time code back to the window that asked | Registered as the OAuth redirect URI |
| `dropbox.html`| inline script               | Dropbox's «Open with ▸ Revela»: on to the editor with `?dropbox&file_id=…` | Registered as the Dropbox app's Extension URI (`docs/ABRIR-CON.md`) |
| `privacy.html`, `terms.html`, `legal.html`, `dpa.html` | `legal.js`, `legal.css` | Privacy policy, terms, legal notice, data processing agreement | Linked from Google's consent screen, Stripe and the app (`io/cloud/account.js`); the site build copies them to its top too |
| `sw.js`       | —                           | Service worker: offline app; never touches `/api/` | A service worker only controls its own folder and below, so it must sit beside `index.html` |

The exported presentation is one more standalone "application": a single HTML
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
          exports (print, PDF, images, video), share (sealing), cloud (Google
          Drive, OneDrive, Dropbox, the Revela account, cloud documents, calls,
          the share and collaboration servers, community, notices), runtime
          (code that runs inside the exported presentation)
  ↓
features  what can be done to a document, by domain: document, design,
          animation, ai, collab, live, content
  ↓
render · i18n   pure drawing to SVG/HTML strings · interface languages
  ↓
core      data model, store (undo/redo), persistence, and the ports below
```

**Rule: a module imports only from its own layer or the layers below.**
`tests/layers.py` enforces it, and also that every imported name exists, that
every file the pages and `sw.js` link to exists, and that no file in `src/` is
ignored by `.gitignore` (it would be missing once published); that no module joins a cycle of imports beyond the
list grown so far (`CYCLES`: the canvas, the ribbon, some dialogs); that this file names every module; `tests/run.sh`
runs it first and fails on any violation. `render` and `i18n` share a rank but
do not know each other. The runtime scripts that are embedded in the exported
presentation as source (`io/runtime/ink.js`, `camera.js`, `puppet.js`) may not
import at all.

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
- `core/store.js` `setDeckFilter` — what every deck from outside goes through;
  the editor sets the sanitizer (`features/document/sanitize.js`).

## Source map

```
src/
  apps/
    editor/main.js             the editor: wires the modules together, subscribes the render, registers sw.js
    remote/main.js             phone remote (runs in remote.html): pairs with the presenter's peer over WebRTC
    vote/main.js               audience page: answers the poll on the presenter's current slide
    view/main.js               viewer: opens a sealed share, or a cloud document shared by link
  api/index.js                 window.Revela, the public API for plugins and macros
  core/
    model.js                   deck/slide/block factories, defaults, load/save
    store.js                   state, commit/mutate, undo/redo, subscribers, document version,
                               the filter every outside deck goes through (sanitizer)
    text.js                    esc, plainText, jsData (data inside <script>), shortSig
    idb.js                     minimal IndexedDB: the autosaved deck (large decks) and versions
    busy.js                    what someone is waiting for (requests, downloads), counted for «loading»
    config.js                  settings outside any deck: EDITION, the official site, Google's public ids
    formulas.js                formulas in table cells (=SUM(ABOVE), spreadsheet-style)
    ice.js                     STUN, plus TURN relays from Revela's server (/api/ice) when there is one
    notify.js  session.js  vendor.js   the ports (above)
  i18n/
    index.js                   t(), languages, Spanish as the source and fallback
    strings.js                 the string tables: es, en, fr, de, it, pt, ca
    langs/                     gl, nl, eu, ar (loaded only when chosen)
  render/
    svg.js                     shapes, charts, icons, ink, tables, WordArt, connectors, timers, code locks,
                               devices, image filters → SVG/HTML strings
    icons.js                   more built-in icons for the picker (Lucide)
    diagrams.js                SmartArt-style diagrams from an outline, by layout
    codelangs.js               DAX, Power Query M and worksheet formulas for highlight.js
    textfit.js                 Text Art shrunk until it fits its box
  features/
    document/
      blocks.js                inserting and manipulating objects
      slides.js                slide and section operations, slide selection, copying slides
      format.js                text formatting (character and box level)
      master.js                slide master, layouts, styled() (master → layout → own properties)
      templates.js             built-in and user templates (blocks applied to the current slide)
      captions.js              figure/table captions and the list of figures
      clipboard.js             copy / cut / paste objects, across slides and tabs
      shapeops.js              merge shapes (union, combine, intersect, subtract)
      search.js                find and replace across the deck's text
      bulk.js                  «Generar desde una hoja»: a slide's {{placeholders}} filled from each row of a spreadsheet
      autocorrect.js           typographic replacements while typing
      proofing.js              the language a text is written in (the deck's, a box's, detected) and its words
      spelling.js  spellworker.js   spell checking: Hunspell (WebAssembly) in a worker, dictionaries on
                               demand kept in Cache Storage, the personal dictionary
      a11y.js                  accessibility checker (pure analysis)
      magnify.js               the magnifier: lines, placement, picture crop
      imgshrink.js             big pictures made smaller (compress pictures)
      swapimage.js             «Cambiar imagen»: another picture in the same object (place, crop, animations stay)
      sanitize.js              what comes from outside can't run code
    design/
      palettes.js              theme colours and theme fonts
      theme.js                 the theme as one thing to edit (colours, two fonts), one undo step
      fonts.js                 font catalogue; Google fonts loaded on demand
      gallery.js               starter decks from a palette, fonts, masters and layouts
      designer.js              design ideas for the current slide
      brandkit.js              brand kits kept in this browser (colours, fonts, logos)
      officetheme.js           Office themes (.potx/.thmx) detected on import
      colormods.js             DrawingML colour transforms (lumMod, tint, shade…)
      resize.js                resize the presentation with its content rearranged
      screenfit.js             fitting slides to a screen of another proportion
      canvasmode.js            canvas mode (Prezi-like): frames on one canvas
      canvasdesigns.js         ready-made vector pictures for the canvas
    animation/
      transitions.js           transitions and object effects (several per object, timeline,
                               motion paths, custom transitions)
      morph.js                 Morph: which objects are the same as on the slide before
    ai/
      openrouter.js            AI calls through OpenRouter (the user's key) or the Revela account
      authoring.js             whole decks from a brief or a document, rewriting
      specs.js                 slide specs as the model writes them, read loosely
      fromspec.js              slides from a spec that follow the deck's own layouts
      agent.js                 the assistant: proposals, scope, permissions, checks on a copy
      review.js                reviewing a proposal before applying it («Conservar lo que había»)
      complete.js              «Completar la presentación» from its pictures
      richtext.js              AI text made into proper slide text (lists, levels)
      codeobj.js               code blocks and equations instead of code typed into text
      attach.js                files given to the AI with a request (pictures, PDFs, text)
      vision.js                pictures made small and described once by a cheap vision model
      themeai.js               a theme proposed from a description
      voiceover.js             speaker notes read aloud by an AI voice
      lessonplan.js            a lesson plan or a study guide from the deck (HTML, Markdown, notes, slides)
      rigkind.js               what a 3D model is, seen by a vision model
    collab/
      comments.js              comments with replies, resolve, @mentions
      review.js                track changes
      versions.js              version history in IndexedDB
      protect.js               password-encrypted project, mark as final
      signature.js             digital signatures (ECDSA P-256, WebCrypto)
    live/
      remote.js                phone remote, presenter side (pairing, commands)
      remotepad.js             what the phone's touchpad does on screen (laser, spotlight…)
      poll.js                  live polls, quizzes and Q&A objects (VOTE_URL)
      grading.js               marking quizzes and activities (also embedded, and used by the server's LTI)
      quizslides.js            a quiz or activity on a slide of its own (the AI's and the imported question banks')
      collab.js                co-editing, chat and roles, browser to browser (or through a room)
      collabsync.js            co-editing operations: diff, apply, which role may do what
                               (shared with server/cloudflare/collab.js and docs.js)
      dashboards.js            live data: embedded dashboards, charts linked to a CSV
      media.js                 screen/camera recording and live camera, in the browser
      gifbg.js                 background removal for animated GIFs
      coach.js                 speaker coach: pace, filler words, slides read aloud
    content/
      stock.js                 online media libraries (Openverse, Iconify…), opt-in
      resources.js             free GIFs, stickers and 3D models (library, Poly Haven, NASA,
                               Wikimedia STL, Sketchfab)
      stickers.js              Noto animated emoji
      lottie.js                Lottie animations (Revela's own 18, or the user's file): catalogue, cleaning, colour, still frame
      library3d.js             curated 3D models with their licences
      nasa3d.js                NASA's 3D models (made by tools/nasa3d.py)
      maps.js                  map charts (world, Spain's communities and provinces)
      files.js                 attached files and PDFs inside the presentation
      model3d.js               3D attributes, views, walking
      gltf.js                  read/write glTF and GLB without a library
      gltfunpack.js            Draco/meshopt/quantized models and .gltf with separate files → plain GLB
      stl.js                   STL → glTF
      autorig.js               automatic skeleton and animations, guessing the kind from the shape
      examples.js              example presentations (File ▸ Examples)
      tplang.js                the example presentations in the interface's language (and the words inside their equations)
      templates/               the example presentations: kit.js (the builders), one file per group
                               (biz*, creative*, data*, edu*, life*, prod*/product, sci*, showcase),
                               catalog.js (made by tools/build-catalog.mjs), names/<lang>.js (names
                               and summaries), i18n/<lang>/ (their texts per language)
  io/
    files.js                   download(), file names, an object's own file (blockFile)
    gradebook.js               the class gradebook, kept in this browser
    formats/
      html.js                  the deck as a self-contained reveal.js page (export and Present)
      project.js               Revela's own format (.revela.json)
      pptx-import.js           PowerPoint import
      pptx-export.js           PowerPoint export (PptxGenJS)
      ooxml-theme.js           the deck's theme as an Office theme part
      odp.js  odp-anim.js      OpenDocument export and import, and its animations
      markdown.js              Markdown → slides (reveal.js conventions)
      questions.js             question banks in and out: Moodle XML, GIFT, Kahoot's spreadsheet, CSV
    export/
      print.js                 print, handouts and notes pages
      pdf.js                   «Exportar PDF» made here, one page per slide
      images.js                slides and objects as PNG/JPG, a zip of all slides
      objects.js               selected objects as image files (PNG, WebP, JPG, SVG, original)
      video.js                 the slideshow as MP4 (WebCodecs) or animated GIF
      study.js                 flashcards and practice from the quizzes: one offline page (grading.js embedded)
    runtime/                   code that runs inside the exported presentation, embedded as source:
      scripts.js               polls, live data, lightbox, triggers
      ink.js                   pen, highlighter, laser, eraser while presenting
      media.js                 video/GIF player (segments, chroma key)
      model3d.js               3D objects: motion and walking
      lottie.js                Lottie animations: lottie-web loaded on demand, start / loop / click, «reduce motion»
      camera.js                live camera (Cameo)
      puppet.js                a 3D model following the presenter's camera
      canvas.js                canvas mode camera
      screenfit.js             slides on a screen of another proportion
      pdf.js                   PDFs to leaf through (pdf.js)
      selfpaced.js             quizzes and activities answered inside the presentation (also LTI)
      games.js                 crossword, word search, memory and letter wheel, played on the phones and inside the slides
      reading.js               reading mode
      tabs.js                  tab stops
      timer.js                 countdown timers
      lock.js                  code locks (escape rooms): wheels or a text field, salted SHA-256, «can't go past it»
      sounds.js                animation sounds (Web Audio)
      unseal.js                opens a sealed presentation (the only decryption code)
    share/
      seal.js                  sealing (gzip + AES-GCM-256) and the page that opens a sealed copy
      publish.js               share: seal and put it where the user chose; link and embed code
      shares.js                the presentations shared from this browser
    cloud/
      gdrive.js                Google Drive and «Sign in with Google», client-side
      oauth.js                 OAuth 2.0 with PKCE for Dropbox and Microsoft (back through auth.html)
      othercloud.js            Dropbox and OneDrive: save and open
      onedrive.js              OneDrive as Drive is: linked file, autosave, copies as PDF/PowerPoint
      account.js               the Revela account (official and desktop editions): sign-in, plan,
                               credits, AI through the account, payments
      clouddocs.js             presentations in Revela's cloud: list, open, sync, share, statistics
      call.js                  video calls through Cloudflare Realtime's SFU
      shareserver.js           client of the share server (/s)
      collabserver.js          client of the co-editing rooms (/c)
      community.js             the community gallery
      notices.js               Revela's own notices for this account's plan and language
  ui/
    shell/                     busy (the «loading» bar and the pressed button's spinner on slow connections), stage (the
                               «Pruebas» badge on test.revelaslides.com),
                               navigator, contextmenu, present, preview (thumbnails), draw,
                               recorder, appearance, elements (resources side panel), home
                               (Google account, «My presentations»), canvasview (canvas mode),
                               masterview (slide master view), backstage (the File page), coach,
                               collab (co-editing in the interface), morphhint, menu (popup menus),
                               files (saving an object's file), sorter (slide sorter), openfile
                               (opening and dropping files), openwith (Drive/Dropbox «Open with»),
                               palette (command search, Ctrl+K), dictate, attachments (files for
                               the AI), notices, toast (short notes), where (where the presentation
                               is kept), changeimage («Cambiar imagen»: a file or Recursos), editaids
                               (starts the next ones), textaids («/» menu in text, automatic lists' undo,
                               «Reducir si no cabe» hint), savestate (saved and when; the empty slide's hint),
                               spellcheck (misspelt words marked on the slide, the status bar's language)
    canvas/                    canvas (render/reconcile), content (per object type),
                               interact (drag/resize/guides/snap), preview (animations),
                               pathdraw (drawn motion paths), mediaview (video/GIF), cameraview
                               (Cameo), puppetview (3D following the camera), magnifyview,
                               freeform (freeform shapes), textruler (ruler and tab stops),
                               fittext (translated examples measured until they fit), painter
                               (the format painter as a mode)
    ribbon/                    ribbon (build/sync), actions (what each button does),
                               popovers (group galleries), zoom, contextual (the selected
                               object's tab), animadd (Add animation palette), animribbon
                               (the Animations tab mirrors the selection), reflect (the ribbon
                               shows the selection's formatting), compact (two-row groups),
                               transpreview (transition preview on hover), livepreview (animations,
                               colours and fonts previewed on hover)
    dialogs/                   one module per dialog: dialog (styled alert/confirm/prompt),
                               modalkeys (Esc, focus, Tab for every dialog), account, team,
                               cloud (sharing a cloud document), cloudlibrary («Mi nube»),
                               community, ambassador, report (support), share, gdrive, onedrive,
                               othercloud, ai, assistant, theme, model3dai, autorig, model3d, …
    panels/                    a11y, comments, review (track changes), selection pane,
                               animation pane, call (video call window), spelling (Revisar ▸ Ortografía, F7)
    styles/                    CSS in cascade order: tokens, ribbon, layout, canvas,
                               chrome, responsive, features
assets/                        files served with the app: fonts/, 3D thumbnails (library3d/, nasa3d/)
tests/
  run.sh                       everything: layers.py, the Node.js tests, then run.py
  run.py                       headless Chrome runner: the suite, touch, equation keyboard,
                               mouse checks, --e2e two-device checks, the website's checks if site/ exists
  layers.py                    architecture check (layers, imported names, linked files, .gitignore)
  suite.js  suites/*.js        the browser test suite, one file per area (animation, editor, io,
                               objects, present, services, slides, text); index.html runs it
  fixtures/                    test files: Office themes, 3D models for autorig, a CSV, a fake cloud API, a tiny
                               Spanish dictionary (spell/)
  server.mjs                   the share/collaboration server, with in-memory Durable Objects
  server-api.mjs               the accounts API: sessions, credits, AI, payments, desktop sign-in
  server-lti.mjs               LTI 1.3 against a simulated platform
  server-blender.mjs           revela-blender's signed door (gate.js)
  client-account.mjs           the account client against a simulated server
  templates-i18n.mjs           the example presentations in other languages
server/
  cloudflare/                  Revela's server (Worker + Durable Objects): see its README
    worker.js                  entry point: routes, sealed shares (/s), the daily cron
    util.js                    shared helpers: b64url, random, sha256, hmac, EMAIL, escHtml, DAY/HOUR
    auth.js                    Google ID token verification
    store.js                   ShareBox, Limits (daily quotas), storage in parts
    api.js                     the /api routes; accounts, sessions, credits, desktop sign-in (Account,
                               Budget, DesktopLink)
    ai.js                      AI chat, images and speech, paid with credits within the monthly budget
    billing.js                 Stripe: prices, live/test mode, Pro's trial, Checkout, portal, webhook
    stock.js                   stock photo search (Unsplash, Pexels)
    storage.js                 the cloud's space: quotas per plan, what each account takes, the daily alert
    releases.js                Versiones: pruebas vs production, «Publicar en producción» (docs/PUBLICAR.md)
    visits.js                  the website's visits without cookies, its 404s and redirects, the sitemap's extras (Visits)
    docs.js                    cloud documents with roles and permission settings (CloudDoc)
    collab.js                  co-editing rooms (CollabRoom)
    teams.js                   teams: seats, members, brand kit, templates (Team)
    lti.js                     LTI 1.3 tool (LtiStore)
    calls.js                   video calls on Cloudflare Realtime (CallRoom)
    schedule.js                scheduled notices for the daily cron (Schedule)
    mail.js                    transactional emails (Cloudflare Email Service or Resend)
    model3d.js                 «Crear modelo 3D con IA» jobs (ModelJob)
    admin.js                   administration API behind Cloudflare Access; support tickets
                               (Directory, Tickets, Audit)
    finance.js                 the business's accounts (Finance)
    crm.js                     «Captación»: contacts, consented sequences, campaigns, webinars, referrals (Crm)
    crm-mail.js                «Captación»'s emails in each language and their signed links
    ambassadors.js             ambassadors: applying, the public directory, the badge
    crawler.js                 the «Rastreador»: reads the CRM's websites politely (robots.txt), facts and a score (Crawler)
    community.js               the community gallery and its pages (Community)
    notices.js                 Revela's own notices
  blender/                     revela-blender: Blender in Cloudflare Containers for
                               «Crear modelo 3D con IA» (signed requests only; docs/NUBE.md):
                               worker.js, gate.js (signature check), runner.py, run.py, Dockerfile
desktop/                       Tauri app (Windows, macOS, Linux) with self-update. src-tauri/src/main.rs: saving a
                               download where the person chooses (save_file), the files opened with Revela (opened_files,
                               read_opened; .pptx/.odp associations in tauri.conf.json, and revela.desktop: Linux passes them
                               as arguments with its %F), updates. The page side,
                               ui/shell/desktop.js: the native menu bar (translated), «Acerca de», downloads to the
                               system's «Save as», opening what Revela was opened with
tools/
  build-site.mjs               builds the site, the open edition or the desktop app's files
  site-i18n.mjs                the website's pages in each language
  build-catalog.mjs            writes templates/catalog.js
  template-names.mjs           adds translated names and summaries of the examples
  template-texts.mjs           the examples' texts for translating (--check runs in the tests)
  check-templates.mjs          every example builds and uses what exists
  audit-templates.py           how the examples look: overflow, overlaps, contrast
  shot-template.py             pictures of an example's slides
  perf.mjs                     how Revela runs on a slow computer
  lti-key.mjs                  makes the LTI signing key (a server secret)
  move.py  extract.py          move files / declarations and rewrite imports
  shot.py  embeddable.py       screenshots; which web pages can be embedded
  pptx-compare.py              compare a PowerPoint file with Revela's rendering
  nasa3d.py                    NASA's 3D model index and thumbnails
  blender-try.py               run the Blender wrapper of the AI 3D models with this computer's Blender
```

### Other modules

Added after the map above was written; one line each (every module's own header says the rest). `tests/layers.py`
fails if a module of `src/`, `server/cloudflare/` or `tools/` is not named in this file, so the map cannot fall behind again.

```
src/core/
  deckfile.js              the presentation as a .revela.json: a picture or video used in several places is written once
  jsonblob.js              a value as JSON in a Blob, written in pieces (never one string of a 400 MB deck)
  mediastore.js            big files kept once each, as bytes, so an autosave does not rewrite them all
  svgstretch.js            an SVG shown «Estirar» (fit fill) really fills its box
  webgl.js                 what this computer can draw, found out once (3D and maps fall back where there is none)
src/features/
  ai/aianim.js             «Animación con IA»: the AI writes the scene of an explainer (content/aianim.js plays it)
  ai/legibility.js         how big the type must be and how much text fits, by where the deck will be shown
  ai/masterai.js           «Diseñar con IA»: three whole template designs from a description or a logo
  ai/model3dagent.js       «Crear 3D con IA» in the browser: an agent writes Three.js and corrects itself from photos
  ai/quality.js           how good a deck the AI made is, measured as numbers
  ai/specdeck.js           slides from specs with no editor open (the public API and the MCP server)
  ai/videoquiz.js          questions for a video, from frames spread over it
  animation/fxcatalog.js   PowerPoint's animation effects as Revela plays them: one catalogue for CSS, preview, galleries, import and export
  content/aianim.js        the player of the AI's explainer animations
  content/examples-texts.js  the company examples' texts in the other languages
  content/geomap.js        maps that fly from stop to stop (Insertar ▸ Mapa)
  content/icons3d.js       3D icons (3dicons.co, CC0)
  content/model3dweb.js    a 3D model built from the code an AI wrote, photographed from three sides
  content/multilang.js  multilang-texts.js   two examples in eleven languages and their texts
  content/qrcode.js        QR codes made in the app (link, Wi-Fi, contact, email, place…)
  content/sketch.js        draw a symbol to find it, compared on this computer
  content/symbols.js       the data of Insert ▸ Symbols and emojis
  content/tplb/deckb.js    a compact way to write the examples (a palette, a cover and slides of a few kinds); templates/x/deckkit.js are the builders of the older ones
  design/devmode.js        developer mode: the deck's own CSS, classes and HTML objects
  document/imagetools.js   what «Editar imagen» does to the picture itself, one undo step each
  document/syspaste.js     pasting what another program copied (PowerPoint, Word, Excel, a web page)
  document/watermark.js    «Confidencial»: a watermark over every slide
src/io/
  deskzip.js               the desktop app's zips, read through the window itself
  export/scorm.js          the deck as a SCORM 1.2 package
  formats/blobmedia.js     pictures, videos and sounds as blob: addresses for what is shown in this window
  formats/offline-libs.js  «Incluir las librerías dentro del HTML»: the libraries inside the exported page
  formats/package.js       the .revela package (a zip with the project and its media)
  formats/zipstore.js      a zip made of Blobs and read through slices, never whole in memory
  formats/xlsx-import.js   Excel workbooks read in the browser
  runtime/aianim.js        the presentation side of the AI animations (one stage per click)
  runtime/finishstep.js    «Next» while a step animates finishes it first
  runtime/fx.js            what a map or a 3D model gives up on this computer, said where it happens
  runtime/geomap.js        the maps that fly from stop to stop (MapLibre GL JS)
  runtime/liveframe.js     «Web viva»: a web page that keeps its place from one slide to the next
src/render/
  imagelook.js             a picture's look beyond PowerPoint's four corrections (warmth, hue, sharpen, vignette)
  sectionbar.js            the sections bar, as LaTeX Beamer's
  slidenumber.js           the slide number, drawn the same on canvas, thumbnails and presentation
src/ui/
  canvas/imagecrop.js      cropping a picture on the slide
  canvas/lottieview.js     a Lottie object in the editor
  dialogs/aianim.js  animfx.js  classpace.js  classroom.js  developers.js  devmode.js  diagram.js  dlgkit.js  geomap.js
  dialogs/headerfooter.js  htmlexport.js  imageai.js  imageedit.js  masterai.js  objlink.js  pdfmode.js  pdfzone.js
  dialogs/qaprep.js  qr.js  qrmaker.js  scorm.js  sheets.js  shortcuts.js  symbols.js  teamsso.js  textstyles.js
                           one dialog each, named for what it does; dlgkit.js has the parts they are all made of (tabs, folded «Más opciones»)
  shell/bigdeck.js  broadcast.js  colorpicker.js  downloadproject.js  errors.js  fxdemo.js  prompter.js  tour.js  update.js
                           very big decks, «Emitir en directo», Revela's colour picker, Archivo ▸ Descargar, errors sent to the server,
                           an effect's example on hover, teleprompter, guided tours, «Hay una versión nueva»
server/cloudflare/
  brakes.js                brakes on what runs by itself (alarms, crons, the «Rastreador»)
  broadcast.js             live broadcast to a big audience
  crm-reply.js             Captación's emails written by hand
  deckedit.js              the public API's changes to a presentation, run by the document's own object
  errors.js                the app's errors, kept per account for 90 days
  hooks.js                 integrations: Slack, Zapier, Microsoft
  meshy3d.js  trellis3d.js   «Realista»: textured 3D models (Meshy through fal.ai; TRELLIS on Runware or fal)
  news.js  news-starters.js  the newsletter («Novedades») and its ready-made starting points
  openrouterwatch.js       the server's OpenRouter balance
  publicapi.js             the public API and its MCP server
  quota.js                 the day's use against the Workers Free plan's quota
  sso.js                   single sign-on for teams
tools/
  ai-eval.py  measure-design-variety.mjs   the AI's decks and design choices, measured with the real model
  audit-motion.py  motioncheck.mjs         what every example's motion does when played (no browser)
  build-news-starters.mjs  build-symbols.mjs  make-lottie.mjs   generated data: newsletter starters, symbols, Revela's Lottie animations
  chromeprof.py            a headless Chrome profile for the tools that drive one
  play-templates.py        plays the examples as an audience would see them
  rig-metrics.mjs          rig quality of a 3D model, measured
tests/
  build-limits.mjs         the website and the covers stay under Cloudflare Pages' 20,000 files
  build-stamp.mjs  client-desktop.mjs  seo-site.mjs  server-brakes.mjs   the update stamp, desktop payments, the website's SEO, the brakes
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
              icon, math, code, poll, camera, ink, slideref, connector, magnify, lock, …

animation = { effect, order (click), seq (play order), start, duration, delay,
              dx, dy, pathShape, points, turn, spin, clip, once, trigger }
        The first one is `animation`; the ones after it, `anims` (use
        `animsOf(b)`/`animEntries(slide)` from features/animation).

model (3D) block: src (GLB data URL), clip (rest animation), walk:{clip, end,
        endOnce, face, look} (what it does while moving), view, motion, autoRotate

table block: rows:[[cell html]], header, banded, firstCol, lines, headBg, headFg, band, stroke, color,
        merges:[{r,c,rs,cs}], colW, rowH, cellPad, cellBg:{"r,c": colour | 'none'}
        cellBg is a cell's own shading (Tabla ▸ Sombreado, the cell's right-click menu, or a PowerPoint's a:tcPr
        fill when importing: one field, so all of them draw, save and export alike). It is drawn inline on the
        cell, so it wins over the style's header and bands, as in PowerPoint; 'none' is «Sin relleno» (no colour
        even where the style puts one); no entry, the style's. A merged cell keeps it on its top-left cell.
        The cells a command acts on are the screen's, not the document's: state.ui.tableCells (features/document/
        blocks.js tableCellKeys: the ones picked while writing in the table, else all of it). Exported to the
        presentation, PDF, PPTX (a:solidFill in the cell; the table has no PowerPoint style, so «Sin relleno» is
        no fill) and ODP; the accessibility check judges the shaded cells' text against their colour.

lock block: codes (as written: the exported page only gets SHA-256(salt:code), compared without case, accents
        or extra spaces), hint, openTo ('next' | a slide id | ''), reveal (ids of objects of its slide hidden until it
        opens), fail, tries (0: any), gate (pupils on their own can't go past its slide until it opens), salt, color

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

## Live features

The phone remote and live polls connect the presenter and the phones directly
over WebRTC (PeerJS; its public broker only introduces the peers). The
presenter hosts a peer `revela-CODE` (remote) or `revela-vote-CODE` (polls);
the phone pages connect to it. To find their way, connections use STUN and,
when Revela's server is there, its TURN relays (`core/ice.js` asks `/api/ice`),
for phones behind a carrier's NAT. Votes are kept in the presenter's browser,
not on a server. Pictures and voice answers travel the same way, as `data:` URLs
of at most 300 000 characters (PeerJS splits them into the channel's chunks); of
the voices, only the newest (~1.2 MB) are kept, since localStorage is small.

Co-editing (`features/live/collab.js`) works the same way by default: the
person who shares keeps the document and checks every change against the
sender's role (view / comment / edit, a secret in each link). With a server
configured, the session runs in a room instead (`io/cloud/collabserver.js` →
`server/cloudflare/collab.js`, one Durable Object per room), which checks each
change with the same rules (`features/live/collabsync.js`) and survives the
owner closing the tab.

**Cloud documents** (official and desktop editions: `io/cloud/clouddocs.js` →
`server/cloudflare/docs.js`) are presentations kept on Revela's server and
shared with people (by their Google account's email) or by link, each with a
role: present, view, comment or edit, plus permission settings (no copies for
viewers and commenters, editors who may share, access that ends). The server
checks every read and every change against the role of whoever sends it, so the
app's code cannot give anyone more than they were given; the present role gets
a deck without speaker notes, comments or hidden slides. People in a cloud
document can also join a video call (Pro; `io/cloud/call.js` → Cloudflare
Realtime through `server/cloudflare/calls.js`).

## Sharing privately

A shared presentation is **sealed** in the browser before it leaves it
(`io/share/seal.js`): gzip, then AES-GCM-256 with either a random key that
travels in the link after `#` (never sent to any server) or a key derived from
a password (PBKDF2-SHA-256, 600 000 rounds). The sealed copy can then be a
single self-opening HTML file, a file in the user's Google Drive readable by
link, or an object on Revela's share server (`/s`, or a server of one's own);
none of them can read it. `view.html` fetches a sealed copy and opens it;
`io/runtime/unseal.js` is the only decryption code, embedded as source in the
self-opening file. Pages and the server say `noindex`, identifiers are 128-bit
random values. (Cloud documents are not sealed: the server needs to read them
to check roles and merge changes.)

## Security

Anything that comes from outside — a file, Drive, an import, a paste from
another site, a co-editor's changes, a cloud document — goes through
`features/document/sanitize.js` before it is used (the store's deck filter, the
clipboard, co-editing and `io/cloud/clouddocs.js` apply it): HTML without
scripts, frames or event handlers; links and sources only to safe addresses;
style and script-bound values that can't break out. Data written inside the
exported page's scripts uses `jsData`. Sealed presentations open in a sandboxed
frame without Revela's origin (`view.html`); embedded web pages only keep their
own origin when they are from another site. Co-editing operations never walk
`__proto__`-like paths, a commenter can only touch comments, and long messages
have limits (also on the server).

On the server (`server/cloudflare`), the browser only asks and the server
decides: sessions, plan, credits, limits and document roles are checked on
every request against state only the server holds. Sessions are an `HttpOnly`,
`Secure`, `SameSite=Strict` cookie limited to `/api` (a bearer token in the
desktop app); only a hash of each is stored, and people can see and end their
open sessions (`/api/sessions`). Requests with the cookie that change something
must come from an allowed origin (`API_ORIGINS`). The administration API only
answers on its own host, behind Cloudflare Access, and checks the Access token
itself. Secrets live in Cloudflare, never in this repository. The service
worker never caches `/api/` answers. See [SECURITY.md](../SECURITY.md) to report
a vulnerability.

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
5. If it needs the server, the route goes in `server/cloudflare/` and its
   checks there (never trust the app); tests in `tests/server*.mjs`.
6. Tests in the matching `tests/suites/<area>.js`; run `npm test`
   (`./tests/run.sh`).
