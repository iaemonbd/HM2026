// ══════════════════════════════════════════════════════
// HM Label Service Worker — FIXED
// Created by IA EMON
// v3.0 — Push Notification সম্পূর্ণ ঠিক করা হয়েছে
// ══════════════════════════════════════════════════════

const CACHE_NAME  = 'hmlabel-v3.0';
const OFFLINE_URL = './index.html';

// ✅ আপনার Apps Script URL এখানে দিন
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzSsU-fWIrrkhP5CU4hfbSfWJyWjGIVmet1pS60xCTxiISCcVjZvL9WwO88rTUdcnz2/exec';

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

// ══════════════════════════════════════════════════════
// ✅ FIXED PUSH HANDLER
// সমস্যা ছিল: Apps Script থেকে encrypted payload পাঠানো
//   সম্ভব ছিল না (ECDSA নেই), তাই empty push আসতো।
// সমাধান: push event এ data না থাকলে Apps Script থেকে
//   getLastNotification দিয়ে notification data fetch করা।
// ══════════════════════════════════════════════════════
self.addEventListener('push', (event) => {
  // Default fallback data
  const defaultData = {
    title: 'HM Label',
    body:  'নতুন আপডেট এসেছে! ক্লিক করে দেখুন।',
    url:   'https://hmlabel.com',
    icon:  'https://hmlabel.com/images/ico.png',
    badge: 'https://hmlabel.com/images/ico.png',
    image: undefined
  };

  event.waitUntil(
    (async () => {
      let data = { ...defaultData };

      // ✅ Step 1: event.data থেকে পাওয়ার চেষ্টা
      if (event.data) {
        try {
          const parsed = event.data.json();
          data = { ...defaultData, ...parsed };
        } catch (e) {
          // JSON না হলে text হিসেবে body তে রাখা
          data.body = event.data.text() || data.body;
        }
      } else {
        // ✅ Step 2: event.data না থাকলে Apps Script থেকে fetch
        // (Empty push এর ক্ষেত্রে এটিই কাজ করবে)
        try {
          const response = await fetch(
            APPS_SCRIPT_URL + '?action=getLastNotification',
            { cache: 'no-store' }
          );
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
              data = { ...defaultData, ...result.data };
            }
          }
        } catch (fetchErr) {
          console.log('⚠️ Could not fetch notification data:', fetchErr);
          // fallback: defaultData ব্যবহার করা হবে
        }
      }

      // ✅ Step 3: Notification দেখানো
      const options = {
        body:    data.body,
        icon:    data.icon  || defaultData.icon,
        badge:   data.badge || defaultData.icon,
        data:    { url: data.url || 'https://hmlabel.com' },
        vibrate: [200, 100, 200],
        requireInteraction: false,
        actions: [
          { action: 'open',    title: '🔗 দেখুন' },
          { action: 'dismiss', title: '✕ বন্ধ করুন' }
        ]
      };

      // Image শুধু থাকলেই যোগ করা
      if (data.image) {
        options.image = data.image;
      }

      await self.registration.showNotification(data.title, options);
    })()
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
