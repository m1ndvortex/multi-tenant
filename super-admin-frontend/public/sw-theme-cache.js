/**
 * Advanced Service Worker for Theme Caching and Asset Optimization
 * Provides offline theme support, background optimization, and intelligent preloading
 */

const CACHE_NAME = 'theme-cache-v2';
const THEME_CACHE_NAME = 'cybersecurity-themes-v2';
const ASSETS_CACHE_NAME = 'theme-assets-v2';
const ANIMATION_CACHE_NAME = 'animation-configs-v2';
const PRELOAD_CACHE_NAME = 'preloaded-assets-v2';

// Advanced cache configuration
const CACHE_CONFIG = {
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  maxEntries: 200,
  compressionEnabled: true,
  brotliEnabled: true,
  predictivePreloading: true,
  backgroundOptimization: true,
  compressionThreshold: 1024, // Compress assets larger than 1KB
  maxCacheSize: 50 * 1024 * 1024, // 50MB total cache limit
  cleanupInterval: 60 * 60 * 1000, // Cleanup every hour
};

// Advanced asset compression utilities
const CompressionUtils = {
  // Check if Brotli compression is supported
  supportsBrotli: () => {
    return 'CompressionStream' in self && 'DecompressionStream' in self;
  },

  // Compress data using available compression
  async compress(data, format = 'gzip') {
    if (format === 'brotli' && this.supportsBrotli()) {
      const stream = new CompressionStream('gzip'); // Fallback to gzip for now
      const writer = stream.writable.getWriter();
      const reader = stream.readable.getReader();
      
      writer.write(new TextEncoder().encode(data));
      writer.close();
      
      const chunks = [];
      let done = false;
      
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) chunks.push(value);
      }
      
      return new Uint8Array(chunks.reduce((acc, chunk) => [...acc, ...chunk], []));
    }
    
    // Fallback to simple text compression
    return new TextEncoder().encode(this.compressText(data));
  },

  // Simple text compression
  compressText(text) {
    return text
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
      .replace(/\s+/g, ' ') // Collapse whitespace
      .replace(/;\s*}/g, '}') // Remove unnecessary semicolons
      .replace(/\s*{\s*/g, '{') // Clean up braces
      .replace(/\s*}\s*/g, '}')
      .replace(/\s*;\s*/g, ';')
      .replace(/\s*:\s*/g, ':')
      .trim();
  },

  // Calculate compression ratio
  getCompressionRatio(original, compressed) {
    const originalSize = typeof original === 'string' ? original.length : original.byteLength;
    const compressedSize = typeof compressed === 'string' ? compressed.length : compressed.byteLength;
    return compressedSize / originalSize;
  }
};

// Predictive preloading system
const PredictivePreloader = {
  navigationPatterns: new Map(),
  
  // Record navigation pattern
  recordNavigation(from, to) {
    const key = `${from}->${to}`;
    const existing = this.navigationPatterns.get(key) || { count: 0, lastSeen: 0 };
    existing.count++;
    existing.lastSeen = Date.now();
    this.navigationPatterns.set(key, existing);
  },
  
  // Get likely next destinations
  getPredictedRoutes(currentRoute, limit = 3) {
    const patterns = Array.from(this.navigationPatterns.entries())
      .filter(([key]) => key.startsWith(currentRoute + '->'))
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, limit)
      .map(([key]) => key.split('->')[1]);
    
    return patterns;
  },
  
  // Preload assets for predicted routes
  async preloadForRoutes(routes) {
    const routeAssets = {
      '/dashboard': ['critical-theme.css', 'dashboard-animations.js', 'chart-configs.json'],
      '/tenants': ['critical-theme.css', 'table-animations.js', 'form-styles.css'],
      '/analytics': ['critical-theme.css', 'chart-animations.js', 'visualization-configs.json'],
      '/subscriptions': ['critical-theme.css', 'subscription-animations.js', 'payment-styles.css'],
    };
    
    for (const route of routes) {
      const assets = routeAssets[route] || [];
      for (const asset of assets) {
        await this.preloadAsset(asset);
      }
    }
  },
  
  // Preload individual asset
  async preloadAsset(assetPath) {
    try {
      const cache = await caches.open(PRELOAD_CACHE_NAME);
      const cached = await cache.match(assetPath);
      
      if (!cached) {
        const response = await fetch(assetPath);
        if (response.ok) {
          await cache.put(assetPath, response);
        }
      }
    } catch (error) {
      console.warn('Failed to preload asset:', assetPath, error);
    }
  }
};

// Background optimization manager
const BackgroundOptimizer = {
  isOptimizing: false,
  lastOptimization: 0,
  
  // Start background optimization
  async optimize() {
    if (this.isOptimizing || Date.now() - this.lastOptimization < CACHE_CONFIG.cleanupInterval) {
      return;
    }
    
    this.isOptimizing = true;
    this.lastOptimization = Date.now();
    
    try {
      await Promise.all([
        this.compressUncompressedAssets(),
        this.cleanupExpiredEntries(),
        this.optimizeCacheSize(),
        this.updateCompressionStats(),
      ]);
      
      // Notify clients about optimization completion
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'OPTIMIZATION_COMPLETE',
          data: { timestamp: Date.now() }
        });
      });
      
    } catch (error) {
      console.warn('Background optimization failed:', error);
    } finally {
      this.isOptimizing = false;
    }
  },
  
  // Compress uncompressed assets
  async compressUncompressedAssets() {
    const cacheNames = [THEME_CACHE_NAME, ASSETS_CACHE_NAME, ANIMATION_CACHE_NAME];
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      
      for (const request of requests) {
        const response = await cache.match(request);
        if (response && !response.headers.get('x-compressed')) {
          await this.compressAndStoreResponse(cache, request, response);
        }
      }
    }
  },
  
  // Compress and store response
  async compressAndStoreResponse(cache, request, response) {
    try {
      const data = await response.text();
      
      if (data.length > CACHE_CONFIG.compressionThreshold) {
        const compressed = CompressionUtils.compressText(data);
        const compressionRatio = CompressionUtils.getCompressionRatio(data, compressed);
        
        const compressedResponse = new Response(compressed, {
          headers: {
            ...Object.fromEntries(response.headers.entries()),
            'x-compressed': 'true',
            'x-compression-ratio': compressionRatio.toString(),
            'x-original-size': data.length.toString(),
          },
        });
        
        await cache.put(request, compressedResponse);
      }
    } catch (error) {
      console.warn('Failed to compress response:', error);
    }
  },
  
  // Clean up expired entries
  async cleanupExpiredEntries() {
    const cacheNames = await caches.keys();
    const cutoff = Date.now() - CACHE_CONFIG.maxAge;
    
    for (const cacheName of cacheNames) {
      if (cacheName.includes('theme') || cacheName.includes('assets')) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        
        for (const request of requests) {
          const response = await cache.match(request);
          if (response) {
            const dateHeader = response.headers.get('date');
            if (dateHeader) {
              const responseDate = new Date(dateHeader);
              if (responseDate.getTime() < cutoff) {
                await cache.delete(request);
              }
            }
          }
        }
      }
    }
  },
  
  // Optimize cache size
  async optimizeCacheSize() {
    const cacheNames = await caches.keys();
    let totalSize = 0;
    const cacheEntries = [];
    
    // Calculate total cache size
    for (const cacheName of cacheNames) {
      if (cacheName.includes('theme') || cacheName.includes('assets')) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        
        for (const request of requests) {
          const response = await cache.match(request);
          if (response) {
            const size = parseInt(response.headers.get('content-length') || '0');
            totalSize += size;
            cacheEntries.push({
              cacheName,
              request,
              size,
              lastAccessed: new Date(response.headers.get('date') || 0),
            });
          }
        }
      }
    }
    
    // Remove oldest entries if over limit
    if (totalSize > CACHE_CONFIG.maxCacheSize) {
      cacheEntries.sort((a, b) => a.lastAccessed - b.lastAccessed);
      
      let removedSize = 0;
      const targetReduction = totalSize - CACHE_CONFIG.maxCacheSize;
      
      for (const entry of cacheEntries) {
        if (removedSize >= targetReduction) break;
        
        const cache = await caches.open(entry.cacheName);
        await cache.delete(entry.request);
        removedSize += entry.size;
      }
    }
  },
  
  // Update compression statistics
  async updateCompressionStats() {
    const stats = {
      totalEntries: 0,
      compressedEntries: 0,
      totalOriginalSize: 0,
      totalCompressedSize: 0,
      averageCompressionRatio: 0,
    };
    
    const cacheNames = await caches.keys();
    
    for (const cacheName of cacheNames) {
      if (cacheName.includes('theme') || cacheName.includes('assets')) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        
        for (const request of requests) {
          const response = await cache.match(request);
          if (response) {
            stats.totalEntries++;
            
            if (response.headers.get('x-compressed')) {
              stats.compressedEntries++;
              const originalSize = parseInt(response.headers.get('x-original-size') || '0');
              const compressionRatio = parseFloat(response.headers.get('x-compression-ratio') || '1');
              
              stats.totalOriginalSize += originalSize;
              stats.totalCompressedSize += originalSize * compressionRatio;
            }
          }
        }
      }
    }
    
    if (stats.compressedEntries > 0) {
      stats.averageCompressionRatio = stats.totalCompressedSize / stats.totalOriginalSize;
    }
    
    // Store stats for retrieval
    const cache = await caches.open(CACHE_NAME);
    await cache.put(
      new Request('/sw-stats'),
      new Response(JSON.stringify(stats), {
        headers: { 'Content-Type': 'application/json' }
      })
    );
  }
};

// Install event - cache essential theme assets with advanced preloading
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      // Cache critical assets
      caches.open(ASSETS_CACHE_NAME).then((cache) => {
        return cache.addAll([
          '/fonts/cybersecurity-font.woff2',
          '/images/cyber-bg.webp',
          '/css/critical-theme.css',
        ]);
      }),
      
      // Cache critical animation configurations
      caches.open(ANIMATION_CACHE_NAME).then((cache) => {
        const criticalAnimations = {
          pageTransition: {
            initial: { opacity: 0, y: 20, scale: 0.98 },
            animate: { opacity: 1, y: 0, scale: 1 },
            exit: { opacity: 0, y: -20, scale: 0.98 },
            transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
          },
          cardEntrance: {
            initial: { opacity: 0, y: 30, scale: 0.95 },
            animate: { opacity: 1, y: 0, scale: 1 },
            transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
          }
        };
        
        return cache.put(
          new Request('/critical-animations'),
          new Response(JSON.stringify(criticalAnimations), {
            headers: { 'Content-Type': 'application/json' }
          })
        );
      }),
    ])
  );
  self.skipWaiting();
});

// Activate event - cleanup old caches and start background optimization
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Cleanup old cache versions
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== THEME_CACHE_NAME && 
                cacheName !== ASSETS_CACHE_NAME &&
                cacheName !== ANIMATION_CACHE_NAME &&
                cacheName !== PRELOAD_CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Initialize background optimization
      BackgroundOptimizer.optimize(),
    ])
  );
  
  self.clients.claim();
  
  // Start periodic background optimization
  setInterval(() => {
    BackgroundOptimizer.optimize();
  }, CACHE_CONFIG.cleanupInterval);
});

// Fetch event - handle theme requests with advanced optimization
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Handle theme API requests
  if (url.pathname.includes('/api/theme') || url.pathname.includes('/theme-cache')) {
    event.respondWith(handleThemeRequest(event.request));
    return;
  }
  
  // Handle animation configuration requests
  if (url.pathname.includes('/animation-config') || url.pathname.includes('/critical-animations')) {
    event.respondWith(handleAnimationRequest(event.request));
    return;
  }
  
  // Handle static theme assets
  if (isThemeAsset(url.pathname)) {
    event.respondWith(handleAssetRequest(event.request));
    return;
  }
  
  // Handle preloaded assets
  if (url.pathname.includes('/preload/')) {
    event.respondWith(handlePreloadRequest(event.request));
    return;
  }
  
  // Handle service worker stats
  if (url.pathname === '/sw-stats') {
    event.respondWith(handleStatsRequest(event.request));
    return;
  }
});

// Handle theme-specific requests with advanced caching
async function handleThemeRequest(request) {
  const cache = await caches.open(THEME_CACHE_NAME);
  
  try {
    // Try cache first
    const cachedResponse = await cache.match(request);
    if (cachedResponse && !isExpired(cachedResponse)) {
      // Update access time for LRU
      updateAccessTime(cache, request, cachedResponse);
      return cachedResponse;
    }
    
    // Fetch from network
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Clone and potentially compress the response
      const responseToCache = await processAndCacheResponse(networkResponse.clone());
      await cache.put(request, responseToCache);
      
      // Cleanup old entries
      await cleanupCache(cache);
      
      // Trigger predictive preloading
      if (CACHE_CONFIG.predictivePreloading) {
        const url = new URL(request.url);
        const route = url.pathname;
        const predicted = PredictivePreloader.getPredictedRoutes(route);
        PredictivePreloader.preloadForRoutes(predicted);
      }
    }
    
    return networkResponse;
  } catch (error) {
    // Return cached version if available, even if expired
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return fallback theme
    return createFallbackThemeResponse();
  }
}

// Handle animation configuration requests
async function handleAnimationRequest(request) {
  const cache = await caches.open(ANIMATION_CACHE_NAME);
  
  try {
    const cachedResponse = await cache.match(request);
    if (cachedResponse && !isExpired(cachedResponse)) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const responseToCache = await processAndCacheResponse(networkResponse.clone());
      await cache.put(request, responseToCache);
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return fallback animation config
    return createFallbackAnimationResponse();
  }
}

// Handle preloaded asset requests
async function handlePreloadRequest(request) {
  const cache = await caches.open(PRELOAD_CACHE_NAME);
  
  try {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    return new Response('Preloaded asset not available', { status: 404 });
  }
}

// Handle service worker statistics requests
async function handleStatsRequest(request) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const cachedStats = await cache.match(request);
    
    if (cachedStats) {
      return cachedStats;
    }
    
    // Generate fresh stats
    const stats = await generateFreshStats();
    const response = new Response(JSON.stringify(stats), {
      headers: { 'Content-Type': 'application/json' }
    });
    
    await cache.put(request, response.clone());
    return response;
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Stats unavailable' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Process and potentially compress response
async function processAndCacheResponse(response) {
  const data = await response.text();
  
  if (CACHE_CONFIG.compressionEnabled && data.length > CACHE_CONFIG.compressionThreshold) {
    const compressed = CompressionUtils.compressText(data);
    const compressionRatio = CompressionUtils.getCompressionRatio(data, compressed);
    
    return new Response(compressed, {
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        'x-compressed': 'true',
        'x-compression-ratio': compressionRatio.toString(),
        'x-original-size': data.length.toString(),
        'date': new Date().toISOString(),
      },
    });
  }
  
  return new Response(data, {
    headers: {
      ...Object.fromEntries(response.headers.entries()),
      'date': new Date().toISOString(),
    },
  });
}

// Update access time for LRU cache management
async function updateAccessTime(cache, request, response) {
  const updatedResponse = new Response(await response.text(), {
    headers: {
      ...Object.fromEntries(response.headers.entries()),
      'x-last-accessed': Date.now().toString(),
    },
  });
  
  await cache.put(request, updatedResponse);
}

// Handle static asset requests
async function handleAssetRequest(request) {
  const cache = await caches.open(ASSETS_CACHE_NAME);
  
  try {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    return cachedResponse || new Response('Asset not available offline', { status: 404 });
  }
}

// Check if response is expired
function isExpired(response) {
  const dateHeader = response.headers.get('date');
  if (!dateHeader) return false;
  
  const responseDate = new Date(dateHeader);
  const now = new Date();
  
  return (now - responseDate) > CACHE_CONFIG.maxAge;
}

// Check if URL is a theme asset
function isThemeAsset(pathname) {
  const themeAssetPatterns = [
    /\/fonts\//,
    /\/images\/cyber-/,
    /\/css\/.*theme/,
    /\.woff2?$/,
    /\.webp$/,
  ];
  
  return themeAssetPatterns.some(pattern => pattern.test(pathname));
}

// Cleanup old cache entries
async function cleanupCache(cache) {
  const requests = await cache.keys();
  
  if (requests.length <= CACHE_CONFIG.maxEntries) {
    return;
  }
  
  // Sort by date and remove oldest entries
  const requestsWithDates = await Promise.all(
    requests.map(async (request) => {
      const response = await cache.match(request);
      const date = response.headers.get('date') || new Date(0).toISOString();
      return { request, date: new Date(date) };
    })
  );
  
  requestsWithDates.sort((a, b) => a.date - b.date);
  
  const toDelete = requestsWithDates.slice(0, requests.length - CACHE_CONFIG.maxEntries);
  
  await Promise.all(
    toDelete.map(({ request }) => cache.delete(request))
  );
}

// Create fallback theme response
function createFallbackThemeResponse() {
  const fallbackTheme = {
    colors: {
      primary: '#0B0E1A',
      secondary: '#1A1D29',
      accent: '#00D4FF',
    },
    css: `
      :root {
        --cyber-primary: #0B0E1A;
        --cyber-secondary: #1A1D29;
        --cyber-accent: #00D4FF;
      }
      .cyber-fallback {
        background: var(--cyber-primary);
        color: var(--cyber-accent);
      }
    `,
    fallback: true,
  };
  
  return new Response(JSON.stringify(fallbackTheme), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
  });
}

// Create fallback animation response
function createFallbackAnimationResponse() {
  const fallbackAnimations = {
    pageTransition: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.2 }
    },
    cardEntrance: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: { duration: 0.3 }
    },
    fallback: true,
  };
  
  return new Response(JSON.stringify(fallbackAnimations), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
  });
}

// Generate fresh statistics
async function generateFreshStats() {
  const cacheNames = await caches.keys();
  const stats = {
    themeEntries: 0,
    assetEntries: 0,
    animationEntries: 0,
    preloadEntries: 0,
    totalSize: 0,
    compressedEntries: 0,
    compressionRatio: 0,
    cacheHitRate: 0,
    lastOptimization: BackgroundOptimizer.lastOptimization,
    navigationPatterns: PredictivePreloader.navigationPatterns.size,
  };
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const size = parseInt(response.headers.get('content-length') || '0');
        stats.totalSize += size;
        
        if (cacheName.includes('theme')) {
          stats.themeEntries++;
        } else if (cacheName.includes('assets')) {
          stats.assetEntries++;
        } else if (cacheName.includes('animation')) {
          stats.animationEntries++;
        } else if (cacheName.includes('preload')) {
          stats.preloadEntries++;
        }
        
        if (response.headers.get('x-compressed')) {
          stats.compressedEntries++;
          const ratio = parseFloat(response.headers.get('x-compression-ratio') || '1');
          stats.compressionRatio += ratio;
        }
      }
    }
  }
  
  if (stats.compressedEntries > 0) {
    stats.compressionRatio = stats.compressionRatio / stats.compressedEntries;
  }
  
  return stats;
}

// Background sync for theme optimization
self.addEventListener('sync', (event) => {
  if (event.tag === 'theme-optimization') {
    event.waitUntil(optimizeThemeCache());
  }
});

// Optimize theme cache in background
async function optimizeThemeCache() {
  try {
    const cache = await caches.open(THEME_CACHE_NAME);
    const requests = await cache.keys();
    
    // Compress cached responses
    for (const request of requests) {
      const response = await cache.match(request);
      if (response && !response.headers.get('x-compressed')) {
        const data = await response.json();
        
        if (data.css && !data.compressed) {
          // Compress CSS
          data.css = compressCSS(data.css);
          data.compressed = true;
          
          const compressedResponse = new Response(JSON.stringify(data), {
            headers: {
              ...response.headers,
              'x-compressed': 'true',
            },
          });
          
          await cache.put(request, compressedResponse);
        }
      }
    }
  } catch (error) {
    console.warn('Theme cache optimization failed:', error);
  }
}

// Simple CSS compression
function compressCSS(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
    .replace(/\s+/g, ' ') // Collapse whitespace
    .replace(/;\s*}/g, '}') // Remove unnecessary semicolons
    .replace(/\s*{\s*/g, '{') // Clean up braces
    .replace(/\s*}\s*/g, '}')
    .replace(/\s*;\s*/g, ';')
    .replace(/\s*:\s*/g, ':')
    .trim();
}

// Enhanced message handling for advanced cache management
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'CLEAR_THEME_CACHE':
      clearThemeCache().then(() => {
        event.ports[0].postMessage({ success: true });
      }).catch(error => {
        event.ports[0].postMessage({ success: false, error: error.message });
      });
      break;
      
    case 'PRELOAD_THEMES':
      preloadThemes(data.themes).then(() => {
        event.ports[0].postMessage({ success: true });
      }).catch(error => {
        event.ports[0].postMessage({ success: false, error: error.message });
      });
      break;
      
    case 'PRELOAD_ANIMATIONS':
      preloadAnimations(data.animations).then(() => {
        event.ports[0].postMessage({ success: true });
      }).catch(error => {
        event.ports[0].postMessage({ success: false, error: error.message });
      });
      break;
      
    case 'GET_CACHE_STATS':
      getCacheStats().then((stats) => {
        event.ports[0].postMessage({ stats });
      }).catch(error => {
        event.ports[0].postMessage({ stats: null, error: error.message });
      });
      break;
      
    case 'RECORD_NAVIGATION':
      PredictivePreloader.recordNavigation(data.from, data.to);
      event.ports[0].postMessage({ success: true });
      break;
      
    case 'TRIGGER_OPTIMIZATION':
      BackgroundOptimizer.optimize().then(() => {
        event.ports[0].postMessage({ success: true });
      }).catch(error => {
        event.ports[0].postMessage({ success: false, error: error.message });
      });
      break;
      
    case 'GET_COMPRESSION_STATS':
      getCompressionStats().then((stats) => {
        event.ports[0].postMessage({ stats });
      }).catch(error => {
        event.ports[0].postMessage({ stats: null, error: error.message });
      });
      break;
      
    case 'PREDICTIVE_PRELOAD':
      PredictivePreloader.preloadForRoutes(data.routes).then(() => {
        event.ports[0].postMessage({ success: true });
      }).catch(error => {
        event.ports[0].postMessage({ success: false, error: error.message });
      });
      break;
  }
});

// Clear theme cache
async function clearThemeCache() {
  const cache = await caches.open(THEME_CACHE_NAME);
  const requests = await cache.keys();
  await Promise.all(requests.map(request => cache.delete(request)));
}

// Preload themes
async function preloadThemes(themes) {
  const cache = await caches.open(THEME_CACHE_NAME);
  
  for (const theme of themes) {
    const request = new Request(`/api/theme/${theme.hash}`, {
      method: 'POST',
      body: JSON.stringify(theme),
      headers: { 'Content-Type': 'application/json' },
    });
    
    const response = new Response(JSON.stringify(theme), {
      headers: { 'Content-Type': 'application/json' },
    });
    
    await cache.put(request, response);
  }
}

// Preload animations
async function preloadAnimations(animations) {
  const cache = await caches.open(ANIMATION_CACHE_NAME);
  
  for (const animation of animations) {
    const request = new Request(`/animation-config/${animation.hash}`, {
      method: 'POST',
      body: JSON.stringify(animation),
      headers: { 'Content-Type': 'application/json' },
    });
    
    const response = new Response(JSON.stringify(animation), {
      headers: { 
        'Content-Type': 'application/json',
        'date': new Date().toISOString(),
      },
    });
    
    await cache.put(request, response);
  }
}

// Get compression statistics
async function getCompressionStats() {
  const cacheNames = await caches.keys();
  const stats = {
    totalEntries: 0,
    compressedEntries: 0,
    totalOriginalSize: 0,
    totalCompressedSize: 0,
    averageCompressionRatio: 0,
    compressionSavings: 0,
  };
  
  for (const cacheName of cacheNames) {
    if (cacheName.includes('theme') || cacheName.includes('assets') || cacheName.includes('animation')) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      
      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          stats.totalEntries++;
          
          if (response.headers.get('x-compressed')) {
            stats.compressedEntries++;
            const originalSize = parseInt(response.headers.get('x-original-size') || '0');
            const compressionRatio = parseFloat(response.headers.get('x-compression-ratio') || '1');
            
            stats.totalOriginalSize += originalSize;
            stats.totalCompressedSize += originalSize * compressionRatio;
          }
        }
      }
    }
  }
  
  if (stats.compressedEntries > 0) {
    stats.averageCompressionRatio = stats.totalCompressedSize / stats.totalOriginalSize;
    stats.compressionSavings = stats.totalOriginalSize - stats.totalCompressedSize;
  }
  
  return stats;
}

// Enhanced cache statistics
async function getCacheStats() {
  const themeCache = await caches.open(THEME_CACHE_NAME);
  const assetCache = await caches.open(ASSETS_CACHE_NAME);
  const animationCache = await caches.open(ANIMATION_CACHE_NAME);
  const preloadCache = await caches.open(PRELOAD_CACHE_NAME);
  
  const themeRequests = await themeCache.keys();
  const assetRequests = await assetCache.keys();
  const animationRequests = await animationCache.keys();
  const preloadRequests = await preloadCache.keys();
  
  let totalSize = 0;
  let compressedEntries = 0;
  let totalOriginalSize = 0;
  let totalCompressedSize = 0;
  
  const caches = [
    { cache: themeCache, requests: themeRequests },
    { cache: assetCache, requests: assetRequests },
    { cache: animationCache, requests: animationRequests },
    { cache: preloadCache, requests: preloadRequests },
  ];
  
  for (const { cache, requests } of caches) {
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const text = await response.text();
        totalSize += text.length;
        
        if (response.headers.get('x-compressed')) {
          compressedEntries++;
          const originalSize = parseInt(response.headers.get('x-original-size') || text.length.toString());
          const compressionRatio = parseFloat(response.headers.get('x-compression-ratio') || '1');
          
          totalOriginalSize += originalSize;
          totalCompressedSize += originalSize * compressionRatio;
        }
      }
    }
  }
  
  return {
    themeEntries: themeRequests.length,
    assetEntries: assetRequests.length,
    animationEntries: animationRequests.length,
    preloadEntries: preloadRequests.length,
    totalSize,
    compressedEntries,
    compressionRatio: compressedEntries > 0 ? totalCompressedSize / totalOriginalSize : 0,
    compressionSavings: totalOriginalSize - totalCompressedSize,
    navigationPatterns: PredictivePreloader.navigationPatterns.size,
    lastOptimization: BackgroundOptimizer.lastOptimization,
    isOptimizing: BackgroundOptimizer.isOptimizing,
  };
}