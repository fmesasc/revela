// "Detectar con IA" for the automatic skeleton: three small pictures of the model
// (front, side, top) go to a cheap model that sees images, which says what it is
// (a person, a bird, a spider…), where it faces, how many legs, wings or
// tentacles it has and, if it can, where some joints are. Its answer is checked
// here: anything unknown or out of range is left out.

import { chat, parseJSON } from './openrouter.js';
import { KINDS } from '../content/autorig.js';

export const RIG_AI_MODEL = 'google/gemini-2.5-flash-lite';
const VIEW_NAMES = ['front', 'side', 'top'];
const PROMPT = `You classify a 3D model for automatic rigging. You get three views of it, rendered flat in grey:
FRONT (looking at it from +Z), SIDE (from its left side: +Z is to the right of the image), TOP (from above: +Z is at the bottom of the image).
Answer only JSON:
{"kind": "person|animal|bird|winged|fish|snake|spider|octopus|object",
 "facing": "front|back|left|right", "limbs": {"legs": 0, "wings": 0, "tentacles": 0, "tail": 0},
 "joints": {"front": {"name": [x, y]}, "side": {...}, "top": {...}}}
kind: person = any biped or humanoid (robot, character); animal = four legs, no wings; bird = two legs and wings; winged = four legs and wings (a dragon);
fish (also whales, dolphins); snake (worms, eels, anything long without legs); spider (insects, crabs: 6 or 8 legs); octopus (squid, jellyfish);
object = anything else (vehicles, furniture, plants, props).
facing: where its head (or its front) points in the FRONT view: "front" towards the viewer, "back" away, "left"/"right" towards that side of the image.
joints (optional, only the ones you see clearly): x, y as fractions of the picture (0–1 from its left and its top). Names:
head, neck, hips (middle of the body), tailTip, handL, handR, footL, footR (two-legged), frontFootL, frontFootR, backFootL, backFootR (four-legged),
wingTipL, wingTipR. L/R: the creature's own left and right.`;

// The model's answer, made safe: { kind, facing, turn, limbs, opts, marks }.
const KIND_WORDS = [
  [/\b(dragon|griffin|gryphon|pegasus|wyvern|winged|bat)s?\b/, 'winged'],
  [/\b(bird|duck|chicken|hen|eagle|parrot|owl|penguin|pigeon|goose|swan|flamingo|crow|sparrow|seagull)s?\b/, 'bird'],
  [/\b(fish|shark|whale|dolphin|tuna|salmon|goldfish|orca)(es|s)?\b/, 'fish'],
  [/\b(snake|serpent|worm|eel|caterpillar|chain|tentacle)s?\b/, 'snake'],
  [/\b(spider|insect|ant|bug|beetle|scorpion|crab|centipede|bee|arachnid|cockroach|lobster)s?\b/, 'spider'],
  [/\b(octopus|octopi|squid|jellyfish|jelly|kraken)\b/, 'octopus'],
  [/\b(person|human|man|woman|boy|girl|biped|humanoid|robot|character|astronaut|knight|zombie|skeleton|people)s?\b/, 'person'],
  [/\b(animal|quadruped|dog|cat|horse|cow|fox|wolf|lion|tiger|bear|deer|sheep|pig|dinosaur|lizard|mammal|elephant|rabbit|goat|giraffe)s?\b/, 'animal'],
];
export const FACING_TURN = { front: 0, back: 180, left: 90, right: 270 };
const int = (v, hi = 64) => { const n = Math.round(+v); return Number.isFinite(n) && n >= 0 ? Math.min(hi, n) : 0; };
// JSON as models write it: in fences, with text around, trailing commas, single quotes, bare keys…
export function looseJSON(text) {
  try { const v = parseJSON(text); if (v && typeof v === 'object') return v; } catch {}
  let s = String(text || ''); const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a >= 0 && b > a) {
    const t = s.slice(a, b + 1).replace(/\/\/[^\n]*/g, '').replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
      .replace(/'([^'"\n]*)'/g, '"$1"').replace(/([{,]\s*)([A-Za-z_]\w*)\s*:/g, '$1"$2":').replace(/,\s*([}\]])/g, '$1');
    try { return JSON.parse(t); } catch {}
  }
  // Not JSON at all: the words.
  const kind = /kind["']?\s*[:=]\s*["']?([A-Za-z-]+)/i.exec(s)?.[1] || KIND_WORDS.find(([rx]) => rx.test(s.toLowerCase()))?.[1];
  if (!kind) throw new Error('EMPTY');
  return { kind, facing: /facing["']?\s*[:=]\s*["']?([A-Za-z]+)/i.exec(s)?.[1] };
}
export function readAnswer(text) {
  const raw = looseJSON(text), lim = raw.limbs && typeof raw.limbs === 'object' ? raw.limbs : raw;
  const limbs = { legs: int(lim.legs), wings: int(lim.wings), tentacles: int(lim.tentacles), tail: lim.tail === true ? 1 : int(lim.tail) };
  const word = String(raw.kind || raw.type || '').toLowerCase().trim();
  let kind = KINDS[word] ? word : (KIND_WORDS.find(([rx]) => rx.test(word)) || [, 'object'])[1];
  if (kind === 'animal' && limbs.wings >= 2) kind = 'winged';
  if (kind === 'animal' && limbs.legs >= 6) kind = 'spider';
  const f = String(raw.facing || '').toLowerCase();
  const facing = /back|away|behind/.test(f) ? 'back' : /left/.test(f) ? 'left' : /right/.test(f) ? 'right' : 'front';
  const opts = {};
  if (kind === 'spider' && limbs.legs) opts.legs = limbs.legs >= 7 ? 8 : 6;
  if (kind === 'octopus' && limbs.tentacles >= 3) opts.arms = Math.min(12, limbs.tentacles);
  // Points: per view, [x, y] (or {x, y}; percentages too), kept within the picture.
  const marks = {}, J = raw.joints && typeof raw.joints === 'object' ? raw.joints : {};
  for (const v of VIEW_NAMES) {
    const pts = J[v] || J[v.toUpperCase()]; if (!pts || typeof pts !== 'object') continue;
    for (const [name, p] of Object.entries(pts)) {
      let xy = Array.isArray(p) ? p.slice(0, 2).map(Number) : p && typeof p === 'object' ? [+p.x, +p.y] : null;
      if (!xy || !xy.every(Number.isFinite) || !/^\w{2,20}$/.test(name)) continue;
      if (xy.some(c => c > 1.5)) xy = xy.map(c => c / 100);
      (marks[v] ||= {})[name] = xy.map(c => Math.max(0, Math.min(1, c)));
    }
  }
  return { kind, facing, turn: FACING_TURN[facing], limbs, opts, marks };
}

// Ask (images: { front, side, top } data URLs). With the vision model, or else the usual one.
export async function detectWithAI(images, { onUsage = null } = {}) {
  const content = [{ type: 'text', text: 'The three views of the model:' }];
  for (const v of VIEW_NAMES) if (images[v]) content.push({ type: 'text', text: v.toUpperCase() + ':' }, { type: 'image_url', image_url: { url: images[v] } });
  const messages = [{ role: 'system', content: PROMPT }, { role: 'user', content }];
  let out;
  try { out = await chat(messages, { json: true, maxTokens: 600, onUsage, model: RIG_AI_MODEL }); }
  catch (e) {
    if (/^(NO_KEY|BAD_KEY|NO_CREDIT|TOO_MANY|AI_PAUSED|STOPPED)$/.test(e.message)) throw e;
    out = await chat(messages, { json: true, maxTokens: 600, onUsage });
  }
  return readAnswer(out);
}
