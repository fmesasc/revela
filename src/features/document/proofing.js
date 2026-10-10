// The language a text is written in, for checking its spelling (spelling.js) and for whoever reads it: screen readers,
// the exported page (lang="…") and PowerPoint (each run's lang). As in Word and PowerPoint, the presentation has one
// and a text box may have its own:
//
//   deck.textLang = 'es-ES' | … | 'auto' (each box in the language its words look like) | 'none' (no checking)
//   block.textLang = 'en-GB' | … | 'none'           (absent: the presentation's)
//
// Without deck.textLang, the language the presentation is written in (languages.js: its base, when it has the table
// of translations), else the interface's. (Not `lang`: code blocks already use it for their programming language.)
//
// Also how a text is split into words to check: the same on the slide (its DOM) and in the model (its HTML), so a word
// marked on the slide is found again in the model to be replaced (by its occurrence).

import { i18nOf } from './languages.js';

// The languages with a dictionary (core/vendor.js SPELL_DICTS), in the order they are offered.
export const SPELL_TAGS = ['es-ES', 'ca-ES', 'gl-ES', 'eu-ES', 'en-US', 'en-GB', 'fr-FR', 'de-DE', 'it-IT', 'pt-PT', 'pt-BR', 'nl-NL', 'ar'];
// A language without its country: the usual one (the interface's Portuguese is Portugal's).
const USUAL = { es: 'es-ES', ca: 'ca-ES', gl: 'gl-ES', eu: 'eu-ES', en: 'en-US', fr: 'fr-FR', de: 'de-DE', it: 'it-IT', pt: 'pt-PT', nl: 'nl-NL', ar: 'ar' };
const TAG = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

// Any code (es, pt-br, en_GB…) as the language tag it is checked with: one of SPELL_TAGS when there is a dictionary for
// it (the browser's own variant first: en-GB for someone whose browser is in British English), else as it came.
export function tagFor(code, prefer = globalThis.navigator?.languages || []) {
  const c = String(code || '').trim().replace('_', '-'); if (!TAG.test(c.toLowerCase())) return '';
  const same = x => SPELL_TAGS.find(t => t.toLowerCase() === String(x).toLowerCase());
  if (same(c)) return same(c);
  const base = c.split('-')[0].toLowerCase();
  for (const p of prefer) if (same(p)?.split('-')[0] === base) return same(p);
  return USUAL[base] || c;
}
export const hasDictionary = tag => SPELL_TAGS.includes(tag);
const isLang = v => typeof v === 'string' && v !== 'none' && v !== 'auto' && TAG.test(v.toLowerCase());

// Its name in the interface's language: «Español (España)», «Inglés (Reino Unido)», «Árabe».
export function langLabel(tag, ui = 'es') {
  let n = tag; try { n = new Intl.DisplayNames([ui], { type: 'language', languageDisplay: 'standard' }).of(tag) || tag; } catch {}
  return n.charAt(0).toLocaleUpperCase(ui) + n.slice(1);
}

// The presentation's language when nothing chose one (its own, else the interface's).
export const deckDefaultTag = (deck, ui = 'es') => tagFor(i18nOf(deck)?.base || ui) || 'es-ES';
// What the presentation is set to: a tag, 'auto' or 'none'.
export const deckSetting = (deck, ui = 'es') => (deck?.textLang === 'auto' || deck?.textLang === 'none' || isLang(deck?.textLang) ? deck.textLang : deckDefaultTag(deck, ui));
// The language the presentation is written in (for <html lang>): its setting, when it is a language.
export const deckTag = (deck, ui = 'es') => (deck?.lang && isLang(deck.lang) ? deck.lang : isLang(deck?.textLang) ? deck.textLang : deckDefaultTag(deck, ui));
// A box's language: a tag, or 'none' (not checked). `text`: its words, for 'auto'.
export function boxLang(b, deck, ui = 'es', text = '') {
  if (b?.textLang === 'none' || isLang(b?.textLang)) return b.textLang;
  const s = deckSetting(deck, ui);
  if (s === 'auto') return detectLang(text, deckDefaultTag(deck, ui)) || deckDefaultTag(deck, ui);
  return s;
}
// The lang="…" an exported object carries: only when it has one of its own (the page has the presentation's).
export const langAttr = b => (isLang(b?.textLang) ? ` lang="${b.textLang}"` : '');

// ---- «Detectar automáticamente» ----
// The most frequent little words of each language: a text is in the language whose words it has most (a word shared by
// several languages counts less). Arabic, by its letters. Too few to tell → null (the presentation's is used).
const STOP = {
  es: 'de la que el en y los del se las por un para con no una su al lo como más pero sus le ya este porque esta entre cuando muy sin sobre también me hasta hay donde desde todo nos durante todos uno les ni otros ese eso ante ellos esto antes algunos qué unos yo otro otras otra él tanto esa estos mucho nada muchos poco ella estas algo es son está están',
  ca: 'de la que el i a en els les per un una amb no és del al com més però ho seva seu també hi ha va ser aquest aquesta són dels molt pel quan sense on tot fins ja jo nosaltres això aquí perquè',
  gl: 'de a o que e do da en un para con non unha os as por se na no máis pero dos das como ao súa seu tamén xa moi cando sen sobre ata hai onde desde todo nós isto iso ese esa é son está',
  eu: 'eta da ez du bat ere dira zen baina izan dute bere hau hori zuen beste den egin dela behar gure ditu edo baino oso ondoren arte dago dira',
  en: 'the and of to in is it you that he was for on are with as his they be at one have this from or had by not but what all were we when your can said there an each which she do how their if will up other about out many then them these so some her would make like him into has two more no way could people my than first been who its now did get come made may',
  fr: 'de la le et les des en un une du est pour que qui dans ne pas sur au avec ce il par plus son se sont mais ou comme nous vous ils elle aux cette leur être été fait aussi',
  de: 'der die und in den von zu das mit sich des auf für ist im dem nicht ein eine als auch es an werden aus er hat dass sie nach wird bei einer um am sind noch wie einem über einen so zum war haben nur oder aber vor zur bis mehr durch man ich',
  it: 'di e il la che in a per un è non una del le si con da i al dei sono più come lo ma ha gli della anche nel alla questo essere ci se suo io loro',
  pt: 'de a o que e do da em um para é com não uma os no se na por mais as dos como mas foi ao ele das tem à seu sua ou ser quando muito há nos já está eu também só pelo pela até isso ela entre era depois sem mesmo aos ter seus quem nas me esse eles estão você',
  nl: 'de het een en van in is dat op te zijn met voor niet aan er die maar om ook als dan bij nog uit wordt door naar heeft hij ze wat zo werd geen of al',
};
const WEIGHT = new Map();
for (const [l, s] of Object.entries(STOP)) for (const w of new Set(s.split(' '))) (WEIGHT.get(w) || WEIGHT.set(w, []).get(w)).push(l);
export function detectLang(text, prefer = '') {
  const s = String(text || '');
  const arabic = (s.match(/[؀-ۿ]/g) || []).length, latin = (s.match(/[A-Za-zÀ-ÿ]/g) || []).length;
  if (arabic > 3 && arabic > latin) return 'ar';
  const score = {};
  for (const w of s.toLowerCase().match(/[\p{L}']+/gu) || []) for (const l of WEIGHT.get(w) || []) score[l] = (score[l] || 0) + 1 / WEIGHT.get(w).length;
  const best = Object.entries(score).sort((a, b) => b[1] - a[1])[0];
  if (!best || best[1] < 1.5) return null;
  const base = best[0];
  return prefer && prefer.split('-')[0] === base ? prefer : USUAL[base];       // (en-GB stays en-GB)
}

// ---- Words ----
// What is never checked: code, equations (rendered), and what the author marked so.
export const SKIP = 'code, pre, kbd, samp, .katex, .rv-nospell, [translate="no"]';
const BREAKS = /^(DIV|P|LI|UL|OL|H[1-6]|TD|TH|TR|TABLE|BLOCKQUOTE|BR)$/;
// A text's characters, in order, and which text node each part comes from (a word may span two: «<b>Hol</b>a»).
// Paragraphs and line breaks are a line break.
export function textRuns(root) {
  let text = ''; const segs = [];
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    { acceptNode: n => (n.nodeType === 1 && n.matches(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    if (n.nodeType === 1) { if (BREAKS.test(n.tagName)) text += '\n'; continue; }
    segs.push({ node: n, at: text.length }); text += n.nodeValue;
  }
  return { text, segs };
}
// The words worth checking in a text: [{ word, start, end }]. Not addresses, e-mails, paths or #tags; not words with
// digits (MP3, H2O, 3D); not ones in CAPITALS (initials: ONU, PDF) nor with a capital inside (iPhone, JavaScript), as
// Word by default; not single letters; not $equations$ still in their source.
export function tokenize(text) {
  const s = String(text).replace(/\$[^$\n]+\$/g, m => ' '.repeat(m.length)), out = [];
  for (const m of s.matchAll(/\S+/g)) {
    const chunk = m[0];
    if (/[@\\/_#=<>{}|~^]|:\/\/|^www\.|[\p{L}\d]\.[\p{L}]{2,}/u.test(chunk)) continue;
    for (const w of chunk.matchAll(/[\p{L}\p{M}]+(?:['’·-][\p{L}\p{M}]+)*/gu)) {
      const word = w[0], before = chunk[w.index - 1] || '', after = chunk[w.index + word.length] || '';
      if (/[\d_]/.test(before) || /[\d_]/.test(after)) continue;
      if ([...word].length < 2 || (word === word.toLocaleUpperCase() && word !== word.toLocaleLowerCase()) || /\p{Ll}\p{Lu}/u.test(word)) continue;
      out.push({ word, start: m.index + w.index, end: m.index + w.index + word.length });
    }
  }
  return out;
}
// The form a word is looked up with (the dictionaries write the apostrophe straight).
export const lookupForm = w => w.replace(/’/g, "'");
// A word of textRuns() as a Range on the page (it may span text nodes).
export function rangeOf(segs, start, end) {
  const find = i => { let lo = 0; for (let k = 0; k < segs.length; k++) if (segs[k].at <= i) lo = k; return segs[lo]; };
  const a = find(start), z = find(end - 1), r = document.createRange();
  r.setStart(a.node, start - a.at); r.setEnd(z.node, end - z.at);
  return r;
}
// Which occurrence of the same word this one is, in its text (the n-th «casa»).
export const occurrenceOf = (tokens, i) => tokens.slice(0, i).filter(x => x.word === tokens[i].word).length;

// An HTML text with its n-th `word` replaced by `repl` (formatting kept). Unchanged if it isn't there any more.
export function replaceWord(html, word, nth, repl) {
  const tpl = document.createElement('template'); tpl.innerHTML = html || '';
  const { text, segs } = textRuns(tpl.content), hit = tokenize(text).filter(x => x.word === word)[nth];
  if (!hit) return html;
  const r = rangeOf(segs, hit.start, hit.end); r.deleteContents(); r.insertNode(document.createTextNode(repl));
  return tpl.innerHTML;
}
// Every `word` of an HTML text replaced → [html, how many]. (From the last: the earlier ones stay where they were.)
export function replaceEvery(html, word, repl) {
  const tpl = document.createElement('template'); tpl.innerHTML = html || '';
  const { text, segs } = textRuns(tpl.content), hits = tokenize(text).filter(x => x.word === word);
  for (const h of [...hits].reverse()) { const r = rangeOf(segs, h.start, h.end); r.deleteContents(); r.insertNode(document.createTextNode(repl)); }
  return hits.length ? [tpl.innerHTML, hits.length] : [html, 0];
}
// The same for a plain text (the speaker notes).
export function replaceInPlain(s, word, nth, repl) {
  const hits = tokenize(s).filter(x => x.word === word), list = nth < 0 ? hits : hits.slice(nth, nth + 1);
  let out = s; for (const h of [...list].reverse()) out = out.slice(0, h.start) + repl + out.slice(h.end);
  return [out, list.length];
}
