// Who this browser uses Revela for — teaching, a company, or both — asked once on the start screen
// (ui/shell/audience.js) and changeable in the presentation settings. A choice of this browser, not of
// the presentation: it orders the example presentations (the chosen group first) and, for a company,
// hides the buttons that only make sense in a school. Hidden, not removed: the command palette (Ctrl+K)
// still finds them, and nothing a presentation uses stops working. 'both' (or nothing chosen) = as always.

const KEY = 'revela.audience';
export const AUDIENCES = ['edu', 'biz', 'both'];
// (The ribbon's actions that only make sense in a school: the gradebook, SCORM for a learning platform,
// sharing in Google Classroom and the lesson plan.)
export const EDU_ONLY = ['gradebook', 'export-scorm', 'share-classroom', 'ai-lessonplan'];

// → 'edu' | 'biz' | 'both', or null if never asked (or the browser keeps nothing).
export function audienceChoice() {
  try { const v = localStorage.getItem(KEY); return AUDIENCES.includes(v) ? v : null; } catch { return null; }
}
export const audience = () => audienceChoice() || 'both';
export const forBusiness = () => audience() === 'biz';
export function setAudience(v) {
  if (!AUDIENCES.includes(v)) return;
  try { localStorage.setItem(KEY, v); } catch {}
  globalThis.dispatchEvent?.(new CustomEvent('revela:audience', { detail: v }));
}
// The example groups in the order this audience sees them first: its own, then the rest as they were.
export function orderGroups(groups, who = audience()) {
  const first = who === 'biz' ? ['biz', 'product', 'data'] : who === 'edu' ? ['edu', 'sci'] : [];
  return [...first.flatMap(c => groups.filter(g => (g[0] ?? g) === c)), ...groups.filter(g => !first.includes(g[0] ?? g))];
}
