import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { ErrorDetailModal } from '@/components/ErrorDetailModal';
import { ErrorLog, ErrorSeverity, ErrorCategory } from '@/services/errorLoggingService';
import * as errorLoggingHooks from '@/hooks/useErrorLogging';

// Mock the hooks
vi.mock('@/hooks/useErrorLogging');

const mockErrorLog: ErrorLog = {
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
  user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  ip_address: '192.168.1.1',
  stack_trace: 'Traceback (most recent call last):\n  File "app.py", line 10, in connect\n    raise DatabaseError("Connection failed")',
  request_data: { name: 'Test Tenant', email: 'test@example.com' },
  response_data: { error: 'Connection failed', code: 'DB_ERROR' },
  additional_context: { retry_count: 3, timeout: 30 },
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
};

const mockResolvedErrorLog: ErrorLog = {
  ...mockErrorLog,
  id: 'error-2',
  is_resolved: true,
  resolved_at: '2024-01-01T13:00:00Z',
  resolved_by: 'admin-1',
  resolution_notes: 'Fixed database connection pool configuration',
};

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

describe('ErrorDetailModal', () => {
  const defaultProps = {
    errorId: 'error-1',
    isOpen: true,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful hooks by default
    vi.mocked(errorLoggingHooks.useErrorLog).mockReturnValue({
      data: mockErrorLog,
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(errorLoggingHooks.useResolveError).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(mockResolvedErrorLog),
      isPending: false,
    } as any);

    vi.mocked(errorLoggingHooks.useDeleteError).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ message: 'Deleted successfully' }),
      isPending: false,
    } as any);
  });

  it('renders error details correctly', () => {
    render(<ErrorDetailModal {...defaultProps} />, { wrapper: createWrapper() });

    // Check basic error information
    expect(screen.getByText('جزئیات خطای API')).toBeInTheDocument();
    expect(screen.getByText('Database connection failed')).toBeInTheDocument();
    expect(screen.getByText('بحرانی')).toBeInTheDocument();
    expect(screen.getByText('پایگاه داده')).toBeInTheDocument();
    expect(screen.getByText('در انتظار حل')).toBeInTheDocument();

    // Check occurrence information
    expect(screen.getByText('5 بار')).toBeInTheDocument();
  });

  it('displays loading state correctly', () => {
    vi.mocked(errorLoggingHooks.useErrorLog).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    render(<ErrorDetailModal {...defaultProps} />, { wrapper: createWrapper() });

    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('displays error state correctly', () => {
    vi.mocked(errorLoggingHooks.useErrorLog).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch'),
    } as any);

    render(<ErrorDetailModal {...defaultProps} />, { wrapper: createWrapper() });

    expect(screen.getByText('خطا در دریافت جزئیات')).toBeInTheDocument();
    expect(screen.getByText('امکان دریافت جزئیات خطا وجود ندارد')).toBeInTheDocument();
  });

  it('displays request information in request tab', () => {
    render(<ErrorDetailModal {...defaultProps} />, { wrapper: createWrapper() });

    // Click on request tab
    fireEvent.click(screen.getByText('درخواست'));

    expect(screen.getByText('POST /api/tenants/create')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.getByText('req-1')).toBeInTheDocument();
    expect(screen.getByText('192.168.1.1')).toBeInTheDocument();
    expect(screen.getByText('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')).toBeInTheDocument();
  });

  it('displays context information in context tab', () => {
    render(<ErrorDetailModal {...defaultProps} />, { wrapper: createWrapper() });

    // Click on context tab
    fireEvent.click(screen.getByText('زمینه'));

    expect(screen.getByText('tenant-1')).toBeInTheDocument();
    expect(screen.getByText('user-1')).toBeInTheDocument();
    expect(screen.getByText('session-1')).toBeInTheDocument();
    expect(screen.getByText('DB_CONN_001')).toBeInTheDocument();
  });

  it('displays stack trace in stack tab', () => {
    render(<ErrorDetailModal {...defaultProps} />, { wrapper: createWrapper() });

    // Click on stack trace tab
    fireEvent.click(screen.getByText('Stack Trace'));

    expect(screen.getByText(/Traceback \(most recent call last\)/)).toBeInTheDocument();
    expect(screen.getByText(/raise DatabaseError/)).toBeInTheDocument();
  });

  it('handles error resolution correctly', async () => {
    const mockResolveError = vi.fn().mockResolvedValue(mockResolvedErrorLog);
    vi.mocked(errorLoggingHooks.useResolveError).mockReturnValue({
      mutateAsync: mockResolveError,
      isPending: false,
    } as any);

    render(<ErrorDetailModal {...defaultProps} />, { wrapper: createWrapper() });

    // Click on resolution tab
    fireEvent.click(screen.getByText('حل مسئله'));

    // Add resolution notes
    const notesTextarea = screen.getByPlaceholderText('توضیحات مربوط به نحوه حل این خطا...');
    fireEvent.change(notesTextarea, { target: { value: 'Fixed database configuration' } });

    // Click resolve button
    const resolveButton = screen.getByText('علامت‌گذاری به عنوان حل شده');
    fireEvent.click(resolveButton);

    await waitFor(() => {
      expect(mockResolveError).toHaveBeenCalledWith({
        errorId: 'error-1',
        resolutionData: { notes: 'Fixed database configuration' }
      });
    });
  });

  it('displays resolved error information correctly', () => {
    vi.mocked(errorLoggingHooks.useErrorLog).mockReturnValue({
      data: mockResolvedErrorLog,
      isLoading: false,
      error: null,
    } as any);

    render(<ErrorDetailModal {...defaultProps} />, { wrapper: createWrapper() });

    expect(screen.getByText('حل شده')).toBeInTheDocument();

    // Click on resolution tab
    fireEvent.click(screen.getByText('حل مسئله'));

    expect(screen.getByText('این خطا حل شده است')).toBeInTheDocument();
    expect(screen.getByText('Fixed database connection pool configuration')).toBeInTheDocument();
  });

  it('handles error deletion correctly', async () => {
    const mockDeleteError = vi.fn().mockResolvedValue({ message: 'Deleted successfully' });
    vi.mocked(errorLoggingHooks.useDeleteError).mockReturnValue({
      mutateAsync: mockDeleteError,
      isPending: false,
    } as any);

    render(<ErrorDetailModal {...defaultProps} />, { wrapper: createWrapper() });

    // Click delete button
    const deleteButton = screen.getByText('حذف خطا');
    fireEvent.click(deleteButton);

    // Confirm deletion
    const confirmButton = screen.getByText('تأیید حذف');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockDeleteError).toHaveBeenCalledWith('error-1');
    });
  });

  it('shows delete confirmation dialog', () => {
    render(<ErrorDetailModal {...defaultProps} />, { wrapper: createWrapper() });

    // Click delete button
    const deleteButton = screen.getByText('حذف خطا');
    fireEvent.click(deleteButton);

    expect(screen.getByText('تأیید حذف')).toBeInTheDocument();
    expect(screen.getByText('انصراف')).toBeInTheDocument();

    // Cancel deletion
    fireEvent.click(screen.getByText('انصراف'));
    expect(screen.queryByText('تأیید حذف')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<ErrorDetailModal {...defaultProps} onClose={onClose} />, { wrapper: createWrapper() });

    const closeButton = screen.getByText('بستن');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('displays JSON data correctly', () => {
    render(<ErrorDetailModal {...defaultProps} />, { wrapper: createWrapper() });

    // Click on request tab to see request/response data
    fireEvent.click(screen.getByText('درخواست'));

    // Check if JSON data is displayed
    expect(screen.getByText(/"name": "Test Tenant"/)).toBeInTheDocument();
    expect(screen.getByText(/"email": "test@example.com"/)).toBeInTheDocument();
  });

  it('handles missing optional fields gracefully', () => {
    const errorWithMissingFields: ErrorLog = {
      ...mockErrorLog,
      stack_trace: undefined,
      request_data: undefined,
      response_data: undefined,
      additional_context: undefined,
      user_agent: undefined,
      ip_address: undefined,
    };

    vi.mocked(errorLoggingHooks.useErrorLog).mockReturnValue({
      data: errorWithMissingFields,
      isLoading: false,
      error: null,
    } as any);

    render(<ErrorDetailModal {...defaultProps} />, { wrapper: createWrapper() });

    // Should still render without errors
    expect(screen.getByText('Database connection failed')).toBeInTheDocument();

    // Check stack trace tab shows no data message
    fireEvent.click(screen.getByText('Stack Trace'));
    expect(screen.getByText('Stack trace در دسترس نیست')).toBeInTheDocument();
  });

  it('formats timestamps correctly', () => {
    render(<ErrorDetailModal {...defaultProps} />, { wrapper: createWrapper() });

    // Check if Persian date format is used
    const timestamps = screen.getAllByText(/۱۴۰۲/); // Persian year
    expect(timestamps.length).toBeGreaterThan(0);
  });
});