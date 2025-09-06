import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SystemHealthAlerts from '../SystemHealthAlerts';
import * as analyticsHooks from '@/hooks/useAnalytics';

// Mock the analytics hooks
vi.mock('@/hooks/useAnalytics');

const mockUseCurrentSystemHealth = vi.mocked(analyticsHooks.useCurrentSystemHealth);

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('SystemHealthAlerts', () => {
  const mockHealthyData = {
    timestamp: '2024-01-01T10:00:00Z',
    cpu_usage: 45,
    memory_usage: 60,
    disk_usage: 30,
    database_connections: 10,
    database_response_time: 50,
    redis_memory_usage: 100,
    redis_connected_clients: 5,
    celery_active_tasks: 2,
    celery_pending_tasks: 1,
    celery_failed_tasks: 0,
    api_response_time: 120,
    error_rate: 0.5,
  };

  const mockCriticalData = {
    ...mockHealthyData,
    cpu_usage: 95,
    memory_usage: 98,
    disk_usage: 97,
    database_response_time: 2500,
    api_response_time: 1500,
    error_rate: 15,
    celery_failed_tasks: 15,
  };

  const mockWarningData = {
    ...mockHealthyData,
    cpu_usage: 75,
    memory_usage: 85,
    disk_usage: 90,
    database_response_time: 1200,
    api_response_time: 600,
    error_rate: 7,
    celery_failed_tasks: 7,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders component title correctly', () => {
    mockUseCurrentSystemHealth.mockReturnValue({
      data: mockHealthyData,
      isLoading: false,
      error: null,
    } as any);

    render(<SystemHealthAlerts />, { wrapper: createWrapper() });
    
    expect(screen.getByText('هشدارهای سیستم')).toBeInTheDocument();
  });

  it('shows healthy status when all metrics are normal', () => {
    mockUseCurrentSystemHealth.mockReturnValue({
      data: mockHealthyData,
      isLoading: false,
      error: null,
    } as any);

    render(<SystemHealthAlerts />, { wrapper: createWrapper() });
    
    expect(screen.getByText('همه سیستم‌ها سالم هستند')).toBeInTheDocument();
    expect(screen.getByText('هیچ هشدار فعالی وجود ندارد')).toBeInTheDocument();
  });

  it('generates critical alerts for high metric values', async () => {
    mockUseCurrentSystemHealth.mockReturnValue({
      data: mockCriticalData,
      isLoading: false,
      error: null,
    } as any);

    render(<SystemHealthAlerts />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByText('استفاده بحرانی از CPU')).toBeInTheDocument();
      expect(screen.getByText('استفاده بحرانی از حافظه')).toBeInTheDocument();
      expect(screen.getByText('استفاده بحرانی از دیسک')).toBeInTheDocument();
    });
  });

  it('generates warning alerts for moderately high metric values', async () => {
    mockUseCurrentSystemHealth.mockReturnValue({
      data: mockWarningData,
      isLoading: false,
      error: null,
    } as any);

    render(<SystemHealthAlerts />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByText('استفاده بالا از CPU')).toBeInTheDocument();
      expect(screen.getByText('استفاده بالا از حافظه')).toBeInTheDocument();
      expect(screen.getByText('استفاده بالا از دیسک')).toBeInTheDocument();
    });
  });

  it('shows alert count badge when alerts are present', async () => {
    mockUseCurrentSystemHealth.mockReturnValue({
      data: mockCriticalData,
      isLoading: false,
      error: null,
    } as any);

    render(<SystemHealthAlerts />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      // Should show badge with number of active alerts
      const badges = screen.getAllByText(/\d+/);
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  it('displays critical and warning alert summaries', async () => {
    mockUseCurrentSystemHealth.mockReturnValue({
      data: mockCriticalData,
      isLoading: false,
      error: null,
    } as any);

    render(<SystemHealthAlerts />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByText('هشدارهای بحرانی')).toBeInTheDocument();
      expect(screen.getByText('هشدارهای عادی')).toBeInTheDocument();
    });
  });

  it('allows acknowledging alerts', async () => {
    mockUseCurrentSystemHealth.mockReturnValue({
      data: mockCriticalData,
      isLoading: false,
      error: null,
    } as any);

    render(<SystemHealthAlerts />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      const acknowledgeButtons = screen.getAllByTitle('تأیید هشدار');
      expect(acknowledgeButtons.length).toBeGreaterThan(0);
      
      // Click first acknowledge button
      fireEvent.click(acknowledgeButtons[0]);
    });
  });

  it('allows dismissing alerts', async () => {
    mockUseCurrentSystemHealth.mockReturnValue({
      data: mockCriticalData,
      isLoading: false,
      error: null,
    } as any);

    render(<SystemHealthAlerts />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      const dismissButtons = screen.getAllByTitle('حذف هشدار');
      expect(dismissButtons.length).toBeGreaterThan(0);
      
      // Click first dismiss button
      fireEvent.click(dismissButtons[0]);
    });
  });

  it('allows clearing all alerts', async () => {
    mockUseCurrentSystemHealth.mockReturnValue({
      data: mockCriticalData,
      isLoading: false,
      error: null,
    } as any);

    render(<SystemHealthAlerts />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      const clearAllButton = screen.getByText('پاک کردن همه');
      expect(clearAllButton).toBeInTheDocument();
      
      fireEvent.click(clearAllButton);
    });
  });

  it('allows toggling alerts on/off', () => {
    mockUseCurrentSystemHealth.mockReturnValue({
      data: mockHealthyData,
      isLoading: false,
      error: null,
    } as any);

    render(<SystemHealthAlerts />, { wrapper: createWrapper() });
    
    // Find the bell icon button to toggle alerts (first button in the header)
    const buttons = screen.getAllByRole('button');
    const toggleButton = buttons[0]; // First button is the bell toggle
    fireEvent.click(toggleButton);
    
    expect(screen.getByText('هشدارها غیرفعال شده‌اند')).toBeInTheDocument();
  });

  it('shows disabled state when alerts are turned off', () => {
    mockUseCurrentSystemHealth.mockReturnValue({
      data: mockHealthyData,
      isLoading: false,
      error: null,
    } as any);

    render(<SystemHealthAlerts />, { wrapper: createWrapper() });
    
    // Toggle alerts off
    const buttons = screen.getAllByRole('button');
    const toggleButton = buttons[0]; // First button is the bell toggle
    fireEvent.click(toggleButton);
    
    expect(screen.getByText('هشدارها غیرفعال شده‌اند')).toBeInTheDocument();
    expect(screen.getByText('فعال کردن هشدارها')).toBeInTheDocument();
  });

  it('can re-enable alerts from disabled state', () => {
    mockUseCurrentSystemHealth.mockReturnValue({
      data: mockHealthyData,
      isLoading: false,
      error: null,
    } as any);

    render(<SystemHealthAlerts />, { wrapper: createWrapper() });
    
    // Toggle alerts off
    const buttons = screen.getAllByRole('button');
    const toggleButton = buttons[0]; // First button is the bell toggle
    fireEvent.click(toggleButton);
    
    // Re-enable alerts
    const enableButton = screen.getByText('فعال کردن هشدارها');
    fireEvent.click(enableButton);
    
    expect(screen.getByText('همه سیستم‌ها سالم هستند')).toBeInTheDocument();
  });

  it('displays alert timestamps correctly', async () => {
    mockUseCurrentSystemHealth.mockReturnValue({
      data: mockCriticalData,
      isLoading: false,
      error: null,
    } as any);

    render(<SystemHealthAlerts />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getAllByText(/زمان:/).length).toBeGreaterThan(0);
    });
  });

  it('displays alert thresholds correctly', async () => {
    mockUseCurrentSystemHealth.mockReturnValue({
      data: mockCriticalData,
      isLoading: false,
      error: null,
    } as any);

    render(<SystemHealthAlerts />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getAllByText(/آستانه:/).length).toBeGreaterThan(0);
    });
  });

  it('sorts alerts by severity (critical first)', async () => {
    // Mix of critical and warning data
    const mixedData = {
      ...mockHealthyData,
      cpu_usage: 95, // Critical
      memory_usage: 85, // Warning
      disk_usage: 30, // Normal
    };

    mockUseCurrentSystemHealth.mockReturnValue({
      data: mixedData,
      isLoading: false,
      error: null,
    } as any);

    render(<SystemHealthAlerts />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      const alerts = screen.getAllByText(/استفاده.*از/);
      // Critical alerts should appear first
      expect(alerts[0]).toHaveTextContent('بحرانی');
    });
  });

  it('handles missing health data gracefully', () => {
    mockUseCurrentSystemHealth.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    } as any);

    render(<SystemHealthAlerts />, { wrapper: createWrapper() });
    
    expect(screen.getByText('همه سیستم‌ها سالم هستند')).toBeInTheDocument();
  });

  it('generates alerts for database response time', async () => {
    const slowDbData = {
      ...mockHealthyData,
      database_response_time: 2500, // Critical threshold
    };

    mockUseCurrentSystemHealth.mockReturnValue({
      data: slowDbData,
      isLoading: false,
      error: null,
    } as any);

    render(<SystemHealthAlerts />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByText('زمان پاسخ بحرانی دیتابیس')).toBeInTheDocument();
    });
  });

  it('generates alerts for API response time', async () => {
    const slowApiData = {
      ...mockHealthyData,
      api_response_time: 1500, // Critical threshold
    };

    mockUseCurrentSystemHealth.mockReturnValue({
      data: slowApiData,
      isLoading: false,
      error: null,
    } as any);

    render(<SystemHealthAlerts />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByText('زمان پاسخ بحرانی API')).toBeInTheDocument();
    });
  });

  it('generates alerts for high error rate', async () => {
    const highErrorData = {
      ...mockHealthyData,
      error_rate: 15, // Critical threshold
    };

    mockUseCurrentSystemHealth.mockReturnValue({
      data: highErrorData,
      isLoading: false,
      error: null,
    } as any);

    render(<SystemHealthAlerts />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByText('نرخ خطای بحرانی')).toBeInTheDocument();
    });
  });

  it('generates alerts for failed Celery tasks', async () => {
    const failedTasksData = {
      ...mockHealthyData,
      celery_failed_tasks: 15, // Critical threshold
    };

    mockUseCurrentSystemHealth.mockReturnValue({
      data: failedTasksData,
      isLoading: false,
      error: null,
    } as any);

    render(<SystemHealthAlerts />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByText('تسک‌های ناموفق بحرانی')).toBeInTheDocument();
    });
  });
});