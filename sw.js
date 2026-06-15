// ══════════════════════════════════════════════════════
// HM Label Service Worker
// Created by IA EMON
// v2.3 — Push Notification সাপোর্ট যোগ করা হয়েছে
// ══════════════════════════════════════════════════════

const CACHE_NAME = 'hmlabel-v2.3';
const OFFLINE_URL = './index.html';

// Files to cache
const urlsToCache = [
  './',
  './index.html',
  './images/ico.png',
  './images/logo.png',
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400&family=DM+Sans:wght@200;300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('✅ Cache opened');
        return cache.addAll(urlsToCache);
      })
      .catch((err) => {
        console.log('⚠️ Cache addAll failed:', err);
      })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip API calls (always fetch fresh)
  if (event.request.url.includes('script.google.com') || 
      event.request.url.includes('api.telegram.org') ||
      event.request.url.includes('ipinfo.io') ||
      event.request.url.includes('open-meteo.com') ||
      event.request.url.includes('ipapi.co') ||
      event.request.url.includes('api.ipify.org')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then((response) => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        }).catch((err) => {
          console.log('⚠️ Fetch failed:', err);
          // Return offline page if available
          return caches.match(OFFLINE_URL);
        });
      })
  );
});

// ══════════════════════════════════════════════════════
// ✅ PUSH NOTIFICATION — রিসিভ ও দেখানো
// ══════════════════════════════════════════════════════
self.addEventListener('push', (event) => {
  let data = { title: 'HM Label', body: 'নতুন আপডেট এসেছে!', url: 'https://hmlabel.com', icon: 'https://hmlabel.com/images/ico.png', badge: 'https://hmlabel.com/images/ico.png' };

  if (event.data) {
    try { data = { ...data, ...event.data.json() }; }
    catch (e) { data.body = event.data.text(); }
  }

  const options = {
    body:    data.body,
    icon:    data.icon  || 'https://hmlabel.com/images/ico.png',
    badge:   data.badge || 'https://hmlabel.com/images/ico.png',
    image:   data.image || undefined,
    data:    { url: data.url || 'https://hmlabel.com' },
    vibrate: [200, 100, 200],
    requireInteraction: false,
    actions: [
      { action: 'open',    title: '🔗 দেখুন' },
      { action: 'dismiss', title: '✕ বন্ধ করুন' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ══════════════════════════════════════════════════════
// ✅ NOTIFICATION CLICK — ক্লিক করলে সাইট খুলবে
// ══════════════════════════════════════════════════════
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : 'https://hmlabel.com';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
