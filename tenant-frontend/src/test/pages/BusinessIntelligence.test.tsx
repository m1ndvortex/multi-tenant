import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import BusinessIntelligence from '@/pages/BusinessIntelligence';
import { businessIntelligenceService } from '@/services/businessIntelligenceService';

// Mock all the business intelligence service methods
vi.mock('@/services/businessIntelligenceService', () => ({
  businessIntelligenceService: {
    getBusinessInsights: vi.fn(),
    getKPIMetrics: vi.fn(),
    getBusinessAlerts: vi.fn(),
    getScheduledReports: vi.fn(),
    markAlertAsRead: vi.fn(),
    resolveAlert: vi.fn(),
    createScheduledReport: vi.fn(),
    updateScheduledReport: vi.fn(),
    deleteScheduledReport: vi.fn(),
    toggleScheduledReport: vi.fn(),
    runScheduledReportNow: vi.fn(),
  },
}));

// Mock the toast hook
vi.mock('@/components/ui/use-toast', () => ({
  toast: vi.fn(),
}));

const mockInsights = [
  {
    id: '1',
    type: 'positive' as const,
    title: 'رشد فروش',
    description: 'فروش شما در ماه گذشته 15% افزایش یافته است',
    value: '15%',
    trend: 'up' as const,
    priority: 'high' as const,
    actionable: true,
    action_text: 'مشاهده جزئیات',
  },
];

const mockKPIs = [
  {
    id: '1',
    name: 'درآمد ماهانه',
    value: 150000000,
    formatted_value: '150,000,000 تومان',
    previous_value: 130000000,
    change_percentage: 15.38,
    trend: 'up' as const,
    target: 200000000,
    target_percentage: 75,
    category: 'revenue' as const,
    unit: 'تومان',
    description: 'کل درآمد حاصل از فروش در ماه جاری',
    updated_at: '2024-01-15T10:00:00Z',
  },
];

const mockAlerts = [
  {
    id: '1',
    type: 'overdue_payment' as const,
    severity: 'high' as const,
    title: 'پرداخت معوقه',
    description: 'فاکتور شماره 1001 از تاریخ سررسید گذشته است',
    entity_type: 'invoice' as const,
    entity_id: 'inv-1001',
    entity_name: 'فاکتور 1001 - احمد محمدی',
    amount: 5000000,
    due_date: '2024-01-10',
    created_at: '2024-01-15T10:00:00Z',
    is_read: false,
    is_resolved: false,
    actionable: true,
    action_url: '/invoices/inv-1001',
    action_text: 'مشاهده فاکتور',
  },
];

const mockScheduledReports = [
  {
    id: '1',
    name: 'گزارش فروش هفتگی',
    report_type: 'sales-trend' as const,
    schedule_type: 'weekly' as const,
    schedule_time: '09:00',
    schedule_day: 1,
    export_format: 'pdf' as const,
    email_recipients: ['manager@example.com'],
    is_active: true,
    last_run_at: '2024-01-14T09:00:00Z',
    next_run_at: '2024-01-21T09:00:00Z',
    created_at: '2024-01-01T10:00:00Z',
    parameters: {},
  },
];

const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
};

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('BusinessIntelligence Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up default mock responses
    vi.mocked(businessIntelligenceService.getBusinessInsights).mockResolvedValue(mockInsights);
    vi.mocked(businessIntelligenceService.getKPIMetrics).mockResolvedValue(mockKPIs);
    vi.mocked(businessIntelligenceService.getBusinessAlerts).mockResolvedValue(mockAlerts);
    vi.mocked(businessIntelligenceService.getScheduledReports).mockResolvedValue(mockScheduledReports);
  });

  it('renders page header correctly', () => {
    renderWithQueryClient(<BusinessIntelligence />);

    expect(screen.getByText('هوش تجاری')).toBeInTheDocument();
    expect(screen.getByText('تحلیل‌های هوشمند، شاخص‌های عملکرد و هشدارهای کسب‌وکار')).toBeInTheDocument();
    expect(screen.getByText('بروزرسانی همه')).toBeInTheDocument();
  });

  it('renders all tab triggers correctly', () => {
    renderWithQueryClient(<BusinessIntelligence />);

    expect(screen.getByText('تحلیل‌های هوشمند')).toBeInTheDocument();
    expect(screen.getByText('شاخص‌های عملکرد')).toBeInTheDocument();
    expect(screen.getByText('هشدارها و اعلان‌ها')).toBeInTheDocument();
    expect(screen.getByText('زمان‌بندی گزارشات')).toBeInTheDocument();
  });

  it('displays insights tab content by default', async () => {
    renderWithQueryClient(<BusinessIntelligence />);

    await waitFor(() => {
      expect(screen.getByText('رشد فروش')).toBeInTheDocument();
    });

    // Should show business insights widget
    expect(screen.getByText('تحلیل‌های هوشمند کسب‌وکار')).toBeInTheDocument();
    
    // Should show quick KPI overview
    expect(screen.getByText('خلاصه شاخص‌های کلیدی')).toBeInTheDocument();
    expect(screen.getByText('+12.5%')).toBeInTheDocument();
    expect(screen.getByText('رشد درآمد')).toBeInTheDocument();
    
    // Should show recent alerts preview
    expect(screen.getByText('پرداخت معوقه')).toBeInTheDocument();
  });

  it('switches to KPIs tab correctly', async () => {
    renderWithQueryClient(<BusinessIntelligence />);

    // Click KPIs tab
    const kpisTab = screen.getByText('شاخص‌های عملکرد');
    fireEvent.click(kpisTab);

    await waitFor(() => {
      expect(screen.getByText('شاخص‌های کلیدی عملکرد')).toBeInTheDocument();
    });

    // Should show KPI dashboard
    expect(screen.getByText('درآمد ماهانه')).toBeInTheDocument();
    expect(screen.getByText('150,000,000 تومان')).toBeInTheDocument();
  });

  it('handles KPI period selection', async () => {
    renderWithQueryClient(<BusinessIntelligence />);

    // Click KPIs tab
    const kpisTab = screen.getByText('شاخص‌های عملکرد');
    fireEvent.click(kpisTab);

    await waitFor(() => {
      expect(screen.getByText('شاخص‌های کلیدی عملکرد')).toBeInTheDocument();
    });

    // Change period to weekly
    const weeklyButton = screen.getByText('هفتگی');
    fireEvent.click(weeklyButton);

    // Should call service with new period
    await waitFor(() => {
      expect(businessIntelligenceService.getKPIMetrics).toHaveBeenCalledWith('weekly');
    });
  });

  it('switches to alerts tab correctly', async () => {
    renderWithQueryClient(<BusinessIntelligence />);

    // Click alerts tab
    const alertsTab = screen.getByText('هشدارها و اعلان‌ها');
    fireEvent.click(alertsTab);

    await waitFor(() => {
      expect(screen.getByText('فاکتور شماره 1001 از تاریخ سررسید گذشته است')).toBeInTheDocument();
    });

    // Should show alert system interface with filters
    expect(screen.getByText('فیلترها')).toBeInTheDocument();
  });

  it('switches to scheduling tab correctly', async () => {
    renderWithQueryClient(<BusinessIntelligence />);

    // Click scheduling tab
    const schedulingTab = screen.getByText('زمان‌بندی گزارشات');
    fireEvent.click(schedulingTab);

    await waitFor(() => {
      expect(screen.getByText('گزارش فروش هفتگی')).toBeInTheDocument();
    });

    // Should show report scheduling interface
    expect(screen.getByText('زمان‌بندی و خودکارسازی گزارشات')).toBeInTheDocument();
  });

  it('handles refresh all functionality', () => {
    // Mock window.location.reload
    const mockReload = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true,
    });

    renderWithQueryClient(<BusinessIntelligence />);

    const refreshButton = screen.getByText('بروزرسانی همه');
    fireEvent.click(refreshButton);

    expect(mockReload).toHaveBeenCalled();
  });

  it('applies correct gradient background', () => {
    const { container } = renderWithQueryClient(<BusinessIntelligence />);

    expect(container.firstChild).toHaveClass('bg-gradient-to-br', 'from-purple-50/30', 'to-white');
  });

  it('displays correct tab styling when active', async () => {
    renderWithQueryClient(<BusinessIntelligence />);

    // Default tab should be active
    const insightsTab = screen.getByText('تحلیل‌های هوشمند');
    expect(insightsTab.closest('[data-state="active"]')).toBeInTheDocument();

    // Click KPIs tab
    const kpisTab = screen.getByText('شاخص‌های عملکرد');
    fireEvent.click(kpisTab);

    await waitFor(() => {
      expect(kpisTab.closest('[data-state="active"]')).toBeInTheDocument();
    });
  });

  it('handles loading states correctly', () => {
    // Mock services to never resolve
    vi.mocked(businessIntelligenceService.getBusinessInsights).mockImplementation(
      () => new Promise(() => {})
    );
    vi.mocked(businessIntelligenceService.getKPIMetrics).mockImplementation(
      () => new Promise(() => {})
    );
    vi.mocked(businessIntelligenceService.getBusinessAlerts).mockImplementation(
      () => new Promise(() => {})
    );

    renderWithQueryClient(<BusinessIntelligence />);

    // Should show loading states
    expect(screen.getAllByRole('status')).toHaveLength(3); // Loading skeletons
  });

  it('handles error states correctly', async () => {
    vi.mocked(businessIntelligenceService.getBusinessInsights).mockRejectedValue(
      new Error('Network error')
    );

    renderWithQueryClient(<BusinessIntelligence />);

    await waitFor(() => {
      expect(screen.getByText('خطا در بارگذاری تحلیل‌های هوشمند')).toBeInTheDocument();
    });
  });

  it('displays correct icons for each tab', () => {
    renderWithQueryClient(<BusinessIntelligence />);

    // Check that icons are present (we can't easily test specific icons, but we can check they exist)
    const tabList = screen.getByRole('tablist');
    const icons = tabList.querySelectorAll('svg');
    expect(icons).toHaveLength(4); // One icon per tab
  });

  it('maintains tab state when switching between tabs', async () => {
    renderWithQueryClient(<BusinessIntelligence />);

    // Start on insights tab
    await waitFor(() => {
      expect(screen.getByText('رشد فروش')).toBeInTheDocument();
    });

    // Switch to KPIs tab
    const kpisTab = screen.getByText('شاخص‌های عملکرد');
    fireEvent.click(kpisTab);

    await waitFor(() => {
      expect(screen.getByText('درآمد ماهانه')).toBeInTheDocument();
    });

    // Switch back to insights tab
    const insightsTab = screen.getByText('تحلیل‌های هوشمند');
    fireEvent.click(insightsTab);

    await waitFor(() => {
      expect(screen.getByText('رشد فروش')).toBeInTheDocument();
    });
  });

  it('displays quick KPI overview with correct values', async () => {
    renderWithQueryClient(<BusinessIntelligence />);

    await waitFor(() => {
      expect(screen.getByText('خلاصه شاخص‌های کلیدی')).toBeInTheDocument();
    });

    // Check hardcoded KPI values in the overview
    expect(screen.getByText('+12.5%')).toBeInTheDocument();
    expect(screen.getByText('رشد درآمد')).toBeInTheDocument();
    expect(screen.getByText('+8.3%')).toBeInTheDocument();
    expect(screen.getByText('رشد مشتریان')).toBeInTheDocument();
    expect(screen.getByText('94.2%')).toBeInTheDocument();
    expect(screen.getByText('رضایت مشتریان')).toBeInTheDocument();
    expect(screen.getByText('15.7%')).toBeInTheDocument();
    expect(screen.getByText('حاشیه سود')).toBeInTheDocument();
  });

  it('shows correct layout for different screen sizes', () => {
    renderWithQueryClient(<BusinessIntelligence />);

    // Check responsive grid classes
    const gridContainer = screen.getByRole('main').querySelector('.grid');
    expect(gridContainer).toHaveClass('grid-cols-1', 'lg:grid-cols-2');
  });
});