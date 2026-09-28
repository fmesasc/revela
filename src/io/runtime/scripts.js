// Scripts embedded in the exported presentation (they run inside it, not in
// the editor): live camera, live polls, live data, image lightbox and
// click-triggered animations. Functions shared with the editor (tallying
// votes, drawing charts) are embedded with toString(), so both draw the same.

import { chartSVG, escSvg, SERIES_COLOURS, chartSeries } from '../../render/svg.js';
import { tallyVotes, pollResultsHTML, VOTE_URL } from '../../features/live/poll.js';
import { parseChartGrid } from '../../features/document/blocks.js';
import { QRCODE, PEERJS } from '../../core/vendor.js';

// Live camera for Cameo objects: asked for only when a slide that has one is
// shown, and shared by all of them.
export const CAMERA_JS = `(function(){var st=null,asked=false;
 function fill(slide){var vs=slide&&slide.querySelectorAll('video[data-camera]');if(!vs||!vs.length)return;
  function put(){vs.forEach(function(v){if(v.srcObject!==st){v.srcObject=st;v.play&&v.play().catch(function(){});}});}
  if(st)return put();if(asked)return;asked=true;
  navigator.mediaDevices&&navigator.mediaDevices.getUserMedia({video:true,audio:false}).then(function(s){st=s;put();}).catch(function(){});}
 Reveal.on('ready',function(e){fill(e.currentSlide);});Reveal.on('slidechanged',function(e){fill(e.currentSlide);});
 if(Reveal.isReady())fill(Reveal.getCurrentSlide());})();`;
// Live polls: host a PeerJS peer, show the QR on every poll, tally votes and
// repaint the results as they arrive; the current slide's poll is sent to the
// phones. Loaded only when the deck has polls.
export function pollJS(accents) {
  return `(function(){
 var tally=${tallyVotes.toString()};
 var render=${pollResultsHTML.toString()};
 var VOTE=${JSON.stringify(VOTE_URL)}, ACC=${JSON.stringify(accents)}, votes={}, conns=[], peer=null, code='';
 var AB='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
 function all(){return [].slice.call(document.querySelectorAll('.rv-poll'));}
 function def(el){try{return JSON.parse(el.getAttribute('data-poll'));}catch(e){return null;}}
 function load(id){try{return JSON.parse(localStorage.getItem('revela.poll.'+id))||{};}catch(e){return {};}}
 function store(id){try{localStorage.setItem('revela.poll.'+id,JSON.stringify(votes[id]));}catch(e){}}
 function paint(el){var p=def(el);if(!p)return;var v=votes[p.pollId]||(votes[p.pollId]=load(p.pollId));el.querySelector('.rv-poll-res').innerHTML=render(p,tally(p,v),ACC);}
 function current(){var s=Reveal.getCurrentSlide(),el=s&&s.querySelector('.rv-poll');var p=el&&def(el);return p?{pollId:p.pollId,kind:p.kind,question:p.question,options:p.options}:null;}
 function send(c,m){try{if(c.open)c.send(m);}catch(e){}}
 function qaList(p){var r=tally(p,votes[p.pollId]||(votes[p.pollId]=load(p.pollId)));return (r.questions||[]).map(function(q){return {id:q.id,text:q.text,up:q.up};});}
 function broadcastQA(p){var cur=current();if(!cur||cur.pollId!==p.pollId)return;conns.forEach(function(c){send(c,{type:'qa',pollId:p.pollId,list:qaList(p)});});}
 function broadcast(){var p=current();conns.forEach(function(c){send(c,{type:'poll',poll:p});if(p&&p.kind==='qa')send(c,{type:'qa',pollId:p.pollId,list:qaList(p)});});}
 function js(src){return new Promise(function(ok,ko){var s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=ko;document.head.appendChild(s);});}
 function clean(p,a){if(p.kind==='word')return String(a||'').slice(0,60);if(p.kind==='multi')return (Array.isArray(a)?a:[]).map(Number).filter(function(x){return x>=0&&x<p.options.length;}).slice(0,20);
  var n=+a;return p.kind==='rating'?(n>=1&&n<=5?Math.round(n):null):(n>=0&&n<p.options.length?n:null);}
 function start(tries){code='';for(var i=0;i<5;i++)code+=AB[Math.floor(Math.random()*AB.length)];
  peer=new Peer('revela-vote-'+code);
  peer.on('open',function(){var url=VOTE+'?c='+code;all().forEach(function(el){el.querySelector('.rv-poll-code').textContent=code;
    el.querySelector('.rv-poll-url').textContent=url.replace(/^https?:\\/\\//,'').replace(/\\?.*$/,'');
    if(window.QRCode)QRCode.toCanvas(el.querySelector('canvas'),url,{width:220,margin:1},function(){});});});
  peer.on('connection',function(c){conns.push(c);
    c.on('open',function(){var p=current();send(c,{type:'poll',poll:p});if(p&&p.kind==='qa')send(c,{type:'qa',pollId:p.pollId,list:qaList(p)});});
    c.on('data',function(d){if(!d||d.type!=='vote')return;var el=all().filter(function(e){var p=def(e);return p&&p.pollId===d.pollId;})[0];if(!el)return;
      var p=def(el),who=String(d.voter).slice(0,40),V=votes[p.pollId]||(votes[p.pollId]=load(p.pollId));
      if(p.kind==='qa'){var a=d.answer||{};
        if(a.ask){var txt=String(a.ask).trim().slice(0,200);if(!txt)return;var n=Object.keys(V).filter(function(k){return V[k].by===who;}).length;if(n>=5)return;
          var id='q:'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);V[id]={t:txt,by:who,time:Date.now(),up:{}};}
        else if(a.up&&V[a.up]){if(V[a.up].up[who])delete V[a.up].up[who];else V[a.up].up[who]=1;}else return;
        store(p.pollId);paint(el);send(c,{type:'ok',pollId:p.pollId});broadcastQA(p);return;}
      var a2=clean(p,d.answer);if(a2===null||a2==='')return;V[who]=a2;
      store(p.pollId);paint(el);send(c,{type:'ok',pollId:p.pollId});});
    c.on('close',function(){conns=conns.filter(function(x){return x!==c;});});});
  peer.on('error',function(e){if(e.type==='unavailable-id'&&tries<5){peer.destroy();start(tries+1);}});}
 all().forEach(paint);
 js(${JSON.stringify(QRCODE)}).catch(function(){}).then(function(){return js(${JSON.stringify(PEERJS)});}).then(function(){start(0);});
 Reveal.on('slidechanged',broadcast);
})();`;
}
// Live data while presenting: dashboards reload every N minutes; charts linked
// to a CSV re-fetch it every N seconds and redraw with the editor's own code.
export function liveDataJS() {
  return `(function(){
 ${escSvg.toString().replace(/^/, 'var escSvg=')};
 var SERIES_COLOURS=${JSON.stringify(SERIES_COLOURS)};
 ${chartSeries.toString()}
 ${chartSVG.toString()}
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
