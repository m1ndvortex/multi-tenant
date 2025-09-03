// import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SystemHealthChart from '../SystemHealthChart';
import { SystemHealthMetrics } from '@/services/analyticsService';

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

describe('SystemHealthChart', () => {
  const mockData: SystemHealthMetrics[] = [
    {
      timestamp: '2024-01-01T10:00:00Z',
      cpu_usage: 45,
      memory_usage: 60,
      disk_usage: 30,
      database_connections: 10,
      database_response_time: 50,
      redis_memory_usage: 100,
      redis_connected_clients: 5,
      celery_active_tasks: 2,
      celery_pending_tasks: 1,
      celery_failed_tasks: 0,
      api_response_time: 120,
      error_rate: 0.5,
    },
    {
      timestamp: '2024-01-01T11:00:00Z',
      cpu_usage: 50,
      memory_usage: 65,
      disk_usage: 32,
      database_connections: 12,
      database_response_time: 55,
      redis_memory_usage: 110,
      redis_connected_clients: 6,
      celery_active_tasks: 3,
      celery_pending_tasks: 0,
      celery_failed_tasks: 1,
      api_response_time: 130,
      error_rate: 0.8,
    },
  ];

  it('renders chart title correctly', () => {
    render(<SystemHealthChart data={mockData} />);
    
    expect(screen.getByText('نمودار سلامت سیستم')).toBeInTheDocument();
  });

  it('renders chart with system health data', () => {
    render(<SystemHealthChart data={mockData} />);
    
    const chartData = screen.getByTestId('chart-data');
    const parsedData = JSON.parse(chartData.textContent || '{}');
    
    expect(parsedData.datasets).toHaveLength(3); // CPU, Memory, Disk
    expect(parsedData.datasets[0].label).toBe('CPU Usage (%)');
    expect(parsedData.datasets[1].label).toBe('Memory Usage (%)');
    expect(parsedData.datasets[2].label).toBe('Disk Usage (%)');
  });

  it('formats timestamps correctly for labels', () => {
    render(<SystemHealthChart data={mockData} />);
    
    const chartData = screen.getByTestId('chart-data');
    const parsedData = JSON.parse(chartData.textContent || '{}');
    
    // Should format timestamps to Persian time format
    expect(parsedData.labels).toHaveLength(2);
    expect(parsedData.labels[0]).toMatch(/[\d۰-۹]{2}:[\d۰-۹]{2}/); // HH:MM format (supports Persian digits)
  });

  it('shows loading state when isLoading is true', () => {
    render(<SystemHealthChart data={mockData} isLoading={true} />);
    
    expect(screen.getByText('نمودار سلامت سیستم')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument(); // Loading spinner
  });

  it('applies correct colors to datasets', () => {
    render(<SystemHealthChart data={mockData} />);
    
    const chartData = screen.getByTestId('chart-data');
    const parsedData = JSON.parse(chartData.textContent || '{}');
    
    expect(parsedData.datasets[0].borderColor).toBe('rgb(239, 68, 68)'); // Red for CPU
    expect(parsedData.datasets[1].borderColor).toBe('rgb(34, 197, 94)'); // Green for Memory
    expect(parsedData.datasets[2].borderColor).toBe('rgb(59, 130, 246)'); // Blue for Disk
  });

  it('configures y-axis with percentage scale', () => {
    render(<SystemHealthChart data={mockData} />);
    
    const chartOptions = screen.getByTestId('chart-options');
    const parsedOptions = JSON.parse(chartOptions.textContent || '{}');
    
    expect(parsedOptions.scales.y.beginAtZero).toBe(true);
    expect(parsedOptions.scales.y.max).toBe(100);
  });

  it('handles empty data gracefully', () => {
    render(<SystemHealthChart data={[]} />);
    
    const chartData = screen.getByTestId('chart-data');
    const parsedData = JSON.parse(chartData.textContent || '{}');
    
    expect(parsedData.labels).toEqual([]);
    expect(parsedData.datasets[0].data).toEqual([]);
    expect(parsedData.datasets[1].data).toEqual([]);
    expect(parsedData.datasets[2].data).toEqual([]);
  });

  it('extracts correct data values from metrics', () => {
    render(<SystemHealthChart data={mockData} />);
    
    const chartData = screen.getByTestId('chart-data');
    const parsedData = JSON.parse(chartData.textContent || '{}');
    
    expect(parsedData.datasets[0].data).toEqual([45, 50]); // CPU usage
    expect(parsedData.datasets[1].data).toEqual([60, 65]); // Memory usage
    expect(parsedData.datasets[2].data).toEqual([30, 32]); // Disk usage
  });
});