import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ManualReminderComponent from '@/components/notifications/ManualReminder';
import { notificationService } from '@/services/notificationService';

// Mock the notification service
vi.mock('@/services/notificationService', () => ({
  notificationService: {
    getUnpaidInvoices: vi.fn(),
    sendManualReminder: vi.fn(),
  },
}));

// Mock the toast hook
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockUnpaidInvoices = [
  {
    id: 'invoice-1',
    invoice_number: 'INV-1001',
    customer_name: 'احمد محمدی',
    customer_email: 'ahmad@example.com',
    customer_phone: '09123456789',
    total_amount: 1500000,
    due_date: '2024-01-10',
    days_overdue: 5,
  },
  {
    id: 'invoice-2',
    invoice_number: 'INV-1002',
    customer_name: 'فاطمه احمدی',
    customer_email: 'fateme@example.com',
    total_amount: 2500000,
    due_date: '2024-01-20',
    days_overdue: -2, // Not overdue yet
  },
  {
    id: 'invoice-3',
    invoice_number: 'INV-1003',
    customer_name: 'علی رضایی',
    customer_phone: '09987654321',
    total_amount: 750000,
    due_date: '2024-01-05',
    days_overdue: 10,
  },
];

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

describe('ManualReminder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(notificationService.getUnpaidInvoices).mockResolvedValue(mockUnpaidInvoices);
    vi.mocked(notificationService.sendManualReminder).mockResolvedValue({
      success: true,
      message: 'یادآوری با موفقیت ارسال شد',
    });
  });

  it('renders manual reminder interface', async () => {
    renderWithProviders(<ManualReminderComponent />);

    await waitFor(() => {
      expect(screen.getByText('ارسال یادآوری دستی')).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText('جستجو در فاکتورها...')).toBeInTheDocument();
  });

  it('loads and displays unpaid invoices', async () => {
    renderWithProviders(<ManualReminderComponent />);

    await waitFor(() => {
      expect(notificationService.getUnpaidInvoices).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('INV-1001')).toBeInTheDocument();
      expect(screen.getByText('احمد محمدی')).toBeInTheDocument();
      expect(screen.getByText('INV-1002')).toBeInTheDocument();
      expect(screen.getByText('فاطمه احمدی')).toBeInTheDocument();
    });
  });

  it('displays correct overdue badges', async () => {
    renderWithProviders(<ManualReminderComponent />);

    await waitFor(() => {
      expect(screen.getByText('5 روز معوق')).toBeInTheDocument();
      expect(screen.getByText('10 روز معوق')).toBeInTheDocument();
      expect(screen.getByText('نزدیک به سررسید')).toBeInTheDocument();
    });
  });

  it('displays contact information correctly', async () => {
    renderWithProviders(<ManualReminderComponent />);

    await waitFor(() => {
      expect(screen.getByText('ahmad@example.com')).toBeInTheDocument();
      expect(screen.getByText('09123456789')).toBeInTheDocument();
      expect(screen.getByText('09987654321')).toBeInTheDocument();
    });
  });

  it('formats currency amounts correctly', async () => {
    renderWithProviders(<ManualReminderComponent />);

    await waitFor(() => {
      expect(screen.getByText('1,500,000 تومان')).toBeInTheDocument();
      expect(screen.getByText('2,500,000 تومان')).toBeInTheDocument();
      expect(screen.getByText('750,000 تومان')).toBeInTheDocument();
    });
  });

  it('opens reminder dialog when send reminder button is clicked', async () => {
    renderWithProviders(<ManualReminderComponent />);

    await waitFor(() => {
      expect(screen.getByText('INV-1001')).toBeInTheDocument();
    });

    const sendButtons = screen.getAllByText('ارسال یادآوری');
    fireEvent.click(sendButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('ارسال یادآوری')).toBeInTheDocument();
      expect(screen.getByText('شماره فاکتور:')).toBeInTheDocument();
      expect(screen.getByText('INV-1001')).toBeInTheDocument();
    });
  });

  it('pre-fills reminder message with invoice details', async () => {
    renderWithProviders(<ManualReminderComponent />);

    await waitFor(() => {
      expect(screen.getByText('INV-1001')).toBeInTheDocument();
    });

    const sendButtons = screen.getAllByText('ارسال یادآوری');
    fireEvent.click(sendButtons[0]);

    await waitFor(() => {
      const messageTextarea = screen.getByRole('textbox', { name: /متن پیام/i });
      expect(messageTextarea).toHaveValue(expect.stringContaining('احمد محمدی عزیز'));
      expect(messageTextarea).toHaveValue(expect.stringContaining('INV-1001'));
      expect(messageTextarea).toHaveValue(expect.stringContaining('1,500,000'));
    });
  });

  it('allows editing reminder message', async () => {
    renderWithProviders(<ManualReminderComponent />);

    await waitFor(() => {
      expect(screen.getByText('INV-1001')).toBeInTheDocument();
    });

    const sendButtons = screen.getAllByText('ارسال یادآوری');
    fireEvent.click(sendButtons[0]);

    await waitFor(() => {
      const messageTextarea = screen.getByRole('textbox', { name: /متن پیام/i });
      fireEvent.change(messageTextarea, { target: { value: 'پیام سفارشی' } });
      expect(messageTextarea).toHaveValue('پیام سفارشی');
    });
  });

  it('sends reminder when send button is clicked', async () => {
    renderWithProviders(<ManualReminderComponent />);

    await waitFor(() => {
      expect(screen.getByText('INV-1001')).toBeInTheDocument();
    });

    const sendButtons = screen.getAllByText('ارسال یادآوری');
    fireEvent.click(sendButtons[0]);

    await waitFor(() => {
      const dialogSendButton = screen.getByRole('button', { name: /ارسال یادآوری/i });
      fireEvent.click(dialogSendButton);
    });

    await waitFor(() => {
      expect(notificationService.sendManualReminder).toHaveBeenCalledWith({
        invoice_id: 'invoice-1',
        notification_type: 'email',
        custom_message: expect.stringContaining('احمد محمدی عزیز'),
      });
    });
  });

  it('disables send button for invoices without contact info', async () => {
    const invoicesWithoutContact = [
      {
        id: 'invoice-4',
        invoice_number: 'INV-1004',
        customer_name: 'مشتری بدون اطلاعات',
        total_amount: 1000000,
        due_date: '2024-01-15',
        days_overdue: 0,
      },
    ];

    vi.mocked(notificationService.getUnpaidInvoices).mockResolvedValue(invoicesWithoutContact);

    renderWithProviders(<ManualReminderComponent />);

    await waitFor(() => {
      expect(screen.getByText('اطلاعات تماس ناموجود')).toBeInTheDocument();
    });

    const sendButton = screen.getByRole('button', { name: /ارسال یادآوری/i });
    expect(sendButton).toBeDisabled();
  });

  it('searches invoices by customer name', async () => {
    renderWithProviders(<ManualReminderComponent />);

    await waitFor(() => {
      expect(screen.getByText('احمد محمدی')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('جستجو در فاکتورها...');
    fireEvent.change(searchInput, { target: { value: 'احمد' } });

    await waitFor(() => {
      expect(screen.getByText('احمد محمدی')).toBeInTheDocument();
      expect(screen.queryByText('فاطمه احمدی')).not.toBeInTheDocument();
    });
  });

  it('refreshes invoice list when refresh button is clicked', async () => {
    renderWithProviders(<ManualReminderComponent />);

    await waitFor(() => {
      expect(screen.getByText('INV-1001')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: 'بروزرسانی' });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(notificationService.getUnpaidInvoices).toHaveBeenCalledTimes(2);
    });
  });

  it('handles empty state when no unpaid invoices', async () => {
    vi.mocked(notificationService.getUnpaidInvoices).mockResolvedValue([]);

    renderWithProviders(<ManualReminderComponent />);

    await waitFor(() => {
      expect(screen.getByText('همه فاکتورها پرداخت شده‌اند')).toBeInTheDocument();
    });
  });

  it('displays loading state initially', () => {
    renderWithProviders(<ManualReminderComponent />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    vi.mocked(notificationService.getUnpaidInvoices).mockRejectedValue(new Error('API Error'));

    renderWithProviders(<ManualReminderComponent />);

    // Should still render the component structure
    await waitFor(() => {
      expect(screen.getByText('ارسال یادآوری دستی')).toBeInTheDocument();
    });
  });

  it('closes dialog when cancel button is clicked', async () => {
    renderWithProviders(<ManualReminderComponent />);

    await waitFor(() => {
      expect(screen.getByText('INV-1001')).toBeInTheDocument();
    });

    const sendButtons = screen.getAllByText('ارسال یادآوری');
    fireEvent.click(sendButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('انصراف')).toBeInTheDocument();
    });

    const cancelButton = screen.getByText('انصراف');
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText('شماره فاکتور:')).not.toBeInTheDocument();
    });
  });
});