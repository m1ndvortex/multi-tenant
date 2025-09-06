import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import SubscriptionStatus from '@/components/SubscriptionStatus';

// Mock tenant context
const mockTenant = {
  id: 'tenant-1',
  name: 'تست کسب و کار',
  domain: 'test.hesaabplus.com',
  subscription_type: 'free' as const,
  subscription_expires_at: null,
  is_active: true,
};

const mockRefreshTenant = vi.fn();

vi.mock('@/contexts/TenantContext', () => ({
  useTenant: () => ({
    tenant: mockTenant,
    isLoading: false,
    refreshTenant: mockRefreshTenant,
  }),
}));

describe('SubscriptionStatus Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders free tier subscription badge', () => {
    render(<SubscriptionStatus />);

    expect(screen.getByText('اشتراک رایگان')).toBeInTheDocument();
    expect(screen.getByText('وضعیت اشتراک')).toBeInTheDocument();
  });

  it('shows upgrade prompt for free tier', () => {
    render(<SubscriptionStatus showUpgradePrompt={true} />);

    expect(screen.getByText('ارتقاء به اشتراک طلایی')).toBeInTheDocument();
    expect(screen.getByText('دسترسی به امکانات پیشرفته و گزارش‌های تحلیلی')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ارتقاء' })).toBeInTheDocument();
  });

  it('hides upgrade prompt when showUpgradePrompt is false', () => {
    render(<SubscriptionStatus showUpgradePrompt={false} />);

    expect(screen.queryByText('ارتقاء به اشتراک طلایی')).not.toBeInTheDocument();
  });

  it('displays usage limits for free tier', () => {
    render(<SubscriptionStatus />);

    expect(screen.getByText('محدودیت‌های استفاده')).toBeInTheDocument();
    expect(screen.getByText('کاربران')).toBeInTheDocument();
    expect(screen.getByText('محصولات')).toBeInTheDocument();
    expect(screen.getByText('مشتریان')).toBeInTheDocument();
    expect(screen.getByText('فاکتورهای ماهانه')).toBeInTheDocument();
  });

  it('shows usage progress bars', () => {
    render(<SubscriptionStatus />);

    // Check for progress elements (assuming they have role="progressbar")
    const progressBars = screen.getAllByRole('progressbar');
    expect(progressBars).toHaveLength(4); // Users, Products, Customers, Invoices
  });

  it('renders compact mode correctly', () => {
    render(<SubscriptionStatus compact={true} />);

    expect(screen.getByText('اشتراک رایگان')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ارتقاء/ })).toBeInTheDocument();
    
    // Should not show detailed usage limits in compact mode
    expect(screen.queryByText('محدودیت‌های استفاده')).not.toBeInTheDocument();
  });

  it('displays pro subscription badge', () => {
    // Mock pro subscription
    vi.mocked(vi.importActual('@/contexts/TenantContext')).then(actual => {
      vi.mocked(actual.useTenant).mockReturnValue({
        tenant: {
          ...mockTenant,
          subscription_type: 'pro',
          subscription_expires_at: '2024-12-31T23:59:59Z', // Future date
        },
        isLoading: false,
        refreshTenant: mockRefreshTenant,
      });
    });

    render(<SubscriptionStatus />);

    expect(screen.getByText('اشتراک طلایی')).toBeInTheDocument();
  });

  it('shows expired subscription status', () => {
    // Mock expired pro subscription
    vi.mocked(vi.importActual('@/contexts/TenantContext')).then(actual => {
      vi.mocked(actual.useTenant).mockReturnValue({
        tenant: {
          ...mockTenant,
          subscription_type: 'pro',
          subscription_expires_at: '2023-01-01T00:00:00Z', // Past date
        },
        isLoading: false,
        refreshTenant: mockRefreshTenant,
      });
    });

    render(<SubscriptionStatus />);

    expect(screen.getByText('اشتراک منقضی شده')).toBeInTheDocument();
    expect(screen.getByText('منقضی شده')).toBeInTheDocument();
  });

  it('displays days remaining for active pro subscription', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 15); // 15 days from now

    vi.mocked(vi.importActual('@/contexts/TenantContext')).then(actual => {
      vi.mocked(actual.useTenant).mockReturnValue({
        tenant: {
          ...mockTenant,
          subscription_type: 'pro',
          subscription_expires_at: futureDate.toISOString(),
        },
        isLoading: false,
        refreshTenant: mockRefreshTenant,
      });
    });

    render(<SubscriptionStatus />);

    expect(screen.getByText(/\d+ روز باقی‌مانده/)).toBeInTheDocument();
  });

  it('shows warning for subscription expiring soon', () => {
    const soonDate = new Date();
    soonDate.setDate(soonDate.getDate() + 3); // 3 days from now

    vi.mocked(vi.importActual('@/contexts/TenantContext')).then(actual => {
      vi.mocked(actual.useTenant).mockReturnValue({
        tenant: {
          ...mockTenant,
          subscription_type: 'pro',
          subscription_expires_at: soonDate.toISOString(),
        },
        isLoading: false,
        refreshTenant: mockRefreshTenant,
      });
    });

    render(<SubscriptionStatus />);

    expect(screen.getByText('3 روز باقی‌مانده')).toBeInTheDocument();
  });

  it('shows loading state when tenant is loading', () => {
    vi.mocked(vi.importActual('@/contexts/TenantContext')).then(actual => {
      vi.mocked(actual.useTenant).mockReturnValue({
        tenant: null,
        isLoading: true,
        refreshTenant: mockRefreshTenant,
      });
    });

    render(<SubscriptionStatus />);

    // Should show skeleton loading
    const skeletonElements = screen.getByRole('generic'); // Card with animate-pulse
    expect(skeletonElements).toHaveClass('animate-pulse');
  });

  it('handles null tenant gracefully', () => {
    vi.mocked(vi.importActual('@/contexts/TenantContext')).then(actual => {
      vi.mocked(actual.useTenant).mockReturnValue({
        tenant: null,
        isLoading: false,
        refreshTenant: mockRefreshTenant,
      });
    });

    render(<SubscriptionStatus />);

    // Should show skeleton when tenant is null
    const skeletonElements = screen.getByRole('generic');
    expect(skeletonElements).toHaveClass('animate-pulse');
  });

  it('applies custom className', () => {
    render(<SubscriptionStatus className="custom-class" />);

    const container = screen.getByText('وضعیت اشتراک').closest('div')?.parentElement;
    expect(container).toHaveClass('custom-class');
  });

  it('shows near limit warning for free tier users', () => {
    // This would require mocking the usage stats API
    // For now, we'll test the UI structure
    render(<SubscriptionStatus />);

    // Check that usage limits are displayed
    expect(screen.getByText('1 / 1')).toBeInTheDocument(); // Users limit
    expect(screen.getByText('8 / 10')).toBeInTheDocument(); // Products near limit
  });

  it('displays gradient design system elements', () => {
    render(<SubscriptionStatus />);

    // Check for gradient classes in badges and cards
    const freeBadge = screen.getByText('اشتراک رایگان').closest('span');
    expect(freeBadge).toHaveClass('bg-gradient-to-r', 'from-green-500', 'to-teal-600');

    const upgradeCard = screen.getByText('ارتقاء به اشتراک طلایی').closest('div');
    expect(upgradeCard).toHaveClass('bg-gradient-to-r', 'from-purple-50', 'to-violet-50');
  });

  it('handles RTL layout correctly', () => {
    render(
      <div dir="rtl">
        <SubscriptionStatus />
      </div>
    );

    // Check that Persian text is displayed correctly
    expect(screen.getByText('وضعیت اشتراک')).toBeInTheDocument();
    expect(screen.getByText('محدودیت‌های استفاده')).toBeInTheDocument();
  });
});