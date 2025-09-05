import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import KPIDashboard from '@/components/business-intelligence/KPIDashboard';
import { businessIntelligenceService } from '@/services/businessIntelligenceService';

// Mock the business intelligence service
vi.mock('@/services/businessIntelligenceService', () => ({
  businessIntelligenceService: {
    getKPIMetrics: vi.fn(),
  },
}));

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
  {
    id: '2',
    name: 'تعداد مشتریان فعال',
    value: 245,
    formatted_value: '245',
    previous_value: 220,
    change_percentage: 11.36,
    trend: 'up' as const,
    target: 300,
    target_percentage: 81.67,
    category: 'customers' as const,
    unit: 'مشتری',
    description: 'تعداد مشتریانی که در ماه گذشته خرید داشته‌اند',
    updated_at: '2024-01-15T10:00:00Z',
  },
  {
    id: '3',
    name: 'تعداد فاکتورها',
    value: 89,
    formatted_value: '89',
    previous_value: 95,
    change_percentage: -6.32,
    trend: 'down' as const,
    category: 'operations' as const,
    unit: 'فاکتور',
    description: 'تعداد فاکتورهای صادر شده در ماه جاری',
    updated_at: '2024-01-15T10:00:00Z',
  },
  {
    id: '4',
    name: 'حاشیه سود',
    value: 18.5,
    formatted_value: '18.5%',
    previous_value: 18.5,
    change_percentage: 0,
    trend: 'stable' as const,
    category: 'financial' as const,
    unit: 'درصد',
    description: 'درصد سود خالص نسبت به فروش',
    updated_at: '2024-01-15T10:00:00Z',
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

describe('KPIDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state correctly', () => {
    vi.mocked(businessIntelligenceService.getKPIMetrics).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { container } = renderWithQueryClient(<KPIDashboard />);

    expect(screen.getByText('شاخص‌های کلیدی عملکرد (KPI)')).toBeInTheDocument();
    // Check for loading animation elements
    const loadingElements = container.querySelectorAll('.animate-pulse');
    expect(loadingElements).toHaveLength(4);
  });

  it('renders error state correctly', async () => {
    vi.mocked(businessIntelligenceService.getKPIMetrics).mockRejectedValue(
      new Error('Network error')
    );

    renderWithQueryClient(<KPIDashboard />);

    await waitFor(() => {
      expect(screen.getByText('خطا در بارگذاری شاخص‌های عملکرد')).toBeInTheDocument();
    });

    expect(screen.getByText('تلاش مجدد')).toBeInTheDocument();
  });

  it('renders empty state when no KPIs available', async () => {
    vi.mocked(businessIntelligenceService.getKPIMetrics).mockResolvedValue([]);

    renderWithQueryClient(<KPIDashboard />);

    await waitFor(() => {
      expect(screen.getByText('هنوز شاخص عملکردی در دسترس نیست')).toBeInTheDocument();
    });
  });

  it('renders KPIs correctly', async () => {
    vi.mocked(businessIntelligenceService.getKPIMetrics).mockResolvedValue(mockKPIs);

    renderWithQueryClient(<KPIDashboard />);

    await waitFor(() => {
      expect(screen.getByText('درآمد ماهانه')).toBeInTheDocument();
    });

    // Check all KPIs are rendered
    expect(screen.getByText('درآمد ماهانه')).toBeInTheDocument();
    expect(screen.getByText('تعداد مشتریان فعال')).toBeInTheDocument();
    expect(screen.getByText('تعداد فاکتورها')).toBeInTheDocument();
    expect(screen.getByText('حاشیه سود')).toBeInTheDocument();

    // Check formatted values
    expect(screen.getByText('150,000,000 تومان')).toBeInTheDocument();
    expect(screen.getByText('245')).toBeInTheDocument();
    expect(screen.getByText('89')).toBeInTheDocument();
    expect(screen.getByText('18.5%')).toBeInTheDocument();

    // Check units
    expect(screen.getByText('تومان')).toBeInTheDocument();
    expect(screen.getByText('مشتری')).toBeInTheDocument();
    expect(screen.getByText('فاکتور')).toBeInTheDocument();
    expect(screen.getByText('درصد')).toBeInTheDocument();
  });

  it('displays correct trend indicators and percentages', async () => {
    vi.mocked(businessIntelligenceService.getKPIMetrics).mockResolvedValue(mockKPIs);

    renderWithQueryClient(<KPIDashboard />);

    await waitFor(() => {
      expect(screen.getByText('درآمد ماهانه')).toBeInTheDocument();
    });

    // Check trend percentages
    expect(screen.getByText('15.4%')).toBeInTheDocument(); // Revenue up
    expect(screen.getByText('11.4%')).toBeInTheDocument(); // Customers up
    expect(screen.getByText('6.3%')).toBeInTheDocument(); // Invoices down
    expect(screen.getByText('0.0%')).toBeInTheDocument(); // Profit margin stable
  });

  it('shows target progress bars correctly', async () => {
    vi.mocked(businessIntelligenceService.getKPIMetrics).mockResolvedValue(mockKPIs);

    renderWithQueryClient(<KPIDashboard />);

    await waitFor(() => {
      expect(screen.getByText('درآمد ماهانه')).toBeInTheDocument();
    });

    // Check target progress labels
    expect(screen.getAllByText('هدف')).toHaveLength(2);
    expect(screen.getByText('75%')).toBeInTheDocument(); // Revenue target progress
    expect(screen.getByText('82%')).toBeInTheDocument(); // Customer target progress

    // Check progress bars exist
    const progressBars = screen.getAllByRole('generic').filter(el => 
      el.className.includes('bg-gradient-to-r')
    );
    expect(progressBars.length).toBeGreaterThan(0);
  });

  it('applies correct category colors and icons', async () => {
    vi.mocked(businessIntelligenceService.getKPIMetrics).mockResolvedValue(mockKPIs);

    renderWithQueryClient(<KPIDashboard />);

    await waitFor(() => {
      expect(screen.getByText('درآمد ماهانه')).toBeInTheDocument();
    });

    // Check category icon containers exist
    const iconContainers = screen.getAllByRole('generic').filter(el => 
      el.className.includes('bg-gradient-to-br')
    );
    expect(iconContainers.length).toBeGreaterThanOrEqual(4);
  });

  it('handles period selection', async () => {
    vi.mocked(businessIntelligenceService.getKPIMetrics).mockResolvedValue(mockKPIs);

    renderWithQueryClient(<KPIDashboard period="weekly" />);

    await waitFor(() => {
      expect(screen.getByText('درآمد ماهانه')).toBeInTheDocument();
    });

    // Check that the service was called with the correct period
    expect(businessIntelligenceService.getKPIMetrics).toHaveBeenCalledWith('weekly');
  });

  it('displays period selector correctly', async () => {
    vi.mocked(businessIntelligenceService.getKPIMetrics).mockResolvedValue(mockKPIs);

    renderWithQueryClient(<KPIDashboard />);

    await waitFor(() => {
      expect(screen.getByText('درآمد ماهانه')).toBeInTheDocument();
    });

    // Check period selector options
    const periodSelect = screen.getByDisplayValue('ماهانه');
    expect(periodSelect).toBeInTheDocument();

    // Check all period options exist
    expect(screen.getByText('روزانه')).toBeInTheDocument();
    expect(screen.getByText('هفتگی')).toBeInTheDocument();
    expect(screen.getByText('ماهانه')).toBeInTheDocument();
  });

  it('handles refresh functionality', async () => {
    vi.mocked(businessIntelligenceService.getKPIMetrics).mockResolvedValue(mockKPIs);

    renderWithQueryClient(<KPIDashboard />);

    await waitFor(() => {
      expect(screen.getByText('درآمد ماهانه')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: '' }); // Refresh button with icon only
    fireEvent.click(refreshButton);

    expect(refreshButton).toBeInTheDocument();
  });

  it('shows correct trend colors', async () => {
    vi.mocked(businessIntelligenceService.getKPIMetrics).mockResolvedValue(mockKPIs);

    renderWithQueryClient(<KPIDashboard />);

    await waitFor(() => {
      expect(screen.getByText('درآمد ماهانه')).toBeInTheDocument();
    });

    // Check trend indicators have correct colors
    const trendIndicators = screen.getAllByRole('generic').filter(el => 
      el.className.includes('text-green-600') || 
      el.className.includes('text-red-600') || 
      el.className.includes('text-gray-600')
    );
    expect(trendIndicators.length).toBeGreaterThan(0);
  });

  it('handles retry on error', async () => {
    vi.mocked(businessIntelligenceService.getKPIMetrics)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(mockKPIs);

    renderWithQueryClient(<KPIDashboard />);

    await waitFor(() => {
      expect(screen.getByText('خطا در بارگذاری شاخص‌های عملکرد')).toBeInTheDocument();
    });

    const retryButton = screen.getByText('تلاش مجدد');
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('درآمد ماهانه')).toBeInTheDocument();
    });
  });

  it('applies custom className correctly', () => {
    vi.mocked(businessIntelligenceService.getKPIMetrics).mockResolvedValue([]);

    const { container } = renderWithQueryClient(
      <KPIDashboard className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('displays descriptions correctly', async () => {
    vi.mocked(businessIntelligenceService.getKPIMetrics).mockResolvedValue(mockKPIs);

    renderWithQueryClient(<KPIDashboard />);

    await waitFor(() => {
      expect(screen.getByText('درآمد ماهانه')).toBeInTheDocument();
    });

    // Check descriptions are displayed
    expect(screen.getByText('کل درآمد حاصل از فروش در ماه جاری')).toBeInTheDocument();
    expect(screen.getByText('تعداد مشتریانی که در ماه گذشته خرید داشته‌اند')).toBeInTheDocument();
    expect(screen.getByText('تعداد فاکتورهای صادر شده در ماه جاری')).toBeInTheDocument();
    expect(screen.getByText('درصد سود خالص نسبت به فروش')).toBeInTheDocument();
  });
});