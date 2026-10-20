// Revela's own format: the deck as JSON (.revela.json) — or, when big, as a package (.revela: io/formats/package.js).

import { state } from '../../core/store.js';
import { download, slug } from '../files.js';
import { approxSize } from '../../core/model.js';
import { jsonBlob } from '../../core/jsonblob.js';
import { packDeck } from '../../core/deckfile.js';
import { packageBlob, PACKAGE_MIN } from './package.js';
import { hasLive } from '../../core/mediastore.js';

// The file: its repeated pictures, videos and sounds once (core/deckfile.js); indented when small (readable); without
// indenting and written in pieces when big — a presentation with hundreds of MB of media as one text ran the tab out
// of memory (core/jsonblob.js).
export const fileSize = deck => approxSize(packDeck(deck));
export function projectBlob(deck) {
  const packed = packDeck(deck);
  return approxSize(packed) > 5e6 ? jsonBlob(packed) : new Blob([JSON.stringify(packed, null, 2)], { type: 'application/json' });
}

// Downloaded: a .revela.json, or — past PACKAGE_MIN, its pictures, videos and models in it as text — a package, its
// files as they are, put together from the copies the browser keeps on disk. → 'json' or 'package'.
export async function saveProject({ onProgress, min = PACKAGE_MIN } = {}) {
  const name = slug(state.deck.name);
  // (Measured as the file would be — its repeated pictures once —, not as the deck is in memory: a deck of 83 MB with its
  // logos on every slide is an 18 MB .revela.json, which every version of Revela opens.)
  // (Its files by address — core/mediastore.js —: always a package, made from them as they are.)
  if (!hasLive(state.deck) && fileSize(state.deck) <= min) { download(projectBlob(state.deck), name + '.revela.json'); return 'json'; }
  download(await packageBlob(state.deck, { onProgress }), name + '.revela');
  return 'package';
}
