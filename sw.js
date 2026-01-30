const CACHE_NAME = 'ragdoll-sandbox-v3';
const urlsToCache = [
    '/index.html',
    '/style.css',
    '/game.js'
];

// Instalar
self.addEventListener('install', event => {
    self.skipWaiting();
});

// Activar - borrar caches viejos
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    return caches.delete(cacheName);
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch - Network first (siempre busca la versión nueva)
self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request)
            .catch(() => caches.match(event.request))
    );
});
