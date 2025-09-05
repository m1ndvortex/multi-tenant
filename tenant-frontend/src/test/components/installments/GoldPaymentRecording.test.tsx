import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import GoldPaymentRecording from '@/components/installments/GoldPaymentRecording';
import { InstallmentDetail, installmentService } from '@/services/installmentService';

// Mock the installment service
vi.mock('@/services/installmentService', () => ({
  installmentService: {
    getCurrentGoldPrice: vi.fn(),
  },
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockGoldInstallments: InstallmentDetail[] = [
  {
    id: '1',
    invoice_id: 'inv-1',
    installment_number: 1,
    installment_type: 'gold',
    status: 'pending',
    amount_paid: 0,
    due_date: '2024-02-01',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    remaining_amount: 0,
    is_overdue: false,
    days_overdue: 0,
    is_fully_paid: false,
    gold_weight_due: 2.0,
    gold_weight_paid: 0,
    remaining_gold_weight: 2.0,
  },
  {
    id: '2',
    invoice_id: 'inv-1',
    installment_number: 2,
    installment_type: 'gold',
    status: 'overdue',
    amount_paid: 1300000,
    due_date: '2024-01-15',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    remaining_amount: 0,
    is_overdue: true,
    days_overdue: 5,
    is_fully_paid: false,
    gold_weight_due: 2.0,
    gold_weight_paid: 0.5,
    remaining_gold_weight: 1.5,
    gold_price_at_payment: 2600000,
  },
  {
    id: '3',
    invoice_id: 'inv-1',
    installment_number: 3,
    installment_type: 'gold',
    status: 'paid',
    amount_paid: 5200000,
    due_date: '2024-03-01',
    paid_at: '2024-02-28T10:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-02-28T10:00:00Z',
    remaining_amount: 0,
    is_overdue: false,
    days_overdue: 0,
    is_fully_paid: true,
    gold_weight_due: 2.0,
    gold_weight_paid: 2.0,
    remaining_gold_weight: 0,
    gold_price_at_payment: 2600000,
  },
];

const mockOnRecordPayment = vi.fn();

const renderGoldPaymentRecording = (props = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <GoldPaymentRecording
        installments={mockGoldInstallments}
        onRecordPayment={mockOnRecordPayment}
        isLoading={false}
        {...props}
      />
    </QueryClientProvider>
  );
};

describe('GoldPaymentRecording', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (installmentService.getCurrentGoldPrice as any).mockResolvedValue({
      price: 2650000,
      updated_at: '2024-01-01T12:00:00Z',
    });
  });

  it('renders gold payment recording interface', async () => {
    renderGoldPaymentRecording();

    expect(screen.getByText('ثبت پرداخت اقساط طلا')).toBeInTheDocument();
    expect(screen.getByText('اقساط طلا قابل پرداخت')).toBeInTheDocument();
  });

  it('loads and displays current gold price', async () => {
    renderGoldPaymentRecording();

    await waitFor(() => {
      expect(screen.getByText('2,650,000 ریال/گرم')).toBeInTheDocument();
    });

    expect(installmentService.getCurrentGoldPrice).toHaveBeenCalled();
  });

  it('displays summary statistics correctly', async () => {
    renderGoldPaymentRecording();

    await waitFor(() => {
      // 2 unpaid installments (pending and overdue)
      expect(screen.getByText('2')).toBeInTheDocument();
      // 1 overdue installment
      expect(screen.getByText('1')).toBeInTheDocument();
      // Total remaining gold weight: 2.0 + 1.5 = 3.5 grams
      expect(screen.getByText('3.500 گرم')).toBeInTheDocument();
    });
  });

  it('filters and displays only unpaid gold installments', () => {
    renderGoldPaymentRecording();

    // Should show 2 unpaid installments (pending and overdue)
    expect(screen.getByText('قسط طلا شماره 1')).toBeInTheDocument();
    expect(screen.getByText('قسط طلا شماره 2')).toBeInTheDocument();
    // Should not show paid installment
    expect(screen.queryByText('قسط طلا شماره 3')).not.toBeInTheDocument();
  });

  it('shows correct status badges for installments', () => {
    renderGoldPaymentRecording();

    // Overdue installment should show overdue badge
    expect(screen.getByText('سررسید گذشته (5 روز)')).toBeInTheDocument();
    // Pending installment should show appropriate status
    expect(screen.getByText('در موعد')).toBeInTheDocument();
  });

  it('displays remaining gold weight prominently', () => {
    renderGoldPaymentRecording();

    expect(screen.getByText('مانده به گرم')).toBeInTheDocument();
    expect(screen.getByText('2.000 گرم')).toBeInTheDocument();
    expect(screen.getByText('1.500 گرم')).toBeInTheDocument();
  });

  it('shows estimated value in current gold price', async () => {
    renderGoldPaymentRecording();

    await waitFor(() => {
      // 2.0 grams * 2,650,000 = 5,300,000
      expect(screen.getByText('≈ 5,300,000 ریال')).toBeInTheDocument();
      // 1.5 grams * 2,650,000 = 3,975,000
      expect(screen.getByText('≈ 3,975,000 ریال')).toBeInTheDocument();
    });
  });

  it('opens payment dialog when payment button is clicked', async () => {
    const user = userEvent.setup();
    renderGoldPaymentRecording();

    const paymentButtons = screen.getAllByText('ثبت پرداخت');
    await user.click(paymentButtons[0]);

    expect(screen.getByText('ثبت پرداخت قسط طلا 1')).toBeInTheDocument();
  });

  it('pre-fills payment dialog with installment data', async () => {
    const user = userEvent.setup();
    renderGoldPaymentRecording();

    await waitFor(() => {
      expect(screen.getByText('2,650,000 ریال/گرم')).toBeInTheDocument();
    });

    const paymentButtons = screen.getAllByText('ثبت پرداخت');
    await user.click(paymentButtons[0]);

    // Should pre-fill with remaining gold weight
    expect(screen.getByDisplayValue('2')).toBeInTheDocument();
    // Should pre-fill with current gold price
    expect(screen.getByDisplayValue('2650000')).toBeInTheDocument();
  });

  it('calculates payment amount automatically', async () => {
    const user = userEvent.setup();
    renderGoldPaymentRecording();

    await waitFor(() => {
      expect(screen.getByText('2,650,000 ریال/گرم')).toBeInTheDocument();
    });

    const paymentButtons = screen.getAllByText('ثبت پرداخت');
    await user.click(paymentButtons[0]);

    // Should calculate: 2.0 grams * 2,650,000 = 5,300,000
    await waitFor(() => {
      expect(screen.getByText('5,300,000 ریال')).toBeInTheDocument();
    });
  });

  it('updates calculation when gold weight changes', async () => {
    const user = userEvent.setup();
    renderGoldPaymentRecording();

    await waitFor(() => {
      expect(screen.getByText('2,650,000 ریال/گرم')).toBeInTheDocument();
    });

    const paymentButtons = screen.getAllByText('ثبت پرداخت');
    await user.click(paymentButtons[0]);

    const weightInput = screen.getByPlaceholderText('وزن پرداختی');
    await user.clear(weightInput);
    await user.type(weightInput, '1.5');

    // Should calculate: 1.5 grams * 2,650,000 = 3,975,000
    await waitFor(() => {
      expect(screen.getByText('3,975,000 ریال')).toBeInTheDocument();
    });
  });

  it('updates calculation when gold price changes', async () => {
    const user = userEvent.setup();
    renderGoldPaymentRecording();

    await waitFor(() => {
      expect(screen.getByText('2,650,000 ریال/گرم')).toBeInTheDocument();
    });

    const paymentButtons = screen.getAllByText('ثبت پرداخت');
    await user.click(paymentButtons[0]);

    const priceInput = screen.getByPlaceholderText('قیمت طلا');
    await user.clear(priceInput);
    await user.type(priceInput, '2700000');

    // Should calculate: 2.0 grams * 2,700,000 = 5,400,000
    await waitFor(() => {
      expect(screen.getByText('5,400,000 ریال')).toBeInTheDocument();
    });
  });

  it('provides quick weight selection buttons', async () => {
    const user = userEvent.setup();
    renderGoldPaymentRecording();

    await waitFor(() => {
      expect(screen.getByText('2,650,000 ریال/گرم')).toBeInTheDocument();
    });

    const paymentButtons = screen.getAllByText('ثبت پرداخت');
    await user.click(paymentButtons[0]);

    const halfWeightButton = screen.getByRole('button', { name: 'نصف وزن' });
    await user.click(halfWeightButton);

    const weightInput = screen.getByPlaceholderText('وزن پرداختی');
    expect(weightInput).toHaveValue(1); // Half of 2.0
  });

  it('provides current price button', async () => {
    const user = userEvent.setup();
    renderGoldPaymentRecording();

    await waitFor(() => {
      expect(screen.getByText('2,650,000 ریال/گرم')).toBeInTheDocument();
    });

    const paymentButtons = screen.getAllByText('ثبت پرداخت');
    await user.click(paymentButtons[0]);

    // Change price first
    const priceInput = screen.getByPlaceholderText('قیمت طلا');
    await user.clear(priceInput);
    await user.type(priceInput, '2500000');

    // Click current price button
    const currentPriceButton = screen.getByRole('button', { name: 'قیمت فعلی' });
    await user.click(currentPriceButton);

    expect(priceInput).toHaveValue(2650000);
  });

  it('includes gold exchange payment method', async () => {
    const user = userEvent.setup();
    renderGoldPaymentRecording();

    const paymentButtons = screen.getAllByText('ثبت پرداخت');
    await user.click(paymentButtons[0]);

    const paymentMethodSelect = screen.getByRole('combobox');
    await user.click(paymentMethodSelect);

    expect(screen.getByText('تهاتر طلا')).toBeInTheDocument();
  });

  it('submits payment with correct gold data', async () => {
    const user = userEvent.setup();
    renderGoldPaymentRecording();

    await waitFor(() => {
      expect(screen.getByText('2,650,000 ریال/گرم')).toBeInTheDocument();
    });

    const paymentButtons = screen.getAllByText('ثبت پرداخت');
    await user.click(paymentButtons[0]);

    // Fill payment method
    const paymentMethodSelect = screen.getByRole('combobox');
    await user.click(paymentMethodSelect);
    await user.click(screen.getByText('نقدی'));

    // Submit form
    const submitButton = screen.getByRole('button', { name: /ثبت پرداخت/ });
    await user.click(submitButton);

    expect(mockOnRecordPayment).toHaveBeenCalledWith({
      installment_id: '1',
      payment_amount: 5300000, // 2.0 * 2,650,000
      payment_method: 'cash',
      payment_reference: '',
      notes: '',
      gold_weight_paid: 2,
      gold_price_at_payment: 2650000,
    });
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    renderGoldPaymentRecording();

    const paymentButtons = screen.getAllByText('ثبت پرداخت');
    await user.click(paymentButtons[0]);

    // Clear required fields
    const weightInput = screen.getByPlaceholderText('وزن پرداختی');
    await user.clear(weightInput);

    const submitButton = screen.getByRole('button', { name: /ثبت پرداخت/ });
    expect(submitButton).toBeDisabled();
  });

  it('shows loading state when submitting', () => {
    renderGoldPaymentRecording({ isLoading: true });

    // Should not show payment buttons when loading
    expect(screen.queryByText('ثبت پرداخت')).not.toBeInTheDocument();
  });

  it('shows completion message when all installments are paid', () => {
    const allPaidInstallments = mockGoldInstallments.map(inst => ({
      ...inst,
      status: 'paid' as const,
      remaining_gold_weight: 0,
    }));

    renderGoldPaymentRecording({ installments: allPaidInstallments });

    expect(screen.getByText('همه اقساط طلا پرداخت شده‌اند!')).toBeInTheDocument();
    expect(screen.getByText('تبریک! تمام اقساط طلا این فاکتور تسویه شده است.')).toBeInTheDocument();
  });

  it('refreshes gold price when refresh button is clicked', async () => {
    const user = userEvent.setup();
    renderGoldPaymentRecording();

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

    renderGoldPaymentRecording();

    await waitFor(() => {
      expect(screen.getByText('بارگیری...')).toBeInTheDocument();
    });
  });
});