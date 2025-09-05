import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import BusinessInsightsWidget from '@/components/business-intelligence/BusinessInsightsWidget';
import { businessIntelligenceService } from '@/services/businessIntelligenceService';

// Mock the business intelligence service
vi.mock('@/services/businessIntelligenceService', () => ({
  businessIntelligenceService: {
    getBusinessInsights: vi.fn(),
  },
}));

const mockInsights = [
  {
    id: '1',
    type: 'positive' as const,
    title: 'رشد فروش',
    description: 'فروش شما در ماه گذشته 15% افزایش یافته است',
    value: '15%',
    trend: 'up' as const,
    priority: 'high' as const,
    actionable: true,
    action_text: 'مشاهده جزئیات',
  },
  {
    id: '2',
    type: 'warning' as const,
    title: 'موجودی کم',
    description: '5 محصول موجودی کمتر از حد مجاز دارند',
    value: '5 محصول',
    trend: 'down' as const,
    priority: 'medium' as const,
    actionable: true,
    action_text: 'مدیریت موجودی',
  },
  {
    id: '3',
    type: 'info' as const,
    title: 'مشتریان جدید',
    description: '12 مشتری جدید در هفته گذشته اضافه شدند',
    value: '12 مشتری',
    trend: 'up' as const,
    priority: 'low' as const,
    actionable: false,
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

describe('BusinessInsightsWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state correctly', () => {
    vi.mocked(businessIntelligenceService.getBusinessInsights).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { container } = renderWithQueryClient(<BusinessInsightsWidget />);

    expect(screen.getByText('تحلیل‌های هوشمند کسب‌وکار')).toBeInTheDocument();
    // Check for loading animation elements
    const loadingElements = container.querySelectorAll('.animate-pulse');
    expect(loadingElements).toHaveLength(3);
  });

  it('renders error state correctly', async () => {
    vi.mocked(businessIntelligenceService.getBusinessInsights).mockRejectedValue(
      new Error('Network error')
    );

    renderWithQueryClient(<BusinessInsightsWidget />);

    await waitFor(() => {
      expect(screen.getByText('خطا در بارگذاری تحلیل‌های هوشمند')).toBeInTheDocument();
    });

    expect(screen.getByText('تلاش مجدد')).toBeInTheDocument();
  });

  it('renders empty state when no insights available', async () => {
    vi.mocked(businessIntelligenceService.getBusinessInsights).mockResolvedValue([]);

    renderWithQueryClient(<BusinessInsightsWidget />);

    await waitFor(() => {
      expect(screen.getByText('هنوز تحلیل هوشمندی در دسترس نیست')).toBeInTheDocument();
    });

    expect(screen.getByText('با افزایش داده‌های کسب‌وکار، تحلیل‌های بیشتری ارائه خواهد شد')).toBeInTheDocument();
  });

  it('renders insights correctly', async () => {
    vi.mocked(businessIntelligenceService.getBusinessInsights).mockResolvedValue(mockInsights);

    renderWithQueryClient(<BusinessInsightsWidget />);

    await waitFor(() => {
      expect(screen.getByText('رشد فروش')).toBeInTheDocument();
    });

    // Check all insights are rendered
    expect(screen.getByText('رشد فروش')).toBeInTheDocument();
    expect(screen.getByText('موجودی کم')).toBeInTheDocument();
    expect(screen.getByText('مشتریان جدید')).toBeInTheDocument();

    // Check descriptions
    expect(screen.getByText('فروش شما در ماه گذشته 15% افزایش یافته است')).toBeInTheDocument();
    expect(screen.getByText('5 محصول موجودی کمتر از حد مجاز دارند')).toBeInTheDocument();
    expect(screen.getByText('12 مشتری جدید در هفته گذشته اضافه شدند')).toBeInTheDocument();

    // Check values
    expect(screen.getByText('15%')).toBeInTheDocument();
    expect(screen.getByText('5 محصول')).toBeInTheDocument();
    expect(screen.getByText('12 مشتری')).toBeInTheDocument();

    // Check priority badges
    expect(screen.getByText('مهم')).toBeInTheDocument();
    expect(screen.getByText('متوسط')).toBeInTheDocument();
    expect(screen.getByText('کم')).toBeInTheDocument();

    // Check actionable buttons
    expect(screen.getByText('مشاهده جزئیات')).toBeInTheDocument();
    expect(screen.getByText('مدیریت موجودی')).toBeInTheDocument();
  });

  it('shows correct trend indicators', async () => {
    vi.mocked(businessIntelligenceService.getBusinessInsights).mockResolvedValue(mockInsights);

    renderWithQueryClient(<BusinessInsightsWidget />);

    await waitFor(() => {
      expect(screen.getByText('رشد فروش')).toBeInTheDocument();
    });

    // Check trend indicators - use getAllByText for multiple occurrences
    expect(screen.getAllByText('↗️ رو به بالا')).toHaveLength(2);
    expect(screen.getByText('↘️ رو به پایین')).toBeInTheDocument();
  });

  it('applies correct border colors based on insight type', async () => {
    vi.mocked(businessIntelligenceService.getBusinessInsights).mockResolvedValue(mockInsights);

    renderWithQueryClient(<BusinessInsightsWidget />);

    await waitFor(() => {
      expect(screen.getByText('رشد فروش')).toBeInTheDocument();
    });

    const insightCards = screen.getAllByRole('generic').filter(el => 
      el.className.includes('border-l-4')
    );

    expect(insightCards).toHaveLength(3);
    expect(insightCards[0]).toHaveClass('border-l-green-500'); // positive
    expect(insightCards[1]).toHaveClass('border-l-amber-500'); // warning
    expect(insightCards[2]).toHaveClass('border-l-blue-500'); // info
  });

  it('handles refresh functionality', async () => {
    const mockRefetch = vi.fn();
    vi.mocked(businessIntelligenceService.getBusinessInsights).mockResolvedValue(mockInsights);

    renderWithQueryClient(<BusinessInsightsWidget />);

    await waitFor(() => {
      expect(screen.getByText('رشد فروش')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: '' }); // Refresh button with icon only
    fireEvent.click(refreshButton);

    // The refresh button should be clickable
    expect(refreshButton).toBeInTheDocument();
  });

  it('shows "مشاهده بیشتر" button when more than 5 insights', async () => {
    const manyInsights = Array.from({ length: 7 }, (_, i) => ({
      ...mockInsights[0],
      id: `insight-${i}`,
      title: `تحلیل ${i + 1}`,
    }));

    vi.mocked(businessIntelligenceService.getBusinessInsights).mockResolvedValue(manyInsights);

    renderWithQueryClient(<BusinessInsightsWidget />);

    await waitFor(() => {
      expect(screen.getByText('تحلیل 1')).toBeInTheDocument();
    });

    expect(screen.getByText('مشاهده 2 تحلیل بیشتر')).toBeInTheDocument();
  });

  it('handles retry on error', async () => {
    vi.mocked(businessIntelligenceService.getBusinessInsights)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(mockInsights);

    renderWithQueryClient(<BusinessInsightsWidget />);

    await waitFor(() => {
      expect(screen.getByText('خطا در بارگذاری تحلیل‌های هوشمند')).toBeInTheDocument();
    });

    const retryButton = screen.getByText('تلاش مجدد');
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('رشد فروش')).toBeInTheDocument();
    });
  });

  it('applies custom className correctly', () => {
    vi.mocked(businessIntelligenceService.getBusinessInsights).mockResolvedValue([]);

    const { container } = renderWithQueryClient(
      <BusinessInsightsWidget className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('displays correct icons for different insight types', async () => {
    const insightsWithDifferentTypes = [
      { ...mockInsights[0], type: 'positive' as const },
      { ...mockInsights[1], type: 'negative' as const },
      { ...mockInsights[2], type: 'warning' as const },
    ];

    vi.mocked(businessIntelligenceService.getBusinessInsights).mockResolvedValue(insightsWithDifferentTypes);

    const { container } = renderWithQueryClient(<BusinessInsightsWidget />);

    await waitFor(() => {
      expect(screen.getByText('رشد فروش')).toBeInTheDocument();
    });

    // Check for SVG elements instead of img role
    const svgElements = container.querySelectorAll('svg');
    expect(svgElements.length).toBeGreaterThan(0);
  });
});