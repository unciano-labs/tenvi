'use client';

import { useEffect } from 'react';
import { PwaInstallPrompt } from './PwaInstallPrompt';

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const isDev =
      process.env.NODE_ENV === 'development' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      Boolean(window.location.port);

    if (isDev) {
      // In local development, unregister any active service workers and clear caches
      // to prevent stale Turbopack chunk errors when files are edited
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((reg) => reg.unregister());
      });
      if ('caches' in window) {
        caches.keys().then((keys) => {
          keys.forEach((key) => caches.delete(key));
        });
      }
      return;
    }

    // In production, actively clear obsolete caches that may have captured old Next.js chunks
    if ('caches' in window) {
      caches.keys().then((keys) => {
        keys.forEach((key) => {
          if (key === 'tenvi-pwa-v1' || key === 'tenvi-pwa-v2') {
            caches.delete(key);
          }
        });
      });
    }

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        // Check for updates periodically or on navigation
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available; update can be picked up smoothly
                console.log('[PWA] New version available in background.');
              }
            });
          }
        });
      } catch (err) {
        console.warn('[PWA] Service Worker registration failed:', err);
      }
    };

    if (document.readyState === 'complete') {
      registerSW();
    } else {
      window.addEventListener('load', registerSW);
      return () => window.removeEventListener('load', registerSW);
    }
  }, []);

  return <PwaInstallPrompt />;
}
