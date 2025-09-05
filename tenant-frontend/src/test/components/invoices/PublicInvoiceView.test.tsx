import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { PublicInvoiceView } from '@/components/invoices/PublicInvoiceView';
import { qrSharingService } from '@/services/qrSharingService';
import { useToast } from '@/hooks/use-toast';

// Mock the services and hooks
vi.mock('@/services/qrSharingService');
vi.mock('@/hooks/use-toast');

const mockToast = vi.fn();
const mockQrSharingService = qrSharingService as any;

const mockInvoiceData = {
  invoice_number: 'INV-001',
  invoice_type: 'GENERAL' as const,
  total_amount: 1000000,
  invoice_date: '2024-01-15',
  due_date: '2024-02-15',
  status: 'sent',
  customer_notes: 'Test customer notes',
  terms_and_conditions: 'Test terms and conditions',
  items: [
    {
      description: 'Test Product 1',
      quantity: 2,
      unit_price: 300000,
      line_total: 600000,
      weight: undefined,
    },
    {
      description: 'Test Product 2',
      quantity: 1,
      unit_price: 400000,
      line_total: 400000,
      weight: undefined,
    },
  ],
};

const mockGoldInvoiceData = {
  ...mockInvoiceData,
  invoice_type: 'GOLD' as const,
  items: [
    {
      description: 'Gold Ring',
      quantity: 1,
      unit_price: 5000000,
      line_total: 5000000,
      weight: 10.5,
    },
  ],
};

describe('PublicInvoiceView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useToast as any).mockReturnValue({ toast: mockToast });
    
    mockQrSharingService.validateQRToken = vi.fn();
    mockQrSharingService.getPublicInvoice = vi.fn();
    mockQrSharingService.getPublicInvoicePDF = vi.fn();
    mockQrSharingService.downloadBlob = vi.fn();
  });

  const renderWithRouter = (qrToken: string) => {
    return render(
      <MemoryRouter initialEntries={[`/public/invoice/${qrToken}`]}>
        <PublicInvoiceView />
      </MemoryRouter>
    );
  };

  it('renders loading state initially', () => {
    mockQrSharingService.validateQRToken.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    renderWithRouter('test-token');

    expect(screen.getByText('در حال بارگذاری فاکتور...')).toBeInTheDocument();
  });

  it('renders general invoice correctly', async () => {
    mockQrSharingService.validateQRToken.mockResolvedValue({ valid: true });
    mockQrSharingService.getPublicInvoice.mockResolvedValue(mockInvoiceData);

    renderWithRouter('test-token');

    await waitFor(() => {
      expect(screen.getByText('فاکتور شماره INV-001')).toBeInTheDocument();
    });

    expect(screen.getByText('فاکتور عمومی')).toBeInTheDocument();
    expect(screen.getByText('ارسال شده')).toBeInTheDocument();
    expect(screen.getByText('1,000,000 تومان')).toBeInTheDocument();
    expect(screen.getByText('Test Product 1')).toBeInTheDocument();
    expect(screen.getByText('Test Product 2')).toBeInTheDocument();
    expect(screen.getByText('Test customer notes')).toBeInTheDocument();
    expect(screen.getByText('Test terms and conditions')).toBeInTheDocument();
  });

  it('renders gold invoice correctly with weight information', async () => {
    mockQrSharingService.validateQRToken.mockResolvedValue({ valid: true });
    mockQrSharingService.getPublicInvoice.mockResolvedValue(mockGoldInvoiceData);

    renderWithRouter('test-token');

    await waitFor(() => {
      expect(screen.getByText('فاکتور شماره INV-001')).toBeInTheDocument();
    });

    expect(screen.getByText('فاکتور طلا')).toBeInTheDocument();
    expect(screen.getByText('Gold Ring')).toBeInTheDocument();
    expect(screen.getByText('وزن (گرم)')).toBeInTheDocument();
    expect(screen.getByText('10.5')).toBeInTheDocument();
  });

  it('handles different invoice statuses correctly', async () => {
    const testStatuses = [
      { status: 'draft', expectedText: 'پیش‌نویس' },
      { status: 'paid', expectedText: 'پرداخت شده' },
      { status: 'overdue', expectedText: 'معوقه' },
      { status: 'cancelled', expectedText: 'لغو شده' },
    ];

    for (const { status, expectedText } of testStatuses) {
      mockQrSharingService.validateQRToken.mockResolvedValue({ valid: true });
      mockQrSharingService.getPublicInvoice.mockResolvedValue({
        ...mockInvoiceData,
        status,
      });

      const { unmount } = renderWithRouter('test-token');

      await waitFor(() => {
        expect(screen.getByText(expectedText)).toBeInTheDocument();
      });

      unmount();
    }
  });

  it('handles PDF download correctly', async () => {
    const mockBlob = new Blob(['test pdf'], { type: 'application/pdf' });
    mockQrSharingService.validateQRToken.mockResolvedValue({ valid: true });
    mockQrSharingService.getPublicInvoice.mockResolvedValue(mockInvoiceData);
    mockQrSharingService.getPublicInvoicePDF.mockResolvedValue(mockBlob);

    renderWithRouter('test-token');

    await waitFor(() => {
      expect(screen.getByText('دانلود PDF')).toBeInTheDocument();
    });

    const downloadButton = screen.getByText('دانلود PDF');
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(mockQrSharingService.getPublicInvoicePDF).toHaveBeenCalledWith('test-token');
      expect(mockQrSharingService.downloadBlob).toHaveBeenCalledWith(
        mockBlob,
        'invoice_INV-001.pdf'
      );
      expect(mockToast).toHaveBeenCalledWith({
        title: 'موفق',
        description: 'فاکتور دانلود شد',
      });
    });
  });

  it('handles invalid token error', async () => {
    mockQrSharingService.validateQRToken.mockResolvedValue({
      valid: false,
      error: 'لینک نامعتبر یا منقضی شده است',
    });

    renderWithRouter('invalid-token');

    await waitFor(() => {
      expect(screen.getByText('خطا در بارگذاری')).toBeInTheDocument();
      expect(screen.getByText('لینک نامعتبر یا منقضی شده است')).toBeInTheDocument();
    });

    expect(screen.getByText('تلاش مجدد')).toBeInTheDocument();
  });

  it('handles network error', async () => {
    mockQrSharingService.validateQRToken.mockRejectedValue(new Error('Network error'));

    renderWithRouter('test-token');

    await waitFor(() => {
      expect(screen.getByText('خطا در بارگذاری')).toBeInTheDocument();
      expect(screen.getByText('فاکتور یافت نشد یا قابل مشاهده نیست')).toBeInTheDocument();
    });
  });

  it('handles retry functionality', async () => {
    mockQrSharingService.validateQRToken
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ valid: true });
    mockQrSharingService.getPublicInvoice.mockResolvedValue(mockInvoiceData);

    renderWithRouter('test-token');

    await waitFor(() => {
      expect(screen.getByText('تلاش مجدد')).toBeInTheDocument();
    });

    const retryButton = screen.getByText('تلاش مجدد');
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('فاکتور شماره INV-001')).toBeInTheDocument();
    });
  });

  it('formats dates correctly', async () => {
    mockQrSharingService.validateQRToken.mockResolvedValue({ valid: true });
    mockQrSharingService.getPublicInvoice.mockResolvedValue(mockInvoiceData);

    renderWithRouter('test-token');

    await waitFor(() => {
      // Check that dates are formatted in Persian
      expect(screen.getByText(/۱۴۰۲/)).toBeInTheDocument(); // Persian year
    });
  });

  it('formats currency correctly', async () => {
    mockQrSharingService.validateQRToken.mockResolvedValue({ valid: true });
    mockQrSharingService.getPublicInvoice.mockResolvedValue(mockInvoiceData);

    renderWithRouter('test-token');

    await waitFor(() => {
      // Check that numbers are formatted in Persian
      expect(screen.getByText('۱,۰۰۰,۰۰۰ تومان')).toBeInTheDocument();
    });
  });

  it('handles invoice without due date', async () => {
    const invoiceWithoutDueDate = {
      ...mockInvoiceData,
      due_date: undefined,
    };

    mockQrSharingService.validateQRToken.mockResolvedValue({ valid: true });
    mockQrSharingService.getPublicInvoice.mockResolvedValue(invoiceWithoutDueDate);

    renderWithRouter('test-token');

    await waitFor(() => {
      expect(screen.getByText('فاکتور شماره INV-001')).toBeInTheDocument();
    });

    // Should not show due date section
    expect(screen.queryByText('تاریخ سررسید')).not.toBeInTheDocument();
  });

  it('handles invoice without notes', async () => {
    const invoiceWithoutNotes = {
      ...mockInvoiceData,
      customer_notes: undefined,
      terms_and_conditions: undefined,
    };

    mockQrSharingService.validateQRToken.mockResolvedValue({ valid: true });
    mockQrSharingService.getPublicInvoice.mockResolvedValue(invoiceWithoutNotes);

    renderWithRouter('test-token');

    await waitFor(() => {
      expect(screen.getByText('فاکتور شماره INV-001')).toBeInTheDocument();
    });

    // Should not show notes sections
    expect(screen.queryByText('یادداشت برای مشتری')).not.toBeInTheDocument();
    expect(screen.queryByText('شرایط و ضوابط')).not.toBeInTheDocument();
  });

  it('handles PDF download error', async () => {
    mockQrSharingService.validateQRToken.mockResolvedValue({ valid: true });
    mockQrSharingService.getPublicInvoice.mockResolvedValue(mockInvoiceData);
    mockQrSharingService.getPublicInvoicePDF.mockRejectedValue(new Error('PDF generation failed'));

    renderWithRouter('test-token');

    await waitFor(() => {
      expect(screen.getByText('دانلود PDF')).toBeInTheDocument();
    });

    const downloadButton = screen.getByText('دانلود PDF');
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'خطا',
        description: 'خطا در دانلود فاکتور',
        variant: 'destructive',
      });
    });
  });
});