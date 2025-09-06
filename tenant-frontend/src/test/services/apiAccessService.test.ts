import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiAccessService } from '@/services/apiAccessService';
import { apiClient } from '@/lib/api';

// Mock the API client
vi.mock('@/lib/api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('ApiAccessService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('API Key Management', () => {
    it('should get API keys', async () => {
      const mockApiKeys = [
        {
          id: 'key-1',
          name: 'Production Key',
          key: 'sk_live_1234567890abcdef',
          permissions: ['read:invoices', 'write:customers'],
          is_active: true,
          created_at: '2024-01-01T10:00:00Z',
          last_used_at: '2024-01-15T14:30:00Z',
        },
      ];

      vi.mocked(apiClient.get).mockResolvedValue({ data: mockApiKeys });

      const result = await apiAccessService.getApiKeys();

      expect(apiClient.get).toHaveBeenCalledWith('/api/api-access/keys');
      expect(result).toEqual(mockApiKeys);
    });

    it('should create API key', async () => {
      const createRequest = {
        name: 'Test Key',
        permissions: ['read:invoices'],
        expires_at: '2024-12-31T23:59:59Z',
      };

      const mockCreatedKey = {
        id: 'new-key',
        name: 'Test Key',
        key: 'sk_test_1234567890',
        permissions: ['read:invoices'],
        is_active: true,
        created_at: '2024-01-16T10:00:00Z',
        expires_at: '2024-12-31T23:59:59Z',
      };

      vi.mocked(apiClient.post).mockResolvedValue({ data: mockCreatedKey });

      const result = await apiAccessService.createApiKey(createRequest);

      expect(apiClient.post).toHaveBeenCalledWith('/api/api-access/keys', createRequest);
      expect(result).toEqual(mockCreatedKey);
    });

    it('should update API key', async () => {
      const keyId = 'key-1';
      const updates = {
        name: 'Updated Key Name',
        permissions: ['read:invoices', 'read:customers'],
      };

      const mockUpdatedKey = {
        id: keyId,
        name: 'Updated Key Name',
        key: 'sk_live_1234567890abcdef',
        permissions: ['read:invoices', 'read:customers'],
        is_active: true,
        created_at: '2024-01-01T10:00:00Z',
      };

      vi.mocked(apiClient.put).mockResolvedValue({ data: mockUpdatedKey });

      const result = await apiAccessService.updateApiKey(keyId, updates);

      expect(apiClient.put).toHaveBeenCalledWith(`/api/api-access/keys/${keyId}`, updates);
      expect(result).toEqual(mockUpdatedKey);
    });

    it('should delete API key', async () => {
      const keyId = 'key-1';

      vi.mocked(apiClient.delete).mockResolvedValue({ data: null });

      await apiAccessService.deleteApiKey(keyId);

      expect(apiClient.delete).toHaveBeenCalledWith(`/api/api-access/keys/${keyId}`);
    });

    it('should regenerate API key', async () => {
      const keyId = 'key-1';
      const mockRegeneratedKey = {
        id: keyId,
        name: 'Production Key',
        key: 'sk_live_newkey1234567890',
        permissions: ['read:invoices', 'write:customers'],
        is_active: true,
        created_at: '2024-01-01T10:00:00Z',
      };

      vi.mocked(apiClient.post).mockResolvedValue({ data: mockRegeneratedKey });

      const result = await apiAccessService.regenerateApiKey(keyId);

      expect(apiClient.post).toHaveBeenCalledWith(`/api/api-access/keys/${keyId}/regenerate`);
      expect(result).toEqual(mockRegeneratedKey);
    });
  });

  describe('Webhook Management', () => {
    it('should get webhooks', async () => {
      const mockWebhooks = [
        {
          id: 'webhook-1',
          url: 'https://example.com/webhook',
          events: ['invoice.created', 'payment.received'],
          is_active: true,
          secret: 'whsec_1234567890abcdef',
          created_at: '2024-01-01T10:00:00Z',
          last_triggered_at: '2024-01-15T14:30:00Z',
        },
      ];

      vi.mocked(apiClient.get).mockResolvedValue({ data: mockWebhooks });

      const result = await apiAccessService.getWebhooks();

      expect(apiClient.get).toHaveBeenCalledWith('/api/api-access/webhooks');
      expect(result).toEqual(mockWebhooks);
    });

    it('should create webhook', async () => {
      const createRequest = {
        url: 'https://test.com/webhook',
        events: ['invoice.created'],
      };

      const mockCreatedWebhook = {
        id: 'new-webhook',
        url: 'https://test.com/webhook',
        events: ['invoice.created'],
        is_active: true,
        secret: 'whsec_new123456789',
        created_at: '2024-01-16T10:00:00Z',
      };

      vi.mocked(apiClient.post).mockResolvedValue({ data: mockCreatedWebhook });

      const result = await apiAccessService.createWebhook(createRequest);

      expect(apiClient.post).toHaveBeenCalledWith('/api/api-access/webhooks', createRequest);
      expect(result).toEqual(mockCreatedWebhook);
    });

    it('should update webhook', async () => {
      const webhookId = 'webhook-1';
      const updates = {
        url: 'https://updated.com/webhook',
        events: ['invoice.created', 'customer.updated'],
      };

      const mockUpdatedWebhook = {
        id: webhookId,
        url: 'https://updated.com/webhook',
        events: ['invoice.created', 'customer.updated'],
        is_active: true,
        secret: 'whsec_1234567890abcdef',
        created_at: '2024-01-01T10:00:00Z',
      };

      vi.mocked(apiClient.put).mockResolvedValue({ data: mockUpdatedWebhook });

      const result = await apiAccessService.updateWebhook(webhookId, updates);

      expect(apiClient.put).toHaveBeenCalledWith(`/api/api-access/webhooks/${webhookId}`, updates);
      expect(result).toEqual(mockUpdatedWebhook);
    });

    it('should delete webhook', async () => {
      const webhookId = 'webhook-1';

      vi.mocked(apiClient.delete).mockResolvedValue({ data: null });

      await apiAccessService.deleteWebhook(webhookId);

      expect(apiClient.delete).toHaveBeenCalledWith(`/api/api-access/webhooks/${webhookId}`);
    });

    it('should test webhook', async () => {
      const webhookId = 'webhook-1';
      const mockTestResult = {
        success: true,
        response: { status: 200, body: 'OK' },
      };

      vi.mocked(apiClient.post).mockResolvedValue({ data: mockTestResult });

      const result = await apiAccessService.testWebhook(webhookId);

      expect(apiClient.post).toHaveBeenCalledWith(`/api/api-access/webhooks/${webhookId}/test`);
      expect(result).toEqual(mockTestResult);
    });
  });

  describe('Usage Analytics', () => {
    it('should get usage stats', async () => {
      const mockUsageStats = {
        total_requests: 15420,
        requests_today: 245,
        requests_this_month: 8750,
        rate_limit: 10000,
        rate_limit_remaining: 7500,
        rate_limit_reset: '2024-01-16T00:00:00Z',
        top_endpoints: [
          { endpoint: '/api/invoices', method: 'GET', count: 5200 },
          { endpoint: '/api/customers', method: 'POST', count: 2100 },
        ],
      };

      vi.mocked(apiClient.get).mockResolvedValue({ data: mockUsageStats });

      const result = await apiAccessService.getUsageStats();

      expect(apiClient.get).toHaveBeenCalledWith('/api/api-access/usage');
      expect(result).toEqual(mockUsageStats);
    });

    it('should get usage history', async () => {
      const days = 30;
      const mockUsageHistory = [
        { date: '2024-01-10', requests: 120 },
        { date: '2024-01-11', requests: 150 },
        { date: '2024-01-12', requests: 180 },
      ];

      vi.mocked(apiClient.get).mockResolvedValue({ data: mockUsageHistory });

      const result = await apiAccessService.getUsageHistory(days);

      expect(apiClient.get).toHaveBeenCalledWith('/api/api-access/usage/history', {
        params: { days }
      });
      expect(result).toEqual(mockUsageHistory);
    });

    it('should use default days parameter', async () => {
      const mockUsageHistory = [
        { date: '2024-01-10', requests: 120 },
      ];

      vi.mocked(apiClient.get).mockResolvedValue({ data: mockUsageHistory });

      const result = await apiAccessService.getUsageHistory();

      expect(apiClient.get).toHaveBeenCalledWith('/api/api-access/usage/history', {
        params: { days: 30 }
      });
      expect(result).toEqual(mockUsageHistory);
    });
  });

  describe('API Documentation', () => {
    it('should get API documentation', async () => {
      const mockDocumentation = {
        endpoints: [
          {
            path: '/api/invoices',
            method: 'GET',
            description: 'Get list of invoices',
            parameters: [
              {
                name: 'limit',
                type: 'integer',
                required: false,
                description: 'Number of items to return',
              },
            ],
            responses: [
              {
                status: 200,
                description: 'Success',
                schema: { type: 'array' },
              },
            ],
          },
        ],
      };

      vi.mocked(apiClient.get).mockResolvedValue({ data: mockDocumentation });

      const result = await apiAccessService.getApiDocumentation();

      expect(apiClient.get).toHaveBeenCalledWith('/api/api-access/docs');
      expect(result).toEqual(mockDocumentation);
    });

    it('should test API endpoint', async () => {
      const endpoint = '/api/invoices';
      const method = 'GET';
      const parameters = { limit: 10 };
      const mockTestResult = {
        status: 200,
        data: [{ id: 1, total: 100 }],
      };

      vi.mocked(apiClient.post).mockResolvedValue({ data: mockTestResult });

      const result = await apiAccessService.testApiEndpoint(endpoint, method, parameters);

      expect(apiClient.post).toHaveBeenCalledWith('/api/api-access/test-endpoint', {
        endpoint,
        method,
        parameters
      });
      expect(result).toEqual(mockTestResult);
    });
  });

  describe('Available Options', () => {
    it('should get available permissions', async () => {
      const mockPermissions = [
        {
          key: 'read:invoices',
          name: 'خواندن فاکتورها',
          description: 'دسترسی خواندن به فاکتورها',
        },
        {
          key: 'write:customers',
          name: 'نوشتن مشتریان',
          description: 'دسترسی ایجاد و ویرایش مشتریان',
        },
      ];

      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPermissions });

      const result = await apiAccessService.getAvailablePermissions();

      expect(apiClient.get).toHaveBeenCalledWith('/api/api-access/permissions');
      expect(result).toEqual(mockPermissions);
    });

    it('should get available webhook events', async () => {
      const mockEvents = [
        {
          key: 'invoice.created',
          name: 'ایجاد فاکتور',
          description: 'هنگام ایجاد فاکتور جدید',
        },
        {
          key: 'payment.received',
          name: 'دریافت پرداخت',
          description: 'هنگام دریافت پرداخت',
        },
      ];

      vi.mocked(apiClient.get).mockResolvedValue({ data: mockEvents });

      const result = await apiAccessService.getAvailableWebhookEvents();

      expect(apiClient.get).toHaveBeenCalledWith('/api/api-access/webhook-events');
      expect(result).toEqual(mockEvents);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors', async () => {
      const errorMessage = 'API Error';
      vi.mocked(apiClient.get).mockRejectedValue(new Error(errorMessage));

      await expect(apiAccessService.getApiKeys()).rejects.toThrow(errorMessage);
    });

    it('should handle network errors', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Network Error'));

      await expect(apiAccessService.createApiKey({
        name: 'Test',
        permissions: ['read:invoices']
      })).rejects.toThrow('Network Error');
    });
  });
});