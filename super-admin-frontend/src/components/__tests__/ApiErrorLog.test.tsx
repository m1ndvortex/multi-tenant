import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ApiErrorLog from '../ApiErrorLog';
import * as analyticsHooks from '@/hooks/useAnalytics';

// Mock the analytics hooks
vi.mock('@/hooks/useAnalytics');

const mockUseApiErrors = vi.mocked(analyticsHooks.useApiErrors);

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

describe('ApiErrorLog', () => {
  const mockErrorData = {
    errors: [
      {
        id: '1',
        timestamp: '2024-01-01T10:00:00Z',
        method: 'POST',
        endpoint: '/api/tenants',
        status_code: 400,
        error_message: 'Invalid tenant data',
        tenant_id: 'tenant-123',
        user_id: 'user-456',
        request_id: 'req-789',
        ip_address: '192.168.1.1',
      },
      {
        id: '2',
        timestamp: '2024-01-01T11:00:00Z',
        method: 'GET',
        endpoint: '/api/users',
        status_code: 500,
        error_message: 'Internal server error',
        request_id: 'req-890',
        ip_address: '192.168.1.2',
      },
    ],
    total: 2,
    page: 1,
    limit: 20,
    total_pages: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders component title correctly', () => {
    mockUseApiErrors.mockReturnValue({
      data: mockErrorData,
      isLoading: false,
      error: null,
    } as any);

    render(<ApiErrorLog />, { wrapper: createWrapper() });
    
    expect(screen.getByText('لاگ خطاهای API')).toBeInTheDocument();
  });

  it('displays error list when data is available', () => {
    mockUseApiErrors.mockReturnValue({
      data: mockErrorData,
      isLoading: false,
      error: null,
    } as any);

    render(<ApiErrorLog />, { wrapper: createWrapper() });
    
    expect(screen.getByText('Invalid tenant data')).toBeInTheDocument();
    expect(screen.getByText('Internal server error')).toBeInTheDocument();
    expect(screen.getByText('POST')).toBeInTheDocument();
    expect(screen.getByText('GET')).toBeInTheDocument();
  });

  it('shows loading state when isLoading is true', () => {
    mockUseApiErrors.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    render(<ApiErrorLog />, { wrapper: createWrapper() });
    
    // Should show loading skeletons
    const loadingElements = screen.getAllByRole('generic');
    expect(loadingElements.some(el => el.classList.contains('animate-pulse'))).toBe(true);
  });

  it('displays error state when there is an error', () => {
    mockUseApiErrors.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch'),
    } as any);

    render(<ApiErrorLog />, { wrapper: createWrapper() });
    
    expect(screen.getByText('خطا در دریافت لاگ خطاها')).toBeInTheDocument();
    expect(screen.getByText('امکان دریافت اطلاعات لاگ خطاها وجود ندارد')).toBeInTheDocument();
  });

  it('shows empty state when no errors are found', () => {
    mockUseApiErrors.mockReturnValue({
      data: { ...mockErrorData, errors: [], total: 0 },
      isLoading: false,
      error: null,
    } as any);

    render(<ApiErrorLog />, { wrapper: createWrapper() });
    
    expect(screen.getByText('خطایی یافت نشد')).toBeInTheDocument();
    expect(screen.getByText('هیچ خطای API با فیلترهای انتخابی یافت نشد')).toBeInTheDocument();
  });

  it('handles search functionality', async () => {
    mockUseApiErrors.mockReturnValue({
      data: mockErrorData,
      isLoading: false,
      error: null,
    } as any);

    render(<ApiErrorLog />, { wrapper: createWrapper() });
    
    const searchInput = screen.getByPlaceholderText('جستجو در پیام خطا...');
    const searchButton = screen.getByText('جستجو');
    
    fireEvent.change(searchInput, { target: { value: 'Invalid' } });
    fireEvent.click(searchButton);
    
    await waitFor(() => {
      expect(mockUseApiErrors).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'Invalid',
          page: 1,
        })
      );
    });
  });

  it('handles status code filter', async () => {
    mockUseApiErrors.mockReturnValue({
      data: mockErrorData,
      isLoading: false,
      error: null,
    } as any);

    render(<ApiErrorLog />, { wrapper: createWrapper() });
    
    const statusSelect = screen.getByRole('combobox');
    fireEvent.click(statusSelect);
    
    const option400 = screen.getByText('400 - Bad Request');
    fireEvent.click(option400);
    
    const searchButton = screen.getByText('جستجو');
    fireEvent.click(searchButton);
    
    await waitFor(() => {
      expect(mockUseApiErrors).toHaveBeenCalledWith(
        expect.objectContaining({
          status_code: 400,
          page: 1,
        })
      );
    });
  });

  it('handles clear filters functionality', async () => {
    mockUseApiErrors.mockReturnValue({
      data: mockErrorData,
      isLoading: false,
      error: null,
    } as any);

    render(<ApiErrorLog />, { wrapper: createWrapper() });
    
    const searchInput = screen.getByPlaceholderText('جستجو در پیام خطا...');
    const clearButton = screen.getByText('پاک کردن');
    
    fireEvent.change(searchInput, { target: { value: 'test' } });
    fireEvent.click(clearButton);
    
    expect(searchInput).toHaveValue('');
    
    await waitFor(() => {
      expect(mockUseApiErrors).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 20,
        })
      );
    });
  });

  it('displays pagination when multiple pages exist', () => {
    const multiPageData = {
      ...mockErrorData,
      total: 50,
      total_pages: 3,
      page: 1,
    };

    mockUseApiErrors.mockReturnValue({
      data: multiPageData,
      isLoading: false,
      error: null,
    } as any);

    render(<ApiErrorLog />, { wrapper: createWrapper() });
    
    expect(screen.getByText('نمایش 1 تا 20 از 50 خطا')).toBeInTheDocument();
    expect(screen.getByText('صفحه 1 از 3')).toBeInTheDocument();
    expect(screen.getByText('بعدی')).toBeInTheDocument();
  });

  it('formats timestamps correctly', () => {
    mockUseApiErrors.mockReturnValue({
      data: mockErrorData,
      isLoading: false,
      error: null,
    } as any);

    render(<ApiErrorLog />, { wrapper: createWrapper() });
    
    // Should format timestamp in Persian locale - look for Persian digits
    const timestamps = screen.getAllByText(/۱۴۰۲\/۱۰\/۱۱/);
    expect(timestamps.length).toBeGreaterThan(0);
  });

  it('displays correct badge colors for different HTTP methods', () => {
    mockUseApiErrors.mockReturnValue({
      data: mockErrorData,
      isLoading: false,
      error: null,
    } as any);

    render(<ApiErrorLog />, { wrapper: createWrapper() });
    
    const postBadge = screen.getByText('POST');
    const getBadge = screen.getByText('GET');
    
    // Check that the badges have the correct color classes
    expect(postBadge).toHaveClass('bg-blue-100', 'text-blue-800');
    expect(getBadge).toHaveClass('bg-green-100', 'text-green-800');
  });

  it('displays error details correctly', () => {
    mockUseApiErrors.mockReturnValue({
      data: mockErrorData,
      isLoading: false,
      error: null,
    } as any);

    render(<ApiErrorLog />, { wrapper: createWrapper() });
    
    // Check if tenant and user IDs are displayed (truncated)
    expect(screen.getByText(/تنانت: tenant-1/)).toBeInTheDocument();
    expect(screen.getByText(/کاربر: user-456/)).toBeInTheDocument();
    expect(screen.getByText(/IP: 192\.168\.1\.1/)).toBeInTheDocument();
  });
});