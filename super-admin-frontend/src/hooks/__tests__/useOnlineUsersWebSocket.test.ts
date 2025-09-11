/**
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react';
import { useOnlineUsersWebSocket } from '../useOnlineUsersWebSocket';
import * as onlineUsersServiceModule from '../../services/onlineUsersService';

// Mock the service
jest.mock('../../services/onlineUsersService');
const mockOnlineUsersService = onlineUsersServiceModule.onlineUsersService as jest.Mocked<typeof onlineUsersServiceModule.onlineUsersService>;

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(public url: string) {
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.(new Event('open'));
    }, 0);
  }

  send(data: string) {
    // Mock send functionality
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }
}

// Replace global WebSocket with mock
(global as any).WebSocket = MockWebSocket;

// Mock document.hidden for tab visibility
Object.defineProperty(document, 'hidden', {
  writable: true,
  value: false,
});

const mockStats = {
  total_online_users: 5,
  total_offline_users: 3,
  online_by_tenant: { 'tenant1': 3, 'tenant2': 2 },
  recent_activity_count: 4,
  peak_online_today: 8,
  average_session_duration: 45.5,
};

const mockUsers = [
  {
    id: '1',
    user_id: 'user1',
    tenant_id: 'tenant1',
    user_email: 'user1@example.com',
    user_full_name: 'کاربر یک',
    tenant_name: 'شرکت الف',
    is_online: true,
    last_activity: '2024-01-15T10:30:00Z',
    session_id: 'session1',
    user_agent: 'Mozilla/5.0 Chrome/120.0.0.0',
    ip_address: '192.168.1.1',
    session_duration_minutes: 45,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:30:00Z',
  },
];

describe('useOnlineUsersWebSocket', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnlineUsersService.createWebSocketConnection.mockReturnValue(new MockWebSocket('ws://localhost') as any);
  });

  afterEach(() => {
    // Reset document.hidden
    Object.defineProperty(document, 'hidden', { value: false });
  });

  it('initializes with correct default values', () => {
    const { result } = renderHook(() => useOnlineUsersWebSocket());

    expect(result.current.isConnected).toBe(false);
    expect(result.current.stats).toBe(null);
    expect(result.current.users).toEqual([]);
  });

  it('establishes WebSocket connection when enabled', async () => {
    const { result } = renderHook(() => useOnlineUsersWebSocket({ enabled: true }));

    await act(async () => {
      // Wait for connection to be established
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(mockOnlineUsersService.createWebSocketConnection).toHaveBeenCalled();
    expect(result.current.isConnected).toBe(true);
  });

  it('does not connect when disabled', () => {
    renderHook(() => useOnlineUsersWebSocket({ enabled: false }));

    expect(mockOnlineUsersService.createWebSocketConnection).not.toHaveBeenCalled();
  });

  it('handles initial stats message', async () => {
    const { result } = renderHook(() => useOnlineUsersWebSocket({ enabled: true }));

    await act(async () => {
      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 10));

      // Simulate receiving initial stats
      const mockWs = mockOnlineUsersService.createWebSocketConnection.mock.results[0].value;
      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify({
          type: 'initial_stats',
          data: mockStats,
          timestamp: new Date().toISOString(),
        }),
      });

      mockWs.onmessage?.(messageEvent);
    });

    expect(result.current.stats).toEqual(mockStats);
  });

  it('handles users update message', async () => {
    const { result } = renderHook(() => useOnlineUsersWebSocket({ enabled: true }));

    await act(async () => {
      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 10));

      // Simulate receiving users update
      const mockWs = mockOnlineUsersService.createWebSocketConnection.mock.results[0].value;
      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify({
          type: 'users_update',
          data: { users: mockUsers },
          timestamp: new Date().toISOString(),
        }),
      });

      mockWs.onmessage?.(messageEvent);
    });

    expect(result.current.users).toEqual(mockUsers);
  });

  it('handles user online message', async () => {
    const { result } = renderHook(() => useOnlineUsersWebSocket({ enabled: true }));

    await act(async () => {
      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 10));

      // Simulate user coming online
      const mockWs = mockOnlineUsersService.createWebSocketConnection.mock.results[0].value;
      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify({
          type: 'user_online',
          data: mockUsers[0],
          timestamp: new Date().toISOString(),
        }),
      });

      mockWs.onmessage?.(messageEvent);
    });

    expect(result.current.users).toContainEqual(expect.objectContaining({
      user_id: 'user1',
      is_online: true,
    }));
  });

  it('handles user offline message', async () => {
    const { result } = renderHook(() => useOnlineUsersWebSocket({ enabled: true }));

    await act(async () => {
      // Wait for connection and add user first
      await new Promise(resolve => setTimeout(resolve, 10));

      const mockWs = mockOnlineUsersService.createWebSocketConnection.mock.results[0].value;
      
      // Add user first
      let messageEvent = new MessageEvent('message', {
        data: JSON.stringify({
          type: 'user_online',
          data: mockUsers[0],
          timestamp: new Date().toISOString(),
        }),
      });
      mockWs.onmessage?.(messageEvent);

      // Then remove user
      messageEvent = new MessageEvent('message', {
        data: JSON.stringify({
          type: 'user_offline',
          data: { user_id: 'user1' },
          timestamp: new Date().toISOString(),
        }),
      });
      mockWs.onmessage?.(messageEvent);
    });

    expect(result.current.users).not.toContainEqual(expect.objectContaining({
      user_id: 'user1',
    }));
  });

  it('sends messages correctly', async () => {
    const { result } = renderHook(() => useOnlineUsersWebSocket({ enabled: true }));

    await act(async () => {
      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    const mockWs = mockOnlineUsersService.createWebSocketConnection.mock.results[0].value;
    const sendSpy = jest.spyOn(mockWs, 'send');

    act(() => {
      result.current.sendMessage({ type: 'ping' });
    });

    expect(sendSpy).toHaveBeenCalledWith(expect.stringContaining('"type":"ping"'));
  });

  it('handles tab visibility changes', async () => {
    const { result } = renderHook(() => useOnlineUsersWebSocket({ enabled: true }));

    await act(async () => {
      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result.current.isConnected).toBe(true);

    // Simulate tab becoming inactive
    act(() => {
      Object.defineProperty(document, 'hidden', { value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Should disconnect when tab becomes inactive
    expect(result.current.isConnected).toBe(false);
  });

  it('reconnects when tab becomes active again', async () => {
    const { result } = renderHook(() => useOnlineUsersWebSocket({ enabled: true }));

    await act(async () => {
      // Wait for initial connection
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    // Simulate tab becoming inactive
    act(() => {
      Object.defineProperty(document, 'hidden', { value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Simulate tab becoming active again
    act(() => {
      Object.defineProperty(document, 'hidden', { value: false });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await act(async () => {
      // Wait for reconnection
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    // Should reconnect
    expect(mockOnlineUsersService.createWebSocketConnection).toHaveBeenCalledTimes(2);
  });

  it('handles connection errors', async () => {
    const onError = jest.fn();
    const { result } = renderHook(() => useOnlineUsersWebSocket({ 
      enabled: true,
      onError 
    }));

    await act(async () => {
      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 10));

      // Simulate error
      const mockWs = mockOnlineUsersService.createWebSocketConnection.mock.results[0].value;
      const errorEvent = new Event('error');
      mockWs.onerror?.(errorEvent);
    });

    expect(onError).toHaveBeenCalledWith(errorEvent);
  });

  it('handles auto-reconnect on connection close', async () => {
    const { result } = renderHook(() => useOnlineUsersWebSocket({ 
      enabled: true,
      autoReconnect: true,
      reconnectInterval: 100
    }));

    await act(async () => {
      // Wait for initial connection
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result.current.isConnected).toBe(true);

    await act(async () => {
      // Simulate connection close
      const mockWs = mockOnlineUsersService.createWebSocketConnection.mock.results[0].value;
      mockWs.close();

      // Wait for reconnect attempt
      await new Promise(resolve => setTimeout(resolve, 150));
    });

    // Should attempt to reconnect
    expect(mockOnlineUsersService.createWebSocketConnection).toHaveBeenCalledTimes(2);
  });

  it('cleans up on unmount', async () => {
    const { result, unmount } = renderHook(() => useOnlineUsersWebSocket({ enabled: true }));

    await act(async () => {
      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    const mockWs = mockOnlineUsersService.createWebSocketConnection.mock.results[0].value;
    const closeSpy = jest.spyOn(mockWs, 'close');

    unmount();

    expect(closeSpy).toHaveBeenCalled();
  });

  it('handles manual reconnect', async () => {
    const { result } = renderHook(() => useOnlineUsersWebSocket({ enabled: true }));

    await act(async () => {
      // Wait for initial connection
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    act(() => {
      result.current.reconnect();
    });

    await act(async () => {
      // Wait for reconnection
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    // Should create new connection
    expect(mockOnlineUsersService.createWebSocketConnection).toHaveBeenCalledTimes(2);
  });

  it('handles manual disconnect', async () => {
    const { result } = renderHook(() => useOnlineUsersWebSocket({ enabled: true }));

    await act(async () => {
      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result.current.isConnected).toBe(true);

    act(() => {
      result.current.disconnect();
    });

    expect(result.current.isConnected).toBe(false);
  });
});