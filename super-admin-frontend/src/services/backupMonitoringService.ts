import {
  BackupMonitoringStatus,
  StorageAnalytics,
  BackupVerificationResult,
  RetentionPolicy,
  BackupAuditLog,
  BackupHealthMetrics,
  StorageProviderComparison,
  BackupTrend,
  AlertConfiguration,
} from '@/types/backupMonitoring';
import { apiClient } from './apiClient';

class BackupMonitoringService {
  private async request<T>(endpoint: string, options: { method?: string; body?: any } = {}): Promise<T> {
    try {
      const { method = 'GET', body } = options;
      
      let response: any;
      if (method === 'GET') {
        response = await apiClient.get(endpoint);
      } else if (method === 'POST') {
        response = await apiClient.post(endpoint, body);
      } else if (method === 'PUT') {
        response = await apiClient.put(endpoint, body);
      } else if (method === 'DELETE') {
        response = await apiClient.delete(endpoint);
      } else {
        throw new Error(`Unsupported method: ${method}`);
      }

      return response.data as T;
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data?.message || error.response.data?.detail || `HTTP error! status: ${error.response.status}`);
      }
      
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout - please try again');
      }
      if (!navigator.onLine) {
        throw new Error('No internet connection - please check your network');
      }
      
      throw error;
    }
  }

  // Real-time Monitoring
  async getBackupMonitoringStatus(): Promise<BackupMonitoringStatus> {
    return this.request<BackupMonitoringStatus>('/api/backup/monitoring/status');
  }

  async getBackupHealthMetrics(): Promise<BackupHealthMetrics> {
    return this.request<BackupHealthMetrics>('/api/backup/monitoring/health-metrics');
  }

  async getBackupTrends(days: number = 30): Promise<BackupTrend[]> {
    return this.request<BackupTrend[]>(`/api/backup/monitoring/trends?days=${days}`);
  }

  // Storage Analytics
  async getStorageAnalytics(): Promise<StorageAnalytics[]> {
    return this.request<StorageAnalytics[]>('/api/backup/storage/analytics');
  }

  async getStorageProviderComparison(): Promise<StorageProviderComparison[]> {
    return this.request<StorageProviderComparison[]>('/api/backup/storage/comparison');
  }

  async getStorageUsageHistory(days: number = 30): Promise<{ date: string; backblaze_b2_gb: number; cloudflare_r2_gb: number; }[]> {
    return this.request<{ date: string; backblaze_b2_gb: number; cloudflare_r2_gb: number; }[]>(`/api/backup/storage/usage-history?days=${days}`);
  }

  async getCostAnalytics(): Promise<{ 
    monthly_costs: { provider: string; cost: number; breakdown: any }[];
    cost_trends: { date: string; backblaze_b2_cost: number; cloudflare_r2_cost: number; }[];
    cost_projections: { month: string; projected_cost: number; }[];
  }> {
    return this.request('/api/backup/storage/cost-analytics');
  }

  // Backup Verification
  async getVerificationResults(
    page: number = 1,
    limit: number = 20,
    filters: { 
      status?: string; 
      backup_type?: string; 
      date_from?: string; 
      date_to?: string; 
    } = {}
  ): Promise<{ 
    results: BackupVerificationResult[]; 
    pagination: { page: number; limit: number; total: number; totalPages: number; }; 
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value && value !== '' && value !== 'all')
      ),
    });

    return this.request(`/api/backup/verification/results?${params}`);
  }

  async startBulkVerification(
    backupIds: string[],
    storageProviders: ('backblaze_b2' | 'cloudflare_r2')[] = ['backblaze_b2', 'cloudflare_r2']
  ): Promise<{ job_id: string; message: string }> {
    return this.request('/api/backup/verification/bulk-verify', {
      method: 'POST',
      body: {
        backup_ids: backupIds,
        storage_providers: storageProviders,
      },
    });
  }

  async getVerificationJobStatus(jobId: string): Promise<{
    status: string;
    progress: number;
    completed_verifications: number;
    total_verifications: number;
    message?: string;
  }> {
    return this.request(`/api/backup/verification/jobs/${jobId}/status`);
  }

  // Retention Policy Management
  async getRetentionPolicies(): Promise<RetentionPolicy[]> {
    return this.request<RetentionPolicy[]>('/api/backup/retention/policies');
  }

  async createRetentionPolicy(policy: Omit<RetentionPolicy, 'id' | 'created_at' | 'updated_at'>): Promise<RetentionPolicy> {
    return this.request<RetentionPolicy>('/api/backup/retention/policies', {
      method: 'POST',
      body: policy,
    });
  }

  async updateRetentionPolicy(policyId: string, policy: Partial<RetentionPolicy>): Promise<RetentionPolicy> {
    return this.request<RetentionPolicy>(`/api/backup/retention/policies/${policyId}`, {
      method: 'PUT',
      body: policy,
    });
  }

  async deleteRetentionPolicy(policyId: string): Promise<void> {
    return this.request<void>(`/api/backup/retention/policies/${policyId}`, {
      method: 'DELETE',
    });
  }

  async executeRetentionPolicy(policyId: string): Promise<{ job_id: string; message: string }> {
    return this.request(`/api/backup/retention/policies/${policyId}/execute`, {
      method: 'POST',
    });
  }

  async getRetentionPolicyPreview(policyId: string): Promise<{
    files_to_delete: { backup_id: string; tenant_name: string; file_size: number; age_days: number; }[];
    total_files: number;
    total_size_gb: number;
    estimated_savings: number;
  }> {
    return this.request(`/api/backup/retention/policies/${policyId}/preview`);
  }

  // Audit Trail
  async getAuditLogs(
    page: number = 1,
    limit: number = 50,
    filters: {
      operation_type?: string;
      user_email?: string;
      tenant_name?: string;
      date_from?: string;
      date_to?: string;
      success?: boolean;
    } = {}
  ): Promise<{
    logs: BackupAuditLog[];
    pagination: { page: number; limit: number; total: number; totalPages: number; };
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '' && value !== 'all')
      ),
    });

    return this.request(`/api/backup/audit/logs?${params}`);
  }

  async exportAuditLogs(
    format: 'csv' | 'json' | 'pdf',
    filters: {
      operation_type?: string;
      user_email?: string;
      tenant_name?: string;
      date_from?: string;
      date_to?: string;
      success?: boolean;
    } = {}
  ): Promise<{ download_url: string; expires_at: string }> {
    return this.request('/api/backup/audit/export', {
      method: 'POST',
      body: {
        format,
        filters,
      },
    });
  }

  // Alert Configuration
  async getAlertConfigurations(): Promise<AlertConfiguration[]> {
    return this.request<AlertConfiguration[]>('/api/backup/alerts/configurations');
  }

  async createAlertConfiguration(alert: Omit<AlertConfiguration, 'id' | 'created_at'>): Promise<AlertConfiguration> {
    return this.request<AlertConfiguration>('/api/backup/alerts/configurations', {
      method: 'POST',
      body: alert,
    });
  }

  async updateAlertConfiguration(alertId: string, alert: Partial<AlertConfiguration>): Promise<AlertConfiguration> {
    return this.request<AlertConfiguration>(`/api/backup/alerts/configurations/${alertId}`, {
      method: 'PUT',
      body: alert,
    });
  }

  async deleteAlertConfiguration(alertId: string): Promise<void> {
    return this.request<void>(`/api/backup/alerts/configurations/${alertId}`, {
      method: 'DELETE',
    });
  }

  async testAlertConfiguration(alertId: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/api/backup/alerts/configurations/${alertId}/test`, {
      method: 'POST',
    });
  }

  // Storage Provider Health
  async getStorageProviderHealth(): Promise<{
    backblaze_b2: {
      status: string;
      response_time: number;
      last_check: string;
      uptime_24h: number;
      error_rate_24h: number;
    };
    cloudflare_r2: {
      status: string;
      response_time: number;
      last_check: string;
      uptime_24h: number;
      error_rate_24h: number;
    };
  }> {
    return this.request('/api/backup/storage/health');
  }

  async testStorageConnectivity(): Promise<{
    backblaze_b2: { success: boolean; response_time: number; error?: string };
    cloudflare_r2: { success: boolean; response_time: number; error?: string };
  }> {
    return this.request('/api/backup/storage/test-connectivity', {
      method: 'POST',
    });
  }

  // Real-time Updates (WebSocket or Server-Sent Events)
  subscribeToBackupUpdates(callback: (update: any) => void): () => void {
    // This would typically use WebSocket or Server-Sent Events
    // For now, we'll use polling as a fallback
    const interval = setInterval(async () => {
      try {
        const status = await this.getBackupMonitoringStatus();
        callback({ type: 'status_update', data: status });
      } catch (error) {
        console.error('Failed to fetch backup status:', error);
      }
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }
}

export const backupMonitoringService = new BackupMonitoringService();