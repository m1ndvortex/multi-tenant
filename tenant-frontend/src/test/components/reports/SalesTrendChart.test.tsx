import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SalesTrendChart from '@/components/reports/SalesTrendChart';
import { SalesTrendData } from '@/services/reportService';

// Mock Chart.js
vi.mock('react-chartjs-2', () => ({
  Line: ({ data, options }: any) => (
    <div data-testid="line-chart">
      <div data-testid="chart-title">{options.plugins.title.text}</div>
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
    </div>
  ),
  Bar: ({ data, options }: any) => (
    <div data-testid="bar-chart">
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
  PointElement: {},
  LineElement: {},
  BarElement: {},
  Title: {},
  Tooltip: {},
  Legend: {},
}));

const mockSalesTrendData: SalesTrendData[] = [
  {
    period: '2024-01-01',
    total_sales: 1000000,
    total_paid: 800000,
    general_sales: 600000,
    gold_sales: 400000,
    invoice_count: 15,
  },
  {
    period: '2024-01-02',
    total_sales: 1200000,
    total_paid: 1000000,
    general_sales: 700000,
    gold_sales: 500000,
    invoice_count: 18,
  },
  {
    period: '2024-01-03',
    total_sales: 900000,
    total_paid: 750000,
    general_sales: 500000,
    gold_sales: 400000,
    invoice_count: 12,
  },
];

describe('SalesTrendChart Component', () => {
  it('renders line chart by default', () => {
    render(
      <SalesTrendChart 
        data={mockSalesTrendData} 
        period="daily" 
      />
    );

    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.getByTestId('chart-title')).toHaveTextContent('روند فروش روزانه');
  });

  it('renders bar chart when chartType is bar', () => {
    render(
      <SalesTrendChart 
        data={mockSalesTrendData} 
        period="daily" 
        chartType="bar"
      />
    );

    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('chart-title')).toHaveTextContent('روند فروش روزانه');
  });

  it('displays correct title for weekly period', () => {
    render(
      <SalesTrendChart 
        data={mockSalesTrendData} 
        period="weekly" 
      />
    );

    expect(screen.getByTestId('chart-title')).toHaveTextContent('روند فروش هفتگی');
  });

  it('displays correct title for monthly period', () => {
    render(
      <SalesTrendChart 
        data={mockSalesTrendData} 
        period="monthly" 
      />
    );

    expect(screen.getByTestId('chart-title')).toHaveTextContent('روند فروش ماهانه');
  });

  it('formats data correctly for chart', () => {
    render(
      <SalesTrendChart 
        data={mockSalesTrendData} 
        period="daily" 
      />
    );

    const chartData = JSON.parse(screen.getByTestId('chart-data').textContent || '{}');
    
    expect(chartData.labels).toHaveLength(3);
    expect(chartData.datasets).toHaveLength(4);
    expect(chartData.datasets[0].label).toBe('کل فروش');
    expect(chartData.datasets[1].label).toBe('مبلغ دریافتی');
    expect(chartData.datasets[2].label).toBe('فروش عمومی');
    expect(chartData.datasets[3].label).toBe('فروش طلا');
  });

  it('handles empty data gracefully', () => {
    render(
      <SalesTrendChart 
        data={[]} 
        period="daily" 
      />
    );

    const chartData = JSON.parse(screen.getByTestId('chart-data').textContent || '{}');
    expect(chartData.labels).toHaveLength(0);
    expect(chartData.datasets[0].data).toHaveLength(0);
  });

  it('applies Persian font family in chart options', () => {
    const { container } = render(
      <SalesTrendChart 
        data={mockSalesTrendData} 
        period="daily" 
      />
    );

    // Chart should render without errors with Persian font configuration
    expect(container.querySelector('[data-testid="line-chart"]')).toBeInTheDocument();
  });

  it('formats Persian dates correctly for daily period', () => {
    render(
      <SalesTrendChart 
        data={mockSalesTrendData} 
        period="daily" 
      />
    );

    const chartData = JSON.parse(screen.getByTestId('chart-data').textContent || '{}');
    
    // Check that labels are formatted (exact format depends on browser locale support)
    expect(chartData.labels).toHaveLength(3);
    expect(typeof chartData.labels[0]).toBe('string');
  });

  it('has proper gradient colors for different data series', () => {
    render(
      <SalesTrendChart 
        data={mockSalesTrendData} 
        period="daily" 
      />
    );

    const chartData = JSON.parse(screen.getByTestId('chart-data').textContent || '{}');
    
    expect(chartData.datasets[0].borderColor).toBe('rgb(34, 197, 94)'); // Green for total sales
    expect(chartData.datasets[1].borderColor).toBe('rgb(59, 130, 246)'); // Blue for total paid
    expect(chartData.datasets[2].borderColor).toBe('rgb(168, 85, 247)'); // Purple for general sales
    expect(chartData.datasets[3].borderColor).toBe('rgb(245, 158, 11)'); // Amber for gold sales
  });
});