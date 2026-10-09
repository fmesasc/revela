// The activities played on a grid or with cards — a crossword, a word search, a memory game, an alphabet wheel —, the same on the
// audience's phones (apps/vote) and inside the slides when answered alone (selfpaced.js). Embedded in exported
// presentations with toString(), so self-contained (ES5, no outer variables).
// pub: what publicActivity() gives (never the crossword's words); onAnswer(answer): after each move, the answer as
// gradeActivity() reads it; L: its words (GAME_WORDS, translated or not). → the element; el.rvLock() stops the
// game (answered); it fires «rvdone» when it ends by itself (the wheel: all answered, or the time is up). Sizes in em,
// from the letters around it; the grids always left to right, also in Arabic.
export const GAME_WORDS = { across: 'Horizontales', down: 'Verticales', found: 'Encontradas: {n} de {t}', pairs: 'Parejas: {n} de {t}', tries: 'Intentos: {n}',
  search: 'Arrastra el dedo de la primera letra a la última (o toca las dos).', flip: 'Toca dos cartas para buscar su pareja.', remove: 'Quitar',
  starts: 'Empieza por la {l}', contains: 'Contiene la {l}', answer: 'Contestar', skip: 'Saltar ⏭', done: 'Respondidas: {n} de {t}', timeUp: '¡Tiempo!' };
export function activityGame(kind, pub, onAnswer, L) {
  var S = L || {};
  var NS = 'http://www.w3.org/2000/svg', locked = false, answer = [];
  var mk = function (tag, css, txt) { var e = document.createElement(tag); if (css) e.style.cssText = css; if (txt != null) e.textContent = txt; return e; };
  var sv = function (tag, at) { var e = document.createElementNS(NS, tag); for (var a in at) e.setAttribute(a, at[a]); return e; };
  var key = function (s) { return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, ''); };
  var fmt = function (s, n, t) { return s.replace('{n}', n).replace('{t}', t); };
  var tell = function () { try { onAnswer(answer.slice()); } catch (e) {} };
  var root = mk('div', 'display:flex;flex-direction:column;gap:.6em;text-align:start'); root.className = 'rv-game rv-game-' + kind;
  root.setAttribute('data-prevent-swipe', '');          // (dragging on it is playing, not changing slide)
  root.rvLock = function () { locked = true; [].forEach.call(root.querySelectorAll('button,input'), function (x) { x.disabled = true; }); };

  if (kind === 'crossword') {
    // The grid shows what is typed in each clue's box (the word typed last wins a shared square); a tap on a square
    // goes to its word (a second tap, to the other word through it).
    var W = pub.w || 1, H = pub.h || 1, words = pub.words || [], typed = [], last = [], act = -1, sq = {}, inputs = [];
    words.forEach(function (w) { answer[w.i] = ''; });
    for (var a0 = 0; a0 < answer.length; a0++) if (answer[a0] == null) answer[a0] = '';
    var svg = sv('svg', { viewBox: '-0.1 -0.1 ' + (W + 0.2) + ' ' + (H + 0.2), dir: 'ltr', role: 'img' });
    svg.style.cssText = 'display:block;width:100%;max-width:' + Math.max(8, W * 2.4) + 'em;margin:0 auto;user-select:none;-webkit-user-select:none;cursor:pointer';
    var texts = [];
    words.forEach(function (w, wi) {
      for (var k = 0; k < w.len; k++) { var x = w.x + (w.d ? 0 : k), y = w.y + (w.d ? k : 0), id = x + ',' + y, c = sq[id];
        if (!c) { c = sq[id] = { ws: [] }; c.r = sv('rect', { x: x, y: y, width: 1, height: 1, fill: '#fff', stroke: '#223', 'stroke-width': 0.05 }); svg.appendChild(c.r);
          c.t = sv('text', { x: x + 0.5, y: y + 0.82, 'font-size': 0.6, 'font-weight': 700, 'text-anchor': 'middle', fill: '#223', 'font-family': 'system-ui,sans-serif' }); texts.push(c.t); }
        c.ws.push([wi, k]); }
    });
    var numbered = {};
    words.forEach(function (w) { var id = w.x + ',' + w.y; if (numbered[id]) return; numbered[id] = 1;
      var n = sv('text', { x: w.x + 0.07, y: w.y + 0.3, 'font-size': 0.27, fill: '#223', 'font-family': 'system-ui,sans-serif' }); n.textContent = w.n; svg.appendChild(n); });
    texts.forEach(function (t) { svg.appendChild(t); });
    var paint = function () {
      for (var id in sq) { var c = sq[id], ch = '', on = false;
        for (var j = last.length - 1; j >= 0 && !ch; j--) for (var q = 0; q < c.ws.length; q++) if (c.ws[q][0] === last[j]) ch = (typed[last[j]] || [])[c.ws[q][1]] || ch;
        for (q = 0; q < c.ws.length; q++) if (c.ws[q][0] === act) on = true;
        c.t.textContent = ch; c.r.setAttribute('fill', on ? '#ffe9a8' : '#fff'); }
    };
    var clues = mk('div', 'display:flex;flex-direction:column;gap:.3em;flex:1 1 14em;min-width:0');
    [0, 1].forEach(function (d) {
      var some = words.filter(function (w) { return w.d === d; }); if (!some.length) return;
      clues.appendChild(mk('b', 'margin-top:.3em', d ? S.down : S.across));
      words.forEach(function (w, wi) { if (w.d !== d) return;
        var row = mk('label', 'display:flex;flex-wrap:wrap;align-items:center;gap:.2em .5em');
        row.appendChild(mk('b', 'min-width:1.6em', w.n + '.'));
        row.appendChild(mk('span', 'flex:1 1 8em;min-width:0;overflow-wrap:anywhere', (w.clue || '') + ' (' + w.len + ')'));
        var inp = mk('input', 'font:inherit;font-weight:700;letter-spacing:.12em;text-transform:uppercase;width:' + Math.min(14, w.len * 1.05 + 1.2) + 'em;max-width:100%;padding:.25em .4em;border-radius:.3em;border:1px solid #8888;background:#fff;color:#223;box-sizing:border-box');
        inp.type = 'text'; inp.maxLength = w.len * 2 + 4; inp.autocomplete = 'off'; inp.spellcheck = false; inp.setAttribute('autocapitalize', 'characters'); inp.setAttribute('aria-label', w.n + '. ' + (w.clue || ''));
        inp.addEventListener('focus', function () { act = wi; paint(); });
        inp.addEventListener('input', function () {
          typed[wi] = inp.value.normalize('NFC').toUpperCase().replace(/[^\p{L}\p{N}]/gu, '').split('').slice(0, w.len);
          last = last.filter(function (x) { return x !== wi; }); last.push(wi);
          answer[w.i] = inp.value.trim(); paint(); tell(); });
        inputs[wi] = inp; row.appendChild(inp); clues.appendChild(row); });
    });
    svg.addEventListener('click', function (e) {
      if (locked) return;
      var r = svg.getBoundingClientRect(), x = Math.floor((e.clientX - r.left) / r.width * (W + 0.2) - 0.1), y = Math.floor((e.clientY - r.top) / r.height * (H + 0.2) - 0.1), c = sq[x + ',' + y];
      if (!c) return;
      var mine = c.ws.map(function (p) { return p[0]; }), at = mine.indexOf(act), wi = mine[at >= 0 ? (at + 1) % mine.length : 0];
      if (inputs[wi]) inputs[wi].focus();
    });
    var pane = mk('div', 'display:flex;flex-wrap:wrap;gap:.8em;align-items:flex-start'), side = mk('div', 'flex:1 1 12em;min-width:0'); side.setAttribute('dir', 'ltr'); side.appendChild(svg);
    pane.appendChild(side); pane.appendChild(clues); root.appendChild(pane); paint();
  } else if (kind === 'wordsearch') {
    // Drag from the first letter to the last (or tap both): a line across, down or diagonal, either way. A word of the
    // list found is crossed out; with hints instead of words, each line marked counts as a try (as many as hints).
    var GW = pub.w || 1, GH = pub.h || 1, grid = pub.grid || [], list = pub.list || [], got = [], marks = [];
    var hints = list.filter(function (x) { return x.h; }).length, COLS = ['#3f6497', '#e0873b', '#4caf7d', '#c94f4f', '#8e6cc9', '#3bb3c3'];
    var board = sv('svg', { viewBox: '0 0 ' + GW + ' ' + GH, dir: 'ltr', role: 'img' });
    board.style.cssText = 'display:block;width:100%;max-width:' + Math.max(10, GW * 2.6) + 'em;margin:0 auto;touch-action:none;user-select:none;-webkit-user-select:none;cursor:crosshair';
    var under = sv('g', {}), live = sv('line', { stroke: '#f9ab00', 'stroke-width': 0.8, 'stroke-linecap': 'round', opacity: 0.55 });
    board.appendChild(under); board.appendChild(live);
    grid.forEach(function (ch, k) { var t = sv('text', { x: k % GW + 0.5, y: Math.floor(k / GW) + 0.72, 'font-size': 0.6, 'font-weight': 600, 'text-anchor': 'middle', fill: 'currentColor', 'font-family': 'system-ui,sans-serif' }); t.textContent = ch; board.appendChild(t); });
    var cellAt = function (e) { var r = board.getBoundingClientRect(); return [Math.max(0, Math.min(GW - 1, Math.floor((e.clientX - r.left) / r.width * GW))), Math.max(0, Math.min(GH - 1, Math.floor((e.clientY - r.top) / r.height * GH)))]; };
    var read = function (a, b) {
      var dx = b[0] - a[0], dy = b[1] - a[1]; if (!dx && !dy) return null; if (dx && dy && Math.abs(dx) !== Math.abs(dy)) return null;
      var n = Math.max(Math.abs(dx), Math.abs(dy)), sx = dx > 0 ? 1 : dx < 0 ? -1 : 0, sy = dy > 0 ? 1 : dy < 0 ? -1 : 0, s = '';
      for (var k = 0; k <= n; k++) s += grid[(a[1] + sy * k) * GW + a[0] + sx * k] || ''; return s;
    };
    var show = function (el, a, b, col) { el.setAttribute('x1', a[0] + 0.5); el.setAttribute('y1', a[1] + 0.5); el.setAttribute('x2', b[0] + 0.5); el.setAttribute('y2', b[1] + 0.5); if (col) el.setAttribute('stroke', col); el.style.display = ''; };
    live.style.display = 'none';
    var status = mk('div', 'font-weight:700'), items = mk('div', 'display:flex;flex-wrap:wrap;gap:.3em .5em');
    var draw = function () {
      status.textContent = fmt(S.found, answer.length, list.length); items.innerHTML = '';
      list.forEach(function (x, i) { items.appendChild(mk('span', 'padding:.15em .5em;border-radius:1em;border:1px solid #8888;' + (got[i] != null ? 'text-decoration:line-through;opacity:.55' : ''), (x.h ? '💡 ' : '') + x.t)); });
      marks.forEach(function (m) { if (m.word != null) return;
        var chip = mk('span', 'display:inline-flex;align-items:center;gap:.3em;padding:.1em .2em .1em .5em;border-radius:1em;color:#fff;background:' + m.col, m.s);
        var x = mk('button', 'font:inherit;border:0;background:transparent;color:#fff;padding:0 .3em;cursor:pointer;min-width:1.6em', '✕'); x.setAttribute('aria-label', S.remove);
        x.onclick = function () { if (locked) return; under.removeChild(m.el); marks = marks.filter(function (z) { return z !== m; }); answer = marks.map(function (z) { return z.s; }); draw(); tell(); };
        chip.appendChild(x); items.appendChild(chip); });
    };
    var mark = function (a, b) {
      var s = read(a, b), k = key(s), r = k.split('').reverse().join(''), col = COLS[marks.length % COLS.length];
      if (s && k.length > 1) {
        for (var i = 0; i < list.length; i++) if (!list[i].h && got[i] == null && (key(list[i].t) === k || key(list[i].t) === r)) break;
        var word = i < list.length ? i : null;
        if (word != null || (hints && marks.filter(function (z) { return z.word == null; }).length < hints && answer.indexOf(s) < 0)) {
          var el = sv('line', { 'stroke-width': 0.78, 'stroke-linecap': 'round', opacity: 0.45 }); show(el, a, b, col); under.appendChild(el);
          if (word != null) got[word] = s;
          marks.push({ s: s, el: el, col: col, word: word }); answer = marks.map(function (z) { return z.s; }); draw(); tell(); return; }
      }
      show(live, a, b, '#d93025'); setTimeout(function () { live.style.display = 'none'; live.setAttribute('stroke', '#f9ab00'); }, 450);     // (not a word of the list)
    };
    var from = null, tap = null;
    board.addEventListener('pointerdown', function (e) { if (locked) return; e.preventDefault(); from = cellAt(e); try { board.setPointerCapture(e.pointerId); } catch (x) {} show(live, tap || from, from, '#f9ab00'); });
    board.addEventListener('pointermove', function (e) { if (!from) return; var c = cellAt(e); show(live, from, read(from, c) ? c : from); });
    var up = function (e) {
      if (!from) return; var a = from, b = cellAt(e); from = null; live.style.display = 'none';
      if (a[0] !== b[0] || a[1] !== b[1]) { tap = null; mark(a, b); return; }
      if (tap && (tap[0] !== a[0] || tap[1] !== a[1])) { var t0 = tap; tap = null; mark(t0, a); return; }
      tap = tap ? null : a; if (tap) show(live, a, a, '#f9ab00');
    };
    board.addEventListener('pointerup', up); board.addEventListener('pointercancel', function () { from = null; live.style.display = 'none'; });
    var holder = mk('div'); holder.setAttribute('dir', 'ltr'); holder.appendChild(board);
    root.appendChild(mk('div', 'opacity:.8;font-size:.85em', S.search)); root.appendChild(holder); root.appendChild(status); root.appendChild(items); draw();
  } else if (kind === 'memory') {
    // Face down; two turned at a time: a pair stays up, else both turn back. The answer: each pair's B side once
    // found, then how many turns it took.
    var cards = pub.cards || [], n = pub.n || 0, open = [], tries = 0, found = 0;
    for (var i0 = 0; i0 < n; i0++) answer.push(''); answer.push('0');
    var info = mk('div', 'font-weight:700'), table = mk('div', 'display:grid;grid-template-columns:repeat(auto-fill,minmax(4.6em,1fr));gap:.4em');
    var face = function (b, up) { var c = b.card; b.textContent = up ? c.t : '?'; b.style.background = b.done ? '#26890c' : up ? '#fff' : '#3f6497'; b.style.color = up && !b.done ? '#223' : '#fff';
      b.style.fontSize = up ? (c.t.length > 14 ? '.8em' : '1em') : '1.6em'; b.setAttribute('aria-pressed', up ? 'true' : 'false'); };
    var tellInfo = function () { info.textContent = fmt(S.pairs, found, n) + ' · ' + fmt(S.tries, tries, ''); };
    cards.forEach(function (c) {
      var b = mk('button', 'font:inherit;font-weight:700;min-height:3.4em;padding:.3em;border-radius:.4em;border:2px solid #3f6497;cursor:pointer;overflow-wrap:anywhere;line-height:1.15;margin:0;width:auto');
      b.card = c; b.type = 'button'; face(b, false);
      b.onclick = function () {
        if (locked || b.done || open.length === 2 || open[0] === b) return;
        face(b, true); open.push(b); if (open.length < 2) return;
        tries++; answer[n] = String(tries); var x = open[0], y = open[1];
        if (x.card.k === y.card.k) { x.done = y.done = true; face(x, true); face(y, true); answer[x.card.k] = (x.card.b ? x.card : y.card).t; found++; open = []; }
        else setTimeout(function () { if (!x.done) face(x, false); if (!y.done) face(y, false); open = []; }, 900);
        tellInfo(); tell();
      };
      table.appendChild(b);
    });
    root.appendChild(mk('div', 'opacity:.8;font-size:.85em', S.flip)); root.appendChild(table); root.appendChild(info); tellInfo();
  } else if (kind === 'wheel') {
    // The letters round a circle, in turn: answer, or skip it to the next lap (it stays blue) until all are answered
    // or the time is up. The phone doesn't know the answers, so an answered letter only turns «answered» (purple);
    // right and wrong are for the presenter's screen.
    var its = pub.items || [], queue = its.map(function (x, k) { return k; }), state = [], left = +pub.time || 0, ends = 0, timer = null;
    its.forEach(function (x) { answer[x.i] = ''; }); for (var w0 = 0; w0 < answer.length; w0++) if (answer[w0] == null) answer[w0] = '';
    var ring = mk('div', 'position:relative;width:100%;max-width:22em;aspect-ratio:1/1;margin:0 auto'); ring.setAttribute('dir', 'ltr');
    var n = its.length || 1, dia = Math.min(14, 2 * Math.PI * 42 / n * 0.86), dots = its.map(function (x, k) {
      var an = -Math.PI / 2 + 2 * Math.PI * k / n, d = mk('span', 'position:absolute;display:grid;place-items:center;border-radius:50%;color:#fff;font-weight:800;transition:transform .2s,background .2s;'
        + 'width:' + dia + '%;height:' + dia + '%;left:' + (50 + 42 * Math.cos(an) - dia / 2) + '%;top:' + (50 + 42 * Math.sin(an) - dia / 2) + '%;font-size:' + Math.max(0.7, Math.min(1.3, dia / 9)) + 'em', x.l);
      ring.appendChild(d); return d; });
    var mid = mk('div', 'position:absolute;inset:22%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center');
    var big = mk('div', 'font-size:2.6em;font-weight:900;line-height:1'), clock = mk('div', 'font-size:1.1em;font-weight:700;opacity:.8'); mid.appendChild(big); mid.appendChild(clock); ring.appendChild(mid);
    var rule = mk('div', 'font-weight:800'), clue = mk('div', 'overflow-wrap:anywhere'), row = mk('div', 'display:flex;flex-wrap:wrap;gap:.4em');
    var inp = mk('input', 'font:inherit;flex:1 1 10em;min-width:0;padding:.35em .5em;border-radius:.3em;border:1px solid #8888;background:#fff;color:#223;box-sizing:border-box');
    inp.type = 'text'; inp.maxLength = 60; inp.autocomplete = 'off'; inp.spellcheck = false;
    var bOk = mk('button', 'font:inherit;font-weight:700;padding:.35em .8em;border-radius:.3em;border:0;background:#26890c;color:#fff;cursor:pointer;margin:0;width:auto', S.answer);
    var bSkip = mk('button', 'font:inherit;font-weight:700;padding:.35em .8em;border-radius:.3em;border:0;background:#3f6497;color:#fff;cursor:pointer;margin:0;width:auto', S.skip);
    bOk.type = bSkip.type = 'button'; row.appendChild(inp); row.appendChild(bOk); row.appendChild(bSkip);
    var info = mk('div', 'opacity:.8;font-size:.85em');
    var paintW = function () {
      var cur = queue.length && !locked ? queue[0] : -1;
      dots.forEach(function (d, k) { d.style.background = state[k] ? '#8e6cc9' : k === cur ? '#f9ab00' : '#3f6497'; d.style.transform = k === cur ? 'scale(1.18)' : ''; d.style.color = k === cur ? '#223' : '#fff'; });
      var x = its[cur]; big.textContent = x ? x.l : '';
      rule.textContent = x ? (x.c ? S.contains : S.starts).replace('{l}', x.l) : (left === 0 && ends ? S.timeUp : ''); clue.textContent = x ? x.q : '';
      info.textContent = S.done.replace('{n}', state.filter(Boolean).length).replace('{t}', its.length);
    };
    var finish = function () { if (locked) return; clearInterval(timer); root.rvLock(); paintW(); try { root.dispatchEvent(new CustomEvent('rvdone')); } catch (e) {} };
    var step = function (said) {
      if (locked || !queue.length) return; var k = queue.shift();
      if (said) { state[k] = 1; answer[its[k].i] = said; tell(); } else queue.push(k);
      inp.value = ''; paintW(); if (!queue.length) finish(); else try { inp.focus({ preventScroll: true }); } catch (e) {}
    };
    bOk.onclick = function () { step(inp.value.trim()); };
    bSkip.onclick = function () { step(''); };
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); step(inp.value.trim()); } });
    var tick = function () { if (!ends || locked) return; if (!root.isConnected && timer) { clearInterval(timer); return; }
      left = Math.max(0, Math.ceil((ends - Date.now()) / 1000)); clock.textContent = left + ' s'; if (!left) finish(); };
    var lock0 = root.rvLock; root.rvLock = function () { clearInterval(timer); lock0(); };
    root.appendChild(ring); root.appendChild(rule); root.appendChild(clue); root.appendChild(row); root.appendChild(info);
    // (The clock starts when the wheel is first seen: inside the slides, not before reaching its slide.)
    var go = function () { if (ends || locked || !left) return; ends = Date.now() + left * 1000; tick(); timer = setInterval(tick, 250); };
    clock.textContent = left ? left + ' s' : ''; paintW();
    if (left) { if (window.IntersectionObserver) { var seen = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { seen.disconnect(); go(); } }); seen.observe(ring); } else go(); }
  }
  tell();
  return root;
}
