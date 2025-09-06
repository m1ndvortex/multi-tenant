/**
 * Business Insights Widget Tests
 * Tests for the AI-driven business insights component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import BusinessInsightsWidget from '@/components/dashboard/BusinessInsightsWidget';
import { BusinessInsightsResponse } from '@/services/dashboardService';

const mockInsights: BusinessInsightsResponse = {
  summary: 'کسب‌وکار شما در ماه جاری رشد مثبتی داشته است. درآمد ۱۱٪ افزایش یافته و تعداد مشتریان فعال نیز رو به رشد است.',
  insights: [
    {
      type: 'revenue_growth',
      priority: 'high',
      title: 'رشد درآمد قابل توجه',
      description: 'درآمد ماه جاری نسبت به ماه قبل ۱۱٪ افزایش یافته است که نشان‌دهنده عملکرد مثبت کسب‌وکار است.',
      impact_score: 8.5,
      confidence_score: 9.2,
      actionable: true,
      action_items: [
        'تمرکز بر محصولات پرفروش',
        'بهبود استراتژی قیمت‌گذاری',
        'افزایش تلاش‌های بازاریابی'
      ]
    },
    {
      type: 'customer_retention',
      priority: 'medium',
      title: 'نرخ بازگشت مشتریان مطلوب',
      description: 'مشتریان فعلی وفاداری خوبی نشان می‌دهند و احتمال خرید مجدد بالایی دارند.',
      impact_score: 7.2,
      confidence_score: 8.1,
      actionable: true,
      action_items: [
        'برنامه وفاداری مشتریان',
        'پیگیری منظم مشتریان'
      ]
    },
    {
      type: 'inventory_optimization',
      priority: 'low',
      title: 'بهینه‌سازی موجودی',
      description: 'برخی محصولات موجودی اضافی دارند که می‌توان آن‌ها را بهینه‌سازی کرد.',
      impact_score: 5.8,
      confidence_score: 7.5,
      actionable: false,
      action_items: []
    }
  ],
  recommendations: [
    'تمرکز بر محصولات پرفروش برای افزایش درآمد',
    'بهبود فرآیند پیگیری مشتریان',
    'بررسی و بهینه‌سازی قیمت‌گذاری محصولات'
  ],
  generated_at: '2024-01-15T10:30:00Z'
};

describe('BusinessInsightsWidget', () => {
  it('renders loading state', () => {
    render(
      <BusinessInsightsWidget 
        insights={mockInsights} 
        isLoading={true} 
      />
    );

    expect(screen.getByText('تحلیل‌های هوشمند کسب‌وکار')).toBeInTheDocument();
    expect(screen.getByText(/animate-pulse/i)).toBeTruthy();
  });

  it('renders insights data correctly', () => {
    render(
      <BusinessInsightsWidget 
        insights={mockInsights} 
        isLoading={false} 
      />
    );

    // Check header
    expect(screen.getByText('تحلیل‌های هوشمند کسب‌وکار')).toBeInTheDocument();

    // Check executive summary
    expect(screen.getByText('خلاصه تحلیل')).toBeInTheDocument();
    expect(screen.getByText(mockInsights.summary)).toBeInTheDocument();

    // Check insights
    expect(screen.getByText('نکات کلیدی')).toBeInTheDocument();
    expect(screen.getByText('رشد درآمد قابل توجه')).toBeInTheDocument();
    expect(screen.getByText('نرخ بازگشت مشتریان مطلوب')).toBeInTheDocument();
    expect(screen.getByText('بهینه‌سازی موجودی')).toBeInTheDocument();

    // Check recommendations
    expect(screen.getByText('توصیه‌های اولویت‌دار')).toBeInTheDocument();
    expect(screen.getByText('تمرکز بر محصولات پرفروش برای افزایش درآمد')).toBeInTheDocument();
  });

  it('displays priority indicators correctly', () => {
    render(
      <BusinessInsightsWidget 
        insights={mockInsights} 
        isLoading={false} 
      />
    );

    // Check impact scores
    expect(screen.getByText('تأثیر: 8.5/10')).toBeInTheDocument();
    expect(screen.getByText('تأثیر: 7.2/10')).toBeInTheDocument();
    expect(screen.getByText('تأثیر: 5.8/10')).toBeInTheDocument();
  });

  it('shows action items for actionable insights', () => {
    render(
      <BusinessInsightsWidget 
        insights={mockInsights} 
        isLoading={false} 
      />
    );

    // Check action items section
    expect(screen.getByText('اقدامات پیشنهادی:')).toBeInTheDocument();
    expect(screen.getByText('تمرکز بر محصولات پرفروش')).toBeInTheDocument();
    expect(screen.getByText('بهبود استراتژی قیمت‌گذاری')).toBeInTheDocument();
  });

  it('handles view details button click', () => {
    const onViewDetails = vi.fn();

    render(
      <BusinessInsightsWidget 
        insights={mockInsights} 
        isLoading={false} 
        onViewDetails={onViewDetails}
      />
    );

    const viewDetailsButton = screen.getByText('مشاهده جزئیات');
    fireEvent.click(viewDetailsButton);

    expect(onViewDetails).toHaveBeenCalledTimes(1);
  });

  it('displays generation timestamp correctly', () => {
    render(
      <BusinessInsightsWidget 
        insights={mockInsights} 
        isLoading={false} 
      />
    );

    // Check timestamp (should be formatted in Persian)
    expect(screen.getByText(/آخرین بروزرسانی:/)).toBeInTheDocument();
  });

  it('applies correct priority colors', () => {
    render(
      <BusinessInsightsWidget 
        insights={mockInsights} 
        isLoading={false} 
      />
    );

    // High priority should have red border
    const highPriorityInsight = screen.getByText('رشد درآمد قابل توجه').closest('div');
    expect(highPriorityInsight).toHaveClass('border-r-red-500');

    // Medium priority should have yellow border
    const mediumPriorityInsight = screen.getByText('نرخ بازگشت مشتریان مطلوب').closest('div');
    expect(mediumPriorityInsight).toHaveClass('border-r-yellow-500');

    // Low priority should have green border
    const lowPriorityInsight = screen.getByText('بهینه‌سازی موجودی').closest('div');
    expect(lowPriorityInsight).toHaveClass('border-r-green-500');
  });

  it('limits displayed insights to top 3', () => {
    const manyInsights = {
      ...mockInsights,
      insights: [
        ...mockInsights.insights,
        {
          type: 'extra_insight',
          priority: 'low' as const,
          title: 'تحلیل اضافی',
          description: 'این تحلیل اضافی است',
          impact_score: 4.0,
          confidence_score: 6.0,
          actionable: false,
          action_items: []
        }
      ]
    };

    render(
      <BusinessInsightsWidget 
        insights={manyInsights} 
        isLoading={false} 
      />
    );

    // Should only show first 3 insights
    expect(screen.getByText('رشد درآمد قابل توجه')).toBeInTheDocument();
    expect(screen.getByText('نرخ بازگشت مشتریان مطلوب')).toBeInTheDocument();
    expect(screen.getByText('بهینه‌سازی موجودی')).toBeInTheDocument();
    expect(screen.queryByText('تحلیل اضافی')).not.toBeInTheDocument();
  });

  it('limits displayed recommendations to top 3', () => {
    const manyRecommendations = {
      ...mockInsights,
      recommendations: [
        ...mockInsights.recommendations,
        'توصیه اضافی چهارم',
        'توصیه اضافی پنجم'
      ]
    };

    render(
      <BusinessInsightsWidget 
        insights={manyRecommendations} 
        isLoading={false} 
      />
    );

    // Should only show first 3 recommendations
    expect(screen.getByText('تمرکز بر محصولات پرفروش برای افزایش درآمد')).toBeInTheDocument();
    expect(screen.getByText('بهبود فرآیند پیگیری مشتریان')).toBeInTheDocument();
    expect(screen.getByText('بررسی و بهینه‌سازی قیمت‌گذاری محصولات')).toBeInTheDocument();
    expect(screen.queryByText('توصیه اضافی چهارم')).not.toBeInTheDocument();
  });

  it('handles empty insights gracefully', () => {
    const emptyInsights = {
      ...mockInsights,
      insights: [],
      recommendations: []
    };

    render(
      <BusinessInsightsWidget 
        insights={emptyInsights} 
        isLoading={false} 
      />
    );

    expect(screen.getByText('تحلیل‌های هوشمند کسب‌وکار')).toBeInTheDocument();
    expect(screen.getByText(mockInsights.summary)).toBeInTheDocument();
  });

  it('limits action items to 2 per insight', () => {
    render(
      <BusinessInsightsWidget 
        insights={mockInsights} 
        isLoading={false} 
      />
    );

    // First insight has 3 action items, should only show 2
    expect(screen.getByText('تمرکز بر محصولات پرفروش')).toBeInTheDocument();
    expect(screen.getByText('بهبود استراتژی قیمت‌گذاری')).toBeInTheDocument();
    expect(screen.queryByText('افزایش تلاش‌های بازاریابی')).not.toBeInTheDocument();
  });
});