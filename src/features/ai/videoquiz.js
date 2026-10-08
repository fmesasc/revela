// Questions for a video, proposed by the AI (Wayground's and Nearpod's interactive video): with no transcript to read,
// it looks at frames spread over the video — small JPEGs, the second each one is at — and at the slide's words, and
// proposes a few multiple-choice questions, each at the second where its answer has just been seen. To review.

import { chat, lang, parseJSON } from './openrouter.js';
import { cleanQuestions } from '../live/media.js';

// n frames spread over the video: [{ t, url }] (a video that can't be drawn — another site's without CORS —: none).
export async function videoFrames(src, n = 8, max = 512) {
  const v = document.createElement('video');
  v.muted = true; v.preload = 'auto'; v.playsInline = true; if (!/^(data|blob):/.test(src)) v.crossOrigin = 'anonymous';
  const once = (ev, ms = 15000) => new Promise((ok, ko) => { const tm = setTimeout(() => ko(new Error('TIMEOUT')), ms);
    v.addEventListener(ev, () => { clearTimeout(tm); ok(); }, { once: true }); v.addEventListener('error', () => { clearTimeout(tm); ko(new Error('VIDEO')); }, { once: true }); });
  v.src = src; await once('loadeddata');
  // (A recording made in a browser — «Grabar cámara» — doesn't say how long it is until it's been read to the end.)
  if (v.duration === Infinity) { v.currentTime = 1e101; await once('durationchange').catch(() => {}); v.currentTime = 0; await once('seeked').catch(() => {}); }
  const d = v.duration; if (!(d > 0) || !isFinite(d)) throw new Error('VIDEO');
  const k = Math.min(1, max / Math.max(v.videoWidth || max, v.videoHeight || max)), c = document.createElement('canvas');
  c.width = Math.max(1, Math.round((v.videoWidth || max) * k)); c.height = Math.max(1, Math.round((v.videoHeight || max * 0.5625) * k));
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = Math.round(((i + 0.5) * d / n) * 10) / 10; v.currentTime = t; await once('seeked');
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
    try { out.push({ t, url: c.toDataURL('image/jpeg', 0.6) }); } catch { throw new Error('VIDEO'); }      // (tainted: another site's)
  }
  v.removeAttribute('src'); v.load();
  return { duration: Math.round(d * 10) / 10, frames: out };
}

export async function proposeVideoQuestions(src, { context = '', n = 4 } = {}) {
  const { duration, frames } = await videoFrames(src, 8);
  const content = [{ type: 'text', text: `A video of ${duration} seconds, shown in a presentation${context ? ` on a slide that says: ${context.slice(0, 1500)}` : ''}. Frames follow, each with its second.` }];
  for (const f of frames) content.push({ type: 'text', text: `Second ${f.t}:` }, { type: 'image_url', image_url: { url: f.url } });
  const out = await chat([
    { role: 'system', content: `You write questions that stop a video while students watch it, to check they follow it. From the frames (and the slide's words), write ${n} multiple-choice questions about what the video shows, `
      + `each placed at a second just after its answer has been seen (between 3 and ${Math.max(3, duration - 1)}), in order, not two within 10 seconds. 3 or 4 short options each, one right; `
      + `a one-sentence explanation. Nothing the frames don't show. Write in ${lang()}. Answer only JSON: {"questions":[{"at":12.5,"q":"…","options":["…"],"correct":[0],"explain":"…"}]}` },
    { role: 'user', content },
  ], { json: true, maxTokens: 2000, feature: 'quiz' });
  return cleanQuestions((parseJSON(out).questions || []).map(x => ({ ...x, at: Math.min(Math.max(0, duration - 0.5), +x?.at || 0) })));
}
