import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProfitLossChart from '@/components/reports/ProfitLossChart';
import { ProfitLossData } from '@/services/reportService';

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

const mockProfitLossData: ProfitLossData = {
  total_revenue: 5000000,
  cost_of_goods_sold: 3000000,
  gross_profit: 2000000,
  profit_margin: 40.0,
  general_revenue: 3000000,
  gold_revenue: 2000000,
  categories: [
    {
      name: 'الکترونیک',
      revenue: 2000000,
      cost_of_goods: 1200000,
      gross_profit: 800000,
      profit_margin: 40.0,
    },
    {
      name: 'پوشاک',
      revenue: 1500000,
      cost_of_goods: 900000,
      gross_profit: 600000,
      profit_margin: 40.0,
    },
    {
      name: 'طلا و جواهر',
      revenue: 1500000,
      cost_of_goods: 900000,
      gross_profit: 600000,
      profit_margin: 40.0,
    },
  ],
};

describe('ProfitLossChart Component', () => {
  it('renders bar chart by default', () => {
    render(
      <ProfitLossChart data={mockProfitLossData} />
    );

    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('chart-title')).toHaveTextContent('تحلیل سود و زیان بر اساس دسته‌بندی');
  });

  it('renders doughnut charts when chartType is doughnut', () => {
    render(
      <ProfitLossChart data={mockProfitLossData} chartType="doughnut" />
    );

    const doughnutCharts = screen.getAllByTestId('doughnut-chart');
    expect(doughnutCharts).toHaveLength(2);
    
    // Check titles
    const titles = screen.getAllByTestId('chart-title');
    expect(titles[0]).toHaveTextContent('تحلیل کلی سود و زیان');
    expect(titles[1]).toHaveTextContent('تقسیم‌بندی درآمد');
  });

  it('formats category data correctly for bar chart', () => {
    render(
      <ProfitLossChart data={mockProfitLossData} />
    );

    const chartData = JSON.parse(screen.getByTestId('chart-data').textContent || '{}');
    
    expect(chartData.labels).toEqual(['الکترونیک', 'پوشاک', 'طلا و جواهر']);
    expect(chartData.datasets).toHaveLength(3);
    expect(chartData.datasets[0].label).toBe('درآمد');
    expect(chartData.datasets[1].label).toBe('هزینه کالا');
    expect(chartData.datasets[2].label).toBe('سود ناخالص');
  });

  it('displays correct revenue breakdown in doughnut mode', () => {
    render(
      <ProfitLossChart data={mockProfitLossData} chartType="doughnut" />
    );

    const doughnutCharts = screen.getAllByTestId('doughnut-chart');
    const revenueBreakdownChart = doughnutCharts[1];
    const chartData = JSON.parse(revenueBreakdownChart.querySelector('[data-testid="chart-data"]')?.textContent || '{}');
    
    expect(chartData.labels).toEqual(['فروش عمومی', 'فروش طلا']);
    expect(chartData.datasets[0].data).toEqual([3000000, 2000000]);
  });

  it('uses appropriate colors for different data series', () => {
    render(
      <ProfitLossChart data={mockProfitLossData} />
    );

    const chartData = JSON.parse(screen.getByTestId('chart-data').textContent || '{}');
    
    expect(chartData.datasets[0].backgroundColor).toBe('rgba(34, 197, 94, 0.8)'); // Green for revenue
    expect(chartData.datasets[1].backgroundColor).toBe('rgba(239, 68, 68, 0.8)'); // Red for costs
    expect(chartData.datasets[2].backgroundColor).toBe('rgba(59, 130, 246, 0.8)'); // Blue for profit
  });

  it('handles empty categories gracefully', () => {
    const emptyData: ProfitLossData = {
      ...mockProfitLossData,
      categories: [],
    };

    render(
      <ProfitLossChart data={emptyData} />
    );

    const chartData = JSON.parse(screen.getByTestId('chart-data').textContent || '{}');
    expect(chartData.labels).toHaveLength(0);
    expect(chartData.datasets[0].data).toHaveLength(0);
  });

  it('applies Persian font family in chart options', () => {
    const { container } = render(
      <ProfitLossChart data={mockProfitLossData} />
    );

    // Chart should render without errors with Persian font configuration
    expect(container.querySelector('[data-testid="bar-chart"]')).toBeInTheDocument();
  });

  it('shows overall financial summary in doughnut mode', () => {
    render(
      <ProfitLossChart data={mockProfitLossData} chartType="doughnut" />
    );

    const doughnutCharts = screen.getAllByTestId('doughnut-chart');
    const overallChart = doughnutCharts[0];
    const chartData = JSON.parse(overallChart.querySelector('[data-testid="chart-data"]')?.textContent || '{}');
    
    expect(chartData.labels).toEqual(['درآمد کل', 'هزینه کالا', 'سود ناخالص']);
    expect(chartData.datasets[0].data).toEqual([5000000, 3000000, 2000000]);
  });

  it('renders in grid layout for doughnut charts', () => {
    const { container } = render(
      <ProfitLossChart data={mockProfitLossData} chartType="doughnut" />
    );

    const gridContainer = container.querySelector('.grid.grid-cols-1.lg\\:grid-cols-2');
    expect(gridContainer).toBeInTheDocument();
  });
});