// Object animations in OpenDocument (.odp), as LibreOffice Impress writes
// them: SMIL nodes under the page (anim:par / anim:seq) with LibreOffice's
// preset ids, so Impress shows them in its Animation panel.
//
// One "main sequence" of clicks; in each click, effects start on click, with
// the previous one or after it (with their delay). Animations started by
// clicking another object go in an "interactive sequence" of that object.

import { animTimeline, isEntrance, motionPoints } from '../../features/animation/transitions.js';

const sec = ms => `${+(Math.max(0, ms) / 1000).toFixed(3)}s`;
const MOVE = { 'fade-up': ['y', '+0.1'], 'fade-down': ['y', '-0.1'], 'fade-left': ['x', '+0.1'], 'fade-right': ['x', '-0.1'] };
const HIGHLIGHT = { red: '#ff2c2d', green: '#17ff2e', blue: '#1b91ff' };

// The effect of one object: [preset class, preset id, SMIL nodes] or null.
function effectNodes(b, xid, deck) {
  const a = b.animation, d = sec(a.duration ?? 500), T = `smil:targetElement="${xid}"`;
  const show = v => `<anim:set smil:begin="0s" smil:dur="0.001s" smil:fill="hold" ${T} smil:attributeName="visibility" smil:to="${v}"/>`;
  if (a.effect === 'path') {
    const { w, h } = deck.size;
    const pts = motionPoints(a).map(([x, y]) => `${+(x / w).toFixed(4)} ${+(y / h).toFixed(4)}`);
    return ['motion-path', 'ooo-motionpath-user-defined', `<anim:animateMotion smil:dur="${d}" smil:fill="hold" ${T} svg:path="M ${pts[0]} L ${pts.slice(1).join(' ')}" presentation:additive="sum"/>`];
  }
  if (a.effect === 'grow' || a.effect === 'shrink') {
    const k = a.effect === 'grow' ? '0.25,0.25' : '-0.2,-0.2';        // an increment, as Impress reads it
    return ['emphasis', 'ooo-emphasis-grow-and-shrink', `<anim:animateTransform smil:dur="${d}" smil:fill="hold" ${T} smil:by="${k}" svg:type="scale"/>`];
  }
  if (a.effect === 'semi-fade-out')
    return ['emphasis', 'ooo-emphasis-transparency', `<anim:set smil:dur="${d}" smil:fill="hold" ${T} smil:attributeName="opacity" smil:to="0.5"/>`];
  const hl = /^highlight-(?:current-)?(red|green|blue)$/.exec(a.effect);
  if (hl) return ['emphasis', 'ooo-emphasis-font-color', `<anim:animateColor smil:dur="${d}" smil:fill="hold" ${T} smil:attributeName="color" smil:to="${HIGHLIGHT[hl[1]]}" anim:color-interpolation="rgb" anim:color-interpolation-direction="clockwise"/>`];
  if (a.effect === 'strike') return null;                   // no ODF equivalent
  if (!isEntrance(a.effect))
    return ['exit', 'ooo-exit-fade-out', `<anim:transitionFilter smil:dur="${d}" ${T} smil:type="fade" smil:subtype="crossfade" smil:mode="out"/>`
      + `<anim:set smil:begin="${d}" smil:dur="0.001s" smil:fill="hold" ${T} smil:attributeName="visibility" smil:to="hidden"/>`];
  if (a.effect === 'zoom-in')
    return ['entrance', 'ooo-entrance-zoom', show('visible')
      + ['width', 'height'].map(p => `<anim:animate smil:dur="${d}" smil:fill="hold" ${T} smil:attributeName="${p}" smil:values="0;${p}" smil:keyTimes="0;1" presentation:additive="base"/>`).join('')];
  const m = MOVE[a.effect];
  if (m) {
    const id = { 'fade-up': 'ooo-entrance-ascend', 'fade-down': 'ooo-entrance-descend' }[a.effect] || 'ooo-entrance-fade-in';
    return ['entrance', id, show('visible')
      + `<anim:animate smil:dur="${d}" smil:fill="hold" ${T} smil:attributeName="${m[0]}" smil:values="${m[0]}${m[1]};${m[0]}" smil:keyTimes="0;1" presentation:additive="base"/>`
      + `<anim:transitionFilter smil:dur="${d}" ${T} smil:type="fade" smil:subtype="crossfade"/>`];
  }
  return ['entrance', 'ooo-entrance-fade-in', show('visible') + `<anim:transitionFilter smil:dur="${d}" ${T} smil:type="fade" smil:subtype="crossfade"/>`];
}

const effectPar = (b, xid, deck, delay, node) => {
  const e = effectNodes(b, xid, deck); if (!e) return '';
  return `<anim:par smil:begin="${sec(delay)}" smil:fill="hold" presentation:node-type="${node}" presentation:preset-class="${e[0]}" presentation:preset-id="${e[1]}">${e[2]}</anim:par>`;
};
const nodeOf = (b, first) => (first ? 'on-click' : b.animation.start === 'afterPrev' ? 'after-previous' : 'with-previous');

// xidOf: block id → the xml:id its shape got in the page ('' if not exported).
export function odpTimingXML(s, xidOf, deck) {
  const tl = animTimeline(s);
  const main = s.blocks.filter(b => b.animation && tl.has(b.id) && xidOf(b.id))
    .sort((a, b) => tl.get(a.id).step - tl.get(b.id).step || tl.get(a.id).delay - tl.get(b.id).delay);
  const clicks = [...new Set(main.map(b => tl.get(b.id).step))].map(st => {
    const group = main.filter(b => tl.get(b.id).step === st);
    const fx = group.map((b, i) => effectPar(b, xidOf(b.id), deck, tl.get(b.id).delay, nodeOf(b, i === 0))).join('');
    return fx ? `<anim:par smil:begin="next"><anim:par smil:begin="0s">${fx}</anim:par></anim:par>` : '';
  }).join('');
  // Triggers: each clicked object plays its own animations, in order.
  const trig = s.blocks.filter(b => b.animation?.trigger && xidOf(b.id) && xidOf(b.animation.trigger));
  const inter = [...new Set(trig.map(b => b.animation.trigger))].map(src => {
    const fx = trig.filter(b => b.animation.trigger === src).sort((a, b) => (a.animation.order ?? 0) - (b.animation.order ?? 0))
      .map((b, i) => effectPar(b, xidOf(b.id), deck, b.animation.delay ?? 0, nodeOf(b, i === 0))).join('');
    return fx ? `<anim:seq smil:begin="${xidOf(src)}.click" presentation:node-type="interactive-sequence"><anim:par smil:begin="0s"><anim:par smil:begin="0s">${fx}</anim:par></anim:par></anim:seq>` : '';
  }).join('');
  if (!clicks && !inter) return '';
  return `<anim:par presentation:node-type="timing-root">${clicks ? `<anim:seq presentation:node-type="main-sequence">${clicks}</anim:seq>` : ''}${inter}</anim:par>`;
}

// ---- Import ------------------------------------------------------------------
const secs = v => { const m = /([\d.]+)s/.exec(v || ''); return m ? Math.round(+m[1] * 1000) : 0; };

function effectOf(par) {
  const cls = par.getAttribute('presentation:preset-class'), id = par.getAttribute('presentation:preset-id') || '';
  const nodes = [...par.children], durEl = nodes.find(n => n.getAttribute('smil:dur') && n.getAttribute('smil:dur') !== '0.001s');
  const duration = durEl ? secs(durEl.getAttribute('smil:dur')) : 500;
  let effect = null;
  if (cls === 'entrance') {
    const mv = nodes.find(n => n.localName === 'animate' && /^[xy]$/.test(n.getAttribute('smil:attributeName') || ''));
    if (/zoom/.test(id)) effect = 'zoom-in';
    else if (mv) { const at = mv.getAttribute('smil:attributeName'), up = /^[xy]\+/.test(mv.getAttribute('smil:values') || '');
      effect = at === 'y' ? (up ? 'fade-up' : 'fade-down') : (up ? 'fade-left' : 'fade-right'); }
    else if (/ascend/.test(id)) effect = 'fade-up';
    else if (/descend/.test(id)) effect = 'fade-down';
    else effect = 'fade-in';
  } else if (cls === 'exit') effect = 'fade-out';
  else if (cls === 'emphasis') {
    const tr = nodes.find(n => n.localName === 'animateTransform'), col = nodes.find(n => n.localName === 'animateColor');
    if (tr) effect = parseFloat(tr.getAttribute('smil:by') || '1') >= 0 ? 'grow' : 'shrink';
    else if (col) { const c = (col.getAttribute('smil:to') || '').toLowerCase(); effect = 'highlight-' + (c === HIGHLIGHT.green ? 'green' : c === HIGHLIGHT.blue ? 'blue' : 'red'); }
    else if (/transparency/.test(id)) effect = 'semi-fade-out';
    else effect = 'grow';
  } else if (cls === 'motion-path') {
    const mo = nodes.find(n => n.localName === 'animateMotion');
    const nums = (mo?.getAttribute('svg:path') || '').match(/-?[\d.]+(e-?\d+)?/g)?.map(Number) || [];
    if (nums.length >= 4) return { effect: 'path', duration, dxr: nums[nums.length - 2] - nums[0], dyr: nums[nums.length - 1] - nums[1] };
  }
  return effect && { effect, duration };
}

// page: the draw:page element; blockOf(xmlId) → the imported block; size: {w, h}.
export function readODPAnimations(page, blockOf, size) {
  const root = [...page.children].find(n => n.localName === 'par' && n.getAttribute('presentation:node-type') === 'timing-root');
  if (!root) return;
  let order = 0;
  const apply = (par, extra) => {
    const tgt = [...par.children].find(n => n.getAttribute('smil:targetElement'))?.getAttribute('smil:targetElement');
    const b = tgt && blockOf(tgt), e = b && effectOf(par); if (!e) return;
    const node = par.getAttribute('presentation:node-type');
    b.animation = { effect: e.effect, order, duration: e.duration, ...extra,
      ...(node === 'with-previous' && { start: 'withPrev' }), ...(node === 'after-previous' && { start: 'afterPrev' }),
      ...(secs(par.getAttribute('smil:begin')) && { delay: secs(par.getAttribute('smil:begin')) }),
      ...(e.effect === 'path' && { dx: Math.round(e.dxr * size.w), dy: Math.round(e.dyr * size.h) }) };
  };
  const effects = el => [...el.getElementsByTagName('*')].filter(n => n.localName === 'par' && n.getAttribute('presentation:preset-class'));
  for (const seq of [...root.children]) {
    const kind = seq.getAttribute('presentation:node-type');
    if (kind === 'main-sequence')
      for (const click of [...seq.children]) effects(click).forEach(p => { apply(p, {}); order++; });
    else if (kind === 'interactive-sequence') {
      const src = blockOf((/^(.+)\.click$/.exec(seq.getAttribute('smil:begin') || '') || [])[1]);
      if (src) effects(seq).forEach(p => { apply(p, { trigger: src.id }); order++; });
    }
  }
}
