// Add-ins (plugins by URL) and macros (snippets using the Revela API).

import { pluginList, addPlugin, removePlugin, macroList, runMacro, saveMacro, deleteMacro } from '../../api/index.js';
import { alertDialog, promptDialog } from './dialog.js';
import { t } from '../../i18n/index.js';

function modal(id, title, body) {
  document.getElementById(id)?.remove();
  const back = document.createElement('div'); back.id = id; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;width:min(640px,94vw);max-width:94vw"><button class="modal-close">✕</button><h3>${title}</h3>${body}</div>`;
  document.body.appendChild(back);
  back.querySelector('.modal-close').addEventListener('click', () => back.remove());
  back.addEventListener('click', e => { if (e.target === back) back.remove(); });
  return back;
}

export function openPlugins() {
  const back = modal('plugins-modal', t('Complementos'), `
    <p class="host-help">${t('Un complemento es un módulo JavaScript que recibe la API de Revela. Añade solo complementos de fuentes de confianza: se ejecutan con acceso a tu presentación.')}</p>
    <ul class="pl-list"></ul>
    <div class="pl-add"><input type="url" class="pl-url" placeholder="https://…/mi-complemento.js"><button class="fr-do pl-go">${t('Añadir')}</button></div>
    <p class="host-help"><a href="https://github.com/fmesasc/revela/blob/main/docs/COMPLEMENTOS.md" target="_blank" rel="noopener">${t('Cómo crear un complemento, con ejemplos')}</a></p>`);
  const list = back.querySelector('.pl-list');
  const fill = () => {
    const urls = pluginList();
    list.innerHTML = urls.length ? '' : `<li class="host-help">${t('No hay complementos instalados.')}</li>`;
    for (const u of urls) {
      const li = document.createElement('li'); li.innerHTML = `<code></code><button type="button" title="${t('Quitar')}">✕</button>`;
      li.querySelector('code').textContent = u;
      li.querySelector('button').addEventListener('click', () => { removePlugin(u); fill(); });
      list.appendChild(li);
    }
  };
  back.querySelector('.pl-go').addEventListener('click', async () => {
    const url = back.querySelector('.pl-url').value.trim(); if (!url) return;
    try { await addPlugin(url); back.querySelector('.pl-url').value = ''; fill(); }
    catch (e) { alertDialog(t('No se pudo cargar el complemento: ') + (e.message || e)); }
  });
  fill();
}

export function openMacros() {
  const back = modal('macros-modal', t('Macros'), `
    <p class="host-help">${t('Código JavaScript con el objeto Revela, p. ej.:')} <code>for (let i = 0; i &lt; Revela.slides.count(); i++) { … }</code></p>
    <label class="fr-l">${t('Macro guardada')} <select class="mc-list"><option value="">—</option></select></label>
    <textarea class="mc-code" rows="10" spellcheck="false" style="font-family:monospace;width:100%"></textarea>
    <div class="fr-actions"><button class="mc-del mini2">${t('Eliminar')}</button><button class="mc-save mini2">${t('Guardar')}</button><button class="fr-do mc-run">▶ ${t('Ejecutar')}</button></div>
    <pre class="mc-out"></pre>`);
  const sel = back.querySelector('.mc-list'), code = back.querySelector('.mc-code'), out = back.querySelector('.mc-out');
  const fill = (pick = sel.value) => {
    sel.innerHTML = '<option value="">—</option>' + macroList().map(m => `<option></option>`).join('');
    macroList().forEach((m, i) => { sel.options[i + 1].value = m.name; sel.options[i + 1].textContent = m.name; });
    sel.value = pick;
  };
  sel.addEventListener('change', () => { code.value = macroList().find(m => m.name === sel.value)?.code || ''; });
  back.querySelector('.mc-run').addEventListener('click', async () => {
    out.textContent = '';
    try { const r = await runMacro(code.value); out.textContent = r === undefined ? '✓' : '✓ ' + JSON.stringify(r); }
    catch (e) { out.textContent = '✗ ' + (e.message || e); }
  });
  back.querySelector('.mc-save').addEventListener('click', async () => {
    const name = sel.value || await promptDialog(t('Nombre de la macro'), ''); if (!name) return;
    saveMacro(name, code.value); fill(name);
  });
  back.querySelector('.mc-del').addEventListener('click', () => { if (sel.value) { deleteMacro(sel.value); code.value = ''; fill(''); } });
  fill('');
}
