/**
 * Data Export Interface Component Tests
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DataExportInterface from '@/components/backup/DataExportInterface';
import { backupService } from '@/services/backupService';

// Mock the backup service
vi.mock('@/services/backupService', () => ({
  backupService: {
    getAvailableDataTypes: vi.fn(),
    createExport: vi.fn(),
    getExportStatus: vi.fn(),
    downloadExport: vi.fn(),
    cancelExport: vi.fn(),
  },
}));

// Mock toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock URL.createObjectURL and related APIs
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'mock-url'),
    revokeObjectURL: vi.fn(),
  },
});

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const container = document.getElementById('root') || document.body;
  
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>,
    { container }
  );
};

describe('DataExportInterface', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup DOM
    document.body.innerHTML = '<div id="root"></div>';
  });

  it('should render loading state initially', () => {
    vi.mocked(backupService.getAvailableDataTypes).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderWithQueryClient(<DataExportInterface />);

    // Check for loading spinner
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('should display available data types', async () => {
    const mockDataTypes = ['customers', 'products', 'invoices', 'payments'];

    vi.mocked(backupService.getAvailableDataTypes).mockResolvedValue(mockDataTypes);

    renderWithQueryClient(<DataExportInterface />);

    // Wait for loading to complete and content to appear
    await waitFor(() => {
      expect(screen.getByText('فرمت خروجی')).toBeInTheDocument();
    });

    expect(screen.getByText('مشتریان')).toBeInTheDocument();
    expect(screen.getByText('محصولات')).toBeInTheDocument();
    expect(screen.getByText('فاکتورها')).toBeInTheDocument();
    expect(screen.getByText('پرداخت‌ها')).toBeInTheDocument();
  });

  it('should allow selecting export format', async () => {
    const mockDataTypes = ['customers', 'products'];

    vi.mocked(backupService.getAvailableDataTypes).mockResolvedValue(mockDataTypes);

    renderWithQueryClient(<DataExportInterface />);

    await waitFor(() => {
      expect(screen.getByText('انواع داده برای خروجی')).toBeInTheDocument();
    });

    // Check if format selector is present
    expect(screen.getByText('فرمت خروجی')).toBeInTheDocument();
  });

  it('should allow selecting data types', async () => {
    const mockDataTypes = ['customers', 'products', 'invoices'];

    vi.mocked(backupService.getAvailableDataTypes).mockResolvedValue(mockDataTypes);

    renderWithQueryClient(<DataExportInterface />);

    await waitFor(() => {
      expect(screen.getByText('تولید خروجی')).toBeInTheDocument();
    });

    // All checkboxes should be checked by default
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(4); // 3 data types + 1 date range checkbox

    // First 3 should be checked (data types)
    expect(checkboxes[0]).toHaveAttribute('aria-checked', 'true');
    expect(checkboxes[1]).toHaveAttribute('aria-checked', 'true');
    expect(checkboxes[2]).toHaveAttribute('aria-checked', 'true');
  });

  it('should create export when button is clicked', async () => {
    const mockDataTypes = ['customers', 'products'];
    const mockExport = {
      id: 'export-123',
      status: 'pending' as const,
      progress: 0,
      format: 'csv',
      data_types: ['customers', 'products'],
      created_at: '2024-01-01T10:00:00Z',
    };

    vi.mocked(backupService.getAvailableDataTypes).mockResolvedValue(mockDataTypes);
    vi.mocked(backupService.createExport).mockResolvedValue(mockExport);

    renderWithQueryClient(<DataExportInterface />);

    await waitFor(() => {
      expect(screen.getByText('تولید خروجی')).toBeInTheDocument();
    });

    const createButton = screen.getByText('تولید خروجی');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(backupService.createExport).toHaveBeenCalledWith({
        format: 'csv',
        data_types: ['customers', 'products'],
      });
    });
  });

  it('should display export progress', async () => {
    const mockDataTypes = ['customers'];
    const mockExport = {
      id: 'export-123',
      status: 'processing' as const,
      progress: 75,
      format: 'csv',
      data_types: ['customers'],
      created_at: '2024-01-01T10:00:00Z',
    };

    vi.mocked(backupService.getAvailableDataTypes).mockResolvedValue(mockDataTypes);
    vi.mocked(backupService.createExport).mockResolvedValue(mockExport);
    vi.mocked(backupService.getExportStatus).mockResolvedValue(mockExport);

    renderWithQueryClient(<DataExportInterface />);

    await waitFor(() => {
      expect(screen.getByText('تولید خروجی')).toBeInTheDocument();
    });

    const createButton = screen.getByText('تولید خروجی');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('وضعیت تولید خروجی')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
      expect(screen.getByText('فرمت: CSV')).toBeInTheDocument();
    });
  });

  it('should display download button when export is completed', async () => {
    const mockDataTypes = ['customers'];
    const mockExport = {
      id: 'export-123',
      status: 'completed' as const,
      progress: 100,
      format: 'csv',
      data_types: ['customers'],
      created_at: '2024-01-01T10:00:00Z',
      completed_at: '2024-01-01T10:05:00Z',
      file_size: 512000,
      download_url: 'https://example.com/export.csv',
    };

    vi.mocked(backupService.getAvailableDataTypes).mockResolvedValue(mockDataTypes);
    vi.mocked(backupService.createExport).mockResolvedValue(mockExport);
    vi.mocked(backupService.getExportStatus).mockResolvedValue(mockExport);

    renderWithQueryClient(<DataExportInterface />);

    await waitFor(() => {
      expect(screen.getByText('تولید خروجی')).toBeInTheDocument();
    });

    const createButton = screen.getByText('تولید خروجی');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('دانلود')).toBeInTheDocument();
      expect(screen.getByText('500 KB')).toBeInTheDocument();
    });
  });

  it('should handle download export', async () => {
    const mockDataTypes = ['customers'];
    const mockExport = {
      id: 'export-123',
      status: 'completed' as const,
      progress: 100,
      format: 'csv',
      data_types: ['customers'],
      created_at: '2024-01-01T10:00:00Z',
      completed_at: '2024-01-01T10:05:00Z',
      file_size: 512000,
      download_url: 'https://example.com/export.csv',
    };

    const mockBlob = new Blob(['export data'], { type: 'text/csv' });

    vi.mocked(backupService.getAvailableDataTypes).mockResolvedValue(mockDataTypes);
    vi.mocked(backupService.createExport).mockResolvedValue(mockExport);
    vi.mocked(backupService.getExportStatus).mockResolvedValue(mockExport);
    vi.mocked(backupService.downloadExport).mockResolvedValue(mockBlob);

    // Mock document.createElement and related DOM methods
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
    };
    vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);

    renderWithQueryClient(<DataExportInterface />);

    await waitFor(() => {
      expect(screen.getByText('تولید خروجی')).toBeInTheDocument();
    });

    const createButton = screen.getByText('تولید خروجی');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('دانلود')).toBeInTheDocument();
    });

    const downloadButton = screen.getByText('دانلود');
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(backupService.downloadExport).toHaveBeenCalledWith('export-123');
      expect(mockLink.click).toHaveBeenCalled();
    });
  });

  it('should enable date range selection', async () => {
    const mockDataTypes = ['customers'];

    vi.mocked(backupService.getAvailableDataTypes).mockResolvedValue(mockDataTypes);

    renderWithQueryClient(<DataExportInterface />);

    await waitFor(() => {
      expect(screen.getByText('محدود کردن به بازه زمانی')).toBeInTheDocument();
    });

    const dateRangeCheckbox = screen.getByLabelText('محدود کردن به بازه زمانی');
    fireEvent.click(dateRangeCheckbox);

    await waitFor(() => {
      expect(screen.getByText('از تاریخ')).toBeInTheDocument();
      expect(screen.getByText('تا تاریخ')).toBeInTheDocument();
    });
  });

  it('should prevent export creation with no data types selected', async () => {
    const mockDataTypes = ['customers'];

    vi.mocked(backupService.getAvailableDataTypes).mockResolvedValue(mockDataTypes);

    renderWithQueryClient(<DataExportInterface />);

    await waitFor(() => {
      expect(screen.getByText('مشتریان')).toBeInTheDocument();
    });

    // Uncheck all data types
    const customerCheckbox = screen.getByLabelText('مشتریان');
    fireEvent.click(customerCheckbox);

    const createButton = screen.getByText('تولید خروجی');
    expect(createButton).toBeDisabled();
  });

  it('should allow canceling export', async () => {
    const mockDataTypes = ['customers'];
    const mockExport = {
      id: 'export-123',
      status: 'processing' as const,
      progress: 25,
      format: 'csv',
      data_types: ['customers'],
      created_at: '2024-01-01T10:00:00Z',
    };

    vi.mocked(backupService.getAvailableDataTypes).mockResolvedValue(mockDataTypes);
    vi.mocked(backupService.createExport).mockResolvedValue(mockExport);
    vi.mocked(backupService.getExportStatus).mockResolvedValue(mockExport);
    vi.mocked(backupService.cancelExport).mockResolvedValue();

    renderWithQueryClient(<DataExportInterface />);

    await waitFor(() => {
      expect(screen.getByText('تولید خروجی')).toBeInTheDocument();
    });

    const createButton = screen.getByText('تولید خروجی');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel/i }) || screen.getByText('×')).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole('button', { name: /cancel/i }) || screen.getByText('×');
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(backupService.cancelExport).toHaveBeenCalledWith('export-123');
    });
  });

  it('should display error message when export fails', async () => {
    const mockDataTypes = ['customers'];
    const mockExport = {
      id: 'export-123',
      status: 'failed' as const,
      progress: 0,
      format: 'csv',
      data_types: ['customers'],
      created_at: '2024-01-01T10:00:00Z',
      error_message: 'Export failed due to data corruption',
    };

    vi.mocked(backupService.getAvailableDataTypes).mockResolvedValue(mockDataTypes);
    vi.mocked(backupService.createExport).mockResolvedValue(mockExport);
    vi.mocked(backupService.getExportStatus).mockResolvedValue(mockExport);

    renderWithQueryClient(<DataExportInterface />);

    await waitFor(() => {
      expect(screen.getByText('تولید خروجی')).toBeInTheDocument();
    });

    const createButton = screen.getByText('تولید خروجی');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Export failed due to data corruption')).toBeInTheDocument();
    });
  });
});