// Stock photos for «Imágenes de stock» (api.js routes /api/stock/…).

import { call } from './api.js';

// ---- Photos (Unsplash, Pexels): searched with Revela's keys, which stay here ----
// The pictures are used from their own servers, with the photographer's credit
// (as both services ask); Unsplash is also told when one is used.
export const PHOTO_PROVIDERS = {
  unsplash: { key: env => env.UNSPLASH_ACCESS_KEY, search: (env, q, page) => ['https://api.unsplash.com/search/photos?' + new URLSearchParams({ query: q, page, per_page: 20, content_filter: 'high' }), { Authorization: 'Client-ID ' + env.UNSPLASH_ACCESS_KEY, 'Accept-Version': 'v1' }],
    list: d => (d.results || []).map(x => ({ id: String(x.id), width: x.width, height: x.height, alt: x.alt_description || x.description || '', thumb: x.urls?.small, src: x.urls?.regular,
      author: x.user?.name || '', authorUrl: (x.user?.links?.html || '') + '?utm_source=revela&utm_medium=referral', source: 'Unsplash', sourceUrl: 'https://unsplash.com/?utm_source=revela&utm_medium=referral' })) },
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
export async function stockUsed(env, body, json) {
  if (body.provider === 'unsplash' && env.UNSPLASH_ACCESS_KEY && /^[\w-]{4,40}$/.test(body.id || ''))
    await (env.FETCH || fetch)(`https://api.unsplash.com/photos/${body.id}/download`, { headers: { Authorization: 'Client-ID ' + env.UNSPLASH_ACCESS_KEY } }).catch(() => null);
  return json({ ok: true });
}
// Which photo services are set up (for the app to show them).
export const photoProviders = env => Object.keys(PHOTO_PROVIDERS).filter(k => PHOTO_PROVIDERS[k].key(env));
