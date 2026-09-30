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
 #ink-bar{pointer-events:none}
 #ink-bar.show{opacity:1;pointer-events:auto}
 #ink-bar button{width:32px;height:32px;border:0;border-radius:6px;background:none;color:#fff;font:16px/1 sans-serif;cursor:pointer}
 #ink-bar button:hover{background:rgba(255,255,255,.15)}
 #ink-bar button.on{background:rgba(255,255,255,.28)}
 #ink-bar input{width:28px;height:28px;margin:2px;border:0;padding:0;background:none;cursor:pointer}
 #captions{position:fixed;left:50%;bottom:6%;transform:translateX(-50%);z-index:42;max-width:80vw;padding:.3em .7em;border-radius:.3em;background:rgba(0,0,0,.72);color:#fff;font:600 clamp(18px,2.6vw,38px)/1.3 system-ui,sans-serif;text-align:center;display:none}`;

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
  +'<button data-t="erase" title="'+L.erase+' (E)">\\u232B</button>'
  +'<button data-t="cc" title="'+L.cc+' (C)" style="font-weight:700;font-size:12px">CC</button>'
  +'<button data-z="-1" title="'+L.zout+' (\u2212)" style="font-size:20px">\u2212</button>'
  +'<button data-z="0" title="'+L.zreset+' (0)" style="font-size:11px;width:auto;padding:0 6px" class="rv-zl">100%</button>'
  +'<button data-z="1" title="'+L.zin+' (+ \u00b7 Ctrl + rueda)" style="font-size:20px">+</button>';
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
  if(b.dataset.z!=null){var d=+b.dataset.z;d?zoomBy(d>0?1.25:0.8):zoomTo(1);return;}
  if(b.dataset.t==='erase')erase();else if(b.dataset.t==='cc')captions();else setTool(b.dataset.t);});
 // Zoom into the slide being shown (the whole view, around the pointer or the
 // centre); drag to move around while zoomed; back to normal on the next slide.
 var zoom=1,tx=0,ty=0,drag=null,rv=document.querySelector('.reveal');
 function paintZoom(){if(!rv)return;rv.style.transformOrigin='0 0';rv.style.translate=zoom===1?'':(tx.toFixed(1)+'px '+ty.toFixed(1)+'px');rv.style.scale=zoom===1?'':String(zoom);
  document.body.style.cursor=zoom>1&&!tool?'grab':'';var l=bar.querySelector('.rv-zl');if(l)l.textContent=Math.round(zoom*100)+'%';draw();}
 function zoomTo(z,qx,qy){z=Math.max(1,Math.min(6,z));if(qx==null){qx=innerWidth/2;qy=innerHeight/2;}
  tx=qx-(qx-tx)*z/zoom;ty=qy-(qy-ty)*z/zoom;zoom=z;if(zoom===1){tx=ty=0;}
  tx=Math.min(0,Math.max(innerWidth*(1-zoom),tx));ty=Math.min(0,Math.max(innerHeight*(1-zoom),ty));paintZoom();}
 function zoomBy(f,qx,qy){zoomTo(zoom*f,qx,qy);}
 window.addEventListener('wheel',function(e){if(!(e.ctrlKey||e.metaKey))return;e.preventDefault();zoomBy(Math.exp(-e.deltaY*0.003),e.clientX,e.clientY);},{passive:false});
 document.addEventListener('pointerdown',function(e){if(zoom===1||tool||e.button!==0)return;
  if(e.target.closest&&e.target.closest('model-viewer,button,a,input,select,textarea,video,iframe,#ink-bar,.rv-poll,.controls'))return;
  drag={x:e.clientX,y:e.clientY,tx:tx,ty:ty};document.body.style.cursor='grabbing';e.preventDefault();},true);
 document.addEventListener('pointermove',function(e){if(!drag)return;tx=drag.tx+e.clientX-drag.x;ty=drag.ty+e.clientY-drag.y;zoomTo(zoom);});
 document.addEventListener('pointerup',function(){if(drag){drag=null;paintZoom();}});
 Reveal.on('slidechanged',function(){if(zoom!==1)zoomTo(1);});
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
  else if(k==='c'&&!c&&!e.altKey){captions();}
  else if(k==='escape'&&tool){setTool(tool);}
  else if(!c&&!e.altKey&&(k==='+'||k==='=')){zoomBy(1.25);}
  else if(!c&&!e.altKey&&k==='-'){zoomBy(0.8);}
  else if(!c&&!e.altKey&&k==='0'){zoomTo(1);}
  else if(k==='escape'&&zoom!==1){zoomTo(1);}
  else return;
  if(t)setTool(t);e.preventDefault();e.stopImmediatePropagation();},true);
 // The bar appears only when the pointer rests a moment in the bottom-left corner
 // (not with every move: a presenter's remote pointer moves all the time), and
 // goes when it leaves that corner.
 var hide,dwell;document.addEventListener('mousemove',function(e){
  var near=e.clientX<Math.max(260,bar.offsetWidth+40)&&e.clientY>innerHeight-110;
  if(near){clearTimeout(hide);if(!bar.classList.contains('show')&&!dwell)dwell=setTimeout(function(){dwell=null;bar.classList.add('show');},350);}
  else{clearTimeout(dwell);dwell=null;if(bar.classList.contains('show')){clearTimeout(hide);hide=setTimeout(function(){bar.classList.remove('show');},600);}}});
 window.addEventListener('resize',size);Reveal.on('slidechanged',draw);Reveal.on('resize',draw);Reveal.on('ready',size);size();
 // Live captions with the browser's speech recognition (Chrome/Edge send the
 // audio to their speech service, so the presenter is asked first).
 var SR=window.SpeechRecognition||window.webkitSpeechRecognition,rec=null,capOn=false,capEl=null,finalTxt='';
 if(!SR){var ccb=bar.querySelector('[data-t="cc"]');if(ccb)ccb.hidden=true;}
 // (Each phrase also goes out as an event: the audience's devices show it, see pollJS.)
 function cap(text,final){try{window.dispatchEvent(new CustomEvent('rv-caption',{detail:{text:String(text).trim(),final:final,lang:L.lang}}));}catch(_){}}
 function captions(){if(!SR)return;
  if(capOn){capOn=false;try{rec.stop();}catch(_){}if(capEl)capEl.style.display='none';bar.querySelector('[data-t="cc"]').classList.remove('on');return;}
  var ok;try{ok=sessionStorage.getItem('revela-cc-ok');}catch(e){}
  if(!ok){if(!confirm(L.ccWarn))return;try{sessionStorage.setItem('revela-cc-ok','1');}catch(e){}}
  if(!capEl){capEl=document.createElement('div');capEl.id='captions';document.body.appendChild(capEl);}
  capEl.style.display='block';capEl.textContent='…';capOn=true;bar.querySelector('[data-t="cc"]').classList.add('on');
  rec=new SR();rec.lang=L.lang;rec.continuous=true;rec.interimResults=true;
  rec.onresult=function(ev){var interim='';for(var i=ev.resultIndex;i<ev.results.length;i++){var r=ev.results[i];
    if(r.isFinal){finalTxt=(finalTxt+' '+r[0].transcript).trim().slice(-220);cap(r[0].transcript,true);}else interim+=r[0].transcript;}
   if(interim)cap(interim,false);
   capEl.textContent=(finalTxt+' '+interim).trim().slice(-160);};
  rec.onend=function(){if(capOn){try{rec.start();}catch(_){}}};
  rec.onerror=function(e){if(e.error==='not-allowed'){capOn=false;capEl.style.display='none';}};
  try{rec.start();}catch(_){}}
 window.__ink={captions:captions,get captionsOn(){return capOn;},get tool(){return tool;},strokes:function(){return ink[key()]||[];},erase:erase,setTool:setTool};
})();`;
}
