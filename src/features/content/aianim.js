// Explainer animations written by an AI («Animación con IA»: features/ai/aianim.js writes the scene; ui/dialogs/
// aianim.js). The AI writes only the scene — RevelaAnim.define({ stages, setup, draw }) —; this player does the rest,
// the same for every one: the canvas filling its frame (16:9, sharp on any screen), each stage's name and caption, the
// progress, the loop, the pause and the steps. Steps work like a video's segments: each click plays a stage and it
// stops at its end (io/runtime/aianim.js: one reveal fragment per stage), and its durations change without the AI.
//
// Where it runs: an HTML object of the slide (an embed with srcdoc, like developer mode's) — a sandbox without
// allow-same-origin and with a Content-Security-Policy that allows no connection at all: the AI's code can't reach
// the editor, the person's account or the network. It talks only by postMessage: config (mode, durations), commands
// (next, stage n, at n, reset, play, pause) and events (ready with its stages, stage-end, error).
//
// The block: { type: 'embed', srcdoc, src: '', alt, aiAnim: { topic, lang, scene, stages: [{ name, caption, duration }],
// mode: 'steps' | 'loop', durations: [s…], words?: [{ key, text }] } }. srcdoc is built from aiAnim (aiAnimSrcdoc) —
// every place that shows an HTML object (canvas, thumbnails, the presentation, the viewer) shows it as it is.
//
// words: the example presentations' animations (templates/edu_anim.js) are written in Spanish and read in every
// language: their scenes draw each text through L('Evaporación'), and words holds, for each one (and each stage's name
// and caption), its key — the Spanish — and its text, which the example's translation changes (features/content/
// tplang.js: «text» is one of its texts) before the page is built again. An AI's own animation has none: it is
// already written in its language.

import { jsData } from '../../core/text.js';
import { uid } from '../../core/model.js';

// The player, run inside the sandbox (stringified into the page: nothing from this module may be used in it).
export function aiAnimPlayer(cfg) {
  const css = 'html,body{margin:0;height:100%;overflow:hidden;background:var(--rv-bg,#f4f6fa)}#rv{position:fixed;inset:0;display:grid;place-items:center}canvas{display:block}'
    + '#rv-ui{position:fixed;left:0;right:0;bottom:0;padding:2.2vh 3vw 3vh;display:grid;gap:1.2vh;pointer-events:none}'
    + '#rv-cap{justify-self:center;max-width:88vw;background:rgba(255,255,255,.94);color:#18202e;border-radius:1.6vh;padding:1.4vh 2.6vh;box-shadow:0 .6vh 2.4vh rgba(20,30,50,.14);font:600 clamp(12px,3.6vh,40px)/1.25 system-ui,-apple-system,"Segoe UI",sans-serif;text-align:center}'
    + '#rv-cap small{display:block;font:700 clamp(9px,1.9vh,20px)/1.2 system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:var(--rv-accent,#2f6df0);margin-bottom:.4vh}'
    + '#rv-dots{justify-self:center;display:flex;gap:1vh}#rv-dots i{display:block;width:5vh;height:.8vh;border-radius:1vh;background:rgba(24,32,46,.18);overflow:hidden}'
    + '#rv-dots i b{display:block;height:100%;width:0;background:var(--rv-accent,#2f6df0)}'
    + '#rv-wait{position:fixed;right:2.4vh;top:2.4vh;font:600 clamp(9px,1.8vh,18px)/1 system-ui,sans-serif;color:#18202e;background:rgba(255,255,255,.9);padding:.9vh 1.4vh;border-radius:2vh;display:none}'
    + '#rv-err{position:fixed;inset:0;display:none;place-items:center;font:600 2.6vh/1.4 system-ui,sans-serif;color:#7a1d1d;background:#fdf2f2;padding:4vh;text-align:center}';
  cfg = cfg || {};
  const words = cfg.words || {}, L = s => (Object.prototype.hasOwnProperty.call(words, s) ? words[s] : s);
  let scene = null, data = {}, cv, ctx, W = 1280, H = 720, dpr = 1;
  let mode = cfg.mode === 'steps' ? 'steps' : 'loop', durations = Array.isArray(cfg.durations) ? cfg.durations : null;
  // (Steps: it waits at the start of the first stage for the first click — the presentation's or one on it.)
  let stage = 0, p = 0, playing = true, waiting = mode === 'steps', last = 0;
  const t0 = performance.now(), reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const post = m => { try { parent.postMessage(Object.assign({ rvAnim: m.type }, m), '*'); } catch (e) {} };
  const dur = i => Math.max(0.5, +((durations && durations[i]) != null ? durations[i] : (scene.stages[i] && scene.stages[i].duration) || 5)) * 1000;
  const ease = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fail = msg => { post({ type: 'error', message: String(msg).slice(0, 300) }); const e = document.getElementById('rv-err'); if (e) { e.style.display = 'grid'; e.textContent = '⚠'; } };
  addEventListener('error', e => fail(e.message || 'error'));
  let sw = 0, sh = 0;
  function size() {
    sw = innerWidth; sh = innerHeight;
    const k = Math.min(innerWidth / 16, innerHeight / 9); dpr = Math.min(2.5, devicePixelRatio || 1);
    W = Math.max(16, Math.round(16 * k)); H = Math.max(9, Math.round(9 * k));
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
  }
  function ui() {
    const s = scene.stages[stage] || {};
    document.getElementById('rv-cap').innerHTML = '<small dir="auto">' + (stage + 1) + ' · ' + esc(L(s.name)) + '</small><span dir="auto">' + esc(L(s.caption)) + '</span>';   // (each in its own direction: Arabic too)
    document.querySelectorAll('#rv-dots b').forEach((b, i) => { b.style.width = (i < stage ? 100 : i === stage ? p * 100 : 0) + '%'; });
    document.getElementById('rv-wait').style.display = waiting && mode === 'steps' ? 'block' : 'none';
  }
  function frame(now) {
    const dt = now - last; last = now;
    // (The frame's size is looked at every time, not only when the browser says it changed: an editor that lays the page out
    // after it started — or a browser that doesn't tell — left the picture a few pixels wide, in the middle, for good.)
    if (innerWidth < 40 || innerHeight < 24) { requestAnimationFrame(frame); return; }
    if (innerWidth !== sw || innerHeight !== sh) size();
    if (playing && !waiting) {
      p = Math.min(1, p + (reduced ? 1 : dt / dur(stage)));
      if (p >= 1) {
        post({ type: 'stage-end', n: stage });
        if (mode === 'steps') waiting = true;
        else { stage = (stage + 1) % scene.stages.length; p = 0; }
      }
    }
    ctx.setTransform(dpr * W / 1280, 0, 0, dpr * H / 720, 0, 0);   // (the scene always draws on a 1280 × 720 page)
    ctx.clearRect(0, 0, 1280, 720);
    try { scene.draw({ ctx, stage, p: ease(p), raw: p, t: (now - t0) / 1000, W: 1280, H: 720, data, setupData: data, L }); }
    catch (e) { fail(e && e.message || e); return; }
    ui(); requestAnimationFrame(frame);
  }
  const n = () => scene.stages.length;
  const play = i => { stage = Math.max(0, Math.min(n() - 1, i)); p = 0; waiting = false; playing = true; };
  const at = i => { stage = Math.max(0, Math.min(n() - 1, i)); p = 1; waiting = true; playing = true; };
  function command(c, d) {
    if (c === 'next') { if (!waiting) p = 1; else if (p >= 1 && stage < n() - 1) play(stage + 1); else if (p >= 1) play(0); else play(stage); }
    else if (c === 'stage') play(+d.n || 0);
    else if (c === 'at') at(+d.n || 0);
    else if (c === 'reset') { stage = 0; p = 0; waiting = mode === 'steps'; playing = true; }
    else if (c === 'play') playing = true; else if (c === 'pause') playing = false;
    else if (c === 'probe') post({ type: 'probe', w: cv.width, h: cv.height, iw: innerWidth, ih: innerHeight });   // (the tests: how big the picture is)
    else if (c === 'config') { if (d.mode) mode = d.mode === 'steps' ? 'steps' : 'loop'; if (Array.isArray(d.durations)) durations = d.durations; if (mode === 'loop') waiting = false; }
  }
  addEventListener('message', e => { const d = e.data || {}; if (d && d.rvAnim) command(d.rvAnim, d); });
  addEventListener('click', () => (mode === 'steps' ? command('next', {}) : (playing = !playing)));
  addEventListener('keydown', e => { if (e.key === ' ') command(mode === 'steps' ? 'next' : playing ? 'pause' : 'play', {}); });
  window.RevelaAnim = {
    L,
    define(def) {
      if (scene) return; scene = def;
      if (!def || !Array.isArray(def.stages) || !def.stages.length || typeof def.draw !== 'function') return fail('no stages');
      const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
      if (def.background) document.documentElement.style.setProperty('--rv-bg', String(def.background));
      if (def.accent) document.documentElement.style.setProperty('--rv-accent', String(def.accent));
      document.body.innerHTML = '<div id="rv"><canvas></canvas></div><div id="rv-ui"><div id="rv-cap" dir="auto"></div><div id="rv-dots">'
        + def.stages.map(() => '<i><b></b></i>').join('') + '</div></div><div id="rv-wait">▶</div><div id="rv-err"></div>';
      cv = document.querySelector('canvas'); ctx = cv.getContext('2d'); size(); addEventListener('resize', size);
      try { data = (def.setup && def.setup({ ctx, W: 1280, H: 720, L })) || {}; } catch (e) { return fail(e && e.message || e); }
      post({ type: 'ready', stages: def.stages.map(s => ({ name: String(s.name || ''), caption: String(s.caption || ''), duration: +s.duration || 5 })) });
      last = performance.now(); requestAnimationFrame(frame);
    },
  };
}

// The page of the HTML object: no connection at all, the player, the scene. (The scene can't close its <script>.)
const CSP = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:">`;
export function aiAnimSrcdoc(a) {
  const cfg = { mode: a.mode === 'steps' ? 'steps' : 'loop', durations: Array.isArray(a.durations) ? a.durations.map(Number) : null };
  if (Array.isArray(a.words)) cfg.words = Object.fromEntries(a.words.filter(w => w && typeof w.key === 'string' && typeof w.text === 'string' && w.text !== w.key).map(w => [w.key, w.text]));
  const scene = String(a.scene || '').replace(/<\/(script)/gi, '<\\/$1').replace(/<!--/g, '<\\!--');
  return `<!doctype html><html lang="${String(a.lang || 'es').replace(/[^\w-]/g, '')}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${CSP}</head>`
    + `<body><script>(${aiAnimPlayer.toString()})(${jsData(cfg)});</script><script>${scene}</script></body></html>`;
}
// The stages a presentation clicks through: one per stage in steps mode, none when it loops.
export const aiAnimSteps = b => (b?.aiAnim && b.aiAnim.mode === 'steps' ? (b.aiAnim.stages || []).length : 0);
// A new block (or the same one updated): its page rebuilt from its animation.
export function aiAnimBlock(anim, { x = 160, y = 90, w = 960, h = 540, id = uid(), alt = '' } = {}) {
  const a = { topic: String(anim.topic || ''), lang: anim.lang || 'es', scene: String(anim.scene || ''), stages: (anim.stages || []).map(s => ({ name: String(s.name || ''), caption: String(s.caption || ''), duration: +s.duration || 5 })),
    mode: anim.mode === 'loop' ? 'loop' : 'steps', durations: Array.isArray(anim.durations) ? anim.durations.map(v => Math.max(0.5, Math.min(60, +v || 5))) : (anim.stages || []).map(s => +s.duration || 5) };
  if (Array.isArray(anim.words)) a.words = anim.words.map(w => ({ key: String(w.key), text: String(w.text ?? w.key) }));
  return { id, type: 'embed', src: '', srcdoc: aiAnimSrcdoc(a), alt: alt || a.topic, aiAnim: a, x, y, w, h, rotation: 0, animation: null };
}
// An example's animation written as code (templates/scenes/*.js: { background, accent, stages, words, setup(), draw() },
// its drawn texts through L) → what aiAnimBlock takes: its source, stages and words (each stage’s name and caption, and each drawn text).
export function sceneAnim(def, topic) {
  const fn = (k, f) => (/^(async\s+)?(function\b|\(|[\w$]+\s*=>)/.test(String(f)) ? `${k}: ${f}` : String(f));
  const scene = `RevelaAnim.define({ background: ${jsData(def.background || '#f4f6fa')}, accent: ${jsData(def.accent || '#2f6df0')}, stages: ${jsData(def.stages)},\n`
    + [def.setup && fn('setup', def.setup), fn('draw', def.draw)].filter(Boolean).join(',\n') + '\n});';
  const keys = [...new Set([...def.stages.flatMap(s => [s.name, s.caption]), ...(def.words || [])])];   // (each stage's name too: the player shows it over the caption)
  return { topic, lang: 'es', scene, stages: def.stages, mode: 'steps', durations: def.stages.map(s => s.duration), words: keys.map(k => ({ key: k, text: k })) };
}
// The page an HTML object shows: an AI animation's is always made from its own data with the player of NOW — one saved
// in a presentation with an older player (and its faults) plays with the new one —; any other object's is its own.
export const pageOf = b => (b?.aiAnim ? aiAnimSrcdoc(b.aiAnim) : b?.srcdoc);
export const withAiAnim = (b, changes) => { const a = { ...b.aiAnim, ...changes }; return { ...b, aiAnim: a, srcdoc: aiAnimSrcdoc(a) }; };

// Run a scene in a hidden sandbox, as the presentation will, through every stage quickly: its stages (from its
// «ready») or the error it gave. Used before handing one over (features/ai/aianim.js) and by the tests.
export function checkAiAnim(scene, { ms = 260, timeout = 12000, lang = 'es' } = {}) {
  return new Promise(resolve => {
    const f = document.createElement('iframe'); let stages = null, done = false, seen = 0;
    f.setAttribute('sandbox', 'allow-scripts'); f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1;
    // (Inside the window, tiny, almost transparent and behind everything: browsers freeze the animation of a frame
    // that is off-screen or hidden, and its stages would never end.)
    f.style.cssText = 'position:fixed;left:0;bottom:0;width:160px;height:90px;border:0;opacity:.01;pointer-events:none;z-index:-1';
    const end = r => { if (done) return; done = true; removeEventListener('message', on); clearTimeout(tm); f.remove(); resolve(r); };
    const on = e => {
      if (e.source !== f.contentWindow) return; const d = e.data || {};
      if (d.rvAnim === 'error') end({ ok: false, error: String(d.message || 'error'), stages });
      else if (d.rvAnim === 'ready') { stages = d.stages || []; if (!stages.length) end({ ok: false, error: 'no stages' }); }
      else if (d.rvAnim === 'stage-end' && stages && ++seen >= stages.length * 2) end({ ok: true, stages });   // (round the loop twice)
    };
    addEventListener('message', on);
    const tm = setTimeout(() => end(stages ? { ok: false, error: 'too slow', stages } : { ok: false, error: 'no RevelaAnim.define' }), timeout);
    f.srcdoc = aiAnimSrcdoc({ scene, lang, mode: 'loop', durations: Array(12).fill(ms / 1000) });
    document.body.appendChild(f);
  });
}
