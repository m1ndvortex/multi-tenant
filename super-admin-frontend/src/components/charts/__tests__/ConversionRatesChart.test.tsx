import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ConversionRatesChart from '../ConversionRatesChart';

// Mock Chart.js
vi.mock('react-chartjs-2', () => ({
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
  PointElement: vi.fn(),
  LineElement: vi.fn(),
  Title: vi.fn(),
  Tooltip: vi.fn(),
  Legend: vi.fn(),
  Filler: vi.fn(),
}));

describe('ConversionRatesChart', () => {
  const mockData = {
    labels: ['2024-01', '2024-02', '2024-03'],
    free_to_pro: [15, 20, 25],
    churn_rate: [5, 3, 4],
  };

  it('renders chart title correctly', () => {
    render(<ConversionRatesChart data={mockData} />);
    
    expect(screen.getByText('تبدیل اشتراک‌ها')).toBeInTheDocument();
  });

  it('renders chart with provided data', () => {
    render(<ConversionRatesChart data={mockData} />);
    
    const chartData = screen.getByTestId('chart-data');
    const parsedData = JSON.parse(chartData.textContent || '{}');
    
    expect(parsedData.labels).toEqual(mockData.labels);
    expect(parsedData.datasets).toHaveLength(2);
    expect(parsedData.datasets[0].data).toEqual(mockData.free_to_pro);
    expect(parsedData.datasets[1].data).toEqual(mockData.churn_rate);
    expect(parsedData.datasets[0].label).toBe('تبدیل رایگان به پرو (%)');
    expect(parsedData.datasets[1].label).toBe('نرخ ترک (%)');
  });

  it('shows loading state when isLoading is true', () => {
    render(<ConversionRatesChart data={mockData} isLoading={true} />);
    
    expect(screen.getByText('تبدیل اشتراک‌ها')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument(); // Loading spinner
  });

  it('applies correct styling classes', () => {
    render(<ConversionRatesChart data={mockData} />);
    
    const chartContainer = screen.getByTestId('line-chart').parentElement;
    expect(chartContainer).toHaveClass('h-80');
  });

  it('handles empty data gracefully', () => {
    const emptyData = {
      labels: [],
      free_to_pro: [],
      churn_rate: [],
    };
    
    render(<ConversionRatesChart data={emptyData} />);
    
    const chartData = screen.getByTestId('chart-data');
    const parsedData = JSON.parse(chartData.textContent || '{}');
    
    expect(parsedData.labels).toEqual([]);
    expect(parsedData.datasets[0].data).toEqual([]);
    expect(parsedData.datasets[1].data).toEqual([]);
  });

  it('configures chart options correctly', () => {
    render(<ConversionRatesChart data={mockData} />);
    
    const chartOptions = screen.getByTestId('chart-options');
    const parsedOptions = JSON.parse(chartOptions.textContent || '{}');
    
    expect(parsedOptions.responsive).toBe(true);
    expect(parsedOptions.maintainAspectRatio).toBe(false);
    expect(parsedOptions.plugins.legend.position).toBe('top');
    expect(parsedOptions.scales.y.beginAtZero).toBe(true);
    expect(parsedOptions.scales.y.max).toBe(100);
  });

  it('uses correct colors for datasets', () => {
    render(<ConversionRatesChart data={mockData} />);
    
    const chartData = screen.getByTestId('chart-data');
    const parsedData = JSON.parse(chartData.textContent || '{}');
    
    // Free to Pro conversion should be green
    expect(parsedData.datasets[0].borderColor).toBe('rgb(34, 197, 94)');
    expect(parsedData.datasets[0].backgroundColor).toBe('rgba(34, 197, 94, 0.1)');
    
    // Churn rate should be red
    expect(parsedData.datasets[1].borderColor).toBe('rgb(239, 68, 68)');
    expect(parsedData.datasets[1].backgroundColor).toBe('rgba(239, 68, 68, 0.1)');
  });

  it('displays correct tooltip callbacks', () => {
    render(<ConversionRatesChart data={mockData} />);
    
    const chartOptions = screen.getByTestId('chart-options');
    const parsedOptions = JSON.parse(chartOptions.textContent || '{}');
    
    expect(parsedOptions.plugins.tooltip.displayColors).toBe(true);
    expect(parsedOptions.plugins.tooltip.callbacks).toBeDefined();
  });
});