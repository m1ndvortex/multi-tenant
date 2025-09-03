// import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import UserGrowthChart from '../UserGrowthChart';

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

describe('UserGrowthChart', () => {
  const mockData = {
    labels: ['2024-01-01', '2024-01-02', '2024-01-03'],
    data: [10, 15, 20],
  };

  it('renders chart title correctly', () => {
    render(<UserGrowthChart data={mockData} />);
    
    expect(screen.getByText('رشد کاربران')).toBeInTheDocument();
  });

  it('renders chart with provided data', () => {
    render(<UserGrowthChart data={mockData} />);
    
    const chartData = screen.getByTestId('chart-data');
    const parsedData = JSON.parse(chartData.textContent || '{}');
    
    expect(parsedData.labels).toEqual(mockData.labels);
    expect(parsedData.datasets[0].data).toEqual(mockData.data);
    expect(parsedData.datasets[0].label).toBe('کاربران جدید');
  });

  it('shows loading state when isLoading is true', () => {
    render(<UserGrowthChart data={mockData} isLoading={true} />);
    
    expect(screen.getByText('رشد کاربران')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument(); // Loading spinner
  });

  it('applies correct styling classes', () => {
    render(<UserGrowthChart data={mockData} />);
    
    const chartContainer = screen.getByTestId('line-chart').parentElement;
    expect(chartContainer).toHaveClass('h-80');
  });

  it('handles empty data gracefully', () => {
    const emptyData = {
      labels: [],
      data: [],
    };
    
    render(<UserGrowthChart data={emptyData} />);
    
    const chartData = screen.getByTestId('chart-data');
    const parsedData = JSON.parse(chartData.textContent || '{}');
    
    expect(parsedData.labels).toEqual([]);
    expect(parsedData.datasets[0].data).toEqual([]);
  });

  it('configures chart options correctly', () => {
    render(<UserGrowthChart data={mockData} />);
    
    const chartOptions = screen.getByTestId('chart-options');
    const parsedOptions = JSON.parse(chartOptions.textContent || '{}');
    
    expect(parsedOptions.responsive).toBe(true);
    expect(parsedOptions.maintainAspectRatio).toBe(false);
    expect(parsedOptions.plugins.legend.position).toBe('top');
    expect(parsedOptions.scales.y.beginAtZero).toBe(true);
  });
});