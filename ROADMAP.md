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
- ⬜ Snap-to grid spacing / smart spacing hints `PP·GS`

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
- 🚧 Spell check — native browser spellcheck while editing; proofing/AutoCorrect planned `PP·GS·OO`
- ✅ Text columns `PP·OO`
- ✅ Named text styles (Title, Subtitle, Heading, Body, Quote, Note) `PP·OO`
- ✅ Multi-level lists (Tab / Shift+Tab) `PP·GS·OO`

## 3. Objects & content
- ✅ Images `PP·GS·OO`
- ✅ Video, Audio `PP·GS·OO`
- ✅ Interactive 3D models (`.glb`/`.gltf`) — *unique to Revela among natives* `PP`
- ✅ Shapes library — rectangle, rounded, ellipse, triangle, diamond, pentagon, star, block/left arrow, hexagon, parallelogram, trapezoid, chevron, cross, line, arrow `PP·GS·OO`
- ✅ Connectors between shapes (follow the objects) `PP·GS·OO`
- ✅ Tables — editable cells, add/remove rows & columns, header row, border colour, merge/split cells `PP·GS·OO`
- ✅ Charts — bar, line, area, pie, doughnut, scatter, radar with data editing (SVG, no library) `PP·GS·OO`
- ✅ SmartArt / diagrams — process, cycle, hierarchy & list `PP·OO`
- ✅ Icons — built-in inline-SVG icon set with colour `PP·GS`
- ✅ Emoji picker `GS`
- ✅ Animated GIF playback `PP·OO`
- ✅ Embedded web page (`<iframe>`) `—`
- ✅ Code blocks with syntax highlighting and animated line stepping `—`
- ✅ Figure/table captions with auto-numbering + list of figures/tables `OO`
- ✅ AI image background removal `PP`
- ✅ Image crop, adjustments (brightness/contrast/saturation/opacity) and transparency `PP·GS·OO`
- ⬜ Combo charts, multi-series & chart from a table `PP·GS·OO`
- ⬜ Table styles (banded rows, presets) `PP·GS·OO`
- ⬜ Merge / subtract / intersect shapes `PP·OO`
- ⬜ Online / stock images & icons library `PP·GS`
- ⬜ Embedded spreadsheet / linked data `GS·OO`
- ⬜ Screen / camera recording, live camera (Cameo) `PP`
- ⬜ Freehand ink / pen drawing on the slide (Draw tab) `PP·OO`

## 4. Slides & structure
- ✅ Sections (create/rename/remove inline from the navigator) `PP·GS·OO`
- ✅ Drag-and-drop slide reordering `PP·GS·OO`
- ✅ Duplicate / delete / hide slide `PP·GS·OO`
- ✅ Templates & slide layouts (built-in + save current, change layout from Home) `PP·GS·OO`
- ✅ Per-slide background: colour, gradient, image (apply to all) `PP·GS·OO`
- ✅ Themes `PP·GS·OO`
- ✅ Slide size (16∶9 / 4∶3) `PP·GS·OO`
- ✅ Speaker notes (editor panel + presenter view) `PP·GS·OO`
- ✅ Slide numbers, date/time field, header & footer, deck logo/branding `PP·GS·OO`
- ✅ Slide zoom & summary zoom (embed a slide, link, choose return/stay) `PP`
- 🚧 Slide master — logo/branding & backgrounds on all slides; full master & placeholders planned `PP·GS·OO`
- ⬜ Placeholders (layout content placeholders) `PP·OO`
- ✅ Theme colours (9 palettes; switching recolours what came from the palette) & theme fonts (heading/body pairs), theme swatches in every colour picker `PP·GS·OO`
- ⬜ Template / theme gallery & designer variants `PP·GS·OO`
- ✅ Reuse / import slides from another deck (.json or .pptx, pick by thumbnail, scaled to size) `PP·OO`
- ✅ Handout / notes printing layouts (notes pages; 1, 2, 3 with lines, 4, 6, 9 per page) `PP·OO`

## 5. Transitions & animation
- ✅ Per-slide transitions & default transition/speed `PP·GS·OO`
- ✅ Per-object entrance, emphasis & exit animations (many effects) `PP·GS·OO`
- ✅ Animation pane — effect, start (on click / with previous), duration, delay, reorder, remove `PP·GS·OO`
- ✅ Animation preview (play in the editor) `PP·GS·OO`
- ✅ Morph / transformation transition (Auto-Animate, with "duplicate to animate") `PP`
- ✅ Auto-advance timing per slide, loop / kiosk `PP·GS·OO`
- ⬜ "After previous" auto-timed start & animation triggers (on click of another object) `PP·GS·OO`
- ⬜ Motion paths `PP`
- ⬜ Animation painter `PP`
- ⬜ Per-transition options (direction, board split, etc.) `PP·GS·OO`

## 6. Presenting
- ✅ Presenter view (notes, next slide, timer) — reveal presenter view (S) + phone companion `PP·GS·OO`
- ✅ Phone companion remote (pair by code, notes, navigate, laser, blackout, timer) `—`
- ✅ Loop / kiosk / auto-play `PP·GS·OO`
- ✅ Laser pointer / pen / highlighter / eraser during the show (Ctrl+P, Ctrl+I, Ctrl+L, E; ink kept per slide) + laser from the phone `PP·GS·OO`
- ⬜ Rehearse timings / speaker coach `PP`
- ⬜ Record slideshow with narration and export to video `PP`
- ⬜ Audience Q&A `GS`
- ⬜ Live captions / subtitles `PP`
- ⬜ Present to Meet / Teams `PP·GS`

## 7. Collaboration *(needs a backend — not possible on static hosting alone)*
- ⬜ Real-time co-editing `PP·GS·OO`
- ⬜ Comments, @mentions, assign, resolve `PP·GS·OO`
- ⬜ Built-in chat `OO`
- ⬜ Version history `PP·GS·OO`
- ⬜ Share links and permission levels `PP·GS·OO`
- ⬜ Protect / password, restrict editing `PP·OO`
- ⬜ Digital signatures `OO`

## 8. Import & export
- ✅ Export to self-contained HTML (reveal.js) `—`
- ✅ Export to `.pptx` (PptxGenJS: text, images, shapes, tables, charts) `GS·OO`
- ✅ Export to PDF (one slide per page) `PP·GS·OO`
- ✅ Import from PowerPoint `.pptx` (text + images) `OO·GS`
- ✅ Project import/export as JSON, local autosave `—`
- ✅ Save/open to Google Drive & export HTML to Drive (client-side, `drive.file`) `PP·GS`
- 🚧 Export slide as image (PNG via html2canvas); JPG/SVG & batch planned `PP·GS·OO`
- ⬜ High-fidelity `.pptx` import (fonts, colours, shapes, layouts) `OO·GS`
- ⬜ Export to video (MP4/GIF) `PP·GS`
- ⬜ Publish to the web / shareable link `GS`
- ⬜ Open Document (`.odp`) support `OO`

## 9. Accessibility & internationalisation
- ✅ Alt text for objects `PP·GS·OO`
- ✅ UI localisation — 9 languages (ES/EN/FR/DE/IT/PT/CA/GL/NL): ribbon, menus, modals, dialogs & status bar `PP·GS·OO`
- ✅ Content text direction (RTL) `PP·OO`
- ✅ Accessibility checker — missing alt text, empty/untitled slides, duplicate titles, tables without header, low text contrast (WCAG) `PP·GS·OO`
- ⬜ Reading / tab order `PP·OO`
- ⬜ Screen reader support (ARIA on the canvas) `PP·GS·OO`
- ⬜ Right-to-left **interface** `PP·OO`
- ⬜ Built-in content translation `GS·OO`
- ⬜ More UI languages `PP·GS·OO`

## 10. Extensibility & automation
- ⬜ Plugin / add-on system `GS·OO`
- ⬜ Macros / scripting `PP·GS·OO`
- ⬜ Public document/embed API `GS`

## 11. Intelligence
- ✅ AI image background removal `PP`
- ⬜ Design ideas / Designer / Explore (auto layouts) `PP·GS`
- ⬜ AI text and image generation `PP·GS`
- ⬜ Auto-generated speaker notes / summaries `PP·GS`

## 12. Platform
- ✅ Static web app with automatic deployment (GitHub Pages) `GS`
- ✅ Automated headless regression test suite (`tests/run.sh`) `—`
- 🚧 Responsive & touch editing (mobile layout, long-press menus, fit-to-screen) `PP·GS·OO`
- 🚧 Cloud project storage — Google Drive save/open (client-side) `PP·GS`
- ⬜ Desktop application ([Tauri](https://tauri.app/)) `PP·OO`
- ✅ Offline mode & installable app (service worker + manifest; works offline after one online visit) `PP·GS·OO`
- ⬜ Autosave to cloud, multi-device sync `PP·GS`
