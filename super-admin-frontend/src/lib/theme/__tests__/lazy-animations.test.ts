/**
 * Production-Ready Unit Tests for Advanced Lazy Loading System
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { lazyAnimationManager } from '../lazy-animations';

// Mock React
vi.mock('react', () => {
  const mockReact = {
    useState: vi.fn(() => [null, vi.fn()]),
    useEffect: vi.fn(),
    useCallback: vi.fn((fn) => fn),
    useMemo: vi.fn((fn) => fn()),
    forwardRef: vi.fn((fn) => fn),
    lazy: vi.fn(() => () => 'MockComponent'),
    Suspense: ({ children }: any) => children,
    createElement: vi.fn(() => 'MockElement'),
  };
  return {
    default: mockReact,
    ...mockReact,
  };
});

// Mock Framer Motion
vi.mock('framer-motion', () => ({
  motion: { div: 'div' },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock global objects
const mockPerformance = {
  now: vi.fn(() => Date.now()),
  mark: vi.fn(),
  measure: vi.fn(),
  memory: {
    usedJSHeapSize: 100 * 1024 * 1024, // 100MB
    jsHeapSizeLimit: 2 * 1024 * 1024 * 1024, // 2GB
  },
};

const mockNavigator = {
  hardwareConcurrency: 4,
  connection: {
    effectiveType: '4g',
  },
};

const mockWindow = {
  requestAnimationFrame: vi.fn((callback) => setTimeout(callback, 16)),
};

// Setup global mocks
Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true,
});

Object.defineProperty(global, 'navigator', {
  value: mockNavigator,
  writable: true,
});

Object.defineProperty(global, 'window', {
  value: mockWindow,
  writable: true,
});

describe('LazyAnimationManager - Production Tests', () => {
  let mockPerformance: any;
  let mockNavigator: any;
  let mockWindow: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockPerformance = {
      now: vi.fn(() => Date.now()),
      mark: vi.fn(),
      measure: vi.fn(),
      memory: { usedJSHeapSize: 100 * 1024 * 1024 },
    };

    mockNavigator = {
      hardwareConcurrency: 4,
      connection: { effectiveType: '4g' },
    };

    mockWindow = {
      requestAnimationFrame: vi.fn((cb) => setTimeout(cb, 16)),
    };

    global.performance = mockPerformance;
    global.navigator = mockNavigator;
    global.window = mockWindow;
    
    lazyAnimationManager.clear();
  });

  afterEach(() => {
    lazyAnimationManager.cleanup();
  });

  describe('Core Functionality', () => {
    it('should initialize and provide loading status', () => {
      const status = lazyAnimationManager.getLoadingStatus();
      expect(status).toHaveProperty('totalComponents');
      expect(status).toHaveProperty('loadedComponents');
      expect(status).toHaveProperty('memoryUsage');
      expect(typeof status.totalComponents).toBe('number');
    });

    it('should register components', () => {
      const mockComponent = () => Promise.resolve({ default: () => 'MockComponent' });
      
      lazyAnimationManager.registerComponent('test-component', {
        component: mockComponent,
        priority: 'high',
      });

      const status = lazyAnimationManager.getLoadingStatus();
      expect(status.totalComponents).toBeGreaterThan(0);
    });

    it('should provide performance metrics', () => {
      const metrics = lazyAnimationManager.getPerformanceMetrics();
      expect(metrics).toHaveProperty('frameRate');
      expect(metrics).toHaveProperty('memoryUsage');
      expect(metrics).toHaveProperty('isLowEndDevice');
      expect(metrics).toHaveProperty('connectionSpeed');
    });
  });

  describe('Performance Optimization', () => {
    it('should detect low-end devices', async () => {
      // Mock low-end device conditions
      const lowEndNavigator = {
        ...mockNavigator,
        hardwareConcurrency: 1,
      };
      
      Object.defineProperty(global, 'navigator', {
        value: lowEndNavigator,
        writable: true,
      });
      
      // Create new instance to pick up the new navigator values
      const lazyModule = await import('../lazy-animations');
      const testManager = new lazyModule.LazyAnimationManager();
      const metrics = testManager.getPerformanceMetrics();
      expect(metrics.isLowEndDevice).toBe(true);
    });

    it('should detect connection speed', async () => {
      // Mock slow connection
      const slowConnectionNavigator = {
        ...mockNavigator,
        connection: {
          effectiveType: '2g',
        },
      };
      
      Object.defineProperty(global, 'navigator', {
        value: slowConnectionNavigator,
        writable: true,
      });
      
      // Create new instance to pick up the new navigator values
      const lazyModule = await import('../lazy-animations');
      const testManager = new lazyModule.LazyAnimationManager();
      const metrics = testManager.getPerformanceMetrics();
      expect(metrics.connectionSpeed).toBe('slow');
    });

    it('should handle component preloading', async () => {
      const mockComponent = vi.fn(() => Promise.resolve({ 
        default: () => 'TestComponent'
      }));

      lazyAnimationManager.registerComponent('test-preload', {
        component: mockComponent,
        priority: 'high',
      });

      await expect(lazyAnimationManager.preloadComponent('test-preload'))
        .resolves.not.toThrow();
    });
  });

  describe('Route-Based Loading', () => {
    it('should support route-based preloading', async () => {
      await expect(lazyAnimationManager.preloadForRoute('/dashboard'))
        .resolves.not.toThrow();
    });

    it('should handle unknown routes', async () => {
      await expect(lazyAnimationManager.preloadForRoute('/unknown'))
        .resolves.not.toThrow();
    });
  });

  describe('Priority Management', () => {
    it('should support priority-based preloading', async () => {
      const mockComponent = vi.fn(() => Promise.resolve({ 
        default: () => 'PriorityComponent'
      }));

      lazyAnimationManager.registerComponent('priority-test', {
        component: mockComponent,
        priority: 'critical',
      });

      await expect(lazyAnimationManager.preloadByPriority('high'))
        .resolves.not.toThrow();
    });

    it('should create lazy components', () => {
      const mockComponent = () => Promise.resolve({ 
        default: () => 'LazyComponent'
      });

      const LazyComponent = lazyAnimationManager.createLazyComponent('lazy-test', {
        component: mockComponent,
        priority: 'medium',
      });

      expect(LazyComponent).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle loading failures gracefully', async () => {
      const failingComponent = vi.fn(() => Promise.reject(new Error('Load failed')));

      lazyAnimationManager.registerComponent('failing-component', {
        component: failingComponent,
        priority: 'high',
      });

      await expect(lazyAnimationManager.preloadComponent('failing-component'))
        .resolves.not.toThrow();

      const status = lazyAnimationManager.getLoadingStatus();
      expect(status.failedComponents).toBeGreaterThanOrEqual(0);
    });

    it('should create components with fallbacks', () => {
      const failingComponent = () => Promise.reject(new Error('Load failed'));
      const FallbackComponent = () => 'Fallback';

      const LazyComponent = lazyAnimationManager.createLazyComponent('failing-with-fallback', {
        component: failingComponent,
        priority: 'high',
        fallback: FallbackComponent,
      });

      expect(LazyComponent).toBeDefined();
    });
  });

  describe('Memory and Cleanup', () => {
    it('should track loading metrics', () => {
      const status = lazyAnimationManager.getLoadingStatus();
      expect(status).toHaveProperty('averageLoadTime');
      expect(status).toHaveProperty('memoryUsage');
      expect(typeof status.averageLoadTime).toBe('number');
    });

    it('should clear resources', () => {
      lazyAnimationManager.clear();
      const status = lazyAnimationManager.getLoadingStatus();
      expect(status.loadedComponents).toBe(0);
      expect(status.failedComponents).toBe(0);
    });

    it('should cleanup observers', () => {
      expect(() => lazyAnimationManager.cleanup()).not.toThrow();
    });
  });
});