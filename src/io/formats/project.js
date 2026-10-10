// Revela's own format: the deck as JSON (.revela.json).

import { state } from '../../core/store.js';
import { download, slug } from '../files.js';
import { approxSize } from '../../core/model.js';
import { jsonBlob } from '../../core/jsonblob.js';
import { packDeck } from '../../core/deckfile.js';

// The file: its repeated pictures, videos and sounds once (core/deckfile.js); indented when small (readable); without
// indenting and written in pieces when big — a presentation with hundreds of MB of media as one text ran the tab out
// of memory (core/jsonblob.js).
export function projectBlob(deck) {
  const packed = packDeck(deck);
  return approxSize(packed) > 5e6 ? jsonBlob(packed) : new Blob([JSON.stringify(packed, null, 2)], { type: 'application/json' });
}

export function saveProject() {
  download(projectBlob(state.deck), slug(state.deck.name) + '.revela.json');
}
