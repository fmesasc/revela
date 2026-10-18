// Archivo ▸ Espacio: what Revela keeps in this browser and the room it has (features/document/storage.js) — a bar of
// how full it is, the parts, and ways to free some or keep it from being cleared by the browser.

import { storageReport, freeVersions, clearCaches, askPersist, share } from '../../features/document/storage.js';
import { confirmDialog } from './dialog.js';
import { toast } from '../shell/toast.js';
import { t, currentLang } from '../../i18n/index.js';
import { openVersions } from './versions.js';

// Bytes in words: «850 KB», «1,2 GB».
export function bytesText(n, lang = currentLang()) {
  if (n == null || !isFinite(n)) return '—';
  const u = [['GB', 1e9], ['MB', 1e6], ['KB', 1e3]].find(([, v]) => n >= v) || ['B', 1];
  return `${(n / u[1]).toLocaleString(lang, { maximumFractionDigits: n >= 1e9 ? 1 : 0 })} ${u[0]}`;
}

export async function openStorage() {
  document.getElementById('storage-modal')?.remove();
  const back = document.createElement('div'); back.id = 'storage-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;width:min(560px,94vw);max-width:94vw">
    <button class="modal-close">✕</button><h3>${t('Espacio en este navegador')}</h3>
    <p class="host-help">${t('Revela guarda en este navegador la presentación que editas, sus versiones y sus imágenes, vídeos y modelos 3D, y lo necesario para trabajar sin conexión. Nada de esto sale de tu equipo.')}</p>
    <div class="st-body"><p class="host-help">${t('Midiendo…')}</p></div></div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  const body = back.querySelector('.st-body');

  const fill = async () => {
    const r = await storageReport().catch(() => null);
    if (!back.isConnected) return;
    if (!r) { body.innerHTML = `<p class="host-help">${t('Este navegador no dice cuánto espacio usa.')}</p>`; return; }
    const k = share(r), pct = k == null ? null : Math.min(100, Math.round(k * 100));
    const row = (icon, label, bytes, extra = '') => `<li style="display:flex;gap:10px;align-items:center;padding:4px 0"><i class="ms" style="opacity:.7">${icon}</i>`
      + `<span style="flex:1">${label}${extra ? ` <span class="host-help" style="display:inline">${extra}</span>` : ''}</span><b>${bytesText(bytes)}</b></li>`;
    body.innerHTML = `
      <div class="st-meter" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct ?? 0}" aria-label="${t('Espacio usado')}"
        style="height:12px;border-radius:6px;background:color-mix(in srgb,currentColor 12%,transparent);overflow:hidden;margin:6px 0 4px">
        <div style="height:100%;width:${pct ?? 0}%;background:${pct >= 80 ? '#c94f4f' : pct >= 60 ? '#d89e00' : '#26890c'}"></div></div>
      <p style="margin:0 0 10px">${r.usage != null && r.quota ? t('Usado: {u} de {q} que permite el navegador ({p} %).').replace('{u}', bytesText(r.usage)).replace('{q}', bytesText(r.quota)).replace('{p}', pct) : t('Este navegador no dice cuánto espacio usa.')}</p>
      <ul style="list-style:none;padding:0;margin:0 0 12px">
        ${row('slideshow', t('Presentación actual'), r.deck)}
        ${row('history', t('Versiones'), r.versions.bytes, t('{n} automáticas, {m} guardadas o de seguridad').replace('{n}', r.versions.autos).replace('{m}', r.versions.named))}
        ${row('perm_media', t('Imágenes, vídeos y modelos 3D'), r.media.bytes, t('{n} archivos, cada uno una sola vez').replace('{n}', r.media.count))}
        ${row('cloud_off', t('Archivos sin conexión y diccionarios'), r.caches)}
      </ul>
      <div class="fr-actions" style="justify-content:flex-start;flex-wrap:wrap;gap:8px">
        <button type="button" class="fr-do st-vers"${r.versions.autos > 3 ? '' : ' disabled'}>${t('Borrar versiones automáticas antiguas')}</button>
        <button type="button" class="mini2 st-cache">${t('Vaciar archivos sin conexión')}</button>
        <button type="button" class="mini2 st-list">${t('Ver las versiones…')}</button>
      </div>
      <p class="host-help" style="margin:8px 0 0">${t('Se quedan las 3 automáticas más recientes, las que guardaste con nombre y las copias de la presentación que tenías antes de abrir otra.')}</p>
      <h4 style="margin:14px 0 4px">${t('Que el navegador no lo borre')}</h4>
      <p class="host-help" style="margin:0 0 6px">${r.persisted ? t('Activado: el navegador no borrará estos datos por su cuenta aunque el disco vaya justo.')
        : t('Si el disco va justo, algunos navegadores (Safari, sobre todo) borran los datos de las webs que llevan tiempo sin abrirse. Puedes pedirle que no lo haga con Revela.')}</p>
      ${r.persisted ? '' : `<div class="fr-actions" style="justify-content:flex-start"><button type="button" class="fr-do st-persist">${t('Guardar de forma permanente')}</button></div>`}
      <p class="host-help" style="margin:10px 0 0">${t('Lo más seguro sigue siendo guardar una copia: Archivo ▸ Descargar, o en la nube.')}</p>`;
    body.querySelector('.st-vers')?.addEventListener('click', async () => {
      if (!await confirmDialog(t('¿Borrar las versiones automáticas antiguas? Se quedan las 3 más recientes y todas las que guardaste con nombre.'))) return;
      const n = await freeVersions(3); toast(t('{n} versiones borradas').replace('{n}', n)); fill();
    });
    body.querySelector('.st-cache')?.addEventListener('click', async () => {
      await clearCaches(); toast(t('Archivos sin conexión vaciados: se volverán a descargar al usarlos')); fill();
    });
    body.querySelector('.st-list')?.addEventListener('click', () => { close(); openVersions(); });
    body.querySelector('.st-persist')?.addEventListener('click', async () => {
      const ok = await askPersist();
      toast(ok ? t('Hecho: el navegador conservará los datos de Revela') : t('El navegador no lo ha permitido (algunos lo deciden solos según cuánto usas la web)'), { error: !ok });
      fill();
    });
  };
  fill();
}
