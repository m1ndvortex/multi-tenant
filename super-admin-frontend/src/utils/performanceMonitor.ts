// Performance monitoring utilities for dashboard optimization

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  type: 'timing' | 'counter' | 'gauge';
}

interface ComponentRenderMetric {
  componentName: string;
  renderTime: number;
  propsHash: string;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private renderMetrics: ComponentRenderMetric[] = [];
  private observers: PerformanceObserver[] = [];
  private isEnabled: boolean = process.env.NODE_ENV === 'development';

  constructor() {
    if (this.isEnabled && typeof window !== 'undefined') {
      this.initializeObservers();
    }
  }

  private initializeObservers() {
    // Observe navigation timing
    if ('PerformanceObserver' in window) {
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.recordMetric('page_load_time', navEntry.loadEventEnd - navEntry.fetchStart, 'timing');
            this.recordMetric('dom_content_loaded', navEntry.domContentLoadedEventEnd - navEntry.fetchStart, 'timing');
            this.recordMetric('first_paint', navEntry.loadEventEnd - navEntry.fetchStart, 'timing');
          }
        }
      });

      try {
        navObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navObserver);
      } catch (e) {
        console.warn('Navigation timing observer not supported');
      }
    }
  }

  recordMetric(name: string, value: number, type: PerformanceMetric['type'] = 'gauge') {
    if (!this.isEnabled) return;

    this.metrics.push({
      name,
      value,
      timestamp: Date.now(),
      type,
    });

    // Keep only last 1000 metrics to prevent memory leaks
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  recordComponentRender(componentName: string, renderTime: number, props: any = {}) {
    if (!this.isEnabled) return;

    const propsHash = this.hashProps(props);
    
    this.renderMetrics.push({
      componentName,
      renderTime,
      propsHash,
      timestamp: Date.now(),
    });

    // Keep only last 500 render metrics
    if (this.renderMetrics.length > 500) {
      this.renderMetrics = this.renderMetrics.slice(-500);
    }
  }

  private hashProps(props: any): string {
    try {
      return btoa(JSON.stringify(props)).slice(0, 10);
    } catch {
      return 'unknown';
    }
  }

  // Timing utilities
  startTiming(name: string): () => void {
    const startTime = performance.now();
    return () => {
      const endTime = performance.now();
      this.recordMetric(name, endTime - startTime, 'timing');
    };
  }

  // Bundle size analysis
  analyzeBundleSize(): Promise<{ totalSize: number; chunks: Array<{ name: string; size: number }> }> {
    return new Promise((resolve) => {
      if ('performance' in window && 'getEntriesByType' in performance) {
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        const jsResources = resources.filter(resource => 
          resource.name.endsWith('.js') && resource.transferSize > 0
        );

        const chunks = jsResources.map(resource => ({
          name: resource.name.split('/').pop() || 'unknown',
          size: resource.transferSize,
        }));

        const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);

        resolve({ totalSize, chunks });
      } else {
        resolve({ totalSize: 0, chunks: [] });
      }
    });
  }

  // Memory usage monitoring
  getMemoryUsage(): { used: number; total: number; percentage: number } | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100,
      };
    }
    return null;
  }

  // Get performance summary
  getPerformanceSummary(): {
    metrics: PerformanceMetric[];
    renderMetrics: ComponentRenderMetric[];
    slowestComponents: Array<{ name: string; avgRenderTime: number; renderCount: number }>;
    memoryUsage: ReturnType<typeof this.getMemoryUsage>;
  } {
    // Calculate slowest components
    const componentStats = new Map<string, { totalTime: number; count: number }>();
    
    this.renderMetrics.forEach(metric => {
      const existing = componentStats.get(metric.componentName) || { totalTime: 0, count: 0 };
      componentStats.set(metric.componentName, {
        totalTime: existing.totalTime + metric.renderTime,
        count: existing.count + 1,
      });
    });

    const slowestComponents = Array.from(componentStats.entries())
      .map(([name, stats]) => ({
        name,
        avgRenderTime: stats.totalTime / stats.count,
        renderCount: stats.count,
      }))
      .sort((a, b) => b.avgRenderTime - a.avgRenderTime)
      .slice(0, 10);

    return {
      metrics: this.metrics.slice(-100), // Last 100 metrics
      renderMetrics: this.renderMetrics.slice(-50), // Last 50 render metrics
      slowestComponents,
      memoryUsage: this.getMemoryUsage(),
    };
  }

  // Clear all metrics
  clearMetrics() {
    this.metrics = [];
    this.renderMetrics = [];
  }

  // Cleanup observers
  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// React hook for component performance monitoring
export function usePerformanceMonitor(componentName: string) {
  const startRender = () => performance.now();
  
  const endRender = (startTime: number, props?: any) => {
    const renderTime = performance.now() - startTime;
    performanceMonitor.recordComponentRender(componentName, renderTime, props);
  };

  return { startRender, endRender };
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Utility functions for performance optimization
export const performanceUtils = {
  // Debounce function for expensive operations
  debounce(func: Function, wait: number): Function {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(null, args), wait);
    };
  },

  // Throttle function for frequent events
  throttle(func: Function, limit: number): Function {
    let inThrottle: boolean;
    return (...args: any[]) => {
      if (!inThrottle) {
        func.apply(null, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // Measure component render time
  measureRender(name: string, renderFn: () => any): any {
    const endTiming = performanceMonitor.startTiming(`render_${name}`);
    const result = renderFn();
    endTiming();
    return result;
  },

  // Check if device has limited resources
  isLowEndDevice(): boolean {
    if ('hardwareConcurrency' in navigator) {
      return navigator.hardwareConcurrency <= 2;
    }
    return false;
  },

  // Get connection speed
  getConnectionSpeed(): 'slow' | 'fast' | 'unknown' {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection.effectiveType) {
        return ['slow-2g', '2g', '3g'].includes(connection.effectiveType) ? 'slow' : 'fast';
      }
    }
    return 'unknown';
  },
};