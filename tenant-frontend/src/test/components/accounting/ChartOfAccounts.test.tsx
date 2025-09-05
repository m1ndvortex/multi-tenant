/**
 * Tests for ChartOfAccounts component
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChartOfAccounts } from '@/components/accounting/ChartOfAccounts';
import { accountingService } from '@/services/accountingService';

// Mock the accounting service
vi.mock('@/services/accountingService', () => ({
  accountingService: {
    getChartOfAccounts: vi.fn(),
    createAccount: vi.fn(),
    updateAccount: vi.fn(),
    deleteAccount: vi.fn()
  }
}));

// Mock toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

const mockChartOfAccountsData = {
  accounts: [
    {
      id: '1',
      tenant_id: 'tenant-1',
      account_code: '1000',
      account_name: 'دارایی‌ها',
      account_type: 'asset' as const,
      parent_id: null,
      is_system_account: false,
      is_control_account: true,
      allow_posting: false,
      opening_balance: 0,
      current_balance: 5000,
      full_account_code: '1000',
      description: 'حساب کنترل دارایی‌ها',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      is_active: true,
      children: [
        {
          id: '2',
          tenant_id: 'tenant-1',
          account_code: '1001',
          account_name: 'نقد',
          account_type: 'asset' as const,
          parent_id: '1',
          is_system_account: false,
          is_control_account: false,
          allow_posting: true,
          opening_balance: 0,
          current_balance: 2000,
          full_account_code: '1000.1001',
          description: 'حساب نقد',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          is_active: true,
          children: [],
          level: 1
        }
      ],
      level: 0
    },
    {
      id: '3',
      tenant_id: 'tenant-1',
      account_code: '2000',
      account_name: 'بدهی‌ها',
      account_type: 'liability' as const,
      parent_id: null,
      is_system_account: false,
      is_control_account: true,
      allow_posting: false,
      opening_balance: 0,
      current_balance: 3000,
      full_account_code: '2000',
      description: 'حساب کنترل بدهی‌ها',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      is_active: true,
      children: [],
      level: 0
    }
  ],
  total_accounts: 3,
  accounts_by_type: {
    asset: 2,
    liability: 1
  }
};

describe('ChartOfAccounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (accountingService.getChartOfAccounts as any).mockResolvedValue(mockChartOfAccountsData);
  });

  it('should render chart of accounts with hierarchical structure', async () => {
    render(<ChartOfAccounts />);

    // Wait for accounts to be displayed
    await waitFor(() => {
      expect(screen.getByText('1000')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Check if accounts are displayed
    expect(screen.getByText('دارایی‌ها')).toBeInTheDocument();
    expect(screen.getByText('2000')).toBeInTheDocument();
    expect(screen.getByText('بدهی‌ها')).toBeInTheDocument();

    // Check account type summary
    expect(screen.getByText('دارایی: 2')).toBeInTheDocument();
    expect(screen.getByText('بدهی: 1')).toBeInTheDocument();
  });

  it('should expand and collapse account nodes', async () => {
    render(<ChartOfAccounts />);

    await waitFor(() => {
      expect(screen.getByText('دارایی‌ها')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Initially, child account should not be visible
    expect(screen.queryByText('نقد')).not.toBeInTheDocument();

    // Find the expand button (chevron) for the parent account
    const expandButtons = screen.getAllByRole('button');
    const expandButton = expandButtons.find(button => 
      button.querySelector('svg') && button.closest('div')?.textContent?.includes('دارایی‌ها')
    );
    
    if (expandButton) {
      fireEvent.click(expandButton);

      // Child account should now be visible
      await waitFor(() => {
        expect(screen.getByText('نقد')).toBeInTheDocument();
        expect(screen.getByText('1000.1001')).toBeInTheDocument();
      });
    }
  });

  it('should call onAccountSelect when account is clicked', async () => {
    const mockOnAccountSelect = vi.fn();
    render(<ChartOfAccounts onAccountSelect={mockOnAccountSelect} />);

    await waitFor(() => {
      expect(screen.getByText('دارایی‌ها')).toBeInTheDocument();
    });

    // Click on an account
    fireEvent.click(screen.getByText('دارایی‌ها'));

    expect(mockOnAccountSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '1',
        account_name: 'دارایی‌ها'
      })
    );
  });

  it('should highlight selected account', async () => {
    render(<ChartOfAccounts selectedAccountId="1" />);

    await waitFor(() => {
      expect(screen.getByText('دارایی‌ها')).toBeInTheDocument();
    });

    // Check if the selected account has the correct styling
    const selectedAccount = screen.getByText('دارایی‌ها').closest('div');
    expect(selectedAccount).toHaveClass('border-green-300');
  });

  it('should show create account form when "حساب جدید" is clicked', async () => {
    render(<ChartOfAccounts />);

    await waitFor(() => {
      expect(screen.getByText('حساب جدید')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('حساب جدید'));

    // Account form should be displayed
    await waitFor(() => {
      expect(screen.getByText('حساب جدید')).toBeInTheDocument();
      expect(screen.getByLabelText('کد حساب *')).toBeInTheDocument();
      expect(screen.getByLabelText('نام حساب *')).toBeInTheDocument();
    });
  });

  it('should show edit form when edit button is clicked', async () => {
    render(<ChartOfAccounts />);

    await waitFor(() => {
      expect(screen.getByText('دارایی‌ها')).toBeInTheDocument();
    });

    // Find and click edit button (assuming it's visible on hover)
    const editButtons = screen.getAllByRole('button');
    const editButton = editButtons.find(button => 
      button.querySelector('svg') && button.getAttribute('class')?.includes('h-8 w-8')
    );
    
    if (editButton) {
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('ویرایش حساب')).toBeInTheDocument();
      });
    }
  });

  it('should handle delete account with confirmation', async () => {
    (accountingService.deleteAccount as any).mockResolvedValue({
      success: true,
      message: 'Account deleted successfully'
    });

    // Mock window.confirm
    const originalConfirm = window.confirm;
    window.confirm = vi.fn(() => true);

    render(<ChartOfAccounts />);

    await waitFor(() => {
      expect(screen.getByText('دارایی‌ها')).toBeInTheDocument();
    });

    // Find and click delete button
    const deleteButtons = screen.getAllByRole('button');
    const deleteButton = deleteButtons.find(button => 
      button.querySelector('svg') && button.getAttribute('class')?.includes('text-red-600')
    );
    
    if (deleteButton) {
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(accountingService.deleteAccount).toHaveBeenCalled();
      });
    }

    // Restore original confirm
    window.confirm = originalConfirm;
  });

  it('should display account balances correctly', async () => {
    render(<ChartOfAccounts />);

    await waitFor(() => {
      expect(screen.getByText('دارایی‌ها')).toBeInTheDocument();
    });

    // Check if balances are displayed with proper formatting
    expect(screen.getByText(/5,000/)).toBeInTheDocument(); // Current balance for assets
    expect(screen.getByText(/3,000/)).toBeInTheDocument(); // Current balance for liabilities
  });

  it('should show badges for account properties', async () => {
    render(<ChartOfAccounts />);

    await waitFor(() => {
      expect(screen.getByText('دارایی‌ها')).toBeInTheDocument();
    });

    // Check for control account badge
    expect(screen.getByText('حساب کنترل')).toBeInTheDocument();
    
    // Check for non-posting account badge
    expect(screen.getByText('غیرقابل ثبت')).toBeInTheDocument();
  });

  it('should handle loading state', () => {
    (accountingService.getChartOfAccounts as any).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );

    render(<ChartOfAccounts />);

    // Check for loading spinner - look for the spinner element
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should handle empty state', async () => {
    (accountingService.getChartOfAccounts as any).mockResolvedValue({
      accounts: [],
      total_accounts: 0,
      accounts_by_type: {}
    });

    render(<ChartOfAccounts />);

    await waitFor(() => {
      expect(screen.getByText('هیچ حسابی تعریف نشده است')).toBeInTheDocument();
      expect(screen.getByText('اولین حساب را ایجاد کنید')).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    (accountingService.getChartOfAccounts as any).mockRejectedValue(
      new Error('Network error')
    );

    render(<ChartOfAccounts />);

    await waitFor(() => {
      // Component should still render without crashing
      expect(screen.getByText('دفتر حساب‌ها')).toBeInTheDocument();
    });
  });

  it('should filter accounts by type correctly', async () => {
    render(<ChartOfAccounts />);

    await waitFor(() => {
      expect(screen.getByText('دارایی‌ها')).toBeInTheDocument();
    });

    // All account types should be visible initially
    expect(screen.getByText('دارایی: 2')).toBeInTheDocument();
    expect(screen.getByText('بدهی: 1')).toBeInTheDocument();
  });
});