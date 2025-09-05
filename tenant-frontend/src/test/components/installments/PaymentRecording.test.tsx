import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import PaymentRecording from '@/components/installments/PaymentRecording';
import { InstallmentDetail } from '@/services/installmentService';

const mockInstallments: InstallmentDetail[] = [
  {
    id: 'inst-1',
    invoice_id: '1',
    installment_number: 1,
    installment_type: 'general',
    status: 'paid',
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
    installment_type: 'general',
    status: 'pending',
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
    installment_type: 'general',
    status: 'overdue',
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

describe('PaymentRecording', () => {
  const mockOnRecordPayment = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders payment recording interface', () => {
    render(
      <PaymentRecording
        installments={mockInstallments}
        onRecordPayment={mockOnRecordPayment}
        isLoading={false}
      />
    );

    // Check header
    expect(screen.getByText('ثبت پرداخت اقساط')).toBeInTheDocument();

    // Check statistics
    expect(screen.getByText('اقساط باقی‌مانده')).toBeInTheDocument();
    expect(screen.getByText('اقساط سررسید گذشته')).toBeInTheDocument();
    expect(screen.getByText('مجموع مانده')).toBeInTheDocument();
  });

  it('displays unpaid installments only', () => {
    render(
      <PaymentRecording
        installments={mockInstallments}
        onRecordPayment={mockOnRecordPayment}
        isLoading={false}
      />
    );

    // Should show 2 unpaid installments (pending and overdue)
    expect(screen.getByText('2')).toBeInTheDocument(); // Remaining installments count

    // Should show installment 2 (pending)
    expect(screen.getByText('قسط شماره 2')).toBeInTheDocument();
    
    // Should show installment 3 (overdue)
    expect(screen.getByText('قسط شماره 3')).toBeInTheDocument();
    
    // Should not show installment 1 (paid)
    expect(screen.queryByText('قسط شماره 1')).not.toBeInTheDocument();
  });

  it('shows correct status badges for installments', () => {
    render(
      <PaymentRecording
        installments={mockInstallments}
        onRecordPayment={mockOnRecordPayment}
        isLoading={false}
      />
    );

    // Overdue installment should show overdue badge
    expect(screen.getByText('سررسید گذشته (15 روز)')).toBeInTheDocument();
    
    // Pending installment should show appropriate badge
    expect(screen.getByText('در موعد')).toBeInTheDocument();
  });

  it('calculates statistics correctly', () => {
    render(
      <PaymentRecording
        installments={mockInstallments}
        onRecordPayment={mockOnRecordPayment}
        isLoading={false}
      />
    );

    // 2 remaining installments
    expect(screen.getByText('2')).toBeInTheDocument();
    
    // 1 overdue installment
    expect(screen.getByText('1')).toBeInTheDocument();
    
    // Total remaining amount: 363333 + 363334 = 726667
    expect(screen.getByText('726,667 ریال')).toBeInTheDocument();
  });

  it('opens payment dialog when payment button is clicked', async () => {
    render(
      <PaymentRecording
        installments={mockInstallments}
        onRecordPayment={mockOnRecordPayment}
        isLoading={false}
      />
    );

    // Click payment button for installment 2
    const paymentButtons = screen.getAllByText('ثبت پرداخت');
    fireEvent.click(paymentButtons[0]);

    // Payment dialog should open - look for dialog content instead of title
    await waitFor(() => {
      expect(screen.getByText('مبلغ پرداخت (ریال)')).toBeInTheDocument();
    });

    // Should have payment form fields
    expect(screen.getByText('روش پرداخت')).toBeInTheDocument();
    expect(screen.getByText('شماره مرجع (اختیاری)')).toBeInTheDocument();
    expect(screen.getByText('یادداشت (اختیاری)')).toBeInTheDocument();
  });

  it('pre-fills payment amount with remaining amount', async () => {
    render(
      <PaymentRecording
        installments={mockInstallments}
        onRecordPayment={mockOnRecordPayment}
        isLoading={false}
      />
    );

    // Click payment button for installment 2
    const paymentButtons = screen.getAllByText('ثبت پرداخت');
    fireEvent.click(paymentButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('مبلغ پرداخت (ریال)')).toBeInTheDocument();
    });

    // Check if amount input has the correct value (first button is for overdue installment 3)
    const amountInput = screen.getByPlaceholderText('مبلغ پرداخت');
    expect(amountInput).toHaveValue(363334);
  });

  it('provides quick payment amount buttons', async () => {
    render(
      <PaymentRecording
        installments={mockInstallments}
        onRecordPayment={mockOnRecordPayment}
        isLoading={false}
      />
    );

    // Open payment dialog
    const paymentButtons = screen.getAllByText('ثبت پرداخت');
    fireEvent.click(paymentButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('پرداخت کامل')).toBeInTheDocument();
      expect(screen.getByText('نصف مبلغ')).toBeInTheDocument();
    });

    // Click half amount button
    fireEvent.click(screen.getByText('نصف مبلغ'));

    // Should update amount to half (first button is for overdue installment 3)
    const amountInput = screen.getByPlaceholderText('مبلغ پرداخت');
    expect(amountInput).toHaveValue(181667);
  });

  it('submits payment with correct data', async () => {
    render(
      <PaymentRecording
        installments={mockInstallments}
        onRecordPayment={mockOnRecordPayment}
        isLoading={false}
      />
    );

    // Open payment dialog
    const paymentButtons = screen.getAllByText('ثبت پرداخت');
    fireEvent.click(paymentButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('مبلغ پرداخت (ریال)')).toBeInTheDocument();
    });

    // Fill form
    const amountInput = screen.getByPlaceholderText('مبلغ پرداخت');
    fireEvent.change(amountInput, { target: { value: '200000' } });

    // Add reference
    const referenceInput = screen.getByPlaceholderText('شماره تراکنش، چک، و غیره');
    fireEvent.change(referenceInput, { target: { value: 'REF-123' } });

    // Add notes
    const notesInput = screen.getByPlaceholderText('توضیحات اضافی...');
    fireEvent.change(notesInput, { target: { value: 'Partial payment' } });

    // Submit
    const submitButton = screen.getByRole('button', { name: /ثبت پرداخت/ });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnRecordPayment).toHaveBeenCalledWith({
        installment_id: 'inst-3', // First button is for overdue installment 3
        payment_amount: 200000,
        payment_method: '',
        payment_reference: 'REF-123',
        notes: 'Partial payment',
      });
    });
  });

  it('shows loading state when submitting payment', async () => {
    render(
      <PaymentRecording
        installments={mockInstallments}
        onRecordPayment={mockOnRecordPayment}
        isLoading={true}
      />
    );

    // Open payment dialog
    const paymentButtons = screen.getAllByText('ثبت پرداخت');
    fireEvent.click(paymentButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('مبلغ پرداخت (ریال)')).toBeInTheDocument();
    });

    // Check if submit button shows loading state
    const submitButton = screen.getByRole('button', { name: /در حال ثبت/ });
    expect(submitButton).toBeDisabled();
  });

  it('validates payment amount', async () => {
    render(
      <PaymentRecording
        installments={mockInstallments}
        onRecordPayment={mockOnRecordPayment}
        isLoading={false}
      />
    );

    // Open payment dialog
    const paymentButtons = screen.getAllByText('ثبت پرداخت');
    fireEvent.click(paymentButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('مبلغ پرداخت (ریال)')).toBeInTheDocument();
    });

    const amountInput = screen.getByPlaceholderText('مبلغ پرداخت');
    
    // Test minimum value
    expect(amountInput).toHaveAttribute('min', '1');
    
    // Test maximum value (should be remaining amount for overdue installment 3)
    expect(amountInput).toHaveAttribute('max', '363334');

    // Set invalid amount (0)
    fireEvent.change(amountInput, { target: { value: '0' } });

    const submitButton = screen.getByRole('button', { name: /ثبت پرداخت/ });
    expect(submitButton).toBeDisabled();
  });

  it('shows success message when all installments are paid', () => {
    const allPaidInstallments = mockInstallments.map(inst => ({
      ...inst,
      status: 'paid' as const,
      is_fully_paid: true,
      remaining_amount: 0,
    }));

    render(
      <PaymentRecording
        installments={allPaidInstallments}
        onRecordPayment={mockOnRecordPayment}
        isLoading={false}
      />
    );

    expect(screen.getByText('همه اقساط پرداخت شده‌اند!')).toBeInTheDocument();
    expect(screen.getByText('تبریک! تمام اقساط این فاکتور تسویه شده است.')).toBeInTheDocument();
  });

  it('sorts installments by overdue status and due date', () => {
    render(
      <PaymentRecording
        installments={mockInstallments}
        onRecordPayment={mockOnRecordPayment}
        isLoading={false}
      />
    );

    // Overdue installment (3) should appear before pending installment (2)
    const installmentCards = screen.getAllByText(/قسط شماره/);
    expect(installmentCards[0]).toHaveTextContent('قسط شماره 3'); // Overdue first
    expect(installmentCards[1]).toHaveTextContent('قسط شماره 2'); // Pending second
  });

  it('closes dialog when cancel is clicked', async () => {
    render(
      <PaymentRecording
        installments={mockInstallments}
        onRecordPayment={mockOnRecordPayment}
        isLoading={false}
      />
    );

    // Open payment dialog
    const paymentButtons = screen.getAllByText('ثبت پرداخت');
    fireEvent.click(paymentButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('مبلغ پرداخت (ریال)')).toBeInTheDocument();
    });

    // Click cancel
    fireEvent.click(screen.getByText('انصراف'));

    await waitFor(() => {
      expect(screen.queryByText('مبلغ پرداخت (ریال)')).not.toBeInTheDocument();
    });
  });
});