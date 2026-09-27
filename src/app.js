/* Revela — editor visual de presentaciones con 3D sobre reveal.js.
 * MVP en JavaScript puro, sin dependencias que compilar.
 *
 * Modelo de datos:
 *   proyecto = { v, w, h, slides: [ { id, bloques: [ bloque ] } ] }
 *   bloque   = { id, tipo:'texto'|'modelo', x,y,w,h, ...contenido }
 *     texto  -> { html }
 *     modelo -> { src (data URL o URL), autorotate }
 * Coordenadas en el mismo sistema que la diapositiva (1024x576), 1:1 con la
 * salida reveal.js, para no arrastrar factores de escala.
 */
'use strict';

const W = 1024, H = 576;                 // tamano de la diapositiva
const CLAVE = 'revela:proyecto';         // guardado local
const CDN_REVEAL = 'https://cdn.jsdelivr.net/npm/reveal.js@5.1.0';
const CDN_MV = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js';

const uid = () => Math.random().toString(36).slice(2, 9);

let proyecto = cargar() || nuevoProyecto();
let actual = 0;          // indice de la diapositiva en edicion
let sel = null;          // id del bloque seleccionado

const $ = (s, r = document) => r.querySelector(s);
const escenario = $('#escenario');
const tiras = $('#tiras');

function nuevoProyecto() {
  return { v: 1, w: W, h: H, slides: [ { id: uid(), bloques: [
    { id: uid(), tipo: 'texto', x: 90, y: 200, w: 840, h: 160,
      html: '<b>Revela</b><br><span style="font-size:20px;color:#9aa3b2">'
        + 'Presentaciones con 3D en vivo — doble clic para editar</span>' }
  ] } ] };
}

/* ---------------------------------------------------------------- guardado */
function guardarLocal() { try { localStorage.setItem(CLAVE, JSON.stringify(proyecto)); } catch (e) {} }
function cargar() { try { return JSON.parse(localStorage.getItem(CLAVE)); } catch (e) { return null; } }

/* --------------------------------------------------------------- utilidades */
function slide() { return proyecto.slides[actual]; }
function bloquePorId(id) { return slide().bloques.find(b => b.id === id); }

/* ------------------------------------------------------------- render bloque */
function crearElementoBloque(b, interactivo = true) {
  const el = document.createElement('div');
  el.className = 'bloque';
  el.dataset.id = b.id;
  el.style.left = b.x + 'px'; el.style.top = b.y + 'px';
  el.style.width = b.w + 'px'; el.style.height = b.h + 'px';

  if (b.tipo === 'texto') {
    const t = document.createElement('div');
    t.className = 'txt';
    t.innerHTML = b.html || '';
    el.appendChild(t);
  } else if (b.tipo === 'modelo') {
    const mv = document.createElement('model-viewer');
    mv.setAttribute('src', b.src || '');
    mv.setAttribute('camera-controls', '');
    if (b.autorotate !== false) mv.setAttribute('auto-rotate', '');
    mv.setAttribute('shadow-intensity', '1');
    mv.setAttribute('interaction-prompt', 'none');
    el.appendChild(mv);
  }

  if (interactivo) {
    const x = document.createElement('button'); x.className = 'quitar'; x.textContent = '×';
    x.title = 'Borrar bloque';
    x.addEventListener('pointerdown', e => e.stopPropagation());
    x.addEventListener('click', e => { e.stopPropagation(); borrarBloque(b.id); });
    const h = document.createElement('div'); h.className = 'tirador'; h.title = 'Redimensionar';
    el.append(x, h);
    conectarInteraccion(el, b, h);
  }
  return el;
}

function pintarEscenario() {
  escenario.innerHTML = '';
  for (const b of slide().bloques) {
    const el = crearElementoBloque(b, true);
    if (b.id === sel) el.classList.add('sel');
    escenario.appendChild(el);
  }
  pintarTiras();
  guardarLocal();
}

/* --------------------------------------------------------------- miniaturas */
function pintarTiras() {
  tiras.innerHTML = '';
  proyecto.slides.forEach((s, i) => {
    const mini = document.createElement('div');
    mini.className = 'mini' + (i === actual ? ' activa' : '');
    const num = document.createElement('span'); num.className = 'num'; num.textContent = i + 1;
    const cont = document.createElement('div'); cont.className = 'cont';
    cont.style.width = W + 'px'; cont.style.height = H + 'px';
    // escala la miniatura al ancho real de la tira
    const escala = 174 / W;
    cont.style.transform = `scale(${escala})`;
    for (const b of s.bloques) cont.appendChild(crearElementoBloque(b, false));
    const del = document.createElement('button'); del.className = 'borrar'; del.textContent = '×';
    del.title = 'Borrar diapositiva';
    del.addEventListener('click', e => { e.stopPropagation(); borrarDiapo(i); });
    mini.append(num, cont, del);
    mini.addEventListener('click', () => { actual = i; sel = null; pintarEscenario(); });
    tiras.appendChild(mini);
  });
}

/* ----------------------------------------------------- arrastrar y redimensionar */
function conectarInteraccion(el, b, tirador) {
  // Seleccionar + arrastrar
  el.addEventListener('pointerdown', ev => {
    if (ev.target.isContentEditable) return;          // editando texto: no arrastrar
    sel = b.id;
    document.querySelectorAll('.bloque.sel').forEach(n => n.classList.remove('sel'));
    el.classList.add('sel');
    const r = escenario.getBoundingClientRect();
    const factor = W / r.width;                       // pantalla -> coords diapositiva
    const px = ev.clientX, py = ev.clientY, bx = b.x, by = b.y;
    el.setPointerCapture(ev.pointerId);
    el.classList.add('arrastrando');
    const mover = e => {
      b.x = Math.round(bx + (e.clientX - px) * factor);
      b.y = Math.round(by + (e.clientY - py) * factor);
      el.style.left = b.x + 'px'; el.style.top = b.y + 'px';
    };
    const soltar = e => {
      el.releasePointerCapture(ev.pointerId);
      el.classList.remove('arrastrando');
      el.removeEventListener('pointermove', mover);
      el.removeEventListener('pointerup', soltar);
      pintarTiras(); guardarLocal();
    };
    el.addEventListener('pointermove', mover);
    el.addEventListener('pointerup', soltar);
    ev.stopPropagation();
  });

  // Editar texto con doble clic
  if (b.tipo === 'texto') {
    const t = el.querySelector('.txt');
    el.addEventListener('dblclick', () => {
      t.contentEditable = 'true'; t.focus();
      document.execCommand && document.execCommand('selectAll', false, null);
    });
    t.addEventListener('blur', () => {
      t.contentEditable = 'false'; b.html = t.innerHTML; pintarTiras(); guardarLocal();
    });
  }

  // Redimensionar
  tirador.addEventListener('pointerdown', ev => {
    ev.stopPropagation();
    const r = escenario.getBoundingClientRect();
    const factor = W / r.width;
    const px = ev.clientX, py = ev.clientY, bw = b.w, bh = b.h;
    tirador.setPointerCapture(ev.pointerId);
    const mover = e => {
      b.w = Math.max(40, Math.round(bw + (e.clientX - px) * factor));
      b.h = Math.max(24, Math.round(bh + (e.clientY - py) * factor));
      el.style.width = b.w + 'px'; el.style.height = b.h + 'px';
    };
    const soltar = () => {
      tirador.releasePointerCapture(ev.pointerId);
      tirador.removeEventListener('pointermove', mover);
      tirador.removeEventListener('pointerup', soltar);
      pintarTiras(); guardarLocal();
    };
    tirador.addEventListener('pointermove', mover);
    tirador.addEventListener('pointerup', soltar);
  });
}

/* --------------------------------------------------------------- acciones */
function nuevaDiapo() {
  proyecto.slides.splice(actual + 1, 0, { id: uid(), bloques: [] });
  actual++; sel = null; pintarEscenario();
}
function borrarDiapo(i) {
  if (proyecto.slides.length === 1) { proyecto.slides[0].bloques = []; }
  else { proyecto.slides.splice(i, 1); }
  actual = Math.max(0, Math.min(actual, proyecto.slides.length - 1));
  sel = null; pintarEscenario();
}
function addTexto() {
  const b = { id: uid(), tipo: 'texto', x: 120, y: 240, w: 640, h: 120,
    html: 'Texto nuevo' };
  slide().bloques.push(b); sel = b.id; pintarEscenario();
}
function addModeloDesde(src) {
  const b = { id: uid(), tipo: 'modelo', x: 312, y: 108, w: 400, h: 360,
    src, autorotate: true };
  slide().bloques.push(b); sel = b.id; pintarEscenario();
}
function borrarBloque(id) {
  const s = slide(); s.bloques = s.bloques.filter(b => b.id !== id);
  if (sel === id) sel = null; pintarEscenario();
}

/* --------------------------------------------- generar la presentacion reveal.js */
function estilo(b) { return `left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;position:absolute;`; }

function slideHTML(s) {
  const bloques = s.bloques.map(b => {
    if (b.tipo === 'texto')
      return `<div style="${estilo(b)}">${b.html || ''}</div>`;
    if (b.tipo === 'modelo')
      return `<model-viewer src="${b.src}" camera-controls ${b.autorotate !== false ? 'auto-rotate' : ''}`
        + ` shadow-intensity="1" style="${estilo(b)}"></model-viewer>`;
    return '';
  }).join('\n');
  return `<section><div class="lienzo">${bloques}</div></section>`;
}

function documentoReveal() {
  const secciones = proyecto.slides.map(slideHTML).join('\n');
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Presentación — Revela</title>
<link rel="stylesheet" href="${CDN_REVEAL}/dist/reveal.css">
<link rel="stylesheet" href="${CDN_REVEAL}/dist/theme/black.css">
<script type="module" src="${CDN_MV}"></script>
<style>
  .reveal .lienzo{position:relative;width:${W}px;height:${H}px;margin:0 auto}
  .reveal .lienzo>div{overflow-wrap:anywhere}
  .reveal model-viewer{--poster-color:transparent;background:transparent}
  .reveal section{height:100%}
</style></head>
<body>
<div class="reveal"><div class="slides">
${secciones}
</div></div>
<script src="${CDN_REVEAL}/dist/reveal.js"></script>
<script>
  Reveal.initialize({ width: ${W}, height: ${H}, margin: 0.04,
    controls: true, progress: true, hash: true, transition: 'slide' });
</script>
</body></html>`;
}

function presentar() {
  const w = window.open('', '_blank');
  if (!w) { alert('El navegador bloqueó la ventana. Permite las ventanas emergentes.'); return; }
  w.document.write(documentoReveal()); w.document.close();
}
function exportar() {
  const blob = new Blob([documentoReveal()], { type: 'text/html' });
  descargar(blob, 'presentacion.html');
}
function descargar(blob, nombre) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = nombre; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ------------------------------------------------------- proyecto json */
function guardarProyecto() {
  descargar(new Blob([JSON.stringify(proyecto, null, 2)], { type: 'application/json' }), 'proyecto.revela.json');
}
function abrirProyecto(file) {
  const r = new FileReader();
  r.onload = () => { try { proyecto = JSON.parse(r.result); actual = 0; sel = null; pintarEscenario(); }
    catch (e) { alert('No es un proyecto válido.'); } };
  r.readAsText(file);
}

/* --------------------------------------------------------------- eventos */
document.addEventListener('click', e => {
  const acc = e.target.closest('[data-accion]')?.dataset.accion;
  if (!acc) return;
  ({
    'nueva-diapo': nuevaDiapo,
    'add-texto': addTexto,
    'add-modelo': () => $('#file-modelo').click(),
    'presentar': presentar,
    'exportar': exportar,
    'guardar': guardarProyecto,
    'abrir': () => $('#file-proyecto').click(),
  })[acc]?.();
});

$('#file-modelo').addEventListener('change', e => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => addModeloDesde(r.result);   // data URL -> autonomo al exportar
  r.readAsDataURL(f);
  e.target.value = '';
});
$('#file-proyecto').addEventListener('change', e => {
  const f = e.target.files[0]; if (f) abrirProyecto(f); e.target.value = '';
});

// Clic en zona vacia deselecciona; Supr borra el bloque seleccionado
escenario.addEventListener('pointerdown', e => { if (e.target === escenario) { sel = null; pintarEscenario(); } });
document.addEventListener('keydown', e => {
  if ((e.key === 'Delete' || e.key === 'Backspace') && sel &&
      !document.activeElement?.isContentEditable) { borrarBloque(sel); }
});

pintarEscenario();
