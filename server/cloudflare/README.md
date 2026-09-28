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

Optional: `ALLOW_ORIGIN = "https://fmesasc.github.io"` in `[vars]` so only
Revela's pages can read shares from a browser (the data is encrypted anyway).
