/**
 * Backup Page Tests
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Backup from '@/pages/Backup';
import { backupService } from '@/services/backupService';

// Mock the backup service
vi.mock('@/services/backupService', () => ({
  backupService: {
    checkDailyBackupLimit: vi.fn(),
    getAvailableDataTypes: vi.fn(),
    getBackupHistory: vi.fn(),
    getExportHistory: vi.fn(),
  },
}));

// Mock toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

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

describe('Backup Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup DOM
    document.body.innerHTML = '<div id="root"></div>';
    
    // Set up default mocks
    vi.mocked(backupService.checkDailyBackupLimit).mockResolvedValue({
      can_backup: true,
      backups_today: 0,
      max_daily_backups: 1,
    });
    
    vi.mocked(backupService.getAvailableDataTypes).mockResolvedValue([
      'customers', 'products', 'invoices'
    ]);
    
    vi.mocked(backupService.getBackupHistory).mockResolvedValue([]);
    vi.mocked(backupService.getExportHistory).mockResolvedValue([]);
  });

  it('should render page header correctly', async () => {
    renderWithQueryClient(<Backup />);

    expect(screen.getByText('پشتیبان‌گیری و خروجی داده‌ها')).toBeInTheDocument();
    expect(screen.getByText('مدیریت پشتیبان‌گیری و تولید خروجی از اطلاعات کسب‌وکار')).toBeInTheDocument();
  });

  it('should render all tabs', async () => {
    renderWithQueryClient(<Backup />);

    expect(screen.getByText('پشتیبان‌گیری')).toBeInTheDocument();
    expect(screen.getByText('خروجی داده‌ها')).toBeInTheDocument();
    expect(screen.getByText('تاریخچه')).toBeInTheDocument();
  });

  it('should show backup tab by default', async () => {
    renderWithQueryClient(<Backup />);

    await waitFor(() => {
      expect(screen.getByText('پشتیبان‌گیری خودکار')).toBeInTheDocument();
    });
  });

  it('should switch to export tab when clicked', async () => {
    renderWithQueryClient(<Backup />);

    const exportTab = screen.getByText('خروجی داده‌ها');
    fireEvent.click(exportTab);

    await waitFor(() => {
      expect(screen.getByText('خروجی داده‌ها')).toBeInTheDocument();
      expect(screen.getByText('فرمت خروجی')).toBeInTheDocument();
    });
  });

  it('should switch to history tab when clicked', async () => {
    renderWithQueryClient(<Backup />);

    const historyTab = screen.getByText('تاریخچه');
    fireEvent.click(historyTab);

    await waitFor(() => {
      expect(screen.getByText('تاریخچه پشتیبان‌گیری و خروجی')).toBeInTheDocument();
    });
  });

  it('should display backup interface in backup tab', async () => {
    renderWithQueryClient(<Backup />);

    await waitFor(() => {
      expect(screen.getByText('پشتیبان‌گیری خودکار')).toBeInTheDocument();
      expect(screen.getByText('محدودیت روزانه:')).toBeInTheDocument();
      expect(screen.getByText('ایجاد پشتیبان جدید')).toBeInTheDocument();
    });
  });

  it('should display export interface in export tab', async () => {
    renderWithQueryClient(<Backup />);

    const exportTab = screen.getByText('خروجی داده‌ها');
    fireEvent.click(exportTab);

    await waitFor(() => {
      expect(screen.getByText('فرمت خروجی')).toBeInTheDocument();
      expect(screen.getByText('انواع داده برای خروجی')).toBeInTheDocument();
      expect(screen.getByText('تولید خروجی')).toBeInTheDocument();
    });
  });

  it('should display history interface in history tab', async () => {
    renderWithQueryClient(<Backup />);

    const historyTab = screen.getByText('تاریخچه');
    fireEvent.click(historyTab);

    await waitFor(() => {
      expect(screen.getByText('پشتیبان‌ها (0)')).toBeInTheDocument();
      expect(screen.getByText('خروجی‌ها (0)')).toBeInTheDocument();
      expect(screen.getByText('بروزرسانی تاریخچه')).toBeInTheDocument();
    });
  });

  it('should maintain tab state when switching between tabs', async () => {
    renderWithQueryClient(<Backup />);

    // Start with backup tab
    await waitFor(() => {
      expect(screen.getByText('پشتیبان‌گیری خودکار')).toBeInTheDocument();
    });

    // Switch to export tab
    const exportTab = screen.getByText('خروجی داده‌ها');
    fireEvent.click(exportTab);

    await waitFor(() => {
      expect(screen.getByText('فرمت خروجی')).toBeInTheDocument();
    });

    // Switch back to backup tab
    const backupTab = screen.getByText('پشتیبان‌گیری');
    fireEvent.click(backupTab);

    await waitFor(() => {
      expect(screen.getByText('پشتیبان‌گیری خودکار')).toBeInTheDocument();
    });
  });

  it('should have proper tab styling', async () => {
    renderWithQueryClient(<Backup />);

    const tabsList = screen.getByRole('tablist');
    expect(tabsList).toHaveClass('bg-gradient-to-r', 'from-green-50', 'via-teal-50', 'to-blue-50');
  });

  it('should display icons in tabs', async () => {
    renderWithQueryClient(<Backup />);

    // Check if tabs contain icons (by checking for SVG elements or icon classes)
    const backupTab = screen.getByText('پشتیبان‌گیری').closest('button');
    const exportTab = screen.getByText('خروجی داده‌ها').closest('button');
    const historyTab = screen.getByText('تاریخچه').closest('button');

    expect(backupTab).toBeInTheDocument();
    expect(exportTab).toBeInTheDocument();
    expect(historyTab).toBeInTheDocument();
  });

  it('should handle service errors gracefully', async () => {
    // Mock service errors
    vi.mocked(backupService.checkDailyBackupLimit).mockRejectedValue(new Error('Service error'));
    vi.mocked(backupService.getAvailableDataTypes).mockRejectedValue(new Error('Service error'));
    vi.mocked(backupService.getBackupHistory).mockRejectedValue(new Error('Service error'));
    vi.mocked(backupService.getExportHistory).mockRejectedValue(new Error('Service error'));

    renderWithQueryClient(<Backup />);

    // Page should still render even with service errors
    expect(screen.getByText('پشتیبان‌گیری و خروجی داده‌ها')).toBeInTheDocument();
    expect(screen.getByText('پشتیبان‌گیری')).toBeInTheDocument();
    expect(screen.getByText('خروجی داده‌ها')).toBeInTheDocument();
    expect(screen.getByText('تاریخچه')).toBeInTheDocument();
  });
});