// Comments side panel for the current slide.

import { esc } from '../../core/text.js';
import { state, commit, setSelection } from '../../core/store.js';
import * as cm from '../../features/collab/comments.js';
import { promptDialog } from '../dialogs/dialog.js';
import { goToSlide } from '../../features/document/slides.js';
import { t, currentLang } from '../../i18n/index.js';

const withMentions = s => esc(s).replace(/@([\p{L}\p{N}_.-]+)/gu, '<span class="cm-at">@$1</span>');
const when = ts => new Date(ts).toLocaleString(currentLang(), { dateStyle: 'short', timeStyle: 'short' });

export function toggleComments(on = !state.ui.showComments) {
  commit(() => { state.ui.showComments = on; }, { history: false });
}
async function ensureAuthor() {
  if (cm.author()) return true;
  const n = await promptDialog(t('¿Con qué nombre quieres firmar los comentarios?'), '');
  if (!n || !n.trim()) return false; cm.setAuthor(n.trim()); return true;
}

// What the panel lists: this slide's comments, every task, or one's own tasks.
const VIEWS = [['slide', 'Esta diapositiva'], ['tasks', 'Todas las tareas'], ['mine', 'Mis tareas']];
const day = d => new Date(d + 'T12:00').toLocaleDateString(currentLang(), { day: 'numeric', month: 'short' });

export function renderComments() {
  let panel = document.getElementById('comments-panel');
  if (!state.ui.showComments) { panel?.remove(); return; }
  if (!panel) {
    panel = document.createElement('aside'); panel.id = 'comments-panel';
    document.querySelector('main').appendChild(panel);
  }
  const view = state.ui.commentView || 'slide', sel = state.ui.selection;
  const list = view === 'slide' ? cm.commentsOf().map(c => ({ ...c, slide: state.ui.slideIndex }))
    : cm.tasksOf({ who: view === 'mine' ? cm.author() : '', open: !state.ui.showResolved });
  const key = JSON.stringify([state.ui.slideIndex, view, list, sel, state.ui.showResolved, view === 'slide' ? 0 : state.deck.slides.length]);
  if (panel.dataset.key === key) return;
  panel.dataset.key = key;
  const shown = list.filter(c => state.ui.showResolved || !c.resolved), people = cm.people();
  panel.innerHTML = `<div class="cm-head"><b>${t('Comentarios')}</b><button type="button" class="cm-close" title="${t('Cerrar')}">✕</button></div>
    <select class="cm-view" aria-label="${t('Mostrar')}">${VIEWS.map(([v, l]) => `<option value="${v}"${v === view ? ' selected' : ''}>${t(l)}</option>`).join('')}</select>
    <div class="cm-new"><textarea rows="3" placeholder="${t(sel ? 'Comentar el objeto seleccionado… (@nombre para mencionar)' : 'Comentar esta diapositiva… (@nombre para mencionar)')}"></textarea>
      <div class="cm-task-in"><input class="cm-assign" list="cm-people" placeholder="${t('Asignar a… (opcional)')}" aria-label="${t('Asignar a')}">
        <input type="date" class="cm-due" aria-label="${t('Fecha límite')}" title="${t('Fecha límite')}"></div>
      <datalist id="cm-people">${people.map(n => `<option value="${esc(n)}">`).join('')}</datalist>
      <button type="button" class="fr-do cm-add">${t('Comentar')}</button></div>
    <label class="cm-toggle"><input type="checkbox" class="cm-res"${state.ui.showResolved ? ' checked' : ''}> ${t(view === 'slide' ? 'Mostrar resueltos' : 'Mostrar las hechas')}</label>
    <div class="cm-list"></div>`;
  const box = panel.querySelector('.cm-list');
  if (!shown.length) box.innerHTML = `<p class="host-help">${t(view === 'slide' ? 'No hay comentarios en esta diapositiva.' : view === 'mine' ? 'No tienes tareas pendientes.' : 'No hay tareas pendientes.')}</p>`;
  for (const c of shown) {
    const el = document.createElement('div'); el.className = 'cm-item' + (c.resolved ? ' resolved' : '') + (c.blockId && c.blockId === sel ? ' on' : '');
    const task = c.assignee ? `<div class="cm-task${cm.overdue(c) ? ' late' : ''}"><i class="ms">${c.resolved ? 'task_alt' : 'assignment_ind'}</i>`
      + `<span>${t(c.resolved ? 'Hecha' : 'Tarea para')} <b>${esc(c.assignee)}</b>${c.due ? ` · ${t('para el')} ${day(c.due)}` : ''}</span></div>` : '';
    el.innerHTML = `<div class="cm-meta"><b>${esc(c.author || t('Anónimo'))}</b> · ${when(c.time)}`
      + `${view !== 'slide' ? ` · <a href="#" class="cm-slide">${t('Diapositiva')} ${c.slide + 1}</a>` : ''}${c.blockId ? ` · <a href="#" class="cm-obj">${t('objeto')}</a>` : ''}</div>
      ${task}<div class="cm-text">${withMentions(c.text)}</div>
      ${c.replies.map(r => `<div class="cm-reply${r.assign ? ' cm-sys' : ''}"><div class="cm-meta"><b>${esc(r.author || t('Anónimo'))}</b> · ${when(r.time)}</div><div class="cm-text">${r.assign ? esc(r.text === '→ —' ? t('Sin asignar') : t('Asignada a') + ' ' + r.text.slice(3)) : withMentions(r.text)}</div></div>`).join('')}
      <div class="cm-actions"><button type="button" data-a="reply">${t('Responder')}</button>
        <button type="button" data-a="assign">${t(c.assignee ? 'Reasignar' : 'Asignar')}</button>
        <button type="button" data-a="resolve">${t(c.resolved ? 'Reabrir' : c.assignee ? 'Marcar como hecha' : 'Resolver')}</button>
        <button type="button" data-a="del" title="${t('Eliminar')}">✕</button></div>`;
    const go = () => { if (c.slide !== state.ui.slideIndex) goToSlide(c.slide); };
    el.querySelector('.cm-slide')?.addEventListener('click', e => { e.preventDefault(); go(); });
    el.querySelector('.cm-obj')?.addEventListener('click', e => { e.preventDefault(); go(); commit(() => setSelection(c.blockId), { history: false }); });
    el.querySelector('[data-a="reply"]').addEventListener('click', async () => {
      if (!(await ensureAuthor())) return;
      const txt = await promptDialog(t('Respuesta'), ''); if (txt) cm.reply(c.id, txt);
    });
    el.querySelector('[data-a="assign"]').addEventListener('click', async () => {
      if (!(await ensureAuthor())) return;
      const n = await promptDialog(t('¿A quién se la asignas? (vacío: a nadie)'), c.assignee || '');
      if (n !== null) cm.assign(c.id, n);
    });
    el.querySelector('[data-a="resolve"]').addEventListener('click', () => cm.setResolved(c.id, !c.resolved));
    el.querySelector('[data-a="del"]').addEventListener('click', () => cm.deleteComment(c.id));
    box.appendChild(el);
  }
  panel.querySelector('.cm-close').addEventListener('click', () => toggleComments(false));
  panel.querySelector('.cm-view').addEventListener('change', e => commit(() => { state.ui.commentView = e.target.value; }, { history: false }));
  panel.querySelector('.cm-res').addEventListener('change', e => commit(() => { state.ui.showResolved = e.target.checked; }, { history: false }));
  panel.querySelector('.cm-add').addEventListener('click', async () => {
    const ta = panel.querySelector('.cm-new textarea'); if (!ta.value.trim()) return;
    if (!(await ensureAuthor())) return;
    cm.addComment(ta.value, state.ui.selection, { assignee: panel.querySelector('.cm-assign').value, due: panel.querySelector('.cm-due').value });
  });
}
