// Teaching, a company or both (core/audience.js) in the interface: the page says which (html[data-audience],
// so the school-only buttons hide by CSS — features.css — and the palette still finds them), a light card
// that asks once at the top of the start gallery, and the same choice as a menu in the settings.

import { audience, audienceChoice, setAudience } from '../../core/audience.js';
import { t } from '../../i18n/index.js';

const apply = () => { document.documentElement.dataset.audience = audience(); };
export function initAudience() {
  apply();
  window.addEventListener('revela:audience', apply);
}

const OPTIONS = [['edu', 'school', 'Docencia', 'Clases, cursos y formación'], ['biz', 'business_center', 'Empresa', 'Reuniones, ventas, clientes y eventos'], ['both', 'all_inclusive', 'Ambas', 'Un poco de todo']];

// The card «¿Para qué vas a usar Revela?» (null once answered or skipped: it asks only once). onPick(v): after choosing.
export function audienceCard(onPick = () => {}) {
  if (audienceChoice()) return null;
  const el = document.createElement('div'); el.className = 'aud-card'; el.setAttribute('role', 'group');
  el.innerHTML = `<b class="aud-q">${t('¿Para qué vas a usar Revela?')}</b>
    <div class="aud-opts">${OPTIONS.map(([v, ic, n, d]) => `<button type="button" class="aud-opt" data-aud="${v}"><i class="ms">${ic}</i><b>${t(n)}</b><small>${t(d)}</small></button>`).join('')}</div>
    <small class="aud-note">${t('Ordena los ejemplos para ti. Puedes cambiarlo en la configuración de la presentación.')}</small>
    <button type="button" class="aud-skip" title="${t('Ahora no')}" aria-label="${t('Ahora no')}">✕</button>`;
  el.setAttribute('aria-label', t('¿Para qué vas a usar Revela?'));
  // (Skipped: as always — both —, and not asked again; the settings keep the choice.)
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-aud], .aud-skip'); if (!b) return;
    const v = b.dataset.aud || 'both'; setAudience(v); el.remove(); onPick(v);
  });
  return el;
}

// The same choice in the settings (a choice of this browser, kept at once).
export function audienceField() {
  const now = audience();
  const l = document.createElement('label'); l.className = 'fr-l';
  l.innerHTML = `${t('Uso principal')}<select class="aud-sel">${OPTIONS.map(([v, , n]) => `<option value="${v}"${v === now ? ' selected' : ''}>${t(n)}</option>`).join('')}</select>`;
  l.querySelector('select').addEventListener('change', e => setAudience(e.target.value));
  return l;
}
