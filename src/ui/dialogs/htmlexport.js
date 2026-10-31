// Export ▸ Web page (.html): one choice before the download — «Include the libraries inside the HTML» (off by default):
// the page then opens with no connection (3D viewer, maps, Lottie, PDFs, formulas and fonts inside, only what this
// presentation uses; io/formats/offline-libs.js), at the cost of the weight said here. Remembered in this browser.
import { t } from '../../i18n/index.js';
import { state } from '../../core/store.js';
import { esc } from '../../core/text.js';
import { buildHTML, exportHTML } from '../../io/formats/html.js';
import { usedGroups, needsNetwork, fontsKB } from '../../io/formats/offline-libs.js';
import { toast } from '../shell/toast.js';
import { alertDialog } from './dialog.js';

const KEY = 'revela.export.libs';
const remembered = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };
const remember = on => { try { localStorage.setItem(KEY, on ? '1' : '0'); } catch {} };

// What this presentation would carry and what it will still need a connection for (from the page itself).
export function htmlExportPlan(deck = state.deck) {
  let html = ''; try { html = buildHTML(deck); } catch {}
  const groups = usedGroups(html), fam = (html.match(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com\//g) || []).length, f = fontsKB(deck.theme, fam);
  return { groups, mb: (groups.reduce((n, g) => n + g.sizeKB, 0) + f) / 1024, network: needsNetwork(html), fonts: f > 0 };
}
const NET = {
  map: 'Los mapas siguen necesitando internet para el fondo de satélite: sin conexión se ve la imagen guardada del mapa.',
  web: 'Las páginas web insertadas necesitan conexión.',
  media: 'Los vídeos, imágenes y modelos 3D que vienen de internet necesitan conexión.',
  camera: 'El fondo de cámara y el avatar necesitan conexión.',
};

export function openHtmlExport({ run = exportHTML } = {}) {
  document.getElementById('hx-modal')?.remove();
  const plan = htmlExportPlan(), on = remembered();
  const back = document.createElement('div'); back.id = 'hx-modal'; back.className = 'modal-backdrop';
  const size = plan.groups.length || plan.fonts
    ? t('Añade unos {n} MB a esta presentación.').replace('{n}', Math.max(0.1, plan.mb).toFixed(plan.mb < 10 ? 1 : 0))
    : t('Esta presentación no usa ninguna librería extra: el archivo pesa lo mismo.');
  back.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="hx-h" style="text-align:start;width:min(540px,94vw);max-width:94vw">
    <button class="modal-close" aria-label="${t('Cerrar')}">✕</button><h3 id="hx-h">${t('Página web (.html)')}</h3>
    <p class="host-help">${t('Se abre en cualquier navegador, también sin conexión.')}</p>
    <label class="hx-opt" style="display:flex;gap:10px;align-items:flex-start;margin:14px 0 6px;cursor:pointer"><input type="checkbox" id="hx-libs" ${on ? 'checked' : ''} style="margin-top:4px">
      <span><b>${t('Incluir las librerías dentro del HTML')}</b><br><small class="host-help">${t('Va todo dentro del archivo, aunque pesa más: el visor 3D, los mapas, las animaciones, los PDF, las fórmulas y las letras que uses.')}</small></span></label>
    <p class="host-help hx-size" aria-live="polite"></p>
    <ul class="host-help hx-net" style="margin:6px 0 0;padding-inline-start:20px">${plan.network.map(k => `<li>${esc(t(NET[k]))}</li>`).join('')}</ul>
    <div class="fr-actions" style="margin-top:16px"><button type="button" class="fr-cancel hx-cancel">${t('Cancelar')}</button><button type="button" class="fr-do hx-go"><i class="ms">download</i> ${t('Descargar')}</button></div></div>`;
  document.body.appendChild(back);
  const q = s => back.querySelector(s), close = () => back.remove(), box = q('#hx-libs');
  const paint = () => {
    q('.hx-size').innerHTML = box.checked
      ? `${esc(size)}${plan.groups.length ? ` ${esc(t('Dentro irá:'))} ${plan.groups.map(g => esc(t(g.name))).join(', ')}${plan.fonts ? ', ' + esc(t('letras')) : ''}.` : ''}`
      : esc(t('Sin marcar, el archivo es más ligero pero necesita internet para el visor 3D, los mapas, las animaciones, los PDF, las fórmulas y las letras.'));
    q('.hx-net').hidden = !box.checked;
  };
  box.addEventListener('change', () => { remember(box.checked); paint(); }); paint();
  q('.modal-close').addEventListener('click', close); q('.hx-cancel').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  back.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  q('.hx-go').addEventListener('click', async () => {
    const libs = box.checked; close();
    const wait = toast(libs ? t('Preparando la página con las librerías dentro…') : t('Preparando la página…'), { busy: true });
    try {
      const r = await run({ libs });
      wait.close();
      if (libs && r.offline) {
        if (r.missing.length) toast(t('Página web descargada, pero no se pudo incluir todo: esas partes necesitan conexión.'), { error: true });
        else toast(t('Página web descargada con las librerías dentro: se abre sin conexión.'));
      } else toast(r.offline ? t('Página web descargada: se abre con cualquier navegador, también sin conexión (los modelos 3D, mapas y vídeos de internet sí la necesitan).')
        : t('Página web descargada: para verla hace falta conexión a internet.'));
    } catch (e) { wait.close(); alertDialog(e.message || String(e)); }
  });
  q('.hx-go').focus();
  return back;
}
