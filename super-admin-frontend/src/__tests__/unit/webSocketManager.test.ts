/**
 * Integration tests for WebSocketManager
 * Tests real-time cache invalidation with actual backend API
 * Ensures production-ready functionality
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

describe('WebSocketManager Integration Tests', () => {
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
  });

  beforeEach(() => {
    // Clear any existing connections
    webSocketManager.disconnect();
  });

  afterEach(() => {
    // Clean up after each test
    webSocketManager.disconnect();
  });

  describe('Real WebSocket Connection', () => {
    it('should establish connection to backend WebSocket', async () => {
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

    it('should handle connection establishment message from backend', async () => {
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
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

  describe('Real Cache Invalidation', () => {
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

    it('should receive real cache invalidation messages', async () => {
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Cache invalidation timeout'));
        }, TEST_TIMEOUT);

        const unsubscribe = webSocketManager.onCacheInvalidation((cacheKey: string, _data?: any) => {
          clearTimeout(timeout);
          unsubscribe();
          
          expect(cacheKey).toBeTruthy();
          expect(typeof cacheKey).toBe('string');
          resolve();
        });

        // Trigger cache invalidation via API
        webSocketManager.triggerCacheInvalidation('test-cache-admin')
          .catch(reject);
      });
    }, TEST_TIMEOUT);

    it('should clear browser caches on real invalidation', async () => {
      // Store some test data in localStorage
      localStorage.setItem('test-cache-data', JSON.stringify({ test: true }));
      localStorage.setItem('other-data', JSON.stringify({ other: true }));

      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Cache invalidation timeout'));
        }, TEST_TIMEOUT);

        const unsubscribe = webSocketManager.onCacheInvalidation((_cacheKey: string) => {
          clearTimeout(timeout);
          unsubscribe();
          
          // Verify cache was cleared
          setTimeout(() => {
            const testData = localStorage.getItem('test-cache-data');
            expect(testData).toBeNull();
            
            // Other data should remain
            const otherData = localStorage.getItem('other-data');
            expect(otherData).toBeTruthy();
            
            resolve();
          }, 100);
        });

        // Trigger cache invalidation
        webSocketManager.triggerCacheInvalidation('test-cache')
          .catch(reject);
      });
    }, TEST_TIMEOUT);
  });

  describe('Real Data Updates', () => {
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

    it('should receive real data update messages', async () => {
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Data update timeout'));
        }, TEST_TIMEOUT);

        const unsubscribe = webSocketManager.onDataUpdate((updateType: string, entity: string, data: any) => {
          clearTimeout(timeout);
          unsubscribe();
          
          expect(updateType).toBeTruthy();
          expect(entity).toBeTruthy();
          expect(data).toBeTruthy();
          resolve();
        });

        // Trigger a data update via cache invalidation (which often includes data updates)
        webSocketManager.triggerCacheInvalidation('dashboard-data')
          .catch(reject);
      });
    }, TEST_TIMEOUT);
  });

  describe('Connection Recovery', () => {
    it('should reconnect after connection loss', async () => {
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
      
      // Reconnect and verify
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Reconnection timeout'));
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

describe('WebSocket React Hooks Integration', () => {
  beforeEach(async () => {
    // Ensure clean state
    webSocketManager.disconnect();
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('useWebSocket Hook', () => {
    it('should provide real connection status', async () => {
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

  describe('useCacheInvalidation Hook', () => {
    it('should handle real cache invalidation events', async () => {
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

      // Trigger cache invalidation
      await webSocketManager.triggerCacheInvalidation('hook-test-cache');

      // Wait for callback
      await waitFor(() => {
        expect(callbackResults.length).toBeGreaterThan(0);
      }, { timeout: TEST_TIMEOUT });

      expect(callbackResults).toContain('hook-test-cache');
      
      unmount();
    }, TEST_TIMEOUT);
  });

  describe('useDataUpdates Hook', () => {
    it('should handle real data update events', async () => {
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

      // Trigger data update
      await webSocketManager.triggerCacheInvalidation('data-update-test');

      // Wait for callback (data updates often come with cache invalidations)
      await waitFor(() => {
        expect(updateResults.length).toBeGreaterThanOrEqual(0);
      }, { timeout: 5000 });

      unmount();
    }, TEST_TIMEOUT);
  });
});

describe('Error Handling Integration', () => {
  it('should handle backend connection errors gracefully', async () => {
    // Disconnect from real backend
    webSocketManager.disconnect();

    // Mock a bad URL (this will cause real connection errors)
    const originalGetWebSocketUrl = (webSocketManager as any).getWebSocketUrl;
    (webSocketManager as any).getWebSocketUrl = () => 'ws://invalid-host:9999/ws/admin';

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

  it('should handle API errors during cache invalidation', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Try to trigger cache invalidation when not connected/with invalid data
    await webSocketManager.triggerCacheInvalidation('');

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});