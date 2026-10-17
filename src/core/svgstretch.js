// A drawing (an SVG picture) shown «Estirar» (fit 'fill'): an <img> with object-fit fill still keeps the drawing's own
// proportions inside — its viewBox centred, preserveAspectRatio's default —, so dunes drawn for 16:9 didn't fill a
// wide band. Told to stretch: preserveAspectRatio="none" on its root, for a data: URL (plain or base64).
export function stretchSVG(src) {
  const m = /^data:image\/svg\+xml((?:;[^,;]+)*),/i.exec(src || ''); if (!m) return src;
  let body;
  try { body = /;base64$/i.test(m[1]) ? atob(src.slice(m[0].length)) : decodeURIComponent(src.slice(m[0].length)); } catch { return src; }
  if (!/<svg[\s>]/i.test(body)) return src;
  body = body.replace(/<svg([^>]*)>/i, (all, attrs) => `<svg${attrs.replace(/\s+preserveAspectRatio="[^"]*"/i, '')} preserveAspectRatio="none">`);
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(body);
}
