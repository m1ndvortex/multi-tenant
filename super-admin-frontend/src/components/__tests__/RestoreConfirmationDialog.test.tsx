import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import RestoreConfirmationDialog from '../RestoreConfirmationDialog';
import { backupService } from '@/services/backupService';
import { TenantBackup, DisasterRecoveryBackup } from '@/types/backup';

// Mock the backup service
vi.mock('@/services/backupService');

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockTenantBackup: TenantBackup = {
  id: '1',
  tenant_id: 'tenant-1',
  tenant_name: 'Test Tenant',
  backup_date: '2024-01-15T10:00:00Z',
  file_size: 1024 * 1024 * 100, // 100MB
  storage_provider: 'cloudflare_r2',
  file_path: '/backups/tenant-1/backup.sql.gz',
  encryption_status: 'encrypted',
  integrity_status: 'verified',
  created_at: '2024-01-15T10:00:00Z',
};

const mockDisasterRecoveryBackup: DisasterRecoveryBackup = {
  id: '2',
  backup_date: '2024-01-15T02:00:00Z',
  backup_type: 'full_platform',
  file_size: 1024 * 1024 * 1024 * 5, // 5GB
  cloudflare_r2_status: 'uploaded',
  backblaze_b2_status: 'uploaded',
  cloudflare_r2_path: '/disaster-recovery/full-platform.tar.gz',
  backblaze_b2_path: '/disaster-recovery/full-platform.tar.gz',
  integrity_status: 'verified',
  created_at: '2024-01-15T02:00:00Z',
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

describe('RestoreConfirmationDialog', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders tenant backup restore dialog correctly', () => {
    renderWithQueryClient(
      <RestoreConfirmationDialog
        isOpen={true}
        onClose={mockOnClose}
        backup={mockTenantBackup}
        backupType="tenant"
      />
    );

    expect(screen.getByText('تأیید بازیابی داده‌ها')).toBeInTheDocument();
    expect(screen.getByText('هشدار مهم')).toBeInTheDocument();
    expect(screen.getByText('اطلاعات پشتیبان')).toBeInTheDocument();
    expect(screen.getByText('Test Tenant')).toBeInTheDocument();
    expect(screen.getByText('100 MB')).toBeInTheDocument();
  });

  it('renders disaster recovery restore dialog correctly', () => {
    renderWithQueryClient(
      <RestoreConfirmationDialog
        isOpen={true}
        onClose={mockOnClose}
        backup={mockDisasterRecoveryBackup}
        backupType="disaster_recovery"
      />
    );

    expect(screen.getByText('تأیید بازیابی فاجعه')).toBeInTheDocument();
    expect(screen.getByText('کل پلتفرم برای مدتی غیرفعال خواهد شد')).toBeInTheDocument();
    expect(screen.getByText('5 GB')).toBeInTheDocument();
  });

  it('shows correct confirmation phrase for tenant backup', () => {
    renderWithQueryClient(
      <RestoreConfirmationDialog
        isOpen={true}
        onClose={mockOnClose}
        backup={mockTenantBackup}
        backupType="tenant"
      />
    );

    expect(screen.getByText('برای تأیید، عبارت "RESTORE DATA" را تایپ کنید:')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('RESTORE DATA')).toBeInTheDocument();
  });

  it('shows correct confirmation phrase for disaster recovery', () => {
    renderWithQueryClient(
      <RestoreConfirmationDialog
        isOpen={true}
        onClose={mockOnClose}
        backup={mockDisasterRecoveryBackup}
        backupType="disaster_recovery"
      />
    );

    expect(screen.getByText('برای تأیید، عبارت "RESTORE PLATFORM" را تایپ کنید:')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('RESTORE PLATFORM')).toBeInTheDocument();
  });

  it('enables restore button only when all conditions are met', async () => {
    renderWithQueryClient(
      <RestoreConfirmationDialog
        isOpen={true}
        onClose={mockOnClose}
        backup={mockTenantBackup}
        backupType="tenant"
      />
    );

    const restoreButton = screen.getByText('شروع بازیابی');
    expect(restoreButton).toBeDisabled();

    // Check risk acknowledgment
    const riskCheckbox = screen.getByLabelText(/من خطرات این عملیات را درک کرده‌ام/);
    fireEvent.click(riskCheckbox);

    // Still disabled without confirmation phrase
    expect(restoreButton).toBeDisabled();

    // Enter confirmation phrase
    const confirmationInput = screen.getByPlaceholderText('RESTORE DATA');
    fireEvent.change(confirmationInput, { target: { value: 'RESTORE DATA' } });

    await waitFor(() => {
      expect(restoreButton).not.toBeDisabled();
    });
  });

  it('shows confirmation success indicator', async () => {
    renderWithQueryClient(
      <RestoreConfirmationDialog
        isOpen={true}
        onClose={mockOnClose}
        backup={mockTenantBackup}
        backupType="tenant"
      />
    );

    const confirmationInput = screen.getByPlaceholderText('RESTORE DATA');
    fireEvent.change(confirmationInput, { target: { value: 'RESTORE DATA' } });

    await waitFor(() => {
      expect(screen.getByText('عبارت تأیید صحیح است')).toBeInTheDocument();
    });
  });

  it('handles storage provider selection', () => {
    renderWithQueryClient(
      <RestoreConfirmationDialog
        isOpen={true}
        onClose={mockOnClose}
        backup={mockTenantBackup}
        backupType="tenant"
      />
    );

    expect(screen.getByText('انتخاب ارائه‌دهنده ذخیره‌سازی')).toBeInTheDocument();
    expect(screen.getByText('Cloudflare R2 (اصلی)')).toBeInTheDocument();
  });

  it('shows restore type selection for tenant backups', () => {
    renderWithQueryClient(
      <RestoreConfirmationDialog
        isOpen={true}
        onClose={mockOnClose}
        backup={mockTenantBackup}
        backupType="tenant"
      />
    );

    expect(screen.getByText('نوع بازیابی')).toBeInTheDocument();
    expect(screen.getByText('بازیابی تک تنانت')).toBeInTheDocument();
  });

  it('does not show restore type selection for disaster recovery', () => {
    renderWithQueryClient(
      <RestoreConfirmationDialog
        isOpen={true}
        onClose={mockOnClose}
        backup={mockDisasterRecoveryBackup}
        backupType="disaster_recovery"
      />
    );

    expect(screen.queryByText('نوع بازیابی')).not.toBeInTheDocument();
  });

  it('shows tenant selection for multiple tenant restore', async () => {
    renderWithQueryClient(
      <RestoreConfirmationDialog
        isOpen={true}
        onClose={mockOnClose}
        backup={mockTenantBackup}
        backupType="tenant"
      />
    );

    // Change restore type to multiple
    const restoreTypeSelect = screen.getByDisplayValue('بازیابی تک تنانت');
    fireEvent.click(restoreTypeSelect);
    
    const multipleOption = screen.getByText('بازیابی چند تنانت');
    fireEvent.click(multipleOption);

    await waitFor(() => {
      expect(screen.getByText('انتخاب تنانت‌ها')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('شناسه تنانت‌ها را وارد کنید (با کاما جدا کنید)')).toBeInTheDocument();
    });
  });

  it('handles rollback option correctly', () => {
    renderWithQueryClient(
      <RestoreConfirmationDialog
        isOpen={true}
        onClose={mockOnClose}
        backup={mockTenantBackup}
        backupType="tenant"
      />
    );

    const rollbackCheckbox = screen.getByLabelText(/فعال‌سازی قابلیت rollback/);
    expect(rollbackCheckbox).toBeChecked(); // Should be checked by default

    fireEvent.click(rollbackCheckbox);
    expect(rollbackCheckbox).not.toBeChecked();
  });

  it('submits restore request with correct data', async () => {
    const mockRestoreOperation = {
      id: 'restore-123',
      operation_type: 'tenant_restore' as const,
      tenant_ids: ['tenant-1'],
      backup_id: '1',
      storage_provider: 'cloudflare_r2' as const,
      status: 'pending' as const,
      progress_percentage: 0,
      started_at: '2024-01-15T12:00:00Z',
    };

    (backupService.restoreTenantBackup as any).mockResolvedValue(mockRestoreOperation);

    renderWithQueryClient(
      <RestoreConfirmationDialog
        isOpen={true}
        onClose={mockOnClose}
        backup={mockTenantBackup}
        backupType="tenant"
      />
    );

    // Fill required fields
    const riskCheckbox = screen.getByLabelText(/من خطرات این عملیات را درک کرده‌ام/);
    fireEvent.click(riskCheckbox);

    const confirmationInput = screen.getByPlaceholderText('RESTORE DATA');
    fireEvent.change(confirmationInput, { target: { value: 'RESTORE DATA' } });

    const tenantInput = screen.getByPlaceholderText('شناسه تنانت‌ها را وارد کنید (با کاما جدا کنید)');
    fireEvent.change(tenantInput, { target: { value: 'tenant-1' } });

    await waitFor(() => {
      const restoreButton = screen.getByText('شروع بازیابی');
      expect(restoreButton).not.toBeDisabled();
      fireEvent.click(restoreButton);
    });

    await waitFor(() => {
      expect(backupService.restoreTenantBackup).toHaveBeenCalledWith({
        backup_id: '1',
        tenant_ids: ['tenant-1'],
        storage_provider: 'cloudflare_r2',
        restore_type: 'individual',
        confirmation_phrase: 'RESTORE DATA',
        rollback_enabled: true,
      });
    });
  });

  it('closes dialog and resets form on successful restore', async () => {
    const mockRestoreOperation = {
      id: 'restore-123',
      operation_type: 'tenant_restore' as const,
      tenant_ids: ['tenant-1'],
      backup_id: '1',
      storage_provider: 'cloudflare_r2' as const,
      status: 'pending' as const,
      progress_percentage: 0,
      started_at: '2024-01-15T12:00:00Z',
    };

    (backupService.restoreTenantBackup as any).mockResolvedValue(mockRestoreOperation);

    renderWithQueryClient(
      <RestoreConfirmationDialog
        isOpen={true}
        onClose={mockOnClose}
        backup={mockTenantBackup}
        backupType="tenant"
      />
    );

    // Fill and submit form
    const riskCheckbox = screen.getByLabelText(/من خطرات این عملیات را درک کرده‌ام/);
    fireEvent.click(riskCheckbox);

    const confirmationInput = screen.getByPlaceholderText('RESTORE DATA');
    fireEvent.change(confirmationInput, { target: { value: 'RESTORE DATA' } });

    const tenantInput = screen.getByPlaceholderText('شناسه تنانت‌ها را وارد کنید (با کاما جدا کنید)');
    fireEvent.change(tenantInput, { target: { value: 'tenant-1' } });

    const restoreButton = screen.getByText('شروع بازیابی');
    fireEvent.click(restoreButton);

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('handles cancel button correctly', () => {
    renderWithQueryClient(
      <RestoreConfirmationDialog
        isOpen={true}
        onClose={mockOnClose}
        backup={mockTenantBackup}
        backupType="tenant"
      />
    );

    const cancelButton = screen.getByText('لغو');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('does not render when backup is null', () => {
    renderWithQueryClient(
      <RestoreConfirmationDialog
        isOpen={true}
        onClose={mockOnClose}
        backup={null}
        backupType="tenant"
      />
    );

    expect(screen.queryByText('تأیید بازیابی داده‌ها')).not.toBeInTheDocument();
  });

  it('shows loading state during restore operation', async () => {
    (backupService.restoreTenantBackup as any).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderWithQueryClient(
      <RestoreConfirmationDialog
        isOpen={true}
        onClose={mockOnClose}
        backup={mockTenantBackup}
        backupType="tenant"
      />
    );

    // Fill and submit form
    const riskCheckbox = screen.getByLabelText(/من خطرات این عملیات را درک کرده‌ام/);
    fireEvent.click(riskCheckbox);

    const confirmationInput = screen.getByPlaceholderText('RESTORE DATA');
    fireEvent.change(confirmationInput, { target: { value: 'RESTORE DATA' } });

    const tenantInput = screen.getByPlaceholderText('شناسه تنانت‌ها را وارد کنید (با کاما جدا کنید)');
    fireEvent.change(tenantInput, { target: { value: 'tenant-1' } });

    const restoreButton = screen.getByText('شروع بازیابی');
    fireEvent.click(restoreButton);

    await waitFor(() => {
      expect(screen.getByText('در حال بازیابی...')).toBeInTheDocument();
    });
  });
});