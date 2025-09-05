import { API_BASE_URL } from '@/lib/config';

export interface InstallmentDetail {
  id: string;
  invoice_id: string;
  installment_number: number;
  installment_type: 'general' | 'gold';
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  amount_due?: number;
  amount_paid: number;
  due_date: string;
  paid_at?: string;
  payment_method?: string;
  payment_reference?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  remaining_amount: number;
  is_overdue: boolean;
  days_overdue: number;
  is_fully_paid: boolean;
}

export interface InstallmentSummary {
  id: string;
  installment_number: number;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  amount_due: number;
  amount_paid: number;
  remaining_amount: number;
  due_date: string;
  is_overdue: boolean;
  days_overdue: number;
}

export interface InstallmentPlanCreate {
  invoice_id: string;
  number_of_installments: number;
  start_date?: string;
  interval_days: number;
  interest_rate?: number;
}

export interface InstallmentPlanResponse {
  invoice_id: string;
  installments_created: number;
  total_amount: number;
  installments: InstallmentSummary[];
}

export interface PaymentCreate {
  installment_id: string;
  payment_amount: number;
  payment_method?: string;
  payment_reference?: string;
  notes?: string;
}

export interface OutstandingBalance {
  invoice_id: string;
  total_installments: number;
  total_due: number;
  total_paid: number;
  outstanding_balance: number;
  pending_installments: number;
  paid_installments: number;
  overdue_installments: number;
  next_due_installment?: {
    installment_id: string;
    installment_number: number;
    due_date: string;
    amount_due: number;
    is_overdue: boolean;
    days_overdue: number;
  };
  is_fully_paid: boolean;
}

export interface PaymentHistory {
  installment_id: string;
  installment_number: number;
  payment_date: string;
  amount_paid: number;
  payment_method?: string;
  payment_reference?: string;
  remaining_after_payment: number;
  is_fully_paid: boolean;
}

export interface PaymentHistoryResponse {
  invoice_id: string;
  payments: PaymentHistory[];
  total_payments: number;
  total_amount_paid: number;
}

export interface InstallmentStatistics {
  total_installments: number;
  pending_installments: number;
  paid_installments: number;
  overdue_installments: number;
  installment_invoices: number;
  total_due: number;
  total_paid: number;
  outstanding_balance: number;
  collection_rate: number;
}

export interface PaymentResponse {
  installment: InstallmentDetail;
  outstanding_balance: OutstandingBalance;
  message: string;
}

export interface InstallmentUpdate {
  due_date?: string;
  notes?: string;
}

class InstallmentService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  // Installment Plan Management
  async createInstallmentPlan(planData: InstallmentPlanCreate): Promise<InstallmentPlanResponse> {
    const response = await fetch(`${API_BASE_URL}/api/installments/plans`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(planData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create installment plan');
    }

    return response.json();
  }

  async getInstallmentsForInvoice(invoiceId: string): Promise<InstallmentDetail[]> {
    const response = await fetch(`${API_BASE_URL}/api/installments/invoice/${invoiceId}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch installments');
    }

    return response.json();
  }

  async getInstallment(installmentId: string): Promise<InstallmentDetail> {
    const response = await fetch(`${API_BASE_URL}/api/installments/${installmentId}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch installment');
    }

    return response.json();
  }

  async updateInstallment(installmentId: string, updateData: InstallmentUpdate): Promise<InstallmentDetail> {
    const response = await fetch(`${API_BASE_URL}/api/installments/${installmentId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update installment');
    }

    return response.json();
  }

  // Payment Management
  async recordPayment(paymentData: PaymentCreate): Promise<PaymentResponse> {
    const response = await fetch(`${API_BASE_URL}/api/installments/payments`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(paymentData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to record payment');
    }

    return response.json();
  }

  async getOutstandingBalance(invoiceId: string): Promise<OutstandingBalance> {
    const response = await fetch(`${API_BASE_URL}/api/installments/invoice/${invoiceId}/balance`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch outstanding balance');
    }

    return response.json();
  }

  async getPaymentHistory(invoiceId: string): Promise<PaymentHistoryResponse> {
    const response = await fetch(`${API_BASE_URL}/api/installments/invoice/${invoiceId}/payments`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch payment history');
    }

    return response.json();
  }

  // Overdue Management
  async getOverdueInstallments(customerId?: string, daysOverdue?: number): Promise<InstallmentDetail[]> {
    const params = new URLSearchParams();
    if (customerId) params.append('customer_id', customerId);
    if (daysOverdue !== undefined) params.append('days_overdue', daysOverdue.toString());

    const response = await fetch(`${API_BASE_URL}/api/installments/overdue?${params}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch overdue installments');
    }

    return response.json();
  }

  async updateOverdueStatus(): Promise<{ message: string; updated_count: number }> {
    const response = await fetch(`${API_BASE_URL}/api/installments/overdue/update-status`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update overdue status');
    }

    return response.json();
  }

  // Statistics
  async getInstallmentStatistics(): Promise<InstallmentStatistics> {
    const response = await fetch(`${API_BASE_URL}/api/installments/statistics`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch installment statistics');
    }

    return response.json();
  }

  // Plan Management
  async cancelInstallmentPlan(invoiceId: string, reason?: string): Promise<{ message: string }> {
    const params = new URLSearchParams();
    if (reason) params.append('reason', reason);

    const response = await fetch(`${API_BASE_URL}/api/installments/invoice/${invoiceId}/plan?${params}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to cancel installment plan');
    }

    return response.json();
  }

  // Bulk Operations
  async recordBulkPayments(payments: PaymentCreate[]): Promise<{
    successful_payments: number;
    failed_payments: number;
    total_amount_processed: number;
    results: Array<{
      installment_id: string;
      success: boolean;
      amount: number;
      message?: string;
      error?: string;
    }>;
  }> {
    const response = await fetch(`${API_BASE_URL}/api/installments/payments/bulk`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ payments }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to process bulk payments');
    }

    return response.json();
  }
}

export const installmentService = new InstallmentService();