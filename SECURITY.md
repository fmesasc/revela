# Security policy

## Reporting a vulnerability

Please report security problems **privately**, not in a public issue:

- **GitHub:** on [fmesasc/revela](https://github.com/fmesasc/revela), open the
  **Security** tab ▸ **Report a vulnerability** (a private security advisory,
  seen only by the maintainers).
- **Or** the contact form at <https://revelaslides.com/contact>: choose
  «Privacidad» (or another topic) and say that it is a security report.

Include what is affected (the app, which page, or which `/api/…` route), the
steps to reproduce it, what an attacker could do with it, and the browser or
tool you used. A proof of concept helps; please don't access, change or delete
other people's data, and don't degrade the service (no denial-of-service or
spam tests).

You will get an acknowledgement within a few working days, and news as the
problem is checked and fixed. Once a fix is published we are glad to credit
you, if you wish.

## Scope

- **The app** — this repository's `src/` and the pages at its root, as
  published at revelaslides.com/app, fmesasc.github.io/revela and in the
  desktop app (`desktop/`), including the exported presentations.
- **The server API** — `server/cloudflare` (revelaslides.com/api/…, the share
  and co-editing routes, the community pages) and `server/blender`.
- **The administration API** — `admin.revelaslides.com/api/admin/…`. It sits
  behind Cloudflare Access; a way past Access or past the Worker's own check of
  the Access token is in scope.

Out of scope: third-party services Revela uses (Google, Stripe, OpenRouter, Cloudflare,
Dropbox, Microsoft…) — report those to their owners. Copies of Revela run by
others are their operators' responsibility.

## How Revela is built to be safe

A short summary; [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) («Security») and
[server/cloudflare/README.md](server/cloudflare/README.md) have the details.

- **The server decides.** The app only asks; sessions, plan, credits, limits and
  each cloud document's role (present, view, comment, edit) are checked by the
  server on every request, against state only it holds.
- **Sessions:** an `HttpOnly`, `Secure`, `SameSite=Strict` cookie limited to
  `/api` (a bearer token in the desktop app). Only a SHA-256 hash of each is
  stored; people can see their open sessions and end them. Requests with the
  cookie that change something must come from an allowed origin.
- **Sealed shares** are encrypted in the browser (AES-GCM-256; the key travels
  after `#` in the link, or comes from a password through PBKDF2-SHA-256 with
  600 000 rounds), so the server stores data it cannot read. They open in a
  sandboxed frame without Revela's origin.
- **Content from outside** (files, imports, pastes, co-editors' changes, cloud
  documents) is sanitized before use: no scripts, frames or event handlers,
  only safe links and sources.
- **Administration** answers only on its own host, behind Cloudflare Access;
  the Worker verifies the Access token (signature, audience, issuer, expiry)
  and an allow-list of emails itself, and requires its own header and origin
  against cross-site requests. Administrative actions go to an audit log.
- **Signed calls:** Stripe's webhooks, the links in emails and the requests to
  the Blender containers (which have no internet access) are signed and checked.
- **Headers:** API responses for shares and rooms say `noindex` and
  `Referrer-Policy: no-referrer`; the HTML pages the server renders (community,
  tickets, unsubscribe) send a restrictive `Content-Security-Policy` and
  `X-Frame-Options: DENY`.
- **Secrets** (API keys, signing keys) live in Cloudflare and never in this
  repository; the service worker never caches `/api/` answers.
