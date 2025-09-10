/**
 * TypeScript types for Real-Time Error Logging System
 */

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  SYSTEM = 'system',
  DATABASE = 'database',
  API = 'api',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  BUSINESS_LOGIC = 'business_logic',
  EXTERNAL_SERVICE = 'external_service',
  PERFORMANCE = 'performance',
  SECURITY = 'security'
}

export enum WebSocketMessageType {
  CONNECTION_ESTABLISHED = 'connection_established',
  ERROR_UPDATE = 'error_update',
  STATISTICS_UPDATE = 'statistics_update',
  ERROR_RESOLVED = 'error_resolved',
  PING = 'ping',
  PONG = 'pong',
  REQUEST_STATISTICS = 'request_statistics',
  INITIAL_STATISTICS = 'initial_statistics'
}

export interface ErrorLog {
  id: string;
  error_message: string;
  error_type: string;
  endpoint: string;
  method: string;
  status_code: number;
  severity: ErrorSeverity;
  category: ErrorCategory;
  
  // Context information
  tenant_id?: string;
  user_id?: string;
  session_id?: string;
  request_id?: string;
  ip_address?: string;
  
  // Error details
  stack_trace?: string;
  additional_context?: Record<string, any>;
  
  // Resolution tracking
  is_resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
  resolved_by_name?: string;
  resolution_notes?: string;
  
  // Occurrence tracking
  occurrence_count: number;
  first_occurrence: string;
  last_occurrence: string;
  
  // Real-time specific fields
  time_since_last_occurrence?: string;
  is_active: boolean;
  priority_score?: number;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface ErrorStatistics {
  // Basic counts
  total_errors: number;
  active_errors_count: number;
  resolved_errors_count: number;
  
  // Severity breakdown
  severity_breakdown: Record<string, number>;
  severity_trends: Record<string, Array<{ time: string; count: number }>>;
  
  // Category breakdown
  category_breakdown: Record<string, number>;
  
  // Time-based metrics
  recent_critical_errors: number;
  critical_errors_last_hour: number;
  errors_per_hour: Array<{ hour: string; count: number }>;
  
  // Top error sources
  top_error_endpoints: Array<{ endpoint: string; count: number; percentage: number }>;
  top_error_types: Array<{ type: string; count: number; percentage: number }>;
  top_affected_tenants: Array<{ tenant_id: string; tenant_name?: string; count: number }>;
  
  // Real-time metrics
  error_rate_per_minute: number;
  average_resolution_time?: number;
  
  // Time range information
  time_range: {
    start: string;
    end: string;
    hours: number;
  };
  last_updated: string;
  
  // Health indicators
  system_health_score?: number;
  alert_level: string;
}

export interface CriticalErrorAlert {
  id: string;
  error_message: string;
  error_type: string;
  endpoint: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  tenant_id?: string;
  tenant_name?: string;
  occurrence_count: number;
  first_occurrence: string;
  last_occurrence: string;
  time_since_last: string;
  is_escalated: boolean;
  requires_immediate_attention: boolean;
}

export interface ErrorResolutionRequest {
  notes?: string;
  resolution_category?: string;
  estimated_fix_time?: number;
  requires_deployment: boolean;
  follow_up_required: boolean;
  related_ticket_id?: string;
}

export interface WebSocketMessage {
  type: WebSocketMessageType;
  timestamp: string;
  data?: any;
  error_id?: string;
  message?: string;
}

export interface ErrorFilters {
  tenant_id?: string;
  severity?: ErrorSeverity;
  category?: ErrorCategory;
  endpoint?: string;
  error_type?: string;
  hours_back: number;
  limit: number;
}

export interface ErrorListResponse {
  errors: ErrorLog[];
  total: number;
  skip: number;
  limit: number;
  has_more: boolean;
}

export interface WebSocketConnectionStatus {
  active_connections: number;
  connections: Array<{
    admin_user_id: string;
    admin_name?: string;
    connected_at: string;
    last_ping: string;
    connection_duration: string;
    is_active: boolean;
  }>;
  status: string;
  timestamp: string;
  total_messages_sent?: number;
  last_broadcast?: string;
}

export interface ErrorTrendAnalysis {
  period: string;
  total_errors: number;
  error_growth_rate: number;
  most_common_error_type: string;
  peak_error_hour: number;
  resolution_rate: number;
  average_resolution_time: number;
  critical_error_frequency: number;
  trend_direction: string;
  recommendations: string[];
}

export interface ErrorDashboardData {
  statistics: ErrorStatistics;
  active_errors: ErrorLog[];
  critical_alerts: CriticalErrorAlert[];
  trend_analysis: ErrorTrendAnalysis;
  connection_status: WebSocketConnectionStatus;
  last_refresh: string;
  auto_refresh_enabled: boolean;
  refresh_interval_seconds: number;
}

// Utility types for UI components
export interface ErrorTableColumn {
  key: keyof ErrorLog | string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  render?: (value: any, error: ErrorLog) => React.ReactNode;
}

export interface ErrorFilterState {
  filters: ErrorFilters;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  searchTerm: string;
}

export interface RealTimeConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  connectionError?: string;
  lastPing?: string;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
}

export interface ErrorNotification {
  id: string;
  type: 'error_update' | 'error_resolved' | 'critical_alert';
  title: string;
  message: string;
  severity: ErrorSeverity;
  timestamp: string;
  read: boolean;
  actionRequired: boolean;
}