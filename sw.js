// ══════════════════════════════════════════════════════
// HM Label Service Worker
// Created by IA EMON
// v4.0 — Push Notification ফিচার সম্পূর্ণ রিমুভ করা হয়েছে
//        শুধু Offline Caching ফিচার সক্রিয় আছে
// ══════════════════════════════════════════════════════

const CACHE_NAME  = 'hmlabel-v4.0';
const OFFLINE_URL = './index.html';

const urlsToCache = [
  './',
  './index.html',
  './images/ico.png',
  './images/logo.png',
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400&family=DM+Sans:wght@200;300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css'
];

// ── Install ────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('✅ Cache opened');
        return cache.addAll(urlsToCache);
      })
      .catch((err) => console.log('⚠️ Cache addAll failed:', err))
  );
  self.skipWaiting();
});

// ── Activate ──────────────────────────────────────────
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

// ── Fetch ─────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  if (event.request.url.includes('script.google.com') ||
      event.request.url.includes('api.telegram.org') ||
      event.request.url.includes('ipinfo.io') ||
      event.request.url.includes('open-meteo.com') ||
      event.request.url.includes('ipapi.co') ||
      event.request.url.includes('api.ipify.org')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) return response;

      return fetch(event.request.clone()).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') return response;

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      }).catch(() => caches.match(OFFLINE_URL));
    })
  );
});
