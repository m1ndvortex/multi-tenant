import { useQuery } from '@tanstack/react-query';

interface DashboardStats {
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

const fetchDashboardStats = async (): Promise<DashboardStats> => {
  const response = await fetch('/api/super-admin/dashboard-stats', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch dashboard statistics');
  }

  return response.json();
};

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
    refetchInterval: 60000, // Refetch every minute
    staleTime: 50000, // Consider data stale after 50 seconds
    retry: 2,
    retryDelay: 1000,
  });
};