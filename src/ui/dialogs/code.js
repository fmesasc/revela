// Code block editor (reveal.js "line highlights" made visual): edit the code,
// choose the language, line numbers and first line number, whether it scrolls,
// and build the highlight steps on a grid of lines × steps. Each click in the
// presentation moves to the next step (the block scrolls to the highlighted
// lines). A preview plays the steps here.

import { setCode } from '../../features/document/blocks.js';
import { t } from '../../i18n/index.js';

export const CODE_LANGS = ['plaintext', 'javascript', 'typescript', 'python', 'java', 'kotlin', 'c', 'cpp', 'csharp', 'go', 'rust', 'swift',
  'php', 'ruby', 'r', 'matlab', 'scala', 'dart', 'lua', 'haskell', 'perl', 'bash', 'powershell', 'sql', 'html', 'xml', 'css', 'scss',
  'json', 'yaml', 'markdown', 'dockerfile', 'latex', 'makefile', 'diff'];

// "1,3-4|5|" ⇄ [[1,3,4],[5],[]]
export function parseSteps(str) {
  if (!str) return [];
  return String(str).split('|').map(step => step.split(',').flatMap(part => {
    const m = /^\s*(\d+)\s*(?:-\s*(\d+))?\s*$/.exec(part); if (!m) return [];
    const a = +m[1], b = +(m[2] || m[1]); return Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i);
  }));
}
export function stringifySteps(steps) {
  return steps.map(lines => {
    const s = [...new Set(lines)].sort((a, b) => a - b), out = [];
    for (let i = 0; i < s.length; i++) {
      let j = i; while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++;
      out.push(s[i] === s[j] ? `${s[i]}` : `${s[i]}-${s[j]}`); i = j;
    }
    return out.join(',');
  }).join('|');
}

export function openCodeEditor(b) {
  document.getElementById('code-modal')?.remove();
  const back = document.createElement('div'); back.id = 'code-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal code-modal" style="text-align:start;width:min(900px,96vw);max-width:96vw">
    <button class="modal-close">✕</button><h3>${t('Código')}</h3>
    <div class="cd-top">
      <label class="fr-l">${t('Lenguaje')}<select class="cd-lang">${CODE_LANGS.map(l => `<option value="${l}">${l}</option>`).join('')}</select></label>
      <label class="fr-chk"><input type="checkbox" class="cd-lines"> ${t('Números de línea')}</label>
      <label class="fr-l cd-start-l">${t('Empezar en la línea')}<input type="number" class="cd-start" min="1" value="1"></label>
      <label class="fr-chk"><input type="checkbox" class="cd-scroll"> ${t('Desplazar hasta las líneas resaltadas')}</label>
    </div>
    <label class="fr-l">${t('Código')}<textarea class="cd-code" rows="8" spellcheck="false"></textarea></label>
    <div class="cd-steps-head"><b>${t('Pasos de resaltado')}</b>
      <span class="host-help">${t('Marca qué líneas se resaltan en cada paso; cada clic al presentar pasa al siguiente.')}</span></div>
    <label class="fr-chk"><input type="checkbox" class="cd-all"> ${t('Empezar mostrando todo el código sin resaltar')}</label>
    <div class="cd-grid-wrap"><table class="cd-grid"></table></div>
    <div class="fr-actions" style="justify-content:space-between">
      <span><button class="cd-add">＋ ${t('Paso')}</button> <button class="cd-del">－ ${t('Paso')}</button> <button class="cd-play">▶ ${t('Vista previa')}</button></span>
      <button class="fr-do cd-ok">${t('Aplicar')}</button></div></div>`;
  document.body.appendChild(back);
  const q = s => back.querySelector(s), close = () => { clearInterval(timer); back.remove(); };
  let steps = parseSteps(b.lineSteps), timer = null, playing = -1;
  const startAll = /^\s*\|/.test(b.lineSteps || '');
  if (startAll) steps = steps.slice(1);
  if (!steps.length) steps = [[]];
  q('.cd-lang').value = CODE_LANGS.includes(b.lang) ? b.lang : 'plaintext';
  q('.cd-lines').checked = !!b.showLines || !!b.lineSteps;
  q('.cd-start').value = b.lineStart || 1;
  q('.cd-scroll').checked = b.scroll !== false;
  q('.cd-all').checked = startAll;
  q('.cd-code').value = b.code || '';
  const lines = () => q('.cd-code').value.split('\n');
  const render = () => {
    const L = lines(), first = +q('.cd-start').value || 1;
    q('.cd-grid').innerHTML = `<tr><th></th>${steps.map((_, k) => `<th>${k + 1}</th>`).join('')}<th></th></tr>`
      + L.map((ln, i) => `<tr class="${playing >= 0 && steps[playing]?.includes(i + 1) ? 'hl' : ''}"><td class="cd-n">${first + i}</td>`
        + steps.map((st, k) => `<td><input type="checkbox" data-s="${k}" data-l="${i + 1}"${st.includes(i + 1) ? ' checked' : ''}></td>`).join('')
        + `<td class="cd-src"></td></tr>`).join('');
    q('.cd-grid').querySelectorAll('.cd-src').forEach((td, i) => { td.textContent = L[i] || ' '; });
    q('.cd-grid').querySelectorAll('input[data-s]').forEach(c => c.addEventListener('change', () => {
      const st = steps[+c.dataset.s], l = +c.dataset.l;
      if (c.checked) st.push(l); else steps[+c.dataset.s] = st.filter(x => x !== l);
    }));
    q('.cd-del').disabled = steps.length <= 1;
  };
  q('.cd-code').addEventListener('input', render); q('.cd-start').addEventListener('input', render);
  q('.cd-add').addEventListener('click', () => { steps.push([]); render(); });
  q('.cd-del').addEventListener('click', () => { if (steps.length > 1) { steps.pop(); render(); } });
  q('.cd-play').addEventListener('click', () => {
    clearInterval(timer); playing = 0; render();
    timer = setInterval(() => { playing++; if (playing >= steps.length) { clearInterval(timer); playing = -1; } render(); }, 1100);
  });
  q('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  q('.cd-ok').addEventListener('click', () => {
    const used = steps.filter(s => s.length);
    const str = used.length ? (q('.cd-all').checked ? '|' : '') + stringifySteps(used) : '';
    setCode({ code: q('.cd-code').value, lang: q('.cd-lang').value, showLines: q('.cd-lines').checked,
      lineStart: Math.max(1, +q('.cd-start').value || 1), scroll: q('.cd-scroll').checked, lineSteps: str });
    close();
  });
  render();
}
