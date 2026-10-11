// «Hay una versión nueva de Revela · Recargar»: a tab left open (a phone keeps one for days) goes on running the code it
// was loaded with, and never sees what was published since — someone missed the spelling checker that way. So now and
// then the editor asks the server which build it has (version.json, written by tools/build-site.mjs beside index.html,
// whose <meta name="revela-build"> says which build this tab is) and, if it's another one, offers to reload in a small
// bar; reloading first saves what is open (this browser, Revela's cloud, Drive, OneDrive) and says if something couldn't be.
//
// When: on coming back to the tab (visibilitychange, and pageshow from the back-forward cache: Safari on the iPhone
// brings old pages back that way), on getting the connection back, and every 30 minutes while it's in view. One small
// file, never from a cache (no-store, and a ?t= the CDN in front of GitHub Pages doesn't know; sw.js lets it through):
// offline there is simply no answer, and nothing is said. Closed with ✕, it isn't offered again in this tab for that
// same build (sessionStorage: a reload keeps it); a newer one is.
//
// Only the web editor: the desktop app (Tauri, and its Flatpak and .deb) has its own updater (desktop.js) and is built
// without the stamp, a copy run from the repository has none either, and so neither checks. Nor the viewer, the
// voting page or the phone remote (view.html, vote.html, remote.html): an audience's page that lives as long as a talk,
// where a bar would get in the way and a reload would break the presentation or the connection, with no work to keep.
import { t } from '../../i18n/index.js';
import { EDITION } from '../../core/config.js';
import { session } from '../../core/session.js';
import { flushSave, savedHere } from '../../core/model.js';
import * as gd from '../../io/cloud/gdrive.js';
import * as cd from '../../io/cloud/clouddocs.js';
import * as od from '../../io/cloud/onedrive.js';
import { confirmDialog } from '../dialogs/dialog.js';

const EVERY = 30 * 60e3;                 // ms between checks while the tab is in view
const MIN_GAP = 60e3;                    // (switching tabs back and forth asks at most once a minute)
const WAIT = 10e3;                       // ms that saving may take before reloading (then it says what's left)
const KEY = 'revela.update.dismissed';

// The build this tab was loaded with ('' when it has none: the desktop app, a copy from the repository).
export const loadedBuild = (doc = document) => doc.querySelector('meta[name="revela-build"]')?.content || '';
// The build the server has now, or '' (offline, no file, something else answered).
export async function serverBuild(fetcher = fetch, base = document.baseURI) {
  try {
    const u = new URL('version.json', base); u.searchParams.set('t', Date.now());
    const r = await fetcher(u.href, { cache: 'no-store', credentials: 'omit' });
    if (!r.ok) return '';
    const j = await r.json();
    return typeof j?.build === 'string' && /^[0-9a-f]{8,64}$/.test(j.build) ? j.build : '';
  } catch { return ''; }
}

let dismissed = '';
const wasDismissed = build => { try { return sessionStorage.getItem(KEY) === build; } catch { return dismissed === build; } };
const dismiss = build => { dismissed = build; try { sessionStorage.setItem(KEY, build); } catch {} };

// Where what's open still has changes that haven't arrived, as words for the warning. probe: the tests pass a stand-in.
const busy = s => s === 'pending' || s === 'saving';
export function unsavedPlaces(p = probe()) {
  const out = [];
  if (p.cloud && p.cloud.role !== 'view' && !['saved', 'readonly'].includes(p.cloud.status)) out.push(t('Nube de Revela'));   // (read-only: kept here, never sent)
  if (p.drive && (p.drive.dirty || busy(p.driveStatus))) out.push('Google Drive');
  if (p.onedrive && (p.onedrive.dirty || busy(p.onedriveStatus))) out.push('OneDrive');
  // (This browser's copy only matters when nothing else holds it: some private windows can't keep any.)
  if (!p.savedHere && !p.cloud && !p.drive && !p.onedrive) out.push(t('este navegador'));
  return out;
}
const probe = () => ({ cloud: cd.cloudDoc(), drive: gd.linkedFile(), driveStatus: gd.driveStatus(), onedrive: od.linkedOneDrive(), onedriveStatus: od.oneDriveStatus(), savedHere: savedHere() });

// Everything saved now, as far as it can be in a few seconds → where something is still missing.
const within = (p, ms) => Promise.race([Promise.resolve(p).catch(() => {}), new Promise(r => setTimeout(r, ms))]);
export async function saveEverything({ wait = WAIT } = {}) {
  await within(flushSave(), wait);
  const p = probe(), tries = [];
  if (p.cloud && p.cloud.role !== 'view' && p.cloud.status !== 'saved') tries.push(cd.flushCloud());
  if (p.drive && (p.drive.dirty || busy(p.driveStatus)) && p.driveStatus !== 'conflict') tries.push(gd.savePresentation({ interactive: false }));
  if (p.onedrive && (p.onedrive.dirty || busy(p.onedriveStatus)) && p.onedriveStatus !== 'conflict') tries.push(od.saveOneDriveNow({ auto: true }));
  await within(Promise.all(tries.map(x => Promise.resolve(x).catch(() => {}))), wait);
  return unsavedPlaces();
}

// The bar.
let bar = null;
// reload, save: the tests pass stand-ins.
export function showUpdateBar(build, { reload = () => location.reload(), save = saveEverything } = {}) {
  if (bar?.isConnected) { bar.dataset.build = build; return bar; }
  bar = document.createElement('div');
  bar.id = 'update-bar'; bar.className = 'notice notice-update'; bar.dataset.build = build; bar.setAttribute('role', 'status');
  bar.innerHTML = '<i class="ms notice-ic" aria-hidden="true">upgrade</i><div class="notice-body"><b></b><span></span></div><button type="button" class="notice-go"></button><button type="button" class="notice-x">✕</button>';
  bar.querySelector('b').textContent = t('Hay una versión nueva de Revela');
  bar.querySelector('span').textContent = t('Recarga para usarla: antes se guarda lo que tienes abierto.');
  const go = bar.querySelector('.notice-go'), x = bar.querySelector('.notice-x');
  go.textContent = t('Recargar');
  x.title = t('Ahora no'); x.setAttribute('aria-label', t('Ahora no'));
  x.addEventListener('click', () => { dismiss(bar.dataset.build); bar.remove(); });
  go.addEventListener('click', async () => {
    go.disabled = true; go.textContent = t('Guardando…');
    const left = await save().catch(() => unsavedPlaces());   // (it failed: say what's known to be missing)
    if (left.length && !await confirmDialog(t('Aún hay cambios sin guardar en: {w}. Si recargas ahora, podrían perderse. ¿Recargar igualmente?').replace('{w}', left.join(', ')),
      { ok: t('Recargar igualmente'), cancel: t('Ahora no'), danger: true })) { go.disabled = false; go.textContent = t('Recargar'); return; }
    reload();
  });
  document.body.appendChild(bar);
  return bar;
}

// One check: the server's build against this tab's. → the newer build offered, or ''.
let last = 0, offered = '';
export async function checkForUpdate({ fetcher = fetch, loaded = loadedBuild(), ...opts } = {}) {
  last = Date.now();
  if (!loaded) return '';
  const now = await serverBuild(fetcher);
  if (!now || now === loaded || wasDismissed(now)) return '';
  offered = now;
  // (Never over a presentation on screen: once it ends — looked at again in a while.)
  const show = () => { if (offered !== now || wasDismissed(now)) return; if (session.present) setTimeout(show, 30e3); else showUpdateBar(now, opts); };
  show();
  return now;
}

export function initUpdateCheck() {
  if (EDITION === 'desktop' || globalThis.__TAURI__ || !loadedBuild() || location.protocol === 'file:') return;
  last = Date.now();                                     // (just loaded: from the network, as sw.js serves the app)
  const maybe = () => { if (document.visibilityState === 'visible' && Date.now() - last >= MIN_GAP) checkForUpdate().catch(() => {}); };
  document.addEventListener('visibilitychange', maybe);
  window.addEventListener('pageshow', e => { if (e.persisted) maybe(); });
  window.addEventListener('online', maybe);
  setInterval(() => { if (document.visibilityState === 'visible') checkForUpdate().catch(() => {}); }, EVERY);
}
