/**
 * Tests for accounting service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { accountingService, AccountCreate, JournalEntryCreate } from '@/services/accountingService';

// Mock fetch
global.fetch = vi.fn();

describe('AccountingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'test-token');
  });

  describe('Chart of Accounts', () => {
    it('should get chart of accounts', async () => {
      const mockResponse = {
        accounts: [
          {
            id: '1',
            tenant_id: 'tenant-1',
            account_code: '1001',
            account_name: 'نقد',
            account_type: 'asset',
            parent_id: null,
            is_system_account: false,
            is_control_account: false,
            allow_posting: true,
            opening_balance: 0,
            current_balance: 1000,
            full_account_code: '1001',
            description: 'حساب نقد',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            is_active: true,
            children: [],
            level: 0
          }
        ],
        total_accounts: 1,
        accounts_by_type: { asset: 1 }
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await accountingService.getChartOfAccounts();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/accounting/chart-of-accounts'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          })
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should create account', async () => {
      const accountData: AccountCreate = {
        account_code: '1002',
        account_name: 'بانک',
        account_type: 'asset',
        opening_balance: 5000
      };

      const mockResponse = {
        id: '2',
        tenant_id: 'tenant-1',
        ...accountData,
        current_balance: 5000,
        full_account_code: '1002',
        is_system_account: false,
        is_control_account: false,
        allow_posting: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        is_active: true
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await accountingService.createAccount(accountData);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/accounting/accounts'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(accountData),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token'
          })
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should update account', async () => {
      const accountId = '1';
      const updateData = {
        account_name: 'نقد - به‌روزرسانی شده'
      };

      const mockResponse = {
        id: accountId,
        tenant_id: 'tenant-1',
        account_code: '1001',
        account_name: 'نقد - به‌روزرسانی شده',
        account_type: 'asset',
        parent_id: null,
        is_system_account: false,
        is_control_account: false,
        allow_posting: true,
        opening_balance: 0,
        current_balance: 1000,
        full_account_code: '1001',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T01:00:00Z',
        is_active: true
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await accountingService.updateAccount(accountId, updateData);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/accounting/accounts/${accountId}`),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updateData)
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should delete account', async () => {
      const accountId = '1';
      const mockResponse = {
        success: true,
        message: 'Account deleted successfully'
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await accountingService.deleteAccount(accountId);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/accounting/accounts/${accountId}`),
        expect.objectContaining({
          method: 'DELETE'
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Journal Entries', () => {
    it('should create journal entry', async () => {
      const entryData: JournalEntryCreate = {
        entry_date: '2024-01-01',
        description: 'سند تست',
        lines: [
          {
            account_id: '1',
            debit_amount: 1000,
            credit_amount: 0,
            line_number: 1
          },
          {
            account_id: '2',
            debit_amount: 0,
            credit_amount: 1000,
            line_number: 2
          }
        ]
      };

      const mockResponse = {
        id: 'entry-1',
        tenant_id: 'tenant-1',
        entry_number: 'JE-001',
        entry_date: '2024-01-01T00:00:00Z',
        description: 'سند تست',
        is_posted: false,
        total_debit: 1000,
        total_credit: 1000,
        lines: [
          {
            id: 'line-1',
            journal_entry_id: 'entry-1',
            account_id: '1',
            debit_amount: 1000,
            credit_amount: 0,
            line_number: 1,
            account_code: '1001',
            account_name: 'نقد',
            created_at: '2024-01-01T00:00:00Z'
          },
          {
            id: 'line-2',
            journal_entry_id: 'entry-1',
            account_id: '2',
            debit_amount: 0,
            credit_amount: 1000,
            line_number: 2,
            account_code: '2001',
            account_name: 'حساب پرداختنی',
            created_at: '2024-01-01T00:00:00Z'
          }
        ],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await accountingService.createJournalEntry(entryData);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/accounting/journal-entries'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(entryData)
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should get journal entries with filters', async () => {
      const mockResponse = [
        {
          id: 'entry-1',
          tenant_id: 'tenant-1',
          entry_number: 'JE-001',
          entry_date: '2024-01-01T00:00:00Z',
          description: 'سند تست',
          is_posted: true,
          total_debit: 1000,
          total_credit: 1000,
          lines: [],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await accountingService.getJournalEntries(0, 50, true);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/accounting/journal-entries?skip=0&limit=50&posted_only=true'),
        expect.any(Object)
      );
      expect(result).toEqual(mockResponse);
    });

    it('should post journal entry', async () => {
      const entryId = 'entry-1';
      const mockResponse = {
        id: entryId,
        tenant_id: 'tenant-1',
        entry_number: 'JE-001',
        entry_date: '2024-01-01T00:00:00Z',
        description: 'سند تست',
        is_posted: true,
        posted_at: '2024-01-01T01:00:00Z',
        posted_by: 'user-1',
        total_debit: 1000,
        total_credit: 1000,
        lines: [],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T01:00:00Z'
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await accountingService.postJournalEntry(entryId);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/accounting/journal-entries/${entryId}/post`),
        expect.objectContaining({
          method: 'POST'
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('General Ledger', () => {
    it('should get general ledger for account', async () => {
      const filter = {
        account_id: '1',
        date_from: '2024-01-01',
        date_to: '2024-01-31',
        posted_only: true,
        include_opening_balance: true
      };

      const mockResponse = {
        account: {
          id: '1',
          tenant_id: 'tenant-1',
          account_code: '1001',
          account_name: 'نقد',
          account_type: 'asset',
          parent_id: null,
          is_system_account: false,
          is_control_account: false,
          allow_posting: true,
          opening_balance: 0,
          current_balance: 1000,
          full_account_code: '1001',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          is_active: true
        },
        entries: [
          {
            entry_date: '2024-01-01T00:00:00Z',
            entry_number: 'JE-001',
            description: 'سند تست',
            debit_amount: 1000,
            credit_amount: 0,
            running_balance: 1000,
            is_opening_balance: false
          }
        ],
        opening_balance: 0,
        closing_balance: 1000,
        total_debits: 1000,
        total_credits: 0,
        period_from: '2024-01-01T00:00:00Z',
        period_to: '2024-01-31T23:59:59Z'
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await accountingService.getGeneralLedger(filter);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/accounting/general-ledger?account_id=1&date_from=2024-01-01&date_to=2024-01-31&posted_only=true&include_opening_balance=true'),
        expect.any(Object)
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Trial Balance', () => {
    it('should get trial balance', async () => {
      const asOfDate = '2024-01-31';
      const mockResponse = {
        entries: [
          {
            account_code: '1001',
            account_name: 'نقد',
            account_type: 'asset',
            debit_balance: 1000,
            credit_balance: 0
          },
          {
            account_code: '2001',
            account_name: 'حساب پرداختنی',
            account_type: 'liability',
            debit_balance: 0,
            credit_balance: 1000
          }
        ],
        total_debits: 1000,
        total_credits: 1000,
        is_balanced: true,
        as_of_date: '2024-01-31T23:59:59Z'
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await accountingService.getTrialBalance(asOfDate);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/accounting/trial-balance?as_of_date=${asOfDate}`),
        expect.any(Object)
      );
      expect(result).toEqual(mockResponse);
    });

    it('should get trial balance without date filter', async () => {
      const mockResponse = {
        entries: [],
        total_debits: 0,
        total_credits: 0,
        is_balanced: true,
        as_of_date: new Date().toISOString()
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await accountingService.getTrialBalance();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/accounting/trial-balance'),
        expect.any(Object)
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('Network error'));

      await expect(accountingService.getAccounts()).rejects.toThrow('Network error');
    });

    it('should handle HTTP errors', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ detail: 'Bad request' })
      });

      await expect(accountingService.getAccounts()).rejects.toThrow('Bad request');
    });

    it('should handle HTTP errors without JSON response', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => { throw new Error('Invalid JSON'); }
      });

      await expect(accountingService.getAccounts()).rejects.toThrow('HTTP 500');
    });
  });
});