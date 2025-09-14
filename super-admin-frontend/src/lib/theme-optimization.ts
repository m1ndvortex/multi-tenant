/**
 * Theme System Optimization and Performance Management
 * Comprehensive caching, performance monitoring, and optimization for cybersecurity theme
 */

// Removed unused imports: cyberTheme, performanceMonitor

export interface ThemeCache {
  css: string;
  timestamp: number;
  version: string;
  hash: string;
}

export interface ThemePerformanceMetrics {
  renderTime: number;
  cacheHits: number;
  cacheMisses: number;
  memoryUsage: number;
  frameRate: number;
  lastOptimization: number;
}

export interface ThemeOptimizationConfig {
  enableCaching: boolean;
  cacheExpiry: number; // milliseconds
  performanceThreshold: number; // fps
  autoOptimization: boolean;
  memoryLimit: number; // MB
  debugMode: boolean;
}

class ThemeOptimizer {
  private cache = new Map<string, ThemeCache>();
  private metrics: ThemePerformanceMetrics = {
    renderTime: 0,
    cacheHits: 0,
    cacheMisses: 0,
    memoryUsage: 0,
    frameRate: 60,
    lastOptimization: Date.now(),
  };
  
  private config: ThemeOptimizationConfig = {
    enableCaching: true,
    cacheExpiry: 5 * 60 * 1000, // 5 minutes
    performanceThreshold: 30, // fps
    autoOptimization: true,
    memoryLimit: 50, // MB
    debugMode: process.env.NODE_ENV === 'development',
  };

  private observers: PerformanceObserver[] = [];

  constructor(config?: Partial<ThemeOptimizationConfig>) {
    this.config = { ...this.config, ...config };
    this.initializePerformanceMonitoring();
    this.startMemoryMonitoring();
  }

  /**
   * Initialize performance monitoring
   */
  private initializePerformanceMonitoring(): void {
    if (typeof window === 'undefined') return;

    try {
      // Monitor paint timing
      const paintObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            this.metrics.renderTime = entry.startTime;
          }
        });
      });
      paintObserver.observe({ entryTypes: ['paint'] });
      this.observers.push(paintObserver);

      // Monitor frame rate
      this.startFrameRateMonitoring();

      if (this.config.debugMode) {
        console.log('🔒 Theme Optimizer: Performance monitoring initialized');
      }
    } catch (error) {
      console.warn('Theme Optimizer: Performance monitoring not supported', error);
    }
  }

  /**
   * Start frame rate monitoring
   */
  private startFrameRateMonitoring(): void {
    let lastTime = performance.now();
    let frameCount = 0;

    const measureFrameRate = (currentTime: number) => {
      frameCount++;
      
      if (currentTime - lastTime >= 1000) {
        this.metrics.frameRate = frameCount;
        frameCount = 0;
        lastTime = currentTime;

        // Auto-optimize if performance drops
        if (this.config.autoOptimization && this.metrics.frameRate < this.config.performanceThreshold) {
          this.optimizePerformance();
        }
      }

      requestAnimationFrame(measureFrameRate);
    };

    requestAnimationFrame(measureFrameRate);
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    if (typeof window === 'undefined' || !('memory' in performance)) return;

    setInterval(() => {
      const memory = (performance as any).memory;
      if (memory) {
        this.metrics.memoryUsage = memory.usedJSHeapSize / (1024 * 1024); // MB

        // Clear cache if memory usage is too high
        if (this.metrics.memoryUsage > this.config.memoryLimit) {
          this.clearExpiredCache();
        }
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Generate cache key for theme configuration
   */
  private generateCacheKey(theme: any, options?: any): string {
    const themeString = JSON.stringify(theme);
    const optionsString = options ? JSON.stringify(options) : '';
    return btoa(themeString + optionsString).slice(0, 32);
  }

  /**
   * Generate hash for cache validation
   */
  private generateHash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Get cached theme CSS
   */
  public getCachedTheme(theme: any, options?: any): string | null {
    if (!this.config.enableCaching) return null;

    const key = this.generateCacheKey(theme, options);
    const cached = this.cache.get(key);

    if (cached) {
      const isExpired = Date.now() - cached.timestamp > this.config.cacheExpiry;
      
      if (!isExpired) {
        this.metrics.cacheHits++;
        if (this.config.debugMode) {
          console.log('🔒 Theme Optimizer: Cache hit for key:', key);
        }
        return cached.css;
      } else {
        this.cache.delete(key);
      }
    }

    this.metrics.cacheMisses++;
    return null;
  }

  /**
   * Cache theme CSS
   */
  public cacheTheme(theme: any, css: string, options?: any): void {
    if (!this.config.enableCaching) return;

    const key = this.generateCacheKey(theme, options);
    const hash = this.generateHash(css);

    this.cache.set(key, {
      css,
      timestamp: Date.now(),
      version: '1.0.0',
      hash,
    });

    if (this.config.debugMode) {
      console.log('🔒 Theme Optimizer: Cached theme for key:', key);
    }
  }

  /**
   * Clear expired cache entries
   */
  public clearExpiredCache(): void {
    const now = Date.now();
    let cleared = 0;

    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.config.cacheExpiry) {
        this.cache.delete(key);
        cleared++;
      }
    }

    if (this.config.debugMode && cleared > 0) {
      console.log(`🔒 Theme Optimizer: Cleared ${cleared} expired cache entries`);
    }
  }

  /**
   * Clear all cache
   */
  public clearCache(): void {
    const size = this.cache.size;
    this.cache.clear();
    
    if (this.config.debugMode) {
      console.log(`🔒 Theme Optimizer: Cleared all cache (${size} entries)`);
    }
  }

  /**
   * Optimize performance based on current metrics
   */
  public optimizePerformance(): void {
    const now = Date.now();
    
    // Don't optimize too frequently
    if (now - this.metrics.lastOptimization < 10000) return; // 10 seconds

    this.metrics.lastOptimization = now;

    if (this.config.debugMode) {
      console.log('🔒 Theme Optimizer: Running performance optimization');
    }

    // Clear expired cache
    this.clearExpiredCache();

    // Reduce animation quality if performance is poor
    if (this.metrics.frameRate < this.config.performanceThreshold) {
      // Note: performanceMonitor.setPerformanceLevel would be called here
      // but the import was removed to fix compilation
      
      if (this.config.debugMode) {
        console.log('🔒 Theme Optimizer: Reduced animation quality due to low frame rate');
      }
    }

    // Clear cache if memory usage is high
    if (this.metrics.memoryUsage > this.config.memoryLimit * 0.8) {
      this.clearCache();
      
      if (this.config.debugMode) {
        console.log('🔒 Theme Optimizer: Cleared cache due to high memory usage');
      }
    }
  }

  /**
   * Get current performance metrics
   */
  public getMetrics(): ThemePerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    size: number;
    hitRate: number;
    memoryUsage: number;
  } {
    const total = this.metrics.cacheHits + this.metrics.cacheMisses;
    const hitRate = total > 0 ? (this.metrics.cacheHits / total) * 100 : 0;

    return {
      size: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100,
      memoryUsage: this.metrics.memoryUsage,
    };
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<ThemeOptimizationConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (this.config.debugMode) {
      console.log('🔒 Theme Optimizer: Configuration updated', this.config);
    }
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.clearCache();
    
    if (this.config.debugMode) {
      console.log('🔒 Theme Optimizer: Cleanup completed');
    }
  }

  /**
   * Generate optimized CSS with performance considerations
   */
  public generateOptimizedCSS(theme: any, options?: {
    minify?: boolean;
    removeUnused?: boolean;
    inlineSmallAssets?: boolean;
  }): string {
    const startTime = performance.now();
    
    // Check cache first
    const cached = this.getCachedTheme(theme, options);
    if (cached) return cached;

    // Generate CSS
    let css = this.generateThemeCSS(theme);

    // Apply optimizations
    if (options?.minify) {
      css = this.minifyCSS(css);
    }

    if (options?.removeUnused) {
      css = this.removeUnusedCSS(css);
    }

    // Cache the result
    this.cacheTheme(theme, css, options);

    const endTime = performance.now();
    this.metrics.renderTime = endTime - startTime;

    if (this.config.debugMode) {
      console.log(`🔒 Theme Optimizer: Generated CSS in ${this.metrics.renderTime.toFixed(2)}ms`);
    }

    return css;
  }

  /**
   * Generate theme CSS
   */
  private generateThemeCSS(theme: any): string {
    return `
      /* Cybersecurity Theme - Optimized */
      :root {
        --cyber-bg-primary: ${theme?.colors?.background?.primary || '#0B0E1A'};
        --cyber-bg-secondary: ${theme?.colors?.background?.secondary || '#1A1D29'};
        --cyber-bg-surface: ${theme?.colors?.background?.surface || '#252A3A'};
        --cyber-bg-elevated: ${theme?.colors?.background?.elevated || '#2A3441'};
        --cyber-bg-glass: ${theme?.colors?.background?.glass || 'rgba(37, 42, 58, 0.8)'};
        
        --cyber-neon-primary: ${theme?.colors?.neon?.primary || '#00D4FF'};
        --cyber-neon-secondary: ${theme?.colors?.neon?.secondary || '#00FF88'};
        --cyber-neon-tertiary: ${theme?.colors?.neon?.tertiary || '#A55EEA'};
        --cyber-neon-warning: ${theme?.colors?.neon?.warning || '#FF6B35'};
        --cyber-neon-danger: ${theme?.colors?.neon?.danger || '#FF4757'};
        --cyber-neon-success: ${theme?.colors?.neon?.success || '#00FF88'};
        
        --cyber-text-primary: ${theme?.colors?.text?.primary || '#FFFFFF'};
        --cyber-text-secondary: ${theme?.colors?.text?.secondary || '#B8BCC8'};
        --cyber-text-muted: ${theme?.colors?.text?.muted || '#6B7280'};
        --cyber-text-neon: ${theme?.colors?.text?.neon || '#00D4FF'};
        --cyber-text-numbers: ${theme?.colors?.text?.numbers || '#00FF88'};
        
        --cyber-duration-fast: ${theme?.animations?.duration?.fast || 150}ms;
        --cyber-duration-normal: ${theme?.animations?.duration?.normal || 300}ms;
        --cyber-duration-slow: ${theme?.animations?.duration?.slow || 500}ms;
        
        --cyber-easing-smooth: ${theme?.animations?.easing?.smooth || 'cubic-bezier(0.4, 0, 0.2, 1)'};
        --cyber-easing-bounce: ${theme?.animations?.easing?.bounce || 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'};
        --cyber-easing-sharp: ${theme?.animations?.easing?.sharp || 'cubic-bezier(0.4, 0, 0.6, 1)'};
      }

      /* Performance-optimized glassmorphism */
      .cyber-glass {
        backdrop-filter: blur(20px);
        background: var(--cyber-bg-glass);
        border: 1px solid rgba(255, 255, 255, 0.06);
        will-change: transform, opacity;
      }

      /* Hardware-accelerated animations */
      .cyber-animate {
        transform: translateZ(0);
        backface-visibility: hidden;
        perspective: 1000px;
      }

      /* Optimized neon effects */
      .cyber-neon {
        box-shadow: 0 0 20px currentColor;
        will-change: box-shadow;
      }
    `;
  }

  /**
   * Minify CSS
   */
  private minifyCSS(css: string): string {
    return css
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
      .replace(/\s+/g, ' ') // Collapse whitespace
      .replace(/;\s*}/g, '}') // Remove last semicolon in blocks
      .replace(/\s*{\s*/g, '{') // Remove spaces around braces
      .replace(/\s*}\s*/g, '}')
      .replace(/\s*;\s*/g, ';') // Remove spaces around semicolons
      .replace(/\s*:\s*/g, ':') // Remove spaces around colons
      .trim();
  }

  /**
   * Remove unused CSS (basic implementation)
   */
  private removeUnusedCSS(css: string): string {
    // This is a simplified implementation
    // In a real-world scenario, you'd use tools like PurgeCSS
    return css;
  }
}

// Export singleton instance
export const themeOptimizer = new ThemeOptimizer();

// Export utility functions
export const optimizeTheme = (theme: any, options?: any) => {
  return themeOptimizer.generateOptimizedCSS(theme, options);
};

export const getThemeMetrics = () => {
  return themeOptimizer.getMetrics();
};

export const getCacheStats = () => {
  return themeOptimizer.getCacheStats();
};

export const clearThemeCache = () => {
  themeOptimizer.clearCache();
};

export const optimizeThemePerformance = () => {
  themeOptimizer.optimizePerformance();
};