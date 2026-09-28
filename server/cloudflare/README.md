# Revela share server (Cloudflare)

Stores the **sealed** (encrypted in the browser) presentations that Revela
shares by link. The server never sees the key (it travels after `#` in the
link), so it cannot read what it stores. Free tier: R2 includes 10 GB and
Workers 100 000 requests a day.

## Deploy

1. Create a Cloudflare account and, in the dashboard, enable R2.
2. From this folder:
   ```bash
   npx wrangler login
   npx wrangler r2 bucket create revela-shares
   npx wrangler secret put UPLOAD_KEY      # a long random value; only who knows it can upload
   npx wrangler deploy
   ```
3. Wrangler prints the address (`https://revela-share.<you>.workers.dev`).
   In Revela: **Archivo ▸ Compartir ▸ Servidor propio ▸ Configurar**, paste
   that address and the upload key.

## What it knows

Only encrypted data and, per share, a view counter with the date of the last
view — nothing about who viewed (no IP address, no browser). Whoever shared
it sees the count in Revela ▸ Compartir.

## Limiting a share to an organisation's accounts

In Compartir ▸ Servidor propio, type a domain (e.g. `school.example`): the
presentation is then only delivered to people signed in with a Google account
of that domain (the server checks Google's signature on the ID token). It uses
the Google OAuth client ID configured for Google Drive in Revela; add Revela's
address to its authorised JavaScript origins. The key or password is still
needed to open it.

Optional: `ALLOW_ORIGIN = "https://fmesasc.github.io"` in `[vars]` so only
Revela's pages can read shares from a browser (the data is encrypted anyway).
