// Poll editor dialog. First the kind, as cards that say what each one is for; then only that kind's fields: the
// essentials on top (question, options with the right one marked by a click, time), the rest folded in groups whose
// title says what is chosen. Beside them, a live preview: the slide with made-up results (pollEditorHTML, the editor's
// own drawing of a poll) and the phone (the real voting page, apps/vote ?preview), so what is seen is what runs.
// The poll is saved as it always was (features/live/poll.js setPoll, the same fields): old presentations open as they were.

import { setPoll, removePoll, clearVotes, votesCSV, savedVotes, tallyVotes, mergeVotes, ACTIVITIES, pollEditorHTML, phonePoll } from '../../features/live/poll.js';
import { ASYNC_KINDS } from '../../features/live/answers.js';
import { currentPalette } from '../../features/design/palettes.js';
import * as cd from '../../io/cloud/clouddocs.js';
import { account } from '../../io/cloud/account.js';
import { confirmDialog } from './dialog.js';
import { t } from '../../i18n/index.js';
import { state, commit } from '../../core/store.js';

// [kind, group, icon, name, what it is for] — in the order of the cards.
const KINDS = [
  ['choice', 'opinion', 'radio_button_checked', 'Encuesta', 'Opinión, sin respuesta correcta: se elige una.'],
  ['multi', 'opinion', 'check_box', 'Varias opciones', 'Cada uno marca todas las que quiera.'],
  ['rating', 'opinion', 'star', 'Valoración 1 a 5', 'Puntuar con estrellas.'],
  ['word', 'opinion', 'cloud', 'Nube de palabras', 'Palabras sueltas; las más repetidas, más grandes.'],
  ['open', 'opinion', 'chat', 'Respuesta abierta', 'Frases cortas que salen en un muro.'],
  ['number', 'opinion', 'pin', 'Adivinar un número', 'Cada uno da una cifra; se ven la media y el reparto.'],
  ['rank', 'opinion', 'format_list_numbered', 'Ordenar por preferencia', 'De la que más gusta a la que menos.'],
  ['image', 'opinion', 'photo_library', 'Elegir entre imágenes', 'Una encuesta con una imagen en cada opción.'],
  ['point', 'opinion', 'ads_click', 'Tocar un punto de una imagen', 'Cada uno toca un sitio; se ve dónde tocó todo el mundo.'],
  ['quiz', 'graded', 'quiz', 'Cuestionario', 'Con respuesta correcta y puntos; cuanto antes, más.'],
  ['order', 'graded', 'swap_vert', 'Poner en orden', 'Ordenar los elementos de la forma correcta.'],
  ['match', 'graded', 'compare_arrows', 'Unir parejas', 'Unir cada elemento con su pareja.'],
  ['gaps', 'graded', 'text_fields', 'Texto con huecos', 'Completar las palabras que faltan.'],
  ['label', 'graded', 'label', 'Etiquetar una imagen', 'Poner cada nombre en su sitio de la imagen.'],
  ['sort', 'graded', 'category', 'Clasificar en grupos', 'Llevar cada elemento a su grupo.'],
  ['crossword', 'games', 'grid_on', 'Crucigrama', 'Palabras con pistas; Revela monta la cuadrícula.'],
  ['wordsearch', 'games', 'manage_search', 'Sopa de letras', 'Encontrar palabras escondidas entre letras.'],
  ['memory', 'games', 'style', 'Memoria (parejas)', 'Dar la vuelta a las cartas y encontrar las parejas.'],
  ['wheel', 'games', 'donut_large', 'Rueda de letras', 'Una palabra por cada letra, contra reloj.'],
  ['board', 'games', 'leaderboard', 'Clasificación de los cuestionarios', 'Los puntos de todos los cuestionarios, sumados.'],
  ['qa', 'free', 'forum', 'Preguntas del público', 'El público pregunta y vota las preguntas de los demás.'],
  ['draw', 'free', 'draw', 'Respuesta dibujada', 'Cada uno dibuja con el dedo en su móvil.'],
  ['photo', 'free', 'photo_camera', 'Respuesta con una foto', 'Cada uno envía una foto: su cuaderno, una maqueta…'],
  ['audio', 'free', 'mic', 'Respuesta de voz (audio)', 'Cada uno graba un mensaje de hasta 30 segundos.'],
];
const GROUPS = [['opinion', 'Opinión: sin respuesta correcta'], ['graded', 'Con respuesta correcta y puntos'], ['games', 'Juegos'], ['free', 'Respuestas libres del público']];
const KIND = Object.fromEntries(KINDS.map(k => [k[0], k]));
// Options edited one per row (a ✓ for the right ones in a quiz, a picture each in «image»); the activities' lines
// have a syntax of their own and are written as text, with their field's name and a short hint.
const LIST_KINDS = ['choice', 'multi', 'quiz', 'rank', 'image'];
const TEXT_KINDS = { order: ['Elementos, en el orden correcto', 'Uno por línea, en el orden correcto.'], match: ['Parejas', 'Una por línea: izquierda = derecha'],
  label: ['Etiquetas', 'Una por línea; después, haz clic en la imagen para colocarlas.'], sort: ['Grupos y elementos', 'Un grupo por línea: Grupo: elemento, elemento'],
  crossword: ['Palabras y pistas', 'Una por línea: PALABRA = pista'], wordsearch: ['Palabras', 'Una por línea (con «= pista» si quieres)'],
  memory: ['Parejas de cartas', 'Una por línea: A = B'], wheel: ['Letras', 'Una línea por letra: A = respuesta = pista'] };
// The long explanations, behind a «?».
const HELP = { order: 'Escribe los elementos en el orden correcto, uno por línea: en los móviles salen desordenados.',
  match: 'Una pareja por línea: «izquierda = derecha». En los móviles, la columna derecha sale desordenada.',
  gaps: 'Escribe el texto y pon cada respuesta entre corchetes. Da igual mayúsculas y tildes.',
  label: 'Escribe las etiquetas (una por línea), elige una imagen y haz clic en ella para colocar cada etiqueta.',
  sort: 'Un grupo por línea: «Grupo: elemento, elemento, elemento». En los móviles salen todos los elementos desordenados y cada persona elige el grupo de cada uno.',
  crossword: 'Una palabra por línea con su pista: «PALABRA = pista». Revela monta el crucigrama; en los móviles salen la cuadrícula y las pistas numeradas, nunca las palabras. Da igual mayúsculas, tildes y espacios.',
  wordsearch: 'Las palabras que hay que encontrar, una por línea; con «PALABRA = pista», en los móviles sale la pista en lugar de la palabra. Revela las esconde en horizontal, en vertical y en diagonal, y rellena el resto con letras de las mismas palabras.',
  memory: 'Una pareja por línea: «A = B». En los móviles salen las cartas boca abajo y cada persona busca las parejas; cuentan las parejas encontradas y, para desempatar, los intentos. Es para practicar: el móvil necesita las dos caras de cada carta para jugar.',
  wheel: 'Una letra por línea: «A = respuesta = pista» (sin la letra, vale la primera de la respuesta; «~» delante para «Contiene la…» en lugar de «Empieza por la…»; «a|b» si valen dos respuestas). En los móviles salen la rueda, la letra y la pista, nunca la respuesta. Al presentar, la tecla J la juega en la pantalla con una sola persona, sin móviles.',
  open: 'Cada persona escribe una respuesta corta; salen en un muro, las más recientes primero.',
  number: 'Cada persona da un número con un deslizador; se ven la media, la mediana y cómo se reparten, y la respuesta si la pones.',
  image: 'Escribe el nombre de cada opción (uno por línea) y elige su imagen.',
  point: 'Elige una imagen: cada persona toca un punto y se ve dónde tocó todo el mundo.',
  rank: 'Cada persona ordena las opciones de la que más prefiere a la que menos; gana la que suma más puntos.',
  draw: 'Cada persona dibuja con el dedo en su móvil (encima de la imagen, si eliges una) y los dibujos salen en un muro.',
  photo: 'Cada persona hace o elige una foto (su cuaderno, una maqueta, algo que ha encontrado) y salen en un muro.',
  audio: 'Cada persona graba con el móvil una respuesta de voz (hasta 30 segundos) y salen en un muro, las más recientes primero; haz clic en una para escucharla. Este navegador guarda las más recientes: unas diez de 30 segundos.',
  quiz: 'Marca con ✓ la respuesta correcta (o escribe un asterisco * delante). Acertar da de 500 a 1000 puntos, más cuanto antes; al acabar el tiempo (o con un clic) se ve la respuesta y quién va ganando.' };
// (The phones' colours for a quiz's answers — apps/vote/main.js TILES —: the same beside each option here.)
const TILES = ['#e21b3c', '#1368ce', '#d89e00', '#26890c', '#864cbf', '#0aa3a3'];
// How the results can be shown: bars, pie or figures for these; a list or a race for the scored ones; the rest, their own.
const DISP_KINDS = ['choice', 'multi', 'rating'], RANKED = ['quiz', 'board'];
const MAX_ROWS = 10;
const esc = x => String(x ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let uidN = 0;

// Made-up answers for the preview (not saved anywhere): enough for the bars, the cloud, the wall or the podium to look
// as they will, never real votes.
export function sampleVotes(p) {
  const V = {}, add = v => { V['s' + Object.keys(V).length] = v; }, n = (p.options || []).length;
  const W = [5, 3, 2, 4, 1, 2, 1, 1, 1, 1], NAMES = ['Ana', 'Luis', 'Eva', 'Pablo', 'Sara', 'Hugo'];
  if (['choice', 'image'].includes(p.kind)) { for (let i = 0; i < n; i++) for (let k = 0; k < W[i % W.length]; k++) add(i); }
  else if (p.kind === 'multi' && n) { for (let k = 0; k < 8; k++) add([...new Set([k % n, (k * 3 + 1) % n])]); }
  else if (p.kind === 'rating') [5, 4, 4, 3, 5, 4, 2, 4].forEach(add);
  else if (p.kind === 'rank' && n) { for (let k = 0; k < 6; k++) add(Array.from({ length: n }, (_, i) => (i + (k % 2 ? 1 : 0) * (k % 3)) % n).filter((x, i, a) => a.indexOf(x) === i)); }
  else if (p.kind === 'quiz' && n) { const ok = (p.correct || [0])[0] ?? 0;
    NAMES.forEach((nm, k) => add({ a: k % 3 === 2 ? (ok + 1) % n : ok, t: 1500 + k * 1800, n: nm, s: k % 2 === 0 })); }
  else if (p.kind === 'word') [['ejemplo', 4], ['idea', 3], ['palabra', 2], ['respuesta', 1]].forEach(([w, c]) => { for (let k = 0; k < c; k++) add(t(w)); });
  else if (p.kind === 'open') ['Una respuesta de ejemplo', 'Otra respuesta del público', 'Una respuesta de ejemplo'].forEach((x, k) => add({ t: t(x), time: k }));
  else if (p.kind === 'qa') { V['q:1'] = { t: t('¿Una pregunta de ejemplo?'), up: { a: 1, b: 1, c: 1 }, by: 'a', time: 1 }; V['q:2'] = { t: t('¿Otra pregunta del público?'), up: { d: 1 }, by: 'b', time: 2 }; }
  else if (p.kind === 'number') { const lo = isFinite(+p.min) ? +p.min : 0, hi = isFinite(+p.max) ? +p.max : 100;
    [0.3, 0.42, 0.5, 0.55, 0.6, 0.45, 0.7, 0.5, 0.35].forEach(f => add(Math.round((lo + (hi - lo) * f) * 100) / 100)); }
  else if (p.kind === 'point') [[42, 40], [48, 46], [45, 52], [60, 30], [44, 44]].forEach(([x, y]) => add({ x, y }));
  return V;
}

// fresh: a poll just inserted — closed without «Aplicar», it goes again (Cancel cancels); it starts by choosing the kind.
export function openPollEditor(b, { fresh = false } = {}) {
  document.getElementById('poll-modal')?.remove();
  const id = 'pe' + ++uidN, back = document.createElement('div'); back.id = 'poll-modal'; back.className = 'modal-backdrop';
  const opt = (v, l, cur) => `<option value="${v}"${cur === v ? ' selected' : ''}>${t(l)}</option>`;
  // A «?» that shows (and hides) a longer explanation, announced as expanded or not.
  const qb = key => `<button type="button" class="pe-qbtn" aria-expanded="false" aria-controls="${id}-${key}" aria-label="${t('Más información')}" title="${t('Más información')}">?</button>`;
  const tp = (key, html, cls = '') => `<p class="host-help pe-tip ${cls}" id="${id}-${key}" hidden>${html}</p>`;
  const tip = (key, html, cls) => qb(key) + tp(key, html, cls);
  const group = (key, title, body) => `<details class="pe-grp pe-g-${key}"><summary><span class="pe-grp-t">${t(title)}</span><span class="pe-grp-s"></span></summary><div class="pe-grp-b">${body}</div></details>`;
  const kindOf = b.kind || 'choice';
  back.innerHTML = `<div class="modal pe" style="text-align:start">
    <button class="modal-close">✕</button><h3>${t('Votación en directo')}</h3>
    <select class="pl-kind" hidden aria-hidden="true" tabindex="-1">${KINDS.map(k => opt(k[0], k[3], kindOf)).join('')}</select>
    <div class="pe-step1"${fresh ? '' : ' hidden'}>
      <p class="pe-lead">${t('¿Qué quieres hacer?')}</p>
      ${GROUPS.map(([g, title]) => `<section class="pe-cgrp" aria-labelledby="${id}-g-${g}"><h4 id="${id}-g-${g}">${t(title)}</h4><div class="pe-cards">${KINDS.filter(k => k[1] === g).map(k =>
        `<button type="button" class="pe-card" data-kind="${k[0]}" aria-pressed="${k[0] === kindOf}"><i class="ms" aria-hidden="true">${k[2]}</i><span><b>${t(k[3])}</b><small>${t(k[4])}</small></span></button>`).join('')}</div></section>`).join('')}
    </div>
    <div class="pe-step2"${fresh ? ' hidden' : ''}>
      <div class="pe-kindbar"><i class="ms pe-kind-ic" aria-hidden="true"></i><div class="pe-kind-tx"><div class="pe-kind-row"><b class="pe-kind-name"></b><span class="pe-free-help"><span class="pe-kind-help"></span></span></div><small class="pe-kind-what"></small></div>
        <button type="button" class="mini2 pe-change"><i class="ms" aria-hidden="true">swap_horiz</i> ${t('Cambiar tipo')}</button></div>
      <div class="pe-how">${tip('how', t('Al presentar aparece un QR: el público vota desde el móvil y los resultados se actualizan al instante. Si has iniciado sesión en Revela, los votos pasan por su servidor y caben miles de móviles; si no, los móviles se conectan directamente a este ordenador (sin servidor), hasta unos 500 a la vez.'))}<span class="host-help">${t('¿Cómo funciona?')}</span></div>
      <div class="pe-cols">
      <div class="pe-main">
        <label class="fr-l">${t('Pregunta')}<input type="text" class="pl-q"></label>
        <div class="pe-list-l" role="group" aria-labelledby="${id}-ol"><div class="pe-lbl"><span id="${id}-ol">${t('Opciones')}</span><span class="pe-kind-help"></span></div>
          <p class="host-help pe-quiz-hint">${t('Marca con ✓ la respuesta correcta.')}</p>
          <ol class="pe-opts"></ol>
          <button type="button" class="mini2 pe-add"><i class="ms" aria-hidden="true">add</i> ${t('Añadir opción')}</button>
          <p class="host-help pe-list-hint">${t('Intro añade otra; si pegas una lista, cada línea es una opción.')}</p>
          <p class="pe-warn" role="status" aria-live="polite"></p></div>
        <div class="fr-l pl-opts-l"><div class="pe-lbl"><label for="${id}-ot" class="pe-opts-name"></label><span class="pe-kind-help"></span></div><textarea class="pl-opts" id="${id}-ot" rows="5" aria-describedby="${id}-oh"></textarea><span class="host-help pe-opts-hint" id="${id}-oh"></span></div>
        <div class="fr-l pl-text-l"><div class="pe-lbl"><label for="${id}-gt">${t('Texto con huecos')}</label><span class="pe-kind-help"></span></div><textarea class="pl-text" id="${id}-gt" rows="3" placeholder="${t('La capital de Francia es [París]. Varias respuestas válidas: [coche|automóvil].')}"></textarea></div>
        <div class="pl-pic" hidden><div class="fr-actions" style="justify-content:flex-start;flex-wrap:wrap"><label class="mini2 pl-img-btn"><i class="ms" aria-hidden="true">image</i> ${t('Elegir imagen…')}<input type="file" accept="image/*" class="sr-only pl-img"></label>
          <label class="fr-chk" style="margin:0">${t('Colocar:')} <select class="pl-place"></select></label></div>
          <div class="pl-stage"><img alt=""><div class="pl-marks"></div></div></div>
        <div class="pl-num" hidden>
          <label class="fr-l">${t('Mínimo')}<input type="number" step="any" class="pl-min" value="${b.min ?? 0}"></label>
          <label class="fr-l">${t('Máximo')}<input type="number" step="any" class="pl-max" value="${b.max ?? 100}"></label>
          <label class="fr-l">${t('Unidad')}<input type="text" class="pl-unit" maxlength="12" value="${esc(b.unit || '')}" placeholder="€, km, %…"></label>
          <label class="fr-l" title="${t('Vacío: sin respuesta correcta (una encuesta)')}">${t('Respuesta correcta (opcional)')}<input type="number" step="any" class="pl-ans" value="${b.answer ?? ''}"></label></div>
        <label class="fr-l pl-quiz pe-time">${t('Tiempo para responder')}<select class="pl-time">${[10, 20, 30, 45, 60, 90].map(n => `<option value="${n}"${(b.time || 20) === n ? ' selected' : ''}>${n} s</option>`).join('')}</select></label>
        <label class="fr-l pl-wheel pe-time">${t('Tiempo total (segundos; 0: sin límite)')}<input type="number" min="0" max="3600" step="10" class="pl-wtime" value="${b.kind === 'wheel' ? b.time ?? 150 : 150}"></label>
      </div>
      <aside class="pe-prev" aria-labelledby="${id}-pv"><h4 id="${id}-pv" class="pe-prev-h">${t('Vista previa')}</h4>
        <div class="pe-tabs" role="tablist" aria-labelledby="${id}-pv"><button type="button" role="tab" class="pe-tab" data-tab="screen" id="${id}-ts" aria-controls="${id}-ps" aria-selected="true"><i class="ms" aria-hidden="true">tv</i> ${t('En la pantalla')}</button><button type="button" role="tab" class="pe-tab" data-tab="phone" id="${id}-tp" aria-controls="${id}-pp" aria-selected="false" tabindex="-1"><i class="ms" aria-hidden="true">smartphone</i> ${t('En el móvil')}</button></div>
        <div class="pe-screen" role="tabpanel" id="${id}-ps" aria-labelledby="${id}-ts"><div class="pe-stage" dir="ltr"><div class="pe-slide"></div></div><p class="host-help pe-cap"></p></div>
        <div class="pe-phone" role="tabpanel" id="${id}-pp" aria-labelledby="${id}-tp" hidden><div class="pe-device" dir="ltr"><iframe title="${t('Vista previa en el móvil')}" loading="lazy"></iframe></div>
          <p class="host-help pe-cap">${t('Así lo verá el público. Puedes probarlo: no se envía nada.')}</p></div>
      </aside>
      <div class="pe-adv">
        ${group('who', 'Quién puede votar', `<fieldset class="pl-who"><legend class="sr-only">${t('Quién puede votar')}</legend>
          <label class="fr-chk"><input type="radio" name="${id}-who" value="device"${b.login ? '' : ' checked'}> ${t('Un voto por dispositivo (sin cuenta)')}</label>
          <label class="fr-chk"><input type="radio" name="${id}-who" value="login" class="pl-login"${b.login ? ' checked' : ''}> ${t('Un voto por persona: exigir iniciar sesión para votar')}</label>
          <div class="pe-hrow"><span class="host-help pe-who-short"></span>${tip('who', '', 'pl-who-help')}</div></fieldset>`)}
        ${group('game', 'Juego: equipos, puntos y carrera', `
          <label class="fr-l pl-quiz">${t('Modo')}<select class="pl-mode">${opt('speed', 'Rapidez: más puntos cuanto antes', b.mode || 'speed')}${opt('accuracy', 'Precisión: solo cuenta acertar, sin prisa', b.mode)}${opt('confidence', 'Confianza: cada uno dice lo seguro que está', b.mode)}</select></label>
          <div class="pl-teams-l"><div class="fr-l"><div class="pe-lbl"><label for="${id}-tm">${t('Equipos (uno por línea)')}</label></div><textarea class="pl-teams" id="${id}-tm" rows="2" aria-describedby="${id}-tmh" placeholder="${t('Rojo')}&#10;${t('Azul')}">${esc((state.deck.teams || []).join('\n'))}</textarea>
            </div><div class="pe-hrow"><span class="host-help" id="${id}-tmh">${t('Vacío: cada uno juega por su cuenta.')}</span>${tip('teams', t('Vale para todos los cuestionarios de la presentación: cada móvil elige equipo y la clasificación muestra la media de cada equipo. Al responder se ganan estrellas (una por respuesta y otra por acierto) y cada 5, un nivel.'))}</div>
          <fieldset class="pe-seg pl-race"><legend>${t('Mostrar resultados como')} ${qb('race')}</legend>
            <label><input type="radio" name="${id}-race" value="bar" class="pe-race-list"> <i class="ms" aria-hidden="true">format_list_numbered</i> ${t('Lista')}</label>
            <label><input type="radio" name="${id}-race" value="race" class="pe-race-on"> <i class="ms" aria-hidden="true">sports_score</i> ${t('Carrera animada')}</label></fieldset>
          ${tp('race', t('Carrera: cada jugador (o cada equipo) avanza hacia la meta, los puntos de todos los cuestionarios; al volver a la diapositiva, sale desde donde estaba. En un cuestionario, se ve al mostrar la respuesta.'))}`)}
        ${group('mod', 'Moderación', `<div class="pl-mod-l pe-hrow"><label class="fr-chk"><input type="checkbox" class="pl-mod"${b.moderate ? ' checked' : ''}> ${t('Aprobar cada pregunta antes de que salga en pantalla')}</label>
          ${tip('mod', t('Al presentar, la tecla M (o clic derecho ▸ «Moderar las preguntas») abre una ventana para aprobarlas, ocultarlas o descartarlas: llévala a tu pantalla. Las preguntas no llevan el nombre de quien pregunta.'))}</div>
          <label class="fr-chk pl-clean-l"><input type="checkbox" class="pl-clean"${b.clean ? ' checked' : ''}> ${t('Tapar las palabrotas')}</label>`)}
        ${group('ai', 'Corrección con IA', `<div class="pl-rub"><label class="fr-l">${t('Criterios para corregir con IA (opcional)')}<textarea class="pl-rubric" rows="3" maxlength="2000" placeholder="${t('p. ej.: Nombra las tres partes, pon un ejemplo y usa los términos vistos.')}">${esc(b.rubric || '')}</textarea></label>
          <div class="pe-hrow"><button type="button" class="mini2 pl-grade"><i class="ms" aria-hidden="true">auto_awesome</i> ${t('Corregir con IA las respuestas')}</button>
          ${tip('ai', t('También al presentar desde el editor: clic derecho ▸ «Corregir con IA las respuestas»; a cada móvil le llega su nota y un comentario.'))}</div><div class="pl-graded" aria-live="polite"></div></div>`)}
        ${group('later', 'Responder más tarde por enlace', `<fieldset class="pl-later"><legend class="sr-only">${t('Responder más tarde, sin presentar')}</legend>
          <label class="fr-chk"><input type="checkbox" class="pl-async"${b.async ? ' checked' : ''}> ${t('Abrirla para responder con un enlace, cuando cada uno quiera')}</label>
          <p class="host-help pl-later-help"></p>
          <div class="sh-row pl-later-link" hidden><input readonly class="pl-link" aria-label="${t('Enlace')}"><button type="button" class="mini2 pl-copy">${t('Copiar')}</button></div>
          <div class="fr-actions pl-later-get" hidden style="justify-content:flex-start"><button type="button" class="mini2 pl-get"><i class="ms" aria-hidden="true">download</i> ${t('Traer las respuestas')}</button><span class="pl-got host-help" aria-live="polite"></span></div></fieldset>`)}
        ${group('look', 'Aspecto', `<fieldset class="pe-seg pe-disp"><legend>${t('Mostrar resultados como')}</legend>
            <label><input type="radio" name="${id}-disp" value="bar"> <i class="ms" aria-hidden="true">bar_chart</i> ${t('Barras')}</label>
            <label><input type="radio" name="${id}-disp" value="pie"> <i class="ms" aria-hidden="true">pie_chart</i> ${t('Circular')}</label>
            <label><input type="radio" name="${id}-disp" value="numbers"> <i class="ms" aria-hidden="true">percent</i> ${t('Cifras')}</label></fieldset>
          <fieldset class="pe-seg pe-ink"><legend>${t('Color del texto')}</legend>
            <label><input type="radio" name="${id}-ink" class="pl-ink-auto"${b.color ? '' : ' checked'}> ${t('El de la paleta')}</label>
            <label><input type="radio" name="${id}-ink" class="pl-ink-own"${b.color ? ' checked' : ''}> ${t('Otro color')}</label>
            <input type="color" class="pl-ink" value="${/^#[0-9a-f]{6}$/i.test(b.color || '') ? b.color : /^#[0-9a-f]{6}$/i.test(currentPalette().fg || '') ? currentPalette().fg : '#222222'}" aria-label="${t('Otro color')}"></fieldset>`)}
        ${group('res', 'Resultados guardados', `<p class="host-help pl-count"></p><div class="pl-aud" hidden></div>
          <div class="fr-actions" style="justify-content:flex-start;flex-wrap:wrap"><button type="button" class="pl-clear mini2"><i class="ms" aria-hidden="true">delete</i> ${t('Borrar resultados')}</button><button type="button" class="pl-csv mini2"><i class="ms" aria-hidden="true">download</i> ${t('Descargar resultados (CSV)')}</button></div>`)}
      </div>
      </div>
    </div>
    <div class="fr-actions pe-foot"><button type="button" class="mini2 pe-cancel">${t('Cancelar')}</button><button type="button" class="fr-do pl-ok">${t('Aplicar')}</button></div></div>`;
  document.body.appendChild(back);
  let applied = false;
  const q = s => back.querySelector(s), qa = s => back.querySelectorAll(s), close = () => { back.remove(); ro?.disconnect(); removeEventListener('message', onMsg); if (fresh && !applied) removePoll(b.id); };
  const kind = () => q('.pl-kind').value;
  q('.pl-q').value = b.question || '';

  // The options, one row each: { text, ok (a right answer, for a quiz), img (its picture, for «image») }; the activities'
  // lines in their text box. Changing kind takes them from one to the other, so nothing typed is lost.
  const correct0 = b.kind === 'quiz' ? b.correct || [] : [];
  let rows = (b.options || []).map((o, i) => ({ text: String(o), ok: correct0.includes(i), img: (b.images || [])[i] || '' }));
  q('.pl-opts').value = (b.options || []).join('\n');
  const fromText = () => { const lines = q('.pl-opts').value.split('\n').map(s => s.trim()).filter(Boolean);
    rows = lines.map((l, i) => { const x = l.replace(/^\*\s*/, ''); return { text: x, ok: l.startsWith('*') || (rows[i]?.text === x && rows[i].ok), img: rows[i]?.img || '' }; }); };
  const toText = () => { q('.pl-opts').value = rows.map(r => r.text.trim()).filter(Boolean).join('\n'); };
  const list = q('.pe-opts');
  const drawRows = (focus) => {
    const k = kind(), quiz = k === 'quiz', pics = k === 'image';
    if (!rows.length) rows.push({ text: '', ok: false, img: '' });
    list.innerHTML = rows.map((r, i) => { const name = t('Opción {n}').replace('{n}', i + 1);
      return `<li class="pe-opt${r.ok && quiz ? ' on' : ''}" data-i="${i}"${quiz ? ` style="--tile:${TILES[i % TILES.length]}"` : ''}>`
        + (quiz ? `<button type="button" class="pe-ok" aria-pressed="${!!r.ok}" aria-label="${t('Respuesta correcta')}: ${esc(name)}" title="${t('Respuesta correcta')}"><i class="ms" aria-hidden="true">check</i></button>`
          : `<span class="pe-dot" aria-hidden="true">${k === 'rank' ? i + 1 : `<i class="ms">${k === 'multi' ? 'check_box_outline_blank' : k === 'image' ? 'image' : 'radio_button_unchecked'}</i>`}</span>`)
        + (pics ? `<label class="pe-thumb" title="${t('Elegir imagen…')}">${r.img ? `<img src="${esc(r.img)}" alt="">` : '<i class="ms" aria-hidden="true">add_photo_alternate</i>'}<input type="file" accept="image/*" class="sr-only" aria-label="${t('Elegir imagen…')} · ${esc(name)}"></label>` : '')
        + `<input type="text" class="pe-in" value="${esc(r.text)}" placeholder="${esc(name)}" aria-label="${esc(name)}">`
        + `<button type="button" class="pe-del" aria-label="${esc(t('Quitar la opción {n}').replace('{n}', i + 1))}" title="${t('Quitar')}"${rows.length < 2 ? ' disabled' : ''}><i class="ms" aria-hidden="true">close</i></button></li>`; }).join('');
    q('.pe-add').disabled = rows.length >= MAX_ROWS;
    warn();
    if (focus) { const [i, what] = focus, li = list.querySelector(`[data-i="${Math.max(0, Math.min(rows.length - 1, i))}"]`); const el = li?.querySelector(what || '.pe-in'); el?.focus(); if (el?.setSelectionRange) el.setSelectionRange(el.value.length, el.value.length); }
  };
  const warn = () => { const k = kind(); q('.pe-warn').textContent = k === 'quiz' && rows.some(r => r.text.trim()) && !rows.some(r => r.ok && r.text.trim()) ? t('Marca la respuesta correcta con ✓; si no, cuenta la primera.') : ''; };
  // (Lines pasted at once: an option each, «*» in front marking a right one, as in a text box.)
  const insert = (at, lines) => { const add = lines.map(l => ({ text: l.replace(/^\*\s*/, ''), ok: l.startsWith('*'), img: '' }));
    rows.splice(at, 0, ...add); rows = rows.slice(0, MAX_ROWS); };
  list.addEventListener('input', e => {
    const inp = e.target.closest('.pe-in'); if (!inp) return; const i = +inp.closest('[data-i]').dataset.i;
    // (The old shortcut: «*» in front marks it right — kept, so the habit of writing it still works.)
    if (/^\*/.test(inp.value)) { inp.value = inp.value.replace(/^\*\s*/, ''); rows[i].ok = true; rows[i].text = inp.value; drawRows([i]); }
    else rows[i].text = inp.value;
    warn(); later(); schedule();
  });
  list.addEventListener('paste', e => {
    const inp = e.target.closest('.pe-in'), txt = e.clipboardData?.getData('text') || ''; if (!inp || !/\n/.test(txt.trim())) return;
    e.preventDefault(); const i = +inp.closest('[data-i]').dataset.i, lines = txt.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const empty = !rows[i].text.trim(); if (empty) rows.splice(i, 1);
    insert(empty ? i : i + 1, lines); drawRows([Math.min(MAX_ROWS - 1, (empty ? i : i + 1) + lines.length - 1)]); schedule();
  });
  list.addEventListener('keydown', e => {
    const inp = e.target.closest('.pe-in'); if (!inp) return; const i = +inp.closest('[data-i]').dataset.i;
    if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); if (rows.length >= MAX_ROWS) return; rows.splice(i + 1, 0, { text: '', ok: false, img: '' }); drawRows([i + 1]); schedule(); }
    else if (e.key === 'Backspace' && !inp.value && rows.length > 1) { e.preventDefault(); rows.splice(i, 1); drawRows([i - 1]); schedule(); }
  });
  list.addEventListener('click', e => {
    const li = e.target.closest('[data-i]'); if (!li) return; const i = +li.dataset.i;
    if (e.target.closest('.pe-ok')) { rows[i].ok = !rows[i].ok; drawRows([i, '.pe-ok']); schedule(); }
    else if (e.target.closest('.pe-del')) { rows.splice(i, 1); drawRows([i]); schedule(); }
  });
  list.addEventListener('change', e => { const f = e.target.files?.[0], li = e.target.closest('[data-i]'); if (!f || !li) return; const i = +li.dataset.i; small(f, src => { rows[i].img = src; drawRows([i, '.pe-thumb input']); schedule(); }); });
  q('.pe-add').addEventListener('click', () => { if (rows.length >= MAX_ROWS) return; rows.push({ text: '', ok: false, img: '' }); drawRows([rows.length - 1]); schedule(); });

  let points = (b.points || []).map(p => ({ ...p })), image = b.image || '';
  const labels = () => q('.pl-opts').value.split('\n').map(s => s.trim()).filter(Boolean);
  const drawPic = () => {
    const ls = labels(), sel = q('.pl-place'), cur = +sel.value || 0;
    sel.innerHTML = ls.map((l, i) => `<option value="${i}"${i === cur ? ' selected' : ''}>${i + 1}. ${esc(l)}</option>`).join('');
    q('.pl-stage img').src = image || ''; q('.pl-stage').hidden = !image;
    q('.pl-marks').innerHTML = points.slice(0, ls.length).map((p, i) => p ? `<b style="left:${p.x}%;top:${p.y}%">${i + 1}</b>` : '').join('');
  };
  let shown = kindOf;
  // The kind's fields only; the rest hidden (kept as they are, and saved only where they apply).
  const sync = () => { const k = kind(), K = KIND[k] || KIND.choice;
    if (LIST_KINDS.includes(shown)) toText(); else if (TEXT_KINDS[shown]) fromText();       // (what was typed goes along)
    shown = k;
    qa('.pe-card').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.kind === k)));
    q('.pe-kind-ic').textContent = K[2]; q('.pe-kind-name').textContent = t(K[3]); q('.pe-kind-what').textContent = t(K[4]);
    const isList = LIST_KINDS.includes(k), tx = TEXT_KINDS[k];
    q('.pe-list-l').hidden = !isList; if (isList) drawRows();
    q('.pe-quiz-hint').hidden = k !== 'quiz';
    q('.pl-opts-l').hidden = !tx; if (tx) { q('.pe-opts-name').textContent = t(tx[0]); q('.pe-opts-hint').textContent = t(tx[1]); }
    q('.pl-num').hidden = k !== 'number';
    qa('.pl-quiz').forEach(x => { x.hidden = k !== 'quiz'; }); q('.pl-wheel').hidden = k !== 'wheel';
    // (The long help: next to the kind's own field, or beside its name when it has none.)
    const holder = isList ? q('.pe-list-l .pe-kind-help') : tx ? q('.pl-opts-l .pe-kind-help') : k === 'gaps' ? q('.pl-text-l .pe-kind-help') : q('.pe-free-help .pe-kind-help');
    qa('.pe-kind-help').forEach(x => { if (x !== holder) x.innerHTML = ''; });
    if (HELP[k]) holder.innerHTML = tip('kind', esc(t(HELP[k])), 'pl-help'); else holder.innerHTML = `<span class="pl-help" hidden></span>`;
    const picOnly = k === 'point' || k === 'draw';
    q('.pl-text-l').hidden = k !== 'gaps'; q('.pl-pic').hidden = k !== 'label' && !picOnly; if (k === 'label' || picOnly) drawPic();
    q('.pl-place').closest('label').hidden = picOnly; q('.pl-marks').hidden = picOnly;
    // The folded groups: only those that mean something for this kind.
    q('.pe-g-who').hidden = k === 'board';
    q('.pe-g-game').hidden = !RANKED.includes(k); 
    q('.pe-g-mod').hidden = !['qa', 'word', 'open'].includes(k); qa('.pl-mod-l').forEach(x => { x.hidden = k !== 'qa'; }); q('.pl-clean-l').hidden = !['qa', 'word', 'open'].includes(k);
    q('.pe-g-ai').hidden = k !== 'open';
    q('.pe-disp').hidden = !DISP_KINDS.includes(k);
    q('.pl-aud').hidden = k !== 'audio'; if (k === 'audio') listen();
    summaries(); schedule(); };
  // How the results are shown: a list or a race (quizzes, leaderboard), bars, pie or figures (surveys, ratings).
  const disp0 = b.display || 'bar';
  (back.querySelector(`input[name="${id}-disp"][value="${['pie', 'numbers'].includes(disp0) ? disp0 : 'bar'}"]`)).checked = true;
  (disp0 === 'race' ? q('.pe-race-on') : q('.pe-race-list')).checked = true;
  const display = () => { const k = kind();
    if (RANKED.includes(k)) return q('.pe-race-on').checked ? 'race' : 'bar';
    if (DISP_KINDS.includes(k)) return back.querySelector(`input[name="${id}-disp"]:checked`)?.value || 'bar';
    return disp0 === 'race' ? 'bar' : disp0; };
  // The voices kept here, to listen to in the editor.
  const listen = () => { const clips = tallyVotes({ kind: 'audio' }, savedVotes(b.pollId)).clips;
    q('.pl-aud').innerHTML = clips.length ? clips.map(c => `<div class="sh-row" style="align-items:center"><span style="flex:1;min-width:0;overflow-wrap:anywhere">${esc(c.n || '🎤')}${c.d ? ` · ${c.d} s` : ''}</span><audio controls preload="none" src="${esc(c.aud)}" style="max-width:62%"></audio></div>`).join('')
      : `<span class="host-help">${t('Aún no hay respuestas.')}</span>`; };
  q('.pl-text').value = b.text || '';
  q('.pl-opts').addEventListener('input', () => { if (kind() === 'label') drawPic(); });
  // (A picture made small enough to travel to every phone: at most `max` px, JPEG.)
  function small(f, done, max = 1280) {
    const img = new Image(); img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src); done(c.toDataURL('image/jpeg', 0.85));
    };
    img.src = URL.createObjectURL(f);
  }
  q('.pl-img').addEventListener('change', e => { const f = e.target.files[0]; if (!f) return; small(f, src => { image = src; drawPic(); schedule(); }); });
  q('.pl-stage').addEventListener('click', e => {
    if (['point', 'draw'].includes(kind())) return;   // (a point to tap, a drawing's background: the picture only)
    const r = q('.pl-stage img').getBoundingClientRect(), i = +q('.pl-place').value || 0;
    points[i] = { x: +((e.clientX - r.left) / r.width * 100).toFixed(1), y: +((e.clientY - r.top) / r.height * 100).toFixed(1) };
    const n = labels().length; if (i + 1 < n) q('.pl-place').value = String(i + 1);
    drawPic(); schedule();
  });
  const count = () => { q('.pl-count').textContent = t('Votos guardados: ') + tallyVotes(b, savedVotes(b.pollId)).voters; summaries(); };
  // Answered later by a link (the presentation in the cloud; the surveys: not quizzes nor activities).
  const doc = cd.cloudDoc(), canLater = !!doc && ['owner', 'edit'].includes(doc.role);
  const later = () => { const ok = ASYNC_KINDS.includes(kind()), on = q('.pl-async').checked;
    q('.pe-g-later').hidden = !ok; q('.pl-async').disabled = !canLater;
    q('.pl-later-help').textContent = !canLater ? t('Para esto, guárdala en tu nube de Revela.') : on ? t('Comparte el enlace: cada persona responde desde su móvil u ordenador. El enlace funciona en cuanto se guarde la presentación; trae las respuestas para verlas aquí y al presentar.') : '';
    q('.pl-later-link').hidden = q('.pl-later-get').hidden = !(canLater && on);
    if (canLater) q('.pl-link').value = cd.pollLink(doc.id, b.pollId); summaries(); };
  q('.pl-async').addEventListener('change', later);
  // Who can vote: one vote per device (as always: another browser or a private window votes again), or one per person
  // — only through Revela's server, which knows the accounts (the presenter signed in; server/cloudflare/broadcast.js).
  const who = () => { const login = q('.pl-login').checked, can = !!account();
    q('.pl-login').disabled = !can && !login;
    q('.pe-who-short').textContent = can ? t('Más información') : t('Para un voto por persona, inicia sesión en Revela.');
    q('.pl-who-help').textContent = !can ? t('Para exigir iniciar sesión, inicia sesión tú en Revela: los votos tienen que pasar por su servidor, que es quien comprueba las cuentas. Sin él, un voto por dispositivo.')
      : login ? t('Cada persona inicia sesión (con Google o con la cuenta de su centro) y vota una sola vez: si vuelve a votar, cambia su voto. Tú ves los resultados igual de anónimos, sin nombres ni correos. Los votos pasan por el servidor de Revela.')
      : t('Cada móvil o navegador vota una vez; desde otro navegador o una ventana privada se puede volver a votar.'); summaries(); };
  qa(`input[name="${id}-who"]`).forEach(x => x.addEventListener('change', who));
  q('.pl-copy').addEventListener('click', e => { navigator.clipboard?.writeText(q('.pl-link').value); e.currentTarget.textContent = t('Copiado'); });
  const bring = async () => { if (!canLater || !b.async) return;
    try { const r = await cd.pollVotes(doc.id, b.pollId), n = mergeVotes(b.pollId, r.votes); q('.pl-got').textContent = t('{n} respuestas por enlace').replace('{n}', n); count(); setPoll(b.id, {}); }
    catch { q('.pl-got').textContent = t('No se pudieron traer.'); } };
  q('.pl-get').addEventListener('click', bring);
  // The open answers kept here, marked by the AI against the criteria.
  q('.pl-grade').addEventListener('click', async () => {
    const V = savedVotes(b.pollId), answers = Object.keys(V).filter(k => V[k]?.t).map(k => ({ id: k, text: V[k].t }));
    if (!answers.length) { q('.pl-graded').textContent = t('Aún no hay respuestas.'); return; }
    const { gradeOpen } = await import('../../features/ai/authoring.js'), { run } = await import('./ai.js');
    const marks = await run(() => gradeOpen(q('.pl-q').value.trim(), q('.pl-rubric').value.trim(), answers)); if (!marks) return;
    const by = Object.fromEntries(marks.map(m => [m.id, m]));
    q('.pl-graded').innerHTML = answers.map(a => `<div style="padding:6px 0;border-top:1px solid var(--line)"><b>${by[a.id] ? by[a.id].score + '/10' : '—'}</b> ${esc(a.text)}${by[a.id] ? `<div class="host-help">${esc(by[a.id].feedback)}</div>` : ''}</div>`).join('');
  });

  // What each folded group has chosen, in a line, so it needn't be opened to know.
  const summaries = () => { const k = kind(), set = (g, s) => { const el = q(`.pe-g-${g} .pe-grp-s`); if (el) el.textContent = s; };
    set('who', q('.pl-login').checked ? t('Un voto por persona, con sesión') : t('Un voto por dispositivo'));
    const teams = q('.pl-teams').value.split('\n').map(x => x.trim()).filter(Boolean).length;
    set('game', [k === 'quiz' && t({ speed: 'Rapidez', accuracy: 'Precisión', confidence: 'Confianza' }[q('.pl-mode').value]),
      teams ? t('{n} equipos').replace('{n}', teams) : t('Cada uno por su cuenta'), q('.pe-race-on').checked ? t('Carrera animada') : t('Lista')].filter(Boolean).join(' · '));
    set('mod', [k === 'qa' && (q('.pl-mod').checked ? t('Apruebas cada pregunta') : t('Salen sin aprobar')), q('.pl-clean').checked ? t('Palabrotas tapadas') : t('Palabrotas sin tapar')].filter(Boolean).join(' · '));
    set('ai', q('.pl-rubric').value.trim() ? t('Con criterios') : t('Sin criterios'));
    set('later', !canLater ? t('Solo con la presentación en tu nube') : q('.pl-async').checked ? t('Abierta por enlace') : t('Desactivado'));
    const dl = { bar: 'Barras', pie: 'Circular', numbers: 'Cifras' }[display()];
    set('look', [DISP_KINDS.includes(k) && dl && t(dl), q('.pl-ink-auto').checked ? t('El de la paleta') : t('Otro color')].filter(Boolean).join(' · '));
    set('res', t('Votos guardados: ') + tallyVotes(b, savedVotes(b.pollId)).voters); };

  // The poll as it would be saved (the same for «Aplicar» and for the preview: they can't disagree).
  const collect = () => {
    const k = kind(); let options, correct = [], images = [];
    if (LIST_KINDS.includes(k) || !TEXT_KINDS[k]) {
      const kept = rows.map(r => ({ ...r, text: r.text.trim().replace(/^\*\s*/, '') })).filter(r => r.text).slice(0, MAX_ROWS);
      options = kept.map(r => r.text); correct = kept.map((r, i) => (r.ok ? i : -1)).filter(i => i >= 0); images = kept.map(r => r.img || '');
    } else {
      const lines = q('.pl-opts').value.split('\n').map(s => s.trim()).filter(Boolean).slice(0, k === 'wheel' ? 27 : ACTIVITIES.includes(k) ? 20 : 10);
      options = lines.map(l => l.replace(/^\*\s*/, ''));
    }
    return { question: q('.pl-q').value.trim(), kind: k, display: display(), options: options.length ? options : b.options,
      async: ASYNC_KINDS.includes(k) && q('.pl-async').checked ? true : null,
      login: k !== 'board' && q('.pl-login').checked ? true : null,
      moderate: k === 'qa' && q('.pl-mod').checked ? true : null, clean: ['qa', 'word', 'open'].includes(k) && q('.pl-clean').checked ? true : null,
      color: q('.pl-ink-auto').checked ? null : q('.pl-ink').value,
      ...(k === 'quiz' && { correct: correct.length ? correct : [0], time: +q('.pl-time').value, mode: q('.pl-mode').value === 'speed' ? null : q('.pl-mode').value }),
      ...(k === 'gaps' && { text: q('.pl-text').value.trim() }),
      ...(k === 'wheel' && { time: Math.max(0, Math.min(3600, Math.round(+q('.pl-wtime').value) || 0)) }),
      ...(k === 'label' && { image, points: options.map((_, i) => points[i] || { x: 50, y: 50 }) }),
      ...(k === 'point' && { image }), ...(k === 'draw' && { image: image || null }),
      ...(k === 'image' && { images }),
      ...(k === 'open' && { rubric: q('.pl-rubric').value.trim() || null }),
      ...(k === 'number' && (() => { const num = sel => { const v = q(sel).value.trim().replace(',', '.'); return v === '' || !isFinite(+v) ? null : +v; };
        let lo = num('.pl-min') ?? 0, hi = num('.pl-max') ?? 100; if (hi <= lo) hi = lo + 1;
        return { min: lo, max: hi, unit: q('.pl-unit').value.trim() || null, answer: num('.pl-ans') }; })()) };
  };
  const draft = () => { const p = { ...b, ...collect() }; for (const k in p) if (p[k] == null) delete p[k]; return p; };

  // The preview: the slide as the editor draws it (its background and text colour), with made-up results; the phone,
  // the voting page itself in a frame, sent the poll as the presentation would. Redrawn a moment after each change.
  const stage = q('.pe-stage'), slideEl = q('.pe-slide'), frame = q('.pe-device iframe'), W = state.deck.size?.w || 1280, H = state.deck.size?.h || 720;
  stage.style.aspectRatio = `${W} / ${H}`; Object.assign(slideEl.style, { width: W + 'px', height: H + 'px' });
  const look = document.getElementById('stage'); if (look) { const cs = getComputedStyle(look);
    Object.assign(slideEl.style, { backgroundColor: cs.backgroundColor, backgroundImage: cs.backgroundImage, backgroundSize: cs.backgroundSize, backgroundPosition: cs.backgroundPosition, color: cs.color, fontFamily: cs.fontFamily }); }
  const fit = () => { slideEl.style.transform = `scale(${stage.clientWidth / W || 0})`; };
  const ro = window.ResizeObserver ? new ResizeObserver(fit) : null; ro?.observe(stage);
  let timer = 0, phoneReady = false;
  const schedule = () => { clearTimeout(timer); timer = setTimeout(paint, 120); };
  const paint = () => { if (!back.isConnected) return; const p = draft();
    let votes = {}, html; try { votes = sampleVotes(p); html = pollEditorHTML(p, currentPalette().accents, votes); } catch { html = ''; }
    slideEl.innerHTML = `<div class="pe-blk" style="position:absolute;left:${+p.x || 0}px;top:${+p.y || 0}px;width:${+p.w || 1120}px;height:${+p.h || 600}px">${html}</div>`; fit();
    q('.pe-screen .pe-cap').textContent = Object.keys(votes).length ? t('Con votos de ejemplo: los de verdad llegan al presentar.') : t('Así se verá en la pantalla al presentar.');
    if (phoneReady) { let pp = null; try { pp = p.kind === 'board' ? null : { ...phonePoll(p), pollId: 'preview-' + Date.now() }; } catch {}
      frame.contentWindow?.postMessage({ type: 'rv-preview', poll: pp }, location.origin === 'null' ? '*' : location.origin); } };   // (a file: page's origin is «null»)
  const onMsg = e => { if (e.source === frame.contentWindow && e.data?.type === 'rv-preview-ready') { phoneReady = true; paint(); } };
  addEventListener('message', onMsg);
  // (Tabs: arrows move between them, as a tab list does.)
  const showTab = (name, focus) => { qa('.pe-tab').forEach(x => { const on = x.dataset.tab === name; x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1; if (on && focus) x.focus(); });
    q('.pe-screen').hidden = name !== 'screen'; q('.pe-phone').hidden = name !== 'phone';
    if (name === 'phone' && !frame.src) frame.src = new URL('vote.html?preview', location.href).href;
    if (name === 'screen') fit(); };
  q('.pe-tabs').addEventListener('click', e => { const tb = e.target.closest('.pe-tab'); if (tb) showTab(tb.dataset.tab); });
  q('.pe-tabs').addEventListener('keydown', e => { if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return; e.preventDefault();
    showTab(q('.pe-tab[aria-selected="false"]').dataset.tab, true); });

  // The «?»: each shows its explanation under it.
  back.addEventListener('click', e => { const h = e.target.closest('.pe-qbtn'); if (!h) return; const p = back.querySelector('#' + h.getAttribute('aria-controls'));
    const open = h.getAttribute('aria-expanded') !== 'true'; h.setAttribute('aria-expanded', String(open)); if (p) p.hidden = !open; });
  // Any change: the summaries and the preview again.
  back.addEventListener('input', e => { if (!e.target.closest('.pe-opts')) { summaries(); schedule(); } });
  back.addEventListener('change', e => { if (!e.target.closest('.pe-opts')) { summaries(); schedule(); } });
  q('.pl-ink').addEventListener('input', () => { q('.pl-ink-own').checked = true; summaries(); });

  // Step one: the kind. Chosen, its fields (and the question, focused); «Cambiar tipo» goes back to the cards.
  // (No «Aplicar» while choosing: a kind is chosen by clicking its card.)
  const step = (two, focus = true) => { q('.pe-step1').hidden = two; q('.pe-step2').hidden = !two; q('.pl-ok').hidden = !two;
    if (!focus) return; if (two) { q('.pl-q').focus(); q('.pl-q').select(); } else (q('.pe-card[aria-pressed="true"]') || q('.pe-card')).focus(); if (two) fit(); };
  q('.pe-step1').addEventListener('click', e => { const c = e.target.closest('.pe-card'); if (!c) return; q('.pl-kind').value = c.dataset.kind; sync(); later(); who(); step(true); });
  q('.pe-change').addEventListener('click', () => step(false));
  q('.pl-kind').addEventListener('change', () => { sync(); later(); who(); });
  sync(); count(); later(); who(); bring();
  if (fresh) step(false); else { q('.pl-q').focus(); }
  q('.modal-close').addEventListener('click', close); q('.pe-cancel').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  q('.pl-ok').addEventListener('click', () => {
    const props = collect(), k = props.kind;
    setPoll(b.id, props);
    // (The teams are the presentation's: all its quizzes.)
    if (k === 'quiz' || k === 'board') { const teams = q('.pl-teams').value.split('\n').map(x => x.trim()).filter(Boolean).slice(0, 8);
      if (JSON.stringify(teams) !== JSON.stringify(state.deck.teams || [])) commit(() => { if (teams.length) state.deck.teams = teams; else delete state.deck.teams; }); }
    applied = true; close();
  });
  q('.pl-clear').addEventListener('click', async () => {
    if (!(await confirmDialog(t('¿Borrar los votos recibidos en esta votación?')))) return;
    clearVotes(b.pollId); setPoll(b.id, {}); count(); if (kind() === 'audio') listen();
  });
  q('.pl-csv').addEventListener('click', () => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + votesCSV(b)], { type: 'text/csv' }));
    a.download = 'votacion.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });
}
