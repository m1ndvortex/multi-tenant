import { apiClient, RetryConfig } from './apiClient';

export interface DashboardStats {
  total_tenants: number;
  active_tenants: number;
  free_tier_tenants: number;
  pro_tier_tenants: number;
  pending_payment_tenants: number;
  total_users: number;
  active_users_today: number;
  total_invoices_this_month: number;
  mrr: number;
  system_health: {
    cpu_usage: number;
    memory_usage: number;
    database_status: 'healthy' | 'warning' | 'error';
    redis_status: 'healthy' | 'warning' | 'error';
    celery_status: 'healthy' | 'warning' | 'error';
  };
  recent_signups: number;
  recent_upgrades: number;
}

export interface OnlineUser {
  id: string;
  email: string;
  tenant_name: string;
  last_activity: string;
  session_duration: number;
  is_impersonated?: boolean;
}

export interface SystemAlert {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  is_resolved: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface QuickStats {
  signups_today: number;
  revenue_today: number;
  active_sessions: number;
  pending_tasks: number;
  error_rate_24h: number;
  uptime_percentage: number;
}

class DashboardService {
  private readonly retryConfig: RetryConfig = {
    retries: 2,
    retryDelay: 1000,
  };

  async getDashboardStats(): Promise<DashboardStats> {
    return apiClient.get<DashboardStats>(
      '/api/super-admin/dashboard-stats',
      {},
      this.retryConfig
    );
  }

  async getOnlineUsers(): Promise<OnlineUser[]> {
    return apiClient.get<OnlineUser[]>(
      '/api/super-admin/online-users',
      {},
      this.retryConfig
    );
  }

  async getSystemAlerts(limit: number = 10): Promise<SystemAlert[]> {
    return apiClient.get<SystemAlert[]>(
      `/api/super-admin/system-alerts?limit=${limit}`,
      {},
      this.retryConfig
    );
  }

  async getQuickStats(): Promise<QuickStats> {
    return apiClient.get<QuickStats>(
      '/api/super-admin/quick-stats',
      {},
      this.retryConfig
    );
  }

  async resolveAlert(alertId: string): Promise<void> {
    return apiClient.post(
      `/api/super-admin/system-alerts/${alertId}/resolve`,
      {},
      {},
      this.retryConfig
    );
  }

  async dismissAlert(alertId: string): Promise<void> {
    return apiClient.delete(
      `/api/super-admin/system-alerts/${alertId}`,
      {},
      this.retryConfig
    );
  }

  // Real-time data with shorter cache
  async getCurrentSystemHealth() {
    return apiClient.get(
      '/api/super-admin/system-health/current',
      {},
      { retries: 1, retryDelay: 500 }
    );
  }

  // Batch operations for efficiency
  async refreshAllDashboardData(): Promise<{
    stats: DashboardStats;
    onlineUsers: OnlineUser[];
    alerts: SystemAlert[];
    quickStats: QuickStats;
  }> {
    const [stats, onlineUsers, alerts, quickStats] = await Promise.allSettled([
      this.getDashboardStats(),
      this.getOnlineUsers(),
      this.getSystemAlerts(),
      this.getQuickStats(),
    ]);

    return {
      stats: stats.status === 'fulfilled' ? stats.value : {} as DashboardStats,
      onlineUsers: onlineUsers.status === 'fulfilled' ? onlineUsers.value : [],
      alerts: alerts.status === 'fulfilled' ? alerts.value : [],
      quickStats: quickStats.status === 'fulfilled' ? quickStats.value : {} as QuickStats,
    };
  }
}

export const dashboardService = new DashboardService();