// Viewer of shared presentations: view.html?d=<Drive file>&a=<API key>#k=<key>
// or view.html?u=<https URL of a sealed copy>#k=<key>. The page fetches the
// sealed copy and opens it with the key in the link or a password.

import { openerPageHTML } from '../../io/share/seal.js';
import { driveSealedURL } from '../../io/cloud/gdrive.js';
import { t, currentLang } from '../../i18n/index.js';

const p = new URLSearchParams(location.search);
const src = p.get('d') ? driveSealedURL(p.get('d'), p.get('a') || '')
  : /^(https:\/\/|blob:)/.test(p.get('u') || '') ? p.get('u') : null;   // blob: only ever from this same site
const texts = { locked: t('Presentación protegida'), ask: t('Escribe la contraseña para verla.'), open: t('Abrir'),
  wrong: t('Contraseña incorrecta.'), nokey: t('Falta la clave del enlace: cópialo entero, con lo que va detrás de «#».'),
  loading: t('Abriendo…'), failed: t('No se pudo abrir la presentación: puede que ya no se comparta.'),
  signin: t('Esta presentación es solo para cuentas de {d}. Inicia sesión con Google para verla.') };
if (src) { document.open(); document.write(openerPageHTML({ src, lang: currentLang(), texts })); document.close(); }
else document.getElementById('m').textContent = texts.failed;
