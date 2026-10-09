// Code locks in the presentation (escape rooms): a click on a padlock asks for
// its code — number wheels, or a text field —; the right one opens it (the
// shackle lifts), shows the objects it hid and goes where it says; a wrong one
// shakes it. Runs as source embedded in the exported page (toString), so ES5
// and no imports.
//
// The page never holds the codes, only a salted SHA-256 of each one (made by
// io/formats/html.js with these same functions): pupils who read the page's
// source don't find the answer there. (A short number can still be found by
// trying every one: a deterrent, not a safe.)

// SHA-256 of a text (its UTF-8), as hex: here rather than crypto.subtle, which
// is asynchronous (the page is built synchronously) and missing on pages opened
// over plain http (a classroom's local server).
export function lockSHA256(str) {
  var K = [], H = [], i, j, k;
  var prime = function (n) { for (var d = 2; d * d <= n; d++) if (n % d === 0) return false; return true; };
  var frac = function (x) { return ((x - Math.floor(x)) * 4294967296) | 0; };
  for (i = 2, j = 0; j < 64; i++) if (prime(i)) { if (j < 8) H[j] = frac(Math.pow(i, 1 / 2)); K[j++] = frac(Math.pow(i, 1 / 3)); }
  var b = new TextEncoder().encode(String(str)), l = b.length, n = ((l + 8) >> 6) * 16 + 16, w = [];
  for (i = 0; i < n; i++) w[i] = 0;
  for (i = 0; i < l; i++) w[i >> 2] |= b[i] << (24 - (i % 4) * 8);
  w[l >> 2] |= 0x80 << (24 - (l % 4) * 8);
  w[n - 2] = Math.floor(l / 536870912); w[n - 1] = (l * 8) | 0;
  var ror = function (x, r) { return (x >>> r) | (x << (32 - r)); };
  for (i = 0; i < n; i += 16) {
    var W = w.slice(i, i + 16), a = H[0], c1 = H[1], c2 = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
    for (k = 16; k < 64; k++) {
      var x = W[k - 15], y = W[k - 2];
      W[k] = (W[k - 16] + (ror(x, 7) ^ ror(x, 18) ^ (x >>> 3)) + W[k - 7] + (ror(y, 17) ^ ror(y, 19) ^ (y >>> 10))) | 0;
    }
    for (k = 0; k < 64; k++) {
      var t1 = (h + (ror(e, 6) ^ ror(e, 11) ^ ror(e, 25)) + ((e & f) ^ (~e & g)) + K[k] + W[k]) | 0;
      var t2 = ((ror(a, 2) ^ ror(a, 13) ^ ror(a, 22)) + ((a & c1) ^ (a & c2) ^ (c1 & c2))) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c2; c2 = c1; c1 = a; a = (t1 + t2) | 0;
    }
    H = [a, c1, c2, d, e, f, g, h].map(function (v, m) { return (v + H[m]) | 0; });
  }
  return H.map(function (v) { return ('0000000' + (v >>> 0).toString(16)).slice(-8); }).join('');
}

// What counts as the same code: no accents, no capitals, spaces trimmed and single («París» = «paris »).
export function lockNorm(s) {
  s = String(s == null ? '' : s);
  try { s = s.normalize('NFD'); } catch (e) {}
  return s.replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').replace(/^ | $/g, '');
}

// sha, norm: the two above; L: the words; gate: whether a lock marked so keeps
// everyone on its slide until it is opened (a pupil's own copy, the viewer, the
// self-paced mode — not the teacher presenting to the class).
export function lockRuntime(sha, norm, L, gate) {
  var open = {}, tries = {}, pop = null, from = null, note = null, noteT = 0;
  var cfg = function (el) { try { return JSON.parse(el.getAttribute('data-lock')); } catch (e) { return null; } };
  var idOf = function (el) { return el.getAttribute('data-lock-id'); };
  var mk = function (tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  var host = function () { return document.querySelector('.reveal') || document.body; };
  function shut() { if (!pop) return; pop.remove(); pop = null; if (from && from.focus) from.focus(); from = null; }
  function say(msg) {
    if (!note) { note = mk('div', 'rv-lock-note'); note.setAttribute('role', 'status'); host().appendChild(note); }
    note.textContent = msg; note.classList.add('on'); clearTimeout(noteT); noteT = setTimeout(function () { note.classList.remove('on'); }, 2600);
  }
  function goTo(to) {
    if (!to || !window.Reveal) return;
    var s = Reveal.getSlides(), i = s.indexOf(Reveal.getCurrentSlide()), t = null, k;
    if (to === 'next') t = s[i + 1];
    else if (to.indexOf('slide:') === 0) for (k = 0; k < s.length; k++) if (s[k].getAttribute('data-rv-id') === to.slice(6)) t = s[k];
    if (t) { var x = Reveal.getIndices(t); Reveal.slide(x.h, x.v, 0); }
  }
  function unlock(el, c) {
    var id = idOf(el); open[id] = true;
    el.classList.add('rv-open'); el.setAttribute('aria-label', L.opened);
    var sh = el.querySelector('.rv-lk-sh'); if (sh) sh.setAttribute('transform', 'translate(0 -16)');
    [].slice.call(document.querySelectorAll('[data-lock-hide]')).forEach(function (o) { if (o.getAttribute('data-lock-hide') === id) o.classList.add('rv-unl'); });
    goTo(c.to);
  }
  function ask(el) {
    var c = cfg(el); if (!c) return;
    if (open[idOf(el)]) { goTo(c.to); return; }
    shut(); from = el;
    var id = idOf(el), n = +c.n || 0, left = function () { return c.tries ? c.tries - (tries[id] || 0) : Infinity; };
    pop = mk('div', 'rv-lock'); pop.setAttribute('data-prevent-swipe', '');
    var box = mk('div', 'rv-lock-box'); box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', L.title);
    var x = mk('button', 'rv-pop-x', '✕'); x.type = 'button'; x.setAttribute('aria-label', L.close); box.appendChild(x);
    var pic = mk('div', 'rv-lock-pic'), svg = el.querySelector('svg'); if (svg) pic.appendChild(svg.cloneNode(true)); box.appendChild(pic);
    if (c.hint) box.appendChild(mk('p', 'rv-lock-hint', c.hint));
    var input = null, wheels = [];
    if (n) {
      var row = mk('div', 'rv-wheels'); row.setAttribute('role', 'group'); row.setAttribute('aria-label', L.code);
      var set = function (k, v) { var d = wheels[k]; d.v = (v + 10) % 10; d.textContent = d.v; d.setAttribute('aria-valuenow', d.v); d.classList.remove('rv-roll'); void d.offsetWidth; d.classList.add('rv-roll'); };
      for (var k = 0; k < n; k++) (function (k) {
        var col = mk('div', 'rv-wheel'), up = mk('button', 'rv-w-b', '▲'), dn = mk('button', 'rv-w-b', '▼'), d = mk('span', 'rv-w-d', '0');
        up.type = dn.type = 'button'; up.tabIndex = dn.tabIndex = -1; up.setAttribute('aria-label', '+1'); dn.setAttribute('aria-label', '−1');
        d.v = 0; d.tabIndex = 0; d.setAttribute('role', 'spinbutton'); d.setAttribute('aria-valuemin', '0'); d.setAttribute('aria-valuemax', '9'); d.setAttribute('aria-valuenow', '0');
        d.setAttribute('aria-label', L.digit.replace('{n}', k + 1));
        up.addEventListener('click', function () { set(k, wheels[k].v + 1); });
        dn.addEventListener('click', function () { set(k, wheels[k].v - 1); });
        col.addEventListener('wheel', function (e) { e.preventDefault(); set(k, wheels[k].v + (e.deltaY < 0 ? 1 : -1)); }, { passive: false });
        d.addEventListener('keydown', function (e) {
          if (e.key === 'ArrowUp') set(k, d.v + 1); else if (e.key === 'ArrowDown') set(k, d.v - 1);
          else if (/^\d$/.test(e.key)) { set(k, +e.key); if (wheels[k + 1]) wheels[k + 1].focus(); }
          else if (e.key === 'ArrowRight' && wheels[k + 1]) wheels[k + 1].focus();
          else if ((e.key === 'ArrowLeft' || e.key === 'Backspace') && wheels[k - 1]) wheels[k - 1].focus();
          else return;
          e.preventDefault();
        });
        wheels.push(d); col.appendChild(up); col.appendChild(d); col.appendChild(dn); row.appendChild(col);
      })(k);
      box.appendChild(row);
    } else {
      input = mk('input', 'rv-lock-txt'); input.type = 'text'; input.autocomplete = 'off'; input.spellcheck = false; input.maxLength = 200;
      input.setAttribute('aria-label', L.code); input.placeholder = L.code; box.appendChild(input);
    }
    var go = mk('button', 'rv-lock-go', L.open); go.type = 'button'; box.appendChild(go);
    var msg = mk('p', 'rv-lock-msg'); msg.setAttribute('aria-live', 'polite'); box.appendChild(msg);
    var spent = function () { msg.textContent = L.noMore; go.disabled = true; if (input) input.disabled = true; wheels.forEach(function (d) { d.parentNode.style.pointerEvents = 'none'; }); };
    var tryIt = function () {
      if (go.disabled) return;
      var v = n ? wheels.map(function (d) { return d.v; }).join('') : input.value;
      if (!n && !norm(v)) { input.focus(); return; }
      if (c.h.indexOf(sha(c.s + ':' + norm(v))) >= 0) {
        msg.textContent = c.ok || L.opened; go.disabled = true; box.classList.add('rv-ok');
        var sh = box.querySelector('.rv-lk-sh'); if (sh) sh.setAttribute('transform', 'translate(0 -16)');
        setTimeout(function () { shut(); unlock(el, c); }, 1100);
        return;
      }
      tries[id] = (tries[id] || 0) + 1;
      box.classList.remove('rv-bad'); void box.offsetWidth; box.classList.add('rv-bad');
      if (left() <= 0) { spent(); return; }
      msg.textContent = (c.fail || L.wrong) + (c.tries ? ' · ' + L.left.replace('{n}', left()) : '');
      if (input) input.select();
    };
    go.addEventListener('click', tryIt);
    // (Keys stay in the lock: digits and arrows aren't the presentation's shortcuts while it is open.)
    pop.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); shut(); } else if (e.key === 'Enter' && e.target !== x) { e.preventDefault(); tryIt(); }
      e.stopPropagation();
    });
    pop.addEventListener('click', function (e) { e.stopPropagation(); if (e.target === pop || e.target === x) shut(); });
    pop.appendChild(box); host().appendChild(pop);
    if (left() <= 0) spent();
    (wheels[0] || input || go).focus();
  }
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('.slides [data-lock]'); if (!el) return;
    e.preventDefault(); e.stopPropagation(); ask(el);
  }, true);
  document.addEventListener('keydown', function (e) {
    var el = document.activeElement;
    if (!pop && el && el.matches && el.matches('.slides [data-lock]') && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopPropagation(); ask(el); }
  }, true);
  if (!window.Reveal) return { ask: ask, open: open };
  Reveal.on('slidechanged', function () { shut(); });
  if (!gate) return { ask: ask, open: open };
  // The first slide (in reveal's order) with a closed lock that keeps everyone there: -1 if none.
  var gateAt = function () {
    var s = Reveal.getSlides();
    for (var i = 0; i < s.length; i++) { var g = s[i].querySelectorAll('[data-lock][data-gate]'); for (var k = 0; k < g.length; k++) if (!open[idOf(g[k])]) return i; }
    return -1;
  };
  // Forwards from here would leave it behind: on its slide, once its steps (fragments) are all shown.
  var blocked = function () {
    var g = gateAt(); if (g < 0) return false;
    var i = Reveal.getSlides().indexOf(Reveal.getCurrentSlide());
    return i > g || (i === g && !Reveal.availableFragments().next);
  };
  var FWD = { ArrowRight: 1, ArrowDown: 1, PageDown: 1, ' ': 1, n: 1, N: 1, l: 1, j: 1, End: 1 };
  document.addEventListener('keydown', function (e) {
    if (pop || !FWD[e.key] || e.ctrlKey || e.metaKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || !blocked()) return;
    e.preventDefault(); e.stopImmediatePropagation(); say(L.gate);
  }, true);
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.reveal .controls .navigate-right, .reveal .controls .navigate-down, .reveal .controls .navigate-next');
    if (b && blocked()) { e.preventDefault(); e.stopImmediatePropagation(); say(L.gate); }
  }, true);
  // Any other way past it (a link, the overview, a swipe, the address): back to the lock.
  Reveal.on('slidechanged', function (ev) {
    var g = gateAt(); if (g < 0) return;
    var s = Reveal.getSlides();
    if (s.indexOf(ev.currentSlide) > g) { var x = Reveal.getIndices(s[g]); Reveal.slide(x.h, x.v); say(L.gate); }
  });
  return { ask: ask, open: open };
}

// The lock's look while presenting (the dialog, the wheels, the shake, the reveal).
export const LOCK_CSS = `[data-lock]{cursor:pointer} [data-lock] .rv-lk-sh{transition:transform .5s cubic-bezier(.3,1.6,.5,1)}
 .rv-lock{position:fixed;inset:0;z-index:60;display:grid;place-items:center;background:rgba(0,0,0,.5);animation:rvPopIn .2s ease both} @keyframes rvPopIn{from{opacity:0}to{opacity:1}}
 .rv-lock-box{position:relative;width:min(440px,90vw);max-height:90vh;overflow:auto;background:#fff;color:#1d1f24;border-radius:16px;padding:24px 28px;box-shadow:0 18px 60px rgba(0,0,0,.4);text-align:center;font:400 20px/1.4 system-ui,sans-serif}
 .rv-lock-box .rv-pop-x{position:absolute;top:10px;inset-inline-end:12px;border:0;background:none;font-size:22px;cursor:pointer;color:#555}
 .rv-lock-pic{width:110px;height:132px;margin:0 auto 8px} .rv-lock-pic .rv-lk-sh{transition:transform .5s cubic-bezier(.3,1.6,.5,1)}
 .rv-lock-hint{margin:0 0 14px;font-style:italic;white-space:pre-wrap}
 .rv-wheels{display:flex;justify-content:center;gap:8px;margin:0 0 14px}
 .rv-wheel{display:flex;flex-direction:column;align-items:center;background:#2b2f36;border-radius:10px;padding:4px 2px;user-select:none}
 .rv-w-b{border:0;background:none;color:#cfd6df;font-size:16px;line-height:1;padding:6px 10px;cursor:pointer}
 .rv-w-d{display:block;width:1.4em;padding:.1em 0;background:#fff;color:#111;border-radius:6px;font:700 34px/1.2 ui-monospace,monospace;outline-offset:2px}
 .rv-w-d.rv-roll{animation:rvRoll .18s ease-out} @keyframes rvRoll{from{transform:translateY(-35%);opacity:.3}}
 .rv-lock-txt{display:block;width:100%;box-sizing:border-box;font:inherit;font-size:24px;padding:.35em .5em;border:2px solid #c5ccd6;border-radius:10px;margin:0 0 14px;text-align:center}
 .rv-lock-go{font:inherit;font-weight:700;padding:.45em 1.6em;border:0;border-radius:999px;background:#3f6497;color:#fff;cursor:pointer} .rv-lock-go:disabled{opacity:.5;cursor:default}
 .rv-lock-msg{min-height:1.4em;margin:12px 0 0;font-weight:600;color:#b3261e}
 .rv-lock-box.rv-ok .rv-lock-msg{color:#26890c} .rv-lock-box.rv-ok .rv-lock-pic{animation:rvLockOk .9s ease}
 @keyframes rvLockOk{40%{transform:scale(1.12)}100%{transform:none}}
 .rv-lock-box.rv-bad{animation:rvShake .45s ease} @keyframes rvShake{20%,60%{transform:translateX(-12px)}40%,80%{transform:translateX(12px)}}
 .rv-lock-note{position:fixed;left:50%;bottom:28px;transform:translate(-50%,20px);z-index:61;padding:10px 18px;border-radius:999px;background:#1d1f24;color:#fff;font:600 17px/1.3 system-ui,sans-serif;opacity:0;pointer-events:none;transition:opacity .25s,transform .25s}
 .rv-lock-note.on{opacity:1;transform:translate(-50%,0)}
 .reveal [data-lock-hide]:not(.rv-unl){visibility:hidden!important} .reveal [data-lock-hide].rv-unl{animation:rvUnl .7s ease} @keyframes rvUnl{from{opacity:0}}
 @media (prefers-reduced-motion:reduce){.rv-lock-box.rv-bad,.rv-lock-box.rv-ok .rv-lock-pic,.rv-w-d.rv-roll,.reveal [data-lock-hide].rv-unl{animation:none}}`;
