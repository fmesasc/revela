// «Diseñar con IA» (Patrón de diapositivas, Diseño, IA): the AI proposes three designs for the template from a
// description and, if wanted, a logo or a photo (features/ai/masterai.js). Each one drawn — its cover and a content
// slide —, with what it chose; «Aplicar» puts it on the whole presentation (one undo step), the others are dropped.

import { esc } from '../../core/text.js';
import { state } from '../../core/store.js';
import { proposeMasterDesigns, applyMasterDesign } from '../../features/ai/masterai.js';
import { attachments } from '../shell/attachments.js';
import { blockPreview } from '../shell/preview.js';
import { FONTS, ensureFont } from '../../features/design/fonts.js';
import { ready, aiFailed, aiErrorText } from './ai.js';
import { toast } from '../shell/toast.js';
import { t } from '../../i18n/index.js';

const stack = n => FONTS.find(f => f.name === n)?.stack || '';
const W = 1280, H = 720, THUMB = 230;
// Where the placeholders are: the deck's own layouts (in 1280×720), else the usual ones.
function boxesOf(id, fallback) {
  const l = state.deck.layouts?.find(x => x.id === id), k = { x: W / state.deck.size.w, y: H / state.deck.size.h };
  const sc = b => b && { x: b.x * k.x, y: b.y * k.y, w: b.w * k.x, h: b.h * k.y, textAlign: b.textAlign };
  return Object.fromEntries(Object.entries(fallback).map(([ph, f]) => [ph, sc(l?.blocks.find(b => b.ph === ph)) || f]));
}

// A slide of the design drawn small: its background, decorations and sample texts in its fonts and colours.
function thumb(d, cover) {
  const th = d.theme, hs = stack(th.heading), bs = stack(th.body); [hs, bs].forEach(s => s && ensureFont(s));
  const box = cover ? boxesOf('title', { title: { x: 140, y: 150, w: 1000, h: 240 }, subtitle: { x: 140, y: 410, w: 1000, h: 90 } })
    : boxesOf('titleContent', { title: { x: 100, y: 60, w: 1080, h: 100 }, body: { x: 100, y: 180, w: 1080, h: 480 } });
  const txt = (r, html, extra) => ({ id: 'p', type: 'text', html, ...r, rotation: 0, ...extra });
  const title = txt(box.title, esc(cover ? d.name || t('Título de la presentación') : t('Título de la diapositiva')),
    { fontSize: cover ? 66 : 46, fontWeight: '700', fontFamily: hs, color: (cover && d.cover?.title) || d.title.color || th.fg, textAlign: box.title.textAlign || d.title.align, vAlign: cover ? 'bottom' : 'top' });
  const second = cover ? txt(box.subtitle, esc(t('Subtítulo')), { fontSize: 30, fontFamily: bs, color: d.cover?.fg || th.fg, textAlign: box.subtitle.textAlign || d.title.align })
    : txt(box.body, `<ul><li>${esc(t('Una idea clara en cada punto'))}</li><li>${esc(t('El texto se lee así, sobre su fondo'))}</li><li>${esc(t('Y los colores del tema'))}</li></ul>`, { fontSize: 30, fontFamily: bs, color: th.fg });
  const decor = cover && d.cover?.decor.length ? d.cover.decor : d.decor, bg = (cover && d.cover?.background) || d.background;
  const cv = document.createElement('div'); cv.className = 'mai-thumb'; cv.style.cssText = `width:${THUMB}px;height:${THUMB * H / W}px`;
  const inner = document.createElement('div'); inner.style.cssText = `position:relative;width:${W}px;height:${H}px;transform:scale(${THUMB / W});transform-origin:0 0;background:${bg};color:${th.fg};font-family:${bs};overflow:hidden`;
  for (const b of [...decor, title, second]) inner.appendChild(blockPreview(b));
  cv.appendChild(inner); return cv;
}

export function openMasterDesign() {
  document.getElementById('mai-modal')?.remove();
  let busy = null, designs = [];
  const back = document.createElement('div');
  back.id = 'mai-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal mai" role="dialog" aria-labelledby="mai-title" style="text-align:start;width:min(820px,94vw);max-width:none;box-sizing:border-box">
    <button class="modal-close" aria-label="${t('Cerrar')}">✕</button><h3 id="mai-title">${t('Diseñar la plantilla con IA')}</h3>
    <p class="host-help">${t('Describe cómo la quieres (o adjunta tu logo) y la IA te propone tres diseños: colores, fuentes, fondo y adornos del patrón. Elige uno; se deshace con Ctrl+Z.')}</p>
    <div class="th-ai"><input type="text" class="mai-ask" maxlength="800" placeholder="${t('«Congreso médico, sobrio, azul marino»; «para niños de primaria, alegre»…')}" aria-label="${t('Describe la plantilla')}">
      <button type="button" class="mini2 mai-go"><i class="ms">auto_awesome</i> ${t('Proponer')}</button></div>
    <p class="mai-msg host-help" hidden></p>
    <div class="mai-list"></div></div>`;
  document.body.appendChild(back);
  const q = s => back.querySelector(s);
  const att = attachments({ zone: q('.mai'), input: q('.mai-ask') });
  q('.mai-go').before(att.button); q('.th-ai').after(att.chips);
  const close = () => { busy?.abort(); back.remove(); };
  q('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  back.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  const say = m => { q('.mai-msg').hidden = !m; q('.mai-msg').textContent = m || ''; };

  function show() {
    const list = q('.mai-list'); list.replaceChildren();
    designs.forEach((d, i) => {
      const card = document.createElement('div'); card.className = 'mai-card';
      const pics = document.createElement('div'); pics.className = 'mai-pics'; pics.append(thumb(d, true), thumb(d, false));
      const info = document.createElement('div'); info.className = 'mai-info';
      info.innerHTML = `<b>${esc(d.name)}</b><span>${esc(d.why)}</span><small>${esc([d.theme.heading, d.theme.body].filter((x, j, a) => x && a.indexOf(x) === j).join(' · '))}</small>
        <button type="button" class="fr-do" data-apply="${i}">${t('Aplicar')}</button>`;
      card.append(pics, info); list.appendChild(card);
    });
  }
  q('.mai-list').addEventListener('click', e => {
    const i = e.target.closest('[data-apply]')?.dataset.apply; if (i == null) return;
    applyMasterDesign(designs[+i]); toast(t('Diseño aplicado a toda la presentación.')); close();
  });

  async function ask() {
    const text = q('.mai-ask').value.trim(), atts = att.list(); if (busy || att.busy()) return;
    if (!(await ready())) return;
    const go = q('.mai-go'); busy = new AbortController(); go.disabled = true; go.innerHTML = `<span class="btn-spin"></span> ${t('Diseñando…')}`; say('');
    try {
      designs = await proposeMasterDesigns(text, { signal: busy.signal, attachments: atts });
      if (back.isConnected) show();
    } catch (e) {
      if (e.message === 'STOPPED' || !back.isConnected) return;
      if (e.message === 'NO_CREDIT' || e.message === 'NO_KEY') aiFailed(e);
      else say(e.message === 'BAD_ANSWER' ? t('La IA no devolvió diseños válidos. Prueba a describirlo de otra forma.') : aiErrorText(e));
    } finally { busy = null; go.disabled = false; go.innerHTML = `<i class="ms">auto_awesome</i> ${t('Proponer')}`; }
  }
  q('.mai-go').addEventListener('click', ask);
  q('.mai-ask').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); ask(); } });
  q('.mai-ask').focus();
  return { ask, close };
}
