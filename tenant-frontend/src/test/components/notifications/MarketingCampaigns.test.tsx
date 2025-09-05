import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MarketingCampaignsComponent from '@/components/notifications/MarketingCampaigns';
import { notificationService } from '@/services/notificationService';

// Mock the notification service
vi.mock('@/services/notificationService', () => ({
  notificationService: {
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

// Mock window.confirm
Object.defineProperty(window, 'confirm', {
  writable: true,
  value: vi.fn(() => true),
});

const mockCampaigns = [
  {
    id: 'campaign-1',
    tenant_id: 'tenant-1',
    name: 'کمپین تخفیف زمستانه',
    message: 'تخفیف ویژه زمستانه برای محصولات منتخب',
    notification_type: 'sms' as const,
    target_segments: ['segment-1'],
    customer_tags: ['vip'],
    status: 'draft' as const,
    total_recipients: 150,
    created_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 'campaign-2',
    tenant_id: 'tenant-1',
    name: 'اطلاعیه محصولات جدید',
    message: 'محصولات جدید به فروشگاه اضافه شد',
    notification_type: 'email' as const,
    target_segments: ['segment-2'],
    customer_tags: ['regular'],
    status: 'sent' as const,
    total_recipients: 200,
    sent_count: 195,
    failed_count: 5,
    created_at: '2024-01-10T14:30:00Z',
  },
];

const mockSegments = [
  {
    id: 'segment-1',
    name: 'مشتریان VIP',
    description: 'مشتریان با خرید بالا',
    customer_count: 50,
    criteria: { tags: ['vip'], total_debt_min: 1000000 },
  },
  {
    id: 'segment-2',
    name: 'مشتریان عادی',
    description: 'مشتریان با خرید متوسط',
    customer_count: 150,
    criteria: { tags: ['regular'] },
  },
];

const mockTags = ['vip', 'regular', 'new', 'inactive'];

const mockCampaignsResponse = {
  campaigns: mockCampaigns,
  total: 2,
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

describe('MarketingCampaigns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(notificationService.getMarketingCampaigns).mockResolvedValue(mockCampaignsResponse);
    vi.mocked(notificationService.getCustomerSegments).mockResolvedValue(mockSegments);
    vi.mocked(notificationService.getCustomerTags).mockResolvedValue(mockTags);
  });

  it('renders marketing campaigns interface', async () => {
    renderWithProviders(<MarketingCampaignsComponent />);

    await waitFor(() => {
      expect(screen.getByText('کمپین‌های بازاریابی')).toBeInTheDocument();
    });

    expect(screen.getByText('کمپین جدید')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('جستجو در کمپین‌ها...')).toBeInTheDocument();
  });

  it('loads and displays marketing campaigns', async () => {
    renderWithProviders(<MarketingCampaignsComponent />);

    await waitFor(() => {
      expect(notificationService.getMarketingCampaigns).toHaveBeenCalled();
      expect(notificationService.getCustomerSegments).toHaveBeenCalled();
      expect(notificationService.getCustomerTags).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('کمپین تخفیف زمستانه')).toBeInTheDocument();
      expect(screen.getByText('اطلاعیه محصولات جدید')).toBeInTheDocument();
    });
  });

  it('displays correct campaign status badges', async () => {
    renderWithProviders(<MarketingCampaignsComponent />);

    await waitFor(() => {
      expect(screen.getByText('پیش‌نویس')).toBeInTheDocument();
      expect(screen.getByText('ارسال شده')).toBeInTheDocument();
    });
  });

  it('displays campaign statistics for sent campaigns', async () => {
    renderWithProviders(<MarketingCampaignsComponent />);

    await waitFor(() => {
      expect(screen.getByText('ارسال شده: 195')).toBeInTheDocument();
      expect(screen.getByText('ناموفق: 5')).toBeInTheDocument();
    });
  });

  it('opens create campaign dialog', async () => {
    renderWithProviders(<MarketingCampaignsComponent />);

    await waitFor(() => {
      expect(screen.getByText('کمپین جدید')).toBeInTheDocument();
    });

    const createButton = screen.getByText('کمپین جدید');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('ایجاد کمپین جدید')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('نام کمپین را وارد کنید')).toBeInTheDocument();
    });
  });

  it('creates new campaign', async () => {
    vi.mocked(notificationService.createMarketingCampaign).mockResolvedValue({
      id: 'campaign-3',
      tenant_id: 'tenant-1',
      name: 'کمپین جدید',
      message: 'پیام تست',
      notification_type: 'sms',
      target_segments: [],
      customer_tags: [],
      status: 'draft',
    });

    renderWithProviders(<MarketingCampaignsComponent />);

    await waitFor(() => {
      expect(screen.getByText('کمپین جدید')).toBeInTheDocument();
    });

    const createButton = screen.getByText('کمپین جدید');
    fireEvent.click(createButton);

    await waitFor(() => {
      const nameInput = screen.getByPlaceholderText('نام کمپین را وارد کنید');
      const messageTextarea = screen.getByPlaceholderText('متن پیام کمپین را وارد کنید');

      fireEvent.change(nameInput, { target: { value: 'کمپین جدید' } });
      fireEvent.change(messageTextarea, { target: { value: 'پیام تست' } });
    });

    const saveButton = screen.getByText('ایجاد کمپین');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(notificationService.createMarketingCampaign).toHaveBeenCalledWith({
        name: 'کمپین جدید',
        message: 'پیام تست',
        notification_type: 'sms',
        target_segments: [],
        customer_tags: [],
        status: 'draft',
      });
    });
  });

  it('opens edit campaign dialog', async () => {
    renderWithProviders(<MarketingCampaignsComponent />);

    await waitFor(() => {
      expect(screen.getByText('کمپین تخفیف زمستانه')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole('button');
    const editButton = editButtons.find(button => button.querySelector('svg')); // Find edit button by icon
    if (editButton) {
      fireEvent.click(editButton);
    }

    await waitFor(() => {
      expect(screen.getByText('ویرایش کمپین')).toBeInTheDocument();
    });
  });

  it('sends campaign', async () => {
    vi.mocked(notificationService.sendMarketingCampaign).mockResolvedValue({
      success: true,
      message: 'کمپین با موفقیت ارسال شد',
    });

    renderWithProviders(<MarketingCampaignsComponent />);

    await waitFor(() => {
      expect(screen.getByText('کمپین تخفیف زمستانه')).toBeInTheDocument();
    });

    // Find send button for draft campaign
    const sendButtons = screen.getAllByRole('button');
    const sendButton = sendButtons.find(button => 
      button.querySelector('svg') && button.className.includes('text-green-600')
    );
    
    if (sendButton) {
      fireEvent.click(sendButton);
    }

    await waitFor(() => {
      expect(notificationService.sendMarketingCampaign).toHaveBeenCalledWith('campaign-1');
    });
  });

  it('deletes campaign', async () => {
    renderWithProviders(<MarketingCampaignsComponent />);

    await waitFor(() => {
      expect(screen.getByText('کمپین تخفیف زمستانه')).toBeInTheDocument();
    });

    // Find delete button
    const deleteButtons = screen.getAllByRole('button');
    const deleteButton = deleteButtons.find(button => 
      button.querySelector('svg') && button.className.includes('text-red-600')
    );
    
    if (deleteButton) {
      fireEvent.click(deleteButton);
    }

    await waitFor(() => {
      expect(notificationService.deleteMarketingCampaign).toHaveBeenCalledWith('campaign-1');
    });
  });

  it('displays customer segments in create dialog', async () => {
    renderWithProviders(<MarketingCampaignsComponent />);

    await waitFor(() => {
      expect(screen.getByText('کمپین جدید')).toBeInTheDocument();
    });

    const createButton = screen.getByText('کمپین جدید');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('گروه‌های هدف')).toBeInTheDocument();
      expect(screen.getByText('مشتریان VIP')).toBeInTheDocument();
      expect(screen.getByText('مشتریان عادی')).toBeInTheDocument();
    });
  });

  it('displays customer tags in create dialog', async () => {
    renderWithProviders(<MarketingCampaignsComponent />);

    await waitFor(() => {
      expect(screen.getByText('کمپین جدید')).toBeInTheDocument();
    });

    const createButton = screen.getByText('کمپین جدید');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('برچسب‌های مشتری')).toBeInTheDocument();
      expect(screen.getByText('vip')).toBeInTheDocument();
      expect(screen.getByText('regular')).toBeInTheDocument();
    });
  });

  it('searches campaigns', async () => {
    renderWithProviders(<MarketingCampaignsComponent />);

    await waitFor(() => {
      expect(screen.getByText('کمپین تخفیف زمستانه')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('جستجو در کمپین‌ها...');
    fireEvent.change(searchInput, { target: { value: 'تخفیف' } });

    await waitFor(() => {
      expect(screen.getByText('کمپین تخفیف زمستانه')).toBeInTheDocument();
      expect(screen.queryByText('اطلاعیه محصولات جدید')).not.toBeInTheDocument();
    });
  });

  it('refreshes campaigns list', async () => {
    renderWithProviders(<MarketingCampaignsComponent />);

    await waitFor(() => {
      expect(screen.getByText('کمپین تخفیف زمستانه')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: 'بروزرسانی' });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(notificationService.getMarketingCampaigns).toHaveBeenCalledTimes(2);
    });
  });

  it('handles empty state', async () => {
    vi.mocked(notificationService.getMarketingCampaigns).mockResolvedValue({
      campaigns: [],
      total: 0,
      page: 1,
      limit: 20,
    });

    renderWithProviders(<MarketingCampaignsComponent />);

    await waitFor(() => {
      expect(screen.getByText('هنوز کمپینی ایجاد نشده است')).toBeInTheDocument();
    });
  });

  it('displays loading state initially', () => {
    renderWithProviders(<MarketingCampaignsComponent />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('validates required fields in create dialog', async () => {
    renderWithProviders(<MarketingCampaignsComponent />);

    await waitFor(() => {
      expect(screen.getByText('کمپین جدید')).toBeInTheDocument();
    });

    const createButton = screen.getByText('کمپین جدید');
    fireEvent.click(createButton);

    await waitFor(() => {
      const saveButton = screen.getByText('ایجاد کمپین');
      expect(saveButton).toBeDisabled();
    });
  });

  it('disables actions for sent campaigns', async () => {
    renderWithProviders(<MarketingCampaignsComponent />);

    await waitFor(() => {
      expect(screen.getByText('اطلاعیه محصولات جدید')).toBeInTheDocument();
    });

    // Sent campaigns should have disabled edit and delete buttons
    const editButtons = screen.getAllByRole('button');
    const sentCampaignRow = screen.getByText('اطلاعیه محصولات جدید').closest('tr');
    
    if (sentCampaignRow) {
      const buttonsInRow = sentCampaignRow.querySelectorAll('button');
      const editButton = Array.from(buttonsInRow).find(button => 
        button.querySelector('svg')
      );
      
      if (editButton) {
        expect(editButton).toBeDisabled();
      }
    }
  });
});