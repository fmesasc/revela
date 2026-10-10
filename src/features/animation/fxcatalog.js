// PowerPoint's animation effects — entrances, their exits, and emphasis — as Revela plays them: one catalogue the
// presentation (CSS), the editor's preview, the galleries, the names and PowerPoint's import and export all read.
// (The first effects Revela had — fade-in, fade-up…, zoom-in, spin, flip, bounce, grow, pulse… — keep their own code in
// transitions.js; these are the rest of PowerPoint's.)
//
// Each effect: kind ('entrance' | 'emphasis'), its name (Spanish, as the interface), an icon, PowerPoint's group (Básicos,
// Sutiles, Moderados, Llamativos), its keyframes (for an entrance: hidden → shown; its exit, «<id>-out», plays them
// backwards), PowerPoint's preset (presetID, and its filter when PowerPoint draws it with one), and its options: a
// direction or a colour (a.dir, a.color), passed to the keyframes as CSS variables (fxVars).
// Emphasis that leaves a change (bold, underline, a colour, darker…) keeps it while its step is shown, as PowerPoint;
// fill and line colours act on the shape's drawing (its SVG), font colour on every word.

const D4 = [['bottom', 'Desde abajo'], ['top', 'Desde arriba'], ['left', 'Desde la izquierda'], ['right', 'Desde la derecha']];
const HV = [['horizontal', 'Horizontal'], ['vertical', 'Vertical']];
const SPLIT = [['vertical', 'Vertical hacia fuera'], ['horizontal', 'Horizontal hacia fuera']];
export const FX_COLOURS = [['#e53935', 'Rojo'], ['#fb8c00', 'Naranja'], ['#fdd835', 'Amarillo'], ['#43a047', 'Verde'], ['#1e88e5', 'Azul'],
  ['#8e24aa', 'Morado'], ['#000000', 'Negro'], ['#ffffff', 'Blanco']];

// [id, name, icon, group, keyframes, PowerPoint presetID, filter(dir) or null, options]
const ENTRANCES = [
  // Básicos
  ['wipe', 'Barrido', 'swipe_right', 'Básicos', 'from{clip-path:var(--fx-clip)}to{clip-path:inset(0 0 0 0)}', 22, d => `wipe(${{ bottom: 'up', top: 'down', left: 'right', right: 'left' }[d] || 'up'})`, D4],
  ['split', 'Dividir', 'vertical_split', 'Básicos', 'from{clip-path:var(--fx-clip)}to{clip-path:inset(0 0 0 0)}', 16, d => `barn(${d === 'horizontal' ? 'outHorizontal' : 'outVertical'})`, SPLIT],
  ['blinds', 'Persianas', 'view_headline', 'Básicos', 'from{--fxp:0%}to{--fxp:12.5%}', 3, d => `blinds(${d === 'vertical' ? 'vertical' : 'horizontal'})`, HV],
  ['box', 'Cuadro', 'crop_square', 'Básicos', 'from{clip-path:inset(50% 50% 50% 50%)}to{clip-path:inset(0 0 0 0)}', 4, () => 'box(out)'],
  ['checkerboard', 'Cuadros bicolores', 'grid_on', 'Básicos', 'from{--fxp:0%}to{--fxp:100%}', 5, () => 'checkerboard(across)'],
  ['circle', 'Círculo', 'circle', 'Básicos', 'from{clip-path:circle(0% at 50% 50%)}to{clip-path:circle(75% at 50% 50%)}', 6, () => 'circle(out)'],
  ['diamond', 'Diamante', 'diamond', 'Básicos', 'from{clip-path:polygon(50% 50%,50% 50%,50% 50%,50% 50%)}to{clip-path:polygon(50% -50%,150% 50%,50% 150%,-50% 50%)}', 8, () => 'diamond(out)'],
  ['plus', 'Más', 'add', 'Básicos', 'from{clip-path:polygon(50% 50%,50% 50%,50% 50%,50% 50%,50% 50%,50% 50%,50% 50%,50% 50%,50% 50%,50% 50%,50% 50%,50% 50%)}'
    + 'to{clip-path:polygon(25% -50%,75% -50%,75% 25%,150% 25%,150% 75%,75% 75%,75% 150%,25% 150%,25% 75%,-50% 75%,-50% 25%,25% 25%)}', 13, () => 'plus(out)'],
  ['dissolve', 'Disolver', 'blur_on', 'Básicos', 'from{opacity:0;filter:blur(8px) contrast(2.5)}60%{opacity:1}to{opacity:1;filter:none}', 9, () => 'dissolve'],
  ['random-bars', 'Barras aleatorias', 'reorder', 'Básicos', 'from{--fxp:0%}to{--fxp:4%}', 14, d => `randombar(${d === 'vertical' ? 'vertical' : 'horizontal'})`, HV],
  ['strips', 'Barras diagonales', 'texture', 'Básicos', 'from{--fxp:-15%}to{--fxp:115%}', 18, () => 'strips(downRight)'],
  ['wedge', 'Cuña', 'change_history', 'Básicos', 'from{--fxa:0deg}to{--fxa:180deg}', 20, () => 'wedge'],
  ['wheel', 'Rueda', 'donut_large', 'Básicos', 'from{--fxa:0deg}to{--fxa:360deg}', 21, () => 'wheel(1)'],
  ['peek', 'Asomar', 'flip_to_front', 'Básicos', 'from{clip-path:var(--fx-clip);transform:var(--fx-move)}to{clip-path:inset(0 0 0 0);transform:none}', 12, d => `slide(${{ bottom: 'fromBottom', top: 'fromTop', left: 'fromLeft', right: 'fromRight' }[d] || 'fromBottom'})`, D4],
  ['fly-in', 'Desplazar hacia dentro', 'flight', 'Básicos', 'from{transform:var(--fx-far)}to{transform:none}', 2, null, D4],
  ['crawl', 'Deslizar hacia dentro', 'slow_motion_video', 'Básicos', 'from{transform:var(--fx-far)}to{transform:none}', 7, null, D4],
  // Sutiles
  ['expand', 'Expandir', 'unfold_more', 'Sutiles', 'from{opacity:0;transform:scaleX(.6)}to{opacity:1;transform:none}', 55],
  ['swivel', 'Girar sobre sí', 'cached', 'Sutiles', '0%{opacity:0;transform:scaleX(.05)}35%{opacity:1;transform:scaleX(-.7)}70%{transform:scaleX(.9)}100%{transform:none}', 19],
  ['basic-zoom', 'Zoom básico', 'center_focus_strong', 'Sutiles', 'from{opacity:0;transform:scale(.1)}to{opacity:1;transform:none}', 23],
  ['flash-in', 'Destello', 'flash_on', 'Sutiles', '0%{opacity:0}30%{opacity:1;filter:brightness(2.5)}100%{opacity:1;filter:none}', 11],
  // Moderados
  ['center-revolve', 'Revolver al centro', '3d_rotation', 'Moderados', 'from{opacity:0;transform:perspective(900px) translateZ(-300px) rotateY(180deg)}to{opacity:1;transform:none}', 43],
  ['compress', 'Comprimir', 'compress', 'Moderados', 'from{opacity:0;transform:scaleY(1.8)}to{opacity:1;transform:none}', 50],
  ['ease-in', 'Acercar', 'zoom_in_map', 'Moderados', 'from{opacity:0;transform:scale(1.7)}to{opacity:1;transform:none}', 29],
  ['rise-up', 'Elevar', 'north', 'Moderados', '0%{opacity:0;transform:translateY(70px)}75%{opacity:1;transform:translateY(-8px)}100%{transform:none}', 37],
  ['spinner', 'Girar y crecer', 'autorenew', 'Moderados', 'from{opacity:0;transform:rotate(-360deg) scale(.4)}to{opacity:1;transform:none}', 49],
  ['stretch', 'Estirar', 'width', 'Moderados', 'from{transform:scaleX(0)}to{transform:none}', 17],
  ['credits', 'Créditos', 'subtitles', 'Moderados', 'from{transform:translateY(720px)}to{transform:none}', 28],
  ['glide', 'Planear', 'airplanemode_active', 'Moderados', 'from{opacity:0;transform:translateX(-140px) scale(.9)}to{opacity:1;transform:none}', 54],
  ['zip', 'Cremallera', 'vertical_align_top', 'Moderados', 'from{opacity:0;transform:translateY(160px) scaleY(.3)}to{opacity:1;transform:none}', 51],
  ['fold', 'Plegar', 'unfold_less', 'Moderados', 'from{opacity:0;transform:perspective(700px) rotateX(-90deg);transform-origin:50% 0}to{opacity:1;transform:none;transform-origin:50% 0}', 58],
  ['sling', 'Lanzar', 'sports_handball', 'Moderados', 'from{opacity:0;transform:perspective(700px) rotateX(90deg);transform-origin:50% 100%}to{opacity:1;transform:none;transform-origin:50% 100%}', 48],
  // Llamativos
  ['boomerang', 'Bumerán', 'u_turn_left', 'Llamativos', '0%{opacity:0;transform:translateX(320px) rotate(-90deg) scale(.4)}60%{opacity:1;transform:translateX(-30px) rotate(12deg) scale(1.05)}100%{transform:none}', 25],
  ['curve-up', 'Curva hacia arriba', 'turn_slight_right', 'Llamativos', '0%{opacity:0;transform:translate(-220px,220px) scale(1.5)}50%{opacity:1;transform:translate(-70px,-40px) scale(1.15)}100%{transform:none}', 52],
  ['drop', 'Caer', 'arrow_downward', 'Llamativos', '0%{opacity:0;transform:translateY(-220px)}70%{opacity:1;transform:translateY(12px)}85%{transform:translateY(-4px)}100%{transform:none}', 38],
  ['light-speed', 'Velocidad de la luz', 'bolt', 'Llamativos', '0%{opacity:0;transform:translateX(420px) skewX(-30deg)}60%{opacity:1;transform:skewX(20deg)}80%{transform:skewX(-6deg)}100%{transform:none}', 34],
  ['pinwheel', 'Molinete', 'cyclone', 'Llamativos', 'from{opacity:0;transform:rotate(720deg) scale(0)}to{opacity:1;transform:none}', 35],
  ['spiral', 'Espiral', 'motion_photos_on', 'Llamativos', 'from{opacity:0;transform:translate(320px,-220px) rotate(360deg) scale(.1)}to{opacity:1;transform:none}', 15],
  ['swish', 'Silbido', 'air', 'Llamativos', '0%{opacity:0;transform:translateX(-320px) skewX(40deg)}70%{opacity:1;transform:skewX(-10deg)}100%{transform:none}', 0],
  ['thin-line', 'Línea fina', 'horizontal_rule', 'Llamativos', '0%{transform:scale(.02,.02)}50%{transform:scale(1,.02)}100%{transform:none}', 39],
  ['unfold', 'Desplegar', 'open_in_full', 'Llamativos', 'from{opacity:0;transform:scaleX(0) skewY(25deg)}to{opacity:1;transform:none}', 40],
  ['whip', 'Látigo', 'gesture', 'Llamativos', '0%{opacity:0;transform:translateX(-320px) scaleX(.2)}60%{opacity:1;transform:translateX(24px) scaleX(1.1)}100%{transform:none}', 41],
];
// [id, name, icon, group, keyframes, presetID, options ('color')]: emphasis. Kept while shown when the keyframes end changed.
const EMPHASIS = [
  ['bold-reveal', 'Revelación en negrita', 'format_bold', 'Básicos', 'to{font-weight:700}', 15],
  ['bold-flash', 'Destello en negrita', 'format_bold', 'Sutiles', '40%,60%{font-weight:700}', 10],
  ['underline', 'Subrayado', 'format_underlined', 'Sutiles', 'to{text-decoration:underline}', 18],
  ['font-color', 'Color de fuente', 'format_color_text', 'Básicos', 'to{color:var(--fx-color,#e53935)}', 3, 'color'],
  ['fill-color', 'Color de relleno', 'format_color_fill', 'Básicos', 'to{--fx-on:1}', 1, 'color'],
  ['line-color', 'Color de línea', 'border_color', 'Básicos', 'to{--fx-on:1}', 7, 'color'],
  ['grow-color', 'Crecer con color', 'format_size', 'Moderados', 'to{transform:scale(1.1);color:var(--fx-color,#e53935)}', 28, 'color'],
  ['brush-color', 'Pincel de color', 'brush', 'Moderados', 'to{color:var(--fx-color,#e53935)}', 16, 'color'],
  ['transparency', 'Transparencia', 'opacity', 'Básicos', 'to{opacity:.5}', 9],
  ['darken', 'Oscurecer', 'brightness_4', 'Sutiles', 'to{filter:brightness(.55)}', 24],
  ['lighten', 'Aclarar', 'brightness_7', 'Sutiles', 'to{filter:brightness(1.5) saturate(.7)}', 30],
  ['desaturate', 'Desaturar', 'filter_b_and_w', 'Sutiles', 'to{filter:grayscale(1)}', 25],
  ['complementary', 'Color complementario', 'invert_colors', 'Sutiles', 'to{filter:hue-rotate(180deg)}', 21],
  ['contrasting', 'Color contrastante', 'contrast', 'Sutiles', 'to{filter:invert(1) hue-rotate(180deg)}', 23],
  ['blink', 'Parpadear', 'visibility', 'Llamativos', '0%,50%,100%{opacity:1}25%,75%{opacity:0}', 35],
  ['flicker', 'Titilar', 'flare', 'Llamativos', '0%,100%{opacity:1}10%,30%,60%{opacity:.2}20%,45%,80%{opacity:1}', 27],
  ['shimmer', 'Brillo', 'auto_awesome', 'Llamativos', '0%,100%{transform:none;filter:none}25%{transform:skewX(-8deg);filter:brightness(1.4)}75%{transform:skewX(8deg);filter:brightness(1.4)}', 36],
  ['wave', 'Onda', 'waves', 'Llamativos', '0%,100%{transform:none}25%{transform:translateY(-12px) rotate(-2deg)}50%{transform:translateY(6px) rotate(2deg)}75%{transform:translateY(-4px)}', 34],
  ['blast', 'Explosión', 'explosion', 'Llamativos', '0%,100%{transform:none}30%{transform:scale(1.35)}', 14],
];

const kfName = id => 'rvx' + id.replace(/-(\w)/g, (_, c) => c.toUpperCase()).replace(/^\w/, c => c.toUpperCase());
export const FX = {};
for (const [id, name, icon, group, kf, ppt, filter, dirs] of ENTRANCES) {
  FX[id] = { id, kind: 'entrance', name, icon, group, kf, kfName: kfName(id), ppt: ppt || null, filter: filter || null, dirs: dirs || null };
  FX[id + '-out'] = { ...FX[id], id: id + '-out', kind: 'exit', reverse: true };
}
for (const [id, name, icon, group, kf, ppt, opt] of EMPHASIS) {
  FX[id] = { id, kind: 'emphasis', name, icon, group, kf, kfName: kfName(id), ppt, colour: opt === 'color' };
}
export const isFx = id => !!FX[id];
// PowerPoint's preset → the effect here: entrances and exits by presetID, emphasis by theirs.
export const fxOfPreset = (cls, preset) => {
  const f = Object.values(FX).find(x => x.ppt === +preset && (cls === 'emph' ? x.kind === 'emphasis' : cls === 'exit' ? x.kind === 'exit' : x.kind === 'entrance'));
  return f ? f.id : null;
};
// A direction from PowerPoint's presetSubtype (1 top, 2 right, 4 bottom, 8 left; 5/10 vertical/horizontal for some).
export const dirOfSubtype = (id, sub) => {
  const f = FX[id]; if (!f?.dirs) return undefined;
  const keys = f.dirs.map(d => d[0]);
  if (keys.includes('bottom')) return { 1: 'top', 2: 'right', 4: 'bottom', 8: 'left' }[sub] || undefined;
  if (keys.includes('horizontal')) return sub === 5 || sub === 21 ? 'vertical' : sub === 10 || sub === 26 ? 'horizontal' : undefined;
  return undefined;
};
export const subtypeOfDir = dir => ({ top: 1, right: 2, bottom: 4, left: 8, vertical: 5, horizontal: 10 }[dir] || 0);

// The CSS variables an animation's options give its keyframes.
export function fxVars(a) {
  const f = FX[a?.effect]; if (!f) return '';
  const dir = a.dir || f.dirs?.[0][0], base = f.id.replace(/-out$/, '');
  const out = [];
  if (base === 'wipe') out.push(`--fx-clip:${{ bottom: 'inset(100% 0 0 0)', top: 'inset(0 0 100% 0)', left: 'inset(0 100% 0 0)', right: 'inset(0 0 0 100%)' }[dir]}`);
  if (base === 'split') out.push(`--fx-clip:${dir === 'horizontal' ? 'inset(50% 0 50% 0)' : 'inset(0 50% 0 50%)'}`);
  if (base === 'peek') out.push(`--fx-clip:${{ bottom: 'inset(0 0 100% 0)', top: 'inset(100% 0 0 0)', left: 'inset(0 0 0 100%)', right: 'inset(0 100% 0 0)' }[dir]}`,
    `--fx-move:${{ bottom: 'translateY(100%)', top: 'translateY(-100%)', left: 'translateX(-100%)', right: 'translateX(100%)' }[dir]}`);
  if (base === 'fly-in' || base === 'crawl') out.push(`--fx-far:${{ bottom: 'translateY(900px)', top: 'translateY(-900px)', left: 'translateX(-1500px)', right: 'translateX(1500px)' }[dir]}`);
  if (base === 'blinds' || base === 'random-bars') out.push(`--fx-ang:${dir === 'vertical' ? '90deg' : '180deg'}`);
  if (f.colour) out.push(`--fx-color:${/^#[0-9a-f]{6}$/i.test(a.color || '') ? a.color : '#e53935'}`);
  return out.map(x => x + ';').join('');
}
// Effects drawn through a mask (stripes, wedges, a wheel): it, with the animated --fxp/--fxa.
const MASKS = {
  blinds: 'repeating-linear-gradient(var(--fx-ang,180deg),#000 0 var(--fxp),transparent var(--fxp) 12.5%)',
  'random-bars': 'repeating-linear-gradient(var(--fx-ang,180deg),#000 0 var(--fxp),transparent var(--fxp) 4%)',
  checkerboard: 'linear-gradient(90deg,#000 var(--fxp),transparent var(--fxp))',
  strips: 'linear-gradient(135deg,#000 var(--fxp),transparent calc(var(--fxp) + 15%))',
  wedge: 'conic-gradient(from 0deg at 50% 50%,#000 var(--fxa),transparent var(--fxa) calc(360deg - var(--fxa)),#000 calc(360deg - var(--fxa)))',
  wheel: 'conic-gradient(from 0deg at 50% 50%,#000 var(--fxa),transparent var(--fxa))',
};
const maskOf = id => MASKS[id.replace(/-out$/, '')];
export const fxMask = maskOf;
// The registered properties the masks animate.
export const FX_PROPS_CSS = '@property --fxp{syntax:"<percentage>";inherits:false;initial-value:100%}@property --fxa{syntax:"<angle>";inherits:false;initial-value:360deg}';
// Every effect's keyframes (one per entrance and emphasis; an exit plays its entrance's backwards).
export const FX_KF_CSS = Object.values(FX).filter(f => f.kind !== 'exit').map(f => `@keyframes ${f.kfName}{${f.kf}}`).join('\n');
// The presentation's rules for these effects (only those used): before and after their step, and while.
export function fxPresentationCSS(used) {
  const ids = [...used].filter(isFx); if (!ids.length) return '';
  const S = '.reveal .slides section .fragment.';
  const rules = ids.map(id => {
    const f = FX[id], run = `${f.kfName} var(--anim-dur,600ms) ${id.startsWith('crawl') ? 'linear' : 'ease'} var(--anim-del,0ms) ${f.reverse ? 'reverse ' : ''}both`;
    const mask = maskOf(id), m = mask ? `-webkit-mask-image:${mask};mask-image:${mask};` : '';
    const trig = m ? ` .reveal .rv-trig.on.${id}{${m}}` : '';            // (played on a click on another object: its mask too)
    if (f.kind === 'entrance') return `${S}${id}.visible{opacity:1;visibility:inherit;${m}animation:${run}}` + trig;
    if (f.kind === 'exit') return `${S}${id}{opacity:1;visibility:inherit} ${S}${id}.visible{${m}animation:${run}}` + trig;
    // Emphasis: seen before its step; the change it leaves stays while it is shown.
    let r = `${S}${id}{opacity:1;visibility:inherit} ${S}${id}.visible:not([data-fxp]){animation:${run}}`;
    if (id === 'font-color' || id === 'brush-color' || id === 'grow-color') r += ` ${S}${id}.visible:not([data-fxp]) *{color:var(--fx-color)!important;transition:color var(--anim-dur,600ms) ease var(--anim-del,0ms)}`;
    if (id === 'bold-reveal') r += ` ${S}${id}.visible:not([data-fxp]) *{font-weight:700;transition:font-weight var(--anim-dur,600ms) step-end var(--anim-del,0ms)}`;
    if (id === 'fill-color') r += ` ${S}${id} svg :is(polygon,path,rect,ellipse,circle):not([fill=none]){transition:fill var(--anim-dur,600ms) ease var(--anim-del,0ms)} ${S}${id}.visible svg :is(polygon,path,rect,ellipse,circle):not([fill=none]){fill:var(--fx-color)}`;
    if (id === 'line-color') r += ` ${S}${id} svg *{transition:stroke var(--anim-dur,600ms) ease var(--anim-del,0ms)} ${S}${id}.visible svg :is(polygon,path,rect,ellipse,circle,line,polyline)[stroke]:not([stroke=none]):not([stroke=transparent]){stroke:var(--fx-color)}`;
    return r;
  });
  const kf = ids.map(id => FX[id].kfName);
  return [...(ids.some(maskOf) ? [FX_PROPS_CSS] : []), ...rules, ...FX_KF_CSS.split('\n').filter(l => kf.some(n => l.startsWith(`@keyframes ${n}{`)))].join('\n');
}
// An emphasis on some paragraphs of a text (PowerPoint's «by paragraph», p:txEl): its rule, on those only.
// key: the animation's key (data-fxp on its fragment); paras: the paragraphs' numbers (from 0).
export function fxParagraphCSS(id, key, paras) {
  const f = FX[id]; if (!f || f.kind !== 'emphasis' || !paras?.length) return '';
  const sel = `.reveal .slides section .fragment[data-fxp="${key}"].visible :is(${paras.map(n => `[data-p="${+n}"]`).join(',')})`;
  const run = `${f.kfName} var(--anim-dur,600ms) ease var(--anim-del,0ms) both`;
  return `${sel}{animation:${run}}` + (id === 'bold-reveal' ? `${sel},${sel} *{font-weight:700}` : '') + (f.colour ? `${sel},${sel} *{color:var(--fx-color)!important}` : '');
}
// OpenDocument (Impress): each effect's preset name, and its transition filter where Impress draws it with one
// (SMIL type, subtype); the rest fade there. ODF_FX[id] = [name, type, subtype].
export const ODF_FX = { wipe: ['wipe', 'barWipe', 'topToBottom'], split: ['split', 'barnDoorWipe', 'vertical'], blinds: ['venetian-blinds', 'blindsWipe', 'vertical'],
  box: ['box', 'irisWipe', 'rectangle'], checkerboard: ['checkerboard', 'checkerBoardWipe', 'across'], circle: ['circle', 'ellipseWipe', 'circle'],
  diamond: ['diamond', 'irisWipe', 'diamond'], plus: ['plus', 'fourBoxWipe', 'cornersIn'], dissolve: ['dissolve-in', 'dissolve', null],
  'random-bars': ['random-bars', 'randomBarWipe', 'vertical'], strips: ['diagonal-squares', 'waterfallWipe', 'verticalLeft'], wedge: ['wedge', 'fanWipe', 'centerTop'],
  wheel: ['wheel', 'clockWipe', 'clockwiseTwelve'], peek: ['peek-in', 'slideWipe', 'fromBottom'], 'fly-in': ['fly-in'], crawl: ['crawl-in'],
  'bold-reveal': ['bold'], underline: ['underline'], 'font-color': ['font-color'], 'fill-color': ['fill-color'], 'line-color': ['line-color'] };
export const fxOfODF = (cls, name) => {
  const k = Object.keys(ODF_FX).find(x => name === `ooo-${cls === 'emphasis' ? 'emphasis' : cls}-${ODF_FX[x][0]}`) || Object.keys(FX).find(x => name === `ooo-${cls}-rv-${x.replace(/-out$/, '')}`);
  if (!k) return null;
  const base = k.replace(/-out$/, '');
  return cls === 'exit' ? (FX[base + '-out'] ? base + '-out' : null) : FX[base] ? base : null;
};

// The galleries: groups of each kind, in PowerPoint's order.
export const FX_GROUPS = ['Básicos', 'Sutiles', 'Moderados', 'Llamativos'];
