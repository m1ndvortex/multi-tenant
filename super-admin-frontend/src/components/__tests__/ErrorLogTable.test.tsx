import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { ErrorLogTable } from '@/components/ErrorLogTable';
import { ErrorLog, ErrorSeverity, ErrorCategory } from '@/services/errorLoggingService';

// Mock data
const mockErrorLogs: ErrorLog[] = [
  {
    id: '1',
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
  {
    id: '2',
    tenant_id: 'tenant-2',
    user_id: 'user-2',
    session_id: 'session-2',
    error_message: 'Validation failed for email field',
    error_type: 'ValidationError',
    error_code: 'VAL_001',
    endpoint: '/api/users/register',
    method: 'POST',
    status_code: 422,
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.VALIDATION,
    request_id: 'req-2',
    user_agent: 'Mozilla/5.0',
    ip_address: '192.168.1.2',
    stack_trace: undefined,
    request_data: { email: 'invalid-email' },
    response_data: { errors: ['Invalid email format'] },
    additional_context: undefined,
    is_resolved: true,
    resolved_at: '2024-01-01T13:00:00Z',
    resolved_by: 'admin-1',
    resolution_notes: 'Fixed validation rules',
    notification_sent: true,
    notification_sent_at: '2024-01-01T10:05:00Z',
    occurrence_count: 1,
    first_occurrence: '2024-01-01T10:00:00Z',
    last_occurrence: '2024-01-01T10:00:00Z',
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T13:00:00Z',
  },
];

describe('ErrorLogTable', () => {
  const defaultProps = {
    errorLogs: mockErrorLogs,
    isLoading: false,
    onErrorClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders error logs correctly', () => {
    render(<ErrorLogTable {...defaultProps} />);

    // Check if error messages are displayed
    expect(screen.getByText('Database connection failed')).toBeInTheDocument();
    expect(screen.getByText('Validation failed for email field')).toBeInTheDocument();

    // Check if severity badges are displayed
    expect(screen.getByText('بحرانی')).toBeInTheDocument();
    expect(screen.getByText('متوسط')).toBeInTheDocument();

    // Check if category badges are displayed
    expect(screen.getByText('پایگاه داده')).toBeInTheDocument();
    expect(screen.getByText('اعتبارسنجی')).toBeInTheDocument();

    // Check if method badges are displayed
    expect(screen.getAllByText('POST')).toHaveLength(2);

    // Check if status codes are displayed
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.getByText('422')).toBeInTheDocument();
  });

  it('displays loading state correctly', () => {
    render(<ErrorLogTable {...defaultProps} isLoading={true} />);

    // Check for loading skeleton
    expect(document.querySelectorAll('.animate-pulse')).toHaveLength(10);
  });

  it('displays empty state when no errors', () => {
    render(<ErrorLogTable {...defaultProps} errorLogs={[]} />);

    expect(screen.getByText('خطایی یافت نشد')).toBeInTheDocument();
    expect(screen.getByText('هیچ خطای API با فیلترهای انتخابی یافت نشد')).toBeInTheDocument();
  });

  it('calls onErrorClick when error row is clicked', () => {
    const onErrorClick = vi.fn();
    render(<ErrorLogTable {...defaultProps} onErrorClick={onErrorClick} />);

    const firstRow = screen.getByText('Database connection failed').closest('tr');
    fireEvent.click(firstRow!);

    expect(onErrorClick).toHaveBeenCalledWith('1');
  });

  it('calls onErrorClick when details button is clicked', () => {
    const onErrorClick = vi.fn();
    render(<ErrorLogTable {...defaultProps} onErrorClick={onErrorClick} />);

    const detailsButtons = screen.getAllByText('جزئیات');
    fireEvent.click(detailsButtons[0]);

    expect(onErrorClick).toHaveBeenCalledWith('1');
  });

  it('handles error selection correctly', () => {
    const onErrorSelect = vi.fn();
    const onSelectAll = vi.fn();
    
    render(
      <ErrorLogTable 
        {...defaultProps} 
        selectedErrorIds={[]}
        onErrorSelect={onErrorSelect}
        onSelectAll={onSelectAll}
      />
    );

    // Check if checkboxes are rendered
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(3); // 1 select all + 2 individual

    // Click individual checkbox
    fireEvent.click(checkboxes[1]);
    expect(onErrorSelect).toHaveBeenCalledWith('1', true);

    // Click select all checkbox
    fireEvent.click(checkboxes[0]);
    expect(onSelectAll).toHaveBeenCalledWith(true);
  });

  it('displays pagination correctly', () => {
    const onPageChange = vi.fn();
    
    render(
      <ErrorLogTable 
        {...defaultProps} 
        total={100}
        currentPage={0}
        pageSize={2} // Use smaller page size to ensure pagination shows
        onPageChange={onPageChange}
      />
    );

    expect(screen.getByText('نمایش 1 تا 2 از 100 خطا')).toBeInTheDocument();
    expect(screen.getByText('صفحه 1 از 50')).toBeInTheDocument(); // 100/2 = 50 pages

    // Test pagination buttons
    const nextButton = screen.getByText('بعدی');
    const prevButton = screen.getByText('قبلی');

    expect(prevButton).toBeDisabled();
    expect(nextButton).not.toBeDisabled();

    fireEvent.click(nextButton);
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('displays resolved status correctly', () => {
    render(<ErrorLogTable {...defaultProps} />);

    expect(screen.getByText('در انتظار')).toBeInTheDocument();
    expect(screen.getByText('حل شده')).toBeInTheDocument();
  });

  it('displays occurrence count for repeated errors', () => {
    render(<ErrorLogTable {...defaultProps} />);

    expect(screen.getByText('5x')).toBeInTheDocument();
  });

  it('applies correct styling for critical errors', () => {
    render(<ErrorLogTable {...defaultProps} />);

    const criticalErrorRow = screen.getByText('Database connection failed').closest('tr');
    expect(criticalErrorRow).toHaveClass('bg-red-50/50');
  });

  it('applies correct styling for resolved errors', () => {
    render(<ErrorLogTable {...defaultProps} />);

    const resolvedErrorRow = screen.getByText('Validation failed for email field').closest('tr');
    expect(resolvedErrorRow).toHaveClass('opacity-60');
  });

  it('renders in compact mode correctly', () => {
    render(<ErrorLogTable {...defaultProps} compact={true} />);

    // In compact mode, checkboxes and occurrence count should not be visible
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByText('تعداد تکرار')).not.toBeInTheDocument();
  });

  it('formats timestamps correctly', () => {
    render(<ErrorLogTable {...defaultProps} />);

    // Check if Persian date format is used
    const timestamps = screen.getAllByText(/۱۴۰۲/); // Persian year
    expect(timestamps.length).toBeGreaterThan(0);
  });

  it('displays endpoint paths correctly', () => {
    render(<ErrorLogTable {...defaultProps} />);

    expect(screen.getByText('/api/tenants/create')).toBeInTheDocument();
    expect(screen.getByText('/api/users/register')).toBeInTheDocument();
  });

  it('handles missing optional data gracefully', () => {
    const errorWithMissingData: ErrorLog = {
      ...mockErrorLogs[0],
      tenant_id: undefined,
      user_id: undefined,
      stack_trace: undefined,
      additional_context: undefined,
    };

    render(<ErrorLogTable {...defaultProps} errorLogs={[errorWithMissingData]} />);

    // Should still render without errors
    expect(screen.getByText('Database connection failed')).toBeInTheDocument();
  });
});