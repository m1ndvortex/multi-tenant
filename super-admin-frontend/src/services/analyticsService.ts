import { apiClient } from './apiClient';

export interface PlatformMetrics {
  user_growth: {
    labels: string[];
    data: number[];
    cumulative_data?: number[];
    new_signups?: number[];
    active_users?: number[];
  };
  revenue_trends: {
    labels: string[];
    mrr_data: number[];
    growth_rate: number[];
    arr_data?: number[];
    revenue_forecast?: number[];
  };
  invoice_volume: {
    labels: string[];
    data: number[];
    general_invoices?: number[];
    gold_invoices?: number[];
    average_value?: number[];
  };
  subscription_conversions: {
    labels: string[];
    free_to_pro: number[];
    churn_rate: number[];
  };
}

export interface SystemHealthMetrics {
  timestamp: string;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  database_connections: number;
  database_response_time: number;
  redis_memory_usage: number;
  redis_connected_clients: number;
  celery_active_tasks: number;
  celery_pending_tasks: number;
  celery_failed_tasks: number;
  api_response_time: number;
  error_rate: number;
}

export interface ApiError {
  id: string;
  timestamp: string;
  method: string;
  endpoint: string;
  status_code: number;
  error_message: string;
  tenant_id?: string;
  user_id?: string;
  request_id: string;
  stack_trace?: string;
  user_agent?: string;
  ip_address?: string;
}

export interface ErrorLogFilters {
  start_date?: string;
  end_date?: string;
  status_code?: number;
  tenant_id?: string;
  endpoint?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ErrorLogResponse {
  errors: ApiError[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export const analyticsService = {
  // Platform metrics
  async getPlatformMetrics(timeRange: '7d' | '30d' | '90d' | '1y' = '30d'): Promise<PlatformMetrics> {
    return apiClient.get<PlatformMetrics>(`/api/super-admin/analytics/platform-metrics?range=${timeRange}`);
  },

  // System health metrics
  async getSystemHealthMetrics(timeRange: '1h' | '24h' | '7d' = '24h'): Promise<SystemHealthMetrics[]> {
    return apiClient.get<SystemHealthMetrics[]>(`/api/super-admin/analytics/system-health?range=${timeRange}`);
  },

  // Real-time system health
  async getCurrentSystemHealth(): Promise<SystemHealthMetrics> {
  return apiClient.get<SystemHealthMetrics>('/api/super-admin/system-health/current');
  },

  // API error logs
  async getApiErrors(filters: ErrorLogFilters = {}): Promise<ErrorLogResponse> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    return apiClient.get<ErrorLogResponse>(`/api/super-admin/analytics/api-errors?${params.toString()}`);
  },

  // Get error details
  async getErrorDetails(errorId: string): Promise<ApiError> {
    return apiClient.get<ApiError>(`/api/super-admin/analytics/api-errors/${errorId}`);
  },

  // Get error statistics
  async getErrorStatistics(timeRange: '24h' | '7d' | '30d' = '24h') {
    return apiClient.get(`/api/super-admin/analytics/error-statistics?range=${timeRange}`);
  },
};