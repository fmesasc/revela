// Maps that travel (Insertar ▸ Mapa): a list of places — stops — that the presentation flies to one by one, a click
// at a time, while the presenter talks («Madrid → París → Roma»), as Google Earth's projects or a story map do.
// Three looks, all without a key or a fee: a street map (OpenFreeMap's vector styles), the Earth as a globe with
// satellite imagery, and the same imagery flat. The live map is MapLibre GL JS, loaded only when a map is shown
// (io/runtime/geomap.js, the same code in the editor's dialog and in the presentation); here is the model: what a
// map block holds and how it is checked, the line between the stops, the places searched by name, the description
// read out for it, and the steps (animations) that take it from one stop to the next.
//
// block = { type: 'map', look, theme, route, routeColor, terrain, names, labels, showAll, curve, marker, arrive, past,
//           motion, speed, start, pulse, transparent, stops: [{ id, name, note, lon, lat, zoom, pitch, bearing, cc, marker, shot, shotKey }] }
// marker = { kind, color, size, icon }: the map's (every stop's, by default); a stop's own overrides some of it.
// The first stop is where the map starts; every other one is an animation of the map (effect 'mapfly', a.stop: the
// stop's id), so it is a click like any other step of the slide — reordered in the animation pane, played back by
// going back. Each stop keeps a picture of itself (shot): the map as it looks there, for the editor, the thumbnails,
// PDF, pictures and PowerPoint, and for presenting without a connection.

import { state, commit, currentSlide, setSelection } from '../../core/store.js';
import { uid } from '../../core/model.js';
import { animsOf, animEntries, normalizeAnim } from '../animation/transitions.js';
import { t } from '../../i18n/index.js';
import { FLAG_ICONS } from '../../core/vendor.js';
import { iconSVG } from '../../render/svg.js';

// The sources, and the words each one asks to be credited with (shown on the live map and written on its pictures).
// OpenFreeMap: free, no key, commercial use allowed (openfreemap.org); its data © OpenMapTiles, © OpenStreetMap
// contributors (ODbL). The imagery: EOX's Sentinel-2 cloudless 2024 (CC BY-NC-SA 4.0), credited as EOX asks. (Until
// 2026-10-11 the 2016 one, CC BY 4.0; Francisco chose the current one: the maps are a free feature, presentations are
// shared and exported, and Revela's code is open.) The relief: Mapterhorn's open terrain tiles (open data, each
// source's licence allows commercial use with credit). Never tile.openstreetmap.org (its policy forbids this use),
// nor Google's or Esri's imagery (a key, and terms that forbid it).
const OFM = 'https://tiles.openfreemap.org/';
export const MAP_SOURCES = {
  styles: OFM + 'styles/',
  vector: OFM + 'planet',
  glyphs: OFM + 'fonts/{fontstack}/{range}.pbf',
  imagery: 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg',
  terrain: 'https://tiles.mapterhorn.com/{z}/{x}/{y}.webp',
};
const CREDIT_OSM = '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">© OpenMapTiles</a> <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a>';
const CREDIT_EOX = '<a href="https://s2maps.eu" target="_blank" rel="noopener">Sentinel-2 cloudless</a> by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2024) · CC BY-NC-SA 4.0';
const CREDIT_DEM = '<a href="https://mapterhorn.com/attribution" target="_blank" rel="noopener">© Mapterhorn</a>';
// (The same, as plain words, for the pictures.)
export const mapCredit = b => [b.look === 'map' ? 'OpenFreeMap © OpenMapTiles © OpenStreetMap' : 'Sentinel-2 cloudless © EOX IT Services GmbH (Copernicus Sentinel data 2024, CC BY-NC-SA 4.0)' + (b.names !== false ? ' · © OpenStreetMap' : ''),
  ...(b.terrain ? ['© Mapterhorn'] : [])].join(' · ');

// (In one short line, in sight on the live map; the whole credits are behind its ⓘ.)
export const mapCreditShort = b => [b.look === 'map' ? '© OpenStreetMap · OpenFreeMap' : 'EOX Sentinel-2 cloudless 2024 (CC BY-NC-SA)' + (b.names !== false ? ' · © OpenStreetMap' : ''),
  ...(b.terrain ? ['Mapterhorn'] : [])].join(' · ');

// The looks: [id, label, help]; the street map's colours; the line between stops.
export const MAP_LOOKS = [['map', 'Mapa', 'Calles, carreteras y nombres, como un mapa de papel'],
  ['globe', 'Globo 3D', 'La Tierra desde el espacio, con imágenes de satélite: vuela de un continente a otro, como Google Earth'],
  ['satellite', 'Satélite', 'Imágenes de satélite en plano, con los nombres de los lugares']];
export const MAP_THEMES = [['liberty', 'Colores'], ['positron', 'Claro'], ['dark', 'Oscuro'], ['bright', 'Brillante']];
export const MAP_ROUTES = [['none', 'Sin línea'], ['line', 'Recta'], ['arc', 'En arco'], ['geodesic', 'A vuelo de pájaro']];
export const MAP_CURVES = [['1', 'Directo'], ['1.42', 'Normal'], ['2', 'Alejándose mucho']];
const LOOK_IDS = MAP_LOOKS.map(l => l[0]), THEME_IDS = MAP_THEMES.map(l => l[0]), ROUTE_IDS = MAP_ROUTES.map(l => l[0]);
// What the map does while it waits at a stop (none, by default): the globe turning — a flat map, sliding sideways —,
// the camera going round the place, tilted, or nearing it slowly; at what pace. And how the slide starts: at the
// first stop, or flying down to it from the Earth seen from space, or from where the previous slide's map was left —
// a map that carries on from slide to slide (if it was left at that very stop, it simply goes on as it was). (Only in
// the presentation and in the dialog's try-out: the pictures — PDF, PowerPoint, thumbnails — are still; never with
// the system's «reduce motion».)
export const MAP_MOTIONS = [['none', 'Quieto'], ['spin', 'Girar el planeta'], ['orbit', 'Dar vueltas alrededor'], ['drift', 'Acercarse despacio']];
export const MAP_SPEEDS = [['slow', 'Lento'], ['normal', 'Normal'], ['fast', 'Rápido']];
// The globe on the slide itself, without the space around it (transparent): only for the globe — the flat looks fill
// their box.
export const isClear = b => !!(b?.transparent && b.look === 'globe');
export const MAP_STARTS = [['', 'En la primera parada'], ['space', 'Desde el espacio'], ['prev', 'Desde el mapa de la diapositiva anterior']];
// Rings spreading from a marker, as a ripple: the stop arrived at, or every one in sight.
export const MAP_PULSES = [['', 'Sin ondas'], ['cur', 'En la parada actual'], ['all', 'En todas']];
const MOTION_IDS = MAP_MOTIONS.map(l => l[0]);
export const MAX_STOPS = 40;
export const FLY_MS = 3000;

// Markers: what marks each stop — a dot, a pin, a little cloth flag waving (in a colour), the flag of the country it
// is in, its number in the trip, a star, one of Revela's icons, or nothing (just its name). Each drawn as an SVG of
// its own, the same on the live map and on the pictures; the point of the place is where its tip or its middle is.
export const MARKER_KINDS = [['pin', 'Chincheta'], ['dot', 'Punto'], ['flag', 'Bandera'], ['country', 'Bandera del país'], ['number', 'Número'],
  ['star', 'Estrella'], ['icon', 'Icono'], ['none', 'Ninguno']];
export const MARKER_SIZES = [['0.75', 'Pequeño'], ['1', 'Mediano'], ['1.4', 'Grande']];
// How a marker arrives when the map gets to its stop; the ones already visited: as they are, or dimmed.
export const MARKER_ARRIVALS = [['drop', 'Cae y rebota'], ['grow', 'Crece'], ['none', 'Sin animación']];
export const MARKER_ICONS = ['home', 'building-2', 'school', 'hospital', 'mountain', 'tree-pine', 'waves', 'sun', 'plane', 'train-front', 'bus', 'ship', 'car', 'bike',
  'utensils', 'coffee', 'camera', 'music', 'book-open', 'graduation-cap', 'heart', 'star', 'flag', 'trophy', 'globe'];
const KIND_IDS = MARKER_KINDS.map(k => k[0]);
function cleanMarker(m, whole) {
  const o = m && typeof m === 'object' ? m : {}, out = {};
  if (KIND_IDS.includes(o.kind)) out.kind = o.kind; else if (whole) out.kind = 'pin';
  if (/^#[0-9a-f]{6}$/i.test(o.color || '')) out.color = o.color; else if (whole) out.color = '#e63946';
  if (o.size != null || whole) out.size = round(num(o.size, 0.5, 2, 1), 2);
  if (/^[a-z0-9-]{1,40}$/.test(o.icon || '')) out.icon = o.icon;
  if (!whole && out.size === 1 && o.size == null) delete out.size;
  return out;
}
// A stop's marker: its own choices over the map's.
export const markerOf = (b, s) => ({ kind: 'pin', color: '#e63946', size: 1, ...(b?.marker || {}), ...(s?.marker || {}) });
const iconInner = name => { const svg = iconSVG({ icon: name, color: '#fff' }); return svg.slice(svg.indexOf('>') + 1, svg.lastIndexOf('</svg>')); };
export const hasMarkerIcon = name => !!iconInner(name);
// → { svg | flag (an image's address), w, h, ax, ay (where the place is, as fractions of it) } or null (none).
export function markerArt(m, n = 1, cc = '') {
  const k = m.size || 1, C = m.color || '#e63946', W = v => Math.round(v * k);
  const svg = (w, h, body, ax = 0.5, ay = 0.5) => ({ svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${W(w)}" height="${W(h)}" style="overflow:visible">${body}</svg>`, w: W(w), h: W(h), ax, ay });
  const shadow = '<defs><filter id="s" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="1" stdDeviation="1.2" flood-opacity=".45"/></filter></defs>';
  const kind = m.kind === 'country' && !/^[a-z]{2}$/.test(cc) ? 'flag' : m.kind;
  if (kind === 'none') return null;
  if (kind === 'country') return { flag: FLAG_ICONS + cc + '.svg', w: W(30), h: W(22.5), ax: 0.5, ay: 0.5 };
  if (kind === 'dot') return svg(22, 22, `${shadow}<circle cx="11" cy="11" r="8" fill="${C}" stroke="#fff" stroke-width="3" filter="url(#s)"/>`);
  if (kind === 'number') return svg(28, 28, `${shadow}<circle cx="14" cy="14" r="12" fill="${C}" stroke="#fff" stroke-width="2.5" filter="url(#s)"/>`
    + `<text x="14" y="14.5" text-anchor="middle" dominant-baseline="central" font-family="system-ui,sans-serif" font-weight="700" font-size="${n > 9 ? 11 : 13}" fill="#fff">${n}</text>`);
  if (kind === 'star') return svg(32, 32, `${shadow}<path d="M16 2.5l4.1 8.6 9.4 1.2-6.9 6.5 1.8 9.3L16 23.6l-8.4 4.5 1.8-9.3-6.9-6.5 9.4-1.2z" fill="${C}" stroke="#fff" stroke-width="2" stroke-linejoin="round" filter="url(#s)"/>`);
  if (kind === 'icon') return svg(32, 32, `${shadow}<circle cx="16" cy="16" r="14" fill="${C}" stroke="#fff" stroke-width="2" filter="url(#s)"/>`
    + `<g transform="translate(7 7) scale(.75)" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${iconInner(m.icon || 'star') || iconInner('star')}</g>`);
  if (kind === 'flag') {
    // (A flag of cloth on its pole, waving: two shapes of the cloth, in turn — SMIL, so a picture taken of it is its first.)
    const a = 'M5 4 C11 1 17 7 23 4 S29 3 29 3 V17 C23 20 17 14 11 17 S5 18 5 18 Z', b2 = 'M5 4 C11 7 17 1 23 4 S29 5 29 5 V19 C23 16 17 22 11 19 S5 17 5 18 Z';
    return svg(32, 38, `${shadow}<path d="${a}" fill="${C}" stroke="#fff" stroke-width="1.2" filter="url(#s)"><animate attributeName="d" dur="1.6s" repeatCount="indefinite" values="${a};${b2};${a}"/></path>`
      + `<rect x="3" y="2" width="2.6" height="35" rx="1.3" fill="#3b3f46" stroke="#fff" stroke-width=".8"/><circle cx="4.3" cy="37" r="1.6" fill="#3b3f46"/>`, 4.3 / 32, 1);
  }
  // pin (the default): a teardrop with a white eye.
  return svg(28, 38, `${shadow}<path d="M14 36.5C14 36.5 3 22.5 3 14a11 11 0 0 1 22 0c0 8.5-11 22.5-11 22.5z" fill="${C}" stroke="#fff" stroke-width="2" filter="url(#s)"/><circle cx="14" cy="14" r="4.5" fill="#fff"/>`, 0.5, 1);
}

const num = (v, lo, hi, d) => { const n = +v; return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
const str = (v, n) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
const round = (v, k = 5) => +(+v).toFixed(k);
const wrapLon = lon => { let x = ((+lon + 180) % 360 + 360) % 360 - 180; if (x === -180 && +lon > 0) x = 180; return x; };
const SHOT = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

// A stop, checked: numbers in their range, words of a sensible length, its picture only an embedded image.
export function cleanStop(s) {
  const o = s && typeof s === 'object' ? s : {};
  const out = { id: /^[\w-]{1,24}$/.test(o.id || '') ? o.id : uid(), name: str(o.name, 120), lon: round(wrapLon(num(o.lon, -1e4, 1e4, 0))), lat: round(num(o.lat, -85, 85, 0)),
    zoom: round(num(o.zoom, 0, 20, 4), 2), pitch: round(num(o.pitch, 0, 85, 0), 1), bearing: round(num(o.bearing, -180, 180, 0), 1) };
  const note = str(o.note, 500); if (note) out.note = note;
  if (/^[a-z]{2}$/i.test(o.cc || '')) out.cc = o.cc.toLowerCase();
  const mk = cleanMarker(o.marker, false); if (Object.keys(mk).length) out.marker = mk;
  if (typeof o.shot === 'string' && SHOT.test(o.shot.slice(0, 64)) && SHOT.test(o.shot)) { out.shot = o.shot; if (typeof o.shotKey === 'string') out.shotKey = o.shotKey.slice(0, 4000); }
  return out;
}
// A map block's own values, checked (a file, a co-editor or a paste can't put anything else in it: features/document/
// sanitize.js); the rest of the object — box, animations, alt text — is the editor's as for any object. In place.
export function normalizeMap(b) {
  if (!b || typeof b !== 'object') return b;
  b.look = LOOK_IDS.includes(b.look) ? b.look : 'map';
  if (b.theme != null) b.theme = THEME_IDS.includes(b.theme) ? b.theme : 'liberty';
  b.route = ROUTE_IDS.includes(b.route) ? b.route : 'line';
  b.routeColor = /^#[0-9a-f]{6}$/i.test(b.routeColor || '') ? b.routeColor : '#e63946';
  for (const k of ['terrain', 'showAll', 'transparent']) { if (b[k]) b[k] = true; else delete b[k]; }
  for (const k of ['names', 'labels']) { if (b[k] === false) b[k] = false; else delete b[k]; }
  if (b.curve != null) b.curve = round(num(b.curve, 1, 3, 1.42), 2);
  b.marker = cleanMarker(b.marker, true);
  b.arrive = MARKER_ARRIVALS.some(a => a[0] === b.arrive) ? b.arrive : 'drop';
  if (b.past === 'dim') b.past = 'dim'; else delete b.past;
  if (!MOTION_IDS.includes(b.motion) || b.motion === 'none') delete b.motion;
  if (b.speed !== 'slow' && b.speed !== 'fast') delete b.speed;
  if (b.start !== 'space' && b.start !== 'prev') delete b.start;
  if (b.pulse !== 'cur' && b.pulse !== 'all') delete b.pulse;
  b.stops = (Array.isArray(b.stops) ? b.stops : []).slice(0, MAX_STOPS).map(cleanStop);
  const seen = new Set(); for (const s of b.stops) { while (seen.has(s.id)) s.id = uid(); seen.add(s.id); }
  return b;
}

// A new map, in the middle of the slide (16:9). Its stops come from the dialog.
export function mapBlock(props = {}) {
  const { w, h } = state.deck.size, bw = Math.round(Math.min(960, w * 0.75)), bh = Math.round(bw * 9 / 16);
  return normalizeMap({ id: uid(), type: 'map', look: 'map', route: 'line', routeColor: '#e63946', stops: [],
    x: Math.round((w - bw) / 2), y: Math.round((h - bh) / 2), w: bw, h: bh, rotation: 0, animation: null, ...props });
}
// Inserted and selected (Insertar ▸ Mapa); → the block.
export function addMap(props = {}) {
  const b = mapBlock(props);
  commit(() => { currentSlide().blocks.push(b); setSelection(b.id); });
  return currentSlide().blocks.find(x => x.id === b.id);
}

// What a screen reader says (and the alt text PowerPoint gets): «Mapa: Madrid → París → Roma».
export const mapAlt = b => {
  const names = (b?.stops || []).map(s => s.name).filter(Boolean);
  return t('Mapa') + (names.length ? ': ' + names.join(' → ') : '');
};

// The map's settings (and stops) applied, as one change: the alt text follows the stops unless the author wrote
// their own; each stop after the first is one step of the slide (syncSteps).
export function setMap(id, props) {
  const s = state.deck.slides.find(x => x.blocks.some(b => b.id === id)), b = s?.blocks.find(x => x.id === id);
  if (!b || b.type !== 'map') return null;
  commit(() => {
    const autoAlt = !b.alt || b.alt === mapAlt(b), { flyMs, ...rest } = props;
    Object.assign(b, rest); normalizeMap(b);
    if (autoAlt) b.alt = mapAlt(b);
    syncSteps(b, s, flyMs);
  });
  return b;
}

// One 'mapfly' step for each stop after the first. The steps that are still there keep their place among the slide's
// animations (and their timing); one for a new stop goes after the others; the stops are given to the steps in their
// order, so reordering the stops reorders the flights. dur: a new flight time for all of them.
export function syncSteps(b, slide, dur = null) {
  const want = b.stops.slice(1).map(x => x.id);
  let list = animsOf(b);
  const flights = list.filter(a => a.effect === 'mapfly');
  // (Too many: the last ones go; a stop that is now the first has no flight.)
  const keep = flights.slice(0, want.length), drop = new Set(flights.slice(want.length));
  list = list.filter(a => !drop.has(a));
  const top = Math.max(0, ...animEntries(slide).map(e => e.a.seq ?? e.k));
  for (let i = keep.length; i < want.length; i++) {
    const a = { effect: 'mapfly', order: 0, seq: top + 1 + i, start: 'click', duration: dur || FLY_MS, delay: 0 };
    keep.push(a); list.push(a);
  }
  // (In the order they play: the first flight to the second stop, and so on.)
  keep.sort((x, y) => (x.seq ?? 0) - (y.seq ?? 0)).forEach((a, i) => { a.stop = want[i]; if (dur) a.duration = dur; });
  b.animation = list[0] || null;
  if (list.length > 1) b.anims = list.slice(1); else delete b.anims;
  normalizeAnim(slide);
}
// Which stop a step flies to (its index), or -1.
export const stopIndex = (b, a) => (a?.effect === 'mapfly' ? (b.stops || []).findIndex(s => s.id === a.stop) : -1);

// The line between two stops, as points (lon, lat): straight on the map (Mercator), a curve bulging to one side, or
// the shortest way round the Earth (a great circle: what a plane flies). Longitudes run on past ±180° so the line
// doesn't cross the whole map when it goes over the date line.
const RAD = Math.PI / 180;
const merc = ([lon, lat]) => [lon, Math.log(Math.tan(Math.PI / 4 + Math.max(-85, Math.min(85, lat)) * RAD / 2)) / RAD];
const unmerc = ([x, y]) => [x, (2 * Math.atan(Math.exp(y * RAD)) - Math.PI / 2) / RAD];
export function routeSegment(a, b, kind = 'line', n = 48) {
  let bl = b[0]; while (bl - a[0] > 180) bl -= 360; while (bl - a[0] < -180) bl += 360;
  const out = [];
  if (kind === 'geodesic') {
    const v = ([lon, lat]) => [Math.cos(lat * RAD) * Math.cos(lon * RAD), Math.cos(lat * RAD) * Math.sin(lon * RAD), Math.sin(lat * RAD)];
    const p = v(a), q = v([bl, b[1]]), d = Math.acos(Math.max(-1, Math.min(1, p[0] * q[0] + p[1] * q[1] + p[2] * q[2])));
    let prev = a[0];
    for (let i = 0; i <= n; i++) {
      const f = i / n, A = d ? Math.sin((1 - f) * d) / Math.sin(d) : 1 - f, B = d ? Math.sin(f * d) / Math.sin(d) : f;
      const x = A * p[0] + B * q[0], y = A * p[1] + B * q[1], z = A * p[2] + B * q[2];
      let lon = Math.atan2(y, x) / RAD; const lat = Math.atan2(z, Math.hypot(x, y)) / RAD;
      while (lon - prev > 180) lon -= 360; while (lon - prev < -180) lon += 360; prev = lon;
      out.push([round(lon), round(lat)]);
    }
    return out;
  }
  const A = merc(a), B = merc([bl, b[1]]), dx = B[0] - A[0], dy = B[1] - A[1];
  // (The arc bulges a fifth of its length, to the north — or the east, for a line going straight north–south.)
  let nx = -dy, ny = dx; if (ny < 0 || (ny === 0 && nx < 0)) { nx = -nx; ny = -ny; }
  const C = [(A[0] + B[0]) / 2 + nx * 0.2, (A[1] + B[1]) / 2 + ny * 0.2];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const P = kind === 'arc' ? [(1 - f) ** 2 * A[0] + 2 * (1 - f) * f * C[0] + f * f * B[0], (1 - f) ** 2 * A[1] + 2 * (1 - f) * f * C[1] + f * f * B[1]]
      : [A[0] + dx * f, A[1] + dy * f];
    const [lon, lat] = unmerc(P); out.push([round(lon), round(lat)]);
  }
  return out;
}
export const routeSegments = b => (b.route === 'none' ? [] : (b.stops || []).slice(1).map((s, i) => routeSegment([b.stops[i].lon, b.stops[i].lat], [s.lon, s.lat], b.route)));

// The map's style for MapLibre: OpenFreeMap's (by its address), or the imagery with OpenFreeMap's borders and
// place names over it (a style of our own: the satellite and the globe).
function imageryStyle(b) {
  const label = (id, cls, minzoom, maxzoom, size) => ({ id, type: 'symbol', source: 'ofm', 'source-layer': 'place', minzoom, maxzoom, filter: ['==', ['get', 'class'], cls],
    layout: { 'text-field': ['coalesce', ['get', 'name:latin'], ['get', 'name']], 'text-font': ['Noto Sans Regular'], 'text-size': size, 'text-max-width': 8 },
    paint: { 'text-color': '#ffffff', 'text-halo-color': 'rgba(0,0,0,.8)', 'text-halo-width': 1.4 } });
  const names = b.names === false ? [] : [
    { id: 'rv-borders', type: 'line', source: 'ofm', 'source-layer': 'boundary', filter: ['all', ['<=', ['get', 'admin_level'], 4], ['!=', ['get', 'maritime'], 1]],
      paint: { 'line-color': 'rgba(255,255,255,.6)', 'line-width': ['interpolate', ['linear'], ['zoom'], 2, 0.6, 8, 1.6], 'line-dasharray': [3, 2] } },
    label('rv-village', 'village', 11, 24, 12), label('rv-town', 'town', 8, 24, 13), label('rv-city', 'city', 4, 24, ['interpolate', ['linear'], ['zoom'], 4, 12, 10, 17]),
    label('rv-state', 'state', 5, 8, 12), label('rv-country', 'country', 1, 7, ['interpolate', ['linear'], ['zoom'], 1, 11, 6, 16])];
  return { version: 8, glyphs: MAP_SOURCES.glyphs,
    sources: { sat: { type: 'raster', tiles: [MAP_SOURCES.imagery], tileSize: 256, maxzoom: 14, attribution: CREDIT_EOX },
      ...(names.length && { ofm: { type: 'vector', url: MAP_SOURCES.vector, attribution: CREDIT_OSM } }) },
    layers: [{ id: 'rv-bg', type: 'background', paint: { 'background-color': '#0b1d33' } }, { id: 'rv-sat', type: 'raster', source: 'sat' }, ...names] };
}
// What the presentation's map needs (io/runtime/geomap.js): all of it data, the stops and their lines already
// worked out. lang: the deck's language (the place names in it, where the map has them).
export function mapConfig(b, lang = 'es') {
  const stops = b.stops || [];
  return { w: b.w, h: b.h, look: b.look, proj: b.look === 'globe' ? 'globe' : 'mercator',
    style: b.look === 'map' ? MAP_SOURCES.styles + (b.theme || 'liberty') : imageryStyle(b),
    ...(b.terrain && { dem: { type: 'raster-dem', tiles: [MAP_SOURCES.terrain], tileSize: 512, encoding: 'terrarium', maxzoom: 14, attribution: CREDIT_DEM } }),
    lang: String(lang || 'es').split('-')[0].toLowerCase().replace(/[^a-z]/g, '').slice(0, 3) || 'es',
    color: b.routeColor || '#e63946', route: b.route || 'line', labels: b.labels !== false, all: !!b.showAll, curve: b.curve || 1.42,
    arrive: b.arrive || 'drop', dim: b.past === 'dim',
    ...(b.motion && { motion: b.motion, speed: { slow: 0.5, fast: 2 }[b.speed] || 1 }), ...(b.start && { start: b.start }), ...(isClear(b) && { clear: true }), ...(b.pulse && { pulse: b.pulse }),
    stops: stops.map((s, i) => ({ n: s.name || '', ...(s.note && { t: s.note }), c: [s.lon, s.lat], z: s.zoom, p: s.pitch || 0, b: s.bearing || 0, m: markerArt(markerOf(b, s), i + 1, s.cc), col: markerOf(b, s).color })),
    segs: routeSegments(b), credit: mapCredit(b), short: mapCreditShort(b) };
}
// What a stop's picture shows (when it changes, the picture is taken again): the map's look, its size, the line and
// the markers up to that stop (all of them, if they show from the start), and the stop's own view and note.
export function shotKey(b, i, lang = 'es') {
  const s = b.stops[i]; if (!s) return '';
  const upTo = b.showAll ? b.stops : b.stops.slice(0, i + 1);
  return JSON.stringify([b.look, b.theme || '', b.route, b.routeColor, !!b.terrain, b.names !== false, b.labels !== false, !!b.showAll, b.past || '', Math.round(b.w), Math.round(b.h), lang,
    upTo.map(x => [x.name, x.lon, x.lat, markerOf(b, x), x.cc || '']), i, s.zoom, s.pitch, s.bearing, s.note || '', ...(isClear(b) ? ['clear'] : [])]);
}
// Stops whose picture is missing or out of date.
export const staleShots = (b, lang) => (b.stops || []).map((s, i) => (s.shot && s.shotKey === shotKey(b, i, lang) ? -1 : i)).filter(i => i >= 0);

// The zoom that shows a place whole (its bounding box: south, north, west, east) in a map of w × h.
export function zoomForBox([s, n, w, e], bw = 960, bh = 540) {
  const lon = Math.max(1e-4, Math.abs(e - w)), lat = Math.max(1e-4, Math.abs(merc([0, n])[1] - merc([0, s])[1]));
  const z = Math.min(Math.log2(bw * 0.6 * 360 / (lon * 512)), Math.log2(bh * 0.6 * 360 / (lat * 512)));
  return round(Math.max(1.5, Math.min(16, z)), 2);
}

// Places by name: OpenStreetMap's Nominatim, as its usage policy asks (operations.osmfoundation.org/policies/
// nominatim): only when the person searches (no search as one types), at most one request a second, the page's
// address sent as the referrer (a browser can't set its User-Agent), and the answers kept — here for the session and
// in this browser for a month. (geocoder.fetch: the tests answer without the network.)
export const geocoder = { url: 'https://nominatim.openstreetmap.org/search', fetch: (u, o) => fetch(u, o) };
const GEO_KEY = 'revela.geocode.v1', GEO_DAYS = 30, GEO_MAX = 200;
const memo = new Map();
let lastAsk = 0, queue = Promise.resolve();
const stored = () => { try { return JSON.parse(localStorage.getItem(GEO_KEY) || '{}') || {}; } catch { return {}; } };
function keep(key, list) {
  memo.set(key, list);
  try {
    const all = stored(); all[key] = { at: Date.now(), list };
    const keys = Object.keys(all).sort((a, c) => all[c].at - all[a].at).slice(0, GEO_MAX);
    localStorage.setItem(GEO_KEY, JSON.stringify(Object.fromEntries(keys.map(k => [k, all[k]]))));
  } catch {}
}
// → [{ name, label, lon, lat, zoom }] (the best first). Throws if the service can't be reached.
export function geocode(query, { lang = 'es', w = 960, h = 540 } = {}) {
  const q = str(query, 200); if (q.length < 2) return Promise.resolve([]);
  const key = lang + '|' + q.toLowerCase();
  if (memo.has(key)) return Promise.resolve(memo.get(key));
  const old = stored()[key]; if (old && Date.now() - old.at < GEO_DAYS * 864e5) { memo.set(key, old.list); return Promise.resolve(old.list); }
  const run = queue.then(async () => {
    const wait = lastAsk + 1100 - Date.now(); if (wait > 0) await new Promise(r => setTimeout(r, wait));
    lastAsk = Date.now();
    const u = `${geocoder.url}?format=jsonv2&limit=6&addressdetails=1&q=${encodeURIComponent(q)}&accept-language=${encodeURIComponent(lang)}`;
    const r = await geocoder.fetch(u, { referrerPolicy: 'strict-origin-when-cross-origin', headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error('Nominatim ' + r.status);
    const list = (await r.json() || []).filter(x => Number.isFinite(+x.lat) && Number.isFinite(+x.lon)).map(x => {
      const box = (x.boundingbox || []).map(Number);
      return { name: str(x.name || String(x.display_name || '').split(',')[0], 120), label: str(x.display_name, 300), lon: round(+x.lon), lat: round(+x.lat),
        zoom: box.length === 4 && box.every(Number.isFinite) ? zoomForBox(box, w, h) : 10,
        ...(/^[a-z]{2}$/i.test(x.address?.country_code || '') && { cc: x.address.country_code.toLowerCase() }) };
    });
    keep(key, list);
    return list;
  });
  queue = run.catch(() => {});
  return run;
}
// (For the tests: forget the answers kept.)
export const clearGeocodeCache = () => { memo.clear(); lastAsk = 0; try { localStorage.removeItem(GEO_KEY); } catch {} };

// What the editor and the thumbnails show: the first stop's picture, or — no stops yet, or no picture — a drawing of
// a map with the names of its stops. (An element per stop picture, for the animation preview.)
export const mapSig = b => JSON.stringify([b.look, b.w, b.h, (b.stops || []).map(s => [s.id, s.name, (s.shot || '').length, (s.shot || '').slice(-24)])]);
const escH = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function mapPreviewHTML(b) {
  const first = (b.stops || [])[0];
  if (first?.shot) return `<img class="map-shot" src="${first.shot}" alt="" draggable="false" style="width:100%;height:100%;object-fit:cover;display:block">`;
  const dark = b.look !== 'map' || b.theme === 'dark', names = (b.stops || []).map(s => s.name).filter(Boolean);
  return `<div class="map-ph" style="width:100%;height:100%;display:grid;place-items:center;text-align:center;overflow:hidden;font:600 28px/1.3 system-ui,sans-serif;`
    + `color:${dark ? '#e8eef6' : '#29435c'};background:${dark ? 'radial-gradient(circle at 50% 45%,#1f5a8a 0,#0b1d33 70%)' : 'repeating-linear-gradient(35deg,#dfe9d8 0 40px,#e7efe1 40px 80px),#e3ecdc'}">`
    + `<div><div style="font-size:72px;line-height:1">🗺️</div><div>${escH(t('Mapa'))}</div>`
    + `<div style="font-weight:400;font-size:22px;opacity:.85;max-width:90%;margin:6px auto 0">${names.length ? escH(names.join(' → ')) : escH(t('Doble clic para añadir lugares'))}</div></div></div>`;
}
