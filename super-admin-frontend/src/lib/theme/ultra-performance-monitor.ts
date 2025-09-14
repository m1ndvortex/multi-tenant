/**
 * Ultra Performance Monitor for Zero-Lag Animation System
 * Provides real-time performance monitoring with aggressive optimization
 */

import React from 'react';

interface UltraPerformanceMetrics {
  frameRate: number;
  frameTimeVariance: number;
  jankPercentage: number;
  memoryUsage: number;
  memoryPressure: 'low' | 'medium' | 'high' | 'critical';
  gpuAcceleration: boolean;
  batteryLevel?: number;
  thermalState?: 'nominal' | 'fair' | 'serious' | 'critical';
  networkLatency: number;
  cacheEfficiency: number;
  animationQuality: 'ultra' | 'high' | 'medium' | 'low' | 'minimal';
}

interface PerformanceThresholds {
  targetFPS: number;
  maxFrameTime: number;
  maxJankPercentage: number;
  maxMemoryUsage: number;
  minCacheHitRate: number;
}

interface OptimizationAction {
  type: 'reduce_quality' | 'disable_animations' | 'clear_cache' | 'throttle_updates' | 'emergency_cleanup';
  priority: number;
  description: string;
  execute: () => Promise<void>;
}

class UltraPerformanceMonitor {
  private metrics: UltraPerformanceMetrics = {
    frameRate: 60,
    frameTimeVariance: 0,
    jankPercentage: 0,
    memoryUsage: 0,
    memoryPressure: 'low',
    gpuAcceleration: false,
    networkLatency: 0,
    cacheEfficiency: 100,
    animationQuality: 'ultra',
  };

  private thresholds: PerformanceThresholds = {
    targetFPS: 120, // Ultra-smooth target
    maxFrameTime: 8.33, // 120fps = 8.33ms per frame
    maxJankPercentage: 1, // Less than 1% jank
    maxMemoryUsage: 100 * 1024 * 1024, // 100MB
    minCacheHitRate: 98, // 98% cache hit rate
  };

// @ts-ignore
  private _frameTimeHistory: number[] = [];
// @ts-ignore
// @ts-ignore
  private memoryHistory: number[] = [];
// @ts-ignore
// @ts-ignore
  private _isMonitoring = false;
// @ts-ignore
  private _optimizationQueue: OptimizationAction[] = [];
  private lastOptimization = 0;
  private performanceObserver?: PerformanceObserver;
  private animationFrameId?: number;

  constructor() {
    this.initializeMonitoring();
    this.detectHardwareCapabilities();
  }

  /**
   * Initialize ultra-performance monitoring
   */
  private initializeMonitoring(): void {
    if (typeof window === 'undefined') return;

    // High-frequency frame rate monitoring
    this.startFrameRateMonitoring();

    // Memory monitoring
    this.startMemoryMonitoring();

    // Network latency monitoring
    this.startNetworkMonitoring();

    // Performance observer for detailed metrics
    this.initializePerformanceObserver();

    // Battery and thermal monitoring (if available)
    this.initializeBatteryMonitoring();
  }

  /**
   * Start ultra-precise frame rate monitoring
   */
  private startFrameRateMonitoring(): void {
    let lastFrameTime = performance.now();
    let frameCount = 0;
    const frameTimes: number[] = [];

    const measureFrame = (currentTime: number) => {
      const frameTime = currentTime - lastFrameTime;
      frameTimes.push(frameTime);
      frameCount++;

      // Keep only last 120 frames for analysis
      if (frameTimes.length > 120) {
        frameTimes.shift();
      }

      // Calculate metrics every 60 frames
      if (frameCount % 60 === 0) {
        this.updateFrameMetrics(frameTimes);
      }

      lastFrameTime = currentTime;
      this.animationFrameId = requestAnimationFrame(measureFrame);
    };

    this.animationFrameId = requestAnimationFrame(measureFrame);
  }

  /**
   * Update frame-related metrics
   */
  private updateFrameMetrics(frameTimes: number[]): void {
    if (frameTimes.length === 0) return;

    // Calculate FPS
    const avgFrameTime = frameTimes.reduce((sum, time) => sum + time, 0) / frameTimes.length;
    this.metrics.frameRate = 1000 / avgFrameTime;

    // Calculate frame time variance (smoothness indicator)
    const variance = frameTimes.reduce((sum, time) => {
      return sum + Math.pow(time - avgFrameTime, 2);
    }, 0) / frameTimes.length;
    this.metrics.frameTimeVariance = Math.sqrt(variance);

    // Calculate jank percentage (frames taking >1.5x average time)
    const jankThreshold = avgFrameTime * 1.5;
    const jankFrames = frameTimes.filter(time => time > jankThreshold).length;
    this.metrics.jankPercentage = (jankFrames / frameTimes.length) * 100;

    // Trigger optimization if performance degrades
    this.checkPerformanceThresholds();
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    if (!('memory' in performance)) return;

    setInterval(() => {
      const memory = (performance as any).memory;
      if (memory) {
        this.metrics.memoryUsage = memory.usedJSHeapSize;
        this.memoryHistory.push(memory.usedJSHeapSize);

        // Keep only last 60 measurements (1 minute at 1s intervals)
        if (this.memoryHistory.length > 60) {
          this.memoryHistory.shift();
        }

        this.updateMemoryPressure();
      }
    }, 1000);
  }

  /**
   * Update memory pressure level
   */
  private updateMemoryPressure(): void {
    const memoryUsage = this.metrics.memoryUsage;
    const memoryLimit = (performance as any).memory?.jsHeapSizeLimit || 2147483648; // 2GB default

    const usagePercentage = (memoryUsage / memoryLimit) * 100;

    if (usagePercentage > 85) {
      this.metrics.memoryPressure = 'critical';
    } else if (usagePercentage > 70) {
      this.metrics.memoryPressure = 'high';
    } else if (usagePercentage > 50) {
      this.metrics.memoryPressure = 'medium';
    } else {
      this.metrics.memoryPressure = 'low';
    }

    // Trigger memory cleanup if needed
    if (this.metrics.memoryPressure === 'critical') {
      this.triggerEmergencyCleanup();
    }
  }

  /**
   * Start network latency monitoring
   */
  private startNetworkMonitoring(): void {
    setInterval(async () => {
      try {
        const startTime = performance.now();
        await fetch('/api/ping', { method: 'HEAD' }).catch(() => {});
        this.metrics.networkLatency = performance.now() - startTime;
      } catch {
        // Network monitoring failed, use cached value
      }
    }, 10000); // Every 10 seconds
  }

  /**
   * Initialize performance observer
   */
  private initializePerformanceObserver(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        entries.forEach((entry) => {
          if (entry.entryType === 'measure') {
            // Track custom performance measurements
            if (entry.name.startsWith('theme-')) {
              this.updateCacheEfficiency(entry.duration);
            }
          } else if (entry.entryType === 'longtask') {
            // Detect long tasks that could cause jank
            this.handleLongTask(entry as any);
          }
        });
      });

      this.performanceObserver.observe({ 
        entryTypes: ['measure', 'longtask', 'paint', 'navigation'] 
      });
    } catch (error) {
      console.warn('Performance observer initialization failed:', error);
    }
  }

  /**
   * Initialize battery monitoring
   */
  private async initializeBatteryMonitoring(): Promise<void> {
    if (!('getBattery' in navigator)) return;

    try {
      const battery = await (navigator as any).getBattery();
      this.metrics.batteryLevel = battery.level * 100;

      battery.addEventListener('levelchange', () => {
        this.metrics.batteryLevel = battery.level * 100;
        this.adjustPerformanceForBattery();
      });

      battery.addEventListener('chargingchange', () => {
        this.adjustPerformanceForBattery();
      });
    } catch (error) {
      console.warn('Battery monitoring not available:', error);
    }
  }

  /**
   * Detect hardware capabilities
   */
  private detectHardwareCapabilities(): void {
    if (typeof document === 'undefined') {
      this.metrics.gpuAcceleration = false;
      return;
    }

    try {
      // GPU acceleration detection
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      this.metrics.gpuAcceleration = !!gl;
    } catch (error) {
      // Fallback for test environments without Canvas support
      this.metrics.gpuAcceleration = false;
    }

    // Thermal state detection (if available)
    if (typeof navigator !== 'undefined' && 'deviceThermalState' in navigator) {
      this.metrics.thermalState = (navigator as any).deviceThermalState;
    }
  }

  /**
   * Check performance thresholds and trigger optimizations
   */
  private checkPerformanceThresholds(): void {
    const actions: OptimizationAction[] = [];

    // Frame rate optimization
    if (this.metrics.frameRate < this.thresholds.targetFPS * 0.8) { // 80% of target
      actions.push({
        type: 'reduce_quality',
        priority: 1,
        description: `FPS below target: ${this.metrics.frameRate.toFixed(1)}/${this.thresholds.targetFPS}`,
        execute: async () => this.reduceAnimationQuality(),
      });
    }

    // Jank optimization
    if (this.metrics.jankPercentage > this.thresholds.maxJankPercentage) {
      actions.push({
        type: 'throttle_updates',
        priority: 2,
        description: `High jank percentage: ${this.metrics.jankPercentage.toFixed(1)}%`,
        execute: async () => this.throttleUpdates(),
      });
    }

    // Memory optimization
    if (this.metrics.memoryUsage > this.thresholds.maxMemoryUsage) {
      actions.push({
        type: 'clear_cache',
        priority: 3,
        description: `High memory usage: ${(this.metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB`,
        execute: async () => this.clearCaches(),
      });
    }

    // Execute optimizations
    this.executeOptimizations(actions);
  }

  /**
   * Execute optimization actions
   */
  private async executeOptimizations(actions: OptimizationAction[]): Promise<void> {
    if (actions.length === 0) return;

    // Prevent too frequent optimizations
    const now = Date.now();
    if (now - this.lastOptimization < 1000) return; // Max once per second

    this.lastOptimization = now;

    // Sort by priority and execute
    actions.sort((a, b) => a.priority - b.priority);

    for (const action of actions) {
      try {
        await action.execute();
        console.log(`Performance optimization executed: ${action.description}`);
      } catch (error) {
        console.warn(`Optimization failed: ${action.description}`, error);
      }
    }
  }

  /**
   * Reduce animation quality for better performance
   */
  private async reduceAnimationQuality(): Promise<void> {
    const currentQuality = this.metrics.animationQuality;
    
    switch (currentQuality) {
      case 'ultra':
        this.metrics.animationQuality = 'high';
        break;
      case 'high':
        this.metrics.animationQuality = 'medium';
        break;
      case 'medium':
        this.metrics.animationQuality = 'low';
        break;
      case 'low':
        this.metrics.animationQuality = 'minimal';
        break;
      default:
        // Already at minimal
        break;
    }

    // Notify animation system of quality change
    window.dispatchEvent(new CustomEvent('animation-quality-change', {
      detail: { quality: this.metrics.animationQuality }
    }));
  }

  /**
   * Throttle updates to improve performance
   */
  private async throttleUpdates(): Promise<void> {
    // Reduce update frequency for non-critical animations
    window.dispatchEvent(new CustomEvent('throttle-animations', {
      detail: { throttle: true }
    }));
  }

  /**
   * Clear caches to free memory
   */
  private async clearCaches(): Promise<void> {
    // Import cache manager dynamically to avoid circular dependencies
    const { CacheManager } = await import('./cache');
    await CacheManager.clearAllCaches();
  }

  /**
   * Emergency cleanup for critical performance issues
   */
  private async triggerEmergencyCleanup(): Promise<void> {
    console.warn('Emergency performance cleanup triggered');

    // Disable all non-critical animations
    this.metrics.animationQuality = 'minimal';
    
    // Clear all caches
    await this.clearCaches();
    
    // Force garbage collection if available
    if ('gc' in window) {
      (window as any).gc();
    }

    // Notify application of emergency state
    window.dispatchEvent(new CustomEvent('performance-emergency', {
      detail: { metrics: this.metrics }
    }));
  }

  /**
   * Handle long tasks that could cause jank
   */
  private handleLongTask(entry: any): void {
    console.warn(`Long task detected: ${entry.duration}ms`);
    
    // If long tasks are frequent, reduce animation quality
    if (entry.duration > 50) { // 50ms+ tasks are problematic
      this.reduceAnimationQuality();
    }
  }

  /**
   * Update cache efficiency metrics
   */
  private updateCacheEfficiency(duration: number): void {
    // Calculate cache efficiency based on operation duration
    const efficiency = Math.max(0, 100 - (duration / 10)); // 10ms = 0% efficiency
    this.metrics.cacheEfficiency = (this.metrics.cacheEfficiency + efficiency) / 2;
  }

  /**
   * Adjust performance based on battery level
   */
  private adjustPerformanceForBattery(): void {
    if (this.metrics.batteryLevel === undefined) return;

    // Reduce performance on low battery
    if (this.metrics.batteryLevel < 20) {
      this.metrics.animationQuality = 'low';
    } else if (this.metrics.batteryLevel < 50) {
      this.metrics.animationQuality = 'medium';
    }

    window.dispatchEvent(new CustomEvent('battery-performance-adjust', {
      detail: { 
        batteryLevel: this.metrics.batteryLevel,
        quality: this.metrics.animationQuality 
      }
    }));
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): UltraPerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get performance score (0-100)
   */
  getPerformanceScore(): number {
    const fpsScore = Math.min(100, (this.metrics.frameRate / this.thresholds.targetFPS) * 100);
    const jankScore = Math.max(0, 100 - (this.metrics.jankPercentage * 10));
    const memoryScore = Math.max(0, 100 - ((this.metrics.memoryUsage / this.thresholds.maxMemoryUsage) * 100));
    const cacheScore = this.metrics.cacheEfficiency;

    return (fpsScore + jankScore + memoryScore + cacheScore) / 4;
  }

  /**
   * Check if performance is optimal for ultra-smooth animations
   */
  isOptimalPerformance(): boolean {
    return (
      this.metrics.frameRate >= this.thresholds.targetFPS * 0.9 &&
      this.metrics.jankPercentage <= this.thresholds.maxJankPercentage &&
      this.metrics.memoryPressure !== 'critical' &&
      this.metrics.cacheEfficiency >= this.thresholds.minCacheHitRate
    );
  }

  /**
   * Get performance recommendations
   */
  getRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.metrics.frameRate < this.thresholds.targetFPS) {
      recommendations.push('Consider reducing animation complexity or enabling hardware acceleration');
    }

    if (this.metrics.jankPercentage > this.thresholds.maxJankPercentage) {
      recommendations.push('Optimize long-running tasks or use web workers for heavy computations');
    }

    if (this.metrics.memoryPressure === 'high' || this.metrics.memoryPressure === 'critical') {
      recommendations.push('Clear unused caches and optimize memory usage');
    }

    if (!this.metrics.gpuAcceleration) {
      recommendations.push('Enable GPU acceleration for smoother animations');
    }

    if (this.metrics.cacheEfficiency < this.thresholds.minCacheHitRate) {
      recommendations.push('Optimize caching strategy for better performance');
    }

    return recommendations;
  }

  /**
   * Cleanup monitoring resources
   */
  cleanup(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }

    this._isMonitoring = false;
  }
}

// Singleton instance
export const ultraPerformanceMonitor = new UltraPerformanceMonitor();

// React hook for ultra performance monitoring
export function useUltraPerformance() {
  const [metrics, setMetrics] = React.useState(ultraPerformanceMonitor.getMetrics());
  const [score, setScore] = React.useState(ultraPerformanceMonitor.getPerformanceScore());
  const [isOptimal, setIsOptimal] = React.useState(ultraPerformanceMonitor.isOptimalPerformance());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(ultraPerformanceMonitor.getMetrics());
      setScore(ultraPerformanceMonitor.getPerformanceScore());
      setIsOptimal(ultraPerformanceMonitor.isOptimalPerformance());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const recommendations = React.useMemo(() => {
    return ultraPerformanceMonitor.getRecommendations();
  }, [metrics]);

  return {
    metrics,
    score,
    isOptimal,
    recommendations,
  };
}

export default ultraPerformanceMonitor;