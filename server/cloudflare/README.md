# Revela server (Cloudflare): sharing and live collaboration

One Worker does two things, both optional:

- **Sharing** (`/s`): stores the **sealed** (encrypted in the browser)
  presentations that Revela shares by link. The server never sees the key (it
  travels after `#` in the link), so it cannot read what it stores.
- **Live collaboration** (`/c`, `collab.js`): one room (a Durable Object) per
  session keeps the presentation, checks each change against the permission of
  the link used (view / comment / edit), passes it on to everyone and relays
  chat and who is where. Sessions keep going if the person who shared closes
  the tab, and work on networks where browsers can't connect directly. Without
  this server Revela collaborates browser to browser.

It all fits the free plans: Workers 100 000 requests/day, Durable Objects
(SQLite backend) 100 000 requests and 13 000 GB-s a day, R2 10 GB. The rooms
are designed for it: WebSocket hibernation (no cost while nobody types; 20
incoming messages count as 1 request), the document is written to R2 at most
every 5 s instead of on every change, and big messages travel in parts
(Cloudflare's limit is 1 MiB). If a limit is reached, requests fail until
00:00 UTC; nothing is charged on the free plan.

## Deploy

Needs [Node.js](https://nodejs.org/) (LTS) on your computer.

1. Create a Cloudflare account (free plan) and, in the dashboard, open **R2**
   once and accept its terms (it asks for a card only to prevent abuse; the
   free tier isn't charged).
2. From this folder (`server/cloudflare`):
   ```bash
   npx wrangler login                      # opens the browser to authorise
   npx wrangler r2 bucket create revela-shares
   npx wrangler secret put UPLOAD_KEY      # a long random value; only who knows it can upload or open rooms
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
  presentation itself, so it is stored (in your R2 bucket, `rooms/…`) while
  the session lasts and deleted when the person who started it ends it; plus
  the names people type and the chat of that session. Sessions that are never
  ended stay in the bucket until you delete them (Cloudflare dashboard ▸ R2 ▸
  revela-shares ▸ `rooms/`).

## Limiting a share to an organisation's accounts

In Compartir ▸ Servidor propio, type a domain (e.g. `school.example`): the
presentation is then only delivered to people signed in with a Google account
of that domain (the server checks Google's signature on the ID token). It uses
the Google OAuth client ID configured for Google Drive in Revela; add Revela's
address to its authorised JavaScript origins. The key or password is still
needed to open it.

Optional: `ALLOW_ORIGIN = "https://fmesasc.github.io"` in `[vars]` so only
Revela's pages can read shares from a browser (the data is encrypted anyway).
