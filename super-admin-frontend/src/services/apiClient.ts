import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: any;
  isNetworkError?: boolean;
  isTimeoutError?: boolean;
}

export interface RetryConfig {
  retries: number;
  retryDelay: number;
  retryCondition?: (error: AxiosError) => boolean;
}

class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private refreshPromise: Promise<string | null> | null = null;
  private defaultRetryConfig: RetryConfig = {
    retries: 3,
    retryDelay: 1000,
    retryCondition: (error: AxiosError) => {
      // Retry on network errors, timeouts, and 5xx errors
      return !error.response || 
             error.code === 'ECONNABORTED' || 
             (error.response.status >= 500 && error.response.status < 600);
    }
  };

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000, // 30 seconds
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor for auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('super_admin_token');
        if (token) {
          config.headers = config.headers || {};
          (config.headers as any).Authorization = `Bearer ${token}`;
        }
        return config;
      },
  (error: any) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
  (response: any) => response,
  async (error: AxiosError) => {
        const originalRequest = error.config as (AxiosRequestConfig & { _retry?: boolean });

        // Attempt token refresh once on 401
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newToken = await this.refreshAccessToken();
            if (newToken) {
              // Update header and retry the original request
              originalRequest.headers = originalRequest.headers || {};
              (originalRequest.headers as any).Authorization = `Bearer ${newToken}`;
              return this.client.request(originalRequest);
            }
          } catch (e) {
            // fall through to transform and reject
          }
        }

        const apiError = this.transformError(error);
        return Promise.reject(apiError);
      }
    );
  }

  private async refreshAccessToken(): Promise<string | null> {
    // Debounce multiple concurrent 401s
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        // Use the same client to hit refresh endpoint with stored refresh token
        const refreshToken = localStorage.getItem('super_admin_refresh_token');
        if (!refreshToken) {
          return null;
        }
        const resp = await this.client.post(
          '/api/auth/refresh',
          { refresh_token: refreshToken }
        );
        const data: any = (resp as any).data ?? resp;
        const newAccessToken = data?.access_token;
        const newRefreshToken = data?.refresh_token;
        if (newAccessToken) {
          localStorage.setItem('super_admin_token', newAccessToken);
          if (newRefreshToken) {
            localStorage.setItem('super_admin_refresh_token', newRefreshToken);
          }
          return newAccessToken;
        }
        return null;
      } catch (e) {
        // Clear invalid token
        localStorage.removeItem('super_admin_token');
        localStorage.removeItem('super_admin_refresh_token');
        try {
          window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        } catch {}
        return null;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private transformError(error: AxiosError): ApiError {
    const apiError: ApiError = {
      message: 'An unexpected error occurred',
      status: 0,
      isNetworkError: false,
      isTimeoutError: false,
    };

    if (error.code === 'ECONNABORTED') {
      apiError.message = 'Request timeout - please try again';
      apiError.isTimeoutError = true;
      apiError.status = 408;
    } else if (!error.response) {
      apiError.message = 'Network error - please check your connection';
      apiError.isNetworkError = true;
      apiError.status = 0;
    } else {
      apiError.status = error.response.status;
      
      // Extract error message from response
      const responseData = error.response.data as any;
      if (responseData?.message) {
        apiError.message = responseData.message;
      } else if (responseData?.detail) {
        apiError.message = responseData.detail;
      } else if (responseData?.error) {
        apiError.message = responseData.error;
      } else {
        apiError.message = this.getStatusMessage(error.response.status);
      }

      apiError.details = responseData;
      apiError.code = responseData?.code;
    }

    return apiError;
  }

  private getStatusMessage(status: number): string {
    switch (status) {
      case 400: return 'Bad request - please check your input';
      case 401: return 'Authentication required - please log in';
      case 403: return 'Access denied - insufficient permissions';
      case 404: return 'Resource not found';
      case 409: return 'Conflict - resource already exists';
      case 422: return 'Validation error - please check your input';
      case 429: return 'Too many requests - please try again later';
      case 500: return 'Server error - please try again';
      case 502: return 'Bad gateway - service temporarily unavailable';
      case 503: return 'Service unavailable - please try again later';
      case 504: return 'Gateway timeout - please try again';
      default: return `HTTP error ${status}`;
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async request<T>(
    config: AxiosRequestConfig,
    retryConfig: Partial<RetryConfig> = {}
  ): Promise<T> {
    const finalRetryConfig = { ...this.defaultRetryConfig, ...retryConfig };
    let lastError: ApiError;

    for (let attempt = 0; attempt <= finalRetryConfig.retries; attempt++) {
      try {
        const response: AxiosResponse<T> = await this.client.request(config);
        return response.data;
      } catch (error) {
        lastError = error as ApiError;

        // Don't retry on the last attempt
        if (attempt === finalRetryConfig.retries) {
          break;
        }

        // Check if we should retry this error
        if (finalRetryConfig.retryCondition && !finalRetryConfig.retryCondition(error as AxiosError)) {
          break;
        }

        // Wait before retrying (exponential backoff)
        const delayMs = finalRetryConfig.retryDelay * Math.pow(2, attempt);
        await this.delay(delayMs);
      }
    }

    throw lastError!;
  }

  // Convenience methods
  async get<T>(url: string, config?: AxiosRequestConfig, retryConfig?: Partial<RetryConfig>): Promise<T> {
    return this.request<T>({ ...config, method: 'GET', url }, retryConfig);
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig, retryConfig?: Partial<RetryConfig>): Promise<T> {
    return this.request<T>({ ...config, method: 'POST', url, data }, retryConfig);
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig, retryConfig?: Partial<RetryConfig>): Promise<T> {
    return this.request<T>({ ...config, method: 'PUT', url, data }, retryConfig);
  }

  async delete<T>(url: string, config?: AxiosRequestConfig, retryConfig?: Partial<RetryConfig>): Promise<T> {
    return this.request<T>({ ...config, method: 'DELETE', url }, retryConfig);
  }

  // Check network connectivity
  async checkConnectivity(): Promise<boolean> {
    try {
      await this.get('/api/health', {}, { retries: 0 });
      return true;
    } catch {
      return false;
    }
  }
}

export const apiClient = new ApiClient();