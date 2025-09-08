import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import StorageProviderAnalytics from '../StorageProviderAnalytics';
import { backupMonitoringService } from '@/services/backupMonitoringService';

// Mock the service
vi.mock('@/services/backupMonitoringService');
const mockBackupMonitoringService = vi.mocked(backupMonitoringService);

// Mock Chart.js components
vi.mock('react-chartjs-2', () => ({
  Line: ({ data, options }: any) => (
    <div data-testid="line-chart">
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
    </div>
  ),
  Bar: ({ data, options }: any) => (
    <div data-testid="bar-chart">
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
    </div>
  ),
  Doughnut: ({ data, options }: any) => (
    <div data-testid="doughnut-chart">
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
    </div>
  ),
}));

// Mock toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockAnalytics = [
  {
    provider: 'backblaze_b2' as const,
    usage_metrics: {
      total_storage_gb: 150.5,
      monthly_growth_gb: 12.3,
      file_count: 1250,
      average_file_size_mb: 125.2,
    },
    cost_metrics: {
      estimated_monthly_cost: 25.75,
      storage_cost: 15.50,
      bandwidth_cost: 8.25,
      operations_cost: 2.00,
      cost_trend_percentage: 5.2,
    },
    performance_metrics: {
      average_upload_speed_mbps: 45.8,
      average_download_speed_mbps: 52.3,
      success_rate_percentage: 99.2,
      average_response_time_ms: 150,
    },
    redundancy_status: {
      files_in_both_providers: 1200,
      files_only_primary: 30,
      files_only_secondary: 20,
      redundancy_percentage: 96.0,
    },
  },
  {
    provider: 'cloudflare_r2' as const,
    usage_metrics: {
      total_storage_gb: 148.2,
      monthly_growth_gb: 11.8,
      file_count: 1220,
      average_file_size_mb: 126.5,
    },
    cost_metrics: {
      estimated_monthly_cost: 18.50,
      storage_cost: 12.25,
      bandwidth_cost: 0.00, // Free egress
      operations_cost: 6.25,
      cost_trend_percentage: -2.1,
    },
    performance_metrics: {
      average_upload_speed_mbps: 38.2,
      average_download_speed_mbps: 48.7,
      success_rate_percentage: 98.8,
      average_response_time_ms: 120,
    },
    redundancy_status: {
      files_in_both_providers: 1200,
      files_only_primary: 20,
      files_only_secondary: 0,
      redundancy_percentage: 98.4,
    },
  },
];

const mockComparison = [
  {
    metric: 'Average Upload Speed',
    backblaze_b2_value: 45.8,
    cloudflare_r2_value: 38.2,
    better_provider: 'backblaze_b2' as const,
    unit: 'Mbps',
  },
  {
    metric: 'Monthly Cost',
    backblaze_b2_value: 25.75,
    cloudflare_r2_value: 18.50,
    better_provider: 'cloudflare_r2' as const,
    unit: '$',
  },
];

const mockCostAnalytics = {
  monthly_costs: [
    { provider: 'backblaze_b2', cost: 25.75, breakdown: {} },
    { provider: 'cloudflare_r2', cost: 18.50, breakdown: {} },
  ],
  cost_trends: [
    { date: '2024-01-10', backblaze_b2_cost: 24.50, cloudflare_r2_cost: 18.20 },
    { date: '2024-01-11', backblaze_b2_cost: 25.75, cloudflare_r2_cost: 18.50 },
  ],
  cost_projections: [
    { month: '2024-02', projected_cost: 46.25 },
  ],
};

const mockUsageHistory = [
  { date: '2024-01-10', backblaze_b2_gb: 148.2, cloudflare_r2_gb: 146.8 },
  { date: '2024-01-11', backblaze_b2_gb: 150.5, cloudflare_r2_gb: 148.2 },
];

describe('StorageProviderAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBackupMonitoringService.getStorageAnalytics.mockResolvedValue(mockAnalytics);
    mockBackupMonitoringService.getStorageProviderComparison.mockResolvedValue(mockComparison);
    mockBackupMonitoringService.getCostAnalytics.mockResolvedValue(mockCostAnalytics);
    mockBackupMonitoringService.getStorageUsageHistory.mockResolvedValue(mockUsageHistory);
  });

  it('renders analytics dashboard with loading state initially', () => {
    render(<StorageProviderAnalytics />);
    
    expect(screen.getByText('آمار و تحلیل ذخیره‌سازی')).toBeInTheDocument();
  });

  it('displays provider summary cards after loading', async () => {
    render(<StorageProviderAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('Backblaze B2')).toBeInTheDocument();
      expect(screen.getByText('Cloudflare R2')).toBeInTheDocument();
    });

    // Check usage metrics
    expect(screen.getByText('150.50 GB')).toBeInTheDocument(); // B2 total storage
    expect(screen.getByText('148.20 GB')).toBeInTheDocument(); // R2 total storage
    expect(screen.getByText('1,250')).toBeInTheDocument(); // B2 file count
    expect(screen.getByText('1,220')).toBeInTheDocument(); // R2 file count
  });

  it('displays cost information correctly', async () => {
    render(<StorageProviderAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('$25.75')).toBeInTheDocument(); // B2 monthly cost
      expect(screen.getByText('$18.50')).toBeInTheDocument(); // R2 monthly cost
    });
  });

  it('shows performance metrics in performance tab', async () => {
    render(<StorageProviderAnalytics />);

    await waitFor(() => {
      const performanceTab = screen.getByRole('tab', { name: /عملکرد/ });
      fireEvent.click(performanceTab);
    });

    await waitFor(() => {
      expect(screen.getByText('45.8')).toBeInTheDocument(); // B2 upload speed
      expect(screen.getByText('38.2')).toBeInTheDocument(); // R2 upload speed
      expect(screen.getByText('52.3')).toBeInTheDocument(); // B2 download speed
      expect(screen.getByText('48.7')).toBeInTheDocument(); // R2 download speed
    });
  });

  it('displays provider comparison table', async () => {
    render(<StorageProviderAnalytics />);

    // Switch to performance tab
    await waitFor(() => {
      const performanceTab = screen.getByRole('tab', { name: /عملکرد/ });
      fireEvent.click(performanceTab);
    });

    await waitFor(() => {
      expect(screen.getByText('مقایسه عملکرد ارائه‌دهندگان')).toBeInTheDocument();
      expect(screen.getByText('Average Upload Speed')).toBeInTheDocument();
      expect(screen.getByText('Monthly Cost')).toBeInTheDocument();
      expect(screen.getByText('B2')).toBeInTheDocument(); // Better provider badge
      expect(screen.getByText('R2')).toBeInTheDocument(); // Better provider badge
    });
  });

  it('shows cost breakdown in costs tab', async () => {
    render(<StorageProviderAnalytics />);

    // Switch to costs tab
    await waitFor(() => {
      const costsTab = screen.getByRole('tab', { name: /هزینه‌ها/ });
      fireEvent.click(costsTab);
    });

    await waitFor(() => {
      expect(screen.getByText('$44.25')).toBeInTheDocument(); // Total monthly cost
      expect(screen.getByText('$46.25')).toBeInTheDocument(); // Next month projection
    });
  });

  it('displays redundancy information in redundancy tab', async () => {
    render(<StorageProviderAnalytics />);

    // Switch to redundancy tab
    await waitFor(() => {
      const redundancyTab = screen.getByRole('tab', { name: /افزونگی/ });
      fireEvent.click(redundancyTab);
    });

    await waitFor(() => {
      expect(screen.getByText('وضعیت افزونگی فایل‌ها')).toBeInTheDocument();
      expect(screen.getByText('96.0%')).toBeInTheDocument(); // Redundancy percentage
      expect(screen.getByText('1,200')).toBeInTheDocument(); // Files in both providers
    });
  });

  it('renders usage history chart', async () => {
    render(<StorageProviderAnalytics />);

    await waitFor(() => {
      const chartElement = screen.getByTestId('line-chart');
      expect(chartElement).toBeInTheDocument();
      
      const chartData = screen.getByTestId('chart-data');
      expect(chartData.textContent).toContain('Backblaze B2');
      expect(chartData.textContent).toContain('Cloudflare R2');
    });
  });

  it('shows cost trends chart in costs tab', async () => {
    render(<StorageProviderAnalytics />);

    // Switch to costs tab
    await waitFor(() => {
      const costsTab = screen.getByRole('tab', { name: /هزینه‌ها/ });
      fireEvent.click(costsTab);
    });

    await waitFor(() => {
      expect(screen.getByText('روند هزینه‌ها')).toBeInTheDocument();
      const chartElement = screen.getByTestId('line-chart');
      expect(chartElement).toBeInTheDocument();
    });
  });

  it('displays redundancy chart in redundancy tab', async () => {
    render(<StorageProviderAnalytics />);

    // Switch to redundancy tab
    await waitFor(() => {
      const redundancyTab = screen.getByRole('tab', { name: /افزونگی/ });
      fireEvent.click(redundancyTab);
    });

    await waitFor(() => {
      const chartElement = screen.getByTestId('doughnut-chart');
      expect(chartElement).toBeInTheDocument();
    });
  });

  it('handles service errors gracefully', async () => {
    mockBackupMonitoringService.getStorageAnalytics.mockRejectedValue(
      new Error('Service unavailable')
    );

    render(<StorageProviderAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('آمار و تحلیل ذخیره‌سازی')).toBeInTheDocument();
    });
  });

  it('formats currency values correctly', async () => {
    render(<StorageProviderAnalytics />);

    await waitFor(() => {
      // Check currency formatting
      expect(screen.getByText('$25.75')).toBeInTheDocument();
      expect(screen.getByText('$18.50')).toBeInTheDocument();
    });
  });

  it('shows trend indicators correctly', async () => {
    render(<StorageProviderAnalytics />);

    await waitFor(() => {
      // Should show trend percentages
      expect(screen.getByText('5.2%')).toBeInTheDocument(); // B2 positive trend
      expect(screen.getByText('2.1%')).toBeInTheDocument(); // R2 negative trend (absolute value)
    });
  });

  it('displays provider-specific colors and branding', async () => {
    render(<StorageProviderAnalytics />);

    await waitFor(() => {
      // Check that provider names are displayed
      expect(screen.getByText('Backblaze B2')).toBeInTheDocument();
      expect(screen.getByText('Cloudflare R2')).toBeInTheDocument();
    });
  });

  it('switches between tabs correctly', async () => {
    render(<StorageProviderAnalytics />);

    // Start with overview tab (default)
    await waitFor(() => {
      expect(screen.getByText('روند استفاده از ذخیره‌سازی (۳۰ روز)')).toBeInTheDocument();
    });

    // Switch to performance tab
    const performanceTab = screen.getByRole('tab', { name: /عملکرد/ });
    fireEvent.click(performanceTab);

    await waitFor(() => {
      expect(screen.getByText('مقایسه عملکرد ارائه‌دهندگان')).toBeInTheDocument();
    });

    // Switch to costs tab
    const costsTab = screen.getByRole('tab', { name: /هزینه‌ها/ });
    fireEvent.click(costsTab);

    await waitFor(() => {
      expect(screen.getByText('روند هزینه‌ها')).toBeInTheDocument();
    });

    // Switch to redundancy tab
    const redundancyTab = screen.getByRole('tab', { name: /افزونگی/ });
    fireEvent.click(redundancyTab);

    await waitFor(() => {
      expect(screen.getByText('وضعیت افزونگی فایل‌ها')).toBeInTheDocument();
    });
  });
});