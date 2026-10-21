// QuickSeat service worker: lets the app install to a phone's home screen and open without a connection.
// The app is a single index.html (everything inlined), so caching it plus the icons is the whole app.
// Pages always try the network first, so a new deploy shows up on the next visit; the cache is the offline fallback.
// Cache names start with "quickseat-shell": the login/logout device reset keeps these (app files, no personal data).

const SHELL = 'quickseat-shell-v1'
const FONTS = 'quickseat-shell-fonts'
const CORE = ['./', './index.html', './manifest.webmanifest', './favicon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-touch-icon.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n.startsWith('quickseat-shell-v') && n !== SHELL).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)

  // Pages: network first, falling back to the cached app when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(SHELL).then((c) => c.put('./index.html', copy))
          return res
        })
        .catch(() => caches.match('./index.html')),
    )
    return
  }

  // Google Fonts: serve what we have, refresh in the background.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONTS).then((cache) =>
        cache.match(req).then((hit) => {
          const fresh = fetch(req).then((res) => { cache.put(req, res.clone()); return res }).catch(() => hit)
          return hit || fresh
        }),
      ),
    )
    return
  }

  // Our own files (icons, manifest): cache first.
  if (url.origin === self.location.origin) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req)))
  }
})
