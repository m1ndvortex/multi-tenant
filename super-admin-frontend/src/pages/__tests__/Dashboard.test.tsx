import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from '../Dashboard';
import { AuthProvider } from '../../contexts/AuthContext';
import { ThemeProvider } from '../../contexts/ThemeContext';

// Mock the hooks with different scenarios
const mockUseDashboardStats = vi.fn();
const mockUseOnlineUsers = vi.fn();

vi.mock('../../hooks/useDashboardStats', () => ({
  useDashboardStats: () => mockUseDashboardStats(),
}));

vi.mock('../../hooks/useOnlineUsers', () => ({
  useOnlineUsers: () => mockUseOnlineUsers(),
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            {children}
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

const mockDashboardData = {
  total_tenants: 15,
  active_tenants: 12,
  free_tier_tenants: 8,
  pro_tier_tenants: 7,
  pending_payment_tenants: 3,
  total_users: 75,
  active_users_today: 35,
  total_invoices_this_month: 250,
  mrr: 1800,
  system_health: {
    cpu_usage: 45,
    memory_usage: 60,
    database_status: 'healthy' as const,
    redis_status: 'healthy' as const,
    celery_status: 'warning' as const,
  },
  recent_signups: 8,
  recent_upgrades: 5,
};

const mockOnlineUsersData = {
  users: [
    {
      id: '1',
      email: 'user1@example.com',
      tenant_name: 'Test Tenant 1',
      last_activity: new Date().toISOString(),
      is_impersonation: false,
    },
    {
      id: '2',
      email: 'admin@example.com',
      tenant_name: 'Test Tenant 2',
      last_activity: new Date().toISOString(),
      is_impersonation: true,
    },
  ],
  total_count: 2,
  last_updated: new Date().toISOString(),
};

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default successful state
    mockUseDashboardStats.mockReturnValue({
      data: mockDashboardData,
      isLoading: false,
      error: null,
    });

    mockUseOnlineUsers.mockReturnValue({
      data: mockOnlineUsersData,
      isLoading: false,
      error: null,
      isRefetching: false,
    });
  });

  it('renders welcome section with gradient design', () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    expect(screen.getByText('خوش آمدید به پلتفرم HesaabPlus')).toBeInTheDocument();
    expect(screen.getByText('مدیریت و نظارت بر تمامی عملیات سیستم حسابداری')).toBeInTheDocument();
    
    // Check for gradient icon container
    const iconContainer = screen.getByText('خوش آمدید به پلتفرم HesaabPlus')
      .closest('div')
      ?.querySelector('.bg-gradient-to-r');
    expect(iconContainer).toBeInTheDocument();
  });

  it('displays main statistics cards with correct data', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('کل تنانت‌ها')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('12 فعال')).toBeInTheDocument();
      
      expect(screen.getByText('کاربران فعال امروز')).toBeInTheDocument();
      expect(screen.getByText('35')).toBeInTheDocument();
      expect(screen.getByText('از 75 کل کاربر')).toBeInTheDocument();
      
      expect(screen.getByText('فاکتورهای این ماه')).toBeInTheDocument();
      expect(screen.getByText('250')).toBeInTheDocument();
      
      expect(screen.getByText('درآمد ماهانه (MRR)')).toBeInTheDocument();
      expect(screen.getByText('$1800')).toBeInTheDocument();
    });
  });

  it('displays secondary statistics correctly', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('اشتراک رایگان')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
      
      expect(screen.getByText('اشتراک حرفه‌ای')).toBeInTheDocument();
      expect(screen.getByText('7')).toBeInTheDocument();
      
      expect(screen.getByText('در انتظار پرداخت')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  it('displays system health information', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('سلامت سیستم')).toBeInTheDocument();
      expect(screen.getByText('CPU Usage')).toBeInTheDocument();
      expect(screen.getByText('45%')).toBeInTheDocument();
      
      expect(screen.getByText('Memory Usage')).toBeInTheDocument();
      expect(screen.getByText('60%')).toBeInTheDocument();
      
      expect(screen.getByText('Database')).toBeInTheDocument();
      // Check for "Healthy" text - there are multiple instances
      expect(screen.getAllByText(/healthy/i)).toHaveLength(2); // Database and Redis are both healthy
      
      expect(screen.getByText('Redis')).toBeInTheDocument();
      expect(screen.getByText('Celery')).toBeInTheDocument();
    });
  });

  it('renders quick actions section', () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    expect(screen.getByText('عملیات سریع')).toBeInTheDocument();
    expect(screen.getByText('مدیریت تنانت‌ها')).toBeInTheDocument();
    expect(screen.getByText('آنالیتیکس پلتفرم')).toBeInTheDocument();
    expect(screen.getByText('پشتیبان‌گیری')).toBeInTheDocument();
  });

  it('handles loading state correctly', () => {
    mockUseDashboardStats.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    // Should show loading indicators
    expect(screen.getAllByText('...')).toHaveLength(7); // 7 stat cards show "..." when loading
  });

  it('handles error state correctly', () => {
    mockUseDashboardStats.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to fetch'),
    });

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    expect(screen.getByText('خطا در دریافت اطلاعات')).toBeInTheDocument();
    expect(screen.getByText('امکان دریافت آمار داشبورد وجود ندارد')).toBeInTheDocument();
    expect(screen.getByText('تلاش مجدد')).toBeInTheDocument();
  });

  it('applies correct gradient variants to stat cards', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      // Check for gradient backgrounds on icon containers
      const gradientElements = document.querySelectorAll('.bg-gradient-to-br');
      expect(gradientElements.length).toBeGreaterThan(0);
    });
  });

  it('renders progress bars for system health metrics', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      // Check for progress bar containers
      const progressBars = document.querySelectorAll('.bg-slate-200.rounded-full');
      expect(progressBars.length).toBeGreaterThanOrEqual(2); // CPU and Memory progress bars
    });
  });

  it('includes WhoIsOnlineWidget component', () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    // The WhoIsOnlineWidget should be rendered
    expect(screen.getByText('کاربران آنلاین')).toBeInTheDocument();
  });

  it('has proper responsive grid layouts', () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    // Check for responsive grid classes
    const gridElements = document.querySelectorAll('.grid');
    expect(gridElements.length).toBeGreaterThan(0);
    
    // Check for responsive classes
    const responsiveElements = document.querySelectorAll('[class*="md:grid-cols"], [class*="lg:grid-cols"]');
    expect(responsiveElements.length).toBeGreaterThan(0);
  });

  it('renders with proper accessibility structure', () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    // Check for proper heading hierarchy
    const mainHeading = screen.getByRole('heading', { level: 1 });
    expect(mainHeading).toHaveTextContent('خوش آمدید به پلتفرم HesaabPlus');
  });

  it('displays system health status colors correctly', async () => {
    // Test with different health statuses
    const healthyData = { ...mockDashboardData };
    healthyData.system_health.database_status = 'healthy';
    healthyData.system_health.redis_status = 'warning';
    healthyData.system_health.celery_status = 'error';

    mockUseDashboardStats.mockReturnValue({
      data: healthyData,
      isLoading: false,
      error: null,
    });

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      // Check for different status colors (classes should be applied)
      const healthyElements = document.querySelectorAll('.text-green-600');
      const warningElements = document.querySelectorAll('.text-yellow-600');
      const errorElements = document.querySelectorAll('.text-red-600');
      
      expect(healthyElements.length).toBeGreaterThan(0);
      expect(warningElements.length).toBeGreaterThan(0);
      expect(errorElements.length).toBeGreaterThan(0);
    });
  });
});