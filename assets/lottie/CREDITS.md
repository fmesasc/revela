# Animaciones Lottie / Lottie animations

The 18 animations in this folder (`*.json`, with their `*.svg` thumbnails) were drawn for Revela, as code, by
`tools/make-lottie.mjs`: plain shapes, trim paths and transforms, nothing taken from anyone else's work. They are
under the same licence as Revela (MIT) — and may be used, copied and changed freely, with no attribution needed.

To change or add one, edit that script and run `node tools/make-lottie.mjs`; the thumbnails are the animation's
«still frame» (`still` in `index.json`) as an SVG, taken with lottie-web.

Player: [lottie-web](https://github.com/airbnb/lottie-web) 5.12.2, light build (`lottie_light.min.js`), MIT licence,
loaded from the CDN only by a slide that has an animation (`src/core/vendor.js`).
