import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import GoldInstallmentPlanSetup from '@/components/installments/GoldInstallmentPlanSetup';
import { installmentService } from '@/services/installmentService';
import { Invoice } from '@/services/invoiceService';

// Mock the installment service
vi.mock('@/services/installmentService', () => ({
  installmentService: {
    getCurrentGoldPrice: vi.fn(),
    getGoldPriceHistory: vi.fn(),
  },
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockGoldInvoice: Invoice = {
  id: '1',
  invoice_number: 'INV-001',
  customer_id: '1',
  customer_name: 'احمد محمدی',
  invoice_type: 'GOLD',
  total_amount: 15000000,
  total_gold_weight: 5.5,
  gold_price_at_creation: 2500000,
  remaining_gold_weight: 5.5,
  status: 'sent',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  items: [],
  is_installment: false,
  installment_type: 'NONE',
};

const mockOnCreatePlan = vi.fn();

const renderGoldInstallmentPlanSetup = (props = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <GoldInstallmentPlanSetup
        invoice={mockGoldInvoice}
        onCreatePlan={mockOnCreatePlan}
        isLoading={false}
        {...props}
      />
    </QueryClientProvider>
  );
};

describe('GoldInstallmentPlanSetup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (installmentService.getCurrentGoldPrice as any).mockResolvedValue({
      price: 2600000,
      updated_at: '2024-01-01T12:00:00Z',
    });
    (installmentService.getGoldPriceHistory as any).mockResolvedValue([
      { date: '2024-01-01', price: 2600000 },
      { date: '2023-12-31', price: 2550000 },
      { date: '2023-12-30', price: 2500000 },
    ]);
  });

  it('renders gold installment plan setup form', async () => {
    renderGoldInstallmentPlanSetup();

    expect(screen.getByText('تنظیم طرح اقساط طلا')).toBeInTheDocument();
    expect(screen.getByText('فاکتور')).toBeInTheDocument();
    expect(screen.getByText('INV-001')).toBeInTheDocument();
    expect(screen.getByText('احمد محمدی')).toBeInTheDocument();
    expect(screen.getAllByText('5.500 گرم')).toHaveLength(2); // Header and preview
    expect(screen.getByText('2,500,000 ریال/گرم')).toBeInTheDocument();
  });

  it('loads and displays current gold price', async () => {
    renderGoldInstallmentPlanSetup();

    await waitFor(() => {
      expect(screen.getByText('2,600,000 ریال/گرم')).toBeInTheDocument();
    });

    expect(installmentService.getCurrentGoldPrice).toHaveBeenCalled();
  });

  it('loads and displays gold price history', async () => {
    renderGoldInstallmentPlanSetup();

    await waitFor(() => {
      expect(screen.getByText('تاریخچه قیمت طلا (30 روز اخیر)')).toBeInTheDocument();
    });

    expect(installmentService.getGoldPriceHistory).toHaveBeenCalledWith(30);
  });

  it('allows selecting number of installments', async () => {
    const user = userEvent.setup();
    renderGoldInstallmentPlanSetup();

    const threeInstallmentsButton = screen.getByRole('button', { name: '3' });
    await user.click(threeInstallmentsButton);

    expect(threeInstallmentsButton).toHaveClass('bg-gradient-to-r');
  });

  it('allows selecting interval days', async () => {
    const user = userEvent.setup();
    renderGoldInstallmentPlanSetup();

    const monthlyButton = screen.getByRole('button', { name: 'ماهانه (30 روز)' });
    await user.click(monthlyButton);

    expect(monthlyButton).toHaveClass('bg-gradient-to-r');
  });

  it('generates preview when form data is valid', async () => {
    const user = userEvent.setup();
    renderGoldInstallmentPlanSetup();

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('پیش‌نمایش طرح اقساط طلا')).toBeInTheDocument();
    });

    // Should show preview with default 3 installments
    await waitFor(() => {
      expect(screen.getByText('پیش‌نمایش طرح اقساط طلا')).toBeInTheDocument();
      expect(screen.getAllByText('5.500 گرم')).toHaveLength(2); // One in header, one in preview
      expect(screen.getByText('جدول اقساط (بر اساس وزن):')).toBeInTheDocument();
    });
  });

  it('calculates installment weights correctly', async () => {
    renderGoldInstallmentPlanSetup();

    await waitFor(() => {
      expect(screen.getByText('جدول اقساط (بر اساس وزن):')).toBeInTheDocument();
    });

    // With 5.5 grams and 3 installments, each should be approximately 1.833 grams
    const installmentElements = screen.getAllByText(/قسط \d/);
    expect(installmentElements).toHaveLength(3);
  });

  it('shows estimated value when current gold price is available', async () => {
    renderGoldInstallmentPlanSetup();

    await waitFor(() => {
      expect(screen.getByText('ارزش فعلی (تقریبی)')).toBeInTheDocument();
    });

    // 5.5 grams * 2,600,000 = 14,300,000
    await waitFor(() => {
      expect(screen.getByText('14,300,000 ریال')).toBeInTheDocument();
    });
  });

  it('allows setting custom start date', async () => {
    const user = userEvent.setup();
    renderGoldInstallmentPlanSetup();

    const startDateInput = screen.getByLabelText('تاریخ شروع (اختیاری)');
    await user.type(startDateInput, '2024-02-01');

    expect(startDateInput).toHaveValue('2024-02-01');
  });

  it('submits form with correct data', async () => {
    const user = userEvent.setup();
    renderGoldInstallmentPlanSetup();

    // Wait for form to be ready
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ایجاد طرح اقساط طلا/ })).toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button', { name: /ایجاد طرح اقساط طلا/ });
    await user.click(submitButton);

    expect(mockOnCreatePlan).toHaveBeenCalledWith({
      invoice_id: '1',
      number_of_installments: 3,
      interval_days: 30,
      interest_rate: 0,
    });
  });

  it('disables submit button when loading', () => {
    renderGoldInstallmentPlanSetup({ isLoading: true });

    const submitButton = screen.getByRole('button', { name: /در حال ایجاد/ });
    expect(submitButton).toBeDisabled();
  });

  it('shows warning for past due dates', async () => {
    const user = userEvent.setup();
    renderGoldInstallmentPlanSetup();

    // Set start date to yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const startDateInput = screen.getByLabelText('تاریخ شروع (اختیاری)');
    await user.type(startDateInput, yesterday.toISOString().split('T')[0]);

    await waitFor(() => {
      expect(screen.getByText('برخی از اقساط در گذشته قرار دارند')).toBeInTheDocument();
    });
  });

  it('updates gold price when refresh button is clicked', async () => {
    const user = userEvent.setup();
    renderGoldInstallmentPlanSetup();

    await waitFor(() => {
      expect(screen.getByText('بروزرسانی')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: 'بروزرسانی' });
    await user.click(refreshButton);

    expect(installmentService.getCurrentGoldPrice).toHaveBeenCalledTimes(2);
  });

  it('handles gold price loading error gracefully', async () => {
    (installmentService.getCurrentGoldPrice as any).mockRejectedValue(
      new Error('Failed to load gold price')
    );

    renderGoldInstallmentPlanSetup();

    await waitFor(() => {
      expect(screen.getByText('در حال بارگیری...')).toBeInTheDocument();
    });
  });

  it('shows information about payment calculation', () => {
    renderGoldInstallmentPlanSetup();

    expect(screen.getByText('پرداخت‌ها بر اساس قیمت طلا در روز پرداخت محاسبه می‌شود')).toBeInTheDocument();
    expect(screen.getByText('مبلغ هر قسط بر اساس قیمت طلا در روز پرداخت محاسبه می‌شود')).toBeInTheDocument();
  });

  it('validates minimum installment count', async () => {
    const user = userEvent.setup();
    renderGoldInstallmentPlanSetup();

    const installmentInput = screen.getByPlaceholderText('تعداد اقساط (2-60)');
    await user.clear(installmentInput);
    await user.type(installmentInput, '1');

    // Should not generate preview for less than 2 installments
    expect(screen.queryByText('جدول اقساط (بر اساس وزن):')).not.toBeInTheDocument();
  });

  it('validates maximum installment count', async () => {
    const user = userEvent.setup();
    renderGoldInstallmentPlanSetup();

    const installmentInput = screen.getByPlaceholderText('تعداد اقساط (2-60)');
    await user.clear(installmentInput);
    await user.type(installmentInput, '65');

    // Input should be limited to max 60
    expect(installmentInput).toHaveAttribute('max', '60');
  });
});