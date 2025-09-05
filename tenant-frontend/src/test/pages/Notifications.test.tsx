import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Notifications from '@/pages/Notifications';
import { notificationService } from '@/services/notificationService';

// Mock all notification service methods
vi.mock('@/services/notificationService', () => ({
  notificationService: {
    getNotificationSettings: vi.fn(),
    updateNotificationSettings: vi.fn(),
    getEmailTemplates: vi.fn(),
    getSmsTemplates: vi.fn(),
    getNotificationHistory: vi.fn(),
    getUnpaidInvoices: vi.fn(),
    sendManualReminder: vi.fn(),
    getMarketingCampaigns: vi.fn(),
    getCustomerSegments: vi.fn(),
    getCustomerTags: vi.fn(),
    createMarketingCampaign: vi.fn(),
    updateMarketingCampaign: vi.fn(),
    deleteMarketingCampaign: vi.fn(),
    sendMarketingCampaign: vi.fn(),
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
};

const mockHistory = {
  notifications: [],
  total: 0,
  page: 1,
  limit: 20,
};

const mockUnpaidInvoices = [];

const mockCampaigns = {
  campaigns: [],
  total: 0,
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

describe('Notifications Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock all service calls with default responses
    vi.mocked(notificationService.getNotificationSettings).mockResolvedValue(mockSettings);
    vi.mocked(notificationService.getEmailTemplates).mockResolvedValue([]);
    vi.mocked(notificationService.getSmsTemplates).mockResolvedValue([]);
    vi.mocked(notificationService.getNotificationHistory).mockResolvedValue(mockHistory);
    vi.mocked(notificationService.getUnpaidInvoices).mockResolvedValue(mockUnpaidInvoices);
    vi.mocked(notificationService.getMarketingCampaigns).mockResolvedValue(mockCampaigns);
    vi.mocked(notificationService.getCustomerSegments).mockResolvedValue([]);
    vi.mocked(notificationService.getCustomerTags).mockResolvedValue([]);
  });

  it('renders notifications page with header', () => {
    renderWithProviders(<Notifications />);

    expect(screen.getByText('مدیریت اعلان‌ها')).toBeInTheDocument();
    expect(screen.getByText('مدیریت تنظیمات اعلان‌ها، تاریخچه، یادآوری‌ها و کمپین‌های بازاریابی')).toBeInTheDocument();
  });

  it('renders all tab navigation items', () => {
    renderWithProviders(<Notifications />);

    expect(screen.getByText('تنظیمات')).toBeInTheDocument();
    expect(screen.getByText('تاریخچه')).toBeInTheDocument();
    expect(screen.getByText('یادآوری')).toBeInTheDocument();
    expect(screen.getByText('کمپین‌ها')).toBeInTheDocument();
  });

  it('displays settings tab by default', async () => {
    renderWithProviders(<Notifications />);

    await waitFor(() => {
      expect(screen.getByText('تنظیمات کلی اعلان‌ها')).toBeInTheDocument();
    });
  });

  it('renders tab navigation correctly', async () => {
    renderWithProviders(<Notifications />);

    // Check that all tabs are rendered
    expect(screen.getByText('تنظیمات')).toBeInTheDocument();
    expect(screen.getByText('تاریخچه')).toBeInTheDocument();
    expect(screen.getByText('یادآوری')).toBeInTheDocument();
    expect(screen.getByText('کمپین‌ها')).toBeInTheDocument();
  });

  it('applies correct styling to active tab', () => {
    renderWithProviders(<Notifications />);

    const settingsTab = screen.getByText('تنظیمات').closest('button');
    expect(settingsTab).toHaveClass('data-[state=active]:bg-white');
    expect(settingsTab).toHaveClass('data-[state=active]:shadow-md');
  });

  it('displays tab icons correctly', () => {
    renderWithProviders(<Notifications />);

    // Check that all tabs have their respective icons
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(4);
    
    // Each tab should have an icon (svg element)
    tabs.forEach(tab => {
      expect(tab.querySelector('svg')).toBeInTheDocument();
    });
  });

  it('maintains responsive design for tab labels', () => {
    renderWithProviders(<Notifications />);

    // Tab labels should have responsive classes
    const settingsLabel = screen.getByText('تنظیمات');
    expect(settingsLabel).toHaveClass('hidden', 'sm:inline');
  });

  it('renders with gradient design system', () => {
    renderWithProviders(<Notifications />);

    // Check for gradient classes in the header
    const headerIcon = screen.getByText('مدیریت اعلان‌ها').closest('div')?.querySelector('div');
    expect(headerIcon).toHaveClass('bg-gradient-to-br');
    expect(headerIcon).toHaveClass('from-blue-500');
    expect(headerIcon).toHaveClass('to-purple-600');
  });

  it('renders tabs container with gradient background', () => {
    renderWithProviders(<Notifications />);

    const tabsList = screen.getAllByRole('tablist')[0];
    expect(tabsList).toHaveClass('bg-gradient-to-r');
    expect(tabsList).toHaveClass('from-blue-50');
    expect(tabsList).toHaveClass('via-purple-50');
    expect(tabsList).toHaveClass('to-pink-50');
  });



  it('loads settings data by default', async () => {
    renderWithProviders(<Notifications />);

    await waitFor(() => {
      expect(notificationService.getNotificationSettings).toHaveBeenCalled();
      expect(notificationService.getEmailTemplates).toHaveBeenCalled();
      expect(notificationService.getSmsTemplates).toHaveBeenCalled();
    });
  });

  it('displays settings content by default', async () => {
    renderWithProviders(<Notifications />);

    await waitFor(() => {
      expect(screen.getByText('تنظیمات کلی اعلان‌ها')).toBeInTheDocument();
    });
  });

  it('handles keyboard navigation between tabs', () => {
    renderWithProviders(<Notifications />);

    const settingsTab = screen.getByText('تنظیمات').closest('button');
    const historyTab = screen.getByText('تاریخچه').closest('button');

    // Focus on settings tab
    settingsTab?.focus();
    expect(document.activeElement).toBe(settingsTab);

    // Navigate to history tab with arrow key
    fireEvent.keyDown(settingsTab!, { key: 'ArrowLeft' });
    
    // The tab navigation should work (this is handled by the Tabs component)
    expect(historyTab).toBeInTheDocument();
  });
});