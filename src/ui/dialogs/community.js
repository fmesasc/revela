// «Publicar en la comunidad» (Archivo ▸ Compartir) and «Mis publicaciones»; the gallery's «De la comunidad»
// (communityInto); opening one from its page (/app/?community=<id>). io/cloud/community.js.

import { esc } from '../../core/text.js';
import { state, replaceDeck } from '../../core/store.js';
import { isBlankDeck } from '../../core/model.js';
import * as cm from '../../io/cloud/community.js';
import { account } from '../../io/cloud/account.js';
import { slidePicture } from '../../io/export/images.js';
import { t, currentLang } from '../../i18n/index.js';
import { alertDialog, confirmDialog } from './dialog.js';
import { toast } from '../shell/toast.js';

export const SUBJECT_NAMES = { math: 'Matemáticas', lang: 'Lengua y literatura', science: 'Ciencias', social: 'Ciencias sociales e historia', arts: 'Arte y plástica', music: 'Música', pe: 'Educación física',
  tech: 'Tecnología e informática', languages: 'Idiomas', values: 'Valores, filosofía y religión', vocational: 'Formación profesional', business: 'Empresa', other: 'Otra' };
export const LEVEL_NAMES = { infant: 'Infantil', primary: 'Primaria', secondary: 'Secundaria', upper: 'Bachillerato', vocational: 'FP', university: 'Universidad', adults: 'Adultos', business: 'Empresa' };
const LICENSE_NAMES = { 'cc-by': ['CC BY', 'Cualquiera puede usarla y cambiarla, citando a la autoría.'], 'cc-by-sa': ['CC BY-SA', 'Igual, y lo que hagan a partir de ella con la misma licencia.'],
  'cc-by-nc': ['CC BY-NC', 'Igual que CC BY, pero sin uso comercial.'], 'cc-by-nc-sa': ['CC BY-NC-SA', 'Sin uso comercial y con la misma licencia.'] };
const STATUS = { pending: 'En revisión', published: 'Publicada', hidden: 'Retirada' };

const picture = async deck => {
  const s = deck.slides.find(x => !x.hidden); if (!s) return null;
  try { const { blob } = await slidePicture(s, 'jpg', deck, { scale: 0.5, quality: 0.8 }); return await new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(blob); }); } catch { return null; }
};

export async function openPublish() {
  if (!cm.communityReady()) return alertDialog(t('La comunidad está en revelaslides.com.'));
  if (!account()) { await alertDialog(t('Para publicar en la comunidad, inicia sesión con tu cuenta de Revela.')); (await import('./account.js')).openAccount(); return; }
  document.getElementById('cm-modal')?.remove();
  const back = document.createElement('div'); back.id = 'cm-modal'; back.className = 'modal-backdrop';
  const opt = (o, names, cur) => Object.entries(names).map(([k, l]) => `<option value="${k}"${k === cur ? ' selected' : ''}>${t(l)}</option>`).join('');
  back.innerHTML = `<div class="modal" style="text-align:start;width:min(620px,96vw);max-width:none"><button class="modal-close" aria-label="${t('Cerrar')}">✕</button>
    <h3>${t('Publicar en la comunidad')}</h3>
    <p class="host-help">${t('Otros docentes podrán encontrarla en revelaslides.com/comunidad y usar una copia. La revisamos antes de publicarla.')}</p>
    <label class="fr-l">${t('Título')}<input type="text" class="cm-title" maxlength="120" value="${esc(state.deck.name || '')}"></label>
    <label class="fr-l">${t('Descripción (para quién es y qué incluye)')}<textarea class="cm-desc" rows="3" maxlength="600"></textarea></label>
    <div class="fr-row"><label class="fr-l">${t('Materia')}<select class="cm-subject">${opt(0, SUBJECT_NAMES, 'other')}</select></label>
      <label class="fr-l">${t('Nivel')}<select class="cm-level">${opt(0, LEVEL_NAMES, 'secondary')}</select></label></div>
    <label class="fr-l">${t('Nombre que se mostrará (opcional)')}<input type="text" class="cm-author" maxlength="60" value="${esc(account()?.name || '')}"></label>
    <fieldset class="cm-lic"><legend>${t('Licencia')}</legend>${cm.LICENSES.map((k, i) => `<label class="fr-chk"><input type="radio" name="cm-lic" value="${k}"${i ? '' : ' checked'}> <b>${LICENSE_NAMES[k][0]}</b> — ${t(LICENSE_NAMES[k][1])}</label>`).join('')}</fieldset>
    <label class="fr-chk"><input type="checkbox" class="cm-rights"> ${t('Confirmo que puedo publicarla: es mía, las imágenes y textos que lleva se pueden compartir, y no contiene datos personales de alumnos.')}</label>
    <p class="cm-note host-help"></p>
    <div class="fr-actions"><button type="button" class="mini2 cm-mine">${t('Mis publicaciones')}</button><button type="button" class="fr-do cm-go">${t('Enviar a revisión')}</button></div></div>`;
  document.body.appendChild(back);
  const q = s => back.querySelector(s), close = () => back.remove();
  q('.modal-close').addEventListener('click', close); back.addEventListener('click', e => { if (e.target === back) close(); });
  q('.cm-mine').addEventListener('click', () => { close(); openMine(); });
  q('.cm-go').addEventListener('click', async () => {
    const note = q('.cm-note');
    if (q('.cm-title').value.trim().length < 3) { note.textContent = t('Escribe un título.'); q('.cm-title').focus(); return; }
    if (!q('.cm-rights').checked) { note.textContent = t('Marca la casilla para confirmar que puedes publicarla.'); return; }
    q('.cm-go').disabled = true; note.textContent = t('Enviando…');
    try {
      const deck = JSON.parse(JSON.stringify(state.deck)); delete deck.comments;
      await cm.publish({ title: q('.cm-title').value, description: q('.cm-desc').value, subject: q('.cm-subject').value, level: q('.cm-level').value, lang: currentLang(),
        license: back.querySelector('[name="cm-lic"]:checked').value, author: q('.cm-author').value, rights: true, deck, thumb: await picture(state.deck) });
      close(); toast(t('Enviada: la revisaremos y aparecerá en la comunidad.'), { action: { label: t('Mis publicaciones'), run: openMine } });
    } catch (e) { q('.cm-go').disabled = false; note.textContent = e.status === 429 ? t('Has llegado al límite de publicaciones por hoy.') : e.status === 413 ? t('Es demasiado grande para publicarla (vídeos o imágenes muy pesados).') : `${t('Algo ha fallado:')} ${e.message}`; }
  });
}

export async function openMine() {
  document.getElementById('cm-modal')?.remove();
  const back = document.createElement('div'); back.id = 'cm-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;width:min(620px,96vw);max-width:none"><button class="modal-close" aria-label="${t('Cerrar')}">✕</button><h3>${t('Mis publicaciones')}</h3><div class="cm-list"><p class="host-help">${t('Cargando…')}</p></div></div>`;
  document.body.appendChild(back);
  const close = () => back.remove(), list = back.querySelector('.cm-list');
  back.querySelector('.modal-close').addEventListener('click', close); back.addEventListener('click', e => { if (e.target === back) close(); });
  const paint = async () => {
    const { items } = await cm.mine().catch(() => ({ items: [] }));
    list.innerHTML = items.length ? `<ul class="gb-list">${items.map(it => `<li><b>${esc(it.title)}</b> <small>${t(STATUS[it.status] || it.status)}${it.status === 'published' ? ` · ${it.views} ${t('visitas')} · ${it.uses} ${t('usos')}` : ''}</small>
      <span>${it.status === 'published' ? `<a class="mini2" href="${esc(cm.pageURL(it.id, it.title))}" target="_blank" rel="noopener">${t('Ver')}</a>` : ''}<button type="button" class="mini2" data-d="${it.id}">${t('Retirar')}</button></span></li>`).join('')}</ul>`
      : `<p class="host-help">${t('Todavía no has publicado ninguna presentación.')}</p>`;
    list.querySelectorAll('[data-d]').forEach(b => b.addEventListener('click', async () => { if (await confirmDialog(t('¿Retirar la presentación de la comunidad? Las copias que otros ya hicieron se quedan.'), { ok: t('Retirar'), danger: true })) { await cm.remove(b.dataset.d); paint(); } }));
  };
  paint();
}

// Open one (a copy) — from the gallery or its page (?community=<id>).
export async function openCommunity(id, close = () => {}) {
  try {
    const deck = await cm.take(id); if (!deck) throw new Error('not found');
    if (!isBlankDeck(state.deck) && !(await confirmDialog(t('¿Abrir esta presentación? Se perderá la actual si no la has guardado.'), { ok: t('Descartar la actual'), danger: true }))) return;
    delete deck.id; replaceDeck(deck); close();
    toast(t('Es una copia para ti: cámbiala a tu gusto. Respeta su licencia al compartirla.'));
  } catch { alertDialog(t('No se ha podido abrir esa presentación de la comunidad.')); }
}

// The gallery's «De la comunidad»: a search and the latest or most used, with their pictures.
export function communityInto(host, { close = () => {} } = {}) {
  if (!cm.communityReady()) return;
  const sec = document.createElement('section'); sec.className = 'gal-community';
  sec.innerHTML = `<h4>${t('De la comunidad')}</h4><div class="gal-bar"><input type="search" class="cm-q" placeholder="${t('Buscar presentaciones de otros docentes…')}">
    <select class="cm-sub"><option value="">${t('Todas las materias')}</option>${Object.entries(SUBJECT_NAMES).map(([k, l]) => `<option value="${k}">${t(l)}</option>`).join('')}</select>
    <select class="cm-sort"><option value="new">${t('Las más nuevas')}</option><option value="popular">${t('Las más usadas')}</option></select></div>
    <div class="gal-grid gal-examples cm-grid"></div><p class="host-help cm-empty" hidden></p>`;
  host.appendChild(sec);
  const grid = sec.querySelector('.cm-grid'), empty = sec.querySelector('.cm-empty');
  let timer = null;
  const load = async () => {
    const r = await cm.browse({ q: sec.querySelector('.cm-q').value.trim(), subject: sec.querySelector('.cm-sub').value, sort: sec.querySelector('.cm-sort').value, limit: 24 }).catch(() => null);
    const items = r?.items || [];
    grid.replaceChildren(...items.map(it => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'gal-item';
      b.innerHTML = `<div class="thumb-canvas">${it.thumb ? `<img src="${esc(cm.thumbURL(it.id))}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover">` : '<i class="ms gal-wait">diversity_3</i>'}</div><span><b></b><small></small></span>`;
      b.querySelector('b').textContent = it.title; b.querySelector('small').textContent = [t(SUBJECT_NAMES[it.subject] || ''), t(LEVEL_NAMES[it.level] || ''), it.author].filter(Boolean).join(' · ');
      b.title = it.description || it.title; b.addEventListener('click', () => openCommunity(it.id, close));
      return b;
    }));
    empty.hidden = !!items.length; empty.textContent = r ? t('Todavía no hay presentaciones de la comunidad con esa búsqueda.') : t('No se ha podido cargar la comunidad.');
  };
  sec.querySelector('.cm-q').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(load, 300); });
  sec.querySelectorAll('select').forEach(s => s.addEventListener('change', load));
  load();
}
