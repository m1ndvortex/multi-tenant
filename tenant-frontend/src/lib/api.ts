/**
 * API Client utility for making HTTP requests
 */

import { API_BASE_URL } from './config';

interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
}

interface RequestConfig {
  headers?: Record<string, string>;
  responseType?: 'json' | 'blob';
  params?: Record<string, any>;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('tenant_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  private async request<T>(
    method: string,
    url: string,
    data?: any,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const headers = {
      ...this.getAuthHeaders(),
      ...config.headers,
    };

    const requestConfig: RequestInit = {
      method,
      headers,
    };

    if (data && method !== 'GET') {
      requestConfig.body = JSON.stringify(data);
    }

    // Handle query parameters
    let requestUrl = `${this.baseURL}${url}`;
    if (config.params && method === 'GET') {
      const searchParams = new URLSearchParams();
      Object.entries(config.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        requestUrl += `?${queryString}`;
      }
    }

    const response = await fetch(requestUrl, requestConfig);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `Request failed with status ${response.status}`);
    }

    let responseData: T;
    if (config.responseType === 'blob') {
      responseData = (await response.blob()) as T;
    } else {
      responseData = await response.json();
    }

    return {
      data: responseData,
      status: response.status,
      statusText: response.statusText,
    };
  }

  async get<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('GET', url, undefined, config);
  }

  async post<T>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('POST', url, data, config);
  }

  async put<T>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', url, data, config);
  }

  async delete<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', url, undefined, config);
  }
}

export const apiClient = new ApiClient(API_BASE_URL);