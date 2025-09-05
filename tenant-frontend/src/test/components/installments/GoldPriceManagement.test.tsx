import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import GoldPriceManagement from '@/components/installments/GoldPriceManagement';
import { installmentService } from '@/services/installmentService';

// Mock the installment service
vi.mock('@/services/installmentService', () => ({
  installmentService: {
    getCurrentGoldPrice: vi.fn(),
    updateGoldPrice: vi.fn(),
    getGoldPriceHistory: vi.fn(),
  },
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockCurrentPrice = {
  price: 2650000,
  updated_at: '2024-01-15T10:30:00Z',
};

const mockPriceHistory = [
  { date: '2024-01-15', price: 2650000, updated_by: 'admin' },
  { date: '2024-01-14', price: 2600000, updated_by: 'admin' },
  { date: '2024-01-13', price: 2580000, updated_by: 'admin' },
  { date: '2024-01-12', price: 2620000, updated_by: 'admin' },
  { date: '2024-01-11', price: 2590000, updated_by: 'admin' },
];

const mockOnPriceUpdate = vi.fn();

const renderGoldPriceManagement = (props = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <GoldPriceManagement
        onPriceUpdate={mockOnPriceUpdate}
        {...props}
      />
    </QueryClientProvider>
  );
};

describe('GoldPriceManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (installmentService.getCurrentGoldPrice as any).mockResolvedValue(mockCurrentPrice);
    (installmentService.getGoldPriceHistory as any).mockResolvedValue(mockPriceHistory);
    (installmentService.updateGoldPrice as any).mockResolvedValue({
      price: 2700000,
      updated_at: '2024-01-15T11:00:00Z',
    });
  });

  it('renders gold price management interface', async () => {
    renderGoldPriceManagement();

    expect(screen.getByText('قیمت فعلی طلا')).toBeInTheDocument();
    expect(screen.getByText('تاریخچه قیمت طلا (30 روز اخیر)')).toBeInTheDocument();
  });

  it('loads and displays current gold price', async () => {
    renderGoldPriceManagement();

    await waitFor(() => {
      expect(screen.getByText('2,650,000 ریال/گرم')).toBeInTheDocument();
    });

    expect(installmentService.getCurrentGoldPrice).toHaveBeenCalled();
  });

  it('displays last update time', async () => {
    renderGoldPriceManagement();

    await waitFor(() => {
      expect(screen.getByText(/آخرین بروزرسانی:/)).toBeInTheDocument();
    });
  });

  it('loads and displays price history', async () => {
    renderGoldPriceManagement();

    await waitFor(() => {
      expect(screen.getByText('2,650,000 ریال/گرم')).toBeInTheDocument();
      expect(screen.getByText('2,600,000 ریال/گرم')).toBeInTheDocument();
      expect(screen.getByText('2,580,000 ریال/گرم')).toBeInTheDocument();
    });

    expect(installmentService.getGoldPriceHistory).toHaveBeenCalledWith(30);
  });

  it('shows price trend indicators', async () => {
    renderGoldPriceManagement();

    await waitFor(() => {
      // Current price (2,650,000) vs previous (2,600,000) = +50,000 (+1.92%)
      expect(screen.getByText('+50,000 ریال')).toBeInTheDocument();
      expect(screen.getByText('(1.92%)')).toBeInTheDocument();
    });
  });

  it('marks latest price entry', async () => {
    renderGoldPriceManagement();

    await waitFor(() => {
      expect(screen.getByText('فعلی')).toBeInTheDocument();
    });
  });

  it('shows updated by information', async () => {
    renderGoldPriceManagement();

    await waitFor(() => {
      expect(screen.getByText('بروزرسانی شده توسط: admin')).toBeInTheDocument();
    });
  });

  it('opens update dialog when update button is clicked', async () => {
    const user = userEvent.setup();
    renderGoldPriceManagement();

    await waitFor(() => {
      expect(screen.getByText('بروزرسانی')).toBeInTheDocument();
    });

    const updateButton = screen.getByRole('button', { name: 'بروزرسانی' });
    await user.click(updateButton);

    expect(screen.getByText('بروزرسانی قیمت طلا')).toBeInTheDocument();
  });

  it('displays current price in update dialog', async () => {
    const user = userEvent.setup();
    renderGoldPriceManagement();

    await waitFor(() => {
      expect(screen.getByText('بروزرسانی')).toBeInTheDocument();
    });

    const updateButton = screen.getByRole('button', { name: 'بروزرسانی' });
    await user.click(updateButton);

    expect(screen.getByText('2,650,000 ریال/گرم')).toBeInTheDocument();
  });

  it('calculates price change in update dialog', async () => {
    const user = userEvent.setup();
    renderGoldPriceManagement();

    await waitFor(() => {
      expect(screen.getByText('بروزرسانی')).toBeInTheDocument();
    });

    const updateButton = screen.getByRole('button', { name: 'بروزرسانی' });
    await user.click(updateButton);

    const newPriceInput = screen.getByLabelText('قیمت جدید (ریال/گرم)');
    await user.type(newPriceInput, '2700000');

    await waitFor(() => {
      expect(screen.getByText('+50,000 ریال')).toBeInTheDocument();
      expect(screen.getByText('(1.89%)')).toBeInTheDocument();
    });
  });

  it('shows warning about price impact', async () => {
    const user = userEvent.setup();
    renderGoldPriceManagement();

    await waitFor(() => {
      expect(screen.getByText('بروزرسانی')).toBeInTheDocument();
    });

    const updateButton = screen.getByRole('button', { name: 'بروزرسانی' });
    await user.click(updateButton);

    expect(screen.getByText('این قیمت برای محاسبه پرداخت‌های آینده استفاده خواهد شد')).toBeInTheDocument();
  });

  it('validates new price input', async () => {
    const user = userEvent.setup();
    renderGoldPriceManagement();

    await waitFor(() => {
      expect(screen.getByText('بروزرسانی')).toBeInTheDocument();
    });

    const updateButton = screen.getByRole('button', { name: 'بروزرسانی' });
    await user.click(updateButton);

    const submitButton = screen.getByRole('button', { name: 'بروزرسانی قیمت' });
    expect(submitButton).toBeDisabled();

    const newPriceInput = screen.getByLabelText('قیمت جدید (ریال/گرم)');
    await user.type(newPriceInput, '2700000');

    expect(submitButton).toBeEnabled();
  });

  it('submits price update successfully', async () => {
    const user = userEvent.setup();
    renderGoldPriceManagement();

    await waitFor(() => {
      expect(screen.getByText('بروزرسانی')).toBeInTheDocument();
    });

    const updateButton = screen.getByRole('button', { name: 'بروزرسانی' });
    await user.click(updateButton);

    const newPriceInput = screen.getByLabelText('قیمت جدید (ریال/گرم)');
    await user.type(newPriceInput, '2700000');

    const submitButton = screen.getByRole('button', { name: 'بروزرسانی قیمت' });
    await user.click(submitButton);

    expect(installmentService.updateGoldPrice).toHaveBeenCalledWith(2700000);
  });

  it('calls onPriceUpdate callback after successful update', async () => {
    const user = userEvent.setup();
    renderGoldPriceManagement();

    await waitFor(() => {
      expect(screen.getByText('بروزرسانی')).toBeInTheDocument();
    });

    const updateButton = screen.getByRole('button', { name: 'بروزرسانی' });
    await user.click(updateButton);

    const newPriceInput = screen.getByLabelText('قیمت جدید (ریال/گرم)');
    await user.type(newPriceInput, '2700000');

    const submitButton = screen.getByRole('button', { name: 'بروزرسانی قیمت' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnPriceUpdate).toHaveBeenCalledWith(2700000);
    });
  });

  it('refreshes current price when refresh button is clicked', async () => {
    const user = userEvent.setup();
    renderGoldPriceManagement();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '' })).toBeInTheDocument(); // Refresh button with icon only
    });

    const refreshButton = screen.getByRole('button', { name: '' });
    await user.click(refreshButton);

    expect(installmentService.getCurrentGoldPrice).toHaveBeenCalledTimes(2);
  });

  it('shows loading state for current price', () => {
    (installmentService.getCurrentGoldPrice as any).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderGoldPriceManagement();

    expect(screen.getByText('در حال بارگیری...')).toBeInTheDocument();
  });

  it('shows loading state for price history', () => {
    (installmentService.getGoldPriceHistory as any).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderGoldPriceManagement();

    // Should show loading skeletons
    const loadingElements = screen.getAllByRole('generic');
    const hasLoadingClass = loadingElements.some(el => 
      el.className.includes('animate-pulse')
    );
    expect(hasLoadingClass).toBe(true);
  });

  it('handles current price loading error', async () => {
    (installmentService.getCurrentGoldPrice as any).mockRejectedValue(
      new Error('Failed to load price')
    );

    renderGoldPriceManagement();

    await waitFor(() => {
      expect(screen.getByText('خطا در بارگیری قیمت')).toBeInTheDocument();
    });
  });

  it('handles empty price history', async () => {
    (installmentService.getGoldPriceHistory as any).mockResolvedValue([]);

    renderGoldPriceManagement();

    await waitFor(() => {
      expect(screen.getByText('تاریخچه قیمت در دسترس نیست')).toBeInTheDocument();
    });
  });

  it('handles price update error', async () => {
    const user = userEvent.setup();
    (installmentService.updateGoldPrice as any).mockRejectedValue(
      new Error('Update failed')
    );

    renderGoldPriceManagement();

    await waitFor(() => {
      expect(screen.getByText('بروزرسانی')).toBeInTheDocument();
    });

    const updateButton = screen.getByRole('button', { name: 'بروزرسانی' });
    await user.click(updateButton);

    const newPriceInput = screen.getByLabelText('قیمت جدید (ریال/گرم)');
    await user.type(newPriceInput, '2700000');

    const submitButton = screen.getByRole('button', { name: 'بروزرسانی قیمت' });
    await user.click(submitButton);

    // Should handle error gracefully (toast would be called)
    expect(installmentService.updateGoldPrice).toHaveBeenCalled();
  });

  it('shows loading state during price update', async () => {
    const user = userEvent.setup();
    (installmentService.updateGoldPrice as any).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderGoldPriceManagement();

    await waitFor(() => {
      expect(screen.getByText('بروزرسانی')).toBeInTheDocument();
    });

    const updateButton = screen.getByRole('button', { name: 'بروزرسانی' });
    await user.click(updateButton);

    const newPriceInput = screen.getByLabelText('قیمت جدید (ریال/گرم)');
    await user.type(newPriceInput, '2700000');

    const submitButton = screen.getByRole('button', { name: 'بروزرسانی قیمت' });
    await user.click(submitButton);

    expect(screen.getByText('در حال بروزرسانی...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it('auto-refreshes current price every 5 minutes', async () => {
    vi.useFakeTimers();
    renderGoldPriceManagement();

    // Initial load
    expect(installmentService.getCurrentGoldPrice).toHaveBeenCalledTimes(1);

    // Fast forward 5 minutes
    vi.advanceTimersByTime(5 * 60 * 1000);

    await waitFor(() => {
      expect(installmentService.getCurrentGoldPrice).toHaveBeenCalledTimes(2);
    });

    vi.useRealTimers();
  });

  it('closes update dialog after successful update', async () => {
    const user = userEvent.setup();
    renderGoldPriceManagement();

    await waitFor(() => {
      expect(screen.getByText('بروزرسانی')).toBeInTheDocument();
    });

    const updateButton = screen.getByRole('button', { name: 'بروزرسانی' });
    await user.click(updateButton);

    const newPriceInput = screen.getByLabelText('قیمت جدید (ریال/گرم)');
    await user.type(newPriceInput, '2700000');

    const submitButton = screen.getByRole('button', { name: 'بروزرسانی قیمت' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.queryByText('بروزرسانی قیمت طلا')).not.toBeInTheDocument();
    });
  });
});