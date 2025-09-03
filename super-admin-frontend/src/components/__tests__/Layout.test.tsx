import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from '../Layout';
import { AuthProvider } from '../../contexts/AuthContext';
import { ThemeProvider } from '../../contexts/ThemeContext';

// Mock the hooks
vi.mock('../../hooks/useOnlineUsers', () => ({
  useOnlineUsers: () => ({
    data: {
      users: [
        {
          id: '1',
          email: 'user1@example.com',
          tenant_name: 'Test Tenant 1',
          last_activity: new Date().toISOString(),
          is_impersonation: false,
        },
        {
          id: '2',
          email: 'user2@example.com',
          tenant_name: 'Test Tenant 2',
          last_activity: new Date().toISOString(),
          is_impersonation: true,
        },
      ],
      total_count: 2,
      last_updated: new Date().toISOString(),
    },
    isLoading: false,
    error: null,
    isRefetching: false,
  }),
}));

vi.mock('../../hooks/useDashboardStats', () => ({
  useDashboardStats: () => ({
    data: {
      total_tenants: 10,
      active_tenants: 8,
      free_tier_tenants: 6,
      pro_tier_tenants: 4,
      pending_payment_tenants: 2,
      total_users: 50,
      active_users_today: 25,
      total_invoices_this_month: 150,
      mrr: 1200,
      system_health: {
        cpu_usage: 45,
        memory_usage: 60,
        database_status: 'healthy',
        redis_status: 'healthy',
        celery_status: 'healthy',
      },
      recent_signups: 5,
      recent_upgrades: 3,
    },
    isLoading: false,
    error: null,
  }),
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            {children}
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('Layout Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the layout with sidebar navigation', () => {
    render(
      <TestWrapper>
        <Layout>
          <div>Test Content</div>
        </Layout>
      </TestWrapper>
    );

    // Check if main elements are rendered
    expect(screen.getByText('HesaabPlus')).toBeInTheDocument();
    expect(screen.getAllByText('Super Admin')).toHaveLength(2); // Appears in sidebar and header
    expect(screen.getByText('پلتفرم مدیریت سیستم حسابداری')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders all navigation items with correct labels', () => {
    render(
      <TestWrapper>
        <Layout>
          <div>Test Content</div>
        </Layout>
      </TestWrapper>
    );

    // Check navigation items
    expect(screen.getByText('داشبورد')).toBeInTheDocument();
    expect(screen.getByText('مدیریت تنانت‌ها')).toBeInTheDocument();
    expect(screen.getByText('آنالیتیکس')).toBeInTheDocument();
    expect(screen.getByText('سلامت سیستم')).toBeInTheDocument();
    expect(screen.getByText('پشتیبان‌گیری')).toBeInTheDocument();
    expect(screen.getByText('جایگزینی کاربر')).toBeInTheDocument();
  });

  it('applies gradient backgrounds to navigation items', () => {
    render(
      <TestWrapper>
        <Layout>
          <div>Test Content</div>
        </Layout>
      </TestWrapper>
    );

    // Check if navigation items have gradient classes
    const dashboardLink = screen.getByText('داشبورد').closest('a');
    expect(dashboardLink).toHaveClass('bg-gradient-to-r');
  });

  it('toggles sidebar collapse state', async () => {
    render(
      <TestWrapper>
        <Layout>
          <div>Test Content</div>
        </Layout>
      </TestWrapper>
    );

    // Find the collapse button
    const collapseButton = screen.getByRole('button');
    
    // Initially sidebar should be expanded (showing text)
    expect(screen.getByText('داشبورد')).toBeInTheDocument();
    
    // Click to collapse
    fireEvent.click(collapseButton);
    
    // Wait for the transition - check for the collapsed class
    await waitFor(() => {
      const sidebarContainer = document.querySelector('.w-16');
      expect(sidebarContainer).toBeInTheDocument();
    });
  });

  it('displays user information in header', () => {
    render(
      <TestWrapper>
        <Layout>
          <div>Test Content</div>
        </Layout>
      </TestWrapper>
    );

    expect(screen.getAllByText('Super Admin')).toHaveLength(2); // Appears in sidebar and header
    expect(screen.getByText('admin@hesaabplus.com')).toBeInTheDocument();
  });

  it('has proper RTL direction', () => {
    render(
      <TestWrapper>
        <Layout>
          <div>Test Content</div>
        </Layout>
      </TestWrapper>
    );

    const mainContainer = screen.getByText('HesaabPlus').closest('div[dir="rtl"]');
    expect(mainContainer).toBeInTheDocument();
  });

  it('applies gradient background to main container', () => {
    render(
      <TestWrapper>
        <Layout>
          <div>Test Content</div>
        </Layout>
      </TestWrapper>
    );

    const mainContainer = screen.getByText('HesaabPlus').closest('.bg-gradient-to-br');
    expect(mainContainer).toHaveClass('from-slate-50', 'to-slate-100');
  });

  it('renders navigation icons', () => {
    render(
      <TestWrapper>
        <Layout>
          <div>Test Content</div>
        </Layout>
      </TestWrapper>
    );

    // Check if SVG icons are rendered (by checking for svg elements directly)
    const svgElements = document.querySelectorAll('svg');
    expect(svgElements.length).toBeGreaterThan(0);
  });

  it('has responsive design classes', () => {
    render(
      <TestWrapper>
        <Layout>
          <div>Test Content</div>
        </Layout>
      </TestWrapper>
    );

    const mainContainer = screen.getByText('Test Content').closest('.max-w-7xl');
    expect(mainContainer).toHaveClass('mx-auto');
  });

  it('renders with proper accessibility attributes', () => {
    render(
      <TestWrapper>
        <Layout>
          <div>Test Content</div>
        </Layout>
      </TestWrapper>
    );

    // Check for navigation landmark
    const nav = screen.getByRole('navigation');
    expect(nav).toBeInTheDocument();

    // Check for main content landmark
    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();

    // Check for header landmark
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
  });
});