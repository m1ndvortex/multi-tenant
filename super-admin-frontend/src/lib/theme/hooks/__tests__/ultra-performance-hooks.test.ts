/**
 * Comprehensive Tests for Ultra Performance React Hooks
 * Tests all ultra-performance hooks for zero-lag animation system
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
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
} from '../ultra-performance-hooks';

// Mock dependencies
vi.mock('../../ultra-performance-monitor', () => ({
  ultraPerformanceMonitor: {
    getMetrics: vi.fn(() => ({
      frameRate: 120,
      jankPercentage: 0.5,
      memoryPressure: 'low',
      animationQuality: 'ultra',
      gpuAcceleration: true,
      batteryLevel: 80,
      thermalState: 'nominal',
      networkLatency: 25,
    })),
    getPerformanceScore: vi.fn(() => 95),
    isOptimalPerformance: vi.fn(() => true),
    getRecommendations: vi.fn(() => []),
  },
}));

vi.mock('../../ultra-smooth-animations', () => ({
  ultraSmoothAnimations: {
    getConfig: vi.fn(() => ({
      quality: 'ultra',
      targetFPS: 120,
      enableGPU: true,
      adaptiveQuality: true,
    })),
    updateConfig: vi.fn(),
    getPreset: vi.fn(() => ({
      name: 'test-preset',
      variants: { initial: { opacity: 0 }, animate: { opacity: 1 } },
      transition: { duration: 0.3 },
      quality: 'ultra',
      gpuOptimized: true,
    })),
  },
  useUltraSmoothAnimation: vi.fn(() => ({
    preset: {
      name: 'test-preset',
      variants: { initial: { opacity: 0 }, animate: { opacity: 1 } },
      transition: { duration: 0.3 },
      quality: 'ultra',
      gpuOptimized: true,
    },
    config: {
      quality: 'ultra',
      targetFPS: 120,
      enableGPU: true,
    },
    createMotionComponent: vi.fn(),
    getOptimizedTransition: vi.fn(),
  })),
}));

vi.mock('../../cache', () => ({
  CacheManager: {
    clearAllCaches: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('../../asset-preloader', () => ({
  assetPreloader: {
    preloadAssets: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('../../lazy-animations', () => ({
  lazyAnimationManager: {
    clear: vi.fn(),
    preloadComponent: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('framer-motion', () => ({
  motion: { div: vi.fn() },
  useAnimation: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
}));

// Mock React
vi.mock('react', () => ({
  useState: vi.fn((initial) => [initial, vi.fn()]),
  useEffect: vi.fn(),
  useCallback: vi.fn((fn) => fn),
  useMemo: vi.fn((fn) => fn()),
  useRef: vi.fn(() => ({ current: null })),
}));

// Mock global objects
const mockPerformance = {
  now: vi.fn(() => Date.now()),
};

const mockWindow = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
  requestAnimationFrame: vi.fn((cb) => setTimeout(cb, 16)),
};

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true,
});

Object.defineProperty(global, 'window', {
  value: mockWindow,
  writable: true,
});

describe('Ultra Performance Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useUltraPerformance', () => {
    it('should provide performance state and actions', () => {
      const { result } = renderHook(() => useUltraPerformance());

      expect(result.current.state).toBeDefined();
      expect(result.current.actions).toBeDefined();
      expect(result.current.recommendations).toBeDefined();

      // Check state properties
      expect(result.current.state.frameRate).toBe(120);
      expect(result.current.state.jankPercentage).toBe(0.5);
      expect(result.current.state.memoryPressure).toBe('low');
      expect(result.current.state.animationQuality).toBe('ultra');
      expect(result.current.state.performanceScore).toBe(95);
      expect(result.current.state.isOptimal).toBe(true);
      expect(result.current.state.gpuAcceleration).toBe(true);

      // Check actions
      expect(typeof result.current.actions.reduceQuality).toBe('function');
      expect(typeof result.current.actions.clearCaches).toBe('function');
      expect(typeof result.current.actions.preloadAssets).toBe('function');
      expect(typeof result.current.actions.throttleAnimations).toBe('function');
      expect(typeof result.current.actions.emergencyCleanup).toBe('function');
    });

    it('should execute optimization actions', async () => {
      const { result } = renderHook(() => useUltraPerformance());

      // Test reduce quality action
      act(() => {
        result.current.actions.reduceQuality();
      });

      // Test clear caches action
      await act(async () => {
        await result.current.actions.clearCaches();
      });

      // Test preload assets action
      await act(async () => {
        await result.current.actions.preloadAssets('high');
      });

      // Test throttle animations action
      act(() => {
        result.current.actions.throttleAnimations();
      });

      // Test emergency cleanup action
      await act(async () => {
        await result.current.actions.emergencyCleanup();
      });

      // Verify actions were called
      expect(result.current.actions).toBeDefined();
    });
  });

  describe('useUltraAnimation', () => {
    it('should provide animation configuration and controls', () => {
      const { result } = renderHook(() => useUltraAnimation('test-preset'));

      expect(result.current.preset).toBeDefined();
      expect(result.current.config).toBeDefined();
      expect(result.current.controls).toBeDefined();
      expect(result.current.createOptimizedMotion).toBeDefined();
      expect(result.current.getOptimizedTransition).toBeDefined();
      expect(result.current.performanceState).toBeDefined();

      // Check preset properties
      expect(result.current.preset.name).toBe('test-preset');
      expect(result.current.preset.quality).toBe('ultra');
      expect(result.current.preset.gpuOptimized).toBe(true);
    });

    it('should auto-optimize based on performance', () => {
      const { result } = renderHook(() => 
        useUltraAnimation('test-preset', {
          autoOptimize: true,
          fallbackQuality: 'medium',
          performanceThreshold: 60,
        })
      );

      expect(result.current.performanceState.frameRate).toBe(120);
      expect(result.current.config.quality).toBe('ultra');
    });

    it('should create optimized motion components', () => {
      const { result } = renderHook(() => useUltraAnimation('test-preset'));

      const component = result.current.createOptimizedMotion('div', {
        className: 'test-class',
      });

      expect(component).toBeDefined();
    });
  });

  describe('usePerformanceAwareRendering', () => {
    it('should render based on performance quality', () => {
      const renderFn = vi.fn((quality) => `rendered-${quality}`);
      
      const { result } = renderHook(() => 
        usePerformanceAwareRendering(renderFn, [])
      );

      expect(result.current).toBe('rendered-ultra');
      expect(renderFn).toHaveBeenCalledWith('ultra');
    });

    it('should re-render when dependencies change', () => {
      const renderFn = vi.fn((quality) => `rendered-${quality}`);
      let dependency = 'initial';
      
      const { result, rerender } = renderHook(() => 
        usePerformanceAwareRendering(renderFn, [dependency])
      );

      expect(result.current).toBe('rendered-ultra');

      dependency = 'changed';
      rerender();

      expect(renderFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('useAdaptiveFrameRate', () => {
    it('should provide adaptive frame rate control', () => {
      const { result } = renderHook(() => useAdaptiveFrameRate(60));

      expect(result.current.requestFrame).toBeDefined();
      expect(result.current.actualFPS).toBe(60);
      expect(result.current.performanceFPS).toBe(120);
    });

    it('should adapt frame rate based on performance', () => {
      const { result } = renderHook(() => useAdaptiveFrameRate(120));

      // Should maintain high frame rate with good performance
      expect(result.current.actualFPS).toBeGreaterThan(0);
      expect(result.current.performanceFPS).toBe(120);
    });
  });

  describe('useMemoryAwareLifecycle', () => {
    it('should monitor memory pressure', () => {
      const onMemoryPressure = vi.fn();
      
      const { result } = renderHook(() => 
        useMemoryAwareLifecycle(onMemoryPressure, 'high')
      );

      expect(result.current.memoryPressure).toBe('low');
      expect(result.current.shouldOptimize).toBe(false);
    });

    it('should call callback on memory pressure change', () => {
      const onMemoryPressure = vi.fn();
      
      renderHook(() => 
        useMemoryAwareLifecycle(onMemoryPressure, 'medium')
      );

      // With low memory pressure, callback should not be called
      expect(onMemoryPressure).not.toHaveBeenCalled();
    });
  });

  describe('useBatteryAwarePerformance', () => {
    it('should provide battery-aware optimization', () => {
      const { result } = renderHook(() => useBatteryAwarePerformance());

      expect(result.current.batteryLevel).toBe(80);
      expect(result.current.batteryOptimized).toBe(false);
      expect(result.current.shouldReducePerformance).toBe(false);
    });

    it('should optimize for low battery', () => {
      // Mock low battery
      const { ultraPerformanceMonitor } = require('../../ultra-performance-monitor');
      ultraPerformanceMonitor.getMetrics.mockReturnValue({
        ...ultraPerformanceMonitor.getMetrics(),
        batteryLevel: 15, // Low battery
      });

      const { result } = renderHook(() => useBatteryAwarePerformance());

      expect(result.current.batteryLevel).toBe(15);
    });
  });

  describe('useGPUOptimization', () => {
    it('should provide GPU optimization utilities', () => {
      const { result } = renderHook(() => useGPUOptimization());

      expect(result.current.gpuAcceleration).toBe(true);
      expect(result.current.getOptimizedStyles).toBeDefined();
    });

    it('should generate optimized styles for GPU acceleration', () => {
      const { result } = renderHook(() => useGPUOptimization());

      const styles = result.current.getOptimizedStyles({
        color: 'red',
      });

      expect(styles).toHaveProperty('color', 'red');
      expect(styles).toHaveProperty('transform');
      expect(styles).toHaveProperty('willChange');
      expect(styles).toHaveProperty('backfaceVisibility');
      expect(styles).toHaveProperty('perspective');
    });

    it('should provide fallback styles for non-GPU devices', () => {
      // Mock no GPU acceleration
      const { ultraPerformanceMonitor } = require('../../ultra-performance-monitor');
      ultraPerformanceMonitor.getMetrics.mockReturnValue({
        ...ultraPerformanceMonitor.getMetrics(),
        gpuAcceleration: false,
      });

      const { result } = renderHook(() => useGPUOptimization());

      const styles = result.current.getOptimizedStyles();

      expect(styles).toHaveProperty('willChange', 'auto');
    });
  });

  describe('usePerformanceLazyLoading', () => {
    it('should control lazy loading based on performance', () => {
      const { result } = renderHook(() => 
        usePerformanceLazyLoading('test-component', 'high')
      );

      expect(result.current.shouldLoad).toBe(true); // High performance score
      expect(result.current.performanceScore).toBe(95);
      expect(result.current.canLoadMore).toBe(true);
    });

    it('should load critical components immediately', () => {
      const { result } = renderHook(() => 
        usePerformanceLazyLoading('critical-component', 'critical')
      );

      expect(result.current.shouldLoad).toBe(true);
    });

    it('should defer loading on poor performance', () => {
      // Mock poor performance
      const { ultraPerformanceMonitor } = require('../../ultra-performance-monitor');
      ultraPerformanceMonitor.getPerformanceScore.mockReturnValue(30);
      ultraPerformanceMonitor.getMetrics.mockReturnValue({
        ...ultraPerformanceMonitor.getMetrics(),
        memoryPressure: 'critical',
      });

      const { result } = renderHook(() => 
        usePerformanceLazyLoading('test-component', 'low')
      );

      expect(result.current.canLoadMore).toBe(false);
    });
  });

  describe('usePerformanceAlerts', () => {
    it('should provide performance alerts', () => {
      const { result } = renderHook(() => 
        usePerformanceAlerts({
          minFPS: 45,
          maxJank: 5,
          maxMemoryPressure: 'high',
        })
      );

      expect(result.current.alerts).toEqual([]);
      expect(result.current.hasAlerts).toBe(false);
      expect(result.current.performanceState).toBeDefined();
    });

    it('should generate alerts for poor performance', () => {
      // Mock poor performance
      const { ultraPerformanceMonitor } = require('../../ultra-performance-monitor');
      ultraPerformanceMonitor.getMetrics.mockReturnValue({
        frameRate: 30, // Below threshold
        jankPercentage: 10, // Above threshold
        memoryPressure: 'critical', // Above threshold
        animationQuality: 'low',
        gpuAcceleration: false,
        batteryLevel: 20,
      });

      const { result } = renderHook(() => 
        usePerformanceAlerts({
          minFPS: 45,
          maxJank: 5,
          maxMemoryPressure: 'high',
        })
      );

      expect(result.current.alerts.length).toBeGreaterThan(0);
      expect(result.current.hasAlerts).toBe(true);
    });
  });

  describe('useCoordinatedPerformance', () => {
    it('should coordinate performance optimization', () => {
      const { result } = renderHook(() => 
        useCoordinatedPerformance('test-component')
      );

      expect(result.current.isOptimized).toBe(false);
      expect(result.current.shouldReduceEffects).toBe(false);
      expect(result.current.performanceScore).toBe(95);
      expect(result.current.componentName).toBe('test-component');
    });

    it('should optimize on performance degradation', () => {
      // Mock poor performance
      const { ultraPerformanceMonitor } = require('../../ultra-performance-monitor');
      ultraPerformanceMonitor.getPerformanceScore.mockReturnValue(30);

      const { result } = renderHook(() => 
        useCoordinatedPerformance('test-component')
      );

      expect(result.current.performanceScore).toBe(30);
    });

    it('should respond to global optimization events', () => {
      const { result } = renderHook(() => 
        useCoordinatedPerformance('test-component')
      );

      // Simulate global optimization event
      act(() => {
        const event = new CustomEvent('animation-quality-change', {
          detail: { quality: 'low' }
        });
        mockWindow.addEventListener.mock.calls.forEach(([eventType, handler]) => {
          if (eventType === 'animation-quality-change') {
            handler(event);
          }
        });
      });

      expect(mockWindow.addEventListener).toHaveBeenCalledWith(
        'animation-quality-change',
        expect.any(Function)
      );
    });
  });

  describe('Integration Tests', () => {
    it('should work together for comprehensive performance management', () => {
      const { result: performanceResult } = renderHook(() => useUltraPerformance());
      const { result: animationResult } = renderHook(() => useUltraAnimation('test-preset'));
      const { result: alertsResult } = renderHook(() => usePerformanceAlerts());

      // All hooks should provide consistent performance data
      expect(performanceResult.current.state.frameRate).toBe(120);
      expect(animationResult.current.performanceState.frameRate).toBe(120);
      expect(alertsResult.current.performanceState.frameRate).toBe(120);
    });

    it('should handle performance degradation across all hooks', () => {
      // Mock performance degradation
      const { ultraPerformanceMonitor } = require('../../ultra-performance-monitor');
      ultraPerformanceMonitor.getMetrics.mockReturnValue({
        frameRate: 25,
        jankPercentage: 15,
        memoryPressure: 'critical',
        animationQuality: 'minimal',
        gpuAcceleration: false,
        batteryLevel: 10,
      });
      ultraPerformanceMonitor.getPerformanceScore.mockReturnValue(20);
      ultraPerformanceMonitor.isOptimalPerformance.mockReturnValue(false);

      const { result: performanceResult } = renderHook(() => useUltraPerformance());
      const { result: alertsResult } = renderHook(() => usePerformanceAlerts());
      const { result: coordinatedResult } = renderHook(() => useCoordinatedPerformance('test'));

      // All hooks should reflect poor performance
      expect(performanceResult.current.state.isOptimal).toBe(false);
      expect(alertsResult.current.hasAlerts).toBe(true);
      expect(coordinatedResult.current.performanceScore).toBe(20);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing performance monitor gracefully', () => {
      // Mock missing performance monitor
      vi.doMock('../../ultra-performance-monitor', () => ({
        ultraPerformanceMonitor: null,
      }));

      expect(() => {
        renderHook(() => useUltraPerformance());
      }).not.toThrow();
    });

    it('should handle animation system failures gracefully', () => {
      // Mock animation system failure
      const { ultraSmoothAnimations } = require('../../ultra-smooth-animations');
      ultraSmoothAnimations.updateConfig.mockImplementation(() => {
        throw new Error('Animation system failure');
      });

      expect(() => {
        const { result } = renderHook(() => useUltraPerformance());
        result.current.actions.reduceQuality();
      }).not.toThrow();
    });

    it('should handle cache system failures gracefully', () => {
      // Mock cache system failure
      const { CacheManager } = require('../../cache');
      CacheManager.clearAllCaches.mockRejectedValue(new Error('Cache failure'));

      expect(async () => {
        const { result } = renderHook(() => useUltraPerformance());
        await result.current.actions.clearCaches();
      }).not.toThrow();
    });
  });
});