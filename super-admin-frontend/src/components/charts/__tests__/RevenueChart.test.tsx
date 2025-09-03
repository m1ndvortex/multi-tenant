// import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RevenueChart from '../RevenueChart';

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

describe('RevenueChart', () => {
  const mockData = {
    labels: ['Jan', 'Feb', 'Mar'],
    mrr_data: [1000000, 1200000, 1500000],
    growth_rate: [0, 20, 25],
  };

  it('renders chart title correctly', () => {
    render(<RevenueChart data={mockData} />);
    
    expect(screen.getByText('روند درآمد و رشد')).toBeInTheDocument();
  });

  it('renders chart with dual datasets', () => {
    render(<RevenueChart data={mockData} />);
    
    const chartData = screen.getByTestId('chart-data');
    const parsedData = JSON.parse(chartData.textContent || '{}');
    
    expect(parsedData.labels).toEqual(mockData.labels);
    expect(parsedData.datasets).toHaveLength(2);
    expect(parsedData.datasets[0].label).toBe('درآمد ماهانه (MRR)');
    expect(parsedData.datasets[1].label).toBe('نرخ رشد (%)');
    expect(parsedData.datasets[0].data).toEqual(mockData.mrr_data);
    expect(parsedData.datasets[1].data).toEqual(mockData.growth_rate);
  });

  it('shows loading state when isLoading is true', () => {
    render(<RevenueChart data={mockData} isLoading={true} />);
    
    expect(screen.getByText('روند درآمد و رشد')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument(); // Loading spinner
  });

  it('configures dual y-axes correctly', () => {
    render(<RevenueChart data={mockData} />);
    
    const chartOptions = screen.getByTestId('chart-options');
    const parsedOptions = JSON.parse(chartOptions.textContent || '{}');
    
    expect(parsedOptions.scales.y).toBeDefined();
    expect(parsedOptions.scales.y1).toBeDefined();
    expect(parsedOptions.scales.y.position).toBe('left');
    expect(parsedOptions.scales.y1.position).toBe('right');
  });

  it('applies correct colors to datasets', () => {
    render(<RevenueChart data={mockData} />);
    
    const chartData = screen.getByTestId('chart-data');
    const parsedData = JSON.parse(chartData.textContent || '{}');
    
    expect(parsedData.datasets[0].borderColor).toBe('rgb(59, 130, 246)'); // Blue for MRR
    expect(parsedData.datasets[1].borderColor).toBe('rgb(168, 85, 247)'); // Purple for growth rate
  });

  it('handles empty data gracefully', () => {
    const emptyData = {
      labels: [],
      mrr_data: [],
      growth_rate: [],
    };
    
    render(<RevenueChart data={emptyData} />);
    
    const chartData = screen.getByTestId('chart-data');
    const parsedData = JSON.parse(chartData.textContent || '{}');
    
    expect(parsedData.labels).toEqual([]);
    expect(parsedData.datasets[0].data).toEqual([]);
    expect(parsedData.datasets[1].data).toEqual([]);
  });
});