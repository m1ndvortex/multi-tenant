/**
 * Accounting service for Chart of Accounts and General Ledger operations
 */

import { API_BASE_URL } from '@/lib/config';

// Types and interfaces
export interface Account {
  id: string;
  tenant_id: string;
  account_code: string;
  account_name: string;
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parent_id?: string;
  is_system_account: boolean;
  is_control_account: boolean;
  allow_posting: boolean;
  opening_balance: number;
  current_balance: number;
  full_account_code: string;
  description?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface AccountHierarchy extends Account {
  children: AccountHierarchy[];
  level: number;
}

export interface AccountCreate {
  account_code: string;
  account_name: string;
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parent_id?: string;
  is_system_account?: boolean;
  is_control_account?: boolean;
  allow_posting?: boolean;
  opening_balance?: number;
  description?: string;
}

export interface AccountUpdate {
  account_name?: string;
  account_type?: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parent_id?: string;
  is_control_account?: boolean;
  allow_posting?: boolean;
  description?: string;
}

export interface JournalEntryLine {
  id?: string;
  account_id: string;
  description?: string;
  debit_amount: number;
  credit_amount: number;
  line_number: number;
  account_code?: string;
  account_name?: string;
}

export interface JournalEntry {
  id?: string;
  tenant_id?: string;
  entry_number?: string;
  entry_date: string;
  description: string;
  reference_type?: string;
  reference_id?: string;
  reference_number?: string;
  is_posted: boolean;
  posted_at?: string;
  posted_by?: string;
  total_debit: number;
  total_credit: number;
  lines: JournalEntryLine[];
  created_at?: string;
  updated_at?: string;
}

export interface JournalEntryCreate {
  entry_date: string;
  description: string;
  reference_type?: string;
  reference_id?: string;
  reference_number?: string;
  lines: {
    account_id: string;
    description?: string;
    debit_amount: number;
    credit_amount: number;
    line_number: number;
  }[];
}

export interface JournalEntryUpdate {
  description?: string;
  reference_type?: string;
  reference_number?: string;
}

export interface GeneralLedgerEntry {
  entry_date: string;
  entry_number: string;
  description: string;
  reference_type?: string;
  reference_number?: string;
  debit_amount: number;
  credit_amount: number;
  running_balance: number;
  is_opening_balance: boolean;
}

export interface GeneralLedgerResponse {
  account: Account;
  entries: GeneralLedgerEntry[];
  opening_balance: number;
  closing_balance: number;
  total_debits: number;
  total_credits: number;
  period_from?: string;
  period_to?: string;
}

export interface GeneralLedgerFilter {
  account_id?: string;
  account_type?: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  date_from?: string;
  date_to?: string;
  posted_only?: boolean;
  include_opening_balance?: boolean;
}

export interface TrialBalanceEntry {
  account_code: string;
  account_name: string;
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  debit_balance: number;
  credit_balance: number;
}

export interface TrialBalanceResponse {
  entries: TrialBalanceEntry[];
  total_debits: number;
  total_credits: number;
  is_balanced: boolean;
  as_of_date: string;
}

export interface ChartOfAccountsResponse {
  accounts: AccountHierarchy[];
  total_accounts: number;
  accounts_by_type: Record<string, number>;
}

export interface PaymentMethod {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  account_id?: string;
  account_code?: string;
  account_name?: string;
  is_cash: boolean;
  requires_reference: boolean;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface PaymentMethodCreate {
  name: string;
  description?: string;
  account_id?: string;
  is_cash?: boolean;
  requires_reference?: boolean;
}

export interface PaymentMethodUpdate {
  name?: string;
  description?: string;
  account_id?: string;
  is_cash?: boolean;
  requires_reference?: boolean;
}

class AccountingService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/api/accounting`;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
  const token = localStorage.getItem('tenant_token');
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Network error' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Chart of Accounts methods
  async getChartOfAccounts(): Promise<ChartOfAccountsResponse> {
    return this.request<ChartOfAccountsResponse>('/chart-of-accounts');
  }

  async getAccounts(accountType?: string): Promise<Account[]> {
    const params = new URLSearchParams();
    if (accountType) {
      params.append('account_type', accountType);
    }
    
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<Account[]>(`/accounts${query}`);
  }

  async getAccount(accountId: string): Promise<Account> {
    return this.request<Account>(`/accounts/${accountId}`);
  }

  async createAccount(accountData: AccountCreate): Promise<Account> {
    return this.request<Account>('/accounts', {
      method: 'POST',
      body: JSON.stringify(accountData),
    });
  }

  async updateAccount(accountId: string, accountData: AccountUpdate): Promise<Account> {
    return this.request<Account>(`/accounts/${accountId}`, {
      method: 'PUT',
      body: JSON.stringify(accountData),
    });
  }

  async deleteAccount(accountId: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/accounts/${accountId}`, {
      method: 'DELETE',
    });
  }

  // Journal Entry methods
  async getJournalEntries(
    skip: number = 0,
    limit: number = 100,
    postedOnly: boolean = false
  ): Promise<JournalEntry[]> {
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
      posted_only: postedOnly.toString(),
    });
    
    return this.request<JournalEntry[]>(`/journal-entries?${params.toString()}`);
  }

  async getJournalEntry(entryId: string): Promise<JournalEntry> {
    return this.request<JournalEntry>(`/journal-entries/${entryId}`);
  }

  async createJournalEntry(entryData: JournalEntryCreate): Promise<JournalEntry> {
    return this.request<JournalEntry>('/journal-entries', {
      method: 'POST',
      body: JSON.stringify(entryData),
    });
  }

  async updateJournalEntry(entryId: string, entryData: JournalEntryUpdate): Promise<JournalEntry> {
    return this.request<JournalEntry>(`/journal-entries/${entryId}`, {
      method: 'PUT',
      body: JSON.stringify(entryData),
    });
  }

  async postJournalEntry(entryId: string): Promise<JournalEntry> {
    return this.request<JournalEntry>(`/journal-entries/${entryId}/post`, {
      method: 'POST',
    });
  }

  async deleteJournalEntry(entryId: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/journal-entries/${entryId}`, {
      method: 'DELETE',
    });
  }

  // General Ledger methods
  async getGeneralLedger(filter: GeneralLedgerFilter): Promise<GeneralLedgerResponse> {
    const params = new URLSearchParams();
    
    if (filter.account_id) params.append('account_id', filter.account_id);
    if (filter.date_from) params.append('date_from', filter.date_from);
    if (filter.date_to) params.append('date_to', filter.date_to);
    if (filter.posted_only !== undefined) params.append('posted_only', filter.posted_only.toString());
    if (filter.include_opening_balance !== undefined) params.append('include_opening_balance', filter.include_opening_balance.toString());
    
    return this.request<GeneralLedgerResponse>(`/general-ledger?${params.toString()}`);
  }

  async getTrialBalance(asOfDate?: string): Promise<TrialBalanceResponse> {
    const params = new URLSearchParams();
    if (asOfDate) {
      params.append('as_of_date', asOfDate);
    }
    
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<TrialBalanceResponse>(`/trial-balance${query}`);
  }

  // Payment Method methods
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    return this.request<PaymentMethod[]>('/payment-methods');
  }

  async createPaymentMethod(methodData: PaymentMethodCreate): Promise<PaymentMethod> {
    return this.request<PaymentMethod>('/payment-methods', {
      method: 'POST',
      body: JSON.stringify(methodData),
    });
  }

  async updatePaymentMethod(methodId: string, methodData: PaymentMethodUpdate): Promise<PaymentMethod> {
    return this.request<PaymentMethod>(`/payment-methods/${methodId}`, {
      method: 'PUT',
      body: JSON.stringify(methodData),
    });
  }

  async deletePaymentMethod(methodId: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/payment-methods/${methodId}`, {
      method: 'DELETE',
    });
  }
}

export const accountingService = new AccountingService();