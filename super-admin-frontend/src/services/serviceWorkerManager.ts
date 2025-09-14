/**
 * Service Worker Manager with Real-Time Cache Integration
 * Manages service worker registration and real-time cache invalidation
 */

import React from 'react';

interface ServiceWorkerStats {
  hits: number;
  misses: number;
  invalidations: number;
  environment: string;
  version: string;
  lastUpdate: number;
}

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private isRegistered = false;
  private messageChannel: MessageChannel | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported');
      return;
    }

    try {
      await this.registerServiceWorker();
      this.setupMessageChannel();
    } catch (error) {
      console.error('Failed to initialize Service Worker:', error);
    }
  }

  private async registerServiceWorker(): Promise<void> {
    try {
      // Use the enhanced service worker
      this.registration = await navigator.serviceWorker.register('/sw-realtime-cache.js', {
        scope: '/'
      });

      this.registration.addEventListener('updatefound', () => {
        console.log('Service Worker update found');
        this.handleUpdate();
      });

      // Wait for service worker to be active
      if (this.registration.installing) {
        await this.waitForWorkerState(this.registration.installing, 'activated');
      } else if (this.registration.waiting) {
        await this.waitForWorkerState(this.registration.waiting, 'activated');
      } else if (this.registration.active) {
        this.isRegistered = true;
      }

      console.log('Service Worker registered successfully');
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  }

  private async waitForWorkerState(worker: ServiceWorker, state: ServiceWorkerState): Promise<void> {
    return new Promise((resolve) => {
      const checkState = () => {
        if (worker.state === state) {
          this.isRegistered = true;
          resolve();
        } else {
          worker.addEventListener('statechange', checkState, { once: true });
        }
      };
      checkState();
    });
  }

  private setupMessageChannel(): void {
    this.messageChannel = new MessageChannel();
    
    // Listen for messages from service worker
    this.messageChannel.port1.onmessage = (event) => {
      this.handleServiceWorkerMessage(event.data);
    };

    // Send port to service worker
    if (this.registration?.active) {
      this.registration.active.postMessage(
        { type: 'INIT_PORT' },
        [this.messageChannel.port2]
      );
    }
  }

  private handleServiceWorkerMessage(data: any): void {
    switch (data.type) {
      case 'CACHE_INVALIDATED':
        console.log('Cache invalidated by service worker:', data.cacheKey);
        // Trigger any additional cleanup or notifications
        this.notifyMainThread('cache_invalidated', data);
        break;
        
      default:
        console.log('Service Worker message:', data);
    }
  }

  private notifyMainThread(type: string, data: any): void {
    // Dispatch custom event for the main application
    window.dispatchEvent(new CustomEvent('sw-cache-event', {
      detail: { type, data }
    }));
  }

  private handleUpdate(): void {
    if (this.registration?.waiting) {
      // New service worker is waiting
      console.log('New service worker waiting');
      
      // You could show a notification to the user here
      // For now, we'll automatically update
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Reload the page to use the new service worker
      window.addEventListener('controllerchange', () => {
        window.location.reload();
      }, { once: true });
    }
  }

  // Public API methods
  public async invalidateCache(cacheKey: string, pattern?: string): Promise<boolean> {
    if (!this.isRegistered || !this.registration?.active) {
      console.warn('Service Worker not available for cache invalidation');
      return false;
    }

    try {
      const messageChannel = new MessageChannel();
      
      return new Promise((resolve) => {
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data.success);
        };

        this.registration!.active!.postMessage(
          {
            type: 'CACHE_INVALIDATE',
            data: { cacheKey, pattern }
          },
          [messageChannel.port2]
        );
      });
    } catch (error) {
      console.error('Failed to invalidate cache:', error);
      return false;
    }
  }

  public async clearAllCaches(): Promise<boolean> {
    if (!this.isRegistered || !this.registration?.active) {
      console.warn('Service Worker not available for cache clearing');
      return false;
    }

    try {
      const messageChannel = new MessageChannel();
      
      return new Promise((resolve) => {
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data.success);
        };

        this.registration!.active!.postMessage(
          { type: 'CACHE_CLEAR_ALL' },
          [messageChannel.port2]
        );
      });
    } catch (error) {
      console.error('Failed to clear caches:', error);
      return false;
    }
  }

  public async getCacheStats(): Promise<ServiceWorkerStats | null> {
    if (!this.isRegistered || !this.registration?.active) {
      return null;
    }

    try {
      const messageChannel = new MessageChannel();
      
      return new Promise((resolve) => {
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data.success ? event.data.stats : null);
        };

        this.registration!.active!.postMessage(
          { type: 'GET_CACHE_STATS' },
          [messageChannel.port2]
        );
      });
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return null;
    }
  }

  public async preloadResources(resources: string[]): Promise<boolean> {
    if (!this.isRegistered || !this.registration?.active) {
      return false;
    }

    try {
      const messageChannel = new MessageChannel();
      
      return new Promise((resolve) => {
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data.success);
        };

        this.registration!.active!.postMessage(
          {
            type: 'PRELOAD_RESOURCES',
            data: { resources }
          },
          [messageChannel.port2]
        );
      });
    } catch (error) {
      console.error('Failed to preload resources:', error);
      return false;
    }
  }

  public async sendRealtimeInvalidation(data: {
    cacheKey: string;
    pattern?: string;
    timestamp: number;
  }): Promise<boolean> {
    if (!this.isRegistered || !this.registration?.active) {
      return false;
    }

    try {
      const messageChannel = new MessageChannel();
      
      return new Promise((resolve) => {
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data.success);
        };

        this.registration!.active!.postMessage(
          {
            type: 'REALTIME_INVALIDATION',
            data
          },
          [messageChannel.port2]
        );
      });
    } catch (error) {
      console.error('Failed to send real-time invalidation:', error);
      return false;
    }
  }

  public isActive(): boolean {
    return this.isRegistered && !!this.registration?.active;
  }

  public async unregister(): Promise<boolean> {
    if (this.registration) {
      const result = await this.registration.unregister();
      this.isRegistered = false;
      this.registration = null;
      return result;
    }
    return false;
  }

  public async update(): Promise<void> {
    if (this.registration) {
      await this.registration.update();
    }
  }
}

// Export singleton instance
export const serviceWorkerManager = new ServiceWorkerManager();

// React hook for service worker integration
export function useServiceWorker() {
  const [isActive, setIsActive] = React.useState(serviceWorkerManager.isActive());
  const [stats, setStats] = React.useState<ServiceWorkerStats | null>(null);

  React.useEffect(() => {
    // Check service worker status periodically
    const checkStatus = () => {
      setIsActive(serviceWorkerManager.isActive());
    };

    const interval = setInterval(checkStatus, 5000);
    checkStatus(); // Initial check

    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    // Get cache stats
    const loadStats = async () => {
      const cacheStats = await serviceWorkerManager.getCacheStats();
      setStats(cacheStats);
    };

    if (isActive) {
      loadStats();
      // Refresh stats every 30 seconds
      const interval = setInterval(loadStats, 30000);
      return () => clearInterval(interval);
    }
  }, [isActive]);

  const invalidateCache = React.useCallback(async (cacheKey: string, pattern?: string) => {
    return serviceWorkerManager.invalidateCache(cacheKey, pattern);
  }, []);

  const clearAllCaches = React.useCallback(async () => {
    return serviceWorkerManager.clearAllCaches();
  }, []);

  const preloadResources = React.useCallback(async (resources: string[]) => {
    return serviceWorkerManager.preloadResources(resources);
  }, []);

  return {
    isActive,
    stats,
    invalidateCache,
    clearAllCaches,
    preloadResources,
    update: serviceWorkerManager.update.bind(serviceWorkerManager),
    unregister: serviceWorkerManager.unregister.bind(serviceWorkerManager)
  };
}

export default serviceWorkerManager;