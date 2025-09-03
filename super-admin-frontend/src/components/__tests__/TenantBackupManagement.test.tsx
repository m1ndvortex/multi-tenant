import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import TenantBackupManagement from '../TenantBackupManagement';
import { backupService } from '@/services/backupService';
import { TenantBackup } from '@/types/backup';

// Mock the backup service
vi.mock('@/services/backupService');

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockBackups: TenantBackup[] = [
  {
    id: '1',
    tenant_id: 'tenant-1',
    tenant_name: 'Test Tenant 1',
    backup_date: '2024-01-15T10:00:00Z',
    file_size: 1024 * 1024 * 100, // 100MB
    storage_provider: 'cloudflare_r2',
    file_path: '/backups/tenant-1/backup.sql.gz',
    encryption_status: 'encrypted',
    integrity_status: 'verified',
    created_at: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    tenant_id: 'tenant-2',
    tenant_name: 'Test Tenant 2',
    backup_date: '2024-01-14T10:00:00Z',
    file_size: 1024 * 1024 * 50, // 50MB
    storage_provider: 'backblaze_b2',
    file_path: '/backups/tenant-2/backup.sql.gz',
    encryption_status: 'encrypted',
    integrity_status: 'pending',
    created_at: '2024-01-14T10:00:00Z',
  },
];

const mockPaginatedResponse = {
  backups: mockBackups,
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

describe('TenantBackupManagement', () => {
  const mockOnRestoreClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (backupService.getTenantBackups as any).mockResolvedValue(mockPaginatedResponse);
  });

  it('renders tenant backup management interface', async () => {
    renderWithQueryClient(
      <TenantBackupManagement onRestoreClick={mockOnRestoreClick} />
    );

    expect(screen.getByText('مدیریت پشتیبان‌گیری تنانت‌ها')).toBeInTheDocument();
    expect(screen.getByText('پشتیبان‌گیری جدید')).toBeInTheDocument();
    expect(screen.getByText('بروزرسانی')).toBeInTheDocument();
  });

  it('displays backup list correctly', async () => {
    renderWithQueryClient(
      <TenantBackupManagement onRestoreClick={mockOnRestoreClick} />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Tenant 1')).toBeInTheDocument();
      expect(screen.getByText('Test Tenant 2')).toBeInTheDocument();
    });

    // Check file sizes are formatted correctly
    expect(screen.getByText('100 MB')).toBeInTheDocument();
    expect(screen.getByText('50 MB')).toBeInTheDocument();

    // Check storage providers
    expect(screen.getByText('Cloudflare R2')).toBeInTheDocument();
    expect(screen.getByText('Backblaze B2')).toBeInTheDocument();

    // Check integrity status badges
    expect(screen.getByText('تایید شده')).toBeInTheDocument();
    expect(screen.getByText('در انتظار')).toBeInTheDocument();
  });

  it('handles filter changes correctly', async () => {
    renderWithQueryClient(
      <TenantBackupManagement onRestoreClick={mockOnRestoreClick} />
    );

    const tenantNameInput = screen.getByPlaceholderText('جستجو در نام تنانت...');
    fireEvent.change(tenantNameInput, { target: { value: 'Test Tenant' } });

    await waitFor(() => {
      expect(backupService.getTenantBackups).toHaveBeenCalledWith(
        1,
        10,
        expect.objectContaining({ tenant_name: 'Test Tenant' })
      );
    });
  });

  it('opens create backup dialog', async () => {
    renderWithQueryClient(
      <TenantBackupManagement onRestoreClick={mockOnRestoreClick} />
    );

    const createButton = screen.getByText('پشتیبان‌گیری جدید');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('ایجاد پشتیبان جدید')).toBeInTheDocument();
      expect(screen.getByText('ارائه‌دهنده ذخیره‌سازی')).toBeInTheDocument();
    });
  });

  it('creates new backup successfully', async () => {
    (backupService.createTenantBackup as any).mockResolvedValue({ job_id: 'job-123' });

    renderWithQueryClient(
      <TenantBackupManagement onRestoreClick={mockOnRestoreClick} />
    );

    // Open dialog
    const createButton = screen.getByText('پشتیبان‌گیری جدید');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('ایجاد پشتیبان جدید')).toBeInTheDocument();
    });

    // Fill tenant IDs
    const tenantInput = screen.getByPlaceholderText('شناسه تنانت‌ها را وارد کنید (با کاما جدا کنید)');
    fireEvent.change(tenantInput, { target: { value: 'tenant-1, tenant-2' } });

    // Submit
    const submitButton = screen.getByText('ایجاد پشتیبان');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(backupService.createTenantBackup).toHaveBeenCalledWith(
        ['tenant-1', 'tenant-2'],
        'cloudflare_r2'
      );
    });
  });

  it('calls onRestoreClick when restore button is clicked', async () => {
    renderWithQueryClient(
      <TenantBackupManagement onRestoreClick={mockOnRestoreClick} />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Tenant 1')).toBeInTheDocument();
    });

    const restoreButtons = screen.getAllByText('بازیابی');
    fireEvent.click(restoreButtons[0]);

    expect(mockOnRestoreClick).toHaveBeenCalledWith(mockBackups[0]);
  });

  it('verifies backup integrity', async () => {
    (backupService.verifyBackupIntegrity as any).mockResolvedValue({ job_id: 'verify-123' });

    renderWithQueryClient(
      <TenantBackupManagement onRestoreClick={mockOnRestoreClick} />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Tenant 1')).toBeInTheDocument();
    });

    const verifyButtons = screen.getAllByText('بررسی');
    fireEvent.click(verifyButtons[0]);

    await waitFor(() => {
      expect(backupService.verifyBackupIntegrity).toHaveBeenCalledWith('1', 'tenant');
    });
  });

  it('handles pagination correctly', async () => {
    const mockPaginatedResponsePage1 = {
      ...mockPaginatedResponse,
      pagination: {
        page: 1,
        limit: 10,
        total: 15,
        totalPages: 2,
      },
    };

    (backupService.getTenantBackups as any).mockResolvedValue(mockPaginatedResponsePage1);

    renderWithQueryClient(
      <TenantBackupManagement onRestoreClick={mockOnRestoreClick} />
    );

    await waitFor(() => {
      expect(screen.getByText('نمایش 1 تا 10 از 15 مورد')).toBeInTheDocument();
    });

    const nextButton = screen.getByText('بعدی');
    expect(nextButton).toBeDisabled();

    const prevButton = screen.getByText('قبلی');
    expect(prevButton).not.toBeDisabled();
  });

  it('displays empty state when no backups exist', async () => {
    (backupService.getTenantBackups as any).mockResolvedValue({
      backups: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      },
    });

    renderWithQueryClient(
      <TenantBackupManagement onRestoreClick={mockOnRestoreClick} />
    );

    await waitFor(() => {
      expect(screen.getByText('هیچ پشتیبانی یافت نشد')).toBeInTheDocument();
    });
  });

  it('displays loading state', () => {
    (backupService.getTenantBackups as any).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderWithQueryClient(
      <TenantBackupManagement onRestoreClick={mockOnRestoreClick} />
    );

    expect(screen.getByText('در حال بارگذاری...')).toBeInTheDocument();
  });

  it('refreshes data when refresh button is clicked', async () => {
    renderWithQueryClient(
      <TenantBackupManagement onRestoreClick={mockOnRestoreClick} />
    );

    const refreshButton = screen.getByText('بروزرسانی');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(backupService.getTenantBackups).toHaveBeenCalledTimes(2);
    });
  });
});