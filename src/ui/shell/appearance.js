// Editor appearance: light, dark, automatic (follows the system) or custom
// (the user picks the accent and the background tone; the rest of the
// palette is derived). Slides keep their own colours. Saved in this browser;
// a tiny script in index.html applies it before the first paint (no flash).

import { t } from '../../i18n/index.js';

const KEY = 'revela.appearance';
const VARS = ['--bg', '--canvas-bg', '--panel', '--ribbon', '--line', '--line2', '--txt', '--txt2', '--accent', '--accent-bg', '--go', '--go-bg', '--danger'];
export const ACCENTS = ['#3f6497', '#2b7a78', '#7a3f97', '#c0392b', '#d35400', '#2e7d32', '#455a64', '#b8860b'];

const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const hex = a => '#' + a.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, w) => { const A = rgb(a), B = rgb(b); return hex(A.map((v, i) => v * (1 - w) + B[i] * w)); };
const lum = h => { const [r, g, b] = rgb(h).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };

// Full palette from a background tone and an accent.
export function derive(base, accent) {
  const dark = lum(base) < 0.2;
  const k = dark ? '#000000' : '#000000', w = '#ffffff';
  return dark ? {
    '--panel': base, '--ribbon': mix(base, k, .12), '--bg': mix(base, k, .25), '--canvas-bg': mix(base, k, .55),
    '--line': mix(base, w, .10), '--line2': mix(base, w, .18), '--txt': '#e8eaed', '--txt2': '#a0a7b1',
    '--accent': lum(accent) < .12 ? mix(accent, w, .35) : accent, '--accent-bg': mix(accent, base, .8),
    '--go': '#6fd18c', '--go-bg': mix('#2b7a3b', base, .7), '--danger': '#f07167', 'color-scheme': 'dark',
  } : {
    '--panel': base, '--ribbon': mix(base, k, .03), '--bg': mix(base, k, .06), '--canvas-bg': mix(base, k, .22),
    '--line': mix(base, k, .10), '--line2': mix(base, k, .17), '--txt': '#2f333a', '--txt2': '#6f7680',
    '--accent': accent, '--accent-bg': mix(accent, base, .88), '--go': '#2b7a3b', '--go-bg': '#e6f4ea', '--danger': '#c0392b', 'color-scheme': 'light',
  };
}

export function appearance() { try { return JSON.parse(localStorage.getItem(KEY)) || { mode: 'light' }; } catch { return { mode: 'light' }; } }
export function applyAppearance(a = appearance()) {
  const root = document.documentElement;
  root.dataset.ui = a.mode;
  for (const v of [...VARS, 'color-scheme']) root.style.removeProperty(v);
  if (a.mode === 'custom' && a.vars) for (const [k, v] of Object.entries(a.vars)) root.style.setProperty(k, v);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', getComputedStyle(root).getPropertyValue('--panel').trim() || '#3f6497');
}
export function setAppearance(a) {
  if (a.mode === 'custom') a.vars = derive(a.base || '#ffffff', a.accent || ACCENTS[0]);
  try { localStorage.setItem(KEY, JSON.stringify(a)); } catch {}
  applyAppearance(a);
}

export function openAppearance() {
  document.getElementById('ap-modal')?.remove();
  const cur = appearance();
  const back = document.createElement('div'); back.id = 'ap-modal'; back.className = 'modal-backdrop';
  const card = (m, icon, l) => `<button type="button" class="ap-card${cur.mode === m ? ' on' : ''}" data-m="${m}"><i class="ms">${icon}</i><span>${t(l)}</span></button>`;
  back.innerHTML = `<div class="modal" style="text-align:start;width:min(480px,94vw);max-width:94vw">
    <button class="modal-close">✕</button><h3>${t('Apariencia del editor')}</h3>
    <div class="ap-cards">${card('light', 'light_mode', 'Claro')}${card('dark', 'dark_mode', 'Oscuro')}${card('auto', 'brightness_auto', 'Automático')}${card('custom', 'palette', 'Personalizado')}</div>
    <div class="ap-custom"${cur.mode === 'custom' ? '' : ' hidden'}>
      <label class="fr-l">${t('Color de acento')}<span class="ap-sw">${ACCENTS.map(c => `<button type="button" data-a="${c}" style="background:${c}" title="${c}"></button>`).join('')}<input type="color" class="ap-acc" value="${cur.accent || ACCENTS[0]}"></span></label>
      <label class="fr-l">${t('Fondo de la interfaz')}<span class="ap-sw">${['#ffffff', '#f4f1ea', '#eef3f8', '#1f2329', '#1b2330', '#241f2b'].map(c => `<button type="button" data-b="${c}" style="background:${c}" title="${c}"></button>`).join('')}<input type="color" class="ap-base" value="${cur.base || '#ffffff'}"></span></label>
    </div>
    <p class="host-help">${t('Solo cambia el aspecto del editor; las diapositivas conservan sus colores.')}</p></div>`;
  document.body.appendChild(back);
  const q = s => back.querySelector(s), close = () => back.remove();
  const save = mode => {
    back.querySelectorAll('.ap-card').forEach(c => c.classList.toggle('on', c.dataset.m === mode));
    q('.ap-custom').hidden = mode !== 'custom';
    setAppearance({ mode, accent: q('.ap-acc').value, base: q('.ap-base').value });
  };
  back.querySelectorAll('.ap-card').forEach(c => c.addEventListener('click', () => save(c.dataset.m)));
  back.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => { q('.ap-acc').value = b.dataset.a; save('custom'); }));
  back.querySelectorAll('[data-b]').forEach(b => b.addEventListener('click', () => { q('.ap-base').value = b.dataset.b; save('custom'); }));
  q('.ap-acc').addEventListener('input', () => save('custom')); q('.ap-base').addEventListener('input', () => save('custom'));
  q('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
}
