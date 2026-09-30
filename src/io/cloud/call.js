// A video call among the people of a presentation in Revela's cloud, through
// Cloudflare Realtime's SFU (server/cloudflare/calls.js holds its secret): one
// peer connection to the SFU sends this camera and microphone and receives the
// others'; who is in the call comes from the server every few seconds.
// Media and connection are injected so the tests can run without a camera.

import { api } from './account.js';

const ICE = [{ urls: 'stun:stun.cloudflare.com:3478' }];
const rid = () => 'p' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);

export async function startCall({ doc, name = '', onPeople = () => {}, onStream = () => {}, onError = () => {}, media = navigator.mediaDevices,
  RTC = window.RTCPeerConnection, request = api, pollMs = 3000 } = {}) {
  let stream;
  try { stream = await media.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: { width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 15 } } }); }
  catch { stream = await media.getUserMedia({ audio: true }); }            // (no camera: voice only)
  const pc = new RTC({ iceServers: ICE, bundlePolicy: 'max-bundle' });
  const owner = new Map(), streams = new Map(), pulled = new Set();        // mid → pid; pid → MediaStream; pids received
  pc.ontrack = e => {
    const pid = owner.get(e.transceiver?.mid); if (!pid) return;
    const s = streams.get(pid) || new MediaStream(); s.addTrack(e.track); streams.set(pid, s); onStream(pid, s);
  };
  const sent = stream.getTracks().map(t => pc.addTransceiver(t, { direction: 'sendonly' }));
  const { sessionId } = await request('call/session', { doc });
  const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
  const kinds = sent.map(tr => tr.sender.track.kind);
  const pub = await request('call/tracks', { doc, sessionId, sessionDescription: { type: 'offer', sdp: offer.sdp },
    tracks: sent.map(tr => ({ location: 'local', mid: tr.mid, trackName: tr.sender.track.kind })) });
  await pc.setRemoteDescription(pub.sessionDescription);

  const pid = rid(); let people = [], stopped = false, busy = Promise.resolve();
  // Receive someone's tracks (one negotiation at a time).
  const pull = p => (busy = busy.then(async () => {
    if (stopped || pulled.has(p.pid) || !p.sessionId || !p.tracks?.length) return;
    pulled.add(p.pid);
    const r = await request('call/tracks', { doc, sessionId, tracks: p.tracks.map(n => ({ location: 'remote', sessionId: p.sessionId, trackName: n })) });
    for (const t of r.tracks || []) if (t.mid) owner.set(t.mid, p.pid);
    if (r.requiresImmediateRenegotiation && r.sessionDescription) {
      await pc.setRemoteDescription(r.sessionDescription);
      const answer = await pc.createAnswer(); await pc.setLocalDescription(answer);
      await request('call/renegotiate', { doc, sessionId, sessionDescription: { type: 'answer', sdp: answer.sdp } });
    }
  }).catch(e => { pulled.delete(p.pid); onError(e); }));
  const tick = async () => {
    if (stopped) return;
    try {
      people = (await request('call/room', { doc, pid, name, sessionId, tracks: kinds })).people.filter(p => p.pid !== pid);
      for (const p of people) pull(p);
      for (const gone of [...streams.keys()].filter(k => !people.some(p => p.pid === k))) { streams.delete(gone); pulled.delete(gone); }
      onPeople(people);
    } catch (e) { onError(e); }
  };
  await tick();
  const timer = setInterval(tick, pollMs);
  return {
    pid, stream, people: () => people, streams,
    setMic: on => stream.getAudioTracks().forEach(t => { t.enabled = on; }),
    setCam: on => stream.getVideoTracks().forEach(t => { t.enabled = on; }),
    async stop() {
      stopped = true; clearInterval(timer);
      stream.getTracks().forEach(t => t.stop()); try { pc.close(); } catch {}
      await request('call/room', { doc, pid, leave: true }).catch(() => {});
    },
  };
}
