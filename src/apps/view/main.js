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

async function openCloud(id) {
  const m = document.getElementById('m'); m.textContent = texts.loading;
  try {
    const { deck, name, noCopy } = await publicDeck(id);
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
    document.open(); document.write(html); document.close();
    if (name) document.title = name;
  } catch (e) {
    fail(e.status === 401 || e.status === 403 ? t('Esta presentación no es pública. Quien la comparte debe elegir «Cualquiera con el enlace puede ver».')
      : e.status === 404 ? t('Esta presentación ya no está en la nube.') : texts.failed);
  }
}
