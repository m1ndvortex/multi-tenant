import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ReportSchedulingInterface from '@/components/business-intelligence/ReportSchedulingInterface';
import { businessIntelligenceService } from '@/services/businessIntelligenceService';

// Mock the business intelligence service
vi.mock('@/services/businessIntelligenceService', () => ({
  businessIntelligenceService: {
    getScheduledReports: vi.fn(),
    createScheduledReport: vi.fn(),
    updateScheduledReport: vi.fn(),
    deleteScheduledReport: vi.fn(),
    toggleScheduledReport: vi.fn(),
    runScheduledReportNow: vi.fn(),
  },
}));

// Mock the toast hook
vi.mock('@/components/ui/use-toast', () => ({
  toast: vi.fn(),
}));

const mockScheduledReports = [
  {
    id: '1',
    name: 'گزارش فروش هفتگی',
    report_type: 'sales-trend' as const,
    schedule_type: 'weekly' as const,
    schedule_time: '09:00',
    schedule_day: 1,
    export_format: 'pdf' as const,
    email_recipients: ['manager@example.com', 'owner@example.com'],
    is_active: true,
    last_run_at: '2024-01-14T09:00:00Z',
    next_run_at: '2024-01-21T09:00:00Z',
    created_at: '2024-01-01T10:00:00Z',
    parameters: {},
  },
  {
    id: '2',
    name: 'گزارش مشتریان ماهانه',
    report_type: 'customer-analytics' as const,
    schedule_type: 'monthly' as const,
    schedule_time: '08:30',
    schedule_day: 1,
    export_format: 'excel' as const,
    email_recipients: ['sales@example.com'],
    is_active: false,
    next_run_at: '2024-02-01T08:30:00Z',
    created_at: '2024-01-01T10:00:00Z',
    parameters: {},
  },
];

const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
};

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('ReportSchedulingInterface', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state correctly', () => {
    vi.mocked(businessIntelligenceService.getScheduledReports).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderWithQueryClient(<ReportSchedulingInterface />);

    expect(screen.getByText('زمان‌بندی و خودکارسازی گزارشات')).toBeInTheDocument();
    expect(screen.getAllByRole('status')).toHaveLength(3); // Loading skeletons
  });

  it('renders error state correctly', async () => {
    vi.mocked(businessIntelligenceService.getScheduledReports).mockRejectedValue(
      new Error('Network error')
    );

    renderWithQueryClient(<ReportSchedulingInterface />);

    await waitFor(() => {
      expect(screen.getByText('خطا در بارگذاری گزارشات زمان‌بندی شده')).toBeInTheDocument();
    });

    expect(screen.getByText('تلاش مجدد')).toBeInTheDocument();
  });

  it('renders empty state when no scheduled reports available', async () => {
    vi.mocked(businessIntelligenceService.getScheduledReports).mockResolvedValue([]);

    renderWithQueryClient(<ReportSchedulingInterface />);

    await waitFor(() => {
      expect(screen.getByText('هنوز گزارش زمان‌بندی شده‌ای ایجاد نشده است')).toBeInTheDocument();
    });

    expect(screen.getByText('با ایجاد گزارشات زمان‌بندی شده، به صورت خودکار گزارشات را دریافت کنید')).toBeInTheDocument();
  });

  it('renders scheduled reports correctly', async () => {
    vi.mocked(businessIntelligenceService.getScheduledReports).mockResolvedValue(mockScheduledReports);

    renderWithQueryClient(<ReportSchedulingInterface />);

    await waitFor(() => {
      expect(screen.getByText('گزارش فروش هفتگی')).toBeInTheDocument();
    });

    // Check all reports are rendered
    expect(screen.getByText('گزارش فروش هفتگی')).toBeInTheDocument();
    expect(screen.getByText('گزارش مشتریان ماهانه')).toBeInTheDocument();

    // Check report type badges
    expect(screen.getByText('روند فروش')).toBeInTheDocument();
    expect(screen.getByText('تحلیل مشتریان')).toBeInTheDocument();

    // Check schedule type badges
    expect(screen.getByText('هفتگی')).toBeInTheDocument();
    expect(screen.getByText('ماهانه')).toBeInTheDocument();

    // Check format badges
    expect(screen.getByText('PDF')).toBeInTheDocument();
    expect(screen.getByText('Excel')).toBeInTheDocument();

    // Check status badges
    expect(screen.getByText('فعال')).toBeInTheDocument();
    expect(screen.getByText('غیرفعال')).toBeInTheDocument();
  });

  it('displays schedule information correctly', async () => {
    vi.mocked(businessIntelligenceService.getScheduledReports).mockResolvedValue(mockScheduledReports);

    renderWithQueryClient(<ReportSchedulingInterface />);

    await waitFor(() => {
      expect(screen.getByText('گزارش فروش هفتگی')).toBeInTheDocument();
    });

    // Check schedule times
    expect(screen.getByText('زمان اجرا: 09:00')).toBeInTheDocument();
    expect(screen.getByText('زمان اجرا: 08:30')).toBeInTheDocument();

    // Check recipient counts
    expect(screen.getByText('2 گیرنده')).toBeInTheDocument();
    expect(screen.getByText('1 گیرنده')).toBeInTheDocument();
  });

  it('shows create form when "گزارش جدید" button is clicked', async () => {
    vi.mocked(businessIntelligenceService.getScheduledReports).mockResolvedValue([]);

    renderWithQueryClient(<ReportSchedulingInterface />);

    await waitFor(() => {
      expect(screen.getByText('هنوز گزارش زمان‌بندی شده‌ای ایجاد نشده است')).toBeInTheDocument();
    });

    const createButton = screen.getByText('گزارش جدید');
    fireEvent.click(createButton);

    expect(screen.getByText('ایجاد گزارش زمان‌بندی شده جدید')).toBeInTheDocument();
    expect(screen.getByLabelText('نام گزارش')).toBeInTheDocument();
    expect(screen.getByLabelText('نوع گزارش')).toBeInTheDocument();
    expect(screen.getByLabelText('دوره زمان‌بندی')).toBeInTheDocument();
  });

  it('handles form submission for creating new report', async () => {
    vi.mocked(businessIntelligenceService.getScheduledReports).mockResolvedValue([]);
    vi.mocked(businessIntelligenceService.createScheduledReport).mockResolvedValue({
      ...mockScheduledReports[0],
      id: 'new-report',
    });

    renderWithQueryClient(<ReportSchedulingInterface />);

    await waitFor(() => {
      expect(screen.getByText('گزارش جدید')).toBeInTheDocument();
    });

    // Open create form
    const createButton = screen.getByText('گزارش جدید');
    fireEvent.click(createButton);

    // Fill form
    const nameInput = screen.getByLabelText('نام گزارش');
    fireEvent.change(nameInput, { target: { value: 'گزارش تست' } });

    const emailInput = screen.getByPlaceholderText('آدرس ایمیل');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    // Submit form
    const submitButton = screen.getByText('ایجاد گزارش');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(businessIntelligenceService.createScheduledReport).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'گزارش تست',
          email_recipients: ['test@example.com'],
        })
      );
    });
  });

  it('handles editing existing report', async () => {
    vi.mocked(businessIntelligenceService.getScheduledReports).mockResolvedValue(mockScheduledReports);
    vi.mocked(businessIntelligenceService.updateScheduledReport).mockResolvedValue(mockScheduledReports[0]);

    renderWithQueryClient(<ReportSchedulingInterface />);

    await waitFor(() => {
      expect(screen.getByText('گزارش فروش هفتگی')).toBeInTheDocument();
    });

    // Click edit button
    const editButtons = screen.getAllByTitle('ویرایش');
    fireEvent.click(editButtons[0]);

    expect(screen.getByText('ویرایش گزارش زمان‌بندی شده')).toBeInTheDocument();
    expect(screen.getByDisplayValue('گزارش فروش هفتگی')).toBeInTheDocument();
  });

  it('handles deleting report', async () => {
    vi.mocked(businessIntelligenceService.getScheduledReports).mockResolvedValue(mockScheduledReports);
    vi.mocked(businessIntelligenceService.deleteScheduledReport).mockResolvedValue();

    renderWithQueryClient(<ReportSchedulingInterface />);

    await waitFor(() => {
      expect(screen.getByText('گزارش فروش هفتگی')).toBeInTheDocument();
    });

    // Click delete button
    const deleteButtons = screen.getAllByTitle('حذف');
    fireEvent.click(deleteButtons[0]);

    expect(businessIntelligenceService.deleteScheduledReport).toHaveBeenCalledWith('1');
  });

  it('handles toggling report active status', async () => {
    vi.mocked(businessIntelligenceService.getScheduledReports).mockResolvedValue(mockScheduledReports);
    vi.mocked(businessIntelligenceService.toggleScheduledReport).mockResolvedValue(mockScheduledReports[0]);

    renderWithQueryClient(<ReportSchedulingInterface />);

    await waitFor(() => {
      expect(screen.getByText('گزارش فروش هفتگی')).toBeInTheDocument();
    });

    // Click toggle button for inactive report
    const toggleButtons = screen.getAllByTitle('فعال کردن');
    fireEvent.click(toggleButtons[0]);

    expect(businessIntelligenceService.toggleScheduledReport).toHaveBeenCalledWith('2', true);
  });

  it('handles running report immediately', async () => {
    vi.mocked(businessIntelligenceService.getScheduledReports).mockResolvedValue(mockScheduledReports);
    vi.mocked(businessIntelligenceService.runScheduledReportNow).mockResolvedValue({
      message: 'Report started',
      job_id: 'job-123',
    });

    renderWithQueryClient(<ReportSchedulingInterface />);

    await waitFor(() => {
      expect(screen.getByText('گزارش فروش هفتگی')).toBeInTheDocument();
    });

    // Click run now button
    const runButtons = screen.getAllByTitle('اجرای فوری');
    fireEvent.click(runButtons[0]);

    expect(businessIntelligenceService.runScheduledReportNow).toHaveBeenCalledWith('1');
  });

  it('handles adding and removing email recipients', async () => {
    vi.mocked(businessIntelligenceService.getScheduledReports).mockResolvedValue([]);

    renderWithQueryClient(<ReportSchedulingInterface />);

    await waitFor(() => {
      expect(screen.getByText('گزارش جدید')).toBeInTheDocument();
    });

    // Open create form
    const createButton = screen.getByText('گزارش جدید');
    fireEvent.click(createButton);

    // Add email recipient
    const addEmailButton = screen.getByText('افزودن ایمیل');
    fireEvent.click(addEmailButton);

    const emailInputs = screen.getAllByPlaceholderText('آدرس ایمیل');
    expect(emailInputs).toHaveLength(2);

    // Fill second email
    fireEvent.change(emailInputs[1], { target: { value: 'second@example.com' } });

    // Remove first email
    const removeButtons = screen.getAllByRole('button').filter(btn => 
      btn.querySelector('svg') // Trash icon
    );
    if (removeButtons.length > 0) {
      fireEvent.click(removeButtons[0]);
    }

    // Should have one email input left
    await waitFor(() => {
      const remainingInputs = screen.getAllByPlaceholderText('آدرس ایمیل');
      expect(remainingInputs).toHaveLength(1);
    });
  });

  it('shows schedule day input for weekly and monthly schedules', async () => {
    vi.mocked(businessIntelligenceService.getScheduledReports).mockResolvedValue([]);

    renderWithQueryClient(<ReportSchedulingInterface />);

    await waitFor(() => {
      expect(screen.getByText('گزارش جدید')).toBeInTheDocument();
    });

    // Open create form
    const createButton = screen.getByText('گزارش جدید');
    fireEvent.click(createButton);

    // Select weekly schedule
    const scheduleTypeSelect = screen.getByLabelText('دوره زمان‌بندی');
    fireEvent.change(scheduleTypeSelect, { target: { value: 'weekly' } });

    expect(screen.getByLabelText('روز هفته')).toBeInTheDocument();

    // Select monthly schedule
    fireEvent.change(scheduleTypeSelect, { target: { value: 'monthly' } });

    expect(screen.getByLabelText('روز ماه')).toBeInTheDocument();

    // Select daily schedule (should hide day input)
    fireEvent.change(scheduleTypeSelect, { target: { value: 'daily' } });

    expect(screen.queryByLabelText('روز هفته')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('روز ماه')).not.toBeInTheDocument();
  });

  it('handles form cancellation', async () => {
    vi.mocked(businessIntelligenceService.getScheduledReports).mockResolvedValue([]);

    renderWithQueryClient(<ReportSchedulingInterface />);

    await waitFor(() => {
      expect(screen.getByText('گزارش جدید')).toBeInTheDocument();
    });

    // Open create form
    const createButton = screen.getByText('گزارش جدید');
    fireEvent.click(createButton);

    expect(screen.getByText('ایجاد گزارش زمان‌بندی شده جدید')).toBeInTheDocument();

    // Cancel form
    const cancelButton = screen.getByText('انصراف');
    fireEvent.click(cancelButton);

    expect(screen.queryByText('ایجاد گزارش زمان‌بندی شده جدید')).not.toBeInTheDocument();
  });

  it('displays last run information when available', async () => {
    vi.mocked(businessIntelligenceService.getScheduledReports).mockResolvedValue(mockScheduledReports);

    renderWithQueryClient(<ReportSchedulingInterface />);

    await waitFor(() => {
      expect(screen.getByText('گزارش فروش هفتگی')).toBeInTheDocument();
    });

    // Check last run information is displayed
    expect(screen.getByText(/آخرین اجرا:/)).toBeInTheDocument();
  });

  it('applies custom className correctly', () => {
    vi.mocked(businessIntelligenceService.getScheduledReports).mockResolvedValue([]);

    const { container } = renderWithQueryClient(
      <ReportSchedulingInterface className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('validates required form fields', async () => {
    vi.mocked(businessIntelligenceService.getScheduledReports).mockResolvedValue([]);

    renderWithQueryClient(<ReportSchedulingInterface />);

    await waitFor(() => {
      expect(screen.getByText('گزارش جدید')).toBeInTheDocument();
    });

    // Open create form
    const createButton = screen.getByText('گزارش جدید');
    fireEvent.click(createButton);

    // Try to submit without filling required fields
    const submitButton = screen.getByText('ایجاد گزارش');
    fireEvent.click(submitButton);

    // Form should not submit (name is required)
    const nameInput = screen.getByLabelText('نام گزارش');
    expect(nameInput).toBeRequired();
  });
});