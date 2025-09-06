import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import Dashboard from '../Dashboard';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { usePlatformMetrics } from '@/hooks/useAnalytics';

// Mock the hooks
vi.mock('@/hooks/useDashboardStats');
vi.mock('@/hooks/useAnalytics');
vi.mock('@/components/WhoIsOnlineWidget', () => ({
  default: function MockWhoIsOnlineWidget() {
    return <div data-testid="who-is-online-widget">Who is Online Widget</div>;
  }
}));
vi.mock('@/components/RealTimeSystemHealth', () => ({
  default: function MockRealTimeSystemHealth() {
    return <div data-testid="real-time-system-health">Real Time System Health</div>;
  }
}));

const mockUseDashboardStats = vi.mocked(useDashboardStats);
const mockUsePlatformMetrics = vi.mocked(usePlatformMetrics);

const mockDashboardData = {
  total_tenants: 150,
  active_tenants: 120,
  free_tier_tenants: 80,
  pro_tier_tenants: 40,
  pending_payment_tenants: 5,
  total_users: 500,
  active_users_today: 85,
  total_invoices_this_month: 1250,
  mrr: 2400,
  system_health: {
    cpu_usage: 45,
    memory_usage: 62,
    database_status: 'healthy' as const,
    redis_status: 'healthy' as const,
    celery_status: 'warning' as const,
  },
  recent_signups: 12,
  recent_upgrades: 8,
};

const mockAnalyticsData = {
  signups: [12, 15, 8, 22, 18, 25, 30],
  revenue: [1200, 1350, 1100, 1800, 1650, 2100, 2400],
  activity: [85, 92, 78, 95, 88, 96, 91]
};

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
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

describe('Dashboard Component', () => {
  beforeEach(() => {
    mockUseDashboardStats.mockReturnValue({
      data: mockDashboardData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    mockUsePlatformMetrics.mockReturnValue({
      data: mockAnalyticsData,
      isLoading: false,
      error: null,
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Dashboard Layout and Navigation', () => {
    it('renders dashboard header with welcome message', () => {
      renderWithProviders(<Dashboard />);
      
      expect(screen.getByText('خوش آمدید به پلتفرم HesaabPlus')).toBeInTheDocument();
      expect(screen.getByText('مدیریت و نظارت بر تمامی عملیات سیستم حسابداری')).toBeInTheDocument();
    });

    it('renders personalization and refresh buttons', () => {
      renderWithProviders(<Dashboard />);
      
      expect(screen.getByText('شخصی‌سازی')).toBeInTheDocument();
      expect(screen.getByText('بروزرسانی')).toBeInTheDocument();
    });

    it('shows personalization panel when button is clicked', () => {
      renderWithProviders(<Dashboard />);
      
      const personalizationButton = screen.getByText('شخصی‌سازی');
      fireEvent.click(personalizationButton);
      
      expect(screen.getByText('تنظیمات داشبورد')).toBeInTheDocument();
      expect(screen.getByText('چیدمان پیش‌فرض')).toBeInTheDocument();
      expect(screen.getByText('چیدمان فشرده')).toBeInTheDocument();
      expect(screen.getByText('چیدمان تفصیلی')).toBeInTheDocument();
    });

    it('changes dashboard layout when layout buttons are clicked', () => {
      renderWithProviders(<Dashboard />);
      
      // Open personalization panel
      const personalizationButton = screen.getByText('شخصی‌سازی');
      fireEvent.click(personalizationButton);
      
      // Click compact layout
      const compactButton = screen.getByText('چیدمان فشرده');
      fireEvent.click(compactButton);
      
      // Verify layout change (compact layout should show 6 columns on large screens)
      const statsGrid = document.querySelector('.grid');
      expect(statsGrid).toHaveClass('lg:grid-cols-6');
    });
  });

  describe('Statistics Cards', () => {
    it('renders all main statistics cards with correct data', () => {
      renderWithProviders(<Dashboard />);
      
      expect(screen.getByText('کل تنانت‌ها')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('120 فعال')).toBeInTheDocument();
      
      expect(screen.getByText('کاربران فعال امروز')).toBeInTheDocument();
      expect(screen.getByText('85')).toBeInTheDocument();
      expect(screen.getByText('از 500 کل کاربر')).toBeInTheDocument();
      
      expect(screen.getByText('فاکتورهای این ماه')).toBeInTheDocument();
      expect(screen.getByText('1250')).toBeInTheDocument();
      
      expect(screen.getByText('درآمد ماهانه (MRR)')).toBeInTheDocument();
      expect(screen.getByText('$2400')).toBeInTheDocument();
    });

    it('renders secondary statistics cards', () => {
      renderWithProviders(<Dashboard />);
      
      expect(screen.getByText('اشتراک رایگان')).toBeInTheDocument();
      expect(screen.getByText('80')).toBeInTheDocument();
      
      expect(screen.getByText('اشتراک حرفه‌ای')).toBeInTheDocument();
      expect(screen.getByText('40')).toBeInTheDocument();
      
      expect(screen.getByText('در انتظار پرداخت')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('shows loading state for statistics cards', () => {
      mockUseDashboardStats.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      } as any);

      renderWithProviders(<Dashboard />);
      
      // Check for loading skeletons
      const loadingElements = document.querySelectorAll('.animate-pulse');
      expect(loadingElements.length).toBeGreaterThan(0);
    });

    it('shows trend indicators on statistics cards', () => {
      renderWithProviders(<Dashboard />);
      
      // Check for trend indicators (should show positive trends)
      const trendElements = document.querySelectorAll('.text-green-600');
      expect(trendElements.length).toBeGreaterThan(0);
    });
  });

  describe('System Health Section', () => {
    it('renders system health information', () => {
      renderWithProviders(<Dashboard />);
      
      expect(screen.getByText('سلامت سیستم')).toBeInTheDocument();
      expect(screen.getByText('CPU Usage')).toBeInTheDocument();
      expect(screen.getByText('45%')).toBeInTheDocument();
      expect(screen.getByText('Memory Usage')).toBeInTheDocument();
      expect(screen.getByText('62%')).toBeInTheDocument();
      expect(screen.getByText('Database')).toBeInTheDocument();
      expect(screen.getByText('Redis')).toBeInTheDocument();
      expect(screen.getByText('Celery')).toBeInTheDocument();
    });

    it('shows correct status indicators for services', () => {
      renderWithProviders(<Dashboard />);
      
      // Database and Redis should show healthy status
      const healthyElements = document.querySelectorAll('.text-green-600');
      expect(healthyElements.length).toBeGreaterThan(0);
      
      // Celery should show warning status
      const warningElements = document.querySelectorAll('.text-yellow-600');
      expect(warningElements.length).toBeGreaterThan(0);
    });

    it('renders link to detailed system health page', () => {
      renderWithProviders(<Dashboard />);
      
      const detailsButton = screen.getByText('جزئیات بیشتر');
      expect(detailsButton.closest('a')).toHaveAttribute('href', '/system-health');
    });
  });

  describe('Quick Actions Section', () => {
    it('renders all quick action cards', () => {
      renderWithProviders(<Dashboard />);
      
      expect(screen.getByText('عملیات سریع')).toBeInTheDocument();
      expect(screen.getByText('مدیریت تنانت‌ها')).toBeInTheDocument();
      expect(screen.getByText('آنالیتیکس پلتفرم')).toBeInTheDocument();
      expect(screen.getByText('سلامت سیستم')).toBeInTheDocument();
      expect(screen.getByText('پشتیبان‌گیری و بازیابی')).toBeInTheDocument();
      expect(screen.getByText('جایگزینی کاربر')).toBeInTheDocument();
      expect(screen.getByText('مدیریت خطاها')).toBeInTheDocument();
    });

    it('shows badge for pending payment tenants', () => {
      renderWithProviders(<Dashboard />);
      
      expect(screen.getByText('5 در انتظار')).toBeInTheDocument();
    });

    it('has correct navigation links for quick actions', () => {
      renderWithProviders(<Dashboard />);
      
      const tenantManagementCard = screen.getByText('مدیریت تنانت‌ها').closest('a');
      expect(tenantManagementCard).toHaveAttribute('href', '/tenants');
      
      const analyticsCard = screen.getByText('آنالیتیکس پلتفرم').closest('a');
      expect(analyticsCard).toHaveAttribute('href', '/analytics');
      
      const backupCard = screen.getByText('پشتیبان‌گیری و بازیابی').closest('a');
      expect(backupCard).toHaveAttribute('href', '/backup-recovery');
    });
  });

  describe('Detailed Layout Features', () => {
    it('shows analytics overview in detailed layout', () => {
      renderWithProviders(<Dashboard />);
      
      // Open personalization panel
      const personalizationButton = screen.getByText('شخصی‌سازی');
      fireEvent.click(personalizationButton);
      
      // Switch to detailed layout
      const detailedButton = screen.getByText('چیدمان تفصیلی');
      fireEvent.click(detailedButton);
      
      expect(screen.getByText('ثبت‌نام‌های اخیر')).toBeInTheDocument();
      expect(screen.getByText('روند درآمد')).toBeInTheDocument();
      expect(screen.getByText('فعالیت کاربران')).toBeInTheDocument();
    });

    it('hides secondary stats in compact layout', () => {
      renderWithProviders(<Dashboard />);
      
      // Open personalization panel
      const personalizationButton = screen.getByText('شخصی‌سازی');
      fireEvent.click(personalizationButton);
      
      // Switch to compact layout
      const compactButton = screen.getByText('چیدمان فشرده');
      fireEvent.click(compactButton);
      
      // Secondary stats should not be visible in compact layout
      expect(screen.queryByText('اشتراک رایگان')).not.toBeInTheDocument();
      expect(screen.queryByText('اشتراک حرفه‌ای')).not.toBeInTheDocument();
    });
  });

  describe('Widget Integration', () => {
    it('renders WhoIsOnlineWidget', () => {
      renderWithProviders(<Dashboard />);
      
      expect(screen.getByTestId('who-is-online-widget')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('shows error state when dashboard stats fail to load', () => {
      mockUseDashboardStats.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to fetch'),
        refetch: vi.fn(),
      } as any);

      renderWithProviders(<Dashboard />);
      
      expect(screen.getByText('خطا در دریافت اطلاعات')).toBeInTheDocument();
      expect(screen.getByText('امکان دریافت آمار داشبورد وجود ندارد')).toBeInTheDocument();
      expect(screen.getByText('تلاش مجدد')).toBeInTheDocument();
    });

    it('allows retry when error occurs', () => {
      const mockReload = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true,
      });

      mockUseDashboardStats.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to fetch'),
        refetch: vi.fn(),
      } as any);

      renderWithProviders(<Dashboard />);
      
      const retryButton = screen.getByText('تلاش مجدد');
      fireEvent.click(retryButton);
      
      expect(mockReload).toHaveBeenCalled();
    });
  });

  describe('Responsive Design', () => {
    it('applies correct grid classes for different layouts', () => {
      renderWithProviders(<Dashboard />);
      
      const statsGrid = document.querySelector('.grid');
      expect(statsGrid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-4');
    });

    it('adjusts header layout for mobile and desktop', () => {
      renderWithProviders(<Dashboard />);
      
      const headerContainer = document.querySelector('.flex.flex-col.lg\\:flex-row');
      expect(headerContainer).toHaveClass('lg:items-center', 'lg:justify-between');
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      renderWithProviders(<Dashboard />);
      
      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toHaveTextContent('خوش آمدید به پلتفرم HesaabPlus');
    });

    it('has accessible button labels', () => {
      renderWithProviders(<Dashboard />);
      
      const personalizationButton = screen.getByRole('button', { name: /شخصی‌سازی/ });
      expect(personalizationButton).toBeInTheDocument();
      
      const refreshButton = screen.getByRole('button', { name: /بروزرسانی/ });
      expect(refreshButton).toBeInTheDocument();
    });

    it('has proper link navigation', () => {
      renderWithProviders(<Dashboard />);
      
      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThan(0);
      
      // Check that important links have proper href attributes
      const tenantLink = screen.getByText('مدیریت تنانت‌ها').closest('a');
      expect(tenantLink).toHaveAttribute('href', '/tenants');
    });
  });

  describe('Performance', () => {
    it('renders without performance issues', async () => {
      const startTime = performance.now();
      renderWithProviders(<Dashboard />);
      const endTime = performance.now();
      
      // Rendering should complete within reasonable time (100ms)
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('handles large datasets efficiently', () => {
      const largeMockData = {
        ...mockDashboardData,
        total_tenants: 10000,
        total_users: 50000,
        total_invoices_this_month: 100000,
      };

      mockUseDashboardStats.mockReturnValue({
        data: largeMockData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      renderWithProviders(<Dashboard />);
      
      expect(screen.getByText('10000')).toBeInTheDocument();
      expect(screen.getByText('50000')).toBeInTheDocument();
      expect(screen.getByText('100000')).toBeInTheDocument();
    });
  });
});