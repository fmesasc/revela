// Real-time co-editing: what changed in the document, as small operations
// that can be sent to the others and applied there.
//
// Lists of things with an id (slides, objects, comments, sections…) are
// addressed by id, not by position, so two people can add, delete or move
// different objects at the same time. An operation is
//   { p: path, v: value }   set (or add an item with that id)
//   { p: path, d: 1 }       delete
//   { p: [...list, '#'], v: [ids] }   new order of a list
// where a path goes through object keys and, in lists with ids, item ids.

const isObj = x => x && typeof x === 'object' && !Array.isArray(x);
const isIdList = x => Array.isArray(x) && x.every(e => isObj(e) && typeof e.id === 'string');
const same = (a, b) => a === b || JSON.stringify(a) === JSON.stringify(b);
// Local-only keys: never sent.
const LOCAL = new Set(['savedAt']);

export function diff(a, b, p = [], out = []) {
  if (a === b) return out;
  if (isObj(a) && isObj(b)) {
    for (const k of Object.keys(a)) if (!LOCAL.has(k) && !(k in b) && a[k] !== undefined) out.push({ p: [...p, k], d: 1 });
    for (const k of Object.keys(b)) {
      if (LOCAL.has(k) || b[k] === undefined) continue;
      if (!(k in a) || a[k] === undefined) out.push({ p: [...p, k], v: b[k] });
      else diff(a[k], b[k], [...p, k], out);
    }
    return out;
  }
  if (isIdList(a) && isIdList(b) && (a.length || b.length)) {
    const ia = new Map(a.map(e => [e.id, e])), ib = new Set(b.map(e => e.id));
    for (const e of a) if (!ib.has(e.id)) out.push({ p: [...p, e.id], d: 1 });
    for (const e of b) ia.has(e.id) ? diff(ia.get(e.id), e, [...p, e.id], out) : out.push({ p: [...p, e.id], v: e });
    const order = b.map(e => e.id);
    if (!same(a.map(e => e.id).filter(id => ib.has(id)), order)) out.push({ p: [...p, '#'], v: order });
    return out;
  }
  if (!same(a, b)) out.push({ p, v: b });
  return out;
}

const clone = v => (v && typeof v === 'object' ? structuredClone(v) : v);
// Apply one operation; false if its place no longer exists (deleted meanwhile).
export function applyOp(root, op) {
  let cur = root;
  for (let i = 0; i < op.p.length - 1; i++) {
    const seg = op.p[i];
    cur = Array.isArray(cur) ? cur.find(e => e && e.id === seg) : cur?.[seg];
    if (cur == null || typeof cur !== 'object') return false;
  }
  const last = op.p[op.p.length - 1];
  if (Array.isArray(cur)) {
    if (last === '#') {                                     // reorder: known ids in that order, the rest after
      const byId = new Map(cur.map(e => [e.id, e])), seen = new Set();
      const next = op.v.map(id => byId.get(id)).filter(e => e && !seen.has(e.id) && seen.add(e.id));
      cur.splice(0, cur.length, ...next, ...cur.filter(e => !seen.has(e.id)));
      return true;
    }
    const i = cur.findIndex(e => e && e.id === last);
    if (op.d) { if (i >= 0) cur.splice(i, 1); return true; }
    if (i >= 0) cur[i] = clone(op.v); else cur.push(clone(op.v));
    return true;
  }
  if (op.d) delete cur[last]; else cur[last] = clone(op.v);
  return true;
}
export const applyOps = (root, ops) => ops.reduce((n, op) => n + (applyOp(root, op) ? 1 : 0), 0);

// What each role may change: viewers nothing, commenters only comments.
export const ROLES = ['view', 'comment', 'edit'];
export function allowed(op, role) {
  if (role === 'edit') return true;
  if (role === 'comment') return op.p[0] === 'slides' && op.p[2] === 'comments' && op.p.length >= 3;
  return false;
}

// Messages over a WebSocket (collaboration server): Cloudflare accepts up to
// 1 MiB each, and a presentation with images is bigger, so long messages go
// in parts { t: 'part', id, i, n, s } that the other side puts together.
export const PART = 300 * 1024;                  // characters: under 1 MiB even if all were 3-byte UTF-8
export function pack(msg, max = PART) {
  const s = JSON.stringify(msg);
  if (s.length <= max) return [s];
  const id = Math.random().toString(36).slice(2), n = Math.ceil(s.length / max);
  return Array.from({ length: n }, (_, i) => JSON.stringify({ t: 'part', id, i, n, s: s.slice(i * max, (i + 1) * max) }));
}
export function unpacker() {
  const pending = new Map();
  return text => {
    let m; try { m = JSON.parse(text); } catch { return null; }
    if (!m || m.t !== 'part') return m;
    const p = pending.get(m.id) || { parts: [], got: 0 };
    if (p.parts[m.i] === undefined) { p.parts[m.i] = m.s; p.got++; }
    pending.set(m.id, p);
    if (p.got < m.n) return null;
    pending.delete(m.id);
    try { return JSON.parse(p.parts.join('')); } catch { return null; }
  };
}
