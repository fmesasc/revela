// Captación's emails written by hand (crm.js): one email to one contact, from the admin, with its answers kept.
//
// - The admin picks a template, edits the draft and sends it — never by itself. Only to a contact with a recorded
//   consent (Spain's LSSI, art. 21: commercial email only to whom asked for it or agreed to it), and only with the
//   sender's identity set (Captación ▸ Ajustes); each one carries the one-click way out, like the sequences.
// - «Enviar una prueba» sends the same email to any address (the admin's own, to try it): no consent needed, nothing
//   changes in the contact but its history, and an answer to it is kept as a test.
// - Answers: the email's Reply-To is an address of this domain that names the contact, signed so it can't be made up
//   (respuestas+c<id>-<sig>@revelaslides.com; «t» after the id for a test). Resend receives the domain's email (its MX)
//   and tells POST /api/crm/inbound (event email.received, signed as Svix does: RESEND_WEBHOOK_SECRET); the answer
//   goes into the contact's history («ha respondido»: its status moves on, its sequence stops, a follow-up for today)
//   and on to the admin's mailbox, to answer from there. Without RESEND_WEBHOOK_SECRET answers go straight to the
//   admin's address (Ajustes ▸ Responder a), as before.

import { enc, escHtml } from './util.js';
import { crmToken } from './crm-mail.js';
import { crmMail } from './crm-mail.js';
import { crmCall, fill, site, str, text } from './crm.js';

const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const key = secret => crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
// (Lowercase hex: mail servers may change the case of an address.)
const sig = async (env, s) => hex(await crypto.subtle.sign('HMAC', await key(env.MAIL_SECRET), enc.encode('crm:reply:' + s))).slice(0, 16);
export const replyDomain = env => {
  const f = String(env.MAIL_FROM || 'Revela <avisos@revelaslides.com>'), m = f.match(/@([a-z0-9.-]+)/i);
  return (m ? m[1] : 'revelaslides.com').toLowerCase();
};
export const answersOn = env => !!(env.RESEND_WEBHOOK_SECRET && env.MAIL_SECRET);
// The address that answers to this contact come back to (null: answers aren't received here).
export async function replyAddress(env, id, test = false) {
  if (!answersOn(env)) return null;
  const local = `c${+id}${test ? 't' : ''}`;
  return `respuestas+${local}-${await sig(env, local)}@${replyDomain(env)}`;
}
// An address it was sent to → { id, test } if it is one of those (and its signature is right).
export async function readReplyAddress(env, addr) {
  const m = String(addr || '').toLowerCase().match(/respuestas\+(c(\d{1,9})(t?))-([0-9a-f]{16})@/);
  if (!m || !env.MAIL_SECRET || m[4] !== await sig(env, m[1])) return null;
  return { id: +m[2], test: m[3] === 't' };
}

// ---- Sending one ----------------------------------------------------------------------------------
// POST /api/admin/crm/contacts/:id/send { subject, body, test? (an address) } → { ok, to, test } | { error }
export async function sendOne(env, id, body, { by, sendMail, mailConfigured, audit }) {
  const subject = str(body.subject, 160), msgBody = text(body.body, 8000);
  if (!subject || !msgBody) return { error: 'text', status: 400 };
  if (!mailConfigured(env)) return { error: 'mail not configured', status: 503 };
  const { contact: c } = await crmCall(env, 'get', { id }); if (!c) return { error: 'not found', status: 404 };
  const { settings: s } = await crmCall(env, 'settings');
  const test = body.test ? String(body.test).trim().toLowerCase() : '';
  if (test && !/^[^\s@<>"]{1,64}@[a-z0-9.-]{1,190}\.[a-z]{2,}$/.test(test)) return { error: 'test address', status: 400 };
  if (!test) {
    if (!c.email) return { error: 'no email', status: 409 };
    if (c.unsub) return { error: 'unsubscribed', status: 409 };
    if (!c.consent?.at) return { error: 'no consent', status: 409 };
    if (!s.identity) return { error: 'identity', status: 409 };
    if (!env.MAIL_SECRET) return { error: 'mail secret', status: 503 };
  }
  const unsubT = env.MAIL_SECRET ? await crmToken(env, 'unsub', { id: c.id, e: c.email || '' }) : null;
  const unsub = unsubT ? `${site(env)}/api/crm/unsub?t=${encodeURIComponent(unsubT)}` : null;
  const msg = crmMail({ subject: fill(subject, c, { yo: s.signer || '' }), body: fill(msgBody, c, { yo: s.signer || '' }), lang: c.lang || 'es', identity: s.identity,
    unsub: test ? null : unsub, consentAt: c.consent?.at });
  const replyTo = (await replyAddress(env, c.id, !!test)) || s.replyTo || null;
  const ok = await sendMail(env, { to: test || c.email, kind: test ? 'crm-test' : 'crm-manual', ...msg, subject: (test ? '[Prueba] ' : '') + msg.subject,
    ...(!test && unsub && { unsubscribe: unsub }), ...(replyTo && { replyTo }) });
  if (!ok) return { error: 'send failed', status: 502 };
  await crmCall(env, 'mailed', { id: c.id, subject: msg.subject, test: !!test, to: test || c.email, by });
  if (!test) await audit({ action: 'crm-mail', target: 'crm:' + c.id, after: { subject: msg.subject } });
  return { ok: true, to: test || c.email, test: !!test, answers: !!(await replyAddress(env, c.id)) };
}

// ---- Receiving answers (Resend's webhook) -----------------------------------------------------------
// Svix's signature: HMAC-SHA256 over "<id>.<timestamp>.<body>" with the secret (base64 after «whsec_»); the header has
// one or more «v1,<base64>». Not older than 5 minutes (a replay).
export async function svixOk(secret, headers, body, now = Date.now()) {
  const id = headers.get('svix-id'), ts = headers.get('svix-timestamp'), sigs = headers.get('svix-signature');
  if (!secret || !id || !ts || !sigs || !(Math.abs(now / 1000 - +ts) < 300)) return false;
  let raw; try { raw = Uint8Array.from(atob(String(secret).replace(/^whsec_/, '')), ch => ch.charCodeAt(0)); } catch { return false; }
  const k = await crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const want = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(`${id}.${ts}.${body}`)))));
  return sigs.split(' ').some(x => { const v = x.split(',')[1] || ''; return v.length === want.length && ![...v].reduce((d, ch, i) => d | (ch.charCodeAt(0) ^ want.charCodeAt(i)), 0); });
}
const plain = html => String(html || '').replace(/<(style|script)[\s\S]*?<\/\1>/gi, '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|tr|h\d)>/gi, '\n')
  .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\n{3,}/g, '\n\n').trim();
// POST /api/crm/inbound (no session: the signature is the proof).
export async function crmInbound(req, env, { sendMail, adminEmails = [] }) {
  const body = await req.text();
  if (body.length > 1e6 || !(await svixOk(env.RESEND_WEBHOOK_SECRET, req.headers, body))) return new Response('forbidden', { status: 403 });
  let ev; try { ev = JSON.parse(body); } catch { return new Response('bad', { status: 400 }); }
  if (ev?.type !== 'email.received' || !ev.data) return Response.json({ ok: true, ignored: true });
  const d = ev.data, to = [...(d.to || []), ...(d.cc || []), ...(d.received_for || [])];
  let who = null; for (const a of to) if ((who = await readReplyAddress(env, a))) break;
  if (!who || !env.CRM) return Response.json({ ok: true, ignored: true });            // (not an answer to Captación)
  // Its text: Resend gives it when asked (the webhook brings only who, to whom and the subject).
  let got = null;
  if (env.RESEND_KEY && d.email_id) {
    const r = await (env.FETCH || fetch)(`https://api.resend.com/emails/receiving/${encodeURIComponent(d.email_id)}`, { headers: { Authorization: `Bearer ${env.RESEND_KEY}` } }).catch(() => null);
    if (r?.ok) got = await r.json().catch(() => null);
  }
  const from = str(got?.from || d.from, 200), subject = str(got?.subject || d.subject, 200);
  const said = (got?.text || plain(got?.html) || '').slice(0, 8000);
  const r = await crmCall(env, 'reply', { id: who.id, test: who.test, from, subject, text: said.slice(0, 3000) });
  if (r.error) return Response.json({ ok: true, ignored: true });
  // On to the admin's mailbox, to answer from there (straight to whom wrote).
  const { settings: s } = await crmCall(env, 'settings'), toAdmin = s.replyTo || s.digestTo || adminEmails[0];
  if (toAdmin) {
    const sender = (from.match(/<([^>]+)>/) || [, from])[1];
    const head = `${who.test ? '(Prueba) ' : ''}Respuesta de ${r.name || 'un contacto'}${from ? ' — ' + from : ''}`;
    const link = `https://${env.ADMIN_HOST || 'admin.revelaslides.com'}/#captacion/c/${who.id}`;
    const html = `<div style="font:15px/1.5 system-ui,sans-serif"><p><b>${escHtml(head)}</b><br><a href="${escHtml(link)}">Ver la ficha en Captación</a></p><hr><pre style="white-space:pre-wrap;font:15px/1.5 system-ui,sans-serif">${escHtml(said || '(sin texto)')}</pre></div>`;
    await sendMail(env, { to: toAdmin, kind: 'crm-reply', subject: `${who.test ? '[Prueba] ' : ''}Re: ${subject || 'tu correo'} (${r.name || 'Captación'})`, html, text: `${head}\n${link}\n\n${said}`,
      ...(/^[^\s@<>"]+@[^\s@<>"]+$/.test(sender || '') && { replyTo: sender }) });
  }
  return Response.json({ ok: true });
}
