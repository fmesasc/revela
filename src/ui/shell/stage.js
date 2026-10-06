// The test site (test.revelaslides.com, tools/build-site.mjs STAGE): a badge in the title bar says so, so no one
// mistakes it for the real one — its accounts and presentations are apart, and payments are Stripe's test ones.
import { t } from '../../i18n/index.js';

export function mountStage() {
  const stage = document.querySelector('meta[name="revela-stage"]')?.content; if (!stage) return;
  const b = document.createElement('a'); b.className = 'stage-badge'; b.href = 'https://revelaslides.com/app/';
  b.textContent = t('Pruebas'); b.title = t('Entorno de pruebas: las cuentas y presentaciones de aquí no son las reales, y los pagos son de prueba. La versión real está en revelaslides.com.');
  (document.querySelector('.titlebar') || document.body).prepend(b);
}
