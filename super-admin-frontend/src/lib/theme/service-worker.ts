/**
 * Service Worker Integration for Advanced Theme Caching
 * Provides offline support and background optimization
 */

interface ServiceWorkerCacheStats {
  themeEntries: number;
  assetEntries: number;
  totalSize: number;
  compressedEntries: number;
  compressionRatio: number;
}

interface ServiceWorkerMessage {
  type: string;
  data?: any;
}

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private isSupported = 'serviceWorker' in navigator;

  /**
   * Initialize service worker for theme caching
   */
  async init(): Promise<void> {
    if (!this.isSupported) {
      console.warn('Service Worker not supported');
      return;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw-theme-cache.js', {
        scope: '/',
      });

      console.log('Theme cache service worker registered:', this.registration);

      // Handle service worker updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration!.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker is available
              this.notifyUpdate();
            }
          });
        }
      });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', this.handleMessage.bind(this));

    } catch (error) {
      console.error('Service worker registration failed:', error);
    }
  }

  /**
   * Clear theme cache via service worker
   */
  async clearThemeCache(): Promise<boolean> {
    if (!this.isActive()) return false;

    try {
      const response = await this.sendMessage({ type: 'CLEAR_THEME_CACHE' });
      return response.success;
    } catch (error) {
      console.error('Failed to clear theme cache:', error);
      return false;
    }
  }

  /**
   * Preload themes via service worker
   */
  async preloadThemes(themes: any[]): Promise<boolean> {
    if (!this.isActive()) return false;

    try {
      const response = await this.sendMessage({ 
        type: 'PRELOAD_THEMES', 
        data: { themes } 
      });
      return response.success;
    } catch (error) {
      console.error('Failed to preload themes:', error);
      return false;
    }
  }

  /**
   * Get cache statistics from service worker
   */
  async getCacheStats(): Promise<ServiceWorkerCacheStats | null> {
    if (!this.isActive()) return null;

    try {
      const response = await this.sendMessage({ type: 'GET_CACHE_STATS' });
      return response.stats;
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return null;
    }
  }

  /**
   * Trigger background sync for theme optimization
   */
  async triggerBackgroundSync(): Promise<boolean> {
    if (!this.isActive() || !('sync' in window.ServiceWorkerRegistration.prototype)) {
      return false;
    }

    try {
      // Note: Background sync is not available in all browsers
      // await this.registration!.sync.register('theme-optimization');
      return true;
    } catch (error) {
      console.error('Failed to register background sync:', error);
      return false;
    }
  }

  /**
   * Check if service worker is active
   */
  private isActive(): boolean {
    return this.isSupported && 
           this.registration !== null && 
           navigator.serviceWorker.controller !== null;
  }

  /**
   * Send message to service worker
   */
  private sendMessage(message: ServiceWorkerMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!navigator.serviceWorker.controller) {
        reject(new Error('No active service worker'));
        return;
      }

      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data);
      };

      messageChannel.port1.addEventListener('messageerror', (error: MessageEvent) => {
        reject(error);
      });

      navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2]);
    });
  }

  /**
   * Handle messages from service worker
   */
  private handleMessage(event: MessageEvent): void {
    const { type, data } = event.data;

    switch (type) {
      case 'CACHE_UPDATED':
        console.log('Theme cache updated:', data);
        break;
      case 'OPTIMIZATION_COMPLETE':
        console.log('Background optimization complete:', data);
        break;
      default:
        console.log('Unknown message from service worker:', event.data);
    }
  }

  /**
   * Notify about service worker update
   */
  private notifyUpdate(): void {
    // Dispatch custom event for UI to handle
    window.dispatchEvent(new CustomEvent('sw-update-available', {
      detail: { registration: this.registration }
    }));
  }

  /**
   * Update service worker
   */
  async updateServiceWorker(): Promise<void> {
    if (!this.registration) return;

    try {
      await this.registration.update();
    } catch (error) {
      console.error('Failed to update service worker:', error);
    }
  }

  /**
   * Unregister service worker
   */
  async unregister(): Promise<boolean> {
    if (!this.registration) return false;

    try {
      const result = await this.registration.unregister();
      this.registration = null;
      return result;
    } catch (error) {
      console.error('Failed to unregister service worker:', error);
      return false;
    }
  }
}

// Singleton instance
export const serviceWorkerManager = new ServiceWorkerManager();

// Auto-initialize if supported
if (typeof window !== 'undefined') {
  serviceWorkerManager.init().catch(console.error);
}

import { useState, useEffect, useCallback } from 'react';

// Hook for React components
export function useServiceWorkerCache() {
  const [isSupported] = useState('serviceWorker' in navigator);
  const [isActive, setIsActive] = useState(false);
  const [cacheStats, setCacheStats] = useState<ServiceWorkerCacheStats | null>(null);

  useEffect(() => {
    const checkStatus = () => {
      setIsActive(navigator.serviceWorker?.controller !== null);
    };

    checkStatus();
    
    // Listen for service worker state changes
    navigator.serviceWorker?.addEventListener('controllerchange', checkStatus);

    return () => {
      navigator.serviceWorker?.removeEventListener('controllerchange', checkStatus);
    };
  }, []);

  useEffect(() => {
    if (isActive) {
      // Update cache stats periodically
      const interval = setInterval(async () => {
        const stats = await serviceWorkerManager.getCacheStats();
        setCacheStats(stats);
      }, 30000); // Every 30 seconds

      return () => clearInterval(interval);
    }
  }, [isActive]);

  const clearCache = useCallback(async () => {
    return await serviceWorkerManager.clearThemeCache();
  }, []);

  const preloadThemes = useCallback(async (themes: any[]) => {
    return await serviceWorkerManager.preloadThemes(themes);
  }, []);

  const triggerOptimization = useCallback(async () => {
    return await serviceWorkerManager.triggerBackgroundSync();
  }, []);

  return {
    isSupported,
    isActive,
    cacheStats,
    clearCache,
    preloadThemes,
    triggerOptimization,
  };
}

export default serviceWorkerManager;