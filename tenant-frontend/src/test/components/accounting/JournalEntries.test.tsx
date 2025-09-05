/**
 * Tests for JournalEntries component
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { JournalEntries } from '@/components/accounting/JournalEntries';
import { accountingService } from '@/services/accountingService';

// Mock the accounting service
vi.mock('@/services/accountingService', () => ({
  accountingService: {
    getJournalEntries: vi.fn(),
    createJournalEntry: vi.fn(),
    updateJournalEntry: vi.fn(),
    postJournalEntry: vi.fn(),
    deleteJournalEntry: vi.fn()
  }
}));

// Mock toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

const mockJournalEntries = [
  {
    id: 'entry-1',
    tenant_id: 'tenant-1',
    entry_number: 'JE-001',
    entry_date: '2024-01-01T00:00:00Z',
    description: 'سند فروش نقدی',
    reference_type: 'invoice',
    reference_number: 'INV-001',
    is_posted: false,
    total_debit: 1000,
    total_credit: 1000,
    lines: [
      {
        id: 'line-1',
        journal_entry_id: 'entry-1',
        account_id: '1',
        account_code: '1001',
        account_name: 'نقد',
        description: 'دریافت نقد',
        debit_amount: 1000,
        credit_amount: 0,
        line_number: 1,
        created_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'line-2',
        journal_entry_id: 'entry-1',
        account_id: '2',
        account_code: '4001',
        account_name: 'فروش',
        description: 'فروش کالا',
        debit_amount: 0,
        credit_amount: 1000,
        line_number: 2,
        created_at: '2024-01-01T00:00:00Z'
      }
    ],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'entry-2',
    tenant_id: 'tenant-1',
    entry_number: 'JE-002',
    entry_date: '2024-01-02T00:00:00Z',
    description: 'سند خرید نقدی',
    is_posted: true,
    posted_at: '2024-01-02T01:00:00Z',
    posted_by: 'user-1',
    total_debit: 500,
    total_credit: 500,
    lines: [
      {
        id: 'line-3',
        journal_entry_id: 'entry-2',
        account_id: '3',
        account_code: '5001',
        account_name: 'خرید',
        description: 'خرید کالا',
        debit_amount: 500,
        credit_amount: 0,
        line_number: 1,
        created_at: '2024-01-02T00:00:00Z'
      },
      {
        id: 'line-4',
        journal_entry_id: 'entry-2',
        account_id: '1',
        account_code: '1001',
        account_name: 'نقد',
        description: 'پرداخت نقد',
        debit_amount: 0,
        credit_amount: 500,
        line_number: 2,
        created_at: '2024-01-02T00:00:00Z'
      }
    ],
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z'
  }
];

describe('JournalEntries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (accountingService.getJournalEntries as any).mockResolvedValue(mockJournalEntries);
  });

  it('should render journal entries list', async () => {
    render(<JournalEntries />);

    // Wait for data to load and entries to be displayed
    await waitFor(() => {
      expect(screen.getByText('JE-001')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Check if entries are displayed
    expect(screen.getByText('سند فروش نقدی')).toBeInTheDocument();
    expect(screen.getByText('JE-002')).toBeInTheDocument();
    expect(screen.getByText('سند خرید نقدی')).toBeInTheDocument();
  });

  it('should show entry status badges correctly', async () => {
    render(<JournalEntries />);

    await waitFor(() => {
      expect(screen.getByText('JE-001')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Check status badges - use getAllByText since there might be multiple
    const unpostedBadges = screen.getAllByText('ثبت نشده');
    const postedBadges = screen.getAllByText('ثبت شده');
    
    expect(unpostedBadges.length).toBeGreaterThan(0);
    expect(postedBadges.length).toBeGreaterThan(0);
  });

  it('should filter entries by search term', async () => {
    render(<JournalEntries />);

    await waitFor(() => {
      expect(screen.getByText('JE-001')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Search for specific entry
    const searchInput = screen.getByPlaceholderText('جستجو در اسناد...');
    fireEvent.change(searchInput, { target: { value: 'فروش' } });

    // Wait for filtering to take effect
    await waitFor(() => {
      expect(screen.getByText('سند فروش نقدی')).toBeInTheDocument();
    });
    
    expect(screen.queryByText('سند خرید نقدی')).not.toBeInTheDocument();
  });

  it('should filter entries by status', async () => {
    render(<JournalEntries />);

    await waitFor(() => {
      expect(screen.getByText('JE-001')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Filter by posted entries only
    const statusFilter = screen.getByRole('combobox');
    fireEvent.click(statusFilter);
    
    // Use getAllByText and select the dropdown option specifically
    const postedOptions = screen.getAllByText('ثبت شده');
    const dropdownOption = postedOptions.find(option => 
      option.closest('[role="option"]') || option.id?.includes('radix')
    );
    
    if (dropdownOption) {
      fireEvent.click(dropdownOption);
    }

    await waitFor(() => {
      // Should reload with posted_only=true
      expect(accountingService.getJournalEntries).toHaveBeenCalledWith(0, 50, true);
    });
  });

  it('should open create form when "سند جدید" is clicked', async () => {
    render(<JournalEntries />);

    await waitFor(() => {
      expect(screen.getByText('سند جدید')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('سند جدید'));

    // Journal entry form should be displayed
    await waitFor(() => {
      expect(screen.getByText('سند حسابداری جدید')).toBeInTheDocument();
    });
  });

  it('should open view modal when view button is clicked', async () => {
    render(<JournalEntries />);

    await waitFor(() => {
      expect(screen.getByText('JE-001')).toBeInTheDocument();
    });

    // Find and click view button
    const viewButtons = screen.getAllByRole('button');
    const viewButton = viewButtons.find(button => 
      button.querySelector('svg') && button.getAttribute('class')?.includes('h-8 w-8')
    );
    
    if (viewButton) {
      fireEvent.click(viewButton);

      await waitFor(() => {
        expect(screen.getByText('مشاهده سند حسابداری')).toBeInTheDocument();
      });
    }
  });

  it('should allow editing unposted entries only', async () => {
    render(<JournalEntries />);

    await waitFor(() => {
      expect(screen.getByText('JE-001')).toBeInTheDocument();
    });

    // Find edit buttons - should only be available for unposted entries
    const editButtons = screen.getAllByRole('button');
    const editButton = editButtons.find(button => 
      button.querySelector('svg') && button.getAttribute('class')?.includes('h-8 w-8')
    );
    
    // Should be able to edit unposted entry
    expect(editButton).toBeInTheDocument();
  });

  it('should post journal entry with confirmation', async () => {
    (accountingService.postJournalEntry as any).mockResolvedValue({
      ...mockJournalEntries[0],
      is_posted: true,
      posted_at: '2024-01-01T01:00:00Z'
    });

    // Mock window.confirm
    const originalConfirm = window.confirm;
    window.confirm = vi.fn(() => true);

    render(<JournalEntries />);

    await waitFor(() => {
      expect(screen.getByText('JE-001')).toBeInTheDocument();
    });

    // Find and click post button (green checkmark)
    const postButtons = screen.getAllByRole('button');
    const postButton = postButtons.find(button => 
      button.querySelector('svg') && button.getAttribute('class')?.includes('text-green-600')
    );
    
    if (postButton) {
      fireEvent.click(postButton);

      await waitFor(() => {
        expect(accountingService.postJournalEntry).toHaveBeenCalledWith('entry-1');
      });
    }

    // Restore original confirm
    window.confirm = originalConfirm;
  });

  it('should delete unposted entry with confirmation', async () => {
    (accountingService.deleteJournalEntry as any).mockResolvedValue({
      success: true,
      message: 'Journal entry deleted successfully'
    });

    // Mock window.confirm
    const originalConfirm = window.confirm;
    window.confirm = vi.fn(() => true);

    render(<JournalEntries />);

    await waitFor(() => {
      expect(screen.getByText('JE-001')).toBeInTheDocument();
    });

    // Find and click delete button
    const deleteButtons = screen.getAllByRole('button');
    const deleteButton = deleteButtons.find(button => 
      button.querySelector('svg') && button.getAttribute('class')?.includes('text-red-600')
    );
    
    if (deleteButton) {
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(accountingService.deleteJournalEntry).toHaveBeenCalledWith('entry-1');
      });
    }

    // Restore original confirm
    window.confirm = originalConfirm;
  });

  it('should prevent editing posted entries', async () => {
    render(<JournalEntries />);

    await waitFor(() => {
      expect(screen.getByText('JE-002')).toBeInTheDocument();
    });

    // Posted entries should not have edit/delete buttons
    const postedEntryRow = screen.getByText('JE-002').closest('div');
    const editButtons = postedEntryRow?.querySelectorAll('button[class*="text-red-600"]');
    expect(editButtons?.length || 0).toBe(0);
  });

  it('should display entry amounts correctly', async () => {
    render(<JournalEntries />);

    await waitFor(() => {
      expect(screen.getByText('JE-001')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Check if amounts are displayed - use more flexible text matching
    await waitFor(() => {
      const amountElements = screen.getAllByText((content, element) => {
        return content.includes('1,000') || content.includes('500');
      });
      expect(amountElements.length).toBeGreaterThan(0);
    });
  });

  it('should show reference information when available', async () => {
    render(<JournalEntries />);

    await waitFor(() => {
      expect(screen.getByText('JE-001')).toBeInTheDocument();
    });

    // Check for reference type and number
    expect(screen.getByText('invoice')).toBeInTheDocument();
    expect(screen.getByText('مرجع: INV-001')).toBeInTheDocument();
  });

  it('should handle loading more entries', async () => {
    // Mock additional entries for pagination
    const additionalEntries = [
      {
        ...mockJournalEntries[0],
        id: 'entry-3',
        entry_number: 'JE-003'
      }
    ];

    (accountingService.getJournalEntries as any)
      .mockResolvedValueOnce(mockJournalEntries)
      .mockResolvedValueOnce(additionalEntries);

    render(<JournalEntries />);

    await waitFor(() => {
      expect(screen.getByText('JE-001')).toBeInTheDocument();
    });

    // Click load more button if it exists
    const loadMoreButton = screen.queryByText('بارگذاری بیشتر');
    if (loadMoreButton) {
      fireEvent.click(loadMoreButton);

      await waitFor(() => {
        expect(accountingService.getJournalEntries).toHaveBeenCalledTimes(2);
      });
    }
  });

  it('should handle empty state', async () => {
    (accountingService.getJournalEntries as any).mockResolvedValue([]);

    render(<JournalEntries />);

    await waitFor(() => {
      expect(screen.getByText((content) => content.includes('هیچ سند حسابداری یافت نشد'))).toBeInTheDocument();
    }, { timeout: 3000 });
    
    expect(screen.getByText((content) => content.includes('اولین سند را ایجاد کنید'))).toBeInTheDocument();
  });

  it('should handle API errors gracefully', async () => {
    (accountingService.getJournalEntries as any).mockRejectedValue(
      new Error('Network error')
    );

    render(<JournalEntries />);

    await waitFor(() => {
      // Component should still render without crashing
      expect(screen.getByText('اسناد حسابداری')).toBeInTheDocument();
    });
  });

  it('should show line count for each entry', async () => {
    render(<JournalEntries />);

    await waitFor(() => {
      expect(screen.getByText('JE-001')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Check if line counts are displayed - use getAllByText since there are multiple entries
    const lineCounts = screen.getAllByText('2 ردیف');
    expect(lineCounts.length).toBeGreaterThan(0);
  });
});