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

export const VOTE_URL = 'https://fmesasc.github.io/revela/vote.html';

export function pollBlock(props = {}) {
  return { id: uid(), type: 'poll', pollId: uid(), kind: 'choice', display: 'bar', question: '¿Qué opción prefieres?',
    options: ['Opción A', 'Opción B', 'Opción C'], x: 80, y: 60, w: 1120, h: 600, rotation: 0, animation: null, ...props };
}
export function addPoll(props) {
  const b = pollBlock(props);
  commit(() => { currentSlide().blocks.push(b); state.ui.selection = b.id; state.ui.multi = [b.id]; });
  return b;
}
export function setPoll(id, props) {
  const b = currentSlide().blocks.find(x => x.id === id && x.type === 'poll'); if (!b) return;
  commit(() => Object.assign(b, props));
}

// votes: { voterId: answer } where answer is an option index, an array of
// indices (multi), a number 1-5 (rating) or a string (word). → counts.
export function tallyVotes(poll, votes) {
  var kind = poll.kind || 'choice', n = (poll.options || []).length, counts = [], words = {}, sum = 0, voters = 0;
  if (kind === 'qa') {                      // audience questions: { 'q:id': { t: text, up: { voter: 1 } } }
    var qs = [], people = {};
    for (var id in votes) { var q = votes[id]; if (!q || !q.t) continue; var ups = Object.keys(q.up || {});
      ups.forEach(function (v) { people[v] = 1; }); if (q.by) people[q.by] = 1;
      qs.push({ id: id, text: q.t, up: ups.length, time: q.time || 0 }); }
    qs.sort(function (a, b) { return b.up - a.up || a.time - b.time; });
    return { counts: [], words: {}, voters: Object.keys(people).length, average: 0, questions: qs };
  }
  if (kind === 'rating') n = 5;
  for (var i = 0; i < n; i++) counts.push(0);
  for (var k in votes) {
    var a = votes[k]; voters++;
    if (kind === 'word') {
      String(a || '').toLowerCase().split(/[,;]/).forEach(function (w) { w = w.trim().slice(0, 30); if (w) words[w] = (words[w] || 0) + 1; });
    } else if (kind === 'multi') {
      (Array.isArray(a) ? a : [a]).forEach(function (x) { if (x >= 0 && x < n) counts[x]++; });
    } else if (kind === 'rating') {
      var r = Math.round(+a); if (r >= 1 && r <= 5) { counts[r - 1]++; sum += r; }
    } else if (a >= 0 && a < n) counts[a]++;
  }
  return { counts: counts, words: words, voters: voters, average: kind === 'rating' && voters ? sum / voters : 0 };
}

// HTML (inline styles) for the results area. accent: colours to use.
export function pollResultsHTML(poll, res, accent) {
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  var cols = accent && accent.length ? accent : ['#3f6497', '#e0873b', '#4caf7d', '#c94f4f', '#8e6cc9', '#3bb3c3'];
  var kind = poll.kind || 'choice', display = poll.display || 'bar';
  var labels = kind === 'rating' ? ['1', '2', '3', '4', '5'] : (poll.options || []);
  var counts = res.counts || [], total = counts.reduce(function (a, b) { return a + b; }, 0), max = Math.max.apply(null, counts.concat([1]));
  var foot = '<div style="margin-top:.6em;font-size:.55em;opacity:.7">' + res.voters + ' ' + (res.voters === 1 ? 'voto' : 'votos') + '</div>';
  if (kind === 'qa') {
    var list = (res.questions || []).slice(0, 8);
    return '<div style="display:flex;flex-direction:column;gap:.3em;font-size:.7em">' + (list.length ? list.map(function (q, i) {
      return '<div style="display:flex;gap:.6em;align-items:center;padding:.3em .5em;border-radius:.3em;background:' + (i ? '#8882' : cols[0]) + (i ? '' : ';color:#fff') + '">'
        + '<b style="flex:0 0 2.2em;text-align:center">▲ ' + q.up + '</b><span>' + esc(q.text) + '</span></div>';
    }).join('') : '<div style="opacity:.6">Escanea el QR y envía tu pregunta…</div>') + '</div>'
      + '<div style="margin-top:.6em;font-size:.55em;opacity:.7">' + (res.questions || []).length + ' preguntas</div>';
  }
  if (kind === 'word') {
    var ws = Object.keys(res.words || {}).sort(function (a, b) { return res.words[b] - res.words[a]; }).slice(0, 40);
    var wmax = ws.length ? res.words[ws[0]] : 1;
    return '<div style="display:flex;flex-wrap:wrap;gap:.2em .6em;justify-content:center;align-items:center;height:100%;align-content:center">'
      + (ws.length ? ws.map(function (w, i) { return '<span style="font-size:' + (0.6 + 1.6 * res.words[w] / wmax).toFixed(2) + 'em;color:' + cols[i % cols.length] + ';font-weight:700;transition:font-size .4s">' + esc(w) + '</span>'; }).join('')
        : '<span style="opacity:.5;font-size:.7em">…</span>') + '</div>' + foot;
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
  return '<div style="display:flex;flex-direction:column;gap:.35em">' + labels.map(function (l, i) {
    return '<div style="display:flex;align-items:center;gap:.5em;font-size:.7em"><div style="flex:0 0 30%;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(l) + '</div>'
      + '<div style="flex:1;background:#8882;border-radius:.2em;height:1.4em"><div style="height:100%;width:' + (counts[i] * 100 / max) + '%;background:' + cols[i % cols.length] + ';border-radius:.2em;transition:width .5s"></div></div>'
      + '<div style="flex:0 0 3em;font-weight:700">' + counts[i] + '</div></div>';
  }).join('') + '</div>' + foot;
}

// Markup of a poll in the editor and thumbnails: question, current results
// (last saved votes) and a QR placeholder (the real code exists only while presenting).
export function pollEditorHTML(b, accents) {
  const res = tallyVotes(b, savedVotes(b.pollId));
  return `<div style="width:100%;height:100%;display:grid;grid-template-columns:1fr auto;gap:1em;font-size:${b.fontSize || 32}px">`
    + `<div style="display:flex;flex-direction:column;min-width:0"><div style="font-weight:700;margin-bottom:.5em">${esc(b.question || '')}</div>`
    + `<div style="flex:1;min-height:0">${pollResultsHTML(b, res, accents)}</div></div>`
    + `<div style="align-self:center;text-align:center;font-size:18px"><div style="width:220px;height:220px;border-radius:8px;background:#fff;color:#223;display:grid;place-items:center">`
    + `<div><div style="font-size:64px;line-height:1">▦</div><div>QR</div></div></div><div style="margin-top:6px;opacity:.8">vote.html</div></div></div>`;
}

// Results saved by the presentation (same origin) for the editor.
export function savedVotes(pollId) { try { return JSON.parse(localStorage.getItem('revela.poll.' + pollId)) || {}; } catch { return {}; } }
export function clearVotes(pollId) { try { localStorage.removeItem('revela.poll.' + pollId); } catch {} }
export function votesCSV(poll) {
  const res = tallyVotes(poll, savedVotes(poll.pollId));
  const q = s => `"${String(s).replace(/"/g, '""')}"`;
  if (poll.kind === 'qa') return 'pregunta,votos\n' + res.questions.map(x => `${q(x.text)},${x.up}`).join('\n');
  if (poll.kind === 'word') return 'palabra,votos\n' + Object.entries(res.words).map(([w, c]) => `${q(w)},${c}`).join('\n');
  const labels = poll.kind === 'rating' ? ['1', '2', '3', '4', '5'] : poll.options;
  return 'opcion,votos\n' + labels.map((l, i) => `${q(l)},${res.counts[i]}`).join('\n');
}
