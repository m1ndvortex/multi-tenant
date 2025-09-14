/**
 * Ultra-Performance Theme Optimization System
 * Provides zero-lag, buttery-smooth theme loading with intelligent optimization
 */

import React from 'react';
import { CyberTheme, cyberTheme, generateCyberThemeCSS, RTLConfiguration, ltrConfig } from './theme/cybersecurity';
import { CacheManager } from './theme/cache';
import { lazyAnimationManager } from './theme/lazy-animations';
import { assetPreloader } from './theme/asset-preloader';
import { serviceWorkerManager } from './theme/service-worker';
import { ultraPerformanceMonitor } from './theme/ultra-performance-monitor';
import { ultraSmoothAnimations } from './theme/ultra-smooth-animations';

interface UltraOptimizationConfig {
  enableCaching: boolean;
  enableLazyLoading: boolean;
  enablePreloading: boolean;
  enableServiceWorker: boolean;
  enableUltraMode: boolean;
  performanceMode: 'ultra' | 'high' | 'balanced' | 'battery' | 'auto';
  targetFrameRate: number;
  memoryLimit: number;
  jankThreshold: number;
  adaptiveQuality: boolean;
  gpuAcceleration: boolean;
  predictivePreloading: boolean;
}

interface UltraOptimizationMetrics {
  cacheHitRate: number;
  averageLoadTime: number;
  memoryUsage: number;
  frameRate: number;
  jankPercentage: number;
  optimizationLevel: number;
  performanceScore: number;
  gpuAcceleration: boolean;
  batteryLevel?: number;
  thermalState?: string;
  networkLatency: number;
}

class UltraThemeOptimizationSystem {
  private config: UltraOptimizationConfig = {
    enableCaching: true,
    enableLazyLoading: true,
    enablePreloading: true,
    enableServiceWorker: true,
    enableUltraMode: true,
    performanceMode: 'ultra',
    targetFrameRate: 120, // Ultra-smooth target
    memoryLimit: 100 * 1024 * 1024, // 100MB
    jankThreshold: 1, // <1% jank for ultra-smooth
    adaptiveQuality: true,
    gpuAcceleration: true,
    predictivePreloading: true,
  };

  private metrics: UltraOptimizationMetrics = {
    cacheHitRate: 0,
    averageLoadTime: 0,
    memoryUsage: 0,
    frameRate: 120,
    jankPercentage: 0,
    optimizationLevel: 100,
    performanceScore: 100,
    gpuAcceleration: false,
    networkLatency: 0,
  };

  private optimizationQueue: Array<() => Promise<void>> = [];
  private isOptimizing = false;
  private lastOptimization = 0;

  constructor() {
    this.initializeUltraOptimization();
  }

  /**
   * Initialize the ultra-performance optimization system
   */
  private async initializeUltraOptimization(): Promise<void> {
    console.log('🚀 Initializing Ultra-Performance Theme System...');

    // Initialize ultra-performance monitoring
    this.startUltraPerformanceMonitoring();

    // Initialize cache system with ultra-fast settings
    if (this.config.enableCaching) {
      await this.initializeUltraCache();
    }

    // Initialize ultra-smooth animations
    this.initializeUltraAnimations();

    // Initialize service worker with ultra-fast caching
    if (this.config.enableServiceWorker) {
      await this.initializeUltraServiceWorker();
    }

    // Initialize predictive preloading with ML-like patterns
    if (this.config.enablePreloading) {
      await this.initializeUltraPredictivePreloading();
    }

    // Start adaptive optimization
    this.startAdaptiveOptimization();

    console.log('✅ Ultra-Performance Theme System initialized');
  }

  /**
   * Initialize ultra-fast cache system
   */
  private async initializeUltraCache(): Promise<void> {
    // Preload critical themes immediately
    await CacheManager.preloadThemes();
    
    // Warm up cache with common theme variations
    const commonThemes = [
      { theme: cyberTheme, rtlConfig: ltrConfig },
      { theme: cyberTheme, rtlConfig: { ...ltrConfig, direction: 'rtl' } },
    ];

    await Promise.all(
      commonThemes.map(({ theme, rtlConfig }) => 
        CacheManager.getOptimizedTheme(theme, rtlConfig)
      )
    );
  }

  /**
   * Initialize ultra-smooth animations
   */
  private initializeUltraAnimations(): void {
    // Configure for ultra-smooth performance
    ultraSmoothAnimations.updateConfig({
      quality: 'ultra',
      targetFPS: this.config.targetFrameRate,
      enableGPU: this.config.gpuAcceleration,
      adaptiveQuality: this.config.adaptiveQuality,
    });
  }

  /**
   * Initialize ultra-fast service worker
   */
  private async initializeUltraServiceWorker(): Promise<void> {
    try {
      // Service worker auto-initializes with ultra-fast settings
      await new Promise(resolve => setTimeout(resolve, 100)); // Allow SW to initialize
    } catch (error) {
      console.warn('Service worker initialization failed:', error);
    }
  }

  /**
   * Initialize ultra-predictive preloading
   */
  private async initializeUltraPredictivePreloading(): Promise<void> {
    // Preload critical assets immediately
    await assetPreloader.preloadAssets({ 
      priority: 'critical',
      maxConcurrent: 8, // Increased concurrency for ultra-fast loading
    });

    // Initialize navigation pattern learning
    this.initializeNavigationLearning();
  }

  /**
   * Get ultra-optimized theme with zero-lag performance
   */
  async getUltraOptimizedTheme(
    theme: CyberTheme = cyberTheme,
    rtlConfig: RTLConfiguration = ltrConfig,
    options: {
      priority?: 'critical' | 'high' | 'medium' | 'low';
      preload?: boolean;
      compress?: boolean;
      ultraMode?: boolean;
    } = {}
  ) {
    const startTime = performance.now();
    const { ultraMode = this.config.enableUltraMode } = options;

    try {
      // Ultra-fast cache lookup with parallel operations
      const [cachedTheme, preloadPromise] = await Promise.all([
        CacheManager.getOptimizedTheme(theme, rtlConfig),
        options.preload ? this.ultraPreloadRelatedAssets(theme) : Promise.resolve(),
      ]);

      const loadTime = performance.now() - startTime;

      // Ultra-performance target: <5ms for cached themes
      if (loadTime > 5 && ultraMode) {
        console.warn(`Theme load took ${loadTime.toFixed(2)}ms - optimizing...`);
        this.queueOptimization(() => this.optimizeThemeLoading(theme, rtlConfig));
      }

      // Update ultra-performance metrics
      this.updateUltraMetrics(loadTime, true);

      return cachedTheme;
    } catch (error) {
      console.error('Ultra theme optimization failed:', error);
      
      // Ultra-fast fallback
      const css = generateCyberThemeCSS(theme);
      const loadTime = performance.now() - startTime;
      
      this.updateUltraMetrics(loadTime, false);

      return {
        theme,
        css,
        rtlConfig,
        timestamp: Date.now(),
        hash: 'ultra-fallback',
        version: '1.0.0',
        compressed: false,
        size: css.length,
        accessCount: 1,
        lastAccessed: Date.now(),
      };
    }
  }

  /**
   * Ultra-fast preloading of related assets
   */
  private async ultraPreloadRelatedAssets(theme: CyberTheme): Promise<void> {
    // Parallel preloading with high concurrency
    const preloadPromises = [
      assetPreloader.preloadAssets({ 
        priority: 'high',
        maxConcurrent: 6,
        respectDataSaver: false, // Ultra mode ignores data saver
      }),
      lazyAnimationManager.preloadByPriority('high'),
    ];

    // Don't wait for all - return immediately after starting
    Promise.allSettled(preloadPromises);
  }

  /**
   * Start ultra-performance monitoring
   */
  private startUltraPerformanceMonitoring(): void {
    // High-frequency performance monitoring
    setInterval(() => {
      const ultraMetrics = ultraPerformanceMonitor.getMetrics();
      
      this.metrics = {
        ...this.metrics,
        frameRate: ultraMetrics.frameRate,
        jankPercentage: ultraMetrics.jankPercentage,
        memoryUsage: ultraMetrics.memoryUsage,
        performanceScore: ultraPerformanceMonitor.getPerformanceScore(),
        gpuAcceleration: ultraMetrics.gpuAcceleration,
        batteryLevel: ultraMetrics.batteryLevel,
        thermalState: ultraMetrics.thermalState,
        networkLatency: ultraMetrics.networkLatency,
      };

      // Update optimization level
      this.updateUltraOptimizationLevel();
    }, 500); // 2Hz monitoring for ultra-responsiveness
  }

  /**
   * Update ultra-optimization level
   */
  private updateUltraOptimizationLevel(): void {
    let level = 0;

    // Frame rate contribution (0-30 points) - higher weight for ultra-smooth
    const fpsRatio = this.metrics.frameRate / this.config.targetFrameRate;
    level += Math.min(30, fpsRatio * 30);

    // Jank contribution (0-25 points) - critical for ultra-smooth
    const jankScore = Math.max(0, 25 - (this.metrics.jankPercentage / this.config.jankThreshold) * 25);
    level += jankScore;

    // Cache hit rate contribution (0-20 points)
    level += this.metrics.cacheHitRate * 0.2;

    // Memory usage contribution (0-15 points)
    const memoryRatio = this.metrics.memoryUsage / this.config.memoryLimit;
    const memoryScore = Math.max(0, 15 - memoryRatio * 15);
    level += memoryScore;

    // Load time contribution (0-10 points) - ultra-fast target
    const loadTimeScore = Math.max(0, 10 - (this.metrics.averageLoadTime / 5) * 10); // 5ms target
    level += loadTimeScore;

    this.metrics.optimizationLevel = Math.min(100, level);

    // Trigger adaptive optimization
    this.triggerAdaptiveOptimization();
  }

  /**
   * Trigger adaptive optimization based on performance
   */
  private triggerAdaptiveOptimization(): void {
    if (this.metrics.optimizationLevel < 80) {
      // Performance degradation - queue optimizations
      this.queueOptimization(() => this.performUltraOptimization());
    }
  }

  /**
   * Queue optimization for smooth execution
   */
  private queueOptimization(optimizationFn: () => Promise<void>): void {
    this.optimizationQueue.push(optimizationFn);
    this.processOptimizationQueue();
  }

  /**
   * Process optimization queue without blocking UI
   */
  private async processOptimizationQueue(): Promise<void> {
    if (this.isOptimizing || this.optimizationQueue.length === 0) return;

    // Throttle optimizations to prevent performance impact
    const now = Date.now();
    if (now - this.lastOptimization < 1000) return; // Max once per second

    this.isOptimizing = true;
    this.lastOptimization = now;

    try {
      const optimization = this.optimizationQueue.shift();
      if (optimization) {
        await optimization();
      }
    } catch (error) {
      console.warn('Optimization failed:', error);
    } finally {
      this.isOptimizing = false;
      
      // Process next optimization in next frame
      if (this.optimizationQueue.length > 0) {
        requestAnimationFrame(() => this.processOptimizationQueue());
      }
    }
  }

  /**
   * Perform ultra-optimization
   */
  private async performUltraOptimization(): Promise<void> {
    console.log('� Performingt ultra-optimization...');

    // Parallel optimization operations
    const optimizations = [
      this.optimizeCache(),
      this.optimizeAnimations(),
      this.optimizeMemory(),
      this.optimizePreloading(),
    ];

    await Promise.allSettled(optimizations);
    console.log('✅ Ultra-optimization complete');
  }

  /**
   * Optimize cache for ultra-performance
   */
  private async optimizeCache(): Promise<void> {
    const cacheMetrics = CacheManager.getPerformanceMetrics();
    
    if (cacheMetrics.cache.hitRate < 95) {
      // Preload more common themes
      await CacheManager.preloadThemes();
    }

    if (cacheMetrics.cache.averageLoadTime > 5) {
      // Clear and rebuild cache for faster access
      await CacheManager.clearAllCaches();
      await this.initializeUltraCache();
    }
  }

  /**
   * Optimize animations for ultra-smoothness
   */
  private async optimizeAnimations(): Promise<void> {
    if (this.metrics.frameRate < this.config.targetFrameRate * 0.9) {
      // Reduce animation quality
      ultraSmoothAnimations.updateConfig({
        quality: this.metrics.frameRate > 60 ? 'high' : 'medium',
        targetFPS: Math.max(60, this.config.targetFrameRate * 0.8),
      });
    }

    if (this.metrics.jankPercentage > this.config.jankThreshold) {
      // Enable more aggressive optimization
      ultraSmoothAnimations.updateConfig({
        enableGPU: true,
        enableWillChange: true,
        enableTransform3D: true,
      });
    }
  }

  /**
   * Optimize memory usage
   */
  private async optimizeMemory(): Promise<void> {
    if (this.metrics.memoryUsage > this.config.memoryLimit * 0.8) {
      // Clear non-essential caches
      lazyAnimationManager.clear();
      
      // Trigger garbage collection if available
      if ('gc' in window) {
        (window as any).gc();
      }
    }
  }

  /**
   * Optimize preloading strategy
   */
  private async optimizePreloading(): Promise<void> {
    const preloadMetrics = assetPreloader.getMetrics();
    
    if (preloadMetrics.cacheHitRate < 90) {
      // Improve preloading patterns
      await assetPreloader.preloadAssets({
        priority: 'high',
        maxConcurrent: 4,
      });
    }
  }

  /**
   * Optimize theme loading performance
   */
  private async optimizeThemeLoading(theme: CyberTheme, rtlConfig: RTLConfiguration): Promise<void> {
    // Pre-generate and cache optimized CSS
    const optimizedCSS = CacheManager.optimizeForProduction(theme, {
      minify: true,
      extractCritical: true,
    });

    // Store in high-priority cache
    await CacheManager.getOptimizedTheme(theme, rtlConfig);
  }

  /**
   * Initialize navigation learning for predictive preloading
   */
  private initializeNavigationLearning(): void {
    let currentRoute = window.location.pathname;

    const handleRouteChange = () => {
      const newRoute = window.location.pathname;
      if (newRoute !== currentRoute) {
        // Record navigation pattern
        assetPreloader.recordNavigation(currentRoute, newRoute);
        
        // Trigger ultra-fast predictive preloading
        this.ultraPredictivePreload(newRoute);
        
        currentRoute = newRoute;
      }
    };

    // Listen for all navigation events
    window.addEventListener('popstate', handleRouteChange);
    
    // Override history methods for SPA navigation
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      handleRouteChange();
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      handleRouteChange();
    };
  }

  /**
   * Ultra-fast predictive preloading
   */
  private async ultraPredictivePreload(route: string): Promise<void> {
    // Immediate preloading without waiting
    Promise.allSettled([
      assetPreloader.predictivePreload(route),
      lazyAnimationManager.preloadForRoute(route),
    ]);
  }

  /**
   * Start adaptive optimization system
   */
  private startAdaptiveOptimization(): void {
    // Continuous adaptive optimization
    setInterval(() => {
      if (this.config.adaptiveQuality) {
        this.adaptToCurrentPerformance();
      }
    }, 2000); // Every 2 seconds
  }

  /**
   * Adapt to current performance conditions
   */
  private adaptToCurrentPerformance(): void {
    const score = this.metrics.performanceScore;
    
    if (score < 60) {
      // Poor performance - aggressive optimization
      this.config.performanceMode = 'battery';
      this.queueOptimization(() => this.performUltraOptimization());
    } else if (score < 80) {
      // Moderate performance - balanced optimization
      this.config.performanceMode = 'balanced';
    } else if (score > 90) {
      // Excellent performance - enable ultra mode
      this.config.performanceMode = 'ultra';
    }
  }

  /**
   * Update ultra-performance metrics
   */
  private updateUltraMetrics(loadTime: number, cacheHit: boolean): void {
    // Exponential moving average for smooth metrics
    const alpha = 0.1;
    this.metrics.averageLoadTime = 
      this.metrics.averageLoadTime * (1 - alpha) + loadTime * alpha;

    // Update cache hit rate
    if (cacheHit) {
      this.metrics.cacheHitRate = Math.min(100, this.metrics.cacheHitRate + 0.5);
    } else {
      this.metrics.cacheHitRate = Math.max(0, this.metrics.cacheHitRate - 0.1);
    }
  }

  /**
   * Get ultra-performance metrics
   */
  getUltraMetrics(): UltraOptimizationMetrics {
    return { ...this.metrics };
  }

  /**
   * Get ultra-optimization configuration
   */
  getUltraConfig(): UltraOptimizationConfig {
    return { ...this.config };
  }

  /**
   * Update ultra-optimization configuration
   */
  updateUltraConfig(newConfig: Partial<UltraOptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Apply configuration changes immediately
    if (newConfig.targetFrameRate) {
      ultraSmoothAnimations.updateConfig({
        targetFPS: newConfig.targetFrameRate,
      });
    }
  }

  /**
   * Clear all ultra-optimizations
   */
  async clearUltraOptimizations(): Promise<void> {
    console.log('🧹 Clearing ultra-optimizations...');
    
    await Promise.all([
      CacheManager.clearAllCaches(),
      new Promise<void>((resolve) => {
        lazyAnimationManager.clear();
        resolve();
      }),
      new Promise<void>((resolve) => {
        assetPreloader.clear();
        resolve();
      }),
    ]);
    
    console.log('✅ Ultra-optimizations cleared');
  }

  /**
   * Get ultra-performance recommendations
   */
  getUltraRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.metrics.frameRate < this.config.targetFrameRate * 0.8) {
      recommendations.push(`Frame rate below target: ${this.metrics.frameRate.toFixed(1)}/${this.config.targetFrameRate} FPS`);
    }

    if (this.metrics.jankPercentage > this.config.jankThreshold) {
      recommendations.push(`High jank detected: ${this.metrics.jankPercentage.toFixed(1)}% (target: <${this.config.jankThreshold}%)`);
    }

    if (this.metrics.cacheHitRate < 95) {
      recommendations.push(`Cache hit rate below optimal: ${this.metrics.cacheHitRate.toFixed(1)}% (target: >95%)`);
    }

    if (this.metrics.averageLoadTime > 5) {
      recommendations.push(`Load time above ultra-fast target: ${this.metrics.averageLoadTime.toFixed(1)}ms (target: <5ms)`);
    }

    if (this.metrics.memoryUsage > this.config.memoryLimit * 0.8) {
      recommendations.push(`High memory usage: ${(this.metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB`);
    }

    if (!this.metrics.gpuAcceleration) {
      recommendations.push('GPU acceleration not available - consider enabling hardware acceleration');
    }

    if (this.metrics.networkLatency > 100) {
      recommendations.push(`High network latency: ${this.metrics.networkLatency.toFixed(1)}ms`);
    }

    return recommendations;
  }

  /**
   * Get performance status for ultra-smooth experience
   */
  getUltraPerformanceStatus(): {
    status: 'ultra' | 'excellent' | 'good' | 'fair' | 'poor';
    score: number;
    isOptimal: boolean;
  } {
    const score = this.metrics.performanceScore;
    
    let status: 'ultra' | 'excellent' | 'good' | 'fair' | 'poor';
    if (score >= 95) status = 'ultra';
    else if (score >= 85) status = 'excellent';
    else if (score >= 70) status = 'good';
    else if (score >= 50) status = 'fair';
    else status = 'poor';

    const isOptimal = 
      this.metrics.frameRate >= this.config.targetFrameRate * 0.9 &&
      this.metrics.jankPercentage <= this.config.jankThreshold &&
      this.metrics.averageLoadTime <= 5 &&
      this.metrics.cacheHitRate >= 95;

    return { status, score, isOptimal };
  }
}

// Singleton instance
export const ultraThemeOptimization = new UltraThemeOptimizationSystem();

// React hook for ultra theme optimization
export function useUltraThemeOptimization() {
  const [metrics, setMetrics] = React.useState(ultraThemeOptimization.getUltraMetrics());
  const [config, setConfig] = React.useState(ultraThemeOptimization.getUltraConfig());
  const [status, setStatus] = React.useState(ultraThemeOptimization.getUltraPerformanceStatus());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(ultraThemeOptimization.getUltraMetrics());
      setConfig(ultraThemeOptimization.getUltraConfig());
      setStatus(ultraThemeOptimization.getUltraPerformanceStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getUltraOptimizedTheme = React.useCallback(async (
    theme?: CyberTheme,
    rtlConfig?: RTLConfiguration,
    options?: any
  ) => {
    return await ultraThemeOptimization.getUltraOptimizedTheme(theme, rtlConfig, options);
  }, []);

  const clearUltraOptimizations = React.useCallback(async () => {
    await ultraThemeOptimization.clearUltraOptimizations();
  }, []);

  const updateConfig = React.useCallback((newConfig: Partial<UltraOptimizationConfig>) => {
    ultraThemeOptimization.updateUltraConfig(newConfig);
  }, []);

  return {
    metrics,
    config,
    status,
    getUltraOptimizedTheme,
    clearUltraOptimizations,
    updateConfig,
    recommendations: ultraThemeOptimization.getUltraRecommendations(),
  };
}

// Legacy compatibility exports
export const themeOptimization = ultraThemeOptimization;
export const useThemeOptimization = useUltraThemeOptimization;

// Legacy utility exports for backward compatibility
export const optimizeTheme = (theme: any, options?: any) => {
  return ultraThemeOptimization.getUltraOptimizedTheme(theme, ltrConfig, options);
};

export const getThemeMetrics = () => {
  return ultraThemeOptimization.getUltraMetrics();
};

export const getCacheStats = () => {
  const metrics = ultraThemeOptimization.getUltraMetrics();
  return {
    size: 0, // Legacy compatibility
    hitRate: metrics.cacheHitRate,
    memoryUsage: metrics.memoryUsage,
  };
};

export const clearThemeCache = () => {
  ultraThemeOptimization.clearUltraOptimizations();
};

export const optimizeThemePerformance = () => {
  // Trigger optimization through the queue system
  ultraThemeOptimization['queueOptimization'](() => 
    ultraThemeOptimization['performUltraOptimization']()
  );
};

export default ultraThemeOptimization;