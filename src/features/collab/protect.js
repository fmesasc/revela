// Protection (PowerPoint "Encrypt with password" / "Mark as final",
// OnlyOffice "Protect"):
// - A project file can be saved encrypted: AES-GCM 256 with a key derived from
//   the password (PBKDF2-SHA-256, 250 000 rounds, random salt), all WebCrypto
//   in the browser. Without the password the file can't be opened; there is no
//   way to recover a forgotten password.
// - "Mark as final" makes the deck read-only in the editor until someone
//   chooses to edit it anyway (advisory, like the office suites).

import { state, commit } from '../../core/store.js';

const ROUNDS = 250000;
const b64 = buf => { let s = ''; for (const x of new Uint8Array(buf)) s += String.fromCharCode(x); return btoa(s); };
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

async function keyFrom(password, salt) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ROUNDS, hash: 'SHA-256' }, base,
    { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
export async function encryptDeck(deck, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await keyFrom(password, salt), new TextEncoder().encode(JSON.stringify(deck)));
  return { revelaEncrypted: 1, kdf: 'PBKDF2-SHA256', rounds: ROUNDS, cipher: 'AES-GCM-256', salt: b64(salt), iv: b64(iv), data: b64(data) };
}
export const isEncrypted = obj => !!(obj && obj.revelaEncrypted === 1 && obj.data);
export async function decryptDeck(env, password) {
  try {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(env.iv) }, await keyFrom(password, unb64(env.salt)), unb64(env.data));
    return JSON.parse(new TextDecoder().decode(plain));
  } catch { throw new Error('BAD_PASSWORD'); }
}

export const isFinal = () => !!state.deck.final;
export function setFinal(on) { commit(() => { if (on) state.deck.final = true; else delete state.deck.final; }, { force: true }); }
