/**
 * Comprehensive Performance Benchmarking System
 * Measures and analyzes theme loading, animation performance, and optimization effectiveness
 */

import React from 'react';
import { assetPreloader } from './asset-preloader';
import { serviceWorkerManager } from './service-worker';
import { CacheManager } from './cache';
import { lazyAnimationManager } from './lazy-animations';

interface BenchmarkResult {
  name: string;
  duration: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

interface BenchmarkSuite {
  name: string;
  results: BenchmarkResult[];
  totalDuration: number;
  successRate: number;
  averageDuration: number;
  timestamp: number;
}

interface PerformanceBaseline {
  themeLoadTime: number;
  animationFrameRate: number;
  memoryUsage: number;
  cacheHitRate: number;
  compressionRatio: number;
  assetLoadTime: number;
}

interface OptimizationMetrics {
  beforeOptimization: PerformanceBaseline;
  afterOptimization: PerformanceBaseline;
  improvement: {
    themeLoadTime: number;
    animationFrameRate: number;
    memoryUsage: number;
    cacheHitRate: number;
    compressionRatio: number;
    assetLoadTime: number;
  };
  overallScore: number;
}

class PerformanceBenchmark {
  private baselines = new Map<string, PerformanceBaseline>();
  private benchmarkHistory: BenchmarkSuite[] = [];
  private isRunning = false;

  /**
   * Run comprehensive performance benchmark
   */
  async runFullBenchmark(): Promise<BenchmarkSuite> {
    if (this.isRunning) {
      throw new Error('Benchmark already running');
    }

    this.isRunning = true;
    const startTime = performance.now();
    const results: BenchmarkResult[] = [];

    try {
      // Theme loading benchmarks
      results.push(...await this.benchmarkThemeLoading());
      
      // Animation performance benchmarks
      results.push(...await this.benchmarkAnimationPerformance());
      
      // Cache performance benchmarks
      results.push(...await this.benchmarkCachePerformance());
      
      // Asset preloading benchmarks
      results.push(...await this.benchmarkAssetPreloading());
      
      // Service worker benchmarks
      results.push(...await this.benchmarkServiceWorker());
      
      // Lazy loading benchmarks
      results.push(...await this.benchmarkLazyLoading());
      
      // Memory usage benchmarks
      results.push(...await this.benchmarkMemoryUsage());
      
      // Compression benchmarks
      results.push(...await this.benchmarkCompression());

    } catch (error) {
      console.error('Benchmark suite failed:', error);
      results.push({
        name: 'benchmark-suite-error',
        duration: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      this.isRunning = false;
    }

    const totalDuration = performance.now() - startTime;
    const successfulResults = results.filter(r => r.success);
    const successRate = (successfulResults.length / results.length) * 100;
    const averageDuration = successfulResults.length > 0 
      ? successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length 
      : 0;

    const suite: BenchmarkSuite = {
      name: 'full-performance-benchmark',
      results,
      totalDuration,
      successRate,
      averageDuration,
      timestamp: Date.now(),
    };

    this.benchmarkHistory.push(suite);
    
    // Keep only last 10 benchmark runs
    if (this.benchmarkHistory.length > 10) {
      this.benchmarkHistory.shift();
    }

    return suite;
  }

  /**
   * Benchmark theme loading performance
   */
  private async benchmarkThemeLoading(): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    // Test cold theme loading
    await this.runBenchmark(results, 'theme-cold-load', async () => {
      await CacheManager.clearAllCaches();
      const startTime = performance.now();
      await CacheManager.getOptimizedTheme();
      return performance.now() - startTime;
    });

    // Test warm theme loading (cached)
    await this.runBenchmark(results, 'theme-warm-load', async () => {
      const startTime = performance.now();
      await CacheManager.getOptimizedTheme();
      return performance.now() - startTime;
    });

    // Test theme switching
    await this.runBenchmark(results, 'theme-switch', async () => {
      const startTime = performance.now();
      // Simulate theme switch by clearing and reloading
      await CacheManager.clearAllCaches();
      await CacheManager.getOptimizedTheme();
      return performance.now() - startTime;
    });

    // Test RTL theme loading
    await this.runBenchmark(results, 'theme-rtl-load', async () => {
      const { rtlConfig } = await import('./cybersecurity');
      const startTime = performance.now();
      await CacheManager.getOptimizedTheme(undefined, rtlConfig);
      return performance.now() - startTime;
    });

    return results;
  }

  /**
   * Benchmark animation performance with ultra-smooth targets
   */
  private async benchmarkAnimationPerformance(): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    // Test frame rate during animations - targeting 120fps for ultra-smooth
    await this.runBenchmark(results, 'animation-frame-rate', async () => {
      return new Promise<number>((resolve) => {
        let frameCount = 0;
        const startTime = performance.now();
        let lastFrameTime = startTime;
        const frameTimes: number[] = [];
        
        const measureFrames = (currentTime: number) => {
          frameCount++;
          const frameTime = currentTime - lastFrameTime;
          frameTimes.push(frameTime);
          lastFrameTime = currentTime;
          
          if (frameCount < 120) { // Measure for 120 frames for better accuracy
            requestAnimationFrame(measureFrames);
          } else {
            const duration = performance.now() - startTime;
            const fps = (frameCount / duration) * 1000;
            
            // Calculate frame time consistency (jank detection)
            const avgFrameTime = frameTimes.reduce((sum, time) => sum + time, 0) / frameTimes.length;
            const jankFrames = frameTimes.filter(time => time > avgFrameTime * 1.5).length;
            const jankPercentage = (jankFrames / frameTimes.length) * 100;
            
            resolve(fps);
          }
        };
        
        requestAnimationFrame(measureFrames);
      });
    });

    // Test ultra-fast animation loading time - targeting <10ms
    await this.runBenchmark(results, 'animation-load-time', async () => {
      const startTime = performance.now();
      await lazyAnimationManager.preloadByPriority('high');
      return performance.now() - startTime;
    });

    // Test memory efficiency during animations
    await this.runBenchmark(results, 'animation-memory-usage', async () => {
      const beforeMemory = this.getMemoryUsage();
      await lazyAnimationManager.preloadByPriority('medium');
      const afterMemory = this.getMemoryUsage();
      return afterMemory - beforeMemory;
    });

    // Test animation smoothness under load
    await this.runBenchmark(results, 'animation-smoothness-under-load', async () => {
      return new Promise<number>((resolve) => {
        let frameCount = 0;
        const startTime = performance.now();
        const frameTimes: number[] = [];
        let lastFrameTime = startTime;
        
        // Simulate heavy load while measuring frame rate
        const heavyTask = () => {
          const start = performance.now();
          while (performance.now() - start < 2) {
            // Simulate 2ms of work per frame
            Math.random();
          }
        };
        
        const measureFrames = (currentTime: number) => {
          heavyTask(); // Add load
          
          frameCount++;
          const frameTime = currentTime - lastFrameTime;
          frameTimes.push(frameTime);
          lastFrameTime = currentTime;
          
          if (frameCount < 60) {
            requestAnimationFrame(measureFrames);
          } else {
            const duration = performance.now() - startTime;
            const fps = (frameCount / duration) * 1000;
            
            // Calculate frame consistency score
            const avgFrameTime = frameTimes.reduce((sum, time) => sum + time, 0) / frameTimes.length;
            const variance = frameTimes.reduce((sum, time) => sum + Math.pow(time - avgFrameTime, 2), 0) / frameTimes.length;
            const consistencyScore = Math.max(0, 100 - Math.sqrt(variance));
            
            resolve(consistencyScore);
          }
        };
        
        requestAnimationFrame(measureFrames);
      });
    });

    // Test GPU acceleration effectiveness
    await this.runBenchmark(results, 'gpu-acceleration-test', async () => {
      return new Promise<number>((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 100;
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (!gl) {
          resolve(0); // No GPU acceleration
          return;
        }
        
        const startTime = performance.now();
        
        // Simple GPU test
        const vertices = new Float32Array([
          -1, -1, 1, -1, -1, 1, 1, 1
        ]);
        
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        
        // Measure GPU operations
        for (let i = 0; i < 1000; i++) {
          gl.clear(gl.COLOR_BUFFER_BIT);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }
        
        const duration = performance.now() - startTime;
        resolve(1000 / duration); // Operations per ms
      });
    });

    return results;
  }

  /**
   * Benchmark cache performance
   */
  private async benchmarkCachePerformance(): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    // Test cache hit rate
    await this.runBenchmark(results, 'cache-hit-rate', async () => {
      const metrics = CacheManager.getPerformanceMetrics();
      return metrics.cache.hitRate;
    });

    // Test cache write performance
    await this.runBenchmark(results, 'cache-write-performance', async () => {
      const { cyberTheme } = await import('./cybersecurity');
      const startTime = performance.now();
      await CacheManager.getOptimizedTheme(cyberTheme);
      return performance.now() - startTime;
    });

    // Test cache read performance
    await this.runBenchmark(results, 'cache-read-performance', async () => {
      const startTime = performance.now();
      await CacheManager.getOptimizedTheme();
      return performance.now() - startTime;
    });

    // Test cache cleanup performance
    await this.runBenchmark(results, 'cache-cleanup-performance', async () => {
      const startTime = performance.now();
      await CacheManager.clearAllCaches();
      return performance.now() - startTime;
    });

    return results;
  }

  /**
   * Benchmark asset preloading
   */
  private async benchmarkAssetPreloading(): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    // Test critical asset preloading
    await this.runBenchmark(results, 'preload-critical-assets', async () => {
      const startTime = performance.now();
      await assetPreloader.preloadAssets({ priority: 'critical' });
      return performance.now() - startTime;
    });

    // Test predictive preloading
    await this.runBenchmark(results, 'predictive-preloading', async () => {
      const startTime = performance.now();
      await assetPreloader.predictivePreload('/dashboard');
      return performance.now() - startTime;
    });

    // Test preloading effectiveness
    await this.runBenchmark(results, 'preloading-effectiveness', async () => {
      const metrics = assetPreloader.getMetrics();
      return metrics.cacheHitRate;
    });

    return results;
  }

  /**
   * Benchmark service worker performance
   */
  private async benchmarkServiceWorker(): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    // Test service worker cache stats
    await this.runBenchmark(results, 'sw-cache-stats', async () => {
      const startTime = performance.now();
      await serviceWorkerManager.getCacheStats();
      const duration = performance.now() - startTime;
      return duration;
    }, (duration) => ({ stats: duration }));

    // Test service worker theme preloading
    await this.runBenchmark(results, 'sw-theme-preload', async () => {
      const { cyberTheme } = await import('./cybersecurity');
      const startTime = performance.now();
      await serviceWorkerManager.preloadThemes([cyberTheme]);
      return performance.now() - startTime;
    });

    return results;
  }

  /**
   * Benchmark lazy loading performance
   */
  private async benchmarkLazyLoading(): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    // Test lazy component loading
    await this.runBenchmark(results, 'lazy-component-load', async () => {
      const startTime = performance.now();
      await lazyAnimationManager.preloadForRoute('/dashboard');
      return performance.now() - startTime;
    });

    // Test lazy loading effectiveness
    await this.runBenchmark(results, 'lazy-loading-effectiveness', async () => {
      const status = lazyAnimationManager.getLoadingStatus();
      return status.averageLoadTime;
    });

    return results;
  }

  /**
   * Benchmark memory usage
   */
  private async benchmarkMemoryUsage(): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    // Test baseline memory usage
    await this.runBenchmark(results, 'baseline-memory-usage', async () => {
      return this.getMemoryUsage();
    });

    // Test memory usage after theme loading
    await this.runBenchmark(results, 'theme-memory-usage', async () => {
      const beforeMemory = this.getMemoryUsage();
      await CacheManager.getOptimizedTheme();
      const afterMemory = this.getMemoryUsage();
      return afterMemory - beforeMemory;
    });

    // Test memory cleanup effectiveness
    await this.runBenchmark(results, 'memory-cleanup', async () => {
      const beforeMemory = this.getMemoryUsage();
      await CacheManager.clearAllCaches();
      // Force garbage collection if available
      if ('gc' in window) {
        (window as any).gc();
      }
      const afterMemory = this.getMemoryUsage();
      return beforeMemory - afterMemory; // Positive value means memory was freed
    });

    return results;
  }

  /**
   * Benchmark compression performance
   */
  private async benchmarkCompression(): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    // Test compression ratio
    await this.runBenchmark(results, 'compression-ratio', async () => {
      const metrics = CacheManager.getPerformanceMetrics();
      return metrics.cache.compressionRatio * 100; // Convert to percentage
    });

    // Test compression speed
    await this.runBenchmark(results, 'compression-speed', async () => {
      const { cyberTheme, generateCyberThemeCSS } = await import('./cybersecurity');
      const css = generateCyberThemeCSS(cyberTheme);
      
      const startTime = performance.now();
      // Simulate compression
      css
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\s+/g, ' ')
        .trim();
      const duration = performance.now() - startTime;
      
      return duration;
    });

    return results;
  }

  /**
   * Run individual benchmark
   */
  private async runBenchmark(
    results: BenchmarkResult[],
    name: string,
    benchmarkFn: () => Promise<number>,
    metadataFn?: (result: number) => Record<string, any>
  ): Promise<void> {
    try {
      const result = await benchmarkFn();
      results.push({
        name,
        duration: result,
        success: true,
        metadata: metadataFn ? metadataFn(result) : undefined,
      });
    } catch (error) {
      results.push({
        name,
        duration: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory ? memory.usedJSHeapSize / (1024 * 1024) : 0; // MB
    }
    return 0;
  }

  /**
   * Establish performance baseline
   */
  async establishBaseline(name: string = 'default'): Promise<PerformanceBaseline> {
    const baseline: PerformanceBaseline = {
      themeLoadTime: 0,
      animationFrameRate: 0,
      memoryUsage: 0,
      cacheHitRate: 0,
      compressionRatio: 0,
      assetLoadTime: 0,
    };

    // Measure theme load time
    const themeStartTime = performance.now();
    await CacheManager.getOptimizedTheme();
    baseline.themeLoadTime = performance.now() - themeStartTime;

    // Measure animation frame rate
    baseline.animationFrameRate = await new Promise<number>((resolve) => {
      let frameCount = 0;
      const startTime = performance.now();
      
      const measureFrames = () => {
        frameCount++;
        if (frameCount < 60) {
          requestAnimationFrame(measureFrames);
        } else {
          const duration = performance.now() - startTime;
          const fps = (frameCount / duration) * 1000;
          resolve(fps);
        }
      };
      
      requestAnimationFrame(measureFrames);
    });

    // Measure memory usage
    baseline.memoryUsage = this.getMemoryUsage();

    // Measure cache performance
    const cacheMetrics = CacheManager.getPerformanceMetrics();
    baseline.cacheHitRate = cacheMetrics.cache.hitRate;
    baseline.compressionRatio = cacheMetrics.cache.compressionRatio;

    // Measure asset load time
    const assetStartTime = performance.now();
    await assetPreloader.preloadAssets({ priority: 'high' });
    baseline.assetLoadTime = performance.now() - assetStartTime;

    this.baselines.set(name, baseline);
    return baseline;
  }

  /**
   * Compare performance against baseline
   */
  async compareWithBaseline(baselineName: string = 'default'): Promise<OptimizationMetrics | null> {
    const beforeOptimization = this.baselines.get(baselineName);
    if (!beforeOptimization) {
      console.warn(`Baseline '${baselineName}' not found`);
      return null;
    }

    const afterOptimization = await this.establishBaseline('comparison');

    const improvement = {
      themeLoadTime: ((beforeOptimization.themeLoadTime - afterOptimization.themeLoadTime) / beforeOptimization.themeLoadTime) * 100,
      animationFrameRate: ((afterOptimization.animationFrameRate - beforeOptimization.animationFrameRate) / beforeOptimization.animationFrameRate) * 100,
      memoryUsage: ((beforeOptimization.memoryUsage - afterOptimization.memoryUsage) / beforeOptimization.memoryUsage) * 100,
      cacheHitRate: ((afterOptimization.cacheHitRate - beforeOptimization.cacheHitRate) / beforeOptimization.cacheHitRate) * 100,
      compressionRatio: ((afterOptimization.compressionRatio - beforeOptimization.compressionRatio) / beforeOptimization.compressionRatio) * 100,
      assetLoadTime: ((beforeOptimization.assetLoadTime - afterOptimization.assetLoadTime) / beforeOptimization.assetLoadTime) * 100,
    };

    // Calculate overall score (weighted average)
    const weights = {
      themeLoadTime: 0.25,
      animationFrameRate: 0.20,
      memoryUsage: 0.15,
      cacheHitRate: 0.20,
      compressionRatio: 0.10,
      assetLoadTime: 0.10,
    };

    const overallScore = Object.entries(improvement).reduce((score, [key, value]) => {
      const weight = weights[key as keyof typeof weights];
      return score + (value * weight);
    }, 0);

    return {
      beforeOptimization,
      afterOptimization,
      improvement,
      overallScore,
    };
  }

  /**
   * Get benchmark history
   */
  getBenchmarkHistory(): BenchmarkSuite[] {
    return [...this.benchmarkHistory];
  }

  /**
   * Get performance trends
   */
  getPerformanceTrends(): {
    themeLoadTime: number[];
    cacheHitRate: number[];
    memoryUsage: number[];
    overallPerformance: number[];
  } {
    const trends = {
      themeLoadTime: [] as number[],
      cacheHitRate: [] as number[],
      memoryUsage: [] as number[],
      overallPerformance: [] as number[],
    };

    this.benchmarkHistory.forEach(suite => {
      const themeLoadResult = suite.results.find(r => r.name === 'theme-warm-load');
      const cacheHitResult = suite.results.find(r => r.name === 'cache-hit-rate');
      const memoryResult = suite.results.find(r => r.name === 'baseline-memory-usage');

      if (themeLoadResult?.success) {
        trends.themeLoadTime.push(themeLoadResult.duration);
      }
      if (cacheHitResult?.success) {
        trends.cacheHitRate.push(cacheHitResult.duration);
      }
      if (memoryResult?.success) {
        trends.memoryUsage.push(memoryResult.duration);
      }

      trends.overallPerformance.push(suite.successRate);
    });

    return trends;
  }

  /**
   * Generate performance report
   */
  generateReport(): {
    summary: {
      totalBenchmarks: number;
      averageSuccessRate: number;
      lastBenchmarkDate: Date | null;
      performanceTrend: 'improving' | 'stable' | 'declining';
    };
    recommendations: string[];
    criticalIssues: string[];
  } {
    const history = this.benchmarkHistory;
    const trends = this.getPerformanceTrends();
    
    const summary = {
      totalBenchmarks: history.length,
      averageSuccessRate: history.length > 0 
        ? history.reduce((sum, suite) => sum + suite.successRate, 0) / history.length 
        : 0,
      lastBenchmarkDate: history.length > 0 
        ? new Date(history[history.length - 1].timestamp) 
        : null,
      performanceTrend: this.calculatePerformanceTrend(trends) as 'improving' | 'stable' | 'declining',
    };

    const recommendations: string[] = [];
    const criticalIssues: string[] = [];

    // Analyze trends and generate recommendations
    if (trends.themeLoadTime.length > 1) {
      const recent = trends.themeLoadTime.slice(-3);
      const average = recent.reduce((sum, time) => sum + time, 0) / recent.length;
      
      if (average > 100) { // > 100ms
        criticalIssues.push('Theme loading time is too high (>100ms)');
        recommendations.push('Consider implementing more aggressive caching strategies');
      } else if (average > 50) { // > 50ms
        recommendations.push('Theme loading could be optimized further');
      }
    }

    if (trends.cacheHitRate.length > 0) {
      const latestHitRate = trends.cacheHitRate[trends.cacheHitRate.length - 1];
      if (latestHitRate < 90) {
        recommendations.push('Improve cache hit rate by preloading more common themes');
      }
    }

    if (trends.memoryUsage.length > 1) {
      const isIncreasing = trends.memoryUsage[trends.memoryUsage.length - 1] > 
                          trends.memoryUsage[trends.memoryUsage.length - 2];
      if (isIncreasing) {
        recommendations.push('Monitor memory usage - trend is increasing');
      }
    }

    return {
      summary,
      recommendations,
      criticalIssues,
    };
  }

  /**
   * Calculate performance trend
   */
  private calculatePerformanceTrend(trends: ReturnType<typeof this.getPerformanceTrends>): string {
    if (trends.overallPerformance.length < 2) return 'stable';

    const recent = trends.overallPerformance.slice(-3);
    const older = trends.overallPerformance.slice(-6, -3);

    if (recent.length === 0 || older.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;

    const difference = recentAvg - olderAvg;

    if (difference > 5) return 'improving';
    if (difference < -5) return 'declining';
    return 'stable';
  }
}

// Export the class for testing
export { PerformanceBenchmark };

// Singleton instance
export const performanceBenchmark = new PerformanceBenchmark();

// React hook for performance benchmarking
export function usePerformanceBenchmark() {
  const [isRunning, setIsRunning] = React.useState(false);
  const [lastResult, setLastResult] = React.useState<BenchmarkSuite | null>(null);
  const [history, setHistory] = React.useState(performanceBenchmark.getBenchmarkHistory());

  const runBenchmark = React.useCallback(async () => {
    setIsRunning(true);
    try {
      const result = await performanceBenchmark.runFullBenchmark();
      setLastResult(result);
      setHistory(performanceBenchmark.getBenchmarkHistory());
    } finally {
      setIsRunning(false);
    }
  }, []);

  const establishBaseline = React.useCallback(async (name?: string) => {
    return await performanceBenchmark.establishBaseline(name);
  }, []);

  const compareWithBaseline = React.useCallback(async (baselineName?: string) => {
    return await performanceBenchmark.compareWithBaseline(baselineName);
  }, []);

  const getReport = React.useCallback(() => {
    return performanceBenchmark.generateReport();
  }, []);

  return {
    isRunning,
    lastResult,
    history,
    runBenchmark,
    establishBaseline,
    compareWithBaseline,
    getReport,
    trends: performanceBenchmark.getPerformanceTrends(),
  };
}

export default performanceBenchmark;