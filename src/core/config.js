// Project settings that aren't part of any deck.

// Two editions from the same code: the open one (GitHub Pages, and any copy)
// and the official one at revelaslides.com/app/, which tools/build-site.mjs
// marks with <meta name="revela-edition" content="cloud">. The open edition
// shows a link to the official one's plans; the official one, the account.
export const OFFICIAL_SITE = 'https://revelaslides.com';
// The desktop app is marked "desktop" (tools/build-site.mjs --app-only): it uses the official server too.
export const EDITION = (e => (e === 'cloud' || e === 'desktop' ? e : 'open'))(globalThis.document?.querySelector?.('meta[name="revela-edition"]')?.content);

// Donations link (PayPal.me, Ko-fi, GitHub Sponsors…). Empty = no button.
export const DONATE_URL = 'https://paypal.me/fmesasc';
// The app's version (package.json's): the published one (vX.Y.Z, promote.yml raises it), shown in «Informar de un
// problema» and sent with it, and the server's (/api/version).
export const APP_VERSION = '0.4.29';

// Revela's Google Cloud project (Drive, Picker, "Sign in with Google").
//
// These are PUBLIC identifiers, not secrets: every web app that uses Google
// sign-in ships them in its page, and they are visible in the Google login
// window anyway. What protects them is set in Google Cloud: they only work from
// this site's origins (https://fmesasc.github.io and localhost), the API key is
// limited to the Drive and Picker APIs, and the drive.file scope only reaches
// files created or opened with Revela, with each user's consent.
// The OAuth client secret is not used (and must never be put here).
//
// Someone running their own copy of Revela can use their own project: Archivo ▸
// Google Drive ▸ Configurar (kept only in that browser) or by changing these.
export const GOOGLE = {
  clientId: '960102070599-jahg4mdj304k5ftb9b6p2ck9hp5gtbc9.apps.googleusercontent.com',
  apiKey: 'AIzaSyAWDjnxLpwMf0xtkQ8SwYHdl59QDfTDs_4',
  appId: '960102070599',                   // project number: the Picker grants access to the chosen file
};

// Revela's server (server/cloudflare): sharing by link and live collaboration
// rooms. Creating a share or a room needs a Google sign-in in Revela (or the
// server's upload key); opening a link needs nothing. Anyone can use their own
// server instead (Compartir ▸ Servidor).
export const SERVER_URL = 'https://revela-share.fmesasc.workers.dev';

// Dropbox and OneDrive (Archivo ▸ Otras nubes): the public identifiers of
// Revela's apps registered there — the Dropbox app key and the Microsoft
// (Entra) application ID. Like Google's, they are not secrets (PKCE sign-in, no
// client secret). Empty until the apps are registered; meanwhile anyone can
// write their own in the dialog (kept only in that browser).
export const CLOUD_KEYS = { dropbox: 'u1j9rgsw5ww13e7', onedrive: 'bfa11a43-8888-4806-ab47-bec0a60e0569' };   // (public app identifiers; OneDrive's: FM Lab's Microsoft Entra registration, SPA, Files.ReadWrite)
