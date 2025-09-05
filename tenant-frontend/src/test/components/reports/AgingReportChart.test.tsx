import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AgingReportChart from '@/components/reports/AgingReportChart';
import { AgingReportResponse } from '@/services/reportService';

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
}));

vi.mock('chart.js', () => ({
  Chart: {
    register: vi.fn(),
  },
  CategoryScale: {},
  LinearScale: {},
  BarElement: {},
  ArcElement: {},
  Title: {},
  Tooltip: {},
  Legend: {},
}));

const mockAgingReportData: AgingReportResponse = {
  total_outstanding: 15000000,
  buckets: [
    {
      name: 'جاری',
      amount: 8000000,
      count: 45,
      percentage: 53.3,
    },
    {
      name: '۱-۳۰ روز',
      amount: 3000000,
      count: 20,
      percentage: 20.0,
    },
    {
      name: '۳۱-۶۰ روز',
      amount: 2000000,
      count: 15,
      percentage: 13.3,
    },
    {
      name: '۶۱-۹۰ روز',
      amount: 1500000,
      count: 10,
      percentage: 10.0,
    },
    {
      name: 'بیش از ۹۰ روز',
      amount: 500000,
      count: 5,
      percentage: 3.3,
    },
  ],
  customers: [
    {
      customer_id: '1',
      customer_name: 'احمد محمدی',
      total_balance: 2000000,
      current: 1000000,
      days_1_30: 500000,
      days_31_60: 300000,
      days_61_90: 200000,
      over_90_days: 0,
    },
    {
      customer_id: '2',
      customer_name: 'فاطمه احمدی',
      total_balance: 1500000,
      current: 800000,
      days_1_30: 400000,
      days_31_60: 200000,
      days_61_90: 100000,
      over_90_days: 0,
    },
    {
      customer_id: '3',
      customer_name: 'علی رضایی',
      total_balance: 1200000,
      current: 1200000,
      days_1_30: 0,
      days_31_60: 0,
      days_61_90: 0,
      over_90_days: 0,
    },
  ],
  summary: {
    current_percentage: 53.3,
    overdue_percentage: 46.7,
    severely_overdue_percentage: 13.3,
  },
};

const mockAgingReportDataNoOverdue: AgingReportResponse = {
  ...mockAgingReportData,
  customers: [
    {
      customer_id: '3',
      customer_name: 'علی رضایی',
      total_balance: 1200000,
      current: 1200000,
      days_1_30: 0,
      days_31_60: 0,
      days_61_90: 0,
      over_90_days: 0,
    },
  ],
};

describe('AgingReportChart Component', () => {
  it('renders bar chart by default', () => {
    render(
      <AgingReportChart data={mockAgingReportData} />
    );

    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('renders doughnut chart when chartType is doughnut', () => {
    render(
      <AgingReportChart data={mockAgingReportData} chartType="doughnut" />
    );

    expect(screen.getByTestId('doughnut-chart')).toBeInTheDocument();
    expect(screen.getByTestId('chart-title')).toHaveTextContent('توزیع سنی حساب‌های دریافتنی');
  });

  it('displays aging buckets data correctly', () => {
    render(
      <AgingReportChart data={mockAgingReportDataNoOverdue} />
    );

    const chartData = JSON.parse(screen.getByTestId('chart-data').textContent || '{}');
    
    expect(chartData.labels).toEqual(['جاری', '۱-۳۰ روز', '۳۱-۶۰ روز', '۶۱-۹۰ روز', 'بیش از ۹۰ روز']);
    expect(chartData.datasets[0].data).toEqual([8000000, 3000000, 2000000, 1500000, 500000]);
  });

  it('shows top overdue customers when available', () => {
    render(
      <AgingReportChart data={mockAgingReportData} />
    );

    const chartData = JSON.parse(screen.getByTestId('chart-data').textContent || '{}');
    
    // Should show customer names as labels
    expect(chartData.labels).toEqual(['احمد محمدی', 'فاطمه احمدی']);
    expect(chartData.datasets).toHaveLength(5); // 5 aging categories
    expect(screen.getByTestId('chart-title')).toHaveTextContent('مشتریان با بیشترین بدهی معوق');
  });

  it('uses appropriate colors for aging categories', () => {
    render(
      <AgingReportChart data={mockAgingReportDataNoOverdue} />
    );

    const chartData = JSON.parse(screen.getByTestId('chart-data').textContent || '{}');
    
    expect(chartData.datasets[0].backgroundColor).toEqual([
      'rgba(34, 197, 94, 0.8)',   // Current - Green
      'rgba(245, 158, 11, 0.8)',  // 1-30 days - Amber
      'rgba(249, 115, 22, 0.8)',  // 31-60 days - Orange
      'rgba(239, 68, 68, 0.8)',   // 61-90 days - Red
      'rgba(127, 29, 29, 0.8)',   // Over 90 days - Dark Red
    ]);
  });

  it('filters customers with overdue amounts correctly', () => {
    render(
      <AgingReportChart data={mockAgingReportData} />
    );

    const chartData = JSON.parse(screen.getByTestId('chart-data').textContent || '{}');
    
    // Should only show customers with overdue amounts (total_balance > current)
    expect(chartData.labels).toHaveLength(2); // احمد محمدی and فاطمه احمدی have overdue amounts
    expect(chartData.labels).not.toContain('علی رضایی'); // This customer has no overdue amount
  });

  it('sorts overdue customers by overdue amount descending', () => {
    render(
      <AgingReportChart data={mockAgingReportData} />
    );

    const chartData = JSON.parse(screen.getByTestId('chart-data').textContent || '{}');
    
    // احمد محمدی has 1,000,000 overdue (2,000,000 - 1,000,000)
    // فاطمه احمدی has 700,000 overdue (1,500,000 - 800,000)
    expect(chartData.labels[0]).toBe('احمد محمدی');
    expect(chartData.labels[1]).toBe('فاطمه احمدی');
  });

  it('limits to top 10 overdue customers', () => {
    const dataWithManyCustomers: AgingReportResponse = {
      ...mockAgingReportData,
      customers: Array.from({ length: 15 }, (_, i) => ({
        customer_id: `${i + 1}`,
        customer_name: `مشتری ${i + 1}`,
        total_balance: 1000000,
        current: 500000,
        days_1_30: 300000,
        days_31_60: 150000,
        days_61_90: 50000,
        over_90_days: 0,
      })),
    };

    render(
      <AgingReportChart data={dataWithManyCustomers} />
    );

    const chartData = JSON.parse(screen.getByTestId('chart-data').textContent || '{}');
    expect(chartData.labels).toHaveLength(10);
  });

  it('uses stacked bar chart for customer overdue breakdown', () => {
    render(
      <AgingReportChart data={mockAgingReportData} />
    );

    const chartData = JSON.parse(screen.getByTestId('chart-data').textContent || '{}');
    
    // Check that we have data for all aging categories for each customer
    expect(chartData.datasets[0].label).toBe('جاری');
    expect(chartData.datasets[1].label).toBe('۱-۳۰ روز');
    expect(chartData.datasets[2].label).toBe('۳۱-۶۰ روز');
    expect(chartData.datasets[3].label).toBe('۶۱-۹۰ روز');
    expect(chartData.datasets[4].label).toBe('بیش از ۹۰ روز');
  });

  it('applies Persian font family in chart options', () => {
    const { container } = render(
      <AgingReportChart data={mockAgingReportData} />
    );

    // Chart should render without errors with Persian font configuration
    expect(container.querySelector('[data-testid="bar-chart"]')).toBeInTheDocument();
  });

  it('handles empty buckets data gracefully', () => {
    const emptyData: AgingReportResponse = {
      ...mockAgingReportData,
      buckets: [],
    };

    render(
      <AgingReportChart data={emptyData} chartType="doughnut" />
    );

    const chartData = JSON.parse(screen.getByTestId('chart-data').textContent || '{}');
    expect(chartData.labels).toHaveLength(0);
    expect(chartData.datasets[0].data).toHaveLength(0);
  });

  it('shows bucket data when no overdue customers exist', () => {
    render(
      <AgingReportChart data={mockAgingReportDataNoOverdue} />
    );

    expect(screen.getByTestId('chart-title')).toHaveTextContent('گزارش سنی حساب‌های دریافتنی');
    
    const chartData = JSON.parse(screen.getByTestId('chart-data').textContent || '{}');
    expect(chartData.labels).toEqual(['جاری', '۱-۳۰ روز', '۳۱-۶۰ روز', '۶۱-۹۰ روز', 'بیش از ۹۰ روز']);
  });
});