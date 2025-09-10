/**
 * Subscription Management Component Tests
 * Tests for the professional subscription management interface
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import SubscriptionManagement from '@/pages/SubscriptionManagement';
import { NavigationProvider } from '@/contexts/NavigationContext';

// Mock the subscription service
vi.mock('@/services/subscriptionService', () => ({
  subscriptionService: {
    getOverview: vi.fn().mockResolvedValue({
      total_tenants: 100,
      free_subscriptions: 70,
      pro_subscriptions: 30,
      active_pro_subscriptions: 25,
      expiring_soon: 5,
      expired_subscriptions: 2,
      conversion_rate: 30.0,
      recent_upgrades: 8,
      last_updated: new Date().toISOString()
    }),
    getTenantSubscriptions: vi.fn().mockResolvedValue([
      {
        id: '1',
        name: 'Test Tenant 1',
        email: 'test1@example.com',
        subscription_type: 'pro',
        status: 'active',
        subscription_starts_at: '2024-01-01T00:00:00Z',
        subscription_expires_at: '2024-12-31T23:59:59Z',
        is_subscription_active: true,
        days_until_expiry: 90,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        id: '2',
        name: 'Test Tenant 2',
        email: 'test2@example.com',
        subscription_type: 'free',
        status: 'active',
        subscription_starts_at: null,
        subscription_expires_at: null,
        is_subscription_active: true,
        days_until_expiry: -1,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    ])
  }
}));

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = createTestQueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <NavigationProvider>
          {children}
        </NavigationProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('SubscriptionManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders subscription management page', async () => {
    render(
      <TestWrapper>
        <SubscriptionManagement />
      </TestWrapper>
    );

    // Check if the main title is rendered
    expect(screen.getByText('مدیریت اشتراک‌ها')).toBeInTheDocument();
  });

  it('displays subscription overview statistics', async () => {
    render(
      <TestWrapper>
        <SubscriptionManagement />
      </TestWrapper>
    );

    // Wait for the overview data to load
    await waitFor(() => {
      expect(screen.getByText('کل تنانت‌ها')).toBeInTheDocument();
    });

    // Check if statistics are displayed
    expect(screen.getByText('100')).toBeInTheDocument(); // total tenants
    expect(screen.getByText('30')).toBeInTheDocument(); // pro subscriptions
    expect(screen.getByText('70')).toBeInTheDocument(); // free subscriptions
  });

  it('displays tenant list with subscription details', async () => {
    render(
      <TestWrapper>
        <SubscriptionManagement />
      </TestWrapper>
    );

    // Wait for the tenant data to load
    await waitFor(() => {
      expect(screen.getByText('Test Tenant 1')).toBeInTheDocument();
    });

    // Check if tenant details are displayed
    expect(screen.getByText('test1@example.com')).toBeInTheDocument();
    expect(screen.getByText('Test Tenant 2')).toBeInTheDocument();
    expect(screen.getByText('test2@example.com')).toBeInTheDocument();
  });

  it('shows action buttons for each tenant', async () => {
    render(
      <TestWrapper>
        <SubscriptionManagement />
      </TestWrapper>
    );

    // Wait for the tenant data to load
    await waitFor(() => {
      expect(screen.getByText('Test Tenant 1')).toBeInTheDocument();
    });

    // Check if action buttons are present
    const extendButtons = screen.getAllByText('تمدید');
    const statusButtons = screen.getAllByText('وضعیت');
    const planButtons = screen.getAllByText('پلن');
    const controlButtons = screen.getAllByText('کنترل کامل');
    const historyButtons = screen.getAllByText('تاریخچه');

    expect(extendButtons).toHaveLength(2); // One for each tenant
    expect(statusButtons).toHaveLength(2);
    expect(planButtons).toHaveLength(2);
    expect(controlButtons).toHaveLength(2);
    expect(historyButtons).toHaveLength(2);
  });

  it('displays subscription badges correctly', async () => {
    render(
      <TestWrapper>
        <SubscriptionManagement />
      </TestWrapper>
    );

    // Wait for the tenant data to load
    await waitFor(() => {
      expect(screen.getByText('Test Tenant 1')).toBeInTheDocument();
    });

    // Check if subscription type badges are displayed
    expect(screen.getByText('حرفه‌ای')).toBeInTheDocument(); // Pro subscription
    expect(screen.getByText('رایگان')).toBeInTheDocument(); // Free subscription
  });

  it('shows filters and search functionality', async () => {
    render(
      <TestWrapper>
        <SubscriptionManagement />
      </TestWrapper>
    );

    // Check if filter elements are present
    expect(screen.getByPlaceholderText('جستجو بر اساس نام یا ایمیل...')).toBeInTheDocument();
    expect(screen.getByText('پاک کردن فیلترها')).toBeInTheDocument();
  });

  it('displays tabs for different views', async () => {
    render(
      <TestWrapper>
        <SubscriptionManagement />
      </TestWrapper>
    );

    // Check if tabs are present
    expect(screen.getByText('مدیریت تنانت‌ها')).toBeInTheDocument();
    expect(screen.getByText('آمار و تحلیل')).toBeInTheDocument();
  });
});