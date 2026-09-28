// Advanced background dialog (reveal.js backgrounds): image fit and opacity,
// video (file or address, loop, muted), web page (interactive or not) and the
// background transition; for this slide or all.

import { currentSlide } from '../core/store.js';
import { setBackgroundOptions } from '../features/slides.js';
import { alertDialog } from './dialog.js';
import { t } from '../i18n.js';

export function openBackgroundDialog() {
  document.getElementById('bg-modal')?.remove();
  const s = currentSlide(), hasImg = /url\(/.test(s.background || '');
  const fit = /repeat(?!-)/.test(s.background || '') && !/no-repeat/.test(s.background) ? 'tile' : /contain/.test(s.background || '') ? 'contain' : 'cover';
  const back = document.createElement('div'); back.id = 'bg-modal'; back.className = 'modal-backdrop';
  const opt = (v, l, cur) => `<option value="${v}"${cur === v ? ' selected' : ''}>${t(l)}</option>`;
  back.innerHTML = `<div class="modal" style="text-align:start;width:min(520px,94vw);max-width:94vw">
    <button class="modal-close">✕</button><h3>${t('Fondo avanzado')}</h3>
    <fieldset class="bgf"><legend>${t('Imagen de fondo')}</legend>
      <label class="fr-l">${t('Ajuste')}<select class="bg-fit"${hasImg ? '' : ' disabled'}>${opt('cover', 'Cubrir', fit)}${opt('contain', 'Contener', fit)}${opt('tile', 'Mosaico', fit)}</select></label>
      <label class="fr-l">${t('Opacidad del fondo')} <input type="range" class="bg-op" min="10" max="100" step="5" value="${s.bgOpacity ?? 100}"></label></fieldset>
    <fieldset class="bgf"><legend>${t('Vídeo de fondo')}</legend>
      <label class="fr-l"><input type="url" class="bg-vurl" placeholder="https://…/video.mp4" value="${s.bgVideo && !s.bgVideo.startsWith('data:') ? s.bgVideo.replace(/"/g, '&quot;') : ''}"></label>
      <div class="bg-row"><button class="bg-vfile">${t('Elegir archivo…')}</button><span class="bg-vname">${s.bgVideo?.startsWith('data:') ? t('Vídeo del equipo') : ''}</span></div>
      <label class="fr-chk"><input type="checkbox" class="bg-loop"${s.bgVideoLoop !== false ? ' checked' : ''}> ${t('En bucle')}</label>
      <label class="fr-chk"><input type="checkbox" class="bg-mute"${s.bgVideoMuted !== false ? ' checked' : ''}> ${t('Sin sonido')}</label></fieldset>
    <fieldset class="bgf"><legend>${t('Página web de fondo')}</legend>
      <label class="fr-l"><input type="url" class="bg-iurl" placeholder="https://…" value="${(s.bgIframe || '').replace(/"/g, '&quot;')}"></label>
      <label class="fr-chk"><input type="checkbox" class="bg-inter"${s.bgInteractive ? ' checked' : ''}> ${t('Se puede usar durante la presentación (interactiva)')}</label></fieldset>
    <label class="fr-l">${t('Transición del fondo')}<select class="bg-tr">${opt('', 'Como la presentación', s.bgTransition || '')}${['none', 'fade', 'slide', 'convex', 'concave', 'zoom'].map(v => opt(v, v, s.bgTransition)).join('')}</select></label>
    <label class="fr-chk"><input type="checkbox" class="bg-all"> ${t('Aplicar a todas las diapositivas')}</label>
    <div class="fr-actions"><button class="bg-clear">${t('Quitar vídeo y web')}</button><button class="fr-do bg-ok">${t('Aplicar')}</button></div></div>`;
  document.body.appendChild(back);
  const q = x => back.querySelector(x), close = () => back.remove();
  let videoData = s.bgVideo?.startsWith('data:') ? s.bgVideo : null;
  q('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  q('.bg-vfile').addEventListener('click', () => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'video/*';
    inp.onchange = () => { const f = inp.files[0]; if (!f) return; if (f.size > 60e6) { alertDialog(t('El vídeo es muy grande (más de 60 MB); usa mejor una dirección web.')); return; }
      const r = new FileReader(); r.onload = () => { videoData = r.result; q('.bg-vname').textContent = f.name; q('.bg-vurl').value = ''; }; r.readAsDataURL(f); };
    inp.click();
  });
  q('.bg-clear').addEventListener('click', () => { q('.bg-vurl').value = ''; q('.bg-iurl').value = ''; videoData = null; q('.bg-vname').textContent = ''; });
  q('.bg-ok').addEventListener('click', () => {
    const vurl = q('.bg-vurl').value.trim(), iurl = q('.bg-iurl').value.trim();
    if ((vurl && !/^https?:\/\//.test(vurl)) || (iurl && !/^https:\/\//.test(iurl))) { alertDialog(t('Dirección no válida (debe empezar por https://).')); return; }
    setBackgroundOptions({
      ...(hasImg && { bgFit: q('.bg-fit').value }), bgOpacity: +q('.bg-op').value < 100 ? +q('.bg-op').value : '',
      bgVideo: vurl || videoData || '', bgVideoLoop: q('.bg-loop').checked, bgVideoMuted: q('.bg-mute').checked,
      bgIframe: iurl, bgInteractive: q('.bg-inter').checked, bgTransition: q('.bg-tr').value,
    }, q('.bg-all').checked);
    close();
  });
}
