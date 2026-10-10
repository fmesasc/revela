// OneDrive as Google Drive is (gdrive.js): a presentation saved there stays linked to its file and saves
// itself a few seconds after each change; opened from any folder (a .revela.json, or a PowerPoint or
// LibreOffice file, imported); copies as PDF or PowerPoint that OneDrive shows with all their pages. A change
// made elsewhere meanwhile isn't overwritten: the file's version tag (eTag) is checked on every save.
// The sign-in and the calls are othercloud.js's (PKCE, Microsoft Graph, Files.ReadWrite).

import { state, replaceDeck, subscribe, docEpoch, docVersion, onBeforeReplace } from '../../core/store.js';
import { signedIn, apiFor, cloudReady } from './othercloud.js';
import { approxSize } from '../../core/model.js';
import { jsonBlob } from '../../core/jsonblob.js';

const GRAPH = 'https://graph.microsoft.com/v1.0/me/drive';
const LS = 'revela.onedrive.file';
const CHUNK = 320 * 1024 * 10;                                   // (upload sessions: pieces in multiples of 320 KiB)
export const ODP = 'application/vnd.oasis.opendocument.presentation', PPTX = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
const readLS = () => { try { return JSON.parse(localStorage.getItem(LS)) || null; } catch { return null; } };
const writeLS = v => { try { v ? localStorage.setItem(LS, JSON.stringify(v)) : localStorage.removeItem(LS); } catch {} };
const api = () => apiFor('onedrive');
export const onedriveReady = () => cloudReady('onedrive');
export const onedriveSignedIn = () => signedIn('onedrive');

// ---- Status (for the chip by the title) -------------------------------------------------
// idle | pending | saving | saved | offline (sign in again: a click) | conflict (changed elsewhere) | error
let status = 'idle';
const listeners = new Set();
export const onOneDriveStatus = fn => { listeners.add(fn); return () => listeners.delete(fn); };
export const oneDriveStatus = () => status;
const setStatus = s => { status = s; listeners.forEach(f => { try { f(s); } catch {} }); };

// ---- The linked file ----------------------------------------------------------------
// { id, name, eTag, path, deck (the presentation's first slide id: the link survives a reload only for it) }
let current = readLS(), epoch = docEpoch();
export const linkedOneDrive = () => (current && epoch === docEpoch() && current.deck === state.deck?.slides?.[0]?.id ? current : null);
const link = f => { current = f && { ...f, deck: state.deck.slides[0]?.id }; epoch = docEpoch(); writeLS(current); };
export const unlinkOneDrive = () => { link(null); setStatus('idle'); };

// ---- Folders --------------------------------------------------------------------------
const kindOf = f => (f.folder ? 'folder' : /\.revela\.json$/i.test(f.name) ? 'revela' : /\.(pptx|potx|pptm)$/i.test(f.name) ? 'pptx' : /\.(odp|otp)$/i.test(f.name) ? 'odp' : 'other');
const FIELDS = '$select=id,name,folder,file,lastModifiedDateTime,parentReference,eTag&$top=200&$orderby=name';
// A folder (null: the root) → { id, name, path: [{ id, name }], items: [{ id, name, kind, modified, eTag }] } (folders first).
export async function browse(folderId = null) {
  const a = api();
  const me = folderId ? await a(`${GRAPH}/items/${encodeURIComponent(folderId)}?$select=id,name,parentReference`) : await a(`${GRAPH}/root?$select=id,name`);
  const list = await a(`${GRAPH}/items/${encodeURIComponent(me.id)}/children?${FIELDS}`);
  const items = (list.value || []).map(f => ({ id: f.id, name: f.name, kind: kindOf(f), modified: f.lastModifiedDateTime, eTag: f.eTag }))
    .filter(f => f.kind !== 'other').sort((x, y) => (y.kind === 'folder') - (x.kind === 'folder') || x.name.localeCompare(y.name));
  // (Where it is, for the breadcrumb: "/drive/root:/Clases/2026" → Clases ▸ 2026.)
  const p = String(me.parentReference?.path || '').replace(/^\/drive\/root:?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  return { id: me.id, name: folderId ? me.name : 'OneDrive', root: !folderId, path: folderId ? [...p, me.name] : [], items };
}
// Who: the OneDrive's owner (the Files permission tells it; no other permission needed).
export async function oneDriveOwner() {
  try { const d = await api()(`${GRAPH}?$select=owner`); return d.owner?.user?.displayName || d.owner?.user?.email || ''; } catch { return ''; }
}

// ---- Opening ----------------------------------------------------------------------------
// A .revela.json: opened and linked (it goes on saving to it). A PowerPoint or LibreOffice file → { file }:
// the editor imports it (not linked: saving keeps it untouched — «Guardar en OneDrive» makes a Revela file).
export async function openOneDrive(item) {
  const a = api();
  if (item.kind === 'revela') {
    let deck; try { deck = JSON.parse(await a(`${GRAPH}/items/${encodeURIComponent(item.id)}/content`, {}, 'text')); } catch (e) { if (e.message === 'NO_TOKEN' || e.status) throw e; }
    if (!deck || !Array.isArray(deck.slides)) throw new Error('NOT_REVELA');
    const meta = await a(`${GRAPH}/items/${encodeURIComponent(item.id)}?$select=id,name,eTag,parentReference`);
    replaceDeck(deck); link({ id: meta.id, name: meta.name, eTag: meta.eTag, folder: meta.parentReference?.id || null });
    lastSaved = docVersion(); setStatus('saved');
    return { deck };
  }
  const blob = await a(`${GRAPH}/items/${encodeURIComponent(item.id)}/content`, {}, 'blob');
  return { file: new File([blob], item.name, { type: item.kind === 'odp' ? ODP : PPTX }) };
}

// ---- Saving -----------------------------------------------------------------------------
// The content to a file: by its id (with If-Match: not over someone else's change) or as a new one in a folder.
async function put({ id = null, folder = null, name = '', body, type, ifMatch = null }) {
  const a = api(), blob = body instanceof Blob ? body : new Blob([body], { type });
  const target = id ? `${GRAPH}/items/${encodeURIComponent(id)}` : `${GRAPH}/items/${encodeURIComponent(folder || 'root')}:/${encodeURIComponent(name)}:`;
  if (blob.size < 4e6) return a(`${target}/content`, { method: 'PUT', headers: { 'Content-Type': type, ...(ifMatch && { 'If-Match': ifMatch }) }, body: blob });
  const s = await a(`${target}/createUploadSession`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(ifMatch && { 'If-Match': ifMatch }) },
    body: JSON.stringify({ item: { '@microsoft.graph.conflictBehavior': 'replace' } }) });
  let last = null;
  for (let at = 0; at < blob.size; at += CHUNK) {
    const part = blob.slice(at, Math.min(blob.size, at + CHUNK));
    const r = await fetch(s.uploadUrl, { method: 'PUT', headers: { 'Content-Range': `bytes ${at}-${at + part.size - 1}/${blob.size}` }, body: part });   // (the URL is the permission)
    if (!r.ok) throw Object.assign(new Error('UPLOAD'), { status: r.status });
    last = await r.json().catch(() => null);
  }
  return last;
}
const cleanName = n => String(n || '').replace(/[\\/:*?"<>|#%]/g, '').replace(/\.revela\.json$|\.json$|\.pptx$|\.pdf$/i, '').trim().slice(0, 120);
// The presentation as the file's content: in pieces when big (core/jsonblob.js — one huge text ran the tab out of
// memory). Past AUTO_MAX it isn't sent by itself after each change (the whole file goes up each time): the status
// says so, and a click saves it.
const deckBody = deck => (approxSize(deck) > 5e6 ? jsonBlob(deck) : JSON.stringify(deck));
const AUTO_MAX = 200e6;
export const suggestedName = () => cleanName(state.deck.name) || 'Presentación';

// Save as: format 'revela' (linked: it goes on saving itself), 'pdf' or 'pptx' (copies). → the file { id, name, link }.
export async function saveAsOneDrive({ folder = null, name, format = 'revela' }) {
  const base = cleanName(name) || suggestedName();
  if (format === 'pdf') {
    const { buildPDF } = await import('../export/pdf.js');
    const f = await put({ folder, name: base + '.pdf', body: await buildPDF(undefined, { text: true }), type: 'application/pdf' });
    return { id: f?.id, name: f?.name || base + '.pdf', link: f?.webUrl || '' };
  }
  if (format === 'pptx') {
    const { buildPptxBlob } = await import('../formats/pptx-export.js');
    const f = await put({ folder, name: base + '.pptx', body: await buildPptxBlob(), type: PPTX });
    return { id: f?.id, name: f?.name || base + '.pptx', link: f?.webUrl || '' };
  }
  setStatus('saving');
  try {
    const version = docVersion(), f = await put({ folder, name: base + '.revela.json', body: deckBody(state.deck), type: 'application/json' });
    link({ id: f.id, name: f.name, eTag: f.eTag, folder: f.parentReference?.id || folder }); lastSaved = version; setStatus('saved');
    return { id: f.id, name: f.name, link: f.webUrl || '' };
  } catch (e) { setStatus(e.message === 'NO_TOKEN' ? 'offline' : 'error'); throw e; }
}

// Now, to the linked file. force: over a change made there (the person chose to keep theirs).
let saving = Promise.resolve(), lastSaved = null;
export function saveOneDriveNow({ force = false, auto = false } = {}) {
  const run = saving.catch(() => {}).then(async () => {
    const f = linkedOneDrive(); if (!f) return false;
    if (!onedriveSignedIn()) { setStatus('offline'); return false; }
    if (auto && approxSize(state.deck) > AUTO_MAX) { setStatus('big'); return false; }
    const version = docVersion(); setStatus('saving');
    try {
      const r = await put({ id: f.id, body: deckBody(state.deck), type: 'application/json', ifMatch: force ? null : f.eTag });
      link({ ...f, eTag: r?.eTag || f.eTag, dirty: false }); lastSaved = version;
      setStatus(docVersion() === version ? 'saved' : 'pending');
      return true;
    } catch (e) {
      setStatus(e.status === 412 ? 'conflict' : e.message === 'NO_TOKEN' ? 'offline' : e.status === 404 ? 'error' : 'error');
      return e.status === 412 ? 'conflict' : false;
    }
  });
  saving = run.catch(() => {});
  return run;
}
// The version there, instead of this one (after a conflict).
export async function loadTheirsOneDrive() {
  const f = linkedOneDrive(); if (!f) return;
  await openOneDrive({ id: f.id, name: f.name, kind: 'revela' });
}

// ---- Autosave: a few seconds after each change of the linked presentation ------------------
let timer = null, delay = 4000;
export const setOneDriveDelay = ms => { delay = ms; };
export function startOneDriveAutosave() {
  // (Another presentation about to replace this one: what's pending goes first, if it can.)
  onBeforeReplace(() => { if (linkedOneDrive() && docVersion() !== lastSaved && onedriveSignedIn() && status !== 'conflict') return saveOneDriveNow({ auto: true }); });
  if (linkedOneDrive()) setStatus(onedriveSignedIn() ? (current.dirty ? 'pending' : 'saved') : 'offline');
  return subscribe(() => {
    // (Another presentation replaced the linked one: the link goes, also for next time.)
    if (current && epoch !== docEpoch()) { current = null; writeLS(null); setStatus('idle'); return; }
    const f = linkedOneDrive(); if (!f) return;
    if (lastSaved === null) lastSaved = docVersion();
    if (docVersion() === lastSaved) return;
    if (!f.dirty) link({ ...f, dirty: true });                       // (remembered across reloads)
    if (!onedriveSignedIn()) { setStatus('offline'); return; }
    if (status === 'saved' || status === 'idle') setStatus('pending');
    clearTimeout(timer);
    timer = setTimeout(() => { if (status !== 'conflict') saveOneDriveNow({ auto: true }).catch(() => {}); }, delay);
  });
}
