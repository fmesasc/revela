// Voice-over: the speaker notes of each slide read aloud by an AI voice (through
// the Revela account or the user's OpenRouter key). The audio is kept in the
// slide (slide.narration: mp3 as a data URL, its length and what it says); it
// plays when the slide is shown while presenting and goes into the exported
// video; optionally each narrated slide moves on when its voice ends.

import { state, commit } from '../../core/store.js';
import { plainText } from '../../core/text.js';
import { speech } from './openrouter.js';

export const notesText = s => plainText(String(s.notes || '')).replace(/\s+/g, ' ').trim().slice(0, 4000);
export const narratable = (deck = state.deck) => deck.slides.filter(s => !s.hidden && notesText(s));
// Up to date: made from the notes as they are now.
export const narrationFresh = s => !!s.narration && s.narration.text === notesText(s);

const toDataURL = blob => new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = ko; r.readAsDataURL(blob); });
// Length of the audio (ms); if the browser can't tell, an estimate from the text (about 15 characters a second).
function durationOf(url, text) {
  const guess = Math.round(text.length / 15 * 1000);
  return new Promise(ok => {
    const a = new Audio(); let done = false; const end = v => { if (!done) { done = true; ok(v); } };
    a.preload = 'metadata'; a.onloadedmetadata = () => end(Number.isFinite(a.duration) && a.duration > 0 ? Math.round(a.duration * 1000) : guess);
    a.onerror = () => end(guess); setTimeout(() => end(guess), 4000); a.src = url;
  });
}

// Make it for the slides with notes (only the out-of-date ones unless all = true).
export async function narrate({ voice = 'nova', speed = 1, all = false, advance = false, onProgress, say = speech } = {}) {
  const todo = narratable().filter(s => all || !narrationFresh(s) || s.narration.voice !== voice);
  const made = new Map();
  for (let i = 0; i < todo.length; i++) {
    const s = todo[i], text = notesText(s);
    const src = await toDataURL(await say(text, { voice, speed }));
    made.set(s.id, { src, ms: await durationOf(src, text), voice, text });
    onProgress?.((i + 1) / todo.length);
  }
  commit(() => {
    for (const s of state.deck.slides) {
      const n = made.get(s.id); if (n) s.narration = n;
      if (advance && s.narration) s.autoSlide = s.narration.ms + 800;
    }
  });
  return made.size;
}
export function removeNarration() {
  commit(() => { for (const s of state.deck.slides) { if (s.narration && s.autoSlide === s.narration.ms + 800) s.autoSlide = 0; delete s.narration; } });
}
