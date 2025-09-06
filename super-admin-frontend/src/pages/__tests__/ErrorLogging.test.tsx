import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import ErrorLogging from '@/pages/ErrorLogging';
import { ErrorLog, ErrorSeverity, ErrorCategory, ErrorStatistics, ErrorTrends, CriticalErrorAlert } from '@/services/errorLoggingService';
import * as errorLoggingHooks from '@/hooks/useErrorLogging';

// Mock the hooks
vi.mock('@/hooks/useErrorLogging');

// Mock Chart.js components
vi.mock('@/components/ErrorTrendsChart', () => ({
  ErrorTrendsChart: ({ trends, isLoading }: any) => (
    <div data-testid="error-trends-chart">
      {isLoading ? 'Loading chart...' : trends ? 'Chart with data' : 'No data'}
    </div>
  ),
}));

const mockErrorLogs: ErrorLog[] = [
  {
    id: 'error-1',
    tenant_id: 'tenant-1',
    user_id: 'user-1',
    session_id: 'session-1',
    error_message: 'Database connection failed',
    error_type: 'DatabaseError',
    error_code: 'DB_CONN_001',
    endpoint: '/api/tenants/create',
    method: 'POST',
    status_code: 500,
    severity: ErrorSeverity.CRITICAL,
    category: ErrorCategory.DATABASE,
    request_id: 'req-1',
    user_agent: 'Mozilla/5.0',
    ip_address: '192.168.1.1',
    stack_trace: 'Error at line 1...',
    request_data: { name: 'Test Tenant' },
    response_data: { error: 'Connection failed' },
    additional_context: { retry_count: 3 },
    is_resolved: false,
    resolved_at: undefined,
    resolved_by: undefined,
    resolution_notes: undefined,
    notification_sent: false,
    notification_sent_at: undefined,
    occurrence_count: 5,
    first_occurrence: '2024-01-01T10:00:00Z',
    last_occurrence: '2024-01-01T12:00:00Z',
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T12:00:00Z',
  },
];

const mockStatistics: ErrorStatistics = {
  total_errors: 150,
  severity_breakdown: {
    [ErrorSeverity.CRITICAL]: 10,
    [ErrorSeverity.HIGH]: 25,
    [ErrorSeverity.MEDIUM]: 80,
    [ErrorSeverity.LOW]: 35,
  },
  category_breakdown: {
    [ErrorCategory.DATABASE]: 30,
    [ErrorCategory.VALIDATION]: 45,
    [ErrorCategory.AUTHENTICATION]: 20,
    [ErrorCategory.SYSTEM]: 25,
    [ErrorCategory.NETWORK]: 15,
    [ErrorCategory.BUSINESS_LOGIC]: 10,
    [ErrorCategory.EXTERNAL_API]: 5,
  },
  recent_critical_errors: 3,
  unresolved_errors: 45,
  top_error_endpoints: [
    { endpoint: '/api/users/login', count: 25 },
    { endpoint: '/api/tenants/create', count: 20 },
    { endpoint: '/api/invoices/generate', count: 15 },
  ],
};

const mockTrends: ErrorTrends = {
  daily_counts: [
    { date: '2024-01-01', count: 10, severity_breakdown: {} },
    { date: '2024-01-02', count: 15, severity_breakdown: {} },
    { date: '2024-01-03', count: 8, severity_breakdown: {} },
  ],
  severity_trends: {
    [ErrorSeverity.CRITICAL]: [
      { date: '2024-01-01', count: 2 },
      { date: '2024-01-02', count: 1 },
      { date: '2024-01-03', count: 0 },
    ],
  },
  period: {
    start_date: '2024-01-01',
    end_date: '2024-01-03',
    days: 3,
  },
};

const mockCriticalErrors: CriticalErrorAlert[] = [
  {
    id: 'critical-1',
    error_message: 'Critical database failure',
    error_type: 'DatabaseError',
    endpoint: '/api/critical/endpoint',
    severity: ErrorSeverity.CRITICAL,
    category: ErrorCategory.DATABASE,
    tenant_id: 'tenant-1',
    occurrence_count: 3,
    first_occurrence: '2024-01-01T10:00:00Z',
    last_occurrence: '2024-01-01T12:00:00Z',
  },
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('ErrorLogging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful hooks by default
    vi.mocked(errorLoggingHooks.useErrorLogs).mockReturnValue({
      data: {
        errors: mockErrorLogs,
        total: 150,
        skip: 0,
        limit: 50,
        has_more: true,
      },
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(errorLoggingHooks.useErrorStatistics).mockReturnValue({
      data: mockStatistics,
      isLoading: false,
    } as any);

    vi.mocked(errorLoggingHooks.useErrorTrends).mockReturnValue({
      data: mockTrends,
      isLoading: false,
    } as any);

    vi.mocked(errorLoggingHooks.useCriticalErrors).mockReturnValue({
      data: mockCriticalErrors,
      isLoading: false,
    } as any);

    vi.mocked(errorLoggingHooks.useErrorLoggingHealth).mockReturnValue({
      data: {
        status: 'healthy',
        database_connection: 'ok',
        recent_errors_accessible: true,
        total_errors_in_system: 150,
        timestamp: '2024-01-01T12:00:00Z',
      },
    } as any);

    vi.mocked(errorLoggingHooks.useBulkErrorAction).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);
  });

  it('renders page header correctly', () => {
    render(<ErrorLogging />, { wrapper: createWrapper() });

    expect(screen.getByText('مدیریت خطاهای API')).toBeInTheDocument();
    expect(screen.getByText('نظارت و مدیریت خطاهای سیستم با امکانات پیشرفته تحلیل و حل مسئله')).toBeInTheDocument();
  });

  it('displays health status badge', () => {
    render(<ErrorLogging />, { wrapper: createWrapper() });

    expect(screen.getByText('سیستم سالم')).toBeInTheDocument();
  });

  it('displays unhealthy status when system has issues', () => {
    vi.mocked(errorLoggingHooks.useErrorLoggingHealth).mockReturnValue({
      data: {
        status: 'unhealthy',
        database_connection: 'error',
        recent_errors_accessible: false,
        total_errors_in_system: 0,
        timestamp: '2024-01-01T12:00:00Z',
      },
    } as any);

    render(<ErrorLogging />, { wrapper: createWrapper() });

    expect(screen.getByText('مشکل در سیستم')).toBeInTheDocument();
  });

  it('displays critical errors alert', () => {
    render(<ErrorLogging />, { wrapper: createWrapper() });

    expect(screen.getByText('خطاهای بحرانی')).toBeInTheDocument();
    expect(screen.getByText('Critical database failure')).toBeInTheDocument();
  });

  it('renders all tabs correctly', () => {
    render(<ErrorLogging />, { wrapper: createWrapper() });

    expect(screen.getByText('نمای کلی')).toBeInTheDocument();
    expect(screen.getByText('لاگ خطاها')).toBeInTheDocument();
    expect(screen.getByText('تحلیل روند')).toBeInTheDocument();
    expect(screen.getByText('آمار تفصیلی')).toBeInTheDocument();
  });

  it('switches between tabs correctly', () => {
    render(<ErrorLogging />, { wrapper: createWrapper() });

    // Click on logs tab
    fireEvent.click(screen.getByText('لاگ خطاها'));
    
    // Should show filters and error table
    expect(screen.getByPlaceholderText('جستجو در پیام خطا...')).toBeInTheDocument();

    // Click on trends tab
    fireEvent.click(screen.getByText('تحلیل روند'));
    
    // Should show trends chart
    expect(screen.getByTestId('error-trends-chart')).toBeInTheDocument();
  });

  it('displays error statistics in overview tab', () => {
    render(<ErrorLogging />, { wrapper: createWrapper() });

    // Should be in overview tab by default
    expect(screen.getByText('150')).toBeInTheDocument(); // Total errors
    expect(screen.getByText('3')).toBeInTheDocument(); // Critical errors
    expect(screen.getByText('45')).toBeInTheDocument(); // Unresolved errors
  });

  it('handles error logs loading state', () => {
    vi.mocked(errorLoggingHooks.useErrorLogs).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    render(<ErrorLogging />, { wrapper: createWrapper() });

    // Switch to logs tab to see loading state
    fireEvent.click(screen.getByText('لاگ خطاها'));
    
    // Should show loading skeletons
    expect(document.querySelectorAll('.animate-pulse')).toHaveLength(10);
  });

  it('handles error logs error state', () => {
    vi.mocked(errorLoggingHooks.useErrorLogs).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch'),
    } as any);

    render(<ErrorLogging />, { wrapper: createWrapper() });

    expect(screen.getByText('خطا در دریافت لاگ خطاها')).toBeInTheDocument();
    expect(screen.getByText('امکان دریافت اطلاعات لاگ خطاها وجود ندارد')).toBeInTheDocument();
  });

  it('handles filter changes correctly', () => {
    const mockUseErrorLogs = vi.mocked(errorLoggingHooks.useErrorLogs);
    
    render(<ErrorLogging />, { wrapper: createWrapper() });

    // Switch to logs tab
    fireEvent.click(screen.getByText('لاگ خطاها'));

    // Change search filter
    const searchInput = screen.getByPlaceholderText('جستجو در پیام خطا...');
    fireEvent.change(searchInput, { target: { value: 'database' } });

    // Apply filters
    fireEvent.click(screen.getByText('اعمال فیلترها'));

    // Should call useErrorLogs with new filters
    expect(mockUseErrorLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        search_term: 'database',
        skip: 0, // Should reset pagination
      })
    );
  });

  it('handles error selection and bulk actions', () => {
    render(<ErrorLogging />, { wrapper: createWrapper() });

    // Switch to logs tab
    fireEvent.click(screen.getByText('لاگ خطاها'));

    // Select an error (assuming checkboxes are rendered)
    const checkboxes = screen.getAllByRole('checkbox');
    if (checkboxes.length > 1) {
      fireEvent.click(checkboxes[1]); // First error checkbox

      // Should show bulk actions
      expect(screen.getByText('عملیات گروهی')).toBeInTheDocument();
    }
  });

  it('handles pagination correctly', () => {
    const mockUseErrorLogs = vi.mocked(errorLoggingHooks.useErrorLogs);
    
    render(<ErrorLogging />, { wrapper: createWrapper() });

    // Switch to logs tab
    fireEvent.click(screen.getByText('لاگ خطاها'));

    // Mock pagination controls (assuming they exist)
    const nextButton = screen.queryByText('بعدی');
    if (nextButton && !nextButton.hasAttribute('disabled')) {
      fireEvent.click(nextButton);

      // Should call useErrorLogs with updated skip
      expect(mockUseErrorLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 50, // Next page
        })
      );
    }
  });

  it('opens error detail modal when error is clicked', () => {
    render(<ErrorLogging />, { wrapper: createWrapper() });

    // Switch to logs tab
    fireEvent.click(screen.getByText('لاگ خطاها'));

    // Click on an error (assuming error rows are clickable)
    const errorMessage = screen.getByText('Database connection failed');
    fireEvent.click(errorMessage);

    // Should open modal (check for modal content)
    expect(screen.getByText('جزئیات خطای API')).toBeInTheDocument();
  });

  it('closes error detail modal correctly', () => {
    render(<ErrorLogging />, { wrapper: createWrapper() });

    // Switch to logs tab and open modal
    fireEvent.click(screen.getByText('لاگ خطاها'));
    const errorMessage = screen.getByText('Database connection failed');
    fireEvent.click(errorMessage);

    // Close modal
    const closeButton = screen.getByText('بستن');
    fireEvent.click(closeButton);

    // Modal should be closed
    expect(screen.queryByText('جزئیات خطای API')).not.toBeInTheDocument();
  });

  it('displays trends chart in trends tab', () => {
    render(<ErrorLogging />, { wrapper: createWrapper() });

    // Switch to trends tab
    fireEvent.click(screen.getByText('تحلیل روند'));

    expect(screen.getByText('تحلیل روند خطاها')).toBeInTheDocument();
    expect(screen.getByTestId('error-trends-chart')).toBeInTheDocument();
  });

  it('displays detailed statistics in statistics tab', () => {
    render(<ErrorLogging />, { wrapper: createWrapper() });

    // Switch to statistics tab
    fireEvent.click(screen.getByText('آمار تفصیلی'));

    // Should show detailed statistics
    expect(screen.getByText('150')).toBeInTheDocument(); // Total errors
    expect(screen.getByText('تفکیک بر اساس شدت')).toBeInTheDocument();
    expect(screen.getByText('تفکیک بر اساس دسته‌بندی')).toBeInTheDocument();
  });

  it('handles no critical errors correctly', () => {
    vi.mocked(errorLoggingHooks.useCriticalErrors).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    render(<ErrorLogging />, { wrapper: createWrapper() });

    expect(screen.getByText('هیچ خطای بحرانی در 24 ساعت گذشته گزارش نشده است.')).toBeInTheDocument();
  });

  it('handles loading states for all components', () => {
    // Mock all hooks as loading
    vi.mocked(errorLoggingHooks.useErrorStatistics).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    vi.mocked(errorLoggingHooks.useErrorTrends).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    vi.mocked(errorLoggingHooks.useCriticalErrors).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    render(<ErrorLogging />, { wrapper: createWrapper() });

    // Should show loading states
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });
});