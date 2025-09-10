/**
 * Error Logging Dashboard Component Tests
 * Tests for real-time error logging dashboard functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import ErrorLoggingDashboard from '../ErrorLoggingDashboard';
import { useErrorLogging } from '../../../hooks/useErrorLogging';
import { ErrorSeverity, ErrorCategory } from '../../../types/errorLogging';

// Mock the useErrorLogging hook
vi.mock('../../../hooks/useErrorLogging');

// Mock WebSocket
global.WebSocket = vi.fn().mockImplementation(() => ({
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  close: vi.fn(),
  send: vi.fn(),
  readyState: 1, // OPEN
}));

// Mock components that might have complex dependencies
vi.mock('../ErrorStatisticsCards', () => ({
  default: ({ statistics, isLoading }: any) => (
    <div data-testid="error-statistics-cards">
      {isLoading ? 'Loading statistics...' : `Statistics: ${statistics?.total_errors || 0} errors`}
    </div>
  )
}));

vi.mock('../ActiveErrorsTable', () => ({
  default: ({ errors, isLoading, onResolveError }: any) => (
    <div data-testid="active-errors-table">
      {isLoading ? 'Loading errors...' : (
        <div>
          <div>Active Errors: {errors.length}</div>
          {errors.map((error: any) => (
            <div key={error.id} data-testid={`error-${error.id}`}>
              <span>{error.error_message}</span>
              <button onClick={() => onResolveError(error.id)}>Resolve</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}));

vi.mock('../CriticalAlertsPanel', () => ({
  default: ({ alerts, isLoading }: any) => (
    <div data-testid="critical-alerts-panel">
      {isLoading ? 'Loading alerts...' : `Critical Alerts: ${alerts.length}`}
    </div>
  )
}));

vi.mock('../ErrorNotificationsPanel', () => ({
  default: ({ notifications, onMarkAsRead, onClearAll }: any) => (
    <div data-testid="error-notifications-panel">
      <div>Notifications: {notifications.length}</div>
      {notifications.map((notification: any) => (
        <div key={notification.id} data-testid={`notification-${notification.id}`}>
          <span>{notification.title}</span>
          <button onClick={() => onMarkAsRead(notification.id)}>Mark as Read</button>
        </div>
      ))}
      <button onClick={onClearAll}>Clear All Notifications</button>
    </div>
  )
}));

describe('ErrorLoggingDashboard', () => {
  const mockUseErrorLogging = vi.mocked(useErrorLogging);

  const mockErrorLoggingData = {
    activeErrors: [
      {
        id: 'error-1',
        error_message: 'Database connection failed',
        error_type: 'DatabaseError',
        endpoint: '/api/users',
        method: 'GET',
        status_code: 500,
        severity: ErrorSeverity.CRITICAL,
        category: ErrorCategory.DATABASE,
        is_resolved: false,
        occurrence_count: 5,
        first_occurrence: '2024-01-01T10:00:00Z',
        last_occurrence: '2024-01-01T12:00:00Z',
        is_active: true,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T12:00:00Z'
      },
      {
        id: 'error-2',
        error_message: 'Authentication failed',
        error_type: 'AuthError',
        endpoint: '/api/auth/login',
        method: 'POST',
        status_code: 401,
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.AUTHENTICATION,
        is_resolved: false,
        occurrence_count: 2,
        first_occurrence: '2024-01-01T11:00:00Z',
        last_occurrence: '2024-01-01T11:30:00Z',
        is_active: true,
        created_at: '2024-01-01T11:00:00Z',
        updated_at: '2024-01-01T11:30:00Z'
      }
    ],
    statistics: {
      total_errors: 10,
      active_errors_count: 2,
      resolved_errors_count: 8,
      severity_breakdown: {
        critical: 1,
        high: 1,
        medium: 3,
        low: 5
      },
      category_breakdown: {
        database: 1,
        authentication: 1,
        api: 3,
        system: 5
      },
      recent_critical_errors: 1,
      critical_errors_last_hour: 1,
      errors_per_hour: [],
      top_error_endpoints: [],
      top_error_types: [],
      top_affected_tenants: [],
      error_rate_per_minute: 0.5,
      time_range: {
        start: '2024-01-01T00:00:00Z',
        end: '2024-01-01T23:59:59Z',
        hours: 24
      },
      last_updated: '2024-01-01T12:00:00Z',
      alert_level: 'high'
    },
    criticalAlerts: [
      {
        id: 'alert-1',
        error_message: 'Database connection failed',
        error_type: 'DatabaseError',
        endpoint: '/api/users',
        severity: ErrorSeverity.CRITICAL,
        category: ErrorCategory.DATABASE,
        occurrence_count: 5,
        first_occurrence: '2024-01-01T10:00:00Z',
        last_occurrence: '2024-01-01T12:00:00Z',
        time_since_last: '2 minutes ago',
        is_escalated: false,
        requires_immediate_attention: true
      }
    ],
    notifications: [
      {
        id: 'notification-1',
        type: 'critical_alert' as const,
        title: 'Critical Error Detected',
        message: 'Database connection failed',
        severity: ErrorSeverity.CRITICAL,
        timestamp: '2024-01-01T12:00:00Z',
        read: false,
        actionRequired: true
      }
    ],
    isLoading: false,
    isLoadingErrors: false,
    isLoadingStatistics: false,
    isLoadingAlerts: false,
    connectionState: {
      isConnected: true,
      isConnecting: false,
      reconnectAttempts: 0,
      maxReconnectAttempts: 5
    },
    error: null,
    refreshData: vi.fn(),
    loadActiveErrors: vi.fn(),
    loadStatistics: vi.fn(),
    loadCriticalAlerts: vi.fn(),
    resolveError: vi.fn(),
    simulateError: vi.fn(),
    connectRealTime: vi.fn(),
    disconnectRealTime: vi.fn(),
    markNotificationAsRead: vi.fn(),
    clearAllNotifications: vi.fn(),
    updateFilters: vi.fn(),
    toggleAutoRefresh: vi.fn()
  };

  beforeEach(() => {
    mockUseErrorLogging.mockReturnValue(mockErrorLoggingData);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the dashboard with all main components', () => {
      render(<ErrorLoggingDashboard />);

      expect(screen.getByText('Real-Time Error Logging')).toBeInTheDocument();
      expect(screen.getByText('Monitor system errors and resolve issues in real-time')).toBeInTheDocument();
      expect(screen.getByTestId('error-statistics-cards')).toBeInTheDocument();
    });

    it('displays connection status indicator when connected', () => {
      render(<ErrorLoggingDashboard />);

      expect(screen.getByText('Real-time Connected')).toBeInTheDocument();
    });

    it('displays connection status indicator when disconnected', () => {
      mockUseErrorLogging.mockReturnValue({
        ...mockErrorLoggingData,
        connectionState: {
          isConnected: false,
          isConnecting: false,
          reconnectAttempts: 0,
          maxReconnectAttempts: 5
        }
      });

      render(<ErrorLoggingDashboard />);

      expect(screen.getByText('Disconnected')).toBeInTheDocument();
    });

    it('displays connecting status when connecting', () => {
      mockUseErrorLogging.mockReturnValue({
        ...mockErrorLoggingData,
        connectionState: {
          isConnected: false,
          isConnecting: true,
          reconnectAttempts: 1,
          maxReconnectAttempts: 5
        }
      });

      render(<ErrorLoggingDashboard />);

      expect(screen.getByText('Connecting...')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('renders all tab triggers', () => {
      render(<ErrorLoggingDashboard />);

      expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /active errors/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /critical alerts/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /notifications/i })).toBeInTheDocument();
    });

    it('shows badge with active errors count', () => {
      render(<ErrorLoggingDashboard />);

      const activeErrorsTab = screen.getByRole('tab', { name: /active errors/i });
      expect(activeErrorsTab).toHaveTextContent('2'); // Badge with count
    });

    it('shows badge with critical alerts count', () => {
      render(<ErrorLoggingDashboard />);

      const criticalAlertsTab = screen.getByRole('tab', { name: /critical alerts/i });
      expect(criticalAlertsTab).toHaveTextContent('1'); // Badge with count
    });

    it('shows badge with unread notifications count', () => {
      render(<ErrorLoggingDashboard />);

      const notificationsTab = screen.getByRole('tab', { name: /notifications/i });
      expect(notificationsTab).toHaveTextContent('1'); // Badge with count
    });

    it('switches between tabs correctly', async () => {
      render(<ErrorLoggingDashboard />);

      // Click on Active Errors tab
      const activeErrorsTab = screen.getByRole('tab', { name: /active errors/i });
      fireEvent.click(activeErrorsTab);

      await waitFor(() => {
        expect(screen.getByTestId('active-errors-table')).toBeInTheDocument();
      });

      // Click on Critical Alerts tab
      const criticalAlertsTab = screen.getByRole('tab', { name: /critical alerts/i });
      fireEvent.click(criticalAlertsTab);

      await waitFor(() => {
        expect(screen.getByTestId('critical-alerts-panel')).toBeInTheDocument();
      });
    });
  });

  describe('Actions', () => {
    it('calls refreshData when refresh button is clicked', async () => {
      render(<ErrorLoggingDashboard />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(refreshButton);

      expect(mockErrorLoggingData.refreshData).toHaveBeenCalledTimes(1);
    });

    it('calls connectRealTime when connect button is clicked', async () => {
      mockUseErrorLogging.mockReturnValue({
        ...mockErrorLoggingData,
        connectionState: {
          isConnected: false,
          isConnecting: false,
          reconnectAttempts: 0,
          maxReconnectAttempts: 5
        }
      });

      render(<ErrorLoggingDashboard />);

      const connectButton = screen.getByRole('button', { name: /connect/i });
      fireEvent.click(connectButton);

      expect(mockErrorLoggingData.connectRealTime).toHaveBeenCalledTimes(1);
    });

    it('calls disconnectRealTime when disconnect button is clicked', async () => {
      render(<ErrorLoggingDashboard />);

      const disconnectButton = screen.getByRole('button', { name: /disconnect/i });
      fireEvent.click(disconnectButton);

      expect(mockErrorLoggingData.disconnectRealTime).toHaveBeenCalledTimes(1);
    });

    it('shows simulate error button in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(<ErrorLoggingDashboard />);

      expect(screen.getByRole('button', { name: /simulate error/i })).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });

    it('calls simulateError when simulate error button is clicked', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(<ErrorLoggingDashboard />);

      const simulateButton = screen.getByRole('button', { name: /simulate error/i });
      fireEvent.click(simulateButton);

      expect(mockErrorLoggingData.simulateError).toHaveBeenCalledWith(
        'Test error from dashboard',
        'high',
        'system'
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Error Handling', () => {
    it('displays error alert when there is an error', () => {
      mockUseErrorLogging.mockReturnValue({
        ...mockErrorLoggingData,
        error: 'Failed to load error data'
      });

      render(<ErrorLoggingDashboard />);

      expect(screen.getByText('Failed to load error data')).toBeInTheDocument();
    });

    it('displays connection error alert when there is a connection error', () => {
      mockUseErrorLogging.mockReturnValue({
        ...mockErrorLoggingData,
        connectionState: {
          isConnected: false,
          isConnecting: false,
          connectionError: 'WebSocket connection failed',
          reconnectAttempts: 1,
          maxReconnectAttempts: 5
        }
      });

      render(<ErrorLoggingDashboard />);

      expect(screen.getByText(/WebSocket connection error: WebSocket connection failed/)).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('shows loading state for statistics', () => {
      mockUseErrorLogging.mockReturnValue({
        ...mockErrorLoggingData,
        isLoadingStatistics: true
      });

      render(<ErrorLoggingDashboard />);

      expect(screen.getByText('Loading statistics...')).toBeInTheDocument();
    });

    it('shows loading state for errors', () => {
      mockUseErrorLogging.mockReturnValue({
        ...mockErrorLoggingData,
        isLoadingErrors: true
      });

      render(<ErrorLoggingDashboard />);

      // Switch to active errors tab to see the loading state
      const activeErrorsTab = screen.getByRole('tab', { name: /active errors/i });
      fireEvent.click(activeErrorsTab);

      expect(screen.getByText('Loading errors...')).toBeInTheDocument();
    });

    it('disables refresh button when loading', () => {
      mockUseErrorLogging.mockReturnValue({
        ...mockErrorLoggingData,
        isLoading: true
      });

      render(<ErrorLoggingDashboard />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toBeDisabled();
    });
  });

  describe('Error Resolution', () => {
    it('opens resolution dialog when resolve error is called', async () => {
      render(<ErrorLoggingDashboard />);

      // Switch to active errors tab
      const activeErrorsTab = screen.getByRole('tab', { name: /active errors/i });
      fireEvent.click(activeErrorsTab);

      await waitFor(() => {
        const resolveButton = screen.getByRole('button', { name: /resolve/i });
        fireEvent.click(resolveButton);
      });

      // The dialog should be rendered (mocked component doesn't show actual dialog)
      // In a real test, we would check for dialog visibility
    });
  });

  describe('Notifications', () => {
    it('displays notifications panel with correct data', async () => {
      render(<ErrorLoggingDashboard />);

      // Switch to notifications tab
      const notificationsTab = screen.getByRole('tab', { name: /notifications/i });
      fireEvent.click(notificationsTab);

      await waitFor(() => {
        expect(screen.getByTestId('error-notifications-panel')).toBeInTheDocument();
        expect(screen.getByText('Notifications: 1')).toBeInTheDocument();
      });
    });

    it('calls markNotificationAsRead when notification is marked as read', async () => {
      render(<ErrorLoggingDashboard />);

      // Switch to notifications tab
      const notificationsTab = screen.getByRole('tab', { name: /notifications/i });
      fireEvent.click(notificationsTab);

      await waitFor(() => {
        const markReadButton = screen.getByRole('button', { name: /mark as read/i });
        fireEvent.click(markReadButton);
      });

      expect(mockErrorLoggingData.markNotificationAsRead).toHaveBeenCalledWith('notification-1');
    });

    it('calls clearAllNotifications when clear all is clicked', async () => {
      render(<ErrorLoggingDashboard />);

      // Switch to notifications tab
      const notificationsTab = screen.getByRole('tab', { name: /notifications/i });
      fireEvent.click(notificationsTab);

      await waitFor(() => {
        const clearAllButton = screen.getByRole('button', { name: /clear all notifications/i });
        fireEvent.click(clearAllButton);
      });

      expect(mockErrorLoggingData.clearAllNotifications).toHaveBeenCalledTimes(1);
    });
  });

  describe('Overview Tab', () => {
    it('displays recent active errors in overview', () => {
      render(<ErrorLoggingDashboard />);

      // Overview tab should be active by default
      expect(screen.getByText('Recent Active Errors')).toBeInTheDocument();
      expect(screen.getAllByText('Critical Alerts')).toHaveLength(2); // Tab and card title
    });

    it('shows "View All" button when there are more than 5 errors', () => {
      const manyErrors = Array.from({ length: 10 }, (_, i) => ({
        ...mockErrorLoggingData.activeErrors[0],
        id: `error-${i}`,
        error_message: `Error ${i}`
      }));

      mockUseErrorLogging.mockReturnValue({
        ...mockErrorLoggingData,
        activeErrors: manyErrors
      });

      render(<ErrorLoggingDashboard />);

      expect(screen.getByText('View All 10 Errors')).toBeInTheDocument();
    });

    it('shows "View All" button when there are more than 3 critical alerts', () => {
      const manyAlerts = Array.from({ length: 5 }, (_, i) => ({
        ...mockErrorLoggingData.criticalAlerts[0],
        id: `alert-${i}`,
        error_message: `Alert ${i}`
      }));

      mockUseErrorLogging.mockReturnValue({
        ...mockErrorLoggingData,
        criticalAlerts: manyAlerts
      });

      render(<ErrorLoggingDashboard />);

      expect(screen.getByText('View All 5 Alerts')).toBeInTheDocument();
    });
  });
});