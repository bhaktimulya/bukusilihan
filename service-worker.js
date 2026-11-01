const CACHE_NAME = 'buku-silihan-v1';
const assetsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/api-config.js',
  '/firebase-config.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// Install Service Worker dan Cache Aset Utama
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Membuka cache aplikasi...');
        return cache.addAll(assetsToCache);
      })
  );
  self.skipWaiting();
});

// Aktivasi dan Pembersihan Cache Lama
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Menghapus cache lama:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Strategi Fetch: Utamakan Jaringan (Network First) untuk API Google Apps Script, fallback ke Cache untuk aset statis
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Jika request mengarah ke Google Apps Script / API eksternal, prioritaskan jaringan
  if (url.origin !== location.origin) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Untuk file lokal, gunakan strategi Stale-While-Revalidate / Cache First
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        const fetchPromise = fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => {
          // Jika offline dan tidak ada di jaringan, abaikan error fetch
        });

        return cachedResponse || fetchPromise;
      })
  );
});
