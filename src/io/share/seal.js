// Sharing a presentation privately. It is sealed in this browser before it
// leaves it: compressed, then encrypted with AES-GCM-256. The key is either
// random (it travels in the link after "#", which browsers never send to any
// server) or derived from a password (PBKDF2-SHA-256, 600 000 rounds). Wherever
// the sealed copy is stored (a file you upload, your Google Drive, a server),
// whoever holds it without the key only has noise. Pages are marked noindex.

import { unseal } from '../runtime/unseal.js';

export const ROUNDS = 600000;
const b64url = bytes => { let s = ''; for (const x of new Uint8Array(bytes)) s += String.fromCharCode(x); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const gzip = async text => (typeof CompressionStream === 'function'
  ? new Response(new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer() : null);

// → { env, key }: env is safe to store anywhere; key (key mode) goes in the link.
export async function seal(html, { password = null } = {}) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const packed = await gzip(html);
  const plain = packed || new TextEncoder().encode(html);
  let key, secret = null, extra = {};
  if (password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
    key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ROUNDS, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
    extra = { salt: b64url(salt), rounds: ROUNDS };
  } else {
    const raw = crypto.getRandomValues(new Uint8Array(32));
    key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt']);
    secret = b64url(raw);
  }
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain);
  return { env: { revelaSealed: 1, mode: password ? 'password' : 'key', ...extra, iv: b64url(iv), z: packed ? 1 : 0, data: b64url(data) }, key: secret };
}
export { unseal };

// A random identifier nobody can guess (128 bits), for stored copies.
export const shareId = () => b64url(crypto.getRandomValues(new Uint8Array(16)));

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// A page that opens a sealed presentation: from `env` (embedded) or fetched
// from `src`; the secret is the link's #k=… or a password typed by the viewer.
// Works on its own (a file you upload anywhere) and inside an iframe.
export function openerPageHTML({ env = null, src = null, title = 'Presentación', lang = 'es', texts = {} } = {}) {
  const T = { locked: 'Presentación protegida', ask: 'Escribe la contraseña para verla.', open: 'Abrir', wrong: 'Contraseña incorrecta.',
    nokey: 'Falta la clave del enlace: cópialo entero, con lo que va detrás de «#».', loading: 'Abriendo…', failed: 'No se pudo abrir la presentación.',
    signin: 'Esta presentación es solo para cuentas de {d}. Inicia sesión con Google para verla.', ...texts };
  return `<!doctype html>
<html lang="${esc(lang)}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive">
<meta name="referrer" content="strict-origin">
<title>${esc(title)}</title>
<style>
 html,body{height:100%;margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#15181d;color:#e3e6eb}
 main{height:100%;display:grid;place-items:center;align-content:center;gap:12px;padding:16px;box-sizing:border-box;text-align:center}
 form{background:#1f2329;border:1px solid #2b3038;border-radius:12px;padding:24px;width:min(360px,100%);box-sizing:border-box;box-shadow:0 10px 34px #0006}
 h1{font-size:18px;margin:0 0 6px} p{margin:0 0 14px;color:#9aa3ae;font-size:14px}
 input{width:100%;box-sizing:border-box;padding:10px 12px;border-radius:8px;border:1px solid #3a414c;background:#15181d;color:inherit;font-size:16px}
 button{margin-top:12px;width:100%;padding:10px;border:0;border-radius:8px;background:#86a9e8;color:#10131a;font-weight:700;font-size:15px;cursor:pointer}
 .err{color:#f07167;min-height:1.2em;margin:10px 0 0;font-size:14px}
</style></head><body><main>
<form id="f" hidden><h1>🔒 ${esc(T.locked)}</h1><p>${esc(T.ask)}</p>
<input id="pw" type="password" autocomplete="current-password" autofocus><button>${esc(T.open)}</button><p class="err" id="e"></p></form>
<p id="m">${esc(T.loading)}</p></main>
<script>
${unseal.toString()}
(function(){
 var T=${JSON.stringify({ wrong: T.wrong, nokey: T.nokey, failed: T.failed, signin: T.signin, loading: T.loading })};
 var SRC=${JSON.stringify(src)}, ENV=${JSON.stringify(env)};
 var k=(location.hash.match(/[#&]k=([\\w-]+)/)||[])[1];
 function show(html){document.open();document.write(html);document.close();}
 function msg(t){document.getElementById('m').textContent=t;}
 function ready(env){
  if(env.mode==='key'){ if(!k) return msg(T.nokey);
   return unseal(env,k).then(show,function(){msg(T.failed);}); }
  msg(''); var f=document.getElementById('f'); f.hidden=false;
  f.onsubmit=function(ev){ev.preventDefault();var b=f.querySelector('button');b.disabled=true;
   unseal(env,document.getElementById('pw').value).then(show,function(){b.disabled=false;document.getElementById('e').textContent=T.wrong;});};
 }
 // A share limited to a domain answers 401 {signIn, domain, clientId}: sign in
 // with Google (only accounts of that domain) and ask again with the ID token.
 function load(tok){return fetch(SRC,tok?{headers:{Authorization:'Bearer '+tok}}:undefined).then(function(r){
  if(r.status===401)return r.json().then(function(j){if(j&&j.signIn&&!tok)signIn(j);else throw 0;});
  if(!r.ok)throw 0;return r.json().then(ready);});}
 function signIn(j){msg(T.signin.replace('{d}',j.domain));var s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';
  s.onload=function(){google.accounts.id.initialize({client_id:j.clientId,hd:j.domain,callback:function(r){msg(T.loading||'');load(r.credential).catch(function(){msg(T.failed);});}});
   var b=document.createElement('div');b.id='g';document.querySelector('main').appendChild(b);google.accounts.id.renderButton(b,{theme:'filled_blue',size:'large'});};
  document.head.appendChild(s);}
 if(ENV) ready(ENV);
 else load().catch(function(){msg(T.failed);});
})();
</script></body></html>`;
}
