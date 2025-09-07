import axios from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('super_admin_token') || localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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
    const response = await api.get(`/api/super-admin/analytics/platform-metrics?range=${timeRange}`);
    return response.data;
  },

  // System health metrics
  async getSystemHealthMetrics(timeRange: '1h' | '24h' | '7d' = '24h'): Promise<SystemHealthMetrics[]> {
    const response = await api.get(`/api/super-admin/analytics/system-health?range=${timeRange}`);
    return response.data;
  },

  // Real-time system health
  async getCurrentSystemHealth(): Promise<SystemHealthMetrics> {
    const response = await api.get('/api/super-admin/analytics/system-health/current');
    return response.data;
  },

  // API error logs
  async getApiErrors(filters: ErrorLogFilters = {}): Promise<ErrorLogResponse> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(`/api/super-admin/analytics/api-errors?${params.toString()}`);
    return response.data;
  },

  // Get error details
  async getErrorDetails(errorId: string): Promise<ApiError> {
    const response = await api.get(`/api/super-admin/analytics/api-errors/${errorId}`);
    return response.data;
  },

  // Get error statistics
  async getErrorStatistics(timeRange: '24h' | '7d' | '30d' = '24h') {
    const response = await api.get(`/api/super-admin/analytics/error-statistics?range=${timeRange}`);
    return response.data;
  },
};