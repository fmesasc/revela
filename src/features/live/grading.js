// Marking the activities and quizzes of a presentation. No imports and no outer
// variables: the functions are also embedded in exported presentations and used
// by the server (server/cloudflare/lti.js), which marks self-paced answers.
// Activities with right answers, answered from the phone (none of the answers
// reach it): put in order, match pairs, fill in the gaps, label a picture,
// sort into groups, a crossword, a word search, a memory game.
// Each answer is a list of texts; each item right or wrong, and the score is
// the share right (1000 points for all of them). Self-contained, like tallyVotes.
//   order  options: the items in the right order
//   match  options: "left = right" lines
//   gaps   text: "The capital of France is [Paris]" ([a|b]: either is right)
//   label  options: the labels; points: [{ x, y }] in % of image, one per label
//   sort   options: "Category: item, item, item" lines (sort into groups: AhaSlides', Lumio's Super Sort); the answer
//          has each item's category, in the items' own order (the phone shows them shuffled, knowing each one's place)
//   crossword   options: "WORD = clue" lines; the answer has the word typed for each line (only its letters count:
//               no spaces, accents nor case). The phone gets the grid's geometry and the numbered clues, never the words.
//   wordsearch  options: the words to find ("WORD = hint": the hint is shown instead of the word); the answer has the
//               strings the pupil marked on the grid (as many as words, at most), forwards or backwards
//   memory      options: "A = B" pairs; the answer has each pair's B once found, in the pairs' order, then the number of
//               attempts. The phone needs both sides to play on its own, so this one is practice: its content isn't secret.
export var ACTIVITIES = ['order', 'match', 'gaps', 'label', 'sort', 'crossword', 'wordsearch', 'memory'];
export function gradeActivity(p, a) {
  var norm = function (s) { return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); };
  var o = p.options || [], per = [];
  var letters = function (s) { return norm(s).replace(/[^\p{L}\p{N}]/gu, ''); };
  a = Array.isArray(a) ? a : [];
  if (p.kind === 'order' || p.kind === 'label') per = o.map(function (x, i) { return norm(a[i]) !== '' && norm(a[i]) === norm(x); });
  else if (p.kind === 'match' || p.kind === 'memory') per = o.map(function (l, i) { var r = String(l).split('=').slice(1).join('='); return norm(a[i]) !== '' && norm(a[i]) === norm(r); });
  else if (p.kind === 'sort') o.forEach(function (l) { var c = String(l).split(':'), cat = norm(c[0]);
    c.slice(1).join(':').split(/[,;]/).forEach(function (it) { if (!it.trim()) return; var got = norm(a[per.length]); per.push(got !== '' && got === cat); }); });
  else if (p.kind === 'crossword') per = o.map(function (l, i) { var w = letters(String(l).split('=')[0]); return w !== '' && letters(a[i]) === w; });
  else if (p.kind === 'wordsearch') { var got = a.slice(0, o.length).map(letters);       // (no more marks than words: marking every line doesn't pay)
    per = o.map(function (l) { var w = letters(String(l).split('=')[0]); return w !== '' && (got.indexOf(w) >= 0 || got.indexOf(w.split('').reverse().join('')) >= 0); }); }
  else if (p.kind === 'gaps') { var re = /\[([^\]]+)\]/g, m, i = 0; while ((m = re.exec(String(p.text || '')))) { var got = norm(a[i++]); per.push(got !== '' && m[1].split('|').some(function (alt) { return norm(alt) === got; })); } }
  var ok = per.filter(Boolean).length;
  return { per: per, score: per.length ? ok / per.length : 0 };
}
// What the phones get: the items shuffled (the same way every time), never the answers.
// The grids (crossword, word search) are laid out from the pollId too, so every phone, the presenter and a reload get
// the same one. full: also the solution (the words in the grid), for the presenter's screen — never sent to phones.
export function publicActivity(p, full) {
  var seed = 7, id = String(p.pollId || ''), o = p.options || [];
  for (var i = 0; i < id.length; i++) seed = (seed * 31 + id.charCodeAt(i)) >>> 0;
  var rnd = function () { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; };
  var shuffle = function (arr) { var a = arr.slice(); for (var k = a.length - 1; k > 0; k--) { var j = Math.floor(rnd() * (k + 1)), t = a[k]; a[k] = a[j]; a[j] = t; } return a; };
  var split = function (l) { var x = String(l).split('='); return [x[0].trim(), x.slice(1).join('=').trim()]; };
  if (p.kind === 'order') { var s = shuffle(o); if (o.length > 1 && s.join('\u0001') === o.join('\u0001')) s.push(s.shift()); return { items: s }; }
  if (p.kind === 'match') { var pr = o.map(split); return { left: pr.map(function (x) { return x[0]; }), right: shuffle(pr.map(function (x) { return x[1]; })) }; }
  if (p.kind === 'gaps') { var parts = [], last = 0, t = String(p.text || ''), re = /\[([^\]]+)\]/g, m; while ((m = re.exec(t))) { parts.push(t.slice(last, m.index), null); last = re.lastIndex; } parts.push(t.slice(last)); return { parts: parts }; }
  if (p.kind === 'label') return { image: p.image || '', points: (p.points || []).slice(0, o.length), labels: shuffle(o) };
  // (A grid's letters: upper case, without accents — but Ñ stays a letter of its own —, without spaces nor signs.)
  var cells = function (s) { return String(s).toUpperCase().normalize('NFD').replace(/N\u0303/g, '\u00d1').replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}]/gu, '').split(''); };
  if (p.kind === 'crossword') {
    // Longest first; each next word where it crosses the most letters already placed, keeping the grid compact (no
    // letters side by side that would make a word nobody asked for). A word that crosses none goes apart, after a gap.
    var ws = o.map(function (l, i) { var x = split(l); return { i: i, c: cells(x[0]), clue: x[1] }; }).filter(function (w) { return w.c.length; });
    var G, box, put, at = function (x, y) { return G[x + ',' + y]; };
    var fits = function (w, x, y, d) {
      var dx = d ? 0 : 1, dy = d ? 1 : 0, n = w.c.length, cross = 0;
      if (at(x - dx, y - dy) || at(x + dx * n, y + dy * n)) return -1;
      for (var k = 0; k < n; k++) { var cx = x + dx * k, cy = y + dy * k, g = at(cx, cy);
        if (g) { if (g.ch !== w.c[k] || g['d' + d]) return -1; cross++; }
        else if (at(cx + dy, cy + dx) || at(cx - dy, cy - dx)) return -1; }
      return cross;
    };
    var place = function (w, x, y, d) {
      for (var k = 0; k < w.c.length; k++) { var cx = x + (d ? 0 : k), cy = y + (d ? k : 0), key = cx + ',' + cy, g = G[key] || (G[key] = { ch: w.c[k] }); g['d' + d] = 1; }
      box = put.length ? [Math.min(box[0], x), Math.min(box[1], y), Math.max(box[2], x + (d ? 0 : w.c.length - 1)), Math.max(box[3], y + (d ? w.c.length - 1 : 0))] : [x, y, x + (d ? 0 : w.c.length - 1), y + (d ? w.c.length - 1 : 0)];
      put.push({ w: w, x: x, y: y, d: d });
    };
    var best = function (w) {
      var top = null;
      for (var key in G) { var g = G[key], xy = key.split(','), gx = +xy[0], gy = +xy[1];
        for (var d = 0; d < 2; d++) { if (g['d' + d]) continue;
          for (var k = 0; k < w.c.length; k++) { if (w.c[k] !== g.ch) continue;
            var x = gx - (d ? 0 : k), y = gy - (d ? k : 0), cr = fits(w, x, y, d); if (cr < 1) continue;
            var x2 = x + (d ? 0 : w.c.length - 1), y2 = y + (d ? w.c.length - 1 : 0), bw = Math.max(box[2], x2) - Math.min(box[0], x) + 1, bh = Math.max(box[3], y2) - Math.min(box[1], y) + 1;
            var sc = cr * 1000 - bw * bh - Math.abs(bw - bh) * 4 + rnd();
            if (!top || sc > top.sc) top = { sc: sc, x: x, y: y, d: d }; } } }
      return top;
    };
    // (Several tries, each starting from another of the longest words: the one with fewest words apart, then the smallest.)
    var keep = null;
    for (var tr = 0; tr < 8; tr++) {
      G = {}; box = [0, 0, -1, -1]; put = [];
      var left = shuffle(ws).sort(function (a, b) { return b.c.length - a.c.length; }), moved = true;
      if (tr) left.unshift(left.splice(Math.floor(rnd() * Math.min(3, left.length)), 1)[0]);
      if (left.length) place(left.shift(), 0, 0, 0);
      while (left.length && moved) { moved = false; left = left.filter(function (w) { var b = best(w); if (!b) return true; place(w, b.x, b.y, b.d); moved = true; return false; }); }
      var apart = left.length, area = (box[2] - box[0] + 1) * (box[3] - box[1] + 1);
      left.forEach(function (w) { var wide = box[2] - box[0] >= box[3] - box[1]; if (wide) place(w, box[0], box[3] + 2, 0); else place(w, box[2] + 2, box[1], 1); });
      if (!keep || apart < keep.apart || (apart === keep.apart && area < keep.area)) keep = { apart: apart, area: area, put: put, box: box };
      if (ws.length < 2) break;
    }
    put = keep.put; box = keep.box;
    // Numbered as in the papers: each start of a word, row by row; across and down from one square share its number.
    var starts = [], num = {};
    put.forEach(function (q) { var key = q.x + ',' + q.y; if (!(key in num)) { num[key] = 0; starts.push([q.y, q.x, key]); } });
    starts.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; }).forEach(function (s, k) { num[s[2]] = k + 1; });
    var words = put.map(function (q) { var x = { n: num[q.x + ',' + q.y], x: q.x - box[0], y: q.y - box[1], d: q.d, len: q.w.c.length, clue: q.w.clue, i: q.w.i }; if (full) x.word = q.w.c.join(''); return x; })
      .sort(function (a, b) { return a.d - b.d || a.n - b.n; });
    return { w: put.length ? box[2] - box[0] + 1 : 0, h: put.length ? box[3] - box[1] + 1 : 0, words: words };
  }
  if (p.kind === 'wordsearch') {
    // A square just big enough, the words across, down and on both diagonals (always read forwards: young pupils
    // find them), sharing a letter where they can; the rest filled with letters of the same words, so no odd letter
    // gives a word away. If they don't fit, one square larger.
    var its = o.map(function (l, i) { var x = split(l); return { i: i, c: cells(x[0]), t: x[1] || x[0], h: !!x[1] }; });
    var total = 0, longest = 0, pool = [], D = [[1, 0], [0, 1], [1, 1], [1, -1]];
    its.forEach(function (w) { total += w.c.length; longest = Math.max(longest, w.c.length); pool = pool.concat(w.c); });
    if (!pool.length) pool = 'ABCDEFGHIJLMNOPRSTUV'.split('');
    var size = Math.max(longest, Math.ceil(Math.sqrt(total * 1.9)), 5), grid, pos;
    for (var tries = 0; tries < 30; tries++, size++) {
      grid = []; pos = []; for (var c = 0; c < size * size; c++) grid.push('');
      var ok = its.slice().sort(function (a, b) { return b.c.length - a.c.length; }).every(function (w) {
        var n = w.c.length; if (!n) return true;
        for (var t = 0; t < 200; t++) { var dd = D[Math.floor(rnd() * D.length)], free = size - n + 1;
          var x = Math.floor(rnd() * (dd[0] ? free : size)), y = dd[1] > 0 ? Math.floor(rnd() * free) : dd[1] < 0 ? n - 1 + Math.floor(rnd() * free) : Math.floor(rnd() * size);
          var fine = true; for (var k = 0; k < n && fine; k++) { var v = grid[(y + dd[1] * k) * size + x + dd[0] * k]; fine = !v || v === w.c[k]; }
          if (!fine) continue;
          for (k = 0; k < n; k++) grid[(y + dd[1] * k) * size + x + dd[0] * k] = w.c[k];
          pos[w.i] = [x, y, x + dd[0] * (n - 1), y + dd[1] * (n - 1)]; return true; }
        return false; });
      if (ok) break;
    }
    for (c = 0; c < grid.length; c++) if (!grid[c]) grid[c] = pool[Math.floor(rnd() * pool.length)];
    var ws2 = { w: size, h: size, grid: grid, list: its.map(function (w) { return w.h ? { t: w.t, h: 1 } : { t: w.t }; }) };
    if (full) ws2.pos = pos;
    return ws2;
  }
  // (Each card knows its pair, k, and which side it is, b: the phone plays alone. Nothing to hide here.)
  if (p.kind === 'memory') { var cards = []; o.forEach(function (l, i) { var x = split(l); cards.push({ t: x[0], k: i }, { t: x[1], k: i, b: 1 }); }); return { cards: shuffle(cards), n: o.length }; }
  if (p.kind === 'sort') { var cats = [], items = [];
    o.forEach(function (l) { var c = String(l).split(':'); cats.push(c[0].trim()); c.slice(1).join(':').split(/[,;]/).forEach(function (it) { if (it.trim()) items.push({ t: it.trim(), i: items.length }); }); });
    return { cats: cats, items: shuffle(items) }; }
  return null;
}
// One answer to any graded poll, as a share right (0..1): a quiz's option index,
// or an activity's list of texts. null if the poll isn't graded.
export function gradeAnswer(p, a) {
  if (p.kind === 'quiz') return (p.correct || [0]).indexOf(+a) >= 0 && a !== null && a !== '' ? 1 : 0;
  if (['order', 'match', 'gaps', 'label', 'sort', 'crossword', 'wordsearch', 'memory'].indexOf(p.kind) >= 0) return gradeActivity(p, a).score;
  return null;
}
