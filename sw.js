/* ============================================================
   DRYME - Service Worker v1.0.0
   Stratégie : Cache First pour assets, Network First pour APIs
   ============================================================ */

const CACHE_NAME    = 'dryme-v1.0.0';
const CACHE_STATIC  = 'dryme-static-v1';
const CACHE_API     = 'dryme-api-v1';

const STATIC_URLS = [
  '/',
  '/index.html',
  '/app.html',
  '/comment-ca-marche.html',
  '/a-propos.html',
  '/css/style.css',
  '/css/responsive.css',
  '/css/dark-mode.css',
  '/css/components.css',
  '/css/landing.css',
  '/js/app.js',
  '/js/weather.js',
  '/js/calculator.js',
  '/js/ui.js',
  '/js/location.js',
  '/js/dark-mode.js',
  '/js/share.js',
  '/js/ads.js',
  '/manifest.json'
];

// ── Installation ──
self.addEventListener('install', (event) => {
  console.log('[SW] Installation v1.0.0');
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then(cache => cache.addAll(STATIC_URLS.map(url => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
      .catch(err => console.warn('[SW] Erreur cache install:', err))
  );
});

// ── Activation ──
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation');
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_STATIC && key !== CACHE_API)
          .map(key => { console.log('[SW] Suppression cache:', key); return caches.delete(key); })
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch ──
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET et extensions
  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  // Stratégie Network First pour OpenWeatherMap
  if (url.hostname.includes('openweathermap.org') || url.hostname.includes('openweather.co.uk')) {
    event.respondWith(networkFirst(request, CACHE_API));
    return;
  }

  // Stratégie Network First pour Google Fonts (toujours à jour)
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(networkFirst(request, CACHE_STATIC));
    return;
  }

  // Stratégie Cache First pour les assets statiques
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request, CACHE_STATIC));
    return;
  }
});

/** Cache First : cache → réseau → cache update */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Hors ligne — contenu non disponible', { status: 503 });
  }
}

/** Network First : réseau → cache fallback */
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'Hors ligne' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
