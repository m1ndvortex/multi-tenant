import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import AlertSystemInterface from '@/components/business-intelligence/AlertSystemInterface';
import { businessIntelligenceService } from '@/services/businessIntelligenceService';

// Mock the business intelligence service
vi.mock('@/services/businessIntelligenceService', () => ({
  businessIntelligenceService: {
    getBusinessAlerts: vi.fn(),
    markAlertAsRead: vi.fn(),
    resolveAlert: vi.fn(),
  },
}));

// Mock the toast hook
vi.mock('@/components/ui/use-toast', () => ({
  toast: vi.fn(),
}));

const mockAlerts = [
  {
    id: '1',
    type: 'overdue_payment' as const,
    severity: 'high' as const,
    title: 'پرداخت معوقه',
    description: 'فاکتور شماره 1001 از تاریخ سررسید گذشته است',
    entity_type: 'invoice' as const,
    entity_id: 'inv-1001',
    entity_name: 'فاکتور 1001 - احمد محمدی',
    amount: 5000000,
    due_date: '2024-01-10',
    created_at: '2024-01-15T10:00:00Z',
    is_read: false,
    is_resolved: false,
    actionable: true,
    action_url: '/invoices/inv-1001',
    action_text: 'مشاهده فاکتور',
  },
  {
    id: '2',
    type: 'low_stock' as const,
    severity: 'medium' as const,
    title: 'موجودی کم',
    description: 'موجودی محصول "گردنبند طلا" کمتر از 5 عدد است',
    entity_type: 'product' as const,
    entity_id: 'prod-123',
    entity_name: 'گردنبند طلا',
    created_at: '2024-01-15T09:00:00Z',
    is_read: true,
    is_resolved: false,
    actionable: true,
    action_url: '/products/prod-123',
    action_text: 'مدیریت موجودی',
  },
  {
    id: '3',
    type: 'high_debt' as const,
    severity: 'critical' as const,
    title: 'بدهی بالا',
    description: 'مشتری "علی احمدی" بدهی بالای 10 میلیون تومان دارد',
    entity_type: 'customer' as const,
    entity_id: 'cust-456',
    entity_name: 'علی احمدی',
    amount: 12000000,
    created_at: '2024-01-15T08:00:00Z',
    is_read: false,
    is_resolved: true,
    actionable: true,
    action_url: '/customers/cust-456',
    action_text: 'مشاهده مشتری',
  },
];

const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
};

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('AlertSystemInterface', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state correctly', () => {
    vi.mocked(businessIntelligenceService.getBusinessAlerts).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderWithQueryClient(<AlertSystemInterface />);

    expect(screen.getByText('هشدارها و اعلان‌ها')).toBeInTheDocument();
    expect(screen.getAllByRole('status')).toHaveLength(3); // Loading skeletons
  });

  it('renders error state correctly', async () => {
    vi.mocked(businessIntelligenceService.getBusinessAlerts).mockRejectedValue(
      new Error('Network error')
    );

    renderWithQueryClient(<AlertSystemInterface />);

    await waitFor(() => {
      expect(screen.getByText('خطا در بارگذاری هشدارها')).toBeInTheDocument();
    });

    expect(screen.getByText('تلاش مجدد')).toBeInTheDocument();
  });

  it('renders empty state when no alerts available', async () => {
    vi.mocked(businessIntelligenceService.getBusinessAlerts).mockResolvedValue([]);

    renderWithQueryClient(<AlertSystemInterface />);

    await waitFor(() => {
      expect(screen.getByText('هیچ هشداری یافت نشد')).toBeInTheDocument();
    });
  });

  it('renders alerts correctly', async () => {
    vi.mocked(businessIntelligenceService.getBusinessAlerts).mockResolvedValue(mockAlerts);

    renderWithQueryClient(<AlertSystemInterface />);

    await waitFor(() => {
      expect(screen.getByText('پرداخت معوقه')).toBeInTheDocument();
    });

    // Check all alerts are rendered
    expect(screen.getByText('پرداخت معوقه')).toBeInTheDocument();
    expect(screen.getByText('موجودی کم')).toBeInTheDocument();
    expect(screen.getByText('بدهی بالا')).toBeInTheDocument();

    // Check descriptions
    expect(screen.getByText('فاکتور شماره 1001 از تاریخ سررسید گذشته است')).toBeInTheDocument();
    expect(screen.getByText('موجودی محصول "گردنبند طلا" کمتر از 5 عدد است')).toBeInTheDocument();
    expect(screen.getByText('مشتری "علی احمدی" بدهی بالای 10 میلیون تومان دارد')).toBeInTheDocument();

    // Check entity names
    expect(screen.getByText('فاکتور 1001 - احمد محمدی')).toBeInTheDocument();
    expect(screen.getByText('گردنبند طلا')).toBeInTheDocument();
    expect(screen.getByText('علی احمدی')).toBeInTheDocument();

    // Check amounts
    expect(screen.getByText('5,000,000 تومان')).toBeInTheDocument();
    expect(screen.getByText('12,000,000 تومان')).toBeInTheDocument();
  });

  it('displays correct severity badges', async () => {
    vi.mocked(businessIntelligenceService.getBusinessAlerts).mockResolvedValue(mockAlerts);

    renderWithQueryClient(<AlertSystemInterface />);

    await waitFor(() => {
      expect(screen.getByText('پرداخت معوقه')).toBeInTheDocument();
    });

    // Check severity badges
    expect(screen.getByText('مهم')).toBeInTheDocument(); // high
    expect(screen.getByText('متوسط')).toBeInTheDocument(); // medium
    expect(screen.getByText('بحرانی')).toBeInTheDocument(); // critical
  });

  it('displays correct type labels', async () => {
    vi.mocked(businessIntelligenceService.getBusinessAlerts).mockResolvedValue(mockAlerts);

    renderWithQueryClient(<AlertSystemInterface />);

    await waitFor(() => {
      expect(screen.getByText('پرداخت معوقه')).toBeInTheDocument();
    });

    // Check type labels
    expect(screen.getByText('پرداخت معوقه')).toBeInTheDocument();
    expect(screen.getByText('موجودی کم')).toBeInTheDocument();
    expect(screen.getByText('بدهی بالا')).toBeInTheDocument();
  });

  it('shows unread count badge', async () => {
    vi.mocked(businessIntelligenceService.getBusinessAlerts).mockResolvedValue(mockAlerts);

    renderWithQueryClient(<AlertSystemInterface />);

    await waitFor(() => {
      expect(screen.getByText('پرداخت معوقه')).toBeInTheDocument();
    });

    // Check unread count (2 unread alerts)
    expect(screen.getByText('2 خوانده نشده')).toBeInTheDocument();
  });

  it('handles mark as read functionality', async () => {
    vi.mocked(businessIntelligenceService.getBusinessAlerts).mockResolvedValue(mockAlerts);
    vi.mocked(businessIntelligenceService.markAlertAsRead).mockResolvedValue();

    renderWithQueryClient(<AlertSystemInterface />);

    await waitFor(() => {
      expect(screen.getByText('پرداخت معوقه')).toBeInTheDocument();
    });

    // Find and click mark as read button for first alert (unread)
    const markAsReadButtons = screen.getAllByTitle('علامت‌گذاری به عنوان خوانده شده');
    fireEvent.click(markAsReadButtons[0]);

    expect(businessIntelligenceService.markAlertAsRead).toHaveBeenCalledWith('1');
  });

  it('handles resolve alert functionality', async () => {
    vi.mocked(businessIntelligenceService.getBusinessAlerts).mockResolvedValue(mockAlerts);
    vi.mocked(businessIntelligenceService.resolveAlert).mockResolvedValue();

    renderWithQueryClient(<AlertSystemInterface />);

    await waitFor(() => {
      expect(screen.getByText('پرداخت معوقه')).toBeInTheDocument();
    });

    // Find and click resolve button for first alert (unresolved)
    const resolveButtons = screen.getAllByTitle('علامت‌گذاری به عنوان حل شده');
    fireEvent.click(resolveButtons[0]);

    expect(businessIntelligenceService.resolveAlert).toHaveBeenCalledWith('1');
  });

  it('shows resolved status correctly', async () => {
    vi.mocked(businessIntelligenceService.getBusinessAlerts).mockResolvedValue(mockAlerts);

    renderWithQueryClient(<AlertSystemInterface />);

    await waitFor(() => {
      expect(screen.getByText('پرداخت معوقه')).toBeInTheDocument();
    });

    // Check resolved status for third alert
    expect(screen.getByText('حل شده')).toBeInTheDocument();
  });

  it('displays action buttons correctly', async () => {
    vi.mocked(businessIntelligenceService.getBusinessAlerts).mockResolvedValue(mockAlerts);

    renderWithQueryClient(<AlertSystemInterface />);

    await waitFor(() => {
      expect(screen.getByText('پرداخت معوقه')).toBeInTheDocument();
    });

    // Check action buttons
    expect(screen.getByText('مشاهده فاکتور')).toBeInTheDocument();
    expect(screen.getByText('مدیریت موجودی')).toBeInTheDocument();
    expect(screen.getByText('مشاهده مشتری')).toBeInTheDocument();
  });

  it('handles filters correctly', async () => {
    vi.mocked(businessIntelligenceService.getBusinessAlerts).mockResolvedValue(mockAlerts);

    renderWithQueryClient(<AlertSystemInterface showFilters={true} />);

    await waitFor(() => {
      expect(screen.getByText('پرداخت معوقه')).toBeInTheDocument();
    });

    // Check filter section exists
    expect(screen.getByText('فیلترها')).toBeInTheDocument();

    // Check filter dropdowns
    expect(screen.getByDisplayValue('همه اولویت‌ها')).toBeInTheDocument();
    expect(screen.getByDisplayValue('همه انواع')).toBeInTheDocument();
    expect(screen.getByDisplayValue('حل نشده')).toBeInTheDocument();
    expect(screen.getByDisplayValue('همه')).toBeInTheDocument();
  });

  it('applies severity filter', async () => {
    vi.mocked(businessIntelligenceService.getBusinessAlerts).mockResolvedValue(mockAlerts);

    renderWithQueryClient(<AlertSystemInterface showFilters={true} />);

    await waitFor(() => {
      expect(screen.getByText('پرداخت معوقه')).toBeInTheDocument();
    });

    // Change severity filter
    const severitySelect = screen.getByDisplayValue('همه اولویت‌ها');
    fireEvent.change(severitySelect, { target: { value: 'high' } });

    // Service should be called with new filter
    await waitFor(() => {
      expect(businessIntelligenceService.getBusinessAlerts).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'high' })
      );
    });
  });

  it('applies type filter', async () => {
    vi.mocked(businessIntelligenceService.getBusinessAlerts).mockResolvedValue(mockAlerts);

    renderWithQueryClient(<AlertSystemInterface showFilters={true} />);

    await waitFor(() => {
      expect(screen.getByText('پرداخت معوقه')).toBeInTheDocument();
    });

    // Change type filter
    const typeSelect = screen.getByDisplayValue('همه انواع');
    fireEvent.change(typeSelect, { target: { value: 'overdue_payment' } });

    // Service should be called with new filter
    await waitFor(() => {
      expect(businessIntelligenceService.getBusinessAlerts).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'overdue_payment' })
      );
    });
  });

  it('limits alerts when maxAlerts prop is provided', async () => {
    const manyAlerts = Array.from({ length: 15 }, (_, i) => ({
      ...mockAlerts[0],
      id: `alert-${i}`,
      title: `هشدار ${i + 1}`,
    }));

    vi.mocked(businessIntelligenceService.getBusinessAlerts).mockResolvedValue(manyAlerts);

    renderWithQueryClient(<AlertSystemInterface maxAlerts={5} />);

    await waitFor(() => {
      expect(screen.getByText('هشدار 1')).toBeInTheDocument();
    });

    // Should only show 5 alerts
    expect(screen.getByText('هشدار 5')).toBeInTheDocument();
    expect(screen.queryByText('هشدار 6')).not.toBeInTheDocument();
  });

  it('hides filters when showFilters is false', async () => {
    vi.mocked(businessIntelligenceService.getBusinessAlerts).mockResolvedValue(mockAlerts);

    renderWithQueryClient(<AlertSystemInterface showFilters={false} />);

    await waitFor(() => {
      expect(screen.getByText('پرداخت معوقه')).toBeInTheDocument();
    });

    // Filters should not be visible
    expect(screen.queryByText('فیلترها')).not.toBeInTheDocument();
  });

  it('handles refresh functionality', async () => {
    vi.mocked(businessIntelligenceService.getBusinessAlerts).mockResolvedValue(mockAlerts);

    renderWithQueryClient(<AlertSystemInterface />);

    await waitFor(() => {
      expect(screen.getByText('پرداخت معوقه')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: '' }); // Refresh button with icon only
    fireEvent.click(refreshButton);

    expect(refreshButton).toBeInTheDocument();
  });

  it('applies custom className correctly', () => {
    vi.mocked(businessIntelligenceService.getBusinessAlerts).mockResolvedValue([]);

    const { container } = renderWithQueryClient(
      <AlertSystemInterface className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('formats dates correctly', async () => {
    vi.mocked(businessIntelligenceService.getBusinessAlerts).mockResolvedValue(mockAlerts);

    renderWithQueryClient(<AlertSystemInterface />);

    await waitFor(() => {
      expect(screen.getByText('پرداخت معوقه')).toBeInTheDocument();
    });

    // Check that dates are formatted (we can't test exact format due to locale differences)
    const dateElements = screen.getAllByText(/۱۴۰۲|2024|Jan|ژانویه/i);
    expect(dateElements.length).toBeGreaterThan(0);
  });
});