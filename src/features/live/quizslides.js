// Quizzes and activities as slides of their own: one poll filling the slide, as the AI makes them (ai/authoring.js)
// and as a question bank comes in (io/formats/questions.js), so both look the same.

import { state, commit } from '../../core/store.js';
import { uid } from '../../core/model.js';
import { pollBlock } from './poll.js';
import { currentPalette } from '../design/palettes.js';

// props: the poll's (kind, question, options, correct…); notes: the speaker notes (the answer, an explanation).
export function quizSlide(props, notes = '', deck = state.deck) {
  const { w: W, h: H } = deck.size;
  return { id: uid(), sectionId: null, background: currentPalette(deck).bg, transition: 'fade', hidden: false, autoSlide: 0, notes: String(notes || ''),
    blocks: [pollBlock({ x: 80, y: 60, w: W - 160, h: H - 120, fontSize: 30, ...props, question: String(props.question || '').slice(0, 300) || '?' })] };
}
// Each one on a new slide after the current one (in the current one's section), the first of them shown. → how many.
export function insertQuizSlides(items) {
  if (!items.length) return 0;
  const at = Math.min(state.deck.slides.length, state.ui.slideIndex + 1), section = state.deck.slides[at - 1]?.sectionId || null;
  const made = items.map(x => Object.assign(quizSlide(x.poll, x.notes), { sectionId: section }));
  commit(() => { state.deck.slides.splice(at, 0, ...made); state.ui.slideIndex = at; state.ui.selection = null; state.ui.multi = []; });
  return made.length;
}
