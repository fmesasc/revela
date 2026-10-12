// Stock photos for «Imágenes de stock» (api.js routes /api/stock/…).

import { call } from './api.js';

// ---- Photos (Unsplash, Pexels): searched with Revela's keys, which stay here ----
// What both services ask of an app that uses their API (Unsplash's API guidelines, Pexels' API terms):
// - the pictures are shown from their own servers, at the addresses the search returns (hotlinked:
//   that is how Unsplash counts the views its photographers get);
// - each one carries its photographer's credit with links: «Photo by <name> on Unsplash», to the
//   profile and to Unsplash with the app's referral tag (utm_source = the app's registered name);
//   on Pexels, to the photographer and to the photo's page there;
// - when one is used (inserted in a slide), Unsplash is told at the photo's own download_location.
const UTM = { utm_source: 'revelaslides', utm_medium: 'referral' };
export function withUtm(u) {
  try { const x = new URL(u); if (x.protocol !== 'https:') return ''; for (const [k, v] of Object.entries(UTM)) x.searchParams.set(k, v); return x.href; } catch { return ''; }
}
// The download_location of an Unsplash photo, as the search returned it (with its ixid): only Unsplash's own
// endpoint for that photo, since the server calls it with Revela's key.
export function unsplashDownload(u, id) {
  try {
    const x = new URL(u);
    return x.protocol === 'https:' && x.host === 'api.unsplash.com' && !x.username && !x.password && x.pathname === `/photos/${id}/download` ? x.href : '';
  } catch { return ''; }
}
export const PHOTO_PROVIDERS = {
  unsplash: { key: env => env.UNSPLASH_ACCESS_KEY, search: (env, q, page) => ['https://api.unsplash.com/search/photos?' + new URLSearchParams({ query: q, page, per_page: 20, content_filter: 'high' }), { Authorization: 'Client-ID ' + env.UNSPLASH_ACCESS_KEY, 'Accept-Version': 'v1' }],
    list: d => (d.results || []).map(x => ({ id: String(x.id), width: x.width, height: x.height, alt: x.alt_description || x.description || '', thumb: x.urls?.small, src: x.urls?.regular,
      author: x.user?.name || '', authorUrl: withUtm(x.user?.links?.html), source: 'Unsplash', sourceUrl: withUtm('https://unsplash.com/'),
      downloadLocation: unsplashDownload(x.links?.download_location, String(x.id)) })) },
  pexels: { key: env => env.PEXELS_API_KEY, search: (env, q, page) => ['https://api.pexels.com/v1/search?' + new URLSearchParams({ query: q, page, per_page: 20 }), { Authorization: env.PEXELS_API_KEY }],
    list: d => (d.photos || []).map(x => ({ id: String(x.id), width: x.width, height: x.height, alt: x.alt || '', thumb: x.src?.medium, src: x.src?.large2x || x.src?.large,
      author: x.photographer || '', authorUrl: x.photographer_url || '', source: 'Pexels', sourceUrl: x.url || 'https://www.pexels.com' })) },
};
export const httpsOnly = u => (/^https:\/\//.test(u || '') ? u : '');
export async function stockSearch(env, A, url, json) {
  const provider = url.searchParams.get('provider'), q = String(url.searchParams.get('q') || '').trim().slice(0, 100), page = Math.min(50, Math.max(1, +url.searchParams.get('page') || 1));
  const P = PHOTO_PROVIDERS[provider]; if (!P || !q) return json({ error: 'bad request' }, 400);
  if (!P.key(env)) return json({ error: 'not configured' }, 503);
  if (!(await call(A, 'ratek', { key: 'stock', per: 30 })).ok) return json({ error: 'too many requests' }, 429);
  const [u, headers] = P.search(env, q, page);
  const r = await (env.FETCH || fetch)(u, { headers }).catch(() => null);
  if (!r || !r.ok) return json({ error: 'provider failed' }, 502);
  const list = P.list(await r.json().catch(() => ({}))).map(x => ({ ...x, thumb: httpsOnly(x.thumb), src: httpsOnly(x.src), authorUrl: httpsOnly(x.authorUrl), sourceUrl: httpsOnly(x.sourceUrl) })).filter(x => x.thumb && x.src);
  return json({ results: list });
}
// A photo used: Unsplash is sent a request to the photo's download_location (it only counts the download;
// nothing is fetched to keep). The app sends back the one the search gave it; an app from before that sent
// only the id, and gets the same endpoint built from it (without the ixid) so that no use goes uncounted.
export async function stockUsed(env, body, json) {
  const id = String(body.id || '');
  if (body.provider === 'unsplash' && env.UNSPLASH_ACCESS_KEY && /^[\w-]{4,40}$/.test(id)) {
    const at = body.downloadLocation ? unsplashDownload(body.downloadLocation, id) : `https://api.unsplash.com/photos/${id}/download`;
    if (at) await (env.FETCH || fetch)(at, { headers: { Authorization: 'Client-ID ' + env.UNSPLASH_ACCESS_KEY, 'Accept-Version': 'v1' } }).catch(() => null);
  }
  return json({ ok: true });
}
// Which photo services are set up (for the app to show them).
export const photoProviders = env => Object.keys(PHOTO_PROVIDERS).filter(k => PHOTO_PROVIDERS[k].key(env));
