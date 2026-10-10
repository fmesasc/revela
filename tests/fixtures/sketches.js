// Strokes as a hand would draw some symbols (in a 100×100 box, y down), for the «draw to find it» test of Insert ▸
// Symbols (src/features/content/sketch.js). Not traced from any font: a little wobbly and uneven, as drawn.

const arc = (cx, cy, rx, ry, a0, a1, n = 24) => Array.from({ length: n + 1 }, (_, i) => {
  const a = a0 + (a1 - a0) * i / n; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
});
const D = Math.PI / 180;
// (A little wobble, the same every run.)
const wobble = strokes => strokes.map((s, k) => s.map(([x, y], i) => [x + Math.sin(i * 1.7 + k) * 0.8, y + Math.cos(i * 2.3 + k) * 0.8]));

export const SKETCHES = {
  '→': [[[8, 50], [50, 51], [92, 50]], [[70, 32], [92, 50], [71, 69]]],
  '←': [[[92, 50], [50, 49], [8, 50]], [[30, 31], [8, 50], [29, 68]]],
  '↑': [[[50, 92], [51, 50], [50, 8]], [[31, 30], [50, 8], [69, 29]]],
  '↓': [[[50, 8], [49, 50], [50, 92]], [[31, 70], [50, 92], [68, 71]]],
  '✓': [[[14, 52], [27, 66], [40, 82], [62, 50], [88, 14]]],
  '★': [[[50, 6], [62, 38], [96, 38], [69, 58], [79, 92], [50, 72], [21, 92], [31, 58], [4, 38], [38, 38], [50, 6]]],
  '∞': [Array.from({ length: 61 }, (_, i) => { const t = i / 60 * 2 * Math.PI, d = 1 + Math.sin(t) ** 2; return [50 + 44 * Math.cos(t) / d, 50 + 44 * Math.sin(t) * Math.cos(t) / d]; })],
  'π': [[[12, 30], [50, 28], [88, 27]], [[36, 29], [34, 60], [28, 88]], [[64, 28], [65, 62], [72, 88]]],
  '∑': [[[82, 12], [20, 12], [56, 50], [20, 88], [84, 88]]],
  '√': [[[8, 60], [20, 54], [40, 92], [72, 6]]],
  '♥': [[[50, 90], ...arc(28, 32, 22, 22, 135 * D, -90 * D).slice(0, -1), [28, 10], ...arc(28, 32, 22, 22, -90 * D, 0), [50, 34], ...arc(72, 32, 22, 22, 180 * D, 270 * D), ...arc(72, 32, 22, 22, -90 * D, 45 * D), [50, 90]]],
  '☺': [arc(50, 50, 44, 44, 0, 2 * Math.PI, 40), arc(35, 38, 4, 5, 0, 2 * Math.PI, 10), arc(65, 38, 4, 5, 0, 2 * Math.PI, 10), arc(50, 52, 24, 22, 20 * D, 160 * D, 16)],
  '€': [arc(58, 50, 38, 42, -50 * D, -310 * D, 30), [[6, 42], [62, 42]], [[6, 58], [56, 58]]],
  '©': [arc(50, 50, 46, 46, 0, 2 * Math.PI, 40), arc(52, 50, 20, 22, -45 * D, -315 * D, 20)],
};
for (const k of Object.keys(SKETCHES)) SKETCHES[k] = wobble(SKETCHES[k]);
