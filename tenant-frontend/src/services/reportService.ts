/**
 * Report Service - Handles all reporting and analytics API calls
 */

import { apiClient } from '@/lib/api';

// Type definitions for report data
export interface SalesTrendData {
  period: string;
  total_sales: number;
  total_paid: number;
  general_sales: number;
  gold_sales: number;
  invoice_count: number;
}

export interface ProfitLossCategory {
  name: string;
  revenue: number;
  cost_of_goods: number;
  gross_profit: number;
  profit_margin: number;
}

export interface ProfitLossData {
  total_revenue: number;
  cost_of_goods_sold: number;
  gross_profit: number;
  profit_margin: number;
  general_revenue: number;
  gold_revenue: number;
  categories: ProfitLossCategory[];
}

export interface TopCustomer {
  customer_id: string;
  customer_name: string;
  total_spent: number;
  total_paid: number;
  outstanding_balance: number;
  lifetime_value: number;
  purchase_count: number;
  last_purchase_date: string;
}

export interface CustomerAnalyticsData {
  total_customers: number;
  active_customers: number;
  new_customers_this_month: number;
  average_customer_value: number;
  top_customers: TopCustomer[];
  customer_segmentation: Record<string, number>;
  monthly_purchase_patterns: Record<string, number>;
}

export interface AgingBucket {
  name: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface CustomerAgingData {
  customer_id: string;
  customer_name: string;
  total_balance: number;
  current: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  over_90_days: number;
}

export interface AgingReportResponse {
  total_outstanding: number;
  buckets: AgingBucket[];
  customers: CustomerAgingData[];
  summary: {
    current_percentage: number;
    overdue_percentage: number;
    severely_overdue_percentage: number;
  };
}

export interface ReportExportOptions {
  startDate?: string;
  endDate?: string;
  period?: 'daily' | 'weekly' | 'monthly';
  format?: 'csv' | 'pdf' | 'json';
}

class ReportService {
  /**
   * Get sales trend data for specified period
   */
  async getSalesTrend(
    period: 'daily' | 'weekly' | 'monthly',
    startDate: string,
    endDate: string
  ): Promise<SalesTrendData[]> {
    const response = await apiClient.get<SalesTrendData[]>(
      `/api/reports/sales-trend?period=${period}&start_date=${startDate}&end_date=${endDate}`
    );
    return response.data;
  }

  /**
   * Get profit and loss analysis with category breakdown
   */
  async getProfitLoss(startDate: string, endDate: string): Promise<ProfitLossData> {
    const response = await apiClient.get<ProfitLossData>(
      `/api/reports/profit-loss?start_date=${startDate}&end_date=${endDate}`
    );
    return response.data;
  }

  /**
   * Get customer analytics including lifetime value and segmentation
   */
  async getCustomerAnalytics(startDate: string, endDate: string): Promise<CustomerAnalyticsData> {
    const response = await apiClient.get<CustomerAnalyticsData>(
      `/api/reports/customer-analytics?start_date=${startDate}&end_date=${endDate}`
    );
    return response.data;
  }

  /**
   * Get accounts receivable aging report
   */
  async getAgingReport(): Promise<AgingReportResponse> {
    const response = await apiClient.get<AgingReportResponse>('/api/reports/aging-report');
    return response.data;
  }

  /**
   * Export report in specified format
   */
  async exportReport(
    reportType: 'sales-trend' | 'profit-loss' | 'customer-analytics' | 'aging-report',
    format: 'csv' | 'pdf' | 'json',
    options: ReportExportOptions = {}
  ): Promise<Blob> {
    const params = new URLSearchParams();
    params.append('format', format);
    
    if (options.startDate) params.append('start_date', options.startDate);
    if (options.endDate) params.append('end_date', options.endDate);
    if (options.period) params.append('period', options.period);

    const response = await apiClient.get<Blob>(
      `/api/reports/${reportType}/export?${params.toString()}`,
      { responseType: 'blob' }
    );
    return response.data;
  }

  /**
   * Get dashboard summary metrics
   */
  async getDashboardSummary(): Promise<{
    total_revenue_this_month: number;
    total_invoices_this_month: number;
    outstanding_receivables: number;
    overdue_amount: number;
    top_selling_products: Array<{
      product_name: string;
      quantity_sold: number;
      revenue: number;
    }>;
  }> {
    const response = await apiClient.get('/api/reports/dashboard-summary');
    return response.data;
  }
}

export const reportService = new ReportService();