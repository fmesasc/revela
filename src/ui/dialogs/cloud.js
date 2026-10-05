// Revela's cloud (official edition and desktop app): sharing
// one with people or by link (view / comment / edit), its statistics and its
// versions. Everything is decided by the server (server/cloudflare/docs.js):
// these dialogs only ask it and show what it says.

import { esc } from '../../core/text.js';
import { state } from '../../core/store.js';
import * as acc from '../../io/cloud/account.js';
import * as cd from '../../io/cloud/clouddocs.js';
import { t, currentLang } from '../../i18n/index.js';
import { alertDialog, confirmDialog } from './dialog.js';
import { openAccount, signInWithTerms } from './account.js';
import { present } from '../shell/present.js';
import { saveProject } from '../../io/formats/project.js';
import { openCloudDocs } from './cloudlibrary.js';
import { nowInCloud } from '../shell/where.js';

const ROLE_NAMES = { view: 'Puede ver', comment: 'Puede comentar', edit: 'Puede editar', owner: 'Propietario' };
const LINK_NAMES = { none: 'Solo las personas añadidas', view: 'Cualquiera con el enlace puede ver', comment: 'Cualquiera con el enlace puede comentar', edit: 'Cualquiera con el enlace puede editar' };
const fmt = ts => (ts ? new Date(ts).toLocaleString(currentLang(), { dateStyle: 'medium', timeStyle: 'short' }) : '');
// Read-only beyond the plan (server/cloudflare/docs.js): friendly, and what to do.
const readOnlyText = (limit, mine = true) => (mine ? t('Esta presentación está en solo lectura porque tu plan gratuito permite editar {n}. Pasa a Pro o borra alguna para editarla.').replace('{n}', limit)
  : t('Esta presentación está en solo lectura porque su propietario ha superado el límite de su plan.'));
export const errorText = e => (e.status === 402 && e.data?.error === 'read only' ? readOnlyText(e.data.limit) : e.status === 402 && e.data?.error === 'doc limit' ? t('Has llegado al máximo de presentaciones en la nube de tu plan ({n}). Borra alguna o pásate a Pro.').replace('{n}', e.data.limit)
  : e.status === 402 ? t('Esto es del plan Pro.') : e.status === 401 ? t('Inicia sesión primero.') : e.status === 403 ? t('No tienes permiso para esto.')
  : e.status === 413 ? t('La presentación es demasiado grande para la nube.') : `${t('Algo ha fallado:')} ${e.message}`);

function modal(id, title, width = 520) {
  document.getElementById(id)?.remove();
  const back = document.createElement('div'); back.id = id; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal cloud" style="text-align:start;width:min(${width}px,94vw);max-width:none"><button class="modal-close">✕</button><h3>${t(title)}</h3><div class="cl-body"></div></div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  return { back, body: back.querySelector('.cl-body'), close };
}
// Signed in, or asks to (and returns false).
export async function signedIn() {
  if (acc.account()) return true;
  await acc.refreshAccount().catch(() => null);
  if (acc.account()) return true;
  openAccount(); return false;
}

// ---- My presentations: a page of their own (cloudlibrary.js) -------------------------------------
export { openCloudDocs };

// ---- Sharing the open one --------------------------------------------------------------------
export async function openCloudShare() {
  if (!(await signedIn())) return;
  let doc = cd.cloudDoc();
  const { body, close } = modal('cloud-share-modal', 'Compartir con personas');
  if (!doc) {
    body.innerHTML = `<p class="host-help">${t('Para compartirla con personas concretas o por enlace, guárdala en tu nube de Revela. Los cambios se guardan solos y quien tenga permiso los ve.')}</p>
      <div class="fr-actions" style="justify-content:flex-start"><button type="button" class="fr-do cl-save">${t('Guardar en la nube')}</button></div>`;
    body.querySelector('.cl-save').addEventListener('click', async e => {
      const btn = e.currentTarget, was = btn.innerHTML;
      btn.disabled = true; btn.innerHTML = `<span class="btn-spin" aria-hidden="true"></span> ${t('Guardando…')}`; btn.setAttribute('aria-busy', 'true');
      try { await cd.saveToCloud(); nowInCloud(); close(); openCloudShare(); } catch (err) { btn.disabled = false; btn.innerHTML = was; btn.removeAttribute('aria-busy'); alertDialog(errorText(err)); }
    });
    return;
  }
  if (doc.role !== 'owner') {
    body.innerHTML = `<p class="host-help">${t('Te la ha compartido {owner}. Tu permiso:').replace('{owner}', esc(doc.owner || ''))} <b>${t(ROLE_NAMES[doc.role])}</b></p>
      <div class="sh-row"><input readonly class="cl-link" value="${esc(cd.docLink(doc.id))}"><button type="button" class="mini2 cl-copy">${t('Copiar')}</button></div>`;
    body.querySelector('.cl-copy').addEventListener('click', e => { navigator.clipboard?.writeText(cd.docLink(doc.id)); e.target.textContent = t('Copiado'); });
    return;
  }
  const me = acc.account(), pro = (me?.features || []).includes('share-people'), analytics = (me?.features || []).includes('analytics');
  let people = { ...(doc.sharing?.people || {}) }, link = doc.sharing?.link || 'none';
  const roleSel = (cls, v, withOff) => `<select class="${cls}">${['view', 'comment', 'edit'].map(r => `<option value="${r}"${r === v ? ' selected' : ''}>${t(ROLE_NAMES[r])}</option>`).join('')}${withOff ? `<option value="">${t('Quitar')}</option>` : ''}</select>`;
  const render = () => {
    body.innerHTML = `<fieldset><legend>${t('Personas')}</legend>
        ${pro ? '' : `<p class="host-help">${t('Compartir con personas concretas es del plan Pro. El enlace funciona en todos los planes.')}</p>`}
        <div class="cl-people">${Object.entries(people).map(([e, r]) => `<div class="sh-item" data-email="${esc(e)}"><span>${esc(e)}</span>${roleSel('cl-role', r, true)}</div>`).join('')
          || `<p class="host-help">${t('Solo tú.')}</p>`}</div>
        <div class="sh-row"><input type="email" class="cl-email" placeholder="${t('correo@ejemplo.com')}"${pro ? '' : ' disabled'}>${roleSel('cl-new-role', 'edit')}<button type="button" class="mini2 cl-add"${pro ? '' : ' disabled'}>${t('Añadir')}</button></div>
      </fieldset>
      <fieldset><legend>${t('Enlace')}</legend>
        <select class="cl-linkrole">${Object.entries(LINK_NAMES).map(([k, v]) => `<option value="${k}"${k === link ? ' selected' : ''}>${t(v)}</option>`).join('')}</select>
        <div class="sh-row"><input readonly class="cl-link" value="${esc(cd.docLink(doc.id))}"><button type="button" class="mini2 cl-copy">${t('Copiar')}</button></div>
        <div class="cl-embed"${link === 'none' ? ' hidden' : ''}><label class="fr-l">${t('Insertar en una web (iframe)')}</label>
          <div class="sh-row"><textarea readonly class="cl-ifr" rows="3">${esc(cd.embedCode(doc.id, doc.name || state.deck.name || ''))}</textarea><button type="button" class="mini2 cl-copy-ifr">${t('Copiar')}</button></div>
          <p class="host-help">${t('Se ve como presentación, sin el editor, y siempre con los últimos cambios.')}</p></div>
        <p class="host-help cl-linkhint" hidden><i class="ms">lock</i> ${t('Con «Solo las personas añadidas», el enlace solo lo abren las personas de arriba. Para que lo abra cualquiera, elige «Cualquiera con el enlace puede ver».')}</p>
        <p class="host-help">${t('Las personas añadidas entran con su cuenta de Google. Con el enlace para ver no hace falta cuenta.')}</p>
      </fieldset>
      <div class="fr-actions"><span>${analytics ? `<button type="button" class="mini2 cl-stats"><i class="ms">insights</i> ${t('Estadísticas')}</button>` : ''}
        <button type="button" class="mini2 cl-versions"><i class="ms">history</i> ${t('Versiones')}</button></span>
        <span class="cl-status" role="status" aria-live="polite"></span><button type="button" class="fr-do cl-apply">${t('Listo')}</button></div>`;
    const q = s => body.querySelector(s);
    body.querySelectorAll('.cl-role').forEach(s => s.addEventListener('change', () => {
      const e = s.closest('[data-email]').dataset.email; if (s.value) people[e] = s.value; else delete people[e]; render(); apply();
    }));
    q('.cl-add').addEventListener('click', () => {
      const e = q('.cl-email').value.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(e)) return alertDialog(t('Escribe un correo válido.'));
      people[e] = q('.cl-new-role').value; render(); apply();
    });
    q('.cl-email').addEventListener('keydown', e => { if (e.key === 'Enter') q('.cl-add').click(); });
    q('.cl-linkrole').addEventListener('change', e => { link = e.target.value; linkHint(); apply(); });
    q('.cl-copy').addEventListener('click', e => { navigator.clipboard?.writeText(cd.docLink(doc.id)); e.target.textContent = t('Copiado'); linkHint(); });
    linkHint(); status(shareSt);
    q('.cl-copy-ifr').addEventListener('click', e => { navigator.clipboard?.writeText(q('.cl-ifr').value); e.target.textContent = t('Copiado'); });
    q('.cl-stats')?.addEventListener('click', () => openCloudStats());
    q('.cl-versions').addEventListener('click', () => openCloudVersions());
    q('.cl-apply').addEventListener('click', async () => { await saving; close(); });
  };
  // Each change is saved at once (no «Save» to forget: a link chosen and copied works).
  let saving = Promise.resolve(), shareSt = 'saved';
  const status = st => { shareSt = st; const el = body.querySelector('.cl-status'); if (!el) return;
    el.dataset.st = st; el.innerHTML = st === 'saving' ? `<span class="btn-spin" aria-hidden="true"></span> ${t('Guardando…')}` : st === 'error' ? `<i class="ms">error</i> ${t('No se pudo guardar')}` : `<i class="ms">check</i> ${t('Guardado')}`; };
  const linkHint = () => { const el = body.querySelector('.cl-linkhint'); if (el) el.hidden = link !== 'none'; const em = body.querySelector('.cl-embed'); if (em) em.hidden = link === 'none'; };
  const apply = () => {
    const want = { link, ...(pro && { people: { ...people } }) };
    status('saving');
    saving = saving.then(async () => {
      try { const r = await cd.shareDoc(doc.id, want); cd.setSharing(r.sharing); doc = cd.cloudDoc() || doc; status('saved'); }
      catch (err) { status('error'); alertDialog(errorText(err)); }
    });
    return saving;
  };
  render();
}

// ---- Statistics (owner, Pro) ---------------------------------------------------------------------
const dur = ms => { const s = Math.round(ms / 1000); return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60} s`; };
export async function openCloudStats() {
  const doc = cd.cloudDoc(); if (!doc) return;
  const { body } = modal('cloud-stats-modal', 'Estadísticas', 560);
  body.innerHTML = `<p class="host-help">${t('Cargando…')}</p>`;
  let s; try { s = await cd.docStats(doc.id); } catch (e) { body.innerHTML = `<p class="host-help">${esc(errorText(e))}</p>`; return; }
  const max = Math.max(1, ...s.slides.map(x => x.ms));
  body.innerHTML = `<p class="host-help">${t('Quién la ha visto no se guarda: solo cuántas personas, qué diapositivas y cuánto tiempo.')}</p>
    <div class="cl-kpis"><div><b>${s.visitors}</b><small>${t('personas')}</small></div><div><b>${dur(s.totalMs)}</b><small>${t('tiempo total')}</small></div>
      <div><b>${s.visitors ? dur(s.totalMs / s.visitors) : '—'}</b><small>${t('por persona')}</small></div><div><b>${s.last ? new Date(s.last).toLocaleDateString(currentLang()) : '—'}</b><small>${t('última visita')}</small></div></div>
    <div class="cl-bars">${s.slides.map(x => `<div class="cl-bar" title="${x.views} ${t('vistas')} · ${dur(x.ms)}"><span>${x.n}</span><i style="width:${(x.ms / max * 100).toFixed(1)}%"></i><small>${x.views} · ${dur(x.ms)}</small></div>`).join('')}</div>`;
}

// ---- Versions kept by the server ------------------------------------------------------------------
export async function openCloudVersions() {
  const doc = cd.cloudDoc(); if (!doc) return;
  const { body, close } = modal('cloud-versions-modal', 'Versiones en la nube', 480);
  let r; try { r = await cd.docVersions(doc.id); } catch (e) { body.innerHTML = `<p class="host-help">${esc(errorText(e))}</p>`; return; }
  body.innerHTML = `<p class="host-help">${t('La nube guarda una copia antes de cada tanda de cambios (como mucho una cada media hora; las diez últimas).')}</p>`
    + (r.versions.length ? r.versions.slice().reverse().map(v => `<div class="sh-item"><span>${fmt(v.at)}</span><button type="button" class="mini2" data-at="${v.at}">${t('Restaurar')}</button></div>`).join('') : `<p class="host-help">${t('Aún no hay versiones.')}</p>`);
  body.querySelectorAll('[data-at]').forEach(b => b.addEventListener('click', async () => {
    if (!(await confirmDialog(t('¿Restaurar esta versión? Se aplicará para todos; la actual queda como versión.')))) return;
    try { const { deck } = await cd.docVersion(doc.id, b.dataset.at); cd.restoreVersion(deck); close(); } catch (e) { alertDialog(errorText(e)); }
  }));
}

// ---- The status in the title bar ---------------------------------------------------------------------
const STATUS = { readonly: ['lock', 'Solo lectura'], saved: ['cloud_done', 'Nube de Revela · Guardado'], pending: ['cloud_sync', 'Cambios sin guardar'], saving: ['cloud_upload', 'Guardando…'],
  offline: ['cloud_off', 'Sin conexión: se guardará al volver'], forbidden: ['block', 'Sin permiso para guardar cambios'], 'too-large': ['error', 'Demasiado grande para la nube'], gone: ['cloud_off', 'Ya no está en la nube'] };
export function mountCloudStatus() {
  const el = document.getElementById('cloud-status'); if (!el) return;
  const paint = () => {
    const d = cd.cloudDoc(); el.hidden = !d; if (!d) return;
    const [icon, text] = d.role === 'view' ? ['visibility', 'Solo lectura'] : d.readOnly ? STATUS.readonly : STATUS[d.status] || STATUS.saved;
    el.innerHTML = `<i class="ms">${icon}</i><span>${t(text)}</span>`; el.dataset.status = d.status;
    el.title = t('Nube de Revela') + ' · ' + t(text) + ' — ' + t('Compartir y permisos');
    const ss = document.getElementById('save-state'); if (ss) ss.hidden = true;
  };
  const paintAll = () => { paint(); paintReadOnly(); };
  cd.onCloud(paintAll); window.addEventListener('revela:lang', paintAll);
  acc.onAccount(() => { cd.recheckReadOnly().catch(() => {}); });   // (back to Pro: editable again)
  el.addEventListener('click', () => openCloudShare());
  paint();
}

// The notice above the slide while the open one is read-only beyond the plan: why, and what to do
// (nothing done here is lost: it can be kept as a copy in this browser, or downloaded).
function paintReadOnly() {
  const d = cd.cloudDoc(), wrap = document.getElementById('canvas-wrap'); if (!wrap) return;
  let el = document.getElementById('cloud-ro-banner');
  if (!d?.readOnly) { if (el) el.style.display = 'none'; return; }
  if (!el) {
    el = document.createElement('div'); el.id = 'cloud-ro-banner'; el.setAttribute('role', 'status');
    el.style.cssText = 'flex-wrap:wrap;align-items:center;gap:8px 10px;margin:0 0 8px;padding:8px 12px;border-radius:8px;background:#eef3fa;color:#1f3d63;font-size:13px';
    wrap.insertBefore(el, wrap.firstChild);
    el.addEventListener('click', e => {
      const a = e.target.closest('[data-ro]')?.dataset.ro;
      if (a === 'pro') openAccount(); else if (a === 'list') openCloudDocs(); else if (a === 'download') saveProject();
      else if (a === 'copy') { cd.keepCopy(); history.replaceState(null, '', location.pathname); alertDialog(t('Listo: ahora es una copia en este navegador, aparte de la de la nube. Lo que cambies se guarda aquí.')); }
    });
  }
  const mine = d.role === 'owner', b = (a, label) => `<button type="button" class="mini2" data-ro="${a}">${t(label)}</button>`;
  el.style.display = 'flex';
  el.innerHTML = `<i class="ms">lock</i><span style="flex:1 1 260px">${esc(readOnlyText(d.readOnly.limit, mine))} ${t('Lo que cambies aquí no se guarda en la nube: guarda una copia o descárgala para conservarlo.')}</span>
    ${mine ? b('pro', 'Pasar a Pro') + b('list', 'Mis presentaciones') : ''}${b('copy', 'Guardar una copia')}${b('download', 'Descargar')}`;
}

// Opened with ?doc=… : sign in if needed, then open it. With &lti=… (an activity
// from Moodle or another learning platform) or &self=1, it starts at once for
// answering its activities at one's own pace; with lti, Revela's server marks
// each answer and sends the mark to the platform.
// settle: called before any question or message (the loading screen goes first, or it would hide them).
export async function openFromLink(id = cd.docIdFrom(), { settle = () => {} } = {}) {
  if (!id) return false;
  const q = new URLSearchParams(location.search), lti = /^[\w-]{20,64}$/.test(q.get('lti') || '') ? q.get('lti') : null;
  try {
    await cd.openDoc(id);
    if (lti || q.get('self') === '1') present({ selfPaced: true, fullscreen: false, ...(lti && { answer: (pollId, answer) => acc.api('lti/answer', { lti, pollId, answer }) }) });
    return true;
  }
  catch (e) {
    settle();
    if (e.status === 401 && await confirmDialog(t('Esta presentación está compartida con personas concretas. Inicia sesión con tu cuenta de Google para abrirla.'))) {
      try { await signInWithTerms(); await cd.openDoc(id); return true; } catch (err) { if (err.message !== 'CANCELLED') alertDialog(errorText(err)); }
    } else if (e.status === 403) alertDialog(t('Tu cuenta ({email}) no tiene acceso a esta presentación. Pide a quien te la envió que te añada.').replace('{email}', acc.account()?.email || ''));
    else if (e.status === 404) alertDialog(t('Esta presentación ya no está en la nube.'));
    else if (e.status !== 401) alertDialog(errorText(e));
    return false;
  }
}
