/**
 * Simplified Error Logging Dashboard Tests
 * Focus on core functionality without complex tab interactions
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
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

describe('ErrorLoggingDashboard - Core Functionality', () => {
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
    criticalAlerts: [],
    notifications: [],
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

  describe('Basic Rendering', () => {
    it('renders the dashboard title and description', () => {
      render(<ErrorLoggingDashboard />);

      expect(screen.getByText('Real-Time Error Logging')).toBeInTheDocument();
      expect(screen.getByText('Monitor system errors and resolve issues in real-time')).toBeInTheDocument();
    });

    it('displays connection status when connected', () => {
      render(<ErrorLoggingDashboard />);

      expect(screen.getByText('Real-time Connected')).toBeInTheDocument();
    });

    it('displays connection status when disconnected', () => {
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

    it('shows all tab triggers', () => {
      render(<ErrorLoggingDashboard />);

      expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /active errors/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /critical alerts/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /notifications/i })).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('calls refreshData when refresh button is clicked', () => {
      render(<ErrorLoggingDashboard />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(refreshButton);

      expect(mockErrorLoggingData.refreshData).toHaveBeenCalledTimes(1);
    });

    it('calls connectRealTime when connect button is clicked', () => {
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

    it('calls disconnectRealTime when disconnect button is clicked', () => {
      render(<ErrorLoggingDashboard />);

      const disconnectButton = screen.getByRole('button', { name: /disconnect/i });
      fireEvent.click(disconnectButton);

      expect(mockErrorLoggingData.disconnectRealTime).toHaveBeenCalledTimes(1);
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

    it('displays connection error alert', () => {
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

  describe('Badge Counts', () => {
    it('shows badge with active errors count', () => {
      render(<ErrorLoggingDashboard />);

      const activeErrorsTab = screen.getByRole('tab', { name: /active errors/i });
      expect(activeErrorsTab).toHaveTextContent('2'); // Badge with count
    });

    it('does not show badge when no critical alerts', () => {
      render(<ErrorLoggingDashboard />);

      const criticalAlertsTab = screen.getByRole('tab', { name: /critical alerts/i });
      // Should not have a badge since criticalAlerts is empty
      expect(criticalAlertsTab).not.toHaveTextContent('0');
    });
  });

  describe('Development Mode', () => {
    it('shows simulate error button in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(<ErrorLoggingDashboard />);

      expect(screen.getByRole('button', { name: /simulate error/i })).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });

    it('calls simulateError when simulate error button is clicked', () => {
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

  describe('Statistics Display', () => {
    it('renders statistics component', () => {
      render(<ErrorLoggingDashboard />);

      // The statistics component should be rendered
      // We can't test the exact content since it's mocked, but we can verify it's present
      expect(screen.getByTestId('error-statistics-cards')).toBeInTheDocument();
    });
  });

  describe('Hook Integration', () => {
    it('calls useErrorLogging with correct options', () => {
      render(<ErrorLoggingDashboard />);

      expect(mockUseErrorLogging).toHaveBeenCalledWith({
        autoConnect: true,
        autoRefresh: true,
        refreshInterval: 30000,
        enableNotifications: true
      });
    });
  });
});