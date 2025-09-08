import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import BackupMonitoringDashboard from '../BackupMonitoringDashboard';
import { backupMonitoringService } from '@/services/backupMonitoringService';

// Mock the service
vi.mock('@/services/backupMonitoringService');
const mockBackupMonitoringService = vi.mocked(backupMonitoringService);

// Mock Chart.js
vi.mock('react-chartjs-2', () => ({
  Line: ({ data, options }: any) => (
    <div data-testid="line-chart">
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
      <div data-testid="chart-options">{JSON.stringify(options)}</div>
    </div>
  ),
}));

// Mock toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockStatus = {
  overall_status: 'healthy' as const,
  tenant_backups: {
    total_tenants: 10,
    successful_backups_24h: 8,
    failed_backups_24h: 2,
    pending_backups: 1,
    last_backup_time: '2024-01-15T10:00:00Z',
  },
  disaster_recovery: {
    last_full_backup: '2024-01-15T02:00:00Z',
    backup_status: 'success' as const,
    next_scheduled_backup: '2024-01-16T02:00:00Z',
  },
  storage_providers: {
    backblaze_b2: {
      status: 'healthy' as const,
      response_time: 150,
      last_check: '2024-01-15T10:00:00Z',
      uptime_percentage: 99.9,
    },
    cloudflare_r2: {
      status: 'healthy' as const,
      response_time: 120,
      last_check: '2024-01-15T10:00:00Z',
      uptime_percentage: 99.8,
    },
  },
};

const mockHealthMetrics = {
  success_rate_24h: 95.5,
  success_rate_7d: 97.2,
  success_rate_30d: 96.8,
  average_backup_size_gb: 2.5,
  average_backup_duration_minutes: 15,
  storage_efficiency_percentage: 85.3,
  redundancy_compliance_percentage: 98.5,
  cost_per_gb_monthly: 0.025,
};

const mockTrends = [
  {
    date: '2024-01-10',
    successful_backups: 8,
    failed_backups: 1,
    total_size_gb: 20.5,
    average_duration_minutes: 14,
  },
  {
    date: '2024-01-11',
    successful_backups: 9,
    failed_backups: 0,
    total_size_gb: 22.1,
    average_duration_minutes: 16,
  },
];

describe('BackupMonitoringDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBackupMonitoringService.getBackupMonitoringStatus.mockResolvedValue(mockStatus);
    mockBackupMonitoringService.getBackupHealthMetrics.mockResolvedValue(mockHealthMetrics);
    mockBackupMonitoringService.getBackupTrends.mockResolvedValue(mockTrends);
  });

  it('renders dashboard with loading state initially', () => {
    render(<BackupMonitoringDashboard />);
    
    // Should show loading skeletons
    const loadingElements = screen.getAllByRole('generic');
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('displays backup monitoring status after loading', async () => {
    render(<BackupMonitoringDashboard />);

    await waitFor(() => {
      expect(screen.getByText('داشبورد نظارت پشتیبان‌گیری')).toBeInTheDocument();
    });

    // Check overall status
    expect(screen.getAllByText('سالم')[0]).toBeInTheDocument();
    
    // Check tenant backup stats
    expect(screen.getByText('8')).toBeInTheDocument(); // successful backups
    expect(screen.getByText('2 ناموفق')).toBeInTheDocument(); // failed backups
  });

  it('displays health metrics correctly', async () => {
    render(<BackupMonitoringDashboard />);

    await waitFor(() => {
      expect(screen.getByText('97.2%')).toBeInTheDocument(); // 7-day success rate
      expect(screen.getByText('85.3%')).toBeInTheDocument(); // storage efficiency
      expect(screen.getByText('میانگین: 2.50 GB')).toBeInTheDocument(); // average backup size
    });
  });

  it('shows storage provider status', async () => {
    render(<BackupMonitoringDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Backblaze B2 (اصلی)')).toBeInTheDocument();
      expect(screen.getByText('Cloudflare R2 (پشتیبان)')).toBeInTheDocument();
      expect(screen.getByText('150ms')).toBeInTheDocument(); // B2 response time
      expect(screen.getByText('120ms')).toBeInTheDocument(); // R2 response time
    });
  });

  it('renders trends chart with correct data', async () => {
    render(<BackupMonitoringDashboard />);

    await waitFor(() => {
      const chartElement = screen.getByTestId('line-chart');
      expect(chartElement).toBeInTheDocument();
      
      const chartData = screen.getByTestId('chart-data');
      expect(chartData.textContent).toContain('پشتیبان‌های موفق');
      expect(chartData.textContent).toContain('پشتیبان‌های ناموفق');
    });
  });

  it('handles refresh button click', async () => {
    render(<BackupMonitoringDashboard />);

    await waitFor(() => {
      const refreshButton = screen.getByRole('button', { name: /بروزرسانی/ });
      expect(refreshButton).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /بروزرسانی/ });
    fireEvent.click(refreshButton);

    // Should call the service methods again
    await waitFor(() => {
      expect(mockBackupMonitoringService.getBackupMonitoringStatus).toHaveBeenCalledTimes(2);
      expect(mockBackupMonitoringService.getBackupHealthMetrics).toHaveBeenCalledTimes(2);
      expect(mockBackupMonitoringService.getBackupTrends).toHaveBeenCalledTimes(2);
    });
  });

  it('displays warning status correctly', async () => {
    const warningStatus = {
      ...mockStatus,
      overall_status: 'warning' as const,
      storage_providers: {
        ...mockStatus.storage_providers,
        backblaze_b2: {
          ...mockStatus.storage_providers.backblaze_b2,
          status: 'degraded' as const,
          error_message: 'High response time detected',
        },
      },
    };

    mockBackupMonitoringService.getBackupMonitoringStatus.mockResolvedValue(warningStatus);

    render(<BackupMonitoringDashboard />);

    await waitFor(() => {
      expect(screen.getByText('هشدار')).toBeInTheDocument();
      expect(screen.getByText('کاهش عملکرد')).toBeInTheDocument();
      expect(screen.getByText('High response time detected')).toBeInTheDocument();
    });
  });

  it('displays critical status correctly', async () => {
    const criticalStatus = {
      ...mockStatus,
      overall_status: 'critical' as const,
      storage_providers: {
        ...mockStatus.storage_providers,
        cloudflare_r2: {
          ...mockStatus.storage_providers.cloudflare_r2,
          status: 'unavailable' as const,
          error_message: 'Service unavailable',
        },
      },
    };

    mockBackupMonitoringService.getBackupMonitoringStatus.mockResolvedValue(criticalStatus);

    render(<BackupMonitoringDashboard />);

    await waitFor(() => {
      expect(screen.getByText('بحرانی')).toBeInTheDocument();
      expect(screen.getByText('غیرفعال')).toBeInTheDocument();
      expect(screen.getByText('Service unavailable')).toBeInTheDocument();
    });
  });

  it('handles service errors gracefully', async () => {
    mockBackupMonitoringService.getBackupMonitoringStatus.mockRejectedValue(
      new Error('Service unavailable')
    );

    render(<BackupMonitoringDashboard />);

    // Should not crash and should show loading state
    await waitFor(() => {
      expect(screen.getByText('داشبورد نظارت پشتیبان‌گیری')).toBeInTheDocument();
    });
  });

  it('updates data at specified refresh interval', async () => {
    const refreshInterval = 1000; // 1 second for testing
    render(<BackupMonitoringDashboard refreshInterval={refreshInterval} />);

    // Initial load
    await waitFor(() => {
      expect(mockBackupMonitoringService.getBackupMonitoringStatus).toHaveBeenCalledTimes(1);
    });

    // Wait for refresh interval
    await new Promise(resolve => setTimeout(resolve, refreshInterval + 100));

    await waitFor(() => {
      expect(mockBackupMonitoringService.getBackupMonitoringStatus).toHaveBeenCalledTimes(2);
    });
  });

  it('displays health metrics summary cards', async () => {
    render(<BackupMonitoringDashboard />);

    await waitFor(() => {
      expect(screen.getByText('96.8%')).toBeInTheDocument(); // 30-day success rate
      expect(screen.getByText('15m')).toBeInTheDocument(); // average duration
      expect(screen.getByText('$0.025')).toBeInTheDocument(); // cost per GB
    });
  });

  it('formats time and percentages correctly', async () => {
    render(<BackupMonitoringDashboard />);

    await waitFor(() => {
      // Check percentage formatting
      expect(screen.getByText('99.9%')).toBeInTheDocument(); // B2 uptime
      expect(screen.getByText('99.8%')).toBeInTheDocument(); // R2 uptime
      
      // Check response time formatting
      expect(screen.getByText('150ms')).toBeInTheDocument();
      expect(screen.getByText('120ms')).toBeInTheDocument();
    });
  });
});