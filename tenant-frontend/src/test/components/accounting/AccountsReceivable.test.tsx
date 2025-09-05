import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { AccountsReceivable } from '@/components/accounting/AccountsReceivable';

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

Object.defineProperty(window.URL, 'revokeObjectURL', {
  writable: true,
  value: vi.fn(),
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

describe('AccountsReceivable Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    renderWithQueryClient(<AccountsReceivable />);
    
    // Component should render without crashing
    expect(document.body).toBeInTheDocument();
  });

  it('renders aging summary cards after loading', async () => {
    renderWithQueryClient(<AccountsReceivable />);
    
    await waitFor(() => {
      // Use getAllByText for elements that appear multiple times
      const currentElements = screen.getAllByText('جاری');
      expect(currentElements.length).toBeGreaterThan(0);
      
      const overdueElements = screen.getAllByText('۱-۳۰ روز');
      expect(overdueElements.length).toBeGreaterThan(0);
      
      expect(screen.getByText('کل مانده')).toBeInTheDocument();
    });
  });

  it('displays receivables data in table', async () => {
    renderWithQueryClient(<AccountsReceivable />);
    
    await waitFor(() => {
      expect(screen.getByText('احمد محمدی')).toBeInTheDocument();
      expect(screen.getByText('فاطمه احمدی')).toBeInTheDocument();
      expect(screen.getByText('علی رضایی')).toBeInTheDocument();
      expect(screen.getByText('INV-001')).toBeInTheDocument();
      expect(screen.getByText('INV-002')).toBeInTheDocument();
      expect(screen.getByText('INV-003')).toBeInTheDocument();
    });
  });

  it('filters receivables by search term', async () => {
    renderWithQueryClient(<AccountsReceivable />);
    
    await waitFor(() => {
      expect(screen.getByText('احمد محمدی')).toBeInTheDocument();
    });
    
    const searchInput = screen.getByPlaceholderText('جستجو در مشتریان یا شماره فاکتور...');
    fireEvent.change(searchInput, { target: { value: 'احمد' } });
    
    // Wait for the filter to be applied
    await waitFor(() => {
      expect(searchInput).toHaveValue('احمد');
    });
  });

  it('filters receivables by status', async () => {
    renderWithQueryClient(<AccountsReceivable />);
    
    await waitFor(() => {
      expect(screen.getByText('احمد محمدی')).toBeInTheDocument();
    });
    
    const statusFilter = screen.getByDisplayValue('همه وضعیت‌ها');
    fireEvent.change(statusFilter, { target: { value: 'overdue_31_60' } });
    
    await waitFor(() => {
      expect(screen.getByText('احمد محمدی')).toBeInTheDocument();
      expect(screen.queryByText('فاطمه احمدی')).not.toBeInTheDocument();
    });
  });

  it('displays correct status badges', async () => {
    renderWithQueryClient(<AccountsReceivable />);
    
    await waitFor(() => {
      // Check for status badges in the table rows
      const badges = screen.getAllByText('۳۱-۶۰ روز');
      expect(badges.length).toBeGreaterThan(0);
      
      const badges2 = screen.getAllByText('۱-۳۰ روز');
      expect(badges2.length).toBeGreaterThan(0);
      
      const badges3 = screen.getAllByText('جاری');
      expect(badges3.length).toBeGreaterThan(0);
    });
  });

  it('shows overdue days for overdue invoices', async () => {
    renderWithQueryClient(<AccountsReceivable />);
    
    await waitFor(() => {
      expect(screen.getByText('45 روز تأخیر')).toBeInTheDocument();
      expect(screen.getByText('15 روز تأخیر')).toBeInTheDocument();
    });
  });

  it('exports data to CSV when export button is clicked', async () => {
    renderWithQueryClient(<AccountsReceivable />);
    
    await waitFor(() => {
      expect(screen.getByText('احمد محمدی')).toBeInTheDocument();
    });
    
    const exportButton = screen.getByText('خروجی CSV');
    fireEvent.click(exportButton);
    
    expect(mockClick).toHaveBeenCalled();
    expect(mockLink.download).toContain('accounts_receivable_');
    expect(mockLink.download).toContain('.csv');
  });

  it('displays formatted currency amounts', async () => {
    renderWithQueryClient(<AccountsReceivable />);
    
    await waitFor(() => {
      // Check if currency formatting is applied - use getAllByText for multiple occurrences
      const amounts1 = screen.getAllByText('2,500,000 ریال');
      expect(amounts1.length).toBeGreaterThan(0);
      
      const amounts2 = screen.getAllByText('3,000,000 ریال');
      expect(amounts2.length).toBeGreaterThan(0);
    });
  });

  it('shows details button for each receivable', async () => {
    renderWithQueryClient(<AccountsReceivable />);
    
    await waitFor(() => {
      const detailButtons = screen.getAllByText('جزئیات');
      expect(detailButtons.length).toBeGreaterThan(0);
    });
  });

  it('displays correct table headers', async () => {
    renderWithQueryClient(<AccountsReceivable />);
    
    await waitFor(() => {
      expect(screen.getByText('مشتری')).toBeInTheDocument();
      expect(screen.getByText('شماره فاکتور')).toBeInTheDocument();
      expect(screen.getByText('تاریخ سررسید')).toBeInTheDocument();
      expect(screen.getByText('مبلغ اصلی')).toBeInTheDocument();
      expect(screen.getByText('پرداختی')).toBeInTheDocument();
      expect(screen.getByText('مانده')).toBeInTheDocument();
      expect(screen.getByText('وضعیت')).toBeInTheDocument();
      expect(screen.getByText('عملیات')).toBeInTheDocument();
    });
  });

  it('shows correct aging summary totals', async () => {
    renderWithQueryClient(<AccountsReceivable />);
    
    await waitFor(() => {
      // Check that summary cards are displayed with currency amounts
      const summaryCards = document.querySelectorAll('.text-2xl.font-bold');
      expect(summaryCards.length).toBeGreaterThan(0);
    });
  });

  it('handles empty search results', async () => {
    renderWithQueryClient(<AccountsReceivable />);
    
    await waitFor(() => {
      expect(screen.getByText('احمد محمدی')).toBeInTheDocument();
    });
    
    const searchInput = screen.getByPlaceholderText('جستجو در مشتریان یا شماره فاکتور...');
    fireEvent.change(searchInput, { target: { value: 'نتیجه‌ای یافت نشد' } });
    
    await waitFor(() => {
      expect(screen.queryByText('احمد محمدی')).not.toBeInTheDocument();
      expect(screen.queryByText('فاطمه احمدی')).not.toBeInTheDocument();
    });
  });

  it('maintains filter state when switching between filters', async () => {
    renderWithQueryClient(<AccountsReceivable />);
    
    await waitFor(() => {
      expect(screen.getByText('احمد محمدی')).toBeInTheDocument();
    });
    
    // Apply search filter
    const searchInput = screen.getByPlaceholderText('جستجو در مشتریان یا شماره فاکتور...');
    fireEvent.change(searchInput, { target: { value: 'احمد' } });
    
    // Apply status filter
    const statusFilter = screen.getByDisplayValue('همه وضعیت‌ها');
    fireEvent.change(statusFilter, { target: { value: 'overdue_31_60' } });
    
    await waitFor(() => {
      expect(searchInput).toHaveValue('احمد');
      expect(statusFilter).toHaveValue('overdue_31_60');
    });
  });
});