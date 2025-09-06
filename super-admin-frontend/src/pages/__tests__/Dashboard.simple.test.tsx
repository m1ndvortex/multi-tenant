import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Dashboard from '../Dashboard';

// Mock all the hooks to return simple data
vi.mock('@/hooks/useDashboardStats', () => ({
  useDashboardStats: () => ({
    data: {
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
        database_status: 'healthy',
        redis_status: 'healthy',
        celery_status: 'warning',
      },
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })
}));

vi.mock('@/hooks/useAnalytics', () => ({
  usePlatformMetrics: () => ({
    data: {
      signups: [12, 15, 8, 22, 18, 25, 30],
      revenue: [1200, 1350, 1100, 1800, 1650, 2100, 2400],
      activity: [85, 92, 78, 95, 88, 96, 91]
    },
    isLoading: false,
    error: null,
  })
}));

// Mock components
vi.mock('@/components/WhoIsOnlineWidget', () => ({
  default: () => <div data-testid="who-is-online-widget">Who is Online Widget</div>
}));

vi.mock('@/components/RealTimeSystemHealth', () => ({
  default: () => <div data-testid="real-time-system-health">Real Time System Health</div>
}));

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

describe('Dashboard Component - Core Functionality', () => {
  it('renders dashboard header with welcome message', () => {
    renderWithProviders(<Dashboard />);
    
    expect(screen.getByText('خوش آمدید به پلتفرم HesaabPlus')).toBeInTheDocument();
    expect(screen.getByText('مدیریت و نظارت بر تمامی عملیات سیستم حسابداری')).toBeInTheDocument();
  });

  it('renders main statistics cards with correct data', () => {
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

  it('renders personalization controls', () => {
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

  it('renders system health information', () => {
    renderWithProviders(<Dashboard />);
    
    expect(screen.getAllByText('سلامت سیستم')).toHaveLength(2); // One in system health section, one in quick actions
    expect(screen.getByText('CPU Usage')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
    expect(screen.getByText('Memory Usage')).toBeInTheDocument();
    expect(screen.getByText('62%')).toBeInTheDocument();
  });

  it('renders quick actions section', () => {
    renderWithProviders(<Dashboard />);
    
    expect(screen.getByText('عملیات سریع')).toBeInTheDocument();
    expect(screen.getByText('مدیریت تنانت‌ها')).toBeInTheDocument();
    expect(screen.getByText('آنالیتیکس پلتفرم')).toBeInTheDocument();
    expect(screen.getAllByText('سلامت سیستم')).toHaveLength(2); // One in system health section, one in quick actions
    expect(screen.getByText('پشتیبان‌گیری و بازیابی')).toBeInTheDocument();
    expect(screen.getByText('جایگزینی کاربر')).toBeInTheDocument();
    expect(screen.getByText('مدیریت خطاها')).toBeInTheDocument();
  });

  it('renders WhoIsOnlineWidget', () => {
    renderWithProviders(<Dashboard />);
    
    expect(screen.getByTestId('who-is-online-widget')).toBeInTheDocument();
  });

  it('has correct navigation links', () => {
    renderWithProviders(<Dashboard />);
    
    const tenantManagementCard = screen.getByText('مدیریت تنانت‌ها').closest('a');
    expect(tenantManagementCard).toHaveAttribute('href', '/tenants');
    
    const analyticsCard = screen.getByText('آنالیتیکس پلتفرم').closest('a');
    expect(analyticsCard).toHaveAttribute('href', '/analytics');
    
    const backupCard = screen.getByText('پشتیبان‌گیری و بازیابی').closest('a');
    expect(backupCard).toHaveAttribute('href', '/backup-recovery');
  });

  it('shows badge for pending payment tenants', () => {
    renderWithProviders(<Dashboard />);
    
    expect(screen.getByText('5 در انتظار')).toBeInTheDocument();
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
    // Find the stats grid specifically (not the personalization grid)
    const statsGrids = document.querySelectorAll('.grid');
    const statsGrid = Array.from(statsGrids).find(grid => 
      grid.classList.contains('lg:grid-cols-6') || grid.classList.contains('lg:grid-cols-4')
    );
    expect(statsGrid).toHaveClass('lg:grid-cols-6');
  });

  it('shows detailed analytics in detailed layout', () => {
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
});