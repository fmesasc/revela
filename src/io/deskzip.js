// The desktop app's zips (a .pptx, a .revela), opened by the window itself (desktop/src-tauri/src/media.rs) and read
// here as JSZip is (file(name), async('string' | 'uint8array'), _data.uncompressedSize): the small parts come to the
// page; each picture, video or sound goes to Revela's own folder on disk (extract) and the presentation gets its
// address there (core/mediastore.js). The web view takes in data at some 32 MB/s on Linux: a PowerPoint of 417 MB,
// handed whole, took 13 s before anything was read.
//
// A file chosen in an «Open» dialog goes into its <input> as an empty stand-in (an input can only hold real files):
// desktopFileOf gives back the file on disk it stands for.

import { registerMedia } from '../core/mediastore.js';

let api = null;
export const setDeskApi = a => { api = a; };
const invoke = (...a) => api.core.invoke(...a);

const held = new Map();                                   // stand-in's name + time → the file on disk
let seq = 0;
const keyOf = f => `${f.name}\u0000${f.lastModified}`;
export function holdDesktopFile(df) {
  const f = new File([], df.name, { type: df.type || '', lastModified: Date.now() * 1000 + (++seq % 1000) });
  held.set(keyOf(f), df);
  return f;
}
// The file on disk a file stands for (or that file itself, if it is one); null for an ordinary file.
export const desktopFileOf = f => (f?.deskZip ? f : (f instanceof File && f.size === 0 && held.get(keyOf(f))) || null);

const extOf = (name, type) => (/\.([a-z0-9]{1,8})$/i.exec(name)?.[1] || (type.split('/')[1] || 'bin').replace('jpeg', 'jpg').replace(/\+.*/, '')).toLowerCase();

// A file of that folder, registered for the page → its address.
export function registerDiskMedia(id, path, type, size) {
  return registerMedia(id, null, { url: api.core.convertFileSrc(path), type, path, size }).url;
}

class DeskEntry {
  constructor(zip, name, size) { this.zip = zip; this.name = name; this.size = size; this._data = { uncompressedSize: size }; }
  async bytes() { return new Uint8Array(await invoke('zip_read', { token: this.zip.token, name: this.name })); }
  async async(type) {
    const b = await this.bytes();
    if (type === 'string' || type === 'text') return new TextDecoder().decode(b);
    if (type === 'uint8array') return b;
    if (type === 'arraybuffer') return b.buffer;
    if (type === 'blob') return new Blob([b]);
    throw new Error('zip: ' + type);
  }
  // Into the folder → its address, or null (from a package: bytes that aren't its id — expect —).
  async extract(type, expect = null) {
    const r = await invoke('zip_extract', { token: this.zip.token, name: this.name, ext: extOf(this.name, type), expect });
    return r ? registerDiskMedia(r[0], r[1], type, r[2]) : null;
  }
}
export class DeskZip {
  constructor(token, list) {
    this.desk = true; this.token = token; this.files = {};
    for (const [name, size] of list) this.files[name] = new DeskEntry(this, name, size);
  }
  file(name) { return typeof name === 'string' && Object.hasOwn(this.files, name) ? this.files[name] : null; }
  close() { invoke('zip_close', { token: this.token }).catch(() => {}); }
}
export async function openDeskZip(path) {
  const [token, list] = await invoke('zip_open', { path });
  return new DeskZip(token, list);
}
