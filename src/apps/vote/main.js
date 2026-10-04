// Audience voting page: connects to the presentation's peer
// ("revela-vote-CODE") and answers the poll on the current slide.

import { PEERJS, loadScript } from '../../core/vendor.js';
import { peerOptions } from '../../core/ice.js';

const $ = s => document.querySelector(s);
const show = id => ['join', 'poll', 'wait'].forEach(x => { $('#' + x).hidden = x !== id; });
const voter = (() => { try { let v = localStorage.getItem('revela.voter'); if (!v) { v = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('revela.voter', v); } return v; } catch { return Math.random().toString(36).slice(2); } })();
let conn = null, poll = null, answer = null;

const loadPeer = () => loadScript(PEERJS, 'Peer');

async function join(code) {
  code = code.trim().toUpperCase(); if (code.length !== 5) { $('#err').textContent = 'El código tiene 5 caracteres.'; return; }
  $('#go').disabled = true; $('#err').textContent = ''; $('#status').textContent = 'Conectando…';
  try { await loadPeer(); } catch { $('#err').textContent = 'No se pudo cargar la conexión.'; $('#go').disabled = false; return; }
  const me = new window.Peer(await peerOptions());
  me.on('open', () => {
    conn = me.connect('revela-vote-' + code, { reliable: true });
    conn.on('open', () => { $('#status').textContent = 'Conectado'; $('#status').classList.add('on'); show('wait'); });
    conn.on('data', onData);
    conn.on('close', () => { $('#status').textContent = 'Desconectado'; $('#status').classList.remove('on'); });
  });
  me.on('error', e => { $('#err').textContent = e.type === 'peer-unavailable' ? 'No hay ninguna presentación con ese código.' : 'Error de conexión.'; $('#go').disabled = false; $('#status').textContent = 'Sin conectar'; });
}

const myUps = new Set();
function renderQA(list) {
  const box = $('#qa-list'); if (!box) return;
  box.innerHTML = list.length ? '' : '<p>Aún no hay preguntas. ¡Sé el primero!</p>';
  for (const q of list) {
    const row = document.createElement('div'); row.className = 'qa-item';
    const up = document.createElement('button'); up.className = 'opt qa-up' + (myUps.has(q.id) ? ' on' : ''); up.textContent = '▲ ' + q.up;
    up.addEventListener('click', () => { myUps.has(q.id) ? myUps.delete(q.id) : myUps.add(q.id); conn?.send({ type: 'vote', pollId: poll.pollId, voter, answer: { up: q.id } }); });
    const tx = document.createElement('span'); tx.textContent = q.text;
    row.append(up, tx); box.appendChild(row);
  }
}
// Quiz: a nickname (kept on this phone), a tap answers at once, the time left, then how it went.
const TILES = ['#e21b3c', '#1368ce', '#d89e00', '#26890c', '#864cbf', '#0aa3a3'];
let quizTimer = null;
const nick = () => { try { return localStorage.getItem('revela.nick') || ''; } catch { return ''; } };
function renderQuiz(box) {
  $('#send').hidden = true;
  const top = document.createElement('div'); top.className = 'quiz-top';
  const name = document.createElement('input'); name.type = 'text'; name.maxLength = 24; name.placeholder = 'Tu apodo'; name.value = nick();
  name.addEventListener('input', () => { try { localStorage.setItem('revela.nick', name.value.trim()); } catch {} });
  const clock = document.createElement('span'); clock.className = 'quiz-left'; top.append(name, clock);
  const grid = document.createElement('div'); grid.className = 'quiz-grid';
  poll.options.forEach((o, i) => {
    const b = document.createElement('button'); b.className = 'quiz-opt'; b.style.background = TILES[i % TILES.length]; b.textContent = o;
    b.addEventListener('click', () => {
      if (!conn?.open || answer != null) return;
      answer = i; conn.send({ type: 'vote', pollId: poll.pollId, voter, answer: i, name: name.value.trim() });
      grid.querySelectorAll('button').forEach(x => { x.disabled = x !== b; x.classList.toggle('on', x === b); });
    });
    grid.appendChild(b);
  });
  const res = document.createElement('div'); res.id = 'quiz-res';
  box.append(top, grid, res);
  const end = Date.now() + (poll.left ?? poll.time ?? 20) * 1000;
  clearInterval(quizTimer);
  quizTimer = setInterval(() => { const s = Math.max(0, Math.ceil((end - Date.now()) / 1000)); clock.textContent = s + ' s'; if (!s) clearInterval(quizTimer); }, 250);
  if (poll.revealed) grid.querySelectorAll('button').forEach(x => { x.disabled = true; });
}
function quizResult(d) {
  const box = $('#quiz-res'); if (!box || poll?.pollId !== d.pollId) return;
  clearInterval(quizTimer); $('#answers').querySelectorAll('button').forEach(x => { x.disabled = true; });
  const part = poll?.pub && d.answered && !d.ok && d.pts > 0;       // (activities: some right)
  box.className = 'quiz-res'; box.style.background = !d.answered ? '#555' : d.ok ? '#26890c' : part ? '#b07d00' : '#b3261e';
  box.innerHTML = `<b>${!d.answered ? 'Sin respuesta' : d.ok ? (poll?.pub ? '¡Todo correcto!' : '¡Correcto!') : part ? `${Math.round(d.pts / 10)} % de aciertos` : 'Fallaste'}</b>+${d.pts} puntos · ${d.total} en total`
    + (d.rank ? `<br>Vas ${d.rank}.º de ${d.of}` : '');
}
// Classroom: the presenter's current slide, drawn here without its scripts (sandboxed).
let styles = '', lastSlide = null;
function showSlide(d) {
  lastSlide = d;
  const view = $('#slide-view'), f = view.querySelector('iframe'), w = +d.w || 1280, h = +d.h || 720;
  view.hidden = !d.html;
  f.style.width = w + 'px'; f.style.height = h + 'px';
  f.srcdoc = `<!doctype html><html><head><meta charset="utf-8">${styles}<style>html,body{margin:0;overflow:hidden;background:#000}
    .reveal{width:${w}px;height:${h}px;position:relative;overflow:hidden}.reveal .slides{position:absolute!important;inset:0;width:${w}px!important;height:${h}px!important;margin:0!important;transform:none!important;left:0!important;top:0!important}
    .reveal .slides>section.present{display:block!important;visibility:visible!important;transform:none!important}.reveal .backgrounds{position:absolute;inset:0}
    .reveal .slide-background.present{display:block!important;visibility:visible!important;opacity:1!important}</style></head>
    <body><div class="${String(d.cls || 'reveal').replace(/"/g, '')}">${d.bg ? `<div class="backgrounds">${d.bg}</div>` : ''}<div class="slides">${d.html}</div></div></body></html>`;
  $('#slide-n').textContent = d.n && d.of ? `${d.n} / ${d.of}` : '';
  $('#wait h1').textContent = 'Sigue la presentación'; $('#wait p').textContent = 'Cuando haya una pregunta o una actividad, aparecerá aquí.';
  fit();
}
function fit() {
  const view = $('#slide-view'), f = view.querySelector('iframe'); if (view.hidden || !lastSlide) return;
  const w = +lastSlide.w || 1280, h = +lastSlide.h || 720, k = view.clientWidth / w;
  f.style.transform = `scale(${k})`; view.style.height = Math.round(h * k) + 'px';
}
window.addEventListener('resize', fit);
if (window.ResizeObserver) new ResizeObserver(fit).observe($('#slide-view'));

// Live captions from the presenter: the original, or translated — here, with
// the browser's own translator when it has one (nothing leaves the device);
// else by the presenter (if they allow it).
let ccLang = '', ccLines = [], translator = null, ccFrom = 'es';
const ccShow = (interim = '') => { $('#cc').hidden = false; $('#cc-text').innerHTML = ''; $('#cc-text').append(ccLines.slice(-2).join(' '), ...(interim ? [' ', el('i', { textContent: interim })] : [])); };
async function localTranslator(to) {
  if (!('Translator' in self)) return null;
  try { const T = self.Translator, opts = { sourceLanguage: ccFrom, targetLanguage: to };
    if ((await T.availability(opts)) === 'unavailable') return null; return await T.create(opts); } catch { return null; }
}
$('#cc-lang').addEventListener('change', async e => {
  ccLang = e.target.value; ccLines = []; translator = null; $('#cc-note').textContent = '';
  if (ccLang && ccLang !== ccFrom) {
    translator = await localTranslator(ccLang);
    if (!translator) { conn?.send({ type: 'lang', lang: ccLang }); $('#cc-note').textContent = 'Traducción pedida a quien presenta.'; }
    else conn?.send({ type: 'lang', lang: '' });
  } else conn?.send({ type: 'lang', lang: '' });
});
async function onCaption(d) {
  if (!d.translated) ccFrom = String(d.lang || 'es').slice(0, 2);   // (the speaker's language)
  const want = ccLang && ccLang !== ccFrom;
  if (d.translated) { if (d.lang === ccLang) { ccLines.push(d.text); ccShow(); } return; }
  if (!want) { if (d.final) { ccLines.push(d.text); ccShow(); } else ccShow(d.text); return; }
  if (translator && d.final) { try { ccLines.push(await translator.translate(d.text)); ccShow(); } catch {} }
  else if (!translator && !d.final) ccShow(d.text);               // (the original while the translation comes)
}

function onData(d) {
  if (d?.type === 'caption') { onCaption(d); return; }
  if (d?.type === 'css') { styles = String(d.css || ''); return; }
  if (d?.type === 'slide') { showSlide(d); return; }
  if (d?.type === 'quizresult') { quizResult(d); return; }
  if (d?.type === 'qa') { if (poll?.pollId === d.pollId) renderQA(d.list || []); return; }
  if (d?.type === 'ok') { if (poll?.pub) return; if (poll?.kind === 'quiz') { const r = $('#quiz-res'); if (r && !r.textContent) r.textContent = '✔ Respuesta enviada. Espera al resultado…'; return; } $('#done').hidden = false; return; }
  if (d?.type !== 'poll') return;
  if (!d.poll) { poll = null; show('wait'); return; }
  if (poll?.pollId === d.poll.pollId) return;               // same question: keep the choice
  poll = d.poll; answer = poll.kind === 'multi' ? [] : null;
  $('#q').textContent = poll.question; $('#done').hidden = true; renderAnswers(); show('poll');
}

// Activities (put in order, match, fill in the gaps, label a picture): the
// answer is a list of texts; the presentation marks it (it alone knows the answers).
const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
function nickField(box) {
  const name = el('input', { type: 'text', maxLength: 24, placeholder: 'Tu apodo', value: nick() });
  name.addEventListener('input', () => { try { localStorage.setItem('revela.nick', name.value.trim()); } catch {} });
  box.append(el('div', { className: 'quiz-top' }, name)); return name;
}
const choose = (list, onPick) => { const s = el('select'); s.append(el('option', { value: '', textContent: '—' }), ...list.map(x => el('option', { value: x, textContent: x }))); s.addEventListener('change', () => onPick(s.value)); return s; };
function renderActivity(box) {
  const pub = poll.pub || {}, name = nickField(box);
  if (poll.kind === 'order') {
    answer = pub.items.slice();
    const list = el('div', { style: 'display:flex;flex-direction:column;gap:8px' });
    const draw = () => { list.innerHTML = ''; answer.forEach((txt, i) => {
      const up = el('button', { textContent: '▲', disabled: !i, ariaLabel: 'Subir' }), down = el('button', { textContent: '▼', disabled: i === answer.length - 1, ariaLabel: 'Bajar' });
      up.addEventListener('click', () => { [answer[i - 1], answer[i]] = [answer[i], answer[i - 1]]; draw(); });
      down.addEventListener('click', () => { [answer[i + 1], answer[i]] = [answer[i], answer[i + 1]]; draw(); });
      list.append(el('div', { className: 'act-row' }, el('b', { className: 'act-num', textContent: i + 1 }), el('span', { textContent: txt }), up, down)); }); };
    draw(); box.append(el('p', { textContent: 'Ordena de arriba abajo:' }), list);
  } else if (poll.kind === 'match') {
    answer = pub.left.map(() => '');
    pub.left.forEach((l, i) => box.append(el('div', { className: 'act-row' }, el('span', { textContent: l }), choose(pub.right, v => { answer[i] = v; }))));
  } else if (poll.kind === 'gaps') {
    answer = []; const p = el('div', { className: 'act-text' }); let n = 0;
    for (const part of pub.parts) {
      if (part !== null) { p.append(part); continue; }
      const k = n++, i = el('input', { type: 'text', maxLength: 60, autocomplete: 'off', ariaLabel: 'Hueco ' + (k + 1) }); answer[k] = '';
      i.addEventListener('input', () => { answer[k] = i.value; }); p.append(i);
    }
    box.append(p);
  } else if (poll.kind === 'label') {
    answer = pub.points.map(() => '');
    const pic = el('div', { className: 'act-pic' }, el('img', { src: pub.image, alt: '' }));
    pub.points.forEach((pt, i) => pic.append(el('b', { className: 'act-num', textContent: i + 1, style: `left:${pt.x}%;top:${pt.y}%` })));
    box.append(pic, ...pub.points.map((_, i) => el('div', { className: 'act-row' }, el('b', { className: 'act-num', textContent: i + 1 }), choose(pub.labels, v => { answer[i] = v; }))));
  }
  box.append(el('div', { id: 'quiz-res' }));
  box.nameField = name;
}

function renderAnswers() {
  const box = $('#answers'); box.innerHTML = '';
  $('#send').hidden = poll.kind === 'qa';
  if (poll.kind === 'quiz') { renderQuiz(box); return; }
  if (poll.pub) { renderActivity(box); return; }
  if (poll.kind === 'qa') {
    const ta = document.createElement('textarea'); ta.maxLength = 200; ta.rows = 3; ta.placeholder = 'Escribe tu pregunta…';
    const ask = document.createElement('button'); ask.textContent = 'Preguntar';
    ask.addEventListener('click', () => { const v = ta.value.trim(); if (!v || !conn?.open) return; conn.send({ type: 'vote', pollId: poll.pollId, voter, answer: { ask: v } }); ta.value = ''; });
    const list = document.createElement('div'); list.id = 'qa-list';
    box.append(ta, ask, list); renderQA([]); return;
  }
  if (poll.kind === 'word') {
    const i = document.createElement('input'); i.type = 'text'; i.maxLength = 60; i.placeholder = 'Tu respuesta (separa varias con comas)';
    i.addEventListener('input', () => { answer = i.value; }); box.appendChild(i); return;
  }
  if (poll.kind === 'rating') {
    const row = document.createElement('div'); row.className = 'stars';
    for (let n = 1; n <= 5; n++) {
      const b = document.createElement('button'); b.className = 'opt'; b.textContent = n + ' ★';
      b.addEventListener('click', () => { answer = n; row.querySelectorAll('button').forEach((x, k) => x.classList.toggle('on', k < n)); });
      row.appendChild(b);
    }
    box.appendChild(row); return;
  }
  poll.options.forEach((o, i) => {
    const b = document.createElement('button'); b.className = 'opt'; b.textContent = o;
    b.addEventListener('click', () => {
      if (poll.kind === 'multi') { answer = answer.includes(i) ? answer.filter(x => x !== i) : [...answer, i]; b.classList.toggle('on'); }
      else { answer = i; box.querySelectorAll('.opt').forEach(x => x.classList.toggle('on', x === b)); }
    });
    box.appendChild(b);
  });
}

$('#send').addEventListener('click', () => {
  if (!conn?.open || !poll) return;
  if (answer == null || answer === '' || (Array.isArray(answer) && !answer.length)) return;
  if (poll.pub) {                                         // (an activity: sent once, with the nickname)
    conn.send({ type: 'vote', pollId: poll.pollId, voter, answer, name: $('#answers').nameField?.value.trim() || '' });
    $('#send').hidden = true; $('#answers').querySelectorAll('input,select,button').forEach(x => { x.disabled = true; });
    const r = $('#quiz-res'); if (r) r.textContent = '✔ Respuesta enviada. Espera a la corrección…';
    return;
  }
  conn.send({ type: 'vote', pollId: poll.pollId, voter, answer });
});
$('#go').addEventListener('click', () => join($('#code').value));
$('#code').addEventListener('keydown', e => { if (e.key === 'Enter') join($('#code').value); });
const pre = new URLSearchParams(location.search).get('c');
if (pre) { $('#code').value = pre; join(pre); }
// (For the tests: feed it messages as if from the presentation.)
if (new URLSearchParams(location.search).has('test')) window.__vote = { onData: d => { conn = conn || { open: true, send: m => (window.__sent = window.__sent || []).push(m) }; onData(d); } };
