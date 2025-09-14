/**
 * Framer Motion Animation Infrastructure for Cybersecurity Theme
 * Comprehensive animation configurations with performance optimizations
 * RTL-aware animations and cybersecurity-specific effects
 */

import { Variants } from 'framer-motion';

/**
 * Performance Configuration Interface
 */
export interface PerformanceConfig {
  enableAnimations: boolean;
  reducedMotion: boolean;
  performanceLevel: 'high' | 'medium' | 'low';
  frameRate: number;
  memoryThreshold: number;
}

/**
 * RTL Configuration Interface
 */
export interface RTLConfig {
  isRTL: boolean;
  language: 'fa' | 'en' | 'ar';
  textDirection: 'ltr' | 'rtl';
}

/**
 * Animation Configuration Interface
 */
export interface AnimationPresets {
  pageTransition: Variants;
  cardEntrance: Variants;
  buttonHover: Variants;
  glowEffect: Variants;
  loadingSpinner: Variants;
  slideIn: Variants;
  fadeIn: Variants;
  staggerContainer: Variants;
  modalOverlay: Variants;
  navigationItem: Variants;
  cyberPulse: Variants;
  gradientBorder: Variants;
  matrixEffect: Variants;
  scanLine: Variants;
  glitchEffect: Variants;
  neonGlow: Variants;
}

/**
 * Performance Monitoring Interface
 */
export interface PerformanceMetrics {
  frameRate: number;
  memoryUsage: number;
  animationCount: number;
  lastUpdate: number;
}

/**
 * Enhanced Performance Monitoring System with Automatic Quality Adjustment
 */
class AnimationPerformanceMonitor {
  private metrics: PerformanceMetrics = {
    frameRate: 60,
    memoryUsage: 0,
    animationCount: 0,
    lastUpdate: Date.now(),
  };

  private performanceConfig: PerformanceConfig = {
    enableAnimations: true,
    reducedMotion: false,
    performanceLevel: 'high',
    frameRate: 60,
    memoryThreshold: 100, // MB
  };

  private frameRateHistory: number[] = [];
  private memoryHistory: number[] = [];
  private animationInstances: Set<string> = new Set();
  private performanceObserver: PerformanceObserver | null = null;
  private qualityAdjustmentTimer: NodeJS.Timeout | null = null;
  private isLowEndDevice: boolean = false;
  private connectionSpeed: 'slow' | 'fast' | 'unknown' = 'unknown';

  constructor() {
    this.initializePerformanceMonitoring();
    this.detectReducedMotion();
    this.detectDeviceCapabilities();
    this.initializeAutomaticQualityAdjustment();
  }

  private initializePerformanceMonitoring() {
    if (typeof window !== 'undefined') {
      // Enhanced frame rate monitoring with history tracking
      let lastTime = performance.now();
      let frameCount = 0;

      const measureFrameRate = () => {
        frameCount++;
        const currentTime = performance.now();
        
        if (currentTime - lastTime >= 1000) {
          const currentFrameRate = Math.round((frameCount * 1000) / (currentTime - lastTime));
          this.metrics.frameRate = currentFrameRate;
          
          // Track frame rate history for trend analysis
          this.frameRateHistory.push(currentFrameRate);
          if (this.frameRateHistory.length > 30) { // Keep last 30 seconds
            this.frameRateHistory.shift();
          }
          
          frameCount = 0;
          lastTime = currentTime;
          
          // Adjust performance level based on frame rate trends
          this.adjustPerformanceLevel();
        }
        
        requestAnimationFrame(measureFrameRate);
      };
      
      requestAnimationFrame(measureFrameRate);

      // Enhanced memory monitoring with history tracking
      if ('memory' in performance) {
        setInterval(() => {
          const memory = (performance as any).memory;
          const currentMemoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
          this.metrics.memoryUsage = currentMemoryUsage;
          
          // Track memory history for trend analysis
          this.memoryHistory.push(currentMemoryUsage);
          if (this.memoryHistory.length > 12) { // Keep last 12 measurements (1 minute)
            this.memoryHistory.shift();
          }
          
          // Check for memory leaks or excessive usage
          this.checkMemoryHealth();
        }, 5000);
      }

      // Initialize Performance Observer for detailed metrics
      this.initializePerformanceObserver();
    }
  }

  private detectReducedMotion() {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.performanceConfig.reducedMotion = mediaQuery.matches;
      
      mediaQuery.addEventListener('change', (e) => {
        this.performanceConfig.reducedMotion = e.matches;
      });
    }
  }

  private adjustPerformanceLevel() {
    // Calculate average frame rate over recent history
    const avgFrameRate = this.frameRateHistory.length > 0 
      ? this.frameRateHistory.reduce((sum, rate) => sum + rate, 0) / this.frameRateHistory.length
      : this.metrics.frameRate;

    // Calculate frame rate stability (lower variance = more stable)
    const frameRateVariance = this.calculateVariance(this.frameRateHistory);
    const isUnstable = frameRateVariance > 100; // High variance indicates instability

    // Adjust performance level based on average frame rate and stability
    const previousLevel = this.performanceConfig.performanceLevel;
    
    if (avgFrameRate < 25 || (avgFrameRate < 35 && isUnstable) || this.isLowEndDevice) {
      this.performanceConfig.performanceLevel = 'low';
    } else if (avgFrameRate < 45 || (avgFrameRate < 55 && isUnstable) || this.connectionSpeed === 'slow') {
      this.performanceConfig.performanceLevel = 'medium';
    } else {
      this.performanceConfig.performanceLevel = 'high';
    }

    // Log performance level changes for debugging
    if (previousLevel !== this.performanceConfig.performanceLevel) {
      console.log(`Animation performance level changed: ${previousLevel} → ${this.performanceConfig.performanceLevel}`, {
        avgFrameRate: avgFrameRate.toFixed(1),
        variance: frameRateVariance.toFixed(1),
        memoryUsage: this.metrics.memoryUsage.toFixed(1),
        animationCount: this.metrics.animationCount
      });
    }
  }

  public getPerformanceConfig(): PerformanceConfig {
    return { ...this.performanceConfig };
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public updateAnimationCount(count: number) {
    this.metrics.animationCount = count;
    this.metrics.lastUpdate = Date.now();
  }

  public shouldEnableAnimation(): boolean {
    return this.performanceConfig.enableAnimations && 
           !this.performanceConfig.reducedMotion &&
           this.metrics.frameRate > 20;
  }

  public getOptimizedDuration(baseDuration: number): number {
    switch (this.performanceConfig.performanceLevel) {
      case 'low':
        return baseDuration * 0.5;
      case 'medium':
        return baseDuration * 0.75;
      default:
        return baseDuration;
    }
  }

  /**
   * Device Capabilities Detection
   */
  private detectDeviceCapabilities() {
    if (typeof navigator !== 'undefined') {
      // Check hardware concurrency (CPU cores)
      this.isLowEndDevice = navigator.hardwareConcurrency <= 2;
      
      // Check connection speed
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        if (connection && connection.effectiveType) {
          this.connectionSpeed = ['slow-2g', '2g', '3g'].includes(connection.effectiveType) ? 'slow' : 'fast';
        }
      }

      // Check device memory (if available)
      if ('deviceMemory' in navigator) {
        const deviceMemory = (navigator as any).deviceMemory;
        if (deviceMemory <= 2) { // 2GB or less
          this.isLowEndDevice = true;
        }
      }
    }
  }

  /**
   * Initialize Automatic Quality Adjustment
   */
  private initializeAutomaticQualityAdjustment() {
    // Adjust quality every 10 seconds based on performance metrics
    this.qualityAdjustmentTimer = setInterval(() => {
      this.performAutomaticQualityAdjustment();
    }, 10000);
  }

  /**
   * Perform Automatic Quality Adjustment
   */
  private performAutomaticQualityAdjustment() {
    const avgFrameRate = this.getAverageFrameRate();
    const avgMemoryUsage = this.getAverageMemoryUsage();
    const memoryTrend = this.getMemoryTrend();

    // Disable animations if performance is critically low
    if (avgFrameRate < 15 || avgMemoryUsage > this.performanceConfig.memoryThreshold * 1.5) {
      this.performanceConfig.enableAnimations = false;
      console.warn('Animations disabled due to critical performance issues', {
        frameRate: avgFrameRate,
        memoryUsage: avgMemoryUsage
      });
      return;
    }

    // Re-enable animations if performance improves
    if (!this.performanceConfig.enableAnimations && avgFrameRate > 30 && avgMemoryUsage < this.performanceConfig.memoryThreshold) {
      this.performanceConfig.enableAnimations = true;
      console.log('Animations re-enabled due to improved performance');
    }

    // Adjust animation complexity based on memory trend
    if (memoryTrend === 'increasing' && avgMemoryUsage > this.performanceConfig.memoryThreshold * 0.8) {
      this.cleanupAnimationInstances();
    }
  }

  /**
   * Initialize Performance Observer for detailed metrics
   */
  private initializePerformanceObserver() {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        this.performanceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'measure' && entry.name.startsWith('animation-')) {
              // Track animation-specific performance metrics
              this.trackAnimationPerformance(entry.name, entry.duration);
            }
          }
        });

        this.performanceObserver.observe({ entryTypes: ['measure'] });
      } catch (error) {
        console.warn('Performance Observer not supported or failed to initialize:', error);
      }
    }
  }

  /**
   * Track Animation Performance
   */
  private trackAnimationPerformance(animationName: string, duration: number) {
    // Log slow animations for optimization
    if (duration > 16.67) { // Slower than 60fps frame time
      console.warn(`Slow animation detected: ${animationName} took ${duration.toFixed(2)}ms`);
    }
  }

  /**
   * Memory Health Check
   */
  private checkMemoryHealth() {
    const currentMemory = this.metrics.memoryUsage;
    const memoryTrend = this.getMemoryTrend();

    // Warn about high memory usage
    if (currentMemory > this.performanceConfig.memoryThreshold) {
      console.warn(`High memory usage detected: ${currentMemory.toFixed(1)}MB`);
      
      // Force cleanup if memory usage is critical
      if (currentMemory > this.performanceConfig.memoryThreshold * 1.5) {
        this.forceMemoryCleanup();
      }
    }

    // Detect potential memory leaks
    if (memoryTrend === 'increasing' && this.memoryHistory.length >= 10) {
      const memoryIncrease = currentMemory - this.memoryHistory[0];
      if (memoryIncrease > 50) { // 50MB increase over time period
        console.warn('Potential memory leak detected in animations');
        this.cleanupAnimationInstances();
      }
    }
  }

  /**
   * Calculate Variance for Stability Analysis
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  /**
   * Get Average Frame Rate
   */
  private getAverageFrameRate(): number {
    return this.frameRateHistory.length > 0 
      ? this.frameRateHistory.reduce((sum, rate) => sum + rate, 0) / this.frameRateHistory.length
      : this.metrics.frameRate;
  }

  /**
   * Get Average Memory Usage
   */
  private getAverageMemoryUsage(): number {
    return this.memoryHistory.length > 0 
      ? this.memoryHistory.reduce((sum, usage) => sum + usage, 0) / this.memoryHistory.length
      : this.metrics.memoryUsage;
  }

  /**
   * Get Memory Trend
   */
  private getMemoryTrend(): 'increasing' | 'decreasing' | 'stable' {
    if (this.memoryHistory.length < 5) return 'stable';
    
    const recent = this.memoryHistory.slice(-3);
    const older = this.memoryHistory.slice(-6, -3);
    
    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;
    
    const difference = recentAvg - olderAvg;
    
    if (difference > 5) return 'increasing';
    if (difference < -5) return 'decreasing';
    return 'stable';
  }

  /**
   * Animation Instance Management
   */
  public registerAnimationInstance(id: string): void {
    this.animationInstances.add(id);
    this.metrics.animationCount = this.animationInstances.size;
  }

  public unregisterAnimationInstance(id: string): void {
    this.animationInstances.delete(id);
    this.metrics.animationCount = this.animationInstances.size;
  }

  /**
   * Cleanup Animation Instances
   */
  private cleanupAnimationInstances(): void {
    // Clear all registered animation instances
    this.animationInstances.clear();
    this.metrics.animationCount = 0;
    
    // Trigger garbage collection if available
    if (typeof window !== 'undefined' && 'gc' in window) {
      (window as any).gc();
    }
    
    console.log('Animation instances cleaned up');
  }

  /**
   * Force Memory Cleanup
   */
  private forceMemoryCleanup(): void {
    this.cleanupAnimationInstances();
    
    // Disable animations temporarily to allow memory recovery
    const wasEnabled = this.performanceConfig.enableAnimations;
    this.performanceConfig.enableAnimations = false;
    
    setTimeout(() => {
      this.performanceConfig.enableAnimations = wasEnabled;
      console.log('Memory cleanup completed, animations restored');
    }, 5000);
  }

  /**
   * Get Device Performance Info
   */
  public getDeviceInfo(): {
    isLowEndDevice: boolean;
    connectionSpeed: string;
    hardwareConcurrency: number;
    deviceMemory?: number;
  } {
    return {
      isLowEndDevice: this.isLowEndDevice,
      connectionSpeed: this.connectionSpeed,
      hardwareConcurrency: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 1 : 1,
      deviceMemory: typeof navigator !== 'undefined' && 'deviceMemory' in navigator 
        ? (navigator as any).deviceMemory 
        : undefined,
    };
  }

  /**
   * Get Performance History
   */
  public getPerformanceHistory(): {
    frameRateHistory: number[];
    memoryHistory: number[];
    averageFrameRate: number;
    averageMemoryUsage: number;
    memoryTrend: string;
  } {
    return {
      frameRateHistory: [...this.frameRateHistory],
      memoryHistory: [...this.memoryHistory],
      averageFrameRate: this.getAverageFrameRate(),
      averageMemoryUsage: this.getAverageMemoryUsage(),
      memoryTrend: this.getMemoryTrend(),
    };
  }

  /**
   * Cleanup Resources
   */
  public cleanup(): void {
    if (this.qualityAdjustmentTimer) {
      clearInterval(this.qualityAdjustmentTimer);
      this.qualityAdjustmentTimer = null;
    }
    
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }
    
    this.cleanupAnimationInstances();
  }
}

// Global performance monitor instance
export const performanceMonitor = new AnimationPerformanceMonitor();

/**
 * Optimized Transition Configurations
 */
const createTransitions = (performanceLevel: 'high' | 'medium' | 'low' = 'high') => {
  const durationMultiplier = performanceLevel === 'low' ? 0.5 : performanceLevel === 'medium' ? 0.75 : 1;
  
  return {
    smooth: {
      type: "tween" as const,
      ease: [0.4, 0, 0.2, 1],
      duration: 0.3 * durationMultiplier,
    },
    
    bounce: {
      type: "spring" as const,
      damping: performanceLevel === 'low' ? 20 : 15,
      stiffness: performanceLevel === 'low' ? 200 : 300,
    },
    
    sharp: {
      type: "tween" as const,
      ease: [0.4, 0, 1, 1],
      duration: 0.15 * durationMultiplier,
    },
    
    slow: {
      type: "tween" as const,
      ease: [0.4, 0, 0.2, 1],
      duration: 0.5 * durationMultiplier,
    },
    
    fast: {
      type: "tween" as const,
      ease: [0.4, 0, 0.2, 1],
      duration: 0.15 * durationMultiplier,
    },

    cyber: {
      type: "tween" as const,
      ease: [0.25, 0.46, 0.45, 0.94],
      duration: 0.4 * durationMultiplier,
    },

    matrix: {
      type: "spring" as const,
      damping: 12,
      stiffness: 400,
      mass: 0.8,
    },
  };
};

// Get optimized transitions based on current performance
export const getOptimizedTransitions = () => {
  const config = performanceMonitor.getPerformanceConfig();
  return createTransitions(config.performanceLevel);
};

/**
 * RTL-aware Animation System
 */
class RTLAnimationManager {
  private rtlConfig: RTLConfig = {
    isRTL: false,
    language: 'en',
    textDirection: 'ltr',
  };

  constructor(config?: Partial<RTLConfig>) {
    if (config) {
      this.rtlConfig = { ...this.rtlConfig, ...config };
    }
    this.detectRTL();
  }

  private detectRTL() {
    if (typeof document !== 'undefined') {
      const htmlDir = document.documentElement.dir;
      const htmlLang = document.documentElement.lang;
      
      this.rtlConfig.textDirection = htmlDir as 'ltr' | 'rtl' || 'ltr';
      this.rtlConfig.isRTL = this.rtlConfig.textDirection === 'rtl';
      
      if (htmlLang) {
        this.rtlConfig.language = htmlLang.startsWith('fa') ? 'fa' : 
                                 htmlLang.startsWith('ar') ? 'ar' : 'en';
      }
    }
  }

  public updateConfig(config: Partial<RTLConfig>) {
    this.rtlConfig = { ...this.rtlConfig, ...config };
  }

  public getConfig(): RTLConfig {
    return { ...this.rtlConfig };
  }

  public getSlideDirection(direction: 'left' | 'right' | 'in' | 'out'): number {
    const { isRTL } = this.rtlConfig;
    
    switch (direction) {
      case 'left':
        return isRTL ? 100 : -100;
      case 'right':
        return isRTL ? -100 : 100;
      case 'in':
        return isRTL ? 100 : -100;
      case 'out':
        return isRTL ? -100 : 100;
      default:
        return 0;
    }
  }

  public getRotationDirection(clockwise: boolean = true): number {
    const { isRTL } = this.rtlConfig;
    const baseRotation = clockwise ? 360 : -360;
    return isRTL ? -baseRotation : baseRotation;
  }

  public getScaleOrigin(): string {
    const { isRTL } = this.rtlConfig;
    return isRTL ? 'right center' : 'left center';
  }
}

// Global RTL manager instance
export const rtlManager = new RTLAnimationManager();

/**
 * RTL-aware animation variants factory
 */
const createRTLVariants = (rtlConfig?: RTLConfig) => {
  const config = rtlConfig || rtlManager.getConfig();
  const transitions = getOptimizedTransitions();
  const slideInDirection = rtlManager.getSlideDirection('in');
  const slideOutDirection = rtlManager.getSlideDirection('out');
  
  return {
    slideIn: {
      hidden: { 
        x: slideInDirection, 
        opacity: 0 
      },
      visible: { 
        x: 0, 
        opacity: 1,
        transition: transitions.smooth,
      },
      exit: { 
        x: slideOutDirection, 
        opacity: 0,
        transition: transitions.fast,
      },
    },
    
    slideOut: {
      hidden: { 
        x: slideOutDirection, 
        opacity: 0 
      },
      visible: { 
        x: 0, 
        opacity: 1,
        transition: transitions.smooth,
      },
      exit: { 
        x: slideInDirection, 
        opacity: 0,
        transition: transitions.fast,
      },
    },

    slideLeft: {
      hidden: { 
        x: rtlManager.getSlideDirection('left'), 
        opacity: 0 
      },
      visible: { 
        x: 0, 
        opacity: 1,
        transition: transitions.smooth,
      },
      exit: { 
        x: rtlManager.getSlideDirection('right'), 
        opacity: 0,
        transition: transitions.fast,
      },
    },

    slideRight: {
      hidden: { 
        x: rtlManager.getSlideDirection('right'), 
        opacity: 0 
      },
      visible: { 
        x: 0, 
        opacity: 1,
        transition: transitions.smooth,
      },
      exit: { 
        x: rtlManager.getSlideDirection('left'), 
        opacity: 0,
        transition: transitions.fast,
      },
    },

    navigationSlide: {
      hidden: { 
        x: config.isRTL ? 20 : -20, 
        opacity: 0,
        scale: 0.95,
      },
      visible: { 
        x: 0, 
        opacity: 1,
        scale: 1,
        transition: transitions.bounce,
      },
      hover: {
        x: config.isRTL ? -5 : 5,
        scale: 1.02,
        transition: transitions.fast,
      },
    },
  };
};

/**
 * Main Animation Presets Factory
 */
const createAnimationPresets = (): AnimationPresets => {
  const transitions = getOptimizedTransitions();
  const shouldAnimate = performanceMonitor.shouldEnableAnimation();
  
  // Base animations that work with performance optimization
  const basePresets = {
    // Page Transitions with RTL support
    pageTransition: {
      hidden: {
        opacity: 0,
        y: 20,
        scale: 0.98,
      },
      visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
          ...transitions.smooth,
          staggerChildren: shouldAnimate ? 0.1 : 0,
        },
      },
      exit: {
        opacity: 0,
        y: -20,
        scale: 0.98,
        transition: transitions.fast,
      },
    },

    // Enhanced Card Entrance with Cybersecurity Effects
    cardEntrance: {
      hidden: {
        opacity: 0,
        y: 30,
        scale: 0.95,
        rotateX: -15,
      },
      visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        rotateX: 0,
        transition: transitions.bounce,
      },
      hover: {
        y: -8,
        scale: 1.03,
        rotateX: 5,
        boxShadow: [
          "0 20px 40px rgba(0, 255, 255, 0.15)",
          "0 0 30px rgba(0, 255, 136, 0.1)",
          "inset 0 1px 0 rgba(255, 255, 255, 0.1)",
        ].join(', '),
        borderColor: "rgba(0, 255, 255, 0.4)",
        transition: transitions.fast,
      },
    },

    // Cybersecurity Button Effects
    buttonHover: {
      rest: {
        scale: 1,
        boxShadow: "0 0 0px rgba(0, 255, 255, 0)",
        borderColor: "rgba(255, 255, 255, 0.1)",
      },
      hover: {
        scale: 1.05,
        boxShadow: [
          "0 0 20px rgba(0, 255, 255, 0.4)",
          "0 0 40px rgba(0, 255, 255, 0.2)",
          "inset 0 0 20px rgba(0, 255, 255, 0.1)",
        ].join(', '),
        borderColor: "rgba(0, 255, 255, 0.6)",
        transition: transitions.fast,
      },
      tap: {
        scale: 0.98,
        boxShadow: "0 0 15px rgba(0, 255, 255, 0.8)",
        transition: transitions.sharp,
      },
    },

    // Multi-color Glow Effect
    glowEffect: {
      initial: {
        boxShadow: "0 0 5px rgba(0, 255, 255, 0.5)",
      },
      animate: {
        boxShadow: [
          "0 0 5px rgba(0, 255, 255, 0.5)",
          "0 0 20px rgba(0, 255, 136, 0.6)",
          "0 0 30px rgba(255, 107, 53, 0.4)",
          "0 0 20px rgba(0, 255, 136, 0.6)",
          "0 0 5px rgba(0, 255, 255, 0.5)",
        ],
        transition: {
          duration: shouldAnimate ? 3 : 0,
          repeat: shouldAnimate ? Infinity : 0,
          ease: "easeInOut",
        },
      },
    },

    // Cybersecurity Loading Spinner
    loadingSpinner: {
      animate: {
        rotate: shouldAnimate ? 360 : 0,
        transition: {
          duration: shouldAnimate ? 1 : 0,
          repeat: shouldAnimate ? Infinity : 0,
          ease: "linear",
        },
      },
    },

    // RTL-aware Slide Animation
    slideIn: createRTLVariants().slideIn,

    // Enhanced Fade In
    fadeIn: {
      hidden: {
        opacity: 0,
        y: 10,
        filter: "blur(4px)",
      },
      visible: {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: transitions.smooth,
      },
      exit: {
        opacity: 0,
        y: -10,
        filter: "blur(4px)",
        transition: transitions.fast,
      },
    },

    // Stagger Container with Performance Optimization
    staggerContainer: {
      hidden: {
        opacity: 0,
      },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: shouldAnimate ? 0.1 : 0,
          delayChildren: shouldAnimate ? 0.1 : 0,
        },
      },
    },

    // Enhanced Modal Overlay
    modalOverlay: {
      hidden: {
        opacity: 0,
        backdropFilter: "blur(0px) saturate(100%)",
      },
      visible: {
        opacity: 1,
        backdropFilter: "blur(20px) saturate(180%)",
        transition: transitions.smooth,
      },
      exit: {
        opacity: 0,
        backdropFilter: "blur(0px) saturate(100%)",
        transition: transitions.fast,
      },
    },

    // RTL-aware Navigation Item
    navigationItem: createRTLVariants().navigationSlide,

    // Cybersecurity Pulse Effect
    cyberPulse: {
      animate: {
        scale: shouldAnimate ? [1, 1.05, 1] : 1,
        opacity: shouldAnimate ? [0.7, 1, 0.7] : 1,
        boxShadow: shouldAnimate ? [
          "0 0 0px rgba(0, 255, 255, 0.4)",
          "0 0 20px rgba(0, 255, 255, 0.8)",
          "0 0 0px rgba(0, 255, 255, 0.4)",
        ] : "0 0 0px rgba(0, 255, 255, 0.4)",
        transition: {
          duration: shouldAnimate ? 2 : 0,
          repeat: shouldAnimate ? Infinity : 0,
          ease: "easeInOut",
        },
      },
    },

    // Gradient Border Animation
    gradientBorder: {
      animate: {
        background: shouldAnimate ? [
          "linear-gradient(0deg, #00D4FF, #00FF88)",
          "linear-gradient(90deg, #00FF88, #FF6B35)",
          "linear-gradient(180deg, #FF6B35, #A55EEA)",
          "linear-gradient(270deg, #A55EEA, #00D4FF)",
          "linear-gradient(360deg, #00D4FF, #00FF88)",
        ] : "linear-gradient(0deg, #00D4FF, #00FF88)",
        transition: {
          duration: shouldAnimate ? 4 : 0,
          repeat: shouldAnimate ? Infinity : 0,
          ease: "linear",
        },
      },
    },

    // Matrix Effect
    matrixEffect: {
      hidden: {
        opacity: 0,
        y: 20,
        filter: "blur(10px)",
        textShadow: "0 0 0px rgba(0, 255, 136, 0)",
      },
      visible: (i: number) => ({
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        textShadow: "0 0 10px rgba(0, 255, 136, 0.8)",
        transition: {
          delay: shouldAnimate ? i * 0.1 : 0,
          duration: transitions.smooth.duration,
          ease: "easeOut",
        },
      }),
    },

    // Scanning Line Effect
    scanLine: {
      animate: {
        y: shouldAnimate ? ["-100%", "100%"] : "0%",
        opacity: shouldAnimate ? [0, 1, 0] : 1,
        transition: {
          duration: shouldAnimate ? 2 : 0,
          repeat: shouldAnimate ? Infinity : 0,
          ease: "linear",
        },
      },
    },

    // Glitch Effect
    glitchEffect: {
      animate: {
        x: shouldAnimate ? [0, -2, 2, 0] : 0,
        textShadow: shouldAnimate ? [
          "0 0 0px currentColor",
          "2px 0 0px #ff0066, -2px 0 0px #00ffff",
          "0 0 0px currentColor",
        ] : "0 0 0px currentColor",
        transition: {
          duration: shouldAnimate ? 0.3 : 0,
          repeat: shouldAnimate ? Infinity : 0,
          repeatDelay: shouldAnimate ? 3 : 0,
        },
      },
    },

    // Enhanced Neon Glow
    neonGlow: {
      rest: {
        textShadow: "0 0 5px currentColor",
        filter: "brightness(1)",
      },
      hover: {
        textShadow: [
          "0 0 5px currentColor",
          "0 0 10px currentColor",
          "0 0 20px currentColor",
        ].join(', '),
        filter: "brightness(1.2)",
        transition: transitions.fast,
      },
      active: {
        textShadow: [
          "0 0 5px currentColor",
          "0 0 15px currentColor",
          "0 0 30px currentColor",
          "0 0 40px currentColor",
        ].join(', '),
        filter: "brightness(1.4)",
        transition: transitions.sharp,
      },
    },
  };

  return basePresets;
};

// Export dynamic animation presets
export const animationPresets = createAnimationPresets();

/**
 * Advanced Cybersecurity Animation Effects
 */
export const cyberAnimations = {
  // Multi-color Neon Pulse
  neonPulse: {
    animate: {
      textShadow: performanceMonitor.shouldEnableAnimation() ? [
        "0 0 5px #00D4FF",
        "0 0 20px #00FF88, 0 0 30px #00D4FF",
        "0 0 40px #FF6B35, 0 0 50px #00FF88",
        "0 0 20px #00FF88, 0 0 30px #00D4FF",
        "0 0 5px #00D4FF",
      ] : "0 0 5px #00D4FF",
      transition: {
        duration: performanceMonitor.getOptimizedDuration(3),
        repeat: performanceMonitor.shouldEnableAnimation() ? Infinity : 0,
        ease: "easeInOut",
      },
    },
  },

  // Cybersecurity Pulse Effect
  cyberPulse: {
    animate: {
      scale: performanceMonitor.shouldEnableAnimation() ? [1, 1.05, 1] : 1,
      opacity: performanceMonitor.shouldEnableAnimation() ? [0.7, 1, 0.7] : 1,
      boxShadow: performanceMonitor.shouldEnableAnimation() ? [
        "0 0 0px rgba(0, 255, 255, 0.4)",
        "0 0 20px rgba(0, 255, 255, 0.8)",
        "0 0 0px rgba(0, 255, 255, 0.4)",
      ] : "0 0 0px rgba(0, 255, 255, 0.4)",
      transition: {
        duration: performanceMonitor.getOptimizedDuration(2),
        repeat: performanceMonitor.shouldEnableAnimation() ? Infinity : 0,
        ease: "easeInOut",
      },
    },
  },

  // Enhanced Glitch Effect
  glitch: {
    animate: {
      x: performanceMonitor.shouldEnableAnimation() ? [0, -3, 3, -1, 1, 0] : 0,
      y: performanceMonitor.shouldEnableAnimation() ? [0, 1, -1, 0] : 0,
      textShadow: performanceMonitor.shouldEnableAnimation() ? [
        "0 0 0px currentColor",
        "3px 0 0px #ff0066, -3px 0 0px #00ffff",
        "-2px 0 0px #ff0066, 2px 0 0px #00ff88",
        "0 0 0px currentColor",
      ] : "0 0 0px currentColor",
      filter: performanceMonitor.shouldEnableAnimation() ? [
        "hue-rotate(0deg)",
        "hue-rotate(90deg)",
        "hue-rotate(180deg)",
        "hue-rotate(0deg)",
      ] : "hue-rotate(0deg)",
      transition: {
        duration: performanceMonitor.getOptimizedDuration(0.4),
        repeat: performanceMonitor.shouldEnableAnimation() ? Infinity : 0,
        repeatDelay: performanceMonitor.getOptimizedDuration(4),
      },
    },
  },

  // Cybersecurity Scanning Line
  scanLine: {
    animate: {
      y: performanceMonitor.shouldEnableAnimation() ? ["-100%", "100%"] : "0%",
      opacity: performanceMonitor.shouldEnableAnimation() ? [0, 0.8, 1, 0.8, 0] : 1,
      boxShadow: performanceMonitor.shouldEnableAnimation() ? [
        "0 0 0px rgba(0, 255, 255, 0)",
        "0 0 20px rgba(0, 255, 255, 0.8)",
        "0 0 40px rgba(0, 255, 255, 1)",
        "0 0 20px rgba(0, 255, 255, 0.8)",
        "0 0 0px rgba(0, 255, 255, 0)",
      ] : "0 0 0px rgba(0, 255, 255, 0)",
      transition: {
        duration: performanceMonitor.getOptimizedDuration(2.5),
        repeat: performanceMonitor.shouldEnableAnimation() ? Infinity : 0,
        ease: "linear",
      },
    },
  },

  // Matrix-style Reveal with RTL Support
  matrixReveal: {
    hidden: {
      opacity: 0,
      y: 20,
      filter: "blur(10px)",
      textShadow: "0 0 0px rgba(0, 255, 136, 0)",
    },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      textShadow: "0 0 10px rgba(0, 255, 136, 0.8)",
      transition: {
        delay: performanceMonitor.shouldEnableAnimation() ? i * 0.1 : 0,
        duration: performanceMonitor.getOptimizedDuration(0.6),
        ease: "easeOut",
      },
    }),
  },

  // Cybersecurity Loading Animation
  loadingDots: {
    animate: {
      scale: performanceMonitor.shouldEnableAnimation() ? [1, 1.3, 1] : 1,
      opacity: performanceMonitor.shouldEnableAnimation() ? [0.4, 1, 0.4] : 1,
      boxShadow: performanceMonitor.shouldEnableAnimation() ? [
        "0 0 0px rgba(0, 255, 255, 0.4)",
        "0 0 15px rgba(0, 255, 255, 0.8)",
        "0 0 0px rgba(0, 255, 255, 0.4)",
      ] : "0 0 0px rgba(0, 255, 255, 0.4)",
      transition: {
        duration: performanceMonitor.getOptimizedDuration(1.2),
        repeat: performanceMonitor.shouldEnableAnimation() ? Infinity : 0,
        ease: "easeInOut",
      },
    },
  },

  // Holographic Effect
  holographic: {
    animate: {
      background: performanceMonitor.shouldEnableAnimation() ? [
        "linear-gradient(45deg, rgba(0,212,255,0.1) 0%, rgba(0,255,136,0.1) 50%, rgba(255,107,53,0.1) 100%)",
        "linear-gradient(135deg, rgba(0,255,136,0.1) 0%, rgba(255,107,53,0.1) 50%, rgba(165,94,234,0.1) 100%)",
        "linear-gradient(225deg, rgba(255,107,53,0.1) 0%, rgba(165,94,234,0.1) 50%, rgba(0,212,255,0.1) 100%)",
        "linear-gradient(315deg, rgba(165,94,234,0.1) 0%, rgba(0,212,255,0.1) 50%, rgba(0,255,136,0.1) 100%)",
        "linear-gradient(45deg, rgba(0,212,255,0.1) 0%, rgba(0,255,136,0.1) 50%, rgba(255,107,53,0.1) 100%)",
      ] : "linear-gradient(45deg, rgba(0,212,255,0.1) 0%, rgba(0,255,136,0.1) 50%, rgba(255,107,53,0.1) 100%)",
      transition: {
        duration: performanceMonitor.getOptimizedDuration(5),
        repeat: performanceMonitor.shouldEnableAnimation() ? Infinity : 0,
        ease: "linear",
      },
    },
  },

  // Data Stream Effect
  dataStream: {
    animate: {
      backgroundPosition: performanceMonitor.shouldEnableAnimation() ? ["0% 0%", "100% 100%"] : "0% 0%",
      opacity: performanceMonitor.shouldEnableAnimation() ? [0.3, 0.7, 0.3] : 0.5,
      transition: {
        duration: performanceMonitor.getOptimizedDuration(3),
        repeat: performanceMonitor.shouldEnableAnimation() ? Infinity : 0,
        ease: "linear",
      },
    },
  },

  // Circuit Board Effect
  circuitBoard: {
    animate: {
      strokeDashoffset: performanceMonitor.shouldEnableAnimation() ? [0, -100] : 0,
      stroke: performanceMonitor.shouldEnableAnimation() ? [
        "rgba(0, 255, 255, 0.8)",
        "rgba(0, 255, 136, 0.8)",
        "rgba(255, 107, 53, 0.8)",
        "rgba(0, 255, 255, 0.8)",
      ] : "rgba(0, 255, 255, 0.8)",
      transition: {
        duration: performanceMonitor.getOptimizedDuration(4),
        repeat: performanceMonitor.shouldEnableAnimation() ? Infinity : 0,
        ease: "linear",
      },
    },
  },

  // Terminal Typing Effect
  terminalTyping: {
    hidden: { width: 0, opacity: 0 },
    visible: {
      width: "100%",
      opacity: 1,
      transition: {
        width: {
          duration: performanceMonitor.getOptimizedDuration(2),
          ease: "steps(20, end)",
        },
        opacity: {
          duration: performanceMonitor.getOptimizedDuration(0.1),
        },
      },
    },
  },
};

/**
 * Animation Utility Functions
 */

/**
 * Create staggered animations with performance optimization
 */
export const createStaggerAnimation = (
  delay: number = 0.1,
  duration: number = 0.3
) => {
  const shouldAnimate = performanceMonitor.shouldEnableAnimation();
  const optimizedDelay = shouldAnimate ? delay : 0;
  const optimizedDuration = performanceMonitor.getOptimizedDuration(duration);
  
  return {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: optimizedDuration,
        staggerChildren: optimizedDelay,
      },
    },
  };
};

/**
 * Create hover animations with cybersecurity effects
 */
export const createHoverAnimation = (
  scale: number = 1.05,
  glowColor: string = "rgba(0, 255, 255, 0.3)",
  intensity: 'low' | 'medium' | 'high' = 'medium'
) => {
  const transitions = getOptimizedTransitions();
  const glowIntensity = {
    low: 10,
    medium: 20,
    high: 30,
  }[intensity];

  return {
    rest: { 
      scale: 1, 
      boxShadow: "0 0 0px transparent",
      borderColor: "rgba(255, 255, 255, 0.1)",
    },
    hover: {
      scale,
      boxShadow: `0 0 ${glowIntensity}px ${glowColor}`,
      borderColor: glowColor,
      transition: transitions.fast,
    },
  };
};

/**
 * Create page transitions with RTL and performance support
 */
export const createPageTransition = (rtlConfig?: RTLConfig) => {
  const config = rtlConfig || rtlManager.getConfig();
  const direction = config.isRTL ? 100 : -100;
  const transitions = getOptimizedTransitions();
  
  return {
    initial: { opacity: 0, x: direction },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -direction },
    transition: transitions.smooth,
  };
};

/**
 * Create cybersecurity-themed card animations
 */
export const createCyberCard = (variant: 'primary' | 'secondary' | 'accent' = 'primary') => {
  const transitions = getOptimizedTransitions();
  const colors = {
    primary: "rgba(0, 255, 255, 0.4)",
    secondary: "rgba(0, 255, 136, 0.4)",
    accent: "rgba(255, 107, 53, 0.4)",
  };

  return {
    hidden: {
      opacity: 0,
      y: 30,
      scale: 0.95,
      rotateX: -15,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      rotateX: 0,
      transition: transitions.bounce,
    },
    hover: {
      y: -8,
      scale: 1.02,
      rotateX: 5,
      boxShadow: `0 20px 40px ${colors[variant]}`,
      borderColor: colors[variant],
      transition: transitions.fast,
    },
  };
};

/**
 * Create neon text effect
 */
export const createNeonText = (color: string = "#00D4FF") => ({
  rest: {
    textShadow: `0 0 5px ${color}`,
    color: color,
  },
  hover: {
    textShadow: `0 0 5px ${color}, 0 0 10px ${color}, 0 0 20px ${color}`,
    color: "#ffffff",
    transition: getOptimizedTransitions().fast,
  },
});

/**
 * Create loading animation with cybersecurity theme
 */
export const createCyberLoading = (type: 'spinner' | 'dots' | 'pulse' = 'spinner') => {
  const shouldAnimate = performanceMonitor.shouldEnableAnimation();
  
  const animations = {
    spinner: {
      animate: {
        rotate: shouldAnimate ? 360 : 0,
        transition: {
          duration: shouldAnimate ? 1 : 0,
          repeat: shouldAnimate ? Infinity : 0,
          ease: "linear",
        },
      },
    },
    dots: cyberAnimations.loadingDots,
    pulse: animationPresets.cyberPulse,
  };

  return animations[type];
};

/**
 * Create modal animations with glassmorphism
 */
export const createModalAnimation = () => {
  const transitions = getOptimizedTransitions();
  
  return {
    overlay: {
      hidden: {
        opacity: 0,
        backdropFilter: "blur(0px) saturate(100%)",
      },
      visible: {
        opacity: 1,
        backdropFilter: "blur(20px) saturate(180%)",
        transition: transitions.smooth,
      },
      exit: {
        opacity: 0,
        backdropFilter: "blur(0px) saturate(100%)",
        transition: transitions.fast,
      },
    },
    content: {
      hidden: {
        opacity: 0,
        scale: 0.8,
        y: 50,
      },
      visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: transitions.bounce,
      },
      exit: {
        opacity: 0,
        scale: 0.8,
        y: 50,
        transition: transitions.fast,
      },
    },
  };
};

/**
 * Animation Hook for React Components
 */
export const useAnimationConfig = () => {
  return {
    performanceConfig: performanceMonitor.getPerformanceConfig(),
    metrics: performanceMonitor.getMetrics(),
    rtlConfig: rtlManager.getConfig(),
    shouldAnimate: performanceMonitor.shouldEnableAnimation(),
    transitions: getOptimizedTransitions(),
  };
};

/**
 * Update RTL configuration
 */
export const updateRTLConfig = (config: Partial<RTLConfig>) => {
  rtlManager.updateConfig(config);
};

/**
 * Get current performance metrics
 */
export const getPerformanceMetrics = () => {
  return performanceMonitor.getMetrics();
};

/**
 * Export all animation utilities and systems
 */
export { 
  animationPresets as default,
  getOptimizedTransitions as transitions,
  createRTLVariants,
};