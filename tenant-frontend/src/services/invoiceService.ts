import { API_BASE_URL } from '@/lib/config';

export interface InvoiceItem {
  id?: string;
  product_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  tax_rate?: number;
  discount_rate?: number;
  discount_amount?: number;
  
  // Gold-specific fields
  weight?: number;
  labor_fee?: number;
  profit?: number;
  vat_amount?: number;
  gold_purity?: number;
  
  notes?: string;
}

export interface Invoice {
  id: string;
  tenant_id: string;
  customer_id: string;
  invoice_number: string;
  invoice_type: 'GENERAL' | 'GOLD';
  installment_type: 'NONE' | 'GENERAL' | 'GOLD';
  
  // Financial fields
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  discount_amount?: number;
  
  // Gold-specific fields
  total_gold_weight?: number;
  gold_price_at_creation?: number;
  
  // Installment tracking
  remaining_balance?: number;
  remaining_gold_weight?: number;
  
  // QR Code and sharing
  qr_code_token?: string;
  is_shareable: boolean;
  
  // Status and metadata
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  due_date?: string;
  notes?: string;
  customer_notes?: string;
  terms_and_conditions?: string;
  
  // Relationships
  customer_name: string;
  customer_phone?: string;
  items: InvoiceItem[];
  
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface InvoiceCreate {
  customer_id: string;
  invoice_type: 'GENERAL' | 'GOLD';
  items: Omit<InvoiceItem, 'id'>[];
  discount_amount?: number;
  gold_price_at_creation?: number;
  is_installment?: boolean;
  installment_type?: 'NONE' | 'GENERAL' | 'GOLD';
  due_date?: string;
  is_shareable?: boolean;
  notes?: string;
  customer_notes?: string;
  terms_and_conditions?: string;
}

export interface InvoiceUpdate {
  customer_id?: string;
  items?: Omit<InvoiceItem, 'id'>[];
  discount_amount?: number;
  gold_price_at_creation?: number;
  is_installment?: boolean;
  installment_type?: 'NONE' | 'GENERAL' | 'GOLD';
  due_date?: string;
  is_shareable?: boolean;
  notes?: string;
  customer_notes?: string;
  terms_and_conditions?: string;
  status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
}

export interface InvoiceListResponse {
  invoices: Invoice[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface InvoiceSearchParams {
  query?: string;
  customer_id?: string;
  invoice_type?: 'GENERAL' | 'GOLD';
  status?: string;
  installment_type?: string;
  date_from?: string;
  date_to?: string;
  min_amount?: number;
  max_amount?: number;
  sort_by?: string;
  sort_order?: string;
  page?: number;
  per_page?: number;
}

export interface InvoiceStats {
  total_invoices: number;
  draft_invoices: number;
  sent_invoices: number;
  paid_invoices: number;
  overdue_invoices: number;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  general_invoices: number;
  gold_invoices: number;
  installment_invoices: number;
}

export interface Installment {
  id: string;
  invoice_id: string;
  installment_number: number;
  amount_due?: number;
  amount_paid: number;
  gold_weight_due?: number;
  gold_weight_paid: number;
  gold_price_at_payment?: number;
  due_date: string;
  paid_at?: string;
  status: 'pending' | 'paid' | 'overdue';
  notes?: string;
}

class InvoiceService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  // Invoice CRUD operations
  async getInvoices(params: InvoiceSearchParams = {}): Promise<InvoiceListResponse> {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => searchParams.append(key, v));
        } else {
          searchParams.append(key, value.toString());
        }
      }
    });

    const response = await fetch(`${API_BASE_URL}/api/invoices?${searchParams}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch invoices');
    }

    return response.json();
  }

  async getInvoice(id: string): Promise<Invoice> {
    const response = await fetch(`${API_BASE_URL}/api/invoices/${id}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch invoice');
    }

    return response.json();
  }

  async createInvoice(invoice: InvoiceCreate): Promise<Invoice> {
    const response = await fetch(`${API_BASE_URL}/api/invoices`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(invoice),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create invoice');
    }

    return response.json();
  }

  async updateInvoice(id: string, invoice: InvoiceUpdate): Promise<Invoice> {
    const response = await fetch(`${API_BASE_URL}/api/invoices/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(invoice),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update invoice');
    }

    return response.json();
  }

  async deleteInvoice(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/invoices/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to delete invoice');
    }
  }

  // Invoice actions
  async sendInvoice(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/invoices/${id}/send`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to send invoice');
    }
  }

  async generateQRCode(id: string): Promise<{ qr_code_url: string; public_url: string }> {
    const response = await fetch(`${API_BASE_URL}/api/invoices/${id}/qr-code`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to generate QR code');
    }

    return response.json();
  }

  async downloadPDF(id: string): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/api/invoices/${id}/pdf`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to download PDF');
    }

    return response.blob();
  }

  // Installment operations
  async getInstallments(invoiceId: string): Promise<Installment[]> {
    const response = await fetch(`${API_BASE_URL}/api/invoices/${invoiceId}/installments`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch installments');
    }

    return response.json();
  }

  async createInstallmentPlan(invoiceId: string, installments: Omit<Installment, 'id' | 'invoice_id' | 'status' | 'paid_at'>[]): Promise<Installment[]> {
    const response = await fetch(`${API_BASE_URL}/api/invoices/${invoiceId}/installments`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ installments }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create installment plan');
    }

    return response.json();
  }

  async recordPayment(installmentId: string, payment: {
    amount_paid?: number;
    gold_weight_paid?: number;
    gold_price_at_payment?: number;
    notes?: string;
  }): Promise<Installment> {
    const response = await fetch(`${API_BASE_URL}/api/installments/${installmentId}/payment`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payment),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to record payment');
    }

    return response.json();
  }

  // Analytics
  async getInvoiceStats(): Promise<InvoiceStats> {
    const response = await fetch(`${API_BASE_URL}/api/invoices/stats`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch invoice stats');
    }

    return response.json();
  }

  // Gold price management
  async getCurrentGoldPrice(): Promise<{ price: number; updated_at: string }> {
    const response = await fetch(`${API_BASE_URL}/api/gold-price/current`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch current gold price');
    }

    return response.json();
  }

  async updateGoldPrice(price: number): Promise<{ price: number; updated_at: string }> {
    const response = await fetch(`${API_BASE_URL}/api/gold-price`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ price }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update gold price');
    }

    return response.json();
  }
}

export const invoiceService = new InvoiceService();