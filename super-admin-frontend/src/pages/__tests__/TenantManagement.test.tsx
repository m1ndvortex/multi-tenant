import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import TenantManagement from '../TenantManagement';
import * as tenantHooks from '@/hooks/useTenants';
import { TenantsResponse } from '@/types/tenant';

// Mock the hooks
vi.mock('@/hooks/useTenants');
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockTenantsData: TenantsResponse = {
  tenants: [
    {
      id: '1',
      name: 'Test Tenant 1',
      domain: 'test1.com',
      subscription_type: 'pro',
      subscription_expires_at: '2024-12-31T00:00:00Z',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      user_count: 3,
      last_activity: '2024-01-15T10:30:00Z',
    },
    {
      id: '2',
      name: 'Test Tenant 2',
      subscription_type: 'pending_payment',
      is_active: true,
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      user_count: 1,
    },
  ],
  pagination: {
    page: 1,
    limit: 10,
    total: 2,
    totalPages: 1,
  },
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('TenantManagement', () => {
  const mockMutations = {
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  };

  beforeEach(() => {
    // Mock all the hooks
    vi.mocked(tenantHooks.useTenants).mockReturnValue({
      data: mockTenantsData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.mocked(tenantHooks.useCreateTenant).mockReturnValue(mockMutations as any);
    vi.mocked(tenantHooks.useUpdateTenant).mockReturnValue(mockMutations as any);
    vi.mocked(tenantHooks.useDeleteTenant).mockReturnValue(mockMutations as any);
    vi.mocked(tenantHooks.useSuspendTenant).mockReturnValue(mockMutations as any);
    vi.mocked(tenantHooks.useActivateTenant).mockReturnValue(mockMutations as any);
    vi.mocked(tenantHooks.useConfirmPayment).mockReturnValue(mockMutations as any);

    mockMutations.mutate.mockClear();
  });

  it('renders page header and stats correctly', () => {
    render(<TenantManagement />, { wrapper: createWrapper() });

    expect(screen.getByRole('heading', { name: 'مدیریت تنانت‌ها' })).toBeInTheDocument();
    expect(screen.getByText('مدیریت و نظارت بر تمام تنانت‌های پلتفرم')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ایجاد تنانت جدید/ })).toBeInTheDocument();

    // Check stats cards exist
    expect(screen.getByText('کل تنانت‌ها')).toBeInTheDocument();
    expect(screen.getAllByText('فعال').length).toBeGreaterThan(0);
    expect(screen.getAllByText('حرفه‌ای').length).toBeGreaterThan(0);
    expect(screen.getAllByText('در انتظار پرداخت').length).toBeGreaterThan(0);
  });

  it('displays correct stats values', () => {
    render(<TenantManagement />, { wrapper: createWrapper() });

    // Check that stats are displayed (multiple elements may have same numbers)
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
  });

  it('renders tenant table with data', () => {
    render(<TenantManagement />, { wrapper: createWrapper() });

    expect(screen.getByText('Test Tenant 1')).toBeInTheDocument();
    expect(screen.getByText('Test Tenant 2')).toBeInTheDocument();
    expect(screen.getByText('test1.com')).toBeInTheDocument();
  });

  it('opens create dialog when create button is clicked', async () => {
    const user = userEvent.setup();
    render(<TenantManagement />, { wrapper: createWrapper() });

    const createButton = screen.getByRole('button', { name: /ایجاد تنانت جدید/ });
    await user.click(createButton);

    await waitFor(() => {
      // Look for the dialog content - should have at least 2 instances of the text
      expect(screen.getAllByText('ایجاد تنانت جدید').length).toBeGreaterThanOrEqual(2);
    });
  });

  it('handles filter changes correctly', async () => {
    const user = userEvent.setup();
    render(<TenantManagement />, { wrapper: createWrapper() });

    const searchInput = screen.getByPlaceholderText('نام تنانت یا دامنه...');
    await user.type(searchInput, 'test');

    // The useTenants hook should be called with the new filters
    expect(tenantHooks.useTenants).toHaveBeenCalledWith(
      1,
      10,
      expect.objectContaining({
        search: 'test',
      })
    );
  });

  it('shows loading state when data is loading', () => {
    vi.mocked(tenantHooks.useTenants).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    } as any);

    render(<TenantManagement />, { wrapper: createWrapper() });

    expect(screen.getByText('در حال بارگذاری...')).toBeInTheDocument();
  });

  it('handles pagination correctly', () => {
    const mockDataWithPagination: TenantsResponse = {
      ...mockTenantsData,
      pagination: {
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
      },
    };

    vi.mocked(tenantHooks.useTenants).mockReturnValue({
      data: mockDataWithPagination,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    render(<TenantManagement />, { wrapper: createWrapper() });

    // Should show pagination buttons when totalPages > 1
    const paginationButtons = screen.getAllByRole('button').filter(button => 
      ['1', '2', '3'].includes(button.textContent || '')
    );
    expect(paginationButtons.length).toBeGreaterThan(0);
  });

  it('does not show pagination when totalPages <= 1', () => {
    render(<TenantManagement />, { wrapper: createWrapper() });

    // With only 1 page, pagination should not be visible
    const paginationButtons = screen.queryAllByRole('button').filter(button => 
      ['1', '2', '3'].includes(button.textContent || '')
    );
    expect(paginationButtons).toHaveLength(0);
  });
});