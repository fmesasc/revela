// Revela's own format: a package (.revela: io/formats/package.js); the deck as JSON (.revela.json) for the clouds that
// take one file of text, and opened as ever.

import { state } from '../../core/store.js';
import { download, slug } from '../files.js';
import { approxSize } from '../../core/model.js';
import { jsonBlob } from '../../core/jsonblob.js';
import { packDeck } from '../../core/deckfile.js';
import { packageBlob, packageSaver } from './package.js';

// The file: its repeated pictures, videos and sounds once (core/deckfile.js); indented when small (readable); without
// indenting and written in pieces when big — a presentation with hundreds of MB of media as one text ran the tab out
// of memory (core/jsonblob.js).
export const fileSize = deck => approxSize(packDeck(deck));
export function projectBlob(deck) {
  const packed = packDeck(deck);
  return approxSize(packed) > 5e6 ? jsonBlob(packed) : new Blob([JSON.stringify(packed, null, 2)], { type: 'application/json' });
}

// Downloaded: always a package (.revela, a zip): presentation.json and its pictures, videos and models as they are, put
// together from the copies the browser keeps on disk (as PowerPoint keeps a .pptx). A .revela.json — its files inside
// as text — is still opened by every version, and still made for the cloud providers (othercloud.js…). In the desktop
// app the window puts the zip together itself from Revela's folder (package.js setPackageSaver). → 'package', or null
// (cancelled there).
export async function saveProject({ onProgress } = {}) {
  const name = slug(state.deck.name) + '.revela', saver = packageSaver();
  if (saver) return (await saver(state.deck, name)) ? 'package' : null;
  download(await packageBlob(state.deck, { onProgress }), name);
  return 'package';
}
