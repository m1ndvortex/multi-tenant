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
    free_to_pro: number[]; // percentage conversion rate per period
    churn_rate: number[]; // currently approximated if backend not provided
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
    // Map timeRange to days for chart endpoints
    const rangeToDays: Record<typeof timeRange, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 } as any;
    const days = rangeToDays[timeRange] ?? 30;

    // Fetch core analytics + specialized chart data in parallel
    const [platformRaw, revenueAnalysis, invoiceVolume, subscriptionConversion] = await Promise.all([
      apiClient.get<any>(`/api/super-admin/analytics/platform-metrics?range=${timeRange}`),
      apiClient.get<any>(`/api/super-admin/analytics/charts/revenue-analysis?aggregation=daily&days=${days}`),
      apiClient.get<any>(`/api/super-admin/analytics/charts/invoice-volume?aggregation=daily&days=${days}`),
      apiClient.get<any>(`/api/super-admin/analytics/charts/subscription-conversion?aggregation=daily&days=${days}`),
    ]);

    // User growth from signup_trend
    const signupTrend: Array<{ date?: string; period?: string; signups?: number; new_users?: number; cumulative_users?: number }> = platformRaw?.signup_trend || [];
    const ugLabels = signupTrend.map((p) => (p.date ?? p.period ?? ''));
    const ugNew = signupTrend.map((p) => (typeof p.signups === 'number' ? p.signups : (p.new_users ?? 0)));
    const ugCumulative: number[] = [];
    ugNew.reduce((acc, curr, idx) => {
      const next = acc + (curr || 0);
      ugCumulative[idx] = next;
      return next;
    }, 0);

    // Revenue trends from revenue-analysis endpoint (preferred to compute MRR series)
    const mrrSeries: Array<{ period: string; mrr: number }> = revenueAnalysis?.mrr_data || [];
    const revLabels = mrrSeries.map((x) => x.period);
    const mrrData = mrrSeries.map((x) => Number(x.mrr || 0));
    const growthRate: number[] = mrrData.map((val, i) => {
      if (i === 0) return 0;
      const prev = mrrData[i - 1] || 0;
      return prev ? Number((((val - prev) / prev) * 100).toFixed(2)) : 0;
    });

    // Invoice volume
    const volumeData: Array<{ period: string; total_invoices: number; general_invoices?: number; gold_invoices?: number; total_value?: number }> = invoiceVolume?.volume_data || [];
    const invLabels = volumeData.map((v) => v.period);
    const invTotals = volumeData.map((v) => Number(v.total_invoices || 0));
    const invGeneral = volumeData.map((v) => Number(v.general_invoices ?? Math.round((v.total_invoices || 0) * 0.7)));
    const invGold = volumeData.map((v) => Number(v.gold_invoices ?? Math.round((v.total_invoices || 0) * 0.3)));
    const invAvgValue = volumeData.map((v) => Number(v.total_value || 0));

    // Subscription conversions
    const convData: Array<{ period: string; conversions?: number; conversion_rate?: number }> = subscriptionConversion?.conversion_data || [];
    const convLabels = convData.map((c) => c.period);
    const freeToPro = convData.map((c) => Number((c.conversion_rate ?? 0)));
    // If churn is not provided by backend, approximate as zeros (or a tiny baseline) to keep chart rendering
    const churnRate = convLabels.map(() => 0);

    const result: PlatformMetrics = {
      user_growth: {
        labels: ugLabels,
        data: ugNew,
        cumulative_data: ugCumulative,
        new_signups: ugNew,
      },
      revenue_trends: {
        labels: revLabels,
        mrr_data: mrrData,
        growth_rate: growthRate,
      },
      invoice_volume: {
        labels: invLabels,
        data: invTotals,
        general_invoices: invGeneral,
        gold_invoices: invGold,
        average_value: invAvgValue,
      },
      subscription_conversions: {
        labels: convLabels,
        free_to_pro: freeToPro,
        churn_rate: churnRate,
      },
    };

    return result;
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