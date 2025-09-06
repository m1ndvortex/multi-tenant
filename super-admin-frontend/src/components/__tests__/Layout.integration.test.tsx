import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi } from 'vitest';
import { NavigationProvider } from '@/contexts/NavigationContext';
import Layout from '../Layout';

// Mock the hooks that might not be available in test environment
vi.mock('@/hooks/useKeyboardShortcuts', () => ({
  default: () => ({ shortcuts: [] })
}));

const TestPage: React.FC<{ title: string }> = ({ title }) => (
  <div data-testid="page-content">{title}</div>
);

const renderLayoutWithProviders = (initialEntries = ['/']) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <NavigationProvider>
          <Layout>
            <TestPage title="Test Page Content" />
          </Layout>
        </NavigationProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Layout Integration', () => {
  it('renders complete layout with all navigation components', () => {
    renderLayoutWithProviders();
    
    // Check sidebar is present
    expect(screen.getByText('HesaabPlus')).toBeInTheDocument();
    expect(screen.getAllByText('Super Admin')).toHaveLength(2); // One in sidebar, one in dropdown
    
    // Check navigation items
    expect(screen.getAllByText('داشبورد')).toHaveLength(3); // Sidebar, header, breadcrumb
    expect(screen.getAllByText('مدیریت تنانت‌ها')).toHaveLength(1);
    expect(screen.getByText('آنالیتیکس')).toBeInTheDocument();
    
    // Check header
    expect(screen.getByText('نمای کلی سیستم و آمار کلیدی')).toBeInTheDocument(); // Page description
    
    // Check user profile dropdown
    expect(screen.getByText('admin@hesaabplus.com')).toBeInTheDocument();
    
    // Check page content
    expect(screen.getByTestId('page-content')).toHaveTextContent('Test Page Content');
  });

  it('updates page title and description based on route', () => {
    renderLayoutWithProviders(['/tenants']);
    
    expect(screen.getAllByText('مدیریت تنانت‌ها')).toHaveLength(3); // Sidebar, header, breadcrumb
    expect(screen.getByText('مدیریت کاربران، اشتراک‌ها و تأیید پرداخت‌ها')).toBeInTheDocument();
  });

  it('shows correct breadcrumb for different routes', () => {
    renderLayoutWithProviders(['/analytics']);
    
    // Should show: داشبورد > آنالیتیکس
    const breadcrumbItems = screen.getAllByText('آنالیتیکس');
    expect(breadcrumbItems.length).toBeGreaterThan(0);
  });

  it('highlights active navigation item', () => {
    renderLayoutWithProviders(['/system-health']);
    
    const systemHealthLink = screen.getByRole('link', { name: /سلامت سیستم/ });
    expect(systemHealthLink).toHaveClass('bg-gradient-to-r');
  });

  it('toggles sidebar when collapse button is clicked', async () => {
    renderLayoutWithProviders();
    
    // Initially expanded - should show text
    expect(screen.getByText('HesaabPlus')).toBeInTheDocument();
    
    const toggleButton = screen.getByRole('button', { name: /جمع کردن منو/ });
    fireEvent.click(toggleButton);
    
    // Should be collapsed - text should be hidden
    await waitFor(() => {
      expect(screen.queryByText('HesaabPlus')).not.toBeInTheDocument();
    });
  });

  it('opens user profile dropdown when clicked', async () => {
    renderLayoutWithProviders();
    
    // Find the profile button by looking for the one with user info
    const profileButton = screen.getByText('admin@hesaabplus.com').closest('button');
    expect(profileButton).toBeInTheDocument();
    
    fireEvent.click(profileButton!);
    
    await waitFor(() => {
      expect(screen.getByText('تنظیمات پروفایل')).toBeInTheDocument();
      expect(screen.getByText('خروج از سیستم')).toBeInTheDocument();
    });
  });

  it('shows keyboard shortcuts in navigation items', () => {
    renderLayoutWithProviders();
    
    expect(screen.getByText('Ctrl+1')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+2')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+3')).toBeInTheDocument();
  });

  it('renders quick action buttons in header', () => {
    renderLayoutWithProviders();
    
    const searchButton = screen.getByRole('button', { name: /جستجوی سراسری/ });
    const notificationButton = screen.getByRole('button', { name: /اعلان‌ها/ });
    
    expect(searchButton).toBeInTheDocument();
    expect(notificationButton).toBeInTheDocument();
  });

  it('applies RTL direction to layout', () => {
    const { container } = renderLayoutWithProviders();
    
    const layoutDiv = container.querySelector('[dir="rtl"]');
    expect(layoutDiv).toBeInTheDocument();
  });

  it('shows section headers in navigation', () => {
    renderLayoutWithProviders();
    
    expect(screen.getByText('اصلی')).toBeInTheDocument();
    expect(screen.getByText('مدیریت')).toBeInTheDocument();
    expect(screen.getByText('تحلیل و گزارش')).toBeInTheDocument();
    expect(screen.getByText('نظارت')).toBeInTheDocument();
    expect(screen.getByText('عملیات')).toBeInTheDocument();
  });

  it('renders version information in sidebar footer', () => {
    renderLayoutWithProviders();
    
    expect(screen.getByText('نسخه 2.0.0')).toBeInTheDocument();
    expect(screen.getByText('© 2024 HesaabPlus')).toBeInTheDocument();
  });

  it('applies gradient backgrounds correctly', () => {
    renderLayoutWithProviders();
    
    const layout = screen.getByRole('main').closest('.min-h-screen');
    expect(layout).toHaveClass('bg-gradient-to-br', 'from-slate-50', 'to-slate-100');
  });

  it('handles navigation between different pages', () => {
    // Test dashboard page
    const dashboardRender = renderLayoutWithProviders(['/']);
    expect(dashboardRender.container).toHaveTextContent('داشبورد');
    expect(dashboardRender.container).toHaveTextContent('نمای کلی سیستم و آمار کلیدی');
    
    // Test tenants page
    const tenantsRender = renderLayoutWithProviders(['/tenants']);
    expect(tenantsRender.container).toHaveTextContent('مدیریت تنانت‌ها');
    expect(tenantsRender.container).toHaveTextContent('مدیریت کاربران، اشتراک‌ها و تأیید پرداخت‌ها');
  });
});