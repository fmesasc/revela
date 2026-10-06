// Google sign-in checks shared by the share server and the accounts API.

import { fromB64url } from './util.js';

// Google ID token (JWT, RS256) → its claims, if the signature, issuer,
// audience and expiry are right. Google's public keys are cached for an hour.
let certs = null, certsAt = 0;
export async function verifyGoogleToken(jwt, clientId, fetchImpl = fetch) {
  const [h, p, sig] = String(jwt || '').split('.'); if (!sig) return null;
  const head = JSON.parse(new TextDecoder().decode(fromB64url(h))), claims = JSON.parse(new TextDecoder().decode(fromB64url(p)));
  if (!certs || Date.now() - certsAt > 3600e3) { certs = (await (await fetchImpl('https://www.googleapis.com/oauth2/v3/certs')).json()).keys; certsAt = Date.now(); }
  const jwk = certs.find(k => k.kid === head.kid); if (!jwk || head.alg !== 'RS256') return null;
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, fromB64url(sig), new TextEncoder().encode(h + '.' + p));
  if (!ok || claims.aud !== clientId || !['accounts.google.com', 'https://accounts.google.com'].includes(claims.iss) || claims.exp * 1000 < Date.now()) return null;
  return claims;
}
export const resetCerts = () => { certs = null; };
