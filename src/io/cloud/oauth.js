// Sign-in for storage services without a server (OAuth 2.0 with PKCE, as
// Dropbox and Microsoft recommend for web apps): a window opens the service's
// own sign-in page, it comes back to auth.html on this site, which hands the
// one-time code to this page; the code and a secret made here for this sign-in
// (never stored) become an access token. Only the app's public identifier is
// used — there is no client secret anywhere. Tokens live in memory only.

const KEY = 'revela.auth';                                     // (what auth.html leaves, if it cannot message)
const b64url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const random = n => b64url(crypto.getRandomValues(new Uint8Array(n)));
export const redirectURI = () => new URL('auth.html', location.href.replace(/[?#].*$/, '')).href;
export async function challengeOf(verifier) {
  return b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
}

// Sign in: { authorize, token, clientId, scope, extra } → { access_token, expires_in }.
// Called from a click (the window has to open at once, or the browser blocks it).
export async function pkceLogin({ authorize, token, clientId, scope = '', extra = {} }) {
  const win = window.open('', 'revela-auth', 'width=520,height=680');
  if (!win) throw new Error('POPUP_BLOCKED');
  const verifier = random(48), state = random(16), redirect = redirectURI();
  try { localStorage.removeItem(KEY); } catch {}
  const params = new URLSearchParams({ client_id: clientId, response_type: 'code', redirect_uri: redirect, state,
    code_challenge: await challengeOf(verifier), code_challenge_method: 'S256', ...(scope && { scope }), ...extra });
  win.location.href = `${authorize}?${params}`;
  // The answer comes by message from auth.html, or through this site's storage
  // (if the service's page cut the link between the two windows).
  const code = await new Promise((resolve, reject) => {
    let closedAt = 0;
    const done = (fn, v) => { removeEventListener('message', onMsg); removeEventListener('storage', onStore); clearInterval(watch); fn(v); };
    const answer = query => {
      const q = new URLSearchParams(query || '');
      if (q.get('state') !== state) return;                      // (not this sign-in)
      try { localStorage.removeItem(KEY); } catch {}
      if (q.get('error')) done(reject, new Error(q.get('error_description') || q.get('error')));
      else done(resolve, q.get('code'));
    };
    const stored = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null')?.query; } catch { return null; } };
    const onMsg = e => { if (e.origin === location.origin && e.data?.type === 'revela-auth') answer(e.data.query); };
    const onStore = e => { if (e.key === KEY) answer(stored()); };
    addEventListener('message', onMsg); addEventListener('storage', onStore);
    const watch = setInterval(() => {
      const q = stored(); if (q) return answer(q);
      if (win.closed && !closedAt) closedAt = Date.now();
      if (closedAt && Date.now() - closedAt > 2000) done(reject, new Error('CANCELLED'));
    }, 500);
  });
  const r = await fetch(token, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, grant_type: 'authorization_code', code, redirect_uri: redirect, code_verifier: verifier, ...(scope && { scope }) }) });
  if (!r.ok) throw new Error('TOKEN');
  return r.json();
}
