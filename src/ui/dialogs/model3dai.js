// «Crear modelo 3D con IA» (Insertar ▸ Crear 3D con IA): describe a model, optionally with reference
// photos; an AI writes the code of the model, the browser builds and photographs it, and the AI looks at
// the photos and corrects itself (features/ai/model3dagent.js; the same requests as Revela's Blender
// server, server/cloudflare/model3d.js, which is off). Each round shows here with its preview and the
// agent's note; at the end, the model turning, to insert it, ask for changes (another round) or discard it.
// The AI is paid as any other: the account's credits, or the person's own OpenRouter key.

import { insertGeneratedModel } from '../../features/content/resources.js';
import { loadModelViewer } from '../../core/vendor.js';
import { esc } from '../../core/text.js';
import { openAccount } from './account.js';
import { ready } from './ai.js';
import { webModelApi } from '../../features/ai/model3dagent.js';
import { alertDialog } from './dialog.js';
import { t, currentLang } from '../../i18n/index.js';

const EXAMPLES = ['una taza de café de cerámica azul', 'una lámpara de escritorio articulada', 'una maqueta de un edificio de oficinas de 5 plantas'];
const ERRORS = { 'no credits': 'Te has quedado sin créditos.', 'ai failed': 'La IA no ha respondido.', 'ai paused': 'La IA está en pausa ahora mismo. Inténtalo más tarde.',
  internal: 'Algo ha fallado.' };
const local = webModelApi();                            // (in the browser; its jobs kept while the page is open)
let current = null;                                       // the job still open (to come back to it after closing the window)

// (Built in the browser: available wherever the AI is — with an account or one's own key —, nothing to hide.)
export function initModelAi() {}

// A photo → a JPEG data URL of at most 1024 px (the server takes up to 600 000 characters).
async function photo(file) {
  const img = await createImageBitmap(file), k = Math.min(1, 1024 / Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  for (const q of [0.85, 0.7, 0.5]) { const u = c.toDataURL('image/jpeg', q); if (u.length < 590_000) return u; }
  return null;
}

// opts.api / opts.interval: for the tests (a simulated server, quicker polling).
export async function openModelAi({ api = local, interval = 2500 } = {}) {
  const testing = api !== local;
  if (!testing && !(await ready())) return;            // (the AI connected — account or own key — and its notice seen)
  let info;
  try { info = await api('3d'); } catch { info = { ok: false }; }
  if (!info.ok) { alertDialog(t('Crear modelos 3D con IA aún no está disponible.')); return; }
  loadModelViewer().catch(() => {});
  document.getElementById('m3a-modal')?.remove();
  const back = document.createElement('div'); back.id = 'm3a-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal m3a" style="text-align:start;width:min(600px,94vw);max-width:94vw">
    <button class="modal-close">✕</button><h3>${t('Crear modelo 3D con IA')}</h3>
    <div class="m3a-ask">
      <label class="fr-l">${t('¿Qué modelo quieres?')}<textarea class="m3a-prompt" rows="3" maxlength="2000" placeholder="${esc(t('p. ej.: una taza de café de cerámica azul'))}"></textarea></label>
      <div class="m3a-examples">${EXAMPLES.map(x => `<button type="button" class="mini2 m3a-ex">${esc(t(x))}</button>`).join('')}</div>
      <label class="fr-l">${t('Fotos de referencia (opcional, hasta 3)')}<input type="file" class="m3a-photos" accept="image/jpeg,image/png" multiple></label>
      <p class="host-help m3a-realnote" hidden>${t('De momento, en el modo Realista no se pueden usar fotos propias, por la seguridad de los usuarios: estamos trabajando en ello.')}</p>
      ${info.realistic && !info.local ? `<label class="fr-chk"><input type="checkbox" class="m3a-real" checked${info.blender === false ? ' disabled' : ''}> ${t('Realista (con textura, para objetos, animales y personas). Cuesta más y tarda un minuto; desmárcalo para formas geométricas sencillas con fotos propias.')}</label>` : ''}
      <p class="host-help">${info.local ? t('La descripción, las fotos de referencia y las fotos del modelo se envían al servicio de IA (OpenRouter y el proveedor del modelo). El modelo se construye en tu navegador.')
        : t('La descripción y las fotos se envían al servicio de IA (OpenRouter y el proveedor del modelo). El guion de Blender se ejecuta en un servidor de Revela y el trabajo se borra a las 24 horas.')}</p>
      <p class="host-help m3a-est">${info.local ? t('Cada ronda cuesta lo que cobra la IA por ella, normalmente muy poco.') : t('Hasta {n} créditos (se cobra lo que cuesta de verdad, normalmente bastante menos).').replace('{n}', info.estimate?.max ?? '?')}</p>
      <div class="fr-actions"><button type="button" class="fr-do m3a-go">✨ ${t('Crear')}</button></div>
    </div>
    <div class="m3a-work" hidden>
      <div class="m3d-view m3a-view" hidden></div>
      <p class="m3a-status"></p>
      <ol class="m3a-rounds"></ol>
      <div class="m3a-end" hidden>
        <label class="fr-l">${t('Cambios que quieres')}<textarea class="m3a-fb" rows="2" maxlength="2000" placeholder="${esc(t('p. ej.: más alta y con el asa más fina'))}"></textarea></label>
      </div>
      <div class="fr-actions"><button type="button" class="mini2 m3a-discard">${t('Descartar')}</button><span class="m3a-endb"><button type="button" class="mini2 m3a-more">${t('Pedir cambios')}</button> <button type="button" class="fr-do m3a-insert">${t('Insertar')}</button></span></div>
    </div></div>`;
  document.body.appendChild(back);
  const q = s => back.querySelector(s);
  // «Realista» sends the picture to a service outside the EU: until the data-processing agreement is signed, no photos of their own.
  const sync = () => { const on = !!q('.m3a-real')?.checked, f = q('.m3a-photos'); if (on) f.value = ''; f.disabled = on; q('.m3a-realnote').hidden = !on;
    const n = (on ? info.realisticEstimate : info.estimate)?.max; if (n != null && !info.local) q('.m3a-est').textContent = t('Hasta {n} créditos (se cobra lo que cuesta de verdad, normalmente bastante menos).').replace('{n}', n); };
  q('.m3a-real')?.addEventListener('change', sync); sync();
  let timer = null, glb = null, closed = false;
  const close = () => { closed = true; clearTimeout(timer); back.remove(); };
  q('.modal-close').addEventListener('click', close);
  back.querySelectorAll('.m3a-ex').forEach(b => b.addEventListener('click', () => { q('.m3a-prompt').value = b.textContent; }));
  const fail = e => {
    const err = e?.data?.error || e?.message;
    if (e?.status === 402) { alertDialog(t('No te quedan créditos suficientes. Consigue más desde tu cuenta.')); if (!testing) openAccount(); return; }
    if (e?.status === 409 && err === 'busy') { alertDialog(t('Ya tienes un modelo 3D en marcha. Espera a que termine.')); return; }
    if (e?.status === 409 && err === 'round limit') { alertDialog(t('Este modelo ya ha llegado al máximo de rondas. Empieza uno nuevo.')); return; }
    alertDialog(t(ERRORS[err] || 'No se pudo completar: ') + (ERRORS[err] ? '' : err || ''));
  };

  // What the server says: the rounds, and the model when it's ready.
  const paint = async s => {
    q('.m3a-rounds').innerHTML = s.rounds.map(r => `<li class="${r.ok ? 'ok' : 'ko'}">${r.preview ? `<img src="${esc(r.preview)}" alt="">` : '<i class="ms">error</i>'}
      <div><b>${t('Ronda')} ${r.n}</b>${r.note ? ` · ${esc(r.note)}` : ''}${r.ok ? '' : `<br><small>${esc(t(r.error === 'invalid answer' ? 'La IA no respondió bien; lo intenta otra vez.' : info.local ? 'El código falló; lo corrige en la siguiente ronda.' : 'El guion falló en Blender; lo corrige en la siguiente ronda.'))}</small>`}</div></li>`).join('');
    const running = s.status === 'running';
    q('.m3a-status').innerHTML = running ? `<i class="ms m3a-spin">progress_activity</i> ${t('Ronda {n}: la IA está modelando y revisando el resultado…').replace('{n}', s.rounds.length + 1)}`
      : s.status === 'done' ? t('Listo. Gíralo con el ratón para verlo por todos lados.')
      : s.status === 'failed' ? t('No ha conseguido un modelo válido. Pide cambios para intentarlo otra vez.')
      : t(ERRORS[s.error] || 'Algo ha fallado.');
    q('.m3a-end').hidden = q('.m3a-endb').hidden = running;
    q('.m3a-insert').disabled = !s.glb; q('.m3a-more').disabled = s.total >= s.max;
    if (!running && s.glb && !glb) {
      glb = (await api(`3d/jobs/${current}/model`)).glb;
      if (closed) return;
      const mv = document.createElement('model-viewer');
      Object.assign(mv, { src: glb, alt: t('Modelo creado con IA') }); mv.setAttribute('camera-controls', ''); mv.setAttribute('auto-rotate', '');
      mv.style.cssText = 'width:100%;height:100%'; q('.m3a-view').replaceChildren(mv); q('.m3a-view').hidden = false;
    }
  };
  const poll = async () => {
    if (closed || !current) return;
    let s; try { s = await api('3d/jobs/' + current); } catch (e) { if (e.status === 404) { current = null; close(); return; } timer = setTimeout(poll, interval * 2); return; }
    await paint(s);
    if (s.status === 'running' && !closed) timer = setTimeout(poll, interval);
  };
  const working = () => { q('.m3a-ask').hidden = true; q('.m3a-work').hidden = false; poll(); };

  q('.m3a-go').addEventListener('click', async () => {
    const prompt = q('.m3a-prompt').value.trim(), files = [...q('.m3a-photos').files];
    if (prompt.length < 3) { alertDialog(t('Describe el modelo que quieres.')); return; }
    if (files.length > 3) { alertDialog(t('Como mucho 3 fotos de referencia.')); return; }
    q('.m3a-go').disabled = true;
    try {
      const realistic = !!q('.m3a-real')?.checked;
      const images = realistic ? [] : (await Promise.all(files.map(photo))).filter(Boolean);
      current = (await api('3d/jobs', { prompt, images, lang: currentLang(), ...(realistic && { realistic: true }) })).id; working();
    } catch (e) { fail(e); }
    finally { if (!closed) q('.m3a-go').disabled = false; }
  });
  q('.m3a-more').addEventListener('click', async () => {
    const text = q('.m3a-fb').value.trim(); if (!text) { q('.m3a-fb').focus(); return; }
    try { await api(`3d/jobs/${current}/feedback`, { text }); q('.m3a-fb').value = ''; glb = null; working(); } catch (e) { fail(e); }
  });
  q('.m3a-discard').addEventListener('click', async () => { const id = current; current = null; close(); try { await api(`3d/jobs/${id}/cancel`, {}); } catch {} });
  // (Once inserted, the job isn't needed: it is deleted from the server.)
  q('.m3a-insert').addEventListener('click', () => { if (!glb) return; insertGeneratedModel(glb, t('Modelo creado con IA')); const id = current; current = null; close(); api(`3d/jobs/${id}/cancel`, {}).catch(() => {}); });
  if (current) working();                                // (a job still open: back to it)
  else q('.m3a-prompt').focus();
}
