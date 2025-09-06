import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import QuickSearchModal from '../QuickSearchModal';

// Mock fetch
global.fetch = vi.fn();

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

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

const mockSearchResults = [
  {
    id: '1',
    type: 'tenant' as const,
    title: 'Gold Shop Tehran',
    subtitle: 'gold-shop-tehran.hesaabplus.com',
    url: '/tenants/1',
    metadata: {
      status: 'active',
      subscription: 'Pro',
    },
  },
  {
    id: '2',
    type: 'tenant' as const,
    title: 'Jewelry Store Isfahan',
    subtitle: 'jewelry-isfahan.hesaabplus.com',
    url: '/tenants/2',
    metadata: {
      status: 'suspended',
      subscription: 'Free',
    },
  },
  {
    id: '3',
    type: 'user' as const,
    title: 'admin@goldshop.com',
    subtitle: 'Gold Shop Tehran - Admin',
    url: '/tenants/1/users/3',
    metadata: {
      last_login: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
    },
  },
  {
    id: '4',
    type: 'user' as const,
    title: 'user@jewelry.com',
    subtitle: 'Jewelry Store Isfahan - User',
    url: '/tenants/2/users/4',
    metadata: {
      last_login: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
    },
  },
];

describe('QuickSearchModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockSearchResults,
    });
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => 'mock-token'),
      },
      writable: true,
    });
  });

  it('does not render when closed', () => {
    render(
      <TestWrapper>
        <QuickSearchModal isOpen={false} onClose={() => {}} />
      </TestWrapper>
    );

    expect(screen.queryByPlaceholderText('جستجوی تنانت‌ها، کاربران و...')).not.toBeInTheDocument();
  });

  it('renders and focuses input when opened', () => {
    render(
      <TestWrapper>
        <QuickSearchModal isOpen={true} onClose={() => {}} />
      </TestWrapper>
    );

    const searchInput = screen.getByPlaceholderText('جستجوی تنانت‌ها، کاربران و...');
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveFocus();
  });

  it('shows initial help content when no query', () => {
    render(
      <TestWrapper>
        <QuickSearchModal isOpen={true} onClose={() => {}} />
      </TestWrapper>
    );

    expect(screen.getByText('جستجوی سراسری')).toBeInTheDocument();
    expect(screen.getByText('تنانت‌ها، کاربران و سایر موارد را جستجو کنید')).toBeInTheDocument();
    expect(screen.getByText((content, element) => {
      return element?.textContent === '• حداقل 3 کاراکتر تایپ کنید';
    })).toBeInTheDocument();
    expect(screen.getByText((content, element) => {
      return element?.textContent === '• از کلیدهای ↑↓ برای حرکت استفاده کنید';
    })).toBeInTheDocument();
  });

  it('shows minimum character message for short queries', () => {
    render(
      <TestWrapper>
        <QuickSearchModal isOpen={true} onClose={() => {}} />
      </TestWrapper>
    );

    const searchInput = screen.getByPlaceholderText('جستجوی تنانت‌ها، کاربران و...');
    fireEvent.change(searchInput, { target: { value: 'ab' } });

    expect(screen.getByText('حداقل 3 کاراکتر تایپ کنید...')).toBeInTheDocument();
  });

  it('performs search when query is 3+ characters', async () => {
    render(
      <TestWrapper>
        <QuickSearchModal isOpen={true} onClose={() => {}} />
      </TestWrapper>
    );

    const searchInput = screen.getByPlaceholderText('جستجوی تنانت‌ها، کاربران و...');
    fireEvent.change(searchInput, { target: { value: 'gold' } });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/super-admin/search?q=gold',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
          }),
        })
      );
    });
  });

  it('displays search results correctly', async () => {
    render(
      <TestWrapper>
        <QuickSearchModal isOpen={true} onClose={() => {}} />
      </TestWrapper>
    );

    const searchInput = screen.getByPlaceholderText('جستجوی تنانت‌ها، کاربران و...');
    fireEvent.change(searchInput, { target: { value: 'gold' } });

    await waitFor(() => {
      expect(screen.getByText('Gold Shop Tehran')).toBeInTheDocument();
      expect(screen.getByText('Jewelry Store Isfahan')).toBeInTheDocument();
      expect(screen.getByText('admin@goldshop.com')).toBeInTheDocument();
      expect(screen.getByText('user@jewelry.com')).toBeInTheDocument();
    });
  });

  it('shows correct icons for different result types', async () => {
    render(
      <TestWrapper>
        <QuickSearchModal isOpen={true} onClose={() => {}} />
      </TestWrapper>
    );

    const searchInput = screen.getByPlaceholderText('جستجوی تنانت‌ها، کاربران و...');
    fireEvent.change(searchInput, { target: { value: 'gold' } });

    await waitFor(() => {
      // Should have tenant icons (blue) and user icons (green)
      const tenantIcons = document.querySelectorAll('.text-blue-500');
      const userIcons = document.querySelectorAll('.text-green-500');
      
      expect(tenantIcons.length).toBeGreaterThan(0);
      expect(userIcons.length).toBeGreaterThan(0);
    });
  });

  it('displays status badges for tenants correctly', async () => {
    render(
      <TestWrapper>
        <QuickSearchModal isOpen={true} onClose={() => {}} />
      </TestWrapper>
    );

    const searchInput = screen.getByPlaceholderText('جستجوی تنانت‌ها، کاربران و...');
    fireEvent.change(searchInput, { target: { value: 'gold' } });

    await waitFor(() => {
      expect(screen.getByText('فعال')).toBeInTheDocument();
      expect(screen.getByText('معلق')).toBeInTheDocument();
    });
  });

  it('shows online status for recently active users', async () => {
    render(
      <TestWrapper>
        <QuickSearchModal isOpen={true} onClose={() => {}} />
      </TestWrapper>
    );

    const searchInput = screen.getByPlaceholderText('جستجوی تنانت‌ها، کاربران و...');
    fireEvent.change(searchInput, { target: { value: 'gold' } });

    await waitFor(() => {
      // User with recent login should show online status
      const onlineStatuses = screen.getAllByText('آنلاین');
      expect(onlineStatuses.length).toBeGreaterThan(0);
    });
  });

  it('handles keyboard navigation correctly', async () => {
    render(
      <TestWrapper>
        <QuickSearchModal isOpen={true} onClose={() => {}} />
      </TestWrapper>
    );

    const searchInput = screen.getByPlaceholderText('جستجوی تنانت‌ها، کاربران و...');
    fireEvent.change(searchInput, { target: { value: 'gold' } });

    await waitFor(() => {
      expect(screen.getByText('Gold Shop Tehran')).toBeInTheDocument();
    });

    // Test arrow down
    fireEvent.keyDown(document, { key: 'ArrowDown' });
    
    // Should highlight second item
    const secondItem = screen.getByText('Jewelry Store Isfahan').closest('button');
    expect(secondItem).toHaveClass('bg-blue-50');

    // Test arrow up
    fireEvent.keyDown(document, { key: 'ArrowUp' });
    
    // Should highlight first item again
    const firstItem = screen.getByText('Gold Shop Tehran').closest('button');
    expect(firstItem).toHaveClass('bg-blue-50');
  });

  it('handles Enter key to select result', async () => {
    render(
      <TestWrapper>
        <QuickSearchModal isOpen={true} onClose={() => {}} />
      </TestWrapper>
    );

    const searchInput = screen.getByPlaceholderText('جستجوی تنانت‌ها، کاربران و...');
    fireEvent.change(searchInput, { target: { value: 'gold' } });

    await waitFor(() => {
      expect(screen.getByText('Gold Shop Tehran')).toBeInTheDocument();
    });

    // Press Enter to select first result
    fireEvent.keyDown(document, { key: 'Enter' });

    // Should navigate to the result URL
    expect(mockNavigate).toHaveBeenCalledWith('/tenants/1');
  });

  it('handles Escape key to close modal', () => {
    const mockOnClose = vi.fn();
    
    render(
      <TestWrapper>
        <QuickSearchModal isOpen={true} onClose={mockOnClose} />
      </TestWrapper>
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('handles clicking on search results', async () => {
    render(
      <TestWrapper>
        <QuickSearchModal isOpen={true} onClose={() => {}} />
      </TestWrapper>
    );

    const searchInput = screen.getByPlaceholderText('جستجوی تنانت‌ها، کاربران و...');
    fireEvent.change(searchInput, { target: { value: 'gold' } });

    await waitFor(() => {
      const firstResult = screen.getByText('Gold Shop Tehran').closest('button');
      fireEvent.click(firstResult!);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/tenants/1');
  });

  it('shows loading state while searching', async () => {
    // Mock delayed response
    (fetch as any).mockImplementation(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({
          ok: true,
          json: async () => mockSearchResults,
        }), 100)
      )
    );

    render(
      <TestWrapper>
        <QuickSearchModal isOpen={true} onClose={() => {}} />
      </TestWrapper>
    );

    const searchInput = screen.getByPlaceholderText('جستجوی تنانت‌ها، کاربران و...');
    fireEvent.change(searchInput, { target: { value: 'gold' } });

    // Should show loading skeletons
    const loadingSkeletons = document.querySelectorAll('.animate-pulse');
    expect(loadingSkeletons.length).toBeGreaterThan(0);
  });

  it('shows no results message when search returns empty', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(
      <TestWrapper>
        <QuickSearchModal isOpen={true} onClose={() => {}} />
      </TestWrapper>
    );

    const searchInput = screen.getByPlaceholderText('جستجوی تنانت‌ها، کاربران و...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    await waitFor(() => {
      expect(screen.getByText('نتیجه‌ای یافت نشد')).toBeInTheDocument();
      expect(screen.getByText('کلمات کلیدی دیگری امتحان کنید')).toBeInTheDocument();
    });
  });

  it('handles search API errors gracefully', async () => {
    (fetch as any).mockRejectedValue(new Error('Network error'));

    render(
      <TestWrapper>
        <QuickSearchModal isOpen={true} onClose={() => {}} />
      </TestWrapper>
    );

    const searchInput = screen.getByPlaceholderText('جستجوی تنانت‌ها، کاربران و...');
    fireEvent.change(searchInput, { target: { value: 'gold' } });

    // Should not crash and should show no results
    await waitFor(() => {
      expect(screen.getByText('نتیجه‌ای یافت نشد')).toBeInTheDocument();
    });
  });

  it('resets state when modal closes', () => {
    const { rerender } = render(
      <TestWrapper>
        <QuickSearchModal isOpen={true} onClose={() => {}} />
      </TestWrapper>
    );

    const searchInput = screen.getByPlaceholderText('جستجوی تنانت‌ها، کاربران و...');
    fireEvent.change(searchInput, { target: { value: 'test query' } });

    // Close modal
    rerender(
      <TestWrapper>
        <QuickSearchModal isOpen={false} onClose={() => {}} />
      </TestWrapper>
    );

    // Reopen modal
    rerender(
      <TestWrapper>
        <QuickSearchModal isOpen={true} onClose={() => {}} />
      </TestWrapper>
    );

    // Input should be empty
    const newSearchInput = screen.getByPlaceholderText('جستجوی تنانت‌ها، کاربران و...');
    expect(newSearchInput).toHaveValue('');
  });

  it('shows keyboard shortcuts in footer', () => {
    render(
      <TestWrapper>
        <QuickSearchModal isOpen={true} onClose={() => {}} />
      </TestWrapper>
    );

    expect(screen.getByText('حرکت')).toBeInTheDocument();
    expect(screen.getByText('انتخاب')).toBeInTheDocument();
    expect(screen.getAllByText('بستن')).toHaveLength(2); // One in shortcuts, one as button
  });

  it('handles close button click', () => {
    const mockOnClose = vi.fn();
    
    render(
      <TestWrapper>
        <QuickSearchModal isOpen={true} onClose={mockOnClose} />
      </TestWrapper>
    );

    const closeButtons = screen.getAllByText('بستن');
    const closeButton = closeButtons.find(button => button.tagName === 'BUTTON');
    fireEvent.click(closeButton!);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('displays subscription information for tenants', async () => {
    render(
      <TestWrapper>
        <QuickSearchModal isOpen={true} onClose={() => {}} />
      </TestWrapper>
    );

    const searchInput = screen.getByPlaceholderText('جستجوی تنانت‌ها، کاربران و...');
    fireEvent.change(searchInput, { target: { value: 'gold' } });

    await waitFor(() => {
      expect(screen.getByText('اشتراک: Pro')).toBeInTheDocument();
      expect(screen.getByText('اشتراک: Free')).toBeInTheDocument();
    });
  });

  it('has proper RTL direction', () => {
    render(
      <TestWrapper>
        <QuickSearchModal isOpen={true} onClose={() => {}} />
      </TestWrapper>
    );

    const searchInput = screen.getByPlaceholderText('جستجوی تنانت‌ها، کاربران و...');
    expect(searchInput).toHaveAttribute('dir', 'rtl');
  });

  it('applies backdrop blur effect', () => {
    const { container } = render(
      <TestWrapper>
        <QuickSearchModal isOpen={true} onClose={() => {}} />
      </TestWrapper>
    );

    const backdrop = container.querySelector('.backdrop-blur-sm');
    expect(backdrop).toBeInTheDocument();
  });

  it('maintains proper z-index for modal', () => {
    const { container } = render(
      <TestWrapper>
        <QuickSearchModal isOpen={true} onClose={() => {}} />
      </TestWrapper>
    );

    const modal = container.querySelector('.z-50');
    expect(modal).toBeInTheDocument();
  });
});