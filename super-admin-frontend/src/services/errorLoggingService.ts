/**
 * Real-Time Error Logging Service
 * Handles API calls and WebSocket connections for error logging dashboard
 */

import { 
  ErrorLog, 
  ErrorStatistics, 
  ErrorFilters, 
  ErrorListResponse, 
  CriticalErrorAlert,
  ErrorResolutionRequest,
  WebSocketConnectionStatus,
  WebSocketMessage,
  WebSocketMessageType
} from '../types/errorLogging';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

class ErrorLoggingService {
  private baseUrl: string;
  private wsUrl: string;
  private websocket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageHandlers: Map<WebSocketMessageType, ((data: any) => void)[]> = new Map();
  private connectionStateHandlers: ((connected: boolean, error?: string) => void)[] = [];

  constructor() {
    this.baseUrl = `${API_BASE_URL}/api/enhanced-error-logging`;
    this.wsUrl = `${WS_BASE_URL}/api/enhanced-error-logging/ws/real-time-errors`;
  }

  /**
   * Get authentication headers
   */
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('adminToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  }

  /**
   * Handle API errors
   */
  private handleApiError(error: any): never {
    console.error('Error Logging API Error:', error);
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error(error.message || 'An error occurred while communicating with the server');
  }

  /**
   * Get active (unresolved) errors with filtering
   */
  async getActiveErrors(filters: ErrorFilters): Promise<ErrorListResponse> {
    try {
      const params = new URLSearchParams();
      
      if (filters.tenant_id) params.append('tenant_id', filters.tenant_id);
      if (filters.severity) params.append('severity', filters.severity);
      if (filters.category) params.append('category', filters.category);
      if (filters.endpoint) params.append('endpoint', filters.endpoint);
      if (filters.error_type) params.append('error_type', filters.error_type);
      params.append('hours_back', filters.hours_back.toString());
      params.append('limit', filters.limit.toString());

      const response = await fetch(`${this.baseUrl}/active-errors?${params}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Get real-time error statistics
   */
  async getErrorStatistics(tenantId?: string, hoursBack: number = 24): Promise<ErrorStatistics> {
    try {
      const params = new URLSearchParams();
      if (tenantId) params.append('tenant_id', tenantId);
      params.append('hours_back', hoursBack.toString());

      const response = await fetch(`${this.baseUrl}/real-time-statistics?${params}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Resolve an error with admin tracking
   */
  async resolveError(errorId: string, resolutionData: ErrorResolutionRequest): Promise<ErrorLog> {
    try {
      const response = await fetch(`${this.baseUrl}/${errorId}/resolve-with-tracking`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(resolutionData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Get critical error alerts
   */
  async getCriticalAlerts(hours: number = 24, includeResolved: boolean = false): Promise<CriticalErrorAlert[]> {
    try {
      const params = new URLSearchParams();
      params.append('hours', hours.toString());
      params.append('include_resolved', includeResolved.toString());

      const response = await fetch(`${this.baseUrl}/critical-alerts?${params}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Get WebSocket connection status
   */
  async getConnectionStatus(): Promise<WebSocketConnectionStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/connection-status`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Simulate an error for testing (development only)
   */
  async simulateError(
    errorMessage: string, 
    severity: string = 'high', 
    category: string = 'system',
    tenantId?: string
  ): Promise<{ success: boolean; error_id: string; message: string }> {
    try {
      const params = new URLSearchParams();
      params.append('error_message', errorMessage);
      params.append('severity', severity);
      params.append('category', category);
      if (tenantId) params.append('tenant_id', tenantId);

      const response = await fetch(`${this.baseUrl}/simulate-error?${params}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * WebSocket Connection Management
   */

  /**
   * Connect to WebSocket for real-time updates
   */
  connectWebSocket(): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    const token = localStorage.getItem('adminToken') || 'temp-token';
    const wsUrl = `${this.wsUrl}?token=${encodeURIComponent(token)}`;

    try {
      this.websocket = new WebSocket(wsUrl);

      this.websocket.onopen = () => {
        console.log('WebSocket connected to real-time error logging');
        this.reconnectAttempts = 0;
        this.notifyConnectionStateHandlers(true);
        
        // Start ping interval to keep connection alive
        this.startPingInterval();
      };

      this.websocket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleWebSocketMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.websocket.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        this.notifyConnectionStateHandlers(false);
        
        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.notifyConnectionStateHandlers(false, 'WebSocket connection error');
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.notifyConnectionStateHandlers(false, 'Failed to create WebSocket connection');
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnectWebSocket(): void {
    if (this.websocket) {
      this.websocket.close(1000, 'Manual disconnect');
      this.websocket = null;
    }
  }

  /**
   * Check if WebSocket is connected
   */
  isWebSocketConnected(): boolean {
    return this.websocket?.readyState === WebSocket.OPEN;
  }

  /**
   * Schedule WebSocket reconnection
   */
  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
    
    console.log(`Scheduling WebSocket reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        this.connectWebSocket();
      }
    }, delay);
  }

  /**
   * Start ping interval to keep connection alive
   */
  private startPingInterval(): void {
    const pingInterval = setInterval(() => {
      if (this.websocket?.readyState === WebSocket.OPEN) {
        this.sendWebSocketMessage({
          type: WebSocketMessageType.PING,
          timestamp: new Date().toISOString()
        });
      } else {
        clearInterval(pingInterval);
      }
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Send WebSocket message
   */
  private sendWebSocketMessage(message: Partial<WebSocketMessage>): void {
    if (this.websocket?.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(message));
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleWebSocketMessage(message: WebSocketMessage): void {
    const handlers = this.messageHandlers.get(message.type) || [];
    handlers.forEach(handler => {
      try {
        handler(message.data || message);
      } catch (error) {
        console.error('Error in WebSocket message handler:', error);
      }
    });
  }

  /**
   * Add WebSocket message handler
   */
  addMessageHandler(type: WebSocketMessageType, handler: (data: any) => void): void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type)!.push(handler);
  }

  /**
   * Remove WebSocket message handler
   */
  removeMessageHandler(type: WebSocketMessageType, handler: (data: any) => void): void {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Add connection state handler
   */
  addConnectionStateHandler(handler: (connected: boolean, error?: string) => void): void {
    this.connectionStateHandlers.push(handler);
  }

  /**
   * Remove connection state handler
   */
  removeConnectionStateHandler(handler: (connected: boolean, error?: string) => void): void {
    const index = this.connectionStateHandlers.indexOf(handler);
    if (index > -1) {
      this.connectionStateHandlers.splice(index, 1);
    }
  }

  /**
   * Notify connection state handlers
   */
  private notifyConnectionStateHandlers(connected: boolean, error?: string): void {
    this.connectionStateHandlers.forEach(handler => {
      try {
        handler(connected, error);
      } catch (error) {
        console.error('Error in connection state handler:', error);
      }
    });
  }

  /**
   * Request current statistics via WebSocket
   */
  requestStatistics(): void {
    this.sendWebSocketMessage({
      type: WebSocketMessageType.REQUEST_STATISTICS,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.disconnectWebSocket();
    this.messageHandlers.clear();
    this.connectionStateHandlers.length = 0;
  }
}

// Export singleton instance
export const errorLoggingService = new ErrorLoggingService();

// Re-export types for convenience
export { ErrorSeverity, ErrorCategory } from '../types/errorLogging';
export type { 
  ErrorLog, 
  ErrorStatistics, 
  ErrorFilters, 
  CriticalErrorAlert 
} from '../types/errorLogging';

// Placeholder type for ErrorTrends
export interface ErrorTrends {
  daily_counts: Array<{ date: string; count: number }>;
  severity_trends: Record<string, Array<{ time: string; count: number }>>;
}

// Additional exports for components
export const ErrorLogFilters = {
  // Default filter values
  DEFAULT_HOURS_BACK: 24,
  DEFAULT_LIMIT: 50
};

export default errorLoggingService;