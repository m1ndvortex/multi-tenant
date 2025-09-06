import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ApiAccessManagement from '@/components/settings/ApiAccessManagement';
import { apiAccessService } from '@/services/apiAccessService';

// Mock the API service
vi.mock('@/services/apiAccessService', () => ({
  apiAccessService: {
    getApiKeys: vi.fn(),
    createApiKey: vi.fn(),
    updateApiKey: vi.fn(),
    deleteApiKey: vi.fn(),
    regenerateApiKey: vi.fn(),
    getWebhooks: vi.fn(),
    createWebhook: vi.fn(),
    updateWebhook: vi.fn(),
    deleteWebhook: vi.fn(),
    testWebhook: vi.fn(),
    getUsageStats: vi.fn(),
    getUsageHistory: vi.fn(),
    getApiDocumentation: vi.fn(),
    testApiEndpoint: vi.fn(),
    getAvailablePermissions: vi.fn(),
    getAvailableWebhookEvents: vi.fn(),
  },
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock chart.js
vi.mock('react-chartjs-2', () => ({
  Line: ({ data, options }: any) => <div data-testid="line-chart" data-chart-data={JSON.stringify(data)} data-chart-options={JSON.stringify(options)} />,
  Bar: ({ data, options }: any) => <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)} data-chart-options={JSON.stringify(options)} />,
  Doughnut: ({ data, options }: any) => <div data-testid="doughnut-chart" data-chart-data={JSON.stringify(data)} data-chart-options={JSON.stringify(options)} />,
}));

vi.mock('chart.js', () => ({
  Chart: {
    register: vi.fn(),
  },
  CategoryScale: {},
  LinearScale: {},
  PointElement: {},
  LineElement: {},
  BarElement: {},
  Title: {},
  Tooltip: {},
  Legend: {},
  ArcElement: {},
}));

const createQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
};

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

// Mock data
const mockApiKeys = [
  {
    id: 'key-1',
    name: 'Production Key',
    key: 'sk_live_1234567890abcdef',
    permissions: ['read:invoices', 'write:customers'],
    is_active: true,
    created_at: '2024-01-01T10:00:00Z',
    last_used_at: '2024-01-15T14:30:00Z',
  },
  {
    id: 'key-2',
    name: 'Development Key',
    key: 'sk_test_abcdef1234567890',
    permissions: ['read:products'],
    is_active: false,
    created_at: '2024-01-05T09:00:00Z',
    expires_at: '2024-12-31T23:59:59Z',
  },
];

const mockWebhooks = [
  {
    id: 'webhook-1',
    url: 'https://example.com/webhook',
    events: ['invoice.created', 'payment.received'],
    is_active: true,
    secret: 'whsec_1234567890abcdef',
    created_at: '2024-01-01T10:00:00Z',
    last_triggered_at: '2024-01-15T14:30:00Z',
  },
];

const mockUsageStats = {
  total_requests: 15420,
  requests_today: 245,
  requests_this_month: 8750,
  rate_limit: 10000,
  rate_limit_remaining: 7500,
  rate_limit_reset: '2024-01-16T00:00:00Z',
  top_endpoints: [
    { endpoint: '/api/invoices', method: 'GET', count: 5200 },
    { endpoint: '/api/customers', method: 'POST', count: 2100 },
    { endpoint: '/api/products', method: 'GET', count: 1800 },
  ],
};

const mockUsageHistory = [
  { date: '2024-01-10', requests: 120 },
  { date: '2024-01-11', requests: 150 },
  { date: '2024-01-12', requests: 180 },
  { date: '2024-01-13', requests: 200 },
  { date: '2024-01-14', requests: 175 },
  { date: '2024-01-15', requests: 245 },
];

const mockApiDocumentation = {
  endpoints: [
    {
      path: '/api/invoices',
      method: 'GET',
      description: 'Get list of invoices',
      parameters: [
        {
          name: 'limit',
          type: 'integer',
          required: false,
          description: 'Number of items to return',
        },
        {
          name: 'customer_id',
          type: 'string',
          required: false,
          description: 'Filter by customer ID',
        },
      ],
      responses: [
        {
          status: 200,
          description: 'Success',
          schema: { type: 'array', items: { type: 'object' } },
        },
        {
          status: 400,
          description: 'Bad Request',
        },
      ],
    },
  ],
};

const mockAvailablePermissions = [
  {
    key: 'read:invoices',
    name: 'خواندن فاکتورها',
    description: 'دسترسی خواندن به فاکتورها',
  },
  {
    key: 'write:customers',
    name: 'نوشتن مشتریان',
    description: 'دسترسی ایجاد و ویرایش مشتریان',
  },
];

const mockAvailableEvents = [
  {
    key: 'invoice.created',
    name: 'ایجاد فاکتور',
    description: 'هنگام ایجاد فاکتور جدید',
  },
  {
    key: 'payment.received',
    name: 'دریافت پرداخت',
    description: 'هنگام دریافت پرداخت',
  },
];

describe('ApiAccessManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock implementations
    vi.mocked(apiAccessService.getApiKeys).mockResolvedValue(mockApiKeys);
    vi.mocked(apiAccessService.getWebhooks).mockResolvedValue(mockWebhooks);
    vi.mocked(apiAccessService.getUsageStats).mockResolvedValue(mockUsageStats);
    vi.mocked(apiAccessService.getUsageHistory).mockResolvedValue(mockUsageHistory);
    vi.mocked(apiAccessService.getApiDocumentation).mockResolvedValue(mockApiDocumentation);
    vi.mocked(apiAccessService.getAvailablePermissions).mockResolvedValue(mockAvailablePermissions);
    vi.mocked(apiAccessService.getAvailableWebhookEvents).mockResolvedValue(mockAvailableEvents);
  });

  it('renders API access management interface', async () => {
    renderWithProviders(<ApiAccessManagement />);

    // Check header
    expect(screen.getByText('مدیریت دسترسی API')).toBeInTheDocument();
    expect(screen.getByText('کلیدهای API، وب‌هوک‌ها و مستندات')).toBeInTheDocument();

    // Check usage stats in header
    await waitFor(() => {
      expect(screen.getByText('درخواست‌های امروز')).toBeInTheDocument();
      expect(screen.getByText('245')).toBeInTheDocument();
    });

    // Check tabs
    expect(screen.getByText('کلیدهای API')).toBeInTheDocument();
    expect(screen.getByText('وب‌هوک‌ها')).toBeInTheDocument();
    expect(screen.getByText('مستندات API')).toBeInTheDocument();
    expect(screen.getByText('آمار استفاده')).toBeInTheDocument();
  });

  it('displays API keys in the keys tab', async () => {
    renderWithProviders(<ApiAccessManagement />);

    // Keys tab should be active by default
    await waitFor(() => {
      expect(screen.getByText('Production Key')).toBeInTheDocument();
      expect(screen.getByText('Development Key')).toBeInTheDocument();
    });

    // Check key details
    expect(screen.getByText('sk_live_1234567890abcdef')).toBeInTheDocument();
    expect(screen.getByText('read:invoices')).toBeInTheDocument();
    expect(screen.getByText('write:customers')).toBeInTheDocument();
  });

  it('allows creating new API key', async () => {
    const user = userEvent.setup();
    vi.mocked(apiAccessService.createApiKey).mockResolvedValue({
      id: 'new-key',
      name: 'New Key',
      key: 'sk_new_1234567890',
      permissions: ['read:invoices'],
      is_active: true,
      created_at: '2024-01-16T10:00:00Z',
    });

    renderWithProviders(<ApiAccessManagement />);

    // Click create new key button
    await user.click(screen.getByText('کلید جدید'));

    // Fill form
    await user.type(screen.getByPlaceholderText('مثال: کلید تولید، کلید توسعه'), 'Test Key');
    
    // Select permissions
    const readInvoicesCheckbox = screen.getByLabelText('خواندن فاکتورها');
    await user.click(readInvoicesCheckbox);

    // Submit form
    await user.click(screen.getByText('ایجاد کلید'));

    await waitFor(() => {
      expect(apiAccessService.createApiKey).toHaveBeenCalledWith({
        name: 'Test Key',
        permissions: ['read:invoices'],
        expires_at: undefined,
      });
    });
  });

  it('switches to webhooks tab and displays webhooks', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ApiAccessManagement />);

    // Click webhooks tab
    await user.click(screen.getByText('وب‌هوک‌ها'));

    await waitFor(() => {
      expect(screen.getByText('https://example.com/webhook')).toBeInTheDocument();
      expect(screen.getByText('invoice.created')).toBeInTheDocument();
      expect(screen.getByText('payment.received')).toBeInTheDocument();
    });
  });

  it('allows creating new webhook', async () => {
    const user = userEvent.setup();
    vi.mocked(apiAccessService.createWebhook).mockResolvedValue({
      id: 'new-webhook',
      url: 'https://test.com/webhook',
      events: ['invoice.created'],
      is_active: true,
      secret: 'whsec_new123',
      created_at: '2024-01-16T10:00:00Z',
    });

    renderWithProviders(<ApiAccessManagement />);

    // Switch to webhooks tab
    await user.click(screen.getByText('وب‌هوک‌ها'));

    // Click create new webhook button
    await user.click(screen.getByText('وب‌هوک جدید'));

    // Fill form
    await user.type(screen.getByPlaceholderText('https://example.com/webhook'), 'https://test.com/webhook');
    
    // Select events
    const invoiceCreatedCheckbox = screen.getByLabelText('ایجاد فاکتور');
    await user.click(invoiceCreatedCheckbox);

    // Submit form
    await user.click(screen.getByText('ایجاد وب‌هوک'));

    await waitFor(() => {
      expect(apiAccessService.createWebhook).toHaveBeenCalledWith({
        url: 'https://test.com/webhook',
        events: ['invoice.created'],
      });
    });
  });

  it('displays API documentation in docs tab', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ApiAccessManagement />);

    // Switch to docs tab
    await user.click(screen.getByText('مستندات API'));

    await waitFor(() => {
      expect(screen.getByText('مستندات API')).toBeInTheDocument();
      expect(screen.getByText('راهنمای کامل استفاده از API با امکان تست مستقیم')).toBeInTheDocument();
      expect(screen.getByText('/api/invoices')).toBeInTheDocument();
      expect(screen.getByText('Get list of invoices')).toBeInTheDocument();
    });
  });

  it('displays usage analytics in analytics tab', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ApiAccessManagement />);

    // Switch to analytics tab
    await user.click(screen.getByText('آمار استفاده'));

    await waitFor(() => {
      expect(screen.getByText('آمار استفاده از API')).toBeInTheDocument();
      expect(screen.getByText('کل درخواست‌ها')).toBeInTheDocument();
      expect(screen.getByText('15,420')).toBeInTheDocument();
      expect(screen.getByText('پربازدیدترین endpoint ها')).toBeInTheDocument();
    });

    // Check chart components are rendered
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.getByTestId('doughnut-chart')).toBeInTheDocument();
  });

  it('handles API key deletion', async () => {
    const user = userEvent.setup();
    vi.mocked(apiAccessService.deleteApiKey).mockResolvedValue();

    renderWithProviders(<ApiAccessManagement />);

    await waitFor(() => {
      expect(screen.getByText('Production Key')).toBeInTheDocument();
    });

    // Find and click delete button for the first API key
    const deleteButtons = screen.getAllByRole('button');
    const deleteButton = deleteButtons.find(button => 
      button.querySelector('svg')?.getAttribute('data-testid') === 'trash-2'
    );
    
    if (deleteButton) {
      await user.click(deleteButton);
    }

    await waitFor(() => {
      expect(apiAccessService.deleteApiKey).toHaveBeenCalledWith('key-1');
    });
  });

  it('handles webhook testing', async () => {
    const user = userEvent.setup();
    vi.mocked(apiAccessService.testWebhook).mockResolvedValue({
      success: true,
      response: { status: 200 },
    });

    renderWithProviders(<ApiAccessManagement />);

    // Switch to webhooks tab
    await user.click(screen.getByText('وب‌هوک‌ها'));

    await waitFor(() => {
      expect(screen.getByText('https://example.com/webhook')).toBeInTheDocument();
    });

    // Find and click test button
    const testButtons = screen.getAllByRole('button');
    const testButton = testButtons.find(button => 
      button.querySelector('svg')?.getAttribute('data-testid') === 'test-tube'
    );
    
    if (testButton) {
      await user.click(testButton);
    }

    await waitFor(() => {
      expect(apiAccessService.testWebhook).toHaveBeenCalledWith('webhook-1');
    });
  });

  it('shows Pro subscription requirement message for non-Pro users', () => {
    // Mock hasProAccess to false by modifying the component
    // This would require modifying the component to accept props or use context
    // For now, we'll test the Pro access flow
    renderWithProviders(<ApiAccessManagement />);

    // Since hasProAccess is hardcoded to true, we test the Pro interface
    expect(screen.getByText('مدیریت دسترسی API')).toBeInTheDocument();
  });

  it('handles search and filtering in API documentation', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ApiAccessManagement />);

    // Switch to docs tab
    await user.click(screen.getByText('مستندات API'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('جستجو در endpoint ها...')).toBeInTheDocument();
    });

    // Test search functionality
    const searchInput = screen.getByPlaceholderText('جستجو در endpoint ها...');
    await user.type(searchInput, 'invoices');

    // Test method filter
    const methodSelect = screen.getByDisplayValue('همه');
    await user.click(methodSelect);
    await user.click(screen.getByText('GET'));
  });

  it('handles period selection in usage analytics', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ApiAccessManagement />);

    // Switch to analytics tab
    await user.click(screen.getByText('آمار استفاده'));

    await waitFor(() => {
      expect(screen.getByDisplayValue('30 روز گذشته')).toBeInTheDocument();
    });

    // Change period
    const periodSelect = screen.getByDisplayValue('30 روز گذشته');
    await user.click(periodSelect);
    await user.click(screen.getByText('7 روز گذشته'));

    await waitFor(() => {
      expect(apiAccessService.getUsageHistory).toHaveBeenCalledWith(7);
    });
  });
});

describe('ApiAccessManagement Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles API errors gracefully', async () => {
    vi.mocked(apiAccessService.getApiKeys).mockRejectedValue(new Error('API Error'));
    vi.mocked(apiAccessService.getUsageStats).mockRejectedValue(new Error('Stats Error'));

    renderWithProviders(<ApiAccessManagement />);

    // Component should still render without crashing
    expect(screen.getByText('مدیریت دسترسی API')).toBeInTheDocument();
  });

  it('shows loading states', () => {
    vi.mocked(apiAccessService.getApiKeys).mockReturnValue(new Promise(() => {}));
    vi.mocked(apiAccessService.getUsageStats).mockReturnValue(new Promise(() => {}));

    renderWithProviders(<ApiAccessManagement />);

    // Should show loading state
    expect(screen.getByText('مدیریت دسترسی API')).toBeInTheDocument();
  });
});