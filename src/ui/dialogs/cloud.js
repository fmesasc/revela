// Revela's cloud (official edition and desktop app): my presentations, sharing
// one with people or by link (view / comment / edit), its statistics and its
// versions. Everything is decided by the server (server/cloudflare/docs.js):
// these dialogs only ask it and show what it says.

import { esc } from '../../core/text.js';
import * as acc from '../../io/cloud/account.js';
import * as cd from '../../io/cloud/clouddocs.js';
import { t, currentLang } from '../../i18n/index.js';
import { alertDialog, confirmDialog } from './dialog.js';
import { openAccount } from './account.js';

const ROLE_NAMES = { view: 'Puede ver', comment: 'Puede comentar', edit: 'Puede editar', owner: 'Propietario' };
const LINK_NAMES = { none: 'Solo las personas añadidas', view: 'Cualquiera con el enlace puede ver', comment: 'Cualquiera con el enlace puede comentar', edit: 'Cualquiera con el enlace puede editar' };
const fmt = ts => (ts ? new Date(ts).toLocaleString(currentLang(), { dateStyle: 'medium', timeStyle: 'short' }) : '');
const errorText = e => (e.status === 402 && e.data?.error === 'doc limit' ? t('Has llegado al máximo de presentaciones en la nube de tu plan ({n}). Borra alguna o pásate a Pro.').replace('{n}', e.data.limit)
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
async function signedIn() {
  if (acc.account()) return true;
  await acc.refreshAccount().catch(() => null);
  if (acc.account()) return true;
  openAccount(); return false;
}

// ---- My presentations -------------------------------------------------------------------------
export async function openCloudDocs() {
  if (!(await signedIn())) return;
  const { body, close } = modal('cloud-docs-modal', 'Mi nube de Revela', 600);
  body.innerHTML = `<p class="host-help">${t('Cargando…')}</p>`;
  let r; try { r = await cd.listDocs(); } catch (e) { body.innerHTML = `<p class="host-help">${esc(errorText(e))}</p>`; return; }
  const open = cd.cloudDoc();
  const row = (d, mine) => `<div class="sh-item cl-doc" data-id="${esc(d.id)}"><span><b>${esc(d.name || t('Presentación sin título'))}</b><br><small>${mine ? fmt(d.updated) : `${esc(d.owner || '')} · ${t(ROLE_NAMES[d.role] || '')}`}</small></span>
    ${open?.id === d.id ? `<em class="cl-here">${t('Abierta')}</em>` : `<button type="button" class="mini2" data-a="open">${t('Abrir')}</button>`}
    ${mine ? `<button type="button" class="mini2" data-a="del" title="${t('Eliminar')}">✕</button>` : ''}</div>`;
  body.innerHTML = `<div class="fr-actions" style="justify-content:space-between;flex-wrap:wrap">
      <button type="button" class="fr-do cl-save"${open ? ' disabled' : ''}>${t('Guardar esta presentación en la nube')}</button>
      <small class="host-help" style="margin:0">${r.mine.length} / ${r.limit}</small></div>
    <h4>${t('Mis presentaciones')}</h4>${r.mine.length ? r.mine.map(d => row(d, true)).join('') : `<p class="host-help">${t('Aún no tienes ninguna en la nube.')}</p>`}
    <h4>${t('Compartidas conmigo')}</h4>${r.shared.length ? r.shared.map(d => row(d, false)).join('') : `<p class="host-help">${t('Nadie ha compartido nada contigo todavía.')}</p>`}`;
  body.querySelector('.cl-save').addEventListener('click', async e => {
    e.target.disabled = true;
    try { await cd.saveToCloud(); close(); openCloudShare(); } catch (err) { e.target.disabled = false; alertDialog(errorText(err)); }
  });
  body.querySelectorAll('.cl-doc').forEach(el => {
    const id = el.dataset.id;
    el.querySelector('[data-a="open"]')?.addEventListener('click', async () => {
      try { await cd.flushCloud(); await cd.openDoc(id); history.replaceState(null, '', '?doc=' + id); close(); } catch (e) { alertDialog(errorText(e)); }
    });
    el.querySelector('[data-a="del"]')?.addEventListener('click', async () => {
      if (!(await confirmDialog(t('¿Eliminar esta presentación de la nube? Quien la tenga compartida dejará de verla. No se puede deshacer.')))) return;
      try { await cd.deleteDoc(id); if (cd.cloudDoc()?.id === id) cd.closeDoc(); openCloudDocs(); } catch (e) { alertDialog(errorText(e)); }
    });
  });
}

// ---- Sharing the open one --------------------------------------------------------------------
export async function openCloudShare() {
  if (!(await signedIn())) return;
  let doc = cd.cloudDoc();
  const { body, close } = modal('cloud-share-modal', 'Compartir con personas');
  if (!doc) {
    body.innerHTML = `<p class="host-help">${t('Para compartirla con personas concretas o por enlace, guárdala en tu nube de Revela. Los cambios se guardan solos y quien tenga permiso los ve.')}</p>
      <div class="fr-actions" style="justify-content:flex-start"><button type="button" class="fr-do cl-save">${t('Guardar en la nube')}</button></div>`;
    body.querySelector('.cl-save').addEventListener('click', async e => {
      e.target.disabled = true;
      try { await cd.saveToCloud(); openCloudShare(); } catch (err) { e.target.disabled = false; alertDialog(errorText(err)); }
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
        <p class="host-help">${t('Las personas añadidas entran con su cuenta de Google. Con el enlace para ver no hace falta cuenta.')}</p>
      </fieldset>
      <div class="fr-actions"><span>${analytics ? `<button type="button" class="mini2 cl-stats"><i class="ms">insights</i> ${t('Estadísticas')}</button>` : ''}
        <button type="button" class="mini2 cl-versions"><i class="ms">history</i> ${t('Versiones')}</button></span>
        <button type="button" class="fr-do cl-apply">${t('Guardar')}</button></div>`;
    const q = s => body.querySelector(s);
    body.querySelectorAll('.cl-role').forEach(s => s.addEventListener('change', () => {
      const e = s.closest('[data-email]').dataset.email; if (s.value) people[e] = s.value; else delete people[e]; render();
    }));
    q('.cl-add').addEventListener('click', () => {
      const e = q('.cl-email').value.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(e)) return alertDialog(t('Escribe un correo válido.'));
      people[e] = q('.cl-new-role').value; render();
    });
    q('.cl-email').addEventListener('keydown', e => { if (e.key === 'Enter') q('.cl-add').click(); });
    q('.cl-linkrole').addEventListener('change', e => { link = e.target.value; });
    q('.cl-copy').addEventListener('click', e => { navigator.clipboard?.writeText(cd.docLink(doc.id)); e.target.textContent = t('Copiado'); });
    q('.cl-stats')?.addEventListener('click', () => openCloudStats());
    q('.cl-versions').addEventListener('click', () => openCloudVersions());
    q('.cl-apply').addEventListener('click', async e => {
      e.target.disabled = true;
      try { const r = await cd.shareDoc(doc.id, { link, ...(pro && { people }) }); cd.setSharing(r.sharing); close(); }
      catch (err) { e.target.disabled = false; alertDialog(errorText(err)); }
    });
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
const STATUS = { saved: ['cloud_done', 'Guardado en la nube'], pending: ['cloud_sync', 'Cambios sin guardar'], saving: ['cloud_upload', 'Guardando…'],
  offline: ['cloud_off', 'Sin conexión: se guardará al volver'], forbidden: ['block', 'Sin permiso para guardar cambios'], 'too-large': ['error', 'Demasiado grande para la nube'], gone: ['cloud_off', 'Ya no está en la nube'] };
export function mountCloudStatus() {
  const el = document.getElementById('cloud-status'); if (!el) return;
  const paint = () => {
    const d = cd.cloudDoc(); el.hidden = !d; if (!d) return;
    const [icon, text] = d.role === 'view' ? ['visibility', 'Solo lectura'] : STATUS[d.status] || STATUS.saved;
    el.innerHTML = `<i class="ms">${icon}</i><span>${t(text)}</span>`; el.dataset.status = d.status;
    const ss = document.getElementById('save-state'); if (ss) ss.hidden = true;
  };
  cd.onCloud(paint); window.addEventListener('revela:lang', paint);
  el.addEventListener('click', () => openCloudShare());
  paint();
}

// Opened with ?doc=… : sign in if needed, then open it.
export async function openFromLink(id = cd.docIdFrom()) {
  if (!id) return false;
  try { await cd.openDoc(id); return true; }
  catch (e) {
    if (e.status === 401 && await confirmDialog(t('Esta presentación está compartida con personas concretas. Inicia sesión con tu cuenta de Google para abrirla.'))) {
      try { await acc.signIn(); await cd.openDoc(id); return true; } catch (err) { alertDialog(errorText(err)); }
    } else if (e.status === 403) alertDialog(t('Tu cuenta ({email}) no tiene acceso a esta presentación. Pide a quien te la envió que te añada.').replace('{email}', acc.account()?.email || ''));
    else if (e.status === 404) alertDialog(t('Esta presentación ya no está en la nube.'));
    else if (e.status !== 401) alertDialog(errorText(e));
    return false;
  }
}
