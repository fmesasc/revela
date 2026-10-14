// Insertar ▸ Código QR: a code made here, with what people actually put in one (a link, plain text, the Wi-Fi of
// the room, a contact, an email, an SMS, a phone number, a place, a calendar event) and the options every generator
// has (error correction, quiet margin, the two colours, a logo in the middle, and the size of the PNG).
//
// It takes `moreHTML` and `footHTML` from the dialogs' kit but not its side tabs, and that is on purpose: the code
// has to be in sight WHILE it is being typed —that is the whole point of a preview— and `.dk-tabs` takes the
// dialog's width with a scroll of its own. One kind at a time, in a select, keeps it to one screen on a phone.
//
// What it inserts is a picture (features/content/qrcode.js says why an SVG one), so it needs nothing at all when
// presenting, and it exports to PowerPoint and PDF like any other.

import { moreHTML, footHTML } from './dlgkit.js';
import { QR_KINDS, QR_LEVELS, QR_DEFAULTS, qrKind, qrPayload, qrGuess, qrSVG, qrToCanvas, qrContrast, insertQR, updateQR } from '../../features/content/qrcode.js';
import { showQRBig } from './qr.js';
import { download } from '../../io/files.js';
import { state } from '../../core/store.js';
import { esc } from '../../core/text.js';
import { t } from '../../i18n/index.js';
import { alertDialog } from './dialog.js';

const PNG_SIZES = [256, 512, 1024, 2048];
const short = s => String(s).replace(/^https?:\/\//, '').replace(/\s+/g, ' ').trim().slice(0, 60);
const fileName = s => (s || 'Revela').replace(/[\\/:*?"<>|]+/g, '').trim().slice(0, 60) || 'Revela';

// One field of the form, by its kind.
function fieldHTML(f, v) {
  const label = esc(t(f.label)), ph = f.ph ? ` placeholder="${esc(t(f.ph))}"` : '', max = f.max ? ` maxlength="${f.max}"` : '';
  const val = esc(String(v ?? ''));
  if (f.type === 'area') return `<label class="fr-l">${label}<textarea class="qm-f" data-k="${f.k}" rows="3"${ph}${max}>${val}</textarea></label>`;
  if (f.type === 'check') return `<label class="fr-chk"><input type="checkbox" class="qm-f" data-k="${f.k}"${v ? ' checked' : ''}> ${label}</label>`;
  if (f.type === 'select') return `<label class="fr-l">${label}<select class="qm-f" data-k="${f.k}">${f.opts.map(([o, l]) =>
    `<option value="${esc(o)}"${String(v || f.opts[0][0]) === o ? ' selected' : ''}>${esc(t(l))}</option>`).join('')}</select></label>`;
  return `<label class="fr-l">${label}<input type="${f.type === 'datetime-local' ? 'datetime-local' : f.type === 'email' ? 'email' : f.type === 'tel' ? 'tel' : 'text'}" class="qm-f" data-k="${f.k}" value="${val}"${ph}${max}></label>`;
}

/**
 * The dialog. `block`: an image whose QR is being changed (its `qr` is the starting point, or what its code says).
 * `text`: a starting link (from the sharing dialogs' «Más opciones…»).
 */
export function openQRMaker({ block = null, text = '' } = {}) {
  document.getElementById('qrm-modal')?.remove();
  // Where it starts: what this very code was made from, what its text says, or a plain link.
  const from = block?.qr?.kind ? block.qr : text ? qrGuess(text) : null;
  const datos = {};
  for (const k of QR_KINDS) datos[k.id] = {};
  // `qrKind()` always returns one, so going through its `id` is what discards a `qr.kind` that doesn't exist
  // —a .revela from another version, or edited by hand— instead of leaving `datos[kind]` undefined.
  let kind = from ? qrKind(from.kind).id : 'url';
  if (from?.fields) datos[kind] = { ...from.fields };
  const o = { ...QR_DEFAULTS, ...(block?.qr?.opts || {}) };

  const back = document.createElement('div'); back.id = 'qrm-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;width:min(640px,94vw);max-width:94vw">
    <button class="modal-close">✕</button><h3>${t('Código QR')}</h3>
    <p class="host-help">${t('Se escanea con la cámara del móvil. Entra en la diapositiva como imagen, así que se ve igual al presentar, al exportar y en papel.')}</p>
    <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start">
      <div style="flex:1 1 300px;min-width:0">
        <label class="fr-l">${t('Qué lleva el código')}<select class="qm-kind">${QR_KINDS.map(k =>
          `<option value="${k.id}"${k.id === kind ? ' selected' : ''}>${esc(t(k.label))}</option>`).join('')}</select></label>
        <div class="qm-fields"></div>
      </div>
      <div style="flex:0 0 180px;text-align:center">
        <canvas class="qm-prev" width="180" height="180" role="img" aria-label="${t('Vista previa del código')}" style="background:#fff;border-radius:8px;max-width:100%"></canvas>
        <p class="host-help qm-info" style="margin:6px 0 0"></p>
      </div>
    </div>
    ${moreHTML(`
      <label class="fr-l">${t('Corrección de errores')}<select class="qm-ecc">${QR_LEVELS.map(([v, l]) =>
        `<option value="${v}"${v === o.ecc ? ' selected' : ''}>${esc(t(l))}</option>`).join('')}</select></label>
      <p class="host-help">${t('Cuanto más alta, más se puede ensuciar, tapar o imprimir mal sin dejar de leerse — y más denso sale el código.')}</p>
      <label class="fr-l">${t('Margen blanco (módulos)')}<input type="number" class="qm-margin" min="0" max="8" value="${o.margin}"></label>
      <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center">
        <label class="fr-l" style="flex:0 0 auto">${t('Puntos')}<input type="color" class="qm-dark" value="${esc(o.dark)}"></label>
        <label class="fr-l" style="flex:0 0 auto">${t('Fondo')}<input type="color" class="qm-light" value="${esc(o.light === 'transparent' ? '#ffffff' : o.light)}"></label>
        <label class="fr-chk" style="flex:0 0 auto"><input type="checkbox" class="qm-clear"${o.light === 'transparent' ? ' checked' : ''}> ${t('Fondo transparente')}</label>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:6px 0">
        <button type="button" class="mini2 qm-logo"><i class="ms" aria-hidden="true">add_photo_alternate</i> ${t('Logo en el centro…')}</button>
        <button type="button" class="mini2 qm-logo-off"${o.logo ? '' : ' hidden'}>${t('Quitar el logo')}</button>
        <label class="fr-l qm-logo-size" style="flex:1 1 140px${o.logo ? '' : ';display:none'}">${t('Tamaño del logo')} <input type="range" class="qm-logo-range" min="8" max="25" step="1" value="${o.logoSize}"></label>
      </div>
      <p class="host-help">${t('Con logo, la corrección de errores pasa a la máxima: es lo que permite tapar el centro sin romper el código. Conviene probarlo con el móvil antes de repartirlo.')}</p>
      <label class="fr-l">${t('Tamaño del PNG')}<select class="qm-size">${PNG_SIZES.map(s =>
        `<option value="${s}"${s === o.size ? ' selected' : ''}>${s} × ${s} px</option>`).join('')}</select></label>`)}
    ${footHTML(`<button type="button" class="mini2 qm-big"><i class="ms" aria-hidden="true">fullscreen</i> ${t('Mostrar en grande')}</button>`
      + `<button type="button" class="mini2 qm-png"><i class="ms" aria-hidden="true">download</i> PNG</button>`
      + `<button type="button" class="mini2 qm-svg"><i class="ms" aria-hidden="true">download</i> SVG</button>`
      + `<button type="button" class="fr-do qm-ok">${block ? t('Aplicar') : t('Insertar en la diapositiva')}</button>`)}</div>`;
  document.body.appendChild(back);

  const q = s => back.querySelector(s), close = () => back.remove();
  const opciones = () => ({ ecc: q('.qm-ecc').value, margin: +q('.qm-margin').value, dark: q('.qm-dark').value,
    light: q('.qm-clear').checked ? 'transparent' : q('.qm-light').value, size: +q('.qm-size').value, logo: o.logo, logoSize: +q('.qm-logo-range').value });
  const payload = () => qrPayload(kind, datos[kind]);

  // The form of the kind chosen, keeping what was already typed in each.
  function pintaCampos() {
    q('.qm-fields').innerHTML = qrKind(kind).fields.map(f => fieldHTML(f, datos[kind][f.k])).join('');
    q('.qm-fields').querySelectorAll('.qm-f').forEach(el => {
      const guarda = () => { datos[kind][el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value; pinta(); };
      el.addEventListener('input', guarda); el.addEventListener('change', guarda);
    });
    q('.qm-fields').querySelector('.qm-f')?.focus();
  }

  let pendiente = 0;
  function pinta() {
    clearTimeout(pendiente);
    pendiente = setTimeout(async () => {
      const texto = payload();
      const hay = !!texto, info = q('.qm-info'), prev = q('.qm-prev');
      for (const s of ['.qm-ok', '.qm-png', '.qm-svg', '.qm-big']) q(s).disabled = !hay;
      if (!hay) { prev.getContext('2d').clearRect(0, 0, prev.width, prev.height); info.textContent = t('Rellena los campos y el código aparece aquí.'); return; }
      const op = opciones(), c = qrContrast(op);
      try {
        await qrToCanvas(prev, texto, op, 180);
        // What is worth saying, in this order: what breaks it, then what it holds. The margin's warning is here
        // because it is a trap that the preview itself hides: measured with a real reader (jsQR), a code with no
        // margin reads fine over white —the preview's background— and stops reading the moment it sits on a slide
        // of any other colour, which is where it is going.
        info.textContent = !c.ok
          ? (c.inverted ? t('Los puntos más claros que el fondo: muchas cámaras no leen un código invertido.') : t('Los dos colores se parecen demasiado: el código no se leerá.'))
          : op.margin < 1 ? t('Sin margen alrededor, el código se pega al fondo de la diapositiva y deja de leerse: deja 1 o más.')
          : t('{n} caracteres').replace('{n}', texto.length);
      } catch (e) {
        prev.getContext('2d').clearRect(0, 0, prev.width, prev.height);
        info.textContent = /too big|too long|code length/i.test(e?.message || '') ? t('Demasiado texto para un código QR: acórtalo o usa un enlace.')
          : t('No se pudo crear el código QR: ') + (e?.message || e);
        for (const s of ['.qm-ok', '.qm-png', '.qm-svg', '.qm-big']) q(s).disabled = true;
      }
    }, 160);
  }

  q('.qm-kind').addEventListener('change', e => { kind = e.target.value; pintaCampos(); pinta(); });
  back.querySelectorAll('.qm-ecc, .qm-margin, .qm-dark, .qm-light, .qm-clear, .qm-logo-range, .qm-size').forEach(el => {
    el.addEventListener('input', pinta); el.addEventListener('change', pinta);
  });
  // The logo, made small before it goes in: a photo from a phone inside every copy of the presentation is weight
  // for something that is painted 30 px across.
  q('.qm-logo').addEventListener('click', () => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.addEventListener('change', () => {
      const f = inp.files?.[0]; if (!f || !/^image\//.test(f.type)) return;
      const r = new FileReader();
      r.onload = () => {
        const img = new Image();
        img.onload = () => {
          const k = Math.min(1, 256 / Math.max(img.naturalWidth, img.naturalHeight));
          if (k < 1 && !/svg/.test(f.type)) {
            const cv = document.createElement('canvas'); cv.width = Math.round(img.naturalWidth * k); cv.height = Math.round(img.naturalHeight * k);
            cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
            o.logo = cv.toDataURL('image/png');
          } else o.logo = String(r.result);
          q('.qm-logo-off').hidden = false; q('.qm-logo-size').style.display = ''; pinta();
        };
        img.onerror = () => alertDialog(t('No se pudo leer esa imagen.'));
        img.src = String(r.result);
      };
      r.readAsDataURL(f);
    });
    inp.click();
  });
  q('.qm-logo-off').addEventListener('click', () => { o.logo = ''; q('.qm-logo-off').hidden = true; q('.qm-logo-size').style.display = 'none'; pinta(); });

  const falla = e => alertDialog(t('No se pudo crear el código QR: ') + (e?.message || e));
  const alt = txt => t('Código QR de {link}').replace('{link}', short(txt) || t('Código QR'));
  const nombre = () => fileName(state.deck.name || 'Revela') + ' - QR';

  // What gets downloaded or inserted is composed HERE and not taken from `texto`: the preview runs 160 ms
  // behind, so between the last keystroke and the click that variable can still hold the previous value — and
  // what would come out is a perfectly good code with the old contents, which nobody looks at twice.
  q('.qm-big').addEventListener('click', () => { const txt = payload(); if (txt) showQRBig(txt, state.deck.name || ''); });
  q('.qm-png').addEventListener('click', async () => {
    try {
      const c = document.createElement('canvas'), op = opciones();
      await qrToCanvas(c, payload(), op, op.size);
      const blob = await new Promise(ok => c.toBlob(ok, 'image/png'));
      if (!blob) throw new Error('PNG');
      download(blob, nombre() + '.png');
    } catch (e) { falla(e); }
  });
  q('.qm-svg').addEventListener('click', async () => {
    try { download(new Blob([await qrSVG(payload(), opciones())], { type: 'image/svg+xml' }), nombre() + '.svg'); } catch (e) { falla(e); }
  });
  q('.qm-ok').addEventListener('click', async () => {
    try {
      const opts = opciones(), txt = payload(), svg = await qrSVG(txt, opts);
      const spec = { kind, fields: { ...datos[kind] }, opts };
      if (block) updateQR(block.id, spec, svg, alt(txt)); else insertQR(spec, svg, alt(txt));
      close();
    } catch (e) { falla(e); }
  });
  q('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });

  pintaCampos(); pinta();
  return back;
}
// (A code already on a slide, opened again: its picture is replaced, so its place, size and animations stay.)
export const editQR = block => openQRMaker({ block });
