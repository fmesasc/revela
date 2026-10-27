#!/usr/bin/env node
// How varied the AI's design choice is: a person makes 12 presentations in a row (different topics), and each time the model picks the
// design. «Before» = the 13-design list in a fixed order, no memory; «Now» = the real code: the whole list shuffled, the recent ones named,
// the swap of a repeat (features/ai/authoring.js). Only the choice step is simulated (the same wording as the real prompt), not the whole deck.
//
//   node tools/measure-design-variety.mjs --key-file ~/.revela-or-key [--models google/gemini-2.5-flash,google/gemini-3.8-flash] [--sequences 3]
//
// Costs cents (OpenRouter). Prints, per model and way: the designs used, how many are different, the most repeated one's share, back-to-back repeats.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { DECK_DESIGNS, DARK_DESIGNS, lightUnlessAsked, varyDesign, designsForPrompt } from '../src/features/ai/authoring.js';

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
const keyFile = arg('key-file', ''), MODELS = (arg('models', 'google/gemini-2.5-flash,google/gemini-3.8-flash')).split(','), SEQ = +arg('sequences', 3);
const KEY = keyFile ? readFileSync(keyFile.replace(/^~/, homedir()), 'utf8').trim() : process.env.OPENROUTER_API_KEY;
if (!KEY) { console.error('Falta la clave (--key-file o OPENROUTER_API_KEY).'); process.exit(1); }

// The list as it was before (13 designs, this order), for comparing.
const OLD = { minimal: 'any topic, very clean, white background, big clear text', education: 'school lessons, friendly, light green background',
  corporate: 'business, reports, clean and neutral, white background', academic: 'research, papers, conferences, sober and editorial, cream background',
  notebook: 'classes and workshops, a lined notebook page, cream background', nature: 'science, nature, health, light background with soft circles',
  sketch: 'creative, hand-drawn frame, white background', bold: 'strong statements, black and white with a side band', mono: 'magazine style, editorial, strong typography, white background',
  ocean: 'DARK blue background (only if asked for a dark look)', tech: 'DARK background, technology, software, data (only if asked for a dark look)',
  night: 'DARK, keynotes (only if asked for a dark look)', pitch: 'DARK violet, startups, products, bold (only if asked for a dark look)', warm: 'DARK brown, humanities, stories (only if asked for a dark look)' };
const OLD_DARK = { ocean: 'nature', tech: 'corporate', night: 'mono', pitch: 'bold', warm: 'academic' };

const TOPICS = ['The water cycle for 10-year-olds', 'Quarterly results of a logistics company', 'Introduction to machine learning for first-year students', 'Our startup\'s seed round pitch',
  'The French Revolution', 'Healthy habits for teenagers', 'A new CRM rollout for the sales team', 'Climate change and the Arctic', 'Basics of organic chemistry', 'Local food and sustainable farming',
  'How to write a good CV', 'History of jazz', 'Cybersecurity awareness for employees', 'Renaissance art', 'Introduction to Python programming', 'A marketing plan for a new coffee brand',
  'Mindfulness at work', 'The solar system', 'A thesis defence on urban mobility', 'Safety rules in the laboratory', 'Basic first aid', 'Photosynthesis', 'The Roman Empire', 'A product launch for a smart lamp',
  'Teaching fractions', 'Ocean pollution and plastics', 'Budget proposal for the school trip', 'Introduction to electric circuits', 'Women in science', 'Customer service best practices'];

async function ask(model, system, user) {
  for (let t = 0; t < 3; t++) {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', { method: 'POST', headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], temperature: 0.7, max_tokens: 600, response_format: { type: 'json_object' } }) });
    if (!r.ok) { await new Promise(ok => setTimeout(ok, 1500)); continue; }
    const txt = (await r.json()).choices?.[0]?.message?.content || '';
    try { return JSON.parse(txt.replace(/^```(?:json)?\s*|\s*```$/g, '')).design; } catch {}
  }
  return null;
}
const sysOld = list => `You are an expert presentation designer and speechwriter. Choose the look of a deck. Answer only JSON: {"design":"<one of: ${list.map(([k, v]) => `${k} (${v})`).join('; ')}>"}.`;
const sysNew = (list, recent) => `You are an expert presentation designer and speechwriter. Choose the look of a deck. Answer only JSON: {"design":"<one of: ${list.map(([k, v]) => `${k} (${v})`).join('; ')}>"}.
- Design: many different looks suit any subject, so don't pick the textbook match out of habit — choose the one that fits THIS subject, audience and mood.${recent.length ? ` The person's last presentations used: ${recent.join(', ')}; avoid those unless the brief asks for one.` : ''}`;

const shuffle = (a, r) => a.map(x => [r(), x]).sort((p, q) => p[0] - q[0]).map(x => x[1]);
const mulberry = s => () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

async function sequence(model, way, seed) {
  const r = mulberry(seed), topics = shuffle(TOPICS, r).slice(0, 12), used = [], recent = [];
  for (const topic of topics) {
    let key;
    if (way === 'before') { const raw = await ask(model, sysOld(Object.entries(OLD)), `Topic: ${topic}`); key = OLD[raw] ? (OLD_DARK[raw] || raw) : 'minimal'; }
    else {
      const raw = await ask(model, sysNew(designsForPrompt(r), recent), `Topic: ${topic}`);
      key = DECK_DESIGNS[raw] ? varyDesign(lightUnlessAsked(raw, { topic }), { recent, rnd: r }) : 'minimal';
      recent.unshift(key); recent.length = Math.min(recent.length, 8);
    }
    used.push(key);
  }
  return used;
}
const stats = used => { const c = {}; used.forEach(k => { c[k] = (c[k] || 0) + 1; }); const top = Math.max(...Object.values(c)); return { distinct: Object.keys(c).length, top, topKey: Object.keys(c).find(k => c[k] === top), back: used.filter((k, i) => i && k === used[i - 1]).length }; };

for (const model of MODELS) {
  console.log(`\n=== ${model}`);
  for (const way of ['before', 'now']) {
    const all = [];
    for (let s = 0; s < SEQ; s++) {
      const used = await sequence(model, way, 1000 + s), st = stats(used); all.push(st);
      console.log(`  ${way === 'before' ? 'Antes' : 'Ahora'} · secuencia ${s + 1}: ${used.join(' ')}\n       → ${st.distinct} distintos de 12; el más repetido, ${st.topKey} ×${st.top}; seguidos iguales: ${st.back}`);
    }
    const avg = f => (all.reduce((a, x) => a + f(x), 0) / all.length).toFixed(1);
    console.log(`  ${way === 'before' ? 'ANTES' : 'AHORA'} (media de ${SEQ}): ${avg(x => x.distinct)} distintos de 12 · el más repetido ×${avg(x => x.top)} · seguidos iguales ${avg(x => x.back)}`);
  }
}
