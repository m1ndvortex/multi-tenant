import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import BackupRecovery from '../BackupRecovery';
import { backupService } from '@/services/backupService';

// Mock all the child components
vi.mock('@/components/TenantBackupManagement', () => ({
  default: ({ onRestoreClick }: { onRestoreClick: (backup: any) => void }) => (
    <div data-testid="tenant-backup-management">
      <button onClick={() => onRestoreClick({ id: '1', tenant_name: 'Test Tenant' })}>
        Mock Restore Tenant
      </button>
    </div>
  ),
}));

vi.mock('@/components/DisasterRecoveryManagement', () => ({
  default: ({ onRestoreClick }: { onRestoreClick: (backup: any) => void }) => (
    <div data-testid="disaster-recovery-management">
      <button onClick={() => onRestoreClick({ id: '2', backup_type: 'full_platform' })}>
        Mock Restore DR
      </button>
    </div>
  ),
}));

vi.mock('@/components/StorageUsageAnalytics', () => ({
  default: () => <div data-testid="storage-usage-analytics">Storage Analytics</div>,
}));

vi.mock('@/components/RestoreConfirmationDialog', () => ({
  default: ({ isOpen, backup, backupType, onClose }: any) => (
    <div data-testid="restore-confirmation-dialog">
      {isOpen && (
        <div>
          <div>Restore Dialog Open</div>
          <div>Backup ID: {backup?.id}</div>
          <div>Backup Type: {backupType}</div>
          <button onClick={onClose}>Close Dialog</button>
        </div>
      )}
    </div>
  ),
}));

vi.mock('@/components/RestoreOperationsMonitor', () => ({
  default: () => <div data-testid="restore-operations-monitor">Operations Monitor</div>,
}));

// Mock the backup service
vi.mock('@/services/backupService');

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

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
  const user = userEvent.setup();
  return {
    user,
    ...render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    )
  };
};

describe('BackupRecovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders backup recovery page with header', () => {
    renderWithQueryClient(<BackupRecovery />);

    expect(screen.getByText('مدیریت پشتیبان‌گیری و بازیابی')).toBeInTheDocument();
    expect(screen.getByText('مدیریت کامل پشتیبان‌گیری تنانت‌ها، بازیابی فاجعه و نظارت بر عملیات')).toBeInTheDocument();
  });

  it('renders all tab triggers', () => {
    renderWithQueryClient(<BackupRecovery />);

    expect(screen.getByText('پشتیبان تنانت‌ها')).toBeInTheDocument();
    expect(screen.getByText('بازیابی فاجعه')).toBeInTheDocument();
    expect(screen.getByText('آمار ذخیره‌سازی')).toBeInTheDocument();
    expect(screen.getByText('نظارت عملیات')).toBeInTheDocument();
  });

  it('shows tenant backup management by default', () => {
    renderWithQueryClient(<BackupRecovery />);

    expect(screen.getByTestId('tenant-backup-management')).toBeInTheDocument();
    expect(screen.queryByTestId('disaster-recovery-management')).not.toBeInTheDocument();
  });

  it('switches to disaster recovery tab', async () => {
    const { user } = renderWithQueryClient(<BackupRecovery />);

    const drTab = screen.getByText('بازیابی فاجعه');
    await user.click(drTab);

    await waitFor(() => {
      expect(screen.getByTestId('disaster-recovery-management')).toBeInTheDocument();
      expect(screen.queryByTestId('tenant-backup-management')).not.toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('switches to storage analytics tab', async () => {
    const { user } = renderWithQueryClient(<BackupRecovery />);

    const analyticsTab = screen.getByText('آمار ذخیره‌سازی');
    await user.click(analyticsTab);

    await waitFor(() => {
      expect(screen.getByTestId('storage-usage-analytics')).toBeInTheDocument();
      expect(screen.queryByTestId('tenant-backup-management')).not.toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('switches to operations monitor tab', async () => {
    const { user } = renderWithQueryClient(<BackupRecovery />);

    const monitorTab = screen.getByText('نظارت عملیات');
    await user.click(monitorTab);

    await waitFor(() => {
      expect(screen.getByTestId('restore-operations-monitor')).toBeInTheDocument();
      expect(screen.queryByTestId('tenant-backup-management')).not.toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('opens restore dialog for tenant backup', async () => {
    renderWithQueryClient(<BackupRecovery />);

    const restoreButton = screen.getByText('Mock Restore Tenant');
    fireEvent.click(restoreButton);

    await waitFor(() => {
      expect(screen.getByText('Restore Dialog Open')).toBeInTheDocument();
      expect(screen.getByText('Backup ID: 1')).toBeInTheDocument();
      expect(screen.getByText('Backup Type: tenant')).toBeInTheDocument();
    });
  });

  it('opens restore dialog for disaster recovery backup', async () => {
    const { user } = renderWithQueryClient(<BackupRecovery />);

    // Switch to disaster recovery tab
    const drTab = screen.getByText('بازیابی فاجعه');
    await user.click(drTab);

    await waitFor(() => {
      expect(screen.getByTestId('disaster-recovery-management')).toBeInTheDocument();
    }, { timeout: 5000 });

    const restoreButton = screen.getByText('Mock Restore DR');
    fireEvent.click(restoreButton);

    await waitFor(() => {
      expect(screen.getByText('Restore Dialog Open')).toBeInTheDocument();
      expect(screen.getByText('Backup ID: 2')).toBeInTheDocument();
      expect(screen.getByText('Backup Type: disaster_recovery')).toBeInTheDocument();
    });
  });

  it('closes restore dialog', async () => {
    renderWithQueryClient(<BackupRecovery />);

    // Open dialog
    const restoreButton = screen.getByText('Mock Restore Tenant');
    fireEvent.click(restoreButton);

    await waitFor(() => {
      expect(screen.getByText('Restore Dialog Open')).toBeInTheDocument();
    });

    // Close dialog
    const closeButton = screen.getByText('Close Dialog');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText('Restore Dialog Open')).not.toBeInTheDocument();
    });
  });

  it('renders restore confirmation dialog component', () => {
    renderWithQueryClient(<BackupRecovery />);

    expect(screen.getByTestId('restore-confirmation-dialog')).toBeInTheDocument();
  });

  it('has correct tab styling classes', () => {
    renderWithQueryClient(<BackupRecovery />);

    const tabsList = screen.getByRole('tablist');
    expect(tabsList).toHaveClass('bg-gradient-to-r', 'from-slate-50', 'via-slate-50', 'to-slate-50');
  });

  it('displays correct icons for each tab', () => {
    renderWithQueryClient(<BackupRecovery />);

    // Check that tabs contain icons (we can't directly test for specific icons, but we can check structure)
    const tenantTab = screen.getByText('پشتیبان تنانت‌ها').closest('button');
    const drTab = screen.getByText('بازیابی فاجعه').closest('button');
    const analyticsTab = screen.getByText('آمار ذخیره‌سازی').closest('button');
    const monitorTab = screen.getByText('نظارت عملیات').closest('button');

    expect(tenantTab).toHaveClass('flex', 'items-center', 'gap-2');
    expect(drTab).toHaveClass('flex', 'items-center', 'gap-2');
    expect(analyticsTab).toHaveClass('flex', 'items-center', 'gap-2');
    expect(monitorTab).toHaveClass('flex', 'items-center', 'gap-2');
  });

  it('maintains state when switching between tabs', async () => {
    const { user } = renderWithQueryClient(<BackupRecovery />);

    // Open restore dialog in tenant tab
    const restoreButton = screen.getByText('Mock Restore Tenant');
    fireEvent.click(restoreButton);

    await waitFor(() => {
      expect(screen.getByText('Restore Dialog Open')).toBeInTheDocument();
    });

    // Switch to another tab
    const analyticsTab = screen.getByText('آمار ذخیره‌سازی');
    await user.click(analyticsTab);

    await waitFor(() => {
      expect(screen.getByTestId('storage-usage-analytics')).toBeInTheDocument();
    }, { timeout: 5000 });

    // Dialog should still be open
    expect(screen.getByText('Restore Dialog Open')).toBeInTheDocument();
  });

  it('handles backup type state correctly', async () => {
    const { user } = renderWithQueryClient(<BackupRecovery />);

    // Test tenant backup
    const tenantRestoreButton = screen.getByText('Mock Restore Tenant');
    fireEvent.click(tenantRestoreButton);

    await waitFor(() => {
      expect(screen.getByText('Backup Type: tenant')).toBeInTheDocument();
    });

    // Close dialog
    const closeButton = screen.getByText('Close Dialog');
    fireEvent.click(closeButton);

    // Switch to DR tab and test DR backup
    const drTab = screen.getByText('بازیابی فاجعه');
    await user.click(drTab);

    await waitFor(() => {
      expect(screen.getByTestId('disaster-recovery-management')).toBeInTheDocument();
    }, { timeout: 5000 });

    const drRestoreButton = screen.getByText('Mock Restore DR');
    fireEvent.click(drRestoreButton);

    await waitFor(() => {
      expect(screen.getByText('Backup Type: disaster_recovery')).toBeInTheDocument();
    });
  });
});