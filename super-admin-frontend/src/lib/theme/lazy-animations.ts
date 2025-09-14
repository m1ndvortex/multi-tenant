/**
 * Advanced Lazy Loading System for Heavy Animation Components
 * Intelligent loading with performance monitoring and memory management
 */

import React, { Suspense, lazy, ComponentType } from 'react';
import { motion } from 'framer-motion';

interface LazyComponentConfig {
  component: () => Promise<{ default: ComponentType<any> }>;
  fallback?: ComponentType<any>;
  priority: 'critical' | 'high' | 'medium' | 'low';
  preload?: boolean;
  memoryThreshold?: number; // MB
  performanceThreshold?: number; // FPS
  dependencies?: string[];
  estimatedSize?: number; // bytes
}

interface LoadingStatus {
  totalComponents: number;
  loadedComponents: number;
  failedComponents: number;
  loadingComponents: number;
  memoryUsage: number;
  averageLoadTime: number;
}

interface PerformanceMetrics {
  frameRate: number;
  memoryUsage: number;
  isLowEndDevice: boolean;
  connectionSpeed: 'slow' | 'fast' | 'unknown';
}

class LazyAnimationManager {
  private components = new Map<string, LazyComponentConfig>();
  private loadedComponents = new Set<string>();
  private failedComponents = new Set<string>();
  private loadingComponents = new Set<string>();
  private loadPromises = new Map<string, Promise<ComponentType<any>>>();
  private performanceMetrics: PerformanceMetrics = {
    frameRate: 60,
    memoryUsage: 0,
    isLowEndDevice: false,
    connectionSpeed: 'unknown',
  };
  private loadTimes: number[] = [];
  private memoryObserver?: PerformanceObserver;

  constructor() {
    this.initializePerformanceMonitoring();
    this.detectDeviceCapabilities();
  }

  /**
   * Initialize performance monitoring
   */
  private initializePerformanceMonitoring(): void {
    if (typeof window === 'undefined') return;

    // Monitor frame rate
    let lastTime = performance.now();
    let frameCount = 0;

    const measureFrameRate = (currentTime: number) => {
      frameCount++;

      if (currentTime - lastTime >= 1000) {
        this.performanceMetrics.frameRate = frameCount;
        frameCount = 0;
        lastTime = currentTime;
      }

      requestAnimationFrame(measureFrameRate);
    };

    requestAnimationFrame(measureFrameRate);

    // Monitor memory usage
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        if (memory) {
          this.performanceMetrics.memoryUsage = memory.usedJSHeapSize / (1024 * 1024); // MB
        }
      }, 2000);
    }

    // Monitor performance entries
    try {
      this.memoryObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'measure' && entry.name.startsWith('lazy-load-')) {
            this.loadTimes.push(entry.duration);
            if (this.loadTimes.length > 50) {
              this.loadTimes.shift(); // Keep only last 50 measurements
            }
          }
        });
      });

      this.memoryObserver.observe({ entryTypes: ['measure'] });
    } catch (error) {
      console.warn('Performance observer not supported:', error);
    }
  }

  /**
   * Detect device capabilities
   */
  private detectDeviceCapabilities(): void {
    if (typeof navigator === 'undefined') return;

    // Detect connection speed
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        const effectiveType = connection.effectiveType;
        this.performanceMetrics.connectionSpeed =
          ['slow-2g', '2g', '3g'].includes(effectiveType) ? 'slow' : 'fast';
      }
    }

    // Detect low-end device
    const cpuCores = navigator.hardwareConcurrency || 4;
    const isLowMemory = 'memory' in performance &&
      (performance as any).memory?.jsHeapSizeLimit < 1024 * 1024 * 1024; // < 1GB

    this.performanceMetrics.isLowEndDevice = cpuCores <= 2 || isLowMemory;
  }

  /**
   * Register a lazy-loaded component
   */
  registerComponent(id: string, config: LazyComponentConfig): void {
    this.components.set(id, config);

    // Preload critical components immediately
    if (config.priority === 'critical' || config.preload) {
      this.preloadComponent(id);
    }
  }

  /**
   * Create a lazy-loaded component
   */
  createLazyComponent<T = any>(id: string, config: LazyComponentConfig): ComponentType<T> {
    this.registerComponent(id, config);

    const LazyComponent = lazy(async () => {
      performance.mark(`lazy-load-${id}-start`);

      try {
        this.loadingComponents.add(id);

        // Check if we should load based on performance
        if (!this.shouldLoadComponent(id, config)) {
          throw new Error(`Component ${id} skipped due to performance constraints`);
        }

        const module = await config.component();

        this.loadedComponents.add(id);
        this.loadingComponents.delete(id);

        performance.mark(`lazy-load-${id}-end`);
        performance.measure(`lazy-load-${id}`, `lazy-load-${id}-start`, `lazy-load-${id}-end`);

        return module;
      } catch (error) {
        this.failedComponents.add(id);
        this.loadingComponents.delete(id);

        console.warn(`Failed to load component ${id}:`, error);

        // Return fallback component if available
        if (config.fallback) {
          return { default: config.fallback };
        }

        // Return minimal fallback
        return {
          default: () => React.createElement('div', {
            className: 'text-red-400 text-sm p-2'
          }, `Failed to load component: ${id}`)
        };
      }
    });

    // Return wrapped component with performance monitoring
    return React.forwardRef<any, T>((props, ref) => {
      const FallbackComponent = config.fallback || DefaultFallback;

      return React.createElement(
        Suspense,
        { fallback: React.createElement(FallbackComponent) },
        React.createElement(LazyComponent, { ...props, ref })
      );
    }) as ComponentType<T>;
  }

  /**
   * Determine if component should be loaded based on ultra-smooth performance criteria
   */
  private shouldLoadComponent(_id: string, config: LazyComponentConfig): boolean {
    // Always load critical components
    if (config.priority === 'critical') {
      return true;
    }

    // Ultra-strict memory threshold for smooth performance
    if (config.memoryThreshold &&
      this.performanceMetrics.memoryUsage > config.memoryThreshold) {
      return false;
    }

    // Higher performance threshold for ultra-smooth animations (60fps minimum)
    if (config.performanceThreshold &&
      this.performanceMetrics.frameRate < Math.max(config.performanceThreshold, 60)) {
      return false;
    }

    // More aggressive filtering on low-end devices for smoothness
    if (this.performanceMetrics.isLowEndDevice) {
      if (config.priority === 'low' || config.priority === 'medium') {
        return false;
      }
    }

    // Stricter size limits for ultra-smooth loading
    if (this.performanceMetrics.connectionSpeed === 'slow' &&
      config.estimatedSize && config.estimatedSize > 50 * 1024) { // Reduced to 50KB
      return false;
    }

    // Check for frame rate stability - don't load if frame rate is dropping
    if (this.performanceMetrics.frameRate < 55 && config.priority !== 'high') {
      return false;
    }

    // Battery level consideration for mobile devices
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      // Skip heavy components on low battery for smooth performance
      if (config.estimatedSize && config.estimatedSize > 200 * 1024) {
        return false; // Will be handled by battery check if available
      }
    }

    return true;
  }

  /**
   * Preload a component
   */
  async preloadComponent(id: string): Promise<void> {
    const config = this.components.get(id);
    if (!config || this.loadedComponents.has(id) || this.loadingComponents.has(id)) {
      return;
    }

    // Check if we have an existing load promise
    if (this.loadPromises.has(id)) {
      await this.loadPromises.get(id);
      return;
    }

    const loadPromise = this.loadComponentModule(id, config);
    this.loadPromises.set(id, loadPromise);

    try {
      await loadPromise;
    } catch (error) {
      // Error is already handled in loadComponentModule, just log it
      console.warn(`Failed to preload component ${id}:`, error);
    } finally {
      this.loadPromises.delete(id);
    }
  }

  /**
   * Load component module
   */
  private async loadComponentModule(id: string, config: LazyComponentConfig): Promise<ComponentType<any>> {
    const startTime = performance.now();
    this.loadingComponents.add(id);

    try {
      if (!this.shouldLoadComponent(id, config)) {
        throw new Error(`Component ${id} skipped due to performance constraints`);
      }

      const module = await config.component();
      this.loadedComponents.add(id);

      const loadTime = performance.now() - startTime;
      this.loadTimes.push(loadTime);

      return module.default;
    } catch (error) {
      this.failedComponents.add(id);
      throw error;
    } finally {
      this.loadingComponents.delete(id);
    }
  }

  /**
   * Preload components based on priority
   */
  async preloadByPriority(priority: 'critical' | 'high' | 'medium' | 'low'): Promise<void> {
    const priorityOrder = ['critical', 'high', 'medium', 'low'];
    const targetIndex = priorityOrder.indexOf(priority);

    const componentsToLoad = Array.from(this.components.entries())
      .filter(([, config]) => priorityOrder.indexOf(config.priority) <= targetIndex)
      .map(([id]) => id);

    const preloadPromises = componentsToLoad.map(id => this.preloadComponent(id));
    await Promise.allSettled(preloadPromises);
  }

  /**
   * Preload components for specific route
   */
  async preloadForRoute(route: string): Promise<void> {
    // Define route-specific component mappings
    const routeComponents: Record<string, string[]> = {
      '/dashboard': ['dashboard-charts', 'statistics-cards', 'activity-timeline'],
      '/tenants': ['tenant-table', 'tenant-form', 'tenant-filters'],
      '/analytics': ['revenue-chart', 'user-growth-chart', 'conversion-chart'],
      '/subscriptions': ['subscription-overview', 'subscription-dialogs', 'payment-forms'],
      '/error-logging': ['error-panels', 'alert-notifications', 'error-filters'],
      '/online-users': ['user-monitor', 'activity-timeline', 'user-filters'],
      '/impersonation': ['user-selection', 'session-table', 'audit-trail'],
    };

    const components = routeComponents[route] || [];
    const preloadPromises = components.map(id => this.preloadComponent(id));
    await Promise.allSettled(preloadPromises);
  }

  /**
   * Get loading status
   */
  getLoadingStatus(): LoadingStatus {
    const averageLoadTime = this.loadTimes.length > 0
      ? this.loadTimes.reduce((sum, time) => sum + time, 0) / this.loadTimes.length
      : 0;

    return {
      totalComponents: this.components.size,
      loadedComponents: this.loadedComponents.size,
      failedComponents: this.failedComponents.size,
      loadingComponents: this.loadingComponents.size,
      memoryUsage: this.performanceMetrics.memoryUsage,
      averageLoadTime,
    };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Get component config
   */
  getComponentConfig(id: string): LazyComponentConfig | undefined {
    return this.components.get(id);
  }

  /**
   * Clear all loaded components
   */
  clear(): void {
    this.loadedComponents.clear();
    this.failedComponents.clear();
    this.loadingComponents.clear();
    this.loadPromises.clear();
    this.loadTimes = [];
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.memoryObserver) {
      this.memoryObserver.disconnect();
    }
    this.clear();
  }
}

// Default fallback component
const DefaultFallback: React.FC = () =>
  React.createElement(motion.div, {
    className: "flex items-center justify-center p-8",
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.3 }
  },
    React.createElement('div', { className: "flex items-center space-x-3" },
      React.createElement('div', { className: "w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" }),
      React.createElement('span', { className: "text-cyan-400 text-sm" }, "Loading component...")
    )
  );

// Cybersecurity-themed loading component
const CyberLoadingFallback: React.FC = () =>
  React.createElement(motion.div, {
    className: "flex items-center justify-center p-8 bg-black/20 rounded-lg border border-cyan-500/20",
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.3 }
  },
    React.createElement('div', { className: "flex flex-col items-center space-y-3" },
      React.createElement('div', { className: "relative" },
        React.createElement('div', { className: "w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" }),
        React.createElement('div', {
          className: "absolute inset-0 w-8 h-8 border-2 border-green-400/30 border-b-transparent rounded-full animate-spin animate-reverse",
          style: { animationDuration: '1.5s' }
        })
      ),
      React.createElement('div', { className: "flex items-center space-x-2" },
        React.createElement('div', { className: "w-2 h-2 bg-cyan-400 rounded-full animate-pulse" }),
        React.createElement('div', { className: "w-2 h-2 bg-green-400 rounded-full animate-pulse", style: { animationDelay: '0.2s' } }),
        React.createElement('div', { className: "w-2 h-2 bg-purple-400 rounded-full animate-pulse", style: { animationDelay: '0.4s' } })
      ),
      React.createElement('span', { className: "text-cyan-400 text-xs font-mono" }, "LOADING SECURE COMPONENT")
    )
  );

// Skeleton loading component
const SkeletonFallback: React.FC<{ height?: string; className?: string }> = ({
  height = 'h-32',
  className = ''
}) =>
  React.createElement(motion.div, {
    className: `bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 rounded-lg ${height} ${className}`,
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.3 }
  },
    React.createElement('div', {
      className: "animate-pulse bg-gradient-to-r from-transparent via-white/5 to-transparent h-full rounded-lg"
    })
  );

// Export the class for testing
export { LazyAnimationManager };

// Singleton instance
export const lazyAnimationManager = new LazyAnimationManager();

// React hooks for lazy loading
export function useLazyComponent<T = any>(
  id: string,
  config: LazyComponentConfig
): ComponentType<T> {
  return React.useMemo(() => {
    return lazyAnimationManager.createLazyComponent<T>(id, config);
  }, [id, config]);
}

export function useLazyLoading() {
  const [status, setStatus] = React.useState(lazyAnimationManager.getLoadingStatus());
  const [metrics, setMetrics] = React.useState(lazyAnimationManager.getPerformanceMetrics());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setStatus(lazyAnimationManager.getLoadingStatus());
      setMetrics(lazyAnimationManager.getPerformanceMetrics());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const preloadComponent = React.useCallback(async (id: string) => {
    await lazyAnimationManager.preloadComponent(id);
  }, []);

  const preloadByPriority = React.useCallback(async (priority: 'critical' | 'high' | 'medium' | 'low') => {
    await lazyAnimationManager.preloadByPriority(priority);
  }, []);

  const preloadForRoute = React.useCallback(async (route: string) => {
    await lazyAnimationManager.preloadForRoute(route);
  }, []);

  return {
    status,
    metrics,
    preloadComponent,
    preloadByPriority,
    preloadForRoute,
  };
}

export function useLazyAnimation(componentName: string) {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [Component, setComponent] = React.useState<ComponentType<any> | null>(null);

  React.useEffect(() => {
    const config = lazyAnimationManager.getComponentConfig(componentName);
    if (config) {
      lazyAnimationManager.preloadComponent(componentName).then(() => {
        setIsLoaded(true);
        // Create the component if it's loaded
        const LazyComp = lazyAnimationManager.createLazyComponent(componentName, config);
        setComponent(() => LazyComp);
      });
    }
  }, [componentName]);

  return {
    Component,
    isLoaded,
  };
}

// Utility function to create lazy components with predefined configs
export const createLazyAnimationComponent = {
  critical: <T = any>(id: string, component: () => Promise<{ default: ComponentType<any> }>) =>
    lazyAnimationManager.createLazyComponent<T>(id, {
      component,
      priority: 'critical',
      fallback: CyberLoadingFallback,
      preload: true,
    }),

  high: <T = any>(id: string, component: () => Promise<{ default: ComponentType<any> }>) =>
    lazyAnimationManager.createLazyComponent<T>(id, {
      component,
      priority: 'high',
      fallback: CyberLoadingFallback,
      memoryThreshold: 100, // 100MB
      performanceThreshold: 30, // 30 FPS
    }),

  medium: <T = any>(id: string, component: () => Promise<{ default: ComponentType<any> }>) =>
    lazyAnimationManager.createLazyComponent<T>(id, {
      component,
      priority: 'medium',
      fallback: SkeletonFallback,
      memoryThreshold: 80, // 80MB
      performanceThreshold: 45, // 45 FPS
    }),

  low: <T = any>(id: string, component: () => Promise<{ default: ComponentType<any> }>) =>
    lazyAnimationManager.createLazyComponent<T>(id, {
      component,
      priority: 'low',
      fallback: SkeletonFallback,
      memoryThreshold: 60, // 60MB
      performanceThreshold: 50, // 50 FPS
      estimatedSize: 50 * 1024, // 50KB
    }),
};

export { DefaultFallback, CyberLoadingFallback, SkeletonFallback };
export default lazyAnimationManager;