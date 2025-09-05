import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SystemPreferences from '@/components/settings/SystemPreferences';
import { settingsService } from '@/services/settingsService';

// Mock the settings service
vi.mock('@/services/settingsService', () => ({
  settingsService: {
    getSystemPreferences: vi.fn(),
    updateSystemPreferences: vi.fn(),
  },
}));

// Mock the toast hook
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockSettingsService = settingsService as any;

const mockPreferences = {
  autoBackup: true,
  backupTime: '02:00',
  emailNotifications: true,
  smsNotifications: false,
  invoiceNumberPrefix: 'INV',
  invoiceNumberStart: 1000,
  defaultPaymentTerms: 30,
  lowStockThreshold: 10,
};

describe('SystemPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSettingsService.getSystemPreferences.mockResolvedValue(mockPreferences);
  });

  it('should render loading state initially', () => {
    render(<SystemPreferences />);
    expect(screen.getByRole('generic')).toBeInTheDocument();
  });

  it('should render system preferences after loading', async () => {
    render(<SystemPreferences />);

    await waitFor(() => {
      expect(screen.getByText('تنظیمات پشتیبان‌گیری')).toBeInTheDocument();
    });

    expect(screen.getByText('تنظیمات اعلان‌ها')).toBeInTheDocument();
    expect(screen.getByText('تنظیمات فاکتور')).toBeInTheDocument();
    expect(screen.getByText('تنظیمات انبار')).toBeInTheDocument();
  });

  it('should display backup settings correctly', async () => {
    render(<SystemPreferences />);

    await waitFor(() => {
      expect(screen.getByText('پشتیبان‌گیری خودکار')).toBeInTheDocument();
    });

    // Auto backup should be enabled
    const autoBackupSwitch = screen.getByRole('switch');
    expect(autoBackupSwitch).toBeChecked();

    // Backup time should be displayed
    const timeInput = screen.getByDisplayValue('02:00');
    expect(timeInput).toBeInTheDocument();
  });

  it('should toggle auto backup', async () => {
    const user = userEvent.setup();
    render(<SystemPreferences />);

    await waitFor(() => {
      expect(screen.getByText('پشتیبان‌گیری خودکار')).toBeInTheDocument();
    });

    const autoBackupSwitch = screen.getAllByRole('switch')[0];
    await user.click(autoBackupSwitch);

    expect(autoBackupSwitch).not.toBeChecked();
  });

  it('should show/hide backup time based on auto backup setting', async () => {
    const user = userEvent.setup();
    render(<SystemPreferences />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('02:00')).toBeInTheDocument();
    });

    // Disable auto backup
    const autoBackupSwitch = screen.getAllByRole('switch')[0];
    await user.click(autoBackupSwitch);

    // Time input should be hidden
    expect(screen.queryByDisplayValue('02:00')).not.toBeInTheDocument();
  });

  it('should display notification settings correctly', async () => {
    render(<SystemPreferences />);

    await waitFor(() => {
      expect(screen.getByText('اعلان‌های ایمیل')).toBeInTheDocument();
    });

    const switches = screen.getAllByRole('switch');
    
    // Email notifications should be enabled (second switch)
    expect(switches[1]).toBeChecked();
    
    // SMS notifications should be disabled (third switch)
    expect(switches[2]).not.toBeChecked();
  });

  it('should toggle notification settings', async () => {
    const user = userEvent.setup();
    render(<SystemPreferences />);

    await waitFor(() => {
      expect(screen.getByText('اعلان‌های پیامکی')).toBeInTheDocument();
    });

    const switches = screen.getAllByRole('switch');
    
    // Toggle SMS notifications
    await user.click(switches[2]);
    expect(switches[2]).toBeChecked();
  });

  it('should display invoice settings correctly', async () => {
    render(<SystemPreferences />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('INV')).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue('1000')).toBeInTheDocument();
    expect(screen.getByText('30 روز')).toBeInTheDocument();
  });

  it('should update invoice settings', async () => {
    const user = userEvent.setup();
    render(<SystemPreferences />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('INV')).toBeInTheDocument();
    });

    // Update invoice prefix
    const prefixInput = screen.getByDisplayValue('INV');
    await user.clear(prefixInput);
    await user.type(prefixInput, 'FACT');

    expect(prefixInput).toHaveValue('FACT');

    // Update invoice start number
    const startInput = screen.getByDisplayValue('1000');
    await user.clear(startInput);
    await user.type(startInput, '2000');

    expect(startInput).toHaveValue(2000);
  });

  it('should handle payment terms selection', async () => {
    const user = userEvent.setup();
    render(<SystemPreferences />);

    await waitFor(() => {
      expect(screen.getByText('30 روز')).toBeInTheDocument();
    });

    // Click on payment terms select
    const paymentTermsSelect = screen.getByRole('combobox');
    await user.click(paymentTermsSelect);

    // Select different payment terms
    const option15Days = screen.getByText('15 روز');
    await user.click(option15Days);

    expect(screen.getByText('15 روز')).toBeInTheDocument();
  });

  it('should display inventory settings correctly', async () => {
    render(<SystemPreferences />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('10')).toBeInTheDocument();
    });

    expect(screen.getByText('آستانه کمبود موجودی')).toBeInTheDocument();
    expect(screen.getByText(/هنگامی که موجودی کالایی کمتر از این مقدار باشد/)).toBeInTheDocument();
  });

  it('should update inventory settings', async () => {
    const user = userEvent.setup();
    render(<SystemPreferences />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('10')).toBeInTheDocument();
    });

    // Update low stock threshold
    const thresholdInput = screen.getByDisplayValue('10');
    await user.clear(thresholdInput);
    await user.type(thresholdInput, '5');

    expect(thresholdInput).toHaveValue(5);
  });

  it('should save all preferences', async () => {
    const user = userEvent.setup();
    const updatedPreferences = { ...mockPreferences, autoBackup: false };
    mockSettingsService.updateSystemPreferences.mockResolvedValue(updatedPreferences);

    render(<SystemPreferences />);

    await waitFor(() => {
      expect(screen.getByText('ذخیره تمام تنظیمات')).toBeInTheDocument();
    });

    // Make a change
    const autoBackupSwitch = screen.getAllByRole('switch')[0];
    await user.click(autoBackupSwitch);

    // Save preferences
    const saveButton = screen.getByText('ذخیره تمام تنظیمات');
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockSettingsService.updateSystemPreferences).toHaveBeenCalledWith(
        expect.objectContaining({
          autoBackup: false,
        })
      );
    });
  });

  it('should handle save error', async () => {
    const user = userEvent.setup();
    mockSettingsService.updateSystemPreferences.mockRejectedValue(new Error('Save failed'));

    render(<SystemPreferences />);

    await waitFor(() => {
      expect(screen.getByText('ذخیره تمام تنظیمات')).toBeInTheDocument();
    });

    const saveButton = screen.getByText('ذخیره تمام تنظیمات');
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockSettingsService.updateSystemPreferences).toHaveBeenCalled();
    });
  });

  it('should handle load error', async () => {
    mockSettingsService.getSystemPreferences.mockRejectedValue(new Error('Load failed'));

    render(<SystemPreferences />);

    await waitFor(() => {
      expect(screen.getByText('خطا در بارگذاری تنظیمات سیستم')).toBeInTheDocument();
    });
  });

  it('should show loading state while saving', async () => {
    const user = userEvent.setup();
    // Make the save operation take some time
    mockSettingsService.updateSystemPreferences.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockPreferences), 100))
    );

    render(<SystemPreferences />);

    await waitFor(() => {
      expect(screen.getByText('ذخیره تمام تنظیمات')).toBeInTheDocument();
    });

    const saveButton = screen.getByText('ذخیره تمام تنظیمات');
    await user.click(saveButton);

    // Should show loading state
    expect(screen.getByText('در حال ذخیره...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('ذخیره تمام تنظیمات')).toBeInTheDocument();
    });
  });

  it('should validate numeric inputs', async () => {
    const user = userEvent.setup();
    render(<SystemPreferences />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('1000')).toBeInTheDocument();
    });

    // Try to enter non-numeric value in invoice start number
    const startInput = screen.getByDisplayValue('1000');
    await user.clear(startInput);
    await user.type(startInput, 'abc');

    // Input should remain 0 or show validation error
    expect(startInput).toHaveValue(0);
  });

  it('should display all section headers with icons', async () => {
    const { container } = render(<SystemPreferences />);

    await waitFor(() => {
      expect(screen.getByText('تنظیمات پشتیبان‌گیری')).toBeInTheDocument();
    });

    expect(screen.getByText('تنظیمات اعلان‌ها')).toBeInTheDocument();
    expect(screen.getByText('تنظیمات فاکتور')).toBeInTheDocument();
    expect(screen.getByText('تنظیمات انبار')).toBeInTheDocument();

    // Check that icons are present (they should be in the DOM)
    const icons = container.querySelectorAll('svg');
    expect(icons.length).toBeGreaterThan(4); // At least one icon per section plus save button
  });
});