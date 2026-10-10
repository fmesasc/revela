// The presentation as a file (.revela.json — downloaded, or in Drive, OneDrive, Dropbox): a picture, video or sound
// used in several places is written once. Why: a PowerPoint repeats its pictures on every slide that shows them (a
// logo, a background, a photo on many layouts), and each copy went into the file whole — a deck with ~400 MB of
// media made a 2 GB file, too big to save or upload. Now the file has each of those once, in `sharedFiles`
// ({ "1": "data:…" }), and the places that use it say "rvfile:1". Opening it (sanitizeDeck, which everything that
// comes in goes through) puts them back, all pointing to the same text: no extra memory for the repeats.
// Only whole data: URLs of some size, and only those that repeat: a file without repeats is the same as before
// (older versions of Revela read it as always).

import { approxSize } from './model.js';
import { jsonBlob } from './jsonblob.js';

const MIN = 64 * 1024, REF = 'rvfile:';
const isBig = v => typeof v === 'string' && v.length >= MIN && v.startsWith('data:');

// A copy of the deck with its repeated files in sharedFiles (the deck itself if nothing repeats).
export function packDeck(deck) {
  const seen = new Map();                                // data: URL → how many times
  const count = v => {
    if (isBig(v)) seen.set(v, (seen.get(v) || 0) + 1);
    else if (Array.isArray(v)) v.forEach(count);
    else if (v && typeof v === 'object') for (const k in v) count(v[k]);
  };
  count(deck);
  const ids = new Map(), sharedFiles = {};
  for (const [v, n] of seen) if (n > 1) { const id = String(ids.size + 1); ids.set(v, id); sharedFiles[id] = v; }
  if (!ids.size) return deck;
  const copy = v => {
    if (typeof v === 'string') return isBig(v) && ids.has(v) ? REF + ids.get(v) : v;
    if (Array.isArray(v)) return v.map(copy);
    if (!v || typeof v !== 'object' || typeof v.toJSON === 'function') return v;
    const o = {}; for (const k of Object.keys(v)) o[k] = copy(v[k]); return o;
  };
  return { ...copy(deck), sharedFiles };
}

// A deck read from a file, with its shared files back in place (in the same object). Anything else is left as is.
export function unpackDeck(deck) {
  const files = deck && typeof deck === 'object' && !Array.isArray(deck) ? deck.sharedFiles : null;
  if (!files || typeof files !== 'object') return deck;
  delete deck.sharedFiles;
  const file = id => (Object.hasOwn(files, id) && typeof files[id] === 'string' && files[id].startsWith('data:') ? files[id] : '');
  const walk = v => {
    if (Array.isArray(v)) { for (let i = 0; i < v.length; i++) { const x = v[i]; if (typeof x === 'string') { if (x.length < 40 && x.startsWith(REF)) v[i] = file(x.slice(REF.length)); } else walk(x); } }
    else if (v && typeof v === 'object') for (const k in v) { const x = v[k]; if (typeof x === 'string') { if (x.length < 40 && x.startsWith(REF)) v[k] = file(x.slice(REF.length)); } else walk(x); }
  };
  walk(deck);
  return deck;
}

// The file's content from a packed deck: a text when small; in pieces when big (core/jsonblob.js: as one text, a
// big presentation ran the tab out of memory).
export const deckFile = (packed, type = 'application/json') => (approxSize(packed) > 5e6 ? jsonBlob(packed, type) : JSON.stringify(packed));
