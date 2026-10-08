// Marking the activities and quizzes of a presentation. No imports and no outer
// variables: the functions are also embedded in exported presentations and used
// by the server (server/cloudflare/lti.js), which marks self-paced answers.
// Activities with right answers, answered from the phone (none of the answers
// reach it): put in order, match pairs, fill in the gaps, label a picture.
// Each answer is a list of texts; each item right or wrong, and the score is
// the share right (1000 points for all of them). Self-contained, like tallyVotes.
//   order  options: the items in the right order
//   match  options: "left = right" lines
//   gaps   text: "The capital of France is [Paris]" ([a|b]: either is right)
//   label  options: the labels; points: [{ x, y }] in % of image, one per label
//   sort   options: "Category: item, item, item" lines (sort into groups: AhaSlides', Lumio's Super Sort); the answer
//          has each item's category, in the items' own order (the phone shows them shuffled, knowing each one's place)
export var ACTIVITIES = ['order', 'match', 'gaps', 'label', 'sort'];
export function gradeActivity(p, a) {
  var norm = function (s) { return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); };
  var o = p.options || [], per = [];
  a = Array.isArray(a) ? a : [];
  if (p.kind === 'order' || p.kind === 'label') per = o.map(function (x, i) { return norm(a[i]) !== '' && norm(a[i]) === norm(x); });
  else if (p.kind === 'match') per = o.map(function (l, i) { var r = String(l).split('=').slice(1).join('='); return norm(a[i]) !== '' && norm(a[i]) === norm(r); });
  else if (p.kind === 'sort') o.forEach(function (l) { var c = String(l).split(':'), cat = norm(c[0]);
    c.slice(1).join(':').split(/[,;]/).forEach(function (it) { if (!it.trim()) return; var got = norm(a[per.length]); per.push(got !== '' && got === cat); }); });
  else if (p.kind === 'gaps') { var re = /\[([^\]]+)\]/g, m, i = 0; while ((m = re.exec(String(p.text || '')))) { var got = norm(a[i++]); per.push(got !== '' && m[1].split('|').some(function (alt) { return norm(alt) === got; })); } }
  var ok = per.filter(Boolean).length;
  return { per: per, score: per.length ? ok / per.length : 0 };
}
// What the phones get: the items shuffled (the same way every time), never the answers.
export function publicActivity(p) {
  var seed = 7, id = String(p.pollId || ''), o = p.options || [];
  for (var i = 0; i < id.length; i++) seed = (seed * 31 + id.charCodeAt(i)) >>> 0;
  var rnd = function () { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; };
  var shuffle = function (arr) { var a = arr.slice(); for (var k = a.length - 1; k > 0; k--) { var j = Math.floor(rnd() * (k + 1)), t = a[k]; a[k] = a[j]; a[j] = t; } return a; };
  var split = function (l) { var x = String(l).split('='); return [x[0].trim(), x.slice(1).join('=').trim()]; };
  if (p.kind === 'order') { var s = shuffle(o); if (o.length > 1 && s.join('\u0001') === o.join('\u0001')) s.push(s.shift()); return { items: s }; }
  if (p.kind === 'match') { var pr = o.map(split); return { left: pr.map(function (x) { return x[0]; }), right: shuffle(pr.map(function (x) { return x[1]; })) }; }
  if (p.kind === 'gaps') { var parts = [], last = 0, t = String(p.text || ''), re = /\[([^\]]+)\]/g, m; while ((m = re.exec(t))) { parts.push(t.slice(last, m.index), null); last = re.lastIndex; } parts.push(t.slice(last)); return { parts: parts }; }
  if (p.kind === 'label') return { image: p.image || '', points: (p.points || []).slice(0, o.length), labels: shuffle(o) };
  if (p.kind === 'sort') { var cats = [], items = [];
    o.forEach(function (l) { var c = String(l).split(':'); cats.push(c[0].trim()); c.slice(1).join(':').split(/[,;]/).forEach(function (it) { if (it.trim()) items.push({ t: it.trim(), i: items.length }); }); });
    return { cats: cats, items: shuffle(items) }; }
  return null;
}
// One answer to any graded poll, as a share right (0..1): a quiz's option index,
// or an activity's list of texts. null if the poll isn't graded.
export function gradeAnswer(p, a) {
  if (p.kind === 'quiz') return (p.correct || [0]).indexOf(+a) >= 0 && a !== null && a !== '' ? 1 : 0;
  if (p.kind === 'order' || p.kind === 'match' || p.kind === 'gaps' || p.kind === 'label' || p.kind === 'sort') return gradeActivity(p, a).score;
  return null;
}
