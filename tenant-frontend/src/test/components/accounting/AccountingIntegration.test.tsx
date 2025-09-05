/**
 * Integration test for accounting components to verify core functionality
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AccountingInterface } from '@/components/accounting/AccountingInterface';
import { accountingService } from '@/services/accountingService';

// Mock the accounting service
vi.mock('@/services/accountingService', () => ({
  accountingService: {
    getChartOfAccounts: vi.fn(),
    getAccounts: vi.fn(),
    getJournalEntries: vi.fn(),
    getTrialBalance: vi.fn(),
    getGeneralLedger: vi.fn()
  }
}));

// Mock toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

describe('Accounting Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful responses
    (accountingService.getChartOfAccounts as any).mockResolvedValue({
      accounts: [],
      total_accounts: 0,
      accounts_by_type: {}
    });
    
    (accountingService.getAccounts as any).mockResolvedValue([]);
    (accountingService.getJournalEntries as any).mockResolvedValue([]);
    (accountingService.getTrialBalance as any).mockResolvedValue({
      entries: [],
      total_debits: 0,
      total_credits: 0,
      is_balanced: true,
      as_of_date: new Date().toISOString()
    });
    
    (accountingService.getGeneralLedger as any).mockResolvedValue({
      account: null,
      entries: [],
      opening_balance: 0,
      closing_balance: 0,
      total_debits: 0,
      total_credits: 0
    });
  });

  it('should render accounting interface with all tabs', async () => {
    render(<AccountingInterface />);

    // Check if main tabs are present
    expect(screen.getByText('دفتر حساب‌ها')).toBeInTheDocument();
    expect(screen.getByText('دفتر کل')).toBeInTheDocument();
    expect(screen.getByText('اسناد حسابداری')).toBeInTheDocument();
    expect(screen.getByText('تراز آزمایشی')).toBeInTheDocument();
  });

  it('should load chart of accounts on mount', async () => {
    render(<AccountingInterface />);

    await waitFor(() => {
      expect(accountingService.getChartOfAccounts).toHaveBeenCalled();
    });
  });

  it('should handle service calls without errors', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<AccountingInterface />);

    // Wait for initial load
    await waitFor(() => {
      expect(accountingService.getChartOfAccounts).toHaveBeenCalled();
    });

    // Should not have any console errors
    expect(consoleSpy).not.toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });

  it('should render without crashing when services fail', async () => {
    // Mock service failures
    (accountingService.getChartOfAccounts as any).mockRejectedValue(new Error('Network error'));
    (accountingService.getAccounts as any).mockRejectedValue(new Error('Network error'));
    
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<AccountingInterface />);

    // Should still render the interface
    expect(screen.getByText('دفتر حساب‌ها')).toBeInTheDocument();
    
    consoleSpy.mockRestore();
  });

  it('should have proper component structure', () => {
    render(<AccountingInterface />);

    // Check for main container
    const tabsContainer = document.querySelector('[role="tablist"]') || 
                         document.querySelector('.grid-cols-4') ||
                         screen.getByText('دفتر حساب‌ها').closest('div');
    
    expect(tabsContainer).toBeInTheDocument();
  });
});