/**
 * Enhanced Tenant Management Service
 * Service for enhanced tenant management operations including credential updates
 */

import { apiClient } from './apiClient';
import {
  TenantCredentialsUpdateRequest,
  TenantFullUpdateRequest,
  TenantCredentialsResponse,
  TenantFullUpdateResponse,
  EnhancedTenant,
  TenantAuditLogResponse,
  TenantManagementStats,
  BulkTenantCredentialUpdateRequest,
  BulkTenantCredentialUpdateResponse
} from '@/types/enhancedTenant';

export interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: any;
}

class EnhancedTenantService {
  private async request<T>(endpoint: string, options: { method?: string; body?: any } = {}): Promise<T> {
    try {
      const { method = 'GET', body } = options;
      
      let result: any;
      if (method === 'GET') {
        result = await apiClient.get(endpoint);
      } else if (method === 'POST') {
        result = await apiClient.post(endpoint, body);
      } else if (method === 'PUT') {
        result = await apiClient.put(endpoint, body);
      } else if (method === 'DELETE') {
        result = await apiClient.delete(endpoint);
      } else {
        throw new Error(`Unsupported method: ${method}`);
      }

      return result as T;
    } catch (error: any) {
      // Handle axios errors
      if (error.response) {
        const apiError: ApiError = {
          message: error.response.data?.message || error.response.data?.detail || `HTTP error! status: ${error.response.status}`,
          status: error.response.status,
          details: error.response.data
        };
        throw apiError;
      }
      
      // Handle network errors
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout - please try again');
      }
      if (!navigator.onLine) {
        throw new Error('No internet connection - please check your network');
      }
      
      throw error;
    }
  }

  /**
   * Update tenant owner credentials (email and/or password)
   */
  async updateTenantCredentials(
    tenantId: string,
    data: TenantCredentialsUpdateRequest
  ): Promise<TenantCredentialsResponse> {
    return this.request<TenantCredentialsResponse>(
      `/api/enhanced-tenant-management/tenants/${tenantId}/credentials`,
      {
        method: 'PUT',
        body: data,
      }
    );
  }

  /**
   * Comprehensive tenant update with enhanced functionality
   */
  async fullTenantUpdate(
    tenantId: string,
    data: TenantFullUpdateRequest
  ): Promise<TenantFullUpdateResponse> {
    return this.request<TenantFullUpdateResponse>(
      `/api/enhanced-tenant-management/tenants/${tenantId}/full-update`,
      {
        method: 'PUT',
        body: data,
      }
    );
  }

  /**
   * Get enhanced tenant details with additional information
   */
  async getEnhancedTenantDetails(tenantId: string): Promise<EnhancedTenant> {
    return this.request<EnhancedTenant>(
      `/api/enhanced-tenant-management/tenants/${tenantId}/enhanced`
    );
  }

  /**
   * Get tenant audit log with parsed entries
   */
  async getTenantAuditLog(tenantId: string, limit: number = 50): Promise<TenantAuditLogResponse> {
    return this.request<TenantAuditLogResponse>(
      `/api/enhanced-tenant-management/tenants/${tenantId}/audit-log?limit=${limit}`
    );
  }

  /**
   * Get comprehensive tenant management statistics
   */
  async getTenantManagementStats(): Promise<TenantManagementStats> {
    return this.request<TenantManagementStats>(
      '/api/enhanced-tenant-management/management-stats'
    );
  }

  /**
   * Perform bulk credential operations on multiple tenants
   */
  async bulkTenantCredentialUpdate(
    data: BulkTenantCredentialUpdateRequest
  ): Promise<BulkTenantCredentialUpdateResponse> {
    return this.request<BulkTenantCredentialUpdateResponse>(
      '/api/enhanced-tenant-management/tenants/bulk-credential-update',
      {
        method: 'POST',
        body: data,
      }
    );
  }
}

export const enhancedTenantService = new EnhancedTenantService();