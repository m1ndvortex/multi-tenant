import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import WhoIsOnlineWidget from '../WhoIsOnlineWidget';

// Mock the hook
const mockUseOnlineUsers = vi.fn();

vi.mock('../../hooks/useOnlineUsers', () => ({
  useOnlineUsers: () => mockUseOnlineUsers(),
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
      {children}
    </QueryClientProvider>
  );
};

const mockOnlineUsersData = {
  users: [
    {
      id: '1',
      email: 'user1@example.com',
      tenant_name: 'Gold Shop Tehran',
      last_activity: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
      is_impersonation: false,
    },
    {
      id: '2',
      email: 'admin@example.com',
      tenant_name: 'Jewelry Store Isfahan',
      last_activity: new Date(Date.now() - 30 * 1000).toISOString(), // 30 seconds ago
      is_impersonation: true,
    },
    {
      id: '3',
      email: 'user3@example.com',
      tenant_name: 'Accounting Firm Shiraz',
      last_activity: new Date().toISOString(), // Just now
      is_impersonation: false,
    },
  ],
  total_count: 3,
  last_updated: new Date().toISOString(),
};

describe('WhoIsOnlineWidget Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders successfully with online users data', async () => {
    mockUseOnlineUsers.mockReturnValue({
      data: mockOnlineUsersData,
      isLoading: false,
      error: null,
      isRefetching: false,
    });

    render(
      <TestWrapper>
        <WhoIsOnlineWidget />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('کاربران آنلاین')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument(); // total count
    });
  });

  it('displays user information correctly', async () => {
    mockUseOnlineUsers.mockReturnValue({
      data: mockOnlineUsersData,
      isLoading: false,
      error: null,
      isRefetching: false,
    });

    render(
      <TestWrapper>
        <WhoIsOnlineWidget />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
      expect(screen.getByText('Gold Shop Tehran')).toBeInTheDocument();
      expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      expect(screen.getByText('Jewelry Store Isfahan')).toBeInTheDocument();
      expect(screen.getByText('user3@example.com')).toBeInTheDocument();
      expect(screen.getByText('Accounting Firm Shiraz')).toBeInTheDocument();
    });
  });

  it('shows impersonation indicators correctly', async () => {
    mockUseOnlineUsers.mockReturnValue({
      data: mockOnlineUsersData,
      isLoading: false,
      error: null,
      isRefetching: false,
    });

    render(
      <TestWrapper>
        <WhoIsOnlineWidget />
      </TestWrapper>
    );

    await waitFor(() => {
      // Should show impersonation badge for admin user
      expect(screen.getByText('جایگزین')).toBeInTheDocument();
      
      // Should have impersonation indicator (orange dot)
      const impersonationIndicators = document.querySelectorAll('.bg-orange-500');
      expect(impersonationIndicators.length).toBeGreaterThan(0);
    });
  });

  it('formats time ago correctly', async () => {
    mockUseOnlineUsers.mockReturnValue({
      data: mockOnlineUsersData,
      isLoading: false,
      error: null,
      isRefetching: false,
    });

    render(
      <TestWrapper>
        <WhoIsOnlineWidget />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getAllByText('همین الان')).toHaveLength(2); // Just now (appears 2 times - for user3 and last updated)
      expect(screen.getByText('2 دقیقه پیش')).toBeInTheDocument(); // 2 minutes ago
    });
  });

  it('handles loading state correctly', () => {
    mockUseOnlineUsers.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      isRefetching: false,
    });

    render(
      <TestWrapper>
        <WhoIsOnlineWidget />
      </TestWrapper>
    );

    expect(screen.getByText('کاربران آنلاین')).toBeInTheDocument();
    
    // Should show loading skeletons
    const loadingSkeletons = document.querySelectorAll('.animate-pulse');
    expect(loadingSkeletons.length).toBeGreaterThan(0);
  });

  it('handles error state correctly', () => {
    mockUseOnlineUsers.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to fetch online users'),
      isRefetching: false,
    });

    render(
      <TestWrapper>
        <WhoIsOnlineWidget />
      </TestWrapper>
    );

    expect(screen.getByText('کاربران آنلاین')).toBeInTheDocument();
    expect(screen.getByText('خطا در دریافت اطلاعات')).toBeInTheDocument();
    
    // Should show error indicator (red dot)
    const errorIndicator = document.querySelector('.bg-red-500');
    expect(errorIndicator).toBeInTheDocument();
  });

  it('handles empty users list correctly', () => {
    mockUseOnlineUsers.mockReturnValue({
      data: {
        users: [],
        total_count: 0,
        last_updated: new Date().toISOString(),
      },
      isLoading: false,
      error: null,
      isRefetching: false,
    });

    render(
      <TestWrapper>
        <WhoIsOnlineWidget />
      </TestWrapper>
    );

    expect(screen.getByText('کاربران آنلاین')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument(); // total count
    expect(screen.getByText('هیچ کاربری آنلاین نیست')).toBeInTheDocument();
  });

  it('shows refreshing indicator when refetching', () => {
    mockUseOnlineUsers.mockReturnValue({
      data: mockOnlineUsersData,
      isLoading: false,
      error: null,
      isRefetching: true,
    });

    render(
      <TestWrapper>
        <WhoIsOnlineWidget />
      </TestWrapper>
    );

    // Should show yellow pulsing indicator when refetching
    const refreshingIndicator = document.querySelector('.bg-yellow-500');
    expect(refreshingIndicator).toBeInTheDocument();
  });

  it('displays last updated timestamp', async () => {
    mockUseOnlineUsers.mockReturnValue({
      data: mockOnlineUsersData,
      isLoading: false,
      error: null,
      isRefetching: false,
    });

    render(
      <TestWrapper>
        <WhoIsOnlineWidget />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/آخرین بروزرسانی:/)).toBeInTheDocument();
    });
  });

  it('applies gradient design correctly', () => {
    mockUseOnlineUsers.mockReturnValue({
      data: mockOnlineUsersData,
      isLoading: false,
      error: null,
      isRefetching: false,
    });

    render(
      <TestWrapper>
        <WhoIsOnlineWidget />
      </TestWrapper>
    );

    // Should have gradient-green variant
    const gradientCard = document.querySelector('.bg-gradient-to-br.from-green-50.to-teal-100\\/50');
    expect(gradientCard).toBeInTheDocument();
  });

  it('has scrollable user list for many users', () => {
    const manyUsers = Array.from({ length: 10 }, (_, i) => ({
      id: `user-${i}`,
      email: `user${i}@example.com`,
      tenant_name: `Tenant ${i}`,
      last_activity: new Date().toISOString(),
      is_impersonation: false,
    }));

    mockUseOnlineUsers.mockReturnValue({
      data: {
        users: manyUsers,
        total_count: 10,
        last_updated: new Date().toISOString(),
      },
      isLoading: false,
      error: null,
      isRefetching: false,
    });

    render(
      <TestWrapper>
        <WhoIsOnlineWidget />
      </TestWrapper>
    );

    // Should have scrollable container
    const scrollableContainer = document.querySelector('.max-h-64.overflow-y-auto');
    expect(scrollableContainer).toBeInTheDocument();
  });

  it('renders user avatars with gradient backgrounds', async () => {
    mockUseOnlineUsers.mockReturnValue({
      data: mockOnlineUsersData,
      isLoading: false,
      error: null,
      isRefetching: false,
    });

    render(
      <TestWrapper>
        <WhoIsOnlineWidget />
      </TestWrapper>
    );

    await waitFor(() => {
      // Should have gradient avatar backgrounds
      const avatars = document.querySelectorAll('.bg-gradient-to-br.from-green-500.to-teal-600');
      expect(avatars.length).toBeGreaterThan(0);
    });
  });

  it('handles hover effects on user items', async () => {
    mockUseOnlineUsers.mockReturnValue({
      data: mockOnlineUsersData,
      isLoading: false,
      error: null,
      isRefetching: false,
    });

    render(
      <TestWrapper>
        <WhoIsOnlineWidget />
      </TestWrapper>
    );

    await waitFor(() => {
      // Should have hover effect classes
      const userItems = document.querySelectorAll('.hover\\:bg-white\\/70');
      expect(userItems.length).toBeGreaterThan(0);
    });
  });
});