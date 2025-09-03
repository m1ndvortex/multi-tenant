import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import ImpersonationStartDialog from '../ImpersonationStartDialog';
import { User } from '@/types/impersonation';

const mockUser: User = {
  id: '1',
  email: 'user@example.com',
  name: 'Test User',
  tenant_id: 'tenant1',
  tenant_name: 'Test Tenant',
  role: 'admin',
  is_active: true,
  last_login: '2023-01-01T00:00:00Z',
  created_at: '2023-01-01T00:00:00Z',
};

describe('ImpersonationStartDialog', () => {
  const mockOnClose = vi.fn();
  const mockOnConfirm = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnConfirm.mockClear();
  });

  it('renders dialog when open', () => {
    render(
      <ImpersonationStartDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        user={mockUser}
        isLoading={false}
      />
    );

    expect(screen.getByText('شروع جانشینی کاربر')).toBeInTheDocument();
    expect(screen.getByText('user@example.com')).toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('Test Tenant')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <ImpersonationStartDialog
        isOpen={false}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        user={mockUser}
        isLoading={false}
      />
    );

    expect(screen.queryByText('شروع جانشینی کاربر')).not.toBeInTheDocument();
  });

  it('calls onClose when cancel button is clicked', () => {
    render(
      <ImpersonationStartDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        user={mockUser}
        isLoading={false}
      />
    );

    fireEvent.click(screen.getByText('انصراف'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onConfirm with correct data when confirm button is clicked', async () => {
    render(
      <ImpersonationStartDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        user={mockUser}
        isLoading={false}
      />
    );

    // Fill in reason
    const reasonTextarea = screen.getByPlaceholderText(/دلیل جانشینی را وارد کنید/);
    fireEvent.change(reasonTextarea, { target: { value: 'پشتیبانی مشتری' } });

    // Click confirm
    fireEvent.click(screen.getByText('شروع جانشینی'));

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith({
        target_user_id: '1',
        duration_hours: 2,
        reason: 'پشتیبانی مشتری',
      });
    });
  });

  it('shows loading state', () => {
    render(
      <ImpersonationStartDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        user={mockUser}
        isLoading={true}
      />
    );

    expect(screen.getByText('در حال شروع...')).toBeInTheDocument();
    expect(screen.getByText('انصراف')).toBeDisabled();
  });

  it('allows changing duration', async () => {
    render(
      <ImpersonationStartDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        user={mockUser}
        isLoading={false}
      />
    );

    // Change duration to 4 hours
    const durationSelect = screen.getByRole('combobox');
    fireEvent.click(durationSelect);
    fireEvent.click(screen.getByText('4 ساعت'));

    // Click confirm
    fireEvent.click(screen.getByText('شروع جانشینی'));

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith({
        target_user_id: '1',
        duration_hours: 4,
        reason: undefined,
      });
    });
  });

  it('shows security warning', () => {
    render(
      <ImpersonationStartDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        user={mockUser}
        isLoading={false}
      />
    );

    expect(screen.getByText('هشدار امنیتی')).toBeInTheDocument();
    expect(screen.getByText(/تمام اقدامات شما در طول جانشینی ثبت و نظارت خواهد شد/)).toBeInTheDocument();
  });

  it('shows character count for reason field', () => {
    render(
      <ImpersonationStartDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        user={mockUser}
        isLoading={false}
      />
    );

    const reasonTextarea = screen.getByPlaceholderText(/دلیل جانشینی را وارد کنید/);
    fireEvent.change(reasonTextarea, { target: { value: 'test reason' } });

    expect(screen.getByText('11/500 کاراکتر')).toBeInTheDocument();
  });
});