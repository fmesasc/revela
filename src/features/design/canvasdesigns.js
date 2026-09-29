// Ready-made pictures for the canvas (canvas mode): big vector designs, sharp
// at any zoom, drawn here (no files, no network). Each has a route of stops
// ("stops", in its own coordinates) where frames can go.

const W = 4800, H = 2700;
// Deterministic pseudo-random numbers, so a design is always the same.
const rng = seed => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const svg = body => 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${body}</svg>`)));
const route = pts => pts.map((p, i) => (i ? `S${(pts[i - 1][0] + p[0]) / 2} ${p[1] - 60} ${p[0]} ${p[1]}` : `M${p[0]} ${p[1]}`)).join(' ');

function mountain() {
  const r = rng(7), stops = [[620, 2250], [1500, 1850], [2350, 1500], [3150, 1080], [3900, 620]];
  let peaks = '';
  for (let i = 0; i < 9; i++) { const x = i * 620 - 200, hgt = 900 + r() * 900; peaks += `<path d="M${x} ${H} L${x + 520} ${H - hgt} L${x + 1100} ${H}Z" fill="#${['5b7a99', '4d6a88', '6c8aa6'][i % 3]}" opacity=".9"/>`; }
  const snow = `<path d="M3480 520 L3900 120 L4320 520 L4120 470 L3900 560 L3700 470Z" fill="#fff"/>`;
  return { stops, src: svg(`<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#87c5f0"/><stop offset="1" stop-color="#e8f4fb"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#s)"/><circle cx="700" cy="420" r="210" fill="#ffd66b"/>${peaks}
    <path d="M3000 ${H} L3900 140 L4800 ${H}Z" fill="#3e5a78"/>${snow}
    <path d="M0 2400 C1200 2150 2400 2600 4800 2300 L4800 ${H} L0 ${H}Z" fill="#5d9c59"/>
    <path d="${route(stops)}" fill="none" stroke="#fff" stroke-width="22" stroke-dasharray="60 46" stroke-linecap="round" opacity=".95"/>
    ${stops.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="46" fill="#e8590c" stroke="#fff" stroke-width="14"/>`).join('')}
    <path d="M3900 620 L3900 330 L4080 390 L3900 450" fill="#e03131" stroke="#7a1f1f" stroke-width="10"/>`) };
}

function treasure() {
  const r = rng(11), stops = [[700, 1900], [1600, 900], [2500, 1700], [3350, 800], [4150, 1800]];
  const islands = stops.map(([x, y], i) => { const rx = 420 + r() * 180, ry = 300 + r() * 120;
    return `<ellipse cx="${x}" cy="${y}" rx="${rx + 70}" ry="${ry + 70}" fill="#e9d8a6" opacity=".55"/><ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#c9a86a"/>
      <ellipse cx="${x - 60}" cy="${y - 40}" rx="${rx * 0.55}" ry="${ry * 0.5}" fill="#8cae68"/>${i === stops.length - 1 ? `<path d="M${x - 90} ${y - 90} l180 180 M${x + 90} ${y - 90} l-180 180" stroke="#b02a2a" stroke-width="34" stroke-linecap="round"/>` : ''}`; }).join('');
  let waves = ''; for (let i = 0; i < 70; i++) { const x = r() * W, y = r() * H; waves += `<path d="M${x} ${y} q40 -30 80 0 q40 30 80 0" fill="none" stroke="#5b8fb3" stroke-width="10" opacity=".45"/>`; }
  return { stops, src: svg(`<rect width="${W}" height="${H}" fill="#2f6f95"/><rect x="60" y="60" width="${W - 120}" height="${H - 120}" fill="none" stroke="#e9d8a6" stroke-width="18" stroke-dasharray="40 30"/>
    ${waves}${islands}<path d="${route(stops)}" fill="none" stroke="#6b3e1e" stroke-width="20" stroke-dasharray="44 40" stroke-linecap="round"/>
    <g transform="translate(4350 330)"><circle r="190" fill="#e9d8a6" stroke="#6b3e1e" stroke-width="12"/><path d="M0 -170 L36 0 L0 170 L-36 0Z" fill="#b02a2a"/><text y="-200" text-anchor="middle" font-size="90" font-family="serif" fill="#e9d8a6">N</text></g>`) };
}

function space() {
  const r = rng(23), stops = [[800, 1500], [1700, 800], [2600, 1600], [3500, 900], [4200, 1850]];
  let stars = ''; for (let i = 0; i < 420; i++) stars += `<circle cx="${(r() * W).toFixed(0)}" cy="${(r() * H).toFixed(0)}" r="${(r() * 5 + 1).toFixed(1)}" fill="#fff" opacity="${(0.3 + r() * 0.7).toFixed(2)}"/>`;
  const col = ['#f08c00', '#4dabf7', '#e64980', '#51cf66', '#ffd43b'];
  const planets = stops.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${260 + (i % 3) * 60}" fill="${col[i]}" opacity=".9"/><circle cx="${x - 70}" cy="${y - 80}" r="${120 + (i % 2) * 40}" fill="#fff" opacity=".12"/>`
    + (i === 2 ? `<ellipse cx="${x}" cy="${y}" rx="520" ry="110" fill="none" stroke="#ffe8a3" stroke-width="26" opacity=".8"/>` : '')).join('');
  return { stops, src: svg(`<defs><radialGradient id="g" cx=".3" cy=".3" r="1"><stop offset="0" stop-color="#1b2a55"/><stop offset="1" stop-color="#05060f"/></radialGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/>${stars}<path d="${route(stops)}" fill="none" stroke="#9ec5fe" stroke-width="14" stroke-dasharray="30 40" opacity=".7"/>${planets}`) };
}

function mindmap() {
  const c = [2400, 1350], stops = [c, [1150, 650], [3650, 650], [3650, 2050], [1150, 2050]], col = ['#1c7ed6', '#2f9e44', '#e8590c', '#ae3ec9'];
  const branches = stops.slice(1).map(([x, y], i) => `<path d="M${c[0]} ${c[1]} C${(c[0] + x) / 2} ${c[1]} ${(c[0] + x) / 2} ${y} ${x} ${y}" fill="none" stroke="${col[i]}" stroke-width="40" stroke-linecap="round" opacity=".7"/>
    <ellipse cx="${x}" cy="${y}" rx="700" ry="420" fill="${col[i]}" opacity=".16"/><ellipse cx="${x}" cy="${y}" rx="700" ry="420" fill="none" stroke="${col[i]}" stroke-width="14"/>`).join('');
  return { stops, src: svg(`<rect width="${W}" height="${H}" fill="#f8f9fb"/><g opacity=".5">${Array.from({ length: 49 }, (_, i) => `<line x1="${i * 100}" y1="0" x2="${i * 100}" y2="${H}" stroke="#e3e7ee" stroke-width="4"/>`).join('')}</g>
    ${branches}<ellipse cx="${c[0]}" cy="${c[1]}" rx="760" ry="460" fill="#fff" stroke="#343a40" stroke-width="18"/>`) };
}

export const CANVAS_DESIGNS = { mountain: ['Montaña', mountain], treasure: ['Mapa del tesoro', treasure], space: ['Espacio', space], mindmap: ['Mapa mental', mindmap] };
export const canvasDesign = key => CANVAS_DESIGNS[key]?.[1]() || null;
