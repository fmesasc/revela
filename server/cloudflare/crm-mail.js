// «Captación»'s emails (crm.js): the texts in each language, a webinar's emails, the body every message is built
// with, the unsubscribe page and the acknowledgement of a request; and the signed links they carry (crmToken).

import { enc, b64url, unb64, escHtml, hmac } from './util.js';
import { text, dayKey, site } from './crm.js';

// ---- Signed links in the emails (MAIL_SECRET) -----------------------------------------------------
export const same = (a, b) => a.length === b.length && ![...a].reduce((d, ch, i) => d | (ch.charCodeAt(0) ^ b.charCodeAt(i)), 0);
export async function crmToken(env, kind, payload) {
  if (!env.MAIL_SECRET) return null;
  const body = b64url(enc.encode(JSON.stringify(payload)));
  return `${body}.${await hmac(env.MAIL_SECRET, `crm:${kind}:${body}`)}`;
}
export async function readCrmToken(env, kind, t) {
  const [body, sig] = String(t || '').split('.');
  if (!env.MAIL_SECRET || !body || !sig || !same(await hmac(env.MAIL_SECRET, `crm:${kind}:${body}`), sig)) return null;
  try { return JSON.parse(unb64(body)); } catch { return null; }
}
// ---- The emails ------------------------------------------------------------------------------------
export const L10N = {
  es: { why: d => `Recibes este correo porque nos diste permiso el ${d}.`, unsub: 'No quiero recibir más correos', ackSubject: 'Hemos recibido tu solicitud', ackTitle: 'Gracias, hemos recibido tu solicitud',
    ack: (n, d) => [`Hola${n ? ', ' + n : ''}:`, 'Te escribiremos en uno o dos días laborables para responderte.', d ? 'Nos diste permiso para enviarte información sobre Revela: puedes retirarlo cuando quieras con el enlace de abajo.' : 'Solo usaremos tus datos para responder a esta solicitud.'],
    page: { ok: 'Hecho: no volverás a recibir correos comerciales de Revela.', bad: 'El enlace no es válido.', back: 'Ir a revelaslides.com' } },
  en: { why: d => `You receive this email because you gave us permission on ${d}.`, unsub: "I don't want more emails", ackSubject: 'We have received your request', ackTitle: 'Thank you, we have received your request',
    ack: (n, d) => [`Hello${n ? ' ' + n : ''},`, 'We will write back within one or two working days.', d ? 'You gave us permission to send you information about Revela: you can withdraw it at any time with the link below.' : 'We will only use your details to answer this request.'],
    page: { ok: 'Done: you will not receive any more commercial emails from Revela.', bad: 'The link is not valid.', back: 'Go to revelaslides.com' } },
  fr: { why: d => `Vous recevez cet e-mail car vous nous avez donné votre accord le ${d}.`, unsub: 'Je ne veux plus recevoir d’e-mails', ackSubject: 'Nous avons reçu votre demande', ackTitle: 'Merci, nous avons reçu votre demande',
    ack: (n, d) => [`Bonjour${n ? ' ' + n : ''},`, 'Nous vous répondrons sous un ou deux jours ouvrés.', d ? 'Vous avez accepté de recevoir des informations sur Revela : vous pouvez retirer votre accord à tout moment avec le lien ci-dessous.' : 'Nous n’utiliserons vos données que pour répondre à cette demande.'],
    page: { ok: 'C’est fait : vous ne recevrez plus d’e-mails commerciaux de Revela.', bad: 'Le lien n’est pas valide.', back: 'Aller sur revelaslides.com' } },
  de: { why: d => `Du erhältst diese E-Mail, weil du uns am ${d} deine Zustimmung gegeben hast.`, unsub: 'Ich möchte keine E-Mails mehr', ackSubject: 'Wir haben deine Anfrage erhalten', ackTitle: 'Danke, wir haben deine Anfrage erhalten',
    ack: (n, d) => [`Hallo${n ? ' ' + n : ''},`, 'Wir antworten dir innerhalb von ein bis zwei Werktagen.', d ? 'Du hast zugestimmt, Informationen über Revela zu erhalten: Du kannst das jederzeit über den Link unten widerrufen.' : 'Wir verwenden deine Daten nur, um diese Anfrage zu beantworten.'],
    page: { ok: 'Erledigt: Du erhältst keine Werbe-E-Mails von Revela mehr.', bad: 'Der Link ist ungültig.', back: 'Zu revelaslides.com' } },
  it: { why: d => `Ricevi questa email perché ci hai dato il consenso il ${d}.`, unsub: 'Non voglio ricevere altre email', ackSubject: 'Abbiamo ricevuto la tua richiesta', ackTitle: 'Grazie, abbiamo ricevuto la tua richiesta',
    ack: (n, d) => [`Ciao${n ? ' ' + n : ''},`, 'Ti risponderemo entro uno o due giorni lavorativi.', d ? 'Hai acconsentito a ricevere informazioni su Revela: puoi revocare il consenso in qualsiasi momento con il link qui sotto.' : 'Useremo i tuoi dati solo per rispondere a questa richiesta.'],
    page: { ok: 'Fatto: non riceverai più email commerciali da Revela.', bad: 'Il link non è valido.', back: 'Vai a revelaslides.com' } },
  pt: { why: d => `Recebe este e-mail porque nos deu autorização em ${d}.`, unsub: 'Não quero receber mais e-mails', ackSubject: 'Recebemos o seu pedido', ackTitle: 'Obrigado, recebemos o seu pedido',
    ack: (n, d) => [`Olá${n ? ', ' + n : ''}:`, 'Responderemos dentro de um ou dois dias úteis.', d ? 'Autorizou-nos a enviar-lhe informação sobre o Revela: pode retirar a autorização quando quiser com a ligação abaixo.' : 'Só usaremos os seus dados para responder a este pedido.'],
    page: { ok: 'Feito: não voltará a receber e-mails comerciais do Revela.', bad: 'A ligação não é válida.', back: 'Ir para revelaslides.com' } },
  ca: { why: d => `Reps aquest correu perquè ens vas donar permís el ${d}.`, unsub: 'No vull rebre més correus', ackSubject: 'Hem rebut la teva sol·licitud', ackTitle: 'Gràcies, hem rebut la teva sol·licitud',
    ack: (n, d) => [`Hola${n ? ', ' + n : ''}:`, 'T’escriurem en un o dos dies laborables per respondre’t.', d ? 'Ens vas donar permís per enviar-te informació sobre Revela: pots retirar-lo quan vulguis amb l’enllaç de sota.' : 'Només farem servir les teves dades per respondre aquesta sol·licitud.'],
    page: { ok: 'Fet: no tornaràs a rebre correus comercials de Revela.', bad: 'L’enllaç no és vàlid.', back: 'Anar a revelaslides.com' } },
};
// Webinars' emails: confirmation (with the link) and the reminder the day before. when: the date and time, already written.
export const EVT = {
  es: { ok: t => `Te has apuntado: ${t}`, rem: t => `Mañana: ${t}`, body: (t, w, l, d) => [`Te esperamos en «${t}».`, `Cuándo: ${w}.`, l ? `Para entrar: ${l}` : 'Te enviaremos el enlace para entrar antes de empezar.', d, 'Si al final no puedes venir, no hace falta que nos avises.'] },
  en: { ok: t => `You're signed up: ${t}`, rem: t => `Tomorrow: ${t}`, body: (t, w, l, d) => [`See you at “${t}”.`, `When: ${w}.`, l ? `To join: ${l}` : 'We will send you the link to join before it starts.', d, "If you can't make it in the end, there's no need to tell us."] },
  fr: { ok: t => `Vous êtes inscrit : ${t}`, rem: t => `Demain : ${t}`, body: (t, w, l, d) => [`Nous vous attendons à « ${t} ».`, `Quand : ${w}.`, l ? `Pour participer : ${l}` : 'Nous vous enverrons le lien avant le début.', d, 'Si finalement vous ne pouvez pas venir, inutile de nous prévenir.'] },
  de: { ok: t => `Du bist angemeldet: ${t}`, rem: t => `Morgen: ${t}`, body: (t, w, l, d) => [`Wir sehen uns bei „${t}“.`, `Wann: ${w}.`, l ? `Teilnehmen: ${l}` : 'Den Link zum Teilnehmen schicken wir dir vor Beginn.', d, 'Falls du doch nicht kannst, musst du uns nicht Bescheid geben.'] },
  it: { ok: t => `Sei iscritto: ${t}`, rem: t => `Domani: ${t}`, body: (t, w, l, d) => [`Ti aspettiamo a «${t}».`, `Quando: ${w}.`, l ? `Per partecipare: ${l}` : 'Ti invieremo il link prima dell’inizio.', d, 'Se alla fine non puoi venire, non serve avvisarci.'] },
  pt: { ok: t => `Está inscrito: ${t}`, rem: t => `Amanhã: ${t}`, body: (t, w, l, d) => [`Esperamos por si em «${t}».`, `Quando: ${w}.`, l ? `Para entrar: ${l}` : 'Enviaremos a ligação para entrar antes de começar.', d, 'Se afinal não puder vir, não precisa de nos avisar.'] },
  ca: { ok: t => `T'hi has apuntat: ${t}`, rem: t => `Demà: ${t}`, body: (t, w, l, d) => [`T'esperem a «${t}».`, `Quan: ${w}.`, l ? `Per entrar-hi: ${l}` : "T'enviarem l'enllaç per entrar-hi abans de començar.", d, 'Si al final no pots venir, no cal que ens avisis.'] },
};
export const whenOf = (ts, lang) => { try { return new Date(ts).toLocaleString(lang || 'es', { timeZone: 'Europe/Madrid', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }); } catch { return new Date(ts).toISOString(); } };
export function eventMail(kind, e, lang, identity) {
  const T = EVT[lang] || (['gl', 'eu'].includes(lang) ? EVT.es : EVT.en), l = EVT[lang] ? lang : ['gl', 'eu'].includes(lang) ? 'es' : 'en';
  return crmMail({ subject: (kind === 'reminder' ? T.rem : T.ok)(e.title), body: T.body(e.title, whenOf(e.starts, l), e.link, e.description).filter(Boolean).join('\n\n'), lang: l, identity });
}
export const L = lang => L10N[lang] || (['gl', 'eu'].includes(lang) || !lang ? L10N.es : L10N.en);
export const fmtDay = (ts, lang) => { try { return new Date(ts).toLocaleDateString(lang || 'es', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); } catch { return dayKey(ts); } };
// Text with blank lines between paragraphs → paragraphs; addresses (https://…) → links (tracked: track(url) → its link).
export function mailBody(body, track = u => u) {
  const paras = String(body).split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const html = paras.map(p => '<p style="margin:0 0 16px">' + escHtml(p).replace(/(https:\/\/[^\s<]+[^\s<.,;:!?)»"'])/g, (m) => `<a href="${escHtml(track(m.replace(/&amp;/g, '&')))}" style="color:#2f5a8f">${m}</a>`).replace(/\n/g, '<br>') + '</p>').join('\n');
  return { html, text: paras.join('\n\n') };
}
export function crmMail({ subject, body, lang, identity, unsub, consentAt, track }) {
  const T = L(lang), b = mailBody(body, track);
  const foot = [identity, consentAt ? T.why(fmtDay(consentAt, lang)) : ''].filter(Boolean);
  const html = `<!doctype html><html lang="${escHtml(lang || 'es')}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#faf8f4;color:#17181c;font:16px/1.6 system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:32px 24px">
<p style="margin:0 0 28px;font:500 22px/1 Georgia,'Times New Roman',serif">Revela</p>
${b.html}
<hr style="border:0;border-top:1px solid #e3ded4;margin:32px 0 16px">
<p style="margin:0;font-size:13px;color:#5d5f66">${foot.map(escHtml).join('<br>')}${unsub ? `<br><a href="${escHtml(unsub)}" style="color:#5d5f66">${escHtml(T.unsub)}</a>` : ''}</p>
</div></body></html>`;
  const textOut = [b.text, '', '—', ...foot, ...(unsub ? [`${T.unsub}: ${unsub}`] : [])].join('\n');
  return { subject, html, text: textOut };
}
export function unsubPageCrm(lang, ok, site) {
  const T = L(lang);
  return `<!doctype html><html lang="${escHtml(lang || 'es')}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Revela</title></head>
<body style="margin:0;background:#faf8f4;color:#17181c;font:17px/1.6 system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif"><main style="max-width:520px;margin:12vh auto;padding:0 24px">
<p style="font:500 24px/1 Georgia,serif;margin:0 0 24px">Revela</p><p>${escHtml(ok ? T.page.ok : T.page.bad)}</p><p><a href="${escHtml(site)}/" style="color:#2f5a8f">${escHtml(T.page.back)}</a></p></main></body></html>`;
}
export const ackMail = (lang, name, marketing, identity) => { const T = L(lang); return crmMail({ subject: T.ackSubject, body: [T.ackTitle, ...T.ack(name, marketing)].join('\n\n'), lang, identity }); };
