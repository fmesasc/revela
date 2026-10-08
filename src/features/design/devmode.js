// Developer mode (slides.com's): the presentation's own CSS (deck.css), classes on any object (b.cls) for it to
// target, and HTML objects — an embed with its own page (b.srcdoc) in a sandbox with no origin (ui/dialogs/devmode.js).
// The CSS applies inside the slides only: wrapped in the slide's selector with CSS nesting, after checking that its
// braces can't close that wrapper (else a rule could reach the editor or the viewer's page). Same in the editor, the
// thumbnails, the exported HTML and the shared viewer, so what is seen while editing is what is presented.

export const CSS_MAX = 100000;
// The CSS, inside `scope` (a selector list), or '' when it would escape it.
export function scopedCSS(css, scope) {
  const s = String(css || '').slice(0, CSS_MAX).replace(/<\/?style/gi, '').replace(/@import[^;]*;?/gi, '').replace(/@charset[^;]*;?/gi, '');
  if (!s.trim()) return '';
  let depth = 0;
  for (const ch of s.replace(/\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, '')) {
    if (ch === '{') depth++;
    else if (ch === '}' && --depth < 0) return '';
  }
  return depth === 0 ? `${scope}{\n${s}\n}` : '';
}
// An object's classes: words of letters, digits, - and _ only.
export const cleanClasses = v => String(v || '').split(/\s+/).filter(c => /^-?[A-Za-z_][\w-]{0,40}$/.test(c)).slice(0, 8).join(' ');
// A new HTML object's page.
export const HTML_SAMPLE = '<!doctype html>\n<style>\n  body { margin: 0; display: grid; place-items: center; height: 100vh; font: 32px system-ui; }\n</style>\n<p>Hola 👋</p>\n<script>\n  // Tu código\n</script>\n';
