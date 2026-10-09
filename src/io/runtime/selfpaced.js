// Self-paced activities: each person answers the quizzes and activities inside
// the presentation itself (no phones, no presenter) — alone, at home, or as an
// assignment from Moodle or another learning platform (LTI, where the server
// marks the answers and sends the mark back). Embedded in exported
// presentations with toString(), so self-contained (ES5, no outer variables):
// publicActivity() gives what to show (never the answers); answering asks the
// page that holds the presentation (window.parent.__revelaAnswer) when there is
// one, else marks it here with gradeAnswer(). game: activityGame() (games.js),
// which plays the crossword, the word search, the memory game and the wheel, as on the phones.

export function selfPacedRuntime(publicActivity, gradeAnswer, L, game) {
  var ACT = ['order', 'match', 'gaps', 'label', 'sort', 'crossword', 'wordsearch', 'memory', 'wheel'];
  var mk = function (tag, css, txt) { var e = document.createElement(tag); if (css) e.style.cssText = css; if (txt != null) e.textContent = txt; return e; };
  var btnCss = 'font:inherit;font-size:.6em;padding:.35em .8em;border-radius:.3em;border:0;cursor:pointer;background:#3f6497;color:#fff;margin:.2em';
  var ask = function (p, a) {
    try { if (window.parent !== window && typeof window.parent.__revelaAnswer === 'function') return window.parent.__revelaAnswer(p.pollId, a); } catch (e) {}
    return Promise.resolve({ score: gradeAnswer(p, a) });
  };
  var KEY = 'revela.self.';
  var done = function (id) { try { return JSON.parse(sessionStorage.getItem(KEY + id)); } catch (e) { return null; } };
  // (And told to whoever holds the page and wants to know — a SCORM package's script: io/export/scorm.js.)
  var scored = function (id, r) { try { if (typeof window.__revelaScored === 'function') window.__revelaScored(id, r.score || 0); } catch (e) {} };
  var remember = function (id, r) { try { sessionStorage.setItem(KEY + id, JSON.stringify(r)); } catch (e) {} scored(id, r); };
  var feedback = function (box, r) {
    var pc = Math.round((r.score || 0) * 100), ok = pc === 100;
    var f = mk('div', 'margin-top:.4em;padding:.3em .6em;border-radius:.3em;font-size:.6em;font-weight:700;color:#fff;background:' + (ok ? '#26890c' : pc ? '#b07d00' : '#b3261e'),
      (ok ? L.allRight : pc ? L.partly.replace('{n}', pc) : L.wrong) + (r.sent ? ' · ' + L.sent : ''));
    f.className = 'rv-self-result'; box.appendChild(f);
    [].slice.call(box.querySelectorAll('button,select,input')).forEach(function (x) { x.disabled = true; });
    var g = box.querySelector('.rv-game'); if (g && g.rvLock) g.rvLock();
  };
  [].slice.call(document.querySelectorAll('.rv-poll')).forEach(function (el) {
    var p; try { p = JSON.parse(el.getAttribute('data-poll')); } catch (e) { return; }
    var qr = el.querySelector('.rv-poll-qr'); if (qr) qr.style.display = 'none';
    el.style.gridTemplateColumns = '1fr';
    var box = el.querySelector('.rv-poll-res'); if (!box) return;
    if (p.kind !== 'quiz' && ACT.indexOf(p.kind) < 0) { box.innerHTML = ''; box.appendChild(mk('div', 'opacity:.6;font-size:.6em', L.live)); return; }
    box.innerHTML = ''; box.style.overflow = 'auto'; box.style.textAlign = 'left';
    var answer = null, pub = ACT.indexOf(p.kind) >= 0 ? publicActivity(p) : null;
    var submit = function (a) {
      [].slice.call(box.querySelectorAll('button,select,input')).forEach(function (x) { x.disabled = true; });
      ask(p, a).then(function (r) { remember(p.pollId, r); feedback(box, r); }, function () {
        [].slice.call(box.querySelectorAll('button,select,input')).forEach(function (x) { x.disabled = false; }); alert(L.failed); });
    };
    var check = mk('button', btnCss, L.check); check.className = 'rv-self-check';
    if (p.kind === 'quiz') {
      var grid = mk('div', 'display:grid;grid-template-columns:1fr 1fr;gap:.3em');
      (p.options || []).forEach(function (o, i) {
        var b = mk('button', btnCss + ';font-size:.65em;margin:0;background:' + ['#e21b3c', '#1368ce', '#d89e00', '#26890c', '#864cbf', '#0aa3a3'][i % 6], o);
        b.onclick = function () { b.style.outline = '3px solid #fff'; submit(i); }; grid.appendChild(b);
      });
      box.appendChild(grid); check = null;
    } else if (p.kind === 'order') {
      answer = pub.items.slice();
      var list = mk('div', 'display:flex;flex-direction:column;gap:.15em;font-size:.6em');
      var draw = function () { list.innerHTML = ''; answer.forEach(function (t, i) {
        var row = mk('div', 'display:flex;align-items:center;gap:.4em;background:#8882;border-radius:.3em;padding:.15em .4em');
        row.appendChild(mk('b', '', (i + 1) + '.')); row.appendChild(mk('span', 'flex:1', t));
        var up = mk('button', btnCss + ';font-size:1em;padding:0 .5em', '▲'), dn = mk('button', btnCss + ';font-size:1em;padding:0 .5em', '▼');
        up.disabled = !i; dn.disabled = i === answer.length - 1;
        up.onclick = function () { var x = answer[i - 1]; answer[i - 1] = answer[i]; answer[i] = x; draw(); };
        dn.onclick = function () { var x = answer[i + 1]; answer[i + 1] = answer[i]; answer[i] = x; draw(); };
        row.appendChild(up); row.appendChild(dn); list.appendChild(row); }); };
      draw(); box.appendChild(list);
    } else if (p.kind === 'match' || p.kind === 'label' || p.kind === 'sort') {
      // (Sorting into groups: each item — shuffled — with the groups to choose from; its answer in the item's own place.)
      var lefts = p.kind === 'match' ? pub.left : p.kind === 'sort' ? pub.items.map(function (x) { return x.t; }) : pub.points.map(function (_, i) { return String(i + 1); }),
        opts = p.kind === 'match' ? pub.right : p.kind === 'sort' ? pub.cats : pub.labels, at = function (i) { return p.kind === 'sort' ? pub.items[i].i : i; };
      answer = lefts.map(function () { return ''; });
      if (p.kind === 'label' && pub.image) {
        var pic = mk('div', 'position:relative;max-width:60%;margin-bottom:.3em'), img = mk('img', 'width:100%;display:block;border-radius:.2em'); img.src = pub.image; pic.appendChild(img);
        pub.points.forEach(function (pt, i) { pic.appendChild(mk('b', 'position:absolute;left:' + pt.x + '%;top:' + pt.y + '%;transform:translate(-50%,-50%);background:#3f6497;color:#fff;border:2px solid #fff;border-radius:1em;padding:0 .35em;font-size:.5em', String(i + 1))); });
        box.appendChild(pic);
      }
      lefts.forEach(function (l, i) {
        var row = mk('div', 'display:flex;align-items:center;gap:.5em;font-size:.6em;margin:.15em 0'); row.appendChild(mk('span', 'flex:0 0 30%;font-weight:600', l));
        var s = mk('select', 'font:inherit;flex:1;max-width:24em;padding:.15em .3em;border-radius:.25em;border:1px solid #8886;background:#fff;color:#223'); s.appendChild(mk('option', '', '—'));
        opts.forEach(function (o) { var x = mk('option', '', o); x.value = o; s.appendChild(x); });
        s.onchange = function () { answer[at(i)] = s.value; }; row.appendChild(s); box.appendChild(row);
      });
    } else if (game && (p.kind === 'crossword' || p.kind === 'wordsearch' || p.kind === 'memory' || p.kind === 'wheel')) {
      var g = game(p.kind, pub, function (a) { answer = a; }, L.game); g.style.fontSize = '.55em'; box.appendChild(g);
      g.addEventListener('rvdone', function () { if (check && !check.disabled) check.click(); });   // (the wheel, over: checked by itself)
    } else if (p.kind === 'gaps') {
      answer = []; var para = mk('div', 'font-size:.6em;line-height:2.2'), n = 0;
      pub.parts.forEach(function (part) {
        if (part !== null) { para.appendChild(document.createTextNode(part)); return; }
        var k = n++, inp = mk('input', 'font:inherit;width:7em;margin:0 .2em;padding:.05em .3em;border-radius:.25em;border:1px solid #8886;background:#fff;color:#223'); inp.type = 'text'; answer[k] = '';
        inp.oninput = function () { answer[k] = inp.value; }; para.appendChild(inp);
      });
      box.appendChild(para);
    }
    if (check) { check.onclick = function () { submit(answer); }; box.appendChild(check); }
    var prev = done(p.pollId); if (prev) { feedback(box, prev); scored(p.pollId, prev); }
  });
}
