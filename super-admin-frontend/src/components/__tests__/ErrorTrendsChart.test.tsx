import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { ErrorTrendsChart } from '../ErrorTrendsChart';
import { ErrorTrends, ErrorSeverity } from '@/services/errorLoggingService';

// Mock Chart.js before importing the component
vi.mock('chart.js', () => ({
  Chart: {
    register: vi.fn(),
  },
  CategoryScale: {},
  LinearScale: {},
  PointElement: {},
  LineElement: {},
  BarElement: {},
  Title: {},
  Tooltip: {},
  Legend: {},
  Filler: {},
}));

vi.mock('react-chartjs-2', () => ({
  Line: ({ data, options }: any) => (
    <div data-testid="line-chart">
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
      <div data-testid="chart-options">{JSON.stringify(options)}</div>
    </div>
  ),
  Bar: ({ data, options }: any) => (
    <div data-testid="bar-chart">
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
      <div data-testid="chart-options">{JSON.stringify(options)}</div>
    </div>
  ),
}));

const mockTrends: ErrorTrends = {
  daily_counts: [
    {
      date: '2024-01-01',
      count: 10,
      severity_breakdown: {
        [ErrorSeverity.CRITICAL]: 2,
        [ErrorSeverity.HIGH]: 3,
        [ErrorSeverity.MEDIUM]: 4,
        [ErrorSeverity.LOW]: 1,
      },
    },
    {
      date: '2024-01-02',
      count: 15,
      severity_breakdown: {
        [ErrorSeverity.CRITICAL]: 1,
        [ErrorSeverity.HIGH]: 5,
        [ErrorSeverity.MEDIUM]: 7,
        [ErrorSeverity.LOW]: 2,
      },
    },
    {
      date: '2024-01-03',
      count: 8,
      severity_breakdown: {
        [ErrorSeverity.CRITICAL]: 0,
        [ErrorSeverity.HIGH]: 2,
        [ErrorSeverity.MEDIUM]: 4,
        [ErrorSeverity.LOW]: 2,
      },
    },
  ],
  severity_trends: {
    [ErrorSeverity.CRITICAL]: [
      { date: '2024-01-01', count: 2 },
      { date: '2024-01-02', count: 1 },
      { date: '2024-01-03', count: 0 },
    ],
    [ErrorSeverity.HIGH]: [
      { date: '2024-01-01', count: 3 },
      { date: '2024-01-02', count: 5 },
      { date: '2024-01-03', count: 2 },
    ],
    [ErrorSeverity.MEDIUM]: [
      { date: '2024-01-01', count: 4 },
      { date: '2024-01-02', count: 7 },
      { date: '2024-01-03', count: 4 },
    ],
    [ErrorSeverity.LOW]: [
      { date: '2024-01-01', count: 1 },
      { date: '2024-01-02', count: 2 },
      { date: '2024-01-03', count: 2 },
    ],
  },
  period: {
    start_date: '2024-01-01',
    end_date: '2024-01-03',
    days: 3,
  },
};

describe('ErrorTrendsChart', () => {
  const defaultProps = {
    trends: mockTrends,
    isLoading: false,
    height: 300,
  };

  it('renders loading state correctly', () => {
    render(<ErrorTrendsChart {...defaultProps} isLoading={true} />);

    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    expect(document.querySelector('.bg-slate-200')).toBeInTheDocument();
  });

  it('renders empty state when no data', () => {
    render(<ErrorTrendsChart {...defaultProps} trends={undefined} />);

    expect(screen.getByText('داده‌ای برای نمایش وجود ندارد')).toBeInTheDocument();
  });

  it('renders empty state when no daily counts', () => {
    const emptyTrends: ErrorTrends = {
      ...mockTrends,
      daily_counts: [],
    };

    render(<ErrorTrendsChart {...defaultProps} trends={emptyTrends} />);

    expect(screen.getByText('داده‌ای برای نمایش وجود ندارد')).toBeInTheDocument();
  });

  it('renders simple line chart by default', () => {
    render(<ErrorTrendsChart {...defaultProps} />);

    const lineChart = screen.getByTestId('line-chart');
    expect(lineChart).toBeInTheDocument();

    const chartData = JSON.parse(screen.getByTestId('chart-data').textContent || '{}');
    expect(chartData.labels).toEqual(['01 ژان', '02 ژان', '03 ژان']);
    expect(chartData.datasets).toHaveLength(1);
    expect(chartData.datasets[0].label).toBe('تعداد کل خطاها');
    expect(chartData.datasets[0].data).toEqual([10, 15, 8]);
  });

  it('renders detailed charts when detailed prop is true', () => {
    render(<ErrorTrendsChart {...defaultProps} detailed={true} />);

    // Should render multiple charts
    const lineCharts = screen.getAllByTestId('line-chart');
    const barCharts = screen.getAllByTestId('bar-chart');

    expect(lineCharts).toHaveLength(2); // Total errors + severity breakdown
    expect(barCharts).toHaveLength(1); // Stacked bar chart

    // Check section titles
    expect(screen.getByText('روند کلی خطاها')).toBeInTheDocument();
    expect(screen.getByText('تفکیک بر اساس شدت خطا')).toBeInTheDocument();
    expect(screen.getByText('نمای ترکیبی خطاها')).toBeInTheDocument();
  });

  it('displays summary statistics in detailed mode', () => {
    render(<ErrorTrendsChart {...defaultProps} detailed={true} />);

    // Total errors: 10 + 15 + 8 = 33
    expect(screen.getByText('33')).toBeInTheDocument();
    expect(screen.getByText('کل خطاها در این دوره')).toBeInTheDocument();

    // Critical errors: 2 + 1 + 0 = 3
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('خطاهای بحرانی')).toBeInTheDocument();

    // Average per day: 33 / 3 = 11
    expect(screen.getByText('11')).toBeInTheDocument();
    expect(screen.getByText('میانگین خطا در روز')).toBeInTheDocument();
  });

  it('formats severity names correctly in Persian', () => {
    render(<ErrorTrendsChart {...defaultProps} detailed={true} />);

    // Check if Persian severity names are used in chart data
    const lineCharts = screen.getAllByTestId('line-chart');
    const severityChartData = JSON.parse(lineCharts[1].querySelector('[data-testid="chart-data"]')?.textContent || '{}');

    const severityLabels = severityChartData.datasets.map((dataset: any) => dataset.label);
    expect(severityLabels).toContain('بحرانی');
    expect(severityLabels).toContain('بالا');
    expect(severityLabels).toContain('متوسط');
    expect(severityLabels).toContain('پایین');
  });

  it('applies correct colors for different severities', () => {
    render(<ErrorTrendsChart {...defaultProps} detailed={true} />);

    const lineCharts = screen.getAllByTestId('line-chart');
    const severityChartData = JSON.parse(lineCharts[1].querySelector('[data-testid="chart-data"]')?.textContent || '{}');

    // Check if different colors are applied to different severities
    const borderColors = severityChartData.datasets.map((dataset: any) => dataset.borderColor);
    const uniqueColors = new Set(borderColors);
    expect(uniqueColors.size).toBe(4); // Should have 4 different colors for 4 severities
  });

  it('formats dates correctly in Persian', () => {
    render(<ErrorTrendsChart {...defaultProps} />);

    const chartData = JSON.parse(screen.getByTestId('chart-data').textContent || '{}');
    
    // Check if dates are formatted in Persian short format
    expect(chartData.labels).toEqual(['01 ژان', '02 ژان', '03 ژان']);
  });

  it('configures chart options correctly', () => {
    render(<ErrorTrendsChart {...defaultProps} />);

    const chartOptions = JSON.parse(screen.getByTestId('chart-options').textContent || '{}');

    expect(chartOptions.responsive).toBe(true);
    expect(chartOptions.maintainAspectRatio).toBe(false);
    expect(chartOptions.plugins.legend.position).toBe('top');
    expect(chartOptions.scales.y.beginAtZero).toBe(true);
  });

  it('handles custom height correctly', () => {
    const customHeight = 500;
    render(<ErrorTrendsChart {...defaultProps} height={customHeight} />);

    const chartContainer = screen.getByTestId('line-chart').parentElement;
    expect(chartContainer).toHaveStyle(`height: ${customHeight}px`);
  });

  it('configures stacked bar chart correctly in detailed mode', () => {
    render(<ErrorTrendsChart {...defaultProps} detailed={true} />);

    const barChart = screen.getByTestId('bar-chart');
    const chartOptions = JSON.parse(barChart.querySelector('[data-testid="chart-options"]')?.textContent || '{}');

    expect(chartOptions.scales.y.stacked).toBe(true);
    expect(chartOptions.scales.x.stacked).toBe(true);
  });

  it('includes correct data for severity trends', () => {
    render(<ErrorTrendsChart {...defaultProps} detailed={true} />);

    const lineCharts = screen.getAllByTestId('line-chart');
    const severityChartData = JSON.parse(lineCharts[1].querySelector('[data-testid="chart-data"]')?.textContent || '{}');

    // Find critical severity dataset
    const criticalDataset = severityChartData.datasets.find((dataset: any) => dataset.label === 'بحرانی');
    expect(criticalDataset.data).toEqual([2, 1, 0]);

    // Find high severity dataset
    const highDataset = severityChartData.datasets.find((dataset: any) => dataset.label === 'بالا');
    expect(highDataset.data).toEqual([3, 5, 2]);
  });

  it('configures tooltip correctly with Persian formatting', () => {
    render(<ErrorTrendsChart {...defaultProps} />);

    const chartOptions = JSON.parse(screen.getByTestId('chart-options').textContent || '{}');
    
    expect(chartOptions.plugins.tooltip.backgroundColor).toBe('rgba(0, 0, 0, 0.8)');
    expect(chartOptions.plugins.tooltip.titleColor).toBe('white');
    expect(chartOptions.plugins.tooltip.bodyColor).toBe('white');
    expect(chartOptions.plugins.tooltip.cornerRadius).toBe(8);
  });
});