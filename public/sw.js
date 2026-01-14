// Service Worker for MCard Manager PWA - ULTRA-FAST CACHING
const CACHE_VERSION = 'v10';
const CACHE_NAME = `mcard-manager-${CACHE_VERSION}`;
const RUNTIME_CACHE = `mcard-runtime-${CACHE_VERSION}`;
const IMAGE_CACHE = `mcard-images-${CACHE_VERSION}`;
const CDN_CACHE = `mcard-cdn-${CACHE_VERSION}`;

// Critical assets for INSTANT loading (cache-first, never expire)
const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  '/public/manifest.json'
];

// App shell assets (cache-first, aggressive caching)
// Only include files that actually exist
// NOTE: CardViewer.js and ContentTypeDetector.js excluded to allow hot updates
const APP_SHELL_ASSETS = [
  '/public/css/mcard-manager.css',
  '/public/css/content-renderers.css',
  '/public/js/app-bootstrap.js',
  '/public/js/mcard/MCardManager.js',
  '/public/js/mcard/UIComponents.js',
  '/public/js/renderers/MarkdownRenderer.js',
  '/public/js/renderers/ImageRenderer.js',
  '/public/js/performance-monitor.js'
];

// CDN resources (cache-first, long expiry)
const CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/lucide-static@latest/font/lucide.min.css',
  'https://cdn.jsdelivr.net/npm/marked@11.1.1/marked.min.js',
  'https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js',
  'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js',
  'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css',
  'https://unpkg.com/mcard-js@latest/dist/mcard.min.js'
];

// Combine all for initial precache
const PRECACHE_ASSETS = [...CRITICAL_ASSETS, ...APP_SHELL_ASSETS];

// Preload CDN assets in background
const PRELOAD_CDN = true;

// Install event - cache assets AGGRESSIVELY
self.addEventListener('install', (event) => {
  console.log('[SW] 🚀 Installing service worker with aggressive caching...');
  event.waitUntil(
    Promise.all([
      // Cache app shell immediately
      caches.open(CACHE_NAME).then((cache) => {
        console.log('[SW] 📦 Caching app shell (critical + assets)');
        return cache.addAll(PRECACHE_ASSETS);
      }),
      // Cache CDN assets in parallel for INSTANT second load
      PRELOAD_CDN ? caches.open(CDN_CACHE).then((cache) => {
        console.log('[SW] 🌐 Preloading CDN assets for instant second load...');
        return Promise.allSettled(
          CDN_ASSETS.map(url =>
            fetch(url)
              .then(response => {
                if (response.ok) {
                  console.log('[SW] ✅ Cached CDN:', url.split('/').pop());
                  return cache.put(url, response);
                }
              })
              .catch(err => console.log('[SW] ⚠️  CDN skip:', url.split('/').pop()))
          )
        );
      }) : Promise.resolve()
    ])
      .then(() => {
        console.log('[SW] ✅ Service worker installed - READY FOR INSTANT LOADING!');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] ❌ Installation failed:', error);
      })
  );
});

// Activate event - clean up old caches but keep current ones
self.addEventListener('activate', (event) => {
  console.log('[SW] ⚡ Activating service worker...');

  const currentCaches = [CACHE_NAME, RUNTIME_CACHE, IMAGE_CACHE, CDN_CACHE];

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => !currentCaches.includes(cacheName))
            .map((cacheName) => {
              console.log('[SW] 🗑️  Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] ✅ Service worker activated - TAKING CONTROL!');
        return self.clients.claim();
      })
  );
});

// Fetch event - optimized caching strategies
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

  // Skip Grafana Faro monitoring (causes CORS errors)
  if (url.hostname.includes('grafana.net')) {
    return;
  }

  // Strategy 1: Cache First (Critical Assets) - INSTANT LOADING ⚡
  if (CRITICAL_ASSETS.some(asset => url.pathname === asset)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          console.log('[SW] ⚡ INSTANT from cache:', url.pathname);
          // Update cache in background (stale-while-revalidate)
          fetch(request).then(response => {
            if (response && response.ok) {
              caches.open(CACHE_NAME).then(c => c.put(request, response.clone()));
            }
          }).catch(() => { });
          return cachedResponse;
        }
        // Not in cache, fetch and cache
        return fetch(request).then((response) => {
          if (response.ok) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(request, responseToCache));
          }
          return response;
        });
      })
    );
    return;
  }

  // Strategy 2: Cache First + Background Update (App Shell) - INSTANT + FRESH 🚀
  if (APP_SHELL_ASSETS.some(asset => url.pathname.includes(asset))) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        // Always update in background
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(c => {
              c.put(request, responseToCache);
              console.log('[SW] 🔄 Updated cache:', url.pathname.split('/').pop());
            });
          }
          return networkResponse;
        }).catch(() => cachedResponse);

        // Return cached INSTANTLY, update in background
        if (cachedResponse) {
          console.log('[SW] 🚀 INSTANT from cache:', url.pathname.split('/').pop());
          fetchPromise; // Trigger background update
          return cachedResponse;
        }

        // Not cached yet, wait for network
        return fetchPromise;
      })
    );
    return;
  }

  // Strategy 3: CDN Cache First (Long-lived external resources)
  if (url.hostname.includes('cdn.jsdelivr.net') ||
    url.hostname.includes('unpkg.com') ||
    url.hostname.includes('cdnjs.cloudflare.com')) {
    event.respondWith(
      caches.open(CDN_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log('[SW] 📦 CDN from cache:', url.hostname);
            return cachedResponse;
          }
          return fetch(request).then((response) => {
            if (response.ok) {
              cache.put(request, response.clone());
            }
            return response;
          });
        });
      })
    );
    return;
  }

  // Strategy 4: Images - Cache with size limit
  if (request.destination === 'image' || url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i)) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log('[SW] 🖼️  Image from cache');
            return cachedResponse;
          }
          return fetch(request).then((response) => {
            if (response.ok && response.headers.get('content-length') < 5000000) { // 5MB limit
              cache.put(request, response.clone());
            }
            return response;
          });
        });
      })
    );
    return;
  }

  // Strategy 5: Network First (Dynamic content, API calls)
  if (url.pathname.includes('/api/') || url.search) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            // Clone before using
            const responseToCache = response.clone();
            caches.open(RUNTIME_CACHE).then(c => c.put(request, responseToCache));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || new Response(
              JSON.stringify({ error: 'Offline - No cached data available' }),
              { headers: { 'Content-Type': 'application/json' } }
            );
          });
        })
    );
    return;
  }

  // Strategy 6: Runtime Cache (Everything else)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        console.log('[SW] 💾 Runtime cache hit');
        return cachedResponse;
      }

      return fetch(request).then((response) => {
        if (response && response.ok) {
          // Clone before using
          const responseToCache = response.clone();
          caches.open(RUNTIME_CACHE).then(c => c.put(request, responseToCache));
        }
        return response;
      }).catch((error) => {
        console.error('[SW] ❌ Fetch failed:', error);

        // Offline fallback for navigation
        if (request.mode === 'navigate') {
          return caches.match('/mcard-manager.html');
        }

        throw error;
      });
    })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-cards') {
    event.waitUntil(
      // Implement sync logic here
      Promise.resolve()
    );
  }
});

// Push notifications (optional)
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  const options = {
    body: event.data ? event.data.text() : 'New update available',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification('MCard Manager', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  event.notification.close();

  event.waitUntil(
    clients.openWindow('/mcard-manager.html')
  );
});

// Message handler for communication with main app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});
