import { API_BASE_URL } from '@/lib/config';

export interface QRCodeRequest {
  regenerate?: boolean;
  size?: number;
  format?: 'PNG' | 'JPEG' | 'SVG';
}

export interface QRCodeResponse {
  qr_token: string;
  qr_url: string;
  qr_base64?: string;
  invoice_number: string;
  is_shareable: boolean;
}

export interface SharingSettingsRequest {
  is_shareable: boolean;
  regenerate_token?: boolean;
}

export interface SharingSettingsResponse {
  invoice_id: string;
  invoice_number: string;
  is_shareable: boolean;
  qr_token?: string;
  qr_url?: string;
}

export interface AccessLogResponse {
  id: string;
  invoice_id: string;
  access_ip?: string;
  user_agent?: string;
  access_method: string;
  created_at: string;
}

export interface AccessStatsResponse {
  total_accesses: number;
  unique_ips: number;
  daily_accesses: Array<{ date: string; count: number }>;
  top_ips: Array<{ ip: string; count: number }>;
  most_accessed_invoices: Array<{ invoice_number: string; count: number }>;
  period_days: number;
}

export interface PublicInvoiceResponse {
  invoice_number: string;
  invoice_type: 'GENERAL' | 'GOLD';
  total_amount: number;
  invoice_date: string;
  due_date?: string;
  status: string;
  customer_notes?: string;
  terms_and_conditions?: string;
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    weight?: number;
  }>;
}

class QRSharingService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  // QR Code Generation
  async generateQRCode(invoiceId: string, options: QRCodeRequest = {}): Promise<QRCodeResponse> {
    const response = await fetch(`${API_BASE_URL}/api/invoice-sharing/invoices/${invoiceId}/qr-code`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        regenerate: options.regenerate || false,
        size: options.size || 10,
        format: options.format || 'PNG'
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to generate QR code');
    }

    return response.json();
  }

  async getQRCodeImage(invoiceId: string, format: string = 'PNG', size: number = 10): Promise<Blob> {
    const response = await fetch(
      `${API_BASE_URL}/api/invoice-sharing/invoices/${invoiceId}/qr-code/image?format=${format}&size=${size}`,
      {
        headers: this.getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get QR code image');
    }

    return response.blob();
  }

  // Sharing Settings
  async updateSharingSettings(invoiceId: string, settings: SharingSettingsRequest): Promise<SharingSettingsResponse> {
    const response = await fetch(`${API_BASE_URL}/api/invoice-sharing/invoices/${invoiceId}/sharing`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(settings),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update sharing settings');
    }

    return response.json();
  }

  // PDF Generation
  async generateInvoicePDF(invoiceId: string, includeQR: boolean = true): Promise<Blob> {
    const response = await fetch(
      `${API_BASE_URL}/api/invoice-sharing/invoices/${invoiceId}/pdf?include_qr=${includeQR}`,
      {
        headers: this.getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to generate PDF');
    }

    return response.blob();
  }

  // Access Logs and Statistics
  async getAccessLogs(
    invoiceId?: string,
    daysBack: number = 30,
    skip: number = 0,
    limit: number = 100
  ): Promise<AccessLogResponse[]> {
    const params = new URLSearchParams({
      days_back: daysBack.toString(),
      skip: skip.toString(),
      limit: limit.toString(),
    });

    if (invoiceId) {
      params.append('invoice_id', invoiceId);
    }

    const response = await fetch(`${API_BASE_URL}/api/invoice-sharing/invoices/access-logs?${params}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to get access logs');
    }

    return response.json();
  }

  async getAccessStatistics(invoiceId?: string, daysBack: number = 30): Promise<AccessStatsResponse> {
    const params = new URLSearchParams({
      days_back: daysBack.toString(),
    });

    if (invoiceId) {
      params.append('invoice_id', invoiceId);
    }

    const response = await fetch(`${API_BASE_URL}/api/invoice-sharing/invoices/access-stats?${params}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to get access statistics');
    }

    return response.json();
  }

  // Public Invoice Access (no authentication required)
  async getPublicInvoice(qrToken: string): Promise<PublicInvoiceResponse> {
    const response = await fetch(`${API_BASE_URL}/api/invoice-sharing/public/invoice/${qrToken}`);

    if (!response.ok) {
      throw new Error('Invoice not found or not shareable');
    }

    return response.json();
  }

  async validateQRToken(qrToken: string): Promise<{ valid: boolean; error?: string }> {
    const response = await fetch(`${API_BASE_URL}/api/invoice-sharing/public/invoice/${qrToken}/validate`);

    if (!response.ok) {
      return { valid: false, error: 'Invalid or expired token' };
    }

    return response.json();
  }

  async getPublicInvoicePDF(qrToken: string): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/api/invoice-sharing/public/invoice/${qrToken}/pdf`);

    if (!response.ok) {
      throw new Error('Failed to get public invoice PDF');
    }

    return response.blob();
  }

  // Utility methods
  getPublicInvoiceUrl(qrToken: string): string {
    return `${window.location.origin}/public/invoice/${qrToken}`;
  }

  downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}

export const qrSharingService = new QRSharingService();