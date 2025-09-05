import { describe, it, expect, beforeEach, vi } from 'vitest';
import { qrSharingService } from '@/services/qrSharingService';

// Mock fetch
global.fetch = vi.fn();

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock window methods
Object.assign(window, {
  URL: {
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn(),
  },
});

// Mock document methods
const mockElement = {
  style: {},
  href: '',
  download: '',
  click: vi.fn(),
};

const mockBody = {
  appendChild: vi.fn(),
  removeChild: vi.fn(),
};

vi.spyOn(document, 'createElement').mockReturnValue(mockElement as any);
Object.defineProperty(document, 'body', {
  value: mockBody,
  writable: true,
});

describe('QRSharingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('mock-token');
  });

  describe('generateQRCode', () => {
    it('should generate QR code successfully', async () => {
      const mockResponse = {
        qr_token: 'test-token',
        qr_url: '/public/invoice/test-token',
        qr_base64: 'data:image/png;base64,test-base64',
        invoice_number: 'INV-001',
        is_shareable: true,
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await qrSharingService.generateQRCode('invoice-id', {
        regenerate: true,
        size: 15,
        format: 'JPEG',
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/invoice-sharing/invoices/invoice-id/qr-code'),
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            regenerate: true,
            size: 15,
            format: 'JPEG',
          }),
        }
      );

      expect(result).toEqual(mockResponse);
    });

    it('should use default options when not provided', async () => {
      const mockResponse = {
        qr_token: 'test-token',
        qr_url: '/public/invoice/test-token',
        qr_base64: 'data:image/png;base64,test-base64',
        invoice_number: 'INV-001',
        is_shareable: true,
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await qrSharingService.generateQRCode('invoice-id');

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            regenerate: false,
            size: 10,
            format: 'PNG',
          }),
        })
      );
    });

    it('should handle API errors', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ detail: 'QR generation failed' }),
      });

      await expect(qrSharingService.generateQRCode('invoice-id')).rejects.toThrow(
        'QR generation failed'
      );
    });
  });

  describe('getQRCodeImage', () => {
    it('should get QR code image successfully', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/png' });

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
      });

      const result = await qrSharingService.getQRCodeImage('invoice-id', 'PNG', 12);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/invoice-sharing/invoices/invoice-id/qr-code/image?format=PNG&size=12'),
        {
          headers: {
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json',
          },
        }
      );

      expect(result).toBe(mockBlob);
    });

    it('should handle image fetch errors', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
      });

      await expect(qrSharingService.getQRCodeImage('invoice-id')).rejects.toThrow(
        'Failed to get QR code image'
      );
    });
  });

  describe('updateSharingSettings', () => {
    it('should update sharing settings successfully', async () => {
      const mockResponse = {
        invoice_id: 'invoice-id',
        invoice_number: 'INV-001',
        is_shareable: true,
        qr_token: 'new-token',
        qr_url: '/public/invoice/new-token',
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await qrSharingService.updateSharingSettings('invoice-id', {
        is_shareable: true,
        regenerate_token: true,
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/invoice-sharing/invoices/invoice-id/sharing'),
        {
          method: 'PUT',
          headers: {
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            is_shareable: true,
            regenerate_token: true,
          }),
        }
      );

      expect(result).toEqual(mockResponse);
    });
  });

  describe('generateInvoicePDF', () => {
    it('should generate PDF successfully', async () => {
      const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
      });

      const result = await qrSharingService.generateInvoicePDF('invoice-id', false);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/invoice-sharing/invoices/invoice-id/pdf?include_qr=false'),
        {
          headers: {
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json',
          },
        }
      );

      expect(result).toBe(mockBlob);
    });
  });

  describe('getAccessLogs', () => {
    it('should get access logs successfully', async () => {
      const mockLogs = [
        {
          id: '1',
          invoice_id: 'invoice-id',
          access_ip: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
          access_method: 'qr_scan' as const,
          created_at: '2024-01-15T10:30:00Z',
        },
      ];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockLogs,
      });

      const result = await qrSharingService.getAccessLogs('invoice-id', 7, 10, 20);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('days_back=7&skip=10&limit=20&invoice_id=invoice-id'),
        expect.any(Object)
      );

      expect(result).toEqual(mockLogs);
    });

    it('should get access logs without invoice ID', async () => {
      const mockLogs: any[] = [];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockLogs,
      });

      await qrSharingService.getAccessLogs();

      expect(fetch).toHaveBeenCalledWith(
        expect.not.stringContaining('invoice_id='),
        expect.any(Object)
      );
    });
  });

  describe('getAccessStatistics', () => {
    it('should get access statistics successfully', async () => {
      const mockStats = {
        total_accesses: 25,
        unique_ips: 8,
        daily_accesses: [],
        top_ips: [],
        most_accessed_invoices: [],
        period_days: 30,
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      });

      const result = await qrSharingService.getAccessStatistics('invoice-id', 15);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('days_back=15&invoice_id=invoice-id'),
        expect.any(Object)
      );

      expect(result).toEqual(mockStats);
    });
  });

  describe('getPublicInvoice', () => {
    it('should get public invoice successfully', async () => {
      const mockInvoice = {
        invoice_number: 'INV-001',
        invoice_type: 'GENERAL' as const,
        total_amount: 1000000,
        invoice_date: '2024-01-15',
        status: 'sent',
        items: [],
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockInvoice,
      });

      const result = await qrSharingService.getPublicInvoice('test-token');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/invoice-sharing/public/invoice/test-token')
      );

      expect(result).toEqual(mockInvoice);
    });

    it('should handle public invoice not found', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
      });

      await expect(qrSharingService.getPublicInvoice('invalid-token')).rejects.toThrow(
        'Invoice not found or not shareable'
      );
    });
  });

  describe('validateQRToken', () => {
    it('should validate QR token successfully', async () => {
      const mockValidation = { valid: true };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockValidation,
      });

      const result = await qrSharingService.validateQRToken('test-token');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/invoice-sharing/public/invoice/test-token/validate')
      );

      expect(result).toEqual(mockValidation);
    });

    it('should handle invalid token', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
      });

      const result = await qrSharingService.validateQRToken('invalid-token');

      expect(result).toEqual({
        valid: false,
        error: 'Invalid or expired token',
      });
    });
  });

  describe('getPublicInvoicePDF', () => {
    it('should get public invoice PDF successfully', async () => {
      const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
      });

      const result = await qrSharingService.getPublicInvoicePDF('test-token');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/invoice-sharing/public/invoice/test-token/pdf')
      );

      expect(result).toBe(mockBlob);
    });
  });

  describe('utility methods', () => {
    it('should generate correct public invoice URL', () => {
      const url = qrSharingService.getPublicInvoiceUrl('test-token');
      expect(url).toBe(`${window.location.origin}/public/invoice/test-token`);
    });

    it('should download blob correctly', () => {
      const mockBlob = new Blob(['test'], { type: 'text/plain' });
      const mockAnchor = {
        style: {},
        href: '',
        download: '',
        click: vi.fn(),
      };

      (document.createElement as any).mockReturnValue(mockAnchor);

      qrSharingService.downloadBlob(mockBlob, 'test.txt');

      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(mockAnchor.download).toBe('test.txt');
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(document.body.appendChild).toHaveBeenCalledWith(mockAnchor);
      expect(document.body.removeChild).toHaveBeenCalledWith(mockAnchor);
      expect(window.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
      expect(window.URL.revokeObjectURL).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('Network error'));

      await expect(qrSharingService.generateQRCode('invoice-id')).rejects.toThrow(
        'Network error'
      );
    });

    it('should handle missing token', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await qrSharingService.generateQRCode('invoice-id');

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer null',
          }),
        })
      );
    });
  });
});