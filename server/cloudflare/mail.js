// Transactional emails (revelaslides.com): someone shared a presentation with
// you, a team invitation, the end of Pro, credits about to expire, an account
// unused for almost two years, the confirmation of a deleted account, and support:
// a problem reported (its number), the answer to it, credits added by hand (admin.js).
//
// Sent with Cloudflare Email Service (the binding env.EMAIL: `[[send_email]]` in
// wrangler.toml) or, if not there, with Resend (secret RESEND_KEY). With neither,
// nothing is sent. From MAIL_FROM (default 'Revela <avisos@revelaslides.com>').
//
// Service emails (sharing, invitations, the end of Pro, inactivity, deletion, support) are
// always sent. Optional notices (credits that expire) carry a link to stop them:
// a token signed with HMAC (secret MAIL_SECRET), checked by
//   GET|POST /api/mail/unsubscribe?t=…   (POST: one-click, RFC 8058)
// Without MAIL_SECRET, optional notices aren't sent (there would be no way out).
//
// Support emails carry another signed link (HMAC over ticket number + address + expiry, 30 days)
// to answer inside the same ticket, or mark it solved, without signing in (admin.js):
//   GET|POST /api/support/reply?t=…
// Without MAIL_SECRET there is no link and the old advice (send another report) is given.

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

// ---- Answering a ticket: a token for (ticket, address, expiry), signed ------------------------
export const TICKET_LINK_DAYS = 30;
export async function ticketToken(env, id, email, exp) {
  if (!env.MAIL_SECRET) return null;
  const body = `${+id}.${Math.floor(exp).toString(36)}.${b64url(enc.encode(String(email || '').toLowerCase()))}`;
  return `${body}.${await hmac(env.MAIL_SECRET, 'ticket:' + body)}`;
}
export async function readTicketToken(env, t, now = Date.now()) { // → { id, email, exp } or null (bad, forged or expired)
  const parts = String(t || '').split('.'), [id, e36, em, sig] = parts;
  if (!env.MAIL_SECRET || parts.length !== 4 || !/^\d{1,10}$/.test(id) || !/^[0-9a-z]{1,12}$/.test(e36) || !em || !sig) return null;
  const want = await hmac(env.MAIL_SECRET, `ticket:${id}.${e36}.${em}`);
  if (want.length !== sig.length || [...want].reduce((d, ch, i) => d | (ch.charCodeAt(0) ^ sig.charCodeAt(i)), 0)) return null;
  const exp = parseInt(e36, 36); if (!(exp > now)) return null;
  try { return { id: +id, email: unb64(em), exp }; } catch { return null; }
}
// The page's address with a fresh token (null without MAIL_SECRET).
export async function ticketLink(env, id, email, site = env.SITE_URL || 'https://revelaslides.com') {
  const t = await ticketToken(env, id, email, Date.now() + TICKET_LINK_DAYS * 864e5);
  return t && `${site}/api/support/reply?t=${encodeURIComponent(t)}`;
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
    test: v => ({ subject: 'Tus avisos de Revela funcionan', title: 'Los correos de Revela te llegan',
      paras: ['Este es el correo de prueba que has pedido desde «Mi cuenta». Si lo estás leyendo, los avisos de Revela te llegarán bien.', 'Si lo has encontrado en «Spam» o «Promociones», márcalo como correo deseado para que los próximos lleguen a la bandeja de entrada.'], cta: ['Abrir Revela', v.url] }),
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
    ticket: v => ({ subject: `Hemos recibido tu consulta #${v.n}`, title: 'Hemos recibido tu consulta',
      paras: [`Gracias por escribirnos. Tu mensaje ha quedado registrado con el número #${v.n}.`, v.link ? `Te responderemos a esta dirección lo antes posible. Si necesitas añadir algo, escríbelo en la consulta con este enlace (vale ${v.days} días).` : 'Te responderemos a esta dirección lo antes posible. Si necesitas añadir algo, envía otro informe desde Revela indicando ese número.'],
      cta: v.link ? ['Añadir algo a la consulta', v.link] : ['Abrir Revela', v.url] }),
    ticketReply: v => ({ subject: `Respuesta a tu consulta #${v.n}`, title: `Respuesta a tu consulta #${v.n}`,
      paras: [...lines(v.text), !v.link ? `Si necesitas añadir algo, envía otro informe desde Revela indicando el número #${v.n}.`
        : v.closed ? `Damos la consulta por resuelta. Si no es así, respóndenos con este enlace en los próximos ${v.days} días y la volveremos a abrir.`
        : `Para contestarnos, o decirnos que ya está resuelto, usa este enlace (vale ${v.days} días).`], cta: v.link ? ['Responder', v.link] : ['Abrir Revela', v.url] }),
    ticketRemind: v => ({ subject: `¿Sigues necesitando ayuda con la consulta #${v.n}?`, title: `¿Seguimos con la consulta #${v.n}?`,
      paras: [`El ${v.date} te respondimos y estamos esperando tu respuesta.`, v.close ? `Si ya está resuelto, dínoslo con el enlace; si no nos escribes, la cerraremos el ${v.close}. Aun cerrada, podrás volver a abrirla con el enlace mientras valga (${v.days} días).` : `Si ya está resuelto, dínoslo con el enlace (vale ${v.days} días).`],
      cta: ['Responder', v.link] }),
    ticketAdmin: v => ({ subject: `${v.solved ? 'Resuelto' : 'Respuesta'} en el ticket #${v.n} (${v.email})`, title: `Ticket #${v.n}: ${v.solved ? 'la persona lo da por resuelto' : 'te toca a ti'}`,
      paras: [`${v.email} ha escrito en el ticket #${v.n}${v.solved ? ' y lo ha marcado como resuelto' : ''}:`, ...lines(v.text)], cta: ['Abrir el ticket', v.admin] }),
    creditsAdded: v => ({ subject: `Te hemos añadido ${v.n} créditos`, title: 'Tienes créditos nuevos',
      paras: [`Hemos añadido ${v.n} créditos de IA a tu cuenta de Revela. Caducan el ${v.date}.`, 'Gracias por tu paciencia.'], cta: ['Abrir Revela', v.url] }),
    page: { ok: 'Hecho: ya no recibirás avisos de créditos que caducan.', bad: 'Este enlace no es válido o ha caducado.', back: 'Volver a Revela' },
    reply: { title: n => `Consulta #${n}`, you: 'Tú', us: 'Revela', label: 'Tu respuesta', solved: 'Ya está resuelto, gracias', send: 'Enviar',
      closed: 'Esta consulta está resuelta. Si escribes, la volveremos a abrir.', open: 'Escribe aquí lo que quieras añadir o contestar.',
      bad: 'Este enlace no es válido o ha caducado. Si necesitas ayuda, envía un informe nuevo desde Revela (Vista ▸ Informar de un problema).',
      done: 'Gracias: lo hemos recibido y te responderemos por correo.', thanks: 'Gracias: damos la consulta por resuelta.',
      limit: 'Has enviado muchas respuestas hoy. Vuelve a intentarlo mañana.', empty: 'Escribe tu respuesta o marca que ya está resuelto.', long: 'El texto es demasiado largo.' },
  },
  en: {
    foot: 'Revela · a project by FM Lab', why: 'You are receiving this email because you have a Revela account or someone invited you to use it.',
    unsub: 'Stop these notices', open: 'Open Revela',
    share: v => ({ subject: `${v.by} shared “${v.name}” with you`, title: 'A presentation was shared with you',
      paras: [`${v.by} shared the presentation “${v.name}” with you on Revela (${v.role}).`, 'To open it, sign in with this email address.'], cta: ['Open the presentation', v.url] }),
    roles: { view: 'you can view it', comment: 'you can comment on it', edit: 'you can edit it' },
    test: v => ({ subject: 'Your Revela notices work', title: 'Revela’s emails reach you',
      paras: ['This is the test email you asked for in “My account”. If you are reading it, Revela’s notices will reach you.', 'If you found it in Spam or Promotions, mark it as wanted so the next ones reach your inbox.'], cta: ['Open Revela', v.url] }),
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
    ticket: v => ({ subject: `We received your request #${v.n}`, title: 'We received your request',
      paras: [`Thank you for writing to us. Your message has been registered with the number #${v.n}.`, v.link ? `We will answer to this address as soon as possible. If you need to add something, write it in the request with this link (valid for ${v.days} days).` : 'We will answer to this address as soon as possible. If you need to add something, send another report from Revela mentioning that number.'],
      cta: v.link ? ['Add to the request', v.link] : ['Open Revela', v.url] }),
    ticketReply: v => ({ subject: `Answer to your request #${v.n}`, title: `Answer to your request #${v.n}`,
      paras: [...lines(v.text), !v.link ? `If you need to add something, send another report from Revela mentioning the number #${v.n}.`
        : v.closed ? `We consider the request solved. If it isn't, answer with this link within ${v.days} days and we'll open it again.`
        : `To answer us, or tell us it's solved, use this link (valid for ${v.days} days).`], cta: v.link ? ['Answer', v.link] : ['Open Revela', v.url] }),
    ticketRemind: v => ({ subject: `Do you still need help with request #${v.n}?`, title: `Shall we go on with request #${v.n}?`,
      paras: [`We answered you on ${v.date} and are waiting for your reply.`, v.close ? `If it's solved, tell us with the link; if we don't hear from you, we'll close it on ${v.close}. Even closed, you can open it again with the link while it's valid (${v.days} days).` : `If it's solved, tell us with the link (valid for ${v.days} days).`],
      cta: ['Answer', v.link] }),
    creditsAdded: v => ({ subject: `We added ${v.n} credits to your account`, title: 'You have new credits',
      paras: [`We have added ${v.n} AI credits to your Revela account. They expire on ${v.date}.`, 'Thank you for your patience.'], cta: ['Open Revela', v.url] }),
    page: { ok: 'Done: you will no longer get notices about expiring credits.', bad: 'This link is not valid or has expired.', back: 'Back to Revela' },
    reply: { title: n => `Request #${n}`, you: 'You', us: 'Revela', label: 'Your answer', solved: 'It’s solved, thank you', send: 'Send',
      closed: 'This request is solved. If you write, we’ll open it again.', open: 'Write here what you want to add or answer.',
      bad: 'This link is not valid or has expired. If you need help, send a new report from Revela (View ▸ Report a problem).',
      done: 'Thank you: we got it and will answer you by email.', thanks: 'Thank you: we consider the request solved.',
      limit: 'You have sent many answers today. Please try again tomorrow.', empty: 'Write your answer or mark it as solved.', long: 'The text is too long.' },
  },
  ca: {
    foot: 'Revela · un projecte d’FM Lab', why: 'Reps aquest correu perquè tens un compte de Revela o algú t’ha convidat a fer-lo servir.',
    unsub: 'No vull més avisos d’aquest tipus', open: 'Obre Revela',
    share: v => ({ subject: `${v.by} ha compartit «${v.name}» amb tu`, title: 'T’han compartit una presentació',
      paras: [`${v.by} ha compartit amb tu la presentació «${v.name}» a Revela (${v.role}).`, 'Per obrir-la, inicia la sessió amb aquesta adreça de correu.'], cta: ['Obre la presentació', v.url] }),
    roles: { view: 'pots veure-la', comment: 'pots comentar-la', edit: 'pots editar-la' },
    test: v => ({ subject: 'Els avisos de Revela funcionen', title: 'Els correus de Revela t’arriben',
      paras: ['Aquest és el correu de prova que has demanat des de «El meu compte». Si l’estàs llegint, els avisos de Revela t’arribaran bé.', 'Si l’has trobat a «Correu brossa» o «Promocions», marca’l com a desitjat perquè els propers arribin a la safata d’entrada.'], cta: ['Obre Revela', v.url] }),
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
    ticket: v => ({ subject: `Hem rebut la teva consulta #${v.n}`, title: 'Hem rebut la teva consulta',
      paras: [`Gràcies per escriure’ns. El teu missatge ha quedat registrat amb el número #${v.n}.`, v.link ? `Et respondrem a aquesta adreça tan aviat com puguem. Si necessites afegir-hi alguna cosa, escriu-ho a la consulta amb aquest enllaç (val ${v.days} dies).` : 'Et respondrem a aquesta adreça tan aviat com puguem. Si necessites afegir-hi alguna cosa, envia un altre informe des de Revela indicant aquest número.'],
      cta: v.link ? ['Afegeix alguna cosa a la consulta', v.link] : ['Obre Revela', v.url] }),
    ticketReply: v => ({ subject: `Resposta a la teva consulta #${v.n}`, title: `Resposta a la teva consulta #${v.n}`,
      paras: [...lines(v.text), !v.link ? `Si necessites afegir-hi alguna cosa, envia un altre informe des de Revela indicant el número #${v.n}.`
        : v.closed ? `Donem la consulta per resolta. Si no és així, respon-nos amb aquest enllaç en els propers ${v.days} dies i la tornarem a obrir.`
        : `Per respondre’ns, o dir-nos que ja està resolt, fes servir aquest enllaç (val ${v.days} dies).`], cta: v.link ? ['Respon', v.link] : ['Obre Revela', v.url] }),
    ticketRemind: v => ({ subject: `Encara necessites ajuda amb la consulta #${v.n}?`, title: `Continuem amb la consulta #${v.n}?`,
      paras: [`El ${v.date} et vam respondre i estem esperant la teva resposta.`, v.close ? `Si ja està resolt, digues-nos-ho amb l’enllaç; si no ens escrius, la tancarem el ${v.close}. Encara que estigui tancada, la podràs tornar a obrir amb l’enllaç mentre sigui vàlid (${v.days} dies).` : `Si ja està resolt, digues-nos-ho amb l’enllaç (val ${v.days} dies).`],
      cta: ['Respon', v.link] }),
    creditsAdded: v => ({ subject: `T’hem afegit ${v.n} crèdits`, title: 'Tens crèdits nous',
      paras: [`Hem afegit ${v.n} crèdits d’IA al teu compte de Revela. Caduquen el ${v.date}.`, 'Gràcies per la teva paciència.'], cta: ['Obre Revela', v.url] }),
    page: { ok: 'Fet: ja no rebràs avisos de crèdits que caduquen.', bad: 'Aquest enllaç no és vàlid o ha caducat.', back: 'Torna a Revela' },
    reply: { title: n => `Consulta #${n}`, you: 'Tu', us: 'Revela', label: 'La teva resposta', solved: 'Ja està resolt, gràcies', send: 'Envia',
      closed: 'Aquesta consulta està resolta. Si escrius, la tornarem a obrir.', open: 'Escriu aquí el que vulguis afegir o respondre.',
      bad: 'Aquest enllaç no és vàlid o ha caducat. Si necessites ajuda, envia un informe nou des de Revela (Visualització ▸ Informa d’un problema).',
      done: 'Gràcies: ho hem rebut i et respondrem per correu.', thanks: 'Gràcies: donem la consulta per resolta.',
      limit: 'Has enviat moltes respostes avui. Torna-ho a provar demà.', empty: 'Escriu la teva resposta o marca que ja està resolt.', long: 'El text és massa llarg.' },
  },
};
// A text written by someone (an answer to a ticket): one paragraph per line.
const lines = text => String(text || '').split(/\n+/).map(x => x.trim()).filter(Boolean);
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
  const m = (L[kind] || T.es[kind])(v), cta = m.cta;               // (admin-only kinds: Spanish)
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

// The page to answer a ticket (state: 'form' | 'bad' | 'done' | 'thanks' | 'limit' | 'empty'; t: the ticket, without notes).
export function ticketPage(lang, { state, t, token, site }) {
  const L = T[mailLang(lang)], R = L.reply, shown = t && state !== 'bad', form = shown && token && state !== 'done' && state !== 'thanks';
  const msg = { bad: R.bad, done: R.done, thanks: R.thanks, limit: R.limit, empty: R.empty, long: R.long }[state];
  const thread = shown ? t.thread.map(m => `<div style="margin:0 0 14px;padding:12px 14px;border-radius:10px;${m.from === 'user' ? 'background:#fff;border:1px solid #e3ded4' : 'background:#eef3f9'}">
<p style="margin:0 0 6px;font-size:13px;color:#5d5f66">${escHtml(m.from === 'user' ? R.you : R.us)} · ${escHtml(fmtDate(m.at, lang))}</p>${lines(m.text).map(p => `<p style="margin:0 0 8px">${escHtml(p)}</p>`).join('')}${m.solved ? `<p style="margin:0;font-style:italic">✓ ${escHtml(R.solved)}</p>` : ''}</div>`).join('\n') : '';
  return `<!doctype html><html lang="${mailLang(lang)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Revela${shown ? ' · ' + escHtml(R.title(t.id)) : ''}</title></head>
<body style="margin:0;background:#faf8f4;color:#17181c;font:17px/1.6 system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif"><main style="max-width:600px;margin:6vh auto;padding:0 20px">
<p style="font:500 24px/1 Georgia,serif;margin:0 0 24px">Revela</p>${shown ? `<h1 style="font:normal 28px/1.2 Georgia,serif;margin:0 0 18px">${escHtml(R.title(t.id))}</h1>` : ''}
${msg ? `<p role="status" style="padding:10px 14px;border-radius:8px;background:#fff6e0">${escHtml(msg)}</p>` : ''}
${thread}
${form ? `<form method="post" action="/api/support/reply" style="margin-top:22px">
<input type="hidden" name="t" value="${escHtml(token)}">
<p style="margin:0 0 8px">${escHtml(t.status === 'closed' ? R.closed : R.open)}</p>
<label style="display:block;font-weight:600;margin:0 0 6px" for="text">${escHtml(R.label)}</label>
<textarea id="text" name="text" rows="7" maxlength="5000" style="box-sizing:border-box;width:100%;font:inherit;padding:10px;border:1px solid #c9c3b8;border-radius:8px"></textarea>
<label style="display:flex;gap:8px;align-items:center;margin:12px 0"><input type="checkbox" name="solved" value="1"> ${escHtml(R.solved)}</label>
<button type="submit" style="font:inherit;background:#2f5a8f;color:#fff;border:0;border-radius:8px;padding:10px 20px;cursor:pointer">${escHtml(R.send)}</button></form>` : ''}
<p style="margin-top:28px"><a href="${escHtml(site)}/app/" style="color:#2f5a8f">${escHtml(L.page.back)}</a></p>
<p style="margin-top:40px;font-size:13px;color:#5d5f66">${escHtml(L.foot)}</p></main></body></html>`;
}
// The page shown after following the link.
export function unsubPage(lang, ok, site) {
  const L = T[mailLang(lang)];
  return `<!doctype html><html lang="${mailLang(lang)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Revela</title></head>
<body style="margin:0;background:#faf8f4;color:#17181c;font:17px/1.6 system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif"><main style="max-width:520px;margin:12vh auto;padding:0 24px">
<p style="font:500 24px/1 Georgia,serif;margin:0 0 24px">Revela</p><p>${escHtml(ok ? L.page.ok : L.page.bad)}</p><p><a href="${escHtml(site)}/app/" style="color:#2f5a8f">${escHtml(L.page.back)}</a></p>
<p style="margin-top:40px;font-size:13px;color:#5d5f66">${escHtml(L.foot)}</p></main></body></html>`;
}
