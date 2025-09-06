import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import Dashboard from '@/pages/Dashboard';
import { dashboardService } from '@/services/dashboardService';
import { ApiError } from '@/services/apiClient';

// Mock the dashboard service
vi.mock('@/services/dashboardService');

// Mock toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock WhoIsOnlineWidget component
vi.mock('@/components/WhoIsOnlineWidget', () => ({
  default: () => <div data-testid="who-is-online-widget">Who Is Online Widget</div>,
}));

const mockDashboardService = vi.mocked(dashboardService);

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
    },
  },
});

const renderDashboard = (queryClient = createTestQueryClient()) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const mockDashboardStats = {
  total_tenants: 150,
  active_tenants: 142,
  free_tier_tenants: 95,
  pro_tier_tenants: 47,
  pending_payment_tenants: 8,
  total_users: 1250,
  active_users_today: 89,
  total_invoices_this_month: 2340,
  mrr: 15600,
  system_health: {
    cpu_usage: 45,
    memory_usage: 62,
    database_status: 'healthy' as const,
    redis_status: 'healthy' as const,
    celery_status: 'healthy' as const,
  },
  recent_signups: 12,
  recent_upgrades: 5,
};

const mockOnlineUsers = [
  {
    id: '1',
    email: 'user1@example.com',
    tenant_name: 'Tenant 1',
    last_activity: '2024-01-15T10:30:00Z',
    session_duration: 3600,
  },
  {
    id: '2',
    email: 'user2@example.com',
    tenant_name: 'Tenant 2',
    last_activity: '2024-01-15T10:25:00Z',
    session_duration: 1800,
    is_impersonated: true,
  },
];

const mockSystemAlerts = [
  {
    id: '1',
    type: 'warning' as const,
    title: 'High Memory Usage',
    message: 'System memory usage is above 80%',
    timestamp: '2024-01-15T10:00:00Z',
    is_resolved: false,
    severity: 'medium' as const,
  },
];

const mockQuickStats = {
  signups_today: 5,
  revenue_today: 1200,
  active_sessions: 45,
  pending_tasks: 12,
  error_rate_24h: 0.02,
  uptime_percentage: 99.8,
};

describe('Dashboard API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Successful API Responses', () => {
    beforeEach(() => {
      mockDashboardService.getDashboardStats.mockResolvedValue(mockDashboardStats);
      mockDashboardService.getOnlineUsers.mockResolvedValue(mockOnlineUsers);
      mockDashboardService.getSystemAlerts.mockResolvedValue(mockSystemAlerts);
      mockDashboardService.getQuickStats.mockResolvedValue(mockQuickStats);
      mockDashboardService.getCurrentSystemHealth.mockResolvedValue({
        timestamp: '2024-01-15T10:30:00Z',
        cpu_usage: 45,
        memory_usage: 62,
        disk_usage: 35,
        database_connections: 25,
        database_response_time: 15,
        redis_memory_usage: 128,
        redis_connected_clients: 12,
        celery_active_tasks: 3,
        celery_pending_tasks: 1,
        celery_failed_tasks: 0,
        api_response_time: 120,
        error_rate: 0.01,
      });
    });

    it('should display dashboard stats correctly', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument(); // total_tenants
        expect(screen.getByText('89')).toBeInTheDocument(); // active_users_today
        expect(screen.getByText('2340')).toBeInTheDocument(); // total_invoices_this_month
        expect(screen.getByText('$15600')).toBeInTheDocument(); // mrr
      });

      expect(mockDashboardService.getDashboardStats).toHaveBeenCalledTimes(1);
    });

    it('should display system health information', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('45%')).toBeInTheDocument(); // CPU usage
        expect(screen.getByText('62%')).toBeInTheDocument(); // Memory usage
        expect(screen.getByText('Healthy')).toBeInTheDocument(); // Database status
      });
    });

    it('should handle refresh functionality', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument();
      });

      const refreshButton = screen.getByRole('button', { name: /بروزرسانی/ });
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockDashboardService.getDashboardStats).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('API Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const networkError: ApiError = {
        message: 'Network error - please check your connection',
        status: 0,
        isNetworkError: true,
        isTimeoutError: false,
      };

      mockDashboardService.getDashboardStats.mockRejectedValue(networkError);
      mockDashboardService.getOnlineUsers.mockRejectedValue(networkError);
      mockDashboardService.getSystemAlerts.mockRejectedValue(networkError);
      mockDashboardService.getQuickStats.mockRejectedValue(networkError);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/Network error/)).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /Try Again/ });
      expect(retryButton).toBeInTheDocument();
    });

    it('should handle timeout errors', async () => {
      const timeoutError: ApiError = {
        message: 'Request timeout - please try again',
        status: 408,
        isNetworkError: false,
        isTimeoutError: true,
      };

      mockDashboardService.getDashboardStats.mockRejectedValue(timeoutError);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/Request timeout/)).toBeInTheDocument();
      });
    });

    it('should handle authentication errors', async () => {
      const authError: ApiError = {
        message: 'Authentication required - please log in',
        status: 401,
        isNetworkError: false,
        isTimeoutError: false,
      };

      mockDashboardService.getDashboardStats.mockRejectedValue(authError);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/Authentication required/)).toBeInTheDocument();
      });
    });

    it('should handle server errors', async () => {
      const serverError: ApiError = {
        message: 'Server error - please try again',
        status: 500,
        isNetworkError: false,
        isTimeoutError: false,
      };

      mockDashboardService.getDashboardStats.mockRejectedValue(serverError);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/Server error/)).toBeInTheDocument();
      });
    });

    it('should show partial data when some APIs fail', async () => {
      // Mock successful stats but failed online users
      mockDashboardService.getDashboardStats.mockResolvedValue(mockDashboardStats);
      mockDashboardService.getOnlineUsers.mockRejectedValue(new Error('Failed to fetch online users'));
      mockDashboardService.getSystemAlerts.mockResolvedValue(mockSystemAlerts);
      mockDashboardService.getQuickStats.mockResolvedValue(mockQuickStats);

      renderDashboard();

      await waitFor(() => {
        // Should show stats data
        expect(screen.getByText('150')).toBeInTheDocument();
        // Should show error banner for failed data
        expect(screen.getByText(/Some data may be outdated/)).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading skeletons while fetching data', async () => {
      // Create a promise that we can control
      let resolveStats: (value: any) => void;
      const statsPromise = new Promise((resolve) => {
        resolveStats = resolve;
      });

      mockDashboardService.getDashboardStats.mockReturnValue(statsPromise);
      mockDashboardService.getOnlineUsers.mockResolvedValue(mockOnlineUsers);
      mockDashboardService.getSystemAlerts.mockResolvedValue(mockSystemAlerts);
      mockDashboardService.getQuickStats.mockResolvedValue(mockQuickStats);

      renderDashboard();

      // Should show loading skeletons
      expect(screen.getAllByTestId('stat-card-skeleton')).toHaveLength(4);

      // Resolve the promise
      resolveStats!(mockDashboardStats);

      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument();
      });
    });

    it('should show loading indicator on refresh button when refreshing', async () => {
      mockDashboardService.getDashboardStats.mockResolvedValue(mockDashboardStats);
      mockDashboardService.getOnlineUsers.mockResolvedValue(mockOnlineUsers);
      mockDashboardService.getSystemAlerts.mockResolvedValue(mockSystemAlerts);
      mockDashboardService.getQuickStats.mockResolvedValue(mockQuickStats);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument();
      });

      // Mock a slow refresh
      let resolveRefresh: (value: any) => void;
      const refreshPromise = new Promise((resolve) => {
        resolveRefresh = resolve;
      });
      mockDashboardService.getDashboardStats.mockReturnValue(refreshPromise);

      const refreshButton = screen.getByRole('button', { name: /بروزرسانی/ });
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(screen.getByText(/در حال بروزرسانی/)).toBeInTheDocument();
      });

      resolveRefresh!(mockDashboardStats);

      await waitFor(() => {
        expect(screen.getByText(/بروزرسانی/)).toBeInTheDocument();
      });
    });
  });

  describe('Offline Detection', () => {
    it('should show offline indicator when offline', async () => {
      // Mock navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/You're offline/)).toBeInTheDocument();
      });
    });

    it('should handle online/offline transitions', async () => {
      // Start online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      mockDashboardService.getDashboardStats.mockResolvedValue(mockDashboardStats);
      mockDashboardService.getOnlineUsers.mockResolvedValue(mockOnlineUsers);
      mockDashboardService.getSystemAlerts.mockResolvedValue(mockSystemAlerts);
      mockDashboardService.getQuickStats.mockResolvedValue(mockQuickStats);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument();
      });

      // Go offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      // Trigger offline event
      fireEvent(window, new Event('offline'));

      await waitFor(() => {
        expect(screen.getByText(/You're offline/)).toBeInTheDocument();
      });

      // Go back online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      // Trigger online event
      fireEvent(window, new Event('online'));

      await waitFor(() => {
        expect(screen.queryByText(/You're offline/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Recovery', () => {
    it('should retry failed requests when retry button is clicked', async () => {
      const error: ApiError = {
        message: 'Server error - please try again',
        status: 500,
        isNetworkError: false,
        isTimeoutError: false,
      };

      // First call fails
      mockDashboardService.getDashboardStats.mockRejectedValueOnce(error);
      // Second call succeeds
      mockDashboardService.getDashboardStats.mockResolvedValue(mockDashboardStats);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/Server error/)).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /Try Again/ });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument();
      });

      expect(mockDashboardService.getDashboardStats).toHaveBeenCalledTimes(2);
    });
  });
});