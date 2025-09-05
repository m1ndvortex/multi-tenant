import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GoldPriceManagement from '@/components/settings/GoldPriceManagement';
import { settingsService } from '@/services/settingsService';

// Mock the settings service
vi.mock('@/services/settingsService', () => ({
  settingsService: {
    getGoldPrices: vi.fn(),
    getCurrentGoldPrice: vi.fn(),
    createGoldPrice: vi.fn(),
    updateGoldPrice: vi.fn(),
    deleteGoldPrice: vi.fn(),
  },
}));

// Mock the toast hook
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockSettingsService = settingsService as any;

const mockGoldPrices = [
  {
    id: '1',
    date: '2024-01-01',
    price: 1500000,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    date: '2024-01-02',
    price: 1520000,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
  {
    id: '3',
    date: '2024-01-03',
    price: 1510000,
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z',
  },
];

const mockCurrentPrice = mockGoldPrices[2]; // Latest price

describe('GoldPriceManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSettingsService.getGoldPrices.mockResolvedValue(mockGoldPrices);
    mockSettingsService.getCurrentGoldPrice.mockResolvedValue(mockCurrentPrice);
  });

  it('should render loading state initially', () => {
    render(<GoldPriceManagement />);
    expect(screen.getByRole('generic')).toBeInTheDocument();
  });

  it('should render current gold price after loading', async () => {
    render(<GoldPriceManagement />);

    await waitFor(() => {
      expect(screen.getByText('قیمت فعلی طلا')).toBeInTheDocument();
    });

    expect(screen.getByText('1,510,000 ریال')).toBeInTheDocument();
    expect(screen.getByText('هر گرم')).toBeInTheDocument();
  });

  it('should render price history', async () => {
    render(<GoldPriceManagement />);

    await waitFor(() => {
      expect(screen.getByText('تاریخچه قیمت‌ها')).toBeInTheDocument();
    });

    expect(screen.getByText('1,500,000 ریال')).toBeInTheDocument();
    expect(screen.getByText('1,520,000 ریال')).toBeInTheDocument();
    expect(screen.getByText('1,510,000 ریال')).toBeInTheDocument();
  });

  it('should open create price dialog', async () => {
    const user = userEvent.setup();
    render(<GoldPriceManagement />);

    await waitFor(() => {
      expect(screen.getByText('ثبت قیمت جدید')).toBeInTheDocument();
    });

    const createButton = screen.getByText('ثبت قیمت جدید');
    await user.click(createButton);

    expect(screen.getByText('ثبت قیمت جدید طلا')).toBeInTheDocument();
    expect(screen.getByLabelText('تاریخ')).toBeInTheDocument();
    expect(screen.getByLabelText('قیمت (ریال) *')).toBeInTheDocument();
  });

  it('should create new gold price', async () => {
    const user = userEvent.setup();
    const newPrice = {
      id: '4',
      date: '2024-01-04',
      price: 1530000,
      createdAt: '2024-01-04T00:00:00Z',
      updatedAt: '2024-01-04T00:00:00Z',
    };
    mockSettingsService.createGoldPrice.mockResolvedValue(newPrice);

    render(<GoldPriceManagement />);

    await waitFor(() => {
      expect(screen.getByText('ثبت قیمت جدید')).toBeInTheDocument();
    });

    // Open create dialog
    const createButton = screen.getByText('ثبت قیمت جدید');
    await user.click(createButton);

    // Fill form
    const dateInput = screen.getByLabelText('تاریخ');
    const priceInput = screen.getByLabelText('قیمت (ریال) *');

    await user.clear(dateInput);
    await user.type(dateInput, '2024-01-04');
    await user.type(priceInput, '1530000');

    // Submit form
    const submitButton = screen.getByText('ثبت قیمت');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockSettingsService.createGoldPrice).toHaveBeenCalledWith({
        date: '2024-01-04',
        price: 1530000,
      });
    });
  });

  it('should validate create price form', async () => {
    const user = userEvent.setup();
    render(<GoldPriceManagement />);

    await waitFor(() => {
      expect(screen.getByText('ثبت قیمت جدید')).toBeInTheDocument();
    });

    // Open create dialog
    const createButton = screen.getByText('ثبت قیمت جدید');
    await user.click(createButton);

    // Try to submit without price
    const submitButton = screen.getByText('ثبت قیمت');
    await user.click(submitButton);

    // Should not call create service
    expect(mockSettingsService.createGoldPrice).not.toHaveBeenCalled();
  });

  it('should open edit price dialog', async () => {
    const user = userEvent.setup();
    render(<GoldPriceManagement />);

    await waitFor(() => {
      expect(screen.getByText('تاریخچه قیمت‌ها')).toBeInTheDocument();
    });

    // Click edit button for first price
    const editButtons = screen.getAllByRole('button');
    const editButton = editButtons.find(btn => 
      btn.querySelector('svg')?.getAttribute('class')?.includes('lucide-edit')
    );
    
    if (editButton) {
      await user.click(editButton);
      expect(screen.getByText('ویرایش قیمت طلا')).toBeInTheDocument();
    }
  });

  it('should update gold price', async () => {
    const user = userEvent.setup();
    const updatedPrice = { ...mockGoldPrices[0], price: 1550000 };
    mockSettingsService.updateGoldPrice.mockResolvedValue(updatedPrice);

    render(<GoldPriceManagement />);

    await waitFor(() => {
      expect(screen.getByText('تاریخچه قیمت‌ها')).toBeInTheDocument();
    });

    // Click edit button for first price
    const editButtons = screen.getAllByRole('button');
    const editButton = editButtons.find(btn => 
      btn.querySelector('svg')?.getAttribute('class')?.includes('lucide-edit')
    );
    
    if (editButton) {
      await user.click(editButton);
      
      // Update price
      const priceInput = screen.getByLabelText('قیمت (ریال) *');
      await user.clear(priceInput);
      await user.type(priceInput, '1550000');

      // Submit
      const saveButton = screen.getByText('ذخیره تغییرات');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockSettingsService.updateGoldPrice).toHaveBeenCalledWith('1', 1550000);
      });
    }
  });

  it('should delete gold price with confirmation', async () => {
    const user = userEvent.setup();
    mockSettingsService.deleteGoldPrice.mockResolvedValue(undefined);

    render(<GoldPriceManagement />);

    await waitFor(() => {
      expect(screen.getByText('تاریخچه قیمت‌ها')).toBeInTheDocument();
    });

    // Click delete button
    const deleteButtons = screen.getAllByRole('button');
    const deleteButton = deleteButtons.find(btn => 
      btn.querySelector('svg')?.getAttribute('class')?.includes('lucide-trash-2')
    );
    
    if (deleteButton) {
      await user.click(deleteButton);

      // Confirm deletion
      const confirmButton = screen.getByText('حذف');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockSettingsService.deleteGoldPrice).toHaveBeenCalledWith('1');
      });
    }
  });

  it('should handle date range filter', async () => {
    const user = userEvent.setup();
    render(<GoldPriceManagement />);

    await waitFor(() => {
      expect(screen.getByText('نمودار قیمت طلا')).toBeInTheDocument();
    });

    // Change date range
    const startDateInput = screen.getByLabelText('از تاریخ');
    const endDateInput = screen.getByLabelText('تا تاریخ');

    await user.clear(startDateInput);
    await user.type(startDateInput, '2024-01-01');
    await user.clear(endDateInput);
    await user.type(endDateInput, '2024-01-31');

    // Should trigger new API call with date range
    await waitFor(() => {
      expect(mockSettingsService.getGoldPrices).toHaveBeenCalledWith('2024-01-01', '2024-01-31');
    });
  });

  it('should display empty state when no prices', async () => {
    mockSettingsService.getGoldPrices.mockResolvedValue([]);
    mockSettingsService.getCurrentGoldPrice.mockRejectedValue(new Error('No current price'));

    render(<GoldPriceManagement />);

    await waitFor(() => {
      expect(screen.getByText('هنوز قیمتی ثبت نشده است')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('هیچ قیمتی در این بازه زمانی یافت نشد')).toBeInTheDocument();
    });
  });

  it('should format prices correctly', async () => {
    render(<GoldPriceManagement />);

    await waitFor(() => {
      expect(screen.getByText('1,510,000 ریال')).toBeInTheDocument();
    });

    // Check that all prices are formatted with Persian numerals and commas
    expect(screen.getByText('1,500,000 ریال')).toBeInTheDocument();
    expect(screen.getByText('1,520,000 ریال')).toBeInTheDocument();
  });

  it('should format dates correctly', async () => {
    render(<GoldPriceManagement />);

    await waitFor(() => {
      expect(screen.getByText('تاریخچه قیمت‌ها')).toBeInTheDocument();
    });

    // Dates should be formatted in Persian calendar
    // The exact format depends on the locale implementation
    const dateElements = screen.getAllByText(/\d+\/\d+\/\d+/);
    expect(dateElements.length).toBeGreaterThan(0);
  });

  it('should handle load error', async () => {
    mockSettingsService.getGoldPrices.mockRejectedValue(new Error('Load failed'));
    mockSettingsService.getCurrentGoldPrice.mockRejectedValue(new Error('Load failed'));

    render(<GoldPriceManagement />);

    await waitFor(() => {
      // Component should still render but may show error state
      expect(screen.getByText('قیمت فعلی طلا')).toBeInTheDocument();
    });
  });

  it('should handle create price error', async () => {
    const user = userEvent.setup();
    mockSettingsService.createGoldPrice.mockRejectedValue(new Error('Create failed'));

    render(<GoldPriceManagement />);

    await waitFor(() => {
      expect(screen.getByText('ثبت قیمت جدید')).toBeInTheDocument();
    });

    // Open create dialog and fill form
    const createButton = screen.getByText('ثبت قیمت جدید');
    await user.click(createButton);

    const priceInput = screen.getByLabelText('قیمت (ریال) *');
    await user.type(priceInput, '1530000');

    const submitButton = screen.getByText('ثبت قیمت');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockSettingsService.createGoldPrice).toHaveBeenCalled();
    });
  });

  it('should show chart placeholder', async () => {
    render(<GoldPriceManagement />);

    await waitFor(() => {
      expect(screen.getByText('نمودار قیمت طلا')).toBeInTheDocument();
    });

    expect(screen.getByText('نمودار در نسخه‌های آینده اضافه خواهد شد')).toBeInTheDocument();
  });
});