// Interface localisation. Spanish is the source language; each row lists the
// translations in LANG order. Strings not in the table fall back to Spanish, so
// the table can be extended language‑by‑language without breaking anything.

import { ROWS } from './strings.js';

// Languages kept in files of their own, loaded only when chosen.
const LAZY = { gl: () => import('./langs/gl.js'), nl: () => import('./langs/nl.js'), eu: () => import('./langs/eu.js'), ar: () => import('./langs/ar.js') };

export const LANGS = [
  { code: 'es', name: 'Español' },
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' },
  { code: 'ca', name: 'Català' },
  { code: 'gl', name: 'Galego' },
  { code: 'nl', name: 'Nederlands', fallback: 'en' },
  { code: 'eu', name: 'Euskara' },
  { code: 'ar', name: 'العربية', rtl: true, fallback: 'en' },
];
const ORDER = ['en', 'fr', 'de', 'it', 'pt', 'ca'];

const DICT = {};
for (const code of ORDER) DICT[code] = {};
for (const row of ROWS) {
  const es = row[0];
  ORDER.forEach((code, i) => { if (row[i + 1]) DICT[code][es] = row[i + 1]; });
}

async function ensureLang(code) {
  if (!LAZY[code] || DICT[code]) return;
  try { DICT[code] = (await LAZY[code]()).default; } catch { DICT[code] = {}; }
}

const KEY = 'revela.lang';
let lang = 'es';
try { lang = localStorage.getItem(KEY) || 'es'; } catch {}
let fb = LANGS.find(l => l.code === lang)?.fallback || null;
await ensureLang(lang);                                    // the chosen language, before anything is drawn

export function currentLang() { return lang; }
// Speech recognition language from the interface language.
export const speechLang = () => ({ es: 'es-ES', en: 'en-US', fr: 'fr-FR', de: 'de-DE', it: 'it-IT', pt: 'pt-PT', ca: 'ca-ES', gl: 'gl-ES', nl: 'nl-NL', eu: 'eu-ES', ar: 'ar-SA' }[lang] || 'es-ES');
// Missing strings fall back to the language's fallback (English for the
// languages whose speakers are unlikely to read Spanish), then to Spanish.
export function t(es) { return (DICT[lang] && DICT[lang][es]) || (fb && DICT[fb][es]) || es; }

export function applyI18n() {
  const scope = ['#ribbon', '#statusbar', '.titlebar'];
  for (const sel of scope) {
    document.querySelectorAll(`${sel} [title]`).forEach(el => {
      if (el.dataset.i18nt === undefined) el.dataset.i18nt = el.getAttribute('title');
      el.setAttribute('title', t(el.dataset.i18nt));
    });
  }
  document.querySelectorAll('#ribbon .tabs button, #ribbon .group>label, #ribbon .row button span, #ribbon select option, #statusbar .hint, #master-banner span, #master-banner button, #master-banner option, #final-banner span, #final-banner button, #donate span, #premium span, #statusbar .legal-link, #drive-conflict span, #drive-conflict button')
    .forEach(el => {
      if (el.dataset.i18n === undefined) el.dataset.i18n = el.innerHTML.trim();
      el.innerHTML = t(el.dataset.i18n);
    });
  document.documentElement.lang = lang;
  // Right-to-left interface (the slide itself keeps its own direction).
  document.documentElement.dir = LANGS.find(l => l.code === lang)?.rtl ? 'rtl' : 'ltr';
}

export async function setLang(code) {
  await ensureLang(code);
  lang = code; fb = LANGS.find(l => l.code === lang)?.fallback || null;
  try { localStorage.setItem(KEY, code); } catch {}
  const sel = document.getElementById('lang-select'); if (sel) sel.value = code;
  applyI18n();
  window.dispatchEvent(new Event('revela:lang'));   // let dynamic parts re-render
}

// Build the language picker and apply the stored language.
export function initI18n() {
  const sel = document.getElementById('lang-select');
  if (sel) {
    sel.innerHTML = LANGS.map(l => `<option value="${l.code}">${l.name}</option>`).join('');
    sel.value = lang;
    sel.addEventListener('change', () => setLang(sel.value));
  }
  applyI18n();
}
