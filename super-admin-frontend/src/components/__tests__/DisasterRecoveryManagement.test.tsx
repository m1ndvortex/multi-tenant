import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import DisasterRecoveryManagement from '../DisasterRecoveryManagement';
import { backupService } from '@/services/backupService';
import { DisasterRecoveryBackup } from '@/types/backup';

// Mock the backup service
vi.mock('@/services/backupService');

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockDisasterRecoveryBackups: DisasterRecoveryBackup[] = [
  {
    id: '1',
    backup_date: '2024-01-15T02:00:00Z',
    backup_type: 'full_platform',
    file_size: 1024 * 1024 * 1024 * 5, // 5GB
    cloudflare_r2_status: 'uploaded',
    backblaze_b2_status: 'uploaded',
    cloudflare_r2_path: '/disaster-recovery/full-platform-2024-01-15.tar.gz',
    backblaze_b2_path: '/disaster-recovery/full-platform-2024-01-15.tar.gz',
    integrity_status: 'verified',
    created_at: '2024-01-15T02:00:00Z',
  },
  {
    id: '2',
    backup_date: '2024-01-14T02:00:00Z',
    backup_type: 'database_only',
    file_size: 1024 * 1024 * 1024 * 2, // 2GB
    cloudflare_r2_status: 'uploaded',
    backblaze_b2_status: 'failed',
    cloudflare_r2_path: '/disaster-recovery/database-2024-01-14.sql.gz',
    integrity_status: 'pending',
    created_at: '2024-01-14T02:00:00Z',
  },
];

const mockPaginatedResponse = {
  backups: mockDisasterRecoveryBackups,
  pagination: {
    page: 1,
    limit: 10,
    total: 2,
    totalPages: 1,
  },
};

const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
};

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('DisasterRecoveryManagement', () => {
  const mockOnRestoreClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (backupService.getDisasterRecoveryBackups as any).mockResolvedValue(mockPaginatedResponse);
  });

  it('renders disaster recovery management interface', async () => {
    renderWithQueryClient(
      <DisasterRecoveryManagement onRestoreClick={mockOnRestoreClick} />
    );

    expect(screen.getByText('مدیریت بازیابی فاجعه')).toBeInTheDocument();
    expect(screen.getByText('پشتیبان کامل جدید')).toBeInTheDocument();
    expect(screen.getByText('بروزرسانی')).toBeInTheDocument();
  });

  it('displays status overview cards correctly', async () => {
    renderWithQueryClient(
      <DisasterRecoveryManagement onRestoreClick={mockOnRestoreClick} />
    );

    await waitFor(() => {
      expect(screen.getByText('Cloudflare R2')).toBeInTheDocument();
      expect(screen.getByText('Backblaze B2')).toBeInTheDocument();
      expect(screen.getByText('کل حجم')).toBeInTheDocument();
    });

    // Check successful backup counts
    expect(screen.getByText('2')).toBeInTheDocument(); // Cloudflare R2 successful
    expect(screen.getByText('1')).toBeInTheDocument(); // Backblaze B2 successful
  });

  it('displays disaster recovery backup list correctly', async () => {
    renderWithQueryClient(
      <DisasterRecoveryManagement onRestoreClick={mockOnRestoreClick} />
    );

    await waitFor(() => {
      expect(screen.getByText('پلتفرم کامل')).toBeInTheDocument();
      expect(screen.getByText('فقط پایگاه داده')).toBeInTheDocument();
    });

    // Check file sizes are formatted correctly
    expect(screen.getByText('5 GB')).toBeInTheDocument();
    expect(screen.getByText('2 GB')).toBeInTheDocument();

    // Check storage status badges
    expect(screen.getAllByText('آپلود شده')).toHaveLength(3); // 2 for first backup, 1 for second
    expect(screen.getByText('ناموفق')).toBeInTheDocument();

    // Check integrity status
    expect(screen.getByText('تایید شده')).toBeInTheDocument();
    expect(screen.getByText('در انتظار')).toBeInTheDocument();
  });

  it('creates new disaster recovery backup', async () => {
    (backupService.createDisasterRecoveryBackup as any).mockResolvedValue({ job_id: 'dr-job-123' });

    renderWithQueryClient(
      <DisasterRecoveryManagement onRestoreClick={mockOnRestoreClick} />
    );

    const createButton = screen.getByText('پشتیبان کامل جدید');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(backupService.createDisasterRecoveryBackup).toHaveBeenCalled();
    });
  });

  it('shows loading state for create backup button', async () => {
    (backupService.createDisasterRecoveryBackup as any).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderWithQueryClient(
      <DisasterRecoveryManagement onRestoreClick={mockOnRestoreClick} />
    );

    const createButton = screen.getByText('پشتیبان کامل جدید');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('در حال ایجاد...')).toBeInTheDocument();
    });
  });

  it('calls onRestoreClick when restore button is clicked', async () => {
    renderWithQueryClient(
      <DisasterRecoveryManagement onRestoreClick={mockOnRestoreClick} />
    );

    await waitFor(() => {
      expect(screen.getByText('پلتفرم کامل')).toBeInTheDocument();
    });

    const restoreButtons = screen.getAllByText('بازیابی');
    fireEvent.click(restoreButtons[0]);

    expect(mockOnRestoreClick).toHaveBeenCalledWith(mockDisasterRecoveryBackups[0]);
  });

  it('verifies backup integrity', async () => {
    (backupService.verifyBackupIntegrity as any).mockResolvedValue({ job_id: 'verify-dr-123' });

    renderWithQueryClient(
      <DisasterRecoveryManagement onRestoreClick={mockOnRestoreClick} />
    );

    await waitFor(() => {
      expect(screen.getByText('پلتفرم کامل')).toBeInTheDocument();
    });

    const verifyButtons = screen.getAllByText('بررسی');
    fireEvent.click(verifyButtons[0]);

    await waitFor(() => {
      expect(backupService.verifyBackupIntegrity).toHaveBeenCalledWith('1', 'disaster_recovery');
    });
  });

  it('displays correct backup type icons and labels', async () => {
    renderWithQueryClient(
      <DisasterRecoveryManagement onRestoreClick={mockOnRestoreClick} />
    );

    await waitFor(() => {
      expect(screen.getByText('پلتفرم کامل')).toBeInTheDocument();
      expect(screen.getByText('فقط پایگاه داده')).toBeInTheDocument();
    });
  });

  it('shows storage status with correct icons', async () => {
    renderWithQueryClient(
      <DisasterRecoveryManagement onRestoreClick={mockOnRestoreClick} />
    );

    await waitFor(() => {
      // Should show check icons for successful uploads and X icon for failed
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });
  });

  it('handles pagination correctly', async () => {
    const mockPaginatedResponsePage2 = {
      ...mockPaginatedResponse,
      pagination: {
        page: 2,
        limit: 10,
        total: 15,
        totalPages: 2,
      },
    };

    (backupService.getDisasterRecoveryBackups as any).mockResolvedValue(mockPaginatedResponsePage2);

    renderWithQueryClient(
      <DisasterRecoveryManagement onRestoreClick={mockOnRestoreClick} />
    );

    await waitFor(() => {
      expect(screen.getByText('نمایش 11 تا 15 از 15 مورد')).toBeInTheDocument();
    });
  });

  it('displays empty state when no backups exist', async () => {
    (backupService.getDisasterRecoveryBackups as any).mockResolvedValue({
      backups: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      },
    });

    renderWithQueryClient(
      <DisasterRecoveryManagement onRestoreClick={mockOnRestoreClick} />
    );

    await waitFor(() => {
      expect(screen.getByText('هیچ پشتیبان فاجعه‌ای یافت نشد')).toBeInTheDocument();
    });
  });

  it('displays loading state', () => {
    (backupService.getDisasterRecoveryBackups as any).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderWithQueryClient(
      <DisasterRecoveryManagement onRestoreClick={mockOnRestoreClick} />
    );

    expect(screen.getByText('در حال بارگذاری...')).toBeInTheDocument();
  });

  it('refreshes data when refresh button is clicked', async () => {
    renderWithQueryClient(
      <DisasterRecoveryManagement onRestoreClick={mockOnRestoreClick} />
    );

    const refreshButton = screen.getByText('بروزرسانی');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(backupService.getDisasterRecoveryBackups).toHaveBeenCalledTimes(2);
    });
  });

  it('calculates total storage size correctly in overview', async () => {
    renderWithQueryClient(
      <DisasterRecoveryManagement onRestoreClick={mockOnRestoreClick} />
    );

    await waitFor(() => {
      // Total should be 5GB + 2GB = 7GB
      expect(screen.getByText('7 GB')).toBeInTheDocument();
    });
  });
});