// Share the current presentation: seal it (see seal.js) and put it where the
// user chose. Returns what to hand out: the link (with its key after "#" unless
// it is password-protected) and the code to embed it in an iframe.

import { state } from '../../core/store.js';
import { buildHTML } from '../formats/html.js';
import { download, slug } from '../files.js';
import { seal, openerPageHTML } from './seal.js';
import { addShare, viewLink, iframeCode } from './shares.js';
import { driveShareSealed } from '../cloud/gdrive.js';
import { serverShare, serverSealedURL } from '../cloud/shareserver.js';
import { t, currentLang } from '../../i18n/index.js';

const OPENER_TEXTS = () => ({ locked: t('Presentación protegida'), ask: t('Escribe la contraseña para verla.'), open: t('Abrir'),
  wrong: t('Contraseña incorrecta.'), nokey: t('Falta la clave del enlace: cópialo entero, con lo que va detrás de «#».'),
  loading: t('Abriendo…'), failed: t('No se pudo abrir la presentación: puede que ya no se comparta.') });

// where: 'file' | 'drive' | 'server'. password: null → secret link.
export async function publish({ where = 'file', password = null, days = 0, deck = state.deck } = {}) {
  const { env, key } = await seal(buildHTML(deck), { password });
  const name = deck.name || t('Presentación');
  if (where === 'file') {
    // A single page that opens itself: upload it anywhere (a school site, Moodle…).
    const page = openerPageHTML({ env, lang: currentLang(), texts: OPENER_TEXTS() });
    const file = `${slug(name)}-${t('protegida')}.html`;
    download(new Blob([page], { type: 'text/html' }), file);
    return { where, file, key, suffix: key ? `#k=${key}` : '' };
  }
  if (where === 'drive') {
    const { id, apiKey } = await driveShareSealed(env, `revela-${t('compartida')}-${slug(name)}.json`);
    const link = viewLink({ d: id, a: apiKey }, key);
    addShare({ where, id, name, link, password: !!password });
    return { where, id, link, iframe: iframeCode(link) };
  }
  const { id, token } = await serverShare(env, { days });
  const link = viewLink({ u: serverSealedURL(id) }, key);
  addShare({ where, id, name, link, token, url: serverSealedURL(id), password: !!password, ...(days && { expires: Date.now() + days * 864e5 }) });
  return { where, id, link, iframe: iframeCode(link) };
}
