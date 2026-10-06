// Revela's ambassadors (api.js routes /api/ambassadors/…, kept in the Crm object): applying from My account, the
// public directory, the badge (an SVG with its check) and the admin's approval email.

import { escHtml } from './util.js';
import { fmtDay, crmMail } from './crm-mail.js';
import { str, text, LANGS, crmCall, site } from './crm.js';

// ---- Ambassadors (teachers who show Revela to their colleagues) -------------------------------------------
export const AMB_SUBJECTS = ['math', 'lang', 'science', 'social', 'arts', 'music', 'pe', 'tech', 'languages', 'values', 'vocational', 'business', 'other'];
export function cleanAmbassador(b) {
  const f = { name: str(b.name, 80), center: str(b.center, 120), city: str(b.city, 80), role: str(b.role, 80), subject: AMB_SUBJECTS.includes(b.subject) ? b.subject : 'other',
    plan: text(b.plan, 1200), listed: b.listed === true, lang: LANGS.includes(b.lang) ? b.lang : 'es' };
  if (f.name.length < 2) return { error: 'name' }; if (f.center.length < 2) return { error: 'center' }; if (f.plan.length < 20) return { error: 'plan' };
  return { form: f };
}
// /api/ambassadors…: me — the session with its account's email (or null).
export async function handleAmbassadors(path, req, body, env, me, json) {
  if (!env.CRM) return json({ error: 'not configured' }, 503);
  const sub = path.replace(/^\/ambassadors/, '') || '/';
  if (req.method === 'GET' && sub === '/') return json(await crmCall(env, 'amb-public', {}), 200, { 'Cache-Control': 'public, max-age=300' });
  let m = sub.match(/^\/verify\/([a-z0-9]{8,16})$/);
  if (req.method === 'GET' && m) return json(await crmCall(env, 'amb-code', { code: m[1] }));
  m = sub.match(/^\/badge\/([a-z0-9]{8,16})\.svg$/);
  if (req.method === 'GET' && m) {
    const { amb } = await crmCall(env, 'amb-code', { code: m[1] }); if (!amb) return new Response('Not found', { status: 404 });
    return new Response(badgeSVG(amb), { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'" } });
  }
  if (!me) return json({ error: 'no session' }, 401);
  if (req.method === 'GET' && sub === '/me') { const { amb } = await crmCall(env, 'amb-me', { sub: me.sub }); return json({ amb: amb && { status: amb.status, at: amb.at, since: amb.since || null, code: amb.status === 'approved' ? amb.code : null, name: amb.name, center: amb.center } }); }
  if (req.method === 'POST' && sub === '/apply') {
    const c = cleanAmbassador(body); if (c.error) return json({ error: c.error }, 400);
    const r = await crmCall(env, 'amb-apply', { sub: me.sub, email: me.email, form: c.form });
    return json({ status: r.amb.status });
  }
  return json({ error: 'not found' }, 404);
}
// The badge: an image with the name, to put in a CV, an email signature or a blog — and its link checks it is real.
export function badgeSVG(a) {
  const year = new Date(a.since || Date.now()).getFullYear(), name = escHtml(String(a.name).slice(0, 34)), center = escHtml(String(a.center || '').slice(0, 44));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="200" viewBox="0 0 600 200" role="img" aria-label="Embajador/a de Revela: ${name}">
<rect width="600" height="200" rx="22" fill="#17181c"/><rect x="10" y="10" width="580" height="180" rx="16" fill="none" stroke="#e0b65a" stroke-width="2"/>
<circle cx="100" cy="100" r="58" fill="#2f5a8f"/><path d="M78 72h30a18 18 0 0 1 4 35l14 21h-16l-12-19H92v19H78z M92 84v14h15a7 7 0 0 0 0-14z" fill="#fff"/>
<text x="180" y="70" font-family="Georgia,serif" font-size="20" fill="#e0b65a" letter-spacing="3">EMBAJADOR/A · ${year}</text>
<text x="180" y="112" font-family="Georgia,serif" font-size="34" fill="#ffffff">${name}</text>
<text x="180" y="146" font-family="system-ui,Arial,sans-serif" font-size="17" fill="#c9cbd1">${center}</text>
<text x="180" y="174" font-family="system-ui,Arial,sans-serif" font-size="14" fill="#8a8d96">Revela · revelaslides.com/ambassadors</text></svg>`;
}
// The email when approved (to the ambassador): what changes, the badge and its check.
export function ambassadorMail(env, amb, proUntil, identity) {
  const site0 = site(env), verify = `${site0}/ambassadors?v=${amb.code}`, badge = `${site0}/api/ambassadors/badge/${amb.code}.svg`;
  const body = [`¡Hola, ${amb.name}!`, 'Ya eres embajador/a de Revela. Gracias por enseñarlo a tus compañeros.',
    proUntil ? `Tienes Pro gratis hasta el ${fmtDay(proUntil, 'es')}.` : '',
    `Tu insignia (para tu currículum, tu firma o tu blog): ${badge}`, `Y el enlace que demuestra que es real: ${verify}`,
    'En Revela, «Mi cuenta» te muestra la insignia y tu enlace para recomendarlo a tu centro.'].filter(Boolean).join('\n\n');
  return crmMail({ subject: 'Ya eres embajador/a de Revela', body, lang: 'es', identity });
}
