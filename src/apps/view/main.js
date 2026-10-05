// Viewer of shared presentations: view.html?d=<Drive file>&a=<API key>#k=<key>
// or view.html?u=<https URL of a sealed copy>#k=<key>. The page fetches the
// sealed copy and opens it with the key in the link or a password.
// view.html?doc=<id>: one in Revela's cloud that anyone with the link can view, presented
// (what the «Insert in a web page» iframe shows).

import { openerPageHTML } from '../../io/share/seal.js';
import { driveSealedURL } from '../../io/cloud/gdrive.js';
import { t, currentLang } from '../../i18n/index.js';
import { docIdFrom, publicDeck } from '../../io/cloud/clouddocs.js';
import { adoptDeck, state } from '../../core/store.js';
import { buildHTML } from '../../io/formats/html.js';

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

async function openCloud(id) {
  const m = document.getElementById('m'); m.textContent = texts.loading;
  try {
    const { deck, name } = await publicDeck(id);
    adoptDeck(deck);
    const html = buildHTML(state.deck);
    document.open(); document.write(html); document.close();
    if (name) document.title = name;
  } catch (e) {
    fail(e.status === 401 || e.status === 403 ? t('Esta presentación no es pública. Quien la comparte debe elegir «Cualquiera con el enlace puede ver».')
      : e.status === 404 ? t('Esta presentación ya no está en la nube.') : texts.failed);
  }
}
