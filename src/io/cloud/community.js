// The community gallery from the app (server/cloudflare/community.js): browse, open a copy, publish, mine.
import { api, apiBase } from './account.js';

export const communityReady = () => !!apiBase();
export const SUBJECTS = ['math', 'lang', 'science', 'social', 'arts', 'music', 'pe', 'tech', 'languages', 'values', 'vocational', 'business', 'other'];
export const LEVELS = ['infant', 'primary', 'secondary', 'upper', 'vocational', 'university', 'adults', 'business'];
export const LICENSES = ['cc-by', 'cc-by-sa', 'cc-by-nc', 'cc-by-nc-sa'];
export const thumbURL = id => new URL(`community/${id}/thumb`, apiBase()).href;
export const pageURL = (id, title = '') => new URL(`/community/${id}`, apiBase()).href + (title ? '-' + String(title).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) : '');
export const browse = (o = {}) => api('community?' + new URLSearchParams(Object.entries(o).filter(([, v]) => v)));
// A copy to use (counted as a use): the deck, without the author's ids.
export async function take(id) { const r = await api(`community/${id}?use=1`); return r.deck; }
export const mine = () => api('community/mine');
export const remove = id => api(`community/${id}/delete`, {});
export const publish = form => api('community', form);
export const like = (id, on = true) => api(`community/${id}/like`, { on });
