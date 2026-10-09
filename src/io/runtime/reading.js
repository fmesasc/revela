// Reading mode («Modo lectura»): the slide's words, in reading order, in a calm column — for someone with
// dyslexia or low vision, or who just wants to read at their pace. Not the slide changed (its layout is
// exact: another font or spacing would break it), but its text shown apart, as the British Dyslexia
// Association's style guide asks: a plain sans-serif (Verdana, Tahoma), larger, with more space between
// letters, words and lines, no italics, left-aligned, on a cream background; the pictures' descriptions;
// and reading aloud (the browser's voice). In the exported/shared presentation (its toolbar and right-click
// menu: ink.js) and on the students' devices in classroom mode (apps/vote).
//
// readingItems() is self-contained (no imports, no outer variables): its source is also put in exported pages.

// The slide's words → [{ t: 'h' | 'p' | 'li' | 'img' | 'q' | 'row', text, level? }], from its section element
// (rendered or parsed: positions come from the inline styles). Fragments not shown yet are left out.
export function readingItems(sec) {
  if (!sec) return [];
  var hidden = function (el) { return el.getAttribute && (el.getAttribute('aria-hidden') === 'true' || (el.classList.contains('fragment') && !el.classList.contains('visible')) || /display:\s*none/.test(el.getAttribute('style') || '')); };
  // (The objects are inside the slide's stage, where there is one.)
  var stage = [].filter.call(sec.children, function (c) { return c.classList && c.classList.contains('stage'); })[0] || sec;
  var blocks = [].slice.call(stage.children).filter(function (el) { return !/^(SCRIPT|STYLE|AUDIO|ASIDE|TEMPLATE)$/.test(el.tagName) && !hidden(el); });
  var num = function (v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; };
  var pos = function (el) { var s = el.getAttribute('style') || ''; return [num((s.match(/(?:^|;)\s*top:\s*([-\d.]+)px/) || [])[1]), num((s.match(/(?:^|;)\s*left:\s*([-\d.]+)px/) || [])[1])]; };
  blocks.sort(function (a, b) { var p = pos(a), q = pos(b); return Math.abs(p[0] - q[0]) > 24 ? p[0] - q[0] : p[1] - q[1]; });
  var size = function (el) { var m = (el.outerHTML || '').match(/font-size:\s*([\d.]+)px/g) || []; return m.reduce(function (x, s) { return Math.max(x, parseFloat(s.replace(/[^\d.]/g, ''))); }, 0); };
  var clean = function (s) { return String(s || '').replace(/ /g, ' ').replace(/[ \t]+/g, ' ').trim(); };
  var lines = function (el) {
    var d = el.ownerDocument.createElement('div');
    d.innerHTML = el.innerHTML.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n');
    [].forEach.call(d.querySelectorAll('style,script,[aria-hidden="true"]'), function (x) { x.remove(); });
    return d.textContent.split('\n').map(clean).filter(Boolean);
  };
  var sizes = blocks.map(size), top = Math.max.apply(null, sizes.concat([0])), out = [], titled = false;
  blocks.forEach(function (el, i) {
    var poll = el.getAttribute('data-poll');
    if (poll) { try { var p = JSON.parse(poll); if (p.question) out.push({ t: 'q', text: clean(p.question) }); (p.kind === 'choice' || p.kind === 'multi' || p.kind === 'quiz' ? p.options || [] : []).forEach(function (o) { out.push({ t: 'li', text: clean(o), level: 1 }); });
      // (A crossword's clues, never its words; a word search's words, or its hints when it has them.)
      if (p.kind === 'crossword' || p.kind === 'wordsearch') (p.options || []).forEach(function (o) { var x = String(o).split('='), c = clean(x.slice(1).join('='));
        if (c || p.kind === 'wordsearch') out.push({ t: 'li', text: c || clean(x[0]), level: 1 }); }); } catch (e) {} return; }
    var imgs = el.tagName === 'IMG' || el.tagName === 'MODEL-VIEWER' ? [el] : [].slice.call(el.querySelectorAll('img[alt],model-viewer[alt],[role="img"][aria-label]'));
    imgs.forEach(function (im) { var a = clean(im.getAttribute('alt') || im.getAttribute('aria-label')); if (a) out.push({ t: 'img', text: a }); });
    if (el.tagName === 'IMG' || el.tagName === 'MODEL-VIEWER') return;
    var table = el.tagName === 'TABLE' ? el : el.querySelector('table');
    if (table) { [].forEach.call(table.querySelectorAll('tr'), function (tr) { var c = [].map.call(tr.querySelectorAll('td,th'), function (x) { return clean(x.textContent); }).filter(Boolean); if (c.length) out.push({ t: 'row', text: c.join(' · ') }); }); return; }
    var lis = el.querySelectorAll('li');
    if (lis.length) {
      [].forEach.call(lis, function (li) { var depth = 0; for (var x = li.parentElement; x && x !== el; x = x.parentElement) if (/^(UL|OL)$/.test(x.tagName)) depth++;
        var own = li.cloneNode(true); [].forEach.call(own.querySelectorAll('ul,ol'), function (x) { x.remove(); }); var tx = clean(own.textContent); if (tx) out.push({ t: 'li', text: tx, level: depth || 1 }); });
      return;
    }
    var ls = lines(el); if (!ls.length) return;
    // (The title: the largest text on the slide, the first time; the rest, paragraphs.)
    if (!titled && sizes[i] >= 28 && sizes[i] === top) { titled = true; out.push({ t: 'h', text: ls.join(' ') }); return; }
    ls.forEach(function (l) { out.push({ t: 'p', text: l }); });
  });
  return out;
}

export const READING_CSS = `
#rv-read{position:fixed;top:0;right:0;bottom:0;width:min(600px,100vw);z-index:58;box-sizing:border-box;overflow:auto;padding:22px 28px 60px;background:#fbf6e9;color:#1d1d1f;
  box-shadow:-10px 0 34px rgba(0,0,0,.4);font:var(--rv-rs,22px)/1.7 Verdana,Tahoma,'Atkinson Hyperlegible',Arial,sans-serif;letter-spacing:.04em;word-spacing:.16em;text-align:left;display:none}
#rv-read.on{display:block}
#rv-read *{font-style:normal!important;text-align:left}
#rv-read .rv-rb{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 22px;position:sticky;top:-22px;padding:12px 0;background:#fbf6e9}
#rv-read .rv-rb button{font:15px/1 Verdana,Tahoma,Arial,sans-serif;letter-spacing:0;padding:9px 13px;border-radius:9px;border:1px solid #d8ccb0;background:#fff;color:#1d1d1f;cursor:pointer}
#rv-read .rv-rb button:hover,#rv-read .rv-rb button:focus-visible{background:#f1e7cf;outline:2px solid #2f5a8f}
#rv-read h2{font-size:1.25em;line-height:1.4;margin:0 0 .7em;font-weight:700}
#rv-read p{margin:0 0 .8em}
#rv-read ul{margin:0 0 .8em;padding-left:1.3em}#rv-read li{margin:0 0 .35em}#rv-read li.l2{margin-left:1.2em}#rv-read li.l3{margin-left:2.4em}
#rv-read .rv-ri{border-left:5px solid #c9b88a;padding:.15em 0 .15em .7em;color:#4a4436}
#rv-read .rv-rq{font-weight:700}
#rv-read .rv-rn{font:600 14px/1 Verdana,Tahoma,Arial,sans-serif;letter-spacing:.06em;color:#7a6d4f;margin:0 0 10px}`;

// The column's HTML from the items (text put as text). L: { img: 'Imagen', q: 'Pregunta' }.
export function readingHTML(items, L) {
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  var html = '', list = false;
  items.forEach(function (it) {
    var li = it.t === 'li' || it.t === 'row';
    if (li && !list) { html += '<ul>'; list = true; } else if (!li && list) { html += '</ul>'; list = false; }
    if (it.t === 'h') html += '<h2>' + esc(it.text) + '</h2>';
    else if (li) html += '<li class="l' + Math.min(3, it.level || 1) + '">' + esc(it.text) + '</li>';
    else if (it.t === 'img') html += '<p class="rv-ri">' + esc(L.img) + ': ' + esc(it.text) + '</p>';
    else if (it.t === 'q') html += '<p class="rv-rq">' + esc(L.q) + ': ' + esc(it.text) + '</p>';
    else html += '<p>' + esc(it.text) + '</p>';
  });
  return html + (list ? '</ul>' : '');
}

// In the exported presentation: the column, opened from the toolbar or the right-click menu (window.rvReading()).
// L: { read, listen, stop, bigger, smaller, close, img, q, slide, empty }
export function readingJS(L) {
  return `(function(){
 var L=${JSON.stringify(L)}, items=${readingItems.toString()}, toHTML=${readingHTML.toString()};
 var box=document.createElement('div');box.id='rv-read';box.setAttribute('role','dialog');box.setAttribute('aria-label',L.read);
 box.innerHTML='<div class="rv-rb"><button data-r="say">\\u25B6 '+L.listen+'</button><button data-r="sm" aria-label="'+L.smaller+'">A\\u2212</button><button data-r="lg" aria-label="'+L.bigger+'">A+</button><button data-r="x">\\u2715 '+L.close+'</button></div><div class="rv-rn"></div><div class="rv-rt" aria-live="polite"></div>';
 document.body.appendChild(box);
 var fs=22;try{fs=+localStorage.getItem('revela.read.size')||22;}catch(e){}
 function size(d){fs=Math.max(16,Math.min(40,fs+d));box.style.setProperty('--rv-rs',fs+'px');try{localStorage.setItem('revela.read.size',fs);}catch(e){}}
 size(0);
 function stop(){try{speechSynthesis.cancel();}catch(e){}var b=box.querySelector('[data-r=say]');b.textContent='\\u25B6 '+L.listen;}
 function fill(){if(!box.classList.contains('on'))return;stop();var sec=Reveal.getCurrentSlide(),its=items(sec);
  box.querySelector('.rv-rn').textContent=L.slide+' '+(Reveal.getSlides().indexOf(sec)+1)+' / '+Reveal.getTotalSlides();
  box.querySelector('.rv-rt').innerHTML=its.length?toHTML(its,L):'<p>'+L.empty+'</p>';}
 window.rvReading=function(on){var v=on==null?!box.classList.contains('on'):!!on;box.classList.toggle('on',v);if(v){fill();box.querySelector('[data-r=x]').focus();}else stop();};
 box.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;var r=b.dataset.r;
  if(r==='x')window.rvReading(false);else if(r==='sm')size(-2);else if(r==='lg')size(2);
  else if(r==='say'){if(!window.speechSynthesis)return;if(speechSynthesis.speaking){stop();return;}
   var u=new SpeechSynthesisUtterance(box.querySelector('.rv-rt').innerText);u.lang=document.documentElement.lang||'';u.rate=.95;u.onend=stop;speechSynthesis.speak(u);b.textContent='\\u25A0 '+L.stop;}});
 box.addEventListener('keydown',function(e){if(e.key==='Escape'){e.stopPropagation();window.rvReading(false);}},true);
 Reveal.on('slidechanged',fill);Reveal.on('fragmentshown',fill);Reveal.on('fragmenthidden',fill);
})();`;
}
