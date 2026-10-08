// Text helpers shared by every layer: escaping for HTML, plain text out of
// HTML, and data written inside a <script>.

// For HTML text and attribute values (in double quotes, as everywhere in Revela).
export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// The text of some HTML, without running or loading anything (no <img onerror>).
export function plainText(html) {
  const s = String(html ?? '');
  if (!/[<&]/.test(s)) return s.trim();
  if (typeof DOMParser !== 'undefined') return (new DOMParser().parseFromString(s, 'text/html').body.textContent || '').trim();
  // (No DOM — the server lays out slides sent through the API, publicapi.js —: the tags out, the usual entities read.)
  return s.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => (e[0] === '#' ? String.fromCodePoint(parseInt(e.slice(1).replace(/^x/i, ''), /^#x/i.test(e) ? 16 : 10) || 32)
    : ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0' }[e.toLowerCase()] ?? m))).trim();
}
// A value inside a <script>: JSON that can't end the script (</script>) or break its lines.
export const jsData = v => JSON.stringify(v ?? null).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
// A cheap signature of some data, to know whether to redraw: long strings
// (embedded pictures, models…) count by their length and ends, not all their megabytes.
const LONG = 200;
export const shortSig = v => JSON.stringify(v, (k, x) => (typeof x === 'string' && x.length > LONG ? `${x.length}:${x.slice(0, 40)}${x.slice(-40)}` : x));
