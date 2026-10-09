// Viewer of shared presentations: view.html?d=<Drive file>&a=<API key>#k=<key>
// or view.html?u=<https URL of a sealed copy>#k=<key>. The page fetches the
// sealed copy and opens it with the key in the link or a password.
// view.html?doc=<id>: one in Revela's cloud that anyone with the link can view, presented
// (what the «Insert in a web page» iframe shows), and where «Solo presentar» opens one; without copies when so shared.
// &self=1: the class at its own pace — the name first, then each one goes through it and answers; where they are
// and their marks go to the teacher's panel (server/cloudflare/docs.js progress; ui/dialogs/classpace.js).
// &scorm=1: inside a dynamic SCORM package's launcher (io/export/scorm.js): answered at one's own pace, its marks and
// its slide told to the launcher (&at=N: the slide to come back to).

import { openerPageHTML } from '../../io/share/seal.js';
import { driveSealedURL } from '../../io/cloud/gdrive.js';
import { t, currentLang } from '../../i18n/index.js';
import { docIdFrom, publicDeck } from '../../io/cloud/clouddocs.js';
import { adoptDeck, state } from '../../core/store.js';
import { buildHTML } from '../../io/formats/html.js';
import { scormPage } from '../../io/export/scorm.js';

const p = new URLSearchParams(location.search);
// Only an https address, or a blob made by this same site.
function safeSource(u) {
  try { const x = new URL(u); return x.protocol === 'https:' || (x.protocol === 'blob:' && x.origin === location.origin) ? x.href : null; } catch { return null; }
}
const src = p.get('d') ? driveSealedURL(p.get('d'), p.get('a') || '') : safeSource(p.get('u') || '');
const texts = { locked: t('Presentación protegida'), ask: t('Escribe la contraseña para verla.'), open: t('Abrir'),
  wrong: t('Contraseña incorrecta.'), nokey: t('Falta la clave del enlace: cópialo entero, con lo que va detrás de «#».'),
  loading: t('Abriendo…'), failed: t('No se pudo abrir la presentación: puede que ya no se comparta.'),
  signin: t('Esta presentación es solo para cuentas de {d}. Inicia sesión con Google para verla.') };
const doc = docIdFrom();
if (doc) openCloud(doc);
else if (src) { document.open(); document.write(openerPageHTML({ src, lang: currentLang(), texts })); document.close(); }
else fail(texts.failed);

// It can't be opened: said in the middle of the page, with what to do and a way somewhere (not a dead end).
function fail(msg) {
  const m = document.getElementById('m'); m.className = 'fail'; m.replaceChildren();
  const b = document.createElement('b'); b.textContent = 'Revela';
  const p1 = document.createElement('span'); p1.textContent = msg;
  const p2 = document.createElement('small'); p2.textContent = t('Pide a quien te la envió un enlace nuevo.');
  const a = document.createElement('a'); a.href = 'https://revelaslides.com/'; a.textContent = 'revelaslides.com';
  m.append(b, p1, p2, a);
}

// The class at its own pace: the name (kept on this device) and an id of this device, for the teacher's panel.
function askName(m) {
  return new Promise(done => {
    let v = ''; try { v = localStorage.getItem('revela.nick') || ''; } catch {}
    let voter = ''; try { voter = localStorage.getItem('revela.voter') || ''; if (!voter) { voter = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('revela.voter', voter); } } catch { voter = Math.random().toString(36).slice(2) + Date.now().toString(36); }
    m.className = ''; m.replaceChildren();
    const f = document.createElement('form'); f.style.cssText = 'display:flex;flex-direction:column;gap:10px;max-width:320px;margin:0 auto;font:17px system-ui,sans-serif';
    const l = document.createElement('label'); l.textContent = t('Tu nombre (lo verá tu profesor)');
    const i = Object.assign(document.createElement('input'), { value: v, required: true, maxLength: 40, autocomplete: 'name', style: 'font-size:18px;padding:10px;border-radius:8px;border:1px solid #888' });
    const b = Object.assign(document.createElement('button'), { type: 'submit', textContent: t('Empezar'), style: 'font-size:18px;padding:10px;border-radius:8px;border:0;background:#3f6497;color:#fff' });
    l.append(i); f.append(l, b); m.append(f); i.focus();
    f.addEventListener('submit', e => { e.preventDefault(); const name = i.value.trim(); if (!name) return; try { localStorage.setItem('revela.nick', name); } catch {} m.textContent = texts.loading; done({ name, voter }); });
  });
}

// A tracked link (&r=…) that asks who's looking: their email (and name), told plainly to whom it goes.
function askEmail(m, title) {
  return new Promise(done => {
    let v = {}; try { v = JSON.parse(localStorage.getItem('revela.viewer') || '{}'); } catch {}
    m.className = ''; m.replaceChildren();
    const f = document.createElement('form'); f.style.cssText = 'display:flex;flex-direction:column;gap:10px;max-width:340px;margin:0 auto;font:17px system-ui,sans-serif;text-align:start';
    const h = document.createElement('b'); h.textContent = title || 'Revela';
    const p1 = document.createElement('small'); p1.textContent = t('Quien te la ha enviado pide tu correo para verla: le llegará junto con cuánto tiempo la has mirado.');
    const field = (label, type, value, req) => { const l = document.createElement('label'); l.textContent = label;
      const i = Object.assign(document.createElement('input'), { type, value: value || '', required: req, maxLength: 120, style: 'display:block;width:100%;box-sizing:border-box;font-size:18px;padding:10px;border-radius:8px;border:1px solid #888' }); l.append(i); return [l, i]; };
    const [le, ie] = field(t('Tu correo'), 'email', v.e, true), [ln, inn] = field(t('Tu nombre (opcional)'), 'text', v.n, false);
    ie.autocomplete = 'email'; inn.autocomplete = 'name';
    const b = Object.assign(document.createElement('button'), { type: 'submit', textContent: t('Ver la presentación'), style: 'font-size:18px;padding:10px;border-radius:8px;border:0;background:#3f6497;color:#fff' });
    f.append(h, p1, le, ln, b); m.append(f); ie.focus();
    f.addEventListener('submit', e => { e.preventDefault(); const em = ie.value.trim(), n = inn.value.trim(); if (!em) return;
      try { localStorage.setItem('revela.viewer', JSON.stringify({ e: em, n })); } catch {} m.textContent = texts.loading; done({ e: em, n }); });
  });
}
// What a tracked link's recipient looks at, slide by slide (as the editor's statistics do: a random id of this
// browser, the slide, the time on it), for its owner's statistics.
const beacon = (id, r) => `<script>(function(){var U=${JSON.stringify(`/api/docs/${encodeURIComponent(id)}/view`)},R=${JSON.stringify(r)},V;
try{V=localStorage.getItem('revela.visitor');if(!V){V='v'+Math.random().toString(36).slice(2)+Date.now().toString(36);localStorage.setItem('revela.visitor',V);}}catch(e){V='v'+Math.random().toString(36).slice(2,14);}
function send(b){b.visitor=V;b.r=R;try{fetch(U,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(b),keepalive:true});}catch(e){}}
var cur=null,since=Date.now();function at(){var s=window.Reveal&&Reveal.getCurrentSlide&&Reveal.getCurrentSlide();return s&&s.getAttribute('data-rv-id');}
function check(){var s=at();if(s===cur)return;if(cur)send({slide:cur,ms:Date.now()-since});cur=s;since=Date.now();if(s)send({slide:s,enter:true});}
setInterval(check,1000);document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden'&&cur)send({slide:cur,ms:Date.now()-since});since=Date.now();});
})();</script>`;

// A live broadcast (view.html?doc=…&live=…: server/cloudflare/broadcast.js): the presentation follows whoever presents
// it — slide, step and pointer —, with a small «En directo» mark; when it ends, it says so and stays where it was.
// (The pointer glides between positions: with a big audience it comes a few times a second, not ten.)
const follower = (room, texts) => `<script>(function(){var R=${JSON.stringify(room)},T=${JSON.stringify(texts)},tries=0,dot,mark;
function ui(){mark=document.createElement('div');mark.style.cssText='position:fixed;top:10px;left:10px;z-index:99;background:#c0392b;color:#fff;font:600 13px system-ui;padding:4px 10px;border-radius:12px;pointer-events:none';mark.textContent=T.live;document.body.appendChild(mark);
dot=document.createElement('div');dot.style.cssText='position:fixed;z-index:98;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;background:#ff3b30;box-shadow:0 0 12px #ff3b30;pointer-events:none;display:none;transition:left .2s linear,top .2s linear';document.body.appendChild(dot);}
function go(m){if(!window.Reveal||!Reveal.slide)return;Reveal.slide(m.h||0,m.v||0,m.f==null?undefined:m.f);}
function ptr(m){var sl=document.querySelector('.reveal .slides');if(!sl||m.x==null){dot.style.display='none';return;}var b=sl.getBoundingClientRect();dot.style.left=(b.left+m.x*b.width)+'px';dot.style.top=(b.top+m.y*b.height)+'px';dot.style.display='block';}
function open(){var ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/api/live/'+encodeURIComponent(R));
ws.onmessage=function(e){var m;try{m=JSON.parse(e.data);}catch(x){return;}if(m.t==='hello'){tries=0;mark.textContent=T.live;if(m.state)go(m.state);}else if(m.t==='go')go(m);else if(m.t==='ptr')ptr(m);else if(m.t==='end'){mark.textContent=T.ended;mark.style.background='#555';dot.style.display='none';ws.onclose=null;}};
ws.onclose=function(){mark.textContent=T.again;if(tries++<20)setTimeout(open,Math.min(30000,1000*tries));};}
function start(){if(!window.Reveal||!Reveal.isReady||!Reveal.isReady()){setTimeout(start,200);return;}ui();open();}
start();})();</script>`;

async function openCloud(id) {
  const m = document.getElementById('m'); m.textContent = texts.loading;
  try {
    const r = /^[\w-]{8,40}$/.test(p.get('r') || '') ? p.get('r') : null;
    let got = await publicDeck(id, fetch, r && { r });
    if (got.ask) got = await publicDeck(id, fetch, { r, ...(await askEmail(m, got.name)) });
    if (got.ask) throw Object.assign(new Error('DOC'), { status: 403 });
    const { deck, name, noCopy } = got;
    adoptDeck(deck);
    const scorm = p.get('scorm') === '1', self = !scorm && p.get('self') === '1';
    const who = self ? await askName(m) : null;
    let html = buildHTML(state.deck, { noCopy, ...((scorm || self) && { selfPaced: true }) });
    if (scorm || self) {
      const at = html.toLowerCase().lastIndexOf('</body>');
      const report = self ? `<script>(function(){var U=${JSON.stringify(`/api/docs/${encodeURIComponent(id)}/progress`)},W=${JSON.stringify(who)};
window.__revelaScormSend=function(m){var b={voter:W.voter,name:W.name};if(m.t==='init'){b.graded=m.graded;b.of=Reveal.getTotalSlides();}else if(m.t==='slide')b.slide=m.i+1;else if(m.t==='score')b.score={id:m.id,s:m.s};else return;
try{fetch(U,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(b),keepalive:true});}catch(e){}};})();</script>` : '';
      html = html.slice(0, at) + report + `<script>${scormPage}</script>` + html.slice(at);
    }
    if (r) { const at = html.toLowerCase().lastIndexOf('</body>'); html = html.slice(0, at) + beacon(id, r) + html.slice(at); }
    const live = /^[\w-]{16,24}$/.test(p.get('live') || '') ? p.get('live') : null;
    if (live) { const at = html.toLowerCase().lastIndexOf('</body>'); html = html.slice(0, at) + follower(live, { live: '● ' + t('En directo'), ended: t('La emisión ha terminado'), again: t('Reconectando…') }) + html.slice(at); }
    document.open(); document.write(html); document.close();
    if (name) document.title = name;
  } catch (e) {
    fail(e.status === 401 || e.status === 403 ? t('Esta presentación no es pública. Quien la comparte debe elegir «Cualquiera con el enlace puede ver».')
      : e.status === 404 ? t('Esta presentación ya no está en la nube.') : texts.failed);
  }
}
