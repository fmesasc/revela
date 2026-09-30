// Video calls in the editor (Pro), on Cloudflare Realtime's SFU: the people
// working on a presentation in Revela's cloud can see and hear each other.
// This server holds the Realtime app's secret and only lets each account use
// its own media sessions; who is in each call is kept per presentation.
//
//   POST /api/call/room     { doc, pid, name?, sessionId?, tracks?, leave? } → { people }   (every few seconds)
//   POST /api/call/session  { doc }                                   → { sessionId }
//   POST /api/call/tracks   { doc, sessionId, tracks, sessionDescription? } → Realtime's answer
//   POST /api/call/renegotiate { doc, sessionId, sessionDescription } → Realtime's answer
//
// Secrets: CALLS_APP_ID and CALLS_APP_SECRET (Cloudflare dashboard ▸ Realtime ▸ SFU).

const RT = 'https://rtc.live.cloudflare.com/v1/apps/';
const STALE = 20e3, MAX_PEOPLE = 12;

// Who is in the call of one presentation.
export class CallRoom {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; }
  async fetch(req) {
    const op = new URL(req.url).pathname.split('/').pop(), a = await req.json(), st = this.ctx.storage;
    const now = Date.now(), people = Object.fromEntries(Object.entries((await st.get('people')) || {}).filter(([, p]) => now - p.seen < STALE));
    if (op === 'join') {
      if (!people[a.pid] && Object.keys(people).length >= MAX_PEOPLE) return Response.json({ error: 'full' }, { status: 409 });
      people[a.pid] = { name: String(a.name || '').slice(0, 40), sub: a.sub, sessionId: a.sessionId || people[a.pid]?.sessionId || null,
        tracks: Array.isArray(a.tracks) ? a.tracks.slice(0, 4).map(t => String(t).slice(0, 64)) : people[a.pid]?.tracks || [], seen: now };
    } else if (op === 'leave') delete people[a.pid];
    else if (op !== 'list') return Response.json({ error: 'unknown' }, { status: 404 });
    await st.put('people', people);
    return Response.json({ people: Object.entries(people).map(([pid, p]) => ({ pid, name: p.name, sessionId: p.sessionId, tracks: p.tracks })) });
  }
}

export async function handleCalls(path, body, env, me, A, call, json) {
  if (!env.CALLS_APP_ID || !env.CALLS_APP_SECRET || !env.CALLS) return json({ error: 'not configured' }, 503);
  if (!(me.features || []).includes('video-calls')) return json({ error: 'pro only' }, 402);
  const doc = String(body.doc || ''); if (!/^[\w-]{16,40}$/.test(doc)) return json({ error: 'bad request' }, 400);
  // Only people who may open the presentation are in its call.
  const role = await (await env.DOCS.get(env.DOCS.idFromName('doc:' + doc)).fetch('https://doc/role', { method: 'POST', body: JSON.stringify({ who: { sub: me.sub, email: me.email } }) })).json();
  if (!role.role) return json({ error: 'forbidden' }, 403);
  const room = env.CALLS.get(env.CALLS.idFromName('call:' + doc));
  const roomDo = async (op, b) => (await room.fetch('https://call/' + op, { method: 'POST', body: JSON.stringify(b) })).json();
  const rt = (method, p, b) => (env.FETCH || fetch)(RT + env.CALLS_APP_ID + p, { method, headers: { Authorization: 'Bearer ' + env.CALLS_APP_SECRET, 'Content-Type': 'application/json' }, ...(b && { body: JSON.stringify(b) }) });
  const mine = async id => (await call(A, 'call-sessions')).ids.includes(id);
  const sdp = d => d && ['offer', 'answer'].includes(d.type) && typeof d.sdp === 'string' && d.sdp.length < 2e5 ? { type: d.type, sdp: d.sdp } : undefined;
  const pass = async r => { const d = await r.json().catch(() => ({})); return json(d, r.ok ? 200 : 502); };

  if (path === '/call/room') {
    const pid = String(body.pid || '').slice(0, 40); if (!/^[\w-]{6,40}$/.test(pid)) return json({ error: 'bad request' }, 400);
    if (body.leave) return json(await roomDo('leave', { pid }));
    if (body.sessionId && !(await mine(body.sessionId))) return json({ error: 'forbidden' }, 403);
    const r = await room.fetch('https://call/join', { method: 'POST', body: JSON.stringify({ pid, sub: me.sub, name: body.name, sessionId: body.sessionId, tracks: body.tracks }) });
    return json(await r.json(), r.status);
  }
  if (path === '/call/session') {
    const r = await rt('POST', '/sessions/new'); const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.sessionId) return json({ error: 'realtime failed' }, 502);
    await call(A, 'call-session-add', { id: d.sessionId });
    return json({ sessionId: d.sessionId });
  }
  if (!(await mine(body.sessionId))) return json({ error: 'forbidden' }, 403);
  if (path === '/call/tracks') {
    const tracks = Array.isArray(body.tracks) ? body.tracks.slice(0, 40) : [];
    const people = (await roomDo('list', {})).people;
    const inCall = new Set(people.map(p => p.sessionId).filter(Boolean));
    const ok = tracks.every(t => t && typeof t.trackName === 'string' && t.trackName.length <= 64 && (t.location === 'local' || (t.location === 'remote' && inCall.has(t.sessionId))));
    if (!tracks.length || !ok) return json({ error: 'bad request' }, 400);
    return pass(await rt('POST', `/sessions/${encodeURIComponent(body.sessionId)}/tracks/new`, { tracks: tracks.map(t => ({ location: t.location, trackName: t.trackName, ...(t.mid && { mid: String(t.mid) }), ...(t.location === 'remote' && { sessionId: t.sessionId }) })),
      ...(sdp(body.sessionDescription) && { sessionDescription: sdp(body.sessionDescription) }) }));
  }
  if (path === '/call/renegotiate') {
    if (!sdp(body.sessionDescription)) return json({ error: 'bad request' }, 400);
    return pass(await rt('PUT', `/sessions/${encodeURIComponent(body.sessionId)}/renegotiate`, { sessionDescription: sdp(body.sessionDescription) }));
  }
  return json({ error: 'not found' }, 404);
}
