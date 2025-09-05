import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import InstallmentPlanSetup from '@/components/installments/InstallmentPlanSetup';
import { Invoice } from '@/services/invoiceService';

const mockInvoice: Invoice = {
  id: '1',
  tenant_id: 'tenant-1',
  customer_id: 'customer-1',
  invoice_number: 'INV-001',
  invoice_type: 'GENERAL',
  installment_type: 'NONE',
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
};

describe('InstallmentPlanSetup', () => {
  const mockOnCreatePlan = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders installment plan setup form', () => {
    render(
      <InstallmentPlanSetup
        invoice={mockInvoice}
        onCreatePlan={mockOnCreatePlan}
        isLoading={false}
      />
    );

    // Check header
    expect(screen.getByText('تنظیم طرح اقساط')).toBeInTheDocument();
    expect(screen.getByText('INV-001')).toBeInTheDocument();
    expect(screen.getByText('احمد محمدی')).toBeInTheDocument();
    expect(screen.getAllByText('1,090,000 ریال')[0]).toBeInTheDocument();

    // Check form fields
    expect(screen.getByText('تعداد اقساط')).toBeInTheDocument();
    expect(screen.getByText('فاصله بین اقساط')).toBeInTheDocument();
    expect(screen.getByText('تاریخ شروع (اختیاری)')).toBeInTheDocument();
    expect(screen.getByText('نرخ سود (درصد)')).toBeInTheDocument();
  });

  it('shows common installment count buttons', () => {
    render(
      <InstallmentPlanSetup
        invoice={mockInvoice}
        onCreatePlan={mockOnCreatePlan}
        isLoading={false}
      />
    );

    // Check common installment count buttons
    expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '4' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '6' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '12' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '24' })).toBeInTheDocument();
  });

  it('shows common interval buttons', () => {
    render(
      <InstallmentPlanSetup
        invoice={mockInvoice}
        onCreatePlan={mockOnCreatePlan}
        isLoading={false}
      />
    );

    // Check common interval buttons
    expect(screen.getByText('هفتگی (7 روز)')).toBeInTheDocument();
    expect(screen.getByText('دو هفته‌ای (15 روز)')).toBeInTheDocument();
    expect(screen.getByText('ماهانه (30 روز)')).toBeInTheDocument();
    expect(screen.getByText('دو ماهه (60 روز)')).toBeInTheDocument();
    expect(screen.getByText('سه ماهه (90 روز)')).toBeInTheDocument();
  });

  it('updates installment count when button is clicked', () => {
    render(
      <InstallmentPlanSetup
        invoice={mockInvoice}
        onCreatePlan={mockOnCreatePlan}
        isLoading={false}
      />
    );

    const button6 = screen.getByRole('button', { name: '6' });
    fireEvent.click(button6);

    const input = screen.getByDisplayValue('6');
    expect(input).toBeInTheDocument();
  });

  it('updates interval when button is clicked', () => {
    render(
      <InstallmentPlanSetup
        invoice={mockInvoice}
        onCreatePlan={mockOnCreatePlan}
        isLoading={false}
      />
    );

    const weeklyButton = screen.getByText('هفتگی (7 روز)');
    fireEvent.click(weeklyButton);

    const input = screen.getByDisplayValue('7');
    expect(input).toBeInTheDocument();
  });

  it('shows preview when valid data is entered', async () => {
    render(
      <InstallmentPlanSetup
        invoice={mockInvoice}
        onCreatePlan={mockOnCreatePlan}
        isLoading={false}
      />
    );

    // Default should show preview (3 installments)
    await waitFor(() => {
      expect(screen.getByText('پیش‌نمایش طرح اقساط')).toBeInTheDocument();
      expect(screen.getByText('جدول اقساط:')).toBeInTheDocument();
    });

    // Should show installment entries
    expect(screen.getByText('قسط 1')).toBeInTheDocument();
    expect(screen.getByText('قسط 2')).toBeInTheDocument();
    expect(screen.getByText('قسط 3')).toBeInTheDocument();
  });

  it('calculates installment amounts correctly', async () => {
    render(
      <InstallmentPlanSetup
        invoice={mockInvoice}
        onCreatePlan={mockOnCreatePlan}
        isLoading={false}
      />
    );

    await waitFor(() => {
      // With 3 installments, each should be approximately 363,333 ریال
      const amounts = screen.getAllByText(/363,33[34] ریال/);
      expect(amounts.length).toBeGreaterThan(0);
    });
  });

  it('applies interest rate correctly', async () => {
    render(
      <InstallmentPlanSetup
        invoice={mockInvoice}
        onCreatePlan={mockOnCreatePlan}
        isLoading={false}
      />
    );

    // Add 10% interest
    const interestInput = screen.getByPlaceholderText('نرخ سود (اختیاری)');
    fireEvent.change(interestInput, { target: { value: '10' } });

    await waitFor(() => {
      // Total should be 1,199,000 ریال (1,090,000 + 10%)
      expect(screen.getByText('1,199,000 ریال')).toBeInTheDocument();
    });

    // Should show interest amount
    expect(screen.getByText('سود 10%: 109,000 ریال')).toBeInTheDocument();
  });

  it('submits form with correct data', async () => {
    render(
      <InstallmentPlanSetup
        invoice={mockInvoice}
        onCreatePlan={mockOnCreatePlan}
        isLoading={false}
      />
    );

    // Change to 4 installments
    const button4 = screen.getByRole('button', { name: '4' });
    fireEvent.click(button4);

    // Change interval to weekly
    const weeklyButton = screen.getByText('هفتگی (7 روز)');
    fireEvent.click(weeklyButton);

    // Add interest
    const interestInput = screen.getByPlaceholderText('نرخ سود (اختیاری)');
    fireEvent.change(interestInput, { target: { value: '5' } });

    // Submit form
    const submitButton = screen.getByText('ایجاد طرح اقساط');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnCreatePlan).toHaveBeenCalledWith({
        invoice_id: '1',
        number_of_installments: 4,
        interval_days: 7,
        interest_rate: 5,
      });
    });
  });

  it('shows loading state when submitting', () => {
    render(
      <InstallmentPlanSetup
        invoice={mockInvoice}
        onCreatePlan={mockOnCreatePlan}
        isLoading={true}
      />
    );

    expect(screen.getByText('در حال ایجاد...')).toBeInTheDocument();
    
    const submitButton = screen.getByRole('button', { name: /در حال ایجاد/ });
    expect(submitButton).toBeDisabled();
  });

  it('validates installment count range', () => {
    render(
      <InstallmentPlanSetup
        invoice={mockInvoice}
        onCreatePlan={mockOnCreatePlan}
        isLoading={false}
      />
    );

    const input = screen.getByPlaceholderText('تعداد اقساط (2-60)');
    
    // Test minimum
    fireEvent.change(input, { target: { value: '1' } });
    expect(input).toHaveAttribute('min', '2');
    
    // Test maximum
    fireEvent.change(input, { target: { value: '61' } });
    expect(input).toHaveAttribute('max', '60');
  });

  it('shows warning for past due dates', async () => {
    render(
      <InstallmentPlanSetup
        invoice={mockInvoice}
        onCreatePlan={mockOnCreatePlan}
        isLoading={false}
      />
    );

    // Set start date to past
    const startDateInput = screen.getByDisplayValue('');
    fireEvent.change(startDateInput, { target: { value: '2023-01-01' } });

    await waitFor(() => {
      expect(screen.getByText('برخی از اقساط در گذشته قرار دارند')).toBeInTheDocument();
    });
  });

  it('disables submit button when no preview data', () => {
    render(
      <InstallmentPlanSetup
        invoice={mockInvoice}
        onCreatePlan={mockOnCreatePlan}
        isLoading={false}
      />
    );

    // Set invalid installment count
    const input = screen.getByPlaceholderText('تعداد اقساط (2-60)');
    fireEvent.change(input, { target: { value: '1' } });

    const submitButton = screen.getByText('ایجاد طرح اقساط');
    expect(submitButton).toBeDisabled();
  });
});