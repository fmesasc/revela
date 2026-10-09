// Revela's cloud (official edition and desktop app): sharing
// one with people or by link (present / view / comment / edit; with an end date; without copies; editors who
// share too), its statistics and its
// versions. Everything is decided by the server (server/cloudflare/docs.js):
// these dialogs only ask it and show what it says.

import { whileOpening } from '../shell/opening.js';
import { esc } from '../../core/text.js';
import { state } from '../../core/store.js';
import * as acc from '../../io/cloud/account.js';
import * as cd from '../../io/cloud/clouddocs.js';
import { t, currentLang } from '../../i18n/index.js';
import { alertDialog, confirmDialog } from './dialog.js';
import { openAccount, signInWithTerms } from './account.js';
import { present } from '../shell/present.js';
import { saveProject } from '../../io/formats/project.js';
import { openCloudDocs, fmtSize } from './cloudlibrary.js';
import { nowInCloud } from '../shell/where.js';

const ROLE_NAMES = { present: 'Solo presentar', view: 'Puede ver', comment: 'Puede comentar', edit: 'Puede editar', owner: 'Propietario' };
const LINK_NAMES = { none: 'Solo las personas añadidas', present: 'Cualquiera con el enlace puede verla como presentación', view: 'Cualquiera con el enlace puede ver', comment: 'Cualquiera con el enlace puede comentar', edit: 'Cualquiera con el enlace puede editar' };
// An end date: a day chosen (access ends when it ends, here) ⇄ the server's time.
const dayOf = ms => { if (!ms) return ''; const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const endOf = day => (day ? new Date(day + 'T23:59:59').getTime() : null);
const tomorrow = () => dayOf(Date.now() + 864e5);
const fmt = ts => (ts ? new Date(ts).toLocaleString(currentLang(), { dateStyle: 'medium', timeStyle: 'short' }) : '');
// Read-only beyond the plan (server/cloudflare/docs.js): friendly, and what to do.
const readOnlyText = (limit, mine = true) => (mine ? t('Esta presentación está en solo lectura porque tu plan gratuito permite editar {n}. Pasa a Pro o borra alguna para editarla.').replace('{n}', limit)
  : t('Esta presentación está en solo lectura porque su propietario ha superado el límite de su plan.'));
const storageFullText = d => t('Tu espacio en la nube está lleno ({used} de {quota}). Borra presentaciones que no uses y vacía la papelera, o pasa a Pro para tener más.').replace('{used}', fmtSize(d.used || 0)).replace('{quota}', fmtSize(d.quota || 0));
export const errorText = e => (e.status === 402 && e.data?.error === 'read only' ? readOnlyText(e.data.limit) : e.status === 402 && e.data?.error === 'doc limit' ? t('Has llegado al máximo de presentaciones en la nube de tu plan ({n}). Borra alguna o pásate a Pro.').replace('{n}', e.data.limit)
  : e.status === 402 && e.data?.error === 'storage full' ? storageFullText(e.data)
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
  // (Who can manage it: its owner, or an editor when the owner allows it — the server sends them «sharing».)
  if (!doc.sharing) {
    body.innerHTML = `<p class="host-help">${t('Te la ha compartido {owner}. Tu permiso:').replace('{owner}', esc(doc.owner || ''))} <b>${t(ROLE_NAMES[doc.role])}</b></p>
      ${doc.only ? `<p class="host-help"><i class="ms" aria-hidden="true">filter_none</i> ${t('Te ha compartido solo algunas diapositivas: puede añadir más cuando quiera.')}</p>` : ''}
      <div class="sh-row"><input readonly class="cl-link" value="${esc(cd.docLink(doc.id))}"><button type="button" class="mini2 cl-copy">${t('Copiar')}</button></div>`;
    body.querySelector('.cl-copy').addEventListener('click', e => { navigator.clipboard?.writeText(cd.docLink(doc.id)); e.target.textContent = t('Copiado'); });
    return;
  }
  const me = acc.account(), pro = (me?.features || []).includes('share-people'), analytics = (me?.features || []).includes('analytics'), owner = doc.role === 'owner';
  const sh = doc.sharing;
  // (The owner's team, all of it: Mi nube ▸ Del equipo — server/cloudflare/docs.js roleOf.)
  let team = sh.team || 'none'; const myTeam = me?.team?.name;
  let people = { ...(sh.people || {}) }, link = sh.link || 'none', until = { ...(sh.until || {}) }, linkUntil = sh.linkUntil || null, noCopy = !!sh.noCopy, editorsShare = !!sh.editorsShare;
  // Only some slides (who presents, views or comments): per person and for the link — null: all.
  let slidesOf = { ...(sh.slidesOf || {}) }, linkSlides = sh.linkSlides || null;
  const allIds = () => state.deck.slides.map(x => x.id), kept = ids => (ids ? ids.filter(id => allIds().includes(id)) : null);
  const slidesBtn = (cls, ids, role) => (role === 'edit' || role === 'none' ? '' : `<button type="button" class="mini2 cl-only ${cls}" title="${t('Qué diapositivas ve')}"><i class="ms" aria-hidden="true">filter_none</i> ${kept(ids)
    ? t('{n} de {m} diapositivas').replace('{n}', kept(ids).length).replace('{m}', allIds().length) : t('Todas las diapositivas')}</button>`);
  const roleSel = (cls, v, withOff) => `<select class="${cls}">${['present', 'view', 'comment', 'edit'].map(r => `<option value="${r}"${r === v ? ' selected' : ''}>${t(ROLE_NAMES[r])}</option>`).join('')}${withOff ? `<option value="">${t('Quitar')}</option>` : ''}</select>`;
  const untilIn = (cls, v) => `<label class="cl-until" title="${t('Acceso hasta (vacío: sin fecha de fin)')}"><i class="ms" aria-hidden="true">event</i><input type="date" class="${cls}" min="${tomorrow()}" value="${dayOf(v)}" aria-label="${t('Acceso hasta (vacío: sin fecha de fin)')}"></label>`;
  const render = () => {
    body.innerHTML = `${owner ? '' : `<p class="host-help">${t('Te la ha compartido {owner}. Puedes compartirla y cambiar los permisos de los demás.').replace('{owner}', esc(doc.owner || ''))}</p>`}
      <fieldset><legend>${t('Personas')}</legend>
        ${pro ? '' : `<p class="host-help">${t('Compartir con personas concretas es del plan Pro. El enlace funciona en todos los planes.')}</p>`}
        <div class="cl-people">${Object.entries(people).map(([e, r]) => `<div class="sh-item" data-email="${esc(e)}"><span>${esc(e)}</span>${slidesBtn('cl-p-only', slidesOf[e], r)}${untilIn('cl-p-until', until[e])}${roleSel('cl-role', r, true)}</div>`).join('')
          || `<p class="host-help">${t('Solo tú.')}</p>`}</div>
        <div class="sh-row"><input type="email" class="cl-email" placeholder="${t('correo@ejemplo.com')}"${pro ? '' : ' disabled'}>${roleSel('cl-new-role', 'edit')}<button type="button" class="mini2 cl-add"${pro ? '' : ' disabled'}>${t('Añadir')}</button></div>
      </fieldset>
      ${owner && myTeam ? `<fieldset><legend>${t('Tu equipo')}</legend>
        <div class="sh-row"><span style="flex:1">${t('Todo el equipo «{t}»').replace('{t}', esc(myTeam))}</span><select class="cl-team"><option value="none"${team === 'none' ? ' selected' : ''}>${t('Sin acceso')}</option>${['present', 'view', 'comment', 'edit'].map(r => `<option value="${r}"${r === team ? ' selected' : ''}>${t(ROLE_NAMES[r])}</option>`).join('')}</select></div>
        <p class="host-help">${t('La ven en Mi nube ▸ Del equipo, también quien entre más tarde.')}</p></fieldset>` : ''}
      <fieldset><legend>${t('Enlace')}</legend>
        <div class="sh-row"><select class="cl-linkrole">${Object.entries(LINK_NAMES).map(([k, v]) => `<option value="${k}"${k === link ? ' selected' : ''}>${t(v)}</option>`).join('')}</select>${link === 'none' ? '' : untilIn('cl-l-until', linkUntil)}${slidesBtn('cl-l-only', linkSlides, link)}</div>
        <div class="sh-row"><input readonly class="cl-link" value="${esc(cd.docLink(doc.id))}"><button type="button" class="mini2 cl-copy">${t('Copiar')}</button></div>
        <div class="cl-embed"${link === 'none' ? ' hidden' : ''}><label class="fr-l">${t('Insertar en una web (iframe)')}</label>
          <div class="sh-row"><textarea readonly class="cl-ifr" rows="3">${esc(cd.embedCode(doc.id, doc.name || state.deck.name || ''))}</textarea><button type="button" class="mini2 cl-copy-ifr">${t('Copiar')}</button></div>
          <p class="host-help">${t('Se ve como presentación, sin el editor, y siempre con los últimos cambios.')}</p></div>
        <p class="host-help cl-linkhint" hidden><i class="ms">lock</i> ${t('Con «Solo las personas añadidas», el enlace solo lo abren las personas de arriba. Para que lo abra cualquiera, elige «Cualquiera con el enlace puede ver».')}</p>
        <p class="host-help">${t('Las personas añadidas entran con su cuenta de Google. Con el enlace para ver no hace falta cuenta.')}</p>
      </fieldset>
      ${owner ? `<details class="cl-perms"${noCopy || editorsShare ? ' open' : ''}><summary>${t('Ajustes de permisos')}</summary>
        <label class="fr-chk"><input type="checkbox" class="cl-nocopy"${noCopy ? ' checked' : ''}> ${t('Quien puede ver o comentar no puede descargarla, imprimirla ni copiarla')}</label>
        <p class="host-help">${t('Revela quita esas opciones y no entrega copias; lo que se ve en una pantalla siempre se puede fotografiar. «Solo presentar» nunca permite copiar ni ve las notas del orador.')}</p>
        <label class="fr-chk"><input type="checkbox" class="cl-edshare"${editorsShare ? ' checked' : ''}> ${t('Quien puede editar también puede compartirla y cambiar permisos')}</label></details>` : ''}
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
    q('.cl-team')?.addEventListener('change', e => { team = e.target.value; apply(); });
    q('.cl-linkrole').addEventListener('change', e => { link = e.target.value; if (link === 'none') linkUntil = null; render(); apply(); });
    body.querySelectorAll('.cl-p-until').forEach(i => i.addEventListener('change', () => { const e = i.closest('[data-email]').dataset.email; if (i.value) until[e] = endOf(i.value); else delete until[e]; apply(); }));
    q('.cl-l-until')?.addEventListener('change', e => { linkUntil = endOf(e.target.value); apply(); });
    q('.cl-nocopy')?.addEventListener('change', e => { noCopy = e.target.checked; apply(); });
    body.querySelectorAll('.cl-p-only').forEach(b => b.addEventListener('click', async () => {
      const e = b.closest('[data-email]').dataset.email, ids = await pickSlides(kept(slidesOf[e]), e); if (ids === undefined) return;
      if (ids) slidesOf[e] = ids; else delete slidesOf[e]; render(); apply(); }));
    q('.cl-l-only')?.addEventListener('click', async () => { const ids = await pickSlides(kept(linkSlides), t('El enlace')); if (ids === undefined) return; linkSlides = ids; render(); apply(); });
    q('.cl-edshare')?.addEventListener('change', e => { editorsShare = e.target.checked; apply(); });
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
    for (const e of Object.keys(until)) if (!people[e]) delete until[e];
    for (const e of Object.keys(slidesOf)) if (!people[e] || people[e] === 'edit' || !kept(slidesOf[e])?.length) delete slidesOf[e];
    if (link === 'none' || link === 'edit' || !kept(linkSlides)?.length) linkSlides = null;
    const only = Object.fromEntries(Object.entries(slidesOf).map(([e, v]) => [e, kept(v)]));
    const want = { link, linkUntil, linkSlides: kept(linkSlides), ...(pro && { people: { ...people }, until: { ...until }, slidesOf: only }), ...(owner && { noCopy, editorsShare }), ...(owner && myTeam && { team }) };
    status('saving');
    saving = saving.then(async () => {
      try { const r = await cd.shareDoc(doc.id, want); cd.setSharing(r.sharing); doc = cd.cloudDoc() || doc; status('saved'); }
      catch (err) { status('error'); alertDialog(errorText(err)); }
    });
    return saving;
  };
  render();
}

// Which slides someone sees: ticks on the deck's slides (number and title). → the ids, null for all, undefined: cancelled.
// (Slides added later aren't in a choice: they're added here when wanted — «so they get more or fewer».)
function pickSlides(current, who) {
  return new Promise(done => {
    const { back, body, close } = modal('cloud-only-modal', 'Qué diapositivas ve', 460);
    const plain = h => { const d = document.createElement('div'); d.innerHTML = h || ''; return (d.textContent || '').replace(/\s+/g, ' ').trim(); };
    const title = sl => { const b = sl.blocks.find(x => x.ph === 'title' && plain(x.html)) || sl.blocks.find(x => x.type === 'text' && plain(x.html)); return plain(sl.title) || (b ? plain(b.html) : '') || t('(sin título)'); };
    const on = new Set(current || state.deck.slides.map(x => x.id));
    body.innerHTML = `<p class="host-help">${esc(who)} · ${t('Las demás no le llegan: ni su contenido ni su título. Puedes ampliar o reducir la elección cuando quieras; las diapositivas nuevas no se añaden solas.')}</p>
      <div class="sh-row"><button type="button" class="mini2 co-all">${t('Todas')}</button><button type="button" class="mini2 co-none">${t('Ninguna')}</button></div>
      <div class="co-list" style="max-height:min(50vh,420px);overflow:auto;margin:6px 0">${state.deck.slides.map((sl, i) => `<label class="fr-chk"><input type="checkbox" value="${esc(sl.id)}"${on.has(sl.id) ? ' checked' : ''}> <b>${i + 1}</b> · ${esc(title(sl).slice(0, 70))}${sl.hidden ? ` <small>(${t('oculta')})</small>` : ''}</label>`).join('')}</div>
      <p class="host-help co-n"></p>
      <div class="fr-actions"><button type="button" class="mini2 co-cancel">${t('Cancelar')}</button><button type="button" class="fr-do co-ok">${t('Aplicar')}</button></div>`;
    const boxes = [...body.querySelectorAll('.co-list input')], count = () => { const n = boxes.filter(x => x.checked).length;
      body.querySelector('.co-n').textContent = t('{n} de {m} diapositivas').replace('{n}', n).replace('{m}', boxes.length); body.querySelector('.co-ok').disabled = !n; };
    boxes.forEach(x => x.addEventListener('change', count)); count();
    body.querySelector('.co-all').addEventListener('click', () => { boxes.forEach(x => { x.checked = true; }); count(); });
    body.querySelector('.co-none').addEventListener('click', () => { boxes.forEach(x => { x.checked = false; }); count(); });
    let result;
    const end = v => { result = v; close(); };
    body.querySelector('.co-cancel').addEventListener('click', () => end(undefined));
    body.querySelector('.co-ok').addEventListener('click', () => { const ids = boxes.filter(x => x.checked).map(x => x.value); end(ids.length === boxes.length ? null : ids); });
    new MutationObserver((_, o) => { if (!back.isConnected) { o.disconnect(); done(result); } }).observe(document.body, { childList: true });
  });
}

// ---- Statistics (owner, Pro) ---------------------------------------------------------------------
const dur = ms => { const s = Math.round(ms / 1000); return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60} s`; };
export async function openCloudStats() {
  const doc = cd.cloudDoc(); if (!doc) return;
  const { body } = modal('cloud-stats-modal', 'Estadísticas', 560);
  body.innerHTML = `<p class="host-help">${t('Cargando…')}</p>`;
  let s; try { s = await cd.docStats(doc.id); } catch (e) { body.innerHTML = `<p class="host-help">${esc(errorText(e))}</p>`; return; }
  const max = Math.max(1, ...s.slides.map(x => x.ms));
  body.innerHTML = `<p class="host-help">${t('Con los enlaces de siempre no se guarda quién la ha visto: solo cuántas personas, qué diapositivas y cuánto tiempo. Para saberlo de cada destinatario, crea un enlace con seguimiento.')}</p>
    <div class="cl-kpis"><div><b>${s.visitors}</b><small>${t('personas')}</small></div><div><b>${dur(s.totalMs)}</b><small>${t('tiempo total')}</small></div>
      <div><b>${s.visitors ? dur(s.totalMs / s.visitors) : '—'}</b><small>${t('por persona')}</small></div><div><b>${s.last ? new Date(s.last).toLocaleDateString(currentLang()) : '—'}</b><small>${t('última visita')}</small></div></div>
    <div class="cl-bars">${s.slides.map(x => `<div class="cl-bar" title="${x.views} ${t('vistas')} · ${dur(x.ms)}"><span>${x.n}</span><i style="width:${(x.ms / max * 100).toFixed(1)}%"></i><small>${x.views} · ${dur(x.ms)}</small></div>`).join('')}</div>
    <fieldset class="cl-track"><legend>${t('Enlaces con seguimiento')}</legend>
      <p class="host-help">${t('Un enlace para cada destinatario (un cliente, un jurado…): lo ven presentado aunque la presentación no se comparta por enlace, y aquí sabes si lo abrió, cuánto tiempo y hasta dónde llegó. Puedes pedir su correo antes de verla.')}</p>
      <form class="sh-row cl-track-new"><input type="text" class="cl-track-label" maxlength="80" placeholder="${t('Para quién (p. ej. Ana · Acme)')}">
        <label class="fr-chk" style="margin:0;white-space:nowrap"><input type="checkbox" class="cl-track-ask"> ${t('Pedir su correo')}</label><button type="submit" class="mini2">${t('Crear enlace')}</button></form>
      <div class="cl-track-list"></div>
      <label class="fr-chk"><input type="checkbox" class="cl-track-notify"${s.notify ? ' checked' : ''}> ${t('Avisarme por correo cuando alguien abra uno')}</label>
      <p class="host-help">${t('¿Una marca de agua «Confidencial» con su correo? Transiciones ▸ Configuración ▸ Marca de agua.')}</p></fieldset>`;
  const list = body.querySelector('.cl-track-list'), when = ts => (ts ? new Date(ts).toLocaleString(currentLang(), { dateStyle: 'short', timeStyle: 'short' }) : '—');
  const paint = track => {
    list.innerHTML = !track.length ? `<p class="host-help">${t('Aún no hay ninguno.')}</p>` : track.map(x => `<div class="cl-tk" data-tk="${esc(x.token)}">
      <div class="cl-tk-head"><b>${esc(x.label || t('Sin nombre'))}</b>${x.ask ? `<small>${t('pide el correo')}</small>` : ''}
        <span class="cl-tk-acts"><button type="button" class="mini2" data-a="copy">${t('Copiar enlace')}</button><button type="button" class="mini2" data-a="del" title="${t('Quitar: el enlace deja de funcionar')}"><i class="ms">delete</i></button></span></div>
      <div class="cl-tk-stats">${x.opens ? `${x.opens} ${t(x.opens === 1 ? 'apertura' : 'aperturas')} · ${dur(x.ms)} · ${t('hasta la diapositiva')} ${x.reached || 1} ${t('de')} ${s.of} · ${t('última')}: ${when(x.last)}` : t('Aún no lo ha abierto.')}</div>
      ${x.people.length ? `<div class="cl-tk-people">${x.people.map(pp => `<span>${esc(pp.name ? `${pp.name} <${pp.email}>` : pp.email)}</span>`).join('')}</div>` : ''}</div>`).join('');
  };
  paint(s.track || []);
  const track = async payload => { try { const r = await cd.docTrack(doc.id, payload); paint(r.track); return r; } catch (e) { alertDialog(errorText(e)); return null; } };
  body.querySelector('.cl-track-new').addEventListener('submit', async e => {
    e.preventDefault(); const label = body.querySelector('.cl-track-label').value.trim(), ask = body.querySelector('.cl-track-ask').checked;
    const r = await track({ add: { label, ask } }); if (!r?.token) return;
    body.querySelector('.cl-track-label').value = '';
    navigator.clipboard?.writeText(cd.trackLink(doc.id, r.token)).catch(() => {});
    list.querySelector(`[data-tk="${CSS.escape(r.token)}"] [data-a="copy"]`)?.replaceChildren(t('Copiado'));
  });
  list.addEventListener('click', async e => {
    const b = e.target.closest('[data-a]'), tk = e.target.closest('[data-tk]')?.dataset.tk; if (!b || !tk) return;
    if (b.dataset.a === 'copy') { navigator.clipboard?.writeText(cd.trackLink(doc.id, tk)).catch(() => {}); b.textContent = t('Copiado'); }
    else if (b.dataset.a === 'del' && await confirmDialog(t('¿Quitar este enlace? Quien lo tenga ya no podrá abrir la presentación con él.'), { ok: t('Quitar'), danger: true })) await track({ del: tk });
  });
  body.querySelector('.cl-track-notify').addEventListener('change', e => track({ notify: e.target.checked }));
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
const STATUS = { readonly: ['lock', 'Solo lectura'], full: ['cloud_off', 'Nube llena: los cambios no se guardan'], saved: ['cloud_done', 'Nube de Revela · Guardado'], pending: ['cloud_sync', 'Cambios sin guardar'], saving: ['cloud_upload', 'Guardando…'],
  offline: ['cloud_off', 'Sin conexión: se guardará al volver'], forbidden: ['block', 'Sin permiso para guardar cambios'], 'too-large': ['error', 'Demasiado grande para la nube'], gone: ['cloud_off', 'Ya no está en la nube'] };
export function mountCloudStatus() {
  const el = document.getElementById('cloud-status'); if (!el) return;
  const paint = () => {
    const d = cd.cloudDoc(); el.hidden = !d; if (!d) return;
    const [icon, text] = d.role === 'view' ? (d.noCopy ? ['lock', 'Solo lectura, sin copias'] : ['visibility', 'Solo lectura']) : d.readOnly ? STATUS.readonly : STATUS[d.status] || STATUS.saved;
    el.innerHTML = `<i class="ms">${icon}</i><span>${t(text)}</span>`; el.dataset.status = d.status;
    el.title = t('Nube de Revela') + ' · ' + t(text) + ' — ' + t('Compartir y permisos');
    const ss = document.getElementById('save-state'); if (ss) ss.hidden = true;
  };
  const paintAll = () => { paint(); paintReadOnly(); };
  cd.onCloud(paintAll); window.addEventListener('revela:lang', paintAll);
  // (The space full: said once, with what to do — the status beside the name keeps saying it.)
  let told = false; cd.onCloud((what, data) => { if (what === 'full' && !told) { told = true; alertDialog(storageFullText(data)); } });
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
    ${mine ? b('pro', 'Pasar a Pro') + b('list', 'Mis presentaciones') : ''}${d.noCopy ? '' : b('copy', 'Guardar una copia') + b('download', 'Descargar')}`;
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
    await whileOpening(cd.openDoc(id));
    if (lti || q.get('self') === '1') present({ selfPaced: true, fullscreen: false, ...(lti && { answer: (pollId, answer) => acc.api('lti/answer', { lti, pollId, answer }) }) });
    return true;
  }
  catch (e) {
    settle();
    if (e.status === 401 && await confirmDialog(t('Esta presentación está compartida con personas concretas. Inicia sesión con tu cuenta de Google para abrirla.'))) {
      try { await signInWithTerms(); await whileOpening(cd.openDoc(id)); return true; } catch (err) { if (err.message !== 'CANCELLED') alertDialog(errorText(err)); }
    } else if (e.status === 403) alertDialog(t('Tu cuenta ({email}) no tiene acceso a esta presentación. Pide a quien te la envió que te añada.').replace('{email}', acc.account()?.email || ''));
    else if (e.status === 404) alertDialog(t('Esta presentación ya no está en la nube.'));
    else if (e.status !== 401) alertDialog(errorText(e));
    return false;
  }
}
