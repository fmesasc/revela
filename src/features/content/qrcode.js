// QR codes made in the app: what a code carries (a link, plain text, Wi-Fi, a contact, an email, an SMS, a phone
// number, a place, a calendar event) and the drawing of the code itself. What a phone's camera reads is not always
// a URL: it is one of a handful of short conventions (WIFI:…, BEGIN:VCARD…), each with its own escaping — a Wi-Fi
// password with a «;» or a «:» inside breaks the code and nothing says so —, so composing them lives here, in one
// place, and is tested (tests/suites/objects.js).
//
// The code goes on the slide as an SVG picture, and that is deliberate: it stays sharp on a projector and on paper
// at any size, weighs a couple of kilobytes, and never passes through imgshrink (which only touches PNG/JPEG/WebP)
// — a QR recompressed as JPEG can stop being readable, and nobody finds out until someone points a phone at it.

import { QRCODE, loadScript } from '../../core/vendor.js';
import { commit, currentSlide, state } from '../../core/store.js';
import { addImage } from '../document/blocks.js';

// Error correction: how much of the code can be dirty, covered or badly printed and still read. M is the usual
// choice; H is what makes a logo in the middle possible, at the price of a denser code.
export const QR_LEVELS = [['L', 'Baja (7 %)'], ['M', 'Media (15 %)'], ['Q', 'Alta (25 %)'], ['H', 'Máxima (30 %)']];
// The quiet margin is 2 and not 0 for a reason worth keeping: measured with a real reader (jsQR) over the codes this
// file produces, one with no margin reads fine on white and stops reading over any other colour — and a slide is
// rarely white. The dialog says so when it is lowered to 0 instead of forbidding it (someone may crop it later).
export const QR_DEFAULTS = { ecc: 'M', margin: 2, dark: '#000000', light: '#ffffff', size: 1024, logo: '', logoSize: 18 };

// The contents, in the order the dialog shows them. `label` and the fields' labels travel in Spanish and are
// translated where they are shown (as the ribbon's own tables do), so they must have a row in i18n/strings.js.
export const QR_KINDS = [
  { id: 'url', icon: 'link', label: 'Enlace', fields: [{ k: 'url', label: 'Dirección', ph: 'revelaslides.com', type: 'text', max: 1800 }] },
  { id: 'text', icon: 'notes', label: 'Texto', fields: [{ k: 'text', label: 'Texto', ph: 'Lo que quieras que aparezca al escanearlo', type: 'area', max: 1200 }] },
  { id: 'wifi', icon: 'wifi', label: 'Wi-Fi', fields: [
    { k: 'ssid', label: 'Nombre de la red (SSID)', ph: 'Aula 3', type: 'text', max: 32 },
    { k: 'pass', label: 'Contraseña', type: 'text', max: 63 },
    { k: 'sec', label: 'Seguridad', type: 'select', opts: [['WPA', 'WPA / WPA2 / WPA3'], ['WEP', 'WEP'], ['nopass', 'Abierta (sin contraseña)']] },
    { k: 'hidden', label: 'Red oculta', type: 'check' }] },
  { id: 'contact', icon: 'person', label: 'Contacto', fields: [
    { k: 'first', label: 'Nombre', type: 'text', max: 60 }, { k: 'last', label: 'Apellidos', type: 'text', max: 60 },
    { k: 'org', label: 'Organización', type: 'text', max: 80 }, { k: 'title', label: 'Cargo', type: 'text', max: 80 },
    { k: 'tel', label: 'Teléfono', type: 'tel', max: 30 }, { k: 'email', label: 'Correo', type: 'email', max: 100 },
    { k: 'url', label: 'Web', type: 'text', max: 200 }, { k: 'addr', label: 'Dirección', type: 'text', max: 150 }] },
  { id: 'email', icon: 'mail', label: 'Correo', fields: [
    { k: 'to', label: 'Para', ph: 'nombre@centro.cat', type: 'email', max: 100 },
    { k: 'subject', label: 'Asunto', type: 'text', max: 150 }, { k: 'body', label: 'Mensaje', type: 'area', max: 600 }] },
  { id: 'sms', icon: 'sms', label: 'SMS', fields: [
    { k: 'tel', label: 'Teléfono', ph: '+34 600 000 000', type: 'tel', max: 30 }, { k: 'text', label: 'Mensaje', type: 'area', max: 300 }] },
  { id: 'tel', icon: 'call', label: 'Teléfono', fields: [{ k: 'tel', label: 'Teléfono', ph: '+34 600 000 000', type: 'tel', max: 30 }] },
  { id: 'geo', icon: 'place', label: 'Ubicación', fields: [
    { k: 'lat', label: 'Latitud', ph: '41.4036', type: 'text', max: 20 }, { k: 'lon', label: 'Longitud', ph: '2.1744', type: 'text', max: 20 },
    { k: 'name', label: 'Nombre del sitio', type: 'text', max: 80 },
    // geo: is the standard and opens the phone's own map app — on Android. iPhones don't register it, so the code
    // would do nothing there, and that is the half of a class one can't afford to lose: a map link is the default.
    { k: 'as', label: 'Al escanearlo', type: 'select', opts: [['link', 'Abrir un mapa (cualquier móvil)'], ['geo', 'Abrir la aplicación de mapas (geo:, solo Android)']] }] },
  { id: 'event', icon: 'event', label: 'Evento', fields: [
    { k: 'summary', label: 'Título', ph: 'Examen de la unidad 3', type: 'text', max: 120 },
    { k: 'start', label: 'Empieza', type: 'datetime-local' }, { k: 'end', label: 'Acaba', type: 'datetime-local' },
    { k: 'place', label: 'Lugar', type: 'text', max: 120 }, { k: 'desc', label: 'Descripción', type: 'area', max: 400 }] },
];
export const qrKind = id => QR_KINDS.find(k => k.id === id) || QR_KINDS[0];

// Wi-Fi and vCard keep their fields apart with «;» and «:», so those characters inside a value are escaped with a
// backslash. (This is the part that breaks silently: the code reads, and gives half the password.)
const escWifi = s => String(s).replace(/([\;,:"])/g, '\\$1');
const escCard = s => String(s).replace(/([\;,])/g, '\\$1').replace(/\r?\n/g, '\\n');
const phone = s => String(s).replace(/[^\d+*#]/g, '');
// «2026-10-14T09:00» → «20261014T090000» (local time, no zone: a class is where it is).
const stamp = s => (/^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(String(s)) ? String(s).slice(0, 16).replace(/[-:]/g, '') + '00' : '');

// What the code will carry, from a kind and its fields. '' when there is nothing worth encoding.
export function qrPayload(kind, f = {}) {
  const v = k => String(f[k] ?? '').trim();
  switch (kind) {
    case 'text': return String(f.text ?? '').trim();
    case 'wifi': {
      if (!v('ssid')) return '';
      const sec = ['WPA', 'WEP', 'nopass'].includes(v('sec')) ? v('sec') : 'WPA';
      return `WIFI:T:${sec};S:${escWifi(v('ssid'))};${sec !== 'nopass' && v('pass') ? `P:${escWifi(v('pass'))};` : ''}${f.hidden ? 'H:true;' : ''};`;
    }
    case 'contact': {
      if (!v('first') && !v('last') && !v('org') && !v('tel') && !v('email')) return '';
      const full = [v('first'), v('last')].filter(Boolean).join(' ');
      return ['BEGIN:VCARD', 'VERSION:3.0', `N:${escCard(v('last'))};${escCard(v('first'))};;;`, `FN:${escCard(full || v('org'))}`,
        v('org') && `ORG:${escCard(v('org'))}`, v('title') && `TITLE:${escCard(v('title'))}`,
        v('tel') && `TEL;TYPE=CELL:${phone(v('tel'))}`, v('email') && `EMAIL;TYPE=INTERNET:${v('email')}`,
        v('url') && `URL:${withScheme(v('url'))}`, v('addr') && `ADR;TYPE=WORK:;;${escCard(v('addr'))};;;;`, 'END:VCARD'].filter(Boolean).join('\n');
    }
    case 'email': {
      if (!v('to')) return '';
      const q = [v('subject') && 'subject=' + encodeURIComponent(v('subject')), v('body') && 'body=' + encodeURIComponent(v('body'))].filter(Boolean);
      return 'mailto:' + v('to') + (q.length ? '?' + q.join('&') : '');
    }
    // SMSTO: is the form Android and iOS both read; the message goes as it is (an escape would be shown literally).
    case 'sms': return phone(v('tel')) ? `SMSTO:${phone(v('tel'))}${v('text') ? ':' + v('text').replace(/\r?\n/g, ' ') : ''}` : '';
    case 'tel': return phone(v('tel')) ? 'tel:' + phone(v('tel')) : '';
    case 'geo': {
      // BOTH coordinates, not «either»: `Number('')` is 0, which is finite, so half a coordinate used to give a
      // perfectly readable code pointing at the Gulf of Guinea. Nothing fails; it just means somewhere else.
      if (!v('lat') || !v('lon')) return '';
      const la = Number(v('lat').replace(',', '.')), lo = Number(v('lon').replace(',', '.'));
      if (!Number.isFinite(la) || !Number.isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) return '';
      const at = `${la},${lo}`;
      return v('as') === 'geo' ? `geo:${at}${v('name') ? `?q=${at}(${encodeURIComponent(v('name'))})` : ''}`
        : `https://www.google.com/maps?q=${at}`;
    }
    case 'event': {
      if (!v('summary')) return '';
      return ['BEGIN:VEVENT', `SUMMARY:${escCard(v('summary'))}`, stamp(v('start')) && `DTSTART:${stamp(v('start'))}`,
        stamp(v('end')) && `DTEND:${stamp(v('end'))}`, v('place') && `LOCATION:${escCard(v('place'))}`,
        v('desc') && `DESCRIPTION:${escCard(v('desc'))}`, 'END:VEVENT'].filter(Boolean).join('\n');
    }
    default: return withScheme(v('url'));
  }
}
// «revelaslides.com» is what people type and copy; a code without a scheme opens as plain text in most cameras.
function withScheme(u) { return u && !/^[a-z][\w+.-]*:/i.test(u) ? 'https://' + u : u; }
const pct = v => { try { return decodeURIComponent(v); } catch { return v; } };

// A code that already exists (or a text pasted) → the kind and fields that compose it, so it can be opened again
// for editing. Only the kinds whose form is unmistakable; anything else is text (and a URL, a link).
export function qrGuess(text) {
  const s = String(text ?? '').trim();
  const m = (re, k) => (re.test(s) ? k : '');
  if (/^WIFI:/i.test(s)) {
    const get = k => { const r = new RegExp(`(?:^|;)${k}:((?:\\\\.|[^;\\\\])*)`, 'i').exec(s); return r ? r[1].replace(/\\(.)/g, '$1') : ''; };
    return { kind: 'wifi', fields: { ssid: get('S'), pass: get('P'), sec: get('T') || 'WPA', hidden: /(?:^|;)H:true/i.test(s) } };
  }
  if (/^BEGIN:VCARD/i.test(s)) {
    const line = k => { const r = new RegExp(`^${k}(?:;[^:\\n]*)?:(.*)$`, 'im').exec(s); return r ? r[1].replace(/\\(.)/g, '$1').trim() : ''; };
    const n = line('N').split(';');
    return { kind: 'contact', fields: { last: n[0] || '', first: n[1] || '', org: line('ORG'), title: line('TITLE'), tel: line('TEL'), email: line('EMAIL'), url: line('URL'), addr: (line('ADR').split(';')[2] || '') } };
  }
  if (/^mailto:/i.test(s)) {
    // Inside a try because what gets here is whatever someone pasted: a lone «%» makes `decodeURIComponent`
    // throw an URIError, and what that looked like was a dialog that doesn't open.
    try {
      const u = new URL(s);
      return { kind: 'email', fields: { to: pct(u.pathname), subject: u.searchParams.get('subject') || '', body: u.searchParams.get('body') || '' } };
    } catch { return { kind: 'text', fields: { text: s } }; }
  }
  if (/^SMSTO:/i.test(s)) { const p = s.slice(6).split(':'); return { kind: 'sms', fields: { tel: p[0] || '', text: p.slice(1).join(':') } }; }
  if (/^tel:/i.test(s)) return { kind: 'tel', fields: { tel: s.slice(4) } };
  if (/^geo:/i.test(s)) { const [la, lo] = s.slice(4).split('?')[0].split(','); return { kind: 'geo', fields: { lat: la || '', lon: lo || '', as: 'geo' } }; }
  if (/^BEGIN:VEVENT/i.test(s)) {
    const line = k => { const r = new RegExp(`^${k}(?:;[^:\\n]*)?:(.*)$`, 'im').exec(s); return r ? r[1].replace(/\\n/gi, '\n').replace(/\\(.)/g, '$1').trim() : ''; };
    const back = d => (/^\d{8}T\d{6}/.test(d) ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T${d.slice(9, 11)}:${d.slice(11, 13)}` : '');
    return { kind: 'event', fields: { summary: line('SUMMARY'), start: back(line('DTSTART')), end: back(line('DTEND')), place: line('LOCATION'), desc: line('DESCRIPTION') } };
  }
  const maps = /^https?:\/\/(?:www\.)?(?:google\.[a-z.]+\/maps|maps\.google\.[a-z.]+)\S*[?&]q=(-?[\d.]+),(-?[\d.]+)/i.exec(s);
  if (maps) return { kind: 'geo', fields: { lat: maps[1], lon: maps[2], as: 'link' } };
  if (m(/^https?:\/\//i, 'url') || /^[\w-]+(\.[\w-]+)+(\/|$)/.test(s)) return { kind: 'url', fields: { url: s } };
  return { kind: 'text', fields: { text: s } };
}

// ---- Drawing -------------------------------------------------------------
// The library is the one already pinned for the sharing links' codes (core/vendor.js), from the CDN the first time
// and from the service worker's cache afterwards.
const lib = () => loadScript(QRCODE, 'QRCode');
const opts = o => ({ errorCorrectionLevel: (o.logo ? 'H' : o.ecc) || QR_DEFAULTS.ecc, margin: Math.max(0, Math.min(8, o.margin ?? QR_DEFAULTS.margin)),
  color: { dark: o.dark || QR_DEFAULTS.dark, light: o.light === 'transparent' ? '#00000000' : o.light || QR_DEFAULTS.light } });

// The code as an SVG string (its viewBox is the modules, margin included: it scales to whatever box it is given).
export async function qrSVG(text, o = {}) {
  const Q = await lib();
  const svg = await new Promise((ok, ko) => Q.toString(String(text), { ...opts(o), type: 'svg' }, (e, s) => (e ? ko(e) : ok(s))));
  return o.logo ? withLogo(svg, o) : svg;
}
export const qrDataURL = svg => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

// A logo in the middle: it works because error correction H rebuilds what it covers, and only up to a point — the
// side is capped at a quarter of the code, with a patch of the light colour behind it so it never touches a module.
function withLogo(svg, o) {
  const n = Number(/viewBox="0 0 (\d+(?:\.\d+)?)/.exec(svg)?.[1]); if (!Number.isFinite(n) || n <= 0) return svg;
  const side = n * Math.max(8, Math.min(25, o.logoSize ?? QR_DEFAULTS.logoSize)) / 100, at = (n - side) / 2, pad = side * 0.12;
  const bg = o.light === 'transparent' ? '#ffffff' : o.light || QR_DEFAULTS.light;
  return svg.replace('</svg>', `<rect x="${at - pad}" y="${at - pad}" width="${side + pad * 2}" height="${side + pad * 2}" fill="${bg}"/>`
    + `<image x="${at}" y="${at}" width="${side}" height="${side}" preserveAspectRatio="xMidYMid meet" href="${o.logo}"/></svg>`);
}

// On a canvas (the dialog's preview and the PNG download), `width` px a side.
export async function qrToCanvas(canvas, text, o = {}, width = 256) {
  const Q = await lib();
  await new Promise((ok, ko) => Q.toCanvas(canvas, String(text), { ...opts(o), width }, e => (e ? ko(e) : ok())));
  if (!o.logo) return canvas;
  const img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ko(new Error('LOGO')); i.src = o.logo; });
  const g = canvas.getContext('2d'), side = canvas.width * Math.max(8, Math.min(25, o.logoSize ?? QR_DEFAULTS.logoSize)) / 100;
  const at = (canvas.width - side) / 2, pad = side * 0.12, r = Math.min(side / img.naturalWidth, side / img.naturalHeight) || 1;
  g.fillStyle = o.light === 'transparent' ? '#ffffff' : o.light || QR_DEFAULTS.light;
  g.fillRect(at - pad, at - pad, side + pad * 2, side + pad * 2);
  g.drawImage(img, at + (side - img.naturalWidth * r) / 2, at + (side - img.naturalHeight * r) / 2, img.naturalWidth * r, img.naturalHeight * r);
  return canvas;
}

// Whether the two colours are far enough apart to be read, and whether they are the right way round: a light code
// on a dark background is valid in the standard and plenty of cameras don't read it.
const lum = c => { const [r, g, b] = (/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(c || '') || []).slice(1).map(h => { const v = parseInt(h, 16) / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return r === undefined ? null : 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export function qrContrast({ dark, light } = {}) {
  const a = lum(dark || QR_DEFAULTS.dark), b = lum(light === 'transparent' ? '#ffffff' : light || QR_DEFAULTS.light);
  if (a === null || b === null) return { ratio: 21, ok: true, inverted: false };
  const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  return { ratio, inverted: a > b, ok: ratio >= 3 && a <= b };
}

// ---- On the slide --------------------------------------------------------
const SIDE = 320;
// The picture, with what it was made from kept beside it (`qr`), so it can be opened and changed later instead of
// being thrown away and done again. (The text itself is inside the code anyway: a Wi-Fi password in a QR is on the
// projector the moment it is shown.)
export function insertQR(spec, svg, alt) {
  const s = state.deck.size || {}, w = s.w || 1280, h = s.h || 720;
  addImage(qrDataURL(svg), { w: SIDE, h: SIDE, x: Math.round((w - SIDE) / 2), y: Math.round((h - SIDE) / 2), alt, qr: spec });
  return currentSlide().blocks.at(-1);
}
export function updateQR(id, spec, svg, alt) {
  commit(() => {
    const b = currentSlide().blocks.find(x => x.id === id); if (!b) return;
    b.src = qrDataURL(svg); b.qr = spec; if (alt) b.alt = alt;
  });
}
