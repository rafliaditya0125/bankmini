const CACHE_NAME = 'bankmini-v4';
const ASSETS_TO_CACHE = [
  '/images/bankmini-removebg-preview.png',
  '/manifest.json'
];

// Install Event: Pre-cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate Event: Cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Different strategies for different request types
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Only process GET requests. Ignore POST, PUT, DELETE, etc.
  if (event.request.method !== 'GET') return;

  // 2. Exclude specific paths that should always be real-time
  const excludedPaths = ['/api', '/broadcasting', '/vapor', '/forgot-password', '/reset-password', '/login', '/logout'];
  
  // Bypass cache for Inertia XHR requests (page transitions/data fetching)
  const isInertia = event.request.headers.has('X-Inertia');
  
  if (isInertia || excludedPaths.some(path => url.pathname.startsWith(path))) {
    return;
  }

  // 3. Navigation requests (HTML pages): Network-First
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // 4. Static assets & others: Cache-First or Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response; // Return from cache
        }

        return fetch(event.request).then((networkResponse) => {
          // Only cache successful same-origin GET responses
          if (
            !networkResponse || 
            networkResponse.status !== 200 || 
            networkResponse.type !== 'basic' ||
            event.request.method !== 'GET'
          ) {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        });
      })
  );
});

// ─── Web Push Notifications ──────────────────────────────────────────────────

// Push Event: Tampilkan notifikasi dari server
self.addEventListener('push', (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Bank Mini', body: event.data ? event.data.text() : '' };
  }

  const title   = data.title   || 'Bank Mini SMEACIS';
  const options = {
    body:  data.body    || '',
    icon:  data.icon    || '/images/bankmini-removebg-preview.png',
    badge: data.badge   || '/images/bankmini-removebg-preview.png',
    data:  data.data    || {},
    requireInteraction: false,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification Click: Buka aplikasi dan arahkan ke URL transaksi
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
