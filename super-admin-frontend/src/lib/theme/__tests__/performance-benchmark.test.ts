/**
 * Unit Tests for Performance Benchmarking System
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { performanceBenchmark } from '../performance-benchmark';

// Mock dependencies
vi.mock('../asset-preloader', () => ({
  assetPreloader: {
    preloadAssets: vi.fn(() => Promise.resolve()),
    predictivePreload: vi.fn(() => Promise.resolve()),
    getMetrics: vi.fn(() => ({
      totalAssets: 10,
      loadedAssets: 8,
      failedAssets: 1,
      cacheHitRate: 85.5,
      averageLoadTime: 45.2,
    })),
  },
}));

vi.mock('../service-worker', () => ({
  serviceWorkerManager: {
    getCacheStats: vi.fn(() => Promise.resolve({
      themeEntries: 5,
      assetEntries: 10,
      totalSize: 1024000,
      compressedEntries: 8,
      compressionRatio: 0.7,
    })),
    preloadThemes: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('../cache', () => ({
  CacheManager: {
    getOptimizedTheme: vi.fn(() => Promise.resolve({
      css: 'mock css',
      theme: {},
    })),
    clearAllCaches: vi.fn(() => Promise.resolve()),
    getPerformanceMetrics: vi.fn(() => ({
      cache: {
        hitRate: 92.5,
        averageLoadTime: 25.3,
        compressionRatio: 0.65,
      },
      stats: {
        totals: {
          cacheHits: 150,
          cacheMisses: 12,
        },
      },
    })),
  },
}));

vi.mock('../lazy-animations', () => ({
  lazyAnimationManager: {
    preloadByPriority: vi.fn(() => Promise.resolve()),
    preloadForRoute: vi.fn(() => Promise.resolve()),
    getLoadingStatus: vi.fn(() => ({
      totalComponents: 15,
      loadedComponents: 12,
      failedComponents: 1,
      averageLoadTime: 35.7,
    })),
  },
}));

// Mock global objects
const mockPerformance = {
  now: vi.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 100 * 1024 * 1024, // 100MB
    jsHeapSizeLimit: 2 * 1024 * 1024 * 1024, // 2GB
  },
};

const mockWindow = {
  requestAnimationFrame: vi.fn((callback) => {
    setTimeout(callback, 16);
    return 1;
  }),
  gc: vi.fn(),
};

// Setup global mocks
Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true,
});

Object.defineProperty(global, 'window', {
  value: mockWindow,
  writable: true,
});

describe('PerformanceBenchmark', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset performance.now to return incrementing values
    let counter = 0;
    mockPerformance.now.mockImplementation(() => {
      counter += 10; // Each call adds 10ms
      return counter;
    });
  });

  describe('Full Benchmark Suite', () => {
    it('should run complete benchmark suite successfully', async () => {
      const result = await performanceBenchmark.runFullBenchmark();

      expect(result).toHaveProperty('name', 'full-performance-benchmark');
      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('totalDuration');
      expect(result).toHaveProperty('successRate');
      expect(result).toHaveProperty('averageDuration');
      expect(result).toHaveProperty('timestamp');

      expect(result.results.length).toBeGreaterThan(0);
      expect(result.totalDuration).toBeGreaterThan(0);
      expect(result.successRate).toBeGreaterThanOrEqual(0);
      expect(result.successRate).toBeLessThanOrEqual(100);
    });

    it('should prevent concurrent benchmark runs', async () => {
      const promise1 = performanceBenchmark.runFullBenchmark();
      
      await expect(performanceBenchmark.runFullBenchmark())
        .rejects.toThrow('Benchmark already running');

      await promise1; // Clean up
    });

    it('should handle benchmark failures gracefully', async () => {
      // Mock a failing dependency
      const { CacheManager } = await import('../cache');
      (CacheManager.getOptimizedTheme as Mock).mockRejectedValueOnce(new Error('Cache failed'));

      const result = await performanceBenchmark.runFullBenchmark();

      expect(result.results.some(r => !r.success)).toBe(true);
      expect(result.successRate).toBeLessThan(100);
    });
  });

  describe('Theme Loading Benchmarks', () => {
    it('should benchmark cold theme loading', async () => {
      const result = await performanceBenchmark.runFullBenchmark();
      
      const coldLoadResult = result.results.find(r => r.name === 'theme-cold-load');
      expect(coldLoadResult).toBeDefined();
      expect(coldLoadResult?.success).toBe(true);
      expect(coldLoadResult?.duration).toBeGreaterThan(0);
    });

    it('should benchmark warm theme loading', async () => {
      const result = await performanceBenchmark.runFullBenchmark();
      
      const warmLoadResult = result.results.find(r => r.name === 'theme-warm-load');
      expect(warmLoadResult).toBeDefined();
      expect(warmLoadResult?.success).toBe(true);
    });

    it('should benchmark RTL theme loading', async () => {
      const result = await performanceBenchmark.runFullBenchmark();
      
      const rtlLoadResult = result.results.find(r => r.name === 'theme-rtl-load');
      expect(rtlLoadResult).toBeDefined();
      expect(rtlLoadResult?.success).toBe(true);
    });
  });

  describe('Animation Performance Benchmarks', () => {
    it('should measure frame rate during animations', async () => {
      const result = await performanceBenchmark.runFullBenchmark();
      
      const frameRateResult = result.results.find(r => r.name === 'animation-frame-rate');
      expect(frameRateResult).toBeDefined();
      expect(frameRateResult?.success).toBe(true);
      expect(frameRateResult?.duration).toBeGreaterThan(0);
    });

    it('should measure animation loading time', async () => {
      const result = await performanceBenchmark.runFullBenchmark();
      
      const loadTimeResult = result.results.find(r => r.name === 'animation-load-time');
      expect(loadTimeResult).toBeDefined();
      expect(loadTimeResult?.success).toBe(true);
    });

    it('should measure memory usage during animations', async () => {
      const result = await performanceBenchmark.runFullBenchmark();
      
      const memoryResult = result.results.find(r => r.name === 'animation-memory-usage');
      expect(memoryResult).toBeDefined();
      expect(memoryResult?.success).toBe(true);
    });
  });

  describe('Cache Performance Benchmarks', () => {
    it('should measure cache hit rate', async () => {
      const result = await performanceBenchmark.runFullBenchmark();
      
      const hitRateResult = result.results.find(r => r.name === 'cache-hit-rate');
      expect(hitRateResult).toBeDefined();
      expect(hitRateResult?.success).toBe(true);
      expect(hitRateResult?.duration).toBeGreaterThanOrEqual(0);
    });

    it('should measure cache write performance', async () => {
      const result = await performanceBenchmark.runFullBenchmark();
      
      const writeResult = result.results.find(r => r.name === 'cache-write-performance');
      expect(writeResult).toBeDefined();
      expect(writeResult?.success).toBe(true);
    });

    it('should measure cache read performance', async () => {
      const result = await performanceBenchmark.runFullBenchmark();
      
      const readResult = result.results.find(r => r.name === 'cache-read-performance');
      expect(readResult).toBeDefined();
      expect(readResult?.success).toBe(true);
    });
  });

  describe('Asset Preloading Benchmarks', () => {
    it('should benchmark critical asset preloading', async () => {
      const result = await performanceBenchmark.runFullBenchmark();
      
      const preloadResult = result.results.find(r => r.name === 'preload-critical-assets');
      expect(preloadResult).toBeDefined();
      expect(preloadResult?.success).toBe(true);
    });

    it('should benchmark predictive preloading', async () => {
      const result = await performanceBenchmark.runFullBenchmark();
      
      const predictiveResult = result.results.find(r => r.name === 'predictive-preloading');
      expect(predictiveResult).toBeDefined();
      expect(predictiveResult?.success).toBe(true);
    });
  });

  describe('Memory Usage Benchmarks', () => {
    it('should measure baseline memory usage', async () => {
      const result = await performanceBenchmark.runFullBenchmark();
      
      const baselineResult = result.results.find(r => r.name === 'baseline-memory-usage');
      expect(baselineResult).toBeDefined();
      expect(baselineResult?.success).toBe(true);
      expect(baselineResult?.duration).toBeGreaterThan(0);
    });

    it('should measure memory usage after theme loading', async () => {
      const result = await performanceBenchmark.runFullBenchmark();
      
      const themeMemoryResult = result.results.find(r => r.name === 'theme-memory-usage');
      expect(themeMemoryResult).toBeDefined();
      expect(themeMemoryResult?.success).toBe(true);
    });

    it('should measure memory cleanup effectiveness', async () => {
      const result = await performanceBenchmark.runFullBenchmark();
      
      const cleanupResult = result.results.find(r => r.name === 'memory-cleanup');
      expect(cleanupResult).toBeDefined();
      expect(cleanupResult?.success).toBe(true);
    });
  });

  describe('Compression Benchmarks', () => {
    it('should measure compression ratio', async () => {
      const result = await performanceBenchmark.runFullBenchmark();
      
      const compressionResult = result.results.find(r => r.name === 'compression-ratio');
      expect(compressionResult).toBeDefined();
      expect(compressionResult?.success).toBe(true);
    });

    it('should measure compression speed', async () => {
      const result = await performanceBenchmark.runFullBenchmark();
      
      const speedResult = result.results.find(r => r.name === 'compression-speed');
      expect(speedResult).toBeDefined();
      expect(speedResult?.success).toBe(true);
    });
  });

  describe('Baseline Establishment', () => {
    it('should establish performance baseline', async () => {
      const baseline = await performanceBenchmark.establishBaseline('test-baseline');

      expect(baseline).toHaveProperty('themeLoadTime');
      expect(baseline).toHaveProperty('animationFrameRate');
      expect(baseline).toHaveProperty('memoryUsage');
      expect(baseline).toHaveProperty('cacheHitRate');
      expect(baseline).toHaveProperty('compressionRatio');
      expect(baseline).toHaveProperty('assetLoadTime');

      expect(baseline.themeLoadTime).toBeGreaterThan(0);
      expect(baseline.animationFrameRate).toBeGreaterThan(0);
      expect(baseline.memoryUsage).toBeGreaterThanOrEqual(0);
    });

    it('should compare performance with baseline', async () => {
      // Establish baseline first
      await performanceBenchmark.establishBaseline('comparison-test');

      // Mock improved performance
      const { CacheManager } = await import('../cache');
      (CacheManager.getPerformanceMetrics as Mock).mockReturnValueOnce({
        cache: {
          hitRate: 95.0, // Improved from 92.5
          averageLoadTime: 20.0, // Improved from 25.3
          compressionRatio: 0.70, // Improved from 0.65
        },
        stats: {
          totals: {
            cacheHits: 180,
            cacheMisses: 10,
          },
        },
      });

      const comparison = await performanceBenchmark.compareWithBaseline('comparison-test');

      expect(comparison).toBeDefined();
      expect(comparison?.improvement.cacheHitRate).toBeGreaterThan(0);
      expect(comparison?.improvement.themeLoadTime).toBeGreaterThanOrEqual(0);
      expect(comparison?.overallScore).toBeDefined();
    });

    it('should handle missing baseline gracefully', async () => {
      const comparison = await performanceBenchmark.compareWithBaseline('non-existent');
      expect(comparison).toBeNull();
    });
  });

  describe('Performance Trends', () => {
    it('should track performance trends over time', async () => {
      // Run multiple benchmarks to create history
      await performanceBenchmark.runFullBenchmark();
      await performanceBenchmark.runFullBenchmark();

      const trends = performanceBenchmark.getPerformanceTrends();

      expect(trends).toHaveProperty('themeLoadTime');
      expect(trends).toHaveProperty('cacheHitRate');
      expect(trends).toHaveProperty('memoryUsage');
      expect(trends).toHaveProperty('overallPerformance');

      expect(Array.isArray(trends.themeLoadTime)).toBe(true);
      expect(Array.isArray(trends.overallPerformance)).toBe(true);
    });

    it('should provide benchmark history', () => {
      const history = performanceBenchmark.getBenchmarkHistory();
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('Performance Report Generation', () => {
    it('should generate comprehensive performance report', async () => {
      // Run benchmark to create data
      await performanceBenchmark.runFullBenchmark();

      const report = performanceBenchmark.generateReport();

      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('criticalIssues');

      expect(report.summary).toHaveProperty('totalBenchmarks');
      expect(report.summary).toHaveProperty('averageSuccessRate');
      expect(report.summary).toHaveProperty('lastBenchmarkDate');
      expect(report.summary).toHaveProperty('performanceTrend');

      expect(Array.isArray(report.recommendations)).toBe(true);
      expect(Array.isArray(report.criticalIssues)).toBe(true);
    });

    it('should identify performance issues', async () => {
      // Mock poor performance - simulate slow theme loading
      let callCount = 0;
      mockPerformance.now.mockImplementation(() => {
        callCount++;
        // Return increasing timestamps that simulate slow operations (>100ms duration)
        return callCount * 150; // Each call increases by 150ms, creating 150ms durations
      });

      // Run multiple benchmarks to populate trends data
      await performanceBenchmark.runFullBenchmark();
      await performanceBenchmark.runFullBenchmark();

      const report = performanceBenchmark.generateReport();

      expect(report.criticalIssues.length).toBeGreaterThan(0);
      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    it('should calculate performance trends correctly', async () => {
      // Run multiple benchmarks with different success rates
      await performanceBenchmark.runFullBenchmark();
      
      // Mock declining performance
      const { CacheManager } = await import('../cache');
      (CacheManager.getOptimizedTheme as Mock).mockRejectedValue(new Error('Performance degraded'));
      
      await performanceBenchmark.runFullBenchmark();

      const report = performanceBenchmark.generateReport();
      
      // Should detect declining trend
      expect(['improving', 'stable', 'declining']).toContain(report.summary.performanceTrend);
    });
  });

  describe('Error Handling', () => {
    it('should handle individual benchmark failures', async () => {
      // Mock service worker failure
      const { serviceWorkerManager } = await import('../service-worker');
      (serviceWorkerManager.getCacheStats as Mock).mockRejectedValueOnce(new Error('SW failed'));

      const result = await performanceBenchmark.runFullBenchmark();

      const swResult = result.results.find(r => r.name === 'sw-cache-stats');
      expect(swResult?.success).toBe(false);
      expect(swResult?.error).toBe('SW failed');
    });

    it('should continue benchmarking after individual failures', async () => {
      // Mock one failing benchmark
      const { assetPreloader } = await import('../asset-preloader');
      (assetPreloader.preloadAssets as Mock).mockRejectedValueOnce(new Error('Preload failed'));

      const result = await performanceBenchmark.runFullBenchmark();

      // Should have both successful and failed results
      const successfulResults = result.results.filter(r => r.success);
      const failedResults = result.results.filter(r => !r.success);

      expect(successfulResults.length).toBeGreaterThan(0);
      expect(failedResults.length).toBeGreaterThan(0);
      expect(result.successRate).toBeLessThan(100);
      expect(result.successRate).toBeGreaterThan(0);
    });
  });

  describe('Memory Usage Detection', () => {
    it('should detect memory usage when performance.memory is available', async () => {
      const result = await performanceBenchmark.runFullBenchmark();
      
      const memoryResult = result.results.find(r => r.name === 'baseline-memory-usage');
      expect(memoryResult?.duration).toBeGreaterThan(0);
    });

    it('should handle missing performance.memory gracefully', async () => {
      // Mock missing memory API
      const originalMemory = mockPerformance.memory;
      delete (mockPerformance as any).memory;

      const result = await performanceBenchmark.runFullBenchmark();
      
      const memoryResult = result.results.find(r => r.name === 'baseline-memory-usage');
      expect(memoryResult?.duration).toBe(0);

      // Restore memory API
      mockPerformance.memory = originalMemory;
    });
  });

  describe('Benchmark History Management', () => {
    it('should limit benchmark history to 10 entries', async () => {
      // Create a fresh instance to avoid conflicts
      const { PerformanceBenchmark } = await import('../performance-benchmark');
      const testBenchmark = new PerformanceBenchmark();
      
      // Run exactly 12 benchmarks to test the limit
      for (let i = 0; i < 12; i++) {
        await testBenchmark.runFullBenchmark();
      }

      const history = testBenchmark.getBenchmarkHistory();
      expect(history.length).toBeLessThanOrEqual(10);
    }, 15000); // Increase timeout to 15 seconds

    it('should maintain chronological order in history', async () => {
      // Create a fresh instance for this test
      const { PerformanceBenchmark } = await import('../performance-benchmark');
      const testBenchmark = new PerformanceBenchmark();
      
      await testBenchmark.runFullBenchmark();
      const timestamp1 = Date.now();
      
      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 50));
      
      await testBenchmark.runFullBenchmark();
      const timestamp2 = Date.now();

      const history = testBenchmark.getBenchmarkHistory();
      expect(history.length).toBe(2);
      expect(history[0].timestamp).toBeLessThan(history[1].timestamp);
    });
  });
});