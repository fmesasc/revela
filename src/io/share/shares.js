// The presentations shared from this browser, to find their links again and
// stop sharing them. Kept locally (never uploaded); links keep their key.

const LS = 'revela.shares';
export function sharesList() { try { return JSON.parse(localStorage.getItem(LS)) || []; } catch { return []; } }
function save(list) { try { localStorage.setItem(LS, JSON.stringify(list)); } catch {} }
export function addShare(s) { save([{ ...s, at: Date.now() }, ...sharesList()].slice(0, 200)); }
export function removeShare(id) { save(sharesList().filter(s => s.id !== id)); }

// Links to the viewer page (view.html next to the editor).
const viewer = () => location.href.replace(/[^/]*([?#].*)?$/, '') + 'view.html';
export const viewLink = (params, key) => `${viewer()}?${new URLSearchParams(params)}${key ? `#k=${key}` : ''}`;
export const iframeCode = (link, w = 960, h = 540) =>
  `<iframe src="${link.replace(/"/g, '&quot;')}" width="${w}" height="${h}" style="border:0;max-width:100%" allow="fullscreen" allowfullscreen loading="lazy"></iframe>`;
