/**
 * Business Intelligence Service - Handles AI-driven insights, KPIs, alerts, and report scheduling
 */

import { apiClient } from '@/lib/api';

// Business Insights Types
export interface BusinessInsight {
  id: string;
  type: 'positive' | 'negative' | 'warning' | 'info';
  title: string;
  description: string;
  value?: string;
  trend?: 'up' | 'down' | 'stable';
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
  action_text?: string;
  action_url?: string;
  created_at: string;
}

// KPI Metrics Types
export interface KPIMetric {
  id: string;
  name: string;
  value: number;
  formatted_value: string;
  previous_value: number;
  change_percentage: number;
  trend: 'up' | 'down' | 'stable';
  target?: number;
  target_percentage?: number;
  category: 'revenue' | 'customers' | 'operations' | 'financial';
  unit: string;
  description: string;
  updated_at: string;
}

// Business Alerts Types
export interface BusinessAlert {
  id: string;
  type: 'overdue_payment' | 'low_stock' | 'high_debt' | 'system' | 'business_opportunity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  entity_type?: 'customer' | 'product' | 'invoice' | 'system';
  entity_id?: string;
  entity_name?: string;
  amount?: number;
  due_date?: string;
  created_at: string;
  is_read: boolean;
  is_resolved: boolean;
  actionable: boolean;
  action_url?: string;
  action_text?: string;
}

export interface AlertFilters {
  severity?: 'all' | 'low' | 'medium' | 'high' | 'critical';
  type?: 'all' | 'overdue_payment' | 'low_stock' | 'high_debt' | 'system' | 'business_opportunity';
  status?: 'all' | 'unresolved' | 'resolved';
  read_status?: 'all' | 'read' | 'unread';
}

// Scheduled Reports Types
export interface ScheduledReport {
  id: string;
  name: string;
  report_type: 'sales-trend' | 'profit-loss' | 'customer-analytics' | 'aging-report' | 'dashboard-summary';
  schedule_type: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  schedule_time: string;
  schedule_day?: number;
  export_format: 'pdf' | 'csv' | 'json' | 'excel';
  email_recipients: string[];
  is_active: boolean;
  last_run_at?: string;
  next_run_at: string;
  created_at: string;
  parameters: Record<string, any>;
}

export interface ScheduledReportCreate {
  name: string;
  report_type: 'sales-trend' | 'profit-loss' | 'customer-analytics' | 'aging-report' | 'dashboard-summary';
  schedule_type: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  schedule_time: string;
  schedule_day?: number;
  export_format: 'pdf' | 'csv' | 'json' | 'excel';
  email_recipients: string[];
  parameters?: Record<string, any>;
}

class BusinessIntelligenceService {
  /**
   * Get AI-driven business insights
   */
  async getBusinessInsights(): Promise<BusinessInsight[]> {
    const response = await apiClient.get<BusinessInsight[]>('/api/business-intelligence/insights');
    return response.data;
  }

  /**
   * Get KPI metrics for specified period
   */
  async getKPIMetrics(period: 'daily' | 'weekly' | 'monthly' = 'monthly'): Promise<KPIMetric[]> {
    const response = await apiClient.get<KPIMetric[]>(`/api/business-intelligence/kpis?period=${period}`);
    return response.data;
  }

  /**
   * Get business alerts with optional filters
   */
  async getBusinessAlerts(filters: AlertFilters = {}): Promise<BusinessAlert[]> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all') {
        params.append(key, value);
      }
    });

    const response = await apiClient.get<BusinessAlert[]>(
      `/api/business-intelligence/alerts?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Mark alert as read
   */
  async markAlertAsRead(alertId: string): Promise<void> {
    await apiClient.post(`/api/business-intelligence/alerts/${alertId}/read`);
  }

  /**
   * Resolve alert
   */
  async resolveAlert(alertId: string): Promise<void> {
    await apiClient.post(`/api/business-intelligence/alerts/${alertId}/resolve`);
  }

  /**
   * Get scheduled reports
   */
  async getScheduledReports(): Promise<ScheduledReport[]> {
    const response = await apiClient.get<ScheduledReport[]>('/api/business-intelligence/scheduled-reports');
    return response.data;
  }

  /**
   * Create scheduled report
   */
  async createScheduledReport(data: ScheduledReportCreate): Promise<ScheduledReport> {
    const response = await apiClient.post<ScheduledReport>('/api/business-intelligence/scheduled-reports', data);
    return response.data;
  }

  /**
   * Update scheduled report
   */
  async updateScheduledReport(id: string, data: Partial<ScheduledReportCreate>): Promise<ScheduledReport> {
    const response = await apiClient.put<ScheduledReport>(`/api/business-intelligence/scheduled-reports/${id}`, data);
    return response.data;
  }

  /**
   * Delete scheduled report
   */
  async deleteScheduledReport(id: string): Promise<void> {
    await apiClient.delete(`/api/business-intelligence/scheduled-reports/${id}`);
  }

  /**
   * Toggle scheduled report active status
   */
  async toggleScheduledReport(id: string, active: boolean): Promise<ScheduledReport> {
    const response = await apiClient.post<ScheduledReport>(
      `/api/business-intelligence/scheduled-reports/${id}/toggle`,
      { active }
    );
    return response.data;
  }

  /**
   * Run scheduled report immediately
   */
  async runScheduledReportNow(id: string): Promise<{ message: string; job_id: string }> {
    const response = await apiClient.post<{ message: string; job_id: string }>(
      `/api/business-intelligence/scheduled-reports/${id}/run-now`
    );
    return response.data;
  }

  /**
   * Get report execution history
   */
  async getReportExecutionHistory(reportId?: string): Promise<Array<{
    id: string;
    report_id: string;
    report_name: string;
    executed_at: string;
    status: 'success' | 'failed' | 'running';
    file_url?: string;
    error_message?: string;
    execution_time_seconds: number;
  }>> {
    const params = reportId ? `?report_id=${reportId}` : '';
    const response = await apiClient.get(`/api/business-intelligence/execution-history${params}`);
    return response.data;
  }

  /**
   * Get business intelligence dashboard summary
   */
  async getDashboardSummary(): Promise<{
    total_insights: number;
    critical_alerts: number;
    active_scheduled_reports: number;
    kpi_summary: {
      revenue_trend: 'up' | 'down' | 'stable';
      customer_growth: 'up' | 'down' | 'stable';
      operational_efficiency: 'up' | 'down' | 'stable';
    };
    recent_insights: BusinessInsight[];
    urgent_alerts: BusinessAlert[];
  }> {
    const response = await apiClient.get('/api/business-intelligence/dashboard-summary');
    return response.data;
  }

  /**
   * Generate ad-hoc business insight
   */
  async generateAdHocInsight(query: string): Promise<BusinessInsight> {
    const response = await apiClient.post<BusinessInsight>('/api/business-intelligence/generate-insight', {
      query
    });
    return response.data;
  }

  /**
   * Export business intelligence data
   */
  async exportBusinessIntelligenceData(
    type: 'insights' | 'kpis' | 'alerts' | 'scheduled-reports',
    format: 'csv' | 'json' | 'excel' = 'csv'
  ): Promise<Blob> {
    const response = await apiClient.get<Blob>(
      `/api/business-intelligence/export/${type}?format=${format}`,
      { responseType: 'blob' }
    );
    return response.data;
  }

  /**
   * Get alert statistics
   */
  async getAlertStatistics(): Promise<{
    total_alerts: number;
    unread_alerts: number;
    critical_alerts: number;
    alerts_by_type: Record<string, number>;
    alerts_by_severity: Record<string, number>;
    resolution_rate: number;
  }> {
    const response = await apiClient.get('/api/business-intelligence/alert-statistics');
    return response.data;
  }

  /**
   * Configure alert settings
   */
  async updateAlertSettings(settings: {
    email_notifications: boolean;
    sms_notifications: boolean;
    notification_frequency: 'immediate' | 'hourly' | 'daily';
    severity_threshold: 'low' | 'medium' | 'high' | 'critical';
    auto_resolve_days: number;
  }): Promise<void> {
    await apiClient.put('/api/business-intelligence/alert-settings', settings);
  }

  /**
   * Get alert settings
   */
  async getAlertSettings(): Promise<{
    email_notifications: boolean;
    sms_notifications: boolean;
    notification_frequency: 'immediate' | 'hourly' | 'daily';
    severity_threshold: 'low' | 'medium' | 'high' | 'critical';
    auto_resolve_days: number;
  }> {
    const response = await apiClient.get('/api/business-intelligence/alert-settings');
    return response.data;
  }
}

export const businessIntelligenceService = new BusinessIntelligenceService();