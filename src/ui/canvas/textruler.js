// The text ruler (PowerPoint's, with View ▸ Ruler on): over the text box being
// written in, in centimetres from its text's left edge, with its tab stops.
// The button at its start chooses the kind of tab (left, centre, right,
// decimal); a click on the ruler puts one there; a stop can be dragged along
// it, or off it (or double-clicked) to remove it. The ruler never takes the
// caret away from the text.

import { state } from '../../core/store.js';
import * as blocks from '../../features/document/blocks.js';
import { textPadding } from '../../render/svg.js';
import { t } from '../../i18n/index.js';
import { liveTabs } from './content.js';

const KINDS = [['left', '⌊', 'Tabulación izquierda'], ['center', '⊥', 'Tabulación centrada'], ['right', '⌋', 'Tabulación derecha'], ['decimal', '⊥.', 'Tabulación decimal']];
const CM = 96 / 2.54;                                   // px per centimetre
let kind = 'left', current = null;

const padLeft = b => parseFloat(textPadding(b).split(/\s+/)[3]) || 0;

function setTabs(id, list) {
  blocks.setTabs(id, list);
  const c = current; if (!c) return;
  const rich = c.el.querySelector('.rich'); if (rich) liveTabs(rich, c.b);
  showTextRuler(c.el, c.b);
}
export function hideTextRuler() { document.getElementById('text-ruler')?.remove(); current = null; }
export function showTextRuler(el, b) {
  hideTextRuler();
  if (!state.ui.showRuler || b.type !== 'text') return;
  const stage = document.getElementById('stage'); if (!stage) return;
  current = { el, b };
  const r = document.createElement('div'); r.id = 'text-ruler';
  const above = b.y >= 26, left = padLeft(b);
  r.style.cssText = `left:${b.x}px;top:${above ? b.y - 24 : b.y + b.h + 2}px;width:${b.w}px`;
  // Ticks: every half centimetre, numbered every centimetre (from the text's edge).
  let ticks = '';
  for (let c = 0; c * CM / 2 <= b.w - left; c++) {
    const x = left + c * CM / 2;
    ticks += c % 2 ? `<i class="tr-tick" style="left:${x}px"></i>` : `<i class="tr-tick big" style="left:${x}px"></i>${c ? `<b style="left:${x}px">${c / 2}</b>` : ''}`;
  }
  const k = KINDS.find(x => x[0] === kind);
  r.innerHTML = `<button type="button" class="tr-kind" title="${t(k[2])} — ${t('clic para cambiar')}">${k[1]}</button>${ticks}`
    + (b.tabs || []).map((s, i) => `<span class="tr-stop" data-i="${i}" title="${t(KINDS.find(x => x[0] === (s.align || 'left'))[2])}" style="left:${left + s.pos}px">${KINDS.find(x => x[0] === (s.align || 'left'))[1]}</span>`).join('');
  stage.appendChild(r);
  r.addEventListener('pointerdown', e => e.preventDefault());           // (the caret stays in the text)
  r.querySelector('.tr-kind').addEventListener('click', () => { const i = KINDS.findIndex(x => x[0] === kind); kind = KINDS[(i + 1) % KINDS.length][0]; showTextRuler(el, b); });
  const scale = () => r.getBoundingClientRect().width / r.offsetWidth || 1;
  const posAt = e => Math.round(((e.clientX - r.getBoundingClientRect().left) / scale() - left) / (CM / 4)) * (CM / 4);   // (snaps to quarters of a cm)
  r.addEventListener('click', e => {
    if (e.target.closest('.tr-kind, .tr-stop')) return;
    const pos = posAt(e); if (pos <= 0 || pos > b.w - left) return;
    setTabs(b.id, [...(b.tabs || []).filter(s => Math.abs(s.pos - pos) > 2), { pos: +pos.toFixed(1), align: kind }]);
  });
  r.querySelectorAll('.tr-stop').forEach(m => {
    const i = +m.dataset.i;
    m.addEventListener('dblclick', () => setTabs(b.id, (b.tabs || []).filter((_, j) => j !== i)));
    m.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation(); m.setPointerCapture(e.pointerId);
      const y0 = e.clientY;
      const move = ev => { m.style.left = (left + Math.max(0, posAt(ev))) + 'px'; m.classList.toggle('off', Math.abs(ev.clientY - y0) > 24); };
      const up = ev => {
        m.removeEventListener('pointermove', move); m.removeEventListener('pointerup', up);
        const list = (b.tabs || []).slice();
        if (Math.abs(ev.clientY - y0) > 24) list.splice(i, 1);            // dragged off the ruler: gone
        else list[i] = { ...list[i], pos: +Math.max(1, posAt(ev)).toFixed(1) };
        setTabs(b.id, list);
      };
      m.addEventListener('pointermove', move); m.addEventListener('pointerup', up);
    });
  });
}
