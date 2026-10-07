// Polls answered later, by a link, without presenting (as Prezi's asynchronous polls): which kinds can be (the
// surveys — not quizzes and activities, which have their time, their reveal and their marks: self-paced, LTI, SCORM),
// what the phone gets of one, and what answer is taken (the server checks it too: server/cloudflare/docs.js).
// ES5 inside the functions, as the rest of the polls' code.

export var ASYNC_KINDS = ['choice', 'multi', 'rating', 'word', 'open', 'number', 'image', 'point', 'rank'];

// What the phone needs to answer it (never more).
export function publicPoll(b) {
  var p = { pollId: b.pollId, kind: b.kind, question: String(b.question || ''), options: (b.options || []).map(String) };
  if (b.kind === 'number') { p.min = b.min; p.max = b.max; p.step = b.step; p.unit = b.unit; }
  if (b.kind === 'image') p.images = b.images || [];
  if (b.kind === 'point') p.image = b.image || '';
  return p;
}

// The answer as it is kept, or null when it isn't one.
export function cleanAnswer(p, a) {
  var n = (p.options || []).length;
  if (p.kind === 'word') { var w = String(a == null ? '' : a).trim().slice(0, 60); return w || null; }
  if (p.kind === 'open') { var t = String(a == null ? '' : a).trim().slice(0, 200); return t ? { t: t, time: Date.now() } : null; }
  if (p.kind === 'multi') { var m = (Array.isArray(a) ? a : []).map(Number).filter(function (x) { return x >= 0 && x < n && x === Math.floor(x); }).slice(0, 20); return m.length ? m : null; }
  if (p.kind === 'rating') { var r = Math.round(+a); return r >= 1 && r <= 5 ? r : null; }
  if (p.kind === 'number') { var x = +a, lo = isFinite(+p.min) ? +p.min : -1e12, hi = isFinite(+p.max) ? +p.max : 1e12; return a !== '' && a != null && isFinite(x) && x >= lo && x <= hi ? x : null; }
  if (p.kind === 'point') { var px = +(a && a.x), py = +(a && a.y); return isFinite(px) && isFinite(py) && px >= 0 && px <= 100 && py >= 0 && py <= 100 ? { x: Math.round(px * 10) / 10, y: Math.round(py * 10) / 10 } : null; }
  if (p.kind === 'rank') { var o = (Array.isArray(a) ? a : []).map(Number), seen = {}; if (o.length !== n) return null;
    for (var i = 0; i < n; i++) { if (!(o[i] >= 0 && o[i] < n) || seen[o[i]]) return null; seen[o[i]] = 1; } return o; }
  var c = +a; return a !== '' && a != null && c >= 0 && c < n && c === Math.floor(c) ? c : null;   // choice, image
}
