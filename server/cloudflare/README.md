# Revela server (Cloudflare): sharing, live collaboration and accounts

One Worker does three things, all optional:

- **Accounts** (`/api/…`, `api.js`): sign-in, plan and credits, AI through
  Revela's own key (charged in credits), payments with Stripe and signing in the
  desktop app. The server checks every request itself — see
  [docs/NUBE.md](../../docs/NUBE.md) for the design and its security. Needs the
  `OPENROUTER_KEY` secret for the AI (and Stripe's for payments); on
  revelaslides.com it answers under the route `revelaslides.com/api/*`. The
  sharing and collaboration routes also answer under `/api/s` and `/api/c`.


- **Sharing** (`/s`): stores the **sealed** (encrypted in the browser)
  presentations that Revela shares by link. The server never sees the key (it
  travels after `#` in the link), so it cannot read what it stores.
- **Live collaboration** (`/c`, `collab.js`): one room (a Durable Object) per
  session keeps the presentation, checks each change against the permission of
  the link used (view / comment / edit), passes it on to everyone and relays
  chat and who is where. Sessions keep going if the person who shared closes
  the tab, and work on networks where browsers can't connect directly. Without
  this server Revela collaborates browser to browser.

## Free, and never billed

Everything is stored in **Durable Objects** (`store.js`), not R2. On the
**Workers Free** plan, Workers and Durable Objects have hard daily limits
(100 000 requests; Durable Objects: 13 000 GB-s, 100 000 rows written and
5 M read, 5 GB stored): when one is reached, requests fail until 00:00 UTC —
nothing is charged. (R2, instead, bills what goes past its free tier to the
account's card, so it isn't used.) Keep the account on the Free plan
(Workers & Pages ▸ Plans) and it can't cost anything.

To stay well within those limits:

- rooms use WebSocket hibernation (no cost while nobody types; 20 incoming
  messages count as 1 request), save at most every 5 s and only the slides
  that changed; big messages travel in parts (Cloudflare's limit is 1 MiB);
- per day, each Google account (or address) can create `DAILY_PER_USER`
  shares + rooms (30) and everyone together `DAILY_TOTAL` (3000), so nobody
  can use up the quota for everyone (`wrangler.toml`);
- rooms nobody enters for 7 days are deleted; shares are deleted when they
  expire, when unshared, or after a year without views.

## Deploy

Needs [Node.js](https://nodejs.org/) (LTS) on your computer.

1. Create a Cloudflare account (free plan; no card needed).
2. From this folder (`server/cloudflare`):
   ```bash
   npx wrangler login                      # opens the browser to authorise
   npx wrangler secret put UPLOAD_KEY      # optional: a long random value, to upload without Google
   npx wrangler deploy
   ```
3. Wrangler prints the address (`https://revela-share.<you>.workers.dev`).
   In Revela: **Archivo ▸ Compartir ▸ Servidor propio**, paste that address
   and the upload key. From then on **Colaborar** uses the server too.

To update it after a change in this folder: `npx wrangler deploy` again.
To try it locally: `npx wrangler dev --var UPLOAD_KEY:test` (then use
`http://127.0.0.1:8787` as the address in Revela).

## Who can use it

Opening a shared link or joining a session needs nothing. Creating a share or
a collaboration room needs one of:

- being **signed in to Revela with Google**: `GOOGLE_CLIENT_ID` (in
  `wrangler.toml`, public) is Revela's Google client; the server asks Google
  whether the token was issued to it. To limit it to some accounts:
  `npx wrangler secret put ALLOWED` with e.g. `ana@example.org, @school.example`.
- the **upload key** (`UPLOAD_KEY` secret), for a server of your own used
  without Google (Compartir ▸ Servidor ▸ Usar otro servidor).

## Automatic deploys from GitHub

`.github/workflows/server.yml` runs the tests and deploys this folder when it
changes. It needs two repository secrets (Settings ▸ Secrets and variables ▸
Actions): `CLOUDFLARE_API_TOKEN` (Cloudflare ▸ My Profile ▸ API Tokens ▸
Create Token ▸ template "Edit Cloudflare Workers") and `CLOUDFLARE_ACCOUNT_ID`.
The Worker's own secrets (`UPLOAD_KEY`, `ALLOWED`) stay in Cloudflare.

## What it knows

- Shares: only encrypted data and, per share, a view counter with the date of
  the last view — nothing about who viewed (no IP address, no browser).
  Whoever shared it sees the count in Revela ▸ Compartir.
- Collaboration rooms: to merge everyone's changes the room needs the
  presentation itself, so it is stored (in that room's Durable Object) while
  the session lasts and deleted when the person who started it ends it, or 7
  days after the last visit; plus the names people type and the chat of that
  session.

## Limiting a share to an organisation's accounts

In Compartir ▸ Servidor propio, type a domain (e.g. `school.example`): the
presentation is then only delivered to people signed in with a Google account
of that domain (the server checks Google's signature on the ID token). It uses
the Google OAuth client ID configured for Google Drive in Revela; add Revela's
address to its authorised JavaScript origins. The key or password is still
needed to open it.

Optional: `ALLOW_ORIGIN = "https://fmesasc.github.io"` in `[vars]` so only
Revela's pages can read shares from a browser (the data is encrypted anyway).
