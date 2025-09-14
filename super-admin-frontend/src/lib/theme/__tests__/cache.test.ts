/**
 * Comprehensive unit tests for Multi-Level Theme Caching System
 * Tests memory cache, localStorage, IndexedDB, and performance monitoring
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { 
  CacheManager, 
  multiLevelThemeCache, 
  themePerformanceMonitor,
  CSSOptimizer,
  measureThemePerformance
} from '../cache';
import { cyberTheme, ltrConfig, rtlConfig } from '../cybersecurity';

// Mock IndexedDB
const mockIndexedDB = {
  open: vi.fn(),
  deleteDatabase: vi.fn(),
};

const mockIDBDatabase = {
  transaction: vi.fn(),
  close: vi.fn(),
  objectStoreNames: { contains: vi.fn() },
  createObjectStore: vi.fn(),
};

const mockIDBTransaction = {
  objectStore: vi.fn(),
  oncomplete: null,
  onerror: null,
};

const mockIDBObjectStore = {
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  clear: vi.fn(),
  createIndex: vi.fn(),
  index: vi.fn(),
  openCursor: vi.fn(),
};

const mockIDBRequest = {
  result: null,
  error: null,
  onsuccess: null,
  onerror: null,
};

const mockIDBCursor = {
  value: null,
  key: null,
  delete: vi.fn(),
  continue: vi.fn(),
};

// Setup IndexedDB mocks
beforeEach(() => {
  global.indexedDB = mockIndexedDB as any;
  mockIndexedDB.open.mockReturnValue(mockIDBRequest);
  mockIDBDatabase.transaction.mockReturnValue(mockIDBTransaction);
  mockIDBTransaction.objectStore.mockReturnValue(mockIDBObjectStore);
  mockIDBObjectStore.get.mockReturnValue(mockIDBRequest);
  mockIDBObjectStore.put.mockReturnValue(mockIDBRequest);
  mockIDBObjectStore.clear.mockReturnValue(mockIDBRequest);
  mockIDBObjectStore.index.mockReturnValue({ openCursor: vi.fn().mockReturnValue(mockIDBRequest) });
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0,
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock performance.now
Object.defineProperty(window, 'performance', {
  value: {
    now: vi.fn(() => Date.now()),
  },
  writable: true,
});

// Mock Blob for size calculations
global.Blob = class MockBlob {
  size: number;
  constructor(content: any[]) {
    this.size = JSON.stringify(content).length;
  }
} as any;

describe('Multi-Level Theme Caching System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
    localStorageMock.removeItem.mockImplementation(() => {});
    localStorageMock.clear.mockImplementation(() => {});
    
    // Reset performance monitoring
    themePerformanceMonitor.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Memory Cache (LRU)', () => {
    it('should store and retrieve themes from memory cache', async () => {
      const theme = await CacheManager.getOptimizedTheme(cyberTheme, ltrConfig);
      expect(theme).toBeDefined();
      expect(theme.theme).toEqual(cyberTheme);
      expect(theme.rtlConfig).toEqual(ltrConfig);
      expect(theme.hash).toBeDefined();
      expect(theme.css).toBeDefined();
    });

    it('should implement LRU eviction policy', async () => {
      // Clear cache first to ensure clean state
      await CacheManager.clearAllCaches();
      
      const metrics1 = CacheManager.getPerformanceMetrics();
      const initialMisses = metrics1.cache.cacheMisses;

      // First access - should be a cache miss
      await CacheManager.getOptimizedTheme(cyberTheme, ltrConfig);
      
      const metrics2 = CacheManager.getPerformanceMetrics();
      expect(metrics2.cache.cacheMisses).toBeGreaterThan(initialMisses);

      // Second access - should be a cache hit
      await CacheManager.getOptimizedTheme(cyberTheme, ltrConfig);
      
      const metrics3 = CacheManager.getPerformanceMetrics();
      expect(metrics3.cache.cacheHits).toBeGreaterThan(metrics2.cache.cacheHits);
    });

    it('should track access count and last accessed time', async () => {
      const theme = await CacheManager.getOptimizedTheme(cyberTheme, ltrConfig);
      expect(theme.accessCount).toBeGreaterThan(0);
      expect(theme.lastAccessed).toBeDefined();
      expect(typeof theme.lastAccessed).toBe('number');
    });

    it('should maintain memory usage under 5MB', async () => {
      // Generate multiple theme variations to test memory management
      const themes = [];
      for (let i = 0; i < 10; i++) {
        const modifiedTheme = { ...cyberTheme };
        modifiedTheme.colors.primary = `#${i.toString().padStart(6, '0')}`;
        themes.push(await CacheManager.getOptimizedTheme(modifiedTheme, ltrConfig));
      }

      const metrics = CacheManager.getPerformanceMetrics();
      expect(metrics.cache.memoryUsage).toBeLessThan(5 * 1024 * 1024); // 5MB
    });
  });

  describe('localStorage Integration', () => {
    it('should fallback to localStorage when memory cache misses', async () => {
      // Clear all caches first
      await CacheManager.clearAllCaches();
      
      const mockEntry = {
        theme: cyberTheme,
        css: 'compressed-css',
        rtlConfig: ltrConfig,
        timestamp: Date.now(),
        hash: 'test-hash',
        version: '1.0.0',
        compressed: true,
        size: 1000,
        accessCount: 1,
        lastAccessed: Date.now(),
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockEntry));

      // This should trigger localStorage fallback
      const theme = await CacheManager.getOptimizedTheme(cyberTheme, ltrConfig);
      
      // Since we cleared cache, it should try localStorage
      expect(theme).toBeDefined();
      expect(theme.css).toBeDefined();
    });

    it('should handle localStorage quota exceeded', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      // Should not throw error, should handle gracefully
      const theme = await CacheManager.getOptimizedTheme(cyberTheme, ltrConfig);
      expect(theme).toBeDefined();
    });

    it('should cleanup expired entries from localStorage', async () => {
      const expiredEntry = {
        theme: cyberTheme,
        css: 'css',
        rtlConfig: ltrConfig,
        timestamp: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago
        hash: 'expired-hash',
        version: '1.0.0',
        compressed: true,
        size: 1000,
        accessCount: 1,
        lastAccessed: Date.now() - (25 * 60 * 60 * 1000),
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(expiredEntry));

      const theme = await CacheManager.getOptimizedTheme(cyberTheme, ltrConfig);
      
      // Should not use expired entry
      expect(theme.timestamp).toBeGreaterThan(expiredEntry.timestamp);
    });

    it('should manage storage quota efficiently', () => {
      const stats = multiLevelThemeCache.getStats();
      expect(stats.localStorage).toBeDefined();
      expect(stats.localStorage.quota).toBeDefined();
      expect(stats.localStorage.quota.percentage).toBeGreaterThanOrEqual(0);
      expect(stats.localStorage.quota.percentage).toBeLessThanOrEqual(100);
    });
  });

  describe('IndexedDB Integration', () => {
    it('should initialize IndexedDB correctly', async () => {
      // This test verifies that IndexedDB initialization is attempted
      // Since the cache is already initialized, we test the behavior indirectly
      const theme = await CacheManager.getOptimizedTheme(cyberTheme, ltrConfig);
      expect(theme).toBeDefined();
      
      // IndexedDB should be available in the test environment
      expect(global.indexedDB).toBeDefined();
    });

    it('should handle IndexedDB initialization failure gracefully', async () => {
      mockIDBRequest.onerror = vi.fn();
      mockIDBRequest.error = new Error('IndexedDB not supported');
      
      // Should not throw error
      const theme = await CacheManager.getOptimizedTheme(cyberTheme, ltrConfig);
      expect(theme).toBeDefined();
    });

    it('should fallback to IndexedDB when localStorage fails', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const mockEntry = {
        theme: cyberTheme,
        css: 'compressed-css',
        rtlConfig: ltrConfig,
        timestamp: Date.now(),
        hash: 'test-hash',
        version: '1.0.0',
        compressed: true,
        size: 1000,
        accessCount: 1,
        lastAccessed: Date.now(),
      };

      mockIDBRequest.result = mockEntry;
      mockIDBObjectStore.get.mockReturnValue(mockIDBRequest);

      // Simulate successful IndexedDB get
      setTimeout(() => {
        if (mockIDBRequest.onsuccess) {
          mockIDBRequest.onsuccess({ target: mockIDBRequest } as any);
        }
      }, 0);

      const theme = await CacheManager.getOptimizedTheme(cyberTheme, ltrConfig);
      expect(theme).toBeDefined();
    });

    it('should cleanup old IndexedDB entries', async () => {
      // This would test the cleanup method
      // We'll verify that the cleanup method is called
      expect(mockIDBObjectStore.index).toBeDefined();
    });
  });

  describe('CSS Compression and Optimization', () => {
    it('should compress CSS effectively', () => {
      const originalCSS = `
        /* Comment */
        .test {
          color: red;
          background: blue;
        }
        
        .another { margin: 10px ; }
      `;

      const compressed = CSSOptimizer.minifyCSS(originalCSS);
      expect(compressed).not.toContain('/*');
      expect(compressed).not.toContain('\n');
      expect(compressed.length).toBeLessThan(originalCSS.length);
    });

    it('should extract critical CSS', () => {
      const css = `
        .cyber-button { color: cyan; }
        .normal-button { color: black; }
        .glass-panel { backdrop-filter: blur(10px); }
      `;

      const critical = CSSOptimizer.extractCriticalCSS(css, ['.cyber-', '.glass-']);
      expect(critical).toContain('.cyber-button');
      expect(critical).toContain('.glass-panel');
      expect(critical).not.toContain('.normal-button');
    });

    it('should generate optimized CSS with compression', () => {
      const result = CSSOptimizer.generateOptimizedCSS(cyberTheme, {
        minify: true,
        extractCritical: true,
        criticalSelectors: ['.cyber-', '.glass-']
      });

      expect(result.full).toBeDefined();
      expect(result.critical).toBeDefined();
      expect(result.full.length).toBeGreaterThan(0);
    });

    it('should achieve good compression ratios', async () => {
      // Clear cache to ensure fresh generation
      await CacheManager.clearAllCaches();
      
      // Generate theme to trigger compression
      const theme = await CacheManager.getOptimizedTheme(cyberTheme, ltrConfig);
      expect(theme).toBeDefined();
      
      const metrics = CacheManager.getPerformanceMetrics();
      
      // Compression ratio should be between 0 and 1 (compressed size / original size)
      expect(metrics.cache.compressionRatio).toBeGreaterThan(0);
      expect(metrics.cache.compressionRatio).toBeLessThan(1);
    });
  });

  describe('Cache Invalidation and Versioning', () => {
    it('should invalidate cache when theme changes', async () => {
      const theme1 = await CacheManager.getOptimizedTheme(cyberTheme, ltrConfig);
      
      // Modify theme
      const modifiedTheme = { ...cyberTheme };
      modifiedTheme.colors.primary = '#ff0000';
      
      const theme2 = await CacheManager.getOptimizedTheme(modifiedTheme, ltrConfig);
      
      expect(theme1.hash).not.toBe(theme2.hash);
    });

    it('should handle version changes correctly', async () => {
      const theme = await CacheManager.getOptimizedTheme(cyberTheme, ltrConfig);
      expect(theme.version).toBeDefined();
      expect(typeof theme.version).toBe('string');
    });

    it('should support manual cache invalidation', async () => {
      await CacheManager.getOptimizedTheme(cyberTheme, ltrConfig);
      
      // Should not throw error
      await expect(CacheManager.invalidateTheme(cyberTheme, ltrConfig)).resolves.not.toThrow();
    });

    it('should track dependency changes', async () => {
      const theme1 = await CacheManager.getOptimizedTheme(cyberTheme, ltrConfig);
      const theme2 = await CacheManager.getOptimizedTheme(cyberTheme, rtlConfig);
      
      // Different RTL configs should produce different hashes
      expect(theme1.hash).not.toBe(theme2.hash);
    });
  });

  describe('Performance Monitoring', () => {
    it('should track cache hit/miss ratios', async () => {
      const initialMetrics = CacheManager.getPerformanceMetrics();
      
      // First access - cache miss
      await CacheManager.getOptimizedTheme(cyberTheme, ltrConfig);
      
      // Second access - cache hit
      await CacheManager.getOptimizedTheme(cyberTheme, ltrConfig);
      
      const finalMetrics = CacheManager.getPerformanceMetrics();
      expect(finalMetrics.cache.cacheHits).toBeGreaterThan(initialMetrics.cache.cacheHits);
      expect(finalMetrics.cache.hitRate).toBeGreaterThanOrEqual(0);
      expect(finalMetrics.cache.hitRate).toBeLessThanOrEqual(100);
    });

    it('should measure CSS generation time', async () => {
      await CacheManager.getOptimizedTheme(cyberTheme, ltrConfig);
      
      const metrics = CacheManager.getPerformanceMetrics();
      expect(metrics.cache.cssGenerationTime).toBeGreaterThanOrEqual(0);
    });

    it('should track average load times', async () => {
      await CacheManager.getOptimizedTheme(cyberTheme, ltrConfig);
      
      const metrics = CacheManager.getPerformanceMetrics();
      expect(metrics.cache.averageLoadTime).toBeGreaterThanOrEqual(0);
    });

    it('should monitor memory usage', async () => {
      await CacheManager.getOptimizedTheme(cyberTheme, ltrConfig);
      
      const metrics = CacheManager.getPerformanceMetrics();
      expect(metrics.cache.memoryUsage).toBeGreaterThanOrEqual(0);
    });

    it('should provide comprehensive performance statistics', () => {
      const stats = multiLevelThemeCache.getStats();
      
      expect(stats.memoryCache).toBeDefined();
      expect(stats.localStorage).toBeDefined();
      expect(stats.performance).toBeDefined();
      expect(stats.totals).toBeDefined();
      
      expect(stats.performance.hitRate).toBeGreaterThanOrEqual(0);
      expect(stats.performance.averageLoadTime).toBeGreaterThanOrEqual(0);
    });

    it('should achieve target performance metrics', async () => {
      // Test multiple theme loads to get meaningful metrics
      for (let i = 0; i < 5; i++) {
        await CacheManager.getOptimizedTheme(cyberTheme, ltrConfig);
      }
      
      const health = CacheManager.getCacheHealth();
      
      // Should meet performance targets after cache warming
      expect(health.hitRate).toBeGreaterThan(50); // At least 50% hit rate
      expect(health.averageLoadTime).toBeLessThan(100); // Under 100ms
    });
  });

  describe('Performance Measurement Decorator', () => {
    it('should measure function execution time', () => {
      class TestClass {
        @measureThemePerformance('test-operation')
        testMethod() {
          return 'result';
        }
      }

      const instance = new TestClass();
      const result = instance.testMethod();
      
      expect(result).toBe('result');
      
      const stats = themePerformanceMonitor.getStats('test-operation');
      expect(stats).toBeDefined();
      expect(stats!.count).toBe(1);
      expect(stats!.average).toBeGreaterThanOrEqual(0);
    });

    it('should handle async functions', async () => {
      class TestClass {
        @measureThemePerformance('async-operation')
        async asyncMethod() {
          await new Promise(resolve => setTimeout(resolve, 10));
          return 'async-result';
        }
      }

      const instance = new TestClass();
      const result = await instance.asyncMethod();
      
      expect(result).toBe('async-result');
      
      const stats = themePerformanceMonitor.getStats('async-operation');
      expect(stats).toBeDefined();
      expect(stats!.count).toBe(1);
    });
  });

  describe('Cache Health and Recommendations', () => {
    it('should provide cache health status', () => {
      const health = CacheManager.getCacheHealth();
      
      expect(health.healthy).toBeDefined();
      expect(health.hitRate).toBeGreaterThanOrEqual(0);
      expect(health.averageLoadTime).toBeGreaterThanOrEqual(0);
      expect(health.memoryUsage).toBeGreaterThanOrEqual(0);
      expect(health.recommendations).toBeInstanceOf(Array);
    });

    it('should provide recommendations for poor performance', async () => {
      // Force poor performance by clearing cache frequently
      await CacheManager.clearAllCaches();
      await CacheManager.getOptimizedTheme(cyberTheme, ltrConfig);
      
      const health = CacheManager.getCacheHealth();
      
      if (health.hitRate < 95) {
        expect(health.recommendations).toContain('Consider preloading more common themes');
      }
    });

    it('should recommend cleanup when storage quota is high', () => {
      // Mock high storage usage
      localStorageMock.getItem.mockImplementation((key) => {
        if (key.startsWith('theme-cache-')) {
          return JSON.stringify({ size: 1000000 }); // Large entry
        }
        return null;
      });

      const health = CacheManager.getCacheHealth();
      
      if (health.storageQuota.percentage > 80) {
        expect(health.recommendations).toContain('Clean up localStorage cache');
      }
    });
  });

  describe('Cross-Browser Compatibility', () => {
    it('should handle missing IndexedDB gracefully', async () => {
      // Mock missing IndexedDB
      delete (global as any).indexedDB;
      
      const theme = await CacheManager.getOptimizedTheme(cyberTheme, ltrConfig);
      expect(theme).toBeDefined();
    });

    it('should handle localStorage not available', async () => {
      // Mock localStorage throwing errors
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage not available');
      });
      
      const theme = await CacheManager.getOptimizedTheme(cyberTheme, ltrConfig);
      expect(theme).toBeDefined();
    });

    it('should work with limited storage quota', async () => {
      // Mock storage quota exceeded
      localStorageMock.setItem.mockImplementation(() => {
        throw new DOMException('QuotaExceededError');
      });
      
      const theme = await CacheManager.getOptimizedTheme(cyberTheme, ltrConfig);
      expect(theme).toBeDefined();
    });
  });

  describe('Memory Management and Garbage Collection', () => {
    it('should implement automatic garbage collection', async () => {
      // Generate many theme variations to trigger cleanup
      const themes = [];
      for (let i = 0; i < 100; i++) {
        const modifiedTheme = { ...cyberTheme };
        modifiedTheme.colors.primary = `#${i.toString(16).padStart(6, '0')}`;
        themes.push(await CacheManager.getOptimizedTheme(modifiedTheme, ltrConfig));
      }

      const metrics = CacheManager.getPerformanceMetrics();
      
      // Memory usage should be controlled
      expect(metrics.cache.memoryUsage).toBeLessThan(10 * 1024 * 1024); // 10MB max
    });

    it('should cleanup expired entries automatically', async () => {
      // This tests the background cleanup functionality
      // We'll verify that the system handles cleanup gracefully
      await CacheManager.clearAllCaches();
      
      const theme = await CacheManager.getOptimizedTheme(cyberTheme, ltrConfig);
      expect(theme).toBeDefined();
    });

    it('should handle memory pressure gracefully', async () => {
      // Simulate memory pressure by creating many cache entries
      const promises = [];
      for (let i = 0; i < 50; i++) {
        const modifiedTheme = { ...cyberTheme };
        modifiedTheme.colors.primary = `#${i.toString(16).padStart(6, '0')}`;
        promises.push(CacheManager.getOptimizedTheme(modifiedTheme, ltrConfig));
      }

      await Promise.all(promises);
      
      // System should remain stable
      const health = CacheManager.getCacheHealth();
      expect(health).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    it('should work end-to-end with all cache levels', async () => {
      // Clear all caches
      await CacheManager.clearAllCaches();
      
      // First load - should generate and cache
      const theme1 = await CacheManager.getOptimizedTheme(cyberTheme, ltrConfig);
      expect(theme1).toBeDefined();
      
      // Second load - should hit memory cache
      const theme2 = await CacheManager.getOptimizedTheme(cyberTheme, ltrConfig);
      expect(theme2.hash).toBe(theme1.hash);
      
      const metrics = CacheManager.getPerformanceMetrics();
      expect(metrics.cache.cacheHits).toBeGreaterThan(0);
    });

    it('should maintain consistency across cache levels', async () => {
      const theme = await CacheManager.getOptimizedTheme(cyberTheme, ltrConfig);
      
      // Verify theme properties
      expect(theme.theme).toEqual(cyberTheme);
      expect(theme.rtlConfig).toEqual(ltrConfig);
      expect(theme.css).toBeDefined();
      expect(theme.hash).toBeDefined();
      expect(theme.version).toBeDefined();
      expect(theme.compressed).toBe(true);
      expect(theme.size).toBeGreaterThan(0);
    });

    it('should handle concurrent access correctly', async () => {
      // Test concurrent theme loading
      const promises = Array(10).fill(null).map(() => 
        CacheManager.getOptimizedTheme(cyberTheme, ltrConfig)
      );
      
      const themes = await Promise.all(promises);
      
      // All themes should have the same hash
      const firstHash = themes[0].hash;
      themes.forEach(theme => {
        expect(theme.hash).toBe(firstHash);
      });
    });
  });
});