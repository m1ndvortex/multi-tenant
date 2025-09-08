import { apiClient } from './apiClient';

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  DATABASE = 'database',
  EXTERNAL_API = 'external_api',
  BUSINESS_LOGIC = 'business_logic',
  SYSTEM = 'system',
  NETWORK = 'network',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  UNKNOWN = 'unknown'
}

export interface ErrorLog {
  id: string;
  tenant_id?: string;
  user_id?: string;
  session_id?: string;
  error_message: string;
  error_type: string;
  error_code?: string;
  endpoint: string;
  method: string;
  status_code: number;
  severity: ErrorSeverity;
  category: ErrorCategory;
  request_id?: string;
  user_agent?: string;
  ip_address?: string;
  stack_trace?: string;
  request_data?: Record<string, any>;
  response_data?: Record<string, any>;
  additional_context?: Record<string, any>;
  is_resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
  notification_sent: boolean;
  notification_sent_at?: string;
  occurrence_count: number;
  first_occurrence: string;
  last_occurrence: string;
  created_at: string;
  updated_at: string;
}

export interface ErrorLogFilters {
  tenant_id?: string;
  user_id?: string;
  severity?: ErrorSeverity;
  category?: ErrorCategory;
  endpoint?: string;
  error_type?: string;
  status_code?: number;
  is_resolved?: boolean;
  start_date?: string;
  end_date?: string;
  search_term?: string;
  skip?: number;
  limit?: number;
  order_by?: string;
  order_desc?: boolean;
}

export interface ErrorLogListResponse {
  errors: ErrorLog[];
  total: number;
  skip: number;
  limit: number;
  has_more: boolean;
}

export interface ErrorStatistics {
  total_errors: number;
  severity_breakdown: Record<string, number>;
  category_breakdown: Record<string, number>;
  recent_critical_errors: number;
  unresolved_errors: number;
  top_error_endpoints: Array<{
    endpoint: string;
    count: number;
  }>;
}

export interface ErrorTrends {
  daily_counts: Array<{
    date: string;
    count: number;
    severity_breakdown: Record<string, number>;
  }>;
  severity_trends: Record<string, Array<{
    date: string;
    count: number;
  }>>;
  period: {
    start_date: string;
    end_date: string;
    days: number;
  };
}

export interface CriticalErrorAlert {
  id: string;
  error_message: string;
  error_type: string;
  endpoint: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  tenant_id?: string;
  occurrence_count: number;
  first_occurrence: string;
  last_occurrence: string;
}

export interface ErrorResolutionRequest {
  notes?: string;
}

export interface BulkErrorActionRequest {
  error_ids: string[];
  action: 'resolve' | 'delete';
  notes?: string;
}

export interface BulkErrorActionResponse {
  success_count: number;
  failed_count: number;
  successful_error_ids: string[];
  failed_operations: Array<{
    error_id: string;
    error: string;
  }>;
  message: string;
}

export const errorLoggingService = {
  // Get error logs with filtering and pagination
  async getErrorLogs(filters: ErrorLogFilters = {}): Promise<ErrorLogListResponse> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    return apiClient.get(`/api/super-admin/errors?${params.toString()}`);
  },

  // Get specific error log by ID
  async getErrorLog(errorId: string): Promise<ErrorLog> {
    return apiClient.get(`/api/super-admin/errors/${errorId}`);
  },

  // Mark error as resolved
  async resolveError(errorId: string, resolutionData: ErrorResolutionRequest): Promise<ErrorLog> {
    return apiClient.put(`/api/super-admin/errors/${errorId}/resolve`, resolutionData);
  },

  // Get error statistics
  async getErrorStatistics(
    tenantId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<ErrorStatistics> {
    const params = new URLSearchParams();
    
    if (tenantId) params.append('tenant_id', tenantId);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    return apiClient.get(`/api/super-admin/errors/statistics/overview?${params.toString()}`);
  },

  // Get error trends
  async getErrorTrends(days: number = 7): Promise<ErrorTrends> {
    return apiClient.get(`/api/super-admin/errors/statistics/trends?days=${days}`);
  },

  // Get critical errors
  async getCriticalErrors(hours: number = 24): Promise<CriticalErrorAlert[]> {
    return apiClient.get(`/api/super-admin/errors/alerts/critical?hours=${hours}`);
  },

  // Perform bulk actions on errors
  async bulkErrorAction(actionData: BulkErrorActionRequest): Promise<BulkErrorActionResponse> {
    return apiClient.post('/api/super-admin/errors/bulk-action', actionData);
  },

  // Delete error log
  async deleteErrorLog(errorId: string): Promise<{ message: string }> {
    return apiClient.delete(`/api/super-admin/errors/${errorId}`);
  },

  // Health check for error logging system
  async healthCheck(): Promise<{
    status: string;
    database_connection: string;
    recent_errors_accessible: boolean;
    total_errors_in_system: number;
    timestamp: string;
  }> {
    return apiClient.get('/api/super-admin/errors/health/check');
  }
};