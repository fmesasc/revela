// Which servers a live connection (phone remote, voting, live collaboration) may use to find its
// way: STUN, and the relays (TURN) of Revela's server when there is one — a phone on mobile data is
// often behind its carrier's NAT and can't reach the computer directly. Asked once per few hours.
import { EDITION, OFFICIAL_SITE } from './config.js';

export const STUN = [{ urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] }];
const FRESH = 6 * 3600e3;
let got = null;
const base = () => (EDITION === 'desktop' ? OFFICIAL_SITE : /^https?:$/.test(globalThis.location?.protocol || '') ? location.origin : null);
export function iceServers() {
  if (got && Date.now() - got.at < FRESH) return got.p;
  const p = (async () => {
    const b = base(); if (!b || !globalThis.fetch) return STUN;
    const ctl = new AbortController(), stop = setTimeout(() => ctl.abort(), 3500);
    try {
      const r = await fetch(b + '/api/ice', { credentials: 'omit', signal: ctl.signal });
      const j = r.ok ? await r.json() : null;
      return Array.isArray(j?.iceServers) && j.iceServers.length ? j.iceServers : STUN;
    } catch { return STUN; } finally { clearTimeout(stop); }
  })();
  got = { at: Date.now(), p };
  return p;
}
// PeerJS's options with them.
export const peerOptions = async () => ({ config: { iceServers: await iceServers() } });
