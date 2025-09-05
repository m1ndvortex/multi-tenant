import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NotificationSettingsComponent from '@/components/notifications/NotificationSettings';
import { notificationService } from '@/services/notificationService';

// Mock the notification service
vi.mock('@/services/notificationService', () => ({
  notificationService: {
    getNotificationSettings: vi.fn(),
    updateNotificationSettings: vi.fn(),
    getEmailTemplates: vi.fn(),
    getSmsTemplates: vi.fn(),
  },
}));

// Mock the toast hook
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockSettings = {
  id: '1',
  tenant_id: 'tenant-1',
  email_notifications: true,
  sms_notifications: false,
  invoice_notifications: true,
  payment_reminders: true,
  marketing_notifications: false,
  reminder_days_before: 3,
  overdue_reminder_frequency: 7,
  email_template_id: 'template-1',
  sms_template_id: 'template-2',
};

const mockEmailTemplates = [
  { id: 'template-1', name: 'قالب پیش‌فرض ایمیل', subject: 'موضوع', content: 'محتوا' },
  { id: 'template-2', name: 'قالب یادآوری', subject: 'یادآوری', content: 'محتوا یادآوری' },
];

const mockSmsTemplates = [
  { id: 'template-1', name: 'قالب پیش‌فرض پیامک', content: 'محتوای پیامک' },
  { id: 'template-2', name: 'قالب یادآوری پیامک', content: 'محتوای یادآوری' },
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

describe('NotificationSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(notificationService.getNotificationSettings).mockResolvedValue(mockSettings);
    vi.mocked(notificationService.getEmailTemplates).mockResolvedValue(mockEmailTemplates);
    vi.mocked(notificationService.getSmsTemplates).mockResolvedValue(mockSmsTemplates);
  });

  it('renders notification settings form', async () => {
    renderWithProviders(<NotificationSettingsComponent />);

    await waitFor(() => {
      expect(screen.getByText('تنظیمات کلی اعلان‌ها')).toBeInTheDocument();
    });

    expect(screen.getByText('اعلان‌های ایمیل')).toBeInTheDocument();
    expect(screen.getByText('اعلان‌های پیامک')).toBeInTheDocument();
    expect(screen.getByText('اعلان فاکتورها')).toBeInTheDocument();
    expect(screen.getByText('یادآوری پرداخت')).toBeInTheDocument();
  });

  it('loads and displays current settings', async () => {
    renderWithProviders(<NotificationSettingsComponent />);

    await waitFor(() => {
      expect(notificationService.getNotificationSettings).toHaveBeenCalled();
    });

    await waitFor(() => {
      const emailSwitch = screen.getByRole('switch', { name: /اعلان‌های ایمیل/i });
      expect(emailSwitch).toBeChecked();
    });

    const smsSwitch = screen.getByRole('switch', { name: /اعلان‌های پیامک/i });
    expect(smsSwitch).not.toBeChecked();
  });

  it('updates notification settings when switches are toggled', async () => {
    renderWithProviders(<NotificationSettingsComponent />);

    await waitFor(() => {
      expect(screen.getByText('تنظیمات کلی اعلان‌ها')).toBeInTheDocument();
    });

    const smsSwitch = screen.getByRole('switch', { name: /اعلان‌های پیامک/i });
    fireEvent.click(smsSwitch);

    expect(smsSwitch).toBeChecked();
  });

  it('updates reminder settings', async () => {
    renderWithProviders(<NotificationSettingsComponent />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('3')).toBeInTheDocument();
    });

    const reminderDaysInput = screen.getByDisplayValue('3');
    fireEvent.change(reminderDaysInput, { target: { value: '5' } });

    expect(reminderDaysInput).toHaveValue(5);
  });

  it('saves settings when save button is clicked', async () => {
    vi.mocked(notificationService.updateNotificationSettings).mockResolvedValue(mockSettings);

    renderWithProviders(<NotificationSettingsComponent />);

    await waitFor(() => {
      expect(screen.getByText('ذخیره تنظیمات')).toBeInTheDocument();
    });

    const saveButton = screen.getByText('ذخیره تنظیمات');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(notificationService.updateNotificationSettings).toHaveBeenCalled();
    });
  });

  it('displays loading state initially', () => {
    renderWithProviders(<NotificationSettingsComponent />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('handles template selection', async () => {
    renderWithProviders(<NotificationSettingsComponent />);

    await waitFor(() => {
      expect(screen.getByText('قالب‌های پیام')).toBeInTheDocument();
    });

    // Template selects should be rendered
    expect(screen.getByText('قالب ایمیل پیش‌فرض')).toBeInTheDocument();
    expect(screen.getByText('قالب پیامک پیش‌فرض')).toBeInTheDocument();
  });

  it('displays marketing notifications toggle', async () => {
    renderWithProviders(<NotificationSettingsComponent />);

    await waitFor(() => {
      expect(screen.getByText('اعلان‌های بازاریابی')).toBeInTheDocument();
    });

    expect(screen.getByText('دریافت پیام‌های تبلیغاتی')).toBeInTheDocument();
    expect(screen.getByText('اجازه ارسال پیام‌های تبلیغاتی و اطلاعیه‌های بازاریابی')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    vi.mocked(notificationService.getNotificationSettings).mockRejectedValue(new Error('API Error'));

    renderWithProviders(<NotificationSettingsComponent />);

    await waitFor(() => {
      expect(screen.getByText('خطا در بارگذاری تنظیمات')).toBeInTheDocument();
    });
  });

  it('disables save button while saving', async () => {
    vi.mocked(notificationService.updateNotificationSettings).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );

    renderWithProviders(<NotificationSettingsComponent />);

    await waitFor(() => {
      expect(screen.getByText('ذخیره تنظیمات')).toBeInTheDocument();
    });

    const saveButton = screen.getByText('ذخیره تنظیمات');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('در حال ذخیره...')).toBeInTheDocument();
    });
  });
});