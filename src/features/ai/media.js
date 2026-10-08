// Real pictures and videos for an AI-made deck: what a good presenter would look for — the thing itself, a labelled
// diagram, a map, the artwork, a short video of the process — not decoration.
//   1. The model says what must be seen on a slide ("image_search", in English: the image libraries are), or what a
//      video should show ("video_search").
//   2. Openly licensed pictures are searched (Wikimedia Commons — diagrams, maps, artworks — and Openverse); only the
//      search words leave the browser.
//   3. A vision model LOOKS at the candidates with the slide's message and picks the one that shows it — or none: a
//      wrong picture (another «Mercury», a stock photo of people smiling) is worse than no picture. It also writes
//      the picture's description (alternative text) and a line for the notes about what to point at.
//   4. Videos: found on the web by the model, then checked to exist and be embeddable (YouTube's oEmbed) and to be
//      about the slide — never a made-up address.
// A slide whose picture or video wasn't found keeps its points, as a list.

import { chat, parseJSON, lang } from './openrouter.js';
import { downscale } from './vision.js';
import { searchImages, wikimediaThumb } from '../content/stock.js';
import { embedUrl } from '../document/blocks.js';

const str = v => (v == null ? '' : String(v)).trim();
const PICK_MODEL = 'google/gemini-2.5-flash';
const plainHTML = h => str(h).replace(/<[^>]*>/g, ' ').replace(/&[#\w]+;/g, ' ').replace(/\s+/g, ' ').trim();

// ---- Candidates -----------------------------------------------------------------------------------
// Wikimedia Commons: the encyclopedia's pictures — diagrams with their labels, maps, artworks, historical photos.
export async function searchCommons(q, limit = 12) {
  const u = new URL('https://commons.wikimedia.org/w/api.php');
  for (const [k, v] of Object.entries({ action: 'query', format: 'json', origin: '*', generator: 'search', gsrsearch: `${q} filetype:bitmap|drawing`, gsrnamespace: 6, gsrlimit: limit,
    prop: 'imageinfo', iiprop: 'url|size|extmetadata|mime', iiurlwidth: 480 })) u.searchParams.set(k, v);
  const r = await fetch(u); if (!r.ok) throw new Error('Commons ' + r.status);
  const pages = Object.values((await r.json()).query?.pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
  return pages.map(p => {
    const ii = p.imageinfo?.[0] || {}, md = ii.extmetadata || {}, val = k => plainHTML(md[k]?.value);
    return { id: 'c' + p.pageid, title: str(p.title).replace(/^File:/, '').replace(/\.\w+$/, '').replace(/_/g, ' '), url: ii.url, thumb: ii.thumburl, width: ii.width, height: ii.height,
      description: val('ImageDescription').slice(0, 200), creator: val('Artist').slice(0, 80), license: val('LicenseShortName'), source: ii.descriptionurl, from: 'Wikimedia Commons', mime: ii.mime || '' };
  }).filter(x => /^https:\/\//.test(x.url || '') && x.thumb && x.width >= 300 && /^image\/(png|jpeg|gif|webp|svg)/.test(x.mime));   // (not a TIFF, a PDF's page, a DjVu)
}
async function candidates(q) {
  const [commons, open] = await Promise.all([searchCommons(q).catch(() => []), searchImages(q).catch(() => [])]);
  const seen = new Set(), out = [];
  // (Commons first — its pictures explain; Openverse adds photos —, without the same file twice.)
  for (const x of [...commons.slice(0, 7), ...open.filter(o => o.width >= 400).slice(0, 3).map(o => ({ ...o, description: '', from: 'Openverse' })), ...commons.slice(7)]) {
    const key = (x.url || '').split('/').pop(); if (seen.has(key)) continue; seen.add(key); out.push(x);
  }
  return out.slice(0, 10);
}

// ---- The choice, by looking ---------------------------------------------------------------------
// → { n (1-based, 0: none fits), alt, note }
export async function pickPicture(slide, cands, { topic = '', language = lang() } = {}) {
  const shots = [];
  for (const c of cands) { try { shots.push({ c, ...(await downscale(c.thumb, { max: 384, quality: 0.6, maxBytes: 60 * 1024 })) }); } catch {} }
  if (!shots.length) return { n: 0 };
  const content = [{ type: 'text', text: `Presentation: ${str(topic).slice(0, 300)}
Slide: «${str(slide.title)}» — ${[...(slide.bullets || []), slide.notes].map(str).filter(Boolean).join(' · ').slice(0, 600)}
Wanted picture: ${str(slide.image_search)}
${shots.length} candidate pictures follow, numbered.` },
  ...shots.flatMap((s, i) => [{ type: 'text', text: `${i + 1}: «${s.c.title}»${s.c.description ? ' — ' + s.c.description : ''}` }, { type: 'image_url', image_url: { url: s.url } }])];
  const out = await chat([
    { role: 'system', content: `You choose the picture for a presentation slide, as a careful teacher would. Pick the ONE that best shows what this slide explains: the right subject (not another thing with the same name), accurate, clear at slide size, labels readable if it is a diagram; prefer a real diagram, map, artwork or photo of the thing itself. A diagram's labels must be in ${language} or English (or it has none): one labelled in another language (the same chloroplast in Vietnamese) is not fit. Reject: a different subject, decoration, people posing, memes, text-heavy screenshots, blurry or tiny pictures, anything inappropriate for a classroom. If none really fits, answer 0 — no picture is better than a wrong one.
Answer only JSON {"n":N or 0,"alt":"what the chosen picture shows, for someone who can't see it, max 125 characters, in ${language}","note":"one sentence for the speaker notes: what to point at in it, in ${language}"}.` },
    { role: 'user', content },
  ], { json: true, maxTokens: 400, feature: 'create', prefer: PICK_MODEL });
  const a = parseJSON(out) || {}, n = Math.round(+a.n) || 0;
  return n >= 1 && n <= shots.length ? { n, c: shots[n - 1].c, alt: str(a.alt).slice(0, 180), note: str(a.note).slice(0, 300) } : { n: 0 };
}

const toDataURL = blob => new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = ko; r.readAsDataURL(blob); });
// The picture itself, embedded (so it works offline and keeps working if the library changes): a big original as its
// 1280-px copy.
async function fetchPicture(c) {
  // (A drawing — SVG — as Wikimedia's PNG of it: drawn with its fonts the same everywhere.)
  const urls = [(c.width > 1600 || /\.svg$/i.test(c.url)) && wikimediaThumb(c.url, 1280), c.url, c.thumb].filter(Boolean);
  for (const u of urls) {
    try { const r = await fetch(u, { mode: 'cors' }); if (r.ok) { const b = await r.blob(); if (/^image\//.test(b.type) && b.size < 12e6) return toDataURL(b); } } catch {}
  }
  throw new Error('IMAGE');
}

// ---- Videos ---------------------------------------------------------------------------------------
// That a video exists and can be shown inside a slide (oEmbed answers 401/404 otherwise) → { title, author } | null.
export async function checkVideo(url) {
  const src = embedUrl(url), id = src.match(/youtube\.com\/embed\/([\w-]{6,})/)?.[1]; if (!id) return null;
  try {
    const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent('https://www.youtube.com/watch?v=' + id)}`);
    if (!r.ok) return null; const d = await r.json();
    return { src: `https://www.youtube.com/embed/${id}`, title: str(d.title), author: str(d.author_name) };
  } catch { return null; }
}
const words = s => new Set(str(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^\p{L}\p{N}]+/u).filter(w => w.length >= 4));
// The videos for the slides that ask for one: searched on the web in one request, each checked.
async function findVideos(list, { topic = '', language = lang() } = {}) {
  if (!list.length) return new Map();
  const out = await chat([
    { role: 'system', content: `Find on the web one real YouTube video for each item: short (ideally under 8 minutes), clear, from a reputable channel (a university, a museum, a science or education channel, the official one), in ${language} if a good one exists, else in English. Only addresses you found in the search results — never make one up. Answer only JSON {"videos":[{"i":N,"url":"https://www.youtube.com/watch?v=…","title":"…"}]}; leave out an item you found nothing good for.` },
    { role: 'user', content: `Presentation: ${str(topic).slice(0, 300)}\n${list.map(x => `${x.i}: ${str(x.sp.video_search)} (slide «${str(x.sp.title)}»)`).join('\n')}` },
  ], { json: true, maxTokens: 1200, feature: 'create', prefer: PICK_MODEL, web: true }).catch(() => '');
  const found = new Map();
  for (const v of parseJSON(out)?.videos || []) {
    const it = list.find(x => x.i === +v.i); if (!it || found.has(it.i)) continue;
    const ok = await checkVideo(v.url); if (!ok) continue;
    // (Its real title must be about the slide: a valid address of another video is still the wrong video.)
    const want = words(`${it.sp.video_search} ${it.sp.title}`), has = words(ok.title);
    if (![...has].some(w => want.has(w) || [...want].some(x => x.length >= 6 && (w.startsWith(x.slice(0, 6)) || x.startsWith(w.slice(0, 6)))))) continue;
    found.set(it.i, ok);
  }
  return found;
}

// ---- All of it ----------------------------------------------------------------------------------------
// specs (createDeck's): the "image" slides with image_search get sp.picture { src, w, h, alt, caption, credit }, the
// ones with video_search sp.video { src, title, author }; what wasn't found becomes a list. onProgress(0..1).
export async function findMedia(specs, { topic = '', language = '', onProgress = () => {}, videos = true } = {}) {
  const lng = language || lang();
  const pics = specs.map((sp, i) => ({ sp, i })).filter(x => x.sp.kind === 'image' && x.sp.image_search && !x.sp.video_search && !x.sp.figure);
  const vids = videos ? specs.map((sp, i) => ({ sp, i })).filter(x => x.sp.kind === 'image' && x.sp.video_search && !x.sp.figure) : [];
  let done = 0; const total = pics.length + (vids.length ? 1 : 0), step = () => onProgress(total ? ++done / total : 1);
  const used = new Set(), log = specs.mediaLog = [];   // (what was searched, found and chosen: for the evaluation, tools/ai-eval.py)
  const videoJob = findVideos(vids, { topic, language: lng }).then(m => { step(); return m; });
  for (const { sp } of pics) {
    try {
      const cands = (await candidates(str(sp.image_search).slice(0, 100))).filter(c => !used.has(c.url));
      const p = cands.length ? await pickPicture(sp, cands, { topic, language: lng }) : { n: 0 };
      log.push({ slide: str(sp.title), search: str(sp.image_search), found: cands.length, picked: p.n ? p.c.title : null });
      if (p.n) {
        const src = await fetchPicture(p.c), k = Math.min(1, 1600 / Math.max(p.c.width || 1, p.c.height || 1));
        used.add(p.c.url);
        sp.picture = { src, w: Math.round((p.c.width || 1200) * k), h: Math.round((p.c.height || 900) * k), alt: p.alt || p.c.title,
          caption: `${p.c.creator ? p.c.creator + ' · ' : ''}${p.c.license || ''}${p.c.from ? ' · ' + p.c.from : ''}`.replace(/^ · | · $/g, ''), credit: p.c.source || '' };
        if (p.note) sp.notes = `${str(sp.notes)} ${p.note}`.trim();
      }
    } catch (e) { if (e.message === 'NO_CREDIT' || e.message === 'BAD_KEY') throw e; log.push({ slide: str(sp.title), search: str(sp.image_search), error: String(e.message || e).slice(0, 120) }); }
    step();
  }
  const vm = await videoJob;
  for (const { sp, i } of vids) { const v = vm.get(i); if (v) sp.video = v; log.push({ slide: str(sp.title), video: str(sp.video_search), found: v ? v.title : null }); }
  // (Nothing found: the slide says its points, as a list; with none, the search itself — what was to be seen.)
  for (const sp of specs) if (sp.kind === 'image' && (sp.image_search || sp.video_search) && !sp.picture && !sp.video && !sp.figure) {
    sp.kind = 'bullets'; if (!(sp.bullets || []).length) sp.bullets = [str(sp.image_search || sp.video_search)];
  }
  for (const sp of specs) { delete sp.image_search; delete sp.video_search; }
  return specs;
}
