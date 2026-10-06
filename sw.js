// Service worker: lets Revela open and work offline after one online visit.
//
// - The app's own files: network first (so a new deploy is picked up at once),
//   falling back to the cached copy when offline.
// - Versioned libraries and fonts from the CDNs: cache first (their URLs never
//   change content), stored the first time the app uses them.
// - Everything else (Google Drive API, sign-in, the phone remote's signalling)
//   is not touched: it goes straight to the network. Above all Revela's own API
//   (revelaslides.com/api/…: the account, cloud documents, sessions): it is
//   private and never kept here — only what lies inside the app's own folder.

const CACHE = 'revela-v5';                             // (v5: the old caches, which could hold /api/ answers, are deleted)
const SHELL = ['./', 'index.html', 'src/ui/styles/tokens.css', 'src/ui/styles/ribbon.css', 'src/ui/styles/layout.css', 'src/ui/styles/canvas.css', 'src/ui/styles/chrome.css', 'src/ui/styles/responsive.css', 'src/ui/styles/features.css', 'src/apps/editor/main.js', 'manifest.webmanifest', 'icons/icon.svg'];
const CDN = ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com', 'storage.googleapis.com'];   // (the last: MediaPipe's models, by version)

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (!url.href.startsWith(self.registration.scope) || url.pathname.startsWith('/api/')) return;   // (the app's files only)
    if (url.searchParams.has('test') || url.pathname.includes('/tests/')) return;   // never cache the test harness
    // (cache: 'no-cache' — always asks the server whether there's a newer version (a cheap 304 if not):
    // the browser's own HTTP cache kept old code for hours after a deploy.)
    e.respondWith(fetch(req, { cache: 'no-cache' }).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: req.mode === 'navigate' })
      .then(r => r || (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
  } else if (CDN.includes(url.hostname)) {
    // A fixed version (…@1.2.3/…) or a font never changes: cache first. A branch
    // (…@main/…, 3D models from GitHub) can: network first, the copy offline.
    // Only good answers are kept (not errors, not opaque ones).
    const keep = res => { if (res.ok && res.type !== 'opaque') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; };
    const fixed = url.hostname !== 'cdn.jsdelivr.net' || /@\d[\w.-]*\//.test(url.pathname);
    e.respondWith(fixed ? caches.match(req).then(hit => hit || fetch(req).then(keep))
      : fetch(req).then(keep).catch(() => caches.match(req).then(r => r || Response.error())));
  }
});
