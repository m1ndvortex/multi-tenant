/**
 * Backup Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { backupService } from '@/services/backupService';
import { apiClient } from '@/lib/api';

// Mock the API client
vi.mock('@/lib/api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('BackupService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkDailyBackupLimit', () => {
    it('should return daily backup limit information', async () => {
      const mockLimit = {
        can_backup: true,
        backups_today: 0,
        max_daily_backups: 1,
      };

      vi.mocked(apiClient.get).mockResolvedValue({ data: mockLimit });

      const result = await backupService.checkDailyBackupLimit();

      expect(apiClient.get).toHaveBeenCalledWith('/api/backup/daily-limit');
      expect(result).toEqual(mockLimit);
    });

    it('should handle limit exceeded case', async () => {
      const mockLimit = {
        can_backup: false,
        backups_today: 1,
        max_daily_backups: 1,
        next_backup_available_at: '2024-01-02T00:00:00Z',
      };

      vi.mocked(apiClient.get).mockResolvedValue({ data: mockLimit });

      const result = await backupService.checkDailyBackupLimit();

      expect(result.can_backup).toBe(false);
      expect(result.next_backup_available_at).toBeDefined();
    });
  });

  describe('createBackup', () => {
    it('should create a new backup', async () => {
      const mockBackup = {
        id: 'backup-123',
        status: 'pending' as const,
        progress: 0,
        created_at: '2024-01-01T10:00:00Z',
      };

      vi.mocked(apiClient.post).mockResolvedValue({ data: mockBackup });

      const result = await backupService.createBackup();

      expect(apiClient.post).toHaveBeenCalledWith('/api/backup/create');
      expect(result).toEqual(mockBackup);
    });
  });

  describe('getBackupStatus', () => {
    it('should return backup status', async () => {
      const backupId = 'backup-123';
      const mockStatus = {
        id: backupId,
        status: 'processing' as const,
        progress: 50,
        created_at: '2024-01-01T10:00:00Z',
      };

      vi.mocked(apiClient.get).mockResolvedValue({ data: mockStatus });

      const result = await backupService.getBackupStatus(backupId);

      expect(apiClient.get).toHaveBeenCalledWith(`/api/backup/status/${backupId}`);
      expect(result).toEqual(mockStatus);
    });
  });

  describe('getBackupHistory', () => {
    it('should return backup history', async () => {
      const mockHistory = [
        {
          id: 'backup-1',
          backup_date: '2024-01-01',
          status: 'completed' as const,
          file_size: 1024000,
          download_url: 'https://example.com/backup-1.zip',
          expires_at: '2024-01-08T00:00:00Z',
        },
      ];

      vi.mocked(apiClient.get).mockResolvedValue({ data: mockHistory });

      const result = await backupService.getBackupHistory();

      expect(apiClient.get).toHaveBeenCalledWith('/api/backup/history');
      expect(result).toEqual(mockHistory);
    });
  });

  describe('downloadBackup', () => {
    it('should download backup file', async () => {
      const backupId = 'backup-123';
      const mockBlob = new Blob(['backup data'], { type: 'application/zip' });

      vi.mocked(apiClient.get).mockResolvedValue({ data: mockBlob });

      const result = await backupService.downloadBackup(backupId);

      expect(apiClient.get).toHaveBeenCalledWith(`/api/backup/download/${backupId}`, {
        responseType: 'blob',
      });
      expect(result).toEqual(mockBlob);
    });
  });

  describe('createExport', () => {
    it('should create a new export', async () => {
      const exportRequest = {
        format: 'csv' as const,
        data_types: ['customers', 'products'],
        date_range: {
          start_date: '2024-01-01',
          end_date: '2024-01-31',
        },
      };

      const mockExport = {
        id: 'export-123',
        status: 'pending' as const,
        progress: 0,
        format: 'csv',
        data_types: ['customers', 'products'],
        created_at: '2024-01-01T10:00:00Z',
      };

      vi.mocked(apiClient.post).mockResolvedValue({ data: mockExport });

      const result = await backupService.createExport(exportRequest);

      expect(apiClient.post).toHaveBeenCalledWith('/api/export/create', exportRequest);
      expect(result).toEqual(mockExport);
    });
  });

  describe('getExportStatus', () => {
    it('should return export status', async () => {
      const exportId = 'export-123';
      const mockStatus = {
        id: exportId,
        status: 'completed' as const,
        progress: 100,
        format: 'csv',
        data_types: ['customers'],
        created_at: '2024-01-01T10:00:00Z',
        completed_at: '2024-01-01T10:05:00Z',
        file_size: 512000,
        download_url: 'https://example.com/export-123.csv',
      };

      vi.mocked(apiClient.get).mockResolvedValue({ data: mockStatus });

      const result = await backupService.getExportStatus(exportId);

      expect(apiClient.get).toHaveBeenCalledWith(`/api/export/status/${exportId}`);
      expect(result).toEqual(mockStatus);
    });
  });

  describe('getExportHistory', () => {
    it('should return export history', async () => {
      const mockHistory = [
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

      vi.mocked(apiClient.get).mockResolvedValue({ data: mockHistory });

      const result = await backupService.getExportHistory();

      expect(apiClient.get).toHaveBeenCalledWith('/api/export/history');
      expect(result).toEqual(mockHistory);
    });
  });

  describe('downloadExport', () => {
    it('should download export file', async () => {
      const exportId = 'export-123';
      const mockBlob = new Blob(['export data'], { type: 'text/csv' });

      vi.mocked(apiClient.get).mockResolvedValue({ data: mockBlob });

      const result = await backupService.downloadExport(exportId);

      expect(apiClient.get).toHaveBeenCalledWith(`/api/export/download/${exportId}`, {
        responseType: 'blob',
      });
      expect(result).toEqual(mockBlob);
    });
  });

  describe('getAvailableDataTypes', () => {
    it('should return available data types', async () => {
      const mockDataTypes = ['customers', 'products', 'invoices', 'payments'];

      vi.mocked(apiClient.get).mockResolvedValue({ data: mockDataTypes });

      const result = await backupService.getAvailableDataTypes();

      expect(apiClient.get).toHaveBeenCalledWith('/api/export/data-types');
      expect(result).toEqual(mockDataTypes);
    });
  });

  describe('cancelExport', () => {
    it('should cancel an export', async () => {
      const exportId = 'export-123';

      vi.mocked(apiClient.post).mockResolvedValue({ data: null });

      await backupService.cancelExport(exportId);

      expect(apiClient.post).toHaveBeenCalledWith(`/api/export/cancel/${exportId}`);
    });
  });

  describe('cancelBackup', () => {
    it('should cancel a backup', async () => {
      const backupId = 'backup-123';

      vi.mocked(apiClient.post).mockResolvedValue({ data: null });

      await backupService.cancelBackup(backupId);

      expect(apiClient.post).toHaveBeenCalledWith(`/api/backup/cancel/${backupId}`);
    });
  });
});