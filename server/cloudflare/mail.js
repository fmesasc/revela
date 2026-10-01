// Transactional emails (revelaslides.com): someone shared a presentation with
// you, a team invitation, the end of Pro, credits about to expire, an account
// unused for almost two years, and the confirmation of a deleted account.
//
// Sent with Cloudflare Email Service (the binding env.EMAIL: `[[send_email]]` in
// wrangler.toml) or, if not there, with Resend (secret RESEND_KEY). With neither,
// nothing is sent. From MAIL_FROM (default 'Revela <avisos@revelaslides.com>').
//
// Service emails (sharing, invitations, the end of Pro, inactivity, deletion) are
// always sent. Optional notices (credits that expire) carry a link to stop them:
// a token signed with HMAC (secret MAIL_SECRET), checked by
//   GET|POST /api/mail/unsubscribe?t=…   (POST: one-click, RFC 8058)
// Without MAIL_SECRET, optional notices aren't sent (there would be no way out).

const enc = new TextEncoder();
const b64url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0)));
const escHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const OPTIONAL = ['credits'];                       // (kinds one can stop receiving)

// The person's language, among those with texts (the others: Spanish, or English for most).
export const mailLang = l => (['es', 'en', 'ca'].includes(l) ? l : ['gl', 'eu'].includes(l) ? 'es' : l && /^[a-z]{2}$/.test(l) ? 'en' : 'es');

// ---- Sending ----------------------------------------------------------------------------------
const fromOf = env => { const f = String(env.MAIL_FROM || 'Revela <avisos@revelaslides.com>'), m = f.match(/^\s*(.*?)\s*<([^>]+)>\s*$/); return m ? { name: m[1], email: m[2] } : { email: f.trim() }; };
// → true if handed over. Never throws (an email that fails must not break what caused it).
export async function sendMail(env, { to, subject, html, text, unsubscribe }) {
  if (!to) return false;
  const from = fromOf(env), headers = unsubscribe ? { 'List-Unsubscribe': `<${unsubscribe}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } : undefined;
  try {
    if (env.EMAIL?.send) { await env.EMAIL.send({ from, to, subject, html, text, ...(headers && { headers }) }); return true; }
    if (env.RESEND_KEY) {
      const r = await (env.FETCH || fetch)('https://api.resend.com/emails', { method: 'POST',
        headers: { Authorization: `Bearer ${env.RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: from.name ? `${from.name} <${from.email}>` : from.email, to, subject, html, text, ...(headers && { headers }) }) });
      return r.ok;
    }
  } catch (e) { console.log('mail failed', e?.code || e?.message); }
  return false;
}
export const mailConfigured = env => !!(env.EMAIL?.send || env.RESEND_KEY);

// ---- Unsubscribing: a token for (account, kind), signed ------------------------------------
const hmac = async (secret, s) => b64url(new Uint8Array(await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), enc.encode(s))));
export async function unsubToken(env, sub, kind) {
  if (!env.MAIL_SECRET) return null;
  const body = `${b64url(enc.encode(sub))}.${kind}`; return `${body}.${await hmac(env.MAIL_SECRET, 'unsub:' + body)}`;
}
export async function readUnsubToken(env, t) {                // → { sub, kind } or null
  const [a, kind, sig] = String(t || '').split('.');
  if (!env.MAIL_SECRET || !a || !OPTIONAL.includes(kind) || !sig) return null;
  const want = await hmac(env.MAIL_SECRET, `unsub:${a}.${kind}`);
  if (want.length !== sig.length || [...want].reduce((d, ch, i) => d | (ch.charCodeAt(0) ^ sig.charCodeAt(i)), 0)) return null;
  try { return { sub: unb64(a), kind }; } catch { return null; }
}

// ---- Texts -------------------------------------------------------------------------------------
// Each: (vars) → { subject, title, paras: [...], cta?: [label, url] }. Values from people are escaped when drawn.
const T = {
  es: {
    foot: 'Revela · un proyecto de FM Lab', why: 'Recibes este correo porque tienes una cuenta de Revela o alguien te ha invitado a usarla.',
    unsub: 'No quiero más avisos de este tipo', open: 'Abrir Revela',
    share: v => ({ subject: `${v.by} ha compartido «${v.name}» contigo`, title: 'Te han compartido una presentación',
      paras: [`${v.by} ha compartido contigo la presentación «${v.name}» en Revela (${v.role}).`, 'Para abrirla, inicia sesión con esta dirección de correo.'], cta: ['Abrir la presentación', v.url] }),
    roles: { view: 'puedes verla', comment: 'puedes comentarla', edit: 'puedes editarla' },
    invite: v => ({ subject: `Te invitan al equipo «${v.team}» en Revela`, title: 'Te han invitado a un equipo',
      paras: [`${v.by} te ha invitado al equipo «${v.team}» en Revela. Con él tendrás Pro, la marca del equipo y sus plantillas.`, 'Para aceptar, inicia sesión con esta dirección y abre «Mi cuenta ▸ Equipos y centros».'], cta: ['Abrir Revela', v.url] }),
    proEnding: v => ({ subject: `Tu plan Pro termina el ${v.date}`, title: 'Tu plan Pro termina pronto',
      paras: [`Tu suscripción a Revela Pro termina el ${v.date} y no se renovará. Después pasarás al plan gratuito.`, ...proAfter.es(v)], cta: ['Gestionar mi cuenta', v.url] }),
    proEnded: v => ({ subject: 'Tu plan Pro ha terminado', title: 'Tu plan Pro ha terminado',
      paras: ['Tu suscripción a Revela Pro ha terminado y ahora tienes el plan gratuito.', ...proAfter.es(v)], cta: ['Volver a Pro', v.url] }),
    credits: v => ({ subject: `${v.n} créditos caducan el ${v.date}`, title: 'Tienes créditos que caducan pronto',
      paras: [`${v.n} de tus créditos de IA caducan el ${v.date}. Úsalos antes en Revela: textos, imágenes, voz…`], cta: ['Abrir Revela', v.url] }),
    idle: v => ({ subject: `Tu cuenta de Revela se eliminará en ${v.days} días`, title: 'Echamos de menos tu cuenta',
      paras: [`Hace casi dos años que no usas tu cuenta de Revela (${v.email}). Para no guardar datos que ya no necesitas, la eliminaremos el ${v.date}, con sus presentaciones en la nube y sus créditos.`,
        'Si quieres conservarla, basta con iniciar sesión antes de esa fecha.'], cta: ['Iniciar sesión', v.url] }),
    deleted: v => ({ subject: 'Tu cuenta de Revela se ha eliminado', title: 'Tu cuenta se ha eliminado',
      paras: [v.idle ? 'Como llevaba dos años sin usarse, hemos eliminado tu cuenta de Revela, con sus presentaciones en la nube y sus créditos.' : 'Hemos eliminado tu cuenta de Revela, como pediste, con sus presentaciones en la nube y sus créditos.',
        'Si tenías una suscripción, está cancelada. Las facturas las conserva Stripe, como exige la ley. Puedes volver cuando quieras con una cuenta nueva.'], cta: ['Ir a Revela', v.url] }),
    page: { ok: 'Hecho: ya no recibirás avisos de créditos que caducan.', bad: 'Este enlace no es válido o ha caducado.', back: 'Volver a Revela' },
  },
  en: {
    foot: 'Revela · a project by FM Lab', why: 'You are receiving this email because you have a Revela account or someone invited you to use it.',
    unsub: 'Stop these notices', open: 'Open Revela',
    share: v => ({ subject: `${v.by} shared “${v.name}” with you`, title: 'A presentation was shared with you',
      paras: [`${v.by} shared the presentation “${v.name}” with you on Revela (${v.role}).`, 'To open it, sign in with this email address.'], cta: ['Open the presentation', v.url] }),
    roles: { view: 'you can view it', comment: 'you can comment on it', edit: 'you can edit it' },
    invite: v => ({ subject: `You're invited to the team “${v.team}” on Revela`, title: 'You were invited to a team',
      paras: [`${v.by} invited you to the team “${v.team}” on Revela. With it you get Pro, the team's brand and its templates.`, 'To accept, sign in with this address and open “My account ▸ Teams and schools”.'], cta: ['Open Revela', v.url] }),
    proEnding: v => ({ subject: `Your Pro plan ends on ${v.date}`, title: 'Your Pro plan ends soon',
      paras: [`Your Revela Pro subscription ends on ${v.date} and won't renew. After that you'll be on the free plan.`, ...proAfter.en(v)], cta: ['Manage my account', v.url] }),
    proEnded: v => ({ subject: 'Your Pro plan has ended', title: 'Your Pro plan has ended',
      paras: ['Your Revela Pro subscription has ended and you are now on the free plan.', ...proAfter.en(v)], cta: ['Back to Pro', v.url] }),
    credits: v => ({ subject: `${v.n} credits expire on ${v.date}`, title: 'Some credits expire soon',
      paras: [`${v.n} of your AI credits expire on ${v.date}. Use them before then in Revela: text, images, voice…`], cta: ['Open Revela', v.url] }),
    idle: v => ({ subject: `Your Revela account will be deleted in ${v.days} days`, title: 'We miss your account',
      paras: [`You haven't used your Revela account (${v.email}) for almost two years. So as not to keep data you no longer need, we'll delete it on ${v.date}, with its presentations in the cloud and its credits.`,
        'To keep it, just sign in before that date.'], cta: ['Sign in', v.url] }),
    deleted: v => ({ subject: 'Your Revela account has been deleted', title: 'Your account has been deleted',
      paras: [v.idle ? 'As it had not been used for two years, we have deleted your Revela account, with its presentations in the cloud and its credits.' : 'We have deleted your Revela account, as you asked, with its presentations in the cloud and its credits.',
        'If you had a subscription, it is cancelled. Stripe keeps the invoices, as the law requires. You can come back any time with a new account.'], cta: ['Go to Revela', v.url] }),
    page: { ok: 'Done: you will no longer get notices about expiring credits.', bad: 'This link is not valid or has expired.', back: 'Back to Revela' },
  },
  ca: {
    foot: 'Revela · un projecte d’FM Lab', why: 'Reps aquest correu perquè tens un compte de Revela o algú t’ha convidat a fer-lo servir.',
    unsub: 'No vull més avisos d’aquest tipus', open: 'Obre Revela',
    share: v => ({ subject: `${v.by} ha compartit «${v.name}» amb tu`, title: 'T’han compartit una presentació',
      paras: [`${v.by} ha compartit amb tu la presentació «${v.name}» a Revela (${v.role}).`, 'Per obrir-la, inicia la sessió amb aquesta adreça de correu.'], cta: ['Obre la presentació', v.url] }),
    roles: { view: 'pots veure-la', comment: 'pots comentar-la', edit: 'pots editar-la' },
    invite: v => ({ subject: `Et conviden a l’equip «${v.team}» a Revela`, title: 'T’han convidat a un equip',
      paras: [`${v.by} t’ha convidat a l’equip «${v.team}» a Revela. Amb ell tindràs Pro, la marca de l’equip i les seves plantilles.`, 'Per acceptar, inicia la sessió amb aquesta adreça i obre «El meu compte ▸ Equips i centres».'], cta: ['Obre Revela', v.url] }),
    proEnding: v => ({ subject: `El teu pla Pro acaba el ${v.date}`, title: 'El teu pla Pro acaba aviat',
      paras: [`La teva subscripció a Revela Pro acaba el ${v.date} i no es renovarà. Després passaràs al pla gratuït.`, ...proAfter.ca(v)], cta: ['Gestiona el meu compte', v.url] }),
    proEnded: v => ({ subject: 'El teu pla Pro ha acabat', title: 'El teu pla Pro ha acabat',
      paras: ['La teva subscripció a Revela Pro ha acabat i ara tens el pla gratuït.', ...proAfter.ca(v)], cta: ['Torna a Pro', v.url] }),
    credits: v => ({ subject: `${v.n} crèdits caduquen el ${v.date}`, title: 'Tens crèdits que caduquen aviat',
      paras: [`${v.n} dels teus crèdits d’IA caduquen el ${v.date}. Fes-los servir abans a Revela: textos, imatges, veu…`], cta: ['Obre Revela', v.url] }),
    idle: v => ({ subject: `El teu compte de Revela s’eliminarà d’aquí a ${v.days} dies`, title: 'Trobem a faltar el teu compte',
      paras: [`Fa gairebé dos anys que no fas servir el teu compte de Revela (${v.email}). Per no guardar dades que ja no necessites, l’eliminarem el ${v.date}, amb les seves presentacions al núvol i els seus crèdits.`,
        'Si el vols conservar, només cal que hi iniciïs la sessió abans d’aquesta data.'], cta: ['Inicia la sessió', v.url] }),
    deleted: v => ({ subject: 'El teu compte de Revela s’ha eliminat', title: 'El teu compte s’ha eliminat',
      paras: [v.idle ? 'Com que feia dos anys que no es feia servir, hem eliminat el teu compte de Revela, amb les seves presentacions al núvol i els seus crèdits.' : 'Hem eliminat el teu compte de Revela, tal com vas demanar, amb les seves presentacions al núvol i els seus crèdits.',
        'Si tenies una subscripció, està cancel·lada. Les factures les conserva Stripe, com exigeix la llei. Pots tornar quan vulguis amb un compte nou.'], cta: ['Vés a Revela', v.url] }),
    page: { ok: 'Fet: ja no rebràs avisos de crèdits que caduquen.', bad: 'Aquest enllaç no és vàlid o ha caducat.', back: 'Torna a Revela' },
  },
};
// What happens after Pro: nothing is deleted; the presentations beyond the free plan's, read-only; credits kept.
const proAfter = {
  es: v => [v.locked ? `No se borra nada. Con el plan gratuito puedes editar tus ${v.free} presentaciones en la nube editadas más recientemente; las otras ${v.locked} quedarán en solo lectura (se pueden abrir, presentar, exportar y borrar) hasta que vuelvas a Pro o borres alguna.` : 'No se borra nada y todas tus presentaciones en la nube seguirán siendo editables.',
    ...(v.credits > 0 ? [`Tus ${v.credits} créditos se conservan hasta su fecha de caducidad${v.next ? ` (los próximos caducan el ${v.next})` : ''}.`] : [])],
  en: v => [v.locked ? `Nothing is deleted. On the free plan you can edit your ${v.free} most recently edited presentations in the cloud; the other ${v.locked} will be read-only (they can be opened, presented, exported and deleted) until you go back to Pro or delete some.` : 'Nothing is deleted and all your presentations in the cloud stay editable.',
    ...(v.credits > 0 ? [`Your ${v.credits} credits are kept until they expire${v.next ? ` (the next ones on ${v.next})` : ''}.`] : [])],
  ca: v => [v.locked ? `No s’esborra res. Amb el pla gratuït pots editar les teves ${v.free} presentacions al núvol editades més recentment; les altres ${v.locked} quedaran en només lectura (es poden obrir, presentar, exportar i esborrar) fins que tornis a Pro o n’esborris alguna.` : 'No s’esborra res i totes les teves presentacions al núvol continuaran sent editables.',
    ...(v.credits > 0 ? [`Els teus ${v.credits} crèdits es conserven fins a la seva data de caducitat${v.next ? ` (els propers caduquen el ${v.next})` : ''}.`] : [])],
};
export const fmtDate = (ts, lang) => { try { return new Date(ts).toLocaleDateString(mailLang(lang), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); } catch { return new Date(ts).toISOString().slice(0, 10); } };

// The email of one kind: { subject, html, text } (vars: the values to fill in; unsub: the link to stop them).
export function render(kind, lang, vars, unsub) {
  const L = T[mailLang(lang)], v = { ...vars, ...(vars.role && { role: L.roles[vars.role] || vars.role }) };
  const m = L[kind](v), cta = m.cta;
  const P = 'margin:0 0 16px';
  const html = `<!doctype html><html lang="${mailLang(lang)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escHtml(m.subject)}</title></head>
<body style="margin:0;padding:0;background:#faf8f4;color:#17181c;font:16px/1.6 system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:32px 24px">
<p style="margin:0 0 28px;font:500 22px/1 Georgia,'Times New Roman',serif">Revela</p>
<h1 style="margin:0 0 18px;font:normal 28px/1.2 Georgia,'Times New Roman',serif">${escHtml(m.title)}</h1>
${m.paras.map(p => `<p style="${P}">${escHtml(p)}</p>`).join('\n')}
${cta ? `<p style="margin:24px 0"><a href="${escHtml(cta[1])}" style="display:inline-block;background:#2f5a8f;color:#ffffff;text-decoration:none;padding:11px 20px;border-radius:8px">${escHtml(cta[0])}</a></p>` : ''}
<hr style="border:0;border-top:1px solid #e3ded4;margin:32px 0 16px">
<p style="margin:0;font-size:13px;color:#5d5f66">${escHtml(L.foot)}<br>${escHtml(L.why)}${unsub ? `<br><a href="${escHtml(unsub)}" style="color:#5d5f66">${escHtml(L.unsub)}</a>` : ''}</p>
</div></body></html>`;
  const text = [m.title, '', ...m.paras.flatMap(p => [p, '']), ...(cta ? [`${cta[0]}: ${cta[1]}`, ''] : []), '—', L.foot, L.why, ...(unsub ? [`${L.unsub}: ${unsub}`] : [])].join('\n');
  return { subject: m.subject, html, text };
}

// Render and send one (optional kinds only with a way out; sub: the account, for that link).
export async function mail(env, { to, kind, lang, vars, sub, site = env.SITE_URL || 'https://revelaslides.com' }) {
  let unsub = null;
  if (OPTIONAL.includes(kind)) { const t = sub && await unsubToken(env, sub, kind); if (!t) return false; unsub = `${site}/api/mail/unsubscribe?t=${encodeURIComponent(t)}`; }
  return sendMail(env, { to, ...render(kind, lang, { url: site + '/app/', ...vars }, unsub), ...(unsub && { unsubscribe: unsub }) });
}

// The page shown after following the link.
export function unsubPage(lang, ok, site) {
  const L = T[mailLang(lang)];
  return `<!doctype html><html lang="${mailLang(lang)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Revela</title></head>
<body style="margin:0;background:#faf8f4;color:#17181c;font:17px/1.6 system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif"><main style="max-width:520px;margin:12vh auto;padding:0 24px">
<p style="font:500 24px/1 Georgia,serif;margin:0 0 24px">Revela</p><p>${escHtml(ok ? L.page.ok : L.page.bad)}</p><p><a href="${escHtml(site)}/app/" style="color:#2f5a8f">${escHtml(L.page.back)}</a></p>
<p style="margin-top:40px;font-size:13px;color:#5d5f66">${escHtml(L.foot)}</p></main></body></html>`;
}
