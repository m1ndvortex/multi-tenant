/**
 * API Access Management Service
 * Handles API key management, documentation, webhooks, and usage analytics
 */

import { apiClient } from '@/lib/api';

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  is_active: boolean;
  created_at: string;
  last_used_at?: string;
  expires_at?: string;
}

export interface ApiKeyCreateRequest {
  name: string;
  permissions: string[];
  expires_at?: string;
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  is_active: boolean;
  secret: string;
  created_at: string;
  last_triggered_at?: string;
}

export interface WebhookCreateRequest {
  url: string;
  events: string[];
}

export interface ApiUsageStats {
  total_requests: number;
  requests_today: number;
  requests_this_month: number;
  rate_limit: number;
  rate_limit_remaining: number;
  rate_limit_reset: string;
  top_endpoints: Array<{
    endpoint: string;
    method: string;
    count: number;
  }>;
}

export interface ApiDocumentation {
  endpoints: Array<{
    path: string;
    method: string;
    description: string;
    parameters: Array<{
      name: string;
      type: string;
      required: boolean;
      description: string;
    }>;
    responses: Array<{
      status: number;
      description: string;
      schema?: any;
    }>;
  }>;
}

class ApiAccessService {
  // API Key Management
  async getApiKeys(): Promise<ApiKey[]> {
    const response = await apiClient.get<ApiKey[]>('/api/api-access/keys');
    return response.data;
  }

  async createApiKey(request: ApiKeyCreateRequest): Promise<ApiKey> {
    const response = await apiClient.post<ApiKey>('/api/api-access/keys', request);
    return response.data;
  }

  async updateApiKey(keyId: string, updates: Partial<ApiKeyCreateRequest>): Promise<ApiKey> {
    const response = await apiClient.put<ApiKey>(`/api/api-access/keys/${keyId}`, updates);
    return response.data;
  }

  async deleteApiKey(keyId: string): Promise<void> {
    await apiClient.delete(`/api/api-access/keys/${keyId}`);
  }

  async regenerateApiKey(keyId: string): Promise<ApiKey> {
    const response = await apiClient.post<ApiKey>(`/api/api-access/keys/${keyId}/regenerate`);
    return response.data;
  }

  // Webhook Management
  async getWebhooks(): Promise<WebhookEndpoint[]> {
    const response = await apiClient.get<WebhookEndpoint[]>('/api/api-access/webhooks');
    return response.data;
  }

  async createWebhook(request: WebhookCreateRequest): Promise<WebhookEndpoint> {
    const response = await apiClient.post<WebhookEndpoint>('/api/api-access/webhooks', request);
    return response.data;
  }

  async updateWebhook(webhookId: string, updates: Partial<WebhookCreateRequest>): Promise<WebhookEndpoint> {
    const response = await apiClient.put<WebhookEndpoint>(`/api/api-access/webhooks/${webhookId}`, updates);
    return response.data;
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await apiClient.delete(`/api/api-access/webhooks/${webhookId}`);
  }

  async testWebhook(webhookId: string): Promise<{ success: boolean; response?: any; error?: string }> {
    const response = await apiClient.post<{ success: boolean; response?: any; error?: string }>(`/api/api-access/webhooks/${webhookId}/test`);
    return response.data;
  }

  // Usage Analytics
  async getUsageStats(): Promise<ApiUsageStats> {
    const response = await apiClient.get<ApiUsageStats>('/api/api-access/usage');
    return response.data;
  }

  async getUsageHistory(days: number = 30): Promise<Array<{ date: string; requests: number }>> {
    const response = await apiClient.get<Array<{ date: string; requests: number }>>('/api/api-access/usage/history', {
      params: { days }
    });
    return response.data;
  }

  // API Documentation
  async getApiDocumentation(): Promise<ApiDocumentation> {
    const response = await apiClient.get<ApiDocumentation>('/api/api-access/docs');
    return response.data;
  }

  async testApiEndpoint(endpoint: string, method: string, parameters?: any): Promise<any> {
    const response = await apiClient.post('/api/api-access/test-endpoint', {
      endpoint,
      method,
      parameters
    });
    return response.data;
  }

  // Available permissions and events
  async getAvailablePermissions(): Promise<Array<{ key: string; name: string; description: string }>> {
    const response = await apiClient.get<Array<{ key: string; name: string; description: string }>>('/api/api-access/permissions');
    return response.data;
  }

  async getAvailableWebhookEvents(): Promise<Array<{ key: string; name: string; description: string }>> {
    const response = await apiClient.get<Array<{ key: string; name: string; description: string }>>('/api/api-access/webhook-events');
    return response.data;
  }
}

export const apiAccessService = new ApiAccessService();