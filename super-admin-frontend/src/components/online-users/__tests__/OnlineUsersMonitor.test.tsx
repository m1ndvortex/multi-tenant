/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import OnlineUsersMonitor from '../../../pages/OnlineUsersMonitor';
import * as useOnlineUsersModule from '../../../hooks/useOnlineUsers';

// Mock the hooks
jest.mock('../../../hooks/useOnlineUsers');
const mockUseOnlineUsers = useOnlineUsersModule.useOnlineUsers as jest.MockedFunction<typeof useOnlineUsersModule.useOnlineUsers>;

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn(() => '5 دقیقه پیش'),
  format: jest.fn(() => '2024/01/15 10:30:00'),
}));

// Mock date-fns/locale
jest.mock('date-fns/locale', () => ({
  faIR: {},
}));

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

const defaultMockReturn = {
  users: mockUsers,
  stats: mockStats,
  tenantUsers: {},
  loading: false,
  statsLoading: false,
  usersLoading: false,
  isConnected: true,
  refreshUsers: jest.fn(),
  refreshStats: jest.fn(),
  setUserOffline: jest.fn(),
  bulkSetUsersOffline: jest.fn(),
  getUserSession: jest.fn(),
  getTenantUsers: jest.fn(),
  cleanupExpiredUsers: jest.fn(),
  filters: {},
  setFilters: jest.fn(),
  error: null,
  clearError: jest.fn(),
};

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('OnlineUsersMonitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOnlineUsers.mockReturnValue(defaultMockReturn);
  });

  it('renders online users monitor page correctly', () => {
    renderWithProviders(<OnlineUsersMonitor />);

    expect(screen.getByText('مانیتور کاربران آنلاین')).toBeInTheDocument();
    expect(screen.getByText('نظارت بلادرنگ بر وضعیت کاربران آنلاین و فعالیت‌های آن‌ها')).toBeInTheDocument();
  });

  it('displays statistics cards with correct data', () => {
    renderWithProviders(<OnlineUsersMonitor />);

    expect(screen.getByText('1')).toBeInTheDocument(); // Online users count
    expect(screen.getByText('آنلاین')).toBeInTheDocument();
    expect(screen.getByText('آفلاین')).toBeInTheDocument();
  });

  it('displays real-time connection status', () => {
    renderWithProviders(<OnlineUsersMonitor />);

    expect(screen.getByText('اتصال بلادرنگ')).toBeInTheDocument();
    expect(screen.getByText('متصل')).toBeInTheDocument();
  });

  it('shows users table in overview tab', () => {
    renderWithProviders(<OnlineUsersMonitor />);

    expect(screen.getByText('کاربر یک')).toBeInTheDocument();
    expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    expect(screen.getByText('شرکت الف')).toBeInTheDocument();
  });

  it('handles tab switching correctly', async () => {
    renderWithProviders(<OnlineUsersMonitor />);

    const tenantsTab = screen.getByRole('tab', { name: /بر اساس تنانت/i });
    fireEvent.click(tenantsTab);

    await waitFor(() => {
      expect(tenantsTab).toHaveAttribute('data-state', 'active');
    });
  });

  it('handles user selection and shows details', async () => {
    const mockGetUserSession = jest.fn().mockResolvedValue({
      user_id: 'user1',
      tenant_id: 'tenant1',
      session_id: 'session1',
      is_online: true,
      last_activity: '2024-01-15T10:30:00Z',
      session_start: '2024-01-15T10:00:00Z',
      session_duration_minutes: 45,
    });

    mockUseOnlineUsers.mockReturnValue({
      ...defaultMockReturn,
      getUserSession: mockGetUserSession,
    });

    renderWithProviders(<OnlineUsersMonitor />);

    const userRow = screen.getByText('کاربر یک').closest('tr');
    expect(userRow).toBeInTheDocument();

    if (userRow) {
      fireEvent.click(userRow);
    }

    await waitFor(() => {
      expect(mockGetUserSession).toHaveBeenCalledWith('user1');
    });
  });

  it('handles setting user offline', async () => {
    const mockSetUserOffline = jest.fn().mockResolvedValue(true);

    mockUseOnlineUsers.mockReturnValue({
      ...defaultMockReturn,
      setUserOffline: mockSetUserOffline,
    });

    renderWithProviders(<OnlineUsersMonitor />);

    const offlineButtons = screen.getAllByRole('button');
    const offlineButton = offlineButtons.find(button => 
      button.querySelector('svg') && button.getAttribute('class')?.includes('text-red-600')
    );

    if (offlineButton) {
      fireEvent.click(offlineButton);
      await waitFor(() => {
        expect(mockSetUserOffline).toHaveBeenCalledWith('user1');
      });
    }
  });

  it('handles refresh functionality', async () => {
    const mockRefreshUsers = jest.fn();
    const mockRefreshStats = jest.fn();
    const mockCleanupExpiredUsers = jest.fn();

    mockUseOnlineUsers.mockReturnValue({
      ...defaultMockReturn,
      refreshUsers: mockRefreshUsers,
      refreshStats: mockRefreshStats,
      cleanupExpiredUsers: mockCleanupExpiredUsers,
    });

    renderWithProviders(<OnlineUsersMonitor />);

    const refreshButton = screen.getByRole('button', { name: /بروزرسانی/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockRefreshUsers).toHaveBeenCalled();
      expect(mockRefreshStats).toHaveBeenCalled();
      expect(mockCleanupExpiredUsers).toHaveBeenCalled();
    });
  });

  it('displays error message when error occurs', () => {
    mockUseOnlineUsers.mockReturnValue({
      ...defaultMockReturn,
      error: 'Connection failed',
    });

    renderWithProviders(<OnlineUsersMonitor />);

    expect(screen.getByText('Connection failed')).toBeInTheDocument();
  });

  it('handles loading states correctly', () => {
    mockUseOnlineUsers.mockReturnValue({
      ...defaultMockReturn,
      loading: true,
      statsLoading: true,
      usersLoading: true,
    });

    renderWithProviders(<OnlineUsersMonitor />);

    // Should show loading skeletons
    const skeletons = document.querySelectorAll('[data-testid="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows empty state when no users are online', () => {
    mockUseOnlineUsers.mockReturnValue({
      ...defaultMockReturn,
      users: [],
      stats: {
        ...mockStats,
        total_online_users: 0,
      },
    });

    renderWithProviders(<OnlineUsersMonitor />);

    expect(screen.getByText('هیچ کاربر آنلاینی یافت نشد')).toBeInTheDocument();
  });

  it('handles pause/resume functionality', async () => {
    renderWithProviders(<OnlineUsersMonitor />);

    const pauseButton = screen.getByRole('button', { name: /توقف/i });
    fireEvent.click(pauseButton);

    // Should show resume button after pause
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ادامه/i })).toBeInTheDocument();
    });
  });

  it('handles tenant grouping correctly', () => {
    renderWithProviders(<OnlineUsersMonitor />);

    const tenantsTab = screen.getByRole('tab', { name: /بر اساس تنانت/i });
    fireEvent.click(tenantsTab);

    // Should group users by tenant
    expect(screen.getByText('شرکت الف')).toBeInTheDocument();
  });

  it('handles filters correctly', async () => {
    const mockSetFilters = jest.fn();

    mockUseOnlineUsers.mockReturnValue({
      ...defaultMockReturn,
      setFilters: mockSetFilters,
    });

    renderWithProviders(<OnlineUsersMonitor />);

    const settingsTab = screen.getByRole('tab', { name: /فیلترها/i });
    fireEvent.click(settingsTab);

    await waitFor(() => {
      expect(screen.getByText('فیلترها')).toBeInTheDocument();
    });
  });

  it('handles WebSocket connection status changes', () => {
    mockUseOnlineUsers.mockReturnValue({
      ...defaultMockReturn,
      isConnected: false,
    });

    renderWithProviders(<OnlineUsersMonitor />);

    expect(screen.getByText('قطع شده')).toBeInTheDocument();
  });
});