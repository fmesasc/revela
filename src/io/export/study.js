// Flashcards and practice from the presentation's quizzes and activities (as Quizlet's or Anki's, and Kahoot's study
// mode): one standalone HTML page, offline, for students to study on their own, on a phone or a computer.
//  - Flashcards: the question in front, the answer behind; «I knew it» moves a card up a box (Leitner, five boxes),
//    «Review again» back to the first and a few cards later; the boxes are kept in that page's localStorage, so the
//    next visit starts with the ones not known yet.
//  - Practice: the questions one by one with the answer said right after each, no clock; at the end the score, and
//    the wrong ones can be tried again.
// Optionally each slide's title and first text as one more card. Marking is grading.js's, embedded as source
// (the same as self-paced presentations); the page follows the deck's colours and fonts, and the interface language.

import { state } from '../../core/store.js';
import { esc, jsData, plainText } from '../../core/text.js';
import { t, currentLang } from '../../i18n/index.js';
import { currentPalette, deckFontStacks } from '../../features/design/palettes.js';
import { ACTIVITIES, publicActivity, gradeActivity, gradeAnswer } from '../../features/live/grading.js';
import { download, slug } from '../files.js';

const lines = html => plainText(String(html || '').replace(/<(br|\/p|\/div|\/li|\/h\d)\b[^>]*>/gi, '\n$&')).split('\n').map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
const split = l => { const x = String(l).split('='); return [x[0].trim(), x.slice(1).join('=').trim()]; };
const PRACTICE = ['quiz', ...ACTIVITIES, 'number'];

// The answer of a quiz or activity, as text to read (the back of its card, and what practice says after a wrong one).
export function answerText(p) {
  const o = p.options || [];
  if (p.kind === 'quiz') return (p.correct?.length ? p.correct : [0]).map(i => o[i]).filter(Boolean).join(' / ');
  if (p.kind === 'match') return o.map(split).map(([a, b]) => `${a} → ${b}`).join('\n');
  if (p.kind === 'order' || p.kind === 'label') return o.map((x, i) => `${i + 1}. ${x}`).join('\n');
  if (p.kind === 'sort') return o.map(l => { const c = String(l).split(':'); return `${c[0].trim()}: ${c.slice(1).join(':').split(/[,;]/).map(s => s.trim()).filter(Boolean).join(', ')}`; }).join('\n');
  if (p.kind === 'gaps') return String(p.text || '').replace(/\[([^\]]+)\]/g, (m, a) => a.split('|')[0].trim());
  if (p.kind === 'number') return `${+p.answer}${p.unit ? ' ' + p.unit : ''}`;
  return '';
}
const front = p => (p.kind === 'gaps' ? `${p.question || ''}\n${String(p.text || '').replace(/\[[^\]]+\]/g, '_____')}` : p.question || '').trim();
const hash = s => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h.toString(36); };

// What the page is made of. opts: { cards, practice, slides } (slides: each slide's title and text as a card too).
export function studyData(deck = state.deck, { cards = true, practice = true, slides = false } = {}) {
  const polls = deck.slides.filter(s => !s.hidden).flatMap(s => (s.blocks || []).filter(b => b.type === 'poll'))
    .filter(p => PRACTICE.includes(p.kind) && (p.kind !== 'number' || isFinite(parseFloat(p.answer))) && answerText(p));
  const list = polls.map(p => ({ id: 'q' + hash(p.pollId + front(p)), f: front(p), b: answerText(p), img: p.kind === 'label' ? p.image || '' : '' }));
  if (slides) for (const s of deck.slides) {
    if (s.hidden || (s.blocks || []).some(b => b.type === 'poll')) continue;
    const texts = (s.blocks || []).filter(b => b.type === 'text' && !b.decorative).sort((a, b) => (b.ph === 'title') - (a.ph === 'title') || a.y - b.y).map(b => lines(b.html)).filter(Boolean);
    if (texts.length > 1) list.push({ id: 's' + hash(texts[0] + texts[1]), f: texts[0], b: texts[1], img: '' });
  }
  const items = practice ? polls.map(p => ({ pollId: p.pollId, kind: p.kind, question: p.question || '', options: p.options || [], correct: p.correct, text: p.text, image: p.image,
    points: p.points, answer: p.answer, tolerance: p.tolerance, unit: p.unit, ans: answerText(p) })) : [];
  return { title: deck.name || '', cards: cards ? list : [], items, key: 'revela.study.' + hash(list.map(c => c.id).join()) };
}

// The page itself: everything in it (no internet needed).
export function studyHTML(deck = state.deck, opts = {}) {
  const D = studyData(deck, opts), pal = currentPalette(deck), fonts = deckFontStacks(deck), lang = currentLang();
  const lum = h => { const m = /^#?([0-9a-f]{6})/i.exec(h || ''); if (!m) return 0.5; const c = [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
  const bg = pal.bg || '#ffffff', fg = ratio(pal.fg, bg) >= 4.5 ? pal.fg : lum(bg) > 0.4 ? '#1a1a1a' : '#ffffff';
  // (The accent the buttons are painted with: the palette's first one that reads well on the background.)
  const accent = [...(pal.accents || []), lum(bg) > 0.4 ? '#2b4f86' : '#8fb6ff'].find(a => ratio(a, bg) >= 3) || fg, onAccent = lum(accent) > 0.35 ? '#111111' : '#ffffff';
  const font = s => String(s || '').replace(/[<>;{}]/g, '') || 'system-ui, sans-serif';
  const L = { front: t('Pregunta'), back: t('Respuesta'), flip: t('Ver la respuesta'), knew: t('Lo sabía'), again: t('Repasar otra vez'), shuffle: t('Barajar'), reset: t('Empezar de cero'),
    progress: t('{n} de {t} repasadas en esta ronda'), mastered: t('Dominadas: {n} de {t}'), roundDone: t('¡Ronda terminada! Las que no sabías saldrán antes la próxima vez.'), another: t('Otra ronda'),
    keys: t('Teclas: Espacio da la vuelta · 1 lo sabía · 2 repasar otra vez'), qOf: t('Pregunta {n} de {t}'), check: t('Comprobar'), next: t('Siguiente'), right: t('¡Correcto!'),
    wrong: t('No es correcto.'), partly: t('{n} % de aciertos.'), was: t('La respuesta:'), score: t('Has acertado {n} de {t}.'), retry: t('Repetir las falladas'), restart: t('Empezar de nuevo'),
    up: t('Subir'), down: t('Bajar'), gap: t('Hueco {n}'), choose: t('Elige…'), numberAns: t('Tu respuesta (un número)'), resetAsk: t('¿Borrar lo que llevas aprendido en estas fichas?') };
  const tabs = D.cards.length && D.items.length;
  return `<!doctype html>
<html lang="${esc(lang)}"${lang === 'ar' ? ' dir="rtl"' : ''}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(D.title || t('Fichas y práctica'))} — ${esc(t('Fichas y práctica'))}</title>
<meta name="generator" content="Revela">
<style>
:root{--bg:${bg};--fg:${fg};--accent:${accent};--on-accent:${onAccent};--soft:color-mix(in srgb,var(--fg) 7%,var(--bg));--line:color-mix(in srgb,var(--fg) 25%,var(--bg));--ok:#1e7d32;--ko:#b3261e}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--fg);font:18px/1.5 ${font(fonts.body)};}
h1,h2{font-family:${font(fonts.heading)};line-height:1.25}
main{max-width:44rem;margin:0 auto;padding:16px}
h1{font-size:1.5rem;margin:.5rem 0 1rem}
button,select,input{font:inherit;color:inherit}
button{min-height:48px;padding:.5rem 1rem;border-radius:12px;border:2px solid var(--line);background:var(--soft);cursor:pointer}
button.go{background:var(--accent);color:var(--on-accent);border-color:var(--accent);font-weight:700}
button:focus-visible,select:focus-visible,input:focus-visible,[tabindex]:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
button:disabled{opacity:.6;cursor:default}
[hidden]{display:none!important}
[role=tablist]{display:flex;gap:8px;margin-bottom:1rem}[role=tab]{flex:1}[role=tab][aria-selected=true]{background:var(--accent);color:var(--on-accent);border-color:var(--accent)}
.row{display:flex;flex-wrap:wrap;gap:8px;margin:.75rem 0}.row>button{flex:1 1 9rem}
.meta{opacity:.8;font-size:.9rem;margin:.25rem 0}
.bar{height:8px;border-radius:4px;background:var(--soft);overflow:hidden}.bar>i{display:block;height:100%;background:var(--accent);width:0;transition:width .2s}
#fc-card{display:block;width:100%;min-height:14rem;padding:1.5rem;font-size:1.3rem;text-align:center;white-space:pre-line;border-radius:18px;box-shadow:0 2px 10px #0003}
#fc-card small{display:block;font-size:.8rem;opacity:.7;margin-bottom:.5rem;text-transform:uppercase;letter-spacing:.05em}
#fc-card img{max-width:100%;max-height:40vh;display:block;margin:0 auto .5rem;border-radius:8px}
.opt{display:block;width:100%;text-align:start;margin:.4rem 0}
.item{display:flex;align-items:center;gap:8px;margin:.4rem 0;padding:.25rem .5rem;border-radius:10px;background:var(--soft)}.item span{flex:1}
.item button{min-width:48px;padding:0}
label.pair{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:.5rem 0}label.pair b{flex:1 1 8rem}
select,input{min-height:48px;padding:.25rem .5rem;border-radius:10px;border:2px solid var(--line);background:var(--bg);flex:1 1 12rem;max-width:100%}
.gaps{line-height:3}.gaps input{width:9rem;flex:none;margin:0 .25rem}
.fb{margin:1rem 0;padding:.75rem 1rem;border-radius:12px;font-weight:700;white-space:pre-line;color:#fff}.fb.ok{background:var(--ok)}.fb.ko{background:var(--ko)}
.pic{position:relative;margin:.5rem 0}.pic img{width:100%;display:block;border-radius:8px}.pic b{position:absolute;transform:translate(-50%,-50%);background:var(--accent);color:var(--on-accent);border-radius:1em;padding:0 .5em}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
</style></head><body><main>
<h1>${esc(D.title || t('Fichas y práctica'))}</h1>
${tabs ? `<div role="tablist" aria-label="${esc(t('Fichas y práctica'))}"><button role="tab" id="tab-fc" aria-controls="fc" aria-selected="true">${esc(t('Fichas'))}</button><button role="tab" id="tab-pr" aria-controls="pr" aria-selected="false" tabindex="-1">${esc(t('Practicar'))}</button></div>` : ''}
<section id="fc"${tabs ? ' role="tabpanel" aria-labelledby="tab-fc"' : ''}${D.cards.length ? '' : ' hidden'}>
 <p class="meta" id="fc-prog"></p><div class="bar" role="progressbar" id="fc-bar" aria-labelledby="fc-prog" aria-valuemin="0"><i></i></div><p class="meta" id="fc-master"></p>
 <button id="fc-card" type="button" aria-live="polite"><small id="fc-side"></small><img id="fc-img" alt="" hidden><span id="fc-text"></span></button>
 <div class="row"><button type="button" class="go" id="fc-flip">${esc(L.flip)}</button></div>
 <div class="row" id="fc-acts" hidden><button type="button" class="go" id="fc-knew">${esc(L.knew)}</button><button type="button" id="fc-again">${esc(L.again)}</button></div>
 <div id="fc-end" hidden><p role="status">${esc(L.roundDone)}</p><div class="row"><button type="button" class="go" id="fc-more">${esc(L.another)}</button></div></div>
 <div class="row"><button type="button" id="fc-shuffle">${esc(L.shuffle)}</button><button type="button" id="fc-reset">${esc(L.reset)}</button></div>
 <p class="meta">${esc(L.keys)}</p>
</section>
<section id="pr"${tabs ? ' role="tabpanel" aria-labelledby="tab-pr" hidden' : D.items.length ? '' : ' hidden'}>
 <p class="meta" id="pr-count"></p><div id="pr-q"></div><div id="pr-fb" aria-live="polite"></div>
 <div class="row"><button type="button" class="go" id="pr-check">${esc(L.check)}</button><button type="button" class="go" id="pr-next" hidden>${esc(L.next)}</button></div>
</section>
</main>
<script>
(${studyRuntime})(${jsData(D)}, ${jsData(L)}, ${publicActivity}, (function () { var gradeActivity = ${gradeActivity}; return ${gradeAnswer}; })());
</script></body></html>`;
}

export function exportStudy(deck = state.deck, opts = {}) {
  const D = studyData(deck, opts);
  if (!D.cards.length && !D.items.length) return 0;
  download(new Blob([studyHTML(deck, opts)], { type: 'text/html' }), slug(deck.name) + '-' + slug(t('Fichas y práctica')) + '.html');
  return D.cards.length + D.items.length;
}

// Runs in the page (embedded with toString(): no imports, no outer variables).
export function studyRuntime(D, L, publicActivity, gradeAnswer) {
  var $ = function (id) { return document.getElementById(id); };
  var mk = function (tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  var shuffle = function (a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; } return a; };
  var fill = function (s, n, tt) { return s.replace('{n}', n).replace('{t}', tt); };
  // Tabs (arrow keys between them, as WAI-ARIA's tabs).
  var tabs = [].slice.call(document.querySelectorAll('[role=tab]'));
  var show = function (tab, focus) { tabs.forEach(function (x) { var on = x === tab; x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1; $(x.getAttribute('aria-controls')).hidden = !on; }); if (focus) tab.focus(); };
  tabs.forEach(function (tb, i) {
    tb.onclick = function () { show(tb); };
    tb.onkeydown = function (e) { if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return; e.preventDefault(); show(tabs[(i + 1) % tabs.length], true); };
  });

  // ---- Flashcards ----
  var boxes = {}; try { boxes = JSON.parse(localStorage.getItem(D.key)) || {}; } catch (e) { boxes = {}; }
  var save = function () { try { localStorage.setItem(D.key, JSON.stringify(boxes)); } catch (e) {} };
  var queue = [], done = 0, total = 0, cur = null, flipped = false;
  var draw = function () {
    var end = !cur, mastered = D.cards.filter(function (c) { return (boxes[c.id] || 0) >= 3; }).length;
    $('fc-end').hidden = !end; $('fc-card').hidden = end; $('fc-acts').hidden = end || !flipped; $('fc-flip').hidden = end || flipped;
    $('fc-prog').textContent = fill(L.progress, done, total); $('fc-master').textContent = fill(L.mastered, mastered, D.cards.length);
    var bar = $('fc-bar'); bar.setAttribute('aria-valuemax', String(total)); bar.setAttribute('aria-valuenow', String(done)); bar.firstChild.style.width = (total ? done / total * 100 : 0) + '%';
    if (end) return;
    $('fc-side').textContent = flipped ? L.back : L.front; $('fc-text').textContent = flipped ? cur.b : cur.f;
    var img = $('fc-img'); img.hidden = !(cur.img && !flipped); if (cur.img) img.src = cur.img;
  };
  var next = function () { flipped = false; cur = queue[0] || null; draw(); };
  // (The ones in the lowest boxes first, shuffled among themselves.)
  var start = function () { queue = shuffle(D.cards).sort(function (a, b) { return (boxes[a.id] || 0) - (boxes[b.id] || 0); }); total = queue.length; done = 0; next(); };
  var flip = function () { if (!cur) return; flipped = !flipped; draw(); };
  var knew = function () { if (!cur || !flipped) return; boxes[cur.id] = Math.min(5, (boxes[cur.id] || 0) + 1); save(); queue.shift(); done++; next(); ($('fc-card').hidden ? $('fc-more') : $('fc-card')).focus(); };
  var again = function () { if (!cur || !flipped) return; boxes[cur.id] = 0; save(); queue.shift(); queue.splice(Math.min(3, queue.length), 0, cur); next(); $('fc-card').focus(); };
  if (D.cards.length) {
    $('fc-card').onclick = flip; $('fc-flip').onclick = function () { flip(); $('fc-knew').focus(); };
    $('fc-knew').onclick = knew; $('fc-again').onclick = again; $('fc-more').onclick = function () { start(); $('fc-card').focus(); };
    $('fc-shuffle').onclick = function () { queue = shuffle(queue); next(); };
    $('fc-reset').onclick = function () { if (!confirm(L.resetAsk)) return; boxes = {}; save(); start(); };
    document.addEventListener('keydown', function (e) {
      if ($('fc').hidden || /INPUT|SELECT|TEXTAREA/.test((e.target || {}).tagName || '') || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === '1') knew(); else if (e.key === '2') again();
      else if (e.key === ' ' && e.target === document.body) { e.preventDefault(); flip(); }
    });
    start();
  }

  // ---- Practice ----
  var P = { list: [], i: 0, right: 0, wrong: [] }, answer = null, checked = false;
  var grade = function (p, a) {
    if (p.kind === 'number') { var v = parseFloat(String(a).replace(',', '.')); return isFinite(v) && Math.abs(v - +p.answer) <= (+p.tolerance || 0) + 1e-9 ? 1 : 0; }
    return gradeAnswer(p, a) || 0;
  };
  var drawQ = function (focus) {
    var box = $('pr-q'), fb = $('pr-fb'); box.innerHTML = ''; fb.innerHTML = ''; checked = false; answer = null;
    $('pr-next').hidden = true; $('pr-check').hidden = false; $('pr-check').disabled = false;
    if (P.i >= P.list.length) {
      $('pr-count').textContent = ''; $('pr-check').hidden = true;
      var h = mk('h2', '', fill(L.score, P.right, P.list.length)); h.tabIndex = -1; box.appendChild(h);
      var row = mk('div', 'row');
      if (P.wrong.length) { var r = mk('button', 'go', L.retry); r.type = 'button'; r.onclick = function () { begin(P.wrong.slice()); }; row.appendChild(r); }
      var s = mk('button', P.wrong.length ? '' : 'go', L.restart); s.type = 'button'; s.onclick = function () { begin(D.items.slice()); }; row.appendChild(s);
      box.appendChild(row); if (focus) h.focus(); return;
    }
    var p = P.list[P.i], pub = p.kind === 'quiz' || p.kind === 'number' ? null : publicActivity(p);
    $('pr-count').textContent = fill(L.qOf, P.i + 1, P.list.length);
    var q = mk('h2', '', p.question); q.id = 'pr-h'; q.tabIndex = -1; box.appendChild(q);
    if (p.kind === 'quiz') {
      var grp = mk('div'); grp.setAttribute('role', 'group'); grp.setAttribute('aria-labelledby', 'pr-h');
      (p.options || []).forEach(function (o, i) { var b = mk('button', 'opt', o); b.type = 'button'; b.setAttribute('aria-pressed', 'false');
        b.onclick = function () { if (checked) return; answer = i; [].forEach.call(grp.children, function (x) { x.setAttribute('aria-pressed', String(x === b)); x.classList.toggle('go', x === b); }); };
        grp.appendChild(b); });
      box.appendChild(grp);
    } else if (p.kind === 'number') {
      var lab = mk('label', 'pair'); lab.appendChild(mk('b', '', L.numberAns));
      var inp = mk('input'); inp.type = 'text'; inp.inputMode = 'decimal'; inp.oninput = function () { answer = inp.value; }; lab.appendChild(inp);
      if (p.unit) lab.appendChild(mk('span', '', p.unit)); box.appendChild(lab);
    } else if (p.kind === 'order') {
      answer = pub.items.slice(); var list = mk('div');
      var drawList = function (focusAt, dir) { list.innerHTML = ''; answer.forEach(function (txt, i) {
        var row = mk('div', 'item'); row.appendChild(mk('b', '', (i + 1) + '.')); row.appendChild(mk('span', '', txt));
        var up = mk('button', '', '▲'), dn = mk('button', '', '▼'); up.type = dn.type = 'button';
        up.setAttribute('aria-label', L.up + ': ' + txt); dn.setAttribute('aria-label', L.down + ': ' + txt); up.disabled = !i || checked; dn.disabled = i === answer.length - 1 || checked;
        up.onclick = function () { var x = answer[i - 1]; answer[i - 1] = answer[i]; answer[i] = x; drawList(i - 1, 'up'); };
        dn.onclick = function () { var x = answer[i + 1]; answer[i + 1] = answer[i]; answer[i] = x; drawList(i + 1, 'dn'); };
        row.appendChild(up); row.appendChild(dn); list.appendChild(row);
        if (focusAt === i) setTimeout(function () { var f = dir === 'up' ? (up.disabled ? dn : up) : (dn.disabled ? up : dn); f.focus(); });
      }); };
      drawList(); box.appendChild(list);
    } else if (p.kind === 'match' || p.kind === 'sort' || p.kind === 'label') {
      var lefts = p.kind === 'match' ? pub.left : p.kind === 'sort' ? pub.items.map(function (x) { return x.t; }) : pub.points.map(function (_, i) { return String(i + 1); });
      var opts = p.kind === 'match' ? pub.right : p.kind === 'sort' ? pub.cats : pub.labels, at = function (i) { return p.kind === 'sort' ? pub.items[i].i : i; };
      answer = lefts.map(function () { return ''; });
      if (p.kind === 'label' && pub.image) {
        var pic = mk('div', 'pic'), im = mk('img'); im.src = pub.image; im.alt = ''; pic.appendChild(im);
        pub.points.forEach(function (pt, i) { var m = mk('b', '', String(i + 1)); m.style.left = pt.x + '%'; m.style.top = pt.y + '%'; m.setAttribute('aria-hidden', 'true'); pic.appendChild(m); });
        box.appendChild(pic);
      }
      lefts.forEach(function (l, i) {
        var lab = mk('label', 'pair'); lab.appendChild(mk('b', '', l));
        var s = mk('select'); s.appendChild(mk('option', '', L.choose)); s.firstChild.value = '';
        opts.forEach(function (o) { var x = mk('option', '', o); x.value = o; s.appendChild(x); });
        s.onchange = function () { answer[at(i)] = s.value; }; lab.appendChild(s); box.appendChild(lab);
      });
    } else if (p.kind === 'gaps') {
      answer = []; var para = mk('p', 'gaps'), n = 0;
      pub.parts.forEach(function (part) {
        if (part !== null) { para.appendChild(document.createTextNode(part)); return; }
        var k = n++, g = mk('input'); g.type = 'text'; g.setAttribute('aria-label', L.gap.replace('{n}', k + 1)); answer[k] = '';
        g.oninput = function () { answer[k] = g.value; }; para.appendChild(g);
      });
      box.appendChild(para);
    }
    if (focus) q.focus();             // (not when the page opens: the reader starts at its top)
  };
  var check = function () {
    if (checked || !P.list[P.i]) return;
    var p = P.list[P.i], s = grade(p, answer), pc = Math.round(s * 100), fb = $('pr-fb');
    checked = true; if (s === 1) P.right++; else P.wrong.push(p);
    [].forEach.call($('pr-q').querySelectorAll('button,select,input'), function (x) { x.disabled = true; });
    var f = mk('div', 'fb ' + (s === 1 ? 'ok' : 'ko'), s === 1 ? L.right : (pc ? L.partly.replace('{n}', pc) : L.wrong) + '\n' + L.was + '\n' + p.ans);
    f.setAttribute('role', 'status'); fb.innerHTML = ''; fb.appendChild(f);
    $('pr-check').hidden = true; $('pr-next').hidden = false; $('pr-next').focus();
  };
  var begin = function (list) { P = { list: list, i: 0, right: 0, wrong: [] }; drawQ(true); };
  if (D.items.length) {
    $('pr-check').onclick = check; $('pr-next').onclick = function () { P.i++; drawQ(true); };
    P = { list: D.items.slice(), i: 0, right: 0, wrong: [] }; drawQ(false);
  }
}
