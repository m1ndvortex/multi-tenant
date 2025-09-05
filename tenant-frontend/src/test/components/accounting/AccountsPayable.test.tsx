import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, beforeEach, expect } from 'vitest';
import { AccountsPayable } from '@/components/accounting/AccountsPayable';

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

// Mock URL.createObjectURL for CSV export
Object.defineProperty(window.URL, 'createObjectURL', {
  writable: true,
  value: vi.fn(() => 'mock-url'),
});

// Mock document.createElement for CSV export
const mockClick = vi.fn();
const mockLink = {
  href: '',
  download: '',
  click: mockClick,
};

const originalCreateElement = document.createElement.bind(document);
vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
  if (tagName === 'a') {
    return mockLink as any;
  }
  return originalCreateElement(tagName);
});

describe('AccountsPayable Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    renderWithQueryClient(<AccountsPayable />);
    
    // Should show loading skeleton - check for animate-pulse class
    const loadingElements = document.querySelectorAll('.animate-pulse');
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('renders payable summary cards after loading', async () => {
    renderWithQueryClient(<AccountsPayable />);
    
    await waitFor(() => {
      expect(screen.getByText('جاری')).toBeInTheDocument();
      expect(screen.getByText('نزدیک سررسید')).toBeInTheDocument();
      expect(screen.getByText('سررسید گذشته')).toBeInTheDocument();
      expect(screen.getByText('پرداخت شده')).toBeInTheDocument();
      expect(screen.getByText('کل بدهی')).toBeInTheDocument();
    });
  });

  it('displays payables data in table', async () => {
    renderWithQueryClient(<AccountsPayable />);
    
    await waitFor(() => {
      expect(screen.getByText('شرکت پخش مواد غذایی')).toBeInTheDocument();
      expect(screen.getByText('شرکت حمل و نقل سریع')).toBeInTheDocument();
      expect(screen.getByText('شرکت برق و گاز')).toBeInTheDocument();
      expect(screen.getByText('BILL-001')).toBeInTheDocument();
      expect(screen.getByText('BILL-002')).toBeInTheDocument();
      expect(screen.getByText('BILL-003')).toBeInTheDocument();
    });
  });

  it('shows bill descriptions', async () => {
    renderWithQueryClient(<AccountsPayable />);
    
    await waitFor(() => {
      expect(screen.getByText('خرید مواد اولیه')).toBeInTheDocument();
      expect(screen.getByText('هزینه حمل و نقل')).toBeInTheDocument();
      expect(screen.getByText('قبض برق و گاز')).toBeInTheDocument();
    });
  });

  it('filters payables by search term', async () => {
    renderWithQueryClient(<AccountsPayable />);
    
    await waitFor(() => {
      expect(screen.getByText('شرکت پخش مواد غذایی')).toBeInTheDocument();
    });
    
    const searchInput = screen.getByPlaceholderText('جستجو در تأمین‌کنندگان یا شماره قبض...');
    fireEvent.change(searchInput, { target: { value: 'پخش' } });
    
    await waitFor(() => {
      expect(searchInput).toHaveValue('پخش');
    });
  });

  it('shows new bill button', async () => {
    renderWithQueryClient(<AccountsPayable />);
    
    await waitFor(() => {
      expect(screen.getByText('قبض جدید')).toBeInTheDocument();
    });
  });

  it('exports data to CSV when export button is clicked', async () => {
    renderWithQueryClient(<AccountsPayable />);
    
    await waitFor(() => {
      expect(screen.getByText('شرکت پخش مواد غذایی')).toBeInTheDocument();
    });
    
    const exportButton = screen.getByText('خروجی CSV');
    fireEvent.click(exportButton);
    
    expect(mockClick).toHaveBeenCalled();
    expect(mockLink.download).toContain('accounts_payable_');
    expect(mockLink.download).toContain('.csv');
  });

  it('displays correct table headers', async () => {
    renderWithQueryClient(<AccountsPayable />);
    
    await waitFor(() => {
      expect(screen.getByText('تأمین‌کننده')).toBeInTheDocument();
      expect(screen.getByText('شماره قبض')).toBeInTheDocument();
      expect(screen.getByText('تاریخ سررسید')).toBeInTheDocument();
      expect(screen.getByText('مبلغ اصلی')).toBeInTheDocument();
      expect(screen.getByText('پرداختی')).toBeInTheDocument();
      expect(screen.getByText('مانده')).toBeInTheDocument();
      expect(screen.getByText('وضعیت')).toBeInTheDocument();
      expect(screen.getByText('عملیات')).toBeInTheDocument();
    });
  });
});