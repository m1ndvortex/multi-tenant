/**
 * Tests for GeneralLedger component
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GeneralLedger } from '@/components/accounting/GeneralLedger';
import { accountingService } from '@/services/accountingService';

// Mock the accounting service
vi.mock('@/services/accountingService', () => ({
  accountingService: {
    getAccounts: vi.fn(),
    getGeneralLedger: vi.fn()
  }
}));

// Mock toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

const mockAccounts = [
  {
    id: '1',
    tenant_id: 'tenant-1',
    account_code: '1001',
    account_name: 'نقد',
    account_type: 'asset' as const,
    parent_id: null,
    is_system_account: false,
    is_control_account: false,
    allow_posting: true,
    opening_balance: 0,
    current_balance: 2000,
    full_account_code: '1001',
    description: 'حساب نقد',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    is_active: true
  },
  {
    id: '2',
    tenant_id: 'tenant-1',
    account_code: '4001',
    account_name: 'فروش',
    account_type: 'revenue' as const,
    parent_id: null,
    is_system_account: false,
    is_control_account: false,
    allow_posting: true,
    opening_balance: 0,
    current_balance: 1500,
    full_account_code: '4001',
    description: 'حساب فروش',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    is_active: true
  }
];

const mockGeneralLedgerData = {
  account: mockAccounts[0],
  entries: [
    {
      entry_date: '2024-01-01T00:00:00Z',
      entry_number: 'OPENING',
      description: 'مانده ابتدای دوره',
      reference_type: null,
      reference_number: null,
      debit_amount: 0,
      credit_amount: 0,
      running_balance: 0,
      is_opening_balance: true
    },
    {
      entry_date: '2024-01-01T00:00:00Z',
      entry_number: 'JE-001',
      description: 'فروش نقدی',
      reference_type: 'invoice',
      reference_number: 'INV-001',
      debit_amount: 1000,
      credit_amount: 0,
      running_balance: 1000,
      is_opening_balance: false
    },
    {
      entry_date: '2024-01-02T00:00:00Z',
      entry_number: 'JE-002',
      description: 'خرید نقدی',
      reference_type: 'purchase',
      reference_number: 'PUR-001',
      debit_amount: 0,
      credit_amount: 500,
      running_balance: 500,
      is_opening_balance: false
    }
  ],
  opening_balance: 0,
  closing_balance: 500,
  total_debits: 1000,
  total_credits: 500,
  period_from: '2024-01-01T00:00:00Z',
  period_to: '2024-01-31T23:59:59Z'
};

describe('GeneralLedger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (accountingService.getAccounts as any).mockResolvedValue(mockAccounts);
    (accountingService.getGeneralLedger as any).mockResolvedValue(mockGeneralLedgerData);
  });

  it('should render general ledger interface', async () => {
    render(<GeneralLedger />);

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('دفتر کل')).toBeInTheDocument();
    });

    // Check if account selection is available
    expect(screen.getByText('انتخاب حساب')).toBeInTheDocument();
    expect(screen.getByText('حساب مورد نظر را انتخاب کنید')).toBeInTheDocument();
  });

  it('should load and display accounts in dropdown', async () => {
    render(<GeneralLedger />);

    await waitFor(() => {
      expect(accountingService.getAccounts).toHaveBeenCalled();
    });

    // Click on account selector
    const accountSelector = screen.getByRole('combobox');
    fireEvent.click(accountSelector);

    // Check if accounts are displayed
    await waitFor(() => {
      expect(screen.getByText('1001 - نقد')).toBeInTheDocument();
      expect(screen.getByText('4001 - فروش')).toBeInTheDocument();
    });
  });

  it('should load general ledger when account is selected', async () => {
    render(<GeneralLedger />);

    await waitFor(() => {
      expect(screen.getByText('دفتر کل')).toBeInTheDocument();
    });

    // Select an account
    const accountSelector = screen.getByRole('combobox');
    fireEvent.click(accountSelector);
    
    await waitFor(() => {
      const cashAccount = screen.getByText('1001 - نقد');
      fireEvent.click(cashAccount);
    });

    // Should load general ledger data
    await waitFor(() => {
      expect(accountingService.getGeneralLedger).toHaveBeenCalledWith(
        expect.objectContaining({
          account_id: '1',
          posted_only: true,
          include_opening_balance: true
        })
      );
    });
  });

  it('should display account summary cards', async () => {
    render(<GeneralLedger selectedAccountId="1" />);

    await waitFor(() => {
      expect(screen.getByText('مانده ابتدای دوره')).toBeInTheDocument();
      expect(screen.getByText('کل بدهکار')).toBeInTheDocument();
      expect(screen.getByText('کل بستانکار')).toBeInTheDocument();
      expect(screen.getByText('مانده پایان دوره')).toBeInTheDocument();
    });

    // Check if amounts are displayed correctly
    expect(screen.getByText(/1,000/)).toBeInTheDocument(); // Total debits
    expect(screen.getByText(/500/)).toBeInTheDocument(); // Total credits and closing balance
  });

  it('should display ledger entries in table format', async () => {
    render(<GeneralLedger selectedAccountId="1" />);

    await waitFor(() => {
      expect(screen.getByText('فروش نقدی')).toBeInTheDocument();
    });

    // Check table headers
    expect(screen.getByText('تاریخ')).toBeInTheDocument();
    expect(screen.getByText('شماره سند')).toBeInTheDocument();
    expect(screen.getByText('شرح')).toBeInTheDocument();
    expect(screen.getByText('بدهکار')).toBeInTheDocument();
    expect(screen.getByText('بستانکار')).toBeInTheDocument();
    expect(screen.getByText('مانده')).toBeInTheDocument();

    // Check entry data
    expect(screen.getByText('JE-001')).toBeInTheDocument();
    expect(screen.getByText('فروش نقدی')).toBeInTheDocument();
    expect(screen.getByText('JE-002')).toBeInTheDocument();
    expect(screen.getByText('خرید نقدی')).toBeInTheDocument();
  });

  it('should highlight opening balance entry', async () => {
    render(<GeneralLedger selectedAccountId="1" />);

    await waitFor(() => {
      expect(screen.getByText('مانده ابتدای دوره')).toBeInTheDocument();
    });

    // Opening balance entry should have special styling
    const openingBalanceRow = screen.getByText('مانده ابتدای دوره').closest('div');
    expect(openingBalanceRow).toHaveClass('from-green-50');
  });

  it('should show and apply filters', async () => {
    render(<GeneralLedger selectedAccountId="1" />);

    await waitFor(() => {
      expect(screen.getByText('فیلتر')).toBeInTheDocument();
    });

    // Click filter button
    fireEvent.click(screen.getByText('فیلتر'));

    // Filter panel should be visible
    await waitFor(() => {
      expect(screen.getByText('از تاریخ')).toBeInTheDocument();
      expect(screen.getByText('تا تاریخ')).toBeInTheDocument();
      expect(screen.getByText('نوع اسناد')).toBeInTheDocument();
    });

    // Set date filters
    const fromDateInput = screen.getByLabelText('از تاریخ');
    const toDateInput = screen.getByLabelText('تا تاریخ');
    
    fireEvent.change(fromDateInput, { target: { value: '2024-01-01' } });
    fireEvent.change(toDateInput, { target: { value: '2024-01-31' } });

    // Apply filters
    fireEvent.click(screen.getByText('اعمال فیلتر'));

    await waitFor(() => {
      expect(accountingService.getGeneralLedger).toHaveBeenCalledWith(
        expect.objectContaining({
          account_id: '1',
          date_from: '2024-01-01',
          date_to: '2024-01-31',
          posted_only: true,
          include_opening_balance: true
        })
      );
    });
  });

  it('should handle posted_only filter', async () => {
    render(<GeneralLedger selectedAccountId="1" />);

    await waitFor(() => {
      expect(screen.getByText('فیلتر')).toBeInTheDocument();
    });

    // Open filters
    fireEvent.click(screen.getByText('فیلتر'));

    // Change document type filter
    const documentTypeFilter = screen.getAllByRole('combobox')[1]; // Second combobox is for document type
    fireEvent.click(documentTypeFilter);
    
    const allDocsOption = screen.getByText('همه اسناد');
    fireEvent.click(allDocsOption);

    // Apply filters
    fireEvent.click(screen.getByText('اعمال فیلتر'));

    await waitFor(() => {
      expect(accountingService.getGeneralLedger).toHaveBeenCalledWith(
        expect.objectContaining({
          posted_only: false
        })
      );
    });
  });

  it('should reset filters correctly', async () => {
    render(<GeneralLedger selectedAccountId="1" />);

    await waitFor(() => {
      expect(screen.getByText('فیلتر')).toBeInTheDocument();
    });

    // Open filters and set some values
    fireEvent.click(screen.getByText('فیلتر'));
    
    const fromDateInput = screen.getByLabelText('از تاریخ');
    fireEvent.change(fromDateInput, { target: { value: '2024-01-01' } });

    // Reset filters
    fireEvent.click(screen.getByText('پاک کردن'));

    // Date input should be cleared
    expect(fromDateInput).toHaveValue('');
  });

  it('should display account information correctly', async () => {
    render(<GeneralLedger selectedAccountId="1" />);

    await waitFor(() => {
      expect(screen.getByText('1001 - نقد')).toBeInTheDocument();
    });

    // Check account type badge
    expect(screen.getByText('دارایی')).toBeInTheDocument();
  });

  it('should handle balance colors correctly', async () => {
    render(<GeneralLedger selectedAccountId="1" />);

    await waitFor(() => {
      expect(screen.getByText('فروش نقدی')).toBeInTheDocument();
    });

    // Positive balances should have green color class
    const positiveBalanceElements = screen.getAllByText(/500|1,000/);
    positiveBalanceElements.forEach(element => {
      const parentElement = element.closest('div');
      if (parentElement?.textContent?.includes('مانده')) {
        expect(parentElement).toHaveClass('text-green-700');
      }
    });
  });

  it('should handle empty ledger state', async () => {
    (accountingService.getGeneralLedger as any).mockResolvedValue({
      ...mockGeneralLedgerData,
      entries: []
    });

    render(<GeneralLedger selectedAccountId="1" />);

    await waitFor(() => {
      expect(screen.getByText('هیچ تراکنشی برای این حساب یافت نشد')).toBeInTheDocument();
    });
  });

  it('should handle no account selected state', () => {
    render(<GeneralLedger />);

    expect(screen.getByText('لطفاً حساب مورد نظر را انتخاب کنید')).toBeInTheDocument();
  });

  it('should call onAccountSelect when account changes', async () => {
    const mockOnAccountSelect = vi.fn();
    render(<GeneralLedger onAccountSelect={mockOnAccountSelect} />);

    await waitFor(() => {
      expect(screen.getByText('دفتر کل')).toBeInTheDocument();
    });

    // Select an account
    const accountSelector = screen.getByRole('combobox');
    fireEvent.click(accountSelector);
    
    await waitFor(() => {
      const cashAccount = screen.getByText('1001 - نقد');
      fireEvent.click(cashAccount);
    });

    expect(mockOnAccountSelect).toHaveBeenCalledWith('1');
  });

  it('should handle API errors gracefully', async () => {
    (accountingService.getGeneralLedger as any).mockRejectedValue(
      new Error('Network error')
    );

    render(<GeneralLedger selectedAccountId="1" />);

    await waitFor(() => {
      // Component should still render without crashing
      expect(screen.getByText('دفتر کل')).toBeInTheDocument();
    });
  });

  it('should show reference numbers when available', async () => {
    render(<GeneralLedger selectedAccountId="1" />);

    await waitFor(() => {
      expect(screen.getByText('INV-001')).toBeInTheDocument();
      expect(screen.getByText('PUR-001')).toBeInTheDocument();
    });
  });

  it('should format dates correctly', async () => {
    render(<GeneralLedger selectedAccountId="1" />);

    await waitFor(() => {
      expect(screen.getByText('فروش نقدی')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Check for formatted dates - they should be present in Persian format
    const dateElements = screen.getAllByText((content, element) => {
      return content.includes('/') || content.includes('۱۴۰۳') || content.includes('1403');
    });
    expect(dateElements.length).toBeGreaterThan(0);
  });
});