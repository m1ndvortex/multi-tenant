import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import SuperAdminHeader from '../SuperAdminHeader';

// Mock the hooks
const mockUseDashboardStats = vi.fn();
const mockUseOnlineUsers = vi.fn();

vi.mock('../../hooks/useDashboardStats', () => ({
  useDashboardStats: () => mockUseDashboardStats(),
}));

vi.mock('../../hooks/useOnlineUsers', () => ({
  useOnlineUsers: () => mockUseOnlineUsers(),
}));

// Mock child components
vi.mock('../SystemStatusIndicator', () => ({
  default: ({ systemHealth, className }: any) => (
    <div data-testid="system-status-indicator" className={className}>
      Status: {systemHealth?.database_status || 'loading'}
    </div>
  ),
}));

vi.mock('../NotificationCenter', () => ({
  default: ({ isOpen, onToggle }: any) => (
    <div data-testid="notification-center">
      <button onClick={onToggle} data-testid="notification-toggle">
        Notifications {isOpen ? 'Open' : 'Closed'}
      </button>
    </div>
  ),
}));

vi.mock('../QuickSearchModal', () => ({
  default: ({ isOpen, onClose }: any) => (
    <div data-testid="quick-search-modal">
      {isOpen && (
        <div>
          <span>Search Modal Open</span>
          <button onClick={onClose} data-testid="close-search">Close</button>
        </div>
      )}
    </div>
  ),
}));

vi.mock('../HeaderActions', () => ({
  default: () => <div data-testid="header-actions">Header Actions</div>,
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
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const mockDashboardStats = {
  total_tenants: 150,
  active_tenants: 120,
  free_tier_tenants: 80,
  pro_tier_tenants: 40,
  pending_payment_tenants: 5,
  total_users: 500,
  active_users_today: 85,
  total_invoices_this_month: 1250,
  mrr: 15000,
  system_health: {
    cpu_usage: 45,
    memory_usage: 60,
    database_status: 'healthy' as const,
    redis_status: 'healthy' as const,
    celery_status: 'healthy' as const,
  },
  recent_signups: 12,
  recent_upgrades: 3,
};

const mockOnlineUsers = {
  users: [
    {
      id: '1',
      email: 'user1@example.com',
      tenant_name: 'Gold Shop Tehran',
      last_activity: new Date().toISOString(),
      is_impersonation: false,
    },
  ],
  total_count: 25,
  last_updated: new Date().toISOString(),
};

describe('SuperAdminHeader Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => 'mock-token'),
        removeItem: vi.fn(),
      },
      writable: true,
    });
  });

  it('renders successfully with all main elements', () => {
    mockUseDashboardStats.mockReturnValue({
      data: mockDashboardStats,
      isLoading: false,
    });
    mockUseOnlineUsers.mockReturnValue({
      data: mockOnlineUsers,
      isLoading: false,
    });

    render(
      <TestWrapper>
        <SuperAdminHeader />
      </TestWrapper>
    );

    // Check main branding elements
    expect(screen.getByText('HesaabPlus')).toBeInTheDocument();
    expect(screen.getByText('Super Admin Panel')).toBeInTheDocument();
    
    // Check system status indicator
    expect(screen.getByTestId('system-status-indicator')).toBeInTheDocument();
    
    // Check notification center
    expect(screen.getByTestId('notification-center')).toBeInTheDocument();
    
    // Check header actions
    expect(screen.getByTestId('header-actions')).toBeInTheDocument();
    
    // Check user profile section
    expect(screen.getAllByText('Super Admin')).toHaveLength(2); // One in main area, one in dropdown
    expect(screen.getAllByText('admin@hesaabplus.com')).toHaveLength(2);
  });

  it('displays quick stats correctly', () => {
    mockUseDashboardStats.mockReturnValue({
      data: mockDashboardStats,
      isLoading: false,
    });
    mockUseOnlineUsers.mockReturnValue({
      data: mockOnlineUsers,
      isLoading: false,
    });

    render(
      <TestWrapper>
        <SuperAdminHeader />
      </TestWrapper>
    );

    // Check active tenants
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('تنانت فعال')).toBeInTheDocument();
    
    // Check online users
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('کاربر آنلاین')).toBeInTheDocument();
    
    // Check MRR
    expect(screen.getByText('$15,000')).toBeInTheDocument();
    expect(screen.getByText('درآمد ماهانه')).toBeInTheDocument();
  });

  it('handles search modal opening and closing', async () => {
    mockUseDashboardStats.mockReturnValue({
      data: mockDashboardStats,
      isLoading: false,
    });
    mockUseOnlineUsers.mockReturnValue({
      data: mockOnlineUsers,
      isLoading: false,
    });

    render(
      <TestWrapper>
        <SuperAdminHeader />
      </TestWrapper>
    );

    // Find and click search button
    const searchButton = screen.getByTitle('جستجوی سراسری (Ctrl+/)');
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText('Search Modal Open')).toBeInTheDocument();
    });

    // Close the modal
    const closeButton = screen.getByTestId('close-search');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText('Search Modal Open')).not.toBeInTheDocument();
    });
  });

  it('handles keyboard shortcuts correctly', async () => {
    mockUseDashboardStats.mockReturnValue({
      data: mockDashboardStats,
      isLoading: false,
    });
    mockUseOnlineUsers.mockReturnValue({
      data: mockOnlineUsers,
      isLoading: false,
    });

    render(
      <TestWrapper>
        <SuperAdminHeader />
      </TestWrapper>
    );

    // Test Ctrl+/ for search
    fireEvent.keyDown(document, { key: '/', ctrlKey: true });

    await waitFor(() => {
      expect(screen.getByText('Search Modal Open')).toBeInTheDocument();
    });

    // Test Escape to close
    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByText('Search Modal Open')).not.toBeInTheDocument();
    });
  });

  it('handles notification center toggle', () => {
    mockUseDashboardStats.mockReturnValue({
      data: mockDashboardStats,
      isLoading: false,
    });
    mockUseOnlineUsers.mockReturnValue({
      data: mockOnlineUsers,
      isLoading: false,
    });

    render(
      <TestWrapper>
        <SuperAdminHeader />
      </TestWrapper>
    );

    const notificationToggle = screen.getByTestId('notification-toggle');
    
    // Initially closed
    expect(screen.getByText('Notifications Closed')).toBeInTheDocument();
    
    // Click to open
    fireEvent.click(notificationToggle);
    expect(screen.getByText('Notifications Open')).toBeInTheDocument();
  });

  it('handles user dropdown interactions', () => {
    mockUseDashboardStats.mockReturnValue({
      data: mockDashboardStats,
      isLoading: false,
    });
    mockUseOnlineUsers.mockReturnValue({
      data: mockOnlineUsers,
      isLoading: false,
    });

    render(
      <TestWrapper>
        <SuperAdminHeader />
      </TestWrapper>
    );

    // Find user profile section
    const userSections = screen.getAllByText('Super Admin');
    expect(userSections).toHaveLength(2);
    
    // Check for dropdown menu items
    expect(screen.getByText('تنظیمات پروفایل')).toBeInTheDocument();
    expect(screen.getByText('تنظیمات سیستم')).toBeInTheDocument();
    expect(screen.getByText('خروج از سیستم')).toBeInTheDocument();
  });

  it('handles logout functionality', () => {
    const mockRemoveItem = vi.fn();
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => 'mock-token'),
        removeItem: mockRemoveItem,
      },
      writable: true,
    });

    mockUseDashboardStats.mockReturnValue({
      data: mockDashboardStats,
      isLoading: false,
    });
    mockUseOnlineUsers.mockReturnValue({
      data: mockOnlineUsers,
      isLoading: false,
    });

    render(
      <TestWrapper>
        <SuperAdminHeader />
      </TestWrapper>
    );

    const logoutButton = screen.getByText('خروج از سیستم');
    fireEvent.click(logoutButton);

    expect(mockRemoveItem).toHaveBeenCalledWith('token');
  });

  it('handles loading states gracefully', () => {
    mockUseDashboardStats.mockReturnValue({
      data: null,
      isLoading: true,
    });
    mockUseOnlineUsers.mockReturnValue({
      data: null,
      isLoading: true,
    });

    render(
      <TestWrapper>
        <SuperAdminHeader />
      </TestWrapper>
    );

    // Should still render main structure
    expect(screen.getByText('HesaabPlus')).toBeInTheDocument();
    expect(screen.getByText('Super Admin Panel')).toBeInTheDocument();
    
    // Stats should show 0 when loading
    const zeroElements = screen.getAllByText('0');
    expect(zeroElements.length).toBeGreaterThan(0);
  });

  it('applies gradient design system correctly', () => {
    mockUseDashboardStats.mockReturnValue({
      data: mockDashboardStats,
      isLoading: false,
    });
    mockUseOnlineUsers.mockReturnValue({
      data: mockOnlineUsers,
      isLoading: false,
    });

    const { container } = render(
      <TestWrapper>
        <SuperAdminHeader />
      </TestWrapper>
    );

    // Check for gradient backgrounds
    const gradientElements = container.querySelectorAll('.bg-gradient-to-br');
    expect(gradientElements.length).toBeGreaterThan(0);
    
    // Check for backdrop blur
    const blurElements = container.querySelectorAll('.backdrop-blur-sm');
    expect(blurElements.length).toBeGreaterThan(0);
  });

  it('shows system status indicator only on large screens', () => {
    mockUseDashboardStats.mockReturnValue({
      data: mockDashboardStats,
      isLoading: false,
    });
    mockUseOnlineUsers.mockReturnValue({
      data: mockOnlineUsers,
      isLoading: false,
    });

    render(
      <TestWrapper>
        <SuperAdminHeader />
      </TestWrapper>
    );

    const statusIndicator = screen.getByTestId('system-status-indicator');
    expect(statusIndicator).toHaveClass('hidden', 'lg:flex');
  });

  it('shows quick stats only on extra large screens', () => {
    mockUseDashboardStats.mockReturnValue({
      data: mockDashboardStats,
      isLoading: false,
    });
    mockUseOnlineUsers.mockReturnValue({
      data: mockOnlineUsers,
      isLoading: false,
    });

    const { container } = render(
      <TestWrapper>
        <SuperAdminHeader />
      </TestWrapper>
    );

    const quickStatsSection = container.querySelector('.hidden.xl\\:flex');
    expect(quickStatsSection).toBeInTheDocument();
  });

  it('handles missing data gracefully', () => {
    mockUseDashboardStats.mockReturnValue({
      data: null,
      isLoading: false,
    });
    mockUseOnlineUsers.mockReturnValue({
      data: null,
      isLoading: false,
    });

    render(
      <TestWrapper>
        <SuperAdminHeader />
      </TestWrapper>
    );

    // Should still render without crashing
    expect(screen.getByText('HesaabPlus')).toBeInTheDocument();
    
    // Should show 0 for missing stats
    const zeroElements = screen.getAllByText('0');
    expect(zeroElements.length).toBeGreaterThan(0);
  });

  it('has proper accessibility attributes', () => {
    mockUseDashboardStats.mockReturnValue({
      data: mockDashboardStats,
      isLoading: false,
    });
    mockUseOnlineUsers.mockReturnValue({
      data: mockOnlineUsers,
      isLoading: false,
    });

    render(
      <TestWrapper>
        <SuperAdminHeader />
      </TestWrapper>
    );

    // Check for proper titles
    expect(screen.getByTitle('جستجوی سراسری (Ctrl+/)')).toBeInTheDocument();
    
    // Check for proper button roles
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('maintains responsive design classes', () => {
    mockUseDashboardStats.mockReturnValue({
      data: mockDashboardStats,
      isLoading: false,
    });
    mockUseOnlineUsers.mockReturnValue({
      data: mockOnlineUsers,
      isLoading: false,
    });

    const { container } = render(
      <TestWrapper>
        <SuperAdminHeader />
      </TestWrapper>
    );

    // Check for responsive classes
    const responsiveElements = container.querySelectorAll('.hidden.md\\:block, .hidden.sm\\:block, .hidden.lg\\:flex, .hidden.xl\\:flex');
    expect(responsiveElements.length).toBeGreaterThan(0);
  });
});