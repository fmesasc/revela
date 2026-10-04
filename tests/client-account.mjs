// The account client (src/io/cloud/account.js) against a simulated server: what the AI
// spends shows on the credits button at once, and the server's figure follows.
// Run by tests/run.sh when Node.js is available.
globalThis.document = { querySelector: s => (s.includes('revela-edition') ? { content: 'cloud' } : null) };
globalThis.location = { origin: 'https://revelaslides.com' };
let n = 0, fails = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log('FAIL', name); } };
let bal = 100, meCalls = 0;
globalThis.fetch = async url => {
  const p = String(url).split('/api/')[1];
  if (p === 'me') { meCalls++; return Response.json({ email: 'ana@example.com', credits: bal }); }
  if (p === 'ai/chat') { bal -= 3; return Response.json({ choices: [], charged: 3 }); }
  if (p === 'ai/image') return Response.json({ error: 'no credits', credits: bal }, { status: 402 });
  if (p === '3d/jobs/x') return Response.json({ status: 'running', charged: 10 });
  return Response.json({}, { status: 404 });
};
const A = await import('../src/io/cloud/account.js');
const seen = []; A.onAccount(m => seen.push(m?.credits));
await A.refreshAccount();
await A.cloudAi.chat({}); await A.cloudAi.chat({});
ok(A.account().credits === 94 && seen.join() === '100,97,94', 'créditos: cada llamada a la IA se descuenta al momento');
await A.api('3d/jobs/x'); await A.api('3d/jobs/x');
ok(A.account().credits === 94, 'créditos: el total de un trabajo 3D no se descuenta en cada consulta');
bal = 80; await new Promise(r => setTimeout(r, 1700));
ok(A.account().credits === 80 && meCalls === 2, 'créditos: después, una sola consulta al servidor con la cifra real');
await A.cloudAi.image({}).catch(() => {}); bal = 0; await new Promise(r => setTimeout(r, 1700));
ok(A.account().credits === 0, 'créditos: sin créditos (402), se vuelve a preguntar');
console.log(fails ? `CLIENT FAIL ${n - fails}/${n}` : `CLIENT OK ${n}/${n}`);
process.exit(fails ? 1 : 0);
