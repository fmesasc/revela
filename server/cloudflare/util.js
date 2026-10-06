// Small helpers the server's modules share: one copy each, so they behave the same everywhere.
export const enc = new TextEncoder(), dec = new TextDecoder();
export const DAY = 864e5, HOUR = 36e5;
// Base64url without padding, of bytes (a Uint8Array or an ArrayBuffer), and back.
export const b64url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const fromB64url = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
export const unb64 = s => dec.decode(fromB64url(s));          // (to text)
// n random bytes, as base64url (ids, secrets, tokens).
export const random = n => b64url(crypto.getRandomValues(new Uint8Array(n)));
export const sha256 = async s => b64url(await crypto.subtle.digest('SHA-256', enc.encode(s)));
export const hmac = async (secret, s) => b64url(await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), enc.encode(s)));
// An email address as the server accepts it (lowercased before testing).
export const EMAIL = /^[^\s@<>"]{1,64}@[a-z0-9.-]{1,190}\.[a-z]{2,}$/;
export const escHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
