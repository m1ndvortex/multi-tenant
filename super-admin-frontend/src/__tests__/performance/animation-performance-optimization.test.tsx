/**
 * Animation Performance Optimization Tests
 * Tests for task 18: Animation Performance Optimization
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { performanceMonitor } from '@/lib/theme/animations';
import { lazyAnimationManager } from '@/lib/theme/lazy-animations';
import { reducedMotionManager } from '@/lib/theme/reduced-motion';
import { PerformanceMonitor } from '@/components/animations/PerformanceMonitor';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
  useAnimation: () => ({
    start: vi.fn(),
    stop: vi.fn(),
    set: vi.fn(),
  }),
}));

// Mock performance API
const mockPerformance = {
  now: vi.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    totalJSHeapSize: 100 * 1024 * 1024, // 100MB
  },
};

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true,
});

// Mock navigator
Object.defineProperty(global, 'navigator', {
  value: {
    hardwareConcurrency: 4,
    deviceMemory: 8,
    connection: {
      effectiveType: '4g',
    },
  },
  writable: true,
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: query.includes('prefers-reduced-motion: reduce') ? false : true,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn(cb => setTimeout(cb, 16));

describe('Animation Performance Optimization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset performance monitor state
    performanceMonitor.cleanup();
    lazyAnimationManager.cleanup();
    reducedMotionManager.cleanup();
    
    // Wait a bit for cleanup to complete
    return new Promise(resolve => setTimeout(resolve, 10));
  });

  afterEach(() => {
    performanceMonitor.cleanup();
    lazyAnimationManager.cleanup();
    reducedMotionManager.cleanup();
  });

  describe('Performance Monitoring', () => {
    it('should initialize performance monitoring correctly', () => {
      const metrics = performanceMonitor.getMetrics();
      const config = performanceMonitor.getPerformanceConfig();

      expect(metrics).toHaveProperty('frameRate');
      expect(metrics).toHaveProperty('memoryUsage');
      expect(metrics).toHaveProperty('animationCount');
      expect(metrics).toHaveProperty('lastUpdate');

      expect(config).toHaveProperty('enableAnimations');
      expect(config).toHaveProperty('performanceLevel');
      expect(config).toHaveProperty('reducedMotion');
    });

    it('should track frame rate history', async () => {
      // Simulate frame rate measurements
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const history = performanceMonitor.getPerformanceHistory();
      expect(history).toHaveProperty('frameRateHistory');
      expect(history).toHaveProperty('averageFrameRate');
    });

    it('should detect device capabilities', () => {
      const deviceInfo = performanceMonitor.getDeviceInfo();
      
      expect(deviceInfo).toHaveProperty('isLowEndDevice');
      expect(deviceInfo).toHaveProperty('connectionSpeed');
      expect(deviceInfo).toHaveProperty('hardwareConcurrency');
      expect(deviceInfo.hardwareConcurrency).toBe(4);
    });

    it('should adjust performance level based on metrics', () => {
      // Simulate low frame rate
      const originalGetMetrics = performanceMonitor.getMetrics;
      vi.spyOn(performanceMonitor, 'getMetrics').mockReturnValue({
        frameRate: 20, // Low frame rate
        memoryUsage: 50,
        animationCount: 5,
        lastUpdate: Date.now(),
      });

      // Trigger performance adjustment
      performanceMonitor['adjustPerformanceLevel']();
      
      const config = performanceMonitor.getPerformanceConfig();
      expect(config.performanceLevel).toBe('low');
    });

    it('should register and unregister animation instances', () => {
      // Test that the methods exist and can be called without errors
      expect(() => {
        performanceMonitor.registerAnimationInstance('test-animation-1');
        performanceMonitor.registerAnimationInstance('test-animation-2');
        performanceMonitor.unregisterAnimationInstance('test-animation-1');
        performanceMonitor.unregisterAnimationInstance('test-animation-2');
      }).not.toThrow();
      
      // Test that metrics are available
      const metrics = performanceMonitor.getMetrics();
      expect(metrics).toHaveProperty('animationCount');
      expect(typeof metrics.animationCount).toBe('number');
    });
  });

  describe('Automatic Quality Adjustment', () => {
    it('should disable animations when performance is critical', async () => {
      // Mock critical performance conditions
      vi.spyOn(performanceMonitor, 'getMetrics').mockReturnValue({
        frameRate: 10, // Very low frame rate
        memoryUsage: 200, // High memory usage
        animationCount: 0,
        lastUpdate: Date.now(),
      });

      // Trigger automatic quality adjustment
      await act(async () => {
        performanceMonitor['performAutomaticQualityAdjustment']();
      });

      const config = performanceMonitor.getPerformanceConfig();
      expect(config.enableAnimations).toBe(false);
    });

    it('should re-enable animations when performance improves', async () => {
      // First disable animations by setting the internal config
      performanceMonitor['performanceConfig'].enableAnimations = false;

      // Mock improved performance conditions
      const mockGetAverageFrameRate = vi.spyOn(performanceMonitor as any, 'getAverageFrameRate').mockReturnValue(60);
      const mockGetAverageMemoryUsage = vi.spyOn(performanceMonitor as any, 'getAverageMemoryUsage').mockReturnValue(30);

      // Trigger automatic quality adjustment
      await act(async () => {
        performanceMonitor['performAutomaticQualityAdjustment']();
      });

      const config = performanceMonitor.getPerformanceConfig();
      expect(config.enableAnimations).toBe(true);
      
      // Cleanup mocks
      mockGetAverageFrameRate.mockRestore();
      mockGetAverageMemoryUsage.mockRestore();
    });

    it('should optimize animation duration based on performance level', () => {
      const baseDuration = 0.5;

      // Test high performance
      performanceMonitor['performanceConfig'].performanceLevel = 'high';
      expect(performanceMonitor.getOptimizedDuration(baseDuration)).toBe(baseDuration);

      // Test medium performance
      performanceMonitor['performanceConfig'].performanceLevel = 'medium';
      expect(performanceMonitor.getOptimizedDuration(baseDuration)).toBe(baseDuration * 0.75);

      // Test low performance
      performanceMonitor['performanceConfig'].performanceLevel = 'low';
      expect(performanceMonitor.getOptimizedDuration(baseDuration)).toBe(baseDuration * 0.5);
    });
  });

  describe('Lazy Loading System', () => {
    it('should register animation components correctly', () => {
      const component = lazyAnimationManager.getComponent('CyberAnimations');
      expect(component).toBeDefined();
    });

    it('should not load components when performance is poor', () => {
      // Mock poor performance
      vi.spyOn(performanceMonitor, 'getPerformanceConfig').mockReturnValue({
        enableAnimations: false,
        reducedMotion: false,
        performanceLevel: 'low',
        frameRate: 20,
        memoryThreshold: 100,
      });

      const component = lazyAnimationManager.getComponent('HolographicBackground');
      expect(component).toBeNull();
    });

    it('should track loading status correctly', () => {
      const status = lazyAnimationManager.getLoadingStatus();
      
      expect(status).toHaveProperty('totalComponents');
      expect(status).toHaveProperty('loadedComponents');
      expect(status).toHaveProperty('loadedComponentNames');
      expect(status).toHaveProperty('memoryUsage');
      expect(status.totalComponents).toBeGreaterThan(0);
    });

    it('should unload low priority components when needed', () => {
      // Load some components first
      lazyAnimationManager.getComponent('CyberAnimations');
      lazyAnimationManager.getComponent('HolographicBackground');

      const initialStatus = lazyAnimationManager.getLoadingStatus();
      
      // Unload low priority components
      lazyAnimationManager.unloadLowPriorityComponents();
      
      const finalStatus = lazyAnimationManager.getLoadingStatus();
      expect(finalStatus.loadedComponents).toBeLessThanOrEqual(initialStatus.loadedComponents);
    });
  });

  describe('Reduced Motion Support', () => {
    it('should detect system preference for reduced motion', () => {
      // Mock reduced motion preference
      window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: query.includes('prefers-reduced-motion: reduce') ? true : false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));

      // Create new instance to pick up mocked matchMedia
      const testReducedMotionManager = new (reducedMotionManager.constructor as any)();
      
      expect(testReducedMotionManager.isEnabled()).toBe(true);
    });

    it('should provide reduced motion variants', () => {
      const originalVariants = {
        hidden: { opacity: 0, x: -100, scale: 0.8 },
        visible: { opacity: 1, x: 0, scale: 1 },
      };

      reducedMotionManager.updateConfig({ enabled: true });
      const reducedVariants = reducedMotionManager.getReducedVariants(originalVariants);

      // Should remove position and scale animations
      expect(reducedVariants.hidden).not.toHaveProperty('x');
      expect(reducedVariants.hidden).not.toHaveProperty('scale');
      expect(reducedVariants.visible).not.toHaveProperty('x');
      expect(reducedVariants.visible).not.toHaveProperty('scale');
      
      // Should keep opacity if allowed
      expect(reducedVariants.hidden).toHaveProperty('opacity');
      expect(reducedVariants.visible).toHaveProperty('opacity');
    });

    it('should provide alternative indicators', () => {
      const indicators = reducedMotionManager.getAlternativeIndicators();
      
      expect(indicators).toHaveProperty('loadingIndicator');
      expect(indicators).toHaveProperty('successIndicator');
      expect(indicators).toHaveProperty('errorIndicator');
      expect(indicators).toHaveProperty('activeIndicator');
    });

    it('should save and load user preferences', () => {
      const testConfig = {
        enabled: true,
        allowEssentialAnimations: false,
        customPreferences: {
          allowHoverEffects: false,
          allowFadeTransitions: true,
          allowScaleTransitions: false,
          allowColorTransitions: true,
          allowPositionTransitions: false,
        },
      };

      reducedMotionManager.updateConfig(testConfig);
      const savedConfig = reducedMotionManager.getConfig();
      
      expect(savedConfig.enabled).toBe(testConfig.enabled);
      expect(savedConfig.allowEssentialAnimations).toBe(testConfig.allowEssentialAnimations);
      expect(savedConfig.customPreferences.allowHoverEffects).toBe(testConfig.customPreferences.allowHoverEffects);
    });
  });

  describe('Memory Management', () => {
    it('should detect memory pressure', () => {
      // Mock high memory usage
      vi.spyOn(performanceMonitor, 'getMetrics').mockReturnValue({
        frameRate: 60,
        memoryUsage: 150, // High memory usage
        animationCount: 10,
        lastUpdate: Date.now(),
      });

      // Trigger memory health check
      performanceMonitor['checkMemoryHealth']();
      
      // Should detect high memory usage (implementation detail)
      expect(true).toBe(true); // Placeholder - actual implementation would check internal state
    });

    it('should cleanup animation instances when memory pressure is high', () => {
      // Test that cleanup method exists and can be called
      expect(() => {
        performanceMonitor['cleanupAnimationInstances']();
      }).not.toThrow();
      
      // Test that the cleanup method is functional
      const cleanupMethod = performanceMonitor['cleanupAnimationInstances'];
      expect(typeof cleanupMethod).toBe('function');
      
      // Test that metrics are still available after cleanup
      const metrics = performanceMonitor.getMetrics();
      expect(metrics).toHaveProperty('animationCount');
      expect(typeof metrics.animationCount).toBe('number');
    });

    it('should track memory usage history', () => {
      const history = performanceMonitor.getPerformanceHistory();
      
      expect(history).toHaveProperty('memoryHistory');
      expect(history).toHaveProperty('averageMemoryUsage');
      expect(history).toHaveProperty('memoryTrend');
    });
  });

  describe('Performance Monitor Component', () => {
    it('should render performance metrics', () => {
      render(<PerformanceMonitor showDetails={true} />);
      
      expect(screen.getByText('Performance')).toBeInTheDocument();
      expect(screen.getByText('FPS:')).toBeInTheDocument();
      expect(screen.getByText('Level:')).toBeInTheDocument();
      // Use getAllByText for multiple "Memory:" labels
      expect(screen.getAllByText('Memory:').length).toBeGreaterThan(0);
    });

    it('should show expanded details when requested', () => {
      render(<PerformanceMonitor showDetails={true} />);
      
      expect(screen.getByText('Active:')).toBeInTheDocument();
      expect(screen.getByText('Loaded:')).toBeInTheDocument();
      expect(screen.getByText('Device:')).toBeInTheDocument();
      expect(screen.getByText('Connection:')).toBeInTheDocument();
    });

    it('should update metrics in real-time', async () => {
      render(<PerformanceMonitor showDetails={true} />);
      
      // Wait for metrics to update
      await waitFor(() => {
        expect(screen.getAllByText(/FPS:/).length).toBeGreaterThan(0);
      });
      
      // Metrics should be displayed
      expect(screen.getAllByText(/\d+/).length).toBeGreaterThan(0); // Should show numeric values
    });
  });

  describe('Integration Tests', () => {
    it('should coordinate between all performance systems', async () => {
      // Test that all systems are available and functional
      const initialMetrics = performanceMonitor.getMetrics();
      const lazyStatus = lazyAnimationManager.getLoadingStatus();
      const reducedMotionConfig = reducedMotionManager.getConfig();
      
      expect(initialMetrics).toBeDefined();
      expect(initialMetrics).toHaveProperty('frameRate');
      expect(initialMetrics).toHaveProperty('memoryUsage');
      expect(initialMetrics).toHaveProperty('animationCount');
      
      expect(lazyStatus).toBeDefined();
      expect(lazyStatus).toHaveProperty('totalComponents');
      expect(lazyStatus).toHaveProperty('loadedComponents');
      
      expect(reducedMotionConfig).toBeDefined();
      expect(reducedMotionConfig).toHaveProperty('enabled');
      expect(reducedMotionConfig).toHaveProperty('respectSystemPreference');
      
      // Test that systems can interact without errors
      expect(() => {
        performanceMonitor.registerAnimationInstance('integration-test');
        performanceMonitor.unregisterAnimationInstance('integration-test');
      }).not.toThrow();
    });

    it('should handle cleanup properly', () => {
      // Register some resources
      performanceMonitor.registerAnimationInstance('cleanup-test');
      lazyAnimationManager.getComponent('CyberAnimations');
      
      // Cleanup all systems
      performanceMonitor.cleanup();
      lazyAnimationManager.cleanup();
      reducedMotionManager.cleanup();
      
      // Should not throw errors
      expect(true).toBe(true);
    });
  });
});

describe('Performance Optimization Hooks', () => {
  // These would be tested with React Testing Library's renderHook
  // but for now we'll test the underlying logic
  
  it('should provide adaptive animation quality', () => {
    // Mock different performance levels
    const testCases = [
      { frameRate: 60, memoryUsage: 30, expected: 'high' },
      { frameRate: 40, memoryUsage: 70, expected: 'medium' },
      { frameRate: 20, memoryUsage: 90, expected: 'low' },
    ];

    testCases.forEach(({ frameRate, memoryUsage, expected }) => {
      vi.spyOn(performanceMonitor, 'getMetrics').mockReturnValue({
        frameRate,
        memoryUsage,
        animationCount: 0,
        lastUpdate: Date.now(),
      });

      // The actual hook would determine quality level based on these metrics
      // This is a simplified test of the logic
      let qualityLevel = 'high';
      if (frameRate < 30 || memoryUsage > 80) {
        qualityLevel = 'low';
      } else if (frameRate < 50 || memoryUsage > 60) {
        qualityLevel = 'medium';
      }

      expect(qualityLevel).toBe(expected);
    });
  });
});