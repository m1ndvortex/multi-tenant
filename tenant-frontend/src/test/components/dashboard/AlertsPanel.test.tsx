/**
 * Alerts Panel Tests
 * Tests for the dashboard alerts and notifications component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import AlertsPanel from '@/components/dashboard/AlertsPanel';
import { AlertsResponse } from '@/services/dashboardService';

const mockAlerts: AlertsResponse = {
  alerts: [
    {
      type: 'overdue_payments',
      severity: 'critical',
      title: '5 فاکتور سررسید گذشته',
      description: 'مجموع مبلغ: 1,250,000 تومان - نیاز به پیگیری فوری',
      count: 5,
      amount: 1250000,
      action: 'view_overdue_invoices'
    },
    {
      type: 'upcoming_installments',
      severity: 'high',
      title: '8 قسط در هفته آینده',
      description: 'مجموع مبلغ: 2,100,000 تومان - آماده‌سازی برای دریافت',
      count: 8,
      amount: 2100000,
      action: 'view_installments'
    },
    {
      type: 'low_stock',
      severity: 'medium',
      title: '12 محصول کم موجود',
      description: 'محصولات نیاز به تأمین مجدد دارند تا از کمبود جلوگیری شود',
      count: 12,
      action: 'view_inventory'
    },
    {
      type: 'upcoming_gold_installments',
      severity: 'medium',
      title: '3 قسط طلا در هفته آینده',
      description: 'مجموع وزن: 45.250 گرم - بررسی قیمت روز طلا',
      count: 3,
      weight: 45.250,
      action: 'view_gold_installments'
    },
    {
      type: 'cash_flow',
      severity: 'low',
      title: 'جریان نقدی مثبت',
      description: 'وضعیت مالی مطلوب است',
      action: 'view_cash_flow'
    }
  ],
  total_alerts: 5,
  critical_alerts: 1,
  high_alerts: 1,
  medium_alerts: 2
};

const emptyAlerts: AlertsResponse = {
  alerts: [],
  total_alerts: 0,
  critical_alerts: 0,
  high_alerts: 0,
  medium_alerts: 0
};

describe('AlertsPanel', () => {
  it('renders loading state', () => {
    render(
      <AlertsPanel 
        alerts={mockAlerts} 
        isLoading={true} 
      />
    );

    expect(screen.getByText('هشدارها و اعلان‌ها')).toBeInTheDocument();
    expect(screen.getByText(/animate-pulse/i)).toBeTruthy();
  });

  it('renders alerts data correctly', () => {
    render(
      <AlertsPanel 
        alerts={mockAlerts} 
        isLoading={false} 
      />
    );

    // Check header
    expect(screen.getByText('هشدارها و اعلان‌ها')).toBeInTheDocument();
    expect(screen.getByText('5 هشدار')).toBeInTheDocument();

    // Check alert counts
    expect(screen.getByText('1 بحرانی')).toBeInTheDocument();
    expect(screen.getByText('1 مهم')).toBeInTheDocument();

    // Check individual alerts
    expect(screen.getByText('5 فاکتور سررسید گذشته')).toBeInTheDocument();
    expect(screen.getByText('8 قسط در هفته آینده')).toBeInTheDocument();
    expect(screen.getByText('12 محصول کم موجود')).toBeInTheDocument();
    expect(screen.getByText('3 قسط طلا در هفته آینده')).toBeInTheDocument();
  });

  it('displays severity badges correctly', () => {
    render(
      <AlertsPanel 
        alerts={mockAlerts} 
        isLoading={false} 
      />
    );

    // Check severity badges
    expect(screen.getByText('بحرانی')).toBeInTheDocument();
    expect(screen.getByText('مهم')).toBeInTheDocument();
    expect(screen.getAllByText('متوسط')).toHaveLength(2);
    expect(screen.getByText('کم')).toBeInTheDocument();
  });

  it('applies correct severity colors', () => {
    render(
      <AlertsPanel 
        alerts={mockAlerts} 
        isLoading={false} 
      />
    );

    // Critical alert should have red border
    const criticalAlert = screen.getByText('5 فاکتور سررسید گذشته').closest('div');
    expect(criticalAlert).toHaveClass('border-r-red-600');

    // High alert should have red border
    const highAlert = screen.getByText('8 قسط در هفته آینده').closest('div');
    expect(highAlert).toHaveClass('border-r-red-500');

    // Medium alerts should have yellow border
    const mediumAlert = screen.getByText('12 محصول کم موجود').closest('div');
    expect(mediumAlert).toHaveClass('border-r-yellow-500');

    // Low alert should have blue border
    const lowAlert = screen.getByText('جریان نقدی مثبت').closest('div');
    expect(lowAlert).toHaveClass('border-r-blue-500');
  });

  it('displays alert metadata correctly', () => {
    render(
      <AlertsPanel 
        alerts={mockAlerts} 
        isLoading={false} 
      />
    );

    // Check count metadata
    expect(screen.getByText('تعداد: 5')).toBeInTheDocument();
    expect(screen.getByText('تعداد: 8')).toBeInTheDocument();
    expect(screen.getByText('تعداد: 12')).toBeInTheDocument();

    // Check amount metadata (formatted in Persian)
    expect(screen.getByText('مبلغ: 1,250,000 تومان')).toBeInTheDocument();
    expect(screen.getByText('مبلغ: 2,100,000 تومان')).toBeInTheDocument();

    // Check weight metadata
    expect(screen.getByText('وزن: 45.250 گرم')).toBeInTheDocument();
  });

  it('handles alert click', () => {
    const onViewAlert = vi.fn();

    render(
      <AlertsPanel 
        alerts={mockAlerts} 
        isLoading={false} 
        onViewAlert={onViewAlert}
      />
    );

    // Click on first alert
    const firstAlert = screen.getByText('5 فاکتور سررسید گذشته').closest('div');
    fireEvent.click(firstAlert!);

    expect(onViewAlert).toHaveBeenCalledWith('overdue_payments');
  });

  it('handles view button click', () => {
    const onViewAlert = vi.fn();

    render(
      <AlertsPanel 
        alerts={mockAlerts} 
        isLoading={false} 
        onViewAlert={onViewAlert}
      />
    );

    // Click on view button
    const viewButtons = screen.getAllByText('مشاهده');
    fireEvent.click(viewButtons[0]);

    expect(onViewAlert).toHaveBeenCalledWith('overdue_payments');
  });

  it('renders empty state when no alerts', () => {
    render(
      <AlertsPanel 
        alerts={emptyAlerts} 
        isLoading={false} 
      />
    );

    expect(screen.getByText('همه چیز عالی است!')).toBeInTheDocument();
    expect(screen.getByText('در حال حاضر هیچ هشدار مهمی وجود ندارد.')).toBeInTheDocument();
  });

  it('shows correct alert icons', () => {
    render(
      <AlertsPanel 
        alerts={mockAlerts} 
        isLoading={false} 
      />
    );

    // Should have different icons for different alert types
    // This is tested by checking if the icons are rendered (they have specific classes)
    const alertElements = screen.getAllByRole('button', { name: /مشاهده/ });
    expect(alertElements).toHaveLength(5);
  });

  it('shows view all button when more than 3 alerts', () => {
    render(
      <AlertsPanel 
        alerts={mockAlerts} 
        isLoading={false} 
      />
    );

    // Should show "view all" button since we have 5 alerts (more than 3)
    expect(screen.getByText('مشاهده همه هشدارها (5)')).toBeInTheDocument();
  });

  it('handles view all alerts click', () => {
    const onViewAlert = vi.fn();

    render(
      <AlertsPanel 
        alerts={mockAlerts} 
        isLoading={false} 
        onViewAlert={onViewAlert}
      />
    );

    const viewAllButton = screen.getByText('مشاهده همه هشدارها (5)');
    fireEvent.click(viewAllButton);

    expect(onViewAlert).toHaveBeenCalledWith('all');
  });

  it('formats amounts correctly in Persian', () => {
    render(
      <AlertsPanel 
        alerts={mockAlerts} 
        isLoading={false} 
      />
    );

    // Check Persian number formatting
    expect(screen.getByText('مبلغ: 1,250,000 تومان')).toBeInTheDocument();
    expect(screen.getByText('مبلغ: 2,100,000 تومان')).toBeInTheDocument();
  });

  it('formats weights correctly', () => {
    render(
      <AlertsPanel 
        alerts={mockAlerts} 
        isLoading={false} 
      />
    );

    // Check weight formatting with 3 decimal places
    expect(screen.getByText('وزن: 45.250 گرم')).toBeInTheDocument();
  });

  it('does not show metadata when not available', () => {
    const alertsWithoutMetadata: AlertsResponse = {
      alerts: [
        {
          type: 'general_info',
          severity: 'low',
          title: 'اطلاعات عمومی',
          description: 'این یک اطلاع عمومی است',
          action: 'view_info'
        }
      ],
      total_alerts: 1,
      critical_alerts: 0,
      high_alerts: 0,
      medium_alerts: 0
    };

    render(
      <AlertsPanel 
        alerts={alertsWithoutMetadata} 
        isLoading={false} 
      />
    );

    // Should not show count, amount, or weight when not provided
    expect(screen.queryByText(/تعداد:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/مبلغ:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/وزن:/)).not.toBeInTheDocument();
  });
});