/**
 * Enhanced Service Worker for Tenant Frontend
 * Provides real-time cache invalidation, intelligent caching, and offline support
 */

const CACHE_NAME = 'tenant-app-v2.0.0';
const DYNAMIC_CACHE = 'tenant-dynamic-v2.0.0';
const API_CACHE = 'tenant-api-v2.0.0';

// Cache invalidation state
let cacheInvalidationQueue = [];
let isOnline = navigator.onLine;

// URLs to cache immediately
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/assets/index.js',
  '/assets/index.css'
];

// API endpoints that benefit from caching
const CACHEABLE_API_PATTERNS = [
  '/api/tenant/dashboard',
  '/api/tenant/customers',
  '/api/tenant/products',
  '/api/tenant/invoices',
  '/api/tenant/reports'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing tenant service worker v2.0.0');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating tenant service worker v2.0.0');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && 
              cacheName !== DYNAMIC_CACHE && 
              cacheName !== API_CACHE) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event - handle requests with intelligent caching
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets
  if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request));
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Default handling
  event.respondWith(fetch(request));
});

// Handle API requests with caching
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const isCacheable = CACHEABLE_API_PATTERNS.some(pattern => 
    url.pathname.includes(pattern)
  );

  if (!isCacheable) {
    return fetch(request);
  }

  try {
    // Try network first for fresh data
    if (isOnline) {
      const networkResponse = await fetch(request);
      
      if (networkResponse.ok) {
        // Clone and cache the response
        const responseClone = networkResponse.clone();
        const cache = await caches.open(API_CACHE);
        await cache.put(request, responseClone);
        
        // Add cache headers
        const response = networkResponse.clone();
        response.headers.set('X-Served-By', 'network');
        response.headers.set('X-Cache-Time', new Date().toISOString());
        
        return response;
      }
    }

    // Fallback to cache
    const cachedResponse = await caches.match(request, { cacheName: API_CACHE });
    if (cachedResponse) {
      cachedResponse.headers.set('X-Served-By', 'cache');
      return cachedResponse;
    }

    // If no cache and offline, return offline response
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'No cached data available',
        offline: true 
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Service Worker: API request failed:', error);
    
    // Try to serve from cache
    const cachedResponse = await caches.match(request, { cacheName: API_CACHE });
    if (cachedResponse) {
      cachedResponse.headers.set('X-Served-By', 'cache-fallback');
      return cachedResponse;
    }

    return new Response(
      JSON.stringify({ 
        error: 'Network Error', 
        message: error.message 
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  try {
    // Check cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // If not in cache, fetch from network
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache the response
      const cache = await caches.open(DYNAMIC_CACHE);
      await cache.put(request, networkResponse.clone());
    }

    return networkResponse;

  } catch (error) {
    console.error('Service Worker: Static asset failed:', error);
    
    // Return fallback for essential files
    if (request.url.includes('.js') || request.url.includes('.css')) {
      return new Response('/* Offline fallback */', {
        headers: { 'Content-Type': 'text/css' }
      });
    }

    throw error;
  }
}

// Handle navigation requests with app shell pattern
async function handleNavigationRequest(request) {
  try {
    // Try network first
    if (isOnline) {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        return networkResponse;
      }
    }

    // Fallback to cached app shell
    const cachedResponse = await caches.match('/');
    if (cachedResponse) {
      return cachedResponse;
    }

    // Ultimate fallback
    return new Response('App is offline', {
      status: 503,
      headers: { 'Content-Type': 'text/html' }
    });

  } catch (error) {
    console.error('Service Worker: Navigation failed:', error);
    
    const cachedResponse = await caches.match('/');
    return cachedResponse || new Response('App is offline', {
      status: 503,
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// Utility function to check if request is for static asset
function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/assets/') ||
         url.pathname.includes('.js') ||
         url.pathname.includes('.css') ||
         url.pathname.includes('.png') ||
         url.pathname.includes('.jpg') ||
         url.pathname.includes('.svg') ||
         url.pathname.includes('.woff');
}

// Listen for messages from main thread
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'CACHE_INVALIDATION':
      handleCacheInvalidation(payload);
      break;

    case 'CLEAR_CACHE':
      clearSpecificCache(payload.cacheKey);
      break;

    case 'CLEAR_ALL_CACHE':
      clearAllCaches();
      break;

    case 'GET_CACHE_STATS':
      getCacheStats().then(stats => {
        event.ports[0]?.postMessage(stats);
      });
      break;

    case 'SYNC_OFFLINE_DATA':
      syncOfflineData();
      break;

    default:
      console.log('Service Worker: Unknown message type:', type);
  }
});

// Handle cache invalidation from WebSocket
async function handleCacheInvalidation(payload) {
  const { cacheKey, tenantId, updateType } = payload;
  
  console.log('Service Worker: Cache invalidation received:', cacheKey);

  // Queue invalidation if offline
  if (!isOnline) {
    cacheInvalidationQueue.push(payload);
    return;
  }

  try {
    if (cacheKey === 'all') {
      await clearAllCaches();
    } else {
      await clearSpecificCache(cacheKey);
    }

    // Notify all clients about cache invalidation
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'CACHE_INVALIDATED',
        payload: { cacheKey, tenantId, updateType }
      });
    });

  } catch (error) {
    console.error('Service Worker: Cache invalidation failed:', error);
  }
}

// Clear specific cache entries
async function clearSpecificCache(cacheKey) {
  const cacheNames = await caches.keys();
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    
    for (const request of requests) {
      const url = new URL(request.url);
      if (url.pathname.includes(cacheKey) || 
          request.url.includes(cacheKey)) {
        await cache.delete(request);
        console.log('Service Worker: Deleted cached request:', request.url);
      }
    }
  }
}

// Clear all caches
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => {
      if (cacheName.startsWith('tenant-')) {
        return caches.delete(cacheName);
      }
    })
  );
  console.log('Service Worker: All tenant caches cleared');
}

// Get cache statistics
async function getCacheStats() {
  const cacheNames = await caches.keys();
  let totalSize = 0;
  let totalEntries = 0;

  for (const cacheName of cacheNames) {
    if (cacheName.startsWith('tenant-')) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      totalEntries += requests.length;

      // Estimate size (rough calculation)
      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const text = await response.text();
          totalSize += text.length;
        }
      }
    }
  }

  return {
    totalSize,
    totalEntries,
    cacheNames: cacheNames.filter(name => name.startsWith('tenant-')),
    lastUpdated: new Date().toISOString(),
    isOnline
  };
}

// Sync offline data when back online
async function syncOfflineData() {
  if (!isOnline) return;

  console.log('Service Worker: Syncing offline data');

  // Process queued cache invalidations
  for (const invalidation of cacheInvalidationQueue) {
    await handleCacheInvalidation(invalidation);
  }
  cacheInvalidationQueue = [];

  // Notify clients about sync completion
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'OFFLINE_SYNC_COMPLETE',
      payload: { timestamp: new Date().toISOString() }
    });
  });
}

// Track online/offline status
self.addEventListener('online', () => {
  isOnline = true;
  console.log('Service Worker: App is online');
  syncOfflineData();
});

self.addEventListener('offline', () => {
  isOnline = false;
  console.log('Service Worker: App is offline');
});

// Background sync for future enhancements
self.addEventListener('sync', (event) => {
  if (event.tag === 'tenant-data-sync') {
    event.waitUntil(syncOfflineData());
  }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'tenant-cache-cleanup') {
    event.waitUntil(cleanupOldCache());
  }
});

// Cleanup old cache entries
async function cleanupOldCache() {
  const cacheNames = await caches.keys();
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours

  for (const cacheName of cacheNames) {
    if (cacheName.startsWith('tenant-')) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();

      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const cacheTime = response.headers.get('X-Cache-Time');
          if (cacheTime) {
            const cacheTimestamp = new Date(cacheTime).getTime();
            if (now - cacheTimestamp > maxAge) {
              await cache.delete(request);
              console.log('Service Worker: Cleaned up old cache entry:', request.url);
            }
          }
        }
      }
    }
  }
}

console.log('Service Worker: Tenant service worker v2.0.0 loaded');