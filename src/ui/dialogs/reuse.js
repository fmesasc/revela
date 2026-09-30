// "Reuse slides" (PowerPoint) / "Import slides" (Google Slides): open another
// Revela project (.json) or a PowerPoint (.pptx), pick slides by thumbnail and
// insert copies after the current slide.

import { importSlides } from '../../features/document/slides.js';
import { sanitizeDeck } from '../../features/document/sanitize.js';
import { importPPTX } from '../../io/formats/pptx-import.js';
import { importODP } from '../../io/formats/odp.js';
import { blockPreview } from '../shell/preview.js';
import { deckFg } from '../../features/design/palettes.js';
import { alertDialog } from './dialog.js';
import { t } from '../../i18n/index.js';

export function pickReuseFile() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.json,application/json,.pptx,.odp';
  inp.onchange = async () => {
    const f = inp.files[0]; if (!f) return;
    try {
      const deck = sanitizeDeck(/\.pptx$/i.test(f.name) ? await importPPTX(f) : /\.odp$/i.test(f.name) ? await importODP(f) : JSON.parse(await f.text()));
      if (!deck || !Array.isArray(deck.slides) || !deck.slides.length) throw new Error('sin diapositivas');
      openReuseDialog(deck, f.name);
    } catch (e) { alertDialog(t('No se pudo leer el archivo.') + ' ' + (e.message || '')); }
  };
  inp.click();
}

export function openReuseDialog(deck, name = '') {
  document.getElementById('reuse-modal')?.remove();
  const back = document.createElement('div');
  back.id = 'reuse-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;min-width:320px;max-width:760px">
    <button class="modal-close">✕</button><h3>${t('Reutilizar diapositivas')}</h3>
    <p class="reuse-src"></p>
    <div class="reuse-grid"></div>
    <div class="fr-actions">
      <button class="reuse-all mini2">${t('Seleccionar todas')}</button>
      <button class="fr-do reuse-go" disabled>${t('Insertar')}</button>
    </div></div>`;
  back.querySelector('.reuse-src').textContent = name;
  const grid = back.querySelector('.reuse-grid');
  const { w, h } = deck.size || { w: 1280, h: 720 };
  const chosen = new Set();
  const go = back.querySelector('.reuse-go');
  const sync = () => {
    grid.querySelectorAll('.reuse-item').forEach(el => el.classList.toggle('on', chosen.has(+el.dataset.i)));
    go.disabled = !chosen.size;
    go.textContent = t('Insertar') + (chosen.size ? ` (${chosen.size})` : '');
  };
  deck.slides.forEach((s, i) => {
    const el = document.createElement('button');
    el.type = 'button'; el.className = 'reuse-item'; el.dataset.i = i;
    const cv = document.createElement('div'); cv.className = 'thumb-canvas';
    cv.style.background = s.background || '#101317'; cv.style.setProperty('--ar', w / h);
    const inner = document.createElement('div'); inner.className = 'thumb-inner';
    inner.style.cssText = `width:${w}px;height:${h}px;transform:scale(${160 / w});color:${deckFg(deck)}`;
    for (const b of s.blocks || []) { try { inner.appendChild(blockPreview(b)); } catch {} }
    cv.appendChild(inner);
    const num = document.createElement('span'); num.className = 'reuse-num'; num.textContent = i + 1;
    el.append(cv, num);
    el.addEventListener('click', () => { chosen.has(i) ? chosen.delete(i) : chosen.add(i); sync(); });
    grid.appendChild(el);
  });
  document.body.appendChild(back);
  const close = () => back.remove();
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  back.querySelector('.reuse-all').addEventListener('click', () => {
    if (chosen.size === deck.slides.length) chosen.clear(); else deck.slides.forEach((_, i) => chosen.add(i));
    sync();
  });
  go.addEventListener('click', () => { importSlides(deck, [...chosen].sort((a, b) => a - b)); close(); });
  sync();
}
