// Phone remote, presentation side: what the phone's touchpad does to the slide
// on screen (laser with a trail, spotlight, arrow, magnifier, blackout) and the
// clicks, drags and scrolls it makes there.
//
// Everything works on the presentation's document (same origin as the editor),
// from coordinates normalised to the current slide (0..1 across, 0..1 down).
// They are mapped through the slide's own box on screen (getBoundingClientRect),
// so reveal.js's scale, the screen-fit mode and the zoom are all accounted for.
//
// Interaction is synthesised: pointer/mouse/click events and wheel scrolling.
// Same-origin frames are entered; a cross-origin frame (most embedded websites)
// can't be clicked or scrolled from outside — the browser forbids it — so only
// a scrollable box around it scrolls, and the result says it was blocked.

const Z = 2147483000;                                     // above the slide and the ink bar
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---- Mapping ---------------------------------------------------------------
// The current slide's box on screen (its .stage: the deck's w×h area).
export function slideRect(doc) {
  const win = doc.defaultView, cur = win?.Reveal?.getCurrentSlide?.();
  const el = cur?.querySelector('.stage') || cur || doc.querySelector('.reveal .slides');
  const r = el?.getBoundingClientRect();
  if (r && r.width > 0 && r.height > 0) return r;
  const e = doc.documentElement;
  return { left: 0, top: 0, width: e.clientWidth, height: e.clientHeight, right: e.clientWidth, bottom: e.clientHeight };
}
// Slide fractions → the presentation window's client pixels.
export function toClient(doc, x, y) {
  const r = slideRect(doc);
  return { x: r.left + x * r.width, y: r.top + y * r.height, rect: r };
}

// What is under a point, entering same-origin frames. → { el, doc, x, y, blocked }
// (x, y in el's own document; blocked: a cross-origin frame was hit).
export function hitTest(doc, cx, cy) {
  let d = doc, x = cx, y = cy, el = null;
  for (let depth = 0; depth < 4; depth++) {
    el = d.elementFromPoint(x, y);
    if (!el || el.tagName !== 'IFRAME') break;
    let inner = null;
    try { inner = el.contentDocument; } catch {}
    if (!inner || !inner.documentElement) return { el, doc: d, x, y, blocked: true };
    const r = el.getBoundingClientRect(), k = el.clientWidth ? r.width / el.offsetWidth : 1;
    x = (x - r.left) / k - el.clientLeft; y = (y - r.top) / k - el.clientTop;
    d = inner;
  }
  return { el, doc: d, x, y, blocked: false };
}

// ---- Event synthesis ---------------------------------------------------------
function fire(el, type, x, y, extra = {}) {
  const win = el.ownerDocument.defaultView;
  const init = { bubbles: true, cancelable: true, composed: true, view: win, clientX: x, clientY: y,
    screenX: x, screenY: y, button: 0, buttons: /down|move/.test(type) && extra.down !== false ? 1 : 0, ...extra };
  let ev;
  if (type.startsWith('pointer')) ev = new win.PointerEvent(type, { pointerId: 1, pointerType: 'mouse', isPrimary: true, pressure: init.buttons ? 0.5 : 0, ...init });
  else if (type === 'wheel') ev = new win.WheelEvent(type, { deltaMode: 0, ...init });
  else ev = new win.MouseEvent(type, init);
  return el.dispatchEvent(ev);
}
const focusable = el => el.closest?.('a[href],button,input,select,textarea,[tabindex],[contenteditable=""],[contenteditable=true]');

// A click at a point. → { el, blocked }
export function tap(doc, x, y) {
  const p = toClient(doc, x, y), h = hitTest(doc, p.x, p.y);
  ripple(doc, p.x, p.y);
  if (h.blocked) { try { h.el.focus(); } catch {} return { el: h.el, blocked: true }; }
  if (!h.el) return { el: null, blocked: false };
  const t = h.el;
  fire(t, 'pointerover', h.x, h.y, { down: false }); fire(t, 'mouseover', h.x, h.y, { down: false });
  fire(t, 'pointerdown', h.x, h.y); fire(t, 'mousedown', h.x, h.y);
  try { focusable(t)?.focus({ preventScroll: true }); } catch {}
  fire(t, 'pointerup', h.x, h.y); fire(t, 'mouseup', h.x, h.y);
  fire(t, 'click', h.x, h.y, { detail: 1 });
  return { el: t, blocked: false };
}

// Press, move and release (drag items, turn 3D models, pan maps or a zoomed slide).
const drags = new WeakMap();
export function drag(doc, phase, x, y) {
  const p = toClient(doc, x, y);
  if (phase === 'start') {
    const h = hitTest(doc, p.x, p.y);
    if (!h.el || h.blocked) { drags.delete(doc); return { el: h.el, blocked: h.blocked }; }
    drags.set(doc, { target: h.el, doc: h.doc, dx: h.x - p.x, dy: h.y - p.y });
    fire(h.el, 'pointerdown', h.x, h.y); fire(h.el, 'mousedown', h.x, h.y);
    return { el: h.el, blocked: false };
  }
  const s = drags.get(doc); if (!s) return { el: null, blocked: false };
  const lx = p.x + s.dx, ly = p.y + s.dy;
  // Moves go to what is under the finger (or the pressed element, if it's off its document).
  const under = s.doc.elementFromPoint(lx, ly);
  const to = s.target.isConnected ? (s.target.hasPointerCapture?.(1) ? s.target : under || s.target) : under;
  if (!to) return { el: null, blocked: false };
  if (phase === 'move') { fire(to, 'pointermove', lx, ly); fire(to, 'mousemove', lx, ly); }
  else { fire(to, 'pointerup', lx, ly); fire(to, 'mouseup', lx, ly); drags.delete(doc); }
  return { el: to, blocked: false };
}

// The nearest box that can scroll in that direction (the element itself or an ancestor).
function scroller(el, dx, dy, root) {
  for (let n = el; n && n.nodeType === 1; n = n.parentElement || n.getRootNode?.().host) {
    const cs = n.ownerDocument.defaultView.getComputedStyle(n);
    const canY = dy && /(auto|scroll|overlay)/.test(cs.overflowY) && n.scrollHeight > n.clientHeight + 1;
    const canX = dx && /(auto|scroll|overlay)/.test(cs.overflowX) && n.scrollWidth > n.clientWidth + 1;
    if (canY || canX) return n;
  }
  const se = el?.ownerDocument?.scrollingElement;
  if (se && el.ownerDocument !== root && (se.scrollHeight > se.clientHeight + 1 || se.scrollWidth > se.clientWidth + 1)) return se;
  return null;
}
// Scroll at a point by (dx, dy) slide fractions (finger movement; content follows
// the fingers). → { el, scrolled, blocked }
export function wheel(doc, x, y, dx, dy) {
  const p = toClient(doc, x, y), h = hitTest(doc, p.x, p.y);
  const stage = doc.defaultView.Reveal?.getCurrentSlide?.()?.querySelector('.stage');
  const W = stage?.offsetWidth || p.rect.width, H = stage?.offsetHeight || p.rect.height;
  const px = -dx * W, py = -dy * H;                       // (wheel deltas: positive scrolls down/right)
  if (!h.el) return { el: null, scrolled: false, blocked: false };
  if (h.blocked) {
    // A cross-origin page: only a scrollable box around the frame can move.
    const box = scroller(h.el.parentElement, px, py, doc);
    if (box) { box.scrollBy(px, py); return { el: h.el, scrolled: true, blocked: true }; }
    return { el: h.el, scrolled: false, blocked: true };
  }
  const go = fire(h.el, 'wheel', h.x, h.y, { deltaX: px, deltaY: py, down: false });
  if (!go) return { el: h.el, scrolled: true, blocked: false };   // (a map or 3D model took it)
  const box = scroller(h.el, px, py, doc);
  if (box) { box.scrollBy(px, py); return { el: h.el, scrolled: true, blocked: false }; }
  return { el: h.el, scrolled: false, blocked: false };
}

// Zoom the whole view around a point: the presentation's own zoom (io/runtime/ink.js
// zooms on Ctrl + wheel, pans on drag and resets on the next slide), so they agree.
export function zoomBy(doc, x, y, factor) {
  if (!(factor > 0) || factor === 1) return;
  const p = toClient(doc, x, y);
  fire(doc.documentElement, 'wheel', p.x, p.y, { deltaY: -Math.log(factor) / 0.003, ctrlKey: true, down: false });
}
export function zoomReset(doc) { zoomBy(doc, 0.5, 0.5, 1e-6); }
export function zoomLevel(doc) { const s = parseFloat(doc.querySelector('.reveal')?.style.scale); return s > 0 ? s : 1; }

// ---- Drawing on top ------------------------------------------------------------
function layer(doc, id, css) {
  let el = doc.getElementById(id);
  if (!el) { el = doc.createElement('div'); el.id = id; el.setAttribute('aria-hidden', 'true'); el.style.cssText = `position:fixed;pointer-events:none;${css}`; doc.body.appendChild(el); }
  return el;
}
function style(doc) {
  if (doc.getElementById('__rv-remote-css')) return;
  const s = doc.createElement('style'); s.id = '__rv-remote-css';
  s.textContent = '@keyframes rvRemoteRipple{from{transform:translate(-50%,-50%) scale(.3);opacity:.9}to{transform:translate(-50%,-50%) scale(1.6);opacity:0}}';
  doc.head.appendChild(s);
}

// Laser: a red dot leaving a short fading trail (a canvas over everything).
const trails = new WeakMap();
function laserAt(doc, cx, cy) {
  const dot = layer(doc, '__laser', `width:22px;height:22px;border-radius:50%;z-index:${Z + 2};transform:translate(-50%,-50%);`
    + 'background:radial-gradient(circle,#ff2d2d 32%,rgba(255,45,45,.4) 56%,transparent 72%)');
  dot.style.left = cx + 'px'; dot.style.top = cy + 'px'; dot.style.display = 'block';
  const cv = doc.getElementById('__laser-trail') || (() => {
    const c = doc.createElement('canvas'); c.id = '__laser-trail'; c.setAttribute('aria-hidden', 'true');
    c.style.cssText = `position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:${Z + 1}`; doc.body.appendChild(c); return c;
  })();
  let tr = trails.get(doc);
  if (!tr) { tr = { pts: [], raf: 0 }; trails.set(doc, tr); }
  tr.pts.push({ x: cx, y: cy, t: performance.now() });
  if (!tr.raf) tr.raf = doc.defaultView.requestAnimationFrame(() => paintTrail(doc, cv, tr));
}
function paintTrail(doc, cv, tr) {
  const win = doc.defaultView, d = win.devicePixelRatio || 1, w = win.innerWidth, h = win.innerHeight, now = performance.now();
  if (cv.width !== Math.round(w * d) || cv.height !== Math.round(h * d)) { cv.width = Math.round(w * d); cv.height = Math.round(h * d); }
  const g = cv.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, w, h);
  tr.pts = tr.pts.filter(p => now - p.t < 450);
  g.lineCap = g.lineJoin = 'round';
  for (let i = 1; i < tr.pts.length; i++) {
    const a = tr.pts[i - 1], b = tr.pts[i], k = 1 - (now - b.t) / 450;
    g.strokeStyle = `rgba(255,45,45,${(k * 0.75).toFixed(3)})`; g.lineWidth = 2 + 8 * k;
    g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
  }
  tr.raf = tr.pts.length ? win.requestAnimationFrame(() => paintTrail(doc, cv, tr)) : 0;
  if (!tr.raf) g.clearRect(0, 0, w, h);
}

// Spotlight: everything dimmed except a circle (radius r, a fraction of the slide's width).
function spotAt(doc, cx, cy, rpx) {
  const s = layer(doc, '__rv-spot', `inset:0;z-index:${Z}`);
  s.style.background = `radial-gradient(circle at ${cx.toFixed(1)}px ${cy.toFixed(1)}px, transparent ${(rpx * 0.9).toFixed(1)}px, rgba(0,0,0,.78) ${rpx.toFixed(1)}px)`;
  s.style.display = 'block';
}

// Arrow: an ordinary cursor that stays where it was left.
const ARROW = '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24"><path d="M4 2l15 11.5-6.6.9 3.9 7.3-2.9 1.5-3.9-7.4L4 20z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>';
function arrowAt(doc, cx, cy) {
  const a = layer(doc, '__rv-arrow', `z-index:${Z + 2};width:30px;height:30px;margin:-3px 0 0 -5px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))`);
  if (!a.firstChild) a.innerHTML = ARROW;
  a.style.left = cx + 'px'; a.style.top = cy + 'px'; a.style.display = 'block';
}

// Magnifier: a circle showing the slide around the finger at twice the size (a copy
// of the slide: live media inside it show as empty boxes).
function lensAt(doc, x, y, rect, rpx) {
  const win = doc.defaultView, cur = win.Reveal?.getCurrentSlide?.(), stage = cur?.querySelector('.stage');
  if (!stage) return;
  const lens = layer(doc, '__rv-lens', `z-index:${Z + 1};border-radius:50%;overflow:hidden;border:3px solid #fff;box-shadow:0 6px 24px rgba(0,0,0,.5);transform:translate(-50%,-50%)`);
  if (lens.__for !== cur) {
    const copy = stage.cloneNode(true);
    copy.querySelectorAll('iframe,video,audio,model-viewer,canvas,script').forEach(n => n.replaceWith(doc.createElement('div')));
    copy.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
    copy.style.position = 'absolute'; copy.style.left = copy.style.top = '0'; copy.style.margin = '0'; copy.style.transformOrigin = '0 0';
    const bg = win.getComputedStyle(stage).backgroundColor, body = win.getComputedStyle(doc.querySelector('.reveal') || doc.body).backgroundColor;
    lens.style.background = !/rgba\(0, 0, 0, 0\)|transparent/.test(bg) ? bg : (!/rgba\(0, 0, 0, 0\)|transparent/.test(body) ? body : '#fff');
    // (the copy keeps the slide's look: reveal's and the deck's CSS select .reveal .stage)
    const wrap = doc.createElement('div'); wrap.className = 'reveal'; wrap.style.cssText = 'position:absolute;inset:0;transform:none;scale:none;translate:none';
    const sec = doc.createElement('section'); sec.style.cssText = 'position:absolute;inset:0;display:block'; sec.className = cur.className;
    sec.appendChild(copy); wrap.appendChild(sec); lens.replaceChildren(wrap); lens.__for = cur; lens.__copy = copy;
  }
  const W = stage.offsetWidth, H = stage.offsetHeight, k = 2 * rect.width / W, d = rpx * 2;
  lens.style.width = lens.style.height = d + 'px';
  lens.style.left = (rect.left + x * rect.width) + 'px'; lens.style.top = (rect.top + y * rect.height) + 'px';
  lens.__copy.style.width = W + 'px'; lens.__copy.style.height = H + 'px';
  lens.__copy.style.transform = `translate(${(rpx - x * W * k).toFixed(1)}px,${(rpx - y * H * k).toFixed(1)}px) scale(${k})`;
  lens.style.display = 'block';
}

// A small ring where an interaction landed (so the audience sees what happened).
function ripple(doc, cx, cy) {
  style(doc);
  const r = doc.createElement('div'); r.className = '__rv-ripple'; r.setAttribute('aria-hidden', 'true');
  r.style.cssText = `position:fixed;left:${cx}px;top:${cy}px;width:44px;height:44px;border-radius:50%;border:3px solid rgba(255,255,255,.95);`
    + `box-shadow:0 0 0 2px rgba(0,0,0,.35);pointer-events:none;z-index:${Z + 2};animation:rvRemoteRipple .55s ease-out forwards`;
  doc.body.appendChild(r);
  setTimeout(() => r.remove(), 600);
}

// The pointer tools. tool: laser | spot | arrow | lens; r: spotlight/lens radius (fraction of the slide's width).
export const TOOLS = ['laser', 'spot', 'arrow', 'lens'];
export function point(doc, tool, x, y, r = 0.12) {
  const p = toClient(doc, x, y), rpx = clamp(r, 0.03, 0.5) * p.rect.width;
  if (tool !== 'laser') hide(doc, '__laser');
  if (tool !== 'spot') hide(doc, '__rv-spot');
  if (tool !== 'lens') hide(doc, '__rv-lens');
  if (tool !== 'arrow') hide(doc, '__rv-arrow');
  if (tool === 'spot') spotAt(doc, p.x, p.y, rpx);
  else if (tool === 'arrow') arrowAt(doc, p.x, p.y);
  else if (tool === 'lens') lensAt(doc, x, y, p.rect, rpx);
  else laserAt(doc, p.x, p.y);
}
const hide = (doc, id) => { const el = doc.getElementById(id); if (el) el.style.display = 'none'; };
// Finger lifted: the laser, spotlight and magnifier go (the arrow stays).
export function pointOff(doc) { hide(doc, '__laser'); hide(doc, '__rv-spot'); hide(doc, '__rv-lens'); }
// Everything the remote drew, gone (another tool, another slide, the remote left).
export function clearAll(doc) {
  pointOff(doc); hide(doc, '__rv-arrow');
  const lens = doc.getElementById('__rv-lens'); if (lens) lens.__for = null;
}
export function black(doc, on) {
  const b = layer(doc, '__black', 'inset:0;background:#000;z-index:' + (Z - 1));
  b.style.pointerEvents = on ? 'auto' : 'none';
  b.style.display = on ? 'block' : 'none';
}
