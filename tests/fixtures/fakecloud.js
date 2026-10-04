// A stand-in for Revela's cloud API (server/cloudflare/docs.js, which has its own
// tests in tests/server-api.mjs), in memory: enough for the «Mi nube» page and the
// cloud document in the browser tests and for its screenshots. Install it with
// clouddocs.setTransport(fakeCloud(...).io).

const ID = () => Math.random().toString(36).slice(2, 12).padEnd(10, 'x') + Math.random().toString(36).slice(2, 12).padEnd(10, 'y');
const clone = o => JSON.parse(JSON.stringify(o));
const fail = (status, error, extra) => { throw Object.assign(new Error(error), { status, data: { error, ...extra } }); };

// seed: { docs: [{ id?, name, folder?, starred?, trashed?, updated?, created?, slides?, text?, thumb?, deck? }], shared: [...], folders: [...], limit }
export function fakeCloud(seed = {}) {
  const db = { docs: [], shared: [], folders: clone(seed.folders || []), thumbs: {}, decks: {}, limit: seed.limit ?? 500, calls: [] };
  const deckOf = (name, n = 1) => ({ name, size: { w: 1280, h: 720 }, slides: Array.from({ length: n }, (_, i) => ({ id: 's' + i, background: '#ffffff', blocks: [], comments: [] })) });
  for (const d of seed.docs || []) {
    const id = d.id || ID(), now = Date.now();
    db.docs.push({ id, name: d.name, folder: d.folder || null, starred: !!d.starred, trashed: d.trashed || null, updated: d.updated || now, created: d.created || d.updated || now, slides: d.slides || 1, text: d.text || '', thumbAt: d.thumb ? now : null });
    db.decks[id] = d.deck || deckOf(d.name, d.slides || 1); if (d.thumb) db.thumbs[id] = d.thumb;
  }
  for (const d of seed.shared || []) { const id = d.id || ID(); db.shared.push({ id, name: d.name, owner: d.owner, role: d.role || 'view', at: d.at || Date.now(), starred: !!d.starred }); db.decks[id] = d.deck || deckOf(d.name); if (d.thumb) db.thumbs[id] = d.thumb; }
  const mine = id => db.docs.find(d => d.id === id), any = id => mine(id) || db.shared.find(d => d.id === id) || fail(404, 'not found');
  const folder = id => db.folders.find(f => f.id === id);
  const depth = id => { let n = 0; for (let f = folder(id); f; f = folder(f.parent)) n++; return n; };
  async function io(path, body) {
    db.calls.push({ path, body });
    let m;
    if (path === 'docs' && !body) return clone({ mine: db.docs, shared: db.shared, folders: db.folders, limit: db.limit, trashDays: 30 });
    if (path === 'docs') {
      if (db.docs.length >= db.limit) fail(402, 'doc limit', { limit: db.limit });
      const id = ID(), now = Date.now();
      db.docs.unshift({ id, name: body.deck.name, folder: folder(body.folder) ? body.folder : null, starred: false, trashed: null, updated: now, created: now, slides: body.deck.slides.length, text: '', thumbAt: null });
      db.decks[id] = clone(body.deck); return { id, rev: 1 };
    }
    if (path === 'docs/folders') {
      const name = String(body.name || '').trim(); if (!name || name.length > 80) fail(400, 'bad name');
      if (body.parent && depth(body.parent) >= 3) fail(400, 'too deep', { depth: 3 });
      const f = { id: 'f' + ID().slice(0, 7), name, parent: body.parent || null, created: Date.now() }; db.folders.push(f); return clone({ ok: true, folder: f, folders: db.folders });
    }
    if ((m = path.match(/^docs\/folders\/([\w-]+)(\/delete)?$/))) {
      const f = folder(m[1]) || fail(404, 'not found');
      if (m[2]) { db.folders.forEach(x => { if (x.parent === f.id) x.parent = f.parent; }); db.docs.forEach(d => { if (d.folder === f.id) d.folder = f.parent; }); db.folders = db.folders.filter(x => x !== f); }
      else { if (body.name !== undefined) f.name = String(body.name).trim(); if (body.parent !== undefined) f.parent = body.parent || null; }
      return clone({ ok: true, folders: db.folders });
    }
    if (path === 'docs/thumbs') return { thumbs: Object.fromEntries(body.ids.filter(id => db.thumbs[id]).map(id => [id, db.thumbs[id]])) };
    if (path === 'docs/trash/empty') { const n = db.docs.filter(d => d.trashed).length; db.docs = db.docs.filter(d => !d.trashed); return { n, more: false }; }
    if (!(m = path.match(/^docs\/([\w-]+)(?:\/(\w+))?(?:\?.*)?$/))) fail(404, 'not found');
    const [, id, op = 'get'] = m, d = any(id);
    switch (op) {
      case 'get': return { deck: clone(db.decks[id]), rev: 1, role: mine(id) ? 'owner' : d.role, name: d.name, thumbAt: d.thumbAt || null, ...(mine(id) ? { sharing: { link: 'none', people: {} } } : { owner: d.owner }) };
      case 'since': return { rev: 1, ops: [] };
      case 'ops': case 'view': case 'share': return { rev: 1, ok: true, sharing: { link: 'none', people: {} } };
      case 'thumb': db.thumbs[id] = body.thumb; d.thumbAt = Date.now(); return { at: d.thumbAt };
      case 'meta':
        if (body.name !== undefined) { d.name = body.name; db.decks[id].name = body.name; }
        if (body.folder !== undefined) { if (!mine(id)) fail(403, 'forbidden'); d.folder = body.folder; }
        if (body.starred !== undefined) d.starred = !!body.starred;
        d.updated = body.name !== undefined ? Date.now() : d.updated; return { ok: true };
      case 'trash': mine(id) || fail(403, 'forbidden'); d.trashed = Date.now(); return { ok: true };
      case 'restore': d.trashed = null; return { ok: true };
      case 'delete': db.docs = db.docs.filter(x => x.id !== id); return { ok: true };
      case 'duplicate': {
        const nid = ID(), now = Date.now();
        db.docs.unshift({ ...clone(mine(id) || { slides: 1, text: '' }), id: nid, name: body.name || d.name, folder: mine(id)?.folder || null, starred: false, trashed: null, updated: now, created: now, thumbAt: db.thumbs[id] ? now : null });
        db.decks[nid] = { ...clone(db.decks[id]), name: body.name || d.name }; if (db.thumbs[id]) db.thumbs[nid] = db.thumbs[id];
        return { id: nid };
      }
    }
    fail(404, 'not found');
  }
  return { io, db };
}
