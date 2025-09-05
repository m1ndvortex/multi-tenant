/**
 * Customer Backup Interface Component Tests
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CustomerBackupInterface from '@/components/backup/CustomerBackupInterface';
import { backupService } from '@/services/backupService';

// Mock the backup service
vi.mock('@/services/backupService', () => ({
  backupService: {
    checkDailyBackupLimit: vi.fn(),
    createBackup: vi.fn(),
    getBackupStatus: vi.fn(),
    downloadBackup: vi.fn(),
    cancelBackup: vi.fn(),
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

describe('CustomerBackupInterface', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup DOM
    document.body.innerHTML = '<div id="root"></div>';
  });

  it('should render loading state initially', () => {
    vi.mocked(backupService.checkDailyBackupLimit).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderWithQueryClient(<CustomerBackupInterface />);

    // Check for loading spinner
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('should display daily limit information when backup is allowed', async () => {
    const mockLimit = {
      can_backup: true,
      backups_today: 0,
      max_daily_backups: 1,
    };

    vi.mocked(backupService.checkDailyBackupLimit).mockResolvedValue(mockLimit);

    renderWithQueryClient(<CustomerBackupInterface />);

    await waitFor(() => {
      expect(screen.getByText('پشتیبان‌گیری خودکار')).toBeInTheDocument();
    });

    expect(screen.getByText('0 از 1')).toBeInTheDocument();
    expect(screen.getByText('ایجاد پشتیبان جدید')).toBeInTheDocument();
  });

  it('should display daily limit exceeded message', async () => {
    const mockLimit = {
      can_backup: false,
      backups_today: 1,
      max_daily_backups: 1,
      next_backup_available_at: '2024-01-02T00:00:00Z',
    };

    vi.mocked(backupService.checkDailyBackupLimit).mockResolvedValue(mockLimit);

    renderWithQueryClient(<CustomerBackupInterface />);

    await waitFor(() => {
      expect(screen.getByText('پشتیبان‌گیری بعدی:')).toBeInTheDocument();
    });

    expect(screen.getByText('1 از 1')).toBeInTheDocument();
  });

  it('should create backup when button is clicked', async () => {
    const mockLimit = {
      can_backup: true,
      backups_today: 0,
      max_daily_backups: 1,
    };

    const mockBackup = {
      id: 'backup-123',
      status: 'pending' as const,
      progress: 0,
      created_at: '2024-01-01T10:00:00Z',
    };

    vi.mocked(backupService.checkDailyBackupLimit).mockResolvedValue(mockLimit);
    vi.mocked(backupService.createBackup).mockResolvedValue(mockBackup);

    renderWithQueryClient(<CustomerBackupInterface />);

    await waitFor(() => {
      expect(screen.getByText('ایجاد پشتیبان جدید')).toBeInTheDocument();
    });

    const createButton = screen.getByText('ایجاد پشتیبان جدید');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(backupService.createBackup).toHaveBeenCalled();
    });
  });

  it('should display backup progress', async () => {
    const mockLimit = {
      can_backup: true,
      backups_today: 0,
      max_daily_backups: 1,
    };

    const mockBackup = {
      id: 'backup-123',
      status: 'processing' as const,
      progress: 50,
      created_at: '2024-01-01T10:00:00Z',
    };

    vi.mocked(backupService.checkDailyBackupLimit).mockResolvedValue(mockLimit);
    vi.mocked(backupService.createBackup).mockResolvedValue(mockBackup);
    vi.mocked(backupService.getBackupStatus).mockResolvedValue(mockBackup);

    renderWithQueryClient(<CustomerBackupInterface />);

    await waitFor(() => {
      expect(screen.getByText('ایجاد پشتیبان جدید')).toBeInTheDocument();
    });

    const createButton = screen.getByText('ایجاد پشتیبان جدید');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('وضعیت پشتیبان‌گیری')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });
  });

  it('should display download button when backup is completed', async () => {
    const mockLimit = {
      can_backup: true,
      backups_today: 0,
      max_daily_backups: 1,
    };

    const mockBackup = {
      id: 'backup-123',
      status: 'completed' as const,
      progress: 100,
      created_at: '2024-01-01T10:00:00Z',
      completed_at: '2024-01-01T10:05:00Z',
      file_size: 1024000,
      download_url: 'https://example.com/backup.zip',
    };

    vi.mocked(backupService.checkDailyBackupLimit).mockResolvedValue(mockLimit);
    vi.mocked(backupService.createBackup).mockResolvedValue(mockBackup);
    vi.mocked(backupService.getBackupStatus).mockResolvedValue(mockBackup);

    renderWithQueryClient(<CustomerBackupInterface />);

    await waitFor(() => {
      expect(screen.getByText('ایجاد پشتیبان جدید')).toBeInTheDocument();
    });

    const createButton = screen.getByText('ایجاد پشتیبان جدید');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('دانلود')).toBeInTheDocument();
      expect(screen.getByText('1000 KB')).toBeInTheDocument();
    });
  });

  it('should handle download backup', async () => {
    const mockLimit = {
      can_backup: false,
      backups_today: 1,
      max_daily_backups: 1,
    };

    const mockBackup = {
      id: 'backup-123',
      status: 'completed' as const,
      progress: 100,
      created_at: '2024-01-01T10:00:00Z',
      completed_at: '2024-01-01T10:05:00Z',
      file_size: 1024000,
      download_url: 'https://example.com/backup.zip',
    };

    const mockBlob = new Blob(['backup data'], { type: 'application/zip' });

    vi.mocked(backupService.checkDailyBackupLimit).mockResolvedValue(mockLimit);
    vi.mocked(backupService.createBackup).mockResolvedValue(mockBackup);
    vi.mocked(backupService.getBackupStatus).mockResolvedValue(mockBackup);
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

    renderWithQueryClient(<CustomerBackupInterface />);

    await waitFor(() => {
      expect(screen.getByText('ایجاد پشتیبان جدید')).toBeInTheDocument();
    });

    const createButton = screen.getByText('ایجاد پشتیبان جدید');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('دانلود')).toBeInTheDocument();
    });

    const downloadButton = screen.getByText('دانلود');
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(backupService.downloadBackup).toHaveBeenCalledWith('backup-123');
      expect(mockLink.click).toHaveBeenCalled();
    });
  });

  it('should display error message when backup fails', async () => {
    const mockLimit = {
      can_backup: true,
      backups_today: 0,
      max_daily_backups: 1,
    };

    const mockBackup = {
      id: 'backup-123',
      status: 'failed' as const,
      progress: 0,
      created_at: '2024-01-01T10:00:00Z',
      error_message: 'Backup failed due to insufficient storage',
    };

    vi.mocked(backupService.checkDailyBackupLimit).mockResolvedValue(mockLimit);
    vi.mocked(backupService.createBackup).mockResolvedValue(mockBackup);
    vi.mocked(backupService.getBackupStatus).mockResolvedValue(mockBackup);

    renderWithQueryClient(<CustomerBackupInterface />);

    await waitFor(() => {
      expect(screen.getByText('ایجاد پشتیبان جدید')).toBeInTheDocument();
    });

    const createButton = screen.getByText('ایجاد پشتیبان جدید');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Backup failed due to insufficient storage')).toBeInTheDocument();
    });
  });

  it('should allow canceling backup', async () => {
    const mockLimit = {
      can_backup: true,
      backups_today: 0,
      max_daily_backups: 1,
    };

    const mockBackup = {
      id: 'backup-123',
      status: 'processing' as const,
      progress: 25,
      created_at: '2024-01-01T10:00:00Z',
    };

    vi.mocked(backupService.checkDailyBackupLimit).mockResolvedValue(mockLimit);
    vi.mocked(backupService.createBackup).mockResolvedValue(mockBackup);
    vi.mocked(backupService.getBackupStatus).mockResolvedValue(mockBackup);
    vi.mocked(backupService.cancelBackup).mockResolvedValue();

    renderWithQueryClient(<CustomerBackupInterface />);

    await waitFor(() => {
      expect(screen.getByText('ایجاد پشتیبان جدید')).toBeInTheDocument();
    });

    const createButton = screen.getByText('ایجاد پشتیبان جدید');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('لغو عملیات')).toBeInTheDocument();
    });

    const cancelButton = screen.getByText('لغو عملیات');
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(backupService.cancelBackup).toHaveBeenCalledWith('backup-123');
    });
  });
});