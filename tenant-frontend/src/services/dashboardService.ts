/**
 * Dashboard Service
 * Handles API calls for tenant dashboard data, insights, and analytics
 */

import { apiClient } from '@/lib/api';

// Types for dashboard data
export interface DashboardMetric {
  value: number;
  previous_value?: number;
  growth_rate?: number;
  label: string;
  unit: 'currency' | 'count' | 'percentage' | 'weight';
}

export interface DashboardSummary {
  period: string;
  period_start: string;
  period_end: string;
  metrics: {
    [key: string]: DashboardMetric;
  };
}

export interface RecentActivity {
  type: string;
  title: string;
  description: string;
  amount?: number;
  customer?: string;
  timestamp: string;
  status?: string;
  invoice_type?: string;
  payment_method?: string;
  invoice_number?: string;
  reference_id: string;
}

export interface BusinessInsight {
  type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact_score: number;
  confidence_score: number;
  actionable: boolean;
  action_items: string[];
}

export interface BusinessInsightsResponse {
  summary: string;
  insights: BusinessInsight[];
  recommendations: string[];
  generated_at: string;
}

export interface DashboardAlert {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  count?: number;
  amount?: number;
  weight?: number;
  action: string;
}

export interface AlertsResponse {
  alerts: DashboardAlert[];
  total_alerts: number;
  critical_alerts: number;
  high_alerts: number;
  medium_alerts: number;
}

export interface QuickStats {
  today_revenue: number;
  today_invoices: number;
  total_customers: number;
  total_products: number;
  pending_invoices: number;
  calculated_at: string;
}

export interface SalesChartDataPoint {
  date: string;
  sales: number;
  invoices: number;
}

export interface SalesChartData {
  period_days: number;
  start_date: string;
  end_date: string;
  data: SalesChartDataPoint[];
  total_sales: number;
  total_invoices: number;
}

export interface DashboardResponse {
  summary: DashboardSummary;
  recent_activities: RecentActivity[];
  business_insights: BusinessInsightsResponse;
  alerts: AlertsResponse;
  quick_stats: QuickStats;
  sales_chart: SalesChartData;
  generated_at: string;
}

export interface DashboardRequest {
  include_insights?: boolean;
  include_alerts?: boolean;
  include_activities?: boolean;
  activities_limit?: number;
  sales_chart_days?: number;
}

class DashboardService {
  /**
   * Get complete dashboard data
   */
  async getDashboardData(params: DashboardRequest = {}): Promise<DashboardResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.include_insights !== undefined) {
      queryParams.append('include_insights', params.include_insights.toString());
    }
    if (params.include_alerts !== undefined) {
      queryParams.append('include_alerts', params.include_alerts.toString());
    }
    if (params.include_activities !== undefined) {
      queryParams.append('include_activities', params.include_activities.toString());
    }
    if (params.activities_limit !== undefined) {
      queryParams.append('activities_limit', params.activities_limit.toString());
    }
    if (params.sales_chart_days !== undefined) {
      queryParams.append('sales_chart_days', params.sales_chart_days.toString());
    }

    const response = await apiClient.get<DashboardResponse>(`/dashboard?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Get dashboard summary with key metrics
   */
  async getDashboardSummary(): Promise<DashboardSummary> {
    const response = await apiClient.get<DashboardSummary>('/dashboard/summary');
    return response.data;
  }

  /**
   * Get business insights and recommendations
   */
  async getBusinessInsights(): Promise<BusinessInsightsResponse> {
    const response = await apiClient.get<BusinessInsightsResponse>('/dashboard/insights');
    return response.data;
  }

  /**
   * Get dashboard alerts and notifications
   */
  async getDashboardAlerts(): Promise<AlertsResponse> {
    const response = await apiClient.get<AlertsResponse>('/dashboard/alerts');
    return response.data;
  }

  /**
   * Get quick statistics for widgets
   */
  async getQuickStats(): Promise<QuickStats> {
    const response = await apiClient.get<QuickStats>('/dashboard/quick-stats');
    return response.data;
  }

  /**
   * Get sales chart data
   */
  async getSalesChartData(periodDays: number = 30): Promise<SalesChartData> {
    const response = await apiClient.get<SalesChartData>(`/dashboard/sales-chart?period_days=${periodDays}`);
    return response.data;
  }

  /**
   * Get recent business activities
   */
  async getRecentActivities(limit: number = 10): Promise<RecentActivity[]> {
    const response = await apiClient.get<RecentActivity[]>(`/dashboard/activities?limit=${limit}`);
    return response.data;
  }

  /**
   * Check dashboard service health
   */
  async checkHealth(): Promise<any> {
    const response = await apiClient.get('/dashboard/health');
    return response.data;
  }
}

export const dashboardService = new DashboardService();