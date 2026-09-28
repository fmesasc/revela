# Roadmap

Revela aims to match the feature set people expect from a modern presentation
tool, plus first-class interactive 3D. This roadmap is a superset of the
capabilities of **Microsoft PowerPoint**, **Google Slides** and **OnlyOffice
Presentation**, so that nothing important is missed.

**Method.** OnlyOffice was inspected locally (its editor's UI string catalogue
enumerates every command); PowerPoint and Google Slides are covered from their
documented feature sets. Each item is tagged with the suites that offer it, so
the origin of every requirement is traceable.

**Status:** ✅ done · 🚧 in progress · ⬜ planned
**Suites:** `PP` PowerPoint · `GS` Google Slides · `OO` OnlyOffice

---

## 1. Core editing
- ✅ Block canvas with direct manipulation `PP·GS·OO`
- ✅ Drag from anywhere, alignment guides + snapping (toggleable) `PP·GS·OO`
- ✅ Corner resizing, keyboard nudging `PP·GS·OO`
- ✅ Undo / redo `PP·GS·OO`
- ✅ Cut / copy / paste / duplicate of objects `PP·GS·OO`
- ✅ Right-click context menu (contextual per object) `PP·GS·OO`
- ✅ Multi-select (marquee + shift-click) `PP·GS·OO`
- ✅ Group / ungroup objects `PP·GS·OO`
- ✅ Align & distribute — to slide, among objects, distribute `PP·GS·OO`
- ✅ Order: bring to front / send to back / forward / backward `PP·GS·OO`
- ✅ Rotation handle and flip `PP·GS·OO`
- ✅ Lock aspect ratio (Shift while resizing) and object lock `PP·OO`
- ✅ Object opacity `PP·GS·OO`
- ✅ Grid, rulers and guides you can place `PP·GS·OO`
- ✅ Format painter / copy style `PP·GS·OO`
- ✅ Find & replace `PP·GS·OO`
- ✅ Zoom controls, fit to window `PP·GS·OO`
- ✅ Paste without formatting (Ctrl+Shift+V) `PP·GS·OO`
- ✅ Keyboard shortcuts panel `PP·GS·OO`
- ✅ Eyedropper colour picker (text, highlight, shape fill/border, background; Chromium browsers) `PP·GS`
- ✅ Snap to the visible grid and smart spacing (equal gaps to neighbours, with distance marks) `PP·GS`

## 2. Text
- ✅ Bold, italic, underline, strikethrough `PP·GS·OO`
- ✅ Font colour, font size (custom values) `PP·GS·OO`
- ✅ Bulleted and numbered lists `PP·GS·OO`
- ✅ Paragraph alignment (horizontal) and vertical alignment in the box `PP·GS·OO`
- ✅ Font family picker and embedding — 40+ web-safe & Google fonts, on demand, embedded on export `PP·GS·OO`
- ✅ Highlight colour `PP·OO`
- ✅ Superscript / subscript `PP·GS·OO`
- ✅ Line & letter spacing, left indent, increase/decrease indent `PP·GS·OO`
- ✅ Change case `PP·GS·OO`
- ✅ Bullet/number style per box (disc/circle/square/none, 1/a/A/i) `PP·GS·OO`
- ✅ WordArt / Text Art (fill, outline, shadow, gradient, neon, gold, fire, ice…) `PP·OO`
- ✅ Text box fill, border and rounded corners `PP·GS·OO`
- ✅ Special characters & symbol/emoji picker `PP·GS·OO`
- ✅ Equations / math — visual editor (MathLive, Symbolab-style) + LaTeX, and inline `$…$` in text (KaTeX) `PP·OO`
- ✅ Hyperlinks — web, slide and email targets `PP·GS·OO`
- ✅ Text direction (RTL) and vertical text `PP·OO`
- ✅ Spell check (browser's own, while editing) and AutoCorrect of typographic symbols (—, →, ©, ≤, …), switchable `PP·GS·OO`
- ✅ Text columns `PP·OO`
- ✅ Named text styles (Title, Subtitle, Heading, Body, Quote, Note) `PP·OO`
- ✅ Fit text to its box (reveal's r-fit-text) and shrink text on overflow `PP·GS·OO`
- ✅ Enlarge images on click while presenting (lightbox) `—`
- ✅ Multi-level lists (Tab / Shift+Tab) `PP·GS·OO`

## 3. Objects & content
- ✅ Images `PP·GS·OO`
- ✅ Video, Audio `PP·GS·OO`
- ✅ Interactive 3D models (`.glb`/`.gltf`) — *unique to Revela among natives* `PP`
- ✅ Shapes library — rectangle, rounded, ellipse, triangle, diamond, pentagon, star, block/left arrow, hexagon, parallelogram, trapezoid, chevron, cross, line, arrow `PP·GS·OO`
- ✅ Connectors between shapes (follow the objects) `PP·GS·OO`
- ✅ Tables — editable cells, add/remove rows & columns, header row, border colour, merge/split cells `PP·GS·OO`
- ✅ Charts — bar, line, area, pie, doughnut, scatter, radar; multiple series with legend, combo (bars + lines), paste data from a spreadsheet, chart from a table (SVG, no library; native in .pptx) `PP·GS·OO`
- ✅ SmartArt / diagrams — process, cycle, hierarchy & list `PP·OO`
- ✅ Icons — built-in inline-SVG icon set with colour `PP·GS`
- ✅ Emoji picker `GS`
- ✅ Animated GIF playback `PP·OO`
- ✅ Embedded web page (`<iframe>`) `—`
- ✅ Code blocks — syntax colouring in the editor, visual editor of highlight steps (lines × steps grid with preview), auto-scroll to the highlighted lines, line numbers and first line, 35 languages, code morph between slides `—`
- ✅ Figure/table captions with auto-numbering + list of figures/tables `OO`
- ✅ AI image background removal `PP`
- ✅ Image crop, adjustments (brightness/contrast/saturation/opacity) and transparency `PP·GS·OO`
- ✅ Table styles — 6 presets coloured from the palette, header row, banded rows, first column, lines only (also in .pptx) `PP·GS·OO`
- ✅ Merge shapes — union, combine, intersect, subtract (polygon-clipping; custom geometry in .pptx) `PP·OO`
- ✅ Online images (Openverse, openly licensed, attribution kept as caption, commercial-use filter) and 200 000+ online icons (Iconify), opt-in, embedded so they work offline `PP·GS`
- ✅ Tables from CSV files and from cells pasted from a spreadsheet; paste images/text straight onto the slide `GS·OO`
- ✅ Live data — dashboards (Power BI, Looker Studio, Tableau, Google Sheets, Grafana, Datawrapper, Flourish, Metabase) from their share link, with periodic reload; charts linked to a published CSV, refreshed in the editor and while presenting `GS·OO`
- ✅ Screen / camera recording into a video object, live camera on the slide (Cameo: circle/rounded/rect, mirrored) `PP`
- ✅ Freehand ink on the slide (Draw tab: pen, highlighter, stroke eraser, colour & thickness; strokes are movable objects) `PP·OO`

## 4. Slides & structure
- ✅ Sections (create/rename/remove inline from the navigator) `PP·GS·OO`
- ✅ Drag-and-drop slide reordering `PP·GS·OO`
- ✅ Duplicate / delete / hide slide `PP·GS·OO`
- ✅ Templates & slide layouts (built-in + save current, change layout from Home) `PP·GS·OO`
- ✅ Per-slide background: colour, gradient, image (cover/contain/tile, opacity), video, interactive web page, background transition (apply to all) `PP·GS·OO`
- ✅ Vertical slides (reveal.js stacks) and slides not counted in the numbering `—`
- ✅ Themes — all 14 reveal.js themes including high contrast `PP·GS·OO`
- ✅ Presentation settings — arrows, progress bar, navigation mode, scroll view, mouse wheel, shuffle, right-to-left, cursor, jump to slide, link previews, parallax background, Morph timing (deck and slide), zoom (Alt+click) and search `—`
- ✅ Slide size (16∶9 / 4∶3) `PP·GS·OO`
- ✅ Speaker notes (editor panel + presenter view) `PP·GS·OO`
- ✅ Slide numbers, date/time field, header & footer, deck logo/branding `PP·GS·OO`
- ✅ Slide zoom & summary zoom (embed a slide, link, choose return/stay) `PP`
- ✅ Slide master — objects on every slide (edit mode), hide per slide, plus logo/branding & backgrounds `PP·GS·OO`
- ✅ Placeholders — layouts with title/subtitle/body prompts, not exported while empty; changing layout keeps the text `PP·OO`
- ✅ Theme colours (9 palettes; switching recolours what came from the palette) & theme fonts (heading/body pairs), theme swatches in every colour picker `PP·GS·OO`
- ✅ Template gallery — 8 complete starter decks (palette, fonts, master decoration, layouts with placeholders) `PP·GS·OO`
- ✅ Reuse / import slides from another deck (.json or .pptx, pick by thumbnail, scaled to size) `PP·OO`
- ✅ Handout / notes printing layouts (notes pages; 1, 2, 3 with lines, 4, 6, 9 per page) `PP·OO`

## 5. Transitions & animation
- ✅ Per-slide transitions & default transition/speed — none, fade, slide, convex, concave, zoom, flip, push, wipe, rise `PP·GS·OO`
- ✅ Per-object entrance, emphasis & exit animations — every reveal.js fragment style (semi-fade, fade-in-then-semi-out, current-visible, highlight-current…) plus Revela's own `PP·GS·OO`
- ✅ Animation pane — effect, start (on click / with previous), duration, delay, reorder, remove `PP·GS·OO`
- ✅ Animation preview (play in the editor) `PP·GS·OO`
- ✅ Morph / transformation transition (Auto-Animate, with "duplicate to animate") `PP`
- ✅ Auto-advance timing per slide, loop / kiosk `PP·GS·OO`
- ✅ "After previous" auto-timed start & animation triggers (on click of another object) `PP·GS·OO`
- ✅ Motion paths — straight, arc, wave and loop to a chosen end point, with guide on the canvas; freehand-drawn paths planned `PP`
- ✅ Animation painter `PP`
- ✅ Per-slide transition options — different exit transition, per-slide speed, apply to all `PP·GS·OO`
- ⬜ Even more transition effects (directions, split, shape reveals) `PP·GS·OO`

## 6. Presenting
- ✅ Presenter view (notes, next slide, timer) — reveal presenter view (S) + phone companion `PP·GS·OO`
- ✅ Phone companion remote (pair by code, notes, navigate, laser, blackout, timer) `—`
- ✅ Loop / kiosk / auto-play `PP·GS·OO`
- ✅ Laser pointer / pen / highlighter / eraser during the show (Ctrl+P, Ctrl+I, Ctrl+L, E; ink kept per slide) + laser from the phone `PP·GS·OO`
- ✅ Rehearse timings (clock while presenting, save each slide's time as auto-advance) `PP`
- ⬜ Speaker coach (pace, filler words) `PP`
- ✅ Record the slideshow with microphone narration to a video file (.webm) `PP`
- ✅ Live audience polls — QR on the slide, phones vote (single/multiple choice, rating, word cloud), results update live as bars, pie, figures or cloud; CSV export (WebRTC via PeerJS, no server of ours) `GS`
- ✅ Audience Q&A — the audience sends questions from their phones and upvotes others'; the slide shows them ranked live (max 5 per person) `GS`
- ✅ Live captions while presenting (browser speech recognition, CC button or C key, asks first because Chrome/Edge send audio to their speech service) `PP`
- ⬜ Present to Meet / Teams `PP·GS`

## 7. Collaboration *(needs a backend — not possible on static hosting alone)*
- ⬜ Real-time co-editing `PP·GS·OO`
- ✅ Comments on slides and objects — replies, resolve/reopen, @mentions, markers; saved in the project (sharing them live needs the back end) `PP·GS·OO`
- ⬜ Built-in chat `OO`
- ✅ Version history (local, in this browser: automatic snapshots + named versions, restore/download) — shared history needs the back end `PP·GS·OO`
- ⬜ Share links and permission levels `PP·GS·OO`
- ✅ Protect — project encrypted with a password (AES-GCM 256, PBKDF2) and "mark as final" (read-only) `PP·OO`
- ⬜ Digital signatures `OO`

## 8. Import & export
- ✅ Export to self-contained HTML (reveal.js) `—`
- ✅ Export to `.pptx` (PptxGenJS: text, images, shapes, tables, charts) `GS·OO`
- ✅ Export to PDF (one slide per page) `PP·GS·OO`
- ✅ Import from PowerPoint `.pptx` — text with formatting (size, bold, italic, colour, font, alignment, bullets, autofit), inherited placeholder positions, preset shapes with fill/outline/rotation, lines, pictures with alt text, grouped objects, tables with merged cells, backgrounds, theme colours & fonts, notes, hidden slides `OO·GS`
- ✅ Import Markdown with reveal.js conventions (--- slides, -- vertical, Note: notes, code with line steps, images) `—`
- ✅ Project import/export as JSON, local autosave `—`
- ✅ Save/open to Google Drive & export HTML to Drive (client-side, `drive.file`) `PP·GS`
- ✅ Export slides as images — PNG or JPG, current slide or all slides in a ZIP `PP·GS·OO`
- ✅ `.pptx` import of charts (editable, all series, combo), gradient backgrounds, slide transitions and auto-advance timings `OO·GS`
- ⬜ Remaining `.pptx` import: shadows, SmartArt, object animations `OO·GS`
- ✅ Export to video — MP4 (H.264, WebCodecs) or animated GIF rendered from the slides with cross-fades and per-slide timings; .webm by recording the live slideshow (with animations) `PP·GS`
- ⬜ Publish to the web / shareable link `GS`
- ✅ OpenDocument (`.odp`) export & import — text with formatting and lists, pictures, shapes, lines/arrows, merged shapes, tables with merged cells, charts/icons/ink as SVG, backgrounds, notes, hidden slides (validated with LibreOffice) `OO`

## 9. Accessibility & internationalisation
- ✅ Alt text for every non-text object, "mark as decorative" (exported as ARIA) `PP·GS·OO`
- ✅ UI localisation — 11 languages (ES/EN/FR/DE/IT/PT/CA complete; GL/NL/EU/AR main interface, with English or Spanish fallback) `PP·GS·OO`
- ✅ Content text direction (RTL) `PP·OO`
- ✅ Accessibility checker — missing alt text, empty/untitled slides, duplicate titles, tables without header, low text contrast (WCAG) `PP·GS·OO`
- ✅ Reading order pane; Tab / Shift+Tab walks the objects of the slide `PP·OO`
- ✅ Screen reader support in the editor — named slide and objects, live announcement of the selection `PP·GS·OO`
- ✅ Right-to-left **interface** (Arabic) — mirrored ribbon and panels, slide geometry untouched `PP·OO`
- ✅ Translate the whole presentation with AI (text keeping formatting, tables, notes; one undo step) `GS·OO`
- ⬜ Complete GL/NL/EU/AR and more UI languages (community translations) `PP·GS·OO`

## 10. Extensibility & automation
- ✅ Add-in system — ES modules by URL, ribbon buttons, stored locally `GS·OO`
- ✅ Macros / scripting — JavaScript snippets with the `Revela` API, saved locally `PP·GS·OO`
- ✅ Public scripting API (`window.Revela`: deck, slides, objects, events, export, UI) `GS`

## 11. Intelligence
- ✅ AI image background removal `PP`
- ✅ Design ideas — local layout suggestions for the slide's content (visual left/right/background, centred, classic) `PP·GS`
- ✅ AI via OpenRouter (sign in or own key; user pays their usage, no Revela server): create slides from a topic, rewrite/shorten/proofread/translate text `PP·GS`
- ✅ AI image generation (OpenRouter Image API, model configurable) `PP·GS`
- ✅ AI speaker notes (one slide or all) and alt text for images `PP·GS`
- ✅ AI authoring: whole decks from a brief or a document (txt/md/pdf) with 11 slide kinds laid out by Revela (stats, timeline, chart with data, table, quote…), optional AI images; improve slide; agenda; review quiz; assistant that edits the deck from plain-language requests (validated operations, one undo step) `PP·GS`

## 12. Platform
- ✅ Static web app with automatic deployment (GitHub Pages) `GS`
- ✅ Automated headless regression test suite (`tests/run.sh`, real time, fake camera) `—`
- 🚧 Responsive & touch editing (mobile layout, long-press menus, fit-to-screen) `PP·GS·OO`
- 🚧 Cloud project storage — Google Drive save/open (client-side) `PP·GS`
- ⬜ Desktop application ([Tauri](https://tauri.app/)) `PP·OO`
- ✅ Offline mode & installable app (service worker + manifest; works offline after one online visit) `PP·GS·OO`
- ⬜ Autosave to cloud, multi-device sync `PP·GS`
