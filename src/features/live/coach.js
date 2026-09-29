// Speaker coach (PowerPoint's "Rehearse with Coach"): from what the speech
// recognition heard while rehearsing, the pace in words per minute, possible
// filler words, repeated expressions and slides read word for word.

// Possible filler words and phrases per language (lower case).
export const FILLERS = {
  es: ['eh', 'em', 'ehm', 'mm', 'este', 'o sea', 'bueno', 'pues', 'vale', 'digamos', 'en plan', 'tipo', 'a ver', 'básicamente', 'literalmente'],
  en: ['um', 'uh', 'er', 'ah', 'like', 'you know', 'i mean', 'basically', 'actually', 'literally', 'kind of', 'sort of', 'okay so'],
  fr: ['euh', 'bah', 'ben', 'genre', 'en fait', 'du coup', 'voilà', 'tu vois', 'quoi'],
  de: ['äh', 'ähm', 'halt', 'sozusagen', 'quasi', 'eigentlich', 'irgendwie'],
  it: ['ehm', 'cioè', 'tipo', 'allora', 'praticamente', 'diciamo', 'insomma'],
  pt: ['tipo', 'então', 'pronto', 'quer dizer', 'basicamente', 'né'],
  ca: ['eh', 'doncs', 'o sigui', 'vull dir', 'tipus', 'a veure', 'saps'],
};
// Pace that sounds natural in a talk (PowerPoint uses the same range).
export const PACE = { slow: 100, fast: 165 };

const norm = s => String(s || '').toLowerCase().normalize('NFC');
export const words = s => norm(s).match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) || [];
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');   // (for a RegExp)

// { filler: count } for one text.
export function countFillers(text, lang = 'es') {
  const list = FILLERS[lang] || FILLERS.es, out = {}, txt = ` ${words(text).join(' ')} `;
  for (const f of list) {
    const n = (txt.match(new RegExp(` ${escRe(f)}(?= )`, 'g')) || []).length;
    if (n) out[f] = n;
  }
  return out;
}

// Words per minute over the last `windowMs` (for the live hint).
export function recentPace(segments, now, windowMs = 30000) {
  const from = now - windowMs, recent = segments.filter(s => s.t >= from);
  if (!recent.length) return 0;
  const n = recent.reduce((a, s) => a + words(s.text).length, 0);
  const span = Math.max(10000, now - Math.min(...recent.map(s => s.t0 ?? s.t)));
  return Math.round(n / (span / 60000));
}

// Short words that don't count as a repeated expression on their own.
const STOP = new Set('de la el en y a los las que un una del se por con para es al lo su no como más o pero sus le ya the of and to in is it that this for on with as are be was an or at by from i you we they he she fr et le les des un une du est à en pour que qui dans der die das und ist zu den mit von il di che e per un una del le da o com para os as um uma do da em no na é'.split(' '));

// segments: [{ text, t, slide }] (final results, t in ms since the start);
// times: ms on each visible slide; slideTexts: text of each visible slide.
export function analyzeRehearsal({ segments = [], times = [], slideTexts = [], lang = 'es' }) {
  const total = times.reduce((a, b) => a + (b || 0), 0);
  const all = segments.map(s => s.text).join(' '), w = words(all);
  const wpm = total ? Math.round(w.length / (total / 60000)) : 0;
  const perSlide = times.map((ms, i) => {
    const n = segments.filter(s => s.slide === i).reduce((a, s) => a + words(s.text).length, 0);
    return { slide: i, ms: ms || 0, words: n, wpm: ms > 5000 ? Math.round(n / (ms / 60000)) : null };
  });
  const fillers = countFillers(all, lang);
  // Repeated expressions: the same 2–4 words (not only short ones) said 3+ times.
  const grams = {};
  for (const k of [4, 3, 2]) for (let i = 0; i + k <= w.length; i++) {
    const g = w.slice(i, i + k); if (g.every(x => STOP.has(x) || x.length < 3)) continue;
    const key = g.join(' '); grams[key] = (grams[key] || 0) + 1;
  }
  const fillerSet = new Set(FILLERS[lang] || FILLERS.es);
  const repeated = Object.entries(grams).filter(([g, n]) => n >= 3 && !fillerSet.has(g))
    .sort((a, b) => b[1] - a[1] || b[0].split(' ').length - a[0].split(' ').length)
    .filter(([g], i, arr) => !arr.slice(0, i).some(([h]) => h.includes(g))).slice(0, 5).map(([phrase, n]) => ({ phrase, n }));
  // Reading the slide: 8 or more words in a row as they are on the slide.
  const read = [];
  slideTexts.forEach((txt, i) => {
    const sw = words(txt); if (sw.length < 8) return;
    const said = ` ${words(segments.filter(s => s.slide === i).map(s => s.text).join(' ')).join(' ')} `;
    let run = 0;
    for (let j = 0; j + 8 <= sw.length && !run; j++) if (said.includes(` ${sw.slice(j, j + 8).join(' ')} `)) run = 8;
    if (run) read.push(i);
  });
  return { total, words: w.length, wpm, pace: !wpm ? null : wpm < PACE.slow ? 'slow' : wpm > PACE.fast ? 'fast' : 'good',
    perSlide, fillers, fillerCount: Object.values(fillers).reduce((a, b) => a + b, 0), repeated, read };
}
