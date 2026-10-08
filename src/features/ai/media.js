// Real pictures, videos and 3D models for an AI-made deck: what a good presenter would look for — the thing itself, a
// labelled diagram, a map, the artwork, a short video of the process, the organ or the molecule to turn around — not
// decoration.
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
import { searchSketchfab, searchNASA3D, searchCommonsVideo } from '../content/resources.js';
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
// (The search a little wider each time it finds too little: «Battle of Adrianople map 378 Gothic cavalry» finds
// nothing in Commons — all its words must be there —, «Battle of Adrianople map» does.)
const STOP = /^(of|the|a|an|and|in|on|at|with|for|to|by|de|del|la|el|los|las|y|en|con|por|un|una)$/i;
export const wider = q => {
  const w = str(q).replace(/[^\p{L}\p{N}' -]+/gu, ' ').split(/\s+/).filter(Boolean), cut = n => { const x = w.slice(0, n); while (x.length && STOP.test(x[x.length - 1])) x.pop(); return x; };
  return [...new Set([w.join(' '), ...[5, 4, 3, 2].filter(n => n < w.length).map(cut).filter(x => x.filter(y => !STOP.test(y)).length >= 2).map(x => x.join(' '))])].filter(Boolean);
};
async function candidates(q) {
  let commons = [];
  for (const each of wider(q)) { const got = await searchCommons(each).catch(() => []); for (const x of got) if (!commons.some(c => c.url === x.url)) commons.push(x); if (commons.length >= 6) break; }
  const open = await searchImages(wider(q).find(x => x.split(' ').length <= 5) || q).catch(() => []);
  const seen = new Set(), out = [];
  // (Commons first — its pictures explain; Openverse adds photos —, without the same file twice.)
  for (const x of [...commons.slice(0, 7), ...open.filter(o => o.width >= 400).slice(0, 3).map(o => ({ ...o, description: '', from: 'Openverse' })), ...commons.slice(7)]) {
    const key = (x.url || '').split('/').pop(); if (seen.has(key)) continue; seen.add(key); out.push(x);
  }
  return out.slice(0, 10);
}

// ---- The choice, by looking ---------------------------------------------------------------------
// what: what the candidates are ('picture', '3D model', 'video'); a model's or a video's preview is what is seen.
// → { n (1-based, 0: none fits), c, alt, note }
const WHAT = { picture: 'pictures', '3D model': 'interactive 3D models (their previews)', video: 'videos (a frame of each)' };
export async function pickPicture(slide, cands, { topic = '', language = lang(), what = 'picture', want = '' } = {}) {
  const shots = [];
  for (const c of cands) { try { shots.push({ c, ...(await downscale(c.thumb, { max: 384, quality: 0.6, maxBytes: 60 * 1024 })) }); } catch {} }
  if (!shots.length) return { n: 0 };
  const content = [{ type: 'text', text: `Presentation: ${str(topic).slice(0, 300)}
Slide: «${str(slide.title)}» — ${[...(slide.bullets || []), slide.notes].map(str).filter(Boolean).join(' · ').slice(0, 600)}
Wanted ${what}: ${str(want || slide.image_search)}
${shots.length} candidate ${WHAT[what] || what} follow, numbered.` },
  ...shots.flatMap((s, i) => [{ type: 'text', text: `${i + 1}: «${s.c.title}»${s.c.description ? ' — ' + s.c.description : ''}${s.c.duration ? ` (${Math.round(s.c.duration)} s)` : ''}` }, { type: 'image_url', image_url: { url: s.url } }])];
  const out = await chat([
    { role: 'system', content: `You choose the ${what} for a presentation slide, as a careful teacher would. Pick the ONE that best shows what this slide explains, and score how well it fits (0-10). Score 7 or more only when it shows THIS subject accurately and clearly${what === 'picture' ? ' at slide size' : ''}. Score under 5 when:
- it is a different thing, even a similar-looking one (another system's architecture diagram for the presenter's own system; another battle's map; a cartoon where an anatomical model is needed);
- the slide is about the presenter's own work, product, data or organisation: no library ${what} can show it;
- its labels or annotations are in a language other than ${language} or English;
- it is decoration, people posing, a meme, text-heavy, blurry, tiny, a low-quality ${what}, or unfit for a classroom.
None is better than a wrong one.
Answer only JSON {"n":N (the best one, or 0),"score":0-10,"alt":"what the chosen ${what} shows, for someone who can't see it, max 125 characters, in ${language}","note":"one sentence for the speaker notes: what to point at or do with it, in ${language}"}.` },
    { role: 'user', content },
  ], { json: true, maxTokens: 400, feature: 'create', prefer: PICK_MODEL });
  const a = parseJSON(out) || {}, n = +a.score >= 7 ? Math.round(+a.n) || 0 : 0;
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

// ---- 3D models -------------------------------------------------------------------------------------
// NASA's (in Revela's list, downloaded into the deck) and Sketchfab's (shown by its own viewer): an organ, a molecule,
// a monument, a fossil, a machine, a planet — what is understood by turning it around.
async function modelCandidates(q) {
  const nasa = searchNASA3D(q).slice(0, 3).map(m => ({ id: 'n' + m.id, title: m.name, thumb: m.thumb, nasa: m, creator: 'NASA', license: 'NASA', from: 'NASA 3D Resources' }));
  let sf = [];
  for (const each of wider(q)) {
    const got = (await searchSketchfab(each).catch(() => ({ results: [] }))).results.filter(m => m.thumb && !sf.some(x => x.uid === m.uid));
    sf.push(...got); if (sf.length >= 6) break;
  }
  return [...nasa, ...sf.slice(0, 8).map(m => ({ id: m.uid, title: m.name, thumb: m.thumb, uid: m.uid, creator: m.user, license: m.license, source: m.page, from: 'Sketchfab' }))].slice(0, 9);
}
async function modelOf(c) {
  if (c.nasa) {
    const r = await fetch(c.nasa.src); if (!r.ok) throw new Error('MODEL');
    return { kind: 'model', src: await toDataURL(new Blob([await r.blob()], { type: 'model/gltf-binary' })) };
  }
  return { kind: 'embed', src: `https://sketchfab.com/models/${c.uid}/embed?autostart=1&preload=1&ui_theme=dark&ui_hint=0&transparent=1&animation_autoplay=1` };
}
// Free videos of Wikimedia Commons (a process filmed, an experiment, an animation): when YouTube had nothing checked.
async function commonsVideos(q) {
  for (const each of wider(q)) {
    const got = (await searchCommonsVideo(each).catch(() => ({ results: [] }))).results.filter(v => v.thumb && v.duration >= 5 && v.duration <= 900);
    if (got.length >= 2 || each.split(' ').length <= 2) return got.slice(0, 8).map(v => ({ ...v, id: v.url, creator: v.artist, source: v.page, from: 'Wikimedia Commons' }));
  }
  return [];
}

// ---- All of it ----------------------------------------------------------------------------------------
// specs (createDeck's): each "image" slide asks for one thing — image_search (a picture: sp.picture { src, w, h, alt,
// caption, credit }), video_search (sp.video { src, title, author } from YouTube, or a free video of Commons) or
// model_search (sp.model { kind: 'embed'|'model', src, alt, caption, credit }); what wasn't found, its points as a
// list. onProgress(0..1).
export async function findMedia(specs, { topic = '', language = '', onProgress = () => {}, videos = true } = {}) {
  const lng = language || lang(), media = sp => sp.kind === 'image' && !sp.figure;
  const pics = specs.filter(sp => media(sp) && sp.image_search && !sp.video_search && !sp.model_search);
  const models = specs.filter(sp => media(sp) && sp.model_search && !sp.video_search);
  const vids = videos ? specs.map((sp, i) => ({ sp, i })).filter(x => media(x.sp) && x.sp.video_search) : [];
  let done = 0; const total = pics.length + models.length + vids.length, step = () => onProgress(total ? ++done / total : 1);
  const used = new Set(), log = specs.mediaLog = [];   // (what was searched, found and chosen: for the evaluation, tools/ai-eval.py)
  const credit = c => `${c.creator ? c.creator + ' · ' : ''}${c.license || ''}${c.from ? ' · ' + c.from : ''}`.replace(/^ · | · $/g, '');
  const noted = (sp, p) => { if (p.note) sp.notes = `${str(sp.notes)} ${p.note}`.trim(); };
  const guard = async (sp, kind, want, job) => {
    try { await job(); } catch (e) { if (e.message === 'NO_CREDIT' || e.message === 'BAD_KEY') throw e; log.push({ slide: str(sp.title), [kind]: want, error: String(e.message || e).slice(0, 120) }); }
    step();
  };
  const videoJob = findVideos(vids, { topic, language: lng });
  for (const sp of pics) await guard(sp, 'search', str(sp.image_search), async () => {
    const cands = (await candidates(str(sp.image_search).slice(0, 100))).filter(c => !used.has(c.url));
    const p = cands.length ? await pickPicture(sp, cands, { topic, language: lng }) : { n: 0 };
    log.push({ slide: str(sp.title), search: str(sp.image_search), found: cands.length, picked: p.n ? p.c.title : null });
    if (!p.n) return;
    const src = await fetchPicture(p.c), k = Math.min(1, 1600 / Math.max(p.c.width || 1, p.c.height || 1));
    used.add(p.c.url);
    sp.picture = { src, w: Math.round((p.c.width || 1200) * k), h: Math.round((p.c.height || 900) * k), alt: p.alt || p.c.title, caption: credit(p.c), credit: p.c.source || '' };
    noted(sp, p);
  });
  for (const sp of models) await guard(sp, 'model', str(sp.model_search), async () => {
    const cands = await modelCandidates(str(sp.model_search).slice(0, 100));
    const p = cands.length ? await pickPicture(sp, cands, { topic, language: lng, what: '3D model', want: sp.model_search }) : { n: 0 };
    log.push({ slide: str(sp.title), model: str(sp.model_search), found: cands.length, picked: p.n ? p.c.title : null });
    if (!p.n) return;
    sp.model = { ...(await modelOf(p.c)), alt: p.alt || p.c.title, caption: `${p.c.title} — ${credit(p.c)}`, credit: p.c.source || '' };
    noted(sp, p);
  });
  const vm = await videoJob;
  for (const { sp, i } of vids) await guard(sp, 'video', str(sp.video_search), async () => {
    let v = vm.get(i), how = 'YouTube';
    if (!v) {
      const cands = await commonsVideos(str(sp.video_search).slice(0, 100));
      const p = cands.length ? await pickPicture(sp, cands, { topic, language: lng, what: 'video', want: sp.video_search }) : { n: 0 };
      if (p.n) { v = { src: p.c.src, file: true, title: p.alt || p.c.title, w: p.c.width, h: p.c.height, caption: `${p.c.title} — ${credit(p.c)}`, credit: p.c.source || '' }; how = 'Commons'; noted(sp, p); }
    }
    if (v) sp.video = v;
    log.push({ slide: str(sp.title), video: str(sp.video_search), found: v ? `${how}: ${v.title}` : null });
  });
  // (Nothing found: the slide says its points, as a list; with none, the search itself — what was to be seen.)
  for (const sp of specs) if (media(sp) && (sp.image_search || sp.video_search || sp.model_search) && !sp.picture && !sp.video && !sp.model) {
    sp.kind = 'bullets'; if (!(sp.bullets || []).length) sp.bullets = [str(sp.image_search || sp.video_search || sp.model_search)];
  }
  for (const sp of specs) { delete sp.image_search; delete sp.video_search; delete sp.model_search; }
  return specs;
}
