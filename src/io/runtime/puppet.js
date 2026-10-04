// "Controlar con la cámara": a 3D model (model-viewer) moves with the person in
// front of the camera, like a Kinect but with the webcam. Shared by the editor
// ("Probar") and the exported presentation (embedded there as source, so: no
// imports; every function here is written into the page as it is).
//
// Privacy: the camera's picture and the landmarks found in it stay in the
// browser — MediaPipe's pose and face landmarkers run here (their code and
// models are fixed versions fetched from a CDN, loaded only when such a model
// is on screen); nothing is sent anywhere.
//
// - puppetBones(names): which bones are the arms, head, neck, chest… by their
//   names (Mixamo, RobotExpressive, VRM, Revela's automatic skeleton…).
// - puppetSolve(pose, face, { mirror, aspect }): landmarks → directions of the
//   arms and turns of the torso and head, in the model's own frame (x: its
//   left, y: up, z: towards whoever looks at it), within plausible limits.
// - createPuppet(o): drives model-viewers with that, blended over the model's
//   own animation (back to it when nobody is seen). If the model has no
//   skeleton it recognises, the whole model turns with the head.
// - revelaPuppetRuntime: in the presentation, the current slide's models.

// The role of each bone, by its name: { upperArmL: i, lowerArmL: i, … } (index in names).
export function puppetBones(names) {
  var ROLE = { upperarm: 'upperArm', arm: 'upperArm', forearm: 'lowerArm', lowerarm: 'lowerArm', elbow: 'lowerArm', hand: 'hand', wrist: 'hand',
    head: 'head', neck: 'neck', neck1: 'neck', upperchest: 'chest', chest: 'chest', torso: 'chest', spine2: 'chest', spine3: 'chest',
    spine: 'spine', spine1: 'spine', abdomen: 'spine', hips: 'hips', hip: 'hips', pelvis: 'hips', jaw: 'jaw' };
  var SIDED = { upperArm: 1, lowerArm: 1, hand: 1 };
  // (Prefixes of rigs: Mixamo, VRM's J_Bip_C_, Blender's DEF-/ORG-, 3ds Max's Bip01, Character Creator's CC_Base_…)
  var SKIP = /^(mixamorig\d*|j|bip|bip0*1|def|org|mch|c|cc|base|armature|rig|valvebiped|skel|bn|jnt)$/;
  var out = {};
  (names || []).forEach(function (raw, i) {
    var tk = String(raw || '').replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z])([A-Z][a-z])/g, '$1 $2').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    var side = '', rest = [];
    tk.forEach(function (w) { if (w === 'l' || w === 'left') side = 'L'; else if (w === 'r' || w === 'right') side = 'R'; else if (!SKIP.test(w)) rest.push(w); });
    var base = rest.join('');
    // (three.js drops the dots: KayKit's "upperarm.l" arrives as "upperarml".)
    if (!ROLE[base] && !side && /[lr]$/.test(base) && SIDED[ROLE[base.slice(0, -1)]]) { side = base.slice(-1).toUpperCase(); base = base.slice(0, -1); }
    var role = ROLE[base]; if (!role) return;
    if (SIDED[role]) { if (!side) return; role += side; } else if (side) return;
    if (!(role in out)) out[role] = i;
  });
  return out;
}
// A morph target that opens the mouth ('jaw') or closes the eyes ('blink').
export function puppetMorph(name) {
  var n = String(name || '').toLowerCase().replace(/[^a-z]/g, '');
  if (/^(jawopen|mouthopen|a|aa|vaa|vrcvaa|fclmtha|mtha)$/.test(n)) return 'jaw';
  if (/^(eye)?blink(left|right|l|r)?$|^eyes?closed?$|^fcleyeclose$/.test(n)) return 'blink';
  return null;
}

// Landmarks → pose, in the model's frame. pose: { world | image: MediaPipe's 33
// pose landmarks (x right in the picture, y down, z away from the camera) };
// face: { points: 478 face landmarks (in the picture), shapes: { jawOpen, … } }.
// mirror (default): the model moves like a mirror (your right hand → the hand
// on that side of the screen). Arms: unit directions shoulder→elbow and
// elbow→wrist (null if not seen); torso and head: { yaw, pitch, roll } radians
// (yaw > 0: turning to the model's left; pitch > 0: looking down; roll > 0:
// its left side up).
export function puppetSolve(pose, face, o) {
  o = o || {};
  var out = { arms: { L: null, R: null }, torso: null, head: null, jaw: 0, blink: 0, seen: false };
  var P = pose && (pose.world || pose.image), a = pose && pose.world ? 1 : (o.aspect || 1);
  var cl = function (v, m) { return Math.max(-m, Math.min(m, v)); };
  var sub = function (p, q) { return [p[0] - q[0], p[1] - q[1], p[2] - q[2]]; };
  var mid = function (p, q) { return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2]; };
  var len = function (v) { return Math.hypot(v[0], v[1], v[2]); };
  var unit = function (v) { var l = len(v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  var dot = function (p, q) { return p[0] * q[0] + p[1] * q[1] + p[2] * q[2]; };
  var cross = function (p, q) { return [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]]; };
  // (The picture as seen by the model: its left is the person's left; y up; z towards the camera.)
  var at = function (L, i, k) { var p = L[i]; return [p.x * k, -p.y, -p.z * k]; };
  var vis = function (i) { var v = P[i].visibility; return v == null || v > 0.5; };
  // Head turns from a frame: lateral (to its left) and up vectors.
  function turns(lat, up) {
    if (lat[0] < 0) lat = [-lat[0], -lat[1], -lat[2]];          // (a face is never turned more than sideways)
    if (up[1] < 0) up = [-up[0], -up[1], -up[2]];
    var X = unit(lat), Y = unit(sub(up, X.map(function (c) { return c * dot(up, X); }))), Z = cross(X, Y);
    var pitch = Math.asin(cl(-Z[1], 1));
    return { yaw: cl(Math.atan2(Z[0], Z[2]), 1.2), pitch: cl(pitch, 0.7), roll: cl(Math.asin(cl(X[1] / Math.max(Math.cos(pitch), 0.2), 1)), 0.6) };
  }
  if (P && P.length >= 25) {
    var p = function (i) { return at(P, i, a); };
    // Arms: 11/13/15 the person's left shoulder, elbow, wrist; 12/14/16 the right.
    [['L', 11, 13, 15], ['R', 12, 14, 16]].forEach(function (s) {
      if (!vis(s[1]) || !vis(s[2])) return;
      var up = unit(sub(p(s[2]), p(s[1]))), lo = vis(s[3]) ? unit(sub(p(s[3]), p(s[2]))) : up;
      // (Arms don't reach far behind the back.)
      var back = function (v) { return v[2] < -0.5 ? unit([v[0], v[1], -0.5]) : v; };
      out.arms[s[0]] = { upper: back(up), lower: back(lo) };
    });
    if (vis(11) && vis(12)) {
      out.seen = true;
      var S = sub(p(11), p(12)), pitch = 0;
      if (vis(23) && vis(24)) { var U = sub(mid(p(11), p(12)), mid(p(23), p(24))); pitch = Math.atan2(U[2], U[1]); }
      out.torso = { yaw: cl(Math.atan2(-S[2], S[0]), 0.6), pitch: cl(pitch, 0.4), roll: cl(Math.atan2(S[1], S[0]), 0.45) };
    }
    // Head from the pose: ears (or eyes) across, eyes over the mouth up.
    if (vis(0) && ((vis(7) && vis(8)) || (vis(2) && vis(5)))) {
      out.seen = true;
      var lat = vis(7) && vis(8) ? sub(p(7), p(8)) : sub(p(2), p(5));
      out.head = turns(lat, sub(mid(p(2), p(5)), mid(p(9), p(10))));
    }
  }
  // Head from the face (more precise): eye corners across, chin to forehead up.
  var F = face && face.points;
  if (F && F.length > 263) {
    var k = o.aspect || 1, f = function (i) { return at(F, i, k); };
    out.head = turns(sub(f(263), f(33)), sub(f(10), f(152))); out.seen = true;
  }
  var sh = face && face.shapes;
  if (sh) { out.jaw = Math.max(0, Math.min(1, (sh.jawOpen || 0) * 1.4)); out.blink = Math.max(0, Math.min(1, ((sh.eyeBlinkLeft || 0) + (sh.eyeBlinkRight || 0)) / 2)); }
  return o.mirror === false ? out : puppetMirror(out);
}
// The same pose seen in a mirror: left and right swapped, turns the other way.
export function puppetMirror(s) {
  var fx = function (v) { return [-v[0], v[1], v[2]]; }, arm = function (x) { return x && { upper: fx(x.upper), lower: fx(x.lower) }; };
  var rot = function (r) { return r && { yaw: -r.yaw, pitch: r.pitch, roll: -r.roll }; };
  return { arms: { L: arm(s.arms.R), R: arm(s.arms.L) }, torso: rot(s.torso), head: rot(s.head), jaw: s.jaw, blink: s.blink, seen: s.seen };
}

// The engine. o: { vision, pose, face (model URLs), camera: { hold(), drop() }
// (the camera runtime's engine, so a Cameo and this share one camera), status(code, mv),
// load(kind) → detector (tests), track(now) → { pose, face } (tests: no camera) }.
// show([{ mv, mode: 'body'|'head', mirror, preview }]): the models to drive now
// (the others go back to how they were; none: the camera is let go).
// Status codes: camera, loading, tracking, seen, lost, nocamera, noload, nowebgl,
// noscene; per model: whole (no skeleton: it turns whole), headonly (no arms).
export function createPuppet(o) {
  var items = [], raf = 0, gen = 0, video = null, held = false, lastT = 0, lastDet = 0, seenAt = -1e9, seen = null, flip = 0;
  var tk = {}, files = null, mods = null, shown = '';
  function say(code, mv) { if (o.status) try { o.status(code, mv); } catch (e) {} }
  function sceneOf(mv) {
    var k = Object.getOwnPropertySymbols(mv).filter(function (s) { return s.description === 'scene'; })[0], s = k && mv[k];
    return s && s.queueRender && s.mixer && s.updateAnimation ? s : null;
  }
  // ---- Detectors (MediaPipe), each loaded once, on the GPU if it can.
  function detector(kind) {
    if (!tk[kind]) tk[kind] = (o.load ? Promise.resolve().then(function () { return o.load(kind); }) : (function () {
      mods = mods || import(o.vision + '/vision_bundle.mjs');
      return mods.then(function (m) {
        files = files || m.FilesetResolver.forVisionTasks(o.vision + '/wasm');
        return files.then(function (fs) {
          var make = function (d) {
            var base = { baseOptions: { modelAssetPath: kind === 'face' ? o.face : o.pose, delegate: d }, runningMode: 'VIDEO' };
            return kind === 'face' ? m.FaceLandmarker.createFromOptions(fs, Object.assign(base, { numFaces: 1, outputFaceBlendshapes: true }))
              : m.PoseLandmarker.createFromOptions(fs, Object.assign(base, { numPoses: 1 }));
          };
          return webgl() ? make('GPU').catch(function () { return make('CPU'); }) : make('CPU');
        });
      });
    })()).then(function (d) { return d || null; }, function () { return null; });
    return tk[kind];
  }
  function webgl() { try { var c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }
  // ---- A model, rigged for driving: its bones, its frame, how it was.
  function rig(it) {
    var mv = it.mv, sc = sceneOf(mv), root = sc && (sc.model || sc.target);
    if (!root || !root.traverse) { say('noscene', mv); return null; }
    var bones = [], meshes = [];
    root.traverse(function (n) { if (n.isBone) bones.push(n); if (n.morphTargetDictionary && n.morphTargetInfluences) meshes.push(n); });
    var map = puppetBones(bones.map(function (b) { return b.name; })), B = {};
    for (var k in map) B[k] = bones[map[k]];
    var Q = root.quaternion.constructor, V = root.position.constructor, M = root.matrix.constructor;
    var arms = B.upperArmL && B.lowerArmL && B.upperArmR && B.lowerArmR && (B.handL || B.lowerArmL.children.some(isBone)) && (B.handR || B.lowerArmR.children.some(isBone));
    var r = { sc: sc, root: root, B: B, Q: Q, V: V, w: 0, wa: { L: 0, R: 0 }, last: { L: null, R: null }, f: {}, morphs: [], rest: [],
      q: [new Q(), new Q(), new Q(), new Q(), new Q()], v: [new V(), new V(), new V()] };
    r.kind = it.mode === 'head' ? (B.head ? 'head' : 'whole') : arms ? 'body' : B.head ? 'head' : 'whole';
    if (r.kind === 'whole') say('whole', mv); else if (it.mode !== 'head' && r.kind === 'head') say('headonly', mv);
    // Its own frame (from its shoulders: models don't all face +z).
    root.updateMatrixWorld(true);
    var up = new V(0, 1, 0), lat = new V(1, 0, 0);
    if (B.upperArmL && B.upperArmR) {
      var a = root.worldToLocal(B.upperArmL.getWorldPosition(new V())), b = root.worldToLocal(B.upperArmR.getWorldPosition(new V()));
      a.sub(b); a.y = 0; if (a.lengthSq() > 1e-12) lat.copy(a).normalize();
    }
    var fwd = new V().crossVectors(lat, up).normalize();
    r.frame = new Q().setFromRotationMatrix(new M().makeBasis(lat, up, fwd));
    ['spine', 'chest', 'neck', 'head', 'upperArmL', 'lowerArmL', 'upperArmR', 'lowerArmR', 'jaw'].forEach(function (k) { if (B[k]) r.rest.push([B[k], B[k].quaternion.clone()]); });
    r.whole = root.quaternion.clone();
    meshes.forEach(function (m) { for (var n in m.morphTargetDictionary) { var kind = puppetMorph(n), i = m.morphTargetDictionary[n]; if (kind) r.morphs.push([m, i, kind, m.morphTargetInfluences[i]]); } });
    r.face = it.mode === 'head' || r.morphs.length > 0 || !!B.jaw;
    // Its own animation keeps playing under it: each update, the clip's pose first, then ours on top.
    sc.updateAnimation = function (step) { restore(r); Object.getPrototypeOf(sc).updateAnimation.call(sc, step); pose(it, r); };
    // (It doesn't turn by itself while it follows someone.)
    r.auto = mv.autoRotate; r.spin = typeof mv.turntableRotation === 'number' ? mv.turntableRotation : 0; mv.autoRotate = false;
    return r;
  }
  function isBone(n) { return n.isBone; }
  function restore(r) { r.rest.forEach(function (x) { x[0].quaternion.copy(x[1]); }); }
  function unrig(it) {
    var r = it.rig; it.rig = null; if (!r) return;
    delete r.sc.updateAnimation; restore(r);
    r.root.quaternion.copy(r.whole); r.root.updateMatrixWorld(true);
    r.morphs.forEach(function (x) { x[0].morphTargetInfluences[x[1]] = x[3]; });
    if (r.auto) it.mv.autoRotate = true;
    r.sc.queueRender();
  }
  // ---- Our pose, on top of whatever the clip left (weight r.w: 0 = the clip).
  function pose(it, r) {
    var s = it.sol, w = r.w; if (!s || w < 0.002) return;
    var Q = r.Q, q = r.q, B = r.B;
    if (r.kind === 'whole') r.root.quaternion.copy(r.whole);
    r.root.updateMatrixWorld(true);
    var Qm = r.root.getWorldQuaternion(new Q()).multiply(r.frame), Qi = Qm.clone().invert();
    // A turn in the model's frame → in the world.
    var turnQ = function (t, k) { var x = new Q(), y = new Q(), z = new Q(), ax = new r.V();
      x.setFromAxisAngle(ax.set(0, 1, 0), t.yaw * k); y.setFromAxisAngle(ax.set(1, 0, 0), t.pitch * k); z.setFromAxisAngle(ax.set(0, 0, 1), t.roll * k);
      return Qm.clone().multiply(x.multiply(y).multiply(z)).multiply(Qi); };
    // Turn a bone by a rotation given in the world (its parent stays).
    var turn = function (bone, Rw) {
      var pw = bone.parent.getWorldQuaternion(q[0]); q[1].copy(pw).invert().multiply(Rw).multiply(pw);
      bone.quaternion.premultiply(q[1]); bone.updateMatrixWorld(true);
    };
    if (r.kind === 'whole') {                                    // (no skeleton: the whole model, with the head and the shoulders)
      var h = s.head || { yaw: 0, pitch: 0, roll: 0 }, t = s.torso || { roll: 0 };
      turn(r.root, turnQ({ yaw: h.yaw * 0.8, pitch: h.pitch * 0.6, roll: h.roll * 0.5 + t.roll * 0.5 }, w)); return;
    }
    var headW = B.head && B.head.getWorldQuaternion(new Q());
    if (s.torso && r.kind === 'body') {
      var parts = [B.spine, B.chest].filter(Boolean);
      parts.forEach(function (b) { turn(b, turnQ(s.torso, w / parts.length)); });
    }
    if (r.kind === 'body') ['L', 'R'].forEach(function (side) {
      var arm = s.arms[side] || r.last[side], k = w * r.wa[side]; if (!arm || k < 0.002) return;
      var up = B['upperArm' + side], lo = B['lowerArm' + side], hand = B['hand' + side] || lo.children.filter(isBone)[0];
      [[up, lo, arm.upper], [lo, hand, arm.lower]].forEach(function (x) {
        var cur = x[1].getWorldPosition(r.v[0]).sub(x[0].getWorldPosition(r.v[1])).normalize();
        var to = r.v[2].set(x[2][0], x[2][1], x[2][2]).applyQuaternion(Qm);
        var D = q[2].setFromUnitVectors(cur, to); turn(x[0], q[3].identity().slerp(D, k));
      });
    });
    if (s.head && B.head) {
      // The head ends turned as the person's (in the world), whatever the torso did; the neck takes some of it.
      var want = turnQ(s.head, w).multiply(headW);
      if (B.neck) turn(B.neck, q[4].copy(want).multiply(B.head.getWorldQuaternion(new Q()).invert()).slerp(new Q(), 0.6));
      turn(B.head, q[4].copy(want).multiply(B.head.getWorldQuaternion(new Q()).invert()));
    }
    if (B.jaw && s.jaw) turn(B.jaw, new Q().setFromAxisAngle(new r.V(1, 0, 0).applyQuaternion(Qm), s.jaw * 0.35 * w));
    r.morphs.forEach(function (x) { var v = x[2] === 'jaw' ? s.jaw : s.blink; x[0].morphTargetInfluences[x[1]] = x[3] + (v - x[3]) * w; });
  }
  // ---- Smoothing: a one-euro filter per number (steady when still, quick when moving).
  function smooth(it, raw, now) {
    var f = it.f, out = { arms: { L: raw.arms.L, R: raw.arms.R }, torso: raw.torso, head: raw.head, jaw: raw.jaw, blink: raw.blink, seen: raw.seen };
    var one = function (key, x) {
      var st = f[key]; if (!st || now - st.t > 500) { f[key] = { x: x, d: 0, t: now }; return x; }
      var dt = Math.max(0.001, (now - st.t) / 1000), al = function (c) { var r2 = 2 * Math.PI * c * dt; return r2 / (r2 + 1); };
      st.d += al(1) * ((x - st.x) / dt - st.d); st.x += al(1.2 + 0.4 * Math.abs(st.d)) * (x - st.x); st.t = now; return st.x;
    };
    var vec = function (key, v) { var u = [one(key + 0, v[0]), one(key + 1, v[1]), one(key + 2, v[2])], l = Math.hypot(u[0], u[1], u[2]) || 1; return [u[0] / l, u[1] / l, u[2] / l]; };
    ['L', 'R'].forEach(function (s) { var a = raw.arms[s]; if (a) out.arms[s] = { upper: vec('u' + s, a.upper), lower: vec('l' + s, a.lower) }; });
    ['torso', 'head'].forEach(function (k) { var t = raw[k]; if (t) out[k] = { yaw: one(k + 'y', t.yaw), pitch: one(k + 'p', t.pitch), roll: one(k + 'r', t.roll) }; });
    out.jaw = one('jaw', raw.jaw); out.blink = raw.blink;
    return out;
  }
  // ---- Every frame: read the camera now and then (~30 times a second), ease the weights, pose the paused ones.
  function detect(now) {
    var res = null;
    if (o.track) res = o.track(now);
    else {
      if (!video || video.readyState < 2 || !video.videoWidth || !((tk.pose && tk.pose.ready) || (tk.face && tk.face.ready))) return;
      var pose = null, face = null, ts = performance.now();
      try {
        var needFace = items.some(function (it) { return it.rig && it.rig.face; }), needPose = items.some(function (it) { return it.rig && (it.rig.kind !== 'head' || !(tk.face && tk.face.ready)); });
        if (needPose && tk.pose && tk.pose.ready) { var rp = tk.pose.ready.detectForVideo(video, ts); if (rp && rp.landmarks && rp.landmarks[0]) pose = { world: rp.worldLandmarks && rp.worldLandmarks[0], image: rp.landmarks[0] }; }
        // (Both: the face every other time.)
        if (needFace && tk.face && tk.face.ready && (!pose || (flip = 1 - flip))) {
          var rf = tk.face.ready.detectForVideo(video, ts + 0.5);
          if (rf && rf.faceLandmarks && rf.faceLandmarks[0]) {
            var shapes = {}; ((rf.faceBlendshapes && rf.faceBlendshapes[0] && rf.faceBlendshapes[0].categories) || []).forEach(function (c) { shapes[c.categoryName] = c.score; });
            face = { points: rf.faceLandmarks[0], shapes: shapes };
          }
        }
      } catch (e) { say('noload'); stopAll(); return; }
      res = { pose: pose, face: face, aspect: video.videoWidth / video.videoHeight };
    }
    if (!res) return;
    var any = false;
    items.forEach(function (it) {
      var raw = puppetSolve(res.pose, res.face, { mirror: it.mirror !== false, aspect: res.aspect || 1 });
      if (!raw.seen) return;
      any = true; it.sol = smooth(it, raw, now);
      ['L', 'R'].forEach(function (s) { it.armSeen = it.armSeen || {}; if (raw.arms[s]) { it.armSeen[s] = now; if (it.rig) it.rig.last[s] = it.sol.arms[s]; } });
    });
    if (any) seenAt = now;
    var on = now - seenAt < 600;
    if (on !== seen) { seen = on; say(on ? 'seen' : 'lost'); }
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    var dt = Math.min(0.1, Math.max(0, (now - (lastT || now)) / 1000)); lastT = now;
    if (now - lastDet > 30) { lastDet = now; detect(now); if (!raf) return; }
    var on = now - seenAt < 600;
    items.forEach(function (it) {
      var r = it.rig; if (!r) return;
      // (In: quick; back to its own animation: gently.)
      r.w += ((on ? 1 : 0) - r.w) * (1 - Math.exp(-dt / (on ? 0.25 : 0.6)));
      ['L', 'R'].forEach(function (s) { var a = it.armSeen && now - it.armSeen[s] < 400 ? 1 : 0; r.wa[s] += (a - r.wa[s]) * (1 - Math.exp(-dt / (a ? 0.2 : 0.5))); });
      if (r.spin) { r.spin = Math.abs(r.spin) < 0.002 ? 0 : r.spin * 0.88; if (it.mv.resetTurntableRotation) it.mv.resetTurntableRotation(r.spin); }
      // Playing: model-viewer's own update calls ours. Paused (or whole): here.
      if (it.mv.paused || r.kind === 'whole') { restore(r); if (r.kind !== 'whole') { r.sc.mixer.update(0); } pose(it, r); r.sc.queueRender(); }
    });
  }
  // A model is driven once it has loaded (and again if its file changes).
  function attach(it) {
    var go = function () { if (items.indexOf(it) < 0) return; unrig(it); it.rig = rig(it); if (it.rig && it.rig.face) need('face'); if (it.rig && it.rig.kind !== 'head') need('pose'); };
    it.onload = go; it.mv.addEventListener('load', go);
    if (it.mv.loaded) go();
  }
  function detach(it) { it.mv.removeEventListener('load', it.onload); unrig(it); }
  // A detector wanted: loaded (once), and said so.
  function need(kind) {
    if (o.track) return;
    var p = detector(kind);
    if (!p.ready && !p.asked) { p.asked = true; say('loading'); p.then(function (d) {
      if (d) { p.ready = d; say('tracking'); seen = null; }
      else if (kind === 'face') need('pose');                    // (the face: the pose can do the head)
      else say('noload');
    }); }
  }
  function show(list) {
    var g = ++gen; list = [].slice.call(list || []);
    items.filter(function (it) { return !list.some(function (x) { return x.mv === it.mv; }); }).forEach(detach);
    items = list.map(function (x) {
      var it = items.filter(function (y) { return y.mv === x.mv; })[0];
      if (it && it.mode === x.mode) { it.mirror = x.mirror; it.preview = x.preview; return it; }
      if (it) detach(it);
      return { mv: x.mv, mode: x.mode === 'head' ? 'head' : 'body', mirror: x.mirror !== false, preview: !!x.preview, f: {}, rig: null };
    });
    var sig = items.map(function (it) { return it.mode; }).join();
    if (!items.length) { stopAll(); return Promise.resolve(); }
    items.forEach(function (it) { if (!it.onload) attach(it); });
    if (!raf) { lastT = 0; seen = null; raf = requestAnimationFrame(frame); }
    if (o.track || held) { shown = sig; return Promise.resolve(); }
    if (!webgl()) { say('nowebgl'); stopAll(); return Promise.resolve(); }
    say('camera'); held = true;
    return Promise.resolve(o.camera && o.camera.hold()).then(function (s) {
      if (g !== gen && !held) return;
      if (!s) { held = false; if (o.camera) o.camera.drop(); say('nocamera'); stopAll(); return; }
      video = video || Object.assign(document.createElement('video'), { muted: true, playsInline: true, autoplay: true });
      video.setAttribute('playsinline', ''); video.setAttribute('data-ignore', '');
      if (video.srcObject !== s) video.srcObject = s;
      var pl = video.play(); if (pl && pl.catch) pl.catch(function () {});
      items.forEach(function (it) { if (it.rig) { if (it.rig.face) need('face'); if (it.rig.kind !== 'head') need('pose'); } });
    });
  }
  function stopAll() {
    gen++; if (raf) cancelAnimationFrame(raf); raf = 0;
    items.forEach(detach); items = [];
    if (video) { video.srcObject = null; }
    if (held) { held = false; if (o.camera) o.camera.drop(); }
  }
  return { show: show, stop: stopAll, video: function () { return video || (video = Object.assign(document.createElement('video'), { muted: true, playsInline: true, autoplay: true })); },
    kind: function (mv) { var it = items.filter(function (x) { return x.mv === mv; })[0]; return it && it.rig ? it.rig.kind : null; },
    weight: function (mv) { var it = items.filter(function (x) { return x.mv === mv; })[0]; return it && it.rig ? it.rig.w : 0; } };
}

// In the presentation: the models of the slide shown follow the presenter (the
// camera is asked for then, and let go on leaving, unless a Cameo keeps it).
export function revelaPuppetRuntime(vision, pose, face) {
  var cam = window.__rvCam || (window.__rvCam = createCameraEngine({ vision: vision, keep: false }));
  var pp = createPuppet({ vision: vision, pose: pose, face: face, camera: cam });
  function shown(s) {
    var list = s ? [].slice.call(s.querySelectorAll('model-viewer[data-puppet]')).map(function (mv) {
      return { mv: mv, mode: mv.getAttribute('data-puppet'), mirror: mv.getAttribute('data-puppet-mirror') !== '0', preview: mv.hasAttribute('data-puppet-preview') };
    }) : [];
    pp.show(list);
    // The presenter's own picture, small, in a corner (if asked for).
    var pv = list.filter(function (x) { return x.preview; })[0], v = pp.video();
    if (pv) {
      v.style.cssText = 'position:fixed;left:14px;bottom:14px;width:176px;max-width:22vw;border-radius:10px;z-index:40;box-shadow:0 2px 10px #0006;pointer-events:none;object-fit:cover;aspect-ratio:4/3;background:#000;'
        + (pv.mirror ? 'transform:scaleX(-1);' : '');
      if (v.parentNode !== document.body) document.body.appendChild(v);
    } else if (v.parentNode) v.parentNode.removeChild(v);
  }
  Reveal.on('ready', function (e) { shown(e.currentSlide); });
  Reveal.on('slidechanged', function (e) { shown(e.currentSlide); });
  if (Reveal.isReady()) shown(Reveal.getCurrentSlide());
}
