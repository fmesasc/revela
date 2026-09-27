/* Revela — editor visual de presentaciones con 3D sobre reveal.js.
 * Interfaz tipo OnlyOffice (cinta con pestañas). JavaScript puro.
 *
 * Modelo:
 *   proyecto = { v, w, h, theme, transition, speed, slides:[ slide ] }
 *   slide    = { id, bg, bloques:[ bloque ] }
 *   bloque   = { id, tipo, x,y,w,h, frag?, ...contenido }
 *     texto  -> { html, fs }        modelo -> { src, autorotate }
 *     imagen -> { src }             video  -> { src }
 * Coordenadas 1:1 con la diapositiva (proyecto.w x proyecto.h) para no arrastrar
 * factores de escala hacia reveal.js.
 */
'use strict';

const CLAVE = 'revela:proyecto';
const CDN_REVEAL = 'https://cdn.jsdelivr.net/npm/reveal.js@5.1.0';
const CDN_MV = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js';
const uid = () => Math.random().toString(36).slice(2, 9);

let proyecto = cargar() || nuevoProyecto();
let actual = 0, sel = null;

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const escenario = $('#escenario');
const tiras = $('#tiras');

function nuevoProyecto() {
  return { v: 2, w: 1024, h: 576, theme: 'black', transition: 'slide', speed: 'default',
    slides: [ { id: uid(), bg: '#111111', bloques: [
      { id: uid(), tipo: 'texto', x: 90, y: 200, w: 840, h: 160, fs: 44,
        html: '<b>Revela</b><br><span style="font-size:22px;color:#9aa3b2">'
          + 'Presentaciones con 3D en vivo</span>' } ] } ] };
}
function guardarLocal(){ try{ localStorage.setItem(CLAVE, JSON.stringify(proyecto)); }catch(e){} }
function cargar(){ try{ return JSON.parse(localStorage.getItem(CLAVE)); }catch(e){ return null; } }
function slide(){ return proyecto.slides[actual]; }

/* ------------------------------------------------------------- render bloque */
function crearBloque(b, live = true) {
  const el = document.createElement('div');
  el.className = 'bloque' + (b.frag ? ' frag' : '');
  el.dataset.id = b.id;
  el.style.cssText = `left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px`;

  if (b.tipo === 'texto') {
    const t = document.createElement('div'); t.className = 'txt';
    t.style.fontSize = (b.fs || 28) + 'px';
    t.innerHTML = b.html || '';
    el.appendChild(t);
  } else if (b.tipo === 'modelo') {
    const mv = document.createElement('model-viewer');
    mv.setAttribute('src', b.src || ''); mv.setAttribute('camera-controls', '');
    if (b.autorotate !== false) mv.setAttribute('auto-rotate', '');
    mv.setAttribute('shadow-intensity', '1'); mv.setAttribute('interaction-prompt', 'none');
    el.appendChild(mv);
  } else if (b.tipo === 'imagen') {
    const img = document.createElement('img'); img.src = b.src || ''; img.draggable = false;
    el.appendChild(img);
  } else if (b.tipo === 'video') {
    const v = document.createElement('video'); v.src = b.src || ''; v.controls = true;
    el.appendChild(v);
  }

  if (live) {
    const grip = document.createElement('div'); grip.className = 'tirador';
    grip.style.cssText = 'left:-6px;top:-6px;right:auto;bottom:auto;cursor:move;background:#446995';
    grip.title = 'Mover';
    const x = document.createElement('button'); x.className = 'quitar'; x.textContent = '×'; x.title = 'Borrar';
    x.addEventListener('pointerdown', e => e.stopPropagation());
    x.addEventListener('click', e => { e.stopPropagation(); borrarBloque(b.id); });
    const rz = document.createElement('div'); rz.className = 'tirador'; rz.title = 'Redimensionar';
    el.append(grip, x, rz);
    interaccion(el, b, grip, rz);
  }
  return el;
}

function pintarEscenario() {
  escenario.style.width = proyecto.w + 'px';
  escenario.style.height = proyecto.h + 'px';
  escenario.style.background = slide().bg || '#111';
  escenario.innerHTML = '';
  for (const b of slide().bloques) {
    const el = crearBloque(b, true);
    if (b.id === sel) el.classList.add('sel');
    escenario.appendChild(el);
  }
  pintarTiras();
  $('#contador').textContent = `Diapositiva ${actual + 1} de ${proyecto.slides.length}`;
  guardarLocal();
}

function pintarTiras() {
  tiras.innerHTML = '';
  proyecto.slides.forEach((s, i) => {
    const mini = document.createElement('div');
    mini.className = 'mini' + (i === actual ? ' activa' : '');
    mini.style.background = s.bg || '#111';
    const num = document.createElement('span'); num.className = 'num'; num.textContent = i + 1;
    const cont = document.createElement('div'); cont.className = 'cont';
    cont.style.cssText = `width:${proyecto.w}px;height:${proyecto.h}px;transform:scale(${176 / proyecto.w})`;
    for (const b of s.bloques) cont.appendChild(crearBloque(b, false));
    const del = document.createElement('button'); del.className = 'borrar'; del.textContent = '×';
    del.title = 'Borrar diapositiva';
    del.addEventListener('click', e => { e.stopPropagation(); borrarDiapoIdx(i); });
    mini.append(num, cont, del);
    mini.addEventListener('click', () => { actual = i; sel = null; pintarEscenario(); });
    tiras.appendChild(mini);
  });
}

/* --------------------------------------------------- mover / redimensionar / editar */
function interaccion(el, b, grip, rz) {
  const factor = () => proyecto.w / escenario.getBoundingClientRect().width;
  const arrastre = (handle, onMove) => handle.addEventListener('pointerdown', ev => {
    ev.stopPropagation(); ev.preventDefault();
    sel = b.id; $$('.bloque.sel').forEach(n => n.classList.remove('sel')); el.classList.add('sel');
    const f = factor(), px = ev.clientX, py = ev.clientY, o = { x: b.x, y: b.y, w: b.w, h: b.h };
    handle.setPointerCapture(ev.pointerId); el.classList.add('arrastrando');
    const mv = e => onMove((e.clientX - px) * f, (e.clientY - py) * f, o, el);
    const up = () => { handle.releasePointerCapture(ev.pointerId); el.classList.remove('arrastrando');
      handle.removeEventListener('pointermove', mv); handle.removeEventListener('pointerup', up);
      pintarTiras(); guardarLocal(); };
    handle.addEventListener('pointermove', mv); handle.addEventListener('pointerup', up);
  });
  arrastre(grip, (dx, dy, o) => { b.x = Math.round(o.x + dx); b.y = Math.round(o.y + dy);
    el.style.left = b.x + 'px'; el.style.top = b.y + 'px'; });
  arrastre(rz, (dx, dy, o) => { b.w = Math.max(40, Math.round(o.w + dx)); b.h = Math.max(24, Math.round(o.h + dy));
    el.style.width = b.w + 'px'; el.style.height = b.h + 'px'; });

  el.addEventListener('pointerdown', () => { sel = b.id;
    $$('.bloque.sel').forEach(n => n.classList.remove('sel')); el.classList.add('sel'); });

  if (b.tipo === 'texto') {
    const t = el.querySelector('.txt');
    t.contentEditable = 'true';
    t.addEventListener('input', () => { b.html = t.innerHTML; });
    t.addEventListener('blur', () => { b.html = t.innerHTML; pintarTiras(); guardarLocal(); });
  }
}

/* --------------------------------------------------------------- diapositivas */
function nuevaDiapo(){ proyecto.slides.splice(actual+1,0,{id:uid(),bg:slide().bg,bloques:[]}); actual++; sel=null; pintarEscenario(); }
function duplicarDiapo(){ const c=JSON.parse(JSON.stringify(slide())); c.id=uid(); c.bloques.forEach(b=>b.id=uid());
  proyecto.slides.splice(actual+1,0,c); actual++; sel=null; pintarEscenario(); }
function borrarDiapoIdx(i){ if(proyecto.slides.length===1){ proyecto.slides[0].bloques=[]; }
  else proyecto.slides.splice(i,1); actual=Math.max(0,Math.min(actual,proyecto.slides.length-1)); sel=null; pintarEscenario(); }
function moverDiapo(d){ const j=actual+d; if(j<0||j>=proyecto.slides.length) return;
  [proyecto.slides[actual],proyecto.slides[j]]=[proyecto.slides[j],proyecto.slides[actual]]; actual=j; pintarEscenario(); }

/* --------------------------------------------------------------- bloques */
function nuevoBloque(b){ slide().bloques.push(b); sel=b.id; pintarEscenario(); }
const addTexto  = () => nuevoBloque({id:uid(),tipo:'texto',x:120,y:240,w:640,h:120,fs:36,html:'Texto nuevo'});
const addModelo = src => nuevoBloque({id:uid(),tipo:'modelo',x:312,y:88,w:400,h:400,src,autorotate:true});
const addImagen = src => nuevoBloque({id:uid(),tipo:'imagen',x:262,y:88,w:500,h:400,src});
const addVideo  = src => nuevoBloque({id:uid(),tipo:'video',x:212,y:98,w:600,h:380,src});
function borrarBloque(id){ slide().bloques=slide().bloques.filter(b=>b.id!==id); if(sel===id) sel=null; pintarEscenario(); }
function bloqueSel(){ return slide().bloques.find(b=>b.id===sel); }

/* --------------------------------------------------------------- formato texto */
function aplicarFormato(cmd){
  const b = bloqueSel();
  if (!b || b.tipo!=='texto'){ return; }
  const el = $(`.bloque[data-id="${b.id}"] .txt`); if(!el) return;
  if (cmd==='fontMas' || cmd==='fontMenos'){
    b.fs = Math.max(10, (b.fs||28) + (cmd==='fontMas'?4:-4)); el.style.fontSize=b.fs+'px';
    pintarTiras(); guardarLocal(); return;
  }
  el.focus();
  document.execCommand(cmd, false, null);
  b.html = el.innerHTML; guardarLocal();
}
function aplicarColor(color){
  const b=bloqueSel(); if(!b||b.tipo!=='texto') return;
  const el=$(`.bloque[data-id="${b.id}"] .txt`); if(!el) return;
  el.focus(); document.execCommand('foreColor', false, color); b.html=el.innerHTML; guardarLocal();
}

/* --------------------------------------------------------------- diseño */
function setFondo(c){ slide().bg=c; pintarEscenario(); }
function setTema(t){ proyecto.theme=t; guardarLocal(); }
function setProporcion(p){ if(p==='16:9'){proyecto.w=1024;proyecto.h=576;} else {proyecto.w=1024;proyecto.h=768;}
  $$('#pestanas .pestana'); pintarEscenario(); }
function setTransicion(t){ proyecto.transition=t; $$('[data-trans]').forEach(x=>x.classList.toggle('sel',x.dataset.trans===t)); guardarLocal(); }
function setVelocidad(v){ proyecto.speed=v; guardarLocal(); }
function animFrag(on){ const b=bloqueSel(); if(!b) return; b.frag=on; pintarEscenario(); }

/* --------------------------------------------- generar reveal.js */
const estilo = b => `position:absolute;left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;`;
function bloqueHTML(b){
  const frag = b.frag ? ' class="fragment"' : '';
  if(b.tipo==='texto') return `<div${frag} style="${estilo(b)}font-size:${b.fs||28}px">${b.html||''}</div>`;
  if(b.tipo==='modelo') return `<model-viewer${frag} src="${b.src}" camera-controls ${b.autorotate!==false?'auto-rotate':''} shadow-intensity="1" style="${estilo(b)}"></model-viewer>`;
  if(b.tipo==='imagen') return `<img${frag} src="${b.src}" style="${estilo(b)}object-fit:contain">`;
  if(b.tipo==='video') return `<video${frag} src="${b.src}" controls style="${estilo(b)}object-fit:contain"></video>`;
  return '';
}
function slideHTML(s){
  const inner = s.bloques.map(bloqueHTML).join('\n');
  return `<section data-background-color="${s.bg||'#111'}"><div class="lienzo">${inner}</div></section>`;
}
function documentoReveal(){
  const secciones = proyecto.slides.map(slideHTML).join('\n');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Presentación — Revela</title>
<link rel="stylesheet" href="${CDN_REVEAL}/dist/reveal.css">
<link rel="stylesheet" href="${CDN_REVEAL}/dist/theme/${proyecto.theme}.css">
<script type="module" src="${CDN_MV}"></script>
<style>
 .reveal .lienzo{position:relative;width:${proyecto.w}px;height:${proyecto.h}px;margin:0 auto}
 .reveal .lienzo>*{overflow-wrap:anywhere}
 .reveal model-viewer{background:transparent}
 .reveal section{height:100%}
</style></head><body>
<div class="reveal"><div class="slides">
${secciones}
</div></div>
<script src="${CDN_REVEAL}/dist/reveal.js"></script>
<script>
 Reveal.initialize({ width:${proyecto.w}, height:${proyecto.h}, margin:0.04,
   controls:true, progress:true, hash:true,
   transition:'${proyecto.transition}', transitionSpeed:'${proyecto.speed}' });
</script></body></html>`;
}
function presentar(){ const w=window.open('','_blank');
  if(!w){ alert('Permite las ventanas emergentes para presentar.'); return; }
  w.document.write(documentoReveal()); w.document.close(); }
function descargar(blob,nombre){ const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download=nombre; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); }
const exportar = () => descargar(new Blob([documentoReveal()],{type:'text/html'}),'presentacion.html');
const guardarProyecto = () => descargar(new Blob([JSON.stringify(proyecto,null,2)],{type:'application/json'}),'proyecto.revela.json');
function abrirProyecto(f){ const r=new FileReader();
  r.onload=()=>{ try{ proyecto=JSON.parse(r.result); actual=0; sel=null; sincronizarControles(); pintarEscenario(); }
    catch(e){ alert('No es un proyecto válido.'); } }; r.readAsText(f); }
function nuevoProyectoAccion(){ if(confirm('¿Empezar una presentación nueva? Se perderá la actual si no la has guardado.')){
  proyecto=nuevoProyecto(); actual=0; sel=null; sincronizarControles(); pintarEscenario(); } }

/* --------------------------------------------------------------- pestañas + eventos */
function activarTab(tab){
  $$('#pestanas .pestana').forEach(p=>p.classList.toggle('activa',p.dataset.tab===tab));
  $$('#ribbons .ribbon').forEach(r=>r.classList.toggle('activa',r.dataset.tab===tab));
}
function sincronizarControles(){
  const t=$('[data-tema]'); if(t) t.value=proyecto.theme;
  const v=$('[data-vel]'); if(v) v.value=proyecto.speed;
  $$('[data-trans]').forEach(x=>x.classList.toggle('sel',x.dataset.trans===proyecto.transition));
}

const ACCIONES = {
  'nuevo-proyecto':nuevoProyectoAccion, 'abrir':()=>$('#file-proyecto').click(), 'guardar':guardarProyecto,
  'exportar':exportar, 'presentar':presentar,
  'nueva-diapo':nuevaDiapo, 'duplicar-diapo':duplicarDiapo, 'borrar-diapo':()=>borrarDiapoIdx(actual),
  'subir-diapo':()=>moverDiapo(-1), 'bajar-diapo':()=>moverDiapo(1),
  'add-texto':addTexto, 'add-modelo':()=>$('#file-modelo').click(),
  'add-imagen':()=>$('#file-imagen').click(), 'add-video':()=>$('#file-video').click(),
  'anim-fragmento':()=>animFrag(true), 'anim-quitar':()=>animFrag(false),
  'toggle-guias':()=>escenario.classList.toggle('guias'),
};

document.addEventListener('click', e => {
  const tab = e.target.closest('.pestana'); if(tab){ activarTab(tab.dataset.tab); return; }
  const acc = e.target.closest('[data-accion]')?.dataset.accion; if(acc){ ACCIONES[acc]?.(); return; }
  const trans = e.target.closest('[data-trans]'); if(trans){ setTransicion(trans.dataset.trans); return; }
  const prop = e.target.closest('[data-proporcion]'); if(prop){ setProporcion(prop.dataset.proporcion); return; }
});
// Formato: preventDefault en mousedown para NO perder la selección del texto
$$('[data-fmt]').forEach(btn=>{
  btn.addEventListener('mousedown', e=>e.preventDefault());
  btn.addEventListener('click', ()=>aplicarFormato(btn.dataset.fmt));
});
$('[data-color]')?.addEventListener('mousedown', e=>e.stopPropagation());
$('[data-color]')?.addEventListener('input', e=>aplicarColor(e.target.value));
$('[data-fondo]')?.addEventListener('input', e=>setFondo(e.target.value));
$('[data-tema]')?.addEventListener('change', e=>setTema(e.target.value));
$('[data-vel]')?.addEventListener('change', e=>setVelocidad(e.target.value));

$('#file-modelo').addEventListener('change', e=>{ const f=e.target.files[0]; if(f){ const r=new FileReader();
  r.onload=()=>addModelo(r.result); r.readAsDataURL(f); } e.target.value=''; });
$('#file-imagen').addEventListener('change', e=>{ const f=e.target.files[0]; if(f){ const r=new FileReader();
  r.onload=()=>addImagen(r.result); r.readAsDataURL(f); } e.target.value=''; });
$('#file-video').addEventListener('change', e=>{ const f=e.target.files[0]; if(f){ const r=new FileReader();
  r.onload=()=>addVideo(r.result); r.readAsDataURL(f); } e.target.value=''; });
$('#file-proyecto').addEventListener('change', e=>{ const f=e.target.files[0]; if(f) abrirProyecto(f); e.target.value=''; });

escenario.addEventListener('pointerdown', e=>{ if(e.target===escenario){ sel=null; pintarEscenario(); } });
document.addEventListener('keydown', e=>{
  if((e.key==='Delete') && sel && !document.activeElement?.isContentEditable){ borrarBloque(sel); }
});

sincronizarControles();
pintarEscenario();
