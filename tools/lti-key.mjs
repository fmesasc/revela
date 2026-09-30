// Makes the RSA key Revela signs its LTI messages with, as a JWK on one line,
// for the server's secrets (it never goes in the repository):
//   node tools/lti-key.mjs | npx wrangler secret put LTI_PRIVATE_JWK
const { privateKey } = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = await crypto.subtle.exportKey('jwk', privateKey);
process.stdout.write(JSON.stringify({ ...jwk, kid: 'revela-' + new Date().toISOString().slice(0, 10), alg: 'RS256' }));
