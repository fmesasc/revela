// The presentation as a SCORM 1.2 package (a .zip), for learning platforms that take SCORM — Moodle, Canvas,
// Blackboard, Chamilo, Sakai…, also without internet or where LTI isn't set up (as Genially's export). Two kinds:
// - fixed: the presentation inside it, self-contained (reveal.js in it: io/formats/html.js offlineHTML), as it is
//   now; it works without internet. A change means exporting and uploading it again.
// - dynamic (as Genially's «dynamic SCORM»): a small launcher that opens it from Revela's cloud (view.html?doc=…&scorm=1,
//   shared by link), so whatever is corrected there is what students see next time, without uploading anything.
// Either way, its quizzes and activities are answered by each person in it (io/runtime/selfpaced.js), and the
// platform is told:
//   - where the person is (cmi.core.lesson_location: they come back to that slide), and
//   - the mark: the average of its quizzes and activities, 0–100 (cmi.core.score.raw), «passed» from the pass mark,
//     «failed» below it, once all are answered; without any, «completed» on reaching the last slide.
// The marks so far travel in cmi.suspend_data, so leaving and coming back keeps them.
//
// Two scripts: scormPage (in the presentation: what happens in it, as messages) and scormReporter (next to the
// platform's API: the marks and the place). In a fixed package both are in the page; in a dynamic one the page is
// on revelaslides.com and the reporter in the launcher, and the messages cross with postMessage.

import { state } from '../../core/store.js';
import { JSZIP, loadScript } from '../../core/vendor.js';
import { OFFICIAL_SITE } from '../../core/config.js';
import { buildHTML, offlineHTML } from '../formats/html.js';
import { download, slug } from '../files.js';

const xml = s => String(s ?? '').replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));

// In the presentation (ES5: platforms open packages in all kinds of browsers): its graded items, each mark, each slide.
// send: how the messages leave — window.__revelaScormSend (the reporter's, in the same page) or the window above.
// Where to start: window.__revelaScormAt (fixed) or ?at=N (dynamic).
export const scormPage = `(function(){var KINDS=['quiz','order','match','gaps','label'],graded=0;
[].slice.call(document.querySelectorAll('.rv-poll')).forEach(function(el){try{if(KINDS.indexOf(JSON.parse(el.getAttribute('data-poll')).kind)>=0)graded++;}catch(e){}});
function send(m){m.revelaScorm=1;if(typeof window.__revelaScormSend==='function')window.__revelaScormSend(m);else if(window.parent!==window)window.parent.postMessage(m,'*');}
window.__revelaScored=function(id,s){send({t:'score',id:String(id),s:Math.max(0,Math.min(1,+s||0))});};
function slide(){send({t:'slide',i:Reveal.getIndices().h,last:Reveal.isLastSlide()});}
function start(){var at=window.__revelaScormAt;if(at==null){var q=/[?&]at=(\\d+)/.exec(location.search);at=q?+q[1]:0;}
if(at>0)Reveal.slide(at);send({t:'init',graded:graded});slide();}
if(Reveal.isReady())start();else Reveal.on('ready',start);Reveal.on('slidechanged',slide);
window.addEventListener('pagehide',function(){send({t:'end'});});})();`;

// Next to the platform's API (SCORM 1.2: window.API in a window above). onMessage(m) takes what scormPage sends;
// window.__revelaScormAtStart: the slide to come back to.
export const scormReporter = pass => `(function(){var PASS=${Math.max(0, Math.min(100, Math.round(+pass) || 0))};
function find(w){for(var i=0;w&&i<12;i++){try{if(w.API)return w.API;}catch(e){return null;}if(w.parent===w)break;w=w.parent;}return null;}
var api=find(window.parent!==window?window.parent:window)||find(window)||(window.opener?find(window.opener):null);
function get(k){try{return api?String(api.LMSGetValue(k)||''):'';}catch(e){return '';}}
function set(k,v){try{if(api)api.LMSSetValue(k,String(v));}catch(e){}}
if(api){try{api.LMSInitialize('');}catch(e){}}
var scores={};try{scores=JSON.parse(get('cmi.suspend_data')||'{}')||{};}catch(e){scores={};}
var st=get('cmi.core.lesson_status');if(api&&(!st||st==='not attempted'))set('cmi.core.lesson_status','incomplete');
var back=get('cmi.core.lesson_location');window.__revelaScormAtStart=/^\\d+$/.test(back)?+back:0;
var graded=0,at=0,last=false,fin=false;
function report(){if(!api)return;set('cmi.core.lesson_location',at);set('cmi.suspend_data',JSON.stringify(scores));
var n=0,sum=0;for(var k in scores){n++;sum+=+scores[k]||0;}
if(graded){var raw=Math.round(sum/graded*100);set('cmi.core.score.min',0);set('cmi.core.score.max',100);set('cmi.core.score.raw',raw);
if(n>=graded)set('cmi.core.lesson_status',raw>=PASS?'passed':'failed');}
else if(last)set('cmi.core.lesson_status','completed');
try{api.LMSCommit('');}catch(e){}}
function finish(){if(fin||!api)return;fin=true;report();try{api.LMSFinish('');}catch(e){}}
window.__revelaScormMessage=function(m){if(!m||!m.revelaScorm)return;
if(m.t==='init'){graded=Math.max(0,+m.graded||0);report();}
else if(m.t==='score'){scores[String(m.id).slice(0,60)]=Math.max(0,Math.min(1,+m.s||0));report();}
else if(m.t==='slide'){at=Math.max(0,Math.round(+m.i)||0);last=!!m.last;report();}
else if(m.t==='end')finish();};
window.addEventListener('pagehide',finish);window.addEventListener('beforeunload',finish);})();`;

// The fixed package's page: the reporter first (it knows where to come back to), then the page's script.
export const scormRuntime = pass => scormReporter(pass)
  + 'window.__revelaScormAt=window.__revelaScormAtStart;window.__revelaScormSend=function(m){window.__revelaScormMessage(m);};' + scormPage;

// The dynamic package's page: the presentation from Revela's cloud in a frame that fills it, and the reporter.
export function scormLauncher(docId, title, pass, site = OFFICIAL_SITE) {
  const origin = new URL(site).origin, src = `${site}/app/view.html?doc=${encodeURIComponent(docId)}&scorm=1`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${xml(title)}</title>
<style>html,body{margin:0;height:100%;background:#000}iframe{border:0;width:100%;height:100%;display:block}p{color:#fff;font:16px system-ui,sans-serif;padding:20px}</style></head>
<body><iframe id="rv" title="${xml(title)}" allow="fullscreen; autoplay" allowfullscreen></iframe>
<noscript><p>${xml(title)}</p></noscript>
<script>${scormReporter(pass)}
(function(){var f=document.getElementById('rv'),ORIGIN=${JSON.stringify(origin)};
f.src=${JSON.stringify(src)}+'&at='+(window.__revelaScormAtStart||0);
window.addEventListener('message',function(e){if(e.source!==f.contentWindow||e.origin!==ORIGIN)return;window.__revelaScormMessage(e.data);});})();
</script></body></html>`;
}

// The manifest: one course with one lesson (the page), SCORM 1.2.
export function scormManifest(deck, pass) {
  const id = 'revela-' + String(deck.id || slug(deck.name || 'presentacion')).replace(/[^\w-]/g, '').slice(0, 60), title = xml(deck.name || 'Revela');
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${id}" version="1.0" xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2" xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata>
  <organizations default="org1"><organization identifier="org1"><title>${title}</title>
    <item identifier="item1" identifierref="res1" isvisible="true"><title>${title}</title><adlcp:masteryscore>${Math.round(+pass) || 0}</adlcp:masteryscore></item>
  </organization></organizations>
  <resources><resource identifier="res1" type="webcontent" adlcp:scormtype="sco" href="index.html"><file href="index.html"/></resource></resources>
</manifest>
`;
}

// → { blob, offline } (offline: it works without internet; a dynamic one never does).
// opts: { pass, docId (dynamic: the presentation in Revela's cloud, shared by link) }
export async function buildScorm(deck = state.deck, { pass = 50, docId = null } = {}) {
  let page, offline = false;
  if (docId) page = scormLauncher(docId, deck.name || 'Revela', pass);
  else {
    const r = await offlineHTML(buildHTML(deck, { selfPaced: true })); offline = r.offline;
    // (Before the page's last </body>: reveal.js, put inside the page, has that text in its own code too.)
    const at = r.html.toLowerCase().lastIndexOf('</body>'), tag = `<script>${scormRuntime(pass)}</script>`;
    page = at < 0 ? r.html + tag : r.html.slice(0, at) + tag + r.html.slice(at);
  }
  const JSZip = await loadScript(JSZIP, 'JSZip'), zip = new JSZip();
  zip.file('imsmanifest.xml', scormManifest(deck, pass));
  zip.file('index.html', page);
  return { blob: await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }), offline };
}
export async function exportScorm(opts) {
  const r = await buildScorm(state.deck, opts);
  download(r.blob, slug(state.deck.name) + (opts?.docId ? '.scorm-dinamico.zip' : '.scorm.zip'));
  return r.offline;
}
