#!/usr/bin/env node
// Writes the data of Insert ▸ Symbols and emojis (src/ui/dialogs/symbols.js) into assets/symbols/:
//
//   index.json         the gallery's categories (arrows, maths, Greek… and every emoji by its Unicode group, without
//                      skin tones) and which emojis are newer than Emoji 13 (a browser without them shows boxes: the
//                      app checks which it can draw)
//   names/<lang>.json  each of those characters' name and keywords in the 11 languages of the app, from CLDR
//                      (what phones use to search emojis), in index.json's order: "name|keyword|keyword"
//   ucd/blocks.json    every Unicode block with something to insert (not controls, surrogates, private use or
//                      unassigned code points) and where its names are
//   ucd/<n>.json       the official (English) names of those blocks' characters, a few blocks per file, so that
//                      opening one block loads only its file
//
// Downloaded only here, from cdn.jsdelivr.net (fixed versions: the same data every time); the app reads its own copy,
// once, when the gallery opens (and the service worker keeps it for working offline). Run again to update:
//   node tools/build-symbols.mjs
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets', 'symbols');
const CDN = 'https://cdn.jsdelivr.net/npm';
const CLDR = '48.2.0', EMOJI = 'unicode-emoji-json@0.9.0', UCD = '@unicode/unicode-17.0.0@2.0.7';
const LANGS = ['es', 'en', 'fr', 'de', 'it', 'pt', 'ca', 'gl', 'nl', 'eu', 'ar'];

async function get(url, as = 'json') {
  for (let i = 0; ; i++) {
    try {
      const r = await fetch(url); if (!r.ok) throw new Error(`${r.status} ${url}`);
      return as === 'json' ? r.json() : r.text();
    } catch (e) { if (i >= 3) throw e; await new Promise(ok => setTimeout(ok, 1000 * (i + 1))); }
  }
}
// (A few at a time: hundreds of small files.)
async function pool(items, n, fn) {
  const out = new Array(items.length); let next = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (next < items.length) { const i = next++; out[i] = await fn(items[i], i); } }));
  return out;
}

// ---- Unicode's own data (names, blocks, general categories), as the @unicode package encodes it ----------------
// (Its modules import two small decoders: everything is put in a temporary folder with the same layout and imported.)
const ucdDir = mkdtempSync(join(tmpdir(), 'revela-ucd-'));
async function ucdModule(path) {
  const file = join(ucdDir, path); mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, await get(`${CDN}/${UCD}/${path}`, 'text'));
  return (await import(pathToFileURL(file).href)).default;
}
for (const f of ['decode-ranges.mjs', 'decode-property-map.mjs']) await ucdModule(f);
const NAMES = await ucdModule('Names/index.mjs');                                    // code point → name (or a range label)
const listing = await get(`https://data.jsdelivr.com/v1/package/npm/${UCD}`);
const dirOf = name => listing.files.find(f => f.name === name).files.map(f => f.name);
const rangesOf = async path => (await ucdModule(`${path}/ranges.mjs`)).map(r => [r.begin, r.end]);   // [begin, end)
const inRanges = (ranges, cp) => ranges.some(([a, b]) => cp >= a && cp < b);
const GC = {};
for (const g of ['Nonspacing_Mark', 'Enclosing_Mark', 'Format', 'Space_Separator', 'Line_Separator', 'Paragraph_Separator', 'Control', 'Surrogate', 'Private_Use', 'Unassigned'])
  GC[g] = await rangesOf(`General_Category/${g}`);
const isMark = cp => inRanges(GC.Nonspacing_Mark, cp) || inRanges(GC.Enclosing_Mark, cp);
const isBlank = cp => ['Format', 'Space_Separator', 'Line_Separator', 'Paragraph_Separator'].some(g => inRanges(GC[g], cp));
const insertable = cp => !['Control', 'Surrogate', 'Private_Use', 'Unassigned'].some(g => inRanges(GC[g], cp)) && NAMES.has(cp);
const BLOCKS = (await pool(dirOf('Block'), 12, async b => [b.replace(/_/g, ' '), (await rangesOf(`Block/${b}`))[0]]))
  .map(([name, [a, b]]) => ({ name, start: a, end: b - 1 })).sort((x, y) => x.start - y.start);
const ucdName = cp => { const n = NAMES.get(cp); return n && /^[A-Z0-9 -]+$/.test(n) ? n : null; };

// ---- The gallery's categories ----------------------------------------------------------------------------------
const range = (a, b) => { const out = []; for (let c = a; c <= b; c++) if (insertable(c) && ucdName(c)) out.push(String.fromCodePoint(c)); return out; };
const list = s => [...s.replace(/\s+/g, '')];
const SYMBOLS = {
  arrows: [...range(0x2190, 0x21FF), ...range(0x27F0, 0x27FF), ...range(0x2900, 0x297F), ...range(0x2B00, 0x2B11), ...range(0x2B60, 0x2B73), ...list('⬀⬁⬂⬃⮐⮑⮒⮓➔➘➙➚➛➜➝➞➟➠➡➢➣➤➥➦➧➨➩➪➫➬➭➮➯➱➲➳➴➵➶➷➸➹➺➻➼➽➾')],
  math: [...list('+−×÷±∓=≠≈≡≤≥<>≪≫∝∞'), ...range(0x2200, 0x22FF), ...list('¬¹²³½⅓¼′″‴'), ...range(0x27C0, 0x27EF), ...range(0x2A00, 0x2A2F)],
  greek: [...range(0x0391, 0x03A9), ...range(0x03B1, 0x03C9), ...list('ϑϕϖϰϱϵϐϒϝϜ')],
  currency: [...list('$¢£¤¥₩₹₽₿€'), ...range(0x20A0, 0x20C1), ...list('฿៛﷼ƒ')],
  bullets: list('•◦‣⁃∙·●○◉◎⦿⦾▪▫■□◆◇◈❖⬥⬦▸▹►▻▶▷➢➤⇨✦✧❥❧☙⁌⁍⦁⚬⚫⚪🔹🔸🔷🔶'),
  shapes: [...range(0x25A0, 0x25FF), ...range(0x2B1B, 0x2B2F), ...range(0x2B50, 0x2B59), ...list('⬛⬜🟥🟧🟨🟩🟦🟪🟫🔴🟠🟡🟢🔵🟣🟤')],
  marks: list('✓✔🗸✅☑🗹☐☒🗷✗✘✕✖❌❎⊠⊡⊗⊘✓⍻⮽⛝❓❔❗❕‼⁉⚠🚫⛔🆗🆕🆓'),
  stars: list('★☆✦✧✩✪✫✬✭✮✯✰✱✲✳✴✵✶✷✸✹✺✻✼✽✾✿❀❁❂❃❄❅❆❇❈❉❊❋⁂⋆✡⭐🌟💫✨🌠⍟⚝'),
  scripts: list('⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱ₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₒₓₔₕₖₗₘₙₚₛₜᵃᵇᶜᵈᵉᶠᵍʰʲᵏˡᵐᵒᵖʳˢᵗᵘᵛʷˣʸᶻ½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅐⅛⅜⅝⅞⅑⅒⅟↉⁄'),
  units: list('°℃℉‰‱µΩ℧KÅℓ№℗℠™℮⌀⌘⌥⇧⌫⌦⏎⎋⌨⏻⏼⏽⏏⌚⌛⏰⏱⏲⏳㎏㎎㎝㎞㎡㏄㎖㎗㎘㎜㎟㎠㎢㎥㎦㎐㎑㎒㎓㎾㎽㎿㏈ℹ⚡☢☣⚛⏚⎓⌁⌇⏦'),
  music: list('♩♪♫♬♭♮♯𝄞𝄢𝄡𝄪𝄫𝄐𝄑𝄒𝄓𝄆𝄇𝄋𝄌𝄀𝄁𝄂𝄃𝅝𝅗𝅥𝅘𝅥𝅘𝅥𝅮𝅘𝅥𝅯𝄻𝄼𝄽𝄾𝄿🎵🎶🎼🎹🎸🎺🎻🥁🎷🪕🪗'),
  games: [...range(0x2654, 0x265F), ...range(0x2660, 0x2667), ...range(0x2680, 0x2685), ...list('🃏🀄🎴🎲♟🎯🧩'), ...range(0x1F0A1, 0x1F0AE), ...range(0x1F0B1, 0x1F0BE), ...range(0x1F0C1, 0x1F0CE), ...range(0x1F0D1, 0x1F0DE)],
  punct: list('«»‹›“”‘’„‚"\'—–‐‑‒―…¶§†‡‰′″‴¡¿‽⸘·•⁂※‖¦©®™℗@&⁊¬~‾⁓〃⸮⸺⸻⁖⁘⁙⁞⸫⸬⸭〈〉【】〔〕〖〗「」『』'),
  misc: [...range(0x2600, 0x26FF), ...range(0x2700, 0x27BF)],
};
// The emojis by their Unicode group (each without its skin tones: the group's list has only the base one).
const groups = await get(`${CDN}/${EMOJI}/data-by-group.json`);
const EMOJI_IDS = { 'Smileys & Emotion': 'smileys', 'People & Body': 'people', 'Animals & Nature': 'nature', 'Food & Drink': 'food',
  'Travel & Places': 'travel', 'Activities': 'activities', 'Objects': 'objects', 'Symbols': 'emojisym', 'Flags': 'flags' };
const cats = [...Object.entries(SYMBOLS).map(([id, chars]) => [id, [...new Set(chars)].filter(c => c.trim())])];
const newer = {}, emojiNames = new Map();
for (const g of groups) {
  const id = EMOJI_IDS[g.name]; if (!id) throw new Error('grupo de emojis desconocido: ' + g.name);
  cats.push([id, g.emojis.map(e => e.emoji)]);
  for (const e of g.emojis) {
    emojiNames.set(e.emoji, e.name);
    if (parseFloat(e.emoji_version) >= 13) (newer[e.emoji_version] ||= []).push(e.emoji);
  }
}
const ALL = [...new Set(cats.flatMap(([, c]) => c))];

// ---- Names in each language (CLDR), with what Unicode calls them when CLDR has nothing ---------------------------
const bare = s => s.replace(/\uFE0F/g, '');
const fold = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
// Spanish words for the symbols CLDR leaves without a Spanish name (Greek letters, chess, dice, stars, ticks…): so
// that «estrella», «ajedrez» or «dado» find them.
const GREEK_ES = { ALPHA: 'alfa', BETA: 'beta', GAMMA: 'gamma', DELTA: 'delta', EPSILON: 'épsilon', ZETA: 'dseta', ETA: 'eta', THETA: 'theta', IOTA: 'iota',
  KAPPA: 'kappa', LAMDA: 'lambda', MU: 'mu', NU: 'nu', XI: 'xi', OMICRON: 'ómicron', PI: 'pi', RHO: 'ro', SIGMA: 'sigma', 'FINAL SIGMA': 'sigma final', TAU: 'tau',
  UPSILON: 'ípsilon', PHI: 'fi', CHI: 'ji', PSI: 'psi', OMEGA: 'omega' };
const WORDS_ES = { ARROW: 'flecha', ARROWS: 'flechas', LEFT: 'izquierda', RIGHT: 'derecha', UP: 'arriba', DOWN: 'abajo', UPWARDS: 'arriba', DOWNWARDS: 'abajo',
  LEFTWARDS: 'izquierda', RIGHTWARDS: 'derecha', DOUBLE: 'doble', HEAVY: 'gruesa', STAR: 'estrella', STARS: 'estrellas', CHECK: 'check verificación visto', MARK: 'marca',
  BALLOT: 'casilla', BOX: 'casilla caja', X: 'equis', CROSS: 'cruz aspa', CIRCLE: 'círculo', CIRCLED: 'en círculo', SQUARE: 'cuadrado', TRIANGLE: 'triángulo',
  DIAMOND: 'rombo diamante', LOZENGE: 'rombo', HEXAGON: 'hexágono', PENTAGON: 'pentágono', ELLIPSE: 'elipse', BLACK: 'negro relleno', WHITE: 'blanco hueco',
  CHESS: 'ajedrez', KING: 'rey', QUEEN: 'reina dama', ROOK: 'torre', BISHOP: 'alfil', KNIGHT: 'caballo', PAWN: 'peón', DIE: 'dado', FACE: 'cara',
  SPADE: 'picas', HEART: 'corazón corazones', CLUB: 'tréboles', SUIT: 'palo naipe', PLAYING: 'naipe', CARD: 'carta naipe', JOKER: 'comodín',
  FRACTION: 'fracción', SUPERSCRIPT: 'superíndice', SUBSCRIPT: 'subíndice', MODIFIER: 'volada', DIGIT: 'número dígito', ZERO: 'cero', ONE: 'uno', TWO: 'dos',
  THREE: 'tres', FOUR: 'cuatro', FIVE: 'cinco', SIX: 'seis', SEVEN: 'siete', EIGHT: 'ocho', NINE: 'nueve', HALF: 'medio', THIRD: 'tercio', QUARTER: 'cuarto',
  NOTE: 'nota', MUSICAL: 'musical música', SHARP: 'sostenido', FLAT: 'bemol', NATURAL: 'becuadro', CLEF: 'clave', REST: 'silencio', SIGN: 'signo',
  EQUAL: 'igual', EQUALS: 'igual', NOT: 'no distinto', LESS: 'menor', GREATER: 'mayor', THAN: '', PLUS: 'más suma', MINUS: 'menos resta',
  MULTIPLICATION: 'multiplicación por', DIVISION: 'división', INTEGRAL: 'integral', SUM: 'suma sumatorio', PRODUCT: 'producto', ROOT: 'raíz', SUBSET: 'subconjunto',
  SUPERSET: 'superconjunto', UNION: 'unión', INTERSECTION: 'intersección', ELEMENT: 'pertenece elemento', EMPTY: 'vacío', SET: 'conjunto', LOGICAL: 'lógica',
  AND: 'y', OR: 'o', THEREFORE: 'por tanto', BECAUSE: 'porque', INFINITY: 'infinito', ANGLE: 'ángulo', PERPENDICULAR: 'perpendicular', PARALLEL: 'paralelo',
  APPROXIMATELY: 'aproximadamente', ALMOST: 'casi', IDENTICAL: 'idéntico', PROPORTIONAL: 'proporcional', DEGREE: 'grado', CELSIUS: 'celsius', FAHRENHEIT: 'fahrenheit',
  CURRENCY: 'moneda divisa', DOLLAR: 'dólar', POUND: 'libra', YEN: 'yen', RUPEE: 'rupia', WON: 'won', EURO: 'euro', BULLET: 'viñeta punto', DOT: 'punto',
  POINTER: 'puntero', QUOTATION: 'comillas', DASH: 'guion raya', HYPHEN: 'guion', ELLIPSIS: 'puntos suspensivos', SECTION: 'sección', PILCROW: 'calderón párrafo',
  DAGGER: 'cruz daga', FLOWER: 'flor', FLORETTE: 'flor', SNOWFLAKE: 'copo nieve', SPARKLE: 'destello', ASTERISK: 'asterisco', PENCIL: 'lápiz', SCISSORS: 'tijeras',
  TELEPHONE: 'teléfono', ENVELOPE: 'sobre', HAND: 'mano', SUN: 'sol', CLOUD: 'nube', UMBRELLA: 'paraguas', SNOWMAN: 'muñeco de nieve', COMET: 'cometa',
  WARNING: 'advertencia aviso', HIGH: 'alto', VOLTAGE: 'voltaje', RADIOACTIVE: 'radiactivo', BIOHAZARD: 'riesgo biológico', SMILING: 'sonriente', FROWNING: 'triste',
  MALE: 'masculino hombre', FEMALE: 'femenino mujer', RECYCLING: 'reciclaje', ANCHOR: 'ancla', FLAG: 'bandera', GEAR: 'engranaje', WHEELCHAIR: 'silla de ruedas',
  OHM: 'ohmio', MICRO: 'micro', KELVIN: 'kelvin', ANGSTROM: 'angstrom', NUMERO: 'número', TRADE: 'marca registrada', HOURGLASS: 'reloj de arena', WATCH: 'reloj',
  ALARM: 'alarma', CLOCK: 'reloj', KEYBOARD: 'teclado', POWER: 'encendido', EJECT: 'expulsar', RETURN: 'intro', ERASE: 'borrar', OPTION: 'opción', COMMAND: 'comando',
  SHIFT: 'mayúsculas', ESCAPE: 'escape', DIAMETER: 'diámetro', GROUND: 'tierra', ELECTRIC: 'eléctrico', ATOM: 'átomo', INFORMATION: 'información', SQUARED: 'al cuadrado',
  KILOGRAM: 'kilogramo', CENTIMETRE: 'centímetro', KILOMETRE: 'kilómetro', MILLIMETRE: 'milímetro', LITRE: 'litro', SCRIPT: 'manuscrita', SMALL: 'minúscula', CAPITAL: 'mayúscula',
  LETTER: 'letra', GREEK: 'griega griego', OPEN: 'abierto', CLOSE: 'cerrar', BRACKET: 'corchete paréntesis', ANGLE_QUOTE: 'comillas angulares' };
function spanishWords(name) {
  const g = name.match(/^GREEK (CAPITAL|SMALL) LETTER (.+?)( SYMBOL)?$/);
  if (g && GREEK_ES[g[2]]) return `letra griega ${GREEK_ES[g[2]]} ${g[1] === 'CAPITAL' ? 'mayúscula' : 'minúscula'}`;
  return [...new Set(name.split(/[\s-]+/).map(w => WORDS_ES[w]).filter(Boolean).join(' ').split(' '))].join(' ');
}

const annotations = {};
await pool(LANGS, 4, async l => {
  const a = (await get(`${CDN}/cldr-annotations-full@${CLDR}/annotations/${l}/annotations.json`)).annotations.annotations;
  const d = (await get(`${CDN}/cldr-annotations-derived-full@${CLDR}/annotationsDerived/${l}/annotations.json`)).annotationsDerived.annotations;
  annotations[l] = { ...d, ...a };
});
rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'names'), { recursive: true }); mkdirSync(join(OUT, 'ucd'), { recursive: true });
const sizes = [];
const write = (rel, data) => { const s = JSON.stringify(data); writeFileSync(join(OUT, rel), s); sizes.push([rel, Buffer.byteLength(s), gzipSync(s).length]); };
const nameOf = ch => { const cps = [...bare(ch)]; return cps.length === 1 ? ucdName(cps[0].codePointAt(0)) : null; };
for (const l of LANGS) {
  const a = annotations[l];
  write(`names/${l}.json`, ALL.map(ch => {
    const e = a[ch] || a[bare(ch)];
    let name = e?.tts?.[0] || '', kws = e?.default || [];
    if (!name && l === 'en') name = (emojiNames.get(ch) || nameOf(ch) || '').toLowerCase();
    // (In English, the official name too, when CLDR's is another: «rightwards arrow» for →, «right-pointing arrow».)
    if (l === 'en' && name && nameOf(ch) && fold(nameOf(ch)) !== fold(name)) kws = [...kws, nameOf(ch).toLowerCase()];
    if (!e && l === 'es') { const u = nameOf(ch); if (u) { const w = spanishWords(u); if (/^letra griega/.test(w)) name = w; else kws = w ? [w] : []; } }
    // (A keyword already in the name adds nothing to the search.)
    const fn = fold(name);
    kws = kws.filter(k => !fn.includes(fold(k)));
    return [name, ...kws].join('|').replace(/\|+$/, '');
  }));
}
write('index.json', { cats: cats.map(([id, chars]) => [id, chars.join(' ')]), newer: Object.fromEntries(Object.entries(newer).map(([v, l]) => [v, l.join(' ')])) });

// ---- Every Unicode block: the official names, a few blocks per file -------------------------------------------
// A block whose names are its code points (CJK and Tangut ideographs, Hangul syllables: tens of thousands) keeps no
// names: the app makes them (see features/content/symbols.js, unicodeName).
const ALGO = [[/^CJK Ideograph/, 'cjk'], [/^Hangul Syllable/, 'hangul'], [/^Tangut Ideograph/, 'tangut']];
const blocks = [], chunk = { n: 0, data: {}, size: 0 };
const flush = () => { if (chunk.size) { write(`ucd/${chunk.n}.json`, chunk.data); chunk.n++; chunk.data = {}; chunk.size = 0; } };
for (const b of BLOCKS) {
  const algo = (() => { const n = NAMES.get(b.start) || NAMES.get(b.start + 1); return ALGO.find(([re]) => re.test(n || ''))?.[1]; })();
  if (algo) {
    // (Its assigned code points, as ranges.)
    const ranges = []; let from = -1;
    for (let c = b.start; c <= b.end + 1; c++) {
      const ok = c <= b.end && insertable(c);
      if (ok && from < 0) from = c; else if (!ok && from >= 0) { ranges.push([from, c - 1]); from = -1; }
    }
    if (ranges.length) blocks.push([b.name, b.start, b.end, algo, ranges]);
    continue;
  }
  // One name per code point, \n between them: empty, nothing to insert there; «~» first, a combining mark (shown on a
  // dotted circle); «^», an invisible one (spaces, joiners: shown by its code); «-#» at the end, «-» and its own code.
  const lines = [];
  for (let c = b.start; c <= b.end; c++) {
    const n = insertable(c) && ucdName(c);
    if (!n) { lines.push(''); continue; }
    const hex = c.toString(16).toUpperCase().padStart(4, '0');
    lines.push((isMark(c) ? '~' : isBlank(c) ? '^' : '') + (n.endsWith('-' + hex) ? n.slice(0, -hex.length) + '#' : n));
  }
  while (lines.length && !lines.at(-1)) lines.pop();
  if (!lines.length) continue;
  const text = lines.join('\n');
  if (chunk.size && chunk.size + text.length > 64000) flush();
  chunk.data[b.start] = text; chunk.size += text.length;
  blocks.push([b.name, b.start, b.end, chunk.n]);
}
flush();
write('ucd/blocks.json', blocks);
rmSync(ucdDir, { recursive: true, force: true });

const kb = n => (n / 1024).toFixed(1) + ' KB';
const sum = (f, k) => sizes.filter(([r]) => f(r)).reduce((s, x) => s + x[k], 0);
console.log(`${ALL.length} caracteres en ${cats.length} categorías; ${blocks.length} bloques Unicode en ${chunk.n} archivos`);
console.log(`index.json: ${kb(sum(r => r === 'index.json', 1))} (${kb(sum(r => r === 'index.json', 2))} gzip)`);
for (const l of LANGS) console.log(`names/${l}.json: ${kb(sum(r => r === `names/${l}.json`, 1))} (${kb(sum(r => r === `names/${l}.json`, 2))} gzip)`);
console.log(`ucd/: ${kb(sum(r => r.startsWith('ucd/'), 1))} (${kb(sum(r => r.startsWith('ucd/'), 2))} gzip)`);
console.log(`total: ${kb(sum(() => true, 1))} (${kb(sum(() => true, 2))} gzip)`);
