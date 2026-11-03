// NIMBO Service Worker — Web Push 24/7, Speech Alerts & Offline Shell Cache
const CACHE_NAME = 'nimbo-shell-v3';
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/favicon-32.png',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/manifest.json',
];

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
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

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

  // Broadcast to open clients to speak aloud with Web Speech
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title, options),
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        clientList.forEach((client) => {
          client.postMessage({
            type: 'NIMBO_VOICE_ALERT',
            text: data.speechText || data.body,
          });
        });
      }),
    ])
  );
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
