import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { InvoiceSharing } from '@/components/invoices/InvoiceSharing';
import { qrSharingService } from '@/services/qrSharingService';
import { useToast } from '@/hooks/use-toast';

// Mock the services and hooks
vi.mock('@/services/qrSharingService');
vi.mock('@/hooks/use-toast');

// Mock child components
vi.mock('@/components/invoices/QRCodeDisplay', () => ({
  QRCodeDisplay: ({ onSharingToggle, isShareable }: any) => (
    <div data-testid="qr-code-display">
      <button onClick={() => onSharingToggle(!isShareable)}>
        Toggle Sharing
      </button>
      <span>Shareable: {isShareable ? 'Yes' : 'No'}</span>
    </div>
  ),
}));

vi.mock('@/components/invoices/SharingControls', () => ({
  SharingControls: ({ isShareable }: any) => (
    <div data-testid="sharing-controls">
      <span>Controls for shareable: {isShareable ? 'Yes' : 'No'}</span>
    </div>
  ),
}));

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

describe('InvoiceSharing', () => {
  const defaultProps = {
    invoiceId: 'test-invoice-id',
    invoiceNumber: 'INV-001',
    initialIsShareable: false,
    initialQrToken: undefined,
    onSharingChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useToast as any).mockReturnValue({ toast: mockToast });
    
    mockQrSharingService.updateSharingSettings = vi.fn();
    mockQrSharingService.getPublicInvoiceUrl = vi.fn();
  });

  it('renders correctly with initial props', () => {
    render(<InvoiceSharing {...defaultProps} />);

    expect(screen.getByText('اشتراک‌گذاری و کد QR فاکتور INV-001')).toBeInTheDocument();
    expect(screen.getByText('کد QR و تنظیمات')).toBeInTheDocument();
    expect(screen.getByText('آمار و مدیریت')).toBeInTheDocument();
    expect(screen.getByTestId('qr-code-display')).toBeInTheDocument();
    expect(screen.getByText('Shareable: No')).toBeInTheDocument();
  });

  it('renders correctly when sharing is enabled', () => {
    render(
      <InvoiceSharing
        {...defaultProps}
        initialIsShareable={true}
        initialQrToken="test-token"
      />
    );

    expect(screen.getByText('Shareable: Yes')).toBeInTheDocument();
  });

  it('switches between tabs correctly', () => {
    render(<InvoiceSharing {...defaultProps} />);

    // Initially on QR code tab
    expect(screen.getByTestId('qr-code-display')).toBeInTheDocument();

    // Switch to analytics tab
    const analyticsTab = screen.getByText('آمار و مدیریت');
    fireEvent.click(analyticsTab);

    expect(screen.getByTestId('sharing-controls')).toBeInTheDocument();
    expect(screen.getByText('Controls for shareable: No')).toBeInTheDocument();

    // Switch back to QR code tab
    const qrTab = screen.getByText('کد QR و تنظیمات');
    fireEvent.click(qrTab);

    expect(screen.getByTestId('qr-code-display')).toBeInTheDocument();
  });

  it('handles sharing toggle correctly', async () => {
    const onSharingChange = vi.fn();
    mockQrSharingService.updateSharingSettings.mockResolvedValue({
      invoice_id: 'test-invoice-id',
      invoice_number: 'INV-001',
      is_shareable: true,
      qr_token: 'new-token',
      qr_url: '/public/invoice/new-token',
    });

    render(
      <InvoiceSharing
        {...defaultProps}
        onSharingChange={onSharingChange}
      />
    );

    const toggleButton = screen.getByText('Toggle Sharing');
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(mockQrSharingService.updateSharingSettings).toHaveBeenCalledWith(
        'test-invoice-id',
        {
          is_shareable: true,
          regenerate_token: false
        }
      );
      expect(onSharingChange).toHaveBeenCalledWith(true, 'new-token');
      expect(mockToast).toHaveBeenCalledWith({
        title: 'موفق',
        description: 'اشتراک‌گذاری فعال شد',
      });
    });
  });

  it('handles sharing toggle error', async () => {
    mockQrSharingService.updateSharingSettings.mockRejectedValue(new Error('API Error'));

    render(<InvoiceSharing {...defaultProps} />);

    const toggleButton = screen.getByText('Toggle Sharing');
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'خطا',
        description: 'خطا در تغییر تنظیمات اشتراک‌گذاری',
        variant: 'destructive',
      });
    });
  });

  it('shows quick actions when sharing is enabled', () => {
    mockQrSharingService.getPublicInvoiceUrl.mockReturnValue('https://example.com/public/invoice/test-token');

    render(
      <InvoiceSharing
        {...defaultProps}
        initialIsShareable={true}
        initialQrToken="test-token"
      />
    );

    expect(screen.getByText('لینک عمومی: https://example.com/public/invoice/test-token')).toBeInTheDocument();
    expect(screen.getByText('کپی لینک')).toBeInTheDocument();
    expect(screen.getByText('مشاهده عمومی')).toBeInTheDocument();
  });

  it('handles copy link functionality', async () => {
    mockQrSharingService.getPublicInvoiceUrl.mockReturnValue('https://example.com/public/invoice/test-token');

    render(
      <InvoiceSharing
        {...defaultProps}
        initialIsShareable={true}
        initialQrToken="test-token"
      />
    );

    const copyButton = screen.getByText('کپی لینک');
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://example.com/public/invoice/test-token');
      expect(mockToast).toHaveBeenCalledWith({
        title: 'موفق',
        description: 'لینک کپی شد'
      });
    });
  });

  it('handles open public view functionality', () => {
    mockQrSharingService.getPublicInvoiceUrl.mockReturnValue('https://example.com/public/invoice/test-token');

    render(
      <InvoiceSharing
        {...defaultProps}
        initialIsShareable={true}
        initialQrToken="test-token"
      />
    );

    const viewButton = screen.getByText('مشاهده عمومی');
    fireEvent.click(viewButton);

    expect(window.open).toHaveBeenCalledWith('https://example.com/public/invoice/test-token', '_blank');
  });

  it('does not show quick actions when sharing is disabled', () => {
    render(<InvoiceSharing {...defaultProps} />);

    expect(screen.queryByText(/لینک عمومی:/)).not.toBeInTheDocument();
    expect(screen.queryByText('کپی لینک')).not.toBeInTheDocument();
    expect(screen.queryByText('مشاهده عمومی')).not.toBeInTheDocument();
  });

  it('updates state when initial props change', () => {
    const { rerender } = render(<InvoiceSharing {...defaultProps} />);

    expect(screen.getByText('Shareable: No')).toBeInTheDocument();

    rerender(
      <InvoiceSharing
        {...defaultProps}
        initialIsShareable={true}
        initialQrToken="new-token"
      />
    );

    expect(screen.getByText('Shareable: Yes')).toBeInTheDocument();
  });

  it('handles sharing toggle from enabled to disabled', async () => {
    const onSharingChange = vi.fn();
    mockQrSharingService.updateSharingSettings.mockResolvedValue({
      invoice_id: 'test-invoice-id',
      invoice_number: 'INV-001',
      is_shareable: false,
      qr_token: undefined,
      qr_url: undefined,
    });

    render(
      <InvoiceSharing
        {...defaultProps}
        initialIsShareable={true}
        initialQrToken="test-token"
        onSharingChange={onSharingChange}
      />
    );

    const toggleButton = screen.getByText('Toggle Sharing');
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(mockQrSharingService.updateSharingSettings).toHaveBeenCalledWith(
        'test-invoice-id',
        {
          is_shareable: false,
          regenerate_token: false
        }
      );
      expect(onSharingChange).toHaveBeenCalledWith(false, undefined);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'موفق',
        description: 'اشتراک‌گذاری غیرفعال شد',
      });
    });
  });

  it('passes correct props to child components', () => {
    render(
      <InvoiceSharing
        {...defaultProps}
        initialIsShareable={true}
        initialQrToken="test-token"
      />
    );

    // Check QR code display props
    expect(screen.getByText('Shareable: Yes')).toBeInTheDocument();

    // Switch to analytics tab to check sharing controls props
    const analyticsTab = screen.getByText('آمار و مدیریت');
    fireEvent.click(analyticsTab);

    expect(screen.getByText('Controls for shareable: Yes')).toBeInTheDocument();
  });

  it('handles missing onSharingChange callback gracefully', async () => {
    mockQrSharingService.updateSharingSettings.mockResolvedValue({
      invoice_id: 'test-invoice-id',
      invoice_number: 'INV-001',
      is_shareable: true,
      qr_token: 'new-token',
      qr_url: '/public/invoice/new-token',
    });

    render(
      <InvoiceSharing
        {...defaultProps}
        onSharingChange={undefined}
      />
    );

    const toggleButton = screen.getByText('Toggle Sharing');
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(mockQrSharingService.updateSharingSettings).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith({
        title: 'موفق',
        description: 'اشتراک‌گذاری فعال شد',
      });
    });
  });
});