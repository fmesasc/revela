// The parts every larger dialog is built from, so that they all read the same at a glance (Francisco, 2026-10-14:
// «tienen mucha información, letra pequeña, estresan»): what most people need in view, the rest folded away.
// - tabs: one subject at a time, listed on the side (on top on a phone), as a phone's settings;
// - more: «Más opciones», closed — the options few people change;
// - tip: «Más información», that unfolds the long explanation, so the dialog keeps one line of help;
// - foot: the buttons, always at the bottom with the main one at the end (right; left in Arabic).
// The fields keep their own classes and attributes: the dialogs' code (and the tests) find them as before.

import { t } from '../../i18n/index.js';
import { esc } from '../../core/text.js';

// tabs: [{ id, icon, label, html }] → a side list and its panes (the first shown).
export const tabsHTML = tabs => `<div class="dk-tabs"><div class="dk-tablist" role="tablist" aria-orientation="vertical">${tabs.map((x, i) =>
  `<button type="button" role="tab" class="dk-tab" id="dk-tab-${x.id}" data-tab="${x.id}" aria-controls="dk-pane-${x.id}" aria-selected="${!i}" tabindex="${i ? -1 : 0}">`
  + `<i class="ms" aria-hidden="true">${x.icon}</i><span>${x.label}</span></button>`).join('')}</div>`
  + `<div class="dk-panes">${tabs.map((x, i) => `<section class="dk-pane" role="tabpanel" id="dk-pane-${x.id}" data-pane="${x.id}" aria-labelledby="dk-tab-${x.id}"${i ? ' hidden' : ''}>`
  + `<h4 class="dk-pane-title">${x.label}</h4>${x.html}</section>`).join('')}</div></div>`;

// Clicks and arrow keys between the tabs; key: remembers the last one opened (this browser), so a second visit lands there.
export function wireTabs(root, key = '') {
  const tabs = [...root.querySelectorAll('.dk-tab')];
  const show = (id, focus = false) => {
    for (const b of tabs) { const on = b.dataset.tab === id; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); }
    root.querySelectorAll('.dk-pane').forEach(p => { p.hidden = p.dataset.pane !== id; });
    root.querySelector('.dk-panes')?.scrollTo?.(0, 0);
    root.querySelector('.dk-tab[aria-selected=true]')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    if (key) try { localStorage.setItem(key, id); } catch {}
  };
  tabs.forEach((b, i) => {
    b.addEventListener('click', () => show(b.dataset.tab));
    b.addEventListener('keydown', e => {
      const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (d) { e.preventDefault(); show(tabs[(i + d + tabs.length) % tabs.length].dataset.tab, true); }
      else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); show(tabs[e.key === 'Home' ? 0 : tabs.length - 1].dataset.tab, true); }
    });
  });
  let last = ''; if (key) try { last = localStorage.getItem(key) || ''; } catch {}
  if (last && tabs.some(b => b.dataset.tab === last)) show(last);
  return show;
}

// «Más opciones» (or another title), closed unless open.
export const moreHTML = (inner, { label = t('Más opciones'), open = false, cls = '' } = {}) =>
  `<details class="dk-more${cls ? ' ' + cls : ''}"${open ? ' open' : ''}><summary><i class="ms" aria-hidden="true">expand_more</i>${label}</summary><div class="dk-more-body">${inner}</div></details>`;

// «ⓘ Más información» on its own line, under the field it explains: it unfolds the long explanation. (text: plain text.)
export const tipHTML = text => `<details class="dk-tip"><summary><i class="ms" aria-hidden="true">info</i>${t('Más información')}</summary><p>${esc(text)}</p></details>`;

// The buttons at the bottom: extra ones first (start), the main one last.
export const footHTML = (inner, cls = '') => `<div class="fr-actions dk-foot${cls ? ' ' + cls : ''}">${inner}</div>`;
