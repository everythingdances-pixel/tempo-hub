// Minimal service worker for PWA installability
self.addEventListener('install', function(e) {
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(clients.claim());
});

// Network-first strategy — always fetch fresh, no stale cache
self.addEventListener('fetch', function(e) {
  e.respondWith(fetch(e.request));
});
