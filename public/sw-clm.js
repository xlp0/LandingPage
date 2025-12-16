/**
 * Service Worker for PKC CLM Dashboard
 * Provides offline support, caching, and PWA functionality
 */

const CACHE_VERSION = 'clm-v1';
const CACHE_NAME = `pkc-clm-${CACHE_VERSION}`;
const RUNTIME_CACHE = `pkc-clm-runtime-${CACHE_VERSION}`;

// Critical assets to cache on install
const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  '/index-clm-dashboard.html'
];

// CDN resources to cache
const CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/redux@4.2.1/+esm',
  'https://cdn.jsdelivr.net/npm/redux-thunk@2.4.2/+esm',
  'https://cdn.jsdelivr.net/npm/immer@9.0.21/+esm',
  'https://cdn.jsdelivr.net/npm/reselect@4.1.8/+esm',
  'https://cdn.jsdelivr.net/npm/@reduxjs/toolkit@1.9.7/+esm'
];

// Install event - cache critical assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching critical assets...');
      return cache.addAll(CRITICAL_ASSETS).catch((error) => {
        console.error('[SW] Failed to cache critical assets:', error);
      });
    }).then(() => {
      console.log('[SW] ✓ Service worker installed');
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName.startsWith('pkc-clm-') && cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] ✓ Service worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip non-HTTP(S) schemes (chrome-extension, data, blob, etc.)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Skip WebSocket and API requests
  if (url.pathname.startsWith('/ws/') || url.pathname.startsWith('/api/')) {
    return;
  }

  // Skip Grafana Faro monitoring (causes CORS errors)
  if (url.hostname.includes('grafana.net')) {
    return;
  }

  // Strategy 1: Cache First for HTML files
  if (request.destination === 'document' || url.pathname.endsWith('.html')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          console.log('[SW] ✓ Serving from cache:', url.pathname);
          
          // Update cache in background
          fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.ok) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, networkResponse.clone());
              });
            }
          }).catch(() => {
            // Network failed, but we have cache
          });
          
          return cachedResponse;
        }
        
        // Not in cache, fetch from network
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        }).catch((error) => {
          console.error('[SW] ❌ Fetch failed:', url.pathname, error);
          
          // Return offline page if available
          return caches.match('/offline.html').then((offlineResponse) => {
            return offlineResponse || new Response('Offline - Please check your connection', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
        });
      })
    );
    return;
  }

  // Strategy 2: Network First for CDN resources
  if (url.origin !== location.origin) {
    event.respondWith(
      fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.ok) {
          const responseClone = networkResponse.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Network failed, try cache
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log('[SW] ✓ Serving CDN from cache:', url.href);
            return cachedResponse;
          }
          throw new Error('No cached response available');
        });
      })
    );
    return;
  }

  // Strategy 3: Cache First for static assets
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.ok) {
          const responseClone = networkResponse.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      });
    })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-data') {
    event.waitUntil(
      // Implement your sync logic here
      Promise.resolve()
    );
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'New update available',
    icon: '/public/icons/icon-192x192.png',
    badge: '/public/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };
  
  event.waitUntil(
    self.registration.showNotification('PKC CLM Dashboard', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});

// Message handler for communication with main app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(RUNTIME_CACHE).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  }
  
  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName.startsWith('pkc-clm-')) {
              return caches.delete(cacheName);
            }
          })
        );
      })
    );
  }
});

console.log('[SW] Service worker script loaded');
