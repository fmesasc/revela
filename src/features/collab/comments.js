// Comments (PowerPoint/Google Slides/OnlyOffice): on a slide or on one of its
// objects, with replies, resolve/reopen and @mentions (highlighted). Stored in
// the deck, so they travel with the project file and reach everyone in a live
// session (features/live/collab.js); commenters may add them without editing.
// A comment can be a task (Google Slides' "Assign to"): for someone — written
// "+name" in it, or chosen — with an optional date; resolving it marks it done.
// The tasks of the whole presentation can be listed, everyone's or one's own.

import { state, commit, currentSlide } from '../../core/store.js';
import { uid } from '../../core/model.js';

const AUTHOR = 'revela.author';
export const author = () => { try { return localStorage.getItem(AUTHOR) || ''; } catch { return ''; } };
export const setAuthor = n => { try { localStorage.setItem(AUTHOR, n); } catch {} };

export const commentsOf = (slide = currentSlide()) => slide?.comments || [];

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const cleanName = n => String(n || '').trim().replace(/^[+@]/, '').slice(0, 60);
export function addComment(text, blockId = state.ui.selection, { assignee = '', due = '' } = {}) {
  text = String(text || '').trim(); if (!text) return null;
  const plus = text.match(/(?:^|\s)\+([\p{L}\p{N}_.-]+)/u);             // "+Ana": a task for Ana
  assignee = cleanName(assignee || plus?.[1]);
  const c = { id: uid(), text, author: author(), time: Date.now(), blockId: blockId || null, resolved: false, replies: [],
    ...(assignee && { assignee }), ...(assignee && DATE.test(due) && { due }) };
  commit(() => { const s = currentSlide(); (s.comments ||= []).push(c); }, { comment: true });
  return c.id;
}
const find = id => state.deck.slides.flatMap(s => s.comments || []).find(c => c.id === id);   // (in any slide: the task list shows them all)
export function reply(id, text) {
  text = String(text || '').trim(); const c = find(id); if (!c || !text) return;
  commit(() => { c.replies.push({ id: uid(), text, author: author(), time: Date.now() }); }, { comment: true });
}
export function setResolved(id, on = true) { const c = find(id); if (c) commit(() => { c.resolved = on; }, { comment: true }); }
// Give a comment (or task) to someone else, or to no one; noted as a reply, as Google Slides does.
export function assign(id, name, due) {
  const c = find(id); if (!c) return; name = cleanName(name);
  commit(() => {
    if (name) { c.assignee = name; if (DATE.test(due || '')) c.due = due; else if (due !== undefined) delete c.due; }
    else { delete c.assignee; delete c.due; }
    c.replies.push({ id: uid(), text: name ? `→ +${name}` : '→ —', author: author(), time: Date.now(), assign: true });
  }, { comment: true });
}
// The tasks in the whole presentation (optionally only someone's, or only the open ones), with their slide.
export function tasksOf({ who = '', open = true } = {}, deck = state.deck) {
  const me = who.toLocaleLowerCase();
  return deck.slides.flatMap((s, slide) => (s.comments || []).filter(c => c.assignee && (!open || !c.resolved)
    && (!me || c.assignee.toLocaleLowerCase() === me)).map(c => ({ ...c, slide })))
    .sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999') || a.slide - b.slide);
}
// Names people can be given tasks: those who have written comments, been mentioned or given tasks.
export function people(deck = state.deck) {
  const set = new Set();
  for (const s of deck.slides) for (const c of s.comments || []) {
    for (const n of [c.author, c.assignee, ...mentions(c.text), ...c.replies.map(r => r.author)]) if (n) set.add(n);
  }
  if (author()) set.add(author());
  return [...set].sort((a, b) => a.localeCompare(b));
}
export const overdue = (c, today = new Date().toISOString().slice(0, 10)) => !!(c.due && !c.resolved && c.due < today);
export function deleteComment(id) {
  const s = state.deck.slides.find(x => (x.comments || []).some(c => c.id === id)); if (!s) return;
  commit(() => { s.comments = s.comments.filter(c => c.id !== id); if (!s.comments.length) delete s.comments; }, { comment: true });
}
// @names mentioned in a text.
export const mentions = text => [...String(text).matchAll(/@([\p{L}\p{N}_.-]+)/gu)].map(m => m[1]);

// Comments as plain text, for formats without threads, tasks or "resolved"
// (PowerPoint's classic comments, OpenDocument's annotations): a reply is its own
// comment starting with "↪ ", a task keeps its "+name" (and its date after
// " · "), a resolved one starts with "✓ ". parseCommentText reads them back.
export function commentText(c) {
  let s = c.text || '';
  if (c.assignee && !new RegExp(`\\+${c.assignee.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'u').test(s)) s += ` +${c.assignee}`;
  if (c.assignee && c.due) s += ` · ${c.due}`;
  return (c.resolved ? '✓ ' : '') + s;
}
// Text → { reply: true, text } or a comment's { text, resolved, assignee, due }.
export function parseCommentText(text) {
  text = String(text || '').trim();
  if (text.startsWith('↪ ')) return { reply: true, text: text.slice(2) };
  const c = { text, resolved: false };
  if (text.startsWith('✓ ')) { c.resolved = true; c.text = text = text.slice(2); }
  const due = text.match(/\s·\s(\d{4}-\d{2}-\d{2})$/), plus = text.match(/(?:^|\s)\+([\p{L}\p{N}_.-]+)/u);
  if (plus) { c.assignee = plus[1]; if (due) { c.due = due[1]; c.text = text.slice(0, due.index); } }
  return c;
}
