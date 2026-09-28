// Digital signatures (OnlyOffice / Office "Add a digital signature"): the
// signer's browser signs the content of the presentation (ECDSA P-256 with
// SHA-256, WebCrypto) and the signature travels in the project file. Anyone
// can check that the presentation hasn't changed since it was signed and by
// which key. The private key never leaves this browser (IndexedDB, not
// extractable); the key is identified by its fingerprint, which the signer can
// give to others to confirm it is theirs (there is no certificate authority).
// Signing marks the presentation as final, as the office suites do.

import { state, commit } from '../../core/store.js';
import { kvGet, kvSet } from '../../core/idb.js';
import { uid } from '../../core/model.js';

const ALG = { name: 'ECDSA', namedCurve: 'P-256' }, SIGN = { name: 'ECDSA', hash: 'SHA-256' };
const enc = s => new TextEncoder().encode(s);
const b64 = buf => { let s = ''; for (const x of new Uint8Array(buf)) s += String.fromCharCode(x); return btoa(s); };
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const hex = buf => [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, '0')).join('');

// What is signed: the whole presentation except its signatures, the save time
// and the "final" mark, with keys in a fixed order.
const SKIP = new Set(['signatures', 'savedAt', 'final']);
export function canonical(v, top = true) {
  if (Array.isArray(v)) return '[' + v.map(x => canonical(x, false)).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).filter(k => v[k] !== undefined && !(top && SKIP.has(k))).sort()
    .map(k => JSON.stringify(k) + ':' + canonical(v[k], false)).join(',') + '}';
  return JSON.stringify(v ?? null);
}
export const digest = async deck => hex(await crypto.subtle.digest('SHA-256', enc(canonical(deck))));
// Short fingerprint of a public key: first 16 bytes of the SHA-256 of its JWK.
export async function fingerprint(jwk) {
  const h = hex(await crypto.subtle.digest('SHA-256', enc(`${jwk.crv}|${jwk.x}|${jwk.y}`)));
  return h.slice(0, 32).toUpperCase().match(/.{4}/g).join(' ');
}

// This browser's signing key (created the first time).
export async function myKey() {
  let k = await kvGet('signkey').catch(() => null);
  if (!k) {
    const pair = await crypto.subtle.generateKey(ALG, false, ['sign', 'verify']);
    const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
    k = { privateKey: pair.privateKey, jwk: { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y } };
    await kvSet('signkey', k);
  }
  return { ...k, fp: await fingerprint(k.jwk) };
}

const payload = (hash, s) => enc(['revela-signature-1', hash, s.name, s.reason || '', s.at].join('\n'));

export async function signDeck({ name, reason = '' }, deck = state.deck) {
  name = String(name || '').trim(); if (!name) throw new Error('NAME');
  const k = await myKey(), hash = await digest(deck), at = Date.now();
  const s = { id: uid(), name, reason: String(reason).trim(), at, alg: 'ES256', key: k.jwk, fp: k.fp, hash };
  s.sig = b64(await crypto.subtle.sign(SIGN, k.privateKey, payload(hash, s)));
  commit(() => { (deck.signatures ||= []).push(s); deck.final = true; }, { force: true });
  return s;
}

// 'valid' | 'modified' (the presentation changed after signing) | 'invalid'.
export async function verifySignature(s, deck = state.deck) {
  try {
    if (s.fp !== await fingerprint(s.key)) return 'invalid';
    const key = await crypto.subtle.importKey('jwk', { ...s.key, ext: true }, ALG, false, ['verify']);
    if (!(await crypto.subtle.verify(SIGN, key, unb64(s.sig), payload(s.hash, s)))) return 'invalid';
    return (await digest(deck)) === s.hash ? 'valid' : 'modified';
  } catch { return 'invalid'; }
}
export const verifyAll = (deck = state.deck) => Promise.all((deck.signatures || []).map(async s => ({ ...s, status: await verifySignature(s, deck) })));
export function removeSignatures() { commit(() => { delete state.deck.signatures; }, { force: true }); }
