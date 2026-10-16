// The map's editor (Insertar ▸ Mapa, double click on a map, Mapa ▸ Editar): the places it flies to while presenting,
// found by name or taken from where the map is looking, in order; how it looks (map, globe, satellite), how each
// place is marked and the line between them; and the map itself, live, to move round, tilt and turn — what it shows
// is what the presentation shows; what it does at each stop (turn, go round, near) and how the slide starts.
// «Probar el recorrido» flies through the stops here. Applying takes a picture of
// each stop that changed (features/content/geomap.js: for the editor, the exports and presenting offline).

import { esc } from '../../core/text.js';
import { state, commit, amend } from '../../core/store.js';
import { MAPLIBRE, MAPLIBRE_RTL } from '../../core/vendor.js';
import { whileBusy } from '../../core/busy.js';
import * as G from '../../features/content/geomap.js';
import { animsOf } from '../../features/animation/transitions.js';
import { deckTag } from '../../features/document/proofing.js';
import { geoMapRuntime } from '../../io/runtime/geomap.js';
import { t, currentLang } from '../../i18n/index.js';
import { toast } from '../shell/toast.js';

let runtime = null;
const rt = () => (runtime ||= geoMapRuntime(MAPLIBRE, MAPLIBRE_RTL, { offline: t('Sin conexión: el mapa no se puede cargar') }));
const lang = () => deckTag(state.deck, currentLang()).split('-')[0];
const SETTINGS = ['look', 'theme', 'route', 'routeColor', 'terrain', 'names', 'labels', 'showAll', 'curve', 'marker', 'arrive', 'past', 'motion', 'speed', 'start', 'pulse', 'transparent'];
const pick = b => Object.fromEntries(SETTINGS.filter(k => b[k] !== undefined).map(k => [k, structuredClone(b[k])]));
// (A little picture of each look, for choosing: drawn here, nothing to download.)
const LOOK_ART = {
  map: '<svg viewBox="0 0 96 60" aria-hidden="true"><rect width="96" height="60" fill="#e9efe3"/><path d="M0 40 C20 34 30 48 52 40 S80 30 96 36 V60 H0Z" fill="#a8d3f0"/><path d="M8 0 L30 60 M0 18 H96 M60 0 L54 60" stroke="#fff" stroke-width="4"/><path d="M8 0 L30 60 M0 18 H96" stroke="#f3c26b" stroke-width="2"/><circle cx="58" cy="20" r="5" fill="#e63946" stroke="#fff" stroke-width="2"/></svg>',
  globe: '<svg viewBox="0 0 96 60" aria-hidden="true"><rect width="96" height="60" fill="#05070d"/><circle cx="48" cy="30" r="25" fill="#9cc3ff" opacity=".35"/><circle cx="48" cy="30" r="22" fill="#1d4f7a"/><path d="M34 16 C42 12 50 18 46 26 S36 34 32 28Z M52 30 C60 26 66 34 62 42 S52 46 50 38Z" fill="#5f8a4a"/><path d="M26 30 A22 9 0 0 0 70 30" fill="none" stroke="#fff" stroke-opacity=".35"/></svg>',
  satellite: '<svg viewBox="0 0 96 60" aria-hidden="true"><rect width="96" height="60" fill="#2d4a2b"/><path d="M0 0 H40 C30 20 50 30 30 60 H0Z" fill="#1c3d5a"/><path d="M60 0 C55 15 70 25 64 60 H96 V0Z" fill="#6b6a4a"/><path d="M40 12 H90 M44 36 H96" stroke="#bdb8a8" stroke-width="1.5"/><text x="66" y="30" font-size="8" fill="#fff" font-family="sans-serif">Roma</text></svg>',
};
const artHTML = (m, n = 1, cc = 'es') => { const a = G.markerArt(m, n, cc); return !a ? `<span class="gm-none">Aa</span>` : a.flag ? `<img alt="" src="${esc(a.flag)}" style="width:${a.w}px;height:${a.h}px">` : a.svg; };

export function openMapEditor(b0, { isNew = false } = {}) {
  document.getElementById('map-modal')?.remove();
  const slide = state.deck.slides.find(s => s.blocks.some(x => x.id === b0.id)); if (!slide) return;
  const b = slide.blocks.find(x => x.id === b0.id);
  const d = { ...pick(G.normalizeMap(structuredClone(b))), stops: structuredClone(b.stops || []) };
  d.marker ||= { kind: 'pin', color: '#e63946', size: 1 };
  let flyMs = animsOf(b).find(a => a.effect === 'mapfly')?.duration || G.FLY_MS, open = -1;
  const draft = () => G.normalizeMap({ ...b, ...structuredClone(d), stops: structuredClone(d.stops) });
  const back = document.createElement('div'); back.id = 'map-modal'; back.className = 'modal-backdrop';
  const ratio = b.w / b.h;
  back.innerHTML = `<div class="modal gm-modal">
    <button class="modal-close" aria-label="${t('Cerrar')}">✕</button><h3>${t('Mapa')}</h3>
    <div class="gm-grid">
      <div class="gm-side">
        <form class="gm-search" role="search"><label class="fr-l">${t('Añadir un lugar')}<span class="gm-row"><input type="search" class="gm-q" maxlength="200" placeholder="${t('Ciudad, país, monumento…')}" autocomplete="off"><button type="submit" class="mini2 gm-go"><i class="ms">search</i> ${t('Buscar')}</button></span></label></form>
        <div class="gm-results" role="list" aria-live="polite"></div>
        <button type="button" class="mini2 gm-here"><i class="ms">add_location_alt</i> ${t('Añadir la vista actual como parada')}</button>
        <h4>${t('Paradas')} <small class="gm-count"></small></h4>
        <ol class="gm-stops"></ol>
        <details class="gm-sec dk-more"><summary><i class="ms" aria-hidden="true">expand_more</i>${t('Marcadores')}</summary>
          <div class="gm-kinds" role="radiogroup" aria-label="${t('Marcador')}"></div>
          <div class="gm-row"><label class="fr-l">${t('Color')}<input type="color" class="gm-mcolor"></label>
            <label class="fr-l">${t('Tamaño')}<select class="gm-msize">${G.MARKER_SIZES.map(([v, l]) => `<option value="${v}">${t(l)}</option>`).join('')}</select></label>
            <label class="fr-l gm-iconpick">${t('Icono')}<select class="gm-micon">${G.MARKER_ICONS.map(n => `<option value="${n}">${n}</option>`).join('')}</select></label></div>
          <div class="gm-row"><label class="fr-l">${t('Al llegar')}<select class="gm-arrive">${G.MARKER_ARRIVALS.map(([v, l]) => `<option value="${v}">${t(l)}</option>`).join('')}</select></label>
            <label class="fr-l">${t('Las ya visitadas')}<select class="gm-past"><option value="">${t('Se quedan')}</option><option value="dim">${t('Atenuadas')}</option></select></label></div>
          <label class="fr-l">${t('Ondas')}<select class="gm-pulse">${G.MAP_PULSES.map(([v, l]) => `<option value="${v}">${t(l)}</option>`).join('')}</select></label>
          <label class="fr-chk"><input type="checkbox" class="gm-labels"> ${t('Nombre junto al marcador')}</label>
          <label class="fr-chk"><input type="checkbox" class="gm-all"> ${t('Mostrar todas las paradas desde el principio')}</label>
        </details>
        <details class="gm-sec dk-more"><summary><i class="ms" aria-hidden="true">expand_more</i>${t('Línea y vuelo')}</summary>
          <div class="gm-row"><label class="fr-l">${t('Línea entre paradas')}<select class="gm-route">${G.MAP_ROUTES.map(([v, l]) => `<option value="${v}">${t(l)}</option>`).join('')}</select></label>
            <label class="fr-l">${t('Color')}<input type="color" class="gm-rcolor"></label></div>
          <div class="gm-row"><label class="fr-l">${t('Duración del vuelo (s)')}<input type="number" class="gm-dur" min="0.5" max="12" step="0.5"></label>
            <label class="fr-l">${t('Trayectoria')}<select class="gm-curve">${G.MAP_CURVES.map(([v, l]) => `<option value="${v}">${t(l)}</option>`).join('')}</select></label></div>
          <p class="host-help">${t('La línea se dibuja sola a medida que el mapa vuela a cada parada.')}</p>
        </details>
      </div>
      <div class="gm-main">
        <div class="gm-looks" role="radiogroup" aria-label="${t('Estilo del mapa')}">${G.MAP_LOOKS.map(([v, l, h]) => `<button type="button" role="radio" class="gm-look" data-look="${v}" title="${esc(t(h))}">${LOOK_ART[v]}<span>${t(l)}</span></button>`).join('')}</div>
        <div class="gm-row gm-opts"><label class="fr-l gm-theme">${t('Colores del mapa')}<select class="gm-themesel">${G.MAP_THEMES.map(([v, l]) => `<option value="${v}">${t(l)}</option>`).join('')}</select></label>
          <label class="fr-chk gm-namesw"><input type="checkbox" class="gm-names"> ${t('Nombres de lugares')}</label>
          <label class="fr-chk"><input type="checkbox" class="gm-terrain"> ${t('Relieve 3D')}</label>
          <label class="fr-chk gm-clearw" title="${esc(t('Solo la bola del mundo, sobre el fondo de la diapositiva'))}"><input type="checkbox" class="gm-clear"> ${t('Fondo transparente')}</label></div>
        <div class="gm-view rv-dlg-map" style="aspect-ratio:${ratio.toFixed(4)}"></div>
        <p class="host-help gm-hint">${t('Arrastra para moverte; rueda para acercar; con el botón derecho (o Ctrl) inclina y gira. Luego «Usar la vista actual» en la parada.')}</p>
        <div class="gm-row gm-motion"><label class="fr-l">${t('En cada parada')}<select class="gm-motionsel">${G.MAP_MOTIONS.map(([v, l]) => `<option value="${v}">${t(l)}</option>`).join('')}</select></label>
          <label class="fr-l gm-speedw">${t('Velocidad')}<select class="gm-speed">${G.MAP_SPEEDS.map(([v, l]) => `<option value="${v}">${t(l)}</option>`).join('')}</select></label>
          <label class="fr-l">${t('Al empezar la diapositiva')}<select class="gm-start">${G.MAP_STARTS.map(([v, l]) => `<option value="${v}">${t(l)}</option>`).join('')}</select></label></div>
        <div class="gm-row"><button type="button" class="mini2 gm-play"><i class="ms">play_circle</i> <span>${t('Probar el recorrido')}</span></button><span class="gm-status" aria-live="polite"></span></div>
      </div>
    </div>
    <div class="fr-actions"><span class="host-help gm-credit">${t('Búsqueda de lugares: Nominatim (© OpenStreetMap)')}</span><span><button type="button" class="mini2 gm-cancel">${t('Cancelar')}</button> <button type="button" class="fr-do gm-ok">${t('Aplicar')}</button></span></div></div>`;
  document.body.appendChild(back);
  const q = s => back.querySelector(s), status = msg => { q('.gm-status').textContent = msg || ''; };

  // The live map.
  const view = q('.gm-view');
  const ctl = rt().mount(view, G.mapConfig(draft(), lang()), { interactive: true, keyboard: true, quiet: true });
  // (While it loads, it says so; without a connection, clearly — the stops can still be edited, and the pictures kept.)
  const note = document.createElement('div'); note.className = 'gm-loading'; note.setAttribute('role', 'status'); note.textContent = t('Cargando mapa…'); view.appendChild(note);
  const watch = setInterval(() => {
    if (!back.isConnected || view.classList.contains('rvm-on')) { clearInterval(watch); note.remove(); return; }
    if (view.classList.contains('rvm-offline')) { note.classList.add('gm-fail'); note.textContent = t('No se puede cargar el mapa: comprueba la conexión a internet. Puedes seguir editando las paradas.'); }
  }, 300);
  let timer = 0;
  const refresh = () => { clearTimeout(timer); timer = setTimeout(() => ctl.update(G.mapConfig(draft(), lang())), 120); };
  const here = () => ctl.view() || { lon: 0, lat: 25, zoom: 1.5, pitch: 0, bearing: 0 };

  // Settings ⇄ controls.
  const sync = () => {
    back.querySelectorAll('.gm-look').forEach(x => { const on = x.dataset.look === d.look; x.classList.toggle('on', on); x.setAttribute('aria-checked', on); x.tabIndex = on ? 0 : -1; });
    q('.gm-theme').hidden = d.look !== 'map'; q('.gm-namesw').hidden = d.look === 'map';
    q('.gm-themesel').value = d.theme || 'liberty'; q('.gm-names').checked = d.names !== false; q('.gm-terrain').checked = !!d.terrain;
    q('.gm-mcolor').value = d.marker.color; q('.gm-msize').value = String(d.marker.size || 1); q('.gm-micon').value = d.marker.icon || 'star';
    q('.gm-iconpick').hidden = d.marker.kind !== 'icon';
    q('.gm-arrive').value = d.arrive || 'drop'; q('.gm-past').value = d.past || ''; q('.gm-labels').checked = d.labels !== false; q('.gm-all').checked = !!d.showAll;
    q('.gm-pulse').value = d.pulse || ''; q('.gm-motionsel').value = d.motion || 'none'; q('.gm-speed').value = d.speed || 'normal'; q('.gm-start').value = d.start || '';
    q('.gm-speedw').hidden = !d.motion;
    // (A globe without its space: only the globe; seen here over a checkerboard, as any see-through picture.)
    q('.gm-clearw').hidden = d.look !== 'globe'; q('.gm-clear').checked = !!d.transparent; q('.gm-view').classList.toggle('gm-clearbg', G.isClear(d));
    // (On a flat map the «turning» is a slide sideways: said so.)
    q('.gm-motionsel option[value="spin"]').textContent = t(d.look === 'globe' ? 'Girar el planeta' : 'Desplazarse de lado');
    q('.gm-route').value = d.route; q('.gm-rcolor').value = d.routeColor; q('.gm-dur').value = flyMs / 1000; q('.gm-curve').value = String(d.curve || 1.42);
    const mk = { ...d.marker };
    q('.gm-kinds').innerHTML = G.MARKER_KINDS.map(([v, l]) => `<button type="button" role="radio" class="gm-kind${v === mk.kind ? ' on' : ''}" aria-checked="${v === mk.kind}" tabindex="${v === mk.kind ? 0 : -1}" data-kind="${v}" title="${esc(t(l))}">`
      + `<span class="gm-art">${artHTML({ ...mk, kind: v, size: 0.8 }, 1, d.stops.find(s => s.cc)?.cc || 'es')}</span><span>${esc(t(l))}</span></button>`).join('');
  };
  const set = (fn, again = true) => { fn(); if (again) sync(); refresh(); };
  const radios = (sel, attr, apply) => {
    const box = q(sel);
    box.addEventListener('click', e => { const x = e.target.closest(`[${attr}]`); if (x) set(() => apply(x.getAttribute(attr))); });
    box.addEventListener('keydown', e => {                       // (arrows move the choice, as in any group of radio buttons)
      if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
      const all = [...box.querySelectorAll(`[${attr}]`)], i = all.indexOf(document.activeElement); if (i < 0) return;
      e.preventDefault(); const n = all[(i + (/Right|Down/.test(e.key) ? 1 : all.length - 1)) % all.length];
      set(() => apply(n.getAttribute(attr))); box.querySelector(`[${attr}="${n.getAttribute(attr)}"]`)?.focus();
    });
  };
  radios('.gm-looks', 'data-look', v => { d.look = v; });
  radios('.gm-kinds', 'data-kind', v => { d.marker = { ...d.marker, kind: v }; });
  const on = (sel, ev, fn) => q(sel).addEventListener(ev, e => set(() => fn(e.target), ev === 'change'));
  on('.gm-themesel', 'change', x => { d.theme = x.value; });
  on('.gm-names', 'change', x => { d.names = x.checked ? undefined : false; });
  on('.gm-terrain', 'change', x => { d.terrain = x.checked; });
  on('.gm-clear', 'change', x => { d.transparent = x.checked || undefined; });
  on('.gm-mcolor', 'input', x => { d.marker = { ...d.marker, color: x.value }; });
  q('.gm-mcolor').addEventListener('change', sync);
  on('.gm-msize', 'change', x => { d.marker = { ...d.marker, size: +x.value }; });
  on('.gm-micon', 'change', x => { d.marker = { ...d.marker, icon: x.value }; });
  on('.gm-arrive', 'change', x => { d.arrive = x.value; });
  on('.gm-past', 'change', x => { d.past = x.value || undefined; });
  on('.gm-labels', 'change', x => { d.labels = x.checked ? undefined : false; });
  on('.gm-all', 'change', x => { d.showAll = x.checked; });
  on('.gm-route', 'change', x => { d.route = x.value; });
  on('.gm-pulse', 'change', x => { d.pulse = x.value || undefined; });
  // (A motion chosen: seen here a few seconds, then the map back at its stop. A start: tried at once.)
  let peek = 0;
  const tryMotion = () => {
    clearTimeout(peek); if (playing) return;
    setTimeout(() => { if (!d.motion || playing) return; ctl.moving(true); status(t('Así se mueve en cada parada al presentar.'));
      peek = setTimeout(() => { if (playing) return; ctl.moving(false); ctl.go(ctl.cur, false); status(''); }, 6000); }, 200);
  };
  on('.gm-motionsel', 'change', x => { d.motion = x.value === 'none' ? undefined : x.value; tryMotion(); });
  on('.gm-speed', 'change', x => { d.speed = x.value === 'normal' ? undefined : x.value; tryMotion(); });
  on('.gm-start', 'change', x => {
    d.start = x.value || undefined;
    if (d.start === 'prev') status(t('Al presentar, el mapa sigue desde donde quedó el de la diapositiva anterior y vuela a la primera parada; si quedó en esa misma parada, sigue tal cual.'));
    else if (d.start === 'space' && d.stops.length && !playing) setTimeout(() => { ctl.update(G.mapConfig(draft(), lang())); ctl.begin('space'); status(''); }, 200);
  });
  on('.gm-rcolor', 'input', x => { d.routeColor = x.value; });
  on('.gm-curve', 'change', x => { d.curve = +x.value; });
  q('.gm-dur').addEventListener('change', e => { flyMs = Math.round(Math.min(12, Math.max(0.5, +e.target.value || 3)) * 1000); });

  // The stops.
  const renderStops = () => {
    q('.gm-count').textContent = d.stops.length ? `(${d.stops.length})` : '';
    q('.gm-stops').innerHTML = d.stops.length ? d.stops.map((s, i) => {
      const own = s.marker || {}, mk = G.markerOf(d, s);
      return `<li class="gm-stop${i === open ? ' open' : ''}" data-i="${i}">
      <div class="gm-srow"><span class="gm-art gm-num" aria-hidden="true">${artHTML({ ...mk, size: 0.7 }, i + 1, s.cc || '')}</span>
        <input type="text" class="gm-name" maxlength="120" value="${esc(s.name)}" aria-label="${t('Nombre de la parada {n}').replace('{n}', i + 1)}">
        <button type="button" class="gm-ib" data-a="fly" title="${t('Ver en el mapa')}" aria-label="${t('Ver en el mapa')}"><i class="ms">my_location</i></button>
        <button type="button" class="gm-ib" data-a="up" title="${t('Subir')}" aria-label="${t('Subir')}"${i ? '' : ' disabled'}><i class="ms">arrow_upward</i></button>
        <button type="button" class="gm-ib" data-a="down" title="${t('Bajar')}" aria-label="${t('Bajar')}"${i < d.stops.length - 1 ? '' : ' disabled'}><i class="ms">arrow_downward</i></button>
        <button type="button" class="gm-ib" data-a="more" title="${t('Más opciones')}" aria-label="${t('Más opciones')}" aria-expanded="${i === open}"><i class="ms">tune</i></button>
        <button type="button" class="gm-ib" data-a="del" title="${t('Quitar')}" aria-label="${t('Quitar')}"><i class="ms">close</i></button></div>
      ${i === open ? `<div class="gm-more">
        <button type="button" class="mini2" data-a="view"><i class="ms">center_focus_strong</i> ${t('Usar la vista actual')}</button>
        <label class="fr-l">${t('Nota (aparece al llegar)')}<textarea class="gm-note" rows="2" maxlength="500">${esc(s.note || '')}</textarea></label>
        <div class="gm-row"><label class="fr-l">${t('Zoom')}<input type="number" class="gm-n" data-k="zoom" min="0" max="20" step="0.25" value="${s.zoom}"></label>
          <label class="fr-l">${t('Inclinación (°)')}<input type="number" class="gm-n" data-k="pitch" min="0" max="85" step="5" value="${s.pitch}"></label>
          <label class="fr-l">${t('Giro (°)')}<input type="number" class="gm-n" data-k="bearing" min="-180" max="180" step="5" value="${s.bearing}"></label></div>
        <div class="gm-row"><label class="fr-l">${t('Marcador')}<select class="gm-skind"><option value="">${t('Como el mapa')}</option>${G.MARKER_KINDS.map(([v, l]) => `<option value="${v}"${own.kind === v ? ' selected' : ''}>${t(l)}</option>`).join('')}</select></label>
          <label class="fr-l">${t('Color')}<input type="color" class="gm-scolor" value="${mk.color}"></label>
          ${mk.kind === 'icon' ? `<label class="fr-l">${t('Icono')}<select class="gm-sicon">${G.MARKER_ICONS.map(n => `<option value="${n}"${mk.icon === n ? ' selected' : ''}>${n}</option>`).join('')}</select></label>` : ''}</div>
        ${mk.kind === 'country' && !s.cc ? `<p class="host-help">${t('No se sabe su país: búscalo por su nombre para tener su bandera.')}</p>` : ''}
      </div>` : ''}</li>`; }).join('') : `<li class="gm-empty">${t('Busca un lugar o mueve el mapa y añade la vista actual. Al presentar, cada clic vuela a la siguiente parada.')}</li>`;
  };
  const stopsChanged = () => { renderStops(); refresh(); };
  const fly = i => { if (d.stops[i]) { ctl.cfg = G.mapConfig(draft(), lang()); ctl.update(ctl.cfg); ctl.go(i, true, 1200); } };
  const addStop = s => { d.stops.push(G.cleanStop({ ...s, id: undefined })); open = -1; stopsChanged(); setTimeout(() => fly(d.stops.length - 1), 150); };
  q('.gm-stops').addEventListener('click', e => {
    const btn = e.target.closest('[data-a]'), li = e.target.closest('.gm-stop'); if (!btn || !li) return;
    const i = +li.dataset.i, a = btn.dataset.a, list = d.stops;
    if (a === 'fly') return fly(i);
    if (a === 'up' && i > 0) [list[i - 1], list[i]] = [list[i], list[i - 1]];
    else if (a === 'down' && i < list.length - 1) [list[i + 1], list[i]] = [list[i], list[i + 1]];
    else if (a === 'del') list.splice(i, 1);
    else if (a === 'more') open = open === i ? -1 : i;
    else if (a === 'view') Object.assign(list[i], here());
    if (a === 'up' || a === 'down') open = open === i ? i + (a === 'up' ? -1 : 1) : open;
    if (a === 'del' && open >= list.length) open = -1;
    stopsChanged();
    const at = a === 'up' ? i - 1 : a === 'down' ? i + 1 : i;
    q(`.gm-stop[data-i="${at}"] [data-a="${a}"]`)?.focus() || q(`.gm-stop[data-i="${at}"] .gm-name`)?.focus();
    if (a === 'view') status(t('Parada actualizada con la vista del mapa.'));
  });
  q('.gm-stops').addEventListener('input', e => {
    const li = e.target.closest('.gm-stop'); if (!li) return; const s = d.stops[+li.dataset.i];
    if (e.target.matches('.gm-name')) s.name = e.target.value;
    else if (e.target.matches('.gm-note')) s.note = e.target.value;
    else if (e.target.matches('.gm-n')) s[e.target.dataset.k] = +e.target.value;
    else if (e.target.matches('.gm-scolor')) s.marker = { ...(s.marker || {}), color: e.target.value };
    else return;
    refresh();
  });
  q('.gm-stops').addEventListener('change', e => {
    const li = e.target.closest('.gm-stop'); if (!li) return; const s = d.stops[+li.dataset.i];
    if (e.target.matches('.gm-skind')) { s.marker = { ...(s.marker || {}) }; if (e.target.value) s.marker.kind = e.target.value; else delete s.marker.kind; }
    else if (e.target.matches('.gm-sicon')) s.marker = { ...(s.marker || {}), icon: e.target.value };
    else if (e.target.matches('.gm-n')) { fly(+li.dataset.i); return; }
    else if (!e.target.matches('.gm-scolor')) return;
    stopsChanged();
  });
  // (Alt + arrows on a stop's name: move it up or down, from the keyboard.)
  q('.gm-stops').addEventListener('keydown', e => {
    if (!e.altKey || !['ArrowUp', 'ArrowDown'].includes(e.key) || !e.target.matches('.gm-name')) return;
    e.preventDefault(); q(`.gm-stop[data-i="${e.target.closest('.gm-stop').dataset.i}"] [data-a="${e.key === 'ArrowUp' ? 'up' : 'down'}"]`)?.click();
  });
  q('.gm-here').addEventListener('click', () => addStop({ ...here(), name: t('Parada {n}').replace('{n}', d.stops.length + 1) }));

  // Searching (only when asked: Enter or the button — Nominatim's rules).
  q('.gm-search').addEventListener('submit', async e => {
    e.preventDefault();
    const box = q('.gm-results'), text = q('.gm-q').value.trim(); if (text.length < 2) return;
    box.innerHTML = `<p class="host-help">${t('Buscando…')}</p>`;
    try {
      const list = await G.geocode(text, { lang: lang(), w: b.w, h: b.h });
      box.innerHTML = list.length ? list.map((r, i) => `<button type="button" role="listitem" class="gm-res" data-r="${i}"><i class="ms">add_location</i><span><b>${esc(r.name)}</b><small>${esc(r.label)}</small></span></button>`).join('')
        : `<p class="host-help">${t('No se ha encontrado ningún lugar con ese nombre.')}</p>`;
      box.onclick = ev => { const x = ev.target.closest('[data-r]'); if (!x) return; addStop(list[+x.dataset.r]); box.innerHTML = ''; q('.gm-q').value = ''; q('.gm-q').focus(); };
    } catch { box.innerHTML = `<p class="host-help">${t('No se pudo buscar: comprueba la conexión.')}</p>`; }
  });

  // Trying the trip here: every stop, one after the other. (Each flight once it has landed: it may wait for its
  // tiles first — io/runtime/geomap.js, rehearse().)
  let playing = 0;
  q('.gm-play').addEventListener('click', async () => {
    if (playing) { playing = 0; return; }
    if (d.stops.length < (d.motion || d.start ? 1 : 2)) { status(t('Añade al menos dos paradas.')); return; }
    const me = playing = Date.now(); q('.gm-play span').textContent = t('Detener'); q('.gm-play .ms').textContent = 'stop_circle';
    clearTimeout(peek); ctl.update(G.mapConfig(draft(), lang())); ctl.moving(!!d.motion);
    if (d.start === 'space') await ctl.begin('space'); else ctl.go(0, false);
    // (With a motion, a longer while at each stop, to see it.)
    for (let i = 1; i < d.stops.length && playing === me; i++) { await new Promise(r => setTimeout(r, d.motion ? 3500 : 900)); if (playing !== me) break; await ctl.go(i, true, flyMs); }
    if (d.motion && playing === me) await new Promise(r => setTimeout(r, 3500));
    if (playing === me) playing = 0;
    ctl.moving(false);
    q('.gm-play span').textContent = t('Probar el recorrido'); q('.gm-play .ms').textContent = 'play_circle';
  });

  const close = () => { playing = 0; clearTimeout(timer); clearTimeout(peek); ctl.destroy(); back.remove(); };
  const cancel = () => { close(); if (isNew) commit(() => { const s = state.deck.slides.find(x => x.blocks.some(y => y.id === b.id)); if (s) s.blocks = s.blocks.filter(x => x.id !== b.id); state.ui.selection = null; }); };
  q('.modal-close').addEventListener('click', cancel); q('.gm-cancel').addEventListener('click', cancel);
  back.addEventListener('click', e => { if (e.target === back) cancel(); });
  q('.gm-ok').addEventListener('click', async () => {
    if (!d.stops.length) { q('.gm-q').focus(); status(t('Añade al menos una parada.')); return; }
    q('.gm-ok').disabled = true;
    const props = { ...structuredClone(d), stops: structuredClone(d.stops), flyMs };
    await shoot({ ...b, ...props }, props.stops, (n, all) => status(t('Guardando la imagen de la parada {n} de {all}…').replace('{n}', n).replace('{all}', all)));
    close();
    G.setMap(b.id, props);
  });
  sync(); renderStops();
  if (!d.stops.length) q('.gm-q').focus();
}

// The pictures of the stops that changed (on a map of its own, the block's size, off screen), into `stops`.
// → how many could not be taken (no connection).
async function shoot(block, stops, progress = () => {}) {
  const b = G.normalizeMap(structuredClone({ ...block, stops })), lg = lang(), todo = G.staleShots(b, lg);
  if (!todo.length) return 0;
  const holder = document.createElement('div');
  holder.className = 'rv-dlg-map'; holder.setAttribute('aria-hidden', 'true');
  holder.style.cssText = `position:fixed;left:-20000px;top:0;width:${b.w}px;height:${b.h}px;overflow:hidden;pointer-events:none`;
  document.body.appendChild(holder);
  const ctl = rt().mount(holder, G.mapConfig(b, lg), { interactive: false, capture: true, quiet: true, pixelRatio: Math.max(1, Math.min(2, 1600 / b.w)) });
  let failed = 0;
  try {
    await whileBusy(ctl.ready);
    for (const [n, i] of todo.entries()) {
      progress(n + 1, todo.length);
      const url = ctl.failed ? null : await whileBusy(ctl.capture(i));
      if (url) { stops[i].shot = url; stops[i].shotKey = G.shotKey(b, i, lg); } else failed++;
    }
  } finally { ctl.destroy(); holder.remove(); }
  if (failed) toast(t('No se pudieron guardar las imágenes del mapa (¿sin conexión?): se usarán las anteriores.'), { error: true });
  return failed;
}

// A change of the map's settings from the ribbon (its tab), applied at once; its pictures follow, a moment later,
// in the same step to undo.
let latest = 0;
export async function updateMap(b, props) {
  const nb = G.setMap(b.id, props); if (!nb) return;
  const stops = structuredClone(nb.stops), me = ++latest;
  await shoot(nb, stops);
  if (me !== latest) return;                      // (changed again meanwhile: the newer pictures are the ones kept)
  const s = state.deck.slides.find(x => x.blocks.some(y => y.id === b.id)), cur = s?.blocks.find(x => x.id === b.id); if (!cur) return;
  amend(() => { cur.stops.forEach((x, i) => { if (stops[i]?.id === x.id && stops[i].shot) { x.shot = stops[i].shot; x.shotKey = stops[i].shotKey; } }); });
}
