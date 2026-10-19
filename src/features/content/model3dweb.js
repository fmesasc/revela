// A 3D model built in the browser from code an AI wrote («Crear 3D con IA», features/ai/model3dagent.js): the code runs
// with Three.js, the model is put on the floor and centred, photographed from three sides (for the AI to check it) and
// exported as GLB (what a 3D object of Revela holds).
//
// Where it runs, and why there: the code is the AI's, not the person's — it is never run in the editor's page. It runs
// in a Worker (a thread of its own: an endless loop can't freeze the editor, and it is stopped after a while) created
// inside an iframe sandboxed without allow-same-origin: an origin of its own, so no cookies, no storage and no access
// to the editor or the person's account; and its Content-Security-Policy allows no connection at all (connect-src
// 'none') and scripts only from Three.js's own folder on the CDN. It answers through postMessage only.

import { THREE_BASE } from '../../core/vendor.js';

const ESM = p => THREE_BASE + p + '/+esm';
// (The worker: Three.js, a few of its add-ons, and helpers for the AI — materials, rounded boxes, merging. Kept as
// text: it is run from a Blob inside the sandbox.)
// (A classic worker that imports its modules: a module worker doesn't start in a sandboxed — opaque-origin — frame.)
const WORKER = `
const loaded = Promise.all([import('${THREE_BASE}+esm'), import('${ESM('examples/jsm/exporters/GLTFExporter.js')}'),
  import('${ESM('examples/jsm/geometries/RoundedBoxGeometry.js')}'), import('${ESM('examples/jsm/utils/BufferGeometryUtils.js')}')]);
let THREE, GLTFExporter, helpers;
const setup = async () => {
  if (THREE) return;
  const [T, X, RB, BU] = await loaded; THREE = T; GLTFExporter = X.GLTFExporter;
  const { RoundedBoxGeometry } = RB, { mergeGeometries, mergeVertices } = BU;
  helpers = {
  mat: (color = '#cccccc', o = {}) => new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? o.roughness ?? 0.6, metalness: o.metal ?? o.metalness ?? 0,
    ...(o.emissive && { emissive: o.emissive, emissiveIntensity: o.emissiveIntensity ?? 1 }), ...(o.opacity != null && o.opacity < 1 && { transparent: true, opacity: o.opacity }),
    side: o.doubleSide ? THREE.DoubleSide : THREE.FrontSide, flatShading: !!o.flat, name: o.name || '' }),
  RoundedBoxGeometry, mergeGeometries, mergeVertices,
  mesh: (geometry, material, name = '') => { const m = new THREE.Mesh(geometry, material); m.name = name; return m; },
  };
};
const dataURL = blob => new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => ko(r.error); r.readAsDataURL(blob); });
onmessage = async e => {
  const { id, code, size = 384 } = e.data;
  try {
    await setup();
    const root = new THREE.Group(); root.name = 'Model';
    const run = new (async () => {}).constructor('THREE', 'root', 'h', '"use strict";\\n' + code + '\\n;');
    const out = await run(THREE, root, helpers);
    if (out && out.isObject3D && out !== root) root.add(out);
    let tris = 0, meshes = 0;
    root.traverse(o => { if (o.isMesh) { meshes++; const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3; if (!o.material) o.material = helpers.mat(); } });
    if (!meshes) throw new Error('The model has no mesh: add your meshes to root.');
    if (tris > 300000) throw new Error('Too many triangles: ' + Math.round(tris) + ' (keep it under 150 000).');
    // On the floor and centred (Y is up in glTF): its lowest point at y = 0.
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    if (box.isEmpty() || !isFinite(box.min.x + box.max.x + box.min.y + box.max.y)) throw new Error('The model is empty or its positions are not numbers.');
    const c = box.getCenter(new THREE.Vector3());
    root.position.x -= c.x; root.position.z -= c.z; root.position.y -= box.min.y; root.updateMatrixWorld(true);
    const dims = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
    // Three views, as a person would look at it: from the front-left a little above, from the side, from behind and above.
    const canvas = new OffscreenCanvas(size, size);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(size, size, false); renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#e8ebef'); scene.add(root);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a96a3, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 2.4); sun.position.set(3, 5, 4); scene.add(sun);
    const back = new THREE.DirectionalLight(0xffffff, 0.8); back.position.set(-4, 2, -3); scene.add(back);
    const R = Math.max(dims.x, dims.y, dims.z) || 1, grid = new THREE.GridHelper(R * 2.4, 12, 0x9aa5b1, 0xc9d0d8); scene.add(grid);
    const cam = new THREE.PerspectiveCamera(35, 1, R / 100, R * 100), mid = new THREE.Vector3(0, dims.y / 2, 0);
    const dist = (0.5 * Math.hypot(dims.x, dims.y, dims.z) || 1) / Math.sin(THREE.MathUtils.degToRad(35 / 2)) * 1.08;
    const views = [];
    for (const [az, el] of [[-35, 18], [90, 6], [200, 38]]) {
      const a = THREE.MathUtils.degToRad(az), b = THREE.MathUtils.degToRad(el);
      cam.position.set(mid.x + dist * Math.cos(b) * Math.sin(a), mid.y + dist * Math.sin(b), mid.z + dist * Math.cos(b) * Math.cos(a)); cam.lookAt(mid);
      renderer.render(scene, cam);
      views.push(await dataURL(await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.82 })));
    }
    renderer.dispose(); scene.remove(root);
    const glb = await new GLTFExporter().parseAsync(root, { binary: true });
    postMessage({ type: 'built', id, glb, views, tris: Math.round(tris), size: [dims.x, dims.y, dims.z].map(v => +v.toFixed(3)) }, [glb]);
  } catch (err) { postMessage({ type: 'error', id, message: String((err && (err.message || err)) || 'error').slice(0, 1500) }); }
};`;

// The sandbox's page: it only starts the worker and passes messages on.
const PAGE = `<!doctype html><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob: ${THREE_BASE}; worker-src blob:; img-src data: blob:; connect-src 'none'">
<script>
const SRC = ${JSON.stringify(WORKER)};
addEventListener('message', e => {
  if (e.source !== parent || !e.data || e.data.type !== 'build') return;
  const w = new Worker(URL.createObjectURL(new Blob([SRC], { type: 'text/javascript' })));
  w.onmessage = m => { parent.postMessage(m.data, '*', m.data && m.data.glb ? [m.data.glb] : []); w.terminate(); };
  w.onerror = err => { parent.postMessage({ type: 'error', id: e.data.id, message: 'Worker: ' + (err.message || 'failed to start') }, '*'); w.terminate(); };
  w.postMessage(e.data);
});
parent.postMessage({ type: 'ready' }, '*');
<\/script>`;

let seq = 0;
// The code → { glb (ArrayBuffer), views: [JPEG data URLs], tris, size: [x, y, z] in metres }; or an Error with what went
// wrong (for the AI to fix it). After `timeout` ms the sandbox is removed, worker and all.
export function buildModel(code, { timeout = 25000, size = 384 } = {}) {
  return new Promise((resolve, reject) => {
    const id = ++seq, frame = document.createElement('iframe');
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.setAttribute('aria-hidden', 'true'); frame.tabIndex = -1;
    frame.style.cssText = 'position:fixed;width:1px;height:1px;left:-10px;top:-10px;border:0;opacity:0;pointer-events:none';
    let done = false;
    const end = () => { done = true; clearTimeout(timer); removeEventListener('message', on); frame.remove(); };
    const on = e => {
      if (e.source !== frame.contentWindow || done) return;
      const d = e.data || {};
      if (d.type === 'ready') { frame.contentWindow.postMessage({ type: 'build', id, code: String(code || ''), size }, '*'); return; }
      if (d.id !== id) return;
      end();
      if (d.type === 'built') resolve({ glb: d.glb, views: d.views || [], tris: d.tris, size: d.size });
      else reject(new Error(d.message || 'build failed'));
    };
    const timer = setTimeout(() => { if (!done) { end(); reject(new Error(`The code took more than ${Math.round(timeout / 1000)} s (an endless loop?) and was stopped.`)); } }, timeout);
    addEventListener('message', on);
    frame.srcdoc = PAGE;
    document.body.appendChild(frame);
  });
}

// A GLB as a data: URL (what a 3D object of the presentation keeps).
export function glbURL(buf) {
  const bytes = new Uint8Array(buf); let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return 'data:model/gltf-binary;base64,' + btoa(s);
}
