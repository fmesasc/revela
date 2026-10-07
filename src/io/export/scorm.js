// The presentation as a SCORM 1.2 package (a .zip), for learning platforms that take SCORM — Moodle, Canvas,
// Blackboard, Chamilo, Sakai…, also without internet or where LTI isn't set up (as Genially's premium export).
// Inside: the presentation, self-contained (reveal.js in it: io/formats/html.js offlineHTML), with its quizzes and
// activities answered by each person in it (io/runtime/selfpaced.js), and a script that tells the platform:
//   - where the person is (cmi.core.lesson_location: they come back to that slide), and
//   - the mark: the average of its quizzes and activities, 0–100 (cmi.core.score.raw), «passed» from the pass mark,
//     «failed» below it, once all are answered; without any, «completed» on reaching the last slide.
// The marks so far travel in cmi.suspend_data, so leaving and coming back keeps them.

import { state } from '../../core/store.js';
import { JSZIP, loadScript } from '../../core/vendor.js';
import { buildHTML, offlineHTML } from '../formats/html.js';
import { download, slug } from '../files.js';

const xml = s => String(s ?? '').replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));

// The script inside the page (ES5: platforms open packages in all kinds of browsers).
export const scormRuntime = pass => `(function(){var PASS=${Math.max(0, Math.min(100, Math.round(+pass) || 0))};
function find(w){for(var i=0;w&&i<12;i++){try{if(w.API)return w.API;}catch(e){return null;}if(w.parent===w)break;w=w.parent;}return null;}
var api=find(window)||(window.opener?find(window.opener):null),ok=false;
function get(k){try{return api?String(api.LMSGetValue(k)||''):'';}catch(e){return '';}}
function set(k,v){try{if(api)api.LMSSetValue(k,String(v));}catch(e){}}
if(api){try{ok=String(api.LMSInitialize(''))==='true';}catch(e){}}
var KINDS=['quiz','order','match','gaps','label'],graded=0;
[].slice.call(document.querySelectorAll('.rv-poll')).forEach(function(el){try{if(KINDS.indexOf(JSON.parse(el.getAttribute('data-poll')).kind)>=0)graded++;}catch(e){}});
var scores={};try{scores=JSON.parse(get('cmi.suspend_data')||'{}')||{};}catch(e){scores={};}
var st=get('cmi.core.lesson_status');if(api&&(!st||st==='not attempted'))set('cmi.core.lesson_status','incomplete');
function report(){if(!api)return;var i=Reveal.getIndices().h;set('cmi.core.lesson_location',i);set('cmi.suspend_data',JSON.stringify(scores));
var n=0,sum=0;for(var k in scores){n++;sum+=+scores[k]||0;}
if(graded){var raw=Math.round(sum/graded*100);set('cmi.core.score.min',0);set('cmi.core.score.max',100);set('cmi.core.score.raw',raw);
if(n>=graded)set('cmi.core.lesson_status',raw>=PASS?'passed':'failed');}
else if(Reveal.isLastSlide())set('cmi.core.lesson_status','completed');
try{api.LMSCommit('');}catch(e){}}
window.__revelaScored=function(id,s){scores[id]=Math.max(0,Math.min(1,+s||0));report();};
var back=get('cmi.core.lesson_location');
function start(){if(/^\\d+$/.test(back)&&+back>0)Reveal.slide(+back);report();}
if(Reveal.isReady())start();else Reveal.on('ready',start);
Reveal.on('slidechanged',report);
var fin=false;function finish(){if(fin||!api)return;fin=true;report();try{api.LMSFinish('');}catch(e){}}
window.addEventListener('pagehide',finish);window.addEventListener('beforeunload',finish);})();`;

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

// → { blob, offline } (offline: reveal.js could be put inside; else the page needs internet to open).
export async function buildScorm(deck = state.deck, { pass = 50 } = {}) {
  const { html, offline } = await offlineHTML(buildHTML(deck, { selfPaced: true }));
  // (Before the page's last </body>: reveal.js, put inside the page, has that text in its own code too.)
  const at = html.toLowerCase().lastIndexOf('</body>'), tag = `<script>${scormRuntime(pass)}</script>`;
  const page = at < 0 ? html + tag : html.slice(0, at) + tag + html.slice(at);
  const JSZip = await loadScript(JSZIP, 'JSZip'), zip = new JSZip();
  zip.file('imsmanifest.xml', scormManifest(deck, pass));
  zip.file('index.html', page);
  return { blob: await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }), offline };
}
export async function exportScorm(opts) {
  const r = await buildScorm(state.deck, opts);
  download(r.blob, slug(state.deck.name) + '.scorm.zip');
  return r.offline;
}
