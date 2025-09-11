/**
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react';
import { useOnlineUsers } from '../useOnlineUsers';
import * as onlineUsersServiceModule from '../../services/onlineUsersService';
import * as useOnlineUsersWebSocketModule from '../useOnlineUsersWebSocket';

// Mock the service and WebSocket hook
jest.mock('../../services/onlineUsersService');
jest.mock('../useOnlineUsersWebSocket');

const mockOnlineUsersService = onlineUsersServiceModule.onlineUsersService as jest.Mocked<typeof onlineUsersServiceModule.onlineUsersService>;
const mockUseOnlineUsersWebSocket = useOnlineUsersWebSocketModule.useOnlineUsersWebSocket as jest.MockedFunction<typeof useOnlineUsersWebSocketModule.useOnlineUsersWebSocket>;

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
  {
    id: '2',
    user_id: 'user2',
    tenant_id: 'tenant2',
    user_email: 'user2@example.com',
    user_full_name: 'کاربر دو',
    tenant_name: 'شرکت ب',
    is_online: false,
    last_activity: '2024-01-15T09:30:00Z',
    session_id: 'session2',
    user_agent: 'Mozilla/5.0 Firefox/120.0',
    ip_address: '192.168.1.2',
    session_duration_minutes: 30,
    created_at: '2024-01-15T09:00:00Z',
    updated_at: '2024-01-15T09:30:00Z',
  },
];

const mockStats = {
  total_online_users: 1,
  total_offline_users: 1,
  online_by_tenant: { 'tenant1': 1, 'tenant2': 0 },
  recent_activity_count: 1,
  peak_online_today: 3,
  average_session_duration: 37.5,
};

const mockUserSession = {
  user_id: 'user1',
  tenant_id: 'tenant1',
  session_id: 'session1',
  is_online: true,
  last_activity: '2024-01-15T10:30:00Z',
  session_start: '2024-01-15T10:00:00Z',
  session_duration_minutes: 45,
  ip_address: '192.168.1.1',
  user_agent: 'Mozilla/5.0 Chrome/120.0.0.0',
};

const mockTenantUsers = {
  tenant_id: 'tenant1',
  tenant_name: 'شرکت الف',
  online_users_count: 1,
  offline_users_count: 0,
  users: [mockUsers[0]],
};

describe('useOnlineUsers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock WebSocket hook
    mockUseOnlineUsersWebSocket.mockReturnValue({
      isConnected: true,
      stats: mockStats,
      users: mockUsers,
      sendMessage: jest.fn(),
      reconnect: jest.fn(),
      disconnect: jest.fn(),
    });

    // Mock service methods
    mockOnlineUsersService.getOnlineUsers.mockResolvedValue({
      success: true,
      data: mockUsers,
    });

    mockOnlineUsersService.getOnlineUsersStats.mockResolvedValue({
      success: true,
      data: mockStats,
    });

    mockOnlineUsersService.getUserSession.mockResolvedValue({
      success: true,
      data: mockUserSession,
    });

    mockOnlineUsersService.getTenantOnlineUsers.mockResolvedValue({
      success: true,
      data: mockTenantUsers,
    });

    mockOnlineUsersService.setUserOffline.mockResolvedValue({
      success: true,
      data: { success: true, message: 'User set offline' },
    });

    mockOnlineUsersService.bulkSetUsersOffline.mockResolvedValue({
      success: true,
      data: {
        success: true,
        message: 'Users set offline',
        updated_count: 2,
        failed_count: 0,
        errors: [],
      },
    });

    mockOnlineUsersService.cleanupExpiredUsers.mockResolvedValue({
      success: true,
      data: { success: true, message: 'Cleanup completed' },
    });
  });

  it('initializes with correct default values', () => {
    const { result } = renderHook(() => useOnlineUsers());

    expect(result.current.users).toEqual([]);
    expect(result.current.stats).toBe(null);
    expect(result.current.tenantUsers).toEqual({});
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('loads initial data on mount', async () => {
    const { result } = renderHook(() => useOnlineUsers());

    await act(async () => {
      // Wait for initial data loading
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockOnlineUsersService.getOnlineUsers).toHaveBeenCalled();
    expect(mockOnlineUsersService.getOnlineUsersStats).toHaveBeenCalled();
  });

  it('updates data from WebSocket when real-time is enabled', () => {
    const { result } = renderHook(() => useOnlineUsers({ enableRealTime: true }));

    expect(result.current.stats).toEqual(mockStats);
    expect(result.current.users).toEqual(mockUsers);
    expect(result.current.isConnected).toBe(true);
  });

  it('refreshes users data correctly', async () => {
    const { result } = renderHook(() => useOnlineUsers());

    await act(async () => {
      await result.current.refreshUsers();
    });

    expect(mockOnlineUsersService.getOnlineUsers).toHaveBeenCalled();
    expect(result.current.users).toEqual(mockUsers);
  });

  it('refreshes stats data correctly', async () => {
    const { result } = renderHook(() => useOnlineUsers());

    await act(async () => {
      await result.current.refreshStats();
    });

    expect(mockOnlineUsersService.getOnlineUsersStats).toHaveBeenCalled();
    expect(result.current.stats).toEqual(mockStats);
  });

  it('sets user offline successfully', async () => {
    const { result } = renderHook(() => useOnlineUsers());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.setUserOffline('user1');
    });

    expect(success).toBe(true);
    expect(mockOnlineUsersService.setUserOffline).toHaveBeenCalledWith('user1');
  });

  it('handles set user offline failure', async () => {
    mockOnlineUsersService.setUserOffline.mockResolvedValue({
      success: false,
      error: 'Failed to set user offline',
    });

    const { result } = renderHook(() => useOnlineUsers());

    let success: boolean = true;
    await act(async () => {
      success = await result.current.setUserOffline('user1');
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe('Failed to set user offline');
  });

  it('bulk sets users offline successfully', async () => {
    const { result } = renderHook(() => useOnlineUsers());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.bulkSetUsersOffline(['user1', 'user2']);
    });

    expect(success).toBe(true);
    expect(mockOnlineUsersService.bulkSetUsersOffline).toHaveBeenCalledWith(['user1', 'user2']);
  });

  it('gets user session successfully', async () => {
    const { result } = renderHook(() => useOnlineUsers());

    let session: any = null;
    await act(async () => {
      session = await result.current.getUserSession('user1');
    });

    expect(session).toEqual(mockUserSession);
    expect(mockOnlineUsersService.getUserSession).toHaveBeenCalledWith('user1');
  });

  it('gets tenant users successfully', async () => {
    const { result } = renderHook(() => useOnlineUsers());

    let tenantUsers: any = null;
    await act(async () => {
      tenantUsers = await result.current.getTenantUsers('tenant1');
    });

    expect(tenantUsers).toEqual(mockTenantUsers);
    expect(mockOnlineUsersService.getTenantOnlineUsers).toHaveBeenCalledWith('tenant1');
    expect(result.current.tenantUsers['tenant1']).toEqual(mockTenantUsers);
  });

  it('cleans up expired users successfully', async () => {
    const { result } = renderHook(() => useOnlineUsers());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.cleanupExpiredUsers();
    });

    expect(success).toBe(true);
    expect(mockOnlineUsersService.cleanupExpiredUsers).toHaveBeenCalled();
  });

  it('handles filters correctly', async () => {
    const initialFilters = { tenant_id: 'tenant1', limit: 25 };
    const { result } = renderHook(() => useOnlineUsers({ initialFilters }));

    expect(result.current.filters).toEqual(initialFilters);

    await act(async () => {
      result.current.setFilters({ tenant_id: 'tenant2', limit: 50 });
    });

    expect(result.current.filters).toEqual({ tenant_id: 'tenant2', limit: 50 });
  });

  it('handles errors correctly', async () => {
    mockOnlineUsersService.getOnlineUsers.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useOnlineUsers());

    await act(async () => {
      await result.current.refreshUsers();
    });

    expect(result.current.error).toBe('Network error');
  });

  it('clears errors correctly', async () => {
    mockOnlineUsersService.getOnlineUsers.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useOnlineUsers());

    await act(async () => {
      await result.current.refreshUsers();
    });

    expect(result.current.error).toBe('Network error');

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBe(null);
  });

  it('handles auto-refresh when real-time is disabled', async () => {
    jest.useFakeTimers();

    const { result } = renderHook(() => useOnlineUsers({
      enableRealTime: false,
      autoRefresh: true,
      refreshInterval: 1000
    }));

    // Clear initial calls
    jest.clearAllMocks();

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockOnlineUsersService.getOnlineUsers).toHaveBeenCalled();
    expect(mockOnlineUsersService.getOnlineUsersStats).toHaveBeenCalled();

    jest.useRealTimers();
  });

  it('handles loading states correctly', async () => {
    const { result } = renderHook(() => useOnlineUsers());

    // Should start with loading true
    expect(result.current.loading).toBe(true);

    await act(async () => {
      // Wait for initial loading to complete
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.loading).toBe(false);
  });

  it('handles WebSocket error callback', () => {
    const mockWebSocketReturn = {
      isConnected: false,
      stats: null,
      users: [],
      sendMessage: jest.fn(),
      reconnect: jest.fn(),
      disconnect: jest.fn(),
    };

    mockUseOnlineUsersWebSocket.mockImplementation((options) => {
      // Simulate WebSocket error
      if (options?.onError) {
        setTimeout(() => options.onError!(new Event('error')), 0);
      }
      return mockWebSocketReturn;
    });

    const { result } = renderHook(() => useOnlineUsers({ enableRealTime: true }));

    // Should set error when WebSocket fails
    expect(result.current.error).toBe('Real-time connection error. Falling back to manual refresh.');
  });

  it('sends WebSocket messages when filters change in real-time mode', async () => {
    const mockSendMessage = jest.fn();
    mockUseOnlineUsersWebSocket.mockReturnValue({
      isConnected: true,
      stats: mockStats,
      users: mockUsers,
      sendMessage: mockSendMessage,
      reconnect: jest.fn(),
      disconnect: jest.fn(),
    });

    const { result } = renderHook(() => useOnlineUsers({ enableRealTime: true }));

    act(() => {
      result.current.setFilters({ tenant_id: 'tenant1' });
    });

    expect(mockSendMessage).toHaveBeenCalledWith({
      type: 'request_users',
      data: { tenant_id: 'tenant1' }
    });
  });
});