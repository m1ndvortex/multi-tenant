import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CustomerAnalyticsChart from '@/components/reports/CustomerAnalyticsChart';
import { CustomerAnalyticsData } from '@/services/reportService';

// Mock Chart.js
vi.mock('react-chartjs-2', () => ({
  Bar: ({ data, options }: any) => (
    <div data-testid="bar-chart">
      <div data-testid="chart-title">{options.plugins.title.text}</div>
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
    </div>
  ),
  Doughnut: ({ data, options }: any) => (
    <div data-testid="doughnut-chart">
      <div data-testid="chart-title">{options.plugins.title.text}</div>
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
    </div>
  ),
  Line: ({ data, options }: any) => (
    <div data-testid="line-chart">
      <div data-testid="chart-title">{options.plugins.title.text}</div>
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
    </div>
  ),
}));

vi.mock('chart.js', () => ({
  Chart: {
    register: vi.fn(),
  },
  CategoryScale: {},
  LinearScale: {},
  BarElement: {},
  ArcElement: {},
  PointElement: {},
  LineElement: {},
  Title: {},
  Tooltip: {},
  Legend: {},
}));

const mockCustomerAnalyticsData: CustomerAnalyticsData = {
  total_customers: 150,
  active_customers: 120,
  new_customers_this_month: 25,
  average_customer_value: 2500000,
  top_customers: [
    {
      customer_id: '1',
      customer_name: 'احمد محمدی',
      total_spent: 5000000,
      total_paid: 4500000,
      outstanding_balance: 500000,
      lifetime_value: 5000000,
      purchase_count: 15,
      last_purchase_date: '2024-01-15',
    },
    {
      customer_id: '2',
      customer_name: 'فاطمه احمدی',
      total_spent: 4200000,
      total_paid: 4200000,
      outstanding_balance: 0,
      lifetime_value: 4200000,
      purchase_count: 12,
      last_purchase_date: '2024-01-10',
    },
    {
      customer_id: '3',
      customer_name: 'علی رضایی',
      total_spent: 3800000,
      total_paid: 3000000,
      outstanding_balance: 800000,
      lifetime_value: 3800000,
      purchase_count: 8,
      last_purchase_date: '2024-01-12',
    },
  ],
  customer_segmentation: {
    'مشتریان VIP': 15,
    'مشتریان فعال': 45,
    'مشتریان عادی': 60,
    'مشتریان غیرفعال': 30,
  },
  monthly_purchase_patterns: {
    'فروردین': 45,
    'اردیبهشت': 52,
    'خرداد': 38,
    'تیر': 41,
    'مرداد': 47,
    'شهریور': 55,
  },
};

describe('CustomerAnalyticsChart Component', () => {
  it('renders top customers bar chart by default', () => {
    render(
      <CustomerAnalyticsChart data={mockCustomerAnalyticsData} />
    );

    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('chart-title')).toHaveTextContent('برترین مشتریان بر اساس ارزش');
  });

  it('renders customer segmentation doughnut chart', () => {
    render(
      <CustomerAnalyticsChart data={mockCustomerAnalyticsData} chartType="segmentation" />
    );

    expect(screen.getByTestId('doughnut-chart')).toBeInTheDocument();
    expect(screen.getByTestId('chart-title')).toHaveTextContent('تقسیم‌بندی مشتریان');
  });

  it('renders purchase patterns line chart', () => {
    render(
      <CustomerAnalyticsChart data={mockCustomerAnalyticsData} chartType="purchase-patterns" />
    );

    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.getByTestId('chart-title')).toHaveTextContent('الگوی خرید ماهانه مشتریان');
  });

  it('displays top 10 customers in bar chart', () => {
    render(
      <CustomerAnalyticsChart data={mockCustomerAnalyticsData} />
    );

    const chartData = JSON.parse(screen.getByTestId('chart-data').textContent || '{}');
    
    expect(chartData.labels).toEqual(['احمد محمدی', 'فاطمه احمدی', 'علی رضایی']);
    expect(chartData.datasets).toHaveLength(2);
    expect(chartData.datasets[0].label).toBe('ارزش مشتری (تومان)');
    expect(chartData.datasets[1].label).toBe('مبلغ پرداختی (تومان)');
  });

  it('formats segmentation data correctly', () => {
    render(
      <CustomerAnalyticsChart data={mockCustomerAnalyticsData} chartType="segmentation" />
    );

    const chartData = JSON.parse(screen.getByTestId('chart-data').textContent || '{}');
    
    expect(chartData.labels).toEqual(['مشتریان VIP', 'مشتریان فعال', 'مشتریان عادی', 'مشتریان غیرفعال']);
    expect(chartData.datasets[0].data).toEqual([15, 45, 60, 30]);
  });

  it('formats purchase patterns data correctly', () => {
    render(
      <CustomerAnalyticsChart data={mockCustomerAnalyticsData} chartType="purchase-patterns" />
    );

    const chartData = JSON.parse(screen.getByTestId('chart-data').textContent || '{}');
    
    expect(chartData.labels).toEqual(['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور']);
    expect(chartData.datasets[0].data).toEqual([45, 52, 38, 41, 47, 55]);
    expect(chartData.datasets[0].label).toBe('تعداد خرید');
  });

  it('uses appropriate colors for different chart types', () => {
    render(
      <CustomerAnalyticsChart data={mockCustomerAnalyticsData} />
    );

    const chartData = JSON.parse(screen.getByTestId('chart-data').textContent || '{}');
    
    expect(chartData.datasets[0].backgroundColor).toBe('rgba(34, 197, 94, 0.8)'); // Green
    expect(chartData.datasets[1].backgroundColor).toBe('rgba(59, 130, 246, 0.8)'); // Blue
  });

  it('handles empty top customers list', () => {
    const emptyData: CustomerAnalyticsData = {
      ...mockCustomerAnalyticsData,
      top_customers: [],
    };

    render(
      <CustomerAnalyticsChart data={emptyData} />
    );

    const chartData = JSON.parse(screen.getByTestId('chart-data').textContent || '{}');
    expect(chartData.labels).toHaveLength(0);
    expect(chartData.datasets[0].data).toHaveLength(0);
  });

  it('limits top customers to 10 entries', () => {
    const dataWithManyCustomers: CustomerAnalyticsData = {
      ...mockCustomerAnalyticsData,
      top_customers: Array.from({ length: 15 }, (_, i) => ({
        customer_id: `${i + 1}`,
        customer_name: `مشتری ${i + 1}`,
        total_spent: 1000000 - (i * 50000),
        total_paid: 900000 - (i * 45000),
        outstanding_balance: 100000 - (i * 5000),
        lifetime_value: 1000000 - (i * 50000),
        purchase_count: 10 - i,
        last_purchase_date: '2024-01-15',
      })),
    };

    render(
      <CustomerAnalyticsChart data={dataWithManyCustomers} />
    );

    const chartData = JSON.parse(screen.getByTestId('chart-data').textContent || '{}');
    expect(chartData.labels).toHaveLength(10);
    expect(chartData.datasets[0].data).toHaveLength(10);
  });

  it('applies Persian font family in chart options', () => {
    const { container } = render(
      <CustomerAnalyticsChart data={mockCustomerAnalyticsData} />
    );

    // Chart should render without errors with Persian font configuration
    expect(container.querySelector('[data-testid="bar-chart"]')).toBeInTheDocument();
  });

  it('uses gradient colors for segmentation chart', () => {
    render(
      <CustomerAnalyticsChart data={mockCustomerAnalyticsData} chartType="segmentation" />
    );

    const chartData = JSON.parse(screen.getByTestId('chart-data').textContent || '{}');
    
    expect(chartData.datasets[0].backgroundColor).toEqual([
      'rgba(34, 197, 94, 0.8)',
      'rgba(59, 130, 246, 0.8)',
      'rgba(168, 85, 247, 0.8)',
      'rgba(245, 158, 11, 0.8)',
      'rgba(239, 68, 68, 0.8)',
    ]);
  });

  it('shows filled area for purchase patterns line chart', () => {
    render(
      <CustomerAnalyticsChart data={mockCustomerAnalyticsData} chartType="purchase-patterns" />
    );

    const chartData = JSON.parse(screen.getByTestId('chart-data').textContent || '{}');
    
    expect(chartData.datasets[0].fill).toBe(true);
    expect(chartData.datasets[0].backgroundColor).toBe('rgba(34, 197, 94, 0.1)');
    expect(chartData.datasets[0].tension).toBe(0.4);
  });
});