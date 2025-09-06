import { apiClient, RetryConfig } from './apiClient';
import { DashboardStats, OnlineUser, SystemAlert, QuickStats } from './dashboardService';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class OptimizedDashboardService {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly defaultTTL = 30000; // 30 seconds
  private readonly retryConfig: RetryConfig = {
    retries: 2,
    retryDelay: 1000,
  };

  // Cache management
  private getCacheKey(endpoint: string, params?: Record<string, any>): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `${endpoint}${paramString}`;
  }

  private isValidCache<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  private setCache<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  private getCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && this.isValidCache(entry)) {
      return entry.data;
    }
    if (entry) {
      this.cache.delete(key);
    }
    return null;
  }

  // Optimized API calls with caching
  async getDashboardStats(useCache: boolean = true): Promise<DashboardStats> {
    const cacheKey = this.getCacheKey('/api/super-admin/dashboard-stats');
    
    if (useCache) {
      const cached = this.getCache<DashboardStats>(cacheKey);
      if (cached) return cached;
    }

    const data = await apiClient.get<DashboardStats>(
      '/api/super-admin/dashboard-stats',
      {},
      this.retryConfig
    );

    this.setCache(cacheKey, data, 60000); // Cache for 1 minute
    return data;
  }

  async getOnlineUsers(useCache: boolean = true): Promise<OnlineUser[]> {
    const cacheKey = this.getCacheKey('/api/super-admin/online-users');
    
    if (useCache) {
      const cached = this.getCache<OnlineUser[]>(cacheKey);
      if (cached) return cached;
    }

    const data = await apiClient.get<OnlineUser[]>(
      '/api/super-admin/online-users',
      {},
      this.retryConfig
    );

    this.setCache(cacheKey, data, 15000); // Cache for 15 seconds (more frequent updates)
    return data;
  }

  async getSystemAlerts(limit: number = 10, useCache: boolean = true): Promise<SystemAlert[]> {
    const cacheKey = this.getCacheKey('/api/super-admin/system-alerts', { limit });
    
    if (useCache) {
      const cached = this.getCache<SystemAlert[]>(cacheKey);
      if (cached) return cached;
    }

    const data = await apiClient.get<SystemAlert[]>(
      `/api/super-admin/system-alerts?limit=${limit}`,
      {},
      this.retryConfig
    );

    this.setCache(cacheKey, data, 45000); // Cache for 45 seconds
    return data;
  }

  async getQuickStats(useCache: boolean = true): Promise<QuickStats> {
    const cacheKey = this.getCacheKey('/api/super-admin/quick-stats');
    
    if (useCache) {
      const cached = this.getCache<QuickStats>(cacheKey);
      if (cached) return cached;
    }

    const data = await apiClient.get<QuickStats>(
      '/api/super-admin/quick-stats',
      {},
      this.retryConfig
    );

    this.setCache(cacheKey, data, 30000); // Cache for 30 seconds
    return data;
  }

  async getCurrentSystemHealth(useCache: boolean = true) {
    const cacheKey = this.getCacheKey('/api/super-admin/system-health/current');
    
    if (useCache) {
      const cached = this.getCache(cacheKey);
      if (cached) return cached;
    }

    const data = await apiClient.get(
      '/api/super-admin/system-health/current',
      {},
      { retries: 1, retryDelay: 500 }
    );

    this.setCache(cacheKey, data, 10000); // Cache for 10 seconds (frequent updates)
    return data;
  }

  // Batch operations with intelligent caching
  async refreshAllDashboardData(forceRefresh: boolean = false): Promise<{
    stats: DashboardStats;
    onlineUsers: OnlineUser[];
    alerts: SystemAlert[];
    quickStats: QuickStats;
  }> {
    // Use parallel requests with caching
    const [stats, onlineUsers, alerts, quickStats] = await Promise.allSettled([
      this.getDashboardStats(!forceRefresh),
      this.getOnlineUsers(!forceRefresh),
      this.getSystemAlerts(10, !forceRefresh),
      this.getQuickStats(!forceRefresh),
    ]);

    return {
      stats: stats.status === 'fulfilled' ? stats.value : {} as DashboardStats,
      onlineUsers: onlineUsers.status === 'fulfilled' ? onlineUsers.value : [],
      alerts: alerts.status === 'fulfilled' ? alerts.value : [],
      quickStats: quickStats.status === 'fulfilled' ? quickStats.value : {} as QuickStats,
    };
  }

  // Prefetch data for better UX
  async prefetchDashboardData(): Promise<void> {
    // Prefetch in background without waiting
    Promise.allSettled([
      this.getDashboardStats(),
      this.getOnlineUsers(),
      this.getSystemAlerts(),
      this.getQuickStats(),
    ]).catch(() => {
      // Silently handle prefetch errors
    });
  }

  // Cache management utilities
  clearCache(): void {
    this.cache.clear();
  }

  clearExpiredCache(): void {
    for (const [key, entry] of this.cache.entries()) {
      if (!this.isValidCache(entry)) {
        this.cache.delete(key);
      }
    }
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export const optimizedDashboardService = new OptimizedDashboardService();