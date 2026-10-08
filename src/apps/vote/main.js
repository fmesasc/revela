// Audience voting page: connects to the presentation's peer
// ("revela-vote-CODE") and answers the poll on the current slide.
// vote.html?doc=<id>&poll=<pollId>: a poll opened to be answered later, without anyone presenting (Revela's cloud keeps
// the answers: server/cloudflare/docs.js; the editor brings them into its results).

import { PEERJS, loadScript } from '../../core/vendor.js';
import { peerOptions } from '../../core/ice.js';
import { readingItems, readingHTML } from '../../io/runtime/reading.js';

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
    conn.on('open', () => { $('#status').textContent = 'Conectado'; $('#status').classList.add('on'); show('wait');
      let tm = ''; try { tm = sessionStorage.getItem('revela.team') || ''; } catch {}
      conn.send({ type: 'hi', voter, name: nick(), ...(tm && { team: tm }) }); });     // (the name, for «someone at random», and the team: optional)
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
      answer = i; grid.querySelectorAll('button').forEach(x => { x.disabled = x !== b; x.classList.toggle('on', x === b); });
      const go = sure => { conn.send({ type: 'vote', pollId: poll.pollId, voter, answer: i, name: name.value.trim(), ...(sure != null && { sure }) }); remember(poll, i, { sure }); };
      if (poll.mode !== 'confidence') { go(null); return; }
      // (Confidence mode: how sure — sure and right scores most, sure and wrong loses some.)
      const ask = el('div', { style: 'display:flex;gap:10px;margin-top:10px' },
        Object.assign(el('button', { textContent: '💪 Estoy seguro', style: 'flex:1;background:#26890c' }), { onclick: () => { ask.remove(); go(true); } }),
        Object.assign(el('button', { textContent: '🤔 No del todo', style: 'flex:1;background:#555' }), { onclick: () => { ask.remove(); go(false); } }));
      grid.after(ask);
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
  resultOf(d.pollId, !d.answered ? 'Sin respuesta' : `${d.ok ? 'Correcto' : d.pts > 0 ? Math.round(d.pts / 10) + ' % de aciertos' : 'Fallado'} · ${d.pts} puntos`);
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
  $('#read-bar').hidden = !d.html; paintReading();
  $('#wait h1').textContent = 'Sigue la presentación'; $('#wait p').textContent = 'Cuando haya una pregunta o una actividad, aparecerá aquí.';
  fit();
}
// Easy reading: the slide's words in a calm column (reading.js), larger, spaced, read aloud if wanted.
let readOn = false, readSize = 21;
try { readOn = localStorage.getItem('revela.read') === '1'; readSize = +localStorage.getItem('revela.read.size') || 21; } catch {}
function paintReading() {
  const box = $('#read-box'); $('#read-go').setAttribute('aria-pressed', String(readOn)); box.hidden = !readOn || !lastSlide?.html;
  if (box.hidden) return;
  box.style.setProperty('--rs', readSize + 'px');
  const doc = new DOMParser().parseFromString(`<div class="slides">${lastSlide.html}</div>`, 'text/html');
  const sec = doc.querySelector('section.present') || doc.querySelector('section');
  const items = readingItems(sec);
  $('#read-text').innerHTML = items.length ? readingHTML(items, { img: 'Imagen', q: 'Pregunta' }) : '<p>Esta diapositiva no tiene texto.</p>';
  stopSpeech();
}
function stopSpeech() { try { speechSynthesis.cancel(); } catch {} $('#read-say').textContent = '▶ Leer en voz alta'; }
$('#read-go').addEventListener('click', () => { readOn = !readOn; try { localStorage.setItem('revela.read', readOn ? '1' : '0'); } catch {} paintReading(); });
$('#read-sm').addEventListener('click', () => { readSize = Math.max(16, readSize - 2); try { localStorage.setItem('revela.read.size', readSize); } catch {} paintReading(); });
$('#read-lg').addEventListener('click', () => { readSize = Math.min(40, readSize + 2); try { localStorage.setItem('revela.read.size', readSize); } catch {} paintReading(); });
$('#read-say').addEventListener('click', () => {
  if (!window.speechSynthesis) return;
  if (speechSynthesis.speaking) { stopSpeech(); return; }
  const u = new SpeechSynthesisUtterance($('#read-text').innerText); u.lang = lastSlide?.lang || document.documentElement.lang || 'es'; u.rate = 0.95; u.onend = stopSpeech;
  speechSynthesis.speak(u); $('#read-say').textContent = '■ Parar';
});

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

// The name typed at the start (kept on this phone, also for the quizzes).
const nickIn = document.getElementById('nick');
if (nickIn) { nickIn.value = (() => { try { return localStorage.getItem('revela.nick') || ''; } catch { return ''; } })();
  nickIn.addEventListener('input', () => { try { localStorage.setItem('revela.nick', nickIn.value.trim()); } catch {} }); }
// Stars and level (one for each answer, one more for each right one), shown at the top.
function showStars(d) { let b = document.getElementById('stars'); if (!b) { b = el('span', { id: 'stars', style: 'margin-left:8px;font-size:13px;font-weight:700;color:#ffd34d' }); $('header').insertBefore(b, $('#status')); }
  b.textContent = `⭐ ${d.stars} · Nivel ${d.level}`; }
// Teams (when the quizzes are played in teams): chosen once, before answering.
let team = '';
function chooseTeam(teams, then) {
  try { team = sessionStorage.getItem('revela.team') || ''; } catch {}
  if (teams.includes(team)) { then(); return; }
  const box = $('#answers'); box.innerHTML = ''; $('#send').hidden = true;
  box.append(el('p', { textContent: 'Elige tu equipo:' }), ...teams.map((tm, i) => Object.assign(el('button', { className: 'opt', textContent: tm, style: `border-color:${TILES[i % TILES.length]}` }), {
    onclick: () => { team = tm; try { sessionStorage.setItem('revela.team', tm); } catch {} conn?.send({ type: 'hi', voter, name: nick(), team }); then(); } })));
}
function onData(d) {
  if (d?.type === 'stars') { showStars(d); return; }
  if (d?.type === 'feedback') {                         // (the AI's mark of my open answer, and its comment)
    resultOf(d.pollId, `${d.score}/10 · ${d.text || ''}`);
    const box = $('#answers'); box.querySelector('.fb')?.remove();
    box.append(el('div', { className: 'quiz-res fb', style: `background:${d.score >= 5 ? '#26890c' : '#b07d00'}` }, el('b', { textContent: `${d.score}/10` }), String(d.text || ''))); return; }
  if (d?.type === 'picked') { const p = $('#picked'); p.hidden = false; navigator.vibrate?.(200); setTimeout(() => { p.hidden = true; }, 8000); return; }
  if (d?.type === 'caption') { onCaption(d); return; }
  if (d?.type === 'css') { styles = String(d.css || ''); return; }
  if (d?.type === 'slide') { showSlide(d); return; }
  if (d?.type === 'quizresult') { quizResult(d); return; }
  if (d?.type === 'qa') { if (poll?.pollId === d.pollId) renderQA(d.list || []); return; }
  if (d?.type === 'ok') { if (poll?.pub) return;
    if (d.held) { const h = $('#qa-held'); if (h) { h.hidden = false; h.textContent = '✔ Enviada. Saldrá cuando la apruebe quien presenta.'; } return; } if (poll?.kind === 'quiz') { const r = $('#quiz-res'); if (r && !r.textContent) r.textContent = '✔ Respuesta enviada. Espera al resultado…'; return; } $('#done').hidden = false; return; }
  if (d?.type !== 'poll') return;
  if (!d.poll) { poll = null; show('wait'); return; }
  if (poll?.pollId === d.poll.pollId) return;               // same question: keep the choice
  poll = d.poll; answer = poll.kind === 'multi' ? [] : null;
  $('#q').textContent = poll.question; $('#done').hidden = true; show('poll');
  if (Array.isArray(poll.teams) && poll.teams.length) chooseTeam(poll.teams, () => { $('#send').hidden = false; renderAnswers(); }); else renderAnswers();
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
  } else if (poll.kind === 'sort') {                    // (each item shuffled, with its group; the answer in the items' own order)
    answer = pub.items.map(() => '');
    box.append(el('p', { textContent: 'Elige el grupo de cada uno:' }), ...pub.items.map(it => el('div', { className: 'act-row' }, el('span', { textContent: it.t }), choose(pub.cats, v => { answer[it.i] = v; }))));
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
    const held = el('p', { id: 'qa-held', hidden: true, style: 'color:var(--txt2);font-size:14px' });
    box.append(ta, ask, held, list); renderQA([]); return;
  }
  if (poll.kind === 'word') {
    const i = document.createElement('input'); i.type = 'text'; i.maxLength = 60; i.placeholder = 'Tu respuesta (separa varias con comas)';
    i.addEventListener('input', () => { answer = i.value; }); box.appendChild(i); return;
  }
  if (poll.kind === 'open') {
    const ta = el('textarea', { maxLength: 200, rows: 4, placeholder: 'Escribe tu respuesta…' });
    ta.addEventListener('input', () => { answer = ta.value.trim(); }); box.append(ta); return;
  }
  if (poll.kind === 'number') {                          // (a slider and its number, kept together)
    const lo = Number.isFinite(+poll.min) ? +poll.min : 0, hi = Number.isFinite(+poll.max) ? +poll.max : 100, st = +poll.step > 0 ? +poll.step : (hi - lo > 20 ? 1 : 0.1);
    const r = el('input', { type: 'range', min: lo, max: hi, step: st, value: (lo + hi) / 2, style: 'width:100%' }), n = el('input', { type: 'number', min: lo, max: hi, step: st, value: '', inputMode: 'decimal', style: 'font-size:28px;text-align:center;width:100%;padding:10px;border-radius:12px;border:1px solid var(--line);background:var(--panel);color:var(--txt)' });
    r.addEventListener('input', () => { n.value = r.value; answer = +r.value; });
    n.addEventListener('input', () => { if (n.value !== '' && Number.isFinite(+n.value)) { answer = Math.min(hi, Math.max(lo, +n.value)); r.value = answer; } });
    box.append(el('div', { style: 'display:flex;align-items:center;gap:8px' }, n, poll.unit ? el('b', { textContent: poll.unit }) : ''), r,
      el('div', { style: 'display:flex;justify-content:space-between;font-size:13px;color:var(--txt2)' }, el('span', { textContent: lo }), el('span', { textContent: hi }))); return;
  }
  if (poll.kind === 'draw') {                            // (a drawing with the finger, over the picture if there is one)
    const W = 480, H = 360, c = el('canvas', { width: W, height: H, style: 'width:100%;aspect-ratio:4/3;background:#fff;border-radius:10px;touch-action:none;display:block' }), x = c.getContext('2d');
    const bg = poll.image ? Object.assign(new Image(), { src: poll.image }) : null;
    const paintBg = () => { x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); if (bg?.complete && bg.naturalWidth) { const k = Math.min(W / bg.naturalWidth, H / bg.naturalHeight); x.drawImage(bg, (W - bg.naturalWidth * k) / 2, (H - bg.naturalHeight * k) / 2, bg.naturalWidth * k, bg.naturalHeight * k); } };
    if (bg) bg.onload = paintBg; paintBg();
    let ink = '#1d1d1f', down = false, drawn = false;
    const at = e => { const r = c.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
    c.addEventListener('pointerdown', e => { down = true; c.setPointerCapture(e.pointerId); x.strokeStyle = ink; x.lineWidth = ink === '#ffffff' ? 18 : 4; x.lineCap = x.lineJoin = 'round'; x.beginPath(); x.moveTo(...at(e)); });
    c.addEventListener('pointermove', e => { if (!down) return; x.lineTo(...at(e)); x.stroke(); drawn = true; });
    const end = () => { if (!down) return; down = false; if (drawn) answer = { img: c.toDataURL('image/png'), n: nick() }; };
    c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
    const tools = el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' }, ...['#1d1d1f', '#d93025', '#1a73e8', '#188038', '#f9ab00', '#ffffff'].map(col => {
      const b = el('button', { className: 'opt', ariaLabel: col === '#ffffff' ? 'Borrar' : 'Color', textContent: col === '#ffffff' ? '⌫' : '', style: `flex:1;min-width:40px;padding:12px;background:${col === '#ffffff' ? 'var(--panel)' : col}` });
      b.addEventListener('click', () => { ink = col; tools.querySelectorAll('button').forEach(y => y.classList.toggle('on', y === b)); }); return b; }),
      Object.assign(el('button', { className: 'opt', textContent: 'Empezar de nuevo', style: 'flex:2' }), { onclick: () => { paintBg(); drawn = false; answer = null; } }));
    box.append(c, tools); return;
  }
  if (poll.kind === 'photo') {                           // (a photo of one's work: from the camera or the gallery, made small)
    const prev = el('img', { alt: '', hidden: true, style: 'width:100%;border-radius:10px' }), pick = el('input', { type: 'file', accept: 'image/*', capture: 'environment', hidden: true });
    const btn = el('button', { className: 'opt', textContent: '📷 Hacer o elegir una foto', style: 'text-align:center' });
    btn.addEventListener('click', () => pick.click());
    pick.addEventListener('change', () => { const f = pick.files?.[0]; if (!f) return; const im = new Image();
      im.onload = () => { const k = Math.min(1, 640 / Math.max(im.width, im.height)), cv = el('canvas', { width: Math.round(im.width * k), height: Math.round(im.height * k) });
        cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); URL.revokeObjectURL(im.src);
        let q = 0.7, src = cv.toDataURL('image/jpeg', q); while (src.length > 280000 && q > 0.3) { q -= 0.15; src = cv.toDataURL('image/jpeg', q); }
        answer = { img: src, n: nick() }; prev.src = src; prev.hidden = false; btn.textContent = '📷 Cambiar la foto'; };
      im.src = URL.createObjectURL(f); });
    box.append(btn, pick, prev); return;
  }
  if (poll.kind === 'point') {                           // (a tap on the picture: the point, in % of it)
    const pic = el('div', { className: 'act-pic', style: 'cursor:crosshair' }, el('img', { src: poll.image || '', alt: '' })), dot = el('b', { className: 'act-num', textContent: '●', hidden: true });
    pic.append(dot);
    pic.addEventListener('click', e => { const r = pic.getBoundingClientRect(); answer = { x: (e.clientX - r.left) / r.width * 100, y: (e.clientY - r.top) / r.height * 100 };
      Object.assign(dot.style, { left: answer.x + '%', top: answer.y + '%' }); dot.hidden = false; });
    box.append(el('p', { textContent: 'Toca el punto de la imagen:' }), pic); return;
  }
  if (poll.kind === 'image') {
    const grid = el('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:10px' });
    poll.options.forEach((o, i) => {
      const b = el('button', { className: 'opt', style: 'padding:6px;display:flex;flex-direction:column;gap:6px;align-items:stretch' },
        (poll.images || [])[i] ? el('img', { src: poll.images[i], alt: o, style: 'width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:8px' }) : '', el('span', { textContent: o }));
      b.addEventListener('click', () => { answer = i; grid.querySelectorAll('.opt').forEach(x => x.classList.toggle('on', x === b)); });
      grid.append(b);
    });
    box.append(grid); return;
  }
  if (poll.kind === 'rank') {                            // (the options in the order you prefer: up and down)
    answer = poll.options.map((_, i) => i);
    const list = el('div', { style: 'display:flex;flex-direction:column;gap:8px' });
    const draw = () => { list.innerHTML = ''; answer.forEach((k, i) => {
      const up = el('button', { textContent: '▲', disabled: !i, ariaLabel: 'Subir' }), down = el('button', { textContent: '▼', disabled: i === answer.length - 1, ariaLabel: 'Bajar' });
      up.addEventListener('click', () => { [answer[i - 1], answer[i]] = [answer[i], answer[i - 1]]; draw(); });
      down.addEventListener('click', () => { [answer[i + 1], answer[i]] = [answer[i], answer[i + 1]]; draw(); });
      list.append(el('div', { className: 'act-row' }, el('b', { className: 'act-num', textContent: i + 1 }), el('span', { textContent: poll.options[k] }), up, down)); }); };
    draw(); box.append(el('p', { textContent: 'Ordénalas de la que más prefieres a la que menos:' }), list); return;
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

// My summary (as Pear Deck's takeaways): each question, what I answered and how it went, kept on this phone and saved
// as a page to keep — nothing of it goes anywhere else.
const mine = new Map();
const escH = x => String(x ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function myAnswer(p, a, extra = {}) {
  const o = p.options || [];
  if (a && typeof a === 'object' && a.img) return { img: a.img };
  if (p.kind === 'multi') return { text: (a || []).map(i => o[i]).join(' · ') };
  if (p.kind === 'rating') return { text: '★'.repeat(+a || 0) };
  if (p.kind === 'number') return { text: `${a}${p.unit ? ' ' + p.unit : ''}` };
  if (p.kind === 'rank') return { text: (a || []).map((i, k) => `${k + 1}. ${o[i]}`).join('  ') };
  if (p.kind === 'point') return { text: 'Un punto de la imagen' };
  if (p.pub) return { text: (Array.isArray(a) ? a : []).filter(Boolean).join(' · ') };
  if (Number.isInteger(a) && o[a] != null) return { text: o[a] + (extra.sure != null ? (extra.sure ? ' (seguro)' : ' (sin estar seguro)') : '') };
  return { text: String(a ?? '') };
}
function remember(p, a, extra) { mine.set(p.pollId, { q: p.question, ...myAnswer(p, a, extra), res: mine.get(p.pollId)?.res || '' }); $('#mine').hidden = false; }
function resultOf(pollId, txt) { const m = mine.get(pollId); if (m) m.res = txt; }
$('#mine').addEventListener('click', () => {
  const when = new Date().toLocaleString();
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mi resumen</title>
<style>body{font:17px/1.5 system-ui,sans-serif;max-width:720px;margin:24px auto;padding:0 16px;color:#1d1f24}h1{font-size:24px}li{margin:0 0 18px}b{display:block}small{color:#666}img{max-width:100%;border-radius:8px;border:1px solid #ddd}.r{color:#26890c}</style></head>
<body><h1>Mi resumen</h1><p><small>${escH(nick() || '')} · ${escH(when)} · Revela</small></p><ol>${[...mine.values()].map(m => `<li><b>${escH(m.q)}</b>${m.img ? `<img src="${escH(m.img)}" alt="">` : `<div>${escH(m.text)}</div>`}${m.res ? `<div class="r">${escH(m.res)}</div>` : ''}</li>`).join('')}</ol></body></html>`;
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([html], { type: 'text/html' })), download: 'mi-resumen.html' });
  document.body.append(a); a.click(); a.remove();
});
$('#send').addEventListener('click', () => {
  if (!conn?.open || !poll) return;
  if (answer == null || answer === '' || (Array.isArray(answer) && !answer.length)) return;
  if (poll.pub) {                                         // (an activity: sent once, with the nickname)
    conn.send({ type: 'vote', pollId: poll.pollId, voter, answer, name: $('#answers').nameField?.value.trim() || '' }); remember(poll, answer);
    $('#send').hidden = true; $('#answers').querySelectorAll('input,select,button').forEach(x => { x.disabled = true; });
    const r = $('#quiz-res'); if (r) r.textContent = '✔ Respuesta enviada. Espera a la corrección…';
    return;
  }
  conn.send({ type: 'vote', pollId: poll.pollId, voter, answer }); remember(poll, answer);
});
$('#go').addEventListener('click', () => join($('#code').value));
$('#code').addEventListener('keydown', e => { if (e.key === 'Enter') join($('#code').value); });
const pre = new URLSearchParams(location.search).get('c');
if (pre) { $('#code').value = pre; join(pre); }
// Answered later, by a link: the poll from the cloud, the answer back to it (changeable while it stays open).
const later = new URLSearchParams(location.search);
if (later.get('doc') && later.get('poll')) answerLater(later.get('doc'), later.get('poll'));
async function answerLater(doc, pid) {
  const url = `/api/docs/${encodeURIComponent(doc)}/poll/${encodeURIComponent(pid)}`;
  $('#status').textContent = 'Cargando…';
  try {
    const r = await fetch(url, { credentials: 'omit' }); if (!r.ok) throw new Error(r.status);
    const d = await r.json();
    conn = { open: true, send: m => { if (m.type !== 'vote') return;
      fetch(url, { method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ voter, answer: m.answer }) })
        .then(x => (x.ok ? onData({ type: 'ok', pollId: pid }) : Promise.reject(x.status)))
        .catch(() => alert('No se pudo enviar. Inténtalo de nuevo.')); } };
    $('#status').textContent = d.name || 'Revela'; $('#status').classList.add('on');
    onData({ type: 'poll', poll: d.poll });
  } catch { show('join'); $('#join').innerHTML = '<h1>Esta votación ya no está abierta</h1><p>Pide a quien te la envió un enlace nuevo.</p>'; $('#status').textContent = ''; }
}
// (For the tests: feed it messages as if from the presentation.)
if (new URLSearchParams(location.search).has('test')) window.__vote = { onData: d => { conn = conn || { open: true, send: m => (window.__sent = window.__sent || []).push(m) }; onData(d); } };
