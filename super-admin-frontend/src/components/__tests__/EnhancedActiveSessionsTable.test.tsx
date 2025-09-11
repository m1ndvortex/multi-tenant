import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import ActiveSessionsTable from '../ActiveSessionsTable';
import { ActiveSession } from '@/types/impersonation';

// Mock the UI components
vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table data-testid="table">{children}</table>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children, className }: { children: React.ReactNode; className?: string }) => 
    <td className={className}>{children}</td>,
  TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, size, className }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={className}
      data-variant={variant}
      data-size={size}
      data-testid="button"
    >
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: { children: React.ReactNode; variant?: string; className?: string }) => (
    <span data-testid="badge" data-variant={variant} className={className}>{children}</span>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <div data-testid="card" data-variant={variant}>{children}</div>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-content" className={className}>{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-header">{children}</div>
  ),
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h3 data-testid="card-title" className={className}>{children}</h3>
  ),
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn(() => '2 ساعت پیش'),
}));

vi.mock('date-fns/locale', () => ({
  faIR: {},
}));

describe('EnhancedActiveSessionsTable', () => {
  const mockWindowBasedSession: ActiveSession = {
    id: 'session-1',
    session_id: 'sess-123-456',
    admin_user_id: 'admin-123',
    target_user_id: 'user-456',
    target_tenant_id: 'tenant-789',
    started_at: '2024-01-01T10:00:00Z',
    expires_at: '2024-01-01T12:00:00Z',
    is_active: true,
    is_window_based: true,
    window_closed_detected: false,
    ip_address: '192.168.1.1',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0.4472.124',
    reason: 'Customer support',
    last_activity_at: '2024-01-01T11:30:00Z',
    activity_count: 15,
    status: 'active',
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T11:30:00Z',
  };

  const mockRedirectBasedSession: ActiveSession = {
    id: 'session-2',
    session_id: 'sess-789-012',
    admin_user_id: 'admin-456',
    target_user_id: 'user-789',
    target_tenant_id: 'tenant-012',
    started_at: '2024-01-01T09:00:00Z',
    expires_at: '2024-01-01T11:00:00Z',
    is_active: true,
    is_window_based: false,
    window_closed_detected: false,
    ip_address: '192.168.1.2',
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Safari/537.36',
    reason: 'Technical issue resolution',
    activity_count: 8,
    status: 'active',
    created_at: '2024-01-01T09:00:00Z',
    updated_at: '2024-01-01T10:45:00Z',
  };

  const mockClosedWindowSession: ActiveSession = {
    ...mockWindowBasedSession,
    id: 'session-3',
    session_id: 'sess-345-678',
    admin_user_id: 'admin-789',
    target_user_id: 'user-012',
    ip_address: '192.168.1.3',
    user_agent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Firefox/91.0',
    activity_count: 3,
    window_closed_detected: true,
    status: 'active',
  };

  const defaultProps = {
    sessions: [mockWindowBasedSession, mockRedirectBasedSession, mockClosedWindowSession],
    onTerminateSession: vi.fn(),
    isLoading: false,
    terminatingSessionId: undefined,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders enhanced active sessions table with new columns', () => {
    render(<ActiveSessionsTable {...defaultProps} />);
    
    expect(screen.getByTestId('table')).toBeInTheDocument();
    expect(screen.getByText('نوع جلسه')).toBeInTheDocument();
    expect(screen.getByText('فعالیت')).toBeInTheDocument();
  });

  it('displays window-based session badge correctly', () => {
    render(<ActiveSessionsTable {...defaultProps} />);
    
    const badges = screen.getAllByTestId('badge');
    const windowBasedBadge = badges.find(badge => 
      badge.textContent?.includes('پنجره جدید')
    );
    
    expect(windowBasedBadge).toBeInTheDocument();
    expect(windowBasedBadge).toHaveAttribute('data-variant', 'gradient-blue');
  });

  it('displays redirect-based session badge correctly', () => {
    render(<ActiveSessionsTable {...defaultProps} />);
    
    const badges = screen.getAllByTestId('badge');
    const redirectBadge = badges.find(badge => 
      badge.textContent?.includes('تغییر مسیر')
    );
    
    expect(redirectBadge).toBeInTheDocument();
    expect(redirectBadge).toHaveAttribute('data-variant', 'secondary');
  });

  it('shows window closed detection status', () => {
    render(<ActiveSessionsTable {...defaultProps} />);
    
    const badges = screen.getAllByTestId('badge');
    const closedWindowBadge = badges.find(badge => 
      badge.textContent?.includes('پنجره بسته شده')
    );
    
    expect(closedWindowBadge).toBeInTheDocument();
    expect(closedWindowBadge).toHaveAttribute('data-variant', 'warning');
  });

  it('displays activity information correctly', () => {
    render(<ActiveSessionsTable {...defaultProps} />);
    
    expect(screen.getByText('15 فعالیت')).toBeInTheDocument();
    expect(screen.getByText('8 فعالیت')).toBeInTheDocument();
    expect(screen.getByText('3 فعالیت')).toBeInTheDocument();
  });

  it('shows last activity time', () => {
    render(<ActiveSessionsTable {...defaultProps} />);
    
    const lastActivityElements = screen.getAllByText(/آخرین:/);
    expect(lastActivityElements.length).toBeGreaterThan(0);
  });

  it('disables terminate button for closed window sessions', () => {
    render(<ActiveSessionsTable {...defaultProps} />);
    
    const buttons = screen.getAllByTestId('button');
    const closedWindowButton = buttons.find(button => 
      button.textContent?.includes('پنجره بسته شده')
    );
    
    expect(closedWindowButton).toBeDisabled();
  });

  it('calls onTerminateSession when terminate button is clicked', async () => {
    render(<ActiveSessionsTable {...defaultProps} />);
    
    const buttons = screen.getAllByTestId('button');
    const terminateButton = buttons.find(button => 
      button.textContent?.includes('خاتمه جلسه') && !button.disabled
    );
    
    if (terminateButton) {
      fireEvent.click(terminateButton);
      
      await waitFor(() => {
        expect(defaultProps.onTerminateSession).toHaveBeenCalled();
      });
    }
  });

  it('shows loading state correctly', () => {
    render(<ActiveSessionsTable {...defaultProps} isLoading={true} />);
    
    expect(screen.getByText('در حال بارگذاری جلسات...')).toBeInTheDocument();
  });

  it('shows empty state when no sessions', () => {
    render(<ActiveSessionsTable {...defaultProps} sessions={[]} />);
    
    expect(screen.getByText('هیچ جلسه فعالی وجود ندارد')).toBeInTheDocument();
  });

  it('shows terminating state for specific session', () => {
    render(<ActiveSessionsTable {...defaultProps} terminatingSessionId="sess-123-456" />);
    
    expect(screen.getByText('در حال خاتمه...')).toBeInTheDocument();
  });

  it('detects browser information correctly', () => {
    render(<ActiveSessionsTable {...defaultProps} />);
    
    expect(screen.getByText('Chrome')).toBeInTheDocument();
    expect(screen.getByText('Safari')).toBeInTheDocument();
    expect(screen.getByText('Firefox')).toBeInTheDocument();
  });

  it('displays session count in header', () => {
    render(<ActiveSessionsTable {...defaultProps} />);
    
    expect(screen.getByText('3 جلسه')).toBeInTheDocument();
  });

  it('shows truncated session IDs', () => {
    render(<ActiveSessionsTable {...defaultProps} />);
    
    expect(screen.getByText('sess-123...')).toBeInTheDocument();
    expect(screen.getByText('sess-789...')).toBeInTheDocument();
  });

  it('displays IP addresses correctly', () => {
    render(<ActiveSessionsTable {...defaultProps} />);
    
    expect(screen.getByText('192.168.1.1')).toBeInTheDocument();
    expect(screen.getByText('192.168.1.2')).toBeInTheDocument();
    expect(screen.getByText('192.168.1.3')).toBeInTheDocument();
  });

  it('handles sessions without activity data gracefully', () => {
    const sessionWithoutActivity = {
      ...mockWindowBasedSession,
      activity_count: undefined,
      last_activity_at: undefined,
    };
    
    render(<ActiveSessionsTable {...defaultProps} sessions={[sessionWithoutActivity]} />);
    
    // Should not crash and should render the session
    expect(screen.getByTestId('table')).toBeInTheDocument();
  });

  it('shows active status badge with activity icon', () => {
    render(<ActiveSessionsTable {...defaultProps} />);
    
    const badges = screen.getAllByTestId('badge');
    const activeBadge = badges.find(badge => 
      badge.textContent?.includes('فعال') && !badge.textContent?.includes('پنجره')
    );
    
    expect(activeBadge).toBeInTheDocument();
    expect(activeBadge).toHaveAttribute('data-variant', 'success');
  });
});