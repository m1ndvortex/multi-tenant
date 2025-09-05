/**
 * Backup History Display Component Tests
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BackupHistoryDisplay from '@/components/backup/BackupHistoryDisplay';
import { backupService } from '@/services/backupService';

// Mock the backup service
vi.mock('@/services/backupService', () => ({
  backupService: {
    getBackupHistory: vi.fn(),
    getExportHistory: vi.fn(),
    downloadBackup: vi.fn(),
    downloadExport: vi.fn(),
  },
}));

// Mock toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock URL.createObjectURL and related APIs
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'mock-url'),
    revokeObjectURL: vi.fn(),
  },
});

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const container = document.getElementById('root') || document.body;
  
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>,
    { container }
  );
};

describe('BackupHistoryDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup DOM
    document.body.innerHTML = '<div id="root"></div>';
  });

  it('should render loading state initially', () => {
    vi.mocked(backupService.getBackupHistory).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );
    vi.mocked(backupService.getExportHistory).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderWithQueryClient(<BackupHistoryDisplay />);

    expect(screen.getByText('تاریخچه پشتیبان‌گیری و خروجی')).toBeInTheDocument();
  });

  it('should display backup history', async () => {
    const mockBackupHistory = [
      {
        id: 'backup-1',
        backup_date: '2024-01-01T10:00:00Z',
        status: 'completed' as const,
        file_size: 1024000,
        download_url: 'https://example.com/backup-1.zip',
        expires_at: '2024-01-08T00:00:00Z',
      },
      {
        id: 'backup-2',
        backup_date: '2024-01-02T10:00:00Z',
        status: 'failed' as const,
        file_size: 0,
        download_url: '',
        expires_at: '2024-01-09T00:00:00Z',
      },
    ];

    const mockExportHistory = [];

    vi.mocked(backupService.getBackupHistory).mockResolvedValue(mockBackupHistory);
    vi.mocked(backupService.getExportHistory).mockResolvedValue(mockExportHistory);

    renderWithQueryClient(<BackupHistoryDisplay />);

    await waitFor(() => {
      expect(screen.getByText('تاریخچه پشتیبان‌گیری و خروجی')).toBeInTheDocument();
    });

    // Check tab counts
    expect(screen.getByText('پشتیبان‌ها (2)')).toBeInTheDocument();
    expect(screen.getByText('خروجی‌ها (0)')).toBeInTheDocument();

    // Check backup entries
    expect(screen.getByText('1000 KB')).toBeInTheDocument();
    expect(screen.getAllByText('کامل شده')).toHaveLength(1);
    expect(screen.getAllByText('ناموفق')).toHaveLength(1);
  });

  it('should display export history', async () => {
    const mockBackupHistory = [];
    const mockExportHistory = [
      {
        id: 'export-1',
        status: 'completed' as const,
        progress: 100,
        format: 'csv',
        data_types: ['customers', 'products'],
        created_at: '2024-01-01T10:00:00Z',
        completed_at: '2024-01-01T10:05:00Z',
        file_size: 512000,
        download_url: 'https://example.com/export-1.csv',
      },
    ];

    vi.mocked(backupService.getBackupHistory).mockResolvedValue(mockBackupHistory);
    vi.mocked(backupService.getExportHistory).mockResolvedValue(mockExportHistory);

    renderWithQueryClient(<BackupHistoryDisplay />);

    await waitFor(() => {
      expect(screen.getByText('خروجی‌ها (1)')).toBeInTheDocument();
    });

    // Switch to exports tab
    const exportsTab = screen.getByText('خروجی‌ها (1)');
    fireEvent.click(exportsTab);

    await waitFor(() => {
      expect(screen.getByText('CSV')).toBeInTheDocument();
      expect(screen.getByText('customers، products')).toBeInTheDocument();
      expect(screen.getByText('500 KB')).toBeInTheDocument();
    });
  });

  it('should handle backup download', async () => {
    const mockBackupHistory = [
      {
        id: 'backup-1',
        backup_date: '2024-01-01T10:00:00Z',
        status: 'completed' as const,
        file_size: 1024000,
        download_url: 'https://example.com/backup-1.zip',
        expires_at: '2024-12-31T23:59:59Z', // Not expired
      },
    ];

    const mockBlob = new Blob(['backup data'], { type: 'application/zip' });

    vi.mocked(backupService.getBackupHistory).mockResolvedValue(mockBackupHistory);
    vi.mocked(backupService.getExportHistory).mockResolvedValue([]);
    vi.mocked(backupService.downloadBackup).mockResolvedValue(mockBlob);

    // Mock document.createElement and related DOM methods
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
    };
    vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);

    renderWithQueryClient(<BackupHistoryDisplay />);

    await waitFor(() => {
      expect(screen.getByText('دانلود')).toBeInTheDocument();
    });

    const downloadButton = screen.getByText('دانلود');
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(backupService.downloadBackup).toHaveBeenCalledWith('backup-1');
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockLink.download).toBe('backup-2024-01-01.zip');
    });
  });

  it('should handle export download', async () => {
    const mockBackupHistory = [];
    const mockExportHistory = [
      {
        id: 'export-1',
        status: 'completed' as const,
        progress: 100,
        format: 'csv',
        data_types: ['customers'],
        created_at: '2024-01-01T10:00:00Z',
        completed_at: '2024-01-01T10:05:00Z',
        file_size: 512000,
        download_url: 'https://example.com/export-1.csv',
      },
    ];

    const mockBlob = new Blob(['export data'], { type: 'text/csv' });

    vi.mocked(backupService.getBackupHistory).mockResolvedValue(mockBackupHistory);
    vi.mocked(backupService.getExportHistory).mockResolvedValue(mockExportHistory);
    vi.mocked(backupService.downloadExport).mockResolvedValue(mockBlob);

    // Mock document.createElement and related DOM methods
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
    };
    vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);

    renderWithQueryClient(<BackupHistoryDisplay />);

    await waitFor(() => {
      expect(screen.getByText('خروجی‌ها (1)')).toBeInTheDocument();
    });

    // Switch to exports tab
    const exportsTab = screen.getByText('خروجی‌ها (1)');
    fireEvent.click(exportsTab);

    await waitFor(() => {
      expect(screen.getByText('دانلود')).toBeInTheDocument();
    });

    const downloadButton = screen.getByText('دانلود');
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(backupService.downloadExport).toHaveBeenCalledWith('export-1');
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockLink.download).toBe('export-csv-2024-01-01.csv');
    });
  });

  it('should show expired backup status', async () => {
    const mockBackupHistory = [
      {
        id: 'backup-1',
        backup_date: '2024-01-01T10:00:00Z',
        status: 'completed' as const,
        file_size: 1024000,
        download_url: 'https://example.com/backup-1.zip',
        expires_at: '2023-12-31T23:59:59Z', // Expired
      },
    ];

    vi.mocked(backupService.getBackupHistory).mockResolvedValue(mockBackupHistory);
    vi.mocked(backupService.getExportHistory).mockResolvedValue([]);

    renderWithQueryClient(<BackupHistoryDisplay />);

    await waitFor(() => {
      expect(screen.getByText('منقضی شده')).toBeInTheDocument();
    });

    // Should not show download button for expired backup
    expect(screen.queryByText('دانلود')).not.toBeInTheDocument();
  });

  it('should show empty state for no backups', async () => {
    vi.mocked(backupService.getBackupHistory).mockResolvedValue([]);
    vi.mocked(backupService.getExportHistory).mockResolvedValue([]);

    renderWithQueryClient(<BackupHistoryDisplay />);

    await waitFor(() => {
      expect(screen.getByText('هنوز پشتیبانی ایجاد نشده است')).toBeInTheDocument();
    });
  });

  it('should show empty state for no exports', async () => {
    vi.mocked(backupService.getBackupHistory).mockResolvedValue([]);
    vi.mocked(backupService.getExportHistory).mockResolvedValue([]);

    renderWithQueryClient(<BackupHistoryDisplay />);

    await waitFor(() => {
      expect(screen.getByText('خروجی‌ها (0)')).toBeInTheDocument();
    });

    // Switch to exports tab
    const exportsTab = screen.getByText('خروجی‌ها (0)');
    fireEvent.click(exportsTab);

    await waitFor(() => {
      expect(screen.getByText('هنوز خروجی‌ای ایجاد نشده است')).toBeInTheDocument();
    });
  });

  it('should refresh history when refresh button is clicked', async () => {
    const mockBackupHistory = [
      {
        id: 'backup-1',
        backup_date: '2024-01-01T10:00:00Z',
        status: 'completed' as const,
        file_size: 1024000,
        download_url: 'https://example.com/backup-1.zip',
        expires_at: '2024-01-08T00:00:00Z',
      },
    ];

    vi.mocked(backupService.getBackupHistory).mockResolvedValue(mockBackupHistory);
    vi.mocked(backupService.getExportHistory).mockResolvedValue([]);

    renderWithQueryClient(<BackupHistoryDisplay />);

    await waitFor(() => {
      expect(screen.getByText('بروزرسانی تاریخچه')).toBeInTheDocument();
    });

    const refreshButton = screen.getByText('بروزرسانی تاریخچه');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(backupService.getBackupHistory).toHaveBeenCalledTimes(2);
      expect(backupService.getExportHistory).toHaveBeenCalledTimes(2);
    });
  });

  it('should format dates correctly', async () => {
    const mockBackupHistory = [
      {
        id: 'backup-1',
        backup_date: '2024-01-15T14:30:00Z',
        status: 'completed' as const,
        file_size: 1024000,
        download_url: 'https://example.com/backup-1.zip',
        expires_at: '2024-01-22T14:30:00Z',
      },
    ];

    vi.mocked(backupService.getBackupHistory).mockResolvedValue(mockBackupHistory);
    vi.mocked(backupService.getExportHistory).mockResolvedValue([]);

    renderWithQueryClient(<BackupHistoryDisplay />);

    await waitFor(() => {
      // Check if Persian date formatting is applied
      expect(screen.getByText(/۱۴۰۲|۱۴۰۳|2024/)).toBeInTheDocument();
    });
  });
});