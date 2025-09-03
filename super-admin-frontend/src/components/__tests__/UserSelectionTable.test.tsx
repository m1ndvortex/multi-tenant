import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import UserSelectionTable from '../UserSelectionTable';
import { User } from '@/types/impersonation';

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn(() => '2 hours ago'),
}));

vi.mock('date-fns/locale', () => ({
  faIR: {},
}));

const mockUsers: User[] = [
  {
    id: '1',
    email: 'user1@example.com',
    name: 'User One',
    tenant_id: 'tenant1',
    tenant_name: 'Tenant One',
    role: 'admin',
    is_active: true,
    last_login: '2023-01-01T00:00:00Z',
    created_at: '2023-01-01T00:00:00Z',
  },
  {
    id: '2',
    email: 'user2@example.com',
    name: 'User Two',
    tenant_id: 'tenant2',
    tenant_name: 'Tenant Two',
    role: 'user',
    is_active: false,
    last_login: '2023-01-02T00:00:00Z',
    created_at: '2023-01-02T00:00:00Z',
  },
];

describe('UserSelectionTable', () => {
  const mockOnImpersonate = vi.fn();

  beforeEach(() => {
    mockOnImpersonate.mockClear();
  });

  it('renders user table with correct data', () => {
    render(
      <UserSelectionTable
        users={mockUsers}
        onImpersonate={mockOnImpersonate}
        isLoading={false}
      />
    );

    expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    expect(screen.getByText('User One')).toBeInTheDocument();
    expect(screen.getByText('Tenant One')).toBeInTheDocument();
    expect(screen.getByText('user2@example.com')).toBeInTheDocument();
    expect(screen.getByText('User Two')).toBeInTheDocument();
    expect(screen.getByText('Tenant Two')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <UserSelectionTable
        users={[]}
        onImpersonate={mockOnImpersonate}
        isLoading={true}
      />
    );

    expect(screen.getByText('در حال بارگذاری کاربران...')).toBeInTheDocument();
  });

  it('shows empty state when no users', () => {
    render(
      <UserSelectionTable
        users={[]}
        onImpersonate={mockOnImpersonate}
        isLoading={false}
      />
    );

    expect(screen.getByText('هیچ کاربری یافت نشد')).toBeInTheDocument();
  });

  it('calls onImpersonate when impersonate button is clicked', () => {
    render(
      <UserSelectionTable
        users={mockUsers}
        onImpersonate={mockOnImpersonate}
        isLoading={false}
      />
    );

    const impersonateButtons = screen.getAllByText('جانشینی');
    fireEvent.click(impersonateButtons[0]);

    expect(mockOnImpersonate).toHaveBeenCalledWith(mockUsers[0]);
  });

  it('disables impersonate button for inactive users', () => {
    render(
      <UserSelectionTable
        users={mockUsers}
        onImpersonate={mockOnImpersonate}
        isLoading={false}
      />
    );

    const impersonateButtons = screen.getAllByRole('button', { name: /جانشینی/ });
    expect(impersonateButtons[1]).toBeDisabled();
  });

  it('shows correct role badges', () => {
    render(
      <UserSelectionTable
        users={mockUsers}
        onImpersonate={mockOnImpersonate}
        isLoading={false}
      />
    );

    expect(screen.getByText('مدیر')).toBeInTheDocument();
    expect(screen.getByText('کاربر')).toBeInTheDocument();
  });

  it('shows correct status badges', () => {
    render(
      <UserSelectionTable
        users={mockUsers}
        onImpersonate={mockOnImpersonate}
        isLoading={false}
      />
    );

    expect(screen.getByText('فعال')).toBeInTheDocument();
    expect(screen.getByText('غیرفعال')).toBeInTheDocument();
  });

  it('shows impersonating state for current user', () => {
    render(
      <UserSelectionTable
        users={mockUsers}
        onImpersonate={mockOnImpersonate}
        isLoading={false}
        impersonatingUserId="1"
      />
    );

    expect(screen.getByText('در حال جانشینی')).toBeInTheDocument();
  });
});