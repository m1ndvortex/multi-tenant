import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import ActiveSessionsTable from '../ActiveSessionsTable';
import { ActiveSession } from '@/types/impersonation';

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn(() => '2 hours ago'),
}));

vi.mock('date-fns/locale', () => ({
  faIR: {},
}));

const mockSessions: ActiveSession[] = [
  {
    session_id: 'session1',
    admin_user_id: 'admin1',
    target_user_id: 'user1',
    target_tenant_id: 'tenant1',
    started_at: '2023-01-01T00:00:00Z',
    expires_at: '2023-01-01T02:00:00Z',
    ip_address: '192.168.1.1',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    reason: 'Customer support',
    status: 'active',
  },
  {
    session_id: 'session2',
    admin_user_id: 'admin2',
    target_user_id: 'user2',
    target_tenant_id: 'tenant2',
    started_at: '2023-01-01T01:00:00Z',
    expires_at: '2023-01-01T03:00:00Z',
    ip_address: '192.168.1.2',
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    status: 'expired',
  },
];

describe('ActiveSessionsTable', () => {
  const mockOnTerminateSession = vi.fn();

  beforeEach(() => {
    mockOnTerminateSession.mockClear();
  });

  it('renders sessions table with correct data', () => {
    render(
      <ActiveSessionsTable
        sessions={mockSessions}
        onTerminateSession={mockOnTerminateSession}
        isLoading={false}
      />
    );

    expect(screen.getByText('جلسات فعال جانشینی')).toBeInTheDocument();
    expect(screen.getByText('2 جلسه')).toBeInTheDocument();
    expect(screen.getByText('session1...')).toBeInTheDocument();
    expect(screen.getByText('session2...')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <ActiveSessionsTable
        sessions={[]}
        onTerminateSession={mockOnTerminateSession}
        isLoading={true}
      />
    );

    expect(screen.getByText('در حال بارگذاری جلسات...')).toBeInTheDocument();
  });

  it('shows empty state when no sessions', () => {
    render(
      <ActiveSessionsTable
        sessions={[]}
        onTerminateSession={mockOnTerminateSession}
        isLoading={false}
      />
    );

    expect(screen.getByText('هیچ جلسه فعالی وجود ندارد')).toBeInTheDocument();
  });

  it('calls onTerminateSession when terminate button is clicked', () => {
    render(
      <ActiveSessionsTable
        sessions={mockSessions}
        onTerminateSession={mockOnTerminateSession}
        isLoading={false}
      />
    );

    const terminateButtons = screen.getAllByText('خاتمه جلسه');
    fireEvent.click(terminateButtons[0]);

    expect(mockOnTerminateSession).toHaveBeenCalledWith('session1');
  });

  it('disables terminate button for non-active sessions', () => {
    render(
      <ActiveSessionsTable
        sessions={mockSessions}
        onTerminateSession={mockOnTerminateSession}
        isLoading={false}
      />
    );

    const terminateButtons = screen.getAllByRole('button', { name: /خاتمه جلسه/ });
    expect(terminateButtons[1]).toBeDisabled();
  });

  it('shows correct status badges', () => {
    render(
      <ActiveSessionsTable
        sessions={mockSessions}
        onTerminateSession={mockOnTerminateSession}
        isLoading={false}
      />
    );

    expect(screen.getByText('فعال')).toBeInTheDocument();
    expect(screen.getAllByText('منقضی شده').length).toBeGreaterThanOrEqual(1);
  });

  it('shows terminating state for specific session', () => {
    render(
      <ActiveSessionsTable
        sessions={mockSessions}
        onTerminateSession={mockOnTerminateSession}
        isLoading={false}
        terminatingSessionId="session1"
      />
    );

    expect(screen.getByText('در حال خاتمه...')).toBeInTheDocument();
  });

  it('displays browser information correctly', () => {
    render(
      <ActiveSessionsTable
        sessions={mockSessions}
        onTerminateSession={mockOnTerminateSession}
        isLoading={false}
      />
    );

    expect(screen.getAllByText('Chrome')).toHaveLength(2);
  });

  it('displays IP addresses', () => {
    render(
      <ActiveSessionsTable
        sessions={mockSessions}
        onTerminateSession={mockOnTerminateSession}
        isLoading={false}
      />
    );

    expect(screen.getByText('192.168.1.1')).toBeInTheDocument();
    expect(screen.getByText('192.168.1.2')).toBeInTheDocument();
  });

  it('truncates long IDs correctly', () => {
    render(
      <ActiveSessionsTable
        sessions={mockSessions}
        onTerminateSession={mockOnTerminateSession}
        isLoading={false}
      />
    );

    // Check that session IDs are truncated
    expect(screen.getByText('session1...')).toBeInTheDocument();
    expect(screen.getByText('session2...')).toBeInTheDocument();
  });
});