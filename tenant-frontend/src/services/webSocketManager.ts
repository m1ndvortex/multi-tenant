/**
 * Real-time WebSocket connection manager with intelligent cache invalidation
 * Handles cache updates, data synchronization, and connection management for tenant frontend
 */

import React from 'react';
import { apiClient } from '@/lib/api';

interface WebSocketMessage {
  type: 'connection_established' | 'cache_invalidation' | 'data_update' | 'ping' | 'pong' | 'system_notification';
  cache_key?: string;
  data?: any;
  update_type?: 'create' | 'update' | 'delete';
  entity?: string;
  connection_id?: string;
  timestamp: string;
}

interface CacheInvalidationCallback {
  (cacheKey: string, data?: any): void;
}

interface DataUpdateCallback {
  (updateType: string, entity: string, data: any): void;
}

class WebSocketManager {
  private ws: WebSocket | null = null;
  private connectionId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000; // Start with 1 second
  private maxReconnectInterval = 30000; // Max 30 seconds
  private pingInterval: NodeJS.Timeout | null = null;
  private isManualClose = false;
  private cacheInvalidationCallbacks = new Set<CacheInvalidationCallback>();
  private dataUpdateCallbacks = new Set<DataUpdateCallback>();
  private connectionStatusCallbacks = new Set<(connected: boolean) => void>();

  constructor() {
    this.connect();
  }

  private getWebSocketUrl(): string {
    // Prefer explicit API URL from env (works in tests/Node and browser)
    // Try import.meta.env first (Vite), then process.env (Vitest/Node), then window location
    const envApiUrl = (import.meta as any)?.env?.VITE_API_URL || (typeof process !== 'undefined' ? (process as any).env?.VITE_API_URL : undefined);

    const tenantId = this.getTenantId();
    const endpoint = `/ws/tenant/${tenantId}`;

    if (envApiUrl) {
      try {
        const api = new URL(envApiUrl);
        const wsProtocol = api.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${wsProtocol}//${api.host}${endpoint}`;
      } catch (e) {
        console.warn('Invalid VITE_API_URL, falling back to window location:', envApiUrl);
      }
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = (window.location as any).port as string | undefined;
    const portSegment = port ? `:${port}` : '';
    return `${protocol}//${host}${portSegment}${endpoint}`;
  }

  private getTenantId(): string {
    // Get tenant ID from localStorage, URL params, or user context
    const storedTenantId = localStorage.getItem('tenant_id');
    if (storedTenantId) return storedTenantId;

    // Try to extract from URL path (e.g., /tenant/123/dashboard)
    const pathMatch = window.location.pathname.match(/\/tenant\/([^\/]+)/);
    if (pathMatch) return pathMatch[1];

    // Try to get from user profile
    const userProfile = localStorage.getItem('user_profile');
    if (userProfile) {
      try {
        const profile = JSON.parse(userProfile);
        if (profile.tenant_id) return profile.tenant_id;
      } catch (error) {
        console.warn('Failed to parse user profile:', error);
      }
    }

    // Fallback to default with warning for visibility
    console.warn('Tenant ID not found; falling back to default tenant context');
    return 'default';
  }

  private connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const url = this.getWebSocketUrl();
      console.log('Connecting to WebSocket:', url);
      
      this.ws = new WebSocket(url);
      // Fail fast if we can't establish a connection within a short window
      const connectTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
          console.error('WebSocket connection timeout');
        }
      }, 1500);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected for tenant');
        clearTimeout(connectTimeout);
        this.reconnectAttempts = 0;
        this.reconnectInterval = 1000;
        this.notifyConnectionStatus(true);
        this.startPingInterval();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        // Clear any pending connect timeout on close
        try { clearTimeout(connectTimeout); } catch {}
        this.notifyConnectionStatus(false);
        this.stopPingInterval();
        
        if (!this.isManualClose && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.scheduleReconnect();
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'connection_established':
        this.connectionId = message.connection_id || null;
        console.log('WebSocket connection established for tenant:', this.connectionId);
        break;

      case 'cache_invalidation':
        if (message.cache_key) {
          console.log('Tenant cache invalidation received:', message.cache_key);
          this.invalidateCache(message.cache_key, message.data);
        }
        break;

      case 'data_update':
        if (message.update_type && message.entity) {
          console.log('Tenant data update received:', message.update_type, message.entity);
          this.notifyDataUpdate(message.update_type, message.entity, message.data);
        }
        break;

      case 'ping':
        this.sendPong();
        break;

      case 'system_notification':
        console.log('Tenant system notification:', message.data);
        // Could trigger toast notifications here
        break;

      default:
        console.log('Unknown WebSocket message type:', message.type);
    }
  }

  private invalidateCache(cacheKey: string, data?: any): void {
    // Notify all registered callbacks
    this.cacheInvalidationCallbacks.forEach(callback => {
      try {
        callback(cacheKey, data);
      } catch (error) {
        console.error('Cache invalidation callback error:', error);
      }
    });

    // Clear browser caches
    this.clearBrowserCaches(cacheKey, data);
  }

  private clearBrowserCaches(cacheKey: string, data?: any): void {
    // Clear localStorage entries matching the cache key
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes(cacheKey)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));

    // Clear sessionStorage entries
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.includes(cacheKey) || cacheKey === 'all')) {
        sessionStorage.removeItem(key);
      }
    }

    // Clear service worker caches
    if ('serviceWorker' in navigator && 'caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          if (cacheName.includes(cacheKey) || cacheKey === 'all') {
            caches.delete(cacheName);
          }
        });
      });
    }

    // Clear React Query cache via event
    window.dispatchEvent(new CustomEvent('cache-invalidation', {
      detail: { cacheKey, data }
    }));

    // Clear IndexedDB entries if needed
    this.clearIndexedDBCache(cacheKey);
  }

  private clearIndexedDBCache(cacheKey: string): void {
    if ('indexedDB' in window) {
      try {
        const tenantId = this.getTenantId();
        const deleteReq = indexedDB.deleteDatabase(`tenant-cache-${tenantId}-${cacheKey}`);
        deleteReq.onsuccess = () => {
          console.log('IndexedDB cache cleared for tenant:', cacheKey);
        };
      } catch (error) {
        console.warn('Failed to clear IndexedDB cache:', error);
      }
    }
  }

  private notifyDataUpdate(updateType: string, entity: string, data: any): void {
    this.dataUpdateCallbacks.forEach(callback => {
      try {
        callback(updateType, entity, data);
      } catch (error) {
        console.error('Data update callback error:', error);
      }
    });

    // Dispatch custom event for React Query invalidation
    window.dispatchEvent(new CustomEvent('data-update', {
      detail: { updateType, entity, data }
    }));
  }

  private notifyConnectionStatus(connected: boolean): void {
    this.connectionStatusCallbacks.forEach(callback => {
      try {
        callback(connected);
      } catch (error) {
        console.error('Connection status callback error:', error);
      }
    });
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectInterval
    );

    console.log(`Scheduling tenant reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      if (!this.isManualClose) {
        this.connect();
      }
    }, delay);
  }

  private startPingInterval(): void {
    this.stopPingInterval();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendPing();
      }
    }, 25000); // 25 seconds
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private sendPing(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = {
        type: 'ping',
        timestamp: new Date().toISOString()
      };
      this.ws.send(JSON.stringify(message));
    }
  }

  private sendPong(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = {
        type: 'pong',
        timestamp: new Date().toISOString()
      };
      this.ws.send(JSON.stringify(message));
    }
  }

  // Public API
  public onCacheInvalidation(callback: CacheInvalidationCallback): () => void {
    this.cacheInvalidationCallbacks.add(callback);
    return () => this.cacheInvalidationCallbacks.delete(callback);
  }

  public onDataUpdate(callback: DataUpdateCallback): () => void {
    this.dataUpdateCallbacks.add(callback);
    return () => this.dataUpdateCallbacks.delete(callback);
  }

  public onConnectionStatus(callback: (connected: boolean) => void): () => void {
    this.connectionStatusCallbacks.add(callback);
    return () => this.connectionStatusCallbacks.delete(callback);
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  public getConnectionId(): string | null {
    return this.connectionId;
  }

  public getTenantInfo(): { tenantId: string; connectionId: string | null } {
    return {
      tenantId: this.getTenantId(),
      connectionId: this.connectionId
    };
  }

  public disconnect(): void {
    this.isManualClose = true;
    this.stopPingInterval();
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
  }

  public reconnect(): void {
    this.isManualClose = false;
    this.disconnect();
    setTimeout(() => this.connect(), 100);
  }

  // Manual cache invalidation trigger (for testing)
  public async triggerCacheInvalidation(cacheKey: string): Promise<void> {
    try {
      if (!cacheKey || cacheKey.trim().length === 0) {
        console.error('Cache key is required to trigger invalidation');
        return;
      }
      const tenantId = this.getTenantId();
      await apiClient.post('/ws/invalidate-cache', {}, {
        params: { 
          cache_key: cacheKey, 
          target_type: 'tenant',
          tenant_id: tenantId
        }
      });
    } catch (error) {
      console.error('Failed to trigger cache invalidation:', error);
    }
  }
}

// Export singleton instance
export const webSocketManager = new WebSocketManager();

// React hook for WebSocket connection
export const useWebSocket = () => {
  const [isConnected, setIsConnected] = React.useState(webSocketManager.isConnected());

  React.useEffect(() => {
    const unsubscribe = webSocketManager.onConnectionStatus(setIsConnected);
    return unsubscribe;
  }, []);

  return {
    isConnected,
    connectionId: webSocketManager.getConnectionId(),
    tenantInfo: webSocketManager.getTenantInfo(),
    reconnect: () => webSocketManager.reconnect(),
    disconnect: () => webSocketManager.disconnect(),
    triggerCacheInvalidation: webSocketManager.triggerCacheInvalidation.bind(webSocketManager)
  };
};

// React hook for cache invalidation
export const useCacheInvalidation = (callback: CacheInvalidationCallback) => {
  React.useEffect(() => {
    const unsubscribe = webSocketManager.onCacheInvalidation(callback);
    return unsubscribe;
  }, [callback]);
};

// React hook for data updates
export const useDataUpdates = (callback: DataUpdateCallback) => {
  React.useEffect(() => {
    const unsubscribe = webSocketManager.onDataUpdate(callback);
    return unsubscribe;
  }, [callback]);
};

// React hook for React Query integration
export const useReactQueryInvalidation = (queryClient: any) => {
  React.useEffect(() => {
    // Listen for cache invalidation events
    const handleCacheInvalidation = (event: CustomEvent) => {
      const { cacheKey } = event.detail;
      console.log('Invalidating React Query cache:', cacheKey);
      
      if (cacheKey === 'all') {
        queryClient.invalidateQueries();
      } else {
        queryClient.invalidateQueries({ queryKey: [cacheKey] });
      }
    };

    // Listen for data update events
    const handleDataUpdate = (event: CustomEvent) => {
      const { entity, updateType } = event.detail;
      console.log('Handling data update:', entity, updateType);
      
      // Invalidate specific queries based on entity type
      switch (entity) {
        case 'dashboard':
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          break;
        case 'invoice':
          queryClient.invalidateQueries({ queryKey: ['invoices'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          break;
        case 'customer':
          queryClient.invalidateQueries({ queryKey: ['customers'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          break;
        case 'product':
          queryClient.invalidateQueries({ queryKey: ['products'] });
          break;
        case 'installment':
          queryClient.invalidateQueries({ queryKey: ['installments'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          break;
        default:
          queryClient.invalidateQueries({ queryKey: [entity] });
      }
    };

    window.addEventListener('cache-invalidation', handleCacheInvalidation as EventListener);
    window.addEventListener('data-update', handleDataUpdate as EventListener);

    return () => {
      window.removeEventListener('cache-invalidation', handleCacheInvalidation as EventListener);
      window.removeEventListener('data-update', handleDataUpdate as EventListener);
    };
  }, [queryClient]);
};

export default webSocketManager;