import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, beforeEach, expect } from 'vitest';
import { ProfitLossStatement } from '@/components/accounting/ProfitLossStatement';

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

describe('ProfitLossStatement Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    renderWithQueryClient(<ProfitLossStatement />);
    
    // Should show loading skeleton - check for animate-pulse class
    const loadingElements = document.querySelectorAll('.animate-pulse');
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('renders P&L summary cards after loading', async () => {
    renderWithQueryClient(<ProfitLossStatement />);
    
    await waitFor(() => {
      expect(screen.getByText('کل درآمد')).toBeInTheDocument();
      expect(screen.getByText('کل هزینه‌ها')).toBeInTheDocument();
      expect(screen.getByText('سود ناخالص')).toBeInTheDocument();
      expect(screen.getByText('سود خالص')).toBeInTheDocument();
    });
  });

  it('displays P&L statement with revenue and expense categories', async () => {
    renderWithQueryClient(<ProfitLossStatement />);
    
    await waitFor(() => {
      // Revenue categories
      expect(screen.getByText('درآمدها')).toBeInTheDocument();
      expect(screen.getByText('درآمد فروش')).toBeInTheDocument();
      expect(screen.getByText('سایر درآمدها')).toBeInTheDocument();
      
      // Expense categories
      expect(screen.getByText('هزینه‌ها')).toBeInTheDocument();
      expect(screen.getByText('بهای تمام شده کالای فروخته شده')).toBeInTheDocument();
      expect(screen.getByText('هزینه‌های عملیاتی')).toBeInTheDocument();
    });
  });

  it('shows individual accounts within categories', async () => {
    renderWithQueryClient(<ProfitLossStatement />);
    
    await waitFor(() => {
      // Revenue accounts
      expect(screen.getByText('فروش کالا')).toBeInTheDocument();
      expect(screen.getByText('فروش خدمات')).toBeInTheDocument();
      expect(screen.getByText('درآمد سود بانکی')).toBeInTheDocument();
      
      // Expense accounts
      expect(screen.getByText('خرید کالا')).toBeInTheDocument();
      expect(screen.getByText('حقوق و دستمزد')).toBeInTheDocument();
      expect(screen.getByText('اجاره')).toBeInTheDocument();
      expect(screen.getByText('برق و گاز')).toBeInTheDocument();
    });
  });

  it('displays P&L statement title and period', async () => {
    renderWithQueryClient(<ProfitLossStatement />);
    
    await waitFor(() => {
      expect(screen.getByText('گزارش سود و زیان')).toBeInTheDocument();
    });
  });

  it('shows export buttons', async () => {
    renderWithQueryClient(<ProfitLossStatement />);
    
    await waitFor(() => {
      expect(screen.getByText('CSV')).toBeInTheDocument();
      expect(screen.getByText('PDF')).toBeInTheDocument();
    });
  });
});