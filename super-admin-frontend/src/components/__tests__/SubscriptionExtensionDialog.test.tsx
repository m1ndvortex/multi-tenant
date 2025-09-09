import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import SubscriptionExtensionDialog from '../subscription/SubscriptionExtensionDialog';
import { Tenant } from '@/types/tenant';

// Mock tenant data
const mockTenant: Tenant = {
  id: '1',
  name: 'Test Tenant',
  email: 'test@example.com',
  subscription_type: 'pro',
  status: 'active',
  is_active: true,
  subscription_expires_at: '2024-06-15T00:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

const mockExpiredTenant: Tenant = {
  ...mockTenant,
  subscription_expires_at: '2024-01-01T00:00:00Z' // Past date
};

describe('SubscriptionExtensionDialog', () => {
  const mockOnSubmit = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog when open', () => {
    render(
      <SubscriptionExtensionDialog
        tenant={mockTenant}
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        isLoading={false}
      />
    );

    expect(screen.getByText('تمدید اشتراک')).toBeInTheDocument();
    expect(screen.getByText('Test Tenant')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <SubscriptionExtensionDialog
        tenant={mockTenant}
        isOpen={false}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        isLoading={false}
      />
    );

    expect(screen.queryByText('تمدید اشتراک')).not.toBeInTheDocument();
  });

  it('shows current subscription status', () => {
    render(
      <SubscriptionExtensionDialog
        tenant={mockTenant}
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        isLoading={false}
      />
    );

    expect(screen.getByText('وضعیت فعلی اشتراک')).toBeInTheDocument();
    expect(screen.getByText('حرفه‌ای')).toBeInTheDocument();
  });

  it('allows user to input extension months', async () => {
    const user = userEvent.setup();
    
    render(
      <SubscriptionExtensionDialog
        tenant={mockTenant}
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        isLoading={false}
      />
    );

    const monthsInput = screen.getByLabelText(/تعداد ماه برای تمدید/);
    await user.clear(monthsInput);
    await user.type(monthsInput, '6');

    expect(monthsInput).toHaveValue(6);
  });

  it('allows user to input reason', async () => {
    const user = userEvent.setup();
    
    render(
      <SubscriptionExtensionDialog
        tenant={mockTenant}
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        isLoading={false}
      />
    );

    const reasonTextarea = screen.getByLabelText(/دلیل تمدید/);
    await user.type(reasonTextarea, 'Customer requested extension');

    expect(reasonTextarea).toHaveValue('Customer requested extension');
  });

  it('validates months input', async () => {
    const user = userEvent.setup();
    
    render(
      <SubscriptionExtensionDialog
        tenant={mockTenant}
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        isLoading={false}
      />
    );

    const monthsInput = screen.getByLabelText(/تعداد ماه برای تمدید/);
    const submitButton = screen.getByText('تمدید اشتراک');

    // Test invalid input (0 months)
    await user.clear(monthsInput);
    await user.type(monthsInput, '0');
    await user.click(submitButton);

    expect(screen.getByText('تعداد ماه باید بین 1 تا 36 باشد')).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();

    // Test invalid input (too many months)
    await user.clear(monthsInput);
    await user.type(monthsInput, '50');
    await user.click(submitButton);

    expect(screen.getByText('تعداد ماه باید بین 1 تا 36 باشد')).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('validates reason length', async () => {
    const user = userEvent.setup();
    
    render(
      <SubscriptionExtensionDialog
        tenant={mockTenant}
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        isLoading={false}
      />
    );

    const reasonTextarea = screen.getByLabelText(/دلیل تمدید/);
    const submitButton = screen.getByText('تمدید اشتراک');

    // Test too long reason
    const longReason = 'a'.repeat(501);
    await user.type(reasonTextarea, longReason);
    await user.click(submitButton);

    expect(screen.getByText('دلیل نباید بیش از 500 کاراکتر باشد')).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    
    render(
      <SubscriptionExtensionDialog
        tenant={mockTenant}
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        isLoading={false}
      />
    );

    const monthsInput = screen.getByLabelText(/تعداد ماه برای تمدید/);
    const reasonTextarea = screen.getByLabelText(/دلیل تمدید/);
    const submitButton = screen.getByText('تمدید اشتراک');

    await user.clear(monthsInput);
    await user.type(monthsInput, '12');
    await user.type(reasonTextarea, 'Annual renewal');
    await user.click(submitButton);

    expect(mockOnSubmit).toHaveBeenCalledWith(12, 'Annual renewal');
  });

  it('provides quick selection buttons', async () => {
    const user = userEvent.setup();
    
    render(
      <SubscriptionExtensionDialog
        tenant={mockTenant}
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        isLoading={false}
      />
    );

    const sixMonthButton = screen.getByText('6 ماه');
    await user.click(sixMonthButton);

    const monthsInput = screen.getByLabelText(/تعداد ماه برای تمدید/);
    expect(monthsInput).toHaveValue(6);
  });

  it('shows new expiry date preview', () => {
    render(
      <SubscriptionExtensionDialog
        tenant={mockTenant}
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        isLoading={false}
      />
    );

    expect(screen.getByText('تاریخ انقضای جدید')).toBeInTheDocument();
    expect(screen.getByText('(+1 ماه)')).toBeInTheDocument();
  });

  it('handles expired subscription correctly', () => {
    render(
      <SubscriptionExtensionDialog
        tenant={mockExpiredTenant}
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        isLoading={false}
      />
    );

    // Should show expired status
    expect(screen.getByText(/منقضی شده/)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <SubscriptionExtensionDialog
        tenant={mockTenant}
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        isLoading={true}
      />
    );

    expect(screen.getByText('در حال تمدید...')).toBeInTheDocument();
    
    const submitButton = screen.getByText('در حال تمدید...');
    expect(submitButton).toBeDisabled();
  });

  it('calls onClose when cancel button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <SubscriptionExtensionDialog
        tenant={mockTenant}
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        isLoading={false}
      />
    );

    const cancelButton = screen.getByText('انصراف');
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('resets form when dialog closes', async () => {
    const user = userEvent.setup();
    
    const { rerender } = render(
      <SubscriptionExtensionDialog
        tenant={mockTenant}
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        isLoading={false}
      />
    );

    // Fill form
    const monthsInput = screen.getByLabelText(/تعداد ماه برای تمدید/);
    const reasonTextarea = screen.getByLabelText(/دلیل تمدید/);
    
    await user.clear(monthsInput);
    await user.type(monthsInput, '6');
    await user.type(reasonTextarea, 'Test reason');

    // Close dialog
    rerender(
      <SubscriptionExtensionDialog
        tenant={mockTenant}
        isOpen={false}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        isLoading={false}
      />
    );

    // Reopen dialog
    rerender(
      <SubscriptionExtensionDialog
        tenant={mockTenant}
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        isLoading={false}
      />
    );

    // Form should be reset
    const newMonthsInput = screen.getByLabelText(/تعداد ماه برای تمدید/);
    const newReasonTextarea = screen.getByLabelText(/دلیل تمدید/);
    
    expect(newMonthsInput).toHaveValue(1);
    expect(newReasonTextarea).toHaveValue('');
  });

  it('shows character count for reason field', async () => {
    const user = userEvent.setup();
    
    render(
      <SubscriptionExtensionDialog
        tenant={mockTenant}
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        isLoading={false}
      />
    );

    const reasonTextarea = screen.getByLabelText(/دلیل تمدید/);
    
    expect(screen.getByText('0/500 کاراکتر')).toBeInTheDocument();
    
    await user.type(reasonTextarea, 'Test');
    expect(screen.getByText('4/500 کاراکتر')).toBeInTheDocument();
  });
});