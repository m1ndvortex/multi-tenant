/**
 * Environment-aware cache configuration
 * Provides different caching strategies for development vs production
 */

import React from 'react';

interface CacheConfiguration {
  defaultTTL: number;
  maxCacheSize: number;
  enableServiceWorker: boolean;
  enableIndexedDB: boolean;
  enableLocalStorage: boolean;
  compressionEnabled: boolean;
  backgroundOptimization: boolean;
  retryConfig: {
    retries: number;
    retryDelay: number;
  };
  websocket: {
    enabled: boolean;
    reconnectAttempts: number;
    pingInterval: number;
  };
}

interface EnvironmentConfig {
  development: CacheConfiguration;
  production: CacheConfiguration;
  test: CacheConfiguration;
}

const environmentConfig: EnvironmentConfig = {
  development: {
    defaultTTL: 5000, // 5 seconds for quick development feedback
    maxCacheSize: 50, // Smaller cache for development
    enableServiceWorker: false, // Disable SW in development for easier debugging
    enableIndexedDB: false, // Disable complex storage in dev
    enableLocalStorage: true,
    compressionEnabled: false, // No compression for easier debugging
    backgroundOptimization: false,
    retryConfig: {
      retries: 1,
      retryDelay: 500,
    },
    websocket: {
      enabled: true,
      reconnectAttempts: 3,
      pingInterval: 10000, // 10 seconds
    },
  },
  production: {
    defaultTTL: 300000, // 5 minutes for production
    maxCacheSize: 200, // Larger cache for production
    enableServiceWorker: true,
    enableIndexedDB: true,
    enableLocalStorage: true,
    compressionEnabled: true,
    backgroundOptimization: true,
    retryConfig: {
      retries: 3,
      retryDelay: 1000,
    },
    websocket: {
      enabled: true,
      reconnectAttempts: 10,
      pingInterval: 25000, // 25 seconds
    },
  },
  test: {
    defaultTTL: 1000, // 1 second for tests
    maxCacheSize: 10,
    enableServiceWorker: false,
    enableIndexedDB: false,
    enableLocalStorage: false, // Don't persist in tests
    compressionEnabled: false,
    backgroundOptimization: false,
    retryConfig: {
      retries: 0,
      retryDelay: 0,
    },
    websocket: {
      enabled: false, // No real-time in tests
      reconnectAttempts: 0,
      pingInterval: 1000,
    },
  },
};

/**
 * Get cache configuration based on current environment
 */
export function getCacheConfig(): CacheConfiguration {
  const env = getEnvironment();
  return environmentConfig[env];
}

/**
 * Get current environment
 */
function getEnvironment(): keyof EnvironmentConfig {
  // Check for test environment first
  if (typeof window !== 'undefined' && (window as any).__TEST__) {
    return 'test';
  }
  
  // Check Vite environment
  if (import.meta.env.DEV) {
    return 'development';
  }
  
  if (import.meta.env.PROD) {
    return 'production';
  }
  
  // Fallback based on NODE_ENV
  const nodeEnv = import.meta.env.NODE_ENV || 'development';
  
  if (nodeEnv === 'test') {
    return 'test';
  }
  
  if (nodeEnv === 'production') {
    return 'production';
  }
  
  return 'development';
}

/**
 * Create cache key with environment prefix
 */
export function createCacheKey(key: string, params?: Record<string, any>): string {
  const env = getEnvironment();
  const paramString = params ? `_${JSON.stringify(params)}` : '';
  const buildTimestamp = import.meta.env.__BUILD_TIMESTAMP__ || Date.now();
  
  return `${env}_${key}${paramString}_${buildTimestamp}`;
}

/**
 * Check if current environment supports a feature
 */
export function supportsFeature(feature: keyof CacheConfiguration): boolean {
  const config = getCacheConfig();
  return Boolean(config[feature]);
}

/**
 * Get TTL for specific cache type with environment adjustment
 */
export function getTTL(cacheType: 'api' | 'theme' | 'user' | 'system' = 'api'): number {
  const config = getCacheConfig();
  const baseTTL = config.defaultTTL;
  
  // Adjust TTL based on cache type
  const multipliers = {
    api: 1,
    theme: 10, // Themes can be cached longer
    user: 0.5, // User data changes more frequently
    system: 5, // System data is relatively stable
  };
  
  return baseTTL * multipliers[cacheType];
}

/**
 * Storage manager that respects environment configuration
 */
export class EnvironmentAwareStorage {
  private config: CacheConfiguration;
  
  constructor() {
    this.config = getCacheConfig();
  }
  
  setItem(key: string, value: any, options?: { ttl?: number; compress?: boolean }): boolean {
    try {
      if (!this.config.enableLocalStorage) {
        return false;
      }
      
      const ttl = options?.ttl || this.config.defaultTTL;
      const shouldCompress = options?.compress && this.config.compressionEnabled;
      
      const cacheKey = createCacheKey(key);
      const cacheEntry = {
        data: value,
        timestamp: Date.now(),
        ttl,
        compressed: shouldCompress,
      };
      
      let serializedData = JSON.stringify(cacheEntry);
      
      if (shouldCompress && serializedData.length > 1024) {
        // Simple compression simulation (in real app, use proper compression)
        serializedData = this.compress(serializedData);
        cacheEntry.compressed = true;
      }
      
      localStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
      return true;
    } catch (error) {
      console.warn('Failed to store item:', error);
      return false;
    }
  }
  
  getItem<T>(key: string): T | null {
    try {
      if (!this.config.enableLocalStorage) {
        return null;
      }
      
      const cacheKey = createCacheKey(key);
      const stored = localStorage.getItem(cacheKey);
      
      if (!stored) {
        return null;
      }
      
      const cacheEntry = JSON.parse(stored);
      
      // Check if expired
      if (Date.now() - cacheEntry.timestamp > cacheEntry.ttl) {
        localStorage.removeItem(cacheKey);
        return null;
      }
      
      let data = cacheEntry.data;
      
      if (cacheEntry.compressed) {
        data = this.decompress(data);
      }
      
      return data;
    } catch (error) {
      console.warn('Failed to retrieve item:', error);
      return null;
    }
  }
  
  removeItem(key: string): void {
    try {
      const cacheKey = createCacheKey(key);
      localStorage.removeItem(cacheKey);
    } catch (error) {
      console.warn('Failed to remove item:', error);
    }
  }
  
  clear(): void {
    try {
      const env = getEnvironment();
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`${env}_`)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Failed to clear storage:', error);
    }
  }
  
  private compress(data: string): string {
    // Simple compression simulation
    // In a real app, use a proper compression library
    return btoa(data);
  }
  
  private decompress(data: string): string {
    // Simple decompression simulation
    try {
      return atob(data);
    } catch {
      return data; // Return as-is if decompression fails
    }
  }
  
  getStats(): { totalItems: number; totalSize: number; environment: string } {
    const env = getEnvironment();
    let totalItems = 0;
    let totalSize = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${env}_`)) {
        totalItems++;
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }
    }
    
    return {
      totalItems,
      totalSize,
      environment: env,
    };
  }
}

// Export singleton instance
export const environmentStorage = new EnvironmentAwareStorage();

// React hook for environment-aware caching
export function useEnvironmentCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: { ttl?: number; enabled?: boolean }
) {
  const config = getCacheConfig();
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  
  const enabled = options?.enabled !== false;
  const ttl = options?.ttl || config.defaultTTL;
  
  React.useEffect(() => {
    if (!enabled) return;
    
    const fetchData = async () => {
      try {
        // Try to get from cache first
        const cached = environmentStorage.getItem<T>(key);
        if (cached) {
          setData(cached);
          return;
        }
        
        // Fetch fresh data
        setLoading(true);
        setError(null);
        const result = await fetcher();
        
        // Store in cache
        environmentStorage.setItem(key, result, { ttl });
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [key, enabled, ttl, fetcher]);
  
  const refetch = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      environmentStorage.removeItem(key); // Clear cache
      const result = await fetcher();
      environmentStorage.setItem(key, result, { ttl });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [key, fetcher, ttl]);
  
  return { data, loading, error, refetch };
}

export default {
  getCacheConfig,
  createCacheKey,
  supportsFeature,
  getTTL,
  environmentStorage,
};