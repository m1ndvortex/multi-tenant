/**
 * Tests for TenantFullEditDialog Component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import TenantFullEditDialog from '../TenantFullEditDialog';
import { Tenant } from '@/types/tenant';

// Mock the hooks
vi.mock('@/hooks/useEnhancedTenants', () => ({
  useFullTenantUpdate: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useEnhancedTenantDetails: () => ({
    data: {
      id: 'test-tenant-id',
      name: 'Test Tenant',
      email: 'test@example.com',
      phone: '09123456789',
      address: 'Test Address',
      business_type: 'Test Business',
      currency: 'IRR',
      timezone: 'Asia/Tehran',
      max_users: 5,
      max_products: -1,
      max_customers: -1,
      max_monthly_invoices: -1,
      owner_email: 'owner@example.com',
      owner_name: 'Test Owner',
      current_usage: {
        users: 2,
        products: 10,
        customers: 5,
        monthly_invoices: 3,
      },
      subscription_starts_at: '2024-01-01T00:00:00Z',
      subscription_expires_at: '2024-12-31T23:59:59Z',
      is_subscription_active: true,
      days_until_expiry: 300,
      total_audit_entries: 5,
      notes: 'Test notes',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    isLoading: false,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockTenant: Tenant = {
  id: 'test-tenant-id',
  name: 'Test Tenant',
  email: 'test@example.com',
  subscription_type: 'pro',
  status: 'active',
  is_active: true,
  domain: 'test.com',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('TenantFullEditDialog', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog when open', () => {
    renderWithQueryClient(
      <TenantFullEditDialog
        tenant={mockTenant}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('ویرایش جامع تنانت: Test Tenant')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    renderWithQueryClient(
      <TenantFullEditDialog
        tenant={mockTenant}
        isOpen={false}
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByText('ویرایش جامع تنانت: Test Tenant')).not.toBeInTheDocument();
  });

  it('displays current tenant information', () => {
    renderWithQueryClient(
      <TenantFullEditDialog
        tenant={mockTenant}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByDisplayValue('Test Tenant')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test.com')).toBeInTheDocument();
  });

  it('shows all tabs', () => {
    renderWithQueryClient(
      <TenantFullEditDialog
        tenant={mockTenant}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('اطلاعات پایه')).toBeInTheDocument();
    expect(screen.getByText('اشتراک')).toBeInTheDocument();
    expect(screen.getByText('محدودیت‌ها')).toBeInTheDocument();
    expect(screen.getByText('یادداشت‌ها')).toBeInTheDocument();
  });

  it('switches between tabs', async () => {
    renderWithQueryClient(
      <TenantFullEditDialog
        tenant={mockTenant}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    // Click on subscription tab
    fireEvent.click(screen.getByText('اشتراک'));
    
    await waitFor(() => {
      expect(screen.getByText('مدیریت اشتراک')).toBeInTheDocument();
    });

    // Click on limits tab
    fireEvent.click(screen.getByText('محدودیت‌ها'));
    
    await waitFor(() => {
      expect(screen.getByText('محدودیت‌های سیستم')).toBeInTheDocument();
    });
  });

  it('displays subscription information', async () => {
    renderWithQueryClient(
      <TenantFullEditDialog
        tenant={mockTenant}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    // Switch to subscription tab
    fireEvent.click(screen.getByText('اشتراک'));

    await waitFor(() => {
      expect(screen.getByText('اطلاعات اشتراک فعلی')).toBeInTheDocument();
      expect(screen.getByText('300')).toBeInTheDocument(); // Days until expiry
    });
  });

  it('displays usage statistics', async () => {
    renderWithQueryClient(
      <TenantFullEditDialog
        tenant={mockTenant}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    // Switch to limits tab
    fireEvent.click(screen.getByText('محدودیت‌ها'));

    await waitFor(() => {
      expect(screen.getByText('آمار استفاده فعلی')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // Current users
      expect(screen.getByText('10')).toBeInTheDocument(); // Current products
    });
  });

  it('requires admin reason for submission', async () => {
    renderWithQueryClient(
      <TenantFullEditDialog
        tenant={mockTenant}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    // Switch to notes tab
    fireEvent.click(screen.getByText('یادداشت‌ها'));

    await waitFor(() => {
      const submitButton = screen.getByText('اعمال تغییرات');
      expect(submitButton).toBeDisabled();
    });

    // Add admin reason
    const reasonInput = screen.getByPlaceholderText('دلیل انجام این تغییرات را بنویسید...');
    fireEvent.change(reasonInput, { target: { value: 'Test reason' } });

    await waitFor(() => {
      const submitButton = screen.getByText('اعمال تغییرات');
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('updates form fields correctly', async () => {
    renderWithQueryClient(
      <TenantFullEditDialog
        tenant={mockTenant}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const nameInput = screen.getByDisplayValue('Test Tenant');
    fireEvent.change(nameInput, { target: { value: 'Updated Tenant Name' } });

    expect(screen.getByDisplayValue('Updated Tenant Name')).toBeInTheDocument();
  });

  it('shows subscription duration field for pro subscriptions', async () => {
    renderWithQueryClient(
      <TenantFullEditDialog
        tenant={mockTenant}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    // Switch to subscription tab
    fireEvent.click(screen.getByText('اشتراک'));

    await waitFor(() => {
      expect(screen.getByText('مدت اشتراک (ماه)')).toBeInTheDocument();
    });
  });

  it('displays audit information', async () => {
    renderWithQueryClient(
      <TenantFullEditDialog
        tenant={mockTenant}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    // Switch to notes tab
    fireEvent.click(screen.getByText('یادداشت‌ها'));

    await waitFor(() => {
      expect(screen.getByText('اطلاعات حسابرسی')).toBeInTheDocument();
      expect(screen.getByText('تعداد کل تغییرات: 5')).toBeInTheDocument();
    });
  });

  it('calls onClose when cancel button is clicked', async () => {
    renderWithQueryClient(
      <TenantFullEditDialog
        tenant={mockTenant}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const cancelButton = screen.getByText('انصراف');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('handles null tenant gracefully', () => {
    renderWithQueryClient(
      <TenantFullEditDialog
        tenant={null}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByText(/ویرایش جامع تنانت/)).not.toBeInTheDocument();
  });

  it('validates numeric inputs', async () => {
    renderWithQueryClient(
      <TenantFullEditDialog
        tenant={mockTenant}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    // Switch to limits tab
    fireEvent.click(screen.getByText('محدودیت‌ها'));

    await waitFor(() => {
      const maxUsersInput = screen.getByDisplayValue('5');
      fireEvent.change(maxUsersInput, { target: { value: '10' } });
      expect(screen.getByDisplayValue('10')).toBeInTheDocument();
    });
  });
});