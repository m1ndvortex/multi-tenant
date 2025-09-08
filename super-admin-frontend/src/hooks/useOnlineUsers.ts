import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';

interface OnlineUser {
  id: string;
  email: string;
  tenant_name: string;
  last_activity: string;
  is_impersonation?: boolean;
}

interface OnlineUsersResponse {
  users: OnlineUser[];
  total_count: number;
  last_updated: string;
}

const fetchOnlineUsers = async (): Promise<OnlineUsersResponse> => {
  return apiClient.get<OnlineUsersResponse>('/api/super-admin/online-users');
};

export const useOnlineUsers = () => {
  return useQuery({
    queryKey: ['online-users'],
    queryFn: fetchOnlineUsers,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
    staleTime: 25000, // Consider data stale after 25 seconds
    retry: 2,
    retryDelay: 1000,
  });
};