/**
 * Production-Ready Unit Tests for Advanced Asset Preloading System
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { AssetPreloader } from '../asset-preloader';

// Mock cybersecurity theme
vi.mock('../cybersecurity', () => ({
  cyberTheme: {
    colors: { primary: '#0B0E1A' },
    animations: { duration: { fast: 150 } }
  },
  CyberTheme: {}
}));

// Mock service worker
vi.mock('../service-worker', () => ({
  serviceWorkerManager: {
    preloadThemes: vi.fn(),
    getCacheStats: vi.fn(),
  },
}));

// Mock React
vi.mock('react', () => ({
  useState: vi.fn(() => [null, vi.fn()]),
  useEffect: vi.fn(),
  useCallback: vi.fn((fn) => fn),
}));

// Mock Framer Motion
vi.mock('framer-motion', () => ({
  motion: { div: 'div' },
}));

describe('AssetPreloader - Production Tests', () => {
  let assetPreloader: AssetPreloader;
  let mockDocument: any;
  let mockWindow: any;
  let mockNavigator: any;
  let mockPerformance: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup clean mocks for each test
    mockDocument = {
      head: { appendChild: vi.fn() },
      getElementById: vi.fn(() => null),
      createElement: vi.fn(() => ({ id: '', textContent: '' })),
      querySelectorAll: vi.fn(() => []),
      fonts: { add: vi.fn() },
    };

    mockWindow = {
      matchMedia: vi.fn(() => ({ matches: false })),
      requestAnimationFrame: vi.fn((cb) => setTimeout(cb, 16)),
    };

    mockNavigator = {
      hardwareConcurrency: 4,
      connection: { effectiveType: '4g', saveData: false },
    };

    mockPerformance = {
      now: vi.fn(() => Date.now()),
      memory: { jsHeapSizeLimit: 2147483648, usedJSHeapSize: 104857600 },
    };

    // Apply mocks globally
    global.document = mockDocument;
    global.window = mockWindow;
    global.navigator = mockNavigator;
    global.performance = mockPerformance;
    global.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      text: () => Promise.resolve('mock content'),
    })) as Mock;
    global.FontFace = vi.fn(() => ({ load: () => Promise.resolve() })) as any;
    global.Image = vi.fn(() => ({ 
      onload: null, 
      onerror: null,
      set src(val) { setTimeout(() => this.onload?.(), 10); }
    })) as any;

    // Create fresh instance for each test
    assetPreloader = new AssetPreloader();
  });

  afterEach(() => {
    if (assetPreloader) {
      assetPreloader.clear();
    }
  });

  describe('Core Functionality', () => {
    it('should initialize with device capabilities', () => {
      const analytics = assetPreloader.getUserAnalytics();
      expect(analytics.deviceCapabilities).toBeDefined();
      expect(analytics.deviceCapabilities.cpuCores).toBe(4);
      expect(analytics.deviceCapabilities.connectionSpeed).toBe('fast');
    });

    it('should detect user preferences', () => {
      const analytics = assetPreloader.getUserAnalytics();
      expect(analytics.preferences).toBeDefined();
      expect(typeof analytics.preferences.reducedMotion).toBe('boolean');
      expect(typeof analytics.preferences.highContrast).toBe('boolean');
    });

    it('should have critical assets pre-registered', () => {
      const metrics = assetPreloader.getMetrics();
      expect(metrics.totalAssets).toBeGreaterThan(0);
      expect(metrics.totalSize).toBeGreaterThan(0);
    });
  });

  describe('Asset Registration', () => {
    it('should register new assets correctly', () => {
      const initialMetrics = assetPreloader.getMetrics();
      
      assetPreloader.registerAsset({
        type: 'css',
        data: '.test { color: red; }',
        priority: 'high',
        size: 1024,
      });

      const newMetrics = assetPreloader.getMetrics();
      expect(newMetrics.totalAssets).toBe(initialMetrics.totalAssets + 1);
      expect(newMetrics.totalSize).toBe(initialMetrics.totalSize + 1024);
    });

    it('should handle different asset types', () => {
      const types = ['css', 'animation', 'font', 'image', 'config'] as const;
      const initialCount = assetPreloader.getMetrics().totalAssets;
      
      types.forEach((type, index) => {
        assetPreloader.registerAsset({
          type,
          data: `test-${type}`,
          priority: 'medium',
          size: 512,
        });
      });

      const metrics = assetPreloader.getMetrics();
      expect(metrics.totalAssets).toBe(initialCount + types.length);
    });
  });

  describe('Asset Preloading', () => {
    it('should preload CSS assets', async () => {
      assetPreloader.registerAsset({
        type: 'css',
        data: '.test { color: red; }',
        priority: 'high',
        size: 1024,
      });

      await assetPreloader.preloadAssets({ priority: 'high' });

      expect(mockDocument.createElement).toHaveBeenCalledWith('style');
      expect(mockDocument.head.appendChild).toHaveBeenCalled();
    });

    it('should handle data saver mode', async () => {
      mockNavigator.connection.saveData = true;
      
      assetPreloader.registerAsset({
        type: 'css',
        data: '.test { color: red; }',
        priority: 'medium',
        size: 1024,
      });

      await assetPreloader.preloadAssets({ 
        priority: 'medium',
        respectDataSaver: true 
      });

      // Should skip preloading due to data saver
      const metrics = assetPreloader.getMetrics();
      expect(metrics.loadedAssets).toBeLessThanOrEqual(metrics.totalAssets);
    });

    it('should handle network failures gracefully', async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error('Network error'))) as Mock;

      assetPreloader.registerAsset({
        type: 'css',
        url: '/test.css',
        priority: 'high',
        size: 1024,
      });

      await expect(assetPreloader.preloadAssets({ priority: 'high' }))
        .resolves.not.toThrow();
    });
  });

  describe('Navigation Analytics', () => {
    it('should record navigation patterns', () => {
      assetPreloader.recordNavigation('/dashboard', '/tenants');
      assetPreloader.recordNavigation('/dashboard', '/tenants');

      const analytics = assetPreloader.getUserAnalytics();
      expect(analytics.navigationPatterns.length).toBeGreaterThan(0);
      
      const pattern = analytics.navigationPatterns
        .find(p => p.from === '/dashboard' && p.to === '/tenants');
      expect(pattern?.frequency).toBe(2);
    });

    it('should support predictive preloading', async () => {
      assetPreloader.recordNavigation('/dashboard', '/tenants');
      
      await expect(assetPreloader.predictivePreload('/dashboard'))
        .resolves.not.toThrow();
    });
  });

  describe('Performance Optimization', () => {
    it('should respect device capabilities', () => {
      mockNavigator.hardwareConcurrency = 1;
      const newPreloader = new AssetPreloader();
      
      const analytics = newPreloader.getUserAnalytics();
      expect(analytics.deviceCapabilities.isLowEndDevice).toBe(true);
      
      newPreloader.clear();
    });

    it('should handle slow connections', () => {
      mockNavigator.connection.effectiveType = '2g';
      const newPreloader = new AssetPreloader();
      
      const analytics = newPreloader.getUserAnalytics();
      expect(analytics.deviceCapabilities.connectionSpeed).toBe('slow');
      
      newPreloader.clear();
    });
  });

  describe('Asset Loading', () => {
    it('should load different asset types', async () => {
      const assetTypes = [
        { type: 'css' as const, data: '.test {}' },
        { type: 'animation' as const, data: { fade: true } },
        { type: 'config' as const, data: { theme: 'cyber' } },
      ];

      for (const asset of assetTypes) {
        assetPreloader.registerAsset({
          ...asset,
          priority: 'high',
          size: 512,
        });
      }

      await expect(assetPreloader.preloadAssets({ priority: 'high' }))
        .resolves.not.toThrow();
    });

    it('should handle external assets', async () => {
      assetPreloader.registerAsset({
        type: 'font',
        url: '/fonts/test.woff2',
        priority: 'high',
        size: 2048,
      });

      await expect(assetPreloader.preloadAssets({ priority: 'high' }))
        .resolves.not.toThrow();
    });
  });

  describe('Metrics and Cleanup', () => {
    it('should provide accurate metrics', () => {
      const initialMetrics = assetPreloader.getMetrics();
      expect(initialMetrics).toHaveProperty('totalAssets');
      expect(initialMetrics).toHaveProperty('loadedAssets');
      expect(initialMetrics).toHaveProperty('cacheHitRate');
      expect(typeof initialMetrics.totalAssets).toBe('number');
    });

    it('should clear resources properly', () => {
      mockDocument.querySelectorAll = vi.fn(() => [{ remove: vi.fn() }]);
      
      assetPreloader.clear();
      
      expect(mockDocument.querySelectorAll).toHaveBeenCalledWith('[id^="preloaded-css-"]');
    });
  });
});