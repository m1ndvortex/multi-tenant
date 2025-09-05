import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import GoldInstallmentOverview from '@/components/installments/GoldInstallmentOverview';
import { InstallmentDetail, OutstandingBalance } from '@/services/installmentService';

const mockGoldInstallments: InstallmentDetail[] = [
  {
    id: '1',
    invoice_id: 'inv-1',
    installment_number: 1,
    installment_type: 'gold',
    status: 'paid',
    amount_paid: 5200000,
    due_date: '2024-01-15',
    paid_at: '2024-01-14T10:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-14T10:00:00Z',
    remaining_amount: 0,
    is_overdue: false,
    days_overdue: 0,
    is_fully_paid: true,
    gold_weight_due: 2.0,
    gold_weight_paid: 2.0,
    remaining_gold_weight: 0,
    gold_price_at_payment: 2600000,
  },
  {
    id: '2',
    invoice_id: 'inv-1',
    installment_number: 2,
    installment_type: 'gold',
    status: 'pending',
    amount_paid: 1300000,
    due_date: '2024-02-15',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    remaining_amount: 0,
    is_overdue: false,
    days_overdue: 0,
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
    status: 'overdue',
    amount_paid: 0,
    due_date: '2024-01-01',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    remaining_amount: 0,
    is_overdue: true,
    days_overdue: 10,
    is_fully_paid: false,
    gold_weight_due: 2.0,
    gold_weight_paid: 0,
    remaining_gold_weight: 2.0,
  },
  // Non-gold installment should be filtered out
  {
    id: '4',
    invoice_id: 'inv-1',
    installment_number: 4,
    installment_type: 'general',
    status: 'pending',
    amount_due: 1000000,
    amount_paid: 0,
    due_date: '2024-03-15',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    remaining_amount: 1000000,
    is_overdue: false,
    days_overdue: 0,
    is_fully_paid: false,
  },
];

const mockOutstandingBalance: OutstandingBalance = {
  invoice_id: 'inv-1',
  total_installments: 3,
  total_due: 15600000,
  total_paid: 6500000,
  outstanding_balance: 9100000,
  pending_installments: 1,
  paid_installments: 1,
  overdue_installments: 1,
  is_fully_paid: false,
  total_gold_weight_due: 6.0,
  total_gold_weight_paid: 2.5,
  remaining_gold_weight: 3.5,
};

const renderGoldInstallmentOverview = (props = {}) => {
  return render(
    <GoldInstallmentOverview
      installments={mockGoldInstallments}
      outstandingBalance={mockOutstandingBalance}
      currentGoldPrice={2650000}
      isLoading={false}
      {...props}
    />
  );
};

describe('GoldInstallmentOverview', () => {
  it('renders gold installment overview', () => {
    renderGoldInstallmentOverview();

    expect(screen.getByText('جدول اقساط طلا')).toBeInTheDocument();
  });

  it('displays gold weight summary cards correctly', () => {
    renderGoldInstallmentOverview();

    // Total gold weight: 2.0 + 2.0 + 2.0 = 6.0 grams
    expect(screen.getByText('6.000 گرم')).toBeInTheDocument();
    
    // Paid gold weight: 2.0 + 0.5 + 0 = 2.5 grams
    expect(screen.getByText('2.500 گرم')).toBeInTheDocument();
    
    // Remaining gold weight: 6.0 - 2.5 = 3.5 grams
    expect(screen.getByText('3.500 گرم')).toBeInTheDocument();
  });

  it('calculates completion percentage correctly', () => {
    renderGoldInstallmentOverview();

    // 2.5 / 6.0 * 100 = 41.7%
    expect(screen.getByText('41.7%')).toBeInTheDocument();
  });

  it('displays progress bar with correct value', () => {
    renderGoldInstallmentOverview();

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
  });

  it('shows current gold price and remaining value', () => {
    renderGoldInstallmentOverview();

    expect(screen.getByText('قیمت فعلی طلا')).toBeInTheDocument();
    expect(screen.getByText('2,650,000 ریال/گرم')).toBeInTheDocument();
    
    // Remaining value: 3.5 grams * 2,650,000 = 9,275,000
    expect(screen.getByText('9,275,000 ریال')).toBeInTheDocument();
  });

  it('filters and displays only gold installments', () => {
    renderGoldInstallmentOverview();

    // Should show 3 gold installments
    expect(screen.getByText('قسط طلا شماره 1')).toBeInTheDocument();
    expect(screen.getByText('قسط طلا شماره 2')).toBeInTheDocument();
    expect(screen.getByText('قسط طلا شماره 3')).toBeInTheDocument();
    
    // Should not show general installment
    expect(screen.queryByText('قسط طلا شماره 4')).not.toBeInTheDocument();
  });

  it('shows correct status badges for different installment states', () => {
    renderGoldInstallmentOverview();

    // Paid installment
    expect(screen.getByText('پرداخت شده')).toBeInTheDocument();
    
    // Overdue installment
    expect(screen.getByText('سررسید گذشته (10 روز)')).toBeInTheDocument();
    
    // Pending installment
    expect(screen.getByText('در انتظار')).toBeInTheDocument();
  });

  it('displays gold weight information for each installment', () => {
    renderGoldInstallmentOverview();

    // All installments should show 2.000 grams due
    const weightDueElements = screen.getAllByText('2.000 گرم');
    expect(weightDueElements.length).toBeGreaterThan(0);
  });

  it('shows payment information for paid installments', () => {
    renderGoldInstallmentOverview();

    // Paid installment should show payment date
    expect(screen.getByText('تاریخ پرداخت')).toBeInTheDocument();
    expect(screen.getByText('1402/10/24')).toBeInTheDocument(); // Persian date
    
    // Should show gold price at payment
    expect(screen.getByText('قیمت: 2,600,000 ریال/گرم')).toBeInTheDocument();
  });

  it('shows remaining gold weight for unpaid installments', () => {
    renderGoldInstallmentOverview();

    // Partial payment installment: 1.5 grams remaining
    expect(screen.getByText('1.500 گرم')).toBeInTheDocument();
    
    // Unpaid installment: 2.0 grams remaining
    const remainingElements = screen.getAllByText('2.000 گرم');
    expect(remainingElements.length).toBeGreaterThan(1);
  });

  it('shows estimated value for remaining gold weight', () => {
    renderGoldInstallmentOverview();

    // 1.5 grams * 2,650,000 = 3,975,000
    expect(screen.getByText('≈ 3,975,000 ریال')).toBeInTheDocument();
    
    // 2.0 grams * 2,650,000 = 5,300,000
    expect(screen.getByText('≈ 5,300,000 ریال')).toBeInTheDocument();
  });

  it('shows progress bar for partial payments', () => {
    renderGoldInstallmentOverview();

    // Installment with partial payment should show progress
    expect(screen.getByText('پیشرفت پرداخت')).toBeInTheDocument();
    
    // 0.5 / 2.0 * 100 = 25%
    expect(screen.getByText('25.0%')).toBeInTheDocument();
  });

  it('applies correct styling for different installment states', () => {
    renderGoldInstallmentOverview();

    // Overdue installment should have red styling
    const overdueInstallment = screen.getByText('قسط طلا شماره 3').closest('div');
    expect(overdueInstallment).toHaveClass('border-red-200', 'bg-red-50');
    
    // Paid installment should have green styling
    const paidInstallment = screen.getByText('قسط طلا شماره 1').closest('div');
    expect(paidInstallment).toHaveClass('border-green-200', 'bg-green-50');
  });

  it('shows loading state', () => {
    renderGoldInstallmentOverview({ isLoading: true });

    // Should show loading skeletons
    const loadingElements = screen.getAllByRole('generic');
    const hasLoadingClass = loadingElements.some(el => 
      el.className.includes('animate-pulse')
    );
    expect(hasLoadingClass).toBe(true);
  });

  it('handles empty installments list', () => {
    renderGoldInstallmentOverview({ installments: [] });

    expect(screen.getByText('هیچ قسط طلایی یافت نشد')).toBeInTheDocument();
  });

  it('handles missing current gold price', () => {
    renderGoldInstallmentOverview({ currentGoldPrice: 0 });

    // Should not show current gold price section
    expect(screen.queryByText('قیمت فعلی طلا')).not.toBeInTheDocument();
    
    // Should not show estimated values
    expect(screen.queryByText(/≈.*ریال/)).not.toBeInTheDocument();
  });

  it('calculates statistics correctly with mixed installment types', () => {
    renderGoldInstallmentOverview();

    // Should only count gold installments in statistics
    // Total: 2.0 + 2.0 + 2.0 = 6.0 (excluding general installment)
    expect(screen.getByText('6.000 گرم')).toBeInTheDocument();
  });

  it('shows due dates in Persian format', () => {
    renderGoldInstallmentOverview();

    // Should show Persian formatted dates
    expect(screen.getByText('1402/10/25')).toBeInTheDocument(); // 2024-01-15
    expect(screen.getByText('1402/11/26')).toBeInTheDocument(); // 2024-02-15
  });

  it('handles installments without gold weight data', () => {
    const installmentsWithoutGoldData = [
      {
        ...mockGoldInstallments[0],
        gold_weight_due: undefined,
        gold_weight_paid: undefined,
        remaining_gold_weight: undefined,
      },
    ];

    renderGoldInstallmentOverview({ installments: installmentsWithoutGoldData });

    // Should handle missing gold data gracefully
    expect(screen.getByText('0.000 گرم')).toBeInTheDocument();
  });
});