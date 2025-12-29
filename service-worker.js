const CACHE_NAME = 'smj-cache-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/jadwal.html',
  '/style.css',
  '/script.js',
  '/manifest.json'
];

// Install event - cache all assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching app assets');
        return cache.addAll(ASSETS);
      })
      .catch(err => {
        console.error('Cache failed:', err);
      })
  );
  self.skipWaiting();
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('Deleting old cache:', key);
            return caches.delete(key);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const req = event.request;
  
  // Only cache GET requests
  if (req.method !== 'GET') return;
  
  // Skip chrome extensions and other non-http(s) requests
  if (!req.url.startsWith('http')) return;
  
  event.respondWith(
    caches.match(req)
      .then(cached => {
        // Return cached version if available
        if (cached) {
          console.log('Serving from cache:', req.url);
          return cached;
        }
        
        // Otherwise fetch from network
        console.log('Fetching from network:', req.url);
        return fetch(req)
          .then(response => {
            // Cache successful responses
            if (response && response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(req, responseClone);
                })
                .catch(err => console.error('Cache put failed:', err));
            }
            return response;
          })
          .catch(err => {
            console.error('Fetch failed:', err);
            // Return cached index.html as fallback for navigation
            if (req.mode === 'navigate') {
              return caches.match('/index.html');
            }
            throw err;
          });
      })
  );
});