/**
 * Ultra Performance React Hooks
 * Provides seamless integration of ultra-smooth performance monitoring and optimization
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, useAnimation, AnimationControls } from 'framer-motion';
import { ultraPerformanceMonitor } from '../ultra-performance-monitor';
import { ultraSmoothAnimations, useUltraSmoothAnimation } from '../ultra-smooth-animations';
import { CacheManager } from '../cache';
import { lazyAnimationManager } from '../lazy-animations';
import { assetPreloader } from '../asset-preloader';

interface UltraPerformanceState {
  frameRate: number;
  jankPercentage: number;
  memoryPressure: 'low' | 'medium' | 'high' | 'critical';
  animationQuality: 'ultra' | 'high' | 'medium' | 'low' | 'minimal';
  performanceScore: number;
  isOptimal: boolean;
  gpuAcceleration: boolean;
  batteryLevel?: number;
}

interface OptimizationActions {
  reduceQuality: () => void;
  clearCaches: () => Promise<void>;
  preloadAssets: (priority?: string) => Promise<void>;
  throttleAnimations: () => void;
  emergencyCleanup: () => Promise<void>;
}

/**
 * Main ultra performance hook - provides comprehensive performance monitoring
 */
export function useUltraPerformance(): {
  state: UltraPerformanceState;
  actions: OptimizationActions;
  recommendations: string[];
} {
  const [state, setState] = useState<UltraPerformanceState>(() => {
    const metrics = ultraPerformanceMonitor.getMetrics();
    return {
      frameRate: metrics.frameRate,
      jankPercentage: metrics.jankPercentage,
      memoryPressure: metrics.memoryPressure,
      animationQuality: metrics.animationQuality,
      performanceScore: ultraPerformanceMonitor.getPerformanceScore(),
      isOptimal: ultraPerformanceMonitor.isOptimalPerformance(),
      gpuAcceleration: metrics.gpuAcceleration,
      batteryLevel: metrics.batteryLevel,
    };
  });

  const [recommendations, setRecommendations] = useState<string[]>([]);

  // Update state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const metrics = ultraPerformanceMonitor.getMetrics();
      setState({
        frameRate: metrics.frameRate,
        jankPercentage: metrics.jankPercentage,
        memoryPressure: metrics.memoryPressure,
        animationQuality: metrics.animationQuality,
        performanceScore: ultraPerformanceMonitor.getPerformanceScore(),
        isOptimal: ultraPerformanceMonitor.isOptimalPerformance(),
        gpuAcceleration: metrics.gpuAcceleration,
        batteryLevel: metrics.batteryLevel,
      });

      setRecommendations(ultraPerformanceMonitor.getRecommendations());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Optimization actions
  const actions = useMemo<OptimizationActions>(() => ({
    reduceQuality: () => {
      const currentConfig = ultraSmoothAnimations.getConfig();
      const qualityLevels = ['ultra', 'high', 'medium', 'low', 'minimal'];
      const currentIndex = qualityLevels.indexOf(currentConfig.quality);
      const nextIndex = Math.min(currentIndex + 1, qualityLevels.length - 1);
      
      ultraSmoothAnimations.updateConfig({
        quality: qualityLevels[nextIndex] as any,
      });
    },

    clearCaches: async () => {
      await CacheManager.clearAllCaches();
    },

    preloadAssets: async (priority = 'high') => {
      await assetPreloader.preloadAssets({ priority: priority as any });
    },

    throttleAnimations: () => {
      const currentConfig = ultraSmoothAnimations.getConfig();
      ultraSmoothAnimations.updateConfig({
        targetFPS: Math.max(30, currentConfig.targetFPS * 0.8),
      });
    },

    emergencyCleanup: async () => {
      await Promise.all([
        CacheManager.clearAllCaches(),
        new Promise<void>((resolve) => {
          lazyAnimationManager.clear();
          resolve();
        }),
      ]);
      
      ultraSmoothAnimations.updateConfig({
        quality: 'minimal',
        targetFPS: 30,
      });
    },
  }), []);

  return { state, actions, recommendations };
}

/**
 * Hook for ultra-smooth animations with automatic performance adaptation
 */
export function useUltraAnimation(
  presetName: string,
  options: {
    autoOptimize?: boolean;
    fallbackQuality?: 'high' | 'medium' | 'low';
    performanceThreshold?: number;
  } = {}
) {
  const { autoOptimize = true, fallbackQuality = 'medium', performanceThreshold = 60 } = options;
  
  const { preset, config, createMotionComponent, getOptimizedTransition } = useUltraSmoothAnimation(presetName);
  const { state } = useUltraPerformance();
  const controls = useAnimation();

  // Auto-optimize based on performance
  useEffect(() => {
    if (autoOptimize && state.frameRate < performanceThreshold) {
      ultraSmoothAnimations.updateConfig({
        quality: fallbackQuality,
      });
    }
  }, [autoOptimize, state.frameRate, performanceThreshold, fallbackQuality]);

  // Enhanced motion component with performance monitoring
  const createOptimizedMotion = useCallback((
    element: keyof typeof motion,
    additionalProps: any = {}
  ) => {
    const startTime = performance.now();
    
    const component = createMotionComponent(element, {
      ...additionalProps,
      onAnimationStart: () => {
        additionalProps.onAnimationStart?.();
      },
      onAnimationComplete: () => {
        const duration = performance.now() - startTime;
        if (duration > 16.67) { // Longer than 1 frame at 60fps
          console.warn(`Animation took ${duration.toFixed(2)}ms - consider optimization`);
        }
        additionalProps.onAnimationComplete?.();
      },
    });

    return component;
  }, [createMotionComponent]);

  return {
    preset,
    config,
    controls,
    createOptimizedMotion,
    getOptimizedTransition,
    performanceState: state,
  };
}

/**
 * Hook for performance-aware component rendering
 */
export function usePerformanceAwareRendering<T>(
  renderFn: (quality: string) => T,
  dependencies: React.DependencyList = []
): T {
  const { state } = useUltraPerformance();
  
  return useMemo(() => {
    return renderFn(state.animationQuality);
  }, [state.animationQuality, ...dependencies]);
}

/**
 * Hook for adaptive frame rate limiting
 */
export function useAdaptiveFrameRate(targetFPS: number = 60) {
  const { state } = useUltraPerformance();
  const frameTimeRef = useRef(0);
  const [actualFPS, setActualFPS] = useState(targetFPS);

  const requestFrame = useCallback((callback: () => void) => {
    const now = performance.now();
    const elapsed = now - frameTimeRef.current;
    const targetFrameTime = 1000 / targetFPS;

    if (elapsed >= targetFrameTime) {
      frameTimeRef.current = now;
      setActualFPS(1000 / elapsed);
      requestAnimationFrame(callback);
    } else {
      setTimeout(() => requestFrame(callback), targetFrameTime - elapsed);
    }
  }, [targetFPS]);

  // Adapt target FPS based on performance
  useEffect(() => {
    if (state.frameRate < targetFPS * 0.8) {
      // Reduce target FPS if performance is poor
      const adaptedFPS = Math.max(30, targetFPS * 0.8);
      setActualFPS(adaptedFPS);
    }
  }, [state.frameRate, targetFPS]);

  return { requestFrame, actualFPS, performanceFPS: state.frameRate };
}

/**
 * Hook for memory-aware component lifecycle
 */
export function useMemoryAwareLifecycle(
  onMemoryPressure: (level: 'medium' | 'high' | 'critical') => void,
  threshold: 'medium' | 'high' | 'critical' = 'high'
) {
  const { state } = useUltraPerformance();
  const previousPressure = useRef(state.memoryPressure);

  useEffect(() => {
    const thresholdLevels = ['low', 'medium', 'high', 'critical'];
    const currentLevel = thresholdLevels.indexOf(state.memoryPressure);
    const thresholdLevel = thresholdLevels.indexOf(threshold);

    if (currentLevel >= thresholdLevel && previousPressure.current !== state.memoryPressure) {
      onMemoryPressure(state.memoryPressure as 'medium' | 'high' | 'critical');
    }

    previousPressure.current = state.memoryPressure;
  }, [state.memoryPressure, threshold, onMemoryPressure]);

  return {
    memoryPressure: state.memoryPressure,
    shouldOptimize: state.memoryPressure !== 'low',
  };
}

/**
 * Hook for battery-aware performance optimization
 */
export function useBatteryAwarePerformance() {
  const { state } = useUltraPerformance();
  const [batteryOptimized, setBatteryOptimized] = useState(false);

  useEffect(() => {
    if (state.batteryLevel !== undefined) {
      const shouldOptimize = state.batteryLevel < 20; // Optimize when battery < 20%
      
      if (shouldOptimize !== batteryOptimized) {
        setBatteryOptimized(shouldOptimize);
        
        if (shouldOptimize) {
          ultraSmoothAnimations.updateConfig({
            quality: 'low',
            targetFPS: 30,
          });
        }
      }
    }
  }, [state.batteryLevel, batteryOptimized]);

  return {
    batteryLevel: state.batteryLevel,
    batteryOptimized,
    shouldReducePerformance: batteryOptimized,
  };
}

/**
 * Hook for GPU acceleration detection and optimization
 */
export function useGPUOptimization() {
  const { state } = useUltraPerformance();
  
  const getOptimizedStyles = useCallback((baseStyles: React.CSSProperties = {}) => {
    if (!state.gpuAcceleration) {
      // Fallback styles for non-GPU accelerated devices
      return {
        ...baseStyles,
        transform: baseStyles.transform || 'translateZ(0)', // Force GPU layer
        willChange: 'auto', // Don't hint will-change without GPU
      };
    }

    return {
      ...baseStyles,
      transform: baseStyles.transform || 'translate3d(0, 0, 0)', // GPU acceleration
      willChange: 'transform, opacity', // Hint for GPU optimization
      backfaceVisibility: 'hidden',
      perspective: 1000,
    };
  }, [state.gpuAcceleration]);

  return {
    gpuAcceleration: state.gpuAcceleration,
    getOptimizedStyles,
  };
}

/**
 * Hook for performance-aware lazy loading
 */
export function usePerformanceLazyLoading(
  componentId: string,
  priority: 'critical' | 'high' | 'medium' | 'low' = 'medium'
) {
  const { state } = useUltraPerformance();
  const [shouldLoad, setShouldLoad] = useState(priority === 'critical');

  useEffect(() => {
    if (shouldLoad) return;

    // Load based on performance state
    const canLoad = 
      (priority === 'high' && state.performanceScore > 70) ||
      (priority === 'medium' && state.performanceScore > 50) ||
      (priority === 'low' && state.performanceScore > 30);

    if (canLoad && state.memoryPressure !== 'critical') {
      setShouldLoad(true);
      lazyAnimationManager.preloadComponent(componentId);
    }
  }, [componentId, priority, state.performanceScore, state.memoryPressure, shouldLoad]);

  return {
    shouldLoad,
    performanceScore: state.performanceScore,
    canLoadMore: state.memoryPressure !== 'critical' && state.performanceScore > 40,
  };
}

/**
 * Hook for real-time performance monitoring with alerts
 */
export function usePerformanceAlerts(
  thresholds: {
    minFPS?: number;
    maxJank?: number;
    maxMemoryPressure?: 'medium' | 'high' | 'critical';
  } = {}
) {
  const { minFPS = 45, maxJank = 5, maxMemoryPressure = 'high' } = thresholds;
  const { state } = useUltraPerformance();
  const [alerts, setAlerts] = useState<string[]>([]);

  useEffect(() => {
    const newAlerts: string[] = [];

    if (state.frameRate < minFPS) {
      newAlerts.push(`Low frame rate: ${state.frameRate.toFixed(1)} FPS`);
    }

    if (state.jankPercentage > maxJank) {
      newAlerts.push(`High jank: ${state.jankPercentage.toFixed(1)}%`);
    }

    const pressureLevels = ['low', 'medium', 'high', 'critical'];
    const currentLevel = pressureLevels.indexOf(state.memoryPressure);
    const maxLevel = pressureLevels.indexOf(maxMemoryPressure);

    if (currentLevel > maxLevel) {
      newAlerts.push(`Memory pressure: ${state.memoryPressure}`);
    }

    setAlerts(newAlerts);
  }, [state.frameRate, state.jankPercentage, state.memoryPressure, minFPS, maxJank, maxMemoryPressure]);

  return {
    alerts,
    hasAlerts: alerts.length > 0,
    performanceState: state,
  };
}

/**
 * Hook for coordinated performance optimization across components
 */
export function useCoordinatedPerformance(componentName: string) {
  const { state, actions } = useUltraPerformance();
  const [isOptimized, setIsOptimized] = useState(false);

  // Register component for coordinated optimization
  useEffect(() => {
    const handleGlobalOptimization = (event: CustomEvent) => {
      const { quality } = event.detail;
      setIsOptimized(quality === 'low' || quality === 'minimal');
    };

    window.addEventListener('animation-quality-change', handleGlobalOptimization as EventListener);
    
    return () => {
      window.removeEventListener('animation-quality-change', handleGlobalOptimization as EventListener);
    };
  }, []);

  // Auto-optimize when performance degrades
  useEffect(() => {
    if (state.performanceScore < 40 && !isOptimized) {
      actions.reduceQuality();
      setIsOptimized(true);
    } else if (state.performanceScore > 80 && isOptimized) {
      setIsOptimized(false);
    }
  }, [state.performanceScore, isOptimized, actions]);

  return {
    isOptimized,
    shouldReduceEffects: isOptimized || state.memoryPressure === 'critical',
    performanceScore: state.performanceScore,
    componentName,
  };
}

export default {
  useUltraPerformance,
  useUltraAnimation,
  usePerformanceAwareRendering,
  useAdaptiveFrameRate,
  useMemoryAwareLifecycle,
  useBatteryAwarePerformance,
  useGPUOptimization,
  usePerformanceLazyLoading,
  usePerformanceAlerts,
  useCoordinatedPerformance,
};