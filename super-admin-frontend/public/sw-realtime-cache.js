/**
 * Enhanced Service Worker with Real-Time Cache Management
 * Supports WebSocket communication for cache invalidation and background optimization
 */

const CACHE_VERSION = '3.0.0';
const CACHE_NAME = `hesaabplus-v${CACHE_VERSION}`;
const THEME_CACHE_NAME = `theme-cache-v${CACHE_VERSION}`;
const ASSETS_CACHE_NAME = `assets-cache-v${CACHE_VERSION}`;
const API_CACHE_NAME = `api-cache-v${CACHE_VERSION}`;
const REALTIME_CACHE_NAME = `realtime-cache-v${CACHE_VERSION}`;

// Enhanced cache configuration with environment awareness
const CACHE_CONFIG = {
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  maxCacheSize: 50 * 1024 * 1024, // 50MB
  compressionThreshold: 1024, // 1KB
  cleanupInterval: 30 * 60 * 1000, // 30 minutes
  realtimeInvalidation: true,
  backgroundSync: true,
  environment: self.registration?.scope?.includes('localhost') ? 'development' : 'production'
};

// Real-time cache invalidation state
let invalidationQueue = [];
let lastInvalidationCheck = 0;

// Cache statistics
let cacheStats = {
  hits: 0,
  misses: 0,
  invalidations: 0,
  lastUpdate: Date.now()
};

// Install event with enhanced initialization
self.addEventListener('install', (event) => {
  console.log('Enhanced Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      // Pre-cache critical resources
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll([
          '/',
          '/index.html',
          '/manifest.json'
        ]);
      }),
      
      // Initialize real-time cache
      caches.open(REALTIME_CACHE_NAME),
      
      // Setup cache monitoring
      initializeCacheMonitoring(),
    ])
  );
  
  self.skipWaiting();
});

// Activate event with cleanup and WebSocket setup
self.addEventListener('activate', (event) => {
  console.log('Enhanced Service Worker activating...');
  
  event.waitUntil(
    Promise.all([
      // Cleanup old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!cacheName.includes(CACHE_VERSION)) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Start background optimization
      startBackgroundOptimization(),
    ])
  );
  
  self.clients.claim();
  
  // Setup real-time invalidation monitoring
  setupRealtimeInvalidation();
});

// Enhanced fetch event with real-time cache management
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Handle API requests with real-time caching
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(event.request));
    return;
  }
  
  // Handle static assets
  if (isStaticAsset(url.pathname)) {
    event.respondWith(handleStaticAsset(event.request));
    return;
  }
  
  // Handle theme requests
  if (url.pathname.includes('/theme') || url.pathname.includes('/css')) {
    event.respondWith(handleThemeRequest(event.request));
    return;
  }
  
  // Default handling
  event.respondWith(handleDefaultRequest(event.request));
});

// Message event for communication with main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'CACHE_INVALIDATE':
      handleCacheInvalidation(data.cacheKey, data.pattern);
      event.ports[0]?.postMessage({ success: true });
      break;
      
    case 'CACHE_CLEAR_ALL':
      clearAllCaches().then(() => {
        event.ports[0]?.postMessage({ success: true });
      });
      break;
      
    case 'GET_CACHE_STATS':
      event.ports[0]?.postMessage({ success: true, stats: getCacheStats() });
      break;
      
    case 'PRELOAD_RESOURCES':
      preloadResources(data.resources);
      event.ports[0]?.postMessage({ success: true });
      break;
      
    case 'REALTIME_INVALIDATION':
      processRealtimeInvalidation(data);
      event.ports[0]?.postMessage({ success: true });
      break;
      
    default:
      console.warn('Unknown message type:', type);
  }
});

// Handle API requests with intelligent caching
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const cache = await caches.open(API_CACHE_NAME);
  
  // Check for real-time invalidation
  if (shouldInvalidateCache(url.pathname)) {
    await cache.delete(request);
  }
  
  try {
    // Try cache first for GET requests
    if (request.method === 'GET') {
      const cachedResponse = await cache.match(request);
      if (cachedResponse && !isExpired(cachedResponse)) {
        cacheStats.hits++;
        return cachedResponse;
      }
    }
    
    // Fetch from network
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok && request.method === 'GET') {
      // Cache successful GET responses
      const responseToCache = networkResponse.clone();
      await cache.put(request, responseToCache);
    }
    
    cacheStats.misses++;
    return networkResponse;
    
  } catch (error) {
    // Fallback to cache if network fails
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return error response
    return new Response('Network error', { status: 503 });
  }
}

// Handle static assets with aggressive caching
async function handleStaticAsset(request) {
  const cache = await caches.open(ASSETS_CACHE_NAME);
  
  try {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      cacheStats.hits++;
      // Serve from cache and update in background
      updateAssetInBackground(request, cache);
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    
    cacheStats.misses++;
    return networkResponse;
    
  } catch (error) {
    const cachedResponse = await cache.match(request);
    return cachedResponse || new Response('Asset not found', { status: 404 });
  }
}

// Handle theme requests with compression
async function handleThemeRequest(request) {
  const cache = await caches.open(THEME_CACHE_NAME);
  
  try {
    const cachedResponse = await cache.match(request);
    if (cachedResponse && !isExpired(cachedResponse)) {
      cacheStats.hits++;
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Compress and cache theme data
      const compressedResponse = await compressResponse(networkResponse.clone());
      await cache.put(request, compressedResponse);
    }
    
    cacheStats.misses++;
    return networkResponse;
    
  } catch (error) {
    const cachedResponse = await cache.match(request);
    return cachedResponse || new Response('Theme not found', { status: 404 });
  }
}

// Default request handler
async function handleDefaultRequest(request) {
  try {
    return await fetch(request);
  } catch (error) {
    // Serve offline page if available
    const cache = await caches.open(CACHE_NAME);
    const offlineResponse = await cache.match('/');
    return offlineResponse || new Response('Offline', { status: 503 });
  }
}

// Real-time cache invalidation
function setupRealtimeInvalidation() {
  // Check for invalidation messages periodically
  setInterval(() => {
    processInvalidationQueue();
  }, 5000); // Check every 5 seconds
  
  // Listen for messages from main thread
  self.addEventListener('message', (event) => {
    if (event.data.type === 'REALTIME_INVALIDATION') {
      invalidationQueue.push(event.data.data);
    }
  });
}

function processRealtimeInvalidation(data) {
  const { cacheKey, pattern, timestamp } = data;
  
  if (timestamp > lastInvalidationCheck) {
    handleCacheInvalidation(cacheKey, pattern);
    lastInvalidationCheck = timestamp;
    cacheStats.invalidations++;
  }
}

async function handleCacheInvalidation(cacheKey, pattern) {
  console.log('Processing cache invalidation:', cacheKey, pattern);
  
  const cacheNames = await caches.keys();
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    
    for (const request of requests) {
      const url = new URL(request.url);
      
      if (shouldInvalidateRequest(url, cacheKey, pattern)) {
        await cache.delete(request);
        console.log('Invalidated cache entry:', url.pathname);
      }
    }
  }
  
  // Notify clients about cache invalidation
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'CACHE_INVALIDATED',
      cacheKey,
      pattern,
      timestamp: Date.now()
    });
  });
}

function shouldInvalidateRequest(url, cacheKey, pattern) {
  if (cacheKey === 'all') {
    return true;
  }
  
  if (pattern) {
    return new RegExp(pattern).test(url.pathname);
  }
  
  return url.pathname.includes(cacheKey);
}

function shouldInvalidateCache(pathname) {
  // Check if this path should trigger cache invalidation
  const invalidationTriggers = [
    '/api/super-admin/tenants',
    '/api/dashboard-stats',
    '/api/system-health'
  ];
  
  return invalidationTriggers.some(trigger => pathname.includes(trigger));
}

// Background optimization
function startBackgroundOptimization() {
  setInterval(() => {
    optimizeCaches();
  }, CACHE_CONFIG.cleanupInterval);
}

async function optimizeCaches() {
  try {
    const cacheNames = await caches.keys();
    
    for (const cacheName of cacheNames) {
      await optimizeCache(cacheName);
    }
    
    console.log('Cache optimization completed');
  } catch (error) {
    console.error('Cache optimization failed:', error);
  }
}

async function optimizeCache(cacheName) {
  const cache = await caches.open(cacheName);
  const requests = await cache.keys();
  const now = Date.now();
  
  for (const request of requests) {
    const response = await cache.match(request);
    
    if (response && isExpired(response)) {
      await cache.delete(request);
    }
  }
}

// Utility functions
function isExpired(response) {
  const dateHeader = response.headers.get('date');
  if (!dateHeader) return false;
  
  const responseDate = new Date(dateHeader);
  return (Date.now() - responseDate.getTime()) > CACHE_CONFIG.maxAge;
}

function isStaticAsset(pathname) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.woff', '.woff2'];
  return staticExtensions.some(ext => pathname.endsWith(ext));
}

async function compressResponse(response) {
  const text = await response.text();
  
  if (text.length > CACHE_CONFIG.compressionThreshold) {
    // Simple compression - in production, use proper compression
    const compressed = btoa(text);
    
    return new Response(compressed, {
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        'x-compressed': 'true',
        'x-original-size': text.length.toString()
      }
    });
  }
  
  return response;
}

async function updateAssetInBackground(request, cache) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse);
    }
  } catch (error) {
    // Silent fail for background updates
  }
}

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  return Promise.all(cacheNames.map(name => caches.delete(name)));
}

function getCacheStats() {
  return {
    ...cacheStats,
    environment: CACHE_CONFIG.environment,
    version: CACHE_VERSION,
    lastUpdate: Date.now()
  };
}

function initializeCacheMonitoring() {
  // Reset stats
  cacheStats = {
    hits: 0,
    misses: 0,
    invalidations: 0,
    lastUpdate: Date.now()
  };
  
  return Promise.resolve();
}

function processInvalidationQueue() {
  if (invalidationQueue.length > 0) {
    const items = invalidationQueue.splice(0);
    items.forEach(item => processRealtimeInvalidation(item));
  }
}

async function preloadResources(resources) {
  const cache = await caches.open(CACHE_NAME);
  
  for (const resource of resources) {
    try {
      const response = await fetch(resource);
      if (response.ok) {
        await cache.put(resource, response);
      }
    } catch (error) {
      console.warn('Failed to preload resource:', resource, error);
    }
  }
}

console.log('Enhanced Service Worker loaded successfully');