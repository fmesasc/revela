// «Animación con IA»: an animated explainer for a slide (the water cycle, mitosis, a four-stroke engine…), drawn in
// code by the AI and played by Revela's player stage by stage (features/content/aianim.js). The AI writes only the
// scene; before handing it over it is run in a sandbox through every stage, and an error is sent back to the AI
// once to fix. The editor's level (advanced: the strongest affordable model) — measured: ~12-17 credits a scene,
// about as much again when it needs fixing.

import { chat, lang } from './openrouter.js';
import { checkAiAnim } from '../content/aianim.js';

const SYSTEM = language => `You write the SCENE of an animated explainer that a teacher shows on a presentation slide, step by step, like a slide's builds. Revela's player does the rest (canvas, captions, progress, loop, pause, steps).
Answer ONLY with JavaScript (no HTML, no markdown fences) that calls exactly once:
RevelaAnim.define({
  background: '#rrggbb',            // the page colour (light)
  accent: '#rrggbb',                // for the stage marks
  stages: [ { name: 'Short name', caption: 'What happens, max ~10 words', duration: 5 }, … ],   // 3–6 stages, 4–8 s each, in order
  setup({ ctx, W, H }) { … return { … }; },   // optional: precompute shapes, particles (deterministic: seed your own randomness); what it returns comes to draw as \`data\`
  draw({ ctx, stage, p, raw, t, W, H, data }) { … }   // called every frame
});
Rules for draw():
- Draw the WHOLE scene every frame with Canvas 2D on a fixed 1280 × 720 page (W, H), already scaled for you. Nothing else: no DOM, no libraries, no network, no storage, no timers.
- stage = index of the current stage; p = its eased progress 0→1 (raw = linear). The picture must be a pure function of (stage, p) plus t (seconds, only for small ambient motion like waves or flicker): at p = 1 of a stage the scene looks exactly as at p = 0 of the next, so it can stop at any stage end and continue later without a jump.
- What stage n shows: everything before it already done, and stage n happening as p goes 0→1. Labels on the important parts (text ≥ 22 px, dark on light), clean modern drawing, 4–6 harmonious colours, smooth eased motion.
- Keep the bottom 160 px free (the player's caption goes there) and the top-right corner (120 × 50) free. Do not draw captions or stage titles: the player shows them from stages[].
- Scientifically and factually correct for the audience. All text (names, captions, labels) in ${language}.
- Robust: no undefined lookups, guard every array index (stage can be any valid index at any time), never throw.`;
// The code of the answer: inside a fence if it has one (even with a sentence before or after), else from RevelaAnim.define on.
const strip = s => {
  s = String(s || ''); const fenced = s.match(/```(?:js|javascript)?\s*\n([\s\S]*?)```/i);
  if (fenced && /RevelaAnim\.define\s*\(/.test(fenced[1])) return fenced[1].trim();
  const at = s.search(/RevelaAnim\.define\s*\(/);
  return (at > 0 ? s.slice(at) : s).replace(/^\s*```(?:js|javascript)?\s*/i, '').replace(/```\s*$/, '').trim();
};
// A long text pasted as the topic (a project brief, a document): the scene is about its central idea, in a few stages.
const TOPIC_NOTE = 'If the topic is a long text or a brief rather than a short subject, pick its single most visual process or idea and animate only that, simply (3–5 stages); never answer with prose or questions, only the code.';

// → { scene, stages: [{ name, caption, duration }], usd? }  — or throws (EMPTY: no scene; BROKEN: still failing after a fix).
// onStep(k): 'write' | 'check' | 'fix' | 'recheck', for the dialog. check: for the tests (a fake sandbox).
export async function createAiAnimation(topic, { language = lang(), audience = '', onStep = () => {}, signal = null, check = checkAiAnim } = {}) {
  const ask = (user, max = 14000) => chat([{ role: 'system', content: SYSTEM(language) }, { role: 'user', content: user }],
    { maxTokens: max, feature: 'animation', tier: 'advanced', signal });
  onStep('write');
  const first = `Topic: ${String(topic).slice(0, 600)}${audience ? `\nAudience: ${String(audience).slice(0, 200)}` : ''}\n\n${TOPIC_NOTE}`;
  let scene = strip(await ask(first));
  // (Prose instead of code, or cut off: once more, asking only for the code.)
  if (!/RevelaAnim\.define\s*\(/.test(scene)) scene = strip(await ask(`${first}\n\nYour last answer had no RevelaAnim.define(…) code. Answer ONLY with the JavaScript.`));
  if (!/RevelaAnim\.define\s*\(/.test(scene)) throw new Error('EMPTY');
  onStep('check');
  let r = await check(scene);
  if (!r.ok) {
    onStep('fix');
    const fixed = strip(await ask(`Topic: ${String(topic).slice(0, 600)}\n\n${TOPIC_NOTE}\n\nYour previous scene failed when run: ${r.error}\nFix the cause so it can never happen at any stage; keep the rest.\n\nPrevious scene:\n${scene}`));
    if (/RevelaAnim\.define\s*\(/.test(fixed)) { scene = fixed; onStep('recheck'); r = await check(scene); }
    if (!r.ok) throw Object.assign(new Error('BROKEN'), { detail: r.error });
  }
  return { scene, stages: r.stages };
}
