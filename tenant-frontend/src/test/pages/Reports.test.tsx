import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Reports from '@/pages/Reports';
import { reportService } from '@/services/reportService';

// Mock the report service
vi.mock('@/services/reportService', () => ({
  reportService: {
    getSalesTrend: vi.fn(),
    getProfitLoss: vi.fn(),
    getCustomerAnalytics: vi.fn(),
    getAgingReport: vi.fn(),
    exportReport: vi.fn(),
  },
}));

// Mock the chart components
vi.mock('@/components/reports/SalesTrendChart', () => ({
  default: ({ data, period, chartType }: any) => (
    <div data-testid="sales-trend-chart">
      <div data-testid="chart-period">{period}</div>
      <div data-testid="chart-type">{chartType}</div>
      <div data-testid="chart-data-length">{data?.length || 0}</div>
    </div>
  ),
}));

vi.mock('@/components/reports/ProfitLossChart', () => ({
  default: ({ data, chartType }: any) => (
    <div data-testid="profit-loss-chart">
      <div data-testid="chart-type">{chartType}</div>
      <div data-testid="chart-revenue">{data?.total_revenue || 0}</div>
    </div>
  ),
}));

vi.mock('@/components/reports/CustomerAnalyticsChart', () => ({
  default: ({ data, chartType }: any) => (
    <div data-testid="customer-analytics-chart">
      <div data-testid="chart-type">{chartType}</div>
      <div data-testid="chart-customers">{data?.total_customers || 0}</div>
    </div>
  ),
}));

vi.mock('@/components/reports/AgingReportChart', () => ({
  default: ({ data, chartType }: any) => (
    <div data-testid="aging-report-chart">
      <div data-testid="chart-type">{chartType}</div>
      <div data-testid="chart-outstanding">{data?.total_outstanding || 0}</div>
    </div>
  ),
}));

// Mock data
const mockSalesTrendData = [
  {
    period: '2024-01-01',
    total_sales: 1000000,
    total_paid: 800000,
    general_sales: 600000,
    gold_sales: 400000,
    invoice_count: 15,
  },
];

const mockProfitLossData = {
  total_revenue: 5000000,
  cost_of_goods_sold: 3000000,
  gross_profit: 2000000,
  profit_margin: 40.0,
  general_revenue: 3000000,
  gold_revenue: 2000000,
  categories: [],
};

const mockCustomerAnalyticsData = {
  total_customers: 150,
  active_customers: 120,
  new_customers_this_month: 25,
  average_customer_value: 2500000,
  top_customers: [],
  customer_segmentation: {},
  monthly_purchase_patterns: {},
};

const mockAgingReportData = {
  total_outstanding: 15000000,
  buckets: [],
  customers: [],
  summary: {
    current_percentage: 53.3,
    overdue_percentage: 46.7,
    severely_overdue_percentage: 13.3,
  },
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('Reports Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock implementations
    vi.mocked(reportService.getSalesTrend).mockResolvedValue(mockSalesTrendData);
    vi.mocked(reportService.getProfitLoss).mockResolvedValue(mockProfitLossData);
    vi.mocked(reportService.getCustomerAnalytics).mockResolvedValue(mockCustomerAnalyticsData);
    vi.mocked(reportService.getAgingReport).mockResolvedValue(mockAgingReportData);
  });

  it('renders page header with title and controls', () => {
    render(
      <TestWrapper>
        <Reports />
      </TestWrapper>
    );

    expect(screen.getByText('گزارشات و تحلیل‌ها')).toBeInTheDocument();
    expect(screen.getByText('تحلیل جامع عملکرد کسب‌وکار شما')).toBeInTheDocument();
    expect(screen.getByText('بروزرسانی')).toBeInTheDocument();
    expect(screen.getByText('دانلود PDF')).toBeInTheDocument();
  });

  it('renders date range filter controls', () => {
    render(
      <TestWrapper>
        <Reports />
      </TestWrapper>
    );

    expect(screen.getByText('بازه زمانی:')).toBeInTheDocument();
    expect(screen.getAllByDisplayValue(/2024-/)).toHaveLength(2); // Start and end date inputs
  });

  it('renders all report tabs', () => {
    render(
      <TestWrapper>
        <Reports />
      </TestWrapper>
    );

    expect(screen.getByText('روند فروش')).toBeInTheDocument();
    expect(screen.getByText('سود و زیان')).toBeInTheDocument();
    expect(screen.getByText('تحلیل مشتریان')).toBeInTheDocument();
    expect(screen.getByText('گزارش سنی')).toBeInTheDocument();
  });

  it('shows sales trend chart by default', async () => {
    render(
      <TestWrapper>
        <Reports />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('sales-trend-chart')).toBeInTheDocument();
    });

    expect(screen.getByTestId('chart-period')).toHaveTextContent('daily');
    expect(screen.getByTestId('chart-type')).toHaveTextContent('line');
  });

  it('switches between tabs correctly', async () => {
    render(
      <TestWrapper>
        <Reports />
      </TestWrapper>
    );

    // Click on profit-loss tab
    fireEvent.click(screen.getByText('سود و زیان'));

    await waitFor(() => {
      expect(screen.getByTestId('profit-loss-chart')).toBeInTheDocument();
    });

    expect(screen.getByTestId('chart-revenue')).toHaveTextContent('5000000');
  });

  it('changes sales period correctly', async () => {
    render(
      <TestWrapper>
        <Reports />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('sales-trend-chart')).toBeInTheDocument();
    });

    // Click on weekly period
    fireEvent.click(screen.getByText('هفتگی'));

    await waitFor(() => {
      expect(screen.getByTestId('chart-period')).toHaveTextContent('weekly');
    });

    expect(vi.mocked(reportService.getSalesTrend)).toHaveBeenCalledWith(
      'weekly',
      expect.any(String),
      expect.any(String)
    );
  });

  it('changes chart types correctly', async () => {
    render(
      <TestWrapper>
        <Reports />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('sales-trend-chart')).toBeInTheDocument();
    });

    // Find and click the bar chart button
    const barChartButton = screen.getByText('نمودار ستونی');
    fireEvent.click(barChartButton);

    await waitFor(() => {
      expect(screen.getByTestId('chart-type')).toHaveTextContent('bar');
    });
  });

  it('updates date range correctly', async () => {
    render(
      <TestWrapper>
        <Reports />
      </TestWrapper>
    );

    const startDateInput = screen.getAllByDisplayValue(/2024-/)[0];
    fireEvent.change(startDateInput, { target: { value: '2024-02-01' } });

    await waitFor(() => {
      expect(vi.mocked(reportService.getSalesTrend)).toHaveBeenCalledWith(
        'daily',
        '2024-02-01',
        expect.any(String)
      );
    });
  });

  it('handles export functionality', async () => {
    const mockBlob = new Blob(['test'], { type: 'application/pdf' });
    vi.mocked(reportService.exportReport).mockResolvedValue(mockBlob);

    // Mock URL.createObjectURL
    const mockCreateObjectURL = vi.fn(() => 'mock-url');
    const mockRevokeObjectURL = vi.fn();
    Object.defineProperty(window, 'URL', {
      value: {
        createObjectURL: mockCreateObjectURL,
        revokeObjectURL: mockRevokeObjectURL,
      },
    });

    // Mock document.createElement and appendChild
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
    };
    const mockCreateElement = vi.fn(() => mockLink);
    const mockAppendChild = vi.fn();
    const mockRemoveChild = vi.fn();
    
    Object.defineProperty(document, 'createElement', { value: mockCreateElement });
    Object.defineProperty(document.body, 'appendChild', { value: mockAppendChild });
    Object.defineProperty(document.body, 'removeChild', { value: mockRemoveChild });

    render(
      <TestWrapper>
        <Reports />
      </TestWrapper>
    );

    const exportButton = screen.getByText('دانلود PDF');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(vi.mocked(reportService.exportReport)).toHaveBeenCalledWith(
        'sales-trend',
        'pdf',
        expect.any(Object)
      );
    });

    expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
    expect(mockLink.click).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('mock-url');
  });

  it('handles refresh functionality', async () => {
    render(
      <TestWrapper>
        <Reports />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('sales-trend-chart')).toBeInTheDocument();
    });

    const refreshButton = screen.getByText('بروزرسانی');
    fireEvent.click(refreshButton);

    // Should call the service again
    await waitFor(() => {
      expect(vi.mocked(reportService.getSalesTrend)).toHaveBeenCalledTimes(2);
    });
  });

  it('shows loading state while fetching data', () => {
    // Make the service return a pending promise
    vi.mocked(reportService.getSalesTrend).mockReturnValue(new Promise(() => {}));

    render(
      <TestWrapper>
        <Reports />
      </TestWrapper>
    );

    expect(screen.getByRole('status')).toBeInTheDocument(); // Loading spinner
  });

  it('shows error state when data fetching fails', async () => {
    vi.mocked(reportService.getSalesTrend).mockRejectedValue(new Error('API Error'));

    render(
      <TestWrapper>
        <Reports />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('خطا در بارگذاری داده‌ها')).toBeInTheDocument();
    });
  });

  it('applies gradient design system styling', () => {
    const { container } = render(
      <TestWrapper>
        <Reports />
      </TestWrapper>
    );

    // Check for gradient background
    expect(container.querySelector('.bg-gradient-to-br.from-green-50\\/30.to-white')).toBeInTheDocument();
    
    // Check for gradient icon container
    expect(container.querySelector('.bg-gradient-to-br.from-green-500.to-green-600')).toBeInTheDocument();
  });

  it('shows period selector only for sales trend tab', async () => {
    render(
      <TestWrapper>
        <Reports />
      </TestWrapper>
    );

    // Should show period selector on sales trend tab
    expect(screen.getByText('دوره:')).toBeInTheDocument();
    expect(screen.getByText('روزانه')).toBeInTheDocument();

    // Switch to profit-loss tab
    fireEvent.click(screen.getByText('سود و زیان'));

    await waitFor(() => {
      expect(screen.queryByText('دوره:')).not.toBeInTheDocument();
    });
  });

  it('renders chart type selectors for each tab', async () => {
    render(
      <TestWrapper>
        <Reports />
      </TestWrapper>
    );

    // Sales trend tab should have line/bar options
    expect(screen.getByText('نمودار خطی')).toBeInTheDocument();
    expect(screen.getByText('نمودار ستونی')).toBeInTheDocument();

    // Switch to customer analytics tab
    fireEvent.click(screen.getByText('تحلیل مشتریان'));

    await waitFor(() => {
      expect(screen.getByText('برترین مشتریان')).toBeInTheDocument();
      expect(screen.getByText('تقسیم‌بندی')).toBeInTheDocument();
      expect(screen.getByText('الگوی خرید')).toBeInTheDocument();
    });
  });
});