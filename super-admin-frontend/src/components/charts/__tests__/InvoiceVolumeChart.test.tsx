import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import InvoiceVolumeChart from '../InvoiceVolumeChart';

// Mock Chart.js
vi.mock('react-chartjs-2', () => ({
  Bar: ({ data, options }: any) => (
    <div data-testid="bar-chart">
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
      <div data-testid="chart-options">{JSON.stringify(options)}</div>
    </div>
  ),
  Line: ({ data, options }: any) => (
    <div data-testid="line-chart">
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
      <div data-testid="chart-options">{JSON.stringify(options)}</div>
    </div>
  ),
}));

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
}));

describe('InvoiceVolumeChart', () => {
  const mockData = {
    labels: ['2024-01', '2024-02', '2024-03'],
    data: [100, 150, 200],
    general_invoices: [70, 105, 140],
    gold_invoices: [30, 45, 60],
    average_value: [5000000, 6000000, 7000000],
  };

  const mockTimeRangeChange = vi.fn();

  it('renders chart title correctly', () => {
    render(<InvoiceVolumeChart data={mockData} />);
    
    expect(screen.getByText('حجم فاکتورها')).toBeInTheDocument();
  });

  it('renders chart with provided data', () => {
    render(<InvoiceVolumeChart data={mockData} />);
    
    const chartData = screen.getByTestId('chart-data');
    const parsedData = JSON.parse(chartData.textContent || '{}');
    
    expect(parsedData.labels).toEqual(mockData.labels);
    expect(parsedData.datasets[0].data).toEqual(mockData.data);
    expect(parsedData.datasets[0].label).toBe('تعداد فاکتور');
  });

  it('shows loading state when isLoading is true', () => {
    render(<InvoiceVolumeChart data={mockData} isLoading={true} />);
    
    expect(screen.getByText('حجم فاکتورها')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument(); // Loading spinner
  });

  it('renders time range selector when onTimeRangeChange is provided', () => {
    render(
      <InvoiceVolumeChart 
        data={mockData} 
        onTimeRangeChange={mockTimeRangeChange}
        currentTimeRange="30d"
      />
    );
    
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders view type buttons', () => {
    render(<InvoiceVolumeChart data={mockData} />);
    
    expect(screen.getByText('کل')).toBeInTheDocument();
    expect(screen.getByText('تفکیک')).toBeInTheDocument();
    expect(screen.getByText('روند')).toBeInTheDocument();
  });

  it('renders chart type buttons', () => {
    render(<InvoiceVolumeChart data={mockData} />);
    
    expect(screen.getByText('ستونی')).toBeInTheDocument();
    expect(screen.getByText('خطی')).toBeInTheDocument();
  });

  it('changes view type to breakdown when clicked', () => {
    render(<InvoiceVolumeChart data={mockData} />);
    
    const breakdownButton = screen.getByText('تفکیک');
    fireEvent.click(breakdownButton);
    
    const chartData = screen.getByTestId('chart-data');
    const parsedData = JSON.parse(chartData.textContent || '{}');
    
    expect(parsedData.datasets).toHaveLength(2);
    expect(parsedData.datasets[0].label).toBe('فاکتور عمومی');
    expect(parsedData.datasets[1].label).toBe('فاکتور طلا');
  });

  it('changes chart type to line when clicked', () => {
    render(<InvoiceVolumeChart data={mockData} />);
    
    const lineButton = screen.getByText('خطی');
    fireEvent.click(lineButton);
    
    // Should render line chart instead of bar chart
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
  });

  it('shows trend view with dual axis when average value is available', () => {
    render(<InvoiceVolumeChart data={mockData} />);
    
    const trendButton = screen.getByText('روند');
    fireEvent.click(trendButton);
    
    const chartData = screen.getByTestId('chart-data');
    const parsedData = JSON.parse(chartData.textContent || '{}');
    
    expect(parsedData.datasets).toHaveLength(2);
    expect(parsedData.datasets[1].label).toBe('میانگین ارزش (تومان)');
    expect(parsedData.datasets[1].yAxisID).toBe('y1');
  });

  it('applies correct styling classes', () => {
    render(<InvoiceVolumeChart data={mockData} />);
    
    const chartContainer = screen.getByTestId('bar-chart').parentElement;
    expect(chartContainer).toHaveClass('h-80');
  });

  it('handles empty data gracefully', () => {
    const emptyData = {
      labels: [],
      data: [],
    };
    
    render(<InvoiceVolumeChart data={emptyData} />);
    
    const chartData = screen.getByTestId('chart-data');
    const parsedData = JSON.parse(chartData.textContent || '{}');
    
    expect(parsedData.labels).toEqual([]);
    expect(parsedData.datasets[0].data).toEqual([]);
  });

  it('configures chart options correctly', () => {
    render(<InvoiceVolumeChart data={mockData} />);
    
    const chartOptions = screen.getByTestId('chart-options');
    const parsedOptions = JSON.parse(chartOptions.textContent || '{}');
    
    expect(parsedOptions.responsive).toBe(true);
    expect(parsedOptions.maintainAspectRatio).toBe(false);
    expect(parsedOptions.plugins.legend.position).toBe('top');
    expect(parsedOptions.scales.y.beginAtZero).toBe(true);
  });

  it('uses correct colors for breakdown view', () => {
    render(<InvoiceVolumeChart data={mockData} />);
    
    const breakdownButton = screen.getByText('تفکیک');
    fireEvent.click(breakdownButton);
    
    const chartData = screen.getByTestId('chart-data');
    const parsedData = JSON.parse(chartData.textContent || '{}');
    
    // General invoices should be green
    expect(parsedData.datasets[0].borderColor).toBe('rgb(34, 197, 94)');
    // Gold invoices should be yellow/gold
    expect(parsedData.datasets[1].borderColor).toBe('rgb(251, 191, 36)');
  });
});