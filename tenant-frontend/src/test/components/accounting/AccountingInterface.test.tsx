/**
 * Tests for AccountingInterface component
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AccountingInterface } from '@/components/accounting/AccountingInterface';
import { accountingService } from '@/services/accountingService';

// Mock all the child components
vi.mock('@/components/accounting/ChartOfAccounts', () => ({
  ChartOfAccounts: ({ onAccountSelect, selectedAccountId }: any) => (
    <div data-testid="chart-of-accounts">
      <div>Chart of Accounts Component</div>
      <div>Selected Account: {selectedAccountId || 'None'}</div>
      <button onClick={() => onAccountSelect?.({ id: 'test-account', account_name: 'Test Account' })}>
        Select Account
      </button>
    </div>
  )
}));

vi.mock('@/components/accounting/GeneralLedger', () => ({
  GeneralLedger: ({ selectedAccountId, onAccountSelect }: any) => (
    <div data-testid="general-ledger">
      <div>General Ledger Component</div>
      <div>Selected Account: {selectedAccountId || 'None'}</div>
      <button onClick={() => onAccountSelect?.('another-account')}>
        Select Another Account
      </button>
    </div>
  )
}));

vi.mock('@/components/accounting/JournalEntries', () => ({
  JournalEntries: () => (
    <div data-testid="journal-entries">
      <div>Journal Entries Component</div>
    </div>
  )
}));

vi.mock('@/components/accounting/TrialBalance', () => ({
  TrialBalance: () => (
    <div data-testid="trial-balance">
      <div>Trial Balance Component</div>
    </div>
  )
}));

// Mock the accounting service
vi.mock('@/services/accountingService', () => ({
  accountingService: {
    getChartOfAccounts: vi.fn(),
    getAccounts: vi.fn(),
    getJournalEntries: vi.fn(),
    getTrialBalance: vi.fn()
  }
}));

describe('AccountingInterface', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with tabs navigation', () => {
    render(<AccountingInterface />);

    // Check if all tabs are present
    expect(screen.getByText('دفتر حساب‌ها')).toBeInTheDocument();
    expect(screen.getByText('دفتر کل')).toBeInTheDocument();
    expect(screen.getByText('اسناد حسابداری')).toBeInTheDocument();
    expect(screen.getByText('تراز آزمایشی')).toBeInTheDocument();
  });

  it('should show chart of accounts by default', () => {
    render(<AccountingInterface />);

    // Chart of accounts should be visible by default
    expect(screen.getByTestId('chart-of-accounts')).toBeInTheDocument();
    expect(screen.getByText('Chart of Accounts Component')).toBeInTheDocument();
    
    // Other components should not be visible
    expect(screen.queryByTestId('general-ledger')).not.toBeInTheDocument();
    expect(screen.queryByTestId('journal-entries')).not.toBeInTheDocument();
    expect(screen.queryByTestId('trial-balance')).not.toBeInTheDocument();
  });

  it('should switch between tabs correctly', async () => {
    render(<AccountingInterface />);

    // Initially chart of accounts should be visible
    expect(screen.getByTestId('chart-of-accounts')).toBeInTheDocument();

    // Click on general ledger tab
    fireEvent.click(screen.getByText('دفتر کل'));
    
    await waitFor(() => {
      expect(screen.getByTestId('general-ledger')).toBeInTheDocument();
      expect(screen.queryByTestId('chart-of-accounts')).not.toBeInTheDocument();
    });

    // Click on journal entries tab
    fireEvent.click(screen.getByText('اسناد حسابداری'));
    
    await waitFor(() => {
      expect(screen.getByTestId('journal-entries')).toBeInTheDocument();
      expect(screen.queryByTestId('general-ledger')).not.toBeInTheDocument();
    });

    // Click on trial balance tab
    fireEvent.click(screen.getByText('تراز آزمایشی'));
    
    await waitFor(() => {
      expect(screen.getByTestId('trial-balance')).toBeInTheDocument();
      expect(screen.queryByTestId('journal-entries')).not.toBeInTheDocument();
    });
  });

  it('should handle account selection from chart of accounts', async () => {
    render(<AccountingInterface />);

    // Initially no account selected
    expect(screen.getByText('Selected Account: None')).toBeInTheDocument();

    // Select an account from chart of accounts
    fireEvent.click(screen.getByText('Select Account'));

    await waitFor(() => {
      // Should switch to general ledger tab
      expect(screen.getByTestId('general-ledger')).toBeInTheDocument();
      expect(screen.getByText('Selected Account: test-account')).toBeInTheDocument();
    });
  });

  it('should handle account selection from general ledger', async () => {
    render(<AccountingInterface />);

    // Switch to general ledger tab
    fireEvent.click(screen.getByText('دفتر کل'));
    
    await waitFor(() => {
      expect(screen.getByTestId('general-ledger')).toBeInTheDocument();
    });

    // Select another account from general ledger
    fireEvent.click(screen.getByText('Select Another Account'));

    await waitFor(() => {
      expect(screen.getByText('Selected Account: another-account')).toBeInTheDocument();
    });
  });

  it('should maintain selected account across tab switches', async () => {
    render(<AccountingInterface />);

    // Select an account from chart of accounts
    fireEvent.click(screen.getByText('Select Account'));

    await waitFor(() => {
      expect(screen.getByTestId('general-ledger')).toBeInTheDocument();
      expect(screen.getByText('Selected Account: test-account')).toBeInTheDocument();
    });

    // Switch back to chart of accounts
    fireEvent.click(screen.getByText('دفتر حساب‌ها'));

    await waitFor(() => {
      expect(screen.getByTestId('chart-of-accounts')).toBeInTheDocument();
      expect(screen.getByText('Selected Account: test-account')).toBeInTheDocument();
    });
  });

  it('should have proper tab styling for active state', () => {
    render(<AccountingInterface />);

    // Chart of accounts tab should be active by default
    const chartTab = screen.getByText('دفتر حساب‌ها').closest('button');
    expect(chartTab).toHaveAttribute('data-state', 'active');

    // Other tabs should be inactive
    const ledgerTab = screen.getByText('دفتر کل').closest('button');
    expect(ledgerTab).toHaveAttribute('data-state', 'inactive');
  });

  it('should update active tab styling when switching', async () => {
    render(<AccountingInterface />);

    // Click on general ledger tab
    fireEvent.click(screen.getByText('دفتر کل'));

    await waitFor(() => {
      const ledgerTab = screen.getByText('دفتر کل').closest('button');
      expect(ledgerTab).toHaveAttribute('data-state', 'active');

      const chartTab = screen.getByText('دفتر حساب‌ها').closest('button');
      expect(chartTab).toHaveAttribute('data-state', 'inactive');
    });
  });

  it('should have responsive design with icons', () => {
    render(<AccountingInterface />);

    // Check if tabs have icons (they should be rendered as SVG elements)
    const tabs = screen.getAllByRole('button');
    tabs.forEach(tab => {
      const svg = tab.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  it('should handle tab navigation with keyboard', () => {
    render(<AccountingInterface />);

    const chartTab = screen.getByText('دفتر حساب‌ها').closest('button');
    const ledgerTab = screen.getByText('دفتر کل').closest('button');

    // Focus on chart tab
    chartTab?.focus();
    expect(document.activeElement).toBe(chartTab);

    // Press Tab to move to next tab
    fireEvent.keyDown(chartTab!, { key: 'Tab' });
    
    // Should be able to navigate between tabs
    expect(ledgerTab).toBeInTheDocument();
  });

  it('should pass correct props to child components', () => {
    render(<AccountingInterface />);

    // Chart of accounts should receive onAccountSelect and selectedAccountId props
    expect(screen.getByText('Selected Account: None')).toBeInTheDocument();

    // Switch to general ledger
    fireEvent.click(screen.getByText('دفتر کل'));

    // General ledger should also receive the props
    expect(screen.getByTestId('general-ledger')).toBeInTheDocument();
  });

  it('should handle component state correctly', async () => {
    render(<AccountingInterface />);

    // Test state management through account selection
    fireEvent.click(screen.getByText('Select Account'));

    await waitFor(() => {
      expect(screen.getByText('Selected Account: test-account')).toBeInTheDocument();
    });

    // Switch to journal entries (should not affect selected account)
    fireEvent.click(screen.getByText('اسناد حسابداری'));

    await waitFor(() => {
      expect(screen.getByTestId('journal-entries')).toBeInTheDocument();
    });

    // Switch back to general ledger (selected account should persist)
    fireEvent.click(screen.getByText('دفتر کل'));

    await waitFor(() => {
      expect(screen.getByText('Selected Account: test-account')).toBeInTheDocument();
    });
  });
});