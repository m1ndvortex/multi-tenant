import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QRCodeDisplay } from '@/components/invoices/QRCodeDisplay';
import { qrSharingService } from '@/services/qrSharingService';
import { useToast } from '@/hooks/use-toast';

// Mock the services and hooks
vi.mock('@/services/qrSharingService');
vi.mock('@/hooks/use-toast');

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

// Mock window.open
Object.assign(window, {
  open: vi.fn(),
});

const mockToast = vi.fn();
const mockQrSharingService = qrSharingService as any;

describe('QRCodeDisplay', () => {
  const defaultProps = {
    invoiceId: 'test-invoice-id',
    invoiceNumber: 'INV-001',
    isShareable: true,
    qrToken: 'test-qr-token',
    onSharingToggle: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useToast as any).mockReturnValue({ toast: mockToast });
    
    mockQrSharingService.generateQRCode = vi.fn();
    mockQrSharingService.updateSharingSettings = vi.fn();
    mockQrSharingService.getQRCodeImage = vi.fn();
    mockQrSharingService.generateInvoicePDF = vi.fn();
    mockQrSharingService.getPublicInvoiceUrl = vi.fn();
    mockQrSharingService.downloadBlob = vi.fn();
  });

  it('renders correctly when sharing is disabled', () => {
    render(
      <QRCodeDisplay
        {...defaultProps}
        isShareable={false}
        qrToken={undefined}
      />
    );

    expect(screen.getByText('کد QR و اشتراک‌گذاری فاکتور')).toBeInTheDocument();
    expect(screen.getByText('اشتراک‌گذاری عمومی')).toBeInTheDocument();
    expect(screen.getByText('غیرفعال')).toBeInTheDocument();
    expect(screen.getByText('برای استفاده از کد QR، اشتراک‌گذاری را فعال کنید')).toBeInTheDocument();
  });

  it('renders correctly when sharing is enabled', async () => {
    const mockQRResponse = {
      qr_token: 'test-token',
      qr_url: '/public/invoice/test-token',
      qr_base64: 'data:image/png;base64,test-base64',
      invoice_number: 'INV-001',
      is_shareable: true,
    };

    mockQrSharingService.generateQRCode.mockResolvedValue(mockQRResponse);
    mockQrSharingService.getPublicInvoiceUrl.mockReturnValue('https://example.com/public/invoice/test-token');

    render(<QRCodeDisplay {...defaultProps} />);

    expect(screen.getByText('فعال')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(mockQrSharingService.generateQRCode).toHaveBeenCalledWith(
        'test-invoice-id',
        {
          regenerate: false,
          size: 10,
          format: 'PNG'
        }
      );
    });
  });

  it('handles sharing toggle correctly', async () => {
    const onSharingToggle = vi.fn();
    mockQrSharingService.updateSharingSettings.mockResolvedValue({
      invoice_id: 'test-invoice-id',
      invoice_number: 'INV-001',
      is_shareable: true,
      qr_token: 'new-token',
      qr_url: '/public/invoice/new-token',
    });

    render(
      <QRCodeDisplay
        {...defaultProps}
        isShareable={false}
        onSharingToggle={onSharingToggle}
      />
    );

    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(mockQrSharingService.updateSharingSettings).toHaveBeenCalledWith(
        'test-invoice-id',
        {
          is_shareable: true,
          regenerate_token: false
        }
      );
      expect(onSharingToggle).toHaveBeenCalledWith(true);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'موفق',
        description: 'اشتراک‌گذاری فعال شد',
      });
    });
  });

  it('handles QR code regeneration', async () => {
    const mockQRResponse = {
      qr_token: 'new-test-token',
      qr_url: '/public/invoice/new-test-token',
      qr_base64: 'data:image/png;base64,new-test-base64',
      invoice_number: 'INV-001',
      is_shareable: true,
    };

    mockQrSharingService.generateQRCode
      .mockResolvedValueOnce({
        qr_token: 'test-token',
        qr_url: '/public/invoice/test-token',
        qr_base64: 'data:image/png;base64,test-base64',
        invoice_number: 'INV-001',
        is_shareable: true,
      })
      .mockResolvedValueOnce(mockQRResponse);

    render(<QRCodeDisplay {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('تولید مجدد')).toBeInTheDocument();
    });

    const regenerateButton = screen.getByText('تولید مجدد');
    fireEvent.click(regenerateButton);

    await waitFor(() => {
      expect(mockQrSharingService.generateQRCode).toHaveBeenCalledWith(
        'test-invoice-id',
        {
          regenerate: true,
          size: 10,
          format: 'PNG'
        }
      );
      expect(mockToast).toHaveBeenCalledWith({
        title: 'موفق',
        description: 'کد QR جدید تولید شد',
      });
    });
  });

  it('handles QR code download', async () => {
    const mockBlob = new Blob(['test'], { type: 'image/png' });
    mockQrSharingService.getQRCodeImage.mockResolvedValue(mockBlob);
    mockQrSharingService.generateQRCode.mockResolvedValue({
      qr_token: 'test-token',
      qr_url: '/public/invoice/test-token',
      qr_base64: 'data:image/png;base64,test-base64',
      invoice_number: 'INV-001',
      is_shareable: true,
    });

    render(<QRCodeDisplay {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('دانلود QR')).toBeInTheDocument();
    });

    const downloadButton = screen.getByText('دانلود QR');
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(mockQrSharingService.getQRCodeImage).toHaveBeenCalledWith(
        'test-invoice-id',
        'PNG',
        10
      );
      expect(mockQrSharingService.downloadBlob).toHaveBeenCalledWith(
        mockBlob,
        'qr_code_INV-001.png'
      );
      expect(mockToast).toHaveBeenCalledWith({
        title: 'موفق',
        description: 'کد QR دانلود شد',
      });
    });
  });

  it('handles PDF download with QR code', async () => {
    const mockBlob = new Blob(['test pdf'], { type: 'application/pdf' });
    mockQrSharingService.generateInvoicePDF.mockResolvedValue(mockBlob);
    mockQrSharingService.generateQRCode.mockResolvedValue({
      qr_token: 'test-token',
      qr_url: '/public/invoice/test-token',
      qr_base64: 'data:image/png;base64,test-base64',
      invoice_number: 'INV-001',
      is_shareable: true,
    });

    render(<QRCodeDisplay {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('دانلود PDF')).toBeInTheDocument();
    });

    const pdfButton = screen.getByText('دانلود PDF');
    fireEvent.click(pdfButton);

    await waitFor(() => {
      expect(mockQrSharingService.generateInvoicePDF).toHaveBeenCalledWith(
        'test-invoice-id',
        true
      );
      expect(mockQrSharingService.downloadBlob).toHaveBeenCalledWith(
        mockBlob,
        'invoice_INV-001_with_qr.pdf'
      );
      expect(mockToast).toHaveBeenCalledWith({
        title: 'موفق',
        description: 'فاکتور با کد QR دانلود شد',
      });
    });
  });

  it('handles copy public URL', async () => {
    mockQrSharingService.generateQRCode.mockResolvedValue({
      qr_token: 'test-token',
      qr_url: '/public/invoice/test-token',
      qr_base64: 'data:image/png;base64,test-base64',
      invoice_number: 'INV-001',
      is_shareable: true,
    });
    mockQrSharingService.getPublicInvoiceUrl.mockReturnValue('https://example.com/public/invoice/test-token');

    render(<QRCodeDisplay {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('https://example.com/public/invoice/test-token')).toBeInTheDocument();
    });

    // Find the copy button by its position (first button without text)
    const buttons = screen.getAllByRole('button');
    const copyButton = buttons.find(button => button.textContent === '');
    expect(copyButton).toBeDefined();
    fireEvent.click(copyButton!);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://example.com/public/invoice/test-token');
      expect(mockToast).toHaveBeenCalledWith({
        title: 'موفق',
        description: 'لینک عمومی کپی شد',
      });
    });
  });

  it('handles opening public view', async () => {
    mockQrSharingService.generateQRCode.mockResolvedValue({
      qr_token: 'test-token',
      qr_url: '/public/invoice/test-token',
      qr_base64: 'data:image/png;base64,test-base64',
      invoice_number: 'INV-001',
      is_shareable: true,
    });
    mockQrSharingService.getPublicInvoiceUrl.mockReturnValue('https://example.com/public/invoice/test-token');

    render(<QRCodeDisplay {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('مشاهده عمومی')).toBeInTheDocument();
    });

    const viewButton = screen.getByText('مشاهده عمومی');
    fireEvent.click(viewButton);

    expect(window.open).toHaveBeenCalledWith('https://example.com/public/invoice/test-token', '_blank');
  });

  it('handles QR size and format changes', async () => {
    mockQrSharingService.generateQRCode.mockResolvedValue({
      qr_token: 'test-token',
      qr_url: '/public/invoice/test-token',
      qr_base64: 'data:image/png;base64,test-base64',
      invoice_number: 'INV-001',
      is_shareable: true,
    });

    render(<QRCodeDisplay {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('10')).toBeInTheDocument();
    });

    const sizeInput = screen.getByDisplayValue('10');
    fireEvent.change(sizeInput, { target: { value: '15' } });

    expect(sizeInput).toHaveValue(15);

    const formatSelect = screen.getByDisplayValue('PNG');
    fireEvent.change(formatSelect, { target: { value: 'JPEG' } });

    expect(formatSelect).toHaveValue('JPEG');
  });

  it('handles errors gracefully', async () => {
    mockQrSharingService.generateQRCode.mockRejectedValue(new Error('Network error'));

    render(<QRCodeDisplay {...defaultProps} />);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'خطا',
        description: 'خطا در بارگذاری کد QR',
        variant: 'destructive',
      });
    });
  });

  it('shows loading state correctly', async () => {
    mockQrSharingService.generateQRCode.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    render(<QRCodeDisplay {...defaultProps} />);

    expect(screen.getByText('در حال پردازش...')).toBeInTheDocument();
  });
});