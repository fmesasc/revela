// Export ▸ Insert in Moodle or a web page: the code to paste (as Google Slides' «Publish to the web»). It shows the
// presentation from Revela's cloud, so what is corrected there is seen at once without pasting anything again; for
// that it has to be shared by link — «as a presentation» when it wasn't (no editor, no speaker notes, nothing to
// download), and an editing link is never handed to a whole class. The slides and end date chosen when sharing
// are respected. (Editions without accounts: «Share ▸ HTML file», which also gives an iframe.)

import * as cd from '../../io/cloud/clouddocs.js';
import { hasAccounts } from '../../io/cloud/account.js';
import { state } from '../../core/store.js';
import { esc } from '../../core/text.js';
import { t } from '../../i18n/index.js';
import { signedIn, errorText } from './cloud.js';
import { openShare } from './share.js';
import { nowInCloud } from '../shell/where.js';

const NEW_TAB_KEY = 'revela.embed.newTab';
const remembered = () => { try { return localStorage.getItem(NEW_TAB_KEY) !== '0'; } catch { return true; } };
const remember = on => { try { localStorage.setItem(NEW_TAB_KEY, on ? '1' : '0'); } catch {} };
const spin = label => `<span class="btn-spin" aria-hidden="true"></span> ${label}`;

// (accounts, ready: the edition and the sign-in, given by the tests.)
export async function openEmbedExport({ accounts = hasAccounts(), ready = signedIn } = {}) {
  if (!accounts) return openShare();
  if (!(await ready())) return;
  document.getElementById('embed-modal')?.remove();
  const back = document.createElement('div'); back.id = 'embed-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;width:min(560px,94vw);max-width:none"><button class="modal-close">✕</button>
    <h3>${t('Insertar en Moodle o en una web')}</h3><div class="em-body"></div></div>`;
  document.body.appendChild(back);
  const body = back.querySelector('.em-body'), close = () => back.remove();
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  const busy = async (btn, label, work) => {
    const was = btn.innerHTML; btn.disabled = true; btn.innerHTML = spin(label);
    try { await work(); } catch (e) { btn.disabled = false; btn.innerHTML = was; body.querySelector('.em-err')?.remove(); btn.insertAdjacentHTML('afterend', `<p class="host-help em-err" role="alert">${esc(errorText(e))}</p>`); }
  };

  const render = () => {
    const doc = cd.cloudDoc(), link = doc?.sharing?.link;
    // Not in the cloud yet: it has to be, for a link that always shows the latest version.
    if (!doc) {
      body.innerHTML = `<p class="host-help">${t('Para insertarla, guárdala en tu nube de Revela. Así lo que cambies se verá también en Moodle, sin volver a pegar nada.')}</p>
        <div class="fr-actions" style="justify-content:flex-start"><button type="button" class="fr-do em-save">${t('Guardar en la nube')}</button></div>`;
      const b = body.querySelector('.em-save');
      b.addEventListener('click', () => busy(b, t('Guardando…'), async () => { await cd.saveToCloud(); nowInCloud(); render(); }));
      return;
    }
    // Someone else's that they can't share: the code works only if its owner shares it by link.
    if (!doc.sharing) return code(t('Funcionará si {owner} la comparte por enlace.').replace('{owner}', esc(doc.owner || '')));
    if (link === 'none' || link === 'edit' || !link) {
      body.innerHTML = `<p class="host-help">${t('Para que se vea en Moodle, se compartirá por enlace como presentación: quien tenga el enlace podrá verla, pero no editarla, ni ver tus notas, ni descargarla.')}</p>
        ${link === 'edit' ? `<p class="host-help"><i class="ms" aria-hidden="true">warning</i> ${t('Ahora cualquiera con el enlace puede editarla: pasará a poder solo verla.')}</p>` : ''}
        <div class="fr-actions" style="justify-content:flex-start"><button type="button" class="fr-do em-share">${t('Crear el código')}</button></div>`;
      const b = body.querySelector('.em-share');
      b.addEventListener('click', () => busy(b, t('Preparando…'), async () => { const r = await cd.shareDoc(doc.id, { link: 'present' }); cd.setSharing(r.sharing); render(); }));
      return;
    }
    code('');
  };

  function code(note) {
    const doc = cd.cloudDoc(), { w = 16, h = 9 } = state.deck.size || {};
    const make = on => cd.embedCode(doc.id, state.deck.name || '', { w, h, newTab: on ? t('Abrir la presentación en una pestaña nueva') : '' });
    body.innerHTML = `${note ? `<p class="host-help"><i class="ms" aria-hidden="true">info</i> ${note}</p>` : ''}
      <label class="fr-l" for="em-code">${t('Código para pegar')}</label>
      <div class="sh-row"><textarea readonly id="em-code" class="em-code" rows="5" spellcheck="false" dir="ltr"></textarea><button type="button" class="mini2 em-copy">${t('Copiar')}</button></div>
      <label class="fr-chk"><input type="checkbox" class="em-tab"${remembered() ? ' checked' : ''}> ${t('Añadir debajo un enlace para abrirla en una pestaña nueva (en el móvil se ve mejor)')}</label>
      <p class="host-help">${t('Se ve como presentación, ocupa todo el ancho y siempre muestra los últimos cambios de tu nube.')}</p>
      <details class="em-how"><summary>${t('Cómo pegarlo en Moodle')}</summary><ol class="host-help">
        <li>${t('Edita la página, la etiqueta o la descripción de la actividad donde quieras que se vea.')}</li>
        <li>${esc(t('En el editor, abre el código HTML: en TinyMCE, Ver ▸ Código fuente; en Atto, el botón </> (en «Mostrar más botones»).'))}</li>
        <li>${t('Pega el código, vuelve al editor normal y guarda.')}</li></ol>
        <p class="host-help">${t('Si al guardar desaparece, tu cuenta de Moodle no puede insertar iframes: pide a quien lo administra el permiso moodle/site:trustcontent, o usa solo el enlace.')}</p></details>
      <div class="fr-actions"><span></span><button type="button" class="fr-do em-done">${t('Listo')}</button></div>`;
    const area = body.querySelector('.em-code'), box = body.querySelector('.em-tab');
    const fill = () => { area.value = make(box.checked); };
    fill();
    box.addEventListener('change', () => { remember(box.checked); fill(); });
    area.addEventListener('focus', () => area.select());
    body.querySelector('.em-copy').addEventListener('click', e => {
      area.select(); navigator.clipboard?.writeText(area.value).catch(() => document.execCommand('copy'));
      e.currentTarget.textContent = t('Copiado');
    });
    body.querySelector('.em-done').addEventListener('click', close);
  }
  render();
}
