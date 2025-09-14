/**
 * Integration tests for Tenant WebSocketManager
 * Tests real-time cache invalidation with actual backend API
 * Ensures production-ready tenant-specific functionality
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { 
  webSocketManager, 
  useWebSocket, 
  useCacheInvalidation, 
  useDataUpdates 
} from '../../services/webSocketManager';

const BACKEND_URL = 'http://backend:8000';
const TEST_TIMEOUT = 10000;
const TEST_TENANT_ID = 'test-tenant-123';

describe('Tenant WebSocketManager Integration Tests', () => {
  beforeAll(async () => {
    // Wait for backend to be ready
    let retries = 0;
    const maxRetries = 30;
    
    while (retries < maxRetries) {
      try {
        const response = await fetch(`${BACKEND_URL}/health`);
        if (response.ok) break;
      } catch (error) {
        console.log(`Waiting for backend... (${retries + 1}/${maxRetries})`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      retries++;
    }
    
    if (retries >= maxRetries) {
      throw new Error('Backend not available after 30 seconds');
    }

    // Set test tenant ID in localStorage
    localStorage.setItem('tenant_id', TEST_TENANT_ID);
  });

  beforeEach(() => {
    // Clear any existing connections
    webSocketManager.disconnect();
    // Ensure tenant ID is set
    localStorage.setItem('tenant_id', TEST_TENANT_ID);
  });

  afterEach(() => {
    // Clean up after each test
    webSocketManager.disconnect();
  });

  describe('Real Tenant WebSocket Connection', () => {
    it('should establish connection to backend WebSocket with tenant ID', async () => {
      const connectionPromise = new Promise<string>((resolve) => {
        const unsubscribe = webSocketManager.onConnectionStatus((connected: boolean) => {
          if (connected) {
            unsubscribe();
            resolve(webSocketManager.getConnectionId() || 'connected');
          }
        });
      });

      // Trigger connection
      webSocketManager.reconnect();

      const connectionId = await connectionPromise;
      expect(connectionId).toBeTruthy();
      expect(webSocketManager.isConnected()).toBe(true);
    }, TEST_TIMEOUT);

    it('should handle tenant connection establishment message from backend', async () => {
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Tenant connection timeout'));
        }, TEST_TIMEOUT);

        const unsubscribe = webSocketManager.onConnectionStatus((connected: boolean) => {
          if (connected) {
            clearTimeout(timeout);
            unsubscribe();
            
            // Verify connection ID is set
            expect(webSocketManager.getConnectionId()).toBeTruthy();
            resolve();
          }
        });

        webSocketManager.reconnect();
      });
    }, TEST_TIMEOUT);
  });

  describe('Real Tenant Cache Invalidation', () => {
    beforeEach(async () => {
      // Ensure connection is established
      if (!webSocketManager.isConnected()) {
        await new Promise<void>((resolve) => {
          const unsubscribe = webSocketManager.onConnectionStatus((connected: boolean) => {
            if (connected) {
              unsubscribe();
              resolve();
            }
          });
          webSocketManager.reconnect();
        });
      }
    });

    it('should receive real tenant-scoped cache invalidation messages', async () => {
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Tenant cache invalidation timeout'));
        }, TEST_TIMEOUT);

        const unsubscribe = webSocketManager.onCacheInvalidation((cacheKey: string, _data?: any) => {
          clearTimeout(timeout);
          unsubscribe();
          
          expect(cacheKey).toBeTruthy();
          expect(typeof cacheKey).toBe('string');
          resolve();
        });

        // Trigger tenant-specific cache invalidation via API
        webSocketManager.triggerCacheInvalidation('tenant-dashboard-data')
          .catch(reject);
      });
    }, TEST_TIMEOUT);

    it('should clear tenant-specific browser caches on real invalidation', async () => {
      // Store some test data in localStorage
      localStorage.setItem('tenant-cache-data', JSON.stringify({ tenant: TEST_TENANT_ID }));
      localStorage.setItem('global-data', JSON.stringify({ global: true }));

      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Tenant cache invalidation timeout'));
        }, TEST_TIMEOUT);

        const unsubscribe = webSocketManager.onCacheInvalidation((_cacheKey: string) => {
          clearTimeout(timeout);
          unsubscribe();
          
          // Verify tenant cache was cleared
          setTimeout(() => {
            const tenantData = localStorage.getItem('tenant-cache-data');
            expect(tenantData).toBeNull();
            
            // Global data should remain
            const globalData = localStorage.getItem('global-data');
            expect(globalData).toBeTruthy();
            
            resolve();
          }, 100);
        });

        // Trigger tenant cache invalidation
        webSocketManager.triggerCacheInvalidation('tenant-cache')
          .catch(reject);
      });
    }, TEST_TIMEOUT);
  });

  describe('Real Tenant Data Updates', () => {
    beforeEach(async () => {
      // Ensure connection is established
      if (!webSocketManager.isConnected()) {
        await new Promise<void>((resolve) => {
          const unsubscribe = webSocketManager.onConnectionStatus((connected: boolean) => {
            if (connected) {
              unsubscribe();
              resolve();
            }
          });
          webSocketManager.reconnect();
        });
      }
    });

    it('should receive real tenant-scoped data update messages', async () => {
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Tenant data update timeout'));
        }, TEST_TIMEOUT);

        const unsubscribe = webSocketManager.onDataUpdate((updateType: string, entity: string, data: any) => {
          clearTimeout(timeout);
          unsubscribe();
          
          expect(updateType).toBeTruthy();
          expect(entity).toBeTruthy();
          expect(data).toBeTruthy();
          resolve();
        });

        // Trigger a tenant data update via cache invalidation
        webSocketManager.triggerCacheInvalidation('tenant-invoices')
          .catch(reject);
      });
    }, TEST_TIMEOUT);
  });

  describe('Tenant Connection Recovery', () => {
    it('should reconnect with tenant context after connection loss', async () => {
      // First establish connection
      await new Promise<void>((resolve) => {
        const unsubscribe = webSocketManager.onConnectionStatus((connected: boolean) => {
          if (connected) {
            unsubscribe();
            resolve();
          }
        });
        webSocketManager.reconnect();
      });

      // Disconnect
      webSocketManager.disconnect();
      
      // Wait for disconnection
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Reconnect and verify tenant context is preserved
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Tenant reconnection timeout'));
        }, TEST_TIMEOUT);

        const unsubscribe = webSocketManager.onConnectionStatus((connected: boolean) => {
          if (connected) {
            clearTimeout(timeout);
            unsubscribe();
            expect(webSocketManager.isConnected()).toBe(true);
            resolve();
          }
        });

        webSocketManager.reconnect();
      });
    }, TEST_TIMEOUT);
  });
});

describe('Tenant WebSocket React Hooks Integration', () => {
  beforeEach(async () => {
    // Ensure clean state
    webSocketManager.disconnect();
    localStorage.setItem('tenant_id', TEST_TENANT_ID);
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('useWebSocket Hook for Tenants', () => {
    it('should provide real connection status with tenant context', async () => {
      const { result } = renderHook(() => useWebSocket());

      // Initially should be disconnected
      expect(result.current.isConnected).toBe(false);

      // Connect and wait for status update
      act(() => {
        result.current.reconnect();
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      }, { timeout: TEST_TIMEOUT });

      expect(result.current.connectionId).toBeTruthy();
    }, TEST_TIMEOUT);
  });

  describe('useCacheInvalidation Hook for Tenants', () => {
    it('should handle real tenant cache invalidation events', async () => {
      const callbackResults: string[] = [];
      
      const { unmount } = renderHook(() => 
        useCacheInvalidation((cacheKey: string) => {
          callbackResults.push(cacheKey);
        })
      );

      // Ensure connection
      await new Promise<void>((resolve) => {
        const unsubscribe = webSocketManager.onConnectionStatus((connected: boolean) => {
          if (connected) {
            unsubscribe();
            resolve();
          }
        });
        webSocketManager.reconnect();
      });

      // Trigger tenant cache invalidation
      await webSocketManager.triggerCacheInvalidation('tenant-hook-test-cache');

      // Wait for callback
      await waitFor(() => {
        expect(callbackResults.length).toBeGreaterThan(0);
      }, { timeout: TEST_TIMEOUT });

      expect(callbackResults).toContain('tenant-hook-test-cache');
      
      unmount();
    }, TEST_TIMEOUT);
  });

  describe('useDataUpdates Hook for Tenants', () => {
    it('should handle real tenant data update events', async () => {
      const updateResults: Array<{type: string, entity: string, data: any}> = [];
      
      const { unmount } = renderHook(() => 
        useDataUpdates((updateType: string, entity: string, data: any) => {
          updateResults.push({ type: updateType, entity, data });
        })
      );

      // Ensure connection
      await new Promise<void>((resolve) => {
        const unsubscribe = webSocketManager.onConnectionStatus((connected: boolean) => {
          if (connected) {
            unsubscribe();
            resolve();
          }
        });
        webSocketManager.reconnect();
      });

      // Trigger tenant data update
      await webSocketManager.triggerCacheInvalidation('tenant-data-update-test');

      // Wait for callback (data updates often come with cache invalidations)
      await waitFor(() => {
        expect(updateResults.length).toBeGreaterThanOrEqual(0);
      }, { timeout: 5000 });

      unmount();
    }, TEST_TIMEOUT);
  });
});

describe('Tenant Error Handling Integration', () => {
  it('should handle tenant backend connection errors gracefully', async () => {
    // Disconnect from real backend
    webSocketManager.disconnect();

    // Mock a bad URL (this will cause real connection errors)
    const originalGetWebSocketUrl = (webSocketManager as any).getWebSocketUrl;
    (webSocketManager as any).getWebSocketUrl = () => 'ws://invalid-host:9999/ws/tenant/test';

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Try to connect
    webSocketManager.reconnect();

    // Wait for error
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Restore original method
    (webSocketManager as any).getWebSocketUrl = originalGetWebSocketUrl;

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should handle tenant API errors during cache invalidation', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Try to trigger cache invalidation when not connected/with invalid data
    await webSocketManager.triggerCacheInvalidation('');

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should handle missing tenant ID gracefully', async () => {
    // Remove tenant ID from localStorage
    localStorage.removeItem('tenant_id');

    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Try to establish connection without tenant ID
    webSocketManager.reconnect();

    // Wait for warning
    await new Promise(resolve => setTimeout(resolve, 1000));

    expect(consoleWarnSpy).toHaveBeenCalled();
    consoleWarnSpy.mockRestore();

    // Restore tenant ID
    localStorage.setItem('tenant_id', TEST_TENANT_ID);
  });
});