// The class at its own pace, with the teacher's panel (as Pear Deck's dashboard): a link (and its QR) for the students,
// who go through the presentation on their own device answering its activities (view.html?doc=…&self=1), and here,
// live, where each one is and how they're doing. The presentation must be in Revela's cloud and readable by link.

import * as cd from '../../io/cloud/clouddocs.js';
import { QRCODE, loadScript } from '../../core/vendor.js';
import { state } from '../../core/store.js';
import { esc } from '../../core/text.js';
import { t } from '../../i18n/index.js';
import { alertDialog, confirmDialog } from './dialog.js';

export function openClassPace() {
  document.getElementById('pace-modal')?.remove();
  const doc = cd.cloudDoc(), can = doc && ['owner', 'edit'].includes(doc.role);
  const back = document.createElement('div'); back.id = 'pace-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;width:min(760px,96vw);max-width:none"><button class="modal-close">✕</button><h3>${t('Cada uno a su ritmo')}</h3>
    <p class="host-help">${t('Cada participante abre el enlace en su dispositivo, escribe su nombre y recorre la presentación a su ritmo respondiendo las actividades. Aquí ves en directo por dónde va cada uno y cómo le va.')}</p>
    <div class="pc-body"></div></div>`;
  document.body.appendChild(back);
  const body = back.querySelector('.pc-body'); let timer = 0;
  const close = () => { clearInterval(timer); back.remove(); };
  back.querySelector('.modal-close').addEventListener('click', close); back.addEventListener('click', e => { if (e.target === back) close(); });
  if (!doc) { body.innerHTML = `<p class="host-help">${t('Para esto, guárdala en tu nube de Revela.')}</p>`; return; }
  if (!can) { body.innerHTML = `<p class="host-help">${t('Solo quien puede editarla ve este panel.')}</p>`; return; }
  const link = cd.paceLink(doc.id), shared = () => !['none', 'edit', undefined].includes(cd.cloudDoc()?.sharing?.link);
  body.innerHTML = `<div class="pc-share"></div>
    <div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap"><canvas class="pc-qr" width="160" height="160" style="background:#fff;border-radius:8px"></canvas>
      <div style="flex:1;min-width:240px"><div class="sh-row"><input readonly class="pc-link" value="${esc(link)}"><button type="button" class="mini2 pc-copy">${t('Copiar')}</button></div>
      <div class="fr-actions" style="justify-content:flex-start"><button type="button" class="mini2 pc-clear">${t('Empezar otra sesión')}</button><span class="pc-n host-help"></span></div></div></div>
    <div class="tbl" style="max-height:50vh;overflow:auto;margin-top:10px"><table style="width:100%"><thead><tr><th>${t('Nombre')}</th><th>${t('Va por')}</th><th>${t('Actividades')}</th><th>${t('Aciertos')}</th><th>${t('Última vez')}</th></tr></thead><tbody class="pc-rows"></tbody></table></div>`;
  const q = s => body.querySelector(s);
  const shareRow = () => { q('.pc-share').innerHTML = shared() ? '' : `<p class="host-help">${t('Para que puedan abrirla, se compartirá por enlace solo para ver (sin el editor).')} <button type="button" class="mini2 pc-do-share">${t('Compartir por enlace')}</button></p>`;
    q('.pc-do-share')?.addEventListener('click', async () => { try { const r = await cd.shareDoc(doc.id, { link: 'view' }); cd.setSharing(r.sharing); shareRow(); } catch (e) { alertDialog(String(e.message || e)); } }); };
  shareRow();
  loadScript(QRCODE, 'QRCode').then(QR => QR.toCanvas(q('.pc-qr'), link, { width: 160, margin: 1 }, () => {})).catch(() => { q('.pc-qr').hidden = true; });
  q('.pc-copy').addEventListener('click', e => { navigator.clipboard?.writeText(link); e.target.textContent = t('Copiado'); });
  q('.pc-clear').addEventListener('click', async () => { if (!(await confirmDialog(t('¿Borrar el progreso de esta sesión para empezar otra?')))) return; await cd.clearProgress(doc.id).catch(() => {}); refresh(); });
  const ago = ms => { const s = Math.round((Date.now() - ms) / 1000); return s < 60 ? t('ahora') : s < 3600 ? `${Math.round(s / 60)} min` : `${Math.round(s / 3600)} h`; };
  async function refresh() {
    if (!document.body.contains(back)) { clearInterval(timer); return; }
    let r; try { r = await cd.classProgress(doc.id); } catch { return; }
    const people = (r.people || []).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    q('.pc-n').textContent = t('{n} participantes').replace('{n}', people.length);
    q('.pc-rows').innerHTML = people.length ? people.map(p => {
      const sc = Object.values(p.scores || {}), done = sc.length, pc = done ? Math.round(sc.reduce((a, b) => a + b, 0) / done * 100) : null, of = p.of || state.deck.slides.length;
      return `<tr><td>${esc(p.name || '—')}</td><td><div style="display:flex;align-items:center;gap:6px"><div style="flex:1;min-width:60px;height:8px;background:#8883;border-radius:4px"><div style="height:100%;width:${of ? Math.round((p.slide || 0) / of * 100) : 0}%;background:var(--accent);border-radius:4px"></div></div><small>${p.slide || 0}/${of}</small></div></td>
        <td>${done}/${p.graded || 0}</td><td>${pc == null ? '—' : `<b style="color:${pc >= 50 ? '#26890c' : '#b3261e'}">${pc} %</b>`}</td><td><small>${ago(p.at)}</small></td></tr>`; }).join('')
      : `<tr><td colspan="5" class="host-help">${t('Aún no ha entrado nadie.')}</td></tr>`;
  }
  refresh(); timer = setInterval(refresh, 5000);
}
