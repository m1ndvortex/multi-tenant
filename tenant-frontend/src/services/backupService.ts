/**
 * Backup Service for customer self-backup and data export functionality
 */

import { apiClient } from '@/lib/api';

export interface BackupStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  created_at: string;
  completed_at?: string;
  file_size?: number;
  download_url?: string;
  error_message?: string;
}

export interface BackupHistory {
  id: string;
  backup_date: string;
  status: 'completed' | 'failed';
  file_size: number;
  download_url: string;
  expires_at: string;
}

export interface ExportRequest {
  format: 'csv' | 'json' | 'pdf';
  data_types: string[];
  date_range?: {
    start_date: string;
    end_date: string;
  };
}

export interface ExportStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  format: string;
  data_types: string[];
  created_at: string;
  completed_at?: string;
  file_size?: number;
  download_url?: string;
  error_message?: string;
}

export interface DailyBackupLimit {
  can_backup: boolean;
  backups_today: number;
  max_daily_backups: number;
  next_backup_available_at?: string;
}

class BackupService {
  /**
   * Check if customer can create a backup today (daily limit enforcement)
   */
  async checkDailyBackupLimit(): Promise<DailyBackupLimit> {
    const response = await apiClient.get<DailyBackupLimit>('/api/backup/daily-limit');
    return response.data;
  }

  /**
   * Create a new customer self-backup
   */
  async createBackup(): Promise<BackupStatus> {
    const response = await apiClient.post<BackupStatus>('/api/backup/create');
    return response.data;
  }

  /**
   * Get current backup status
   */
  async getBackupStatus(backupId: string): Promise<BackupStatus> {
    const response = await apiClient.get<BackupStatus>(`/api/backup/status/${backupId}`);
    return response.data;
  }

  /**
   * Get backup history for the tenant
   */
  async getBackupHistory(): Promise<BackupHistory[]> {
    const response = await apiClient.get<BackupHistory[]>('/api/backup/history');
    return response.data;
  }

  /**
   * Download a backup file
   */
  async downloadBackup(backupId: string): Promise<Blob> {
    const response = await apiClient.get<Blob>(`/api/backup/download/${backupId}`, {
      responseType: 'blob'
    });
    return response.data;
  }

  /**
   * Create a data export request
   */
  async createExport(exportRequest: ExportRequest): Promise<ExportStatus> {
    const response = await apiClient.post<ExportStatus>('/api/export/create', exportRequest);
    return response.data;
  }

  /**
   * Get export status
   */
  async getExportStatus(exportId: string): Promise<ExportStatus> {
    const response = await apiClient.get<ExportStatus>(`/api/export/status/${exportId}`);
    return response.data;
  }

  /**
   * Get list of all exports
   */
  async getExportHistory(): Promise<ExportStatus[]> {
    const response = await apiClient.get<ExportStatus[]>('/api/export/history');
    return response.data;
  }

  /**
   * Download an export file
   */
  async downloadExport(exportId: string): Promise<Blob> {
    const response = await apiClient.get<Blob>(`/api/export/download/${exportId}`, {
      responseType: 'blob'
    });
    return response.data;
  }

  /**
   * Get available data types for export
   */
  async getAvailableDataTypes(): Promise<string[]> {
    const response = await apiClient.get<string[]>('/api/export/data-types');
    return response.data;
  }

  /**
   * Cancel an ongoing export
   */
  async cancelExport(exportId: string): Promise<void> {
    await apiClient.post(`/api/export/cancel/${exportId}`);
  }

  /**
   * Cancel an ongoing backup
   */
  async cancelBackup(backupId: string): Promise<void> {
    await apiClient.post(`/api/backup/cancel/${backupId}`);
  }
}

export const backupService = new BackupService();