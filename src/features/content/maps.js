// Map charts (Excel/PowerPoint's "Filled map"): countries of the world, or
// Spain's autonomous communities or provinces, coloured by a value. The outlines
// come once from free data on jsDelivr — world-atlas (Natural Earth, public
// domain) and es-atlas (IGN, CC BY 4.0) — and are kept inside the chart,
// projected and simplified, so the presentation works without a connection.
// Each region carries the names it can be written with (in Spanish, English and
// the interface's language, and its codes), so the data can say "Alemania",
// "Germany" or "DE".

import { currentLang } from '../../i18n/index.js';

export const MAP_SCOPES = [['world', 'Países del mundo'], ['spain', 'Comunidades autónomas de España'], ['provinces', 'Provincias de España']];
const SOURCES = {
  world: { url: 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json', object: 'countries', credit: 'Natural Earth (dominio público)' },
  spain: { url: 'https://cdn.jsdelivr.net/npm/es-atlas@0.6.0/es/autonomous_regions.json', object: 'autonomous_regions', credit: 'IGN · es-atlas (CC BY 4.0)' },
  provinces: { url: 'https://cdn.jsdelivr.net/npm/es-atlas@0.6.0/es/provinces.json', object: 'provinces', credit: 'IGN · es-atlas (CC BY 4.0)' },
};
// ISO 3166-1 numeric → alpha-2, for the countries in world-atlas (from Debian's iso-codes).
const NUM2A2 = Object.fromEntries('4:AF,8:AL,10:AQ,12:DZ,24:AO,31:AZ,32:AR,36:AU,40:AT,44:BS,50:BD,51:AM,56:BE,64:BT,68:BO,70:BA,72:BW,76:BR,84:BZ,90:SB,96:BN,100:BG,104:MM,108:BI,112:BY,116:KH,120:CM,124:CA,140:CF,144:LK,148:TD,152:CL,156:CN,158:TW,170:CO,178:CG,180:CD,188:CR,191:HR,192:CU,196:CY,203:CZ,204:BJ,208:DK,214:DO,218:EC,222:SV,226:GQ,231:ET,232:ER,233:EE,238:FK,242:FJ,246:FI,250:FR,260:TF,262:DJ,266:GA,268:GE,270:GM,275:PS,276:DE,288:GH,300:GR,304:GL,320:GT,324:GN,328:GY,332:HT,340:HN,348:HU,352:IS,356:IN,360:ID,364:IR,368:IQ,372:IE,376:IL,380:IT,384:CI,388:JM,392:JP,398:KZ,400:JO,404:KE,408:KP,410:KR,414:KW,417:KG,418:LA,422:LB,426:LS,428:LV,430:LR,434:LY,440:LT,442:LU,450:MG,454:MW,458:MY,466:ML,478:MR,484:MX,496:MN,498:MD,499:ME,504:MA,508:MZ,512:OM,516:NA,524:NP,528:NL,540:NC,548:VU,554:NZ,558:NI,562:NE,566:NG,578:NO,586:PK,591:PA,598:PG,600:PY,604:PE,608:PH,616:PL,620:PT,624:GW,626:TL,630:PR,634:QA,642:RO,643:RU,646:RW,682:SA,686:SN,688:RS,694:SL,703:SK,704:VN,705:SI,706:SO,710:ZA,716:ZW,724:ES,728:SS,729:SD,732:EH,740:SR,748:SZ,752:SE,756:CH,760:SY,762:TJ,764:TH,768:TG,780:TT,784:AE,788:TN,792:TR,795:TM,800:UG,804:UA,807:MK,818:EG,826:GB,834:TZ,840:US,854:BF,858:UY,860:UZ,862:VE,887:YE,894:ZM'.split(',').map(p => p.split(':')));
const EXTRA = { Kosovo: 'XK' };

// TopoJSON (quantized, delta-encoded arcs) → the rings of each geometry, in lon/lat.
function decode(topo, name) {
  const [sx, sy] = topo.transform?.scale || [1, 1], [tx, ty] = topo.transform?.translate || [0, 0];
  const arcs = topo.arcs.map(a => { let x = 0, y = 0; return a.map(([dx, dy]) => { x += dx; y += dy; return [x * sx + tx, y * sy + ty]; }); });
  const arc = i => (i < 0 ? arcs[~i].slice().reverse() : arcs[i]);
  const ring = ids => ids.flatMap((i, k) => (k ? arc(i).slice(1) : arc(i)));
  return topo.objects[name].geometries.map(g => ({ id: g.id, name: g.properties?.name || '',
    rings: g.type === 'Polygon' ? g.arcs.map(ring) : g.type === 'MultiPolygon' ? g.arcs.flatMap(p => p.map(ring)) : [] }));
}
// Projections into the chart's box: the world flat (equirectangular, without
// Antarctica); Spain with its longitudes narrowed as at 40° N, and the Canary
// Islands in a box at the bottom left, as maps of Spain show them.
const CANARY = new Set(['05', '35', '38']);
function project(scope, geos) {
  const W = 1000;
  if (scope === 'world') {
    const H = Math.round(W * 142 / 360), P = ([lon, lat]) => [(lon + 180) / 360 * W, (84 - Math.max(-58, lat)) / 142 * H];
    // A ring across the 180° meridian (Russia, Fiji…) is kept on one side, so it doesn't streak across the map.
    const whole = r => { if (!r.some((p, i) => i && Math.abs(p[0] - r[i - 1][0]) > 180)) return r;
      const east = r.filter(p => p[0] > 0).length >= r.length / 2; return r.map(([lon, lat]) => [east && lon < 0 ? lon + 360 : !east && lon > 0 ? lon - 360 : lon, lat]); };
    return { w: W, h: H, geos: geos.filter(g => String(+g.id) !== '10').map(g => ({ ...g, pts: g.rings.map(r => whole(r).map(P)) })) };     // (without Antarctica)
  }
  const k = Math.cos(40 * Math.PI / 180), x0 = -9.8, y1 = 44.2, x1 = 4.6, y0 = 34.3;          // (with the Canaries moved in)
  const s = W / ((x1 - x0) * k), H = Math.round((y1 - y0) * s);
  const P = can => ([lon, lat]) => { if (can) { lon += 8.4; lat += 6.9; } return [(lon - x0) * k * s, (y1 - lat) * s]; };
  return { w: W, h: H, inset: [0, (y1 - 36.9) * s, (-4.6 - x0) * k * s, H], geos: geos.map(g => ({ ...g, pts: g.rings.map(r => r.map(P(CANARY.has(String(g.id))))) })) };
}
const pathOf = rings => rings.map(r => { const out = []; let last = '';
  for (const [x, y] of r) { const p = x.toFixed(0) + ' ' + y.toFixed(0); if (p !== last) out.push(p); last = p; }
  return out.length > 2 ? 'M' + out.join('L') + 'Z' : ''; }).join('');

const cache = new Map();
// (For the tests: forget what was downloaded, so a test's own outlines are the ones used.)
export const clearMapCache = () => cache.clear();
export async function loadMap(scope) {
  if (cache.has(scope)) return cache.get(scope);
  const src = SOURCES[scope]; if (!src) throw new Error('mapa desconocido');
  const r = await fetch(src.url); if (!r.ok) throw new Error('mapa ' + r.status);
  const { w, h, inset, geos } = project(scope, decode(await r.json(), src.object));
  const langs = [...new Set([currentLang(), 'es', 'en'])], names = code => langs.map(l => { try { return new Intl.DisplayNames([l], { type: 'region' }).of(code); } catch { return ''; } });
  const regions = geos.map(g => {
    const a2 = scope === 'world' ? NUM2A2[String(+g.id)] || EXTRA[g.name] : '';
    const n = [...new Set([...(a2 ? names(a2) : []), g.name, ...(a2 ? [a2] : []), ...(scope !== 'world' && g.id ? [String(g.id)] : [])].filter(Boolean))];
    return { k: a2 || String(g.id || g.name), n, d: pathOf(g.pts) };
  }).filter(x => x.d);
  const map = { scope, vb: [w, h], ...(inset && { inset: inset.map(v => Math.round(v)) }), regions, credit: src.credit };
  cache.set(scope, map);
  return map;
}
// Sample data to start with, in each map.
export const MAP_SAMPLES = {
  world: [['España', 48], ['Francia', 68], ['Alemania', 84], ['Italia', 59], ['Portugal', 10], ['México', 129], ['Argentina', 46], ['Brasil', 216]],
  spain: [['Andalucía', 8.6], ['Cataluña', 8], ['Comunidad de Madrid', 7], ['Comunitat Valenciana', 5.3], ['Galicia', 2.7], ['Castilla y León', 2.4], ['País Vasco', 2.2], ['Canarias', 2.2]],
  provinces: [['Madrid', 7], ['Barcelona', 5.8], ['Valencia', 2.6], ['Sevilla', 1.9], ['Alicante', 1.9], ['Málaga', 1.7]],
};
