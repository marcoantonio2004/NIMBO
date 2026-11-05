// NIMBO Service Worker — Web Push 24/7, Speech Alerts & Offline-First Shell Cache
const CACHE_NAME = 'nimbo-shell-v9';
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/bot.svg',
  '/bot.ico',
  '/bot-32.png',
  '/favicon.svg',
  '/favicon.ico',
  '/favicon-32.png',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/manifest.json',
];

// Pre-cache static shell assets on install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

// Force immediate activation
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Clean up old caches on activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Network-first for API, Cache-First/Stale-While-Revalidate for Assets, Cache fallback for SPA navigation.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // 1. API calls: Always network, offline fallback JSON
  if (url.pathname.startsWith('/api')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({ success: false, offline: true, error: 'Sin conexión a internet' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // 2. SPA Navigation routes (e.g. /, /reminders, /calendar, /settings)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached =
            (await caches.match(event.request)) ||
            (await caches.match('/index.html')) ||
            (await caches.match('/'));
          if (cached) return cached;
          return new Response('NIMBO Offline Shell', { status: 503 });
        })
    );
    return;
  }

  // 3. Static Assets: JS chunks, CSS, fonts, images, SVGs
  const isSameOrigin = url.origin === self.location.origin;
  const isAsset =
    url.pathname.startsWith('/assets/') ||
    /\.(js|css|woff2?|png|svg|ico|jpg|jpeg|json|webp)$/i.test(url.pathname);

  if (isSameOrigin && isAsset) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // If online, update cache in background (Stale-While-Revalidate)
          if (navigator.onLine) {
            fetch(event.request)
              .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                  caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
                }
              })
              .catch(() => {});
          }
          return cachedResponse;
        }

        // Not in cache: fetch from network and store for offline use
        return fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return networkResponse;
          })
          .catch(async () => {
            // Check shell assets fallback (e.g. icons)
            const fallback = await caches.match(url.pathname);
            if (fallback) return fallback;
            return new Response('Asset no disponible offline', { status: 503 });
          });
      })
    );
    return;
  }

  // 4. Default: Network with Cache Fallback
  event.respondWith(
    fetch(event.request).catch(async () => {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      return new Response('Offline', { status: 503 });
    })
  );
});

// 24/7 Push Event Listener
self.addEventListener('push', (event) => {
  let data = {
    title: '🤖 Recordatorio · Nimbo',
    body: 'Tienes una actividad programada.',
    url: '/',
    speechText: 'Tienes una actividad programada en Nimbo.',
  };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/favicon-32.png',
    tag: data.tag || 'nimbo-notification',
    renotify: true,
    requireInteraction: true,
    vibrate: [300, 100, 300],
    data: {
      url: data.url || '/',
      reminderId: data.data?.reminderId,
      speechText: data.speechText || data.body,
    },
    actions: [
      { action: 'open', title: 'Ver actividad' },
      { action: 'dismiss', title: 'Cerrar' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options).then(() => {
      return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        for (const client of clients) {
          client.postMessage({
            type: 'NIMBO_VOICE_ALERT',
            text: data.speechText || data.body,
            reminderId: data.data?.reminderId,
          });
        }
      });
    })
  );
});

// Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
