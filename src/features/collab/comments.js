// Comments (PowerPoint/Google Slides/OnlyOffice): on a slide or on one of its
// objects, with replies, resolve/reopen and @mentions (highlighted). Stored in
// the deck, so they travel with the project file; syncing between people will
// come with the collaboration back end.

import { state, commit, currentSlide } from '../../core/store.js';
import { uid } from '../../core/model.js';

const AUTHOR = 'revela.author';
export const author = () => { try { return localStorage.getItem(AUTHOR) || ''; } catch { return ''; } };
export const setAuthor = n => { try { localStorage.setItem(AUTHOR, n); } catch {} };

export const commentsOf = (slide = currentSlide()) => slide?.comments || [];
export const openCount = slide => commentsOf(slide).filter(c => !c.resolved).length;

export function addComment(text, blockId = state.ui.selection) {
  text = String(text || '').trim(); if (!text) return null;
  const c = { id: uid(), text, author: author(), time: Date.now(), blockId: blockId || null, resolved: false, replies: [] };
  commit(() => { const s = currentSlide(); (s.comments ||= []).push(c); });
  return c.id;
}
const find = id => commentsOf().find(c => c.id === id);
export function reply(id, text) {
  text = String(text || '').trim(); const c = find(id); if (!c || !text) return;
  commit(() => { c.replies.push({ id: uid(), text, author: author(), time: Date.now() }); });
}
export function setResolved(id, on = true) { const c = find(id); if (c) commit(() => { c.resolved = on; }); }
export function deleteComment(id) {
  commit(() => { const s = currentSlide(); s.comments = (s.comments || []).filter(c => c.id !== id); if (!s.comments.length) delete s.comments; });
}
// @names mentioned in a text.
export const mentions = text => [...String(text).matchAll(/@([\p{L}\p{N}_.-]+)/gu)].map(m => m[1]);
