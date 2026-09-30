// Sounds for animations (PowerPoint's "Sound" in the effect options): made
// here with Web Audio — no files, nothing downloaded — or a sound of one's own
// (a data URL). Runs as source embedded in the exported page (toString), so it
// imports nothing; the editor uses the same code to preview them.
export const ANIM_SOUNDS = [['', 'Sin sonido'], ['click', 'Clic'], ['pop', 'Pop'], ['chime', 'Campanilla'], ['whoosh', 'Silbido'],
  ['drumroll', 'Redoble'], ['applause', 'Aplausos'], ['custom', 'Sonido propio…']];
export function soundRuntime() {
  var ctx = null;
  function ac() { if (!ctx) { var A = window.AudioContext || window.webkitAudioContext; ctx = A ? new A() : null; } if (ctx && ctx.state === 'suspended') ctx.resume(); return ctx; }
  function noise(c, dur) { var n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0); for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; var s = c.createBufferSource(); s.buffer = buf; return s; }
  function env(c, node, t, a, peak, r) { var g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + r); node.connect(g); g.connect(c.destination); return g; }
  function burst(c, t, dur, freq, peak) { var s = noise(c, dur), f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8; s.connect(f); env(c, f, t, 0.003, peak, dur); s.start(t); s.stop(t + dur + 0.05); }
  var SYN = {
    click: function (c, t) { burst(c, t, 0.03, 3500, 0.5); },
    pop: function (c, t) { var o = c.createOscillator(); o.frequency.setValueAtTime(700, t); o.frequency.exponentialRampToValueAtTime(120, t + 0.09); env(c, o, t, 0.005, 0.5, 0.1); o.start(t); o.stop(t + 0.15); },
    chime: function (c, t) { [1318.5, 1760, 2637].forEach(function (f, i) { var o = c.createOscillator(); o.frequency.value = f; env(c, o, t + i * 0.08, 0.005, 0.18, 1.1); o.start(t + i * 0.08); o.stop(t + i * 0.08 + 1.3); }); },
    whoosh: function (c, t) { var s = noise(c, 0.6), f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(3500, t + 0.5); s.connect(f); env(c, f, t, 0.15, 0.6, 0.4); s.start(t); s.stop(t + 0.65); },
    drumroll: function (c, t) { for (var i = 0; i < 30; i++) burst(c, t + i * 0.04, 0.05, 1800, 0.1 + i * 0.012); burst(c, t + 1.25, 0.6, 5000, 0.5); },
    applause: function (c, t) { for (var i = 0; i < 90; i++) burst(c, t + Math.random() * 2.2, 0.02 + Math.random() * 0.03, 1200 + Math.random() * 2500, 0.08 + Math.random() * 0.15); },
  };
  function play(name, src) {
    if (name === 'custom') { if (src) { try { var a = new Audio(src); a.play().catch(function () {}); } catch (e) {} } return; }
    var c = ac(); if (!c || !SYN[name]) return; SYN[name](c, c.currentTime + 0.01);
  }
  function fire(el) { var s = el.getAttribute('data-sound'); if (!s) return;
    var del = parseFloat(getComputedStyle(el).getPropertyValue('--anim-del')) || 0; setTimeout(function () { play(s, el.getAttribute('data-sound-src')); }, del); }
  if (window.Reveal && document.querySelector('[data-sound]')) {
    Reveal.on('fragmentshown', function (e) { (e.fragments || [e.fragment]).forEach(fire); });
    // (Animations started by clicking another object: their sounds with them.)
    document.addEventListener('click', function (e) { var s = e.target.closest && e.target.closest('[data-bid]'); if (!s) return;
      s.closest('section').querySelectorAll('[data-trig="' + s.getAttribute('data-bid') + '"][data-sound]').forEach(fire); });
  }
  return { play: play };
}
