/**
 * Advanced Asset Preloading System
 * Intelligent preloading for Framer Motion configurations, CSS keyframes, and theme assets
 */

import React from 'react';
import { cyberTheme } from './cybersecurity';

interface PreloadableAsset {
  type: 'animation' | 'css' | 'font' | 'image' | 'config';
  url?: string;
  data?: any;
  priority: 'critical' | 'high' | 'medium' | 'low';
  size: number;
  hash: string;
  dependencies?: string[];
}

interface PreloadingMetrics {
  totalAssets: number;
  loadedAssets: number;
  failedAssets: number;
  totalSize: number;
  loadedSize: number;
  averageLoadTime: number;
  cacheHitRate: number;
  compressionRatio: number;
}

interface NavigationPattern {
  from: string;
  to: string;
  frequency: number;
  lastAccessed: number;
  assets: string[];
}

interface UserAnalytics {
  navigationPatterns: NavigationPattern[];
  frequentlyUsedComponents: string[];
  deviceCapabilities: {
    connectionSpeed: 'slow' | 'fast' | 'unknown';
    memorySize: number;
    cpuCores: number;
    isLowEndDevice: boolean;
  };
  preferences: {
    reducedMotion: boolean;
    highContrast: boolean;
    animationQuality: 'high' | 'medium' | 'low';
  };
}

export class AssetPreloader {
  private assets = new Map<string, PreloadableAsset>();
  private loadedAssets = new Set<string>();
  private failedAssets = new Set<string>();
  private loadingPromises = new Map<string, Promise<void>>();
  private metrics: PreloadingMetrics = {
    totalAssets: 0,
    loadedAssets: 0,
    failedAssets: 0,
    totalSize: 0,
    loadedSize: 0,
    averageLoadTime: 0,
    cacheHitRate: 0,
    compressionRatio: 0,
  };
  private userAnalytics: UserAnalytics = {
    navigationPatterns: [],
    frequentlyUsedComponents: [],
    deviceCapabilities: {
      connectionSpeed: 'unknown',
      memorySize: 0,
      cpuCores: navigator.hardwareConcurrency || 4,
      isLowEndDevice: false,
    },
    preferences: {
      reducedMotion: false,
      highContrast: false,
      animationQuality: 'high',
    },
  };

  constructor() {
    this.initializeDeviceCapabilities();
    this.initializeUserPreferences();
    this.registerCriticalAssets();
  }

  /**
   * Initialize device capabilities detection
   */
  private initializeDeviceCapabilities(): void {
    // Detect connection speed
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        const effectiveType = connection.effectiveType;
        this.userAnalytics.deviceCapabilities.connectionSpeed = 
          ['slow-2g', '2g', '3g'].includes(effectiveType) ? 'slow' : 'fast';
      }
    }

    // Detect memory size
    if ('memory' in performance) {
      this.userAnalytics.deviceCapabilities.memorySize = (performance as any).memory?.jsHeapSizeLimit || 0;
    }

    // Detect low-end device
    this.userAnalytics.deviceCapabilities.isLowEndDevice = 
      this.userAnalytics.deviceCapabilities.cpuCores <= 2 ||
      this.userAnalytics.deviceCapabilities.memorySize < 1024 * 1024 * 1024; // < 1GB
  }

  /**
   * Initialize user preferences
   */
  private initializeUserPreferences(): void {
    // Detect reduced motion preference
    if (typeof window !== 'undefined') {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.userAnalytics.preferences.reducedMotion = reducedMotion.matches;

      // Detect high contrast preference
      const highContrast = window.matchMedia('(prefers-contrast: high)');
      this.userAnalytics.preferences.highContrast = highContrast.matches;

      // Set animation quality based on device capabilities
      if (this.userAnalytics.deviceCapabilities.isLowEndDevice || 
          this.userAnalytics.preferences.reducedMotion) {
        this.userAnalytics.preferences.animationQuality = 'low';
      } else if (this.userAnalytics.deviceCapabilities.connectionSpeed === 'slow') {
        this.userAnalytics.preferences.animationQuality = 'medium';
      }
    }
  }

  /**
   * Register critical assets that should be preloaded immediately
   */
  private registerCriticalAssets(): void {
    // Critical CSS keyframes
    this.registerAsset({
      type: 'css',
      data: this.generateCriticalKeyframes(),
      priority: 'critical',
      size: 2048,
      hash: 'critical-keyframes',
    });

    // Critical Framer Motion configurations
    this.registerAsset({
      type: 'animation',
      data: this.generateCriticalAnimationConfigs(),
      priority: 'critical',
      size: 1024,
      hash: 'critical-animations',
    });

    // Critical theme configuration
    this.registerAsset({
      type: 'config',
      data: cyberTheme,
      priority: 'critical',
      size: 4096,
      hash: 'critical-theme',
    });
  }

  /**
   * Generate critical CSS keyframes
   */
  private generateCriticalKeyframes(): string {
    return `
      @keyframes cyber-glow {
        0%, 100% { box-shadow: 0 0 20px currentColor; }
        50% { box-shadow: 0 0 30px currentColor, 0 0 40px currentColor; }
      }
      
      @keyframes cyber-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
      
      @keyframes cyber-scan {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
      
      @keyframes cyber-matrix {
        0% { background-position: 0% 0%; }
        100% { background-position: 100% 100%; }
      }
      
      @keyframes cyber-border-flow {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
    `;
  }

  /**
   * Generate critical Framer Motion configurations
   */
  private generateCriticalAnimationConfigs(): any {
    return {
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
      },
      buttonHover: {
        whileHover: { scale: 1.05, boxShadow: '0 0 25px currentColor' },
        whileTap: { scale: 0.95 },
        transition: { duration: 0.2 }
      },
      glassEffect: {
        initial: { backdropFilter: 'blur(0px)', opacity: 0 },
        animate: { backdropFilter: 'blur(20px)', opacity: 1 },
        transition: { duration: 0.5 }
      },
      neonGlow: {
        animate: {
          boxShadow: [
            '0 0 20px currentColor',
            '0 0 30px currentColor, 0 0 40px currentColor',
            '0 0 20px currentColor'
          ]
        },
        transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
      }
    };
  }

  /**
   * Register an asset for preloading
   */
  registerAsset(asset: Omit<PreloadableAsset, 'hash'> & { hash?: string }): void {
    const hash = asset.hash || this.generateAssetHash(asset);
    const fullAsset: PreloadableAsset = { ...asset, hash };
    
    this.assets.set(hash, fullAsset);
    this.metrics.totalAssets++;
    this.metrics.totalSize += asset.size;
  }

  /**
   * Generate hash for asset
   */
  private generateAssetHash(asset: any): string {
    const content = JSON.stringify(asset);
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  /**
   * Preload assets based on priority and user analytics
   */
  async preloadAssets(options: {
    priority?: 'critical' | 'high' | 'medium' | 'low';
    maxConcurrent?: number;
    respectDataSaver?: boolean;
  } = {}): Promise<void> {
    const {
      priority = 'medium',
      maxConcurrent = 4,
      respectDataSaver = true
    } = options;

    // Check if data saver is enabled
    if (respectDataSaver && this.isDataSaverEnabled()) {
      console.log('Data saver enabled, skipping non-critical preloading');
      return;
    }

    // Filter assets by priority
    const assetsToLoad = Array.from(this.assets.values())
      .filter(asset => this.shouldPreloadAsset(asset, priority))
      .sort((a, b) => this.getPriorityWeight(a.priority) - this.getPriorityWeight(b.priority));

    // Load assets with concurrency control
    const semaphore = new Semaphore(maxConcurrent);
    const loadPromises = assetsToLoad.map(asset => 
      semaphore.acquire().then(async (release) => {
        try {
          await this.loadAsset(asset);
        } finally {
          release();
        }
      })
    );

    await Promise.allSettled(loadPromises);
  }

  /**
   * Check if data saver is enabled
   */
  private isDataSaverEnabled(): boolean {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return connection?.saveData === true;
    }
    return false;
  }

  /**
   * Determine if asset should be preloaded for ultra-smooth performance
   */
  private shouldPreloadAsset(asset: PreloadableAsset, minPriority: string): boolean {
    const priorityWeight = this.getPriorityWeight(asset.priority);
    const minWeight = this.getPriorityWeight(minPriority);
    
    // Don't preload if already loaded or failed
    if (this.loadedAssets.has(asset.hash) || this.failedAssets.has(asset.hash)) {
      return false;
    }

    // Check priority
    if (priorityWeight > minWeight) {
      return false;
    }

    // Ultra-aggressive filtering for low-end devices to maintain smoothness
    if (this.userAnalytics.deviceCapabilities.isLowEndDevice) {
      if (asset.priority !== 'critical' && asset.priority !== 'high') {
        return false;
      }
      // Smaller size threshold for low-end devices
      if (asset.size > 5120) { // 5KB threshold for low-end
        return false;
      }
    }

    // Stricter connection speed filtering for ultra-smooth loading
    if (this.userAnalytics.deviceCapabilities.connectionSpeed === 'slow') {
      if (asset.size > 5120 && asset.priority !== 'critical') { // Reduced to 5KB
        return false;
      }
    }

    // Memory pressure consideration
    if (this.userAnalytics.deviceCapabilities.memorySize > 0) {
      const memoryUsageRatio = this.getCurrentMemoryUsage() / this.userAnalytics.deviceCapabilities.memorySize;
      if (memoryUsageRatio > 0.7 && asset.priority !== 'critical') { // 70% memory usage threshold
        return false;
      }
    }

    // Frame rate consideration - don't preload if performance is degrading
    if (typeof window !== 'undefined' && 'requestAnimationFrame' in window) {
      // This would be set by performance monitoring
      const currentFPS = (window as any).__currentFPS || 60;
      if (currentFPS < 55 && asset.priority !== 'critical') {
        return false;
      }
    }

    return true;
  }

  /**
   * Get current memory usage estimate
   */
  private getCurrentMemoryUsage(): number {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      return memory ? memory.usedJSHeapSize : 0;
    }
    return 0;
  }

  /**
   * Get priority weight for sorting
   */
  private getPriorityWeight(priority: string): number {
    const weights = { critical: 0, high: 1, medium: 2, low: 3 };
    return weights[priority as keyof typeof weights] || 2;
  }

  /**
   * Load individual asset
   */
  private async loadAsset(asset: PreloadableAsset): Promise<void> {
    const startTime = performance.now();
    
    try {
      // Check if already loading
      if (this.loadingPromises.has(asset.hash)) {
        await this.loadingPromises.get(asset.hash);
        return;
      }

      const loadPromise = this.performAssetLoad(asset);
      this.loadingPromises.set(asset.hash, loadPromise);
      
      await loadPromise;
      
      this.loadedAssets.add(asset.hash);
      this.metrics.loadedAssets++;
      this.metrics.loadedSize += asset.size;
      
      const loadTime = performance.now() - startTime;
      this.updateAverageLoadTime(loadTime);
      
    } catch (error) {
      console.warn(`Failed to preload asset ${asset.hash}:`, error);
      this.failedAssets.add(asset.hash);
      this.metrics.failedAssets++;
    } finally {
      this.loadingPromises.delete(asset.hash);
    }
  }

  /**
   * Perform the actual asset loading
   */
  private async performAssetLoad(asset: PreloadableAsset): Promise<void> {
    switch (asset.type) {
      case 'css':
        await this.loadCSSAsset(asset);
        break;
      case 'animation':
        await this.loadAnimationAsset(asset);
        break;
      case 'font':
        await this.loadFontAsset(asset);
        break;
      case 'image':
        await this.loadImageAsset(asset);
        break;
      case 'config':
        await this.loadConfigAsset(asset);
        break;
      default:
        throw new Error(`Unknown asset type: ${asset.type}`);
    }
  }

  /**
   * Load CSS asset
   */
  private async loadCSSAsset(asset: PreloadableAsset): Promise<void> {
    if (asset.url) {
      // Load external CSS
      const response = await fetch(asset.url);
      if (!response.ok) throw new Error(`Failed to load CSS: ${response.statusText}`);
      const css = await response.text();
      this.injectCSS(css, asset.hash);
    } else if (asset.data) {
      // Inject inline CSS
      this.injectCSS(asset.data, asset.hash);
    }
  }

  /**
   * Inject CSS into document
   */
  private injectCSS(css: string, id: string): void {
    if (typeof document === 'undefined') return;
    
    const existingStyle = document.getElementById(`preloaded-css-${id}`);
    if (existingStyle) return;
    
    const style = document.createElement('style');
    style.id = `preloaded-css-${id}`;
    style.textContent = css;
    document.head.appendChild(style);
  }

  /**
   * Load animation asset
   */
  private async loadAnimationAsset(asset: PreloadableAsset): Promise<void> {
    // Store animation configuration in memory for quick access
    if (asset.data) {
      (window as any).__preloadedAnimations = (window as any).__preloadedAnimations || {};
      (window as any).__preloadedAnimations[asset.hash] = asset.data;
    }
  }

  /**
   * Load font asset
   */
  private async loadFontAsset(asset: PreloadableAsset): Promise<void> {
    if (!asset.url) return;
    
    const font = new FontFace(asset.hash, `url(${asset.url})`);
    await font.load();
    document.fonts.add(font);
  }

  /**
   * Load image asset
   */
  private async loadImageAsset(asset: PreloadableAsset): Promise<void> {
    if (!asset.url) return;
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = asset.url!;
    });
  }

  /**
   * Load config asset
   */
  private async loadConfigAsset(asset: PreloadableAsset): Promise<void> {
    // Store configuration in memory
    if (asset.data) {
      (window as any).__preloadedConfigs = (window as any).__preloadedConfigs || {};
      (window as any).__preloadedConfigs[asset.hash] = asset.data;
    }
  }

  /**
   * Update average load time
   */
  private updateAverageLoadTime(newTime: number): void {
    if (this.metrics.averageLoadTime === 0) {
      this.metrics.averageLoadTime = newTime;
    } else {
      this.metrics.averageLoadTime = (this.metrics.averageLoadTime + newTime) / 2;
    }
  }

  /**
   * Predictive preloading based on navigation patterns
   */
  async predictivePreload(currentRoute: string): Promise<void> {
    const patterns = this.userAnalytics.navigationPatterns
      .filter(pattern => pattern.from === currentRoute)
      .sort((a, b) => b.frequency - a.frequency);

    for (const pattern of patterns.slice(0, 3)) { // Top 3 likely destinations
      const assetsToPreload = this.getAssetsForRoute(pattern.to);
      for (const assetHash of assetsToPreload) {
        const asset = this.assets.get(assetHash);
        if (asset && !this.loadedAssets.has(assetHash)) {
          // Preload with lower priority
          this.loadAsset({ ...asset, priority: 'low' });
        }
      }
    }
  }

  /**
   * Get assets required for a specific route
   */
  private getAssetsForRoute(route: string): string[] {
    // This would be configured based on route requirements
    const routeAssets: Record<string, string[]> = {
      '/dashboard': ['critical-theme', 'critical-animations', 'dashboard-charts'],
      '/tenants': ['critical-theme', 'table-animations', 'form-validations'],
      '/analytics': ['critical-theme', 'chart-animations', 'data-visualizations'],
      '/subscriptions': ['critical-theme', 'subscription-animations', 'payment-forms'],
    };
    
    return routeAssets[route] || ['critical-theme', 'critical-animations'];
  }

  /**
   * Record navigation pattern for analytics
   */
  recordNavigation(from: string, to: string): void {
    const existingPattern = this.userAnalytics.navigationPatterns
      .find(p => p.from === from && p.to === to);
    
    if (existingPattern) {
      existingPattern.frequency++;
      existingPattern.lastAccessed = Date.now();
    } else {
      this.userAnalytics.navigationPatterns.push({
        from,
        to,
        frequency: 1,
        lastAccessed: Date.now(),
        assets: this.getAssetsForRoute(to),
      });
    }
    
    // Keep only recent patterns (last 30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    this.userAnalytics.navigationPatterns = this.userAnalytics.navigationPatterns
      .filter(pattern => pattern.lastAccessed > thirtyDaysAgo);
  }

  /**
   * Get preloading metrics
   */
  getMetrics(): PreloadingMetrics {
    this.metrics.cacheHitRate = this.metrics.totalAssets > 0 
      ? (this.metrics.loadedAssets / this.metrics.totalAssets) * 100 
      : 0;
    
    return { ...this.metrics };
  }

  /**
   * Get user analytics
   */
  getUserAnalytics(): UserAnalytics {
    return { ...this.userAnalytics };
  }

  /**
   * Clear all preloaded assets
   */
  clear(): void {
    this.loadedAssets.clear();
    this.failedAssets.clear();
    this.loadingPromises.clear();
    
    // Remove injected CSS
    if (typeof document !== 'undefined') {
      const styles = document.querySelectorAll('[id^="preloaded-css-"]');
      styles.forEach(style => style.remove());
    }
    
    // Clear global storage
    if (typeof window !== 'undefined') {
      delete (window as any).__preloadedAnimations;
      delete (window as any).__preloadedConfigs;
    }
    
    this.metrics = {
      totalAssets: this.assets.size,
      loadedAssets: 0,
      failedAssets: 0,
      totalSize: Array.from(this.assets.values()).reduce((sum, asset) => sum + asset.size, 0),
      loadedSize: 0,
      averageLoadTime: 0,
      cacheHitRate: 0,
      compressionRatio: 0,
    };
  }
}

/**
 * Semaphore for concurrency control
 */
class Semaphore {
  private permits: number;
  private waitQueue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      if (this.permits > 0) {
        this.permits--;
        resolve(() => {
          this.permits++;
          if (this.waitQueue.length > 0) {
            const next = this.waitQueue.shift()!;
            next();
          }
        });
      } else {
        this.waitQueue.push(() => {
          this.permits--;
          resolve(() => {
            this.permits++;
            if (this.waitQueue.length > 0) {
              const next = this.waitQueue.shift()!;
              next();
            }
          });
        });
      }
    });
  }
}

// Singleton instance
export const assetPreloader = new AssetPreloader();

// React hook for asset preloading
export function useAssetPreloader() {
  const [metrics, setMetrics] = React.useState(assetPreloader.getMetrics());
  const [isPreloading, setIsPreloading] = React.useState(false);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(assetPreloader.getMetrics());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const preloadAssets = React.useCallback(async (options?: any) => {
    setIsPreloading(true);
    try {
      await assetPreloader.preloadAssets(options);
    } finally {
      setIsPreloading(false);
    }
  }, []);

  const predictivePreload = React.useCallback(async (route: string) => {
    await assetPreloader.predictivePreload(route);
  }, []);

  const recordNavigation = React.useCallback((from: string, to: string) => {
    assetPreloader.recordNavigation(from, to);
  }, []);

  return {
    metrics,
    isPreloading,
    preloadAssets,
    predictivePreload,
    recordNavigation,
    userAnalytics: assetPreloader.getUserAnalytics(),
  };
}

export default assetPreloader;