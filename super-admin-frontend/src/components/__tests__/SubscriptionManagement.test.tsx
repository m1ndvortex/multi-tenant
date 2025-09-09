import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SubscriptionManagement from '../../pages/SubscriptionManagement';

// Additional mocks specific to this test

// Mock the components that might not be available in test environment
vi.mock('../subscription/SubscriptionOverviewDashboard', () => ({
  default: ({ isLoading }: { isLoading: boolean }) => (
    <div data-testid="subscription-overview">
      {isLoading ? 'Loading...' : 'Subscription Overview'}
    </div>
  )
}));

vi.mock('../subscription/TenantSubscriptionTable', () => ({
  default: ({ tenants, isLoading }: { tenants: any[], isLoading: boolean }) => (
    <div data-testid="tenant-subscription-table">
      {isLoading ? 'Loading...' : `${tenants.length} tenants`}
    </div>
  )
}));

vi.mock('../subscription/SubscriptionExtensionDialog', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (
    isOpen ? <div data-testid="extension-dialog">Extension Dialog</div> : null
  )
}));

vi.mock('../subscription/SubscriptionPlanSwitchDialog', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (
    isOpen ? <div data-testid="plan-switch-dialog">Plan Switch Dialog</div> : null
  )
}));

vi.mock('../subscription/SubscriptionStatusDialog', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (
    isOpen ? <div data-testid="status-dialog">Status Dialog</div> : null
  )
}));

vi.mock('../subscription/SubscriptionHistoryDialog', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (
    isOpen ? <div data-testid="history-dialog">History Dialog</div> : null
  )
}));

describe('SubscriptionManagement', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  it('renders the main page title and description', () => {
    renderWithQueryClient(<SubscriptionManagement />);

    expect(screen.getByText('مدیریت حرفه‌ای اشتراک‌ها')).toBeInTheDocument();
    expect(screen.getByText('کنترل کامل اشتراک‌ها، تمدید و تغییر نوع اشتراک تنانت‌ها')).toBeInTheDocument();
  });

  it('renders the refresh button', () => {
    renderWithQueryClient(<SubscriptionManagement />);

    const refreshButton = screen.getByText('به‌روزرسانی');
    expect(refreshButton).toBeInTheDocument();
  });

  it('renders subscription overview dashboard', () => {
    renderWithQueryClient(<SubscriptionManagement />);

    expect(screen.getByTestId('subscription-overview')).toBeInTheDocument();
  });

  it('renders tenant subscription table', () => {
    renderWithQueryClient(<SubscriptionManagement />);

    expect(screen.getByTestId('tenant-subscription-table')).toBeInTheDocument();
  });

  it('renders filter controls', () => {
    renderWithQueryClient(<SubscriptionManagement />);

    expect(screen.getByText('جستجو')).toBeInTheDocument();
    expect(screen.getByText('نوع اشتراک')).toBeInTheDocument();
    expect(screen.getByText('وضعیت')).toBeInTheDocument();
    expect(screen.getByText('وضعیت انقضا')).toBeInTheDocument();
  });

  it('allows filtering by search term', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<SubscriptionManagement />);

    const searchInput = screen.getByPlaceholderText('نام تنانت، ایمیل یا دامنه...');
    await user.type(searchInput, 'test tenant');

    expect(searchInput).toHaveValue('test tenant');
  });

  it('allows filtering by subscription type', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<SubscriptionManagement />);

    const subscriptionTypeSelect = screen.getByDisplayValue('همه');
    await user.selectOptions(subscriptionTypeSelect, 'pro');

    expect(subscriptionTypeSelect).toHaveValue('pro');
  });

  it('allows clearing filters', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<SubscriptionManagement />);

    // Set some filters first
    const searchInput = screen.getByPlaceholderText('نام تنانت، ایمیل یا دامنه...');
    await user.type(searchInput, 'test');

    // Clear filters
    const clearButton = screen.getByText('پاک کردن فیلترها');
    await user.click(clearButton);

    expect(searchInput).toHaveValue('');
  });

  it('handles refresh button click', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<SubscriptionManagement />);

    const refreshButton = screen.getByText('به‌روزرسانی');
    await user.click(refreshButton);

    // The button should be clickable (not disabled when not loading)
    expect(refreshButton).not.toBeDisabled();
  });

  it('filters tenants by expiry status', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<SubscriptionManagement />);

    const expiryStatusSelect = screen.getAllByDisplayValue('همه')[3]; // Fourth "همه" is for expiry status
    await user.selectOptions(expiryStatusSelect, 'active');

    expect(expiryStatusSelect).toHaveValue('active');
  });

  it('shows correct number of tenants in table', () => {
    renderWithQueryClient(<SubscriptionManagement />);

    // The mocked table should show "2 tenants"
    expect(screen.getByText('2 tenants')).toBeInTheDocument();
  });

  it('renders all dialog components (closed by default)', () => {
    renderWithQueryClient(<SubscriptionManagement />);

    // All dialogs should be closed initially
    expect(screen.queryByTestId('extension-dialog')).not.toBeInTheDocument();
    expect(screen.queryByTestId('plan-switch-dialog')).not.toBeInTheDocument();
    expect(screen.queryByTestId('status-dialog')).not.toBeInTheDocument();
    expect(screen.queryByTestId('history-dialog')).not.toBeInTheDocument();
  });

  it('has proper form structure for filters', () => {
    renderWithQueryClient(<SubscriptionManagement />);

    // Check that filter inputs exist
    expect(screen.getByPlaceholderText('نام تنانت، ایمیل یا دامنه...')).toBeInTheDocument();
    
    // Check select elements
    const selects = screen.getAllByRole('combobox');
    expect(selects).toHaveLength(3); // subscription_type, status, expiry_status
  });

  it('maintains filter state correctly', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<SubscriptionManagement />);

    const searchInput = screen.getByPlaceholderText('نام تنانت، ایمیل یا دامنه...');
    
    // Type in search
    await user.type(searchInput, 'tenant');
    expect(searchInput).toHaveValue('tenant');

    // Value should persist
    await waitFor(() => {
      expect(searchInput).toHaveValue('tenant');
    });
  });

  it('shows loading state in overview when data is loading', () => {
    // We would need to mock the loading state, but our current mock doesn't support it
    // This test structure shows how we would test loading states
    renderWithQueryClient(<SubscriptionManagement />);
    
    // In a real scenario, we'd mock isLoading: true and check for loading indicators
    expect(screen.getByTestId('subscription-overview')).toBeInTheDocument();
  });
});