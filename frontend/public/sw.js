// NIMBO Service Worker — Web Push 24/7 & Offline Shell Cache
const CACHE_NAME = 'nimbo-shell-v1';
const SHELL_ASSETS = ['/', '/index.html', '/favicon.svg', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

// Network-first for API, cache-fallback for shell assets.
// Never caches sensitive user data to protect privacy on shared devices.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip caching API requests
  if (url.pathname.startsWith('/api')) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// 24/7 Push Event Listener
self.addEventListener('push', (event) => {
  let data = {
    title: '✦ Recordatorio · Nimbo',
    body: 'Tienes una actividad programada.',
    url: '/',
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
    icon: data.icon || '/favicon.svg',
    badge: data.badge || '/favicon.svg',
    tag: data.tag || 'nimbo-notification',
    renotify: true,
    requireInteraction: true,
    data: {
      url: data.url || '/',
      reminderId: data.data?.reminderId,
    },
    actions: [
      { action: 'open', title: 'Ver actividad' },
      { action: 'dismiss', title: 'Cerrar' },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
