import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, beforeEach, expect } from 'vitest';
import { BankReconciliation } from '@/components/accounting/BankReconciliation';

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

describe('BankReconciliation Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    renderWithQueryClient(<BankReconciliation />);
    
    // Should show loading skeleton - check for animate-pulse class
    const loadingElements = document.querySelectorAll('.animate-pulse');
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('renders reconciliation summary cards after loading', async () => {
    renderWithQueryClient(<BankReconciliation />);
    
    await waitFor(() => {
      expect(screen.getByText('موجودی بانک')).toBeInTheDocument();
      expect(screen.getByText('موجودی دفتر')).toBeInTheDocument();
      expect(screen.getByText('اختلاف')).toBeInTheDocument();
      expect(screen.getByText('تطبیق شده')).toBeInTheDocument();
    });
  });

  it('displays bank and book transactions', async () => {
    renderWithQueryClient(<BankReconciliation />);
    
    await waitFor(() => {
      // Bank transactions
      expect(screen.getByText('واریز نقدی')).toBeInTheDocument();
      expect(screen.getByText('پرداخت چک')).toBeInTheDocument();
      expect(screen.getByText('کارمزد بانک')).toBeInTheDocument();
      
      // Book transactions
      expect(screen.getByText('دریافت از مشتری')).toBeInTheDocument();
      expect(screen.getByText('پرداخت به تأمین‌کننده')).toBeInTheDocument();
      expect(screen.getByText('فروش نقدی')).toBeInTheDocument();
    });
  });

  it('shows upload bank statement button', async () => {
    renderWithQueryClient(<BankReconciliation />);
    
    await waitFor(() => {
      expect(screen.getByText('بارگذاری صورتحساب بانک')).toBeInTheDocument();
    });
  });

  it('shows match button', async () => {
    renderWithQueryClient(<BankReconciliation />);
    
    await waitFor(() => {
      expect(screen.getByText('تطبیق انتخاب شده')).toBeInTheDocument();
    });
  });

  it('shows export report button', async () => {
    renderWithQueryClient(<BankReconciliation />);
    
    await waitFor(() => {
      expect(screen.getByText('خروجی گزارش')).toBeInTheDocument();
    });
  });
});