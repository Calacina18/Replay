const CACHE_NAME = 'replay-app-v5';
const APP_FILES = [
  './',
  './index.html',
  './styles.css',
  './catalogo.js',
  './app.js',
  './firebase-config.js',
  './app.webmanifest',
  './icons/replay.svg',
  './icons/replay-192.png',
  './icons/replay-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('replay-app-') && key !== CACHE_NAME).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;
  // Ignore any leftover API path if the site is served through another platform.
  if (requestUrl.pathname.startsWith('/api/')) return;
  // Gameplay files can be very large; do not fill the offline cache with videos.
  if (/\.(mp4|mov|mkv|webm|vtt)$/i.test(requestUrl.pathname)) return;
  event.respondWith(caches.match(event.request).then(cached => {
    if (cached) return cached;
    return fetch(event.request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      }
      return response;
    }).catch(() => event.request.mode === 'navigate' ? caches.match('./index.html') : Response.error());
  }));
});