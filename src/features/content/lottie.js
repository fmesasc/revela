// Lottie animations (vector, JSON): Insertar ▸ Elementos ▸ Animaciones, or the user's own .json / .lottie. The player is
// lottie-web's light build (MIT, SVG only: no expressions, no effects), loaded only by a slide that has one.
// The 18 that come with Revela were drawn for it (tools/make-lottie.mjs), so there is no licence to carry (assets/lottie/CREDITS.md).
//
// An object: { type: 'lottie', lottie: '<the animation's JSON>', loop, speed, play: 'auto' | 'click', color, still, alt, poster }
//   still:  the frame (a fraction of its length) shown while it does not move — thumbnails, «reduce motion», PowerPoint;
//   poster: that frame as an SVG picture (taken once in the editor, like a 3D model's).
// What reaches the player is always what lottieClean() lets through: a page can't be made to load or run anything from an animation.

import { t, currentLang } from '../../i18n/index.js';

export const LOTTIE_LANGS = ['es', 'en', 'fr', 'de', 'it', 'pt', 'ca', 'gl', 'nl', 'eu', 'ar'];
// [id, still frame, loops, width, height, name in LOTTIE_LANGS (what is searched, and shown in the interface's language)]
export const LOTTIES = [
  ["check", 1, false, 512, 512, ["marca de verificación", "check mark", "coche de validation", "Häkchen", "segno di spunta", "visto", "marca de verificació", "marca de verificación", "vinkje", "egiaztapen-marka", "علامة صح"]],
  ["cross", 1, false, 512, 512, ["cruz (error)", "cross (error)", "croix (erreur)", "Kreuz (Fehler)", "croce (errore)", "cruz (erro)", "creu (error)", "cruz (erro)", "kruis (fout)", "gurutzea (errorea)", "علامة خطأ"]],
  ["arrow-right", 0.5, true, 512, 512, ["flecha a la derecha", "right arrow", "flèche vers la droite", "Pfeil nach rechts", "freccia a destra", "seta para a direita", "fletxa cap a la dreta", "frecha cara á dereita", "pijl naar rechts", "eskuineranzko gezia", "سهم لليمين"]],
  ["arrow-down", 0.5, true, 512, 512, ["flecha hacia abajo", "down arrow", "flèche vers le bas", "Pfeil nach unten", "freccia in giù", "seta para baixo", "fletxa cap avall", "frecha cara abaixo", "pijl omlaag", "beheranzko gezia", "سهم لأسفل"]],
  ["confetti", 0.3, false, 512, 512, ["confeti", "confetti", "confettis", "Konfetti", "coriandoli", "confete", "confeti", "confeti", "confetti", "konfetia", "قصاصات ملونة"]],
  ["loader", 0.1, true, 512, 512, ["cargando", "loading", "chargement", "Laden", "caricamento", "a carregar", "carregant", "cargando", "laden", "kargatzen", "جارٍ التحميل"]],
  ["star", 1, false, 512, 512, ["estrella", "star", "étoile", "Stern", "stella", "estrela", "estrella", "estrela", "ster", "izarra", "نجمة"]],
  ["heartbeat", 0.17, true, 512, 512, ["corazón latiendo", "beating heart", "cœur qui bat", "schlagendes Herz", "cuore che batte", "coração a bater", "cor que batega", "corazón que bate", "kloppend hart", "taupadaka dabilen bihotza", "قلب ينبض"]],
  ["ripple", 0.5, true, 512, 512, ["ondas", "ripples", "ondes", "Wellen", "onde", "ondas", "ones", "ondas", "rimpelingen", "uhinak", "موجات"]],
  ["idea", 0.5, true, 512, 512, ["idea", "idea", "idée", "Idee", "idea", "ideia", "idea", "idea", "idee", "ideia", "فكرة"]],
  ["sparkles", 0.5, true, 512, 512, ["destellos", "sparkles", "étincelles", "Funkeln", "scintille", "brilhos", "espurnes", "chispas", "glinsteringen", "distirak", "بريق"]],
  ["progress", 1, false, 512, 160, ["barra de progreso", "progress bar", "barre de progression", "Fortschrittsbalken", "barra di avanzamento", "barra de progresso", "barra de progrés", "barra de progreso", "voortgangsbalk", "aurrerapen-barra", "شريط التقدم"]],
  ["ball", 0.5, true, 512, 512, ["pelota que bota", "bouncing ball", "balle qui rebondit", "hüpfender Ball", "palla che rimbalza", "bola a saltar", "pilota que bota", "bola que bota", "stuiterende bal", "errebotatzen duen pilota", "كرة تقفز"]],
  ["clock", 0.1, true, 512, 512, ["reloj", "clock", "horloge", "Uhr", "orologio", "relógio", "rellotge", "reloxo", "klok", "erlojua", "ساعة"]],
  ["equalizer", 0.5, true, 512, 512, ["ecualizador", "equalizer", "égaliseur", "Equalizer", "equalizzatore", "equalizador", "equalitzador", "ecualizador", "equalizer", "ekualizadorea", "معادل صوتي"]],
  ["gear", 0, true, 512, 512, ["engranaje", "gear", "engrenage", "Zahnrad", "ingranaggio", "engrenagem", "engranatge", "engrenaxe", "tandwiel", "engranajea", "ترس"]],
  ["underline", 1, false, 512, 128, ["subrayado", "underline", "soulignement", "Unterstreichung", "sottolineatura", "sublinhado", "subratllat", "subliñado", "onderstreping", "azpimarra", "خط تحتي"]],
  ["checklist", 1, false, 512, 512, ["lista de tareas", "checklist", "liste de contrôle", "Checkliste", "lista di controllo", "lista de verificação", "llista de comprovació", "lista de tarefas", "checklist", "egiaztapen-zerrenda", "قائمة مهام"]]
];
export const lottieURL = id => `assets/lottie/${id}.json`;
export const lottieThumb = id => `assets/lottie/${id}.svg`;
export const lottieName = (row, lang) => row[5][Math.max(0, LOTTIE_LANGS.indexOf(lang))] || row[5][0];

export const LOTTIE_MAX = 600000;                // characters of JSON (an animation with pictures inside can be far bigger: not for a slide)
const MAX_NODES = 300000, MAX_DEPTH = 40, MAX_LAYERS = 500, MAX_FRAMES = 36000, MAX_SIDE = 4096;
export const LOTTIE_PLAY = ['auto', 'click'];
export const lottieSpeed = b => Math.min(4, Math.max(0.25, +b.speed || 1));

const IMAGE_URI = /^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=\s]+$/i;
const BAD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

// What an animation's file may hold, and nothing else. Takes the JSON as text or as an object; returns
// { data } (a clean copy) or { error: 'json' | 'format' | 'size' | 'long' } — never throws.
export function lottieClean(src) {
  let data;
  try { data = typeof src === 'string' ? JSON.parse(src) : JSON.parse(JSON.stringify(src)); } catch { return { error: 'json' }; }
  if (!data || typeof data !== 'object' || !Array.isArray(data.layers) || !data.layers.length || data.layers.length > MAX_LAYERS) return { error: 'format' };
  const w = +data.w, h = +data.h, ip = +data.ip, op = +data.op, fr = +data.fr || 30;
  if (!(w > 0 && w <= MAX_SIDE && h > 0 && h <= MAX_SIDE) || !Number.isFinite(ip) || !Number.isFinite(op) || !(op > ip) || !(fr >= 1 && fr <= 240)) return { error: 'format' };
  if (op - ip > MAX_FRAMES) return { error: 'long' };
  data.fr = fr;
  let nodes = 0, bad = false;
  // (Iterative: a file nested a million deep must not take the editor down with it.)
  const todo = [[data, 0]];
  while (todo.length && !bad) {
    const [o, depth] = todo.pop();
    if (++nodes > MAX_NODES || depth > MAX_DEPTH) { bad = true; break; }
    if (Array.isArray(o)) { for (const v of o) if (v && typeof v === 'object') todo.push([v, depth + 1]); continue; }
    for (const k of Object.keys(o)) {
      const v = o[k];
      // Expressions (code), class names and ids (they would land on the page), fonts to download.
      if (BAD_KEYS.has(k) || k === 'ln' || k === 'cl' || k === 'fPath' || (k === 'x' && typeof v === 'string')) { delete o[k]; continue; }
      if (k === 'fOrigin') { o[k] = 'n'; continue; }
      if (v && typeof v === 'object') todo.push([v, depth + 1]);
    }
  }
  if (bad) return { error: 'size' };
  // Pictures inside: only as data (png, jpeg, webp, gif, svg); one that is a link to somewhere is dropped.
  if (Array.isArray(data.assets)) data.assets = data.assets.filter(a => a && typeof a === 'object' && (!('p' in a) || (a.e === 1 && typeof a.p === 'string' && IMAGE_URI.test(a.p) && !a.u)));
  else data.assets = [];
  if (data.fonts?.list && !Array.isArray(data.fonts.list)) delete data.fonts;
  delete data.markers_url;
  return { data };
}

// Every fill and stroke of the animation in one colour (what «Color» does): the animation's own colours are kept when none is chosen.
export function lottieTint(data, hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return data;
  const rgb = [1, 3, 5].map(i => +(parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(4));
  const copy = JSON.parse(JSON.stringify(data)), todo = [copy];
  while (todo.length) {
    const o = todo.pop();
    if (Array.isArray(o)) { for (const v of o) if (v && typeof v === 'object') todo.push(v); continue; }
    if ((o.ty === 'fl' || o.ty === 'st') && o.c && typeof o.c === 'object') o.c = { a: 0, k: [...rgb, 1] };
    for (const k of Object.keys(o)) { const v = o[k]; if (v && typeof v === 'object') todo.push(v); }
  }
  return copy;
}

// What to give the player for an object: cleaned and recoloured, remembered (an editor repaints a lot).
const memo = new Map();
export function lottieSafe(b) {
  const src = b?.lottie; if (typeof src !== 'string' || !src) return null;
  let m = memo.get(src);
  if (!m) { if (memo.size > 24) memo.delete(memo.keys().next().value); memo.set(src, m = { clean: lottieClean(src), tints: new Map() }); }
  if (!m.clean.data) return null;
  const c = /^#[0-9a-f]{6}$/i.test(b.color || '') ? b.color.toLowerCase() : '';
  if (!c) return m.clean.data;
  if (!m.tints.has(c)) m.tints.set(c, lottieTint(m.clean.data, c));
  return m.tints.get(c);
}
export const lottieError = src => lottieClean(src).error || '';
export const lottieErrorText = e => ({
  json: t('Ese archivo no es una animación Lottie (no se puede leer).'),
  format: t('Ese archivo no es una animación Lottie válida.'),
  size: t('Esa animación es demasiado compleja para una diapositiva.'),
  long: t('Esa animación dura demasiado para una diapositiva.'),
  big: t('Esa animación pesa demasiado para una diapositiva (el máximo son 600 KB).'),
}[e] || t('Ese archivo no es una animación Lottie válida.'));

// The frame (counted from the animation's first one, as lottie-web's goToAndStop wants it) that stands for the animation when it doesn't move.
export function lottieStillFrame(b, data = lottieSafe(b)) {
  if (!data) return 0;
  const f = Number.isFinite(+b.still) ? Math.min(1, Math.max(0, +b.still)) : (b.loop === false ? 1 : 0.5);
  return Math.round(f * (data.op - data.ip - 1));
}
export const lottieSeconds = data => (data.op - data.ip) / (data.fr || 30);
export const lottieAspect = data => (data && data.w > 0 && data.h > 0 ? data.w / data.h : 1);

// The object's settings, as the page and the editor both read them.
export const lottieOpts = b => ({ loop: b.loop !== false, speed: lottieSpeed(b), play: b.play === 'click' ? 'click' : 'auto' });

// A .lottie (dotLottie: a zip with its animations, and pictures if it has them) or a .json → the animation's JSON as text.
export async function lottieFromFile(file) {
  if (!file) return { error: 'json' };
  if (file.size > 8e6) return { error: 'big' };
  let text;
  if (/\.lottie$/i.test(file.name) || (await file.slice(0, 2).text()) === 'PK') {
    try {
      const { loadScript, JSZIP } = await import('../../core/vendor.js');
      const JSZip = await loadScript(JSZIP, 'JSZip');
      const zip = await JSZip.loadAsync(await file.arrayBuffer());
      let ids = [];
      try { ids = (JSON.parse(await zip.file('manifest.json').async('string')).animations || []).map(a => a.id); } catch {}
      const f = (ids[0] && (zip.file(`animations/${ids[0]}.json`) || zip.file(`a/${ids[0]}.json`))) || zip.file(/^(animations|a)\/[^/]+\.json$/)[0];
      if (!f) return { error: 'format' };
      const j = JSON.parse(await f.async('string'));
      // (Its pictures, from the zip's own folder, into the animation as data.)
      for (const a of j.assets || []) {
        if (a && a.p && !/^data:/.test(a.p) && !a.e) {
          const im = zip.file(`images/${a.p}`) || zip.file(`i/${a.p}`);
          const ext = (a.p.split('.').pop() || 'png').toLowerCase().replace('jpg', 'jpeg').replace('svg', 'svg+xml');
          if (im) { a.p = `data:image/${ext};base64,${await im.async('base64')}`; a.u = ''; a.e = 1; }
        }
      }
      text = JSON.stringify(j);
    } catch { return { error: 'json' }; }
  } else text = await file.text();
  if (text.length > LOTTIE_MAX) return { error: 'big' };
  const c = lottieClean(text);
  return c.data ? { json: JSON.stringify(c.data), data: c.data, name: file.name.replace(/\.(json|lottie)$/i, '') } : { error: c.error };
}

// A template's animations are named by id ({ lottieId }): their JSON, and the animation's own settings, come in when it is opened.
export async function hydrateLottie(deck, lang = currentLang()) {
  const blocks = [...(deck?.slides || []), ...(deck?.layouts || []), ...(deck?.masters || []), ...(deck?.master ? [deck.master] : [])].flatMap(s => s.blocks || []).filter(b => b.type === 'lottie' && b.lottieId && !b.lottie);
  const json = new Map();
  for (const id of new Set(blocks.map(b => b.lottieId))) {
    try { const r = await fetch(lottieURL(id)); if (r.ok) json.set(id, JSON.stringify(await r.json())); } catch {}
  }
  for (const b of blocks) {
    const row = LOTTIES.find(r => r[0] === b.lottieId); delete b.lottieId;
    const j = json.get(row?.[0]); if (!j || !row) continue;
    b.lottie = j; b.loop ??= row[2]; b.still ??= row[1]; b.alt ??= lottieName(row, lang);
  }
  return deck;
}
