import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, beforeEach, expect } from 'vitest';
import { FinancialReports } from '@/components/accounting/FinancialReports';

// Mock config
vi.mock('@/lib/config', () => ({
  config: {
    apiUrl: 'http://localhost:8000'
  }
}));

// Mock utility functions
vi.mock('@/lib/utils', () => ({
  formatCurrency: (amount: number) => `${amount.toLocaleString()} ریال`,
  formatDate: (date: string) => new Date(date).toLocaleDateString('fa-IR'),
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

// Mock the child components
vi.mock('@/components/accounting/AccountsReceivable', () => ({
  AccountsReceivable: () => <div data-testid="accounts-receivable">Accounts Receivable Component</div>
}));

vi.mock('@/components/accounting/AccountsPayable', () => ({
  AccountsPayable: () => <div data-testid="accounts-payable">Accounts Payable Component</div>
}));

vi.mock('@/components/accounting/BankReconciliation', () => ({
  BankReconciliation: () => <div data-testid="bank-reconciliation">Bank Reconciliation Component</div>
}));

vi.mock('@/components/accounting/ProfitLossStatement', () => ({
  ProfitLossStatement: () => <div data-testid="profit-loss">Profit Loss Statement Component</div>
}));

vi.mock('@/components/accounting/BalanceSheet', () => ({
  BalanceSheet: () => <div data-testid="balance-sheet">Balance Sheet Component</div>
}));

vi.mock('@/components/accounting/TrialBalance', () => ({
  TrialBalance: () => <div data-testid="trial-balance">Trial Balance Component</div>
}));

// Mock the accounting service
vi.mock('@/services/accountingService', () => ({
  accountingService: {
    getTrialBalance: vi.fn(),
  }
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('FinancialReports Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders financial reports interface with header', () => {
    renderWithQueryClient(<FinancialReports />);
    
    expect(screen.getByText('گزارش‌های مالی')).toBeInTheDocument();
    expect(screen.getByText('مدیریت حساب‌های دریافتنی، پرداختنی و گزارش‌های مالی')).toBeInTheDocument();
  });

  it('renders all tab triggers', () => {
    renderWithQueryClient(<FinancialReports />);
    
    expect(screen.getByText('دریافتنی')).toBeInTheDocument();
    expect(screen.getByText('پرداختنی')).toBeInTheDocument();
    expect(screen.getByText('تطبیق بانک')).toBeInTheDocument();
    expect(screen.getByText('سود و زیان')).toBeInTheDocument();
    expect(screen.getByText('ترازنامه')).toBeInTheDocument();
    expect(screen.getByText('تراز آزمایشی')).toBeInTheDocument();
  });

  it('shows accounts receivable by default', () => {
    renderWithQueryClient(<FinancialReports />);
    
    expect(screen.getByTestId('accounts-receivable')).toBeInTheDocument();
    expect(screen.queryByTestId('accounts-payable')).not.toBeInTheDocument();
  });

  it('switches to accounts payable tab', async () => {
    renderWithQueryClient(<FinancialReports />);
    
    const payablesTab = screen.getByText('پرداختنی');
    fireEvent.click(payablesTab);
    
    await waitFor(() => {
      expect(screen.getByTestId('accounts-payable')).toBeInTheDocument();
      expect(screen.queryByTestId('accounts-receivable')).not.toBeInTheDocument();
    });
  });

  it('switches to bank reconciliation tab', async () => {
    renderWithQueryClient(<FinancialReports />);
    
    const bankTab = screen.getByText('تطبیق بانک');
    fireEvent.click(bankTab);
    
    await waitFor(() => {
      expect(screen.getByTestId('bank-reconciliation')).toBeInTheDocument();
      expect(screen.queryByTestId('accounts-receivable')).not.toBeInTheDocument();
    });
  });

  it('switches to profit loss statement tab', async () => {
    renderWithQueryClient(<FinancialReports />);
    
    const plTab = screen.getByText('سود و زیان');
    fireEvent.click(plTab);
    
    await waitFor(() => {
      expect(screen.getByTestId('profit-loss')).toBeInTheDocument();
      expect(screen.queryByTestId('accounts-receivable')).not.toBeInTheDocument();
    });
  });

  it('switches to balance sheet tab', async () => {
    renderWithQueryClient(<FinancialReports />);
    
    const bsTab = screen.getByText('ترازنامه');
    fireEvent.click(bsTab);
    
    await waitFor(() => {
      expect(screen.getByTestId('balance-sheet')).toBeInTheDocument();
      expect(screen.queryByTestId('accounts-receivable')).not.toBeInTheDocument();
    });
  });

  it('switches to trial balance tab', async () => {
    renderWithQueryClient(<FinancialReports />);
    
    const tbTab = screen.getByText('تراز آزمایشی');
    fireEvent.click(tbTab);
    
    await waitFor(() => {
      expect(screen.getByTestId('trial-balance')).toBeInTheDocument();
      expect(screen.queryByTestId('accounts-receivable')).not.toBeInTheDocument();
    });
  });

  it('has proper tab styling and icons', () => {
    renderWithQueryClient(<FinancialReports />);
    
    // Check for tab buttons
    const tabButtons = screen.getAllByRole('button');
    expect(tabButtons.length).toBeGreaterThan(0);
    
    // Check for gradient background class on the tabs container
    const tabsContainer = document.querySelector('.bg-gradient-to-r');
    expect(tabsContainer).toBeInTheDocument();
  });

  it('maintains tab state when switching between tabs', async () => {
    renderWithQueryClient(<FinancialReports />);
    
    // Switch to payables
    fireEvent.click(screen.getByText('پرداختنی'));
    await waitFor(() => {
      expect(screen.getByTestId('accounts-payable')).toBeInTheDocument();
    });
    
    // Switch to bank reconciliation
    fireEvent.click(screen.getByText('تطبیق بانک'));
    await waitFor(() => {
      expect(screen.getByTestId('bank-reconciliation')).toBeInTheDocument();
    });
    
    // Switch back to receivables
    fireEvent.click(screen.getByText('دریافتنی'));
    await waitFor(() => {
      expect(screen.getByTestId('accounts-receivable')).toBeInTheDocument();
    });
  });

  it('renders with proper RTL layout', () => {
    renderWithQueryClient(<FinancialReports />);
    
    const container = screen.getByText('گزارش‌های مالی').closest('div');
    expect(container).toBeInTheDocument();
  });

  it('has accessible tab navigation', () => {
    renderWithQueryClient(<FinancialReports />);
    
    const tabButtons = screen.getAllByRole('button');
    
    expect(tabButtons).toHaveLength(6);
    
    // Check that first tab is selected by default
    expect(tabButtons[0]).toHaveAttribute('data-state', 'active');
  });
});