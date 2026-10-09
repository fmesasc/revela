// Scripts embedded in the exported presentation (they run inside it, not in
// the editor): live polls, live data, image lightbox and
// click-triggered animations. Functions shared with the editor (tallying
// votes, drawing charts) are embedded with toString(), so both draw the same.

import { jsData } from '../../core/text.js';
import { chartRuntimeJS, chartTableHTML } from '../../render/svg.js';
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
// teams: the quizzes played in teams (deck.teams: their names); starStep: stars for each level.
export function pollJS(accents, { classroom = false, labels = null, teams = [], starStep = 5 } = {}) {
  return `(function(){
 var CLASS=${classroom ? 'true' : 'false'}, TEAMS=${JSON.stringify((teams || []).map(x => String(x).slice(0, 30)))}, STEP=${Math.max(1, Math.round(+starStep) || 5)};
 var gradeActivity=${gradeActivity.toString()}, publicActivity=${publicActivity.toString()};
 var ACT=['order','match','gaps','label','sort','crossword','wordsearch','memory'], GR=['quiz'].concat(ACT), LAY={};
 var tally=${tallyVotes.toString()};
 var render=${pollResultsHTML.toString()};
 var tallyVotes=tally, totals=${quizTotals.toString()};         // (quizTotals counts with tallyVotes)
 var started={},revealed={},timer=null;
 var VOTE=${JSON.stringify(VOTE_URL)}, ACC=${JSON.stringify(accents)}, LBL=${jsData(labels)}, votes={}, conns=[], peer=null, code='';
 var AB='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
 function all(){return [].slice.call(document.querySelectorAll('.rv-poll'));}
 function def(el){try{return JSON.parse(el.getAttribute('data-poll'));}catch(e){return null;}}
 function load(id){try{return JSON.parse(localStorage.getItem('revela.poll.'+id))||{};}catch(e){return {};}}
 function store(id){try{localStorage.setItem('revela.poll.'+id,JSON.stringify(votes[id]));}catch(e){}}
 function V(id){return votes[id]||(votes[id]=load(id));}
 // Teams (who is in which, kept like the votes) and stars: one for each poll answered and one more for each right
 // (a quiz right, an activity all right); a level every STEP stars (ClassPoint's stars and levels).
 var teamOf=load('teams');function keepTeams(){try{localStorage.setItem('revela.poll.teams',JSON.stringify(teamOf));}catch(e){}}
 function starsOf(){var st={};all().forEach(function(el){var p=def(el);if(!p||p.kind==='board'||p.kind==='qa')return;var Vp=V(p.pollId),r=null;
   if(GR.indexOf(p.kind)>=0&&revealed[p.pollId])r=tally(p,Vp).board||[];   // (right ones once revealed: else the star would tell)
   for(var k in Vp){var o=st[k]||(st[k]={stars:0});o.stars++;}
   (r||[]).forEach(function(x){if(x.ok){var o=st[x.id]||(st[x.id]={stars:0});o.stars++;}});});
  for(var k in st)st[k].level=1+Math.floor(st[k].stars/STEP);return st;}
 // Each student's accommodations (Wayground's), set in the class gradebook and kept in this browser by their device: extra
 // time (×1.5, ×2: their answer waited for, and speed points over their longer time), one wrong option fewer, the question
 // read aloud and larger letters on their phone, and out of the leaderboards — on the screen and on their phone.
 var ADAPT={};try{ADAPT=JSON.parse(localStorage.getItem('revela.adapt'))||{};}catch(e){}
 function ad(who){return (who&&ADAPT[who])||null;}
 function forPhone(p,c){var a=ad(c.voter);if(!p||!a||p.kind!=='quiz')return p;var q={},raw=all().map(def).filter(function(x){return x&&x.pollId===p.pollId;})[0];for(var k in p)q[k]=p[k];q.adapted=true;
  if(a.time>1){q.time=(+p.time||20)*a.time;q.left=q.time-(started[p.pollId]?(Date.now()-started[p.pollId])/1000:0);}
  if(a.fewer&&raw&&p.options.length>2){var right=raw.correct||[0],wrong=p.options.map(function(x,i){return i;}).filter(function(i){return right.indexOf(i)<0;});if(wrong.length>1)q.hide=[wrong[wrong.length-1]];}
  return q;}
 function waiting(p){var el=(Date.now()-started[p.pollId])/1000,Vp=V(p.pollId);return conns.some(function(c){var a=ad(c.voter);return c.open!==false&&a&&a.time>1&&!Vp[c.voter]&&el<(+p.time||20)*a.time;});}
 function teamBoard(board){if(!TEAMS.length)return [];var t={};board.forEach(function(r){var tm=teamOf[r.id];if(!tm)return;var o=t[tm]||(t[tm]={team:tm,sum:0,n:0});o.sum+=r.pts;o.n++;});
  return Object.keys(t).map(function(k){return {team:k,pts:Math.round(t[k].sum/t[k].n),n:t[k].n};}).sort(function(a,b){return b.pts-a.pts;});}
 // Quizzes: the time left, the answer shown when it runs out (or on a click), and every quiz added up.
 function left(p){return started[p.pollId]?(+p.time||20)-(Date.now()-started[p.pollId])/1000:(+p.time||20);}
 function quizzes(){return all().map(def).filter(function(p){return p&&GR.indexOf(p.kind)>=0;}).map(function(p){return {poll:p,votes:V(p.pollId)};});}
 function paint(el){var p=def(el);if(!p)return;var r=p.kind==='board'?{board:totals(quizzes())}:tally(p,V(p.pollId));
  if(p.kind==='board'){r.teams=teamBoard(r.board);r.stars=starsOf();}
  if(p.kind==='quiz'){r.revealed=!!revealed[p.pollId];r.left=left(p);if(r.revealed)r.board=totals(quizzes());}
  if(ACT.indexOf(p.kind)>=0)r.revealed=!!revealed[p.pollId];
  if(p.kind==='crossword'||p.kind==='wordsearch')r.layout=LAY[p.pollId]||(LAY[p.pollId]=publicActivity(p,true));   // (the grid on the screen, laid out once)
  if(r.board)r.board=r.board.filter(function(x){return !(ad(x.id)||{}).noRank;});
  el.querySelector('.rv-poll-res').innerHTML=render(p,r,ACC,LBL);}
 function reveal(p){if(revealed[p.pollId])return;revealed[p.pollId]=true;all().forEach(paint);
  var board=totals(quizzes()),mine=tally(p,V(p.pollId)).board;
  conns.forEach(function(c){if(!c.voter)return;var m=mine.filter(function(x){return x.id===c.voter;})[0],k=board.map(function(x){return x.id;}).indexOf(c.voter);
   var nr=(ad(c.voter)||{}).noRank;send(c,{type:'quizresult',pollId:p.pollId,answered:!!m,ok:!!(m&&m.ok),pts:m?m.pts:0,total:k>=0?board[k].pts:0,rank:k>=0&&!nr?k+1:0,of:nr?0:board.length});starsTo(c,c.voter);});}
 function tick(){var p=current();if(!p||p.kind!=='quiz'||revealed[p.pollId]){clearInterval(timer);timer=null;return;}
  var el=all().filter(function(e){var q=def(e);return q&&q.pollId===p.pollId;})[0];if(el)paint(el);if(left(p)<=0&&!waiting(p))reveal(p);}
 function current(){var s=Reveal.getCurrentSlide(),el=s&&s.querySelector('.rv-poll');var p=el&&def(el);if(!p)return null;var act=ACT.indexOf(p.kind)>=0;
  return {pollId:p.pollId,kind:p.kind,question:p.question,options:act?[]:p.options,pub:act?publicActivity(p):null,time:p.time,left:p.kind==='quiz'?left(p):null,revealed:!!revealed[p.pollId],
   mode:p.mode,teams:TEAMS.length&&GR.indexOf(p.kind)>=0?TEAMS:undefined,min:p.min,max:p.max,step:p.step,unit:p.unit,images:p.kind==='image'?p.images:undefined,image:p.kind==='point'||p.kind==='draw'?p.image:undefined};}
 function send(c,m){try{if(c.open)c.send(m);}catch(e){}}
 // (After each answer: its stars to the phone, and the leaderboards up to date.)
 function starsTo(c,who){all().forEach(function(e){var q=def(e);if(q&&q.kind==='board')paint(e);});var s=starsOf()[who];if(s)send(c,{type:'stars',stars:s.stars,level:s.level});}
 function qaList(p){var r=tally(p,votes[p.pollId]||(votes[p.pollId]=load(p.pollId)));return (r.questions||[]).map(function(q){return {id:q.id,text:q.text,up:q.up};});}
 function broadcastQA(p){var cur=current();if(!cur||cur.pollId!==p.pollId)return;conns.forEach(function(c){send(c,{type:'qa',pollId:p.pollId,list:qaList(p)});});}
 function broadcast(){var p=current();
  // A quiz starts the first time its slide is shown (one already played, with answers saved, is shown solved).
  if(p&&p.kind==='quiz'&&!started[p.pollId]){if(Object.keys(V(p.pollId)).length)revealed[p.pollId]=true;else{started[p.pollId]=Date.now();p.left=left(p);if(!timer)timer=setInterval(tick,250);}}
  conns.forEach(function(c){send(c,{type:'poll',poll:forPhone(p,c)});if(p&&p.kind==='qa')send(c,{type:'qa',pollId:p.pollId,list:qaList(p)});});}
 function js(src){return new Promise(function(ok,ko){var s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=ko;document.head.appendChild(s);});}
 function clean(p,a){if(p.kind==='word')return String(a||'').slice(0,60);
  if(p.kind==='open'){var t=String(a||'').trim().slice(0,200);return t?{t:t,time:Date.now()}:null;}
  if(p.kind==='draw'||p.kind==='photo'){var im=String(a&&a.img||'');return /^data:image\\/(png|jpeg|webp);base64,[A-Za-z0-9+\\/=]+$/.test(im)&&im.length<=300000?{img:im,time:Date.now(),n:String(a.n||'').slice(0,24)}:null;}
  if(p.kind==='number'){var x=+a,lo=isFinite(+p.min)?+p.min:-1e12,hi=isFinite(+p.max)?+p.max:1e12;return a!==''&&a!=null&&isFinite(x)&&x>=lo&&x<=hi?x:null;}
  if(p.kind==='point'){var px=+(a&&a.x),py=+(a&&a.y);return isFinite(px)&&isFinite(py)&&px>=0&&px<=100&&py>=0&&py<=100?{x:Math.round(px*10)/10,y:Math.round(py*10)/10}:null;}
  if(p.kind==='rank'){var L=p.options.length,o=(Array.isArray(a)?a:[]).map(Number),seen={};if(o.length!==L)return null;for(var i=0;i<L;i++){if(!(o[i]>=0&&o[i]<L)||seen[o[i]])return null;seen[o[i]]=1;}return o;}if(p.kind==='multi')return (Array.isArray(a)?a:[]).map(Number).filter(function(x){return x>=0&&x<p.options.length;}).slice(0,20);
  var n=+a;return p.kind==='rating'?(n>=1&&n<=5?Math.round(n):null):(n>=0&&n<p.options.length?n:null);}
 function start(tries){code='';for(var i=0;i<5;i++)code+=AB[Math.floor(Math.random()*AB.length)];
  peer=new Peer('revela-vote-'+code);
  peer.on('open',function(){var url=VOTE+'?c='+code;badge(url);all().forEach(function(el){el.querySelector('.rv-poll-code').textContent=code;
    el.querySelector('.rv-poll-url').textContent=url.replace(/^https?:\\/\\//,'').replace(/\\?.*$/,'');
    if(window.QRCode)QRCode.toCanvas(el.querySelector('canvas'),url,{width:220,margin:1},function(){});});});
  peer.on('connection',function(c){conns.push(c);
    c.on('open',function(){if(CLASS){send(c,{type:'css',css:css()});send(c,slideMsg());}var p=current();send(c,{type:'poll',poll:forPhone(p,c)});if(p&&p.kind==='qa')send(c,{type:'qa',pollId:p.pollId,list:qaList(p)});});
    c.on('data',function(d){if(d&&d.type==='lang'){c.lang=/^[a-z]{2}$/.test(d.lang||'')?d.lang:null;return;}
      if(d&&d.type==='hi'){c.voter=String(d.voter||'').slice(0,40);c.name=String(d.name||'').trim().slice(0,24);
        var aa=ad(c.voter);if(aa){send(c,{type:'adapt',read:!!aa.read,big:!!aa.big,noRank:!!aa.noRank,time:aa.time||1,fewer:!!aa.fewer});var cp=current();if(cp&&cp.kind==='quiz')send(c,{type:'poll',poll:forPhone(cp,c)});}
        if(TEAMS.indexOf(d.team)>=0&&c.voter){teamOf[c.voter]=d.team;keepTeams();all().forEach(function(e){var q=def(e);if(q&&q.kind==='board')paint(e);});}return;}if(!d||d.type!=='vote')return;var el=all().filter(function(e){var p=def(e);return p&&p.pollId===d.pollId;})[0];if(!el)return;
      var p=def(el),who=String(d.voter).slice(0,40),V=votes[p.pollId]||(votes[p.pollId]=load(p.pollId));
      if(p.kind==='qa'){var a=d.answer||{};
        if(a.ask){var txt=String(a.ask).trim().slice(0,200);if(!txt)return;var n=Object.keys(V).filter(function(k){return V[k].by===who;}).length;if(n>=5)return;
          var id='q:'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);V[id]={t:txt,by:who,time:Date.now(),up:{}};if(p.moderate)V[id].hold=1;}
        else if(a.up&&V[a.up]){if(V[a.up].up[who])delete V[a.up].up[who];else V[a.up].up[who]=1;}else return;
        store(p.pollId);paint(el);send(c,{type:'ok',pollId:p.pollId,held:!!(p.moderate&&a.ask)});broadcastQA(p);modPaint();return;}
      c.voter=who;
      if(p.kind==='quiz'){if(revealed[p.pollId]||!started[p.pollId]||V[who])return;var q=clean(p,d.answer);if(q===null)return;
        V[who]={a:q,t:Date.now()-started[p.pollId],n:String(d.name||'').slice(0,24)};if(p.mode==='confidence')V[who].s=!!d.sure;if((ad(who)||{}).time>1)V[who].x=ad(who).time;store(p.pollId);paint(el);send(c,{type:'ok',pollId:p.pollId});starsTo(c,who);return;}
      if(ACT.indexOf(p.kind)>=0){if(revealed[p.pollId]||V[who])return;var arr=(Array.isArray(d.answer)?d.answer:[]).slice(0,40).map(function(x){return String(x==null?'':x).slice(0,100);});
        V[who]={a:arr,n:String(d.name||'').slice(0,24)};store(p.pollId);paint(el);send(c,{type:'ok',pollId:p.pollId});starsTo(c,who);return;}
      var a2=clean(p,d.answer);if(a2===null||a2==='')return;V[who]=a2;
      store(p.pollId);paint(el);send(c,{type:'ok',pollId:p.pollId});starsTo(c,who);});
    c.on('close',function(){conns=conns.filter(function(x){return x!==c;});});});
  peer.on('error',function(e){if(e.type==='unavailable-id'&&tries<5){peer.destroy();start(tries+1);}});}
 all().forEach(paint);
 // Someone at random (ClassPoint's name picker): among the phones connected with a name — or those who answered with one —,
 // a quick roulette and the name, big; their phone is told. N or the right-click menu.
 function LT(x){return (LBL&&LBL[x])||x;}
 function names(){var seen={},out=[];conns.forEach(function(c){if(c.open!==false&&c.name&&!seen[c.name]){seen[c.name]=1;out.push({name:c.name,c:c});}});
  all().forEach(function(el){var p=def(el);if(!p)return;var V=votes[p.pollId]||{};for(var k in V){var n=V[k]&&V[k].n;if(n&&!seen[n]){seen[n]=1;out.push({name:n,c:null});}}});return out;}
 window.rvPick=function(){var list=names(),box=document.getElementById('rv-pick');if(box)box.remove();
  box=document.createElement('div');box.id='rv-pick';box.style.cssText='position:fixed;inset:0;z-index:70;display:grid;place-items:center;background:rgba(0,0,0,.6);color:#fff;font:700 64px/1.2 system-ui,sans-serif;text-align:center;cursor:pointer';
  box.innerHTML='<div><div style="font-size:24px;font-weight:500;opacity:.8;margin-bottom:12px">'+LT('¿A quién le toca?')+'</div><div class="rv-pick-name"></div><div style="font-size:16px;font-weight:400;opacity:.7;margin-top:18px">'+(list.length?LT('Clic para cerrar · N para otra vez'):LT('Aún no hay nadie con nombre: que lo escriban al entrar en la votación.'))+'</div></div>';
  (document.querySelector('.reveal')||document.body).appendChild(box);var out=box.querySelector('.rv-pick-name');
  box.addEventListener('click',function(e){e.stopPropagation();box.remove();});
  if(!list.length)return;var n=0,steps=18+Math.floor(Math.random()*list.length),pick=null;
  (function spin(){pick=list[n%list.length];out.textContent=pick.name;n++;if(n<steps)setTimeout(spin,40+n*8);else{out.style.color='#ffd34d';if(pick.c)send(pick.c,{type:'picked'});}})();};
 // The open answers of this slide marked by the AI (presenting in the editor, which has it: window.parent.__revelaGrade):
 // each one's mark and comment to its phone, and the list here.
 var GRADE=null;try{GRADE=window.parent!==window&&window.parent.__revelaGrade;}catch(e){}
 window.rvGradeOpen=GRADE?function(){var s=Reveal.getCurrentSlide(),el=s&&s.querySelector('.rv-poll'),p=el&&def(el);if(!p||p.kind!=='open')return false;
  var Vp=V(p.pollId),list=[];for(var k in Vp)if(Vp[k]&&Vp[k].t)list.push({id:k,text:Vp[k].t});if(!list.length)return true;
  var box=document.createElement('div');box.id='rv-grade';box.style.cssText='position:fixed;inset:0;z-index:70;display:grid;place-items:center;background:rgba(0,0,0,.55)';
  box.innerHTML='<div style="max-width:min(820px,92vw);max-height:84vh;overflow:auto;background:#fff;color:#1d1f24;border-radius:14px;padding:22px 26px;font:18px/1.4 system-ui,sans-serif;text-align:left">'+LT('La IA está corrigiendo…')+'</div>';
  (document.querySelector('.reveal')||document.body).appendChild(box);box.addEventListener('click',function(e){if(e.target===box)box.remove();});
  Promise.resolve(GRADE(p.question,p.rubric||'',list)).then(function(marks){var inner=box.firstChild;if(!marks){inner.textContent=LT('Para corregir con IA, conéctala en el editor.');return;}
   var by={};marks.forEach(function(m){by[m.id]=m;});
   conns.forEach(function(c){var m=c.voter&&by[c.voter];if(m)send(c,{type:'feedback',pollId:p.pollId,score:m.score,text:m.feedback});});
   var esc=function(x){return String(x).replace(/[&<>"]/g,function(ch){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch];});};
   inner.innerHTML='<h2 style="margin:0 0 10px;font-size:24px">'+esc(p.question)+'</h2>'+list.map(function(a){var m=by[a.id];return '<div style="padding:8px 0;border-top:1px solid #ddd"><b style="display:inline-block;min-width:3.2em;color:'+(m&&m.score>=5?'#26890c':'#b3261e')+'">'+(m?m.score+'/10':'—')+'</b> '+esc(a.text)+(m?'<div style="font-size:15px;color:#555;margin-top:2px">'+esc(m.feedback)+'</div>':'')+'</div>';}).join('');},
   function(){box.firstChild.textContent=LT('No se pudo corregir.');});return true;}:null;
 // The audience's questions moderated (poll.moderate, Slido's moderation): approve, hide or discard each one, in a
 // window of its own for the presenter's screen — the projector only says how many are waiting. M or the right-click menu.
 var modWin=null,modPoll=null;
 function modPaint(){if(!modWin||modWin.closed||!modPoll)return;var Vp=V(modPoll.pollId),d=modWin.document,l=d.getElementById('l');if(!l)return;
  var e=function(x){return String(x).replace(/[&<>"]/g,function(ch){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch];});};
  var ks=Object.keys(Vp).filter(function(k){return Vp[k]&&Vp[k].t;}).sort(function(a,b){return (Vp[b].hold?1:0)-(Vp[a].hold?1:0)||(Vp[a].time||0)-(Vp[b].time||0);});
  var tm=function(t){return tally(modPoll,{x:{t:t}}).questions[0].text;};
  l.innerHTML=ks.length?ks.map(function(k){var q=Vp[k];return '<div class="r'+(q.hold?' h':'')+'"><span>'+e(tm(q.t))+(q.hold?'':' <small>\u25B2 '+Object.keys(q.up||{}).length+'</small>')+'</span>'
   +(q.hold?'<button data-a="ok" data-k="'+e(k)+'">'+LT('Aprobar')+'</button>':'<button data-a="hide" data-k="'+e(k)+'">'+LT('Ocultar')+'</button>')+'<button data-a="del" data-k="'+e(k)+'">'+LT('Descartar')+'</button></div>';}).join('')
   :'<p>'+LT('Aún no hay preguntas.')+'</p>';}
 function modAct(a,k){var p=modPoll,Vp=p&&V(p.pollId);if(!Vp||!Vp[k])return;if(a==='ok')delete Vp[k].hold;else if(a==='hide')Vp[k].hold=1;else if(a==='del')delete Vp[k];else return;
  store(p.pollId);all().forEach(function(el){var q=def(el);if(q&&q.pollId===p.pollId)paint(el);});broadcastQA(p);modPaint();}
 window.rvModerate=function(){var s=Reveal.getCurrentSlide(),el=s&&s.querySelector('.rv-poll'),p=el&&def(el);if(!p||p.kind!=='qa')return false;modPoll=p;
  if(!modWin||modWin.closed){modWin=window.open('','rv-moderate','width=520,height=680');if(!modWin)return false;var d=modWin.document;
   d.open();d.write('<!doctype html><html><head><meta charset="utf-8"><title></title><style>body{margin:0;padding:18px 20px;font:16px/1.4 system-ui,sans-serif;background:#f7f7f8;color:#1d1f24}h1{font-size:20px;margin:0 0 4px}p.n{margin:0 0 14px;color:#555;font-size:14px}'
    +'.r{display:flex;gap:8px;align-items:center;padding:10px 12px;margin:0 0 8px;border-radius:10px;background:#fff;border:1px solid #ddd}.r.h{border-color:#d89e00;background:#fff8e6}.r span{flex:1;overflow-wrap:anywhere}small{color:#777}'
    +'button{font:inherit;font-size:14px;padding:6px 10px;border-radius:8px;border:1px solid #bbb;background:#fff;cursor:pointer}button[data-a=ok]{background:#26890c;border-color:#26890c;color:#fff}</style></head><body><h1></h1><p class="n"></p><div id="l"></div></body></html>');d.close();
   d.addEventListener('click',function(ev){var b=ev.target.closest&&ev.target.closest('button');if(b)modAct(b.getAttribute('data-a'),b.getAttribute('data-k'));});}
  var D=modWin.document;D.title=LT('Moderar las preguntas');D.querySelector('h1').textContent=p.question||LT('Moderar las preguntas');
  D.querySelector('p.n').textContent=p.moderate?LT('Las nuevas esperan aquí a que las apruebes; en la pantalla solo se ve cuántas esperan.'):'';modPaint();modWin.focus();return true;};
 window.addEventListener('keydown',function(e){if((e.key==='n'||e.key==='N')&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!/INPUT|TEXTAREA/.test(e.target.tagName)){e.preventDefault();window.rvPick();}
  else if((e.key==='m'||e.key==='M')&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!/INPUT|TEXTAREA/.test(e.target.tagName)){if(window.rvModerate())e.preventDefault();}
  else if(e.key==='Escape'){var b=document.getElementById('rv-pick')||document.getElementById('rv-grade');if(b){b.remove();e.stopImmediatePropagation();}}},true);
 // A click on a quiz shows its answer at once.
 document.addEventListener('click',function(e){var el=e.target.closest&&e.target.closest('.rv-poll');var p=el&&def(el);if(p&&((p.kind==='quiz'&&started[p.pollId])||ACT.indexOf(p.kind)>=0)){e.stopPropagation();if(revealed[p.pollId]&&ACT.indexOf(p.kind)>=0)return;reveal(p);}},true);
 js(${JSON.stringify(QRCODE)}).catch(function(){}).then(function(){return js(${JSON.stringify(PEERJS)});}).then(function(){start(0);});
 Reveal.on('slidechanged',broadcast);
 // Classroom: the slide to every device, as it changes (and its fragments).
 function css(){return [].slice.call(document.querySelectorAll('link[rel=stylesheet],style')).map(function(n){return n.outerHTML;}).join('\\n');}
 // (The slide's polls without their answers — an activity's options are its solution, a quiz's has the right one —: the
 // phones only read their question and what can be shown, a crossword's clues, a word search's words or hints.)
 function bare(p){var o=p.options||[],k=p.kind;return {kind:k,question:p.question,options:GR.indexOf(k)<0?o:k==='quiz'?o:k==='crossword'||k==='wordsearch'?o.map(function(x){var c=String(x).split('=');return c.length>1?'= '+c.slice(1).join('=').trim():k==='wordsearch'?x:'';}):[]};}
 function slideMsg(){var s=Reveal.getCurrentSlide(),bg=s&&Reveal.getSlideBackground&&Reveal.getSlideBackground(s),cfg=Reveal.getConfig();
  // (On the markup, not a copy of the slide: a copied video or picture would load again.)
  var ta=document.createElement('textarea'),html=s?s.outerHTML.replace(/ data-poll="([^"]*)"/g,function(m,v){ta.innerHTML=v;var p;try{p=JSON.parse(ta.value);}catch(e){return ' data-poll="{}"';}
   return ' data-poll="'+JSON.stringify(bare(p)).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')+'"';}):'';
  return {type:'slide',html:html,bg:bg?bg.outerHTML:'',w:cfg.width,h:cfg.height,cls:document.querySelector('.reveal').className,n:Reveal.getSlidePastCount()+1,of:Reveal.getTotalSlides()};}
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
 ${chartTableHTML.toString()}
 document.querySelectorAll('iframe[data-refresh-min]').forEach(function(f){var m=+f.dataset.refreshMin;if(m>0)setInterval(function(){f.src=f.src;},m*60000);});
 document.querySelectorAll('.rv-live-chart').forEach(function(el){var b;try{b=JSON.parse(el.getAttribute('data-chart'));}catch(e){return;}
  function load(){fetch(b.dataUrl,{cache:'no-store'}).then(function(r){return r.ok?r.text():Promise.reject();}).then(function(t){
    var g=parseChartGrid(t);if(!g.data.length)return;b.data=g.data;b.series=g.series.length?g.series:undefined;if(g.names[0])b.seriesName=g.names[0];
    el.innerHTML=chartSVG(b).replace('<svg ','<svg aria-hidden="true" ')+chartTableHTML(b,el.getAttribute('aria-label')||'');}).catch(function(){});}
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
  el.style.animation=el.dataset.kf+' '+el.dataset.dur+'ms ease '+el.dataset.del+'ms both';el.classList.add('on');
  if(el.dataset.mfx)el.dispatchEvent(new CustomEvent('rvmfx',{bubbles:true}));}
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
  inner.querySelectorAll('iframe,video,audio,model-viewer').forEach(function(m){var d=document.createElement('div');d.className='rv-ov-ph';d.style.cssText=m.style.cssText;
   // (A 3D model: its picture, in its own box, if it has one.)
   var p=m.getAttribute('data-poster'),k=parseFloat(m.getAttribute('data-bleed'))||1;
   if(p){d.style.background='none';d.style.webkitMaskImage=d.style.maskImage='none';var i=document.createElement('img');i.src=p;i.alt='';i.style.cssText='position:absolute;inset:'+((1-1/k)*50)+'%;width:'+(100/k)+'%;height:'+(100/k)+'%;object-fit:contain;margin:0;border:0;max-width:none;max-height:none;background:none;box-shadow:none';d.appendChild(i);}
   m.replaceWith(d);});
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
 function inEditor(){try{return window.parent!==window&&!!window.parent.document.getElementById('present-overlay');}catch(e){return false;}}
 function go(i){var x=items[i];close();Reveal.slide(x.h,x.v);}
 function mark(){items.forEach(function(x,i){x.el.classList.toggle('sel',i===sel);});var e=items[sel]&&items[sel].el;if(e)e.scrollIntoView({block:'nearest'});}
 function cols(){var g=items[0]&&items[0].el.parentNode;return g?getComputedStyle(g).gridTemplateColumns.split(' ').length:1;}
 window.addEventListener('keydown',function(e){
  var k=e.key;
  // (Presenting inside the editor, Esc is the way out — the editor takes it —; O still opens the overview.)
  if(!box&&k==='Escape'&&(inEditor()||document.querySelector('.rv-pop')))return;   // (and an object's open window: Esc closes it, LINK_JS)
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
