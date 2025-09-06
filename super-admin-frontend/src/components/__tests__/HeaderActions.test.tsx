import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import HeaderActions from '../HeaderActions';

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
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const mockBackupStatus = {
  last_backup: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
  status: 'success' as const,
  next_backup: new Date(Date.now() + 22 * 60 * 60 * 1000).toISOString(), // 22 hours from now
  total_backups: 45,
};

const mockBackupStatusRunning = {
  last_backup: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
  status: 'running' as const,
  next_backup: new Date(Date.now() + 23.5 * 60 * 60 * 1000).toISOString(),
  total_backups: 44,
};

const mockBackupStatusFailed = {
  last_backup: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
  status: 'failed' as const,
  next_backup: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString(),
  total_backups: 43,
};

const mockSystemAlerts = [
  {
    id: '1',
    type: 'critical' as const,
    message: 'Database connection lost',
    count: 1,
  },
  {
    id: '2',
    type: 'warning' as const,
    message: 'High memory usage detected',
    count: 3,
  },
  {
    id: '3',
    type: 'critical' as const,
    message: 'Backup process failed',
    count: 2,
  },
];

const mockSystemAlertsEmpty: never[] = [];

describe('HeaderActions Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => 'mock-token'),
      },
      writable: true,
    });
  });

  it('renders all action buttons correctly', () => {
    (fetch as any).mockImplementation((url: string) => {
      if (url.includes('backup-status')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockBackupStatus,
        });
      }
      if (url.includes('system-alerts')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockSystemAlertsEmpty,
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(
      <TestWrapper>
        <HeaderActions />
      </TestWrapper>
    );

    // Should have impersonation link
    expect(screen.getByTitle('جایگزینی سریع کاربر')).toBeInTheDocument();
    
    // Should have backup status button
    expect(screen.getByTitle('وضعیت پشتیبان‌گیری')).toBeInTheDocument();
    
    // Should have system alerts button
    expect(screen.getByTitle('هشدارهای سیستم')).toBeInTheDocument();
  });

  it('displays backup status correctly for successful backup', async () => {
    (fetch as any).mockImplementation((url: string) => {
      if (url.includes('backup-status')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockBackupStatus,
        });
      }
      if (url.includes('system-alerts')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockSystemAlertsEmpty,
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(
      <TestWrapper>
        <HeaderActions />
      </TestWrapper>
    );

    await waitFor(() => {
      const backupButton = screen.getByTitle('وضعیت پشتیبان‌گیری');
      expect(backupButton).toHaveClass('text-green-600', 'bg-green-100');
    });
  });

  it('displays backup status correctly for running backup', async () => {
    (fetch as any).mockImplementation((url: string) => {
      if (url.includes('backup-status')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockBackupStatusRunning,
        });
      }
      if (url.includes('system-alerts')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockSystemAlertsEmpty,
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(
      <TestWrapper>
        <HeaderActions />
      </TestWrapper>
    );

    await waitFor(() => {
      const backupButton = screen.getByTitle('وضعیت پشتیبان‌گیری');
      expect(backupButton).toHaveClass('text-blue-600', 'bg-blue-100');
    });
  });

  it('displays backup status correctly for failed backup', async () => {
    (fetch as any).mockImplementation((url: string) => {
      if (url.includes('backup-status')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockBackupStatusFailed,
        });
      }
      if (url.includes('system-alerts')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockSystemAlertsEmpty,
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(
      <TestWrapper>
        <HeaderActions />
      </TestWrapper>
    );

    await waitFor(() => {
      const backupButton = screen.getByTitle('وضعیت پشتیبان‌گیری');
      expect(backupButton).toHaveClass('text-red-600', 'bg-red-100');
    });
  });

  it('shows backup details when backup status is clicked', async () => {
    (fetch as any).mockImplementation((url: string) => {
      if (url.includes('backup-status')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockBackupStatus,
        });
      }
      if (url.includes('system-alerts')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockSystemAlertsEmpty,
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(
      <TestWrapper>
        <HeaderActions />
      </TestWrapper>
    );

    await waitFor(() => {
      const backupButton = screen.getByTitle('وضعیت پشتیبان‌گیری');
      fireEvent.click(backupButton);
    });

    await waitFor(() => {
      expect(screen.getByText('وضعیت پشتیبان‌گیری')).toBeInTheDocument();
      expect(screen.getByText('وضعیت فعلی:')).toBeInTheDocument();
      expect(screen.getByText('موفق')).toBeInTheDocument();
      expect(screen.getByText('آخرین پشتیبان:')).toBeInTheDocument();
      expect(screen.getByText('پشتیبان بعدی:')).toBeInTheDocument();
      expect(screen.getByText('تعداد کل:')).toBeInTheDocument();
      expect(screen.getByText('45 فایل')).toBeInTheDocument();
    });
  });

  it('formats time ago correctly in backup status', async () => {
    (fetch as any).mockImplementation((url: string) => {
      if (url.includes('backup-status')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockBackupStatus,
        });
      }
      if (url.includes('system-alerts')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockSystemAlertsEmpty,
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(
      <TestWrapper>
        <HeaderActions />
      </TestWrapper>
    );

    await waitFor(() => {
      const backupButton = screen.getByTitle('وضعیت پشتیبان‌گیری');
      fireEvent.click(backupButton);
    });

    await waitFor(() => {
      expect(screen.getByText('2 ساعت پیش')).toBeInTheDocument();
    });
  });

  it('shows system alerts count when there are critical alerts', async () => {
    (fetch as any).mockImplementation((url: string) => {
      if (url.includes('backup-status')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockBackupStatus,
        });
      }
      if (url.includes('system-alerts')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockSystemAlerts,
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(
      <TestWrapper>
        <HeaderActions />
      </TestWrapper>
    );

    await waitFor(() => {
      // Should show total critical count (1 + 2 = 3)
      expect(screen.getByText('3')).toBeInTheDocument();
      
      // Alert button should have red styling
      const alertButton = screen.getByTitle('هشدارهای سیستم');
      expect(alertButton).toHaveClass('text-red-600');
    });
  });

  it('shows system alerts details when clicked', async () => {
    (fetch as any).mockImplementation((url: string) => {
      if (url.includes('backup-status')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockBackupStatus,
        });
      }
      if (url.includes('system-alerts')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockSystemAlerts,
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(
      <TestWrapper>
        <HeaderActions />
      </TestWrapper>
    );

    await waitFor(() => {
      const alertButton = screen.getByTitle('هشدارهای سیستم');
      fireEvent.click(alertButton);
    });

    await waitFor(() => {
      expect(screen.getByText('هشدارهای سیستم')).toBeInTheDocument();
      expect(screen.getByText('Database connection lost')).toBeInTheDocument();
      expect(screen.getByText('High memory usage detected')).toBeInTheDocument();
      expect(screen.getByText('Backup process failed')).toBeInTheDocument();
      expect(screen.getByText('3 مورد')).toBeInTheDocument(); // For warning alert
      expect(screen.getByText('2 مورد')).toBeInTheDocument(); // For critical alert
    });
  });

  it('shows no alerts message when there are no system alerts', async () => {
    (fetch as any).mockImplementation((url: string) => {
      if (url.includes('backup-status')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockBackupStatus,
        });
      }
      if (url.includes('system-alerts')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockSystemAlertsEmpty,
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(
      <TestWrapper>
        <HeaderActions />
      </TestWrapper>
    );

    await waitFor(() => {
      const alertButton = screen.getByTitle('هشدارهای سیستم');
      fireEvent.click(alertButton);
    });

    await waitFor(() => {
      expect(screen.getByText('هشداری وجود ندارد')).toBeInTheDocument();
      expect(screen.getByText('سیستم در وضعیت عادی است')).toBeInTheDocument();
    });
  });

  it('shows correct alert indicators for different types', async () => {
    (fetch as any).mockImplementation((url: string) => {
      if (url.includes('backup-status')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockBackupStatus,
        });
      }
      if (url.includes('system-alerts')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockSystemAlerts,
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(
      <TestWrapper>
        <HeaderActions />
      </TestWrapper>
    );

    await waitFor(() => {
      const alertButton = screen.getByTitle('هشدارهای سیستم');
      fireEvent.click(alertButton);
    });

    await waitFor(() => {
      // Should have red dots for critical alerts
      const criticalIndicators = document.querySelectorAll('.bg-red-500');
      expect(criticalIndicators.length).toBeGreaterThan(0);
      
      // Should have yellow dot for warning alert
      const warningIndicators = document.querySelectorAll('.bg-yellow-500');
      expect(warningIndicators.length).toBeGreaterThan(0);
    });
  });

  it('has proper links to related pages', () => {
    (fetch as any).mockImplementation((url: string) => {
      if (url.includes('backup-status')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockBackupStatus,
        });
      }
      if (url.includes('system-alerts')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockSystemAlertsEmpty,
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(
      <TestWrapper>
        <HeaderActions />
      </TestWrapper>
    );

    // Should have link to impersonation page
    const impersonationLink = screen.getByTitle('جایگزینی سریع کاربر').closest('a');
    expect(impersonationLink).toHaveAttribute('href', '/impersonation');
  });

  it('shows management buttons in dropdowns', async () => {
    (fetch as any).mockImplementation((url: string) => {
      if (url.includes('backup-status')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockBackupStatus,
        });
      }
      if (url.includes('system-alerts')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockSystemAlertsEmpty,
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(
      <TestWrapper>
        <HeaderActions />
      </TestWrapper>
    );

    // Open backup status dropdown
    await waitFor(() => {
      const backupButton = screen.getByTitle('وضعیت پشتیبان‌گیری');
      fireEvent.click(backupButton);
    });

    await waitFor(() => {
      expect(screen.getByText('مدیریت پشتیبان‌ها')).toBeInTheDocument();
    });

    // Close backup dropdown and open alerts dropdown
    const backupButton = screen.getByTitle('وضعیت پشتیبان‌گیری');
    fireEvent.click(backupButton);

    const alertButton = screen.getByTitle('هشدارهای سیستم');
    fireEvent.click(alertButton);

    await waitFor(() => {
      expect(screen.getByText('مشاهده جزئیات سیستم')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    (fetch as any).mockRejectedValue(new Error('Network error'));

    render(
      <TestWrapper>
        <HeaderActions />
      </TestWrapper>
    );

    // Should still render buttons without crashing
    expect(screen.getByTitle('جایگزینی سریع کاربر')).toBeInTheDocument();
    expect(screen.getByTitle('وضعیت پشتیبان‌گیری')).toBeInTheDocument();
    expect(screen.getByTitle('هشدارهای سیستم')).toBeInTheDocument();
  });

  it('shows 9+ for high alert counts', async () => {
    const manyAlerts = [
      {
        id: '1',
        type: 'critical' as const,
        message: 'Critical alert 1',
        count: 5,
      },
      {
        id: '2',
        type: 'critical' as const,
        message: 'Critical alert 2',
        count: 8,
      },
    ];

    (fetch as any).mockImplementation((url: string) => {
      if (url.includes('backup-status')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockBackupStatus,
        });
      }
      if (url.includes('system-alerts')) {
        return Promise.resolve({
          ok: true,
          json: async () => manyAlerts,
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(
      <TestWrapper>
        <HeaderActions />
      </TestWrapper>
    );

    await waitFor(() => {
      // Total count is 13, should show 9+
      expect(screen.getByText('9+')).toBeInTheDocument();
    });
  });

  it('applies custom className correctly', () => {
    (fetch as any).mockImplementation((url: string) => {
      if (url.includes('backup-status')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockBackupStatus,
        });
      }
      if (url.includes('system-alerts')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockSystemAlertsEmpty,
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const { container } = render(
      <TestWrapper>
        <HeaderActions className="custom-class" />
      </TestWrapper>
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('has proper accessibility attributes', () => {
    (fetch as any).mockImplementation((url: string) => {
      if (url.includes('backup-status')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockBackupStatus,
        });
      }
      if (url.includes('system-alerts')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockSystemAlertsEmpty,
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(
      <TestWrapper>
        <HeaderActions />
      </TestWrapper>
    );

    // All buttons should have proper titles
    expect(screen.getByTitle('جایگزینی سریع کاربر')).toBeInTheDocument();
    expect(screen.getByTitle('وضعیت پشتیبان‌گیری')).toBeInTheDocument();
    expect(screen.getByTitle('هشدارهای سیستم')).toBeInTheDocument();
  });

  it('maintains proper z-index for dropdowns', async () => {
    (fetch as any).mockImplementation((url: string) => {
      if (url.includes('backup-status')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockBackupStatus,
        });
      }
      if (url.includes('system-alerts')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockSystemAlertsEmpty,
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(
      <TestWrapper>
        <HeaderActions />
      </TestWrapper>
    );

    await waitFor(() => {
      const backupButton = screen.getByTitle('وضعیت پشتیبان‌گیری');
      fireEvent.click(backupButton);
    });

    await waitFor(() => {
      const dropdown = document.querySelector('.z-50');
      expect(dropdown).toBeInTheDocument();
    });
  });
});