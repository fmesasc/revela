// Service worker: lets Revela open and work offline after one online visit.
//
// - The app's own files: network first (so a new deploy is picked up at once),
//   falling back to the cached copy when offline.
// - Versioned libraries and fonts from the CDNs: cache first (their URLs never
//   change content), stored the first time the app uses them.
// - Everything else (Google Drive API, sign-in, the phone remote's signalling)
//   is not touched: it goes straight to the network.

const CACHE = 'revela-v1';
const SHELL = ['./', 'index.html', 'src/ui/styles.css', 'src/main.js', 'manifest.webmanifest', 'icons/icon.svg'];
const CDN = ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

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
    if (url.searchParams.has('test') || url.pathname.includes('/tests/')) return;   // never cache the test harness
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: req.mode === 'navigate' })
      .then(r => r || (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
  } else if (CDN.includes(url.hostname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    })));
  }
});
