// Dictation (PowerPoint's and Google Slides' "Dictate" / "Voice typing"):
// speak and the words are written where the caret is — in a text box, a
// shape's text or a table cell — or in a new text box if nothing is being
// written in. It uses the browser's speech recognition; in Chrome and Edge the
// audio goes to their speech service, so it asks once before the first time.
// Spoken punctuation ("punto", "coma", "nueva línea"…) is written as such.

import { selectedBlock } from '../../core/store.js';
import * as blocks from '../../features/document/blocks.js';
import { consented, giveConsent } from '../../features/content/stock.js';
import { editText } from '../canvas/content.js';
import { t, currentLang, speechLang } from '../../i18n/index.js';
import { alertDialog, confirmDialog } from '../dialogs/dialog.js';

// Spoken punctuation, by language (whole words, as recognised).
const SPOKEN = {
  es: [['nueva línea', '\n'], ['nuevo párrafo', '\n'], ['punto y coma', ';'], ['punto y aparte', '.\n'], ['punto', '.'], ['coma', ','], ['dos puntos', ':'],
    ['abrir interrogación', '¿'], ['cerrar interrogación', '?'], ['signo de interrogación', '?'], ['abrir exclamación', '¡'], ['cerrar exclamación', '!']],
  en: [['new line', '\n'], ['new paragraph', '\n'], ['full stop', '.'], ['period', '.'], ['comma', ','], ['colon', ':'], ['semicolon', ';'],
    ['question mark', '?'], ['exclamation mark', '!']],
  ca: [['nova línia', '\n'], ['punt i coma', ';'], ['punt', '.'], ['coma', ','], ['dos punts', ':']],
  fr: [['nouvelle ligne', '\n'], ['point-virgule', ';'], ['point', '.'], ['virgule', ','], ['deux-points', ':']],
  pt: [['nova linha', '\n'], ['ponto e vírgula', ';'], ['ponto', '.'], ['vírgula', ',']],
  it: [['nuova riga', '\n'], ['punto e virgola', ';'], ['punto', '.'], ['virgola', ',']],
  de: [['neue Zeile', '\n'], ['Punkt', '.'], ['Komma', ',']],
};
// A recognised phrase as text: its spoken punctuation turned into signs, glued to the word before.
export function spokenText(s, lang = currentLang()) {
  let out = ' ' + s.trim() + ' ';
  for (const [w, sign] of SPOKEN[lang] || []) out = out.replace(new RegExp(`\\s${w}(?=[\\s.,;:!?])`, 'giu'), sign === '\n' ? '\n' : sign);
  return out.replace(/\s+([.,;:!?])/g, '$1').replace(/([¿¡])\s+/g, '$1').replace(/[ \t]*\n[ \t]*/g, '\n').trim();
}

let rec = null, target = null, bar = null;
export const dictating = () => !!rec;

// Where the words go: the text being written in, the selected text box, or a new one.
function findTarget() {
  const a = document.activeElement;
  if (a?.isContentEditable && a.closest('#stage')) return a;
  const b = selectedBlock();
  if (b && (b.type === 'text' || b.type === 'shape') && editText(b.id, { selectAll: false })) return document.activeElement;
  blocks.addText(''); const nb = selectedBlock();
  return nb && editText(nb.id, { selectAll: false }) ? document.activeElement : null;
}
function write(text) {
  if (!target?.isConnected) return stopDictation();
  if (document.activeElement !== target && !target.contains(document.activeElement)) {        // (back where it was writing, at the end)
    target.focus(); const r = document.createRange(); r.selectNodeContents(target); r.collapse(false);
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
  }
  // A space before it unless at the start or after one; a capital at the start of a sentence.
  const sel = getSelection(), r = sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
  let before = '';
  if (r) { r.setStart(target, 0); before = r.toString(); }
  if (!before.trim() || /[.!?¡¿\n]\s*$/.test(before)) text = text.charAt(0).toLocaleUpperCase() + text.slice(1);
  text = text.replace(/([.!?]\s+|\n|[¡¿])(\p{Ll})/gu, (m, a, c) => a + c.toLocaleUpperCase());
  if (before && !/[\s\n]$/.test(before) && !/^[.,;:!?]/.test(text)) text = ' ' + text;
  text.split('\n').forEach((part, i) => {
    if (i) document.execCommand('insertParagraph');
    if (part) document.execCommand('insertText', false, part);
  });
}

export async function toggleDictation() {
  if (rec) return stopDictation();
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return alertDialog(t('Este navegador no tiene reconocimiento de voz: el dictado funciona en Chrome, Edge y Safari.'));
  if (!consented('dictation')) {
    if (!(await confirmDialog(t('Dictar usa el reconocimiento de voz del navegador: en Chrome y Edge el audio se envía a su servicio de voz para convertirlo en texto. ¿Empezar?')))) return;
    giveConsent('dictation');
  }
  target = findTarget(); if (!target) return;
  rec = new SR();
  Object.assign(rec, { lang: speechLang(), continuous: true, interimResults: true });
  bar = document.createElement('div'); bar.id = 'dictate-bar'; bar.setAttribute('role', 'status');
  bar.innerHTML = `<i class="ms">mic</i><span class="dt-heard">${t('Escuchando…')}</span><button type="button" class="mini2">${t('Detener')}</button>`;
  bar.querySelector('button').addEventListener('mousedown', e => e.preventDefault());
  bar.querySelector('button').addEventListener('click', stopDictation);
  document.body.appendChild(bar);
  const heard = bar.querySelector('.dt-heard');
  rec.onresult = e => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) write(spokenText(r[0].transcript)); else interim += r[0].transcript;
    }
    heard.textContent = interim || t('Escuchando…');
  };
  rec.onend = () => { if (rec) try { rec.start(); } catch { stopDictation(); } };
  rec.onerror = e => {
    if (e.error !== 'not-allowed' && e.error !== 'service-not-allowed') return;
    stopDictation(); alertDialog(t('No se pudo usar el micrófono: permite el acceso para dictar.'));
  };
  document.querySelectorAll('[data-action="dictate"]').forEach(b => b.classList.add('on'));
  try { rec.start(); } catch { stopDictation(); }
}
export function stopDictation() {
  const r = rec; rec = null;
  try { r?.stop(); } catch {}
  bar?.remove(); bar = null; target = null;
  document.querySelectorAll('[data-action="dictate"]').forEach(b => b.classList.remove('on'));
}
