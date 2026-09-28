// Opens a sealed presentation (see io/share/seal.js) with its secret: the
// password, or the random key carried in the link after "#". A plain function
// with no imports, because it is also embedded, as source, in the
// password-protected HTML file.
export async function unseal(env, secret) {
  const bytesOf = s => Uint8Array.from(atob(String(s).replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  let key;
  if (env.mode === 'password') {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), 'PBKDF2', false, ['deriveKey']);
    key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: bytesOf(env.salt), iterations: env.rounds, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  } else {
    key = await crypto.subtle.importKey('raw', bytesOf(secret), 'AES-GCM', false, ['decrypt']);
  }
  let data = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytesOf(env.iv) }, key, bytesOf(env.data));
  if (env.z) data = await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  return new TextDecoder().decode(data);
}
