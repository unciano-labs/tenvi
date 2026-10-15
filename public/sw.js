// Tenvi Progressive Web App Service Worker
const CACHE_NAME = 'tenvi-pwa-v3';

// Core static shell assets to pre-cache on install (never include /_next/ dynamic chunks)
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

// Activate event: Clean up all obsolete caches (including v1, v2) and claim clients immediately
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

// Fetch event: Strategy router satisfying PWA criteria without intercepting Next.js internal chunks
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests with http/https schemes
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (!url.protocol.startsWith('http')) return;

  // 1. Bypass Service Worker entirely for:
  // - Next.js internal paths (/_next/*) to prevent stale chunk errors and module factory mismatches
  // - Local development (localhost, 127.0.0.1, custom port)
  // - APIs, Supabase, Google endpoints, and Server Actions
  const isBypass =
    url.pathname.startsWith('/_next/') ||
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    Boolean(url.port) ||
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('/auth/') ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('googleapis.com') ||
    request.headers.get('accept')?.includes('application/json') ||
    request.headers.get('next-action') !== null;

  if (isBypass) {
    return;
  }

  // 2. Static Visual Assets (icons, images, fonts): Cache-first with network fallback
  const isStaticAsset =
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.webp') ||
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

  // 4. Default: Network with cache fallback
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
