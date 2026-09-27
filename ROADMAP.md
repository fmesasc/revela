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
- ✅ Drag from anywhere, alignment guides + snapping `PP·GS·OO`
- ✅ Corner resizing, keyboard nudging `PP·GS·OO`
- ✅ Undo / redo `PP·GS·OO`
- ✅ Cut / copy / paste of objects `PP·GS·OO`
- ✅ Right-click context menu `PP·GS·OO`
- ⬜ Multi-select (marquee + shift-click) `PP·GS·OO`
- ⬜ Group / ungroup objects `PP·GS·OO`
- ⬜ Align & distribute across objects (to slide / to selection) `PP·GS·OO`
- ⬜ Order: bring to front / send to back / forward / backward `PP·GS·OO` *(forward/backward done)*
- ⬜ Rotation handle and flip `PP·GS·OO`
- ⬜ Lock objects, lock aspect ratio `PP·OO`
- ⬜ Grid, rulers and guides you can place `PP·GS·OO`
- ⬜ Format painter / copy style `PP·GS·OO`
- ⬜ Find & replace `PP·GS·OO`
- ⬜ Zoom controls, fit to width / slide `PP·GS·OO`
- ⬜ Paste special / paste without formatting `PP·GS·OO`

## 2. Text
- ✅ Bold, italic, underline, strikethrough `PP·GS·OO`
- ✅ Font colour, font size `PP·GS·OO`
- ✅ Bulleted and numbered lists `PP·GS·OO`
- ✅ Paragraph alignment `PP·GS·OO`
- ⬜ Font family picker and embedding `PP·GS·OO`
- ⬜ Highlight colour `PP·OO`
- ⬜ Superscript / subscript `PP·GS·OO`
- ⬜ Line and paragraph spacing, indents `PP·GS·OO`
- ⬜ Text columns `PP·OO`
- ⬜ Change case `PP·GS·OO`
- ⬜ Bullet/number style and level customisation `PP·GS·OO`
- ⬜ Text styles / named styles `PP·OO`
- ⬜ WordArt / Text Art `PP·OO`
- ⬜ Special characters and symbol picker `PP·GS·OO`
- ⬜ Equations / math (OnlyOffice has a full equation editor) `PP·OO`
- ⬜ Spell check, proofing and AutoCorrect `PP·GS·OO`
- ⬜ Hyperlinks (web, slide, email) `PP·GS·OO`
- ⬜ Vertical text and text direction (RTL) `PP·OO`

## 3. Objects & content
- ✅ Images `PP·GS·OO`
- ✅ Video `PP·GS·OO`
- ✅ Interactive 3D models (`.glb`/`.gltf`) — *unique to Revela among natives; PowerPoint has static 3D* `PP`
- ⬜ Shapes library (rect, ellipse, arrows, lines, connectors) with fill/stroke `PP·GS·OO`
- ⬜ Merge / subtract / intersect shapes `PP·OO`
- ⬜ Tables with styles `PP·GS·OO`
- ⬜ Charts (bar, line, pie, …) with data editing `PP·GS·OO`
- ⬜ SmartArt / diagrams `PP·OO`
- ⬜ Icons and stock images `PP·GS`
- ⬜ Emoji picker `GS`
- ⬜ Audio tracks `PP·OO`
- ⬜ Animated GIF playback `PP·OO`
- ⬜ Embedded spreadsheet / linked data `GS·OO`
- ✅ AI image background removal `PP` *(PowerPoint "Remove Background")*
- ⬜ Image crop, adjustments (brightness/contrast/filters), transparency `PP·GS·OO`
- ⬜ Code blocks with syntax highlighting `—`
- ⬜ Screen / camera recording, live camera (Cameo) `PP`

## 4. Slides & structure
- ✅ Sections `PP·GS·OO`
- ✅ Drag-and-drop slide reordering `PP·GS·OO`
- ✅ Duplicate / delete slide `PP·GS·OO`
- ✅ Templates (built-in + save current) `PP·GS·OO`
- ✅ Per-slide background colour `PP·GS·OO`
- ✅ Themes `PP·GS·OO`
- ✅ Slide size (16∶9 / 4∶3) `PP·GS·OO`
- ⬜ Slide layouts (title, title+content, …) `PP·GS·OO`
- ⬜ Slide master / theme editor `PP·GS·OO`
- ⬜ Placeholders `PP·OO`
- ⬜ Background images and gradients `PP·GS·OO`
- ⬜ Colour palettes / theme colours & fonts `PP·GS·OO`
- ⬜ Speaker notes `PP·GS·OO`
- ⬜ Slide numbers, date/time, header & footer `PP·GS·OO`
- ⬜ Template / theme gallery `PP·GS·OO`

## 5. Transitions & animation
- ✅ Per-slide transitions `PP·GS·OO`
- ✅ Per-object entrance animations `PP·GS·OO`
- ⬜ Transition duration and per-transition options `PP·GS·OO`
- ⬜ Emphasis and exit animations `PP·GS·OO`
- ⬜ Motion paths `PP`
- ⬜ Animation timeline, ordering and triggers `PP·GS·OO`
- ⬜ Animation painter `PP`
- ⬜ Morph / transformation transition (incl. between 3D models) `PP`
- ⬜ Auto-advance timing per slide `PP·GS·OO`

## 6. Presenting
- ⬜ Presenter view (notes, next slide, timer) `PP·GS·OO`
- ⬜ Laser pointer / pen / highlighter during show `PP·GS·OO`
- ⬜ Rehearse timings / speaker coach `PP`
- ⬜ Record slideshow with narration and export to video `PP`
- ⬜ Audience Q&A `GS`
- ⬜ Live captions / subtitles `PP`
- ⬜ Loop / kiosk / auto-play `PP·GS·OO`
- ⬜ Present to Meet / Teams `PP·GS`

## 7. Collaboration
- ⬜ Real-time co-editing `PP·GS·OO`
- ⬜ Comments, @mentions, assign, resolve `PP·GS·OO`
- ⬜ Built-in chat `OO`
- ⬜ Version history `PP·GS·OO`
- ⬜ Share links and permission levels `PP·GS·OO`
- ⬜ Protect / password, restrict editing `PP·OO`
- ⬜ Digital signatures `OO`

## 8. Import & export
- ✅ Export to self-contained HTML (reveal.js) `—`
- ✅ Import from PowerPoint `.pptx` (text + images) `OO·GS`
- ⬜ High-fidelity `.pptx` import (fonts, colours, shapes, layouts) `OO·GS`
- ⬜ Export to `.pptx` `GS·OO`
- ⬜ Export to PDF `PP·GS·OO`
- ⬜ Export slides as images (PNG/JPG/SVG) `PP·GS·OO`
- ⬜ Export to video (MP4/GIF) `PP·GS`
- ⬜ Publish to the web / shareable link `GS`
- ⬜ Open Document (`.odp`) support `OO`
- ✅ Project import/export as JSON, local autosave `—`

## 9. Accessibility & internationalisation
- ⬜ Accessibility checker `PP·GS·OO`
- ⬜ Alt text for objects `PP·GS·OO`
- ⬜ Reading / tab order `PP·OO`
- ⬜ Screen reader support `PP·GS·OO`
- ⬜ Right-to-left interface and content `PP·OO`
- ⬜ Built-in translation `GS·OO`
- ⬜ UI localisation (multiple languages) `PP·GS·OO`

## 10. Extensibility & automation
- ⬜ Plugin / add-on system `GS·OO`
- ⬜ Macros / scripting `PP·GS·OO`
- ⬜ Public document/embed API `GS`

## 11. Intelligence
- ✅ AI background removal `PP`
- ⬜ Design ideas / Designer / Explore (auto layouts) `PP·GS`
- ⬜ AI text and image generation `PP·GS`
- ⬜ Auto-generated speaker notes / summaries `PP·GS`

## 12. Platform
- ✅ Static web app with automatic deployment `GS`
- ⬜ Desktop application ([Tauri](https://tauri.app/)) `PP·OO`
- ⬜ Offline mode `PP·GS·OO`
- ⬜ Cloud project storage `PP·GS`
- ⬜ Mobile / touch editing `PP·GS·OO`
- ⬜ Autosave to cloud, multi-device sync `PP·GS`
