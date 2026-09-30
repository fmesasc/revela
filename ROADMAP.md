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
- ✅ Object opacity and shadow `PP·GS·OO`
- ✅ Grid, rulers and guides you can place `PP·GS·OO`
- ✅ Format painter / copy style `PP·GS·OO`
- ✅ Find & replace `PP·GS·OO`
- ✅ Zoom controls, fit to window `PP·GS·OO`
- ✅ Paste without formatting (Ctrl+Shift+V) `PP·GS·OO`
- ✅ Keyboard shortcuts panel `PP·GS·OO`
- ✅ Eyedropper colour picker (text, highlight, shape fill/border, background; Chromium browsers) `PP·GS`
- ✅ Snap to the visible grid and smart spacing (equal gaps to neighbours, with distance marks) `PP·GS`
- ✅ Collapsible slides panel (thumbnails scaled to the space they get) `GS`
- ✅ Dashed and dotted line styles for shapes, borders and connectors (also in .pptx/.odp) `PP·GS·OO`
- ✅ Format painter for any object — shapes, pictures, connectors, charts, tables, icons, equations; between kinds, what they have in common `PP·GS·OO`
- ✅ Selection pane — hide, lock, rename and reorder objects (drag); hidden objects stay hidden when presenting and in PowerPoint `PP·OO`

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
- ✅ Equations / math — visual editor (MathLive, Symbolab-style) with virtual keyboard + LaTeX, inline `$…$` in text (KaTeX); size, colour, bold, alignment, fill and border from the ribbon `PP·OO`
- ✅ Hyperlinks — web, slide and email targets `PP·GS·OO`
- ✅ Text direction (RTL) and vertical text `PP·OO`
- ✅ Spell check (browser's own, while editing) and AutoCorrect of typographic symbols (—, →, ©, ≤, …), switchable `PP·GS·OO`
- ✅ Text columns `PP·OO`
- ✅ Named text styles (Title, Subtitle, Heading, Body, Quote, Note) `PP·OO`
- ✅ Fit text to its box (reveal's r-fit-text) and shrink text on overflow `PP·GS·OO`
- ✅ Enlarge images on click while presenting (lightbox) `—`
- ✅ Multi-level lists (Tab / Shift+Tab) `PP·GS·OO`
- ✅ Voice dictation — speak and it is written where the caret is, with spoken punctuation (browser speech recognition, asks first) `PP·GS`
- ✅ Text ruler with tab stops (left, centre, right, decimal) and the Tab key; laid out the same when presenting; PowerPoint both ways `PP·OO`

## 3. Objects & content
- ✅ Images `PP·GS·OO`
- ✅ Video, Audio `PP·GS·OO`
- ✅ Interactive 3D models (`.glb`/`.gltf`) — *unique to Revela among natives* `PP`
- ✅ Shapes library — rectangle, rounded, ellipse, triangle, diamond, pentagon, star, block/left arrow, hexagon, parallelogram, trapezoid, chevron, cross, line, arrow `PP·GS·OO`
- ✅ Connectors between shapes (follow the objects) `PP·GS·OO`
- ✅ Tables — editable cells, add/remove rows & columns, header row, border colour, merge/split cells `PP·GS·OO`
- ✅ Charts — bar, line, area, pie, doughnut, scatter, radar; multiple series with legend, combo (bars + lines), paste data from a spreadsheet, chart from a table (SVG, no library; native in .pptx) `PP·GS·OO`
- ✅ Charts: negative values, gridlines with a scale, data labels and axis titles (native options in .pptx) `PP·GS·OO`
- ✅ SmartArt / diagrams — 15 layouts (lists, process, chevrons, steps, timeline, cycle, radial, org chart, Venn, matrix, pyramid, funnel, target) written as an outline, theme colour schemes, one by one when presenting, convert to shapes; native editable shapes in PowerPoint `PP·OO`
- ✅ Icons — built-in inline-SVG icon set with colour `PP·GS`
- ✅ Emoji picker `GS`
- ✅ Animated GIF playback `PP·OO`
- ✅ Canvas mode (like Prezi), optional: slides as frames on one large canvas (position, size, turn); presenting flies the camera between them, a small frame inside a big one zooms in; canvas view to arrange frames; O shows the whole canvas; template included `—`
- ✅ Canvas picture: a big image or a ready-made design (mountain, treasure map, space, mind map) under the whole canvas; each slide shows its part of it as background, and the slides can be laid along the design's route `—`
- ✅ Free resources like Canva: animated GIFs, animated stickers, 3D models (animated library, Poly Haven CC0, Sketchfab search) and 3D motion (model animations, turning, camera movements) `—`
- ✅ Resources side panel like Canva's Elements: images, icons, GIFs, stickers and 3D in one panel docked left or right, that stays open while you keep adding; click adds, drag drops it where you want `—`
- ✅ Walking 3D characters: while a model moves on the slide (motion path or any animation) it plays one of its clips (walk, run…) facing where it goes, then another on arrival (once and back to rest, or for good) and turns to the audience; its caption moves with it `—`
- ✅ Motion paths drawn by hand on the slide (mouse or finger), smoothed and at an even speed; points to drag, "+" to add one, double click to remove; turning on the way (follow the path and/or whole turns); kept in PowerPoint and LibreOffice files `PP·OO`
- ✅ More rigged characters in the 3D library: 9 KayKit characters and 2 Kenney ones (CC0), dozens of clips each; characters rest, and walk when given a path `—`
- ✅ Automatic skeleton for models without one (people and four-legged animals): joints proposed from the model's shape, adjusted by dragging (both sides at once), mesh bound to the bones and animations made in the app (rest, walk, run, wave, jump, cheer, dance) `—`
- ✅ More 3D sources: NASA's 257 models (spacecraft, rovers, rockets…, free) and thousands of 3D prints and scans from Wikimedia Commons (STL, turned into glTF), with credits; any 3D model can be downloaded as one .glb with everything in it `—`
- ✅ Contextual ribbon tab (like PowerPoint's Shape Format / Picture Format / 3D Model): while an object is selected, a tab with all its options appears, and opens by itself for a newly inserted object; several objects: align, distribute, group, merge (text boxes too, with font and paragraph) `PP`
- ✅ Several animations per object (PowerPoint's Add Animation): a palette of entrance, emphasis, exit, motion and a 3D model's own clips; they chain (a second path starts where the first ends, a turn is about where the object is by then), with their own start and timing; kept in PowerPoint and LibreOffice `PP·OO`
- ✅ Morph suggestion: when a slide shares changed objects with the previous one, Revela offers "Transformar" `PP`
- ✅ Video and GIF playback options: segments played one per click (from second X to second Y), start automatically, loop, mute; colour key (green screen) made transparent live; AI background removal for animated GIFs, frame by frame `PP`
- ✅ Embedded web page (`<iframe>`); video links (YouTube, Vimeo) turned into their player; pages that refuse to be framed shown as a link card `—`
- ✅ Code blocks — syntax colouring in the editor, visual editor of highlight steps (lines × steps grid with preview), auto-scroll to the highlighted lines, line numbers and first line, 35 languages, code morph between slides `—`
- ✅ Figure/table captions with auto-numbering + list of figures/tables `OO`
- ✅ AI image background removal `PP`
- ✅ Image crop, adjustments (brightness/contrast/saturation/opacity) and transparency `PP·GS·OO`
- ✅ Save objects as pictures — PNG/WebP with transparency, JPG, SVG for vector objects, 1–4× size; photos with their edits or as the original file; several objects together or one file each `PP·GS`
- ✅ Table styles — 6 presets coloured from the palette, header row, banded rows, first column, lines only (also in .pptx) `PP·GS·OO`
- ✅ Merge shapes — union, combine, intersect, subtract (polygon-clipping; custom geometry in .pptx) `PP·OO`
- ✅ Online images (Openverse, openly licensed, attribution kept as caption, commercial-use filter) and 200 000+ online icons (Iconify), opt-in, embedded so they work offline `PP·GS`
- ✅ Tables from CSV files and from cells pasted from a spreadsheet; paste images/text straight onto the slide `GS·OO`
- ✅ Live data — dashboards (Power BI, Looker Studio, Tableau, Google Sheets, Grafana, Datawrapper, Flourish, Metabase) from their share link, with periodic reload; charts linked to a published CSV, refreshed in the editor and while presenting `GS·OO`
- ✅ Screen / camera recording into a video object, live camera on the slide (Cameo: circle/rounded/rect, mirrored) `PP`
- ✅ Freehand ink on the slide (Draw tab: pen, highlighter, stroke eraser, colour & thickness; strokes are movable objects) `PP·OO`
- ✅ More than 70 shapes — pie, chord, block arc, cube, folded corner, smiley, sun, "no" sign, banners, thought bubble, arc, brackets and braces; action buttons; freeform `PP·GS·OO`
- ✅ Formulas in table cells — `=SUM(ABOVE)`, cell references and ranges, SUM/AVERAGE/MIN/MAX/COUNT/PRODUCT/ROUND/ABS in Spanish or English, units kept, total row; results in the export, PowerPoint and ODP `PP·OO`
- ✅ Waterfall (with totals) and funnel charts `PP`
- ✅ PDFs and other files, dropped or inserted: a PDF as one of its pages, as the document to leaf through when presenting, as an icon, or one slide per page; any other file as an icon that downloads it `PP`
- ✅ PDF animation steps — "page and zoom" in the timeline (on click, after the previous one, on clicking another object), the part chosen on the page; when presenting, drawn sharp with pdf.js with a bar to leaf through and zoom `—`
- ✅ Crop a picture to an aspect ratio (1:1, 4:3, 16:9…) with framing; pictures exported to PowerPoint without stretching and with their crop (srcRect), read back when importing `PP·GS·OO`
- ✅ Treemap and bubble charts (bubbles as PowerPoint's own chart, both ways) `PP`

## 4. Slides & structure
- ✅ Sections (create/rename/remove inline from the navigator) `PP·GS·OO`
- ✅ Drag-and-drop slide reordering `PP·GS·OO`
- ✅ Duplicate / delete / hide slide `PP·GS·OO`
- ✅ Templates & slide layouts (built-in + save current, change layout from Home; changing layout never loses text) `PP·GS·OO`
- ✅ Per-slide background: colour, gradient, image (cover/contain/tile, opacity), video, interactive web page, background transition (apply to all) `PP·GS·OO`
- ✅ Vertical slides (reveal.js stacks) and slides not counted in the numbering `—`
- ✅ Themes — all 14 reveal.js themes including high contrast `PP·GS·OO`
- ✅ Presentation settings — arrows, progress bar, navigation mode, scroll view, mouse wheel, shuffle, right-to-left, cursor, jump to slide, link previews, parallax background, Morph timing (deck and slide), zoom (Alt+click) and search `—`
- ✅ Slide size (16∶9 / 4∶3) `PP·GS·OO`
- ✅ Speaker notes (editor panel + presenter view) `PP·GS·OO`
- ✅ Slide numbers, date/time field, header & footer, deck logo/branding `PP·GS·OO`
- ✅ Slide zoom & summary zoom (embed a slide, link, choose return/stay) `PP`
- ✅ Slide master — text styles (title, subtitle, body in five levels: font, size, colour, bold, italic, alignment, bullet), objects on every slide, hide per slide `PP·GS·OO`
- ✅ Layouts that belong to the deck — create, duplicate, rename, delete, add placeholders and objects; slides follow their layout (formatting inherited master → layout → slide, moved placeholders follow, reset slide) `PP·GS·OO`
- ✅ Placeholders — title/subtitle/body prompts, not exported while empty `PP·OO`
- ✅ Several masters in one deck, each with its styles, objects and layouts; picture, table and chart placeholders `PP·OO`
- ✅ Theme colours (9 palettes; switching recolours what came from the palette) & theme fonts (heading/body pairs), theme swatches in every colour picker `PP·GS·OO`
- ✅ Template gallery — 8 starter decks (palette, fonts, master decoration, layouts with placeholders) and 10 complete example presentations with real content `PP·GS·OO`
- ✅ Reuse / import slides from another deck (.json or .pptx, pick by thumbnail, scaled to size) `PP·OO`
- ✅ Handout / notes printing layouts (notes pages; 1, 2, 3 with lines, 4, 6, 9 per page) `PP·OO`

## 5. Transitions & animation
- ✅ Per-slide transitions & default transition/speed — none, fade, slide, convex, concave, zoom, flip, push, wipe, rise `PP·GS·OO`
- ✅ Per-object entrance, emphasis & exit animations — every reveal.js fragment style (semi-fade, fade-in-then-semi-out, current-visible, highlight-current…) plus Revela's own `PP·GS·OO`
- ✅ Animation pane — effect, start (on click / with previous), duration, delay, reorder, remove `PP·GS·OO`
- ✅ Animation preview (play in the editor) `PP·GS·OO`
- ✅ Morph / transformation transition by objects, words or characters — set on the destination slide, objects paired by content like PowerPoint (reveal.js Auto-Animate) `PP`
- ✅ Auto-advance timing per slide, loop / kiosk `PP·GS·OO`
- ✅ "After previous" auto-timed start & animation triggers (on click of another object) `PP·GS·OO`
- ✅ Motion paths — straight, arc, wave and loop to a chosen end point, with guide on the canvas; freehand-drawn paths planned `PP`
- ✅ Animation painter `PP`
- ✅ Per-slide transition options — different exit transition, per-slide speed, apply to all `PP·GS·OO`
- ✅ More transition effects: effect options (direction of wipe and push, split vertical/horizontal), circle and diamond reveals; as in PowerPoint, the old slide keeps the rest of the screen while the shape grows `PP·GS·OO`
- ✅ Sounds on animations — click, pop, chime, whoosh, drum roll, applause (synthesised, nothing downloaded) or one's own file `PP`

## 6. Presenting
- ✅ Presenter view (notes, next slide, timer) — reveal presenter view (S) + phone companion `PP·GS·OO`
- ✅ Slide overview while presenting (Esc / O) — a mosaic sized to fit the screen, grouped by section, keyboard and click navigation `PP·GS·OO`
- ✅ Phone companion remote (pair by code, notes, navigate, laser, blackout, timer) `—`
- ✅ Loop / kiosk / auto-play `PP·GS·OO`
- ✅ Laser pointer / pen / highlighter / eraser during the show (Ctrl+P, Ctrl+I, Ctrl+L, E; ink kept per slide) + laser from the phone `PP·GS·OO`
- ✅ Rehearse timings (clock while presenting, save each slide's time as auto-advance) `PP`
- ✅ Speaker coach: rehearse with live pace and filler words, then a report with pace per slide, fillers, repeated expressions and slides read word for word (browser speech recognition, asked first) `PP`
- ✅ Record the slideshow with microphone narration to a video file (.webm) `PP`
- ✅ Live audience polls — QR on the slide, phones vote (single/multiple choice, rating, word cloud), results update live as bars, pie, figures or cloud; CSV export (WebRTC via PeerJS, no server of ours) `GS`
- ✅ Audience Q&A — the audience sends questions from their phones and upvotes others'; the slide shows them ranked live (max 5 per person) `GS`
- ✅ Live captions while presenting (browser speech recognition, CC button or C key, asks first because Chrome/Edge send audio to their speech service) `PP`
- ✅ Present in a video call (Google Meet, Microsoft Teams, Zoom): the presentation in its own window to share, speaker notes in another `PP·GS`

## 7. Collaboration *(needs a backend — not possible on static hosting alone)*
- ✅ Real-time co-editing: share links, everyone sees changes at once (per-object merging, so people can work on different objects together), others' selections on the slide, undo only undoes your own changes. Browser-to-browser (WebRTC), no server needed; the person sharing keeps the tab open `PP·GS·OO`
- ✅ Comments on slides and objects — replies, resolve/reopen, @mentions, markers; saved in the project (sharing them live needs the back end) `PP·GS·OO`
- ✅ Built-in chat in live sessions `OO`
- ✅ Version history (local, in this browser: automatic snapshots + named versions, restore/download) — shared history needs the back end `PP·GS·OO`
- ✅ Private sharing ready to embed in an `<iframe>` — encrypted in the browser (AES-GCM 256; key in the link fragment or a password, PBKDF2 600 000 rounds), stored as a self-opening HTML file, in the user's Google Drive or on an optional self-hosted server (Cloudflare Worker + R2) with expiry; `noindex`, unguessable ids, stop sharing `GS`
- ✅ Share limited to the Google accounts of one domain (self-hosted server; the server checks Google's signature) `PP·GS·OO`
- ✅ Permission levels (view / comment / edit): one link per level, changeable per person during the session and enforced by the person sharing `PP·GS·OO`
- ✅ View statistics for shared presentations — a counter and the last date, nothing about the viewer (self-hosted server) `GS`
- ✅ Protect — project encrypted with a password (AES-GCM 256, PBKDF2) and "mark as final" (read-only) `PP·OO`
- ✅ Digital signatures: sign in the browser (ECDSA P-256, key kept in the browser), several signers, check validity and changes after signing, key fingerprint to confirm the signer (no certificate authority) `OO`
- ✅ Tasks in comments — assign to someone (`+name` or a field) with a due date, reassign, mark as done; all tasks or only mine, counted on the button `GS`

## 8. Import & export
- ✅ Export to self-contained HTML (reveal.js) `—`
- ✅ Export to `.pptx` (PptxGenJS: text, images, shapes, tables, charts) `GS·OO`
- ✅ Export to PDF (one slide per page) `PP·GS·OO`
- ✅ Import from PowerPoint `.pptx` — text with PowerPoint's full style inheritance (master text styles → master and layout placeholders → shape → paragraph → run: size, bold, italic, underline, colour, font, spacing, bullets, indents, inner margins, autofit), the master's styles and the layouts become Revela's (with their logos and graphics), preset shapes with fill (incl. transparency)/outline/rotation, lines and connectors with arrowheads, pictures with alt text, grouped objects, tables with their style, column widths, cell fills and merged cells, backgrounds, theme colours & fonts, notes, hidden slides `OO·GS`
- ✅ Import Markdown with reveal.js conventions (--- slides, -- vertical, Note: notes, code with line steps, images) `—`
- ✅ Project import/export as JSON, local autosave `—`
- ✅ Save/open to Google Drive & export HTML to Drive (client-side, `drive.file`) `PP·GS`
- ✅ Export slides as images — PNG or JPG, current slide or all slides in a ZIP `PP·GS·OO`
- ✅ `.pptx` import of charts (editable, all series, combo), gradient backgrounds, slide transitions and auto-advance timings `OO·GS`
- ✅ `.pptx` import of shadows, SmartArt (as shapes), object animations, Morph, dashed lines, corner radius and shapes styled by the theme `OO·GS`
- ✅ `.pptx` export of transitions, Morph, animations and the master/layouts as real layouts with placeholders; `.odp` export of transitions and timings `GS·OO`
- ✅ `.odp` export and import of object animations (entrance, emphasis, exit, motion paths, triggers), read by LibreOffice Impress `OO`
- ✅ Export to video — MP4 (H.264, WebCodecs) or animated GIF rendered from the slides with cross-fades and per-slide timings; .webm by recording the live slideshow (with animations) `PP·GS`
- ✅ Publish to the web / shareable link — see private sharing (section 7) `GS`
- ✅ OpenDocument (`.odp`) export & import — text with formatting and lists, pictures, shapes, lines/arrows, merged shapes, tables with merged cells, charts/icons/ink as SVG, backgrounds, notes, hidden slides (validated with LibreOffice) `OO`
- ✅ Dropbox and OneDrive — save and open presentations in Revela's folder there, PKCE sign-in with no secret, configurable app identifiers `PP·GS`
- ✅ Comments to and from PowerPoint (classic and Microsoft 365 formats) and OpenDocument, keeping threads, tasks and resolved state `PP·OO`

## 9. Accessibility & internationalisation
- ✅ Alt text for every non-text object, "mark as decorative" (exported as ARIA) `PP·GS·OO`
- ✅ UI localisation — 11 languages (ES/EN/FR/DE/IT/PT/CA complete; GL/NL/EU/AR main interface, with English or Spanish fallback) `PP·GS·OO`
- ✅ Content text direction (RTL) `PP·OO`
- ✅ Accessibility checker — missing alt text, empty/untitled slides, duplicate titles, tables without header, low text contrast (WCAG) `PP·GS·OO`
- ✅ Reading order pane; Tab / Shift+Tab walks the objects of the slide `PP·OO`
- ✅ Screen reader support in the editor — named slide and objects, live announcement of the selection `PP·GS·OO`
- ✅ Editor appearance — light, dark, automatic (system) or custom accent and background `PP·GS·OO`
- ✅ Right-to-left **interface** (Arabic) — mirrored ribbon and panels, slide geometry untouched `PP·OO`
- ✅ Translate the whole presentation with AI (text keeping formatting, tables, notes; one undo step) `GS·OO`
- ✅ Complete Galician, Dutch, Basque and Arabic interface (machine-assisted; corrections from native speakers welcome), each loaded only when chosen `PP·GS·OO`
- ✅ “Open with Revela” from Google Drive (and “New ▸ Revela”) and Dropbox: view the presentation full screen or edit it; own file type `application/vnd.revela+json` `GS`

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
- ✅ Layered architecture (apps → ui → api → io → features → render·i18n → core) enforced by the tests (`tests/layers.py`) `—`
- ✅ Development tools — screenshots of the editor, PowerPoint import fidelity report against LibreOffice, embeddability check of web pages (`tools/`) `—`
- ✅ Responsive & touch editing: phone and tablet layout (portrait and on its side), touch select/drag/resize, long-press menus, double tap to type, fit-to-screen on rotation `PP·GS·OO`
- ✅ Cloud project storage — sign in with Google, “My presentations” (recent files in Drive with thumbnails), open/save/new straight in Drive (client-side, `drive.file` scope) `PP·GS`
- ✅ Desktop application ([Tauri](https://tauri.app/)): Windows, macOS and Linux installers built on every change and published in the releases `PP·OO`
- ✅ Offline mode & installable app (service worker + manifest; works offline after one online visit) `PP·GS·OO`
- ✅ Autosave to Google Drive and multi-device sync: saves a few seconds after each change, brings a newer version from another device, and asks when both changed `PP·GS`
