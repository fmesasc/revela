// Work someone may be waiting for — a request, a library being downloaded —, counted so the interface can say
// so on a slow connection (ui/shell/busy.js draws it: a thin bar, and a spinner in the button pressed). Work in
// the background (syncing, polls, autosave) is not counted.
let n = 0;
const listeners = new Set();
const emit = () => listeners.forEach(fn => { try { fn(n); } catch {} });
export const busyCount = () => n;
export const onBusy = fn => { listeners.add(fn); return () => listeners.delete(fn); };
// Start one; the function returned ends it (once).
export function busy() {
  n++; emit(); let done = false;
  return () => { if (done) return; done = true; n--; emit(); };
}
export async function whileBusy(promise) { const end = busy(); try { return await promise; } finally { end(); } }
