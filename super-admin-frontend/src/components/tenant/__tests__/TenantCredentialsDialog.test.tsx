/**
 * Tests for TenantCredentialsDialog Component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import TenantCredentialsDialog from '../TenantCredentialsDialog';
import { Tenant } from '@/types/tenant';

// Mock the hooks
vi.mock('@/hooks/useEnhancedTenants', () => ({
  useUpdateTenantCredentials: () => ({
    mutate: vi.fn(),
    isPending: false,
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

describe('TenantCredentialsDialog', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog when open', () => {
    renderWithQueryClient(
      <TenantCredentialsDialog
        tenant={mockTenant}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('به‌روزرسانی اطلاعات ورود تنانت')).toBeInTheDocument();
    expect(screen.getByText('Test Tenant')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    renderWithQueryClient(
      <TenantCredentialsDialog
        tenant={mockTenant}
        isOpen={false}
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByText('به‌روزرسانی اطلاعات ورود تنانت')).not.toBeInTheDocument();
  });

  it('shows password strength indicator when password is entered', async () => {
    renderWithQueryClient(
      <TenantCredentialsDialog
        tenant={mockTenant}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const passwordInput = screen.getByPlaceholderText('رمز عبور جدید');
    fireEvent.change(passwordInput, { target: { value: 'weak' } });

    await waitFor(() => {
      expect(screen.getByText('ضعیف')).toBeInTheDocument();
    });

    fireEvent.change(passwordInput, { target: { value: 'StrongPass123!' } });

    await waitFor(() => {
      expect(screen.getByText('عالی')).toBeInTheDocument();
    });
  });

  it('toggles password visibility', () => {
    renderWithQueryClient(
      <TenantCredentialsDialog
        tenant={mockTenant}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const passwordInput = screen.getByPlaceholderText('رمز عبور جدید');
    const toggleButton = passwordInput.parentElement?.querySelector('button');

    expect(passwordInput).toHaveAttribute('type', 'password');

    if (toggleButton) {
      fireEvent.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');

      fireEvent.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'password');
    }
  });

  it('shows warning when changes are made', async () => {
    renderWithQueryClient(
      <TenantCredentialsDialog
        tenant={mockTenant}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const emailInput = screen.getByDisplayValue('test@example.com');
    fireEvent.change(emailInput, { target: { value: 'newemail@example.com' } });

    await waitFor(() => {
      expect(screen.getByText('هشدار امنیتی')).toBeInTheDocument();
    });
  });

  it('disables submit button when no changes are made', () => {
    renderWithQueryClient(
      <TenantCredentialsDialog
        tenant={mockTenant}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const submitButton = screen.getByText('به‌روزرسانی');
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when changes are made', async () => {
    renderWithQueryClient(
      <TenantCredentialsDialog
        tenant={mockTenant}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const emailInput = screen.getByDisplayValue('test@example.com');
    fireEvent.change(emailInput, { target: { value: 'newemail@example.com' } });

    await waitFor(() => {
      const submitButton = screen.getByText('به‌روزرسانی');
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('shows email change preview', async () => {
    renderWithQueryClient(
      <TenantCredentialsDialog
        tenant={mockTenant}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const emailInput = screen.getByDisplayValue('test@example.com');
    fireEvent.change(emailInput, { target: { value: 'newemail@example.com' } });

    await waitFor(() => {
      expect(screen.getByText(/ایمیل از "test@example.com" به "newemail@example.com" تغییر خواهد کرد/)).toBeInTheDocument();
    });
  });

  it('calls onClose when cancel button is clicked', () => {
    renderWithQueryClient(
      <TenantCredentialsDialog
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
      <TenantCredentialsDialog
        tenant={null}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByText('به‌روزرسانی اطلاعات ورود تنانت')).not.toBeInTheDocument();
  });
});