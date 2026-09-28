// Revela's own format: the deck as JSON (.revela.json).

import { state } from '../../core/store.js';
import { download, slug } from '../files.js';

export function saveProject() {
  download(new Blob([JSON.stringify(state.deck, null, 2)], { type: 'application/json' }),
    slug(state.deck.name) + '.revela.json');
}
