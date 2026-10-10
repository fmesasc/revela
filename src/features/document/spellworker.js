// The spell checker's engine, in a worker of its own (started by spelling.js): Hunspell compiled to WebAssembly, the
// same checker as LibreOffice's and Firefox's, with the very same dictionaries. Building a big one (Basque, Galician)
// takes a second or two, and suggestions a few hundred milliseconds: here they never freeze the editor.
//
// The engine and every dictionary are kept in Cache Storage the first time they arrive (by their address, a fixed
// version): the next time they load at once, also without a connection. (The service worker leaves these addresses to
// us — sw.js —, so they aren't stored twice.)
//
// Messages: { id, op, … } → { id, ok, value } or { id, ok: false, error }.
//   load    { tag, aff, dic, engine }   the dictionary at those addresses, as `tag` (es-ES…)
//   check   { tag, words }              → the words it doesn't know
//   suggest { tag, word }               → its suggestions, the best first
//   add     { tag, word }               a word it accepts from now on (the personal dictionary)

const CACHE = 'revela-dicts-v1';
const MAX_LOADED = 4;                                  // (each takes tens of MB: the least used one goes)
let factory = null;
const loaded = new Map();                             // tag → { hs, aff, dic } (in order of use)

async function bytes(url) {
  let c = null; try { c = await caches.open(CACHE); } catch {}          // (no Cache Storage: just the network)
  const hit = c && await c.match(url).catch(() => null);
  if (hit) return new Uint8Array(await hit.arrayBuffer());
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  if (c) try { await c.put(url, res.clone()); } catch {}                // (full: it works, it just isn't kept)
  return new Uint8Array(await res.arrayBuffer());
}

// The engine (an ES module with the wasm inside), from the cache as a blob: it doesn't need its own address.
async function engine(url) {
  if (factory) return factory;
  const code = await bytes(url), src = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
  try {
    const wasm = await (await import(src)).default();
    const fn = (name, ret, args) => wasm.cwrap(name, ret, args);
    const api = { create: fn('Hunspell_create', 'number', ['number', 'number']), destroy: fn('Hunspell_destroy', null, ['number']),
      spell: fn('Hunspell_spell', 'number', ['number', 'number']), suggest: fn('Hunspell_suggest', 'number', ['number', 'number', 'number']),
      free: fn('Hunspell_free_list', null, ['number', 'number', 'number']), add: fn('Hunspell_add', 'number', ['number', 'number']) };
    // (Strings go in as UTF-8 copies in the wasm memory, freed at once; NFC, as the dictionaries are written.)
    const withStr = (s, f) => { const p = wasm.stringToNewUTF8(String(s).normalize()); try { return f(p); } finally { wasm._free(p); } };
    let n = 0;
    factory = {
      open(aff, dic) {
        const dir = `/d${++n}`; wasm.FS.mkdir(dir); wasm.FS.writeFile(`${dir}/x.aff`, aff); wasm.FS.writeFile(`${dir}/x.dic`, dic);
        const h = withStr(`${dir}/x.aff`, a => withStr(`${dir}/x.dic`, d => api.create(a, d)));
        // (Hunspell has read both files: they leave the memory.)
        for (const f of ['x.aff', 'x.dic']) wasm.FS.unlink(`${dir}/${f}`);
        wasm.FS.rmdir(dir);
        return {
          spell: w => withStr(w, p => api.spell(h, p)) !== 0,
          suggest: w => withStr(w, p => {
            const list = wasm._malloc(4);
            try {
              const count = api.suggest(h, list, p), arr = wasm.getValue(list, '*'), out = [];
              for (let i = 0; i < count; i++) out.push(wasm.UTF8ToString(wasm.getValue(arr + i * 4, '*')));
              if (count > 0) api.free(h, list, count);
              return out;
            } finally { wasm._free(list); }
          }),
          add: w => withStr(w, p => api.add(h, p)),
          close: () => api.destroy(h),
        };
      },
    };
    return factory;
  } finally { URL.revokeObjectURL(src); }
}

function use(tag) {
  const d = loaded.get(tag); if (!d) throw new Error('no-dict ' + tag);
  loaded.delete(tag); loaded.set(tag, d);              // (the last used, last in the map)
  return d;
}

const OPS = {
  async load({ tag, aff, dic, engine: url }) {
    if (loaded.has(tag)) return true;
    const [f, a, d] = await Promise.all([engine(url), bytes(aff), bytes(dic)]);
    if (loaded.has(tag)) return true;                   // (asked twice meanwhile)
    loaded.set(tag, f.open(a, d));
    while (loaded.size > MAX_LOADED) { const [old, x] = loaded.entries().next().value; x.close(); loaded.delete(old); }
    return true;
  },
  check({ tag, words }) { const d = use(tag); return words.filter(w => !d.spell(w)); },
  suggest({ tag, word }) { return use(tag).suggest(word); },
  add({ tag, word }) { use(tag).add(word); return true; },
};

self.onmessage = async ({ data }) => {
  const { id, op } = data;
  try { self.postMessage({ id, ok: true, value: await OPS[op](data) }); }
  catch (e) { self.postMessage({ id, ok: false, error: String(e?.message || e) }); }
};
