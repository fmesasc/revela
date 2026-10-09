// «Abriendo…» while a presentation opens — from Revela's cloud, Drive, OneDrive, Dropbox, a file (a PowerPoint takes a
// while to read, and that's no request: the top bar, ui/shell/busy.js, doesn't show it), an example or a shared link:
// a screen over the editor with its name, so nothing seems stuck or half there. Only after a moment (DELAY): what's
// quick shows nothing. Opens inside opens (OneDrive hands over a PowerPoint) share one screen.
import { esc } from '../../core/text.js';
import { t } from '../../i18n/index.js';

const DELAY = 250;
let el = null, count = 0, timer = 0;

// → what removes it. delay 0: at once (the page itself opening a shared link).
export function openingScreen(name = '', { delay = DELAY } = {}) {
  count++;
  const label = name ? t('Abriendo «{n}»…').replace('{n}', esc(String(name).slice(0, 80))) : esc(t('Abriendo la presentación…'));
  const show = () => {
    timer = 0;
    if (!el) { el = document.createElement('div'); el.id = 'opening-doc'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); document.body.appendChild(el); }
    el.classList.remove('done'); el.classList.toggle('over', delay > 0);       // (over the editor: it shows through, faintly)
    el.innerHTML = `<div class="od-box"><span class="od-spin" aria-hidden="true"></span><span>${label}</span><small class="od-step"></small></div>`;
    if (step) el.querySelector('.od-step').textContent = step;
  };
  let step = '';
  if (el || !delay) { clearTimeout(timer); show(); } else if (!timer) timer = setTimeout(show, delay);
  let gone = false;
  const done = () => {
    if (gone) return; gone = true;
    if (--count > 0) return;
    clearTimeout(timer); timer = 0;
    const e = el; el = null; if (!e) return;
    e.classList.add('done'); setTimeout(() => e.remove(), 250);
  };
  // How far it is, under the name («Diapositiva 12 de 85», «Leyendo un vídeo de 96 MB…»): a big file takes a while.
  done.say = text => { step = String(text || ''); const s = !gone && el?.querySelector('.od-step'); if (s) s.textContent = step; };
  return done;
}
// The screen while `work` (a promise, or a function giving one — it gets say(text), to tell how far it is) runs.
// → what it gives.
export async function whileOpening(work, name = '') {
  const done = openingScreen(name);
  try { return await (typeof work === 'function' ? work(done.say) : work); } finally { done(); }
}
