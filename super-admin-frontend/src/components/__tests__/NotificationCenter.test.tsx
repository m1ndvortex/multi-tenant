import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NotificationCenter from '../NotificationCenter';

// Mock fetch
global.fetch = vi.fn();

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

const mockNotifications = [
  {
    id: '1',
    type: 'error' as const,
    title: 'Database Connection Failed',
    message: 'Unable to connect to the primary database. Please check the connection.',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
    read: false,
    action: {
      label: 'View Details',
      url: '/system-health',
    },
  },
  {
    id: '2',
    type: 'warning' as const,
    title: 'High Memory Usage',
    message: 'System memory usage is above 85%. Consider scaling resources.',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
    read: false,
  },
  {
    id: '3',
    type: 'success' as const,
    title: 'Backup Completed',
    message: 'Daily backup has been completed successfully.',
    timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
    read: true,
  },
  {
    id: '4',
    type: 'info' as const,
    title: 'New Tenant Registration',
    message: 'A new tenant "Gold Shop Mashhad" has registered and is pending approval.',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    read: true,
    action: {
      label: 'Review',
      url: '/tenants',
    },
  },
];

const mockNotificationResponse = {
  notifications: mockNotifications,
  unread_count: 2,
};

describe('NotificationCenter Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockNotificationResponse,
    });
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => 'mock-token'),
      },
      writable: true,
    });
  });

  it('renders notification button with unread count', async () => {
    render(
      <TestWrapper>
        <NotificationCenter isOpen={false} onToggle={() => {}} />
      </TestWrapper>
    );

    await waitFor(() => {
      // Should show unread count badge
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    // Should have notification icon
    const notificationButton = screen.getByTitle('اعلان‌ها');
    expect(notificationButton).toBeInTheDocument();
  });

  it('shows notifications when opened', async () => {
    render(
      <TestWrapper>
        <NotificationCenter isOpen={true} onToggle={() => {}} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('اعلان‌ها')).toBeInTheDocument();
      expect(screen.getByText('Database Connection Failed')).toBeInTheDocument();
      expect(screen.getByText('High Memory Usage')).toBeInTheDocument();
      expect(screen.getByText('Backup Completed')).toBeInTheDocument();
      expect(screen.getByText('New Tenant Registration')).toBeInTheDocument();
    });
  });

  it('displays correct notification icons for different types', async () => {
    render(
      <TestWrapper>
        <NotificationCenter isOpen={true} onToggle={() => {}} />
      </TestWrapper>
    );

    await waitFor(() => {
      // Should have different colored icons
      const errorIcon = document.querySelector('.text-red-500');
      const warningIcon = document.querySelector('.text-yellow-500');
      const successIcon = document.querySelector('.text-green-500');
      const infoIcon = document.querySelector('.text-blue-500');
      
      expect(errorIcon).toBeInTheDocument();
      expect(warningIcon).toBeInTheDocument();
      expect(successIcon).toBeInTheDocument();
      expect(infoIcon).toBeInTheDocument();
    });
  });

  it('formats time ago correctly', async () => {
    render(
      <TestWrapper>
        <NotificationCenter isOpen={true} onToggle={() => {}} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('5 دقیقه پیش')).toBeInTheDocument();
      expect(screen.getByText('15 دقیقه پیش')).toBeInTheDocument();
      expect(screen.getByText('1 ساعت پیش')).toBeInTheDocument();
      expect(screen.getByText('2 ساعت پیش')).toBeInTheDocument();
    });
  });

  it('shows mark all as read button when there are unread notifications', async () => {
    render(
      <TestWrapper>
        <NotificationCenter isOpen={true} onToggle={() => {}} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('همه را خوانده شده علامت بزن')).toBeInTheDocument();
    });
  });

  it('marks individual notification as read when clicked', async () => {
    (fetch as any).mockImplementation((url: string) => {
      if (url.includes('/read')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({}),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => mockNotificationResponse,
      });
    });

    render(
      <TestWrapper>
        <NotificationCenter isOpen={true} onToggle={() => {}} />
      </TestWrapper>
    );

    await waitFor(() => {
      const unreadNotification = screen.getByText('Database Connection Failed').closest('div');
      expect(unreadNotification).toBeInTheDocument();
    });

    // Click on unread notification
    const unreadNotification = screen.getByText('Database Connection Failed').closest('div');
    fireEvent.click(unreadNotification!);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/super-admin/notifications/1/read',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  it('marks all notifications as read when button clicked', async () => {
    (fetch as any).mockImplementation((url: string) => {
      if (url.includes('/mark-all-read')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({}),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => mockNotificationResponse,
      });
    });

    render(
      <TestWrapper>
        <NotificationCenter isOpen={true} onToggle={() => {}} />
      </TestWrapper>
    );

    await waitFor(() => {
      const markAllButton = screen.getByText('همه را خوانده شده علامت بزن');
      fireEvent.click(markAllButton);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/super-admin/notifications/mark-all-read',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  it('handles action buttons correctly', async () => {
    // Mock window.location
    delete (window as any).location;
    window.location = { href: '' } as any;

    render(
      <TestWrapper>
        <NotificationCenter isOpen={true} onToggle={() => {}} />
      </TestWrapper>
    );

    await waitFor(() => {
      const viewDetailsButton = screen.getByText('View Details');
      const reviewButton = screen.getByText('Review');
      
      expect(viewDetailsButton).toBeInTheDocument();
      expect(reviewButton).toBeInTheDocument();
    });

    // Click action button
    const viewDetailsButton = screen.getByText('View Details');
    fireEvent.click(viewDetailsButton);

    expect(window.location.href).toBe('/system-health');
  });

  it('shows loading state correctly', () => {
    render(
      <TestWrapper>
        <NotificationCenter isOpen={true} onToggle={() => {}} />
      </TestWrapper>
    );

    // Should show loading skeletons initially
    const loadingSkeletons = document.querySelectorAll('.animate-pulse');
    expect(loadingSkeletons.length).toBeGreaterThan(0);
  });

  it('shows empty state when no notifications', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        notifications: [],
        unread_count: 0,
      }),
    });

    render(
      <TestWrapper>
        <NotificationCenter isOpen={true} onToggle={() => {}} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('اعلانی وجود ندارد')).toBeInTheDocument();
    });
  });

  it('handles fetch errors gracefully', async () => {
    (fetch as any).mockRejectedValue(new Error('Network error'));

    render(
      <TestWrapper>
        <NotificationCenter isOpen={true} onToggle={() => {}} />
      </TestWrapper>
    );

    // Should still render without crashing
    expect(screen.getByText('اعلان‌ها')).toBeInTheDocument();
  });

  it('shows unread indicators correctly', async () => {
    render(
      <TestWrapper>
        <NotificationCenter isOpen={true} onToggle={() => {}} />
      </TestWrapper>
    );

    await waitFor(() => {
      // Should show blue dots for unread notifications
      const unreadIndicators = document.querySelectorAll('.bg-blue-500');
      expect(unreadIndicators.length).toBeGreaterThan(0);
    });
  });

  it('applies different background for unread notifications', async () => {
    render(
      <TestWrapper>
        <NotificationCenter isOpen={true} onToggle={() => {}} />
      </TestWrapper>
    );

    await waitFor(() => {
      // Should have blue background for unread notifications
      const unreadBackgrounds = document.querySelectorAll('.bg-blue-50\\/50');
      expect(unreadBackgrounds.length).toBeGreaterThan(0);
    });
  });

  it('handles notification toggle correctly', () => {
    const mockToggle = vi.fn();
    
    render(
      <TestWrapper>
        <NotificationCenter isOpen={false} onToggle={mockToggle} />
      </TestWrapper>
    );

    const notificationButton = screen.getByTitle('اعلان‌ها');
    fireEvent.click(notificationButton);

    expect(mockToggle).toHaveBeenCalled();
  });

  it('does not render dropdown when closed', () => {
    render(
      <TestWrapper>
        <NotificationCenter isOpen={false} onToggle={() => {}} />
      </TestWrapper>
    );

    expect(screen.queryByText('اعلان‌ها')).not.toBeInTheDocument();
  });

  it('shows correct unread count in badge', async () => {
    render(
      <TestWrapper>
        <NotificationCenter isOpen={false} onToggle={() => {}} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  it('shows 9+ for high unread counts', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        notifications: mockNotifications,
        unread_count: 15,
      }),
    });

    render(
      <TestWrapper>
        <NotificationCenter isOpen={false} onToggle={() => {}} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('9+')).toBeInTheDocument();
    });
  });

  it('has scrollable notification list', async () => {
    render(
      <TestWrapper>
        <NotificationCenter isOpen={true} onToggle={() => {}} />
      </TestWrapper>
    );

    await waitFor(() => {
      const scrollableContainer = document.querySelector('.max-h-80.overflow-y-auto');
      expect(scrollableContainer).toBeInTheDocument();
    });
  });

  it('applies custom className correctly', () => {
    const { container } = render(
      <TestWrapper>
        <NotificationCenter isOpen={false} onToggle={() => {}} className="custom-class" />
      </TestWrapper>
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('prevents event propagation on action buttons', async () => {
    const mockToggle = vi.fn();
    
    render(
      <TestWrapper>
        <NotificationCenter isOpen={true} onToggle={mockToggle} />
      </TestWrapper>
    );

    await waitFor(() => {
      const actionButton = screen.getByText('View Details');
      fireEvent.click(actionButton);
    });

    // Toggle should not be called when clicking action button
    expect(mockToggle).not.toHaveBeenCalled();
  });
});