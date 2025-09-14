# Multi-Level Theme Caching System

## Overview

The Multi-Level Theme Caching System provides intelligent caching for cybersecurity theme configurations and CSS generation with memory cache, localStorage, IndexedDB, and service worker integration. This system achieves <50ms theme load times with >95% cache hit rates while maintaining <5MB memory footprint.

## Architecture

### Cache Levels

1. **Memory Cache (LRU)** - Fastest access, limited capacity
2. **localStorage** - Browser storage with 5MB quota management
3. **IndexedDB** - Structured storage for large datasets
4. **Service Worker** - Offline support and background optimization

### Performance Targets

- **Theme Load Time**: <50ms on subsequent visits
- **Cache Hit Rate**: >95% for theme operations
- **Memory Efficiency**: <5MB cache footprint
- **Storage Management**: Automatic cleanup when quotas approached

## Usage

### Basic Usage

```typescript
import { CacheManager } from '@/lib/theme/cache';
import { cyberTheme, ltrConfig } from '@/lib/theme/cybersecurity';

// Get optimized theme with caching
const theme = await CacheManager.getOptimizedTheme(cyberTheme, ltrConfig);

// Get performance metrics
const metrics = CacheManager.getPerformanceMetrics();
console.log(`Hit rate: ${metrics.cache.hitRate}%`);

// Get cache health status
const health = CacheManager.getCacheHealth();
if (!health.healthy) {
  console.log('Recommendations:', health.recommendations);
}
```

### Advanced Usage

```typescript
// Preload common themes
await CacheManager.preloadThemes();

// Clear all caches
await CacheManager.clearAllCaches();

// Invalidate specific theme
await CacheManager.invalidateTheme(cyberTheme, ltrConfig);

// Optimize for production
const optimized = CacheManager.optimizeForProduction(cyberTheme, {
  minify: true,
  extractCritical: true,
  criticalSelectors: ['.cyber-', '.glass-', '.neon-']
});
```

### Service Worker Integration

```typescript
import { serviceWorkerManager, useServiceWorkerCache } from '@/lib/theme/service-worker';

// In React component
function ThemeManager() {
  const { isActive, cacheStats, clearCache, preloadThemes } = useServiceWorkerCache();
  
  return (
    <div>
      <p>Service Worker: {isActive ? 'Active' : 'Inactive'}</p>
      {cacheStats && (
        <p>Cache entries: {cacheStats.themeEntries}</p>
      )}
      <button onClick={clearCache}>Clear Cache</button>
    </div>
  );
}
```

## Components

### LRU Cache

Implements Least Recently Used eviction policy for memory management:

```typescript
class LRUCache {
  constructor(capacity: number);
  get(key: string): ThemeCacheEntry | null;
  put(key: string, value: ThemeCacheEntry): void;
  clear(): void;
  size(): number;
}
```

### LocalStorage Manager

Manages browser localStorage with quota monitoring:

```typescript
class LocalStorageManager {
  get(hash: string): ThemeCacheEntry | null;
  put(entry: ThemeCacheEntry): boolean;
  clear(): void;
  getQuota(): CacheStorageQuota;
}
```

### IndexedDB Storage

Structured storage for large theme datasets:

```typescript
class IndexedDBStorage {
  async init(): Promise<void>;
  async get(hash: string): Promise<ThemeCacheEntry | null>;
  async put(entry: ThemeCacheEntry): Promise<void>;
  async clear(): Promise<void>;
  async cleanup(maxAge?: number): Promise<void>;
}
```

### Multi-Level Cache

Main cache coordinator:

```typescript
class MultiLevelThemeCache {
  async getCachedTheme(theme: CyberTheme, rtlConfig: RTLConfiguration): Promise<ThemeCacheEntry>;
  async preloadThemes(): Promise<void>;
  getMetrics(): ThemePerformanceMetrics;
  getStats(): CacheStats;
  async clear(): Promise<void>;
  async invalidateTheme(theme: CyberTheme, rtlConfig: RTLConfiguration): Promise<void>;
}
```

## Performance Monitoring

### Metrics Tracked

- Cache hit/miss ratios
- CSS generation time
- Memory usage
- Average load time
- Compression ratios
- Storage quota usage

### Performance Decorator

```typescript
class ThemeService {
  @measureThemePerformance('theme-generation')
  generateTheme(config: ThemeConfig) {
    // Theme generation logic
  }
}
```

### Real-time Monitoring

```typescript
// Get comprehensive metrics
const metrics = CacheManager.getPerformanceMetrics();

// Monitor cache health
const health = CacheManager.getCacheHealth();
if (!health.healthy) {
  // Handle performance issues
  health.recommendations.forEach(rec => console.log(rec));
}
```

## CSS Optimization

### Compression

```typescript
import { CSSOptimizer } from '@/lib/theme/cache';

// Minify CSS
const minified = CSSOptimizer.minifyCSS(css);

// Extract critical CSS
const critical = CSSOptimizer.extractCriticalCSS(css, ['.cyber-', '.glass-']);

// Generate optimized CSS
const optimized = CSSOptimizer.generateOptimizedCSS(theme, {
  minify: true,
  extractCritical: true,
  criticalSelectors: ['.cyber-', '.glass-', '.neon-']
});
```

### Compression Features

- Comment removal
- Whitespace collapse
- Unnecessary semicolon removal
- Property optimization
- Critical CSS extraction

## Cache Invalidation

### Automatic Invalidation

- Version-based invalidation
- Dependency tracking
- Timestamp-based expiration
- Hash-based change detection

### Manual Invalidation

```typescript
// Invalidate specific theme
await CacheManager.invalidateTheme(theme, rtlConfig);

// Clear all caches
await CacheManager.clearAllCaches();

// Clear via service worker
await serviceWorkerManager.clearThemeCache();
```

## Memory Management

### Automatic Cleanup

- LRU eviction policy
- Memory pressure detection
- Background garbage collection
- Storage quota monitoring

### Memory Limits

- Memory cache: 50 entries max
- localStorage: 5MB quota
- IndexedDB: Browser-dependent
- Total memory: <5MB target

## Background Optimization

### Service Worker Features

- Offline theme support
- Background cache warming
- Automatic compression
- Cache statistics collection

### Background Tasks

```typescript
// Trigger background optimization
await serviceWorkerManager.triggerBackgroundSync();

// Get cache statistics
const stats = await serviceWorkerManager.getCacheStats();
```

## Error Handling

### Graceful Degradation

- IndexedDB unavailable → localStorage fallback
- localStorage full → memory-only caching
- Service worker failed → direct caching
- Network offline → cached themes only

### Error Recovery

```typescript
try {
  const theme = await CacheManager.getOptimizedTheme(cyberTheme, ltrConfig);
} catch (error) {
  // Fallback to default theme
  const fallbackTheme = getDefaultTheme();
}
```

## Testing

### Unit Tests

```bash
npm test src/lib/theme/__tests__/cache.test.ts
```

### Test Coverage

- Memory cache operations
- localStorage integration
- IndexedDB functionality
- CSS compression
- Performance monitoring
- Error handling
- Cross-browser compatibility

### Performance Tests

- Cache hit/miss ratios
- Load time measurements
- Memory usage tracking
- Compression effectiveness
- Concurrent access handling

## Configuration

### Cache Settings

```typescript
const cacheConfig = {
  maxMemorySize: 50,        // Max entries in memory
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  compressionEnabled: true,
  backgroundOptimization: true,
  serviceWorkerEnabled: true,
};
```

### Performance Thresholds

```typescript
const performanceTargets = {
  maxLoadTime: 50,          // milliseconds
  minHitRate: 95,           // percentage
  maxMemoryUsage: 5 * 1024 * 1024, // 5MB
  maxStorageQuota: 80,      // percentage
};
```

## Monitoring and Debugging

### Development Tools

```typescript
// Enable performance monitoring in development
if (process.env.NODE_ENV === 'development') {
  const stats = CacheManager.getPerformanceMetrics();
  console.table(stats);
}
```

### Production Monitoring

```typescript
// Monitor cache health in production
setInterval(() => {
  const health = CacheManager.getCacheHealth();
  if (!health.healthy) {
    // Send metrics to monitoring service
    analytics.track('cache_performance_issue', health);
  }
}, 60000); // Every minute
```

## Best Practices

### Theme Design

1. Keep theme configurations small
2. Use consistent naming conventions
3. Minimize dynamic theme generation
4. Preload common theme variations

### Performance

1. Monitor cache hit rates regularly
2. Use compression for large themes
3. Implement proper error handling
4. Test across different browsers

### Memory Management

1. Clear caches when not needed
2. Monitor memory usage in production
3. Use background optimization
4. Implement proper cleanup

### Security

1. Validate cached theme data
2. Implement proper CSP headers
3. Use secure storage methods
4. Monitor for cache poisoning

## Troubleshooting

### Common Issues

1. **Low hit rate**: Increase cache size or preload themes
2. **High memory usage**: Enable compression or reduce cache size
3. **Slow load times**: Check network conditions or cache corruption
4. **Storage quota exceeded**: Enable automatic cleanup

### Debug Commands

```typescript
// Get detailed cache statistics
console.log(CacheManager.getPerformanceMetrics());

// Check cache health
console.log(CacheManager.getCacheHealth());

// Monitor service worker
console.log(await serviceWorkerManager.getCacheStats());
```

## Migration Guide

### From Basic Caching

```typescript
// Old way
const theme = themeCache.getCachedTheme(cyberTheme, ltrConfig);

// New way
const theme = await CacheManager.getOptimizedTheme(cyberTheme, ltrConfig);
```

### Legacy Compatibility

The system maintains backward compatibility with the old `ThemeOptimization` API:

```typescript
// Still works
const theme = ThemeOptimization.getOptimizedTheme(cyberTheme, ltrConfig);
```

## Future Enhancements

### Planned Features

1. Predictive preloading based on user behavior
2. Advanced compression algorithms
3. Cross-tab cache synchronization
4. Machine learning-based optimization
5. Real-time performance analytics

### Experimental Features

1. WebAssembly-based compression
2. Shared worker for cross-tab caching
3. Progressive theme loading
4. Dynamic cache sizing based on device capabilities