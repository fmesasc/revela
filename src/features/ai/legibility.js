// Legibility by destination.
//
// Where a deck will be shown decides how big the type must be and how much
// text fits on a slide: projected in a classroom it is read from the back of
// the room, so it needs big type and very few words; read on a screen or
// printed as a document it can hold more. The sizes the editor has always used
// are the 'screen' profile, so with no destination chosen NOTHING changes.
//
// One place controls the five groups of limits that used to be hardcoded and
// scattered: the minimum text size (fromspec.js fitSize), the body size floor
// (compose), the minimum code size (CODE_MIN), how much code fits per slide
// (CODE_ROOM, specs.js splitCode) and when a bullet slide is too much and is
// cut or set in two columns (specs.js splitSpec). The AI prompt also gets a
// line telling the model to write less for a projected deck (`guide`).

import { state } from '../../core/store.js';

export const DESTS = ['projector', 'screen', 'print'];
export const DEST_NAMES = { projector: 'Proyector de aula', screen: 'Pantalla', print: 'Documento para leer' };

export const LEGIBILITY = {
  // Projected in a classroom: big type, few words; detail goes to the notes.
  projector: {
    scale: 1.18, minText: 26, bodyFloor: 34, minCode: 22,
    codeRoom: { lines: 11, withPoints: 9, sideChars: 42 },
    split: { a1: 5, c1: 320, colItems: 8, colLong: 60, a2: 6, c2: 440 },
    guide: 'This deck will be PROJECTED in a classroom and read from the back of the room. Keep very few words on each slide: at most 5 short bullet points of about 8 words, short titles, one idea per slide. Put the explanation and the detail in the speaker notes, never crowd the slide — a projected slide with a lot of text cannot be read.',
  },
  // On a screen: the sizes the editor has always used. Default; changes nothing.
  screen: {
    scale: 1, minText: 18, bodyFloor: 30, minCode: 20,
    codeRoom: { lines: 13, withPoints: 11, sideChars: 48 },
    split: { a1: 6, c1: 420, colItems: 10, colLong: 70, a2: 8, c2: 560 },
    guide: '',
  },
  // A document to read or print, not presented live: a bit more text is fine.
  print: {
    scale: 0.94, minText: 16, bodyFloor: 28, minCode: 18,
    codeRoom: { lines: 16, withPoints: 13, sideChars: 54 },
    split: { a1: 8, c1: 560, colItems: 12, colLong: 80, a2: 10, c2: 760 },
    guide: 'This deck will be read on a screen or printed as a document, not presented out loud, so each slide may hold a little more text and detail than a slide meant to be projected.',
  },
};

// The profile for an explicit destination key (used while generating, before
// the deck is installed: splitSpec and the AI prompt), and for the open deck
// (leg(): everything the layout does runs on the deck once it is installed with
// its own `legibility`, so it just follows state.deck). An unknown or missing
// destination is 'screen', which is exactly the behaviour the editor has always
// had — so nothing changes unless a destination is chosen.
export const profileFor = d => LEGIBILITY[d] || LEGIBILITY.screen;
export const destOf = (deck = state.deck) => (LEGIBILITY[deck?.legibility] ? deck.legibility : 'screen');
export const leg = () => LEGIBILITY[state.deck?.legibility] || LEGIBILITY.screen;
