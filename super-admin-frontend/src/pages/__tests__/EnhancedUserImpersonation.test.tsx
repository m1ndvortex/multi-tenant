import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import UserImpersonation from '../UserImpersonation';

// Create mock functions
const mockGetUsers = vi.fn();
const mockStartEnhancedImpersonation = vi.fn();
const mockGetEnhancedActiveSessions = vi.fn();
const mockGetAuditLog = vi.fn();
const mockTerminateEnhancedSession = vi.fn();
const mockOpenTenantAppInNewWindow = vi.fn();
const mockGetTenants = vi.fn();

// Mock the services
vi.mock('@/services/impersonationService', () => ({
  impersonationService: {
    getUsers: mockGetUsers,
    startEnhancedImpersonation: mockStartEnhancedImpersonation,
    getEnhancedActiveSessions: mockGetEnhancedActiveSessions,
    getAuditLog: mockGetAuditLog,
    terminateEnhancedSession: mockTerminateEnhancedSession,
    openTenantAppInNewWindow: mockOpenTenantAppInNewWindow,
  },
}));

vi.mock('@/services/tenantService', () => ({
  tenantService: {
    getTenants: mockGetTenants,
  },
}));

// Mock the hooks
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock the components
vi.mock('@/components/UserSelectionTable', () => ({
  default: ({ users, onImpersonate, isLoading }: any) => (
    <div data-testid="user-selection-table">
      {isLoading ? 'Loading users...' : `${users?.length || 0} users`}
      <button onClick={() => onImpersonate({ id: 'user-1', email: 'test@example.com' })}>
        Impersonate
      </button>
    </div>
  ),
}));

vi.mock('@/components/ActiveSessionsTable', () => ({
  default: ({ sessions, onTerminateSession, isLoading }: any) => (
    <div data-testid="active-sessions-table">
      {isLoading ? 'Loading sessions...' : `${sessions?.length || 0} sessions`}
      <button onClick={() => onTerminateSession('session-1')}>
        Terminate
      </button>
    </div>
  ),
}));

vi.mock('@/components/AuditTrailTable', () => ({
  default: ({ auditLogs, isLoading }: any) => (
    <div data-testid="audit-trail-table">
      {isLoading ? 'Loading audit...' : `${auditLogs?.length || 0} logs`}
    </div>
  ),
}));

vi.mock('@/components/ImpersonationStartDialog', () => ({
  default: ({ isOpen, onConfirm, onClose, user }: any) => (
    isOpen ? (
      <div data-testid="impersonation-dialog">
        <p>Impersonating: {user?.email}</p>
        <button onClick={() => onConfirm({
          target_user_id: 'user-1',
          duration_hours: 2,
          reason: 'Test',
          is_window_based: true
        })}>
          Confirm Enhanced
        </button>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  ),
}));

vi.mock('@/components/UserFilters', () => ({
  default: ({ onFiltersChange, onReset }: any) => (
    <div data-testid="user-filters">
      <button onClick={() => onFiltersChange({ search: 'test' })}>Apply Filter</button>
      <button onClick={onReset}>Reset</button>
    </div>
  ),
}));

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <div data-testid="card" data-variant={variant}>{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-content">{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-header">{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <h3 data-testid="card-title">{children}</h3>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant }: any) => (
    <button onClick={onClick} data-variant={variant} data-testid="button">
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <span data-testid="badge" data-variant={variant}>{children}</span>
  ),
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, defaultValue }: { children: React.ReactNode; defaultValue: string }) => (
    <div data-testid="tabs" data-default-value={defaultValue}>{children}</div>
  ),
  TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid="tabs-content" data-value={value}>{children}</div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tabs-list">{children}</div>
  ),
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button data-testid="tabs-trigger" data-value={value}>{children}</button>
  ),
}));

describe('EnhancedUserImpersonation', () => {
  const mockUsers = [
    {
      id: 'user-1',
      email: 'user1@example.com',
      name: 'User 1',
      tenant_id: 'tenant-1',
      tenant_name: 'Tenant 1',
      role: 'user',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
    },
  ];

  const mockSessions = [
    {
      id: 'session-1',
      session_id: 'sess-123',
      admin_user_id: 'admin-1',
      target_user_id: 'user-1',
      started_at: '2024-01-01T10:00:00Z',
      expires_at: '2024-01-01T12:00:00Z',
      is_window_based: true,
      status: 'active',
    },
  ];

  const mockTenants = [
    { id: 'tenant-1', name: 'Tenant 1' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockGetUsers.mockResolvedValue({
      users: mockUsers,
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    
    mockGetEnhancedActiveSessions.mockResolvedValue(mockSessions);
    mockGetAuditLog.mockResolvedValue([]);
    mockGetTenants.mockResolvedValue({ tenants: mockTenants });
    
    mockStartEnhancedImpersonation.mockResolvedValue({
      access_token: 'token-123',
      session_id: 'session-123',
      target_user: mockUsers[0],
      admin_user: { id: 'admin-1', email: 'admin@example.com' },
      expires_at: '2024-01-01T12:00:00Z',
      is_window_based: true,
      window_url: 'http://tenant-app.com',
    });
    
    mockOpenTenantAppInNewWindow.mockReturnValue({
      closed: false,
    });
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <UserImpersonation />
      </BrowserRouter>
    );
  };

  it('renders enhanced impersonation interface', async () => {
    renderComponent();
    
    expect(screen.getByText('جانشینی کاربر')).toBeInTheDocument();
    expect(screen.getByText('مدیریت جلسات جانشینی و پشتیبانی از کاربران')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByTestId('user-selection-table')).toBeInTheDocument();
      expect(screen.getByTestId('active-sessions-table')).toBeInTheDocument();
    });
  });

  it('loads data on component mount', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(mockGetUsers).toHaveBeenCalled();
      expect(mockGetEnhancedActiveSessions).toHaveBeenCalled();
      expect(mockGetAuditLog).toHaveBeenCalled();
      expect(mockGetTenants).toHaveBeenCalled();
    });
  });

  it('opens enhanced impersonation dialog when user is selected', async () => {
    renderComponent();
    
    await waitFor(() => {
      const impersonateButton = screen.getByText('Impersonate');
      fireEvent.click(impersonateButton);
    });
    
    expect(screen.getByTestId('impersonation-dialog')).toBeInTheDocument();
    expect(screen.getByText('Impersonating: test@example.com')).toBeInTheDocument();
  });

  it('starts enhanced impersonation with new window support', async () => {
    renderComponent();
    
    await waitFor(() => {
      const impersonateButton = screen.getByText('Impersonate');
      fireEvent.click(impersonateButton);
    });
    
    const confirmButton = screen.getByText('Confirm Enhanced');
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(mockStartEnhancedImpersonation).toHaveBeenCalledWith({
        target_user_id: 'user-1',
        duration_hours: 2,
        reason: 'Test',
        is_window_based: true,
      });
    });
  });

  it('opens new window when window-based impersonation is successful', async () => {
    renderComponent();
    
    await waitFor(() => {
      const impersonateButton = screen.getByText('Impersonate');
      fireEvent.click(impersonateButton);
    });
    
    const confirmButton = screen.getByText('Confirm Enhanced');
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(mockOpenTenantAppInNewWindow).toHaveBeenCalledWith(
        'token-123',
        mockUsers[0],
        'session-123'
      );
    });
  });

  it('terminates enhanced sessions correctly', async () => {
    renderComponent();
    
    await waitFor(() => {
      const terminateButton = screen.getByText('Terminate');
      fireEvent.click(terminateButton);
    });
    
    await waitFor(() => {
      expect(mockTerminateEnhancedSession).toHaveBeenCalledWith('session-1');
    });
  });

  it('refreshes data when refresh button is clicked', async () => {
    renderComponent();
    
    await waitFor(() => {
      const refreshButton = screen.getByText('بروزرسانی');
      fireEvent.click(refreshButton);
    });
    
    // Should call all data loading methods again
    expect(mockGetUsers).toHaveBeenCalledTimes(2); // Once on mount, once on refresh
    expect(mockGetEnhancedActiveSessions).toHaveBeenCalledTimes(2);
    expect(mockGetAuditLog).toHaveBeenCalledTimes(2);
  });

  it('handles filter changes correctly', async () => {
    renderComponent();
    
    await waitFor(() => {
      const applyFilterButton = screen.getByText('Apply Filter');
      fireEvent.click(applyFilterButton);
    });
    
    await waitFor(() => {
      expect(mockGetUsers).toHaveBeenCalledWith(
        1, 10, { search: 'test' }
      );
    });
  });

  it('resets filters correctly', async () => {
    renderComponent();
    
    await waitFor(() => {
      const resetButton = screen.getByText('Reset');
      fireEvent.click(resetButton);
    });
    
    await waitFor(() => {
      expect(mockGetUsers).toHaveBeenCalledWith(
        1, 10, {}
      );
    });
  });

  it('shows security warning', () => {
    renderComponent();
    
    expect(screen.getByText('نکات امنیتی مهم')).toBeInTheDocument();
    expect(screen.getByText(/تمام اقدامات جانشینی ثبت و نظارت می‌شود/)).toBeInTheDocument();
  });

  it('displays tab navigation with badges', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('انتخاب کاربر')).toBeInTheDocument();
      expect(screen.getByText('جلسات فعال')).toBeInTheDocument();
      expect(screen.getByText('سابقه عملیات')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    mockGetUsers.mockRejectedValue(new Error('API Error'));
    
    renderComponent();
    
    await waitFor(() => {
      // Should still render the interface even with API errors
      expect(screen.getByTestId('user-selection-table')).toBeInTheDocument();
    });
  });

  it('handles popup blocker scenario', async () => {
    mockOpenTenantAppInNewWindow.mockReturnValue(null);
    
    renderComponent();
    
    await waitFor(() => {
      const impersonateButton = screen.getByText('Impersonate');
      fireEvent.click(impersonateButton);
    });
    
    const confirmButton = screen.getByText('Confirm Enhanced');
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(mockStartEnhancedImpersonation).toHaveBeenCalled();
    });
  });

  it('closes dialog when close button is clicked', async () => {
    renderComponent();
    
    await waitFor(() => {
      const impersonateButton = screen.getByText('Impersonate');
      fireEvent.click(impersonateButton);
    });
    
    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);
    
    await waitFor(() => {
      expect(screen.queryByTestId('impersonation-dialog')).not.toBeInTheDocument();
    });
  });
});