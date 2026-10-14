// Tenvi Progressive Web App Service Worker
const CACHE_NAME = 'tenvi-pwa-v1';

// Core static assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-maskable-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
];

// Install event: Pre-cache core shell assets and activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn('[SW] Pre-caching error (non-fatal):', err);
        return self.skipWaiting();
      })
  );
});

// Activate event: Clean up obsolete caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch event: Strategy router satisfying PWA criteria without stale financial data
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests with http/https schemes
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (!url.protocol.startsWith('http')) return;

  // 1. Bypass Service Worker entirely for dynamic data, Supabase, APIs, Next.js server actions
  const isBypassRoute =
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('/auth/') ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('googleapis.com') ||
    request.headers.get('accept')?.includes('application/json') ||
    request.headers.get('next-action') !== null;

  if (isBypassRoute) {
    return;
  }

  // 2. Static Immutable Assets (Next.js chunks, fonts, images): Cache-first with network fallback
  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.woff2');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 3. Navigation Requests (HTML Pages): Network-first with cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            return caches.match('/');
          });
        })
    );
    return;
  }

  // 4. Fallback for other GET requests
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
