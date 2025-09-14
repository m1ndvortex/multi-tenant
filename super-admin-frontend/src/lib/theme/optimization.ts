/**
 * Theme System Optimization Utilities
 * Performance optimization and caching for theme operations
 */

import CacheManager from './cache';

// Theme optimization configuration
export interface ThemeOptimizationConfig {
  enableCaching: boolean;
  enablePerformanceMonitoring: boolean;
  enableLazyLoading: boolean;
  enableStyleMinification: boolean;
  cacheSize: number;
  cacheTTL: number;
}

// Default optimization configuration
export const DEFAULT_OPTIMIZATION_CONFIG: ThemeOptimizationConfig = {
  enableCaching: true,
  enablePerformanceMonitoring: process.env.NODE_ENV === 'development',
  enableLazyLoading: true,
  enableStyleMinification: process.env.NODE_ENV === 'production',
  cacheSize: 100,
  cacheTTL: 5 * 60 * 1000, // 5 minutes
};

// CSS optimization utility
export class CSSOptimizer {
  private static minifyCSS(css: string): string {
    return css
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
      .replace(/\s+/g, ' ') // Collapse whitespace
      .replace(/;\s*}/g, '}') // Remove unnecessary semicolons
      .replace(/\s*{\s*/g, '{') // Clean up braces
      .replace(/\s*}\s*/g, '}')
      .replace(/\s*;\s*/g, ';') // Clean up semicolons
      .replace(/\s*:\s*/g, ':') // Clean up colons
      .trim();
  }

  private static extractCriticalCSS(css: string, selectors: string[]): string {
    const lines = css.split('\n');
    const criticalLines: string[] = [];
    let inCriticalRule = false;
    let braceCount = 0;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check if this line starts a critical rule
      if (selectors.some(selector => trimmedLine.includes(selector))) {
        inCriticalRule = true;
        braceCount = 0;
      }

      if (inCriticalRule) {
        criticalLines.push(line);
        
        // Count braces to know when rule ends
        braceCount += (line.match(/{/g) || []).length;
        braceCount -= (line.match(/}/g) || []).length;
        
        if (braceCount === 0 && trimmedLine.includes('}')) {
          inCriticalRule = false;
        }
      }
    }

    return criticalLines.join('\n');
  }

  static optimizeCSS(css: string, options: { minify?: boolean; critical?: string[] } = {}): string {
    let optimizedCSS = css;

    // Extract critical CSS if selectors provided
    if (options.critical && options.critical.length > 0) {
      optimizedCSS = this.extractCriticalCSS(optimizedCSS, options.critical);
    }

    // Minify CSS if requested
    if (options.minify) {
      optimizedCSS = this.minifyCSS(optimizedCSS);
    }

    return optimizedCSS;
  }

  static generateCriticalCSS(components: string[]): string {
    const criticalSelectors = [
      '.bg-cyber-background',
      '.glass-base',
      '.glass-elevated',
      '.neon-glow',
      '.text-white',
      '.text-neon-cyan',
      '.text-neon-green',
      ...components.map(comp => `.${comp}`),
    ];

    return criticalSelectors.map(selector => `${selector} { /* critical styles */ }`).join('\n');
  }
}

// Theme bundle optimizer
export class ThemeBundleOptimizer {
  // Removed unused method: splitThemeBundle
  // private static splitThemeBundle(theme: any): {
  //   core: any;
  //   components: any;
  //   animations: any;
  //   utilities: any;
  // } {
  //   return {
  //     core: {
  //       colors: theme.colors,
  //       typography: theme.typography,
  //       spacing: theme.spacing,
  //     },
  //     components: theme.components || {},
  //     animations: theme.animations || {},
  //     utilities: theme.utilities || {},
  //   };
  // }

  static async loadThemeChunk(chunkName: string): Promise<any> {
    // Simulate performance measurement
    const startTime = performance.now();
    try {
      // Check cache first (simplified)
      const cached = null; // themeCache.getAnimation(chunkName);
      if (cached) return cached;

      // Simulate dynamic import (in real implementation, this would be actual dynamic imports)
      let chunk: any;
      
      switch (chunkName) {
        case 'animations':
          chunk = await import('./animations');
          break;
        case 'colors':
          chunk = await import('./colors');
          break;
        case 'typography':
          chunk = await import('./typography');
          break;
        default:
          throw new Error(`Unknown theme chunk: ${chunkName}`);
      }

      // Cache the loaded chunk (simplified)
      // themeCache.cacheAnimation(chunkName, chunk);
      return chunk;
    } finally {
      const duration = performance.now() - startTime;
      console.log(`Theme chunk ${chunkName} loaded in ${duration}ms`);
    }
  }

  static preloadCriticalChunks(): Promise<void[]> {
    const criticalChunks = ['colors', 'typography'];
    return Promise.all(
      criticalChunks.map(chunk => this.loadThemeChunk(chunk))
    );
  }

  static async loadThemeOnDemand(requiredFeatures: string[]): Promise<any> {
    const chunks = await Promise.all(
      requiredFeatures.map(feature => this.loadThemeChunk(feature))
    );

    return chunks.reduce((acc, chunk) => ({ ...acc, ...chunk }), {});
  }
}

// Runtime theme optimizer
export class RuntimeThemeOptimizer {
  private static observedElements = new WeakSet<Element>();
  private static intersectionObserver?: IntersectionObserver;

  static initializeIntersectionObserver(): void {
    if (typeof window === 'undefined' || this.intersectionObserver) return;

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.applyThemeToElement(entry.target as HTMLElement);
          }
        });
      },
      { threshold: 0.1 }
    );
  }

  static observeElement(element: HTMLElement): void {
    if (this.observedElements.has(element)) return;

    this.initializeIntersectionObserver();
    this.intersectionObserver?.observe(element);
    this.observedElements.add(element);
  }

  static applyThemeToElement(element: HTMLElement): void {
    // Simulate performance measurement
    const startTime = performance.now();
    try {
      // Apply theme styles only when element is visible
      const computedStyle = window.getComputedStyle(element);
      const hasGlassEffect = element.classList.contains('glass-base') || 
                            element.classList.contains('glass-elevated');

      if (hasGlassEffect && !computedStyle.backdropFilter) {
        // Apply fallback styles for browsers without backdrop-filter support
        element.style.background = 'rgba(26, 29, 41, 0.9)';
        element.style.border = '1px solid rgba(255, 255, 255, 0.1)';
        element.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.4)';
      }
    } finally {
      const duration = performance.now() - startTime;
      if (duration > 16) {
        console.warn(`Slow theme application: ${duration}ms`);
      }
    }
  }

  static optimizeAnimations(): void {
    // Reduce animations on low-performance devices
    const isLowPerformance = this.detectLowPerformanceDevice();
    
    if (isLowPerformance) {
      document.documentElement.style.setProperty('--animation-duration', '0.1s');
      document.documentElement.style.setProperty('--animation-timing', 'linear');
    }
  }

  private static detectLowPerformanceDevice(): boolean {
    // Simple performance detection
    const connection = (navigator as any).connection;
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;
    const deviceMemory = (navigator as any).deviceMemory || 4;

    return (
      hardwareConcurrency < 4 ||
      deviceMemory < 4 ||
      (connection && connection.effectiveType === 'slow-2g') ||
      (connection && connection.effectiveType === '2g')
    );
  }

  static cleanup(): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = undefined;
    }
    this.observedElements = new WeakSet();
  }
}

// Theme preloader
export class ThemePreloader {
  private static preloadedAssets = new Set<string>();

  static async preloadCriticalAssets(): Promise<void> {
    const criticalAssets = [
      '/fonts/cybersecurity-font.woff2',
      '/images/cyber-background.webp',
      '/images/neon-patterns.svg',
    ];

    await Promise.all(
      criticalAssets.map(asset => this.preloadAsset(asset))
    );
  }

  private static preloadAsset(url: string): Promise<void> {
    if (this.preloadedAssets.has(url)) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = url;
      
      if (url.includes('.woff') || url.includes('.ttf')) {
        link.as = 'font';
        link.crossOrigin = 'anonymous';
      } else if (url.includes('.webp') || url.includes('.jpg') || url.includes('.png')) {
        link.as = 'image';
      } else if (url.includes('.svg')) {
        link.as = 'image';
      }

      link.onload = () => {
        this.preloadedAssets.add(url);
        resolve();
      };
      link.onerror = reject;

      document.head.appendChild(link);
    });
  }

  static preloadThemeChunks(): Promise<void[]> {
    return ThemeBundleOptimizer.preloadCriticalChunks();
  }

  static async warmupCache(): Promise<void> {
    // Pre-compute common theme combinations
    const commonConfigs = [
      { mode: 'cybersecurity', rtl: false, reducedMotion: false, highContrast: false },
      { mode: 'cybersecurity', rtl: true, reducedMotion: false, highContrast: false },
      { mode: 'cybersecurity', rtl: false, reducedMotion: true, highContrast: false },
      { mode: 'cybersecurity', rtl: false, reducedMotion: false, highContrast: true },
    ];

    for (const config of commonConfigs) {
      const styles = await this.computeThemeStyles(config);
      // themeCache.cacheThemeStyles(config, styles); // Simplified for now
      console.log('Cached theme styles for config:', config, styles);
    }
  }

  private static async computeThemeStyles(config: any): Promise<any> {
    // Simulate performance measurement
    const startTime = performance.now();
    try {
      // Simulate theme computation
      return {
        cssVariables: {
          '--cyber-background': '#0B0E1A',
          '--neon-cyan': '#00D4FF',
          '--neon-green': '#00FF88',
        },
        classNames: {
          'glass-base': 'backdrop-blur-lg bg-white/5 border border-white/10',
          'neon-glow': 'shadow-lg shadow-cyan-500/20',
        },
        animations: config.reducedMotion ? {} : {
          'fade-in': 'fadeIn 0.3s ease-out',
          'slide-up': 'slideUp 0.4s ease-out',
        },
      };
    } finally {
      const duration = performance.now() - startTime;
      console.log(`Theme styles computed in ${duration}ms`);
    }
  }
}

// Performance monitoring for theme operations
export class ThemePerformanceOptimizer {
  private static performanceEntries: PerformanceEntry[] = [];

  static startMonitoring(): void {
    if (typeof window === 'undefined') return;

    // Monitor theme-related performance entries
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      this.performanceEntries.push(...entries);
      
      // Analyze performance and optimize if needed
      this.analyzeAndOptimize(entries);
    });

    observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
  }

  private static analyzeAndOptimize(entries: PerformanceEntry[]): void {
    entries.forEach(entry => {
      if (entry.name.includes('theme') && entry.duration > 16) {
        // Theme operation took longer than one frame (16ms)
        console.warn(`Slow theme operation detected: ${entry.name} took ${entry.duration}ms`);
        
        // Apply optimizations
        this.applyPerformanceOptimizations();
      }
    });
  }

  private static applyPerformanceOptimizations(): void {
    // Reduce animation complexity
    RuntimeThemeOptimizer.optimizeAnimations();
    
    // Clear old cache entries
    CacheManager.clearAllCaches();
    
    // Reduce cache size
    // This would require modifying the cache implementation
  }

  static getPerformanceReport(): {
    averageThemeOperationTime: number;
    slowOperations: PerformanceEntry[];
    recommendations: string[];
  } {
    const themeEntries = this.performanceEntries.filter(entry => 
      entry.name.includes('theme') || entry.name.includes('style')
    );

    const averageTime = themeEntries.length > 0 
      ? themeEntries.reduce((sum, entry) => sum + entry.duration, 0) / themeEntries.length
      : 0;

    const slowOperations = themeEntries.filter(entry => entry.duration > 16);

    const recommendations = [
      averageTime > 10 ? 'Consider reducing theme computation complexity' : null,
      slowOperations.length > 5 ? 'Enable theme caching to improve performance' : null,
      'Use CSS custom properties for dynamic theming',
      'Preload critical theme assets',
      'Consider lazy loading non-critical theme features',
    ].filter(Boolean) as string[];

    return {
      averageThemeOperationTime: averageTime,
      slowOperations,
      recommendations,
    };
  }
}

// Main theme optimizer class
export class ThemeOptimizer {
  private config: ThemeOptimizationConfig;

  constructor(config: Partial<ThemeOptimizationConfig> = {}) {
    this.config = { ...DEFAULT_OPTIMIZATION_CONFIG, ...config };
  }

  async initialize(): Promise<void> {
    if (this.config.enablePerformanceMonitoring) {
      ThemePerformanceOptimizer.startMonitoring();
    }

    if (this.config.enableLazyLoading) {
      RuntimeThemeOptimizer.initializeIntersectionObserver();
    }

    // Preload critical assets
    await ThemePreloader.preloadCriticalAssets();
    await ThemePreloader.preloadThemeChunks();

    // Warm up cache
    if (this.config.enableCaching) {
      await ThemePreloader.warmupCache();
    }
  }

  optimizeForProduction(): void {
    // Enable all optimizations for production
    this.config.enableStyleMinification = true;
    this.config.enableCaching = true;
    this.config.enableLazyLoading = true;
    
    // Optimize animations for performance
    RuntimeThemeOptimizer.optimizeAnimations();
  }

  getOptimizationReport(): any {
    return {
      config: this.config,
      cacheStats: CacheManager.getPerformanceMetrics(),
      performanceReport: ThemePerformanceOptimizer.getPerformanceReport(),
      recommendations: this.generateRecommendations(),
    };
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const cacheStats = CacheManager.getPerformanceMetrics();
    
    if (cacheStats.stats.totals.cacheHits < 10) {
      recommendations.push('Consider increasing cache size for better performance');
    }
    
    if (!this.config.enableCaching) {
      recommendations.push('Enable caching to improve theme performance');
    }
    
    if (!this.config.enableLazyLoading) {
      recommendations.push('Enable lazy loading for better initial load performance');
    }

    return recommendations;
  }

  cleanup(): void {
    RuntimeThemeOptimizer.cleanup();
  }
}

// Export default optimizer instance
export const themeOptimizer = new ThemeOptimizer();