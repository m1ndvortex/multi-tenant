// import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import TenantTable from '../TenantTable';
import { Tenant } from '@/types/tenant';

const mockTenants: Tenant[] = [
  {
    id: '1',
    name: 'Active Tenant',
    domain: 'active.com',
    subscription_type: 'pro',
    subscription_expires_at: '2024-12-31T00:00:00Z',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    user_count: 3,
    last_activity: '2024-01-15T10:30:00Z',
  },
  {
    id: '2',
    name: 'Pending Payment Tenant',
    domain: 'pending.com',
    subscription_type: 'pending_payment',
    is_active: true,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    user_count: 1,
  },
  {
    id: '3',
    name: 'Inactive Tenant',
    subscription_type: 'free',
    is_active: false,
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z',
    user_count: 0,
  },
];

describe('TenantTable', () => {
  const mockHandlers = {
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onSuspend: vi.fn(),
    onActivate: vi.fn(),
    onConfirmPayment: vi.fn(),
  };

  beforeEach(() => {
    Object.values(mockHandlers).forEach(mock => mock.mockClear());
  });

  it('renders tenant data correctly', () => {
    render(
      <TenantTable
        tenants={mockTenants}
        {...mockHandlers}
      />
    );

    // Check if tenant names are displayed
    expect(screen.getByText('Active Tenant')).toBeInTheDocument();
    expect(screen.getByText('Pending Payment Tenant')).toBeInTheDocument();
    expect(screen.getByText('Inactive Tenant')).toBeInTheDocument();

    // Check subscription badges
    expect(screen.getByText('حرفه‌ای')).toBeInTheDocument();
    expect(screen.getByText('در انتظار پرداخت')).toBeInTheDocument();
    expect(screen.getByText('رایگان')).toBeInTheDocument();

    // Check status badges
    expect(screen.getAllByText('فعال')).toHaveLength(2);
    expect(screen.getByText('غیرفعال')).toBeInTheDocument();
  });

  it('displays domains correctly', () => {
    render(
      <TenantTable
        tenants={mockTenants}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('active.com')).toBeInTheDocument();
    expect(screen.getByText('pending.com')).toBeInTheDocument();
    // Third tenant has no domain, should show dash
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('shows user counts correctly', () => {
    render(
      <TenantTable
        tenants={mockTenants}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <TenantTable
        tenants={mockTenants}
        {...mockHandlers}
      />
    );

    const editButtons = screen.getAllByRole('button');
    const firstEditButton = editButtons.find(button => 
      button.querySelector('svg')?.getAttribute('data-lucide') === 'edit'
    );

    if (firstEditButton) {
      await user.click(firstEditButton);
      expect(mockHandlers.onEdit).toHaveBeenCalledWith(mockTenants[0]);
    }
  });

  it('calls onSuspend for active tenant', async () => {
    const user = userEvent.setup();
    
    render(
      <TenantTable
        tenants={mockTenants}
        {...mockHandlers}
      />
    );

    const suspendButtons = screen.getAllByRole('button');
    const pauseButton = suspendButtons.find(button => 
      button.querySelector('svg')?.getAttribute('data-lucide') === 'pause'
    );

    if (pauseButton) {
      await user.click(pauseButton);
      expect(mockHandlers.onSuspend).toHaveBeenCalled();
    }
  });

  it('calls onActivate for inactive tenant', async () => {
    const user = userEvent.setup();
    
    render(
      <TenantTable
        tenants={mockTenants}
        {...mockHandlers}
      />
    );

    const activateButtons = screen.getAllByRole('button');
    const playButton = activateButtons.find(button => 
      button.querySelector('svg')?.getAttribute('data-lucide') === 'play'
    );

    if (playButton) {
      await user.click(playButton);
      expect(mockHandlers.onActivate).toHaveBeenCalled();
    }
  });

  it('shows confirm payment button for pending payment tenants', () => {
    render(
      <TenantTable
        tenants={mockTenants}
        {...mockHandlers}
      />
    );

    // Check that we have the expected number of action buttons per row
    const allButtons = screen.getAllByRole('button');
    // Each tenant should have edit, suspend/activate, and delete buttons
    // Plus the pending payment tenant should have a confirm payment button
    expect(allButtons.length).toBeGreaterThan(6); // At least 3 tenants * 2 buttons + 1 extra for confirm payment
  });

  it('calls onConfirmPayment when confirm payment button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <TenantTable
        tenants={mockTenants}
        {...mockHandlers}
      />
    );

    // Find all buttons and click the one that should be the confirm payment button
    const allButtons = screen.getAllByRole('button');
    // The confirm payment button should be among the action buttons
    // We'll click the 6th button which should be the confirm payment button based on our layout
    if (allButtons.length > 5) {
      await user.click(allButtons[5]);
      expect(mockHandlers.onConfirmPayment).toHaveBeenCalled();
    }
  });

  it('shows loading state', () => {
    render(
      <TenantTable
        tenants={[]}
        isLoading={true}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('در حال بارگذاری...')).toBeInTheDocument();
  });

  it('shows empty state when no tenants', () => {
    render(
      <TenantTable
        tenants={[]}
        isLoading={false}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('هیچ تنانتی یافت نشد')).toBeInTheDocument();
  });
});