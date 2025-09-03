import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import TenantForm from '../TenantForm';
import { Tenant } from '@/types/tenant';

const mockTenant: Tenant = {
  id: '1',
  name: 'Test Tenant',
  domain: 'test.com',
  subscription_type: 'pro',
  subscription_expires_at: '2024-12-31T00:00:00Z',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('TenantForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
    mockOnCancel.mockClear();
  });

  it('renders create form correctly', () => {
    render(
      <TenantForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('ایجاد تنانت جدید')).toBeInTheDocument();
    expect(screen.getByLabelText('نام تنانت *')).toBeInTheDocument();
    expect(screen.getByLabelText('دامنه (اختیاری)')).toBeInTheDocument();
    expect(screen.getByText('نوع اشتراک')).toBeInTheDocument();
    expect(screen.getByText('وضعیت')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ایجاد' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'انصراف' })).toBeInTheDocument();
  });

  it('renders edit form correctly with tenant data', () => {
    render(
      <TenantForm
        tenant={mockTenant}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('ویرایش تنانت')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Tenant')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'به‌روزرسانی' })).toBeInTheDocument();
  });

  it('shows subscription expiry date field when Pro is selected', () => {
    // Test with a tenant that has Pro subscription
    const proTenant: Tenant = {
      ...mockTenant,
      subscription_type: 'pro',
    };
    
    render(
      <TenantForm
        tenant={proTenant}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Expiry date field should be visible for Pro subscription
    expect(screen.getByLabelText('تاریخ انقضای اشتراک')).toBeInTheDocument();
  });

  it('submits form with correct data', async () => {
    const user = userEvent.setup();
    
    render(
      <TenantForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Fill form
    await user.type(screen.getByLabelText('نام تنانت *'), 'New Tenant');
    await user.type(screen.getByLabelText('دامنه (اختیاری)'), 'new.com');

    // Submit form
    await user.click(screen.getByRole('button', { name: 'ایجاد' }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'New Tenant',
        domain: 'new.com',
        subscription_type: 'free',
        subscription_expires_at: '',
        is_active: true,
      });
    });
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <TenantForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    await user.click(screen.getByRole('button', { name: 'انصراف' }));

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('disables submit button when name is empty', () => {
    render(
      <TenantForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const submitButton = screen.getByRole('button', { name: 'ایجاد' });
    expect(submitButton).toBeDisabled();
  });

  it('shows loading state correctly', () => {
    render(
      <TenantForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={true}
      />
    );

    expect(screen.getByText('در حال پردازش...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'در حال پردازش...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'انصراف' })).toBeDisabled();
  });
});