/**
 * Optimized Dashboard Service with WebSocket Cache Integration
 * Handles intelligent caching, real-time updates, and environment-aware strategies
 */

import { apiClient } from '@/lib/api';
import { 
  EnvironmentAwareStorage, 
  generateCacheKey, 
  getCacheConfig,
  isDevelopment 
} from '@/lib/cache/environmentConfig';
import { webSocketManager } from './webSocketManager';

// Import existing types
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

// Cache metrics interface
interface CacheMetrics {
  hits: number;
  misses: number;
  invalidations: number;
  lastUpdated: string;
}

class OptimizedDashboardService {
  private cache: EnvironmentAwareStorage;
  private cacheMetrics: CacheMetrics;
  private config = getCacheConfig();

  constructor() {
    this.cache = new EnvironmentAwareStorage('tenant-dashboard');
    this.cacheMetrics = {
      hits: 0,
      misses: 0,
      invalidations: 0,
      lastUpdated: new Date().toISOString()
    };

    this.setupCacheInvalidationListener();
  }

  private setupCacheInvalidationListener(): void {
    // Listen for WebSocket cache invalidation
    webSocketManager.onCacheInvalidation((cacheKey, data) => {
      console.log('Dashboard service: Cache invalidation received:', cacheKey);
      
      if (cacheKey === 'all' || cacheKey.includes('dashboard')) {
        this.invalidateCache(cacheKey);
      }
    });

    // Listen for data updates that affect dashboard
    webSocketManager.onDataUpdate((updateType, entity, data) => {
      console.log('Dashboard service: Data update received:', updateType, entity);
      
      // Invalidate relevant cache based on entity type
      switch (entity) {
        case 'invoice':
        case 'customer':
        case 'product':
          this.invalidateRelatedCache();
          break;
        case 'dashboard':
          this.invalidateCache('dashboard');
          break;
      }
    });
  }

  private invalidateCache(cacheKey: string): void {
    this.cacheMetrics.invalidations++;
    this.cacheMetrics.lastUpdated = new Date().toISOString();

    if (cacheKey === 'all') {
      this.cache.clear();
      console.log('Dashboard service: All cache cleared');
    } else {
      // Remove specific cache entries
      const keysToRemove = [
        'dashboard-data',
        'dashboard-summary',
        'quick-stats',
        'sales-chart',
        'recent-activities',
        'business-insights',
        'alerts'
      ];

      keysToRemove.forEach(key => {
        if (key.includes(cacheKey) || cacheKey.includes(key)) {
          this.cache.removeItem(key);
        }
      });
      
      console.log('Dashboard service: Cache invalidated for:', cacheKey);
    }

    // Dispatch event for React Query invalidation
    window.dispatchEvent(new CustomEvent('dashboard-cache-invalidated', {
      detail: { cacheKey }
    }));
  }

  private invalidateRelatedCache(): void {
    // Invalidate dashboard-related caches when data changes
    const relatedKeys = [
      'dashboard-data',
      'quick-stats',
      'sales-chart',
      'recent-activities'
    ];

    relatedKeys.forEach(key => this.cache.removeItem(key));
    this.cacheMetrics.invalidations++;
    
    console.log('Dashboard service: Related cache invalidated');
  }

  private getCachedData<T>(key: string): T | null {
    try {
      const cached = this.cache.getItem(key);
      if (cached) {
        this.cacheMetrics.hits++;
        console.log(`Dashboard service: Cache hit for ${key}`);
        return cached;
      }
      this.cacheMetrics.misses++;
      return null;
    } catch (error) {
      console.warn('Dashboard service: Cache read error:', error);
      this.cacheMetrics.misses++;
      return null;
    }
  }

  private setCachedData<T>(key: string, data: T, ttl?: number): void {
    try {
      this.cache.setItem(key, data, ttl);
      console.log(`Dashboard service: Data cached for ${key}`);
    } catch (error) {
      console.warn('Dashboard service: Cache write error:', error);
    }
  }

  private normalizeNumericData(data: any): any {
    const toNum = (v: any, fallback: number | null = 0) => {
      if (v === null || v === undefined) return fallback;
      if (typeof v === 'number') return v;
      const n = Number(v);
      return Number.isNaN(n) ? fallback : n;
    };

    if (data?.summary?.metrics && typeof data.summary.metrics === 'object') {
      Object.keys(data.summary.metrics).forEach((key) => {
        const m = data.summary.metrics[key];
        if (m) {
          m.value = toNum(m.value, 0);
          m.previous_value = toNum(m.previous_value, null);
          m.growth_rate = toNum(m.growth_rate, 0);
        }
      });
    }

    if (data?.quick_stats) {
      data.quick_stats.today_revenue = toNum(data.quick_stats.today_revenue, 0);
      data.quick_stats.today_invoices = toNum(data.quick_stats.today_invoices, 0);
      data.quick_stats.total_customers = toNum(data.quick_stats.total_customers, 0);
      data.quick_stats.total_products = toNum(data.quick_stats.total_products, 0);
      data.quick_stats.pending_invoices = toNum(data.quick_stats.pending_invoices, 0);
    }

    if (data?.sales_chart?.data && Array.isArray(data.sales_chart.data)) {
      data.sales_chart.data = data.sales_chart.data.map((p: any) => ({
        ...p,
        sales: toNum(p.sales, 0),
        invoices: toNum(p.invoices, 0),
      }));
      data.sales_chart.total_sales = toNum(data.sales_chart.total_sales, 0);
      data.sales_chart.total_invoices = toNum(data.sales_chart.total_invoices, 0);
    }

    return data;
  }

  /**
   * Get complete dashboard data with intelligent caching
   */
  async getDashboardData(params: DashboardRequest = {}): Promise<DashboardResponse> {
    const cacheKey = generateCacheKey('dashboard-data', undefined, undefined, params);
    
    // Check cache first
    const cached = this.getCachedData<DashboardResponse>(cacheKey);
    if (cached && !isDevelopment) {
      return cached;
    }

    try {
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

      const response = await apiClient.get<DashboardResponse>(`/api/dashboard/?${queryParams.toString()}`);
      const normalizedData = this.normalizeNumericData(response.data) as DashboardResponse;

      // Cache with appropriate TTL
      const ttl = isDevelopment ? 2 * 60 * 1000 : 10 * 60 * 1000; // 2min dev, 10min prod
      this.setCachedData(cacheKey, normalizedData, ttl);

      return normalizedData;

    } catch (error) {
      console.error('Dashboard service: Failed to get dashboard data:', error);
      
      // Return cached data if available during error
      if (cached) {
        console.log('Dashboard service: Returning stale cache due to error');
        return cached;
      }
      
      throw error;
    }
  }

  /**
   * Get dashboard summary with caching
   */
  async getDashboardSummary(): Promise<DashboardSummary> {
    const cacheKey = 'dashboard-summary';
    const cached = this.getCachedData<DashboardSummary>(cacheKey);
    
    if (cached && !isDevelopment) {
      return cached;
    }

    try {
      const response = await apiClient.get<DashboardSummary>('/api/dashboard/summary');
      const ttl = isDevelopment ? 3 * 60 * 1000 : 15 * 60 * 1000;
      this.setCachedData(cacheKey, response.data, ttl);
      return response.data;
    } catch (error) {
      if (cached) return cached;
      throw error;
    }
  }

  /**
   * Get business insights with caching
   */
  async getBusinessInsights(): Promise<BusinessInsightsResponse> {
    const cacheKey = 'business-insights';
    const cached = this.getCachedData<BusinessInsightsResponse>(cacheKey);
    
    if (cached && !isDevelopment) {
      return cached;
    }

    try {
      const response = await apiClient.get<BusinessInsightsResponse>('/api/dashboard/insights');
      const ttl = 20 * 60 * 1000; // 20 minutes for insights
      this.setCachedData(cacheKey, response.data, ttl);
      return response.data;
    } catch (error) {
      if (cached) return cached;
      throw error;
    }
  }

  /**
   * Get dashboard alerts with short caching
   */
  async getDashboardAlerts(): Promise<AlertsResponse> {
    const cacheKey = 'alerts';
    const cached = this.getCachedData<AlertsResponse>(cacheKey);
    
    if (cached && !isDevelopment) {
      return cached;
    }

    try {
      const response = await apiClient.get<AlertsResponse>('/api/dashboard/alerts');
      const ttl = isDevelopment ? 1 * 60 * 1000 : 5 * 60 * 1000; // 1min dev, 5min prod
      this.setCachedData(cacheKey, response.data, ttl);
      return response.data;
    } catch (error) {
      if (cached) return cached;
      throw error;
    }
  }

  /**
   * Get quick statistics with frequent updates
   */
  async getQuickStats(): Promise<QuickStats> {
    const cacheKey = 'quick-stats';
    const cached = this.getCachedData<QuickStats>(cacheKey);
    
    if (cached && !isDevelopment) {
      return cached;
    }

    try {
      const response = await apiClient.get<QuickStats>('/api/dashboard/quick-stats');
      const normalizedData = this.normalizeNumericData({ quick_stats: response.data }).quick_stats;
      
      const ttl = isDevelopment ? 1 * 60 * 1000 : 3 * 60 * 1000; // 1min dev, 3min prod
      this.setCachedData(cacheKey, normalizedData, ttl);
      return normalizedData;
    } catch (error) {
      if (cached) return cached;
      throw error;
    }
  }

  /**
   * Get sales chart data with caching
   */
  async getSalesChartData(periodDays: number = 30): Promise<SalesChartData> {
    const cacheKey = generateCacheKey('sales-chart', undefined, undefined, { periodDays });
    const cached = this.getCachedData<SalesChartData>(cacheKey);
    
    if (cached && !isDevelopment) {
      return cached;
    }

    try {
      const response = await apiClient.get<SalesChartData>(`/api/dashboard/sales-chart?period_days=${periodDays}`);
      const normalizedData = this.normalizeNumericData({ sales_chart: response.data }).sales_chart;
      
      const ttl = 15 * 60 * 1000; // 15 minutes for chart data
      this.setCachedData(cacheKey, normalizedData, ttl);
      return normalizedData;
    } catch (error) {
      if (cached) return cached;
      throw error;
    }
  }

  /**
   * Get recent activities with short caching
   */
  async getRecentActivities(limit: number = 10): Promise<RecentActivity[]> {
    const cacheKey = generateCacheKey('recent-activities', undefined, undefined, { limit });
    const cached = this.getCachedData<RecentActivity[]>(cacheKey);
    
    if (cached && !isDevelopment) {
      return cached;
    }

    try {
      const response = await apiClient.get<RecentActivity[]>(`/api/dashboard/activities?limit=${limit}`);
      const ttl = isDevelopment ? 30 * 1000 : 2 * 60 * 1000; // 30sec dev, 2min prod
      this.setCachedData(cacheKey, response.data, ttl);
      return response.data;
    } catch (error) {
      if (cached) return cached;
      throw error;
    }
  }

  /**
   * Health check (no caching)
   */
  async checkHealth(): Promise<any> {
    const response = await apiClient.get('/api/dashboard/health');
    return response.data;
  }

  /**
   * Manual cache invalidation
   */
  public clearCache(cacheKey?: string): void {
    if (cacheKey) {
      this.cache.removeItem(cacheKey);
    } else {
      this.cache.clear();
    }
    
    this.cacheMetrics.invalidations++;
    this.cacheMetrics.lastUpdated = new Date().toISOString();
    
    console.log('Dashboard service: Manual cache clear:', cacheKey || 'all');
  }

  /**
   * Get cache metrics
   */
  public getCacheMetrics(): CacheMetrics & { config: any } {
    return {
      ...this.cacheMetrics,
      config: this.config
    };
  }

  /**
   * Force refresh data (bypass cache)
   */
  public async forceRefresh(): Promise<void> {
    this.cache.clear();
    this.cacheMetrics.invalidations++;
    console.log('Dashboard service: Force refresh - all cache cleared');
  }
}

// Export singleton instance
export const optimizedDashboardService = new OptimizedDashboardService();

// Also export the original service for backward compatibility
export { optimizedDashboardService as dashboardService };