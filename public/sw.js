// Update cache version to force refresh on all domains - increment on each deployment
// v7: Refresh favicon cache to ship new brand icon set
const CACHE_NAME = 'aaura-shell-v7';
const CACHE_VERSION = 'v7';
const APP_SHELL = [
  '/',
  '/manifest.json',
  '/icons/android-chrome-192x192.png',
  '/icons/android-chrome-512x512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon-32x32.png',
  '/icons/favicon-16x16.png',
];
const APP_SHELL_SET = new Set(APP_SHELL);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  // Force activation immediately
  self.skipWaiting();
  // Clear all old caches
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !key.includes(CACHE_VERSION))
          .map((outdatedKey) => caches.delete(outdatedKey)),
      ),
    ),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((outdatedKey) => caches.delete(outdatedKey)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (
    request.method !== 'GET' ||
    !request.url.startsWith(self.location.origin)
  ) {
    return;
  }

  const url = new URL(request.url);
  if (!APP_SHELL_SET.has(url.pathname)) {
    // Let the network handle everything except the tiny shell list.
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    }),
  );
});


