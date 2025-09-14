/**
 * Service Worker Manager for Tenant Frontend
 * Handles service worker registration, cache management, and integration with WebSocket
 */

import React from 'react';
import { webSocketManager } from './webSocketManager';

interface CacheStats {
  totalSize: number;
  totalEntries: number;
  cacheNames: string[];
  lastUpdated: string;
  isOnline: boolean;
}

interface ServiceWorkerStatus {
  isSupported: boolean;
  isRegistered: boolean;
  registration: ServiceWorkerRegistration | null;
  cacheStats: CacheStats | null;
}

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private statusCallbacks = new Set<(status: ServiceWorkerStatus) => void>();
  private cacheStats: CacheStats | null = null;
  private updateCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    if (!this.isServiceWorkerSupported()) {
      console.warn('Service Worker not supported');
      this.notifyStatusChange();
      return;
    }

    try {
      await this.register();
      this.setupMessageHandling();
      this.setupCacheInvalidationListener();
      this.startUpdateCheck();
      await this.updateCacheStats();
    } catch (error) {
      console.error('Service Worker initialization failed:', error);
    }
  }

  private isServiceWorkerSupported(): boolean {
    return 'serviceWorker' in navigator;
  }

  private async register(): Promise<void> {
    try {
      console.log('Registering service worker...');
      
      this.registration = await navigator.serviceWorker.register(
        '/sw-realtime-cache.js',
        {
          scope: '/',
          updateViaCache: 'none' // Always check for updates
        }
      );

      console.log('Service Worker registered:', this.registration);

      // Handle updates
      this.registration.addEventListener('updatefound', () => {
        console.log('Service Worker update found');
        this.handleUpdate();
      });

      // Check if there's a waiting service worker
      if (this.registration.waiting) {
        this.handleUpdate();
      }

      this.notifyStatusChange();

    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  }

  private setupMessageHandling(): void {
    if (!navigator.serviceWorker) return;

    navigator.serviceWorker.addEventListener('message', (event) => {
      const { type, payload } = event.data;

      switch (type) {
        case 'CACHE_INVALIDATED':
          console.log('Cache invalidated by service worker:', payload);
          this.updateCacheStats();
          break;

        case 'OFFLINE_SYNC_COMPLETE':
          console.log('Offline sync completed:', payload);
          this.updateCacheStats();
          break;

        default:
          console.log('Unknown service worker message:', type, payload);
      }
    });
  }

  private setupCacheInvalidationListener(): void {
    // Listen for cache invalidation from WebSocket
    webSocketManager.onCacheInvalidation((cacheKey, data) => {
      console.log('Forwarding cache invalidation to service worker:', cacheKey);
      this.sendMessage('CACHE_INVALIDATION', {
        cacheKey,
        tenantId: webSocketManager.getTenantInfo().tenantId,
        updateType: data?.updateType || 'unknown'
      });
    });
  }

  private handleUpdate(): void {
    if (!this.registration?.waiting) return;

    console.log('Service Worker update available');

    // Automatically update in development
    if (import.meta.env.DEV) {
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
      return;
    }

    // In production, notify user about update
    const shouldUpdate = confirm(
      'A new version of the app is available. Would you like to update now?'
    );

    if (shouldUpdate) {
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }

  private startUpdateCheck(): void {
    // Check for updates every 10 minutes in production
    if (import.meta.env.PROD && this.registration) {
      this.updateCheckInterval = setInterval(() => {
        this.registration?.update();
      }, 10 * 60 * 1000);
    }
  }

  private async updateCacheStats(): Promise<void> {
    try {
      const stats = await this.getCacheStats();
      this.cacheStats = stats;
      this.notifyStatusChange();
    } catch (error) {
      console.error('Failed to get cache stats:', error);
    }
  }

  private notifyStatusChange(): void {
    const status: ServiceWorkerStatus = {
      isSupported: this.isServiceWorkerSupported(),
      isRegistered: !!this.registration,
      registration: this.registration,
      cacheStats: this.cacheStats
    };

    this.statusCallbacks.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('Status callback error:', error);
      }
    });
  }

  // Public API
  public sendMessage(type: string, payload?: any): void {
    if (!navigator.serviceWorker.controller) {
      console.warn('No active service worker to send message to');
      return;
    }

    navigator.serviceWorker.controller.postMessage({
      type,
      payload
    });
  }

  public async getCacheStats(): Promise<CacheStats> {
    return new Promise((resolve, reject) => {
      if (!navigator.serviceWorker.controller) {
        reject(new Error('No active service worker'));
        return;
      }

      const channel = new MessageChannel();
      
      channel.port1.onmessage = (event) => {
        resolve(event.data);
      };

      navigator.serviceWorker.controller.postMessage(
        { type: 'GET_CACHE_STATS' },
        [channel.port2]
      );

      // Timeout after 5 seconds
      setTimeout(() => {
        reject(new Error('Cache stats request timeout'));
      }, 5000);
    });
  }

  public clearCache(cacheKey?: string): void {
    if (cacheKey) {
      this.sendMessage('CLEAR_CACHE', { cacheKey });
    } else {
      this.sendMessage('CLEAR_ALL_CACHE');
    }
    
    // Update stats after clearing
    setTimeout(() => this.updateCacheStats(), 1000);
  }

  public syncOfflineData(): void {
    this.sendMessage('SYNC_OFFLINE_DATA');
  }

  public onStatusChange(callback: (status: ServiceWorkerStatus) => void): () => void {
    this.statusCallbacks.add(callback);
    
    // Immediately call with current status
    callback({
      isSupported: this.isServiceWorkerSupported(),
      isRegistered: !!this.registration,
      registration: this.registration,
      cacheStats: this.cacheStats
    });

    return () => this.statusCallbacks.delete(callback);
  }

  public getStatus(): ServiceWorkerStatus {
    return {
      isSupported: this.isServiceWorkerSupported(),
      isRegistered: !!this.registration,
      registration: this.registration,
      cacheStats: this.cacheStats
    };
  }

  public async unregister(): Promise<boolean> {
    if (this.registration) {
      const result = await this.registration.unregister();
      if (result) {
        this.registration = null;
        this.notifyStatusChange();
      }
      return result;
    }
    return false;
  }

  public destroy(): void {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
      this.updateCheckInterval = null;
    }
    this.statusCallbacks.clear();
  }
}

// Export singleton instance
export const serviceWorkerManager = new ServiceWorkerManager();

// React hook for service worker status
export const useServiceWorker = () => {
  const [status, setStatus] = React.useState<ServiceWorkerStatus>(
    serviceWorkerManager.getStatus()
  );

  React.useEffect(() => {
    const unsubscribe = serviceWorkerManager.onStatusChange(setStatus);
    return unsubscribe;
  }, []);

  return {
    ...status,
    clearCache: serviceWorkerManager.clearCache.bind(serviceWorkerManager),
    syncOfflineData: serviceWorkerManager.syncOfflineData.bind(serviceWorkerManager),
    getCacheStats: serviceWorkerManager.getCacheStats.bind(serviceWorkerManager),
    sendMessage: serviceWorkerManager.sendMessage.bind(serviceWorkerManager)
  };
};

// React hook for cache management
export const useCacheManagement = () => {
  const serviceWorker = useServiceWorker();
  const [isClearing, setIsClearing] = React.useState(false);

  const clearCacheWithStatus = React.useCallback(async (cacheKey?: string) => {
    setIsClearing(true);
    try {
      serviceWorker.clearCache(cacheKey);
      
      // Also clear React Query cache
      window.dispatchEvent(new CustomEvent('cache-invalidation', {
        detail: { cacheKey: cacheKey || 'all' }
      }));
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    } finally {
      setIsClearing(false);
    }
  }, [serviceWorker]);

  return {
    clearCache: clearCacheWithStatus,
    isClearing,
    cacheStats: serviceWorker.cacheStats,
    isOnline: navigator.onLine
  };
};

export default serviceWorkerManager;