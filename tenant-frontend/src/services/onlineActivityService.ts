import { apiClient } from '@/lib/api';
import { API_BASE_URL } from '@/lib/config';

export interface ActivityPayload {
  session_id: string;
  user_agent?: string;
  ip_address?: string;
}

export interface ActivityResponse {
  success: boolean;
  message: string;
  user_id?: string;
  timestamp?: string;
}

/**
 * Send a heartbeat/activity update for the current tenant user.
 * Requires the Authorization header to be set via apiClient (tenant_token in localStorage).
 */
export async function sendActivityUpdate(payload: ActivityPayload): Promise<ActivityResponse> {
  const { data } = await apiClient.post<ActivityResponse>('/api/online-users/activity/update', payload);
  return data;
}

export async function sendOffline(): Promise<ActivityResponse> {
  const { data } = await apiClient.post<ActivityResponse>('/api/online-users/activity/offline');
  return data;
}

export function sendOfflineBeacon(token: string): boolean {
  // Use relative URL when API_BASE_URL is empty to leverage Vite proxy in dev
  const base = API_BASE_URL || '';
  const url = `${base}/api/online-users/activity/offline-beacon?token=${encodeURIComponent(token)}`;
  if ('sendBeacon' in navigator) {
    try {
      const blob = new Blob([], { type: 'text/plain' });
      return navigator.sendBeacon(url, blob);
    } catch {
      return false;
    }
  }
  return false;
}
