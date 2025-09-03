import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RealTimeSystemHealth from '../RealTimeSystemHealth';
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

describe('RealTimeSystemHealth', () => {
  const mockHealthData = {
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders component title correctly', () => {
    mockUseCurrentSystemHealth.mockReturnValue({
      data: mockHealthData,
      isLoading: false,
      error: null,
    } as any);

    render(<RealTimeSystemHealth />, { wrapper: createWrapper() });
    
    expect(screen.getByText('سلامت سیستم (زنده)')).toBeInTheDocument();
  });

  it('displays system health metrics when data is available', () => {
    mockUseCurrentSystemHealth.mockReturnValue({
      data: mockHealthData,
      isLoading: false,
      error: null,
    } as any);

    render(<RealTimeSystemHealth />, { wrapper: createWrapper() });
    
    expect(screen.getByText('استفاده از CPU')).toBeInTheDocument();
    expect(screen.getByText('استفاده از حافظه')).toBeInTheDocument();
    expect(screen.getByText('استفاده از دیسک')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
  });

  it('shows loading state when isLoading is true', () => {
    mockUseCurrentSystemHealth.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    render(<RealTimeSystemHealth />, { wrapper: createWrapper() });
    
    // Should show loading skeletons
    const loadingElements = screen.getAllByRole('generic');
    expect(loadingElements.some(el => el.classList.contains('animate-pulse'))).toBe(true);
  });

  it('displays error state when there is an error', () => {
    mockUseCurrentSystemHealth.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch'),
    } as any);

    render(<RealTimeSystemHealth />, { wrapper: createWrapper() });
    
    expect(screen.getByText('خطا در دریافت وضعیت سیستم')).toBeInTheDocument();
    expect(screen.getByText('امکان دریافت اطلاعات سلامت سیستم وجود ندارد')).toBeInTheDocument();
  });

  it('displays database performance metrics', () => {
    mockUseCurrentSystemHealth.mockReturnValue({
      data: mockHealthData,
      isLoading: false,
      error: null,
    } as any);

    render(<RealTimeSystemHealth />, { wrapper: createWrapper() });
    
    expect(screen.getByText('اتصالات دیتابیس')).toBeInTheDocument();
    expect(screen.getByText('زمان پاسخ DB')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('50ms')).toBeInTheDocument();
  });

  it('displays Redis performance metrics', () => {
    mockUseCurrentSystemHealth.mockReturnValue({
      data: mockHealthData,
      isLoading: false,
      error: null,
    } as any);

    render(<RealTimeSystemHealth />, { wrapper: createWrapper() });
    
    expect(screen.getByText('حافظه Redis')).toBeInTheDocument();
    expect(screen.getByText('کلاینت‌های Redis')).toBeInTheDocument();
    expect(screen.getByText('100MB')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('displays Celery task metrics', () => {
    mockUseCurrentSystemHealth.mockReturnValue({
      data: mockHealthData,
      isLoading: false,
      error: null,
    } as any);

    render(<RealTimeSystemHealth />, { wrapper: createWrapper() });
    
    expect(screen.getByText('تسک‌های فعال')).toBeInTheDocument();
    expect(screen.getByText('تسک‌های در انتظار')).toBeInTheDocument();
    expect(screen.getByText('تسک‌های ناموفق')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('displays API performance metrics', () => {
    mockUseCurrentSystemHealth.mockReturnValue({
      data: mockHealthData,
      isLoading: false,
      error: null,
    } as any);

    render(<RealTimeSystemHealth />, { wrapper: createWrapper() });
    
    expect(screen.getByText('زمان پاسخ API')).toBeInTheDocument();
    expect(screen.getByText('نرخ خطا')).toBeInTheDocument();
    expect(screen.getByText('120ms')).toBeInTheDocument();
    expect(screen.getByText('0.5%')).toBeInTheDocument();
  });

  it('shows correct health status badges for CPU usage', () => {
    // Test healthy status (< 70%)
    mockUseCurrentSystemHealth.mockReturnValue({
      data: { ...mockHealthData, cpu_usage: 45 },
      isLoading: false,
      error: null,
    } as any);

    render(<RealTimeSystemHealth />, { wrapper: createWrapper() });
    
    const cpuBadge = screen.getByText('45%').closest('.bg-green-100');
    expect(cpuBadge).toBeInTheDocument();
  });

  it('shows warning status for high CPU usage', () => {
    // Test warning status (70-90%)
    mockUseCurrentSystemHealth.mockReturnValue({
      data: { ...mockHealthData, cpu_usage: 75 },
      isLoading: false,
      error: null,
    } as any);

    render(<RealTimeSystemHealth />, { wrapper: createWrapper() });
    
    const cpuBadge = screen.getByText('75%').closest('.bg-yellow-100');
    expect(cpuBadge).toBeInTheDocument();
  });

  it('shows critical status for very high CPU usage', () => {
    // Test critical status (>= 90%)
    mockUseCurrentSystemHealth.mockReturnValue({
      data: { ...mockHealthData, cpu_usage: 95 },
      isLoading: false,
      error: null,
    } as any);

    render(<RealTimeSystemHealth />, { wrapper: createWrapper() });
    
    const cpuBadge = screen.getByText('95%').closest('.bg-red-100');
    expect(cpuBadge).toBeInTheDocument();
  });

  it('displays progress bars with correct widths', () => {
    mockUseCurrentSystemHealth.mockReturnValue({
      data: mockHealthData,
      isLoading: false,
      error: null,
    } as any);

    render(<RealTimeSystemHealth />, { wrapper: createWrapper() });
    
    // Find progress bars and check their width styles
    const progressBars = screen.getAllByRole('generic').filter(el => 
      el.style.width && el.style.width !== ''
    );
    
    expect(progressBars.length).toBeGreaterThan(0);
    expect(progressBars[0]).toHaveStyle('width: 45%'); // CPU usage
  });

  it('formats timestamp correctly in last update', () => {
    mockUseCurrentSystemHealth.mockReturnValue({
      data: mockHealthData,
      isLoading: false,
      error: null,
    } as any);

    render(<RealTimeSystemHealth />, { wrapper: createWrapper() });
    
    expect(screen.getByText(/آخرین بروزرسانی:/)).toBeInTheDocument();
    // Should show formatted time
    expect(screen.getByText(/\d{2}:\d{2}:\d{2}/)).toBeInTheDocument();
  });

  it('handles missing data gracefully', () => {
    mockUseCurrentSystemHealth.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    } as any);

    render(<RealTimeSystemHealth />, { wrapper: createWrapper() });
    
    // Should show 0 values when data is missing
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('shows loading spinner when data is being fetched', () => {
    mockUseCurrentSystemHealth.mockReturnValue({
      data: mockHealthData,
      isLoading: true,
      error: null,
    } as any);

    render(<RealTimeSystemHealth />, { wrapper: createWrapper() });
    
    // Should show loading spinner in header
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });
});