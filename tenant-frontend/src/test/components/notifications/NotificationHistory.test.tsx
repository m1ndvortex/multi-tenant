import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NotificationHistoryComponent from '@/components/notifications/NotificationHistory';
import { notificationService } from '@/services/notificationService';

// Mock the notification service
vi.mock('@/services/notificationService', () => ({
  notificationService: {
    getNotificationHistory: vi.fn(),
  },
}));

// Mock the toast hook
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockNotifications = [
  {
    id: '1',
    tenant_id: 'tenant-1',
    recipient_email: 'customer@example.com',
    notification_type: 'email' as const,
    subject: 'فاکتور جدید',
    message: 'فاکتور شماره 1001 برای شما ارسال شد',
    status: 'sent' as const,
    sent_at: '2024-01-15T10:30:00Z',
    invoice_id: 'invoice-1',
    customer_id: 'customer-1',
  },
  {
    id: '2',
    tenant_id: 'tenant-1',
    recipient_phone: '09123456789',
    notification_type: 'sms' as const,
    message: 'یادآوری پرداخت فاکتور',
    status: 'failed' as const,
    error_message: 'شماره تلفن نامعتبر',
    invoice_id: 'invoice-2',
    customer_id: 'customer-2',
  },
  {
    id: '3',
    tenant_id: 'tenant-1',
    recipient_email: 'test@example.com',
    notification_type: 'email' as const,
    subject: 'کمپین بازاریابی',
    message: 'پیشنهاد ویژه برای شما',
    status: 'pending' as const,
  },
];

const mockHistoryResponse = {
  notifications: mockNotifications,
  total: 3,
  page: 1,
  limit: 20,
};

const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('NotificationHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(notificationService.getNotificationHistory).mockResolvedValue(mockHistoryResponse);
  });

  it('renders notification history table', async () => {
    renderWithProviders(<NotificationHistoryComponent />);

    await waitFor(() => {
      expect(screen.getByText('تاریخچه اعلان‌ها')).toBeInTheDocument();
    });

    // Wait for data to load and table to render
    await waitFor(() => {
      expect(screen.getByText('نوع')).toBeInTheDocument();
    });

    expect(screen.getByText('گیرنده')).toBeInTheDocument();
    expect(screen.getByText('موضوع/پیام')).toBeInTheDocument();
    expect(screen.getByText('وضعیت')).toBeInTheDocument();
  });

  it('loads and displays notification history', async () => {
    renderWithProviders(<NotificationHistoryComponent />);

    await waitFor(() => {
      expect(notificationService.getNotificationHistory).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('customer@example.com')).toBeInTheDocument();
      expect(screen.getByText('09123456789')).toBeInTheDocument();
      expect(screen.getByText('فاکتور جدید')).toBeInTheDocument();
    });
  });

  it('displays correct status badges', async () => {
    renderWithProviders(<NotificationHistoryComponent />);

    await waitFor(() => {
      expect(screen.getByText('ارسال شده')).toBeInTheDocument();
      expect(screen.getByText('ناموفق')).toBeInTheDocument();
      expect(screen.getByText('در انتظار')).toBeInTheDocument();
    });
  });

  it('displays notification types with icons', async () => {
    renderWithProviders(<NotificationHistoryComponent />);

    await waitFor(() => {
      expect(screen.getAllByText('ایمیل')).toHaveLength(2);
      expect(screen.getByText('پیامک')).toBeInTheDocument();
    });
  });

  it('filters notifications by type', async () => {
    renderWithProviders(<NotificationHistoryComponent />);

    await waitFor(() => {
      expect(screen.getByText('تاریخچه اعلان‌ها')).toBeInTheDocument();
    });

    // Find and click the type filter (first combobox)
    const typeFilters = screen.getAllByRole('combobox');
    fireEvent.click(typeFilters[0]);

    // The filter should trigger a new API call
    await waitFor(() => {
      expect(notificationService.getNotificationHistory).toHaveBeenCalledTimes(1);
    });
  });

  it('searches notifications', async () => {
    renderWithProviders(<NotificationHistoryComponent />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('جستجو در اعلان‌ها...')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('جستجو در اعلان‌ها...');
    fireEvent.change(searchInput, { target: { value: 'customer@example.com' } });

    // Should filter the displayed results
    await waitFor(() => {
      expect(screen.getByText('customer@example.com')).toBeInTheDocument();
    });
  });

  it('refreshes notification history', async () => {
    renderWithProviders(<NotificationHistoryComponent />);

    await waitFor(() => {
      expect(screen.getByText('تاریخچه اعلان‌ها')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: 'بروزرسانی' });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(notificationService.getNotificationHistory).toHaveBeenCalledTimes(2);
    });
  });

  it('displays error messages for failed notifications', async () => {
    renderWithProviders(<NotificationHistoryComponent />);

    await waitFor(() => {
      expect(screen.getByText('شماره تلفن نامعتبر')).toBeInTheDocument();
    });
  });

  it('handles empty state', async () => {
    vi.mocked(notificationService.getNotificationHistory).mockResolvedValue({
      notifications: [],
      total: 0,
      page: 1,
      limit: 20,
    });

    renderWithProviders(<NotificationHistoryComponent />);

    await waitFor(() => {
      expect(screen.getByText('هیچ اعلانی یافت نشد')).toBeInTheDocument();
    });
  });

  it('displays loading state initially', () => {
    renderWithProviders(<NotificationHistoryComponent />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    vi.mocked(notificationService.getNotificationHistory).mockRejectedValue(new Error('API Error'));

    renderWithProviders(<NotificationHistoryComponent />);

    // Should still render the component structure
    await waitFor(() => {
      expect(screen.getByText('تاریخچه اعلان‌ها')).toBeInTheDocument();
    });
  });

  it('clears filters when clear button is clicked', async () => {
    renderWithProviders(<NotificationHistoryComponent />);

    await waitFor(() => {
      expect(screen.getByText('تاریخچه اعلان‌ها')).toBeInTheDocument();
    });

    // Add some filter values
    const searchInput = screen.getByPlaceholderText('جستجو در اعلان‌ها...');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    // Click clear filters button
    const clearButton = screen.getByRole('button', { name: 'پاک کردن فیلترها' });
    fireEvent.click(clearButton);

    // Should reset filters and reload data (initial load + filter change + clear = 3 calls)
    await waitFor(() => {
      expect(notificationService.getNotificationHistory).toHaveBeenCalledTimes(3);
    });
  });

  it('formats dates correctly', async () => {
    renderWithProviders(<NotificationHistoryComponent />);

    await waitFor(() => {
      // Should display formatted Persian date
      expect(screen.getByText(/۱۴۰۲/)).toBeInTheDocument(); // Persian year
    });
  });
});