// Revela's own notices on screen (io/cloud/notices.js): a slim bar over the slide in the editor, and
// a card at the top of the gallery of new presentations. One at a time, closable, never while
// presenting. Their texts are put as text; a button opens Revela's own pages (Pro, credits, templates)
// or a web address in a new tab.
import { session } from '../../core/session.js';
import { t, currentLang } from '../../i18n/index.js';
import { fetchNotices, closeNotice, noticeHit } from '../../io/cloud/notices.js';
import { onAccount } from '../../io/cloud/account.js';

const ICON = { offer: 'sell', news: 'campaign', info: 'info' };
// The notice as an element: kind of box (bar or card) and what its button and close do.
export function noticeElement(n, { kind = 'bar', onClose = () => {} } = {}) {
  const el = document.createElement('div');
  el.className = `notice notice-${kind} tone-${n.tone || 'info'}`; el.dataset.notice = n.id; el.setAttribute('role', 'note');
  const icon = document.createElement('i'); icon.className = 'ms notice-ic'; icon.textContent = ICON[n.tone] || 'info'; icon.setAttribute('aria-hidden', 'true');
  const body = document.createElement('div'); body.className = 'notice-body';
  if (n.title) { const b = document.createElement('b'); b.textContent = n.title; body.append(b); }
  if (n.text) { const s = document.createElement('span'); s.textContent = n.text; body.append(s); }
  if (n.sponsor) { const s = document.createElement('small'); s.className = 'notice-sponsor'; s.textContent = t('Patrocinado') + ' · ' + n.sponsor; body.append(s); }
  el.append(icon, body);
  if (n.cta && n.url) {
    const go = document.createElement('button'); go.type = 'button'; go.className = 'notice-go'; go.textContent = n.cta;
    go.addEventListener('click', () => { noticeHit(n.id, 'click'); runNotice(n.url); });
    el.append(go);
  }
  const x = document.createElement('button'); x.type = 'button'; x.className = 'notice-x'; x.title = t('Cerrar'); x.setAttribute('aria-label', t('Cerrar')); x.textContent = '✕';
  x.addEventListener('click', () => { closeNotice(n.id); el.remove(); onClose(); });
  el.append(x);
  return el;
}
// Its button: one of Revela's own pages, or a web address in a new tab.
async function runNotice(url) {
  if (url === '#templates') { (await import('../dialogs/gallery.js')).openGallery(); return; }
  if (['#pro', '#credits', '#team'].includes(url)) { (await import('../dialogs/account.js')).openAccount(); return; }
  if (url === '#tutorial') url = '/support';
  if (url.startsWith('/')) url = 'https://revelaslides.com' + url;
  if (/^https:\/\//.test(url)) window.open(url, '_blank', 'noopener');
}

// The editor's bar: asked for when the account is known (and again if it changes: another plan).
let shownFor = null;
export function mountNotices() {
  const paint = async me => {
    const key = (me?.plan || 'anon') + '|' + currentLang();
    if (key === shownFor) return; shownFor = key;
    const list = await fetchNotices('editor', currentLang());
    document.getElementById('notice-bar')?.remove();
    const n = list[0], wrap = document.getElementById('canvas-wrap'); if (!n || !wrap) return;
    const el = noticeElement(n); el.id = 'notice-bar';
    wrap.prepend(el);
    if (!session.present) noticeHit(n.id, 'view');
  };
  onAccount(me => { paint(me); });
  paint(null);
}
// The gallery's card (in the given box, first).
export async function galleryNotice(box) {
  const n = (await fetchNotices('gallery', currentLang()))[0]; if (!n || !box.isConnected) return;
  box.prepend(noticeElement(n, { kind: 'card' })); noticeHit(n.id, 'view');
}
