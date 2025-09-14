/**
 * Environment-aware cache configuration for tenant frontend
 * Provides different caching strategies for development vs production
 */

import React from 'react';

// Environment detection
export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;

// Cache configuration interface
export interface CacheConfig {
  defaultTTL: number;
  maxEntries: number;
  enableServiceWorker: boolean;
  enableIndexedDB: boolean;
  invalidationStrategy: 'aggressive' | 'conservative' | 'smart';
  compressionEnabled: boolean;
  persistentStorage: boolean;
}

// Environment-specific cache configurations
const developmentConfig: CacheConfig = {
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxEntries: 100,
  enableServiceWorker: false, // Disabled in dev for faster updates
  enableIndexedDB: false,
  invalidationStrategy: 'aggressive',
  compressionEnabled: false,
  persistentStorage: false
};

const productionConfig: CacheConfig = {
  defaultTTL: 30 * 60 * 1000, // 30 minutes
  maxEntries: 1000,
  enableServiceWorker: true,
  enableIndexedDB: true,
  invalidationStrategy: 'smart',
  compressionEnabled: true,
  persistentStorage: true
};

// Get current environment configuration
export const getCacheConfig = (): CacheConfig => {
  return isDevelopment ? developmentConfig : productionConfig;
};

// Cache key generator with tenant isolation
export const generateCacheKey = (
  key: string, 
  tenantId?: string, 
  userId?: string,
  params?: Record<string, any>
): string => {
  const tenant = tenantId || localStorage.getItem('tenant_id') || 'default';
  const user = userId || localStorage.getItem('user_id') || 'anonymous';
  
  let cacheKey = `tenant:${tenant}:user:${user}:${key}`;
  
  if (params && Object.keys(params).length > 0) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(k => `${k}=${JSON.stringify(params[k])}`)
      .join('&');
    cacheKey += `:${btoa(sortedParams)}`;
  }
  
  return cacheKey;
};

// Storage abstraction with environment awareness
export class EnvironmentAwareStorage {
  private config: CacheConfig;
  private prefix: string;

  constructor(prefix = 'tenant-cache') {
    this.config = getCacheConfig();
    this.prefix = prefix;
  }

  // Set item with TTL
  setItem(key: string, value: any, ttl?: number): void {
    const config = this.config;
    const actualTTL = ttl || config.defaultTTL;
    const expiryTime = Date.now() + actualTTL;
    
    const cacheItem = {
      value: config.compressionEnabled ? this.compress(value) : value,
      expiry: expiryTime,
      compressed: config.compressionEnabled
    };

    const fullKey = `${this.prefix}:${key}`;
    
    try {
      if (config.persistentStorage) {
        localStorage.setItem(fullKey, JSON.stringify(cacheItem));
      } else {
        sessionStorage.setItem(fullKey, JSON.stringify(cacheItem));
      }
      
      // Also store in IndexedDB for larger items in production
      if (config.enableIndexedDB && isProduction) {
        this.setIndexedDBItem(fullKey, cacheItem);
      }
    } catch (error) {
      console.warn('Failed to store cache item:', error);
    }
  }

  // Get item with expiry check
  getItem(key: string): any {
    const fullKey = `${this.prefix}:${key}`;
    const config = this.config;
    
    try {
      // Try localStorage/sessionStorage first
      const storage = config.persistentStorage ? localStorage : sessionStorage;
      const cached = storage.getItem(fullKey);
      
      if (cached) {
        const cacheItem = JSON.parse(cached);
        
        // Check expiry
        if (Date.now() > cacheItem.expiry) {
          this.removeItem(key);
          return null;
        }
        
        // Decompress if needed
        return cacheItem.compressed ? 
          this.decompress(cacheItem.value) : 
          cacheItem.value;
      }
      
      // Fallback to IndexedDB in production
      if (config.enableIndexedDB && isProduction) {
        return this.getIndexedDBItem(fullKey);
      }
      
      return null;
    } catch (error) {
      console.warn('Failed to get cache item:', error);
      return null;
    }
  }

  // Remove item
  removeItem(key: string): void {
    const fullKey = `${this.prefix}:${key}`;
    const config = this.config;
    
    try {
      if (config.persistentStorage) {
        localStorage.removeItem(fullKey);
      } else {
        sessionStorage.removeItem(fullKey);
      }
      
      if (config.enableIndexedDB && isProduction) {
        this.removeIndexedDBItem(fullKey);
      }
    } catch (error) {
      console.warn('Failed to remove cache item:', error);
    }
  }

  // Clear all items with prefix
  clear(): void {
    const config = this.config;
    const storage = config.persistentStorage ? localStorage : sessionStorage;
    
    // Clear localStorage/sessionStorage
    const keysToRemove: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => storage.removeItem(key));
    
    // Clear IndexedDB
    if (config.enableIndexedDB && isProduction) {
      this.clearIndexedDB();
    }
  }

  // Simple compression for production
  private compress(data: any): string {
    try {
      const json = JSON.stringify(data);
      // Simple run-length encoding for JSON
      return json.replace(/(.)\1+/g, (match, char) => `${char}${match.length}`);
    } catch (error) {
      return JSON.stringify(data);
    }
  }

  private decompress(compressed: string): any {
    try {
      // Reverse run-length encoding
      const json = compressed.replace(/(.)\d+/g, (match, char) => {
        const count = parseInt(match.slice(1));
        return char.repeat(count);
      });
      return JSON.parse(json);
    } catch (error) {
      return JSON.parse(compressed);
    }
  }

  // IndexedDB operations for production
  private async setIndexedDBItem(key: string, value: any): Promise<void> {
    try {
      const request = indexedDB.open('TenantCache', 1);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' });
        }
      };
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        store.put({ key, ...value });
      };
    } catch (error) {
      console.warn('IndexedDB storage failed:', error);
    }
  }

  private async getIndexedDBItem(key: string): Promise<any> {
    return new Promise((resolve) => {
      try {
        const request = indexedDB.open('TenantCache', 1);
        
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(['cache'], 'readonly');
          const store = transaction.objectStore('cache');
          const getRequest = store.get(key);
          
          getRequest.onsuccess = () => {
            const result = getRequest.result;
            if (result && Date.now() <= result.expiry) {
              resolve(result.compressed ? 
                this.decompress(result.value) : 
                result.value);
            } else {
              resolve(null);
            }
          };
          
          getRequest.onerror = () => resolve(null);
        };
        
        request.onerror = () => resolve(null);
      } catch (error) {
        resolve(null);
      }
    });
  }

  private async removeIndexedDBItem(key: string): Promise<void> {
    try {
      const request = indexedDB.open('TenantCache', 1);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        store.delete(key);
      };
    } catch (error) {
      console.warn('IndexedDB removal failed:', error);
    }
  }

  private async clearIndexedDB(): Promise<void> {
    try {
      const request = indexedDB.open('TenantCache', 1);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        store.clear();
      };
    } catch (error) {
      console.warn('IndexedDB clear failed:', error);
    }
  }
}

// React hook for environment-aware caching
export const useEnvironmentCache = (prefix?: string) => {
  const storage = React.useMemo(() => new EnvironmentAwareStorage(prefix), [prefix]);
  const config = React.useMemo(() => getCacheConfig(), []);

  return {
    storage,
    config,
    isDevelopment,
    isProduction,
    generateCacheKey
  };
};

// React hook for cache statistics
export const useCacheStats = () => {
  const [stats, setStats] = React.useState({
    totalItems: 0,
    totalSize: 0,
    hitRate: 0,
    environment: isDevelopment ? 'development' : 'production'
  });

  React.useEffect(() => {
    const calculateStats = () => {
      const config = getCacheConfig();
      const storage = config.persistentStorage ? localStorage : sessionStorage;
      
      let totalItems = 0;
      let totalSize = 0;
      
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && key.startsWith('tenant-cache:')) {
          totalItems++;
          const value = storage.getItem(key);
          if (value) {
            totalSize += value.length;
          }
        }
      }
      
      setStats(prev => ({
        ...prev,
        totalItems,
        totalSize,
        hitRate: Math.random() * 100 // Simplified for demo
      }));
    };

    calculateStats();
    const interval = setInterval(calculateStats, 30000); // Update every 30s
    
    return () => clearInterval(interval);
  }, []);

  return stats;
};

export default {
  getCacheConfig,
  generateCacheKey,
  EnvironmentAwareStorage,
  useEnvironmentCache,
  useCacheStats
};