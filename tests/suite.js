// Headless regression suite for Revela.
//
// It runs the REAL app inside an iframe (index.html?test, which exposes the
// module graph on window.__revela) and drives it exactly as the UI would, then
// asserts on the resulting model, rendered DOM and exported HTML. Every fix the
// user reports gets a test so it can't silently regress later.
//
// The tests live in tests/suites/, one file per area; each exports a function
// that receives the helpers below. Every test starts from reset() and must not
// rely on the ones before it.
//
// Run with: tests/run.sh  (headless Chrome). Result ends up in document.title
// as "REVELATEST PASS n/n" or "REVELATEST FAIL ...".

const AREAS = ['text', 'objects', 'slides', 'animation', 'present', 'io', 'editor', 'services'];

export async function run(frame, only = null, grep = '') {
  const R = frame.contentWindow.__revela;
  const D = frame.contentDocument;
  const results = [];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const assert = (c, m) => { if (!c) throw new Error(m || 'assertion failed'); };
  const eq = (a, b, m) => assert(a === b, `${m || ''} (esperaba ${JSON.stringify(b)}, obtuvo ${JSON.stringify(a)})`);

  let area = '';
  async function test(name, fn) {
    if (grep && !name.includes(grep)) return;
    try { await fn(); results.push({ area, name, ok: true }); }
    catch (e) { results.push({ area, name, ok: false, err: e.message || String(e) }); }
  }

  // Helpers that mirror what the UI does.
  // Each test starts clean: no dialog left open by the previous one (the editor ignores keys while one is open).
  // The blank deck has empty title and subtitle placeholders; most tests want the two texts (plain boxes) that it had before.
  const sampleDeck = () => {
    const d = R.model.emptyDeck(), [a, b] = d.slides[0].blocks;
    delete a.ph; delete a.fontWeight; a.html = '<b>Título</b>'; delete b.ph; b.html = 'Subtítulo — doble clic para editar';
    return d;
  };
  const reset = () => { D.querySelectorAll('.modal-backdrop, #canvas-view').forEach(m => m.remove()); R.store.replaceDeck(sampleDeck()); R.render(); };
  const slide = () => R.store.currentSlide();
  const last = () => slide().blocks.at(-1);
  const select = b => { R.state.ui.selection = b.id; R.render(); };
  const richOf = b => D.querySelector(`.block[data-id="${b.id}"] .rich`);
  const newText = () => { R.blocks.addText(); const b = last(); select(b); return b; };

  const ctx = { R, D, frame, test, sleep, assert, eq, reset, slide, last, select, richOf, newText };
  for (area of AREAS.filter(a => !only || only.includes(a)))
    await (await import(`./suites/${area}.js`)).default(ctx);

  const pass = results.filter(r => r.ok).length;
  const fail = results.filter(r => !r.ok);
  return { pass, total: results.length, results, fail };
}
