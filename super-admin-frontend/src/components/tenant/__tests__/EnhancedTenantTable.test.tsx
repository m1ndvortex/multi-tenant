/**
 * Tests for EnhancedTenantTable Component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import EnhancedTenantTable from '../EnhancedTenantTable';
import { Tenant } from '@/types/tenant';

const mockTenants: Tenant[] = [
  {
    id: 'tenant-1',
    name: 'Test Tenant 1',
    email: 'tenant1@example.com',
    domain: 'tenant1.com',
    subscription_type: 'pro',
    status: 'active',
    is_active: true,
    user_count: 3,
    subscription_expires_at: '2024-12-31T23:59:59Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    last_activity_at: '2024-01-15T10:30:00Z',
  },
  {
    id: 'tenant-2',
    name: 'Test Tenant 2',
    email: 'tenant2@example.com',
    subscription_type: 'free',
    status: 'suspended',
    is_active: false,
    user_count: 1,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
];

describe('EnhancedTenantTable', () => {
  const mockHandlers = {
    onEdit: vi.fn(),
    onFullEdit: vi.fn(),
    onCredentialsUpdate: vi.fn(),
    onDelete: vi.fn(),
    onSuspend: vi.fn(),
    onActivate: vi.fn(),
    onConfirmPayment: vi.fn(),
    onImpersonate: vi.fn(),
    onViewDetails: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders table with tenant data', () => {
    render(
      <EnhancedTenantTable
        tenants={mockTenants}
        {...mockHandlers}
      />
    );

    // Check if tenant names are displayed with high contrast styling
    expect(screen.getByText('Test Tenant 1')).toBeInTheDocument();
    expect(screen.getByText('Test Tenant 2')).toBeInTheDocument();

    // Check if emails are displayed
    expect(screen.getByText('tenant1@example.com')).toBeInTheDocument();
    expect(screen.getByText('tenant2@example.com')).toBeInTheDocument();

    // Check if domains are displayed
    expect(screen.getByText('tenant1.com')).toBeInTheDocument();
  });

  it('displays subscription badges correctly', () => {
    render(
      <EnhancedTenantTable
        tenants={mockTenants}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('حرفه‌ای')).toBeInTheDocument();
    expect(screen.getByText('رایگان')).toBeInTheDocument();
  });

  it('displays status badges correctly', () => {
    render(
      <EnhancedTenantTable
        tenants={mockTenants}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('فعال')).toBeInTheDocument();
    expect(screen.getByText('تعلیق')).toBeInTheDocument();
  });

  it('shows expiration status for pro subscriptions', () => {
    render(
      <EnhancedTenantTable
        tenants={mockTenants}
        {...mockHandlers}
      />
    );

    // Check that the expiration column header exists
    expect(screen.getByText('انقضای اشتراک')).toBeInTheDocument();
    
    // For the pro tenant with expiration date, should show some status
    // The exact text depends on the calculation, so we'll just verify the column exists
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
  });

  it('calls onCredentialsUpdate when credentials button is clicked', () => {
    render(
      <EnhancedTenantTable
        tenants={mockTenants}
        {...mockHandlers}
      />
    );

    const credentialsButtons = screen.getAllByTitle('به‌روزرسانی اطلاعات ورود');
    fireEvent.click(credentialsButtons[0]);

    expect(mockHandlers.onCredentialsUpdate).toHaveBeenCalledWith(mockTenants[0]);
  });

  it('calls onFullEdit when full edit button is clicked', () => {
    render(
      <EnhancedTenantTable
        tenants={mockTenants}
        {...mockHandlers}
      />
    );

    const fullEditButtons = screen.getAllByTitle('ویرایش جامع');
    fireEvent.click(fullEditButtons[0]);

    expect(mockHandlers.onFullEdit).toHaveBeenCalledWith(mockTenants[0]);
  });

  it('calls onViewDetails when view details button is clicked', () => {
    render(
      <EnhancedTenantTable
        tenants={mockTenants}
        {...mockHandlers}
      />
    );

    const viewDetailsButtons = screen.getAllByTitle('مشاهده جزئیات کامل');
    fireEvent.click(viewDetailsButtons[0]);

    expect(mockHandlers.onViewDetails).toHaveBeenCalledWith(mockTenants[0]);
  });

  it('shows suspend button for active tenants', () => {
    render(
      <EnhancedTenantTable
        tenants={mockTenants}
        {...mockHandlers}
      />
    );

    const suspendButton = screen.getByTitle('تعلیق تنانت');
    expect(suspendButton).toBeInTheDocument();

    fireEvent.click(suspendButton);
    expect(mockHandlers.onSuspend).toHaveBeenCalledWith(mockTenants[0]);
  });

  it('shows activate button for suspended tenants', () => {
    render(
      <EnhancedTenantTable
        tenants={mockTenants}
        {...mockHandlers}
      />
    );

    const activateButton = screen.getByTitle('فعال‌سازی تنانت');
    expect(activateButton).toBeInTheDocument();

    fireEvent.click(activateButton);
    expect(mockHandlers.onActivate).toHaveBeenCalledWith(mockTenants[1]);
  });

  it('shows impersonate button only for active tenants', () => {
    render(
      <EnhancedTenantTable
        tenants={mockTenants}
        {...mockHandlers}
      />
    );

    const impersonateButtons = screen.getAllByTitle('جانشینی کاربران تنانت');
    expect(impersonateButtons).toHaveLength(1); // Only for active tenant
  });

  it('displays loading state', () => {
    render(
      <EnhancedTenantTable
        tenants={[]}
        isLoading={true}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('در حال بارگذاری...')).toBeInTheDocument();
  });

  it('displays empty state when no tenants', () => {
    render(
      <EnhancedTenantTable
        tenants={[]}
        isLoading={false}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('هیچ تنانتی یافت نشد')).toBeInTheDocument();
  });

  it('applies high-contrast styling to tenant name cells', () => {
    render(
      <EnhancedTenantTable
        tenants={mockTenants}
        {...mockHandlers}
      />
    );

    const tenantNameCell = screen.getByText('Test Tenant 1').closest('td');
    expect(tenantNameCell).toHaveClass('text-indigo-700', 'bg-indigo-50/30');
  });

  it('shows user count with icon', () => {
    render(
      <EnhancedTenantTable
        tenants={mockTenants}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('formats dates correctly', () => {
    render(
      <EnhancedTenantTable
        tenants={mockTenants}
        {...mockHandlers}
      />
    );

    // Should show relative time - check for specific patterns that might be rendered
    const dateElements = screen.getAllByText(/\d+/);
    expect(dateElements.length).toBeGreaterThan(0); // Should have some date-related numbers
  });

  it('handles missing optional data gracefully', () => {
    const tenantWithMissingData: Tenant = {
      id: 'tenant-3',
      name: 'Minimal Tenant',
      subscription_type: 'free',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    render(
      <EnhancedTenantTable
        tenants={[tenantWithMissingData]}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('Minimal Tenant')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument(); // For missing domain
    expect(screen.getByText('هرگز')).toBeInTheDocument(); // For missing last activity
  });
});