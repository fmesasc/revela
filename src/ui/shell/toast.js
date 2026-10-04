// Short notes at the bottom of the window ("Downloaded…"), read out by screen
// readers; a busy one, with a spinner, for slow work (an export) until it ends.

let box = null;
export function toast(msg, { busy = false, error = false, ms = 5000 } = {}) {
  if (!box?.isConnected) {
    box = document.createElement('div'); box.id = 'toasts';
    box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite');
    document.body.appendChild(box);
  }
  const el = document.createElement('div');
  el.className = 'toast' + (busy ? ' busy' : '') + (error ? ' error' : '');
  el.innerHTML = busy ? '<span class="toast-spin"></span>' : `<i class="ms">${error ? 'error' : 'check_circle'}</i>`;
  el.append(Object.assign(document.createElement('span'), { textContent: msg }));
  box.appendChild(el);
  let timer = 0;
  const close = () => { clearTimeout(timer); el.classList.add('out'); setTimeout(() => el.remove(), 250); };
  if (!busy) timer = setTimeout(close, error ? ms * 2 : ms);
  el.addEventListener('click', close);
  return { el, close };
}

// A slow task with a busy note while it runs and another when it is done (none
// if it returns false: it said why itself, or was cancelled).
export async function withProgress(busyMsg, task, doneMsg) {
  const note = toast(busyMsg, { busy: true });
  try {
    const r = await task();
    note.close();
    if (r !== false && doneMsg) toast(doneMsg);
    return r;
  } catch (e) { note.close(); throw e; }
}
