import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import InstallmentManagement from '@/components/installments/InstallmentManagement';
import { installmentService } from '@/services/installmentService';
import { Invoice } from '@/services/invoiceService';

// Mock the installment service
vi.mock('@/services/installmentService');

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockInvoice: Invoice = {
  id: '1',
  tenant_id: 'tenant-1',
  customer_id: 'customer-1',
  invoice_number: 'INV-001',
  invoice_type: 'GENERAL',
  installment_type: 'GENERAL',
  subtotal: 1000000,
  tax_amount: 90000,
  total_amount: 1090000,
  is_shareable: true,
  status: 'sent',
  customer_name: 'احمد محمدی',
  customer_phone: '09123456789',
  items: [],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  is_active: true,
  is_installment: true,
  remaining_balance: 800000,
};

const mockInstallments = [
  {
    id: 'inst-1',
    invoice_id: '1',
    installment_number: 1,
    installment_type: 'general' as const,
    status: 'paid' as const,
    amount_due: 363333,
    amount_paid: 363333,
    due_date: '2024-01-15T00:00:00Z',
    paid_at: '2024-01-15T10:00:00Z',
    payment_method: 'cash',
    payment_reference: 'REF-001',
    notes: 'First payment',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    remaining_amount: 0,
    is_overdue: false,
    days_overdue: 0,
    is_fully_paid: true,
  },
  {
    id: 'inst-2',
    invoice_id: '1',
    installment_number: 2,
    installment_type: 'general' as const,
    status: 'pending' as const,
    amount_due: 363333,
    amount_paid: 0,
    due_date: '2024-02-15T00:00:00Z',
    paid_at: null,
    payment_method: null,
    payment_reference: null,
    notes: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    remaining_amount: 363333,
    is_overdue: false,
    days_overdue: 0,
    is_fully_paid: false,
  },
  {
    id: 'inst-3',
    invoice_id: '1',
    installment_number: 3,
    installment_type: 'general' as const,
    status: 'overdue' as const,
    amount_due: 363334,
    amount_paid: 0,
    due_date: '2024-01-10T00:00:00Z',
    paid_at: null,
    payment_method: null,
    payment_reference: null,
    notes: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    remaining_amount: 363334,
    is_overdue: true,
    days_overdue: 15,
    is_fully_paid: false,
  },
];

const mockOutstandingBalance = {
  invoice_id: '1',
  total_installments: 3,
  total_due: 1090000,
  total_paid: 363333,
  outstanding_balance: 726667,
  pending_installments: 1,
  paid_installments: 1,
  overdue_installments: 1,
  next_due_installment: {
    installment_id: 'inst-2',
    installment_number: 2,
    due_date: '2024-02-15T00:00:00Z',
    amount_due: 363333,
    is_overdue: false,
    days_overdue: 0,
  },
  is_fully_paid: false,
};

const mockPaymentHistory = {
  invoice_id: '1',
  payments: [
    {
      installment_id: 'inst-1',
      installment_number: 1,
      payment_date: '2024-01-15T10:00:00Z',
      amount_paid: 363333,
      payment_method: 'cash',
      payment_reference: 'REF-001',
      remaining_after_payment: 0,
      is_fully_paid: true,
    },
  ],
  total_payments: 1,
  total_amount_paid: 363333,
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('InstallmentManagement', () => {
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock service methods
    vi.mocked(installmentService.getInstallmentsForInvoice).mockResolvedValue(mockInstallments);
    vi.mocked(installmentService.getOutstandingBalance).mockResolvedValue(mockOutstandingBalance);
    vi.mocked(installmentService.getPaymentHistory).mockResolvedValue(mockPaymentHistory);
  });

  it('renders installment management interface', async () => {
    render(
      <InstallmentManagement invoice={mockInvoice} onBack={mockOnBack} />,
      { wrapper: createWrapper() }
    );

    // Check header
    expect(screen.getByText('مدیریت اقساط فاکتور INV-001')).toBeInTheDocument();
    expect(screen.getByText('مشتری: احمد محمدی | مبلغ کل: 1,090,000 ریال')).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('کل اقساط')).toBeInTheDocument();
    });

    // Check quick stats
    expect(screen.getByText('3')).toBeInTheDocument(); // Total installments
    expect(screen.getByText('1')).toBeInTheDocument(); // Paid installments
    expect(screen.getByText('726,667 ریال')).toBeInTheDocument(); // Outstanding balance
  });

  it('shows overdue alert badge when there are overdue installments', async () => {
    render(
      <InstallmentManagement invoice={mockInvoice} onBack={mockOnBack} />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('اقساط سررسید گذشته')).toBeInTheDocument();
    });
  });

  it('displays tabs for installment management', async () => {
    render(
      <InstallmentManagement invoice={mockInvoice} onBack={mockOnBack} />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('نمای کلی')).toBeInTheDocument();
      expect(screen.getByText('ثبت پرداخت')).toBeInTheDocument();
      expect(screen.getByText('سررسید گذشته')).toBeInTheDocument();
      expect(screen.getByText('تاریخچه پرداخت')).toBeInTheDocument();
    });
  });

  it('switches between tabs correctly', async () => {
    render(
      <InstallmentManagement invoice={mockInvoice} onBack={mockOnBack} />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('نمای کلی')).toBeInTheDocument();
    });

    // Click on payment tab
    fireEvent.click(screen.getByText('ثبت پرداخت'));
    
    await waitFor(() => {
      expect(screen.getByText('ثبت پرداخت اقساط')).toBeInTheDocument();
    });
  });

  it('calls onBack when back button is clicked', async () => {
    render(
      <InstallmentManagement invoice={mockInvoice} onBack={mockOnBack} />,
      { wrapper: createWrapper() }
    );

    const backButton = screen.getByText('بازگشت');
    fireEvent.click(backButton);

    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  it('shows cancel plan button when installments exist', async () => {
    render(
      <InstallmentManagement invoice={mockInvoice} onBack={mockOnBack} />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('لغو طرح اقساط')).toBeInTheDocument();
    });
  });

  it('handles payment recording', async () => {
    const mockRecordPayment = vi.fn().mockResolvedValue({
      installment: mockInstallments[1],
      outstanding_balance: mockOutstandingBalance,
      message: 'Payment recorded successfully',
    });
    vi.mocked(installmentService.recordPayment).mockImplementation(mockRecordPayment);

    render(
      <InstallmentManagement invoice={mockInvoice} onBack={mockOnBack} />,
      { wrapper: createWrapper() }
    );

    // Switch to payment tab
    await waitFor(() => {
      fireEvent.click(screen.getByText('ثبت پرداخت'));
    });

    // Wait for payment interface to load
    await waitFor(() => {
      expect(screen.getByText('اقساط قابل پرداخت')).toBeInTheDocument();
    });

    // Find and click payment button for pending installment
    const paymentButtons = screen.getAllByText('ثبت پرداخت');
    fireEvent.click(paymentButtons[0]);

    // Payment dialog should open
    await waitFor(() => {
      expect(screen.getByText('ثبت پرداخت قسط 2')).toBeInTheDocument();
    });
  });

  it('displays payment history correctly', async () => {
    render(
      <InstallmentManagement invoice={mockInvoice} onBack={mockOnBack} />,
      { wrapper: createWrapper() }
    );

    // Switch to history tab
    await waitFor(() => {
      fireEvent.click(screen.getByText('تاریخچه پرداخت'));
    });

    await waitFor(() => {
      expect(screen.getByText('تاریخچه پرداخت‌ها')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument(); // Total payments
      expect(screen.getByText('363,333 ریال')).toBeInTheDocument(); // Total amount paid
    });
  });

  it('shows overdue installments in overdue tab', async () => {
    render(
      <InstallmentManagement invoice={mockInvoice} onBack={mockOnBack} />,
      { wrapper: createWrapper() }
    );

    // Switch to overdue tab
    await waitFor(() => {
      const overdueTab = screen.getByRole('tab', { name: /سررسید گذشته/ });
      fireEvent.click(overdueTab);
    });

    await waitFor(() => {
      expect(screen.getByText('هشدار: اقساط سررسید گذشته')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument(); // Number of overdue installments
    });
  });
});

describe('InstallmentManagement - No Installments', () => {
  const mockOnBack = vi.fn();
  const invoiceWithoutInstallments = {
    ...mockInvoice,
    is_installment: false,
    installment_type: 'NONE' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(installmentService.getInstallmentsForInvoice).mockResolvedValue([]);
  });

  it('shows installment plan setup when no installments exist', async () => {
    render(
      <InstallmentManagement invoice={invoiceWithoutInstallments} onBack={mockOnBack} />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('تنظیم طرح اقساط')).toBeInTheDocument();
    });
  });
});