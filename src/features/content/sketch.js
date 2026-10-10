// Draw a symbol to find it (Insert ▸ Symbols and emojis): the strokes drawn are compared with every character as
// this browser draws it, all on this computer — nothing is sent anywhere.
//
// Both sides become the same small picture: the drawing or the glyph fitted into a 32×32 box (keeping its
// proportions, so «—» and «|» stay different), with its lines as dots. An emoji is a coloured picture: its outline and
// its dark or contrasting parts are its lines (a smiley's eyes and mouth), as a hand would draw it. Two pictures are
// alike when every dot of each lies near a dot of the other (chamfer distance, both ways), and when their lines run in
// the same directions there (so → and ← or ∑ and Σ-like shapes facing elsewhere don't tie).
//
// The glyphs are measured once, a few at a time between frames (a few thousand: about a second in all, without
// freezing the dialog), and kept while the page is open.

export const N = 32;                     // (the box's side)
const PAD = 2, FIT = N - 2 * PAD;
const BINS = 4;                          // (directions of a line: —, /, |, \)
const SRC = 64;                          // (glyphs are drawn this big, then fitted: small text loses its shape)

let scratch = null;
function canvases() {
  if (!scratch) {
    const mk = n => { const c = document.createElement('canvas'); c.width = c.height = n; return [c, c.getContext('2d', { willReadFrequently: true })]; };
    scratch = { big: mk(SRC * 2), small: mk(N) };
  }
  return scratch;
}

// The ink's bounding box in an RGBA picture (alpha above a little).
function inkBox(data, w, h) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 24) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
// Where a w×h box goes in the 32×32 one: as big as fits, centred.
function fitBox(w, h) {
  const k = FIT / Math.max(w, h, 1), fw = Math.max(1, w * k), fh = Math.max(1, h * k);
  return { k, x: PAD + (FIT - fw) / 2, y: PAD + (FIT - fh) / 2, w: fw, h: fh };
}

// From a 32×32 RGBA picture (over transparent) to its line dots: dark ink, the edge of its silhouette, and strong
// changes of colour inside it.
function linesOf(rgba) {
  const L = new Float32Array(N * N), A = new Float32Array(N * N), on = new Uint8Array(N * N);
  for (let i = 0; i < N * N; i++) {
    const a = rgba[i * 4 + 3] / 255, lum = (0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2]) / 255;
    A[i] = a; L[i] = 1 - a + a * lum;            // (over white)
  }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x;
    if (A[i] < 0.35) continue;
    if (L[i] < 0.55) { on[i] = 1; continue; }
    let edge = false, grad = 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx, yy = y + dy, j = yy * N + xx;
      if (xx < 0 || yy < 0 || xx >= N || yy >= N || A[j] < 0.35) { edge = true; break; }
      grad = Math.max(grad, Math.abs(L[j] - L[i]));
    }
    if (edge || grad > 0.28) on[i] = 1;
  }
  return hollow(on);
}
// A filled shape (★, ●, a red heart) is drawn by hand as its outline: what lies deep inside ink (two pixels from any
// edge) is left out. (Ordinary strokes are thinner than that and stay whole.)
function hollow(on) {
  const out = on.slice();
  for (let y = 2; y < N - 2; y++) for (let x = 2; x < N - 2; x++) {
    if (!on[y * N + x]) continue;
    let full = true;
    for (let dy = -2; dy <= 2 && full; dy++) for (let dx = -2; dx <= 2; dx++) if (!on[(y + dy) * N + x + dx]) { full = false; break; }
    if (full) out[y * N + x] = 0;
  }
  return out;
}

// Each dot's direction (of the line through it, 0…3), from the dots around it (structure tensor of a 5×5 window).
function directions(on) {
  const dir = new Uint8Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (!on[y * N + x]) continue;
    let sxx = 0, syy = 0, sxy = 0, n = 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= N || yy >= N || !on[yy * N + xx]) continue;
      sxx += dx * dx; syy += dy * dy; sxy += dx * dy; n++;
    }
    // (The main axis of the dots around: the line's direction.)
    const ang = 0.5 * Math.atan2(2 * sxy, sxx - syy);          // −π/2…π/2
    dir[y * N + x] = n < 3 ? 255 : Math.round(((ang + Math.PI) % Math.PI) / (Math.PI / BINS)) % BINS;
  }
  return dir;
}

// Distance (in pixels ×4, up to 255) from every cell to the nearest dot: two passes, steps of 1 and √2.
function distanceMap(mask) {
  const INF = 1e9, d = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) d[i] = mask(i) ? 0 : INF;
  const S = Math.SQRT2;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x; let v = d[i];
    if (x > 0) v = Math.min(v, d[i - 1] + 1);
    if (y > 0) { v = Math.min(v, d[i - N] + 1); if (x > 0) v = Math.min(v, d[i - N - 1] + S); if (x < N - 1) v = Math.min(v, d[i - N + 1] + S); }
    d[i] = v;
  }
  for (let y = N - 1; y >= 0; y--) for (let x = N - 1; x >= 0; x--) {
    const i = y * N + x; let v = d[i];
    if (x < N - 1) v = Math.min(v, d[i + 1] + 1);
    if (y < N - 1) { v = Math.min(v, d[i + N] + 1); if (x < N - 1) v = Math.min(v, d[i + N + 1] + S); if (x > 0) v = Math.min(v, d[i + N - 1] + S); }
    d[i] = v;
  }
  const out = new Uint8Array(N * N);
  for (let i = 0; i < N * N; i++) out[i] = Math.min(255, Math.round(d[i] * 4));
  return out;
}

// The comparable form of a 32×32 line picture: its dots, their directions, and the distance maps (to any dot, and to
// the dots of each direction).
function features(on, aspect) {
  const dir = directions(on), pts = [];
  for (let i = 0; i < N * N; i++) if (on[i]) pts.push(i);
  if (!pts.length) return null;
  const any = distanceMap(i => on[i]);
  const byDir = Array.from({ length: BINS }, (_, b) => distanceMap(i => on[i] && (dir[i] === b || dir[i] === 255)));
  return { pts: Uint16Array.from(pts), dir: Uint8Array.from(pts, i => dir[i]), any, byDir, aspect };
}

// A character as this browser draws it, in a font (CSS font-family list): null when it draws nothing (a space, a
// joiner) or only the «missing character» box.
export function glyphFeatures(ch, family, missing = null) {
  const { big: [bc, bx], small: [sc, sx] } = canvases(), W = bc.width;
  bx.clearRect(0, 0, W, W);
  bx.font = `${SRC}px ${family}`; bx.textAlign = 'center'; bx.textBaseline = 'middle'; bx.fillStyle = '#000';
  bx.fillText(ch, W / 2, W / 2);
  const img = bx.getImageData(0, 0, W, W).data, box = inkBox(img, W, W);
  if (!box) return null;
  if (missing && sameInk(img, missing)) return null;
  const f = fitBox(box.w, box.h);
  sx.clearRect(0, 0, N, N); sx.imageSmoothingEnabled = true; sx.imageSmoothingQuality = 'high';
  sx.drawImage(bc, box.x, box.y, box.w, box.h, f.x, f.y, f.w, f.h);
  return features(linesOf(sx.getImageData(0, 0, N, N).data), box.w / box.h);
}
// The «missing character» box of a font: what the browser draws for a code point that will never be a character.
export function missingInk(family) {
  const { big: [bc, bx] } = canvases(), W = bc.width;
  bx.clearRect(0, 0, W, W);
  bx.font = `${SRC}px ${family}`; bx.textAlign = 'center'; bx.textBaseline = 'middle'; bx.fillStyle = '#000';
  bx.fillText('\uFFFF', W / 2, W / 2);
  return bx.getImageData(0, 0, W, W).data.slice();
}
function sameInk(a, b) {
  for (let i = 3; i < a.length; i += 16) if (Math.abs(a[i] - b[i]) > 8) return false;   // (every 4th pixel's alpha: enough)
  return true;
}

// The strokes drawn ([[x, y], …] each, in any unit), as the same kind of picture: lines about as thick as a font's.
export function drawingFeatures(strokes) {
  const all = strokes.flat(); if (!all.length) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of all) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const w = x1 - x0, h = y1 - y0;
  // (A tap or a tiny scribble is a dot: drawn as such, centred.)
  const f = fitBox(Math.max(w, 1e-6), Math.max(h, 1e-6)), k = Math.max(w, h) > 0 ? f.k : 0;
  const { small: [, sx] } = canvases();
  sx.clearRect(0, 0, N, N);
  sx.strokeStyle = '#000'; sx.fillStyle = '#000'; sx.lineWidth = 2.2; sx.lineCap = 'round'; sx.lineJoin = 'round';
  for (const s of strokes) {
    const P = s.map(([x, y]) => [f.x + (x - x0) * k, f.y + (y - y0) * k]);
    if (P.length === 1 || P.every(p => Math.hypot(p[0] - P[0][0], p[1] - P[0][1]) < 0.5)) { sx.beginPath(); sx.arc(P[0][0], P[0][1], 1.6, 0, 7); sx.fill(); continue; }
    sx.beginPath(); P.forEach(([x, y], i) => (i ? sx.lineTo(x, y) : sx.moveTo(x, y))); sx.stroke();
  }
  const rgba = sx.getImageData(0, 0, N, N).data, on = new Uint8Array(N * N);
  for (let i = 0; i < N * N; i++) on[i] = rgba[i * 4 + 3] > 90 ? 1 : 0;
  return features(on, (w || 1) / (h || 1));
}

// How unlike two pictures are (0: the same). Every dot's distance to the nearest dot of the other, its average both
// ways; a dot whose nearest one there runs the other way counts as farther. Very different proportions add a little.
export function distance(a, b) {
  const half = (p, q) => {
    let s = 0;
    for (let k = 0; k < p.pts.length; k++) {
      const i = p.pts[k], d = p.dir[k], all = q.any[i] / 4;
      const along = d === 255 ? all : q.byDir[d][i] / 4;
      s += Math.min(all + 2.5, along);              // (lines the other way: two and a half pixels farther)
    }
    return s / p.pts.length;
  };
  const ar = Math.abs(Math.log(Math.max(0.05, a.aspect) / Math.max(0.05, b.aspect)));
  return half(a, b) + half(b, a) + 0.6 * Math.max(0, ar - 0.4);
}

// The glyphs of a list of characters, measured a few at a time between frames, each in its font (family: a CSS
// font-family list, or a function giving one per character; keep(ch): whether to measure it, e.g. whether this
// browser can draw it). rank() compares a drawing with those measured so far; onProgress is told how many are ready.
export function sketchIndex(chars, family, keep = null) {
  const feats = new Array(chars.length);
  let done = 0, stopped = false;
  const fam = typeof family === 'function' ? family : () => family, missing = new Map();
  const missingOf = f => { if (!missing.has(f)) missing.set(f, missingInk(f)); return missing.get(f); };
  const ready = new Promise(resolve => {
    const step = () => {
      if (stopped) return resolve();
      const end = performance.now() + 12;               // (a slice of a frame: the dialog keeps answering)
      while (done < chars.length && performance.now() < end) { const ch = chars[done], f = fam(ch); feats[done] = !keep || keep(ch) ? glyphFeatures(ch, f, missingOf(f)) : null; done++; }
      index.onProgress?.(done, chars.length);
      if (done < chars.length) setTimeout(step, 0); else resolve();
    };
    setTimeout(step, 0);
  });
  const index = {
    ready, onProgress: null,
    get done() { return done; },
    stop() { stopped = true; },
    // The n characters most like the strokes, best first.
    rank(strokes, n = 60) {
      const q = drawingFeatures(strokes); if (!q) return [];
      const out = [];
      for (let i = 0; i < done; i++) if (feats[i]) out.push([distance(q, feats[i]), i]);
      out.sort((x, y) => x[0] - y[0]);
      return out.slice(0, n).map(([, i]) => chars[i]);
    },
  };
  return index;
}

// Whether this browser draws a character at all (not nothing, not the «missing character» box). emoji: also not
// as its parts side by side, which is how a sequence newer than the emoji font shows (👩\u200D🦰 as 👩 and 🦰).
const seen = new Map();
let tiny = null;
export function drawable(ch, family, emoji = false) {
  if (!tiny) { const c = document.createElement('canvas'); c.width = c.height = 40; tiny = c.getContext('2d', { willReadFrequently: true }); }
  const ink = s => {
    tiny.clearRect(0, 0, 40, 40); tiny.font = `28px ${family}`; tiny.textAlign = 'center'; tiny.textBaseline = 'middle'; tiny.fillStyle = '#000';
    tiny.fillText(s, 20, 20); return tiny.getImageData(0, 0, 40, 40).data;
  };
  if (!seen.has(family)) seen.set(family, ink('\uFFFF').slice());
  if (emoji) { tiny.font = `28px ${family}`; if (tiny.measureText(ch).width > 1.6 * tiny.measureText('\u{1F600}').width) return false; }
  const a = ink(ch);
  let any = false; for (let i = 3; i < a.length; i += 4) if (a[i] > 24) { any = true; break; }
  if (!any) return false;
  const miss = seen.get(family);
  for (let i = 3; i < a.length; i += 4) if (Math.abs(a[i] - miss[i]) > 8) return true;
  return false;
}
