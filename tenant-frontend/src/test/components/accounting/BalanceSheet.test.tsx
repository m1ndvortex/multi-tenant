import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, beforeEach, expect } from 'vitest';
import { BalanceSheet } from '@/components/accounting/BalanceSheet';

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

describe('BalanceSheet Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    renderWithQueryClient(<BalanceSheet />);
    
    // Should show loading skeleton - check for animate-pulse class
    const loadingElements = document.querySelectorAll('.animate-pulse');
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('renders balance sheet summary cards after loading', async () => {
    renderWithQueryClient(<BalanceSheet />);
    
    await waitFor(() => {
      expect(screen.getByText('کل دارایی‌ها')).toBeInTheDocument();
      expect(screen.getByText('کل بدهی‌ها')).toBeInTheDocument();
      expect(screen.getByText('حقوق مالکانه')).toBeInTheDocument();
      expect(screen.getByText('وضعیت تراز')).toBeInTheDocument();
    });
  });

  it('displays balance sheet sections correctly', async () => {
    renderWithQueryClient(<BalanceSheet />);
    
    await waitFor(() => {
      // Assets section
      expect(screen.getByText('دارایی‌ها')).toBeInTheDocument();
      expect(screen.getByText('دارایی‌های جاری')).toBeInTheDocument();
      expect(screen.getByText('دارایی‌های ثابت')).toBeInTheDocument();
      
      // Liabilities section
      expect(screen.getByText('بدهی‌ها')).toBeInTheDocument();
      expect(screen.getByText('بدهی‌های جاری')).toBeInTheDocument();
      expect(screen.getByText('بدهی‌های بلندمدت')).toBeInTheDocument();
      
      // Equity section
      expect(screen.getByText('حقوق صاحبان سهام')).toBeInTheDocument();
    });
  });

  it('shows individual accounts within categories', async () => {
    renderWithQueryClient(<BalanceSheet />);
    
    await waitFor(() => {
      // Asset accounts
      expect(screen.getByText('نقد و بانک')).toBeInTheDocument();
      expect(screen.getByText('حساب‌های دریافتنی')).toBeInTheDocument();
      expect(screen.getByText('موجودی کالا')).toBeInTheDocument();
      expect(screen.getByText('ساختمان')).toBeInTheDocument();
      expect(screen.getByText('تجهیزات')).toBeInTheDocument();
      
      // Liability accounts
      expect(screen.getByText('حساب‌های پرداختنی')).toBeInTheDocument();
      expect(screen.getByText('مالیات پرداختنی')).toBeInTheDocument();
      expect(screen.getByText('حقوق پرداختنی')).toBeInTheDocument();
      expect(screen.getByText('وام بانکی')).toBeInTheDocument();
      
      // Equity accounts
      expect(screen.getByText('سرمایه')).toBeInTheDocument();
      expect(screen.getByText('سود انباشته')).toBeInTheDocument();
    });
  });

  it('displays balance sheet title and date', async () => {
    renderWithQueryClient(<BalanceSheet />);
    
    await waitFor(() => {
      expect(screen.getByText('ترازنامه')).toBeInTheDocument();
    });
  });

  it('shows export buttons', async () => {
    renderWithQueryClient(<BalanceSheet />);
    
    await waitFor(() => {
      expect(screen.getByText('CSV')).toBeInTheDocument();
      expect(screen.getByText('PDF')).toBeInTheDocument();
    });
  });
});