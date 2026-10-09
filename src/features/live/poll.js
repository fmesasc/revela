// Live audience polls (Mentimeter/Slido style, PowerPoint "Forms", Google
// Slides Q&A): a poll object on a slide shows a QR code while presenting; the
// audience votes from their phones (vote.html) and the results update live.
//
// Transport: WebRTC data channels via PeerJS's public broker, like the phone
// remote — the presentation hosts a peer "revela-vote-CODE"; no server of ours.
// Votes stay in the presenter's browser (and in its localStorage, so the
// editor can show and export the last results).
//
// tallyVotes() and pollResultsHTML() are self-contained (no imports, no outer
// variables) because their source is also embedded in the exported HTML.

import { esc } from '../../core/text.js';
import { state, commit, currentSlide } from '../../core/store.js';
import { uid } from '../../core/model.js';
import { t } from '../../i18n/index.js';
import { OFFICIAL_SITE } from '../../core/config.js';

// Absolute (an exported .html opened from a file works too) and on the official site in every edition, so the QR
// and the address shown to the class are short and recognisable. (/app/vote: Pages' clean URL, no redirect.)
export const VOTE_URL = `${OFFICIAL_SITE}/app/vote`;

export function pollBlock(props = {}) {
  return { id: uid(), type: 'poll', pollId: uid(), kind: 'choice', display: 'bar', question: '¿Qué opción prefieres?',
    options: ['Opción A', 'Opción B', 'Opción C'], x: 80, y: 60, w: 1120, h: 600, rotation: 0, animation: null, ...props };
}
export function addPoll(props) {
  const b = pollBlock(props);
  commit(() => { currentSlide().blocks.push(b); state.ui.selection = b.id; state.ui.multi = [b.id]; });
  return b;
}
// A poll inserted and then cancelled: gone, as if it hadn't been inserted (its insertion undone).
export function removePoll(id) {
  const s = currentSlide(); if (!s?.blocks.some(x => x.id === id)) return;
  commit(() => { s.blocks = s.blocks.filter(x => x.id !== id); if (state.ui.selection === id) state.ui.selection = null; state.ui.multi = (state.ui.multi || []).filter(x => x !== id); });
}
export function setPoll(id, props) {
  const b = currentSlide().blocks.find(x => x.id === id && x.type === 'poll'); if (!b) return;
  commit(() => { Object.assign(b, props); for (const k in props) if (props[k] == null) delete b[k]; });   // (null: back to the default — the palette's colour)
}

// votes: { voterId: answer } where answer is an option index, an array of
// indices (multi), a number 1-5 (rating) or a string (word). → counts.
// A quiz (Kahoot style): votes { voter: { a: option, t: ms after it started, n: nickname } };
// right answers score 500 to 1000 points, more the faster; wrong ones 0.
// Activities with right answers (put in order, match, fill in the gaps, label a
// picture): marking and what the phones get, in grading.js (the server marks too).
import { ACTIVITIES, gradeActivity, publicActivity, gradeAnswer } from './grading.js';
export { ACTIVITIES, gradeActivity, publicActivity, gradeAnswer };
// (poll.clean: rude words shown masked, «m****», in the questions, the word cloud and the open answers — whoever and
// however they came: live, by a link, kept. A short list of the common ones in the site's languages: whole words, or the
// start of one when it can't be the start of a harmless word.)
export function tallyVotes(poll, votes) {
  var kind = poll.kind || 'choice', n = (poll.options || []).length, counts = [], words = {}, sum = 0, voters = 0;
  var tame = function (s) { s = String(s); if (!poll.clean) return s;
    return s.replace(/[\p{L}\p{M}]+/gu, function (w) { var k = w.toLowerCase().normalize('NFD').replace(/[\u0300-\u0302\u0304-\u036f]/g, '').normalize('NFC');
      return /^(?:putain|puttan|gilipoll|cabron|mierd|merd[ae]|jod(?:er|id)|foll(?:ar|ad)|maric[oó]n|imbecil|pendej|ching[aá]|coño|fuck|shit|bitch|cunt|asshole|bastard|motherf|dickhead|bollock|slut|whore|connard|connass|salope|encul|batard|scheiss|scheiß|arschloch|fotze|wichser|hurensohn|ficken|cazz[oi]|vaffancul|stronz|minchia|coglion|caralh|fod[ae]|buceta|viado|klootzak|godverd)/.test(k)
        || /^(?:put[ao]s?|wank(?:er|ers|ing)?|polla|pollas|pute|putes|nique|niquer|fick|fag|fags|faggot|nigg(?:er|a)s?|kut|lul|hoer|hoeren)$/.test(k) ? w.charAt(0) + w.slice(1).replace(/./gu, '*') : w; }); };
  if (kind === 'order' || kind === 'match' || kind === 'gaps' || kind === 'label' || kind === 'sort') {
    var items = null, total = 0, list = [];
    for (var w in votes) { var vv = votes[w]; if (!vv || !vv.a) continue; var g = gradeActivity(poll, vv.a); voters++; total += g.score;
      if (!items) items = g.per.map(function () { return 0; });
      g.per.forEach(function (ok, i) { if (ok) items[i]++; });
      list.push({ id: w, n: vv.n || '', pts: Math.round(1000 * g.score), ok: g.score === 1 }); }
    list.sort(function (a, b) { return b.pts - a.pts; });
    return { counts: items || [], words: {}, voters: voters, average: voters ? total / voters : 0, board: list };
  }
  if (kind === 'quiz') {
    var right = poll.correct || [], lim = (+poll.time || 20) * 1000, board = [];
    for (var i0 = 0; i0 < n; i0++) counts.push(0);
    // (Modes, as Kahoot's: speed — sooner, more points —, accuracy — right is right, whenever —, and confidence — sure
    // and right scores most, sure and wrong loses some.)
    var mode = poll.mode || 'speed';
    for (var who in votes) { var v = votes[who]; if (!v || !(v.a >= 0 && v.a < n)) continue; voters++; counts[v.a]++;
      var ok = right.indexOf(v.a) >= 0, pts = mode === 'accuracy' ? (ok ? 1000 : 0) : mode === 'confidence' ? (ok ? (v.s ? 1000 : 600) : (v.s ? -300 : 0))
        : ok ? Math.round(500 + 500 * Math.max(0, 1 - (+v.t || 0) / (lim * (+v.x > 1 ? +v.x : 1)))) : 0;   // (v.x: extra time, an accommodation)
      board.push({ id: who, n: v.n || '', pts: pts, ok: ok }); }
    board.sort(function (a, b) { return b.pts - a.pts; });
    return { counts: counts, words: {}, voters: voters, average: 0, board: board };
  }
  if (kind === 'qa') {                      // audience questions: { 'q:id': { t: text, up: { voter: 1 } } }
    // (poll.moderate: a question waits, «hold», until the presenter approves it — not shown nor counted till then.)
    var qs = [], people = {}, pending = 0;
    for (var id in votes) { var q = votes[id]; if (!q || !q.t) continue; if (q.hold) { pending++; continue; } var ups = Object.keys(q.up || {});
      ups.forEach(function (v) { people[v] = 1; }); if (q.by) people[q.by] = 1;
      qs.push({ id: id, text: tame(q.t), up: ups.length, time: q.time || 0 }); }
    qs.sort(function (a, b) { return b.up - a.up || a.time - b.time; });
    return { counts: [], words: {}, voters: Object.keys(people).length, average: 0, questions: qs, pending: pending };
  }
  // Open answers (a wall), a number guessed (its spread), a point on a picture, a preference order (Borda count).
  if (kind === 'open') {
    var texts = [];
    for (var o in votes) { var tx = votes[o]; if (tx && tx.t) { voters++; texts.push({ text: tame(tx.t), time: tx.time || 0 }); } }
    texts.sort(function (a, b) { return b.time - a.time; });
    return { counts: [], words: {}, voters: voters, average: 0, texts: texts };
  }
  if (kind === 'draw' || kind === 'photo') {           // (drawings and photos: pictures on a wall, the newest first)
    var pics = [];
    for (var dk in votes) { var dv = votes[dk]; if (dv && /^data:image\/(png|jpeg|webp);base64,/.test(dv.img || '')) { voters++; pics.push({ img: dv.img, time: dv.time || 0, n: dv.n || '' }); } }
    pics.sort(function (a, b) { return b.time - a.time; });
    return { counts: [], words: {}, voters: voters, average: 0, pics: pics };
  }
  if (kind === 'number') {
    var vals = [];
    for (var nk in votes) { var nv = +votes[nk]; if (isFinite(nv)) vals.push(nv); }
    vals.sort(function (a, b) { return a - b; });
    var lo = isFinite(+poll.min) ? +poll.min : (vals[0] || 0), hi = isFinite(+poll.max) ? +poll.max : (vals[vals.length - 1] || 1), bins = [];
    for (var bi = 0; bi < 10; bi++) bins.push(0);
    vals.forEach(function (v) { bins[Math.max(0, Math.min(9, Math.floor((v - lo) / ((hi - lo) || 1) * 10)))]++; });
    var mid = vals.length ? (vals.length % 2 ? vals[(vals.length - 1) / 2] : (vals[vals.length / 2 - 1] + vals[vals.length / 2]) / 2) : 0;
    return { counts: bins, words: {}, voters: vals.length, average: vals.length ? vals.reduce(function (a, b) { return a + b; }, 0) / vals.length : 0, median: mid, min: lo, max: hi };
  }
  if (kind === 'point') {
    var pts = [];
    for (var pk in votes) { var pv = votes[pk]; if (pv && isFinite(+pv.x) && isFinite(+pv.y)) pts.push({ x: +pv.x, y: +pv.y }); }
    return { counts: [], words: {}, voters: pts.length, average: 0, points: pts };
  }
  if (kind === 'rank') {
    for (var ri = 0; ri < n; ri++) counts.push(0);
    for (var rk in votes) { var order = votes[rk]; if (!Array.isArray(order)) continue; voters++;
      order.forEach(function (x, pos) { if (x >= 0 && x < n) counts[x] += n - pos; }); }
    return { counts: counts, words: {}, voters: voters, average: 0 };
  }
  if (kind === 'rating') n = 5;
  for (var i = 0; i < n; i++) counts.push(0);
  for (var k in votes) {
    var a = votes[k]; voters++;
    if (kind === 'word') {
      tame(String(a || '').toLowerCase()).split(/[,;]/).forEach(function (w) { w = w.trim().slice(0, 30); if (w) words[w] = (words[w] || 0) + 1; });
    } else if (kind === 'multi') {
      (Array.isArray(a) ? a : [a]).forEach(function (x) { if (x >= 0 && x < n) counts[x]++; });
    } else if (kind === 'rating') {
      var r = Math.round(+a); if (r >= 1 && r <= 5) { counts[r - 1]++; sum += r; }
    } else if (a >= 0 && a < n) counts[a]++;
  }
  return { counts: counts, words: words, voters: voters, average: kind === 'rating' && voters ? sum / voters : 0 };
}

// Every quiz of the presentation added up, per person (a leaderboard): [{ id, n, pts }] best first.
export function quizTotals(list) {
  var tot = {};
  list.forEach(function (x) { (tallyVotes(x.poll, x.votes).board || []).forEach(function (r) {
    var t = tot[r.id] || (tot[r.id] = { id: r.id, n: '', pts: 0 }); t.pts += r.pts; if (r.n) t.n = r.n; }); });
  return Object.keys(tot).map(function (k) { return tot[k]; }).sort(function (a, b) { return b.pts - a.pts; });
}

// HTML (inline styles) for the results area. accent: colours to use. L: its words in the interface's
// language ({ Spanish: translation }, pollLabels(); none: Spanish).
export function pollResultsHTML(poll, res, accent, L) {
  var T = function (s) { return (L && L[s]) || s; };
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  var cols = accent && accent.length ? accent : ['#3f6497', '#e0873b', '#4caf7d', '#c94f4f', '#8e6cc9', '#3bb3c3'];
  var kind = poll.kind || 'choice', display = poll.display || 'bar';
  var labels = kind === 'rating' ? ['1', '2', '3', '4', '5'] : (poll.options || []);
  var counts = res.counts || [], total = counts.reduce(function (a, b) { return a + b; }, 0), max = Math.max.apply(null, counts.concat([1]));
  var foot = '<div style="margin-top:.6em;font-size:.55em;opacity:.7">' + res.voters + ' ' + T(res.voters === 1 ? 'voto' : 'votos') + '</div>';
  var nick = function (r, i) { return esc(r.n || (T('Jugador') + ' ' + (i + 1))); };
  var ranking = function (list, top) { return '<ol style="margin:.4em 0 0;padding:0;list-style:none;text-align:left;font-size:.6em">' + list.slice(0, top).map(function (r, i) {
    return '<li style="margin:.15em 0"><b>' + (['🥇 ', '🥈 ', '🥉 '][i] || (i + 1) + '. ') + '</b>' + nick(r, i) + ' — <b>' + r.pts + '</b></li>'; }).join('') + '</ol>'; };
  if (kind === 'board') {
    var bl = res.board || [], st = res.stars || {};
    // (By teams, when they play so: each team's average, so a big team doesn't win for being big.)
    var tb = (res.teams || []).length ? '<ol style="margin:0 0 .5em;padding:0;list-style:none;font-size:.85em">' + res.teams.map(function (x, i) {
      return '<li style="margin:.1em 0;padding:.15em .4em;border-radius:.3em;background:' + cols[i % cols.length] + ';color:#fff"><b>' + (['🥇 ', '🥈 ', '🥉 '][i] || (i + 1) + '. ') + esc(x.team) + '</b> — ' + x.pts + ' <small>(' + x.n + ')</small></li>'; }).join('') + '</ol>' : '';
    var withStars = bl.map(function (r) { var s = st[r.id]; return s ? { id: r.id, n: (r.n || '') + ' ⭐' + s.stars + ' · ' + T('Nivel') + ' ' + s.level, pts: r.pts } : r; });
    return bl.length ? tb + ranking(withStars, 10).replace('font-size:.6em', 'font-size:.8em') : '<div style="opacity:.6">' + T('Aún no hay puntos: juega los cuestionarios.') + '</div>';
  }
  if (kind === 'quiz') {
    var right = poll.correct || [], tiles = ['#e21b3c', '#1368ce', '#d89e00', '#26890c', '#864cbf', '#0aa3a3'];
    if (!res.revealed) return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.4em;font-size:.7em">' + labels.map(function (l, i) {
      return '<div style="padding:.5em .6em;border-radius:.3em;background:' + tiles[i % tiles.length] + ';color:#fff;font-weight:700">' + esc(l) + (res.showRight && right.indexOf(i) >= 0 ? ' ✓' : '') + '</div>'; }).join('') + '</div>'
      + '<div style="display:flex;justify-content:space-between;margin-top:.6em;font-size:.6em;opacity:.85"><span>' + res.voters + ' ' + T(res.voters === 1 ? 'respuesta' : 'respuestas') + '</span>'
      + (res.left != null ? '<b style="font-size:1.6em">' + Math.max(0, Math.ceil(res.left)) + ' s</b>' : '') + '</div>';
    return '<div style="display:flex;flex-direction:column;justify-content:center;gap:.4em;min-height:80%">' + labels.map(function (l, i) { var ok = right.indexOf(i) >= 0;
      return '<div style="display:flex;align-items:center;gap:.5em;font-size:.7em;opacity:' + (ok ? 1 : .55) + '"><div style="flex:0 1 40%;min-width:22%;text-align:right;overflow-wrap:anywhere;line-height:1.15">' + (ok ? '✓ ' : '') + esc(l) + '</div>'
        + '<div style="flex:1;background:#8882;border-radius:.2em;height:1.3em"><div style="height:100%;width:' + (counts[i] * 100 / max) + '%;background:' + (ok ? '#26890c' : tiles[i % tiles.length]) + ';border-radius:.2em"></div></div>'
        + '<div style="flex:0 0 2em;font-weight:700">' + counts[i] + '</div></div>'; }).join('') + '</div>' + ((res.board || []).length ? ranking(res.board, 5) : '');
  }
  if (kind === 'order' || kind === 'match' || kind === 'gaps' || kind === 'label' || kind === 'sort') {
    var gl = kind === 'order' ? labels.map(function (l, i) { return (i + 1) + '. ' + l; })
      : kind === 'match' ? labels.map(function (l) { var x = String(l).split('='); return x[0].trim() + ' → ' + x.slice(1).join('=').trim(); })
      : kind === 'label' ? labels.map(function (l, i) { return (i + 1) + '. ' + l; })
      : kind === 'sort' ? [].concat.apply([], labels.map(function (l) { var c = String(l).split(':'); return c.slice(1).join(':').split(/[,;]/).filter(function (x) { return x.trim(); }).map(function (x) { return x.trim() + ' → ' + c[0].trim(); }); }))
      : (String(poll.text || '').match(/\[([^\]]+)\]/g) || []).map(function (g, i) { return (i + 1) + '. ' + g.slice(1, -1).split('|')[0]; });
    var avg = Math.round((res.average || 0) * 100), nv = res.voters || 0;
    var pic = kind === 'label' && poll.image ? '<div style="position:relative;flex:0 0 58%;align-self:center"><img src="' + esc(poll.image) + '" alt="" style="width:100%;display:block;border-radius:.2em">'
      + (poll.points || []).map(function (pt, i) { return '<b style="position:absolute;left:' + pt.x + '%;top:' + pt.y + '%;transform:translate(-50%,-50%);background:' + cols[0] + ';color:#fff;border-radius:1em;padding:0 .35em;font-size:.55em;white-space:nowrap">'
        + (i + 1) + (res.revealed ? ' ' + esc(labels[i] || '') : '') + '</b>'; }).join('') + '</div>' : '';
    // (The solutions fill the box's height, centred; long ones in two lines rather than cut with «…».)
    var body = !res.revealed
      ? '<div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:100%;gap:.2em"><div style="font-size:2.2em;font-weight:800">' + nv + '</div><div style="font-size:.6em;opacity:.8">'
        + T(nv === 1 ? 'respuesta' : 'respuestas') + (nv ? ' · ' + avg + ' ' + T('% de aciertos') : '') + '</div><div style="font-size:.45em;opacity:.6;margin-top:.4em">' + T('Clic para ver las soluciones') + '</div></div>'
      : '<div style="display:flex;flex-direction:column;justify-content:center;gap:.35em;min-height:80%">' + gl.map(function (l, i) { var pc = nv ? Math.round((counts[i] || 0) * 100 / nv) : 0;
          return '<div style="display:flex;align-items:center;gap:.5em;font-size:.7em"><div style="flex:0 1 55%;min-width:30%;overflow-wrap:anywhere;line-height:1.15">' + esc(l) + '</div>'
            + '<div style="flex:1;background:#8882;border-radius:.2em;height:1.2em"><div style="height:100%;width:' + pc + '%;background:#26890c;border-radius:.2em"></div></div><div style="flex:0 0 3em;font-weight:700">' + pc + ' %</div></div>'; }).join('')
        + '</div><div style="margin-top:.4em;font-size:.55em;opacity:.8">' + nv + ' ' + T(nv === 1 ? 'respuesta' : 'respuestas') + ' · ' + avg + ' ' + T('% de aciertos') + '</div>' + ((res.board || []).length ? ranking(res.board, 3) : '');
    return pic ? '<div style="display:flex;gap:.8em;height:100%">' + pic + '<div style="flex:1;min-width:0">' + body + '</div></div>' : body;
  }
  if (kind === 'qa') {
    var list = (res.questions || []).slice(0, 8);
    return '<div style="display:flex;flex-direction:column;gap:.3em;font-size:.7em">' + (list.length ? list.map(function (q, i) {
      return '<div style="display:flex;gap:.6em;align-items:center;padding:.3em .5em;border-radius:.3em;background:' + (i ? '#8882' : cols[0]) + (i ? '' : ';color:#fff') + '">'
        + '<b style="flex:0 0 2.2em;text-align:center">▲ ' + q.up + '</b><span>' + esc(q.text) + '</span></div>';
    }).join('') : '<div style="opacity:.6">' + T('Escanea el QR y envía tu pregunta…') + '</div>') + '</div>'
      + '<div style="margin-top:.6em;font-size:.55em;opacity:.7">' + (res.questions || []).length + ' ' + T('preguntas') + (res.pending ? ' · ' + res.pending + ' ' + T('esperando aprobación') : '') + '</div>';
  }
  if (kind === 'open') {
    var tl = (res.texts || []).slice(0, 24);
    return '<div style="display:flex;flex-wrap:wrap;gap:.35em;align-content:flex-start;max-height:100%;overflow:hidden">' + (tl.length ? tl.map(function (x, i) {
      return '<div style="flex:1 1 30%;min-width:6em;padding:.35em .5em;border-radius:.3em;font-size:.55em;line-height:1.25;background:' + cols[i % cols.length] + ';color:#fff;overflow-wrap:anywhere">' + esc(x.text) + '</div>'; }).join('')
      : '<span style="opacity:.5;font-size:.7em">' + T('Las respuestas del público aparecerán aquí') + '</span>') + '</div>' + foot;
  }
  if (kind === 'draw' || kind === 'photo') {
    var pl = (res.pics || []).slice(0, 24), per = pl.length > 12 ? 6 : pl.length > 6 ? 4 : 3;
    return '<div style="display:grid;grid-template-columns:repeat(' + per + ',1fr);gap:.3em;align-content:start">' + (pl.length ? pl.map(function (x) {
      return '<figure style="margin:0;position:relative"><img src="' + esc(x.img) + '" alt="" style="width:100%;aspect-ratio:4/3;object-fit:' + (kind === 'draw' ? 'contain;background:#fff' : 'cover') + ';border-radius:.25em;display:block">'
        + (x.n ? '<figcaption style="position:absolute;left:.2em;bottom:.2em;font-size:.4em;background:#0009;color:#fff;padding:0 .3em;border-radius:.2em">' + esc(x.n) + '</figcaption>' : '') + '</figure>'; }).join('')
      : '<span style="opacity:.5;font-size:.7em;grid-column:1/-1">' + T('Las respuestas del público aparecerán aquí') + '</span>') + '</div>' + foot;
  }
  if (kind === 'number') {
    var nmax = Math.max.apply(null, (res.counts || []).concat([1])), fmt = function (v) { return (Math.round(v * 100) / 100).toLocaleString(); }, unit = poll.unit ? ' ' + esc(poll.unit) : '';
    var has = poll.answer !== undefined && poll.answer !== null && poll.answer !== '' && isFinite(+poll.answer);
    var pos = function (v) { return Math.max(0, Math.min(100, (v - res.min) / ((res.max - res.min) || 1) * 100)); };
    return '<div style="position:relative;display:flex;align-items:flex-end;gap:.15em;height:5em;padding-bottom:.2em;border-bottom:2px solid currentColor">' + (res.counts || []).map(function (c, i) {
        return '<div style="flex:1;height:' + (c ? Math.max(4, c * 100 / nmax) : 0) + '%;background:' + cols[0] + ';border-radius:.15em .15em 0 0"></div>'; }).join('')
      + (res.voters ? '<div style="position:absolute;bottom:-.3em;left:' + pos(res.average) + '%;height:5.6em;border-left:3px dashed ' + cols[1 % cols.length] + '"></div>' : '')
      + (has ? '<div style="position:absolute;bottom:-.3em;left:' + pos(+poll.answer) + '%;height:5.6em;border-left:3px solid #26890c"></div>' : '') + '</div>'
      + '<div style="display:flex;justify-content:space-between;font-size:.5em;opacity:.7"><span>' + fmt(res.min) + unit + '</span><span>' + fmt(res.max) + unit + '</span></div>'
      + '<div style="margin-top:.4em;font-size:.65em"><span style="color:' + cols[1 % cols.length] + '">▌</span> ' + T('Media') + ': <b>' + (res.voters ? fmt(res.average) + unit : '–') + '</b> · ' + T('Mediana') + ': <b>' + (res.voters ? fmt(res.median) + unit : '–') + '</b>'
      + (has ? ' · <span style="color:#26890c">▌</span> ' + T('Respuesta') + ': <b>' + fmt(+poll.answer) + unit + '</b>' : '') + '</div>' + foot;
  }
  if (kind === 'point') {
    return '<div style="position:relative;display:inline-block;max-width:100%;max-height:85%;align-self:center">' + (poll.image ? '<img src="' + esc(poll.image) + '" alt="" style="display:block;max-width:100%;max-height:100%;border-radius:.2em">' : '')
      + (res.points || []).map(function (q) { return '<span style="position:absolute;left:' + q.x + '%;top:' + q.y + '%;width:1.4em;height:1.4em;margin:-.7em 0 0 -.7em;border-radius:50%;background:' + cols[1 % cols.length] + ';opacity:.45;box-shadow:0 0 .6em ' + cols[1 % cols.length] + '"></span>'; }).join('') + '</div>' + foot;
  }
  if (kind === 'image') {
    var imgs = poll.images || [];
    return '<div style="display:grid;grid-template-columns:repeat(' + Math.min(4, Math.max(2, labels.length)) + ',1fr);gap:.4em;align-items:end">' + labels.map(function (l, i) {
      var pc = total ? Math.round(counts[i] * 100 / total) : 0;
      return '<div style="text-align:center;font-size:.55em">' + (imgs[i] ? '<img src="' + esc(imgs[i]) + '" alt="" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:.3em;display:block">' : '')
        + '<div style="height:.6em;background:#8882;border-radius:.2em;margin:.3em 0"><div style="height:100%;width:' + pc + '%;background:' + cols[i % cols.length] + ';border-radius:.2em"></div></div>'
        + '<b>' + pc + ' %</b> ' + esc(l) + '</div>'; }).join('') + '</div>' + foot;
  }
  if (kind === 'rank') {
    var order = labels.map(function (l, i) { return i; }).sort(function (a, b) { return counts[b] - counts[a]; }), rmax = Math.max.apply(null, counts.concat([1]));
    return '<div style="display:flex;flex-direction:column;justify-content:center;gap:.4em;min-height:80%">' + order.map(function (i, pos) {
      return '<div style="display:flex;align-items:center;gap:.5em;font-size:.7em"><b style="flex:0 0 1.6em;text-align:right">' + (pos + 1) + '.</b><div style="flex:0 1 40%;min-width:22%;overflow-wrap:anywhere;line-height:1.15">' + esc(labels[i]) + '</div>'
        + '<div style="flex:1;background:#8882;border-radius:.2em;height:1.3em"><div style="height:100%;width:' + (counts[i] * 100 / rmax) + '%;background:' + cols[i % cols.length] + ';border-radius:.2em;transition:width .5s"></div></div></div>'; }).join('') + '</div>' + foot;
  }
  if (kind === 'word') {
    var ws = Object.keys(res.words || {}).sort(function (a, b) { return res.words[b] - res.words[a]; }).slice(0, 40);
    var wmax = ws.length ? res.words[ws[0]] : 1;
    return '<div style="display:flex;flex-wrap:wrap;gap:.2em .6em;justify-content:center;align-items:center;height:100%;align-content:center">'
      + (ws.length ? ws.map(function (w, i) { return '<span style="font-size:' + (0.6 + 1.6 * res.words[w] / wmax).toFixed(2) + 'em;color:' + cols[i % cols.length] + ';font-weight:700;transition:font-size .4s">' + esc(w) + '</span>'; }).join('')
        : '<span style="opacity:.5;font-size:.7em">' + T('Las palabras del público aparecerán aquí') + '</span>') + '</div>' + foot;
  }
  if (kind === 'rating' && display === 'numbers') {
    return '<div style="text-align:center;font-size:3em;font-weight:800">' + (res.average ? res.average.toFixed(1) : '–') + '<span style="font-size:.35em;opacity:.7"> / 5</span></div>' + foot;
  }
  if (display === 'numbers') {
    return '<div style="display:flex;gap:.6em;justify-content:center;flex-wrap:wrap">' + labels.map(function (l, i) {
      var pc = total ? Math.round(counts[i] * 100 / total) : 0;
      return '<div style="flex:1;min-width:4em;text-align:center;padding:.4em;border-radius:.3em;background:' + cols[i % cols.length] + ';color:#fff">'
        + '<div style="font-size:1.8em;font-weight:800">' + pc + '%</div><div style="font-size:.6em">' + esc(l) + '</div></div>';
    }).join('') + '</div>' + foot;
  }
  if (display === 'pie') {
    var acc = 0, stops = total ? counts.map(function (c, i) { var a = acc; acc += c * 360 / total; return cols[i % cols.length] + ' ' + a + 'deg ' + acc + 'deg'; }).join(',') : '#8884 0deg 360deg';
    return '<div style="display:flex;align-items:center;gap:1em;height:100%"><div style="flex:0 0 auto;width:8em;height:8em;border-radius:50%;background:conic-gradient(' + stops + ')"></div>'
      + '<div style="font-size:.7em">' + labels.map(function (l, i) { return '<div><span style="display:inline-block;width:.8em;height:.8em;background:' + cols[i % cols.length] + ';margin-right:.4em"></span>' + esc(l) + ' — ' + (total ? Math.round(counts[i] * 100 / total) : 0) + '%</div>'; }).join('') + '</div></div>' + foot;
  }
  return '<div style="display:flex;flex-direction:column;justify-content:center;gap:.5em;min-height:80%">' + labels.map(function (l, i) {
    return '<div style="display:flex;align-items:center;gap:.5em;font-size:.75em"><div style="flex:0 1 40%;min-width:22%;text-align:right;overflow-wrap:anywhere;line-height:1.15">' + esc(l) + '</div>'
      + '<div style="flex:1;background:#8882;border-radius:.2em;height:1.5em"><div style="height:100%;width:' + (counts[i] * 100 / max) + '%;background:' + cols[i % cols.length] + ';border-radius:.2em;transition:width .5s"></div></div>'
      + '<div style="flex:0 0 3em;font-weight:700">' + counts[i] + '</div></div>';
  }).join('') + '</div>' + foot;
}

// The results' words in the interface's language (for pollResultsHTML, also in exported pages).
const POLL_WORDS = ['La IA está corrigiendo…', 'Para corregir con IA, conéctala en el editor.', 'No se pudo corregir.', 'Nivel', '¿A quién le toca?', 'Clic para cerrar · N para otra vez', 'Aún no hay nadie con nombre: que lo escriban al entrar en la votación.', 'Las palabras del público aparecerán aquí', 'Las respuestas del público aparecerán aquí', 'Media', 'Mediana', 'Respuesta', 'voto', 'votos', 'respuesta', 'respuestas', 'Jugador', 'Aún no hay puntos: juega los cuestionarios.', '% de aciertos', 'Clic para ver las soluciones', 'Escanea el QR y envía tu pregunta…', 'preguntas', 'esperando aprobación', 'Aprobar', 'Ocultar', 'Descartar', 'Aún no hay preguntas.', 'Moderar las preguntas', 'Las nuevas esperan aquí a que las apruebes; en la pantalla solo se ve cuántas esperan.'];
export const pollLabels = () => Object.fromEntries(POLL_WORDS.map(w => [w, t(w)]));

// Markup of a poll in the editor and thumbnails: question, current results
// (last saved votes) and a QR placeholder (the real code exists only while presenting).
export const GRADED = ['quiz', ...ACTIVITIES];
export function pollEditorHTML(b, accents) {
  const res = b.kind === 'board' ? { board: quizTotals(state.deck.slides.flatMap(s => s.blocks).filter(x => x.type === 'poll' && GRADED.includes(x.kind)).map(p => ({ poll: p, votes: savedVotes(p.pollId) }))) }
    : (r => ({ ...r, showRight: true, revealed: (b.kind === 'quiz' && r.voters > 0) || ACTIVITIES.includes(b.kind) }))(tallyVotes(b, savedVotes(b.pollId)));
  return `<div style="width:100%;height:100%;display:grid;grid-template-columns:1fr auto;gap:1em;font-size:${b.fontSize || 32}px${/^#[0-9a-f]{3,8}$/i.test(b.color || '') ? ';color:' + b.color : ''}">`
    + `<div style="display:flex;flex-direction:column;min-width:0"><div style="font-weight:700;margin-bottom:.5em">${esc(b.question || '')}</div>`
    + `<div style="flex:1;min-height:0;display:flex;flex-direction:column;justify-content:center">${pollResultsHTML(b, res, accents, pollLabels())}</div></div>`
    + `<div style="align-self:center;text-align:center;font-size:18px"><div style="width:220px;height:220px;border-radius:8px;background:#fff;color:#223;display:grid;place-items:center">`
    + `<div><div style="font-size:64px;line-height:1">▦</div><div>QR</div></div></div><div style="margin-top:6px;opacity:.8">vote.html</div></div></div>`;
}

// Results saved by the presentation (same origin) for the editor.
// Answers given by a link (kept in the cloud) brought in with the rest: each voter as 'w:<id>', so they add up with
// those of the live sessions and don't overwrite them. → how many.
export function mergeVotes(pollId, votes) {
  const all = savedVotes(pollId); let n = 0;
  for (const [k, v] of Object.entries(votes || {})) { all['w:' + k] = v; n++; }
  try { localStorage.setItem('revela.poll.' + pollId, JSON.stringify(all)); } catch {}
  return n;
}
export function savedVotes(pollId) { try { return JSON.parse(localStorage.getItem('revela.poll.' + pollId)) || {}; } catch { return {}; } }
export function clearVotes(pollId) { try { localStorage.removeItem('revela.poll.' + pollId); } catch {} }
export function votesCSV(poll) {
  const res = tallyVotes(poll, savedVotes(poll.pollId));
  const q = s => `"${String(s).replace(/"/g, '""')}"`;
  if (poll.kind === 'qa') return 'pregunta,votos\n' + res.questions.map(x => `${q(x.text)},${x.up}`).join('\n');
  if (poll.kind === 'word') return 'palabra,votos\n' + Object.entries(res.words).map(([w, c]) => `${q(w)},${c}`).join('\n');
  if (poll.kind === 'open') return 'respuesta\n' + res.texts.map(x => q(x.text)).join('\n');
  if (poll.kind === 'draw' || poll.kind === 'photo') return 'participante\n' + res.pics.map(x => q(x.n || '—')).join('\n');
  if (poll.kind === 'number') return 'valor\n' + Object.values(savedVotes(poll.pollId)).filter(v => isFinite(+v)).map(Number).join('\n');
  if (poll.kind === 'point') return 'x %,y %\n' + res.points.map(p => `${p.x},${p.y}`).join('\n');
  if (ACTIVITIES.includes(poll.kind)) return 'participante,puntos,aciertos\n' + res.board.map(r => `${q(r.n || r.id)},${r.pts},${Math.round(r.pts / 10)} %`).join('\n');
  const labels = poll.kind === 'rating' ? ['1', '2', '3', '4', '5'] : poll.options;
  return (poll.kind === 'rank' ? 'opcion,puntos (Borda)\n' : 'opcion,votos\n') + labels.map((l, i) => `${q(l)},${res.counts[i]}`).join('\n');
}
