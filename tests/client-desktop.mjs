// The desktop edition's payments (src/io/cloud/account.js): Stripe's page opens in the system browser through the app's
// own opener. When that refuses (Tauri's «Not allowed to open url …»: the app's permission list) the failure must reach
// the dialog as a readable OPEN_FAILED, never as an unhandled promise rejection. Run by tests/run.sh with Node.js.
globalThis.document = { querySelector: s => (s.includes('revela-edition') ? { content: 'desktop' } : null) };
globalThis.location = { origin: 'tauri://localhost' };
let n = 0, fails = 0, loose = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log('FAIL', name); } };
process.on('unhandledRejection', () => { loose++; });
const opened = []; let refuse = false;
globalThis.window = { __TAURI__: { opener: { openUrl: async u => { opened.push(u); if (refuse) throw new Error('Not allowed to open url ' + u); } } } };
const PAY = 'https://revelaslides.com/api/go?t=abc.def';
globalThis.fetch = async () => Response.json({ url: PAY });
const A = await import('../src/io/cloud/account.js');
await A.buy('pro-month');
await A.manageBilling();
ok(opened.length === 2 && opened[0] === PAY, 'escritorio: el pago se abre en el navegador del sistema');
refuse = true;
for (const fn of [() => A.buy('pro-month'), () => A.buy('team-seat', { seats: 3 }), () => A.manageBilling()]) {
  let err = null; await fn().catch(e => { err = e; });
  ok(err?.message === 'OPEN_FAILED' && /Not allowed to open url/.test(err.cause?.message), 'si el navegador no se abre: OPEN_FAILED, que los cuadros explican');
}
// The app's errors carry the session, so that the administration knows whose they are (errors.js): the desktop app's bearer;
// without being signed in, nothing.
ok(Object.keys(A.sessionInit().headers).length === 0 && A.sessionInit().credentials === 'omit', 'escritorio, sin sesión: los errores no llevan nada');
const store = {}; globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; }, removeItem: k => { delete store[k]; } };
store['revela.session'] = 'tok.sec';
const si = A.sessionInit(); ok(si.headers.Authorization === 'Bearer tok.sec' && si.credentials === 'omit', 'escritorio, con sesión: los errores llevan el bearer, sin cookies: ' + JSON.stringify(si));
await new Promise(r => setTimeout(r, 50));
ok(loose === 0, 'y ningún error queda sin atender (promesa suelta)');
console.log(fails ? `DESKTOP FAIL ${n - fails}/${n}` : `DESKTOP OK ${n}/${n}`);
process.exit(fails ? 1 : 0);
