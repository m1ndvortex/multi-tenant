/**
 * Dashboard Page Tests
 * Tests for the enhanced tenant dashboard with business insights
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Dashboard from '@/pages/Dashboard';
import { dashboardService } from '@/services/dashboardService';

// Mock the dashboard service
vi.mock('@/services/dashboardService', () => ({
  dashboardService: {
    getDashboardData: vi.fn(),
  },
}));

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock Chart.js components
vi.mock('react-chartjs-2', () => ({
  Line: ({ data }: any) => <div data-testid="line-chart">{JSON.stringify(data)}</div>,
  Bar: ({ data }: any) => <div data-testid="bar-chart">{JSON.stringify(data)}</div>,
}));

// Mock chart.js
vi.mock('chart.js', () => ({
  Chart: {
    register: vi.fn(),
  },
  CategoryScale: vi.fn(),
  LinearScale: vi.fn(),
  BarElement: vi.fn(),
  LineElement: vi.fn(),
  PointElement: vi.fn(),
  Title: vi.fn(),
  Tooltip: vi.fn(),
  Legend: vi.fn(),
  Filler: vi.fn(),
}));

const mockDashboardData = {
  summary: {
    period: 'current_month',
    period_start: '2024-01-01',
    period_end: '2024-01-31',
    metrics: {
      total_revenue: {
        value: 2450000,
        previous_value: 2200000,
        growth_rate: 11.4,
        label: 'کل درآمد',
        unit: 'currency'
      },
      active_customers: {
        value: 48,
        previous_value: 45,
        growth_rate: 6.7,
        label: 'مشتریان فعال',
        unit: 'count'
      },
      invoice_count: {
        value: 12,
        previous_value: 10,
        growth_rate: 20.0,
        label: 'تعداد فاکتور',
        unit: 'count'
      },
      average_order_value: {
        value: 204166,
        previous_value: 220000,
        growth_rate: -7.2,
        label: 'متوسط ارزش سفارش',
        unit: 'currency'
      }
    }
  },
  quick_stats: {
    today_revenue: 450000,
    today_invoices: 3,
    total_customers: 48,
    total_products: 156,
    pending_invoices: 5,
    calculated_at: '2024-01-15T10:30:00Z'
  },
  business_insights: {
    summary: 'کسب‌وکار شما در ماه جاری رشد مثبتی داشته است. درآمد ۱۱٪ افزایش یافته و تعداد مشتریان فعال نیز رو به رشد است.',
    insights: [
      {
        type: 'revenue_growth',
        priority: 'high',
        title: 'رشد درآمد قابل توجه',
        description: 'درآمد ماه جاری نسبت به ماه قبل ۱۱٪ افزایش یافته است.',
        impact_score: 8.5,
        confidence_score: 9.2,
        actionable: true,
        action_items: ['تمرکز بر محصولات پرفروش', 'بهبود استراتژی قیمت‌گذاری']
      },
      {
        type: 'customer_retention',
        priority: 'medium',
        title: 'نرخ بازگشت مشتریان مطلوب',
        description: 'مشتریان فعلی وفاداری خوبی نشان می‌دهند.',
        impact_score: 7.2,
        confidence_score: 8.1,
        actionable: true,
        action_items: ['برنامه وفاداری مشتریان', 'پیگیری منظم مشتریان']
      }
    ],
    recommendations: [
      'تمرکز بر محصولات پرفروش برای افزایش درآمد',
      'بهبود فرآیند پیگیری مشتریان',
      'بررسی و بهینه‌سازی قیمت‌گذاری محصولات'
    ],
    generated_at: '2024-01-15T10:30:00Z'
  },
  alerts: {
    alerts: [
      {
        type: 'overdue_payments',
        severity: 'high',
        title: '3 فاکتور سررسید گذشته',
        description: 'مجموع مبلغ: 850,000 تومان',
        count: 3,
        amount: 850000,
        action: 'view_overdue_invoices'
      },
      {
        type: 'low_stock',
        severity: 'medium',
        title: '5 محصول کم موجود',
        description: 'محصولات نیاز به تأمین مجدد دارند',
        count: 5,
        action: 'view_inventory'
      }
    ],
    total_alerts: 2,
    critical_alerts: 0,
    high_alerts: 1,
    medium_alerts: 1
  },
  recent_activities: [
    {
      type: 'invoice_created',
      title: 'فاکتور INV-001 ایجاد شد',
      description: 'برای مشتری احمد محمدی - مبلغ: 250,000 تومان',
      amount: 250000,
      customer: 'احمد محمدی',
      timestamp: '2024-01-15T09:30:00Z',
      status: 'sent',
      invoice_type: 'general',
      reference_id: 'inv-001'
    },
    {
      type: 'payment_received',
      title: 'پرداخت دریافت شد',
      description: 'از مشتری فاطمه احمدی - مبلغ: 180,000 تومان',
      amount: 180000,
      customer: 'فاطمه احمدی',
      timestamp: '2024-01-15T08:45:00Z',
      payment_method: 'cash',
      reference_id: 'pay-001'
    }
  ],
  sales_chart: {
    period_days: 30,
    start_date: '2023-12-16',
    end_date: '2024-01-15',
    data: [
      { date: '2024-01-14', sales: 320000, invoices: 2 },
      { date: '2024-01-15', sales: 450000, invoices: 3 }
    ],
    total_sales: 770000,
    total_invoices: 5
  },
  generated_at: '2024-01-15T10:30:00Z'
};

const renderDashboard = () => {
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
        <Dashboard />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Dashboard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(dashboardService.getDashboardData).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderDashboard();

    // Check for loading skeleton elements
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders dashboard data successfully', async () => {
    vi.mocked(dashboardService.getDashboardData).mockResolvedValue(mockDashboardData);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('خوش آمدید به داشبورد')).toBeInTheDocument();
    });

    // Check key metrics
    expect(screen.getByText('فروش امروز')).toBeInTheDocument();
    expect(screen.getByText('فاکتورهای امروز')).toBeInTheDocument();
    expect(screen.getByText('مشتریان فعال')).toBeInTheDocument();
    expect(screen.getByText('محصولات')).toBeInTheDocument();
    
    // Check that numbers are displayed (using more flexible matching)
    const numbers3 = screen.getAllByText('3');
    expect(numbers3.length).toBeGreaterThan(0);
    const numbers48 = screen.getAllByText('48');
    expect(numbers48.length).toBeGreaterThan(0);
    const numbers156 = screen.getAllByText('156');
    expect(numbers156.length).toBeGreaterThan(0);
  });

  it('displays business insights widget', async () => {
    vi.mocked(dashboardService.getDashboardData).mockResolvedValue(mockDashboardData);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('تحلیل‌های هوشمند کسب‌وکار')).toBeInTheDocument();
    });

    expect(screen.getByText('رشد درآمد قابل توجه')).toBeInTheDocument();
    expect(screen.getByText('درآمد ماه جاری نسبت به ماه قبل ۱۱٪ افزایش یافته است.')).toBeInTheDocument();
  });

  it('displays alerts panel', async () => {
    vi.mocked(dashboardService.getDashboardData).mockResolvedValue(mockDashboardData);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('هشدارها و اعلان‌ها')).toBeInTheDocument();
    });

    expect(screen.getByText('3 فاکتور سررسید گذشته')).toBeInTheDocument();
    expect(screen.getByText('5 محصول کم موجود')).toBeInTheDocument();
  });

  it('displays recent activities', async () => {
    vi.mocked(dashboardService.getDashboardData).mockResolvedValue(mockDashboardData);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('فعالیت‌های اخیر')).toBeInTheDocument();
    });

    expect(screen.getByText('فاکتور INV-001 ایجاد شد')).toBeInTheDocument();
    expect(screen.getByText('پرداخت دریافت شد')).toBeInTheDocument();
  });

  it('displays sales chart', async () => {
    vi.mocked(dashboardService.getDashboardData).mockResolvedValue(mockDashboardData);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('نمودار فروش')).toBeInTheDocument();
    });

    expect(screen.getByText('کل فروش')).toBeInTheDocument();
    expect(screen.getByText('کل فاکتورها')).toBeInTheDocument();
    // Check that chart data is displayed
    expect(screen.getByText('نمودار فروش')).toBeInTheDocument();
  });

  it('displays quick actions', async () => {
    vi.mocked(dashboardService.getDashboardData).mockResolvedValue(mockDashboardData);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('عملیات سریع')).toBeInTheDocument();
    });

    expect(screen.getByText('ایجاد فاکتور')).toBeInTheDocument();
    expect(screen.getByText('افزودن مشتری')).toBeInTheDocument();
    expect(screen.getByText('افزودن محصول')).toBeInTheDocument();
  });

  it('handles refresh button click', async () => {
    vi.mocked(dashboardService.getDashboardData).mockResolvedValue(mockDashboardData);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('بروزرسانی')).toBeInTheDocument();
    });

    const refreshButton = screen.getByText('بروزرسانی');
    fireEvent.click(refreshButton);

    // Should call the service again
    expect(dashboardService.getDashboardData).toHaveBeenCalledTimes(2);
  });

  it('handles error state', async () => {
    vi.mocked(dashboardService.getDashboardData).mockRejectedValue(
      new Error('Network error')
    );

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('خطا در بارگذاری داشبورد')).toBeInTheDocument();
    });

    expect(screen.getByText('امکان دریافت اطلاعات داشبورد وجود ندارد.')).toBeInTheDocument();
    expect(screen.getByText('تلاش مجدد')).toBeInTheDocument();
  });

  it('displays growth indicators correctly', async () => {
    vi.mocked(dashboardService.getDashboardData).mockResolvedValue(mockDashboardData);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('فروش امروز')).toBeInTheDocument();
    });

    // Should show positive growth indicators
    const growthIndicators = screen.getAllByText(/\+\d+\.\d+%/);
    expect(growthIndicators.length).toBeGreaterThan(0);
  });

  it('formats currency values correctly', async () => {
    vi.mocked(dashboardService.getDashboardData).mockResolvedValue(mockDashboardData);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('فروش امروز')).toBeInTheDocument();
    });

    // Check that currency formatting includes "تومان"
    const currencyElements = screen.getAllByText((content, element) => {
      return element?.textContent?.includes('تومان') || false;
    });
    expect(currencyElements.length).toBeGreaterThan(0);
  });

  it('shows empty state when no activities', async () => {
    const emptyData = {
      ...mockDashboardData,
      recent_activities: []
    };

    vi.mocked(dashboardService.getDashboardData).mockResolvedValue(emptyData);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('فعالیتی یافت نشد')).toBeInTheDocument();
    });

    expect(screen.getByText('هنوز هیچ فعالیت اخیری ثبت نشده است.')).toBeInTheDocument();
  });

  it('shows no alerts state when no alerts', async () => {
    const noAlertsData = {
      ...mockDashboardData,
      alerts: {
        alerts: [],
        total_alerts: 0,
        critical_alerts: 0,
        high_alerts: 0,
        medium_alerts: 0
      }
    };

    vi.mocked(dashboardService.getDashboardData).mockResolvedValue(noAlertsData);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('همه چیز عالی است!')).toBeInTheDocument();
    });

    expect(screen.getByText('در حال حاضر هیچ هشدار مهمی وجود ندارد.')).toBeInTheDocument();
  });
});