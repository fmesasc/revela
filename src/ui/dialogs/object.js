// Object property dialogs opened from the context menu and the ribbon:
// image adjustments and crop, equations, chart data, opacity, icon colour,
// box style, slide links, captions, alt text, table style, background removal.

import { state, commit } from '../../core/store.js';
import * as blocks from '../../features/document/blocks.js';
import { t } from '../../i18n/index.js';
import { alertDialog } from './dialog.js';
import { isGif } from '../../features/live/media.js';
import { gifRemoveBackground } from '../../features/live/gifbg.js';
import { MATHLIVE, BG_REMOVAL, loadScript } from '../../core/vendor.js';
import { renderLatex } from '../canvas/content.js';
import { tablePresets, tableClass, tableVars, tableCSS } from '../../render/svg.js';
import { currentPalette, deckFg } from '../../features/design/palettes.js';

export function openImageAdjust(b) {
  if (document.getElementById('img-modal')) return;
  const a = Object.assign({ brightness: 100, contrast: 100, saturate: 100, opacity: 100 }, b.adj);
  const sl = (label, prop, max) =>
    `<label class="fr-l">${label} <input type="range" data-adj="${prop}" min="0" max="${max}" value="${a[prop]}"></label>`;
  const back = document.createElement('div');
  back.id = 'img-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;min-width:280px">
    <button class="modal-close">✕</button><h3>${t('Ajustes de imagen')}</h3>
    ${sl(t('Brillo'), 'brightness', 200)}${sl(t('Contraste'), 'contrast', 200)}
    ${sl(t('Saturación'), 'saturate', 200)}${sl(t('Opacidad'), 'opacity', 100)}
    <div class="fr-actions"><button class="fr-do" data-reset>${t('Restablecer')}</button></div>
  </div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  back.querySelectorAll('[data-adj]').forEach(r =>
    r.addEventListener('input', () => blocks.setImageAdj(r.dataset.adj, r.value)));
  back.querySelector('[data-reset]').addEventListener('click', () => {
    blocks.resetImageAdj();
    back.querySelectorAll('[data-adj]').forEach(r => (r.value = r.dataset.adj === 'opacity' ? 100 : 100));
  });
}
// Visual equation editor: a palette of templates and symbols inserts LaTeX for
// the user, with a live preview — no need to know LaTeX.
export const MATH_PALETTE = [
  ['Estructuras', [
    ['a/b', '\\frac{ }{ }'], ['√', '\\sqrt{ }'], ['ⁿ√', '\\sqrt[n]{ }'],
    ['xⁿ', '^{ }'], ['xₙ', '_{ }'], ['∑', '\\sum_{i=1}^{n} '], ['∏', '\\prod_{i=1}^{n} '],
    ['∫', '\\int_{a}^{b} '], ['lim', '\\lim_{x\\to 0} '], ['( )', '\\left( \\right)'],
    ['[ ]', '\\left[ \\right]'], ['{ }', '\\left\\{ \\right\\}'], ['|x|', '\\left| \\right|'],
    ['matriz', '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}'], ['vec', '\\vec{ }'], ['x̄', '\\bar{ }'], ['x̂', '\\hat{ }'],
  ]],
  ['Griegas', [
    ['α', '\\alpha '], ['β', '\\beta '], ['γ', '\\gamma '], ['δ', '\\delta '], ['ε', '\\epsilon '],
    ['θ', '\\theta '], ['λ', '\\lambda '], ['μ', '\\mu '], ['π', '\\pi '], ['ρ', '\\rho '],
    ['σ', '\\sigma '], ['τ', '\\tau '], ['φ', '\\phi '], ['ω', '\\omega '],
    ['Δ', '\\Delta '], ['Σ', '\\Sigma '], ['Π', '\\Pi '], ['Ω', '\\Omega '], ['Φ', '\\Phi '],
  ]],
  ['Operadores', [
    ['×', '\\times '], ['÷', '\\div '], ['±', '\\pm '], ['∓', '\\mp '], ['·', '\\cdot '],
    ['≠', '\\neq '], ['≤', '\\leq '], ['≥', '\\geq '], ['≈', '\\approx '], ['∞', '\\infty '],
    ['→', '\\to '], ['⇒', '\\Rightarrow '], ['∈', '\\in '], ['∉', '\\notin '], ['⊂', '\\subset '],
    ['∪', '\\cup '], ['∩', '\\cap '], ['∂', '\\partial '], ['∇', '\\nabla '], ['∀', '\\forall '], ['∃', '\\exists '],
  ]],
];
export function ensureMathlive() {
  if (window.customElements && customElements.get('math-field')) return Promise.resolve(true);
  return loadScript(MATHLIVE).then(() => customElements.whenDefined('math-field')).then(() => true, () => false);
}
// Visual, Symbolab‑style equation editor (MathLive): type and edit the formula
// as it looks, with a math keyboard — no LaTeX needed. Falls back to the palette
// editor if MathLive can't load.
export async function openMath(b) {
  if (document.getElementById('math-modal')) return;
  const ok = await ensureMathlive();
  if (!ok) return openMathPalette(b);
  const back = document.createElement('div');
  back.id = 'math-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal mt-modal" style="text-align:start;min-width:min(420px,94vw);max-width:94vw;box-sizing:border-box">
    <button class="modal-close">✕</button><h3>${t('Editar ecuación')}</h3>
    <math-field class="mt-field"></math-field>
    <label class="fr-l" style="margin-top:2px"><span style="display:flex;justify-content:space-between">LaTeX
      <button class="mt-toggle" style="background:none;border:none;color:var(--accent);cursor:pointer;font-size:12px">${t('Ocultar')}</button></span>
      <textarea class="mt-tex" rows="2" style="font-family:monospace"></textarea></label>
    <div class="fr-actions"><button class="mini2 mt-kbd">⌨ ${t('Teclado')}</button><button class="fr-do">${t('Aplicar')}</button></div>
  </div>`;
  document.body.appendChild(back);
  const mf = back.querySelector('math-field');
  const tex = back.querySelector('.mt-tex');
  mf.mathVirtualKeyboardPolicy = 'manual';
  mf.value = b.latex || ''; tex.value = b.latex || '';
  mf.addEventListener('input', () => { tex.value = mf.value; blocks.setMath(mf.value, b.id); });
  tex.addEventListener('input', () => { mf.value = tex.value; blocks.setMath(tex.value, b.id); });
  // MathLive puts its virtual keyboard at the end of <body>, under the dialog's
  // backdrop: a tap on a key landed on the backdrop and closed the dialog. It
  // goes inside the dialog (above it; in an iframe MathLive won't move it, so
  // it is raised instead), a click on it never closes the dialog, and it goes
  // away with the dialog.
  const kbd = window.mathVirtualKeyboard;
  try { kbd.container = back; } catch {}
  document.body.style.setProperty('--keyboard-zindex', '3100');
  const onKeyboard = e => e.composedPath().some(n => n.classList?.contains('ML__keyboard'));
  // The dialog stays visible above the keyboard (in the space left over).
  const fit = () => { const h = kbd?.visible ? Math.round(kbd.boundingRect?.height || 0) : 0; back.style.setProperty('--mt-kbd', h + 'px'); back.classList.toggle('mt-kbd-open', h > 0); };
  try { kbd.addEventListener('geometrychange', fit); kbd.addEventListener('virtual-keyboard-toggle', fit); } catch {}
  const close = () => { try { kbd.removeEventListener('geometrychange', fit); kbd.removeEventListener('virtual-keyboard-toggle', fit); kbd.hide(); kbd.container = document.body; } catch {} back.remove(); };
  back.querySelector('.modal-close').addEventListener('click', close);
  // Only a click that starts on the backdrop closes it: MathLive redraws the
  // keys when a keyboard tab is pressed, so that click ends on the backdrop.
  let downOnBack = false;
  back.addEventListener('pointerdown', e => { downOnBack = e.target === back && !onKeyboard(e); }, true);
  back.addEventListener('click', e => { if (e.target === back && downOnBack && !onKeyboard(e)) close(); downOnBack = false; });
  back.querySelector('.mt-kbd').addEventListener('click', () => { try { window.mathVirtualKeyboard.show(); } catch {} mf.focus(); });
  back.querySelector('.mt-toggle').addEventListener('click', ev => {
    const hidden = tex.style.display === 'none';
    tex.style.display = hidden ? '' : 'none'; ev.target.textContent = hidden ? t('Ocultar') : t('Mostrar');
  });
  back.querySelector('.fr-do').addEventListener('click', close);
  setTimeout(() => { mf.focus(); try { window.mathVirtualKeyboard.show(); } catch {} }, 50);
}
export function openMathPalette(b) {
  if (document.getElementById('math-modal')) return;
  const back = document.createElement('div');
  back.id = 'math-modal'; back.className = 'modal-backdrop';
  const groups = MATH_PALETTE.map(([name, items]) =>
    `<div class="mt-sec">${name}</div><div class="mt-grid">`
    + items.map(([lbl, snip]) => `<button type="button" class="mt-btn" data-snip="${snip.replace(/"/g, '&quot;')}">${lbl}</button>`).join('')
    + `</div>`).join('');
  back.innerHTML = `<div class="modal" style="text-align:start;min-width:460px;max-width:94vw">
    <button class="modal-close">✕</button><h3>${t('Editar ecuación')}</h3>
    <div class="mt-preview"></div>
    ${groups}
    <label class="fr-l" style="margin-top:8px">LaTeX
      <textarea class="mt-in" rows="2" style="font-family:monospace">${(b.latex || '').replace(/</g, '&lt;')}</textarea></label>
    <div class="fr-actions"><button class="fr-do">${t('Aplicar')}</button></div>
  </div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  const ta = back.querySelector('.mt-in'), preview = back.querySelector('.mt-preview');
  const update = () => { blocks.setMath(ta.value, b.id); renderLatex(preview, ta.value); };
  const insert = snip => {
    const s = ta.selectionStart, e = ta.selectionEnd;
    ta.value = ta.value.slice(0, s) + snip + ta.value.slice(e);
    ta.selectionStart = ta.selectionEnd = s + snip.length; ta.focus(); update();
  };
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  back.querySelectorAll('.mt-btn').forEach(x => x.addEventListener('click', () => insert(x.dataset.snip)));
  ta.addEventListener('input', update);
  back.querySelector('.fr-do').addEventListener('click', close);
  renderLatex(preview, ta.value); ta.focus();
}
export function openChartData(b) {
  if (document.getElementById('chart-modal')) return;
  const lines = blocks.chartGridText(b).replace(/</g, '&lt;');
  const back = document.createElement('div');
  back.id = 'chart-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;min-width:300px">
    <button class="modal-close">✕</button><h3>${t('Datos del gráfico')}</h3>
    <label class="fr-l">${t('Tipo')} <select class="ch-type">
      <option value="bar">${t('Barras')}</option><option value="stacked">${t('Barras apiladas')}</option><option value="stacked100">${t('Barras apiladas al 100 %')}</option>
      <option value="hbar">${t('Barras horizontales')}</option><option value="histogram">${t('Histograma')}</option><option value="line">${t('Líneas')}</option><option value="area">${t('Área')}</option>
      <option value="pie">${t('Circular')}</option><option value="doughnut">${t('Dona')}</option>
      <option value="scatter">${t('Dispersión')}</option><option value="radar">${t('Radar')}</option><option value="map">${t('Mapa')}</option></select></label>
    <label class="fr-l">${t('Color (barras)')} <input type="color" class="ch-color" value="${b.color || '#3f6497'}"></label>
    <label class="fr-chk"><input type="checkbox" class="ch-combo"${b.combo ? ' checked' : ''}> ${t('Combinado: series extra como líneas')}</label>
    <label class="fr-chk"><input type="checkbox" class="ch-grid"${b.grid ? ' checked' : ''}> ${t('Líneas de cuadrícula con la escala')}</label>
    <label class="fr-chk"><input type="checkbox" class="ch-labels"${b.dataLabels ? ' checked' : ''}> ${t('Etiquetas de datos (valores)')}</label>
    <label class="fr-l">${t('Título del eje horizontal')} <input type="text" class="ch-xt" value="${(b.xTitle || '').replace(/"/g, '&quot;')}"></label>
    <label class="fr-l">${t('Título del eje vertical')} <input type="text" class="ch-yt" value="${(b.yTitle || '').replace(/"/g, '&quot;')}"></label>
    <label class="fr-l">${t('Datos: etiqueta y una columna por serie; primera fila opcional con los nombres')}
      <textarea class="ch-data" rows="6" style="font-family:monospace">${lines}</textarea></label>
    <div class="fr-actions"><button class="fr-do">${t('Aplicar')}</button></div>
  </div>`;
  document.body.appendChild(back);
  back.querySelector('.ch-type').value = b.chartType || 'bar';
  const close = () => back.remove();
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  back.querySelector('.fr-do').addEventListener('click', () => {
    blocks.setChartGrid(back.querySelector('.ch-data').value, { chartType: back.querySelector('.ch-type').value,
      color: back.querySelector('.ch-color').value, combo: back.querySelector('.ch-combo').checked,
      grid: back.querySelector('.ch-grid').checked, dataLabels: back.querySelector('.ch-labels').checked,
      xTitle: back.querySelector('.ch-xt').value.trim(), yTitle: back.querySelector('.ch-yt').value.trim() });
    // (A map needs its outlines: loaded once, from the internet.)
    if (back.querySelector('.ch-type').value === 'map' && !b.map) blocks.setChartMap(b.id, b.mapScope || 'world').catch(e => alertDialog(t('No se pudo cargar el mapa:') + ' ' + (e.message || e)));
    close();
  });
}
export function openOpacity(b) {
  if (document.getElementById('op-modal')) return;
  const back = document.createElement('div');
  back.id = 'op-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;min-width:260px">
    <button class="modal-close">✕</button><h3>${t('Opacidad')}</h3>
    <label class="fr-l"><span class="op-val">${b.opacity ?? 100}%</span>
      <input type="range" class="op-range" min="0" max="100" value="${b.opacity ?? 100}"></label></div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  back.querySelector('.op-range').addEventListener('input', e => {
    back.querySelector('.op-val').textContent = e.target.value + '%'; blocks.setOpacity(e.target.value);
  });
}
export function openIconColor(b) {
  if (document.getElementById('icon-modal')) return;
  const back = document.createElement('div');
  back.id = 'icon-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="min-width:220px">
    <button class="modal-close">✕</button><h3>${t('Color del icono')}</h3>
    <input type="color" class="ic-color" value="${b.color || '#ffffff'}" style="width:80px;height:44px;border:none;background:none;cursor:pointer">
  </div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  back.querySelector('.ic-color').addEventListener('input', e => blocks.setIconColor(e.target.value));
}
export function openBoxStyle(b) {
  if (document.getElementById('box-modal')) return;
  const back = document.createElement('div');
  back.id = 'box-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;min-width:280px">
    <button class="modal-close">✕</button><h3>${t('Relleno y borde')}</h3>
    <label class="fr-l">${t('Relleno')} <input type="color" class="bx-fill" value="${b.bg || '#3f6497'}"></label>
    <label class="fr-l">${t('Borde')} <input type="color" class="bx-border" value="${b.borderColor || '#1e2a3a'}"></label>
    <label class="fr-l">${t('Redondeo (px)')} <input type="range" class="bx-radius" min="0" max="40" value="${b.radius || 0}"></label>
    <div class="fr-actions"><button class="fr-do" data-clear>${t('Sin relleno/borde')}</button></div>
  </div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  back.querySelector('.bx-fill').addEventListener('input', e => blocks.setBoxStyle({ bg: e.target.value }));
  back.querySelector('.bx-border').addEventListener('input', e => blocks.setBoxStyle({ borderColor: e.target.value }));
  back.querySelector('.bx-radius').addEventListener('input', e => blocks.setBoxStyle({ radius: +e.target.value }));
  back.querySelector('[data-clear]').addEventListener('click', () => { blocks.setBoxStyle({ bg: '', borderColor: '', radius: 0 }); close(); });
}
export function slideShortLabel(s, i) {
  const tb = (s.blocks || []).find(x => x.type === 'text' && x.html);
  const d = document.createElement('div'); d.innerHTML = tb ? tb.html : '';
  const txt = (d.textContent || '').trim().slice(0, 40);
  return `${i + 1}. ${txt || t('Diapositiva') + ' ' + (i + 1)}`;
}
export function openSlidePicker(b) {
  if (document.getElementById('sp-modal')) return;
  const back = document.createElement('div');
  back.id = 'sp-modal'; back.className = 'modal-backdrop';
  const items = state.deck.slides.map((s, i) =>
    `<button class="sp-item${s.id === b.target ? ' on' : ''}" data-id="${s.id}">${slideShortLabel(s, i).replace(/</g, '&lt;')}</button>`).join('');
  back.innerHTML = `<div class="modal" style="text-align:start;min-width:320px;max-height:70vh;overflow:auto">
    <button class="modal-close">✕</button><h3>${t('Elegir diapositiva…')}</h3>
    <div class="sp-list">${items}</div></div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  back.querySelectorAll('.sp-item').forEach(x => x.addEventListener('click', () => { blocks.setSlideRefTarget(x.dataset.id); close(); }));
}
export function openCaption(b) {
  if (document.getElementById('cap-modal')) return;
  const back = document.createElement('div');
  back.id = 'cap-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;min-width:320px">
    <button class="modal-close">✕</button><h3>${t('Descripción')}</h3>
    <label class="fr-l"><input class="cap-in" type="text" value="${(b.caption || '').replace(/"/g, '&quot;')}" placeholder="${t('Descripción')}"></label>
    <div class="fr-actions"><button class="fr-do">${t('Aplicar')}</button></div>
  </div>`;
  document.body.appendChild(back);
  const close = () => back.remove(); const inp = back.querySelector('.cap-in');
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  const apply = () => { blocks.setCaption(inp.value.trim()); close(); };
  back.querySelector('.fr-do').addEventListener('click', apply);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') apply(); });
  inp.focus();
}
export function openAlt(b) {
  if (document.getElementById('alt-modal')) return;
  const back = document.createElement('div');
  back.id = 'alt-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;min-width:300px">
    <button class="modal-close">✕</button><h3>${t('Texto alternativo')}</h3>
    <label class="fr-l">${t('Descripción para accesibilidad')}
      <input class="alt-in" type="text" value="${(b.alt || '').replace(/"/g, '&quot;')}"></label>
    <label class="fr-chk"><input type="checkbox" class="alt-deco"${b.decorative ? ' checked' : ''}> ${t('Marcar como decorativo')}</label>
    <div class="fr-actions"><button class="fr-do">${t('Guardar')}</button></div>
  </div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  back.querySelector('.fr-do').addEventListener('click', () => { blocks.setAlt(back.querySelector('.alt-in').value, back.querySelector('.alt-deco').checked); close(); });
  back.querySelector('.alt-in').focus();
}
export function openImageCrop(b) {
  if (document.getElementById('crop-modal')) return;
  const c = Object.assign({ top: 0, right: 0, bottom: 0, left: 0 }, b.crop);
  const sl = (label, side) =>
    `<label class="fr-l">${label} <input type="range" data-crop="${side}" min="0" max="45" value="${c[side]}"></label>`;
  const back = document.createElement('div');
  back.id = 'crop-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;min-width:280px">
    <button class="modal-close">✕</button><h3>${t('Recortar imagen (%)')}</h3>
    ${sl(t('Arriba'), 'top')}${sl(t('Derecha'), 'right')}${sl(t('Abajo'), 'bottom')}${sl(t('Izquierda'), 'left')}
    <div class="fr-actions"><button class="fr-do" data-reset>${t('Restablecer')}</button></div>
  </div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  back.querySelectorAll('[data-crop]').forEach(r =>
    r.addEventListener('input', () => blocks.setImageCrop(r.dataset.crop, r.value)));
  back.querySelector('[data-reset]').addEventListener('click', () => {
    blocks.resetImageCrop();
    back.querySelectorAll('[data-crop]').forEach(r => (r.value = 0));
  });
}
export async function removeBackground(b) {
  const el = document.querySelector(`.block[data-id="${b.id}"]`);
  el?.classList.add('processing');
  try {
    // An animated GIF keeps its animation: every frame goes through the AI.
    const dataUrl = isGif(b)
      ? await gifRemoveBackground(b.src, { onProgress: (i, n) => el?.setAttribute('data-progress', `${i} / ${n}`) })
      : await import(BG_REMOVAL).then(m => m.removeBackground(b.src))
        .then(blob => new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); }));
    commit(() => (b.src = dataUrl));
  } catch (e) {
    alertDialog(t('No se pudo quitar el fondo: ') + e.message);
  } finally {
    el?.classList.remove('processing'); el?.removeAttribute('data-progress');
  }
}
// Table styles gallery + options (PowerPoint "Table Design").
export function openTableStyle(b) {
  document.getElementById('ts-modal')?.remove();
  const presets = tablePresets(currentPalette());
  const sample = p => { const m = { ...p, rows: [['', '', ''], ['', '', ''], ['', '', ''], ['', '', '']] };
    return `<table class="${tableClass(m)}" style="${tableVars(m)}">${m.rows.map(r => `<tr>${r.map(() => '<td></td>').join('')}</tr>`).join('')}</table>`; };
  const back = document.createElement('div');
  back.id = 'ts-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;min-width:320px">
    <button class="modal-close">✕</button><h3>${t('Estilo de tabla')}</h3>
    <style>${tableCSS('.ts-grid ')} .ts-grid table.tbl td{height:9px;padding:0}</style>
    <div class="ts-grid">${Object.entries(presets).map(([k, p]) =>
      `<button type="button" data-ts="${k}" title="${t(p.name)}"><div class="ts-sample" style="color:${deckFg()}">${sample(p)}</div><span>${t(p.name)}</span></button>`).join('')}</div>
    <div class="ts-opts">
      <label><input type="checkbox" data-o="header"> ${t('Fila de encabezado')}</label>
      <label><input type="checkbox" data-o="banded"> ${t('Filas con bandas')}</label>
      <label><input type="checkbox" data-o="firstCol"> ${t('Primera columna')}</label>
      <label><input type="checkbox" data-o="lines"> ${t('Solo líneas horizontales')}</label>
    </div></div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  const sync = () => back.querySelectorAll('[data-o]').forEach(c => (c.checked = !!b[c.dataset.o]));
  back.querySelectorAll('[data-ts]').forEach(x => x.addEventListener('click', () => {
    const { name, ...p } = presets[x.dataset.ts]; blocks.setTableStyle(p); sync();
  }));
  back.querySelectorAll('[data-o]').forEach(c => c.addEventListener('change', () => blocks.setTableStyle({ [c.dataset.o]: c.checked })));
  sync();
}
