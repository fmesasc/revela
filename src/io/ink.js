// Ink during the slideshow (PowerPoint "Pointer options", Google Slides pen):
// pen, highlighter, laser pointer and eraser, drawn on a canvas over the
// presentation. Ink is kept per slide, in deck coordinates, so it survives
// resizing and coming back to the slide. It's plain JS injected into the
// exported reveal.js page (no plugin, no network).
//
// Keys (as in PowerPoint): Ctrl+P pen · Ctrl+I highlighter · Ctrl+L laser ·
// E erase the slide's ink · Esc / Ctrl+A back to the normal pointer.

export const INK_CSS = `
 #ink-canvas{position:fixed;inset:0;width:100vw;height:100vh;z-index:40;pointer-events:none;touch-action:none}
 #ink-canvas.on{pointer-events:auto;cursor:crosshair}
 #ink-canvas.laser{cursor:none}
 #ink-bar{position:fixed;left:12px;bottom:12px;z-index:41;display:flex;gap:4px;padding:4px;border-radius:8px;
   background:rgba(20,20,20,.72);opacity:0;transition:opacity .25s}
 #ink-bar.show,#ink-bar:hover{opacity:1}
 #ink-bar button{width:32px;height:32px;border:0;border-radius:6px;background:none;color:#fff;font:16px/1 sans-serif;cursor:pointer}
 #ink-bar button:hover{background:rgba(255,255,255,.15)}
 #ink-bar button.on{background:rgba(255,255,255,.28)}
 #ink-bar input{width:28px;height:28px;margin:2px;border:0;padding:0;background:none;cursor:pointer}`;

export function inkJS(W, H, labels) {
  return `(function(){
 var W=${W},H=${H},L=${JSON.stringify(labels)};
 var cv=document.createElement('canvas');cv.id='ink-canvas';document.body.appendChild(cv);
 var cx=cv.getContext('2d'),ink={},tool=null,cur=null,laser=null,color='#ff2d2d';
 var bar=document.createElement('div');bar.id='ink-bar';
 bar.innerHTML='<button data-t="pen" title="'+L.pen+' (Ctrl+P)">\\u270E</button>'
  +'<button data-t="hl" title="'+L.hl+' (Ctrl+I)">\\u2592</button>'
  +'<button data-t="laser" title="'+L.laser+' (Ctrl+L)">\\u25CF</button>'
  +'<input type="color" value="#ff2d2d" title="'+L.color+'">'
  +'<button data-t="erase" title="'+L.erase+' (E)">\\u232B</button>';
 document.body.appendChild(bar);
 function key(){var i=Reveal.getIndices();return i.h+'/'+(i.v||0);}
 function rect(){return document.querySelector('.reveal .slides').getBoundingClientRect();}
 function toDeck(e){var r=rect();return[(e.clientX-r.left)/r.width*W,(e.clientY-r.top)/r.height*H];}
 function size(){var d=window.devicePixelRatio||1;cv.width=innerWidth*d;cv.height=innerHeight*d;draw();}
 function stroke(s,r){if(!s.p.length)return;var k=r.width/W;cx.save();cx.lineCap='round';cx.lineJoin='round';
  cx.strokeStyle=s.c;cx.globalAlpha=s.hl?.35:1;cx.lineWidth=(s.hl?22:4)*k;cx.beginPath();
  s.p.forEach(function(q,i){var x=r.left+q[0]*k,y=r.top+q[1]*r.height/H;i?cx.lineTo(x,y):cx.moveTo(x,y);});
  if(s.p.length===1){var q=s.p[0];cx.lineTo(r.left+q[0]*k+.1,r.top+q[1]*r.height/H);}cx.stroke();cx.restore();}
 function draw(){var d=window.devicePixelRatio||1;cx.setTransform(d,0,0,d,0,0);cx.clearRect(0,0,innerWidth,innerHeight);
  var r=rect();(ink[key()]||[]).forEach(function(s){stroke(s,r);});
  if(laser){var k=r.width/W;cx.save();cx.fillStyle=color;cx.shadowColor=color;cx.shadowBlur=14;cx.beginPath();
   cx.arc(r.left+laser[0]*k,r.top+laser[1]*r.height/H,7,0,7);cx.fill();cx.restore();}}
 function setTool(t){tool=(t===tool)?null:t;laser=null;cv.className=tool?('on'+(tool==='laser'?' laser':'')):'';
  bar.querySelectorAll('button[data-t]').forEach(function(b){b.classList.toggle('on',b.dataset.t===tool);});draw();}
 function erase(){delete ink[key()];draw();}
 bar.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;
  if(b.dataset.t==='erase')erase();else setTool(b.dataset.t);});
 bar.querySelector('input').addEventListener('input',function(e){color=e.target.value;});
 cv.addEventListener('pointerdown',function(e){if(!tool||tool==='laser')return;try{cv.setPointerCapture(e.pointerId);}catch(_){}
  cur={c:color,hl:tool==='hl',p:[toDeck(e)]};(ink[key()]=ink[key()]||[]).push(cur);draw();});
 cv.addEventListener('pointermove',function(e){if(tool==='laser'){laser=toDeck(e);draw();return;}
  if(cur){cur.p.push(toDeck(e));draw();}});
 cv.addEventListener('pointerup',function(){cur=null;});
 cv.addEventListener('pointerleave',function(){if(laser){laser=null;draw();}});
 window.addEventListener('keydown',function(e){var k=e.key.toLowerCase(),c=e.ctrlKey||e.metaKey,t=null;
  if(c&&k==='p')t='pen';else if(c&&k==='i')t='hl';else if(c&&k==='l')t='laser';
  else if(c&&k==='a'&&tool){setTool(tool);}
  else if(k==='e'&&!c&&!e.altKey){erase();}
  else if(k==='escape'&&tool){setTool(tool);}
  else return;
  if(t)setTool(t);e.preventDefault();e.stopImmediatePropagation();},true);
 var hide;document.addEventListener('mousemove',function(){bar.classList.add('show');clearTimeout(hide);
  hide=setTimeout(function(){bar.classList.remove('show');},2000);});
 window.addEventListener('resize',size);Reveal.on('slidechanged',draw);Reveal.on('resize',draw);Reveal.on('ready',size);size();
 window.__ink={get tool(){return tool;},strokes:function(){return ink[key()]||[];},erase:erase,setTool:setTool};
})();`;
}
