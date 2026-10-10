// Revela's own format: the deck as JSON (.revela.json).

import { state } from '../../core/store.js';
import { download, slug } from '../files.js';
import { approxSize } from '../../core/model.js';
import { jsonBlob } from '../../core/jsonblob.js';

// The file: indented when small (readable); without indenting and written in pieces when big — a presentation with
// hundreds of MB of media as one text ran the tab out of memory (core/jsonblob.js).
export const projectBlob = deck => (approxSize(deck) > 5e6 ? jsonBlob(deck) : new Blob([JSON.stringify(deck, null, 2)], { type: 'application/json' }));

export function saveProject() {
  download(projectBlob(state.deck), slug(state.deck.name) + '.revela.json');
}
