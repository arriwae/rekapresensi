const CACHE_NAME = 'presensipro-v1';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './css/components.css',
  './vendor/chart.umd.min.js',
  './js/icons.js',
  './js/csv-parser.js',
  './js/attendance-rules.js',
  './js/db.js',
  './js/state.js',
  './js/ui-importer.js',
  './js/ui-dashboard.js',
  './js/ui-employees.js',
  './js/ui-comparison.js',
  './js/ui-export.js',
  './js/ui-settings.js',
  './js/test-suite.js',
  './js/app.js',
  './sample-data/presensi_oktober_2026.csv',
  './sample-data/presensi_november_2026.csv',
  './sample-data/presensi_edge_cases_test.csv'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // Cache new static files if requested successfully
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          event.request.method === 'GET'
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
