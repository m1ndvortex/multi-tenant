/**
 * Real-time WebSocket connection manager with intelligent cache invalidation
 * Handles cache updates, data synchronization, and connection management
 */

import React from 'react';
import { apiClient } from './apiClient';

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
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = import.meta.env.DEV ? '8000' : window.location.port;
    
    // Determine endpoint based on app type
    const appType = import.meta.env.VITE_APP_TYPE || 'super-admin';
    const endpoint = appType === 'super-admin' ? '/ws/admin' : `/ws/tenant/${this.getTenantId()}`;
    
    return `${protocol}//${host}:${port}${endpoint}`;
  }

  private getTenantId(): string {
    // Get tenant ID from localStorage or URL
    return localStorage.getItem('tenant_id') || 'default';
  }

  private connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const url = this.getWebSocketUrl();
      console.log('Connecting to WebSocket:', url);
      
      this.ws = new WebSocket(url);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
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
        console.log('WebSocket connection established:', this.connectionId);
        break;

      case 'cache_invalidation':
        if (message.cache_key) {
          console.log('Cache invalidation received:', message.cache_key);
          this.invalidateCache(message.cache_key, message.data);
        }
        break;

      case 'data_update':
        if (message.update_type && message.entity) {
          console.log('Data update received:', message.update_type, message.entity);
          this.notifyDataUpdate(message.update_type, message.entity, message.data);
        }
        break;

      case 'ping':
        this.sendPong();
        break;

      case 'system_notification':
        console.log('System notification:', message.data);
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
    this.clearBrowserCaches(cacheKey);
  }

  private clearBrowserCaches(cacheKey: string): void {
    // Clear localStorage entries matching the cache key
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes(cacheKey)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));

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

    // Clear IndexedDB entries if needed
    this.clearIndexedDBCache(cacheKey);
  }

  private clearIndexedDBCache(cacheKey: string): void {
    if ('indexedDB' in window) {
      try {
        const deleteReq = indexedDB.deleteDatabase(`theme-cache-${cacheKey}`);
        deleteReq.onsuccess = () => {
          console.log('IndexedDB cache cleared for:', cacheKey);
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

    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
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
  public async triggerCacheInvalidation(cacheKey: string, targetType = 'all', tenantId?: string): Promise<void> {
    try {
      await apiClient.post('/ws/invalidate-cache', {}, {
        params: { cache_key: cacheKey, target_type: targetType, tenant_id: tenantId }
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

export default webSocketManager;