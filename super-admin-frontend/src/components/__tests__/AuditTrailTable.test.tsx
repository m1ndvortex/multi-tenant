import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import AuditTrailTable from '../AuditTrailTable';
import { AuditLogEntry } from '@/types/impersonation';

// Mock date-fns
vi.mock('date-fns', () => ({
  format: vi.fn(() => '2023/01/01 12:00:00'),
}));

vi.mock('date-fns/locale', () => ({
  faIR: {},
}));

const mockAuditLogs: AuditLogEntry[] = [
  {
    id: '1',
    action: 'impersonation_started',
    status: 'success',
    admin_user_id: 'admin1',
    target_user_id: 'user1',
    session_id: 'session1',
    ip_address: '192.168.1.1',
    reason: 'Customer support',
    created_at: '2023-01-01T12:00:00Z',
    details: {
      reason: 'Customer support',
      duration_hours: 2,
    },
  },
  {
    id: '2',
    action: 'impersonation_failed',
    status: 'failed',
    admin_user_id: 'admin2',
    target_user_id: 'user2',
    session_id: null,
    ip_address: '192.168.1.2',
    reason: null,
    created_at: '2023-01-01T13:00:00Z',
    details: {
      error_message: 'User not found',
    },
  },
];

describe('AuditTrailTable', () => {
  it('renders audit trail table with correct data', () => {
    render(
      <AuditTrailTable
        auditLogs={mockAuditLogs}
        isLoading={false}
      />
    );

    expect(screen.getByText('سابقه عملیات جانشینی')).toBeInTheDocument();
    expect(screen.getByText('2 رکورد')).toBeInTheDocument();
    expect(screen.getByText('شروع جانشینی')).toBeInTheDocument();
    expect(screen.getByText('شکست جانشینی')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <AuditTrailTable
        auditLogs={[]}
        isLoading={true}
      />
    );

    expect(screen.getByText('در حال بارگذاری سابقه...')).toBeInTheDocument();
  });

  it('shows empty state when no logs', () => {
    render(
      <AuditTrailTable
        auditLogs={[]}
        isLoading={false}
      />
    );

    expect(screen.getByText('هیچ رکوردی در سابقه وجود ندارد')).toBeInTheDocument();
  });

  it('shows correct action badges', () => {
    render(
      <AuditTrailTable
        auditLogs={mockAuditLogs}
        isLoading={false}
      />
    );

    expect(screen.getByText('شروع جانشینی')).toBeInTheDocument();
    expect(screen.getByText('شکست جانشینی')).toBeInTheDocument();
  });

  it('shows correct status badges', () => {
    render(
      <AuditTrailTable
        auditLogs={mockAuditLogs}
        isLoading={false}
      />
    );

    expect(screen.getByText('موفق')).toBeInTheDocument();
    expect(screen.getByText('ناموفق')).toBeInTheDocument();
  });

  it('displays formatted dates', () => {
    render(
      <AuditTrailTable
        auditLogs={mockAuditLogs}
        isLoading={false}
      />
    );

    expect(screen.getAllByText('2023/01/01 12:00:00')).toHaveLength(2);
  });

  it('displays IP addresses', () => {
    render(
      <AuditTrailTable
        auditLogs={mockAuditLogs}
        isLoading={false}
      />
    );

    expect(screen.getByText('192.168.1.1')).toBeInTheDocument();
    expect(screen.getByText('192.168.1.2')).toBeInTheDocument();
  });

  it('truncates long user IDs', () => {
    render(
      <AuditTrailTable
        auditLogs={mockAuditLogs}
        isLoading={false}
      />
    );

    expect(screen.getAllByText(/admin[12]\.\.\.$/)).toHaveLength(2);
    expect(screen.getAllByText(/user[12]\.\.\.$/)).toHaveLength(2);
  });

  it('shows details correctly', () => {
    render(
      <AuditTrailTable
        auditLogs={mockAuditLogs}
        isLoading={false}
      />
    );

    expect(screen.getAllByText(/دلیل: Customer support/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/مدت \(ساعت\): 2/)).toBeInTheDocument();
    expect(screen.getByText(/پیام خطا: User not found/)).toBeInTheDocument();
  });

  it('handles missing optional fields', () => {
    const logsWithMissingFields: AuditLogEntry[] = [
      {
        id: '3',
        action: 'impersonation_ended',
        status: 'success',
        admin_user_id: 'admin3',
        target_user_id: undefined,
        session_id: undefined,
        ip_address: undefined,
        reason: undefined,
        created_at: '2023-01-01T14:00:00Z',
        details: {},
      },
    ];

    render(
      <AuditTrailTable
        auditLogs={logsWithMissingFields}
        isLoading={false}
      />
    );

    expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(3); // target user, session id, ip address, details
  });
});