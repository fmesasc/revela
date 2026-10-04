// Scripts embedded in the exported presentation (they run inside it, not in
// the editor): live polls, live data, image lightbox and
// click-triggered animations. Functions shared with the editor (tallying
// votes, drawing charts) are embedded with toString(), so both draw the same.

import { jsData } from '../../core/text.js';
import { chartRuntimeJS } from '../../render/svg.js';
import { tallyVotes, pollResultsHTML, quizTotals, gradeActivity, publicActivity, VOTE_URL } from '../../features/live/poll.js';
import { parseChartGrid } from '../../features/document/blocks.js';
import { QRCODE, PEERJS } from '../../core/vendor.js';

// Live polls: host a PeerJS peer, show the QR on every poll, tally votes and
// repaint the results as they arrive; the current slide's poll is sent to the
// phones. Loaded only when the deck has polls.
// classroom: the audience also sees the slides on their devices, at the
// presenter's pace (the current slide's markup, fragments as shown, with the
// page's styles, drawn without scripts on the phone); a corner badge with the
// code and QR to join (A shows or hides it).
export function pollJS(accents, { classroom = false } = {}) {
  return `(function(){
 var CLASS=${classroom ? 'true' : 'false'};
 var gradeActivity=${gradeActivity.toString()}, publicActivity=${publicActivity.toString()};
 var ACT=['order','match','gaps','label'], GR=['quiz'].concat(ACT);
 var tally=${tallyVotes.toString()};
 var render=${pollResultsHTML.toString()};
 var tallyVotes=tally, totals=${quizTotals.toString()};         // (quizTotals counts with tallyVotes)
 var started={},revealed={},timer=null;
 var VOTE=${JSON.stringify(VOTE_URL)}, ACC=${JSON.stringify(accents)}, votes={}, conns=[], peer=null, code='';
 var AB='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
 function all(){return [].slice.call(document.querySelectorAll('.rv-poll'));}
 function def(el){try{return JSON.parse(el.getAttribute('data-poll'));}catch(e){return null;}}
 function load(id){try{return JSON.parse(localStorage.getItem('revela.poll.'+id))||{};}catch(e){return {};}}
 function store(id){try{localStorage.setItem('revela.poll.'+id,JSON.stringify(votes[id]));}catch(e){}}
 function V(id){return votes[id]||(votes[id]=load(id));}
 // Quizzes: the time left, the answer shown when it runs out (or on a click), and every quiz added up.
 function left(p){return started[p.pollId]?(+p.time||20)-(Date.now()-started[p.pollId])/1000:(+p.time||20);}
 function quizzes(){return all().map(def).filter(function(p){return p&&GR.indexOf(p.kind)>=0;}).map(function(p){return {poll:p,votes:V(p.pollId)};});}
 function paint(el){var p=def(el);if(!p)return;var r=p.kind==='board'?{board:totals(quizzes())}:tally(p,V(p.pollId));
  if(p.kind==='quiz'){r.revealed=!!revealed[p.pollId];r.left=left(p);if(r.revealed)r.board=totals(quizzes());}
  if(ACT.indexOf(p.kind)>=0)r.revealed=!!revealed[p.pollId];
  el.querySelector('.rv-poll-res').innerHTML=render(p,r,ACC);}
 function reveal(p){if(revealed[p.pollId])return;revealed[p.pollId]=true;all().forEach(paint);
  var board=totals(quizzes()),mine=tally(p,V(p.pollId)).board;
  conns.forEach(function(c){if(!c.voter)return;var m=mine.filter(function(x){return x.id===c.voter;})[0],k=board.map(function(x){return x.id;}).indexOf(c.voter);
   send(c,{type:'quizresult',pollId:p.pollId,answered:!!m,ok:!!(m&&m.ok),pts:m?m.pts:0,total:k>=0?board[k].pts:0,rank:k>=0?k+1:0,of:board.length});});}
 function tick(){var p=current();if(!p||p.kind!=='quiz'||revealed[p.pollId]){clearInterval(timer);timer=null;return;}
  var el=all().filter(function(e){var q=def(e);return q&&q.pollId===p.pollId;})[0];if(el)paint(el);if(left(p)<=0)reveal(p);}
 function current(){var s=Reveal.getCurrentSlide(),el=s&&s.querySelector('.rv-poll');var p=el&&def(el);if(!p)return null;var act=ACT.indexOf(p.kind)>=0;
  return {pollId:p.pollId,kind:p.kind,question:p.question,options:act?[]:p.options,pub:act?publicActivity(p):null,time:p.time,left:p.kind==='quiz'?left(p):null,revealed:!!revealed[p.pollId]};}
 function send(c,m){try{if(c.open)c.send(m);}catch(e){}}
 function qaList(p){var r=tally(p,votes[p.pollId]||(votes[p.pollId]=load(p.pollId)));return (r.questions||[]).map(function(q){return {id:q.id,text:q.text,up:q.up};});}
 function broadcastQA(p){var cur=current();if(!cur||cur.pollId!==p.pollId)return;conns.forEach(function(c){send(c,{type:'qa',pollId:p.pollId,list:qaList(p)});});}
 function broadcast(){var p=current();
  // A quiz starts the first time its slide is shown (one already played, with answers saved, is shown solved).
  if(p&&p.kind==='quiz'&&!started[p.pollId]){if(Object.keys(V(p.pollId)).length)revealed[p.pollId]=true;else{started[p.pollId]=Date.now();p.left=left(p);if(!timer)timer=setInterval(tick,250);}}
  conns.forEach(function(c){send(c,{type:'poll',poll:p});if(p&&p.kind==='qa')send(c,{type:'qa',pollId:p.pollId,list:qaList(p)});});}
 function js(src){return new Promise(function(ok,ko){var s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=ko;document.head.appendChild(s);});}
 function clean(p,a){if(p.kind==='word')return String(a||'').slice(0,60);if(p.kind==='multi')return (Array.isArray(a)?a:[]).map(Number).filter(function(x){return x>=0&&x<p.options.length;}).slice(0,20);
  var n=+a;return p.kind==='rating'?(n>=1&&n<=5?Math.round(n):null):(n>=0&&n<p.options.length?n:null);}
 function start(tries){code='';for(var i=0;i<5;i++)code+=AB[Math.floor(Math.random()*AB.length)];
  peer=new Peer('revela-vote-'+code);
  peer.on('open',function(){var url=VOTE+'?c='+code;badge(url);all().forEach(function(el){el.querySelector('.rv-poll-code').textContent=code;
    el.querySelector('.rv-poll-url').textContent=url.replace(/^https?:\\/\\//,'').replace(/\\?.*$/,'');
    if(window.QRCode)QRCode.toCanvas(el.querySelector('canvas'),url,{width:220,margin:1},function(){});});});
  peer.on('connection',function(c){conns.push(c);
    c.on('open',function(){if(CLASS){send(c,{type:'css',css:css()});send(c,slideMsg());}var p=current();send(c,{type:'poll',poll:p});if(p&&p.kind==='qa')send(c,{type:'qa',pollId:p.pollId,list:qaList(p)});});
    c.on('data',function(d){if(d&&d.type==='lang'){c.lang=/^[a-z]{2}$/.test(d.lang||'')?d.lang:null;return;}if(!d||d.type!=='vote')return;var el=all().filter(function(e){var p=def(e);return p&&p.pollId===d.pollId;})[0];if(!el)return;
      var p=def(el),who=String(d.voter).slice(0,40),V=votes[p.pollId]||(votes[p.pollId]=load(p.pollId));
      if(p.kind==='qa'){var a=d.answer||{};
        if(a.ask){var txt=String(a.ask).trim().slice(0,200);if(!txt)return;var n=Object.keys(V).filter(function(k){return V[k].by===who;}).length;if(n>=5)return;
          var id='q:'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);V[id]={t:txt,by:who,time:Date.now(),up:{}};}
        else if(a.up&&V[a.up]){if(V[a.up].up[who])delete V[a.up].up[who];else V[a.up].up[who]=1;}else return;
        store(p.pollId);paint(el);send(c,{type:'ok',pollId:p.pollId});broadcastQA(p);return;}
      c.voter=who;
      if(p.kind==='quiz'){if(revealed[p.pollId]||!started[p.pollId]||V[who])return;var q=clean(p,d.answer);if(q===null)return;
        V[who]={a:q,t:Date.now()-started[p.pollId],n:String(d.name||'').slice(0,24)};store(p.pollId);paint(el);send(c,{type:'ok',pollId:p.pollId});return;}
      if(ACT.indexOf(p.kind)>=0){if(revealed[p.pollId]||V[who])return;var arr=(Array.isArray(d.answer)?d.answer:[]).slice(0,40).map(function(x){return String(x==null?'':x).slice(0,100);});
        V[who]={a:arr,n:String(d.name||'').slice(0,24)};store(p.pollId);paint(el);send(c,{type:'ok',pollId:p.pollId});return;}
      var a2=clean(p,d.answer);if(a2===null||a2==='')return;V[who]=a2;
      store(p.pollId);paint(el);send(c,{type:'ok',pollId:p.pollId});});
    c.on('close',function(){conns=conns.filter(function(x){return x!==c;});});});
  peer.on('error',function(e){if(e.type==='unavailable-id'&&tries<5){peer.destroy();start(tries+1);}});}
 all().forEach(paint);
 // A click on a quiz shows its answer at once.
 document.addEventListener('click',function(e){var el=e.target.closest&&e.target.closest('.rv-poll');var p=el&&def(el);if(p&&((p.kind==='quiz'&&started[p.pollId])||ACT.indexOf(p.kind)>=0)){e.stopPropagation();if(revealed[p.pollId]&&ACT.indexOf(p.kind)>=0)return;reveal(p);}},true);
 js(${JSON.stringify(QRCODE)}).catch(function(){}).then(function(){return js(${JSON.stringify(PEERJS)});}).then(function(){start(0);});
 Reveal.on('slidechanged',broadcast);
 // Classroom: the slide to every device, as it changes (and its fragments).
 function css(){return [].slice.call(document.querySelectorAll('link[rel=stylesheet],style')).map(function(n){return n.outerHTML;}).join('\\n');}
 function slideMsg(){var s=Reveal.getCurrentSlide(),bg=s&&Reveal.getSlideBackground&&Reveal.getSlideBackground(s),cfg=Reveal.getConfig();
  return {type:'slide',html:s?s.outerHTML:'',bg:bg?bg.outerHTML:'',w:cfg.width,h:cfg.height,cls:document.querySelector('.reveal').className,n:Reveal.getSlidePastCount()+1,of:Reveal.getTotalSlides()};}
 function pushSlide(){if(!CLASS)return;var m=slideMsg();conns.forEach(function(c){send(c,m);});}
 function badge(url){if(!CLASS)return;var b=document.getElementById('rv-class');if(!b){b=document.createElement('div');b.id='rv-class';
   b.style.cssText='position:fixed;right:12px;bottom:12px;z-index:40;background:#fff;color:#223;border-radius:10px;padding:8px 10px;font:600 14px system-ui,sans-serif;text-align:center;box-shadow:0 4px 20px #0005';
   b.innerHTML='<canvas style="display:block;width:120px;height:120px;margin:0 auto 4px"></canvas><div>'+url.replace(/^https?:\\/\\//,'').replace(/\\?.*$/,'')+'</div><div>C\u00f3digo <b style="letter-spacing:2px">'+code+'</b></div>';
   document.body.appendChild(b);document.addEventListener('keydown',function(e){if((e.key==='a'||e.key==='A')&&!e.ctrlKey&&!e.metaKey)b.hidden=!b.hidden;});}
  if(window.QRCode)QRCode.toCanvas(b.querySelector('canvas'),url,{width:240,margin:1},function(){});}
 // Live captions to the audience; translated ones for whoever asks, when the
 // editor that is presenting offers its AI (asked once), else each device translates.
 var TR=null;try{TR=window.parent!==window&&window.parent.__revelaTranslate;}catch(e){}
 var trOk=null;
 window.addEventListener('rv-caption',function(e){var d=e.detail||{};if(!d.text)return;
  conns.forEach(function(c){send(c,{type:'caption',text:d.text,final:!!d.final,lang:d.lang});});
  if(!d.final||!TR)return;var want={};conns.forEach(function(c){if(c.lang)want[c.lang]=1;});var ls=Object.keys(want).slice(0,5);if(!ls.length)return;
  if(trOk===null)trOk=confirm('El p\u00fablico pide los subt\u00edtulos traducidos ('+ls.join(', ')+'). \u00bfTraducirlos con tu IA? Cada frase gasta un poco de cr\u00e9dito.');
  if(!trOk)return;
  ls.forEach(function(l){TR(d.text,l).then(function(t){if(!t)return;conns.forEach(function(c){if(c.lang===l)send(c,{type:'caption',text:t,final:true,lang:l,translated:true});});}).catch(function(){});});});
 if(CLASS){Reveal.on('slidechanged',pushSlide);Reveal.on('fragmentshown',pushSlide);Reveal.on('fragmenthidden',pushSlide);}
 // (A quiz on the first slide starts with the presentation.)
 if(Reveal.isReady())broadcast();else Reveal.on('ready',broadcast);
})();`;
}
// Live data while presenting: dashboards reload every N minutes; charts linked
// to a CSV re-fetch it every N seconds and redraw with the editor's own code.
export function liveDataJS() {
  return `(function(){
 ${chartRuntimeJS()}
 ${parseChartGrid.toString()}
 document.querySelectorAll('iframe[data-refresh-min]').forEach(function(f){var m=+f.dataset.refreshMin;if(m>0)setInterval(function(){f.src=f.src;},m*60000);});
 document.querySelectorAll('.rv-live-chart').forEach(function(el){var b;try{b=JSON.parse(el.getAttribute('data-chart'));}catch(e){return;}
  function load(){fetch(b.dataUrl,{cache:'no-store'}).then(function(r){return r.ok?r.text():Promise.reject();}).then(function(t){
    var g=parseChartGrid(t);if(!g.data.length)return;b.data=g.data;b.series=g.series.length?g.series:undefined;if(g.names[0])b.seriesName=g.names[0];
    el.innerHTML=chartSVG(b);}).catch(function(){});}
  load();if(b.refreshSec>0)setInterval(load,b.refreshSec*1000);});
})();`;
}
// Click-to-enlarge images: a full-screen view; click or Esc closes it.
export const LIGHTBOX_JS = `(function(){var box=null;
 function close(){if(box){box.remove();box=null;}}
 document.addEventListener('click',function(e){var im=e.target.closest('img[data-lightbox]');if(!im||box)return;e.preventDefault();e.stopPropagation();
  box=document.createElement('div');box.style.cssText='position:fixed;inset:0;z-index:100;background:rgba(0,0,0,.88);display:flex;align-items:center;justify-content:center;cursor:zoom-out';
  var big=document.createElement('img');big.src=im.src;big.alt=im.alt;big.style.cssText='width:94vw;height:94vh;object-fit:contain';
  box.appendChild(big);box.addEventListener('click',close);document.body.appendChild(box);},true);
 window.addEventListener('keydown',function(e){if(box&&e.key==='Escape'){close();e.stopImmediatePropagation();e.preventDefault();}},true);
 var st=document.createElement('style');st.textContent='img[data-lightbox]{cursor:zoom-in}';document.head.appendChild(st);})();`;
export const TRIGGER_JS = `(function(){
 function play(el){el.style.animation='none';void el.offsetWidth;
  el.style.animation=el.dataset.kf+' '+el.dataset.dur+'ms ease '+el.dataset.del+'ms both';el.classList.add('on');}
 document.addEventListener('click',function(e){var s=e.target.closest('[data-bid]');if(!s)return;
  s.closest('section').querySelectorAll('[data-trig="'+s.dataset.bid+'"]').forEach(play);});
 Reveal.on('slidechanged',function(ev){if(ev.previousSlide)ev.previousSlide.querySelectorAll('.rv-trig').forEach(function(el){
  el.style.animation='';el.classList.remove('on');});});
})();`;

// Overview (Esc or O while presenting): every slide as a mosaic that fills the
// screen — sized so they all fit when possible, grouped by section, the
// current one marked; arrows + Enter or a click go to a slide, Esc closes.
// It replaces reveal.js's own overview, a single row that wastes the height.
// sections[h] = the section name of horizontal slide h ('' when none).
export function overviewJS(sections, texts) {
  return `(function(){
 var SEC=${jsData(sections)}, T=${jsData(texts)}, box=null, items=[], sel=0;
 var st=document.createElement('style');
 st.textContent='.rv-ov{position:fixed;inset:0;z-index:1000;text-align:start;line-height:normal;background:rgba(10,12,16,.97);overflow:auto;padding:18px 22px 28px;box-sizing:border-box;font-family:system-ui,sans-serif;color:#e6e9ef}'
  +'.rv-ov-top{display:flex;justify-content:space-between;align-items:center;font-size:13px;color:#9aa3ae;margin:0 0 10px}'
  +'.rv-ov h2{font-family:system-ui,sans-serif;font-size:15px;font-weight:600;margin:16px 0 8px;color:#e6e9ef;letter-spacing:.3px;text-transform:none}'
  +'.rv-ov-grid{display:grid;gap:14px}'
  +'.rv-ov-it{position:relative;cursor:pointer;border-radius:6px;overflow:hidden;outline:2px solid transparent;outline-offset:2px;background:#222;box-shadow:0 2px 8px #0008}'
  +'.rv-ov-it:hover,.rv-ov-it.sel{outline-color:#86a9e8}.rv-ov-it.cur{outline-color:#f5a623}'
  +'.rv-ov-it .rv-ov-in{position:absolute;left:0;top:0;transform-origin:0 0;pointer-events:none}'
  +'.rv-ov-it .rv-ov-n{position:absolute;left:6px;bottom:4px;font-size:12px;background:#000a;color:#fff;border-radius:4px;padding:1px 6px}'
  +'.rv-ov .fragment{opacity:1!important;visibility:visible!important;transform:none!important}'
  +'.rv-ov .rv-ov-ph{background:#0004;width:100%;height:100%}';
 document.head.appendChild(st);
 function leaves(){return Reveal.getSlides().filter(function(s){return !s.querySelector('section');});}
 function thumb(sec,W,H,tw,n){
  var it=document.createElement('div');it.className='rv-ov-it';it.style.aspectRatio=W+'/'+H;
  it.style.background=sec.getAttribute('data-background-color')||'#fff';
  var inner=document.createElement('div');inner.className='rv-ov-in';inner.style.width=W+'px';inner.style.height=H+'px';
  [].forEach.call(sec.children,function(c){if(c.tagName==='ASIDE')return;inner.appendChild(c.cloneNode(true));});
  // No live media in thumbnails (pages, videos and 3D would load again).
  inner.querySelectorAll('iframe,video,audio,model-viewer').forEach(function(m){var d=document.createElement('div');d.className='rv-ov-ph';d.style.cssText=m.style.cssText;m.replaceWith(d);});
  inner.querySelectorAll('[id]').forEach(function(e){e.removeAttribute('id');});
  it.appendChild(inner);var num=document.createElement('span');num.className='rv-ov-n';num.textContent=n;it.appendChild(num);
  return {el:it,inner:inner};
 }
 // Columns so that every slide fits on screen when possible (bigger is better).
 // groups: how many slides each section has (each section starts a new row).
 function layout(groups,W,H){
  var count=groups.reduce(function(a,b){return a+b.n;},0), aw=box.clientWidth-44, ah=window.innerHeight-70;
  for(var c=1;c<=count;c++){var tw=(aw-14*(c-1))/c, th=tw*H/W, need=0;
   groups.forEach(function(g){var r=Math.ceil(g.n/c);need+=r*th+14*(r-1)+(g.name?40:12);});
   if(need<=ah)return c;}
  return Math.max(1,Math.floor((aw+14)/(220+14)));
 }
 function open(){
  if(box)return;
  var slides=leaves(), W=Reveal.getConfig().width, H=Reveal.getConfig().height, cur=Reveal.getCurrentSlide();
  box=document.createElement('div');box.className='rv-ov';box.setAttribute('role','dialog');box.setAttribute('aria-label',T.title);
  box.innerHTML='<div class="rv-ov-top"><span>'+T.title+'</span><span>'+T.help+'</span></div>';
  // Inside .reveal, so the thumbnails get the presentation's own styles.
  (document.querySelector('.reveal')||document.body).appendChild(box);
  var groups=[];slides.forEach(function(s){var n=SEC[Reveal.getIndices(s).h]||'';var g=groups[groups.length-1];if(g&&g.name===n)g.n++;else groups.push({name:n,n:1});});
  var cols=layout(groups,W,H), grid=null, last=null; items=[];
  slides.forEach(function(s,i){
   var ix=Reveal.getIndices(s), name=SEC[ix.h]||'';
   if(!grid||name!==last){
    if(name){var h=document.createElement('h2');h.textContent=name;box.appendChild(h);}
    grid=document.createElement('div');grid.className='rv-ov-grid';grid.style.gridTemplateColumns='repeat('+cols+',minmax(0,1fr))';box.appendChild(grid);last=name;
   }
   var t=thumb(s,W,H,0,i+1);if(s===cur){t.el.classList.add('cur');sel=i;}
   t.el.addEventListener('click',function(){go(i);});
   grid.appendChild(t.el);items.push({el:t.el,inner:t.inner,h:ix.h,v:ix.v||0});
  });
  requestAnimationFrame(function(){items.forEach(function(x){x.inner.style.transform='scale('+(x.el.clientWidth/W)+')';});mark();});
 }
 function close(){if(box){box.remove();box=null;}}
 function go(i){var x=items[i];close();Reveal.slide(x.h,x.v);}
 function mark(){items.forEach(function(x,i){x.el.classList.toggle('sel',i===sel);});var e=items[sel]&&items[sel].el;if(e)e.scrollIntoView({block:'nearest'});}
 function cols(){var g=items[0]&&items[0].el.parentNode;return g?getComputedStyle(g).gridTemplateColumns.split(' ').length:1;}
 window.addEventListener('keydown',function(e){
  var k=e.key;
  if(!box){ if(k==='Escape'||((k==='o'||k==='O')&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!/INPUT|TEXTAREA/.test(e.target.tagName))){e.preventDefault();e.stopImmediatePropagation();open();} return; }
  e.preventDefault();e.stopImmediatePropagation();
  if(k==='Escape'||k==='o'||k==='O')close();
  else if(k==='Enter'||k===' ')go(sel);
  else if(k==='ArrowRight'){sel=Math.min(items.length-1,sel+1);mark();}
  else if(k==='ArrowLeft'){sel=Math.max(0,sel-1);mark();}
  else if(k==='ArrowDown'){sel=Math.min(items.length-1,sel+cols());mark();}
  else if(k==='ArrowUp'){sel=Math.max(0,sel-cols());mark();}
  else if(k==='Home'){sel=0;mark();}else if(k==='End'){sel=items.length-1;mark();}
 },true);
 window.addEventListener('resize',function(){if(box){close();open();}});
 window.RevelaOverview={open:open,close:close,isOpen:function(){return !!box;}};
})();`;
}
