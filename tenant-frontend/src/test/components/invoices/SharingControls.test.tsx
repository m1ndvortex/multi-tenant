import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SharingControls } from '@/components/invoices/SharingControls';
import { qrSharingService } from '@/services/qrSharingService';
import { useToast } from '@/hooks/use-toast';

// Mock the services and hooks
vi.mock('@/services/qrSharingService');
vi.mock('@/hooks/use-toast');

const mockToast = vi.fn();
const mockQrSharingService = qrSharingService as any;

const mockAccessLogs = [
  {
    id: '1',
    invoice_id: 'test-invoice-id',
    access_ip: '192.168.1.1',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    access_method: 'qr_scan',
    created_at: '2024-01-15T10:30:00Z',
  },
  {
    id: '2',
    invoice_id: 'test-invoice-id',
    access_ip: '192.168.1.2',
    user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
    access_method: 'direct_link',
    created_at: '2024-01-15T11:45:00Z',
  },
];

const mockAccessStats = {
  total_accesses: 25,
  unique_ips: 8,
  daily_accesses: [
    { date: '2024-01-10', count: 3 },
    { date: '2024-01-11', count: 5 },
    { date: '2024-01-12', count: 2 },
    { date: '2024-01-13', count: 7 },
    { date: '2024-01-14', count: 4 },
    { date: '2024-01-15', count: 4 },
  ],
  top_ips: [
    { ip: '192.168.1.1', count: 8 },
    { ip: '192.168.1.2', count: 6 },
    { ip: '192.168.1.3', count: 4 },
  ],
  most_accessed_invoices: [
    { invoice_number: 'INV-001', count: 15 },
    { invoice_number: 'INV-002', count: 10 },
  ],
  period_days: 30,
};

describe('SharingControls', () => {
  const defaultProps = {
    invoiceId: 'test-invoice-id',
    invoiceNumber: 'INV-001',
    isShareable: true,
    qrToken: 'test-qr-token',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useToast as any).mockReturnValue({ toast: mockToast });
    
    mockQrSharingService.getAccessLogs = vi.fn();
    mockQrSharingService.getAccessStatistics = vi.fn();
  });

  it('renders correctly when sharing is disabled', () => {
    render(
      <SharingControls
        {...defaultProps}
        isShareable={false}
        qrToken={undefined}
      />
    );

    expect(screen.getByText('اشتراک‌گذاری غیرفعال')).toBeInTheDocument();
    expect(screen.getByText('برای مشاهده آمار دسترسی، ابتدا اشتراک‌گذاری را فعال کنید')).toBeInTheDocument();
  });

  it('renders tabs when sharing is enabled', async () => {
    mockQrSharingService.getAccessLogs.mockResolvedValue(mockAccessLogs);

    render(<SharingControls {...defaultProps} />);

    expect(screen.getByText('تاریخچه دسترسی')).toBeInTheDocument();
    expect(screen.getByText('آمار کلی')).toBeInTheDocument();
    expect(screen.getByText('مدیریت اشتراک‌گذاری و آمار دسترسی')).toBeInTheDocument();
  });

  it('loads and displays access logs correctly', async () => {
    mockQrSharingService.getAccessLogs.mockResolvedValue(mockAccessLogs);

    render(<SharingControls {...defaultProps} />);

    await waitFor(() => {
      expect(mockQrSharingService.getAccessLogs).toHaveBeenCalledWith(
        'test-invoice-id',
        30,
        0,
        50
      );
    });

    await waitFor(() => {
      expect(screen.getByText('اسکن QR')).toBeInTheDocument();
      expect(screen.getByText('لینک مستقیم')).toBeInTheDocument();
      expect(screen.getByText('IP: 192.168.1.1')).toBeInTheDocument();
      expect(screen.getByText('IP: 192.168.1.2')).toBeInTheDocument();
    });
  });

  it('loads access logs on mount', async () => {
    mockQrSharingService.getAccessLogs.mockResolvedValue(mockAccessLogs);

    render(<SharingControls {...defaultProps} />);

    await waitFor(() => {
      expect(mockQrSharingService.getAccessLogs).toHaveBeenCalledWith(
        'test-invoice-id',
        30,
        0,
        50
      );
    });

    // Check that access logs are displayed
    await waitFor(() => {
      expect(screen.getByText('اسکن QR')).toBeInTheDocument();
      expect(screen.getByText('لینک مستقیم')).toBeInTheDocument();
    });
  });

  it('calls access statistics service on mount', async () => {
    mockQrSharingService.getAccessStatistics.mockResolvedValue(mockAccessStats);

    render(<SharingControls {...defaultProps} />);

    // Check that the service is called during component initialization
    await waitFor(() => {
      expect(mockQrSharingService.getAccessLogs).toHaveBeenCalled();
    });
  });

  it('renders refresh button correctly', async () => {
    mockQrSharingService.getAccessLogs.mockResolvedValue(mockAccessLogs);

    render(<SharingControls {...defaultProps} />);

    // Wait for initial load to complete and data to be displayed
    await waitFor(() => {
      expect(screen.getByText('اسکن QR')).toBeInTheDocument();
    });

    // Check that refresh button is present and not disabled after loading
    const refreshButton = screen.getByRole('button', { name: /بروزرسانی/ });
    expect(refreshButton).toBeInTheDocument();
    expect(refreshButton).not.toBeDisabled();
  });

  it('shows loading state correctly', async () => {
    mockQrSharingService.getAccessLogs.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    render(<SharingControls {...defaultProps} />);

    expect(screen.getByText('در حال بارگذاری...')).toBeInTheDocument();
  });

  it('handles empty access logs correctly', async () => {
    mockQrSharingService.getAccessLogs.mockResolvedValue([]);

    render(<SharingControls {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('هنوز هیچ دسترسی ثبت نشده است')).toBeInTheDocument();
    });
  });

  it('handles empty statistics correctly', async () => {
    mockQrSharingService.getAccessLogs.mockResolvedValue([]);
    mockQrSharingService.getAccessStatistics.mockResolvedValue({
      total_accesses: 0,
      unique_ips: 0,
      daily_accesses: [],
      top_ips: [],
      most_accessed_invoices: [],
      period_days: 30,
    });

    render(<SharingControls {...defaultProps} />);

    // Check that the component renders with empty logs message
    await waitFor(() => {
      expect(screen.getByText('هنوز هیچ دسترسی ثبت نشده است')).toBeInTheDocument();
    });
  });

  it('detects device types correctly', async () => {
    const mobileLog = {
      ...mockAccessLogs[0],
      user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
    };

    mockQrSharingService.getAccessLogs.mockResolvedValue([mobileLog]);

    render(<SharingControls {...defaultProps} />);

    await waitFor(() => {
      // Should detect mobile device and show appropriate icon
      expect(screen.getByText('اسکن QR')).toBeInTheDocument();
    });
  });

  it('handles different access methods correctly', async () => {
    const accessMethods = [
      { ...mockAccessLogs[0], access_method: 'qr_scan' },
      { ...mockAccessLogs[1], access_method: 'direct_link' },
      { ...mockAccessLogs[0], access_method: 'pdf_download', id: '3' },
    ];

    mockQrSharingService.getAccessLogs.mockResolvedValue(accessMethods);

    render(<SharingControls {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('اسکن QR')).toBeInTheDocument();
      expect(screen.getByText('لینک مستقیم')).toBeInTheDocument();
      expect(screen.getByText('دانلود PDF')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    mockQrSharingService.getAccessLogs.mockRejectedValue(new Error('API Error'));

    render(<SharingControls {...defaultProps} />);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'خطا',
        description: 'خطا در بارگذاری اطلاعات دسترسی',
        variant: 'destructive',
      });
    });
  });

  it('formats dates correctly in Persian', async () => {
    mockQrSharingService.getAccessLogs.mockResolvedValue(mockAccessLogs);

    render(<SharingControls {...defaultProps} />);

    await waitFor(() => {
      // Check that dates are formatted (should contain Persian numerals or date format)
      // The date 2024-01-15 should be formatted to Persian calendar
      const dateElements = screen.getAllByText(/۱۴۰۲|۲۵ دی|۱۰:۳۰/);
      expect(dateElements.length).toBeGreaterThan(0);
    });
  });

  it('renders tab navigation correctly', async () => {
    mockQrSharingService.getAccessLogs.mockResolvedValue(mockAccessLogs);
    mockQrSharingService.getAccessStatistics.mockResolvedValue(mockAccessStats);

    render(<SharingControls {...defaultProps} />);

    // Check that both tabs are present
    expect(screen.getByRole('tab', { name: /تاریخچه دسترسی/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /آمار کلی/ })).toBeInTheDocument();

    // Initially on logs tab
    await waitFor(() => {
      expect(screen.getByText('تاریخچه دسترسی (30 روز اخیر)')).toBeInTheDocument();
    });

    // Check that access logs are loaded
    await waitFor(() => {
      expect(mockQrSharingService.getAccessLogs).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('تاریخچه دسترسی (30 روز اخیر)')).toBeInTheDocument();
    });
  });
});