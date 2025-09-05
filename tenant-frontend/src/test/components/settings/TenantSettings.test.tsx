import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TenantSettings from '@/components/settings/TenantSettings';
import { settingsService } from '@/services/settingsService';

// Mock the settings service
vi.mock('@/services/settingsService', () => ({
  settingsService: {
    getTenantSettings: vi.fn(),
    updateTenantSettings: vi.fn(),
    uploadLogo: vi.fn(),
  },
}));

// Mock the toast hook
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockSettingsService = settingsService as any;

const mockTenantSettings = {
  id: '1',
  name: 'Test Business',
  businessType: 'retail',
  address: 'Test Address',
  phone: '09123456789',
  email: 'test@example.com',
  taxId: '123456789',
  logo: 'https://example.com/logo.png',
  currency: 'IRR',
  language: 'fa',
  timezone: 'Asia/Tehran',
  dateFormat: 'jalali',
  numberFormat: 'fa-IR',
};

describe('TenantSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSettingsService.getTenantSettings.mockResolvedValue(mockTenantSettings);
  });

  it('should render loading state initially', () => {
    render(<TenantSettings />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should render tenant settings form after loading', async () => {
    render(<TenantSettings />);

    await waitFor(() => {
      expect(screen.getByText('اطلاعات کسب‌وکار')).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue('Test Business')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('09123456789')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Address')).toBeInTheDocument();
  });

  it('should update form fields', async () => {
    const user = userEvent.setup();
    render(<TenantSettings />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Business')).toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue('Test Business');
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Business');

    expect(nameInput).toHaveValue('Updated Business');
  });

  it('should save settings when save button is clicked', async () => {
    const user = userEvent.setup();
    mockSettingsService.updateTenantSettings.mockResolvedValue({
      ...mockTenantSettings,
      name: 'Updated Business',
    });

    render(<TenantSettings />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Business')).toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue('Test Business');
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Business');

    const saveButton = screen.getByText('ذخیره تغییرات');
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockSettingsService.updateTenantSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Business',
        })
      );
    });
  });

  it('should handle logo upload', async () => {
    const user = userEvent.setup();
    const mockFile = new File(['test'], 'logo.png', { type: 'image/png' });
    mockSettingsService.uploadLogo.mockResolvedValue({
      logoUrl: 'https://example.com/new-logo.png',
    });

    render(<TenantSettings />);

    await waitFor(() => {
      expect(screen.getByText('اطلاعات کسب‌وکار')).toBeInTheDocument();
    });

    const fileInput = screen.getByLabelText('انتخاب لوگو');
    await user.upload(fileInput, mockFile);

    await waitFor(() => {
      expect(mockSettingsService.uploadLogo).toHaveBeenCalledWith(mockFile);
    });
  });

  it('should validate logo file type', async () => {
    const user = userEvent.setup();
    const mockFile = new File(['test'], 'document.pdf', { type: 'application/pdf' });

    render(<TenantSettings />);

    await waitFor(() => {
      expect(screen.getByText('اطلاعات کسب‌وکار')).toBeInTheDocument();
    });

    const fileInput = screen.getByLabelText('انتخاب لوگو');
    await user.upload(fileInput, mockFile);

    // Should not call upload service for invalid file type
    expect(mockSettingsService.uploadLogo).not.toHaveBeenCalled();
  });

  it('should validate logo file size', async () => {
    const user = userEvent.setup();
    // Create a file larger than 2MB
    const largeFile = new File(['x'.repeat(3 * 1024 * 1024)], 'large-logo.png', { 
      type: 'image/png' 
    });

    render(<TenantSettings />);

    await waitFor(() => {
      expect(screen.getByText('اطلاعات کسب‌وکار')).toBeInTheDocument();
    });

    const fileInput = screen.getByLabelText('انتخاب لوگو');
    await user.upload(fileInput, largeFile);

    // Should not call upload service for oversized file
    expect(mockSettingsService.uploadLogo).not.toHaveBeenCalled();
  });

  it('should handle business type selection', async () => {
    const user = userEvent.setup();
    render(<TenantSettings />);

    await waitFor(() => {
      expect(screen.getByText('اطلاعات کسب‌وکار')).toBeInTheDocument();
    });

    // Find and click the business type select trigger (first combobox)
    const businessTypeSelect = screen.getAllByRole('combobox')[0];
    await user.click(businessTypeSelect);

    // Select a different business type
    const goldOption = screen.getByText('طلا و جواهر');
    await user.click(goldOption);

    // Verify the selection
    expect(screen.getByText('طلا و جواهر')).toBeInTheDocument();
  });

  it('should handle currency selection', async () => {
    const user = userEvent.setup();
    render(<TenantSettings />);

    await waitFor(() => {
      expect(screen.getByText('اطلاعات کسب‌وکار')).toBeInTheDocument();
    });

    // Find currency select (second combobox)
    const currencySelect = screen.getAllByRole('combobox')[1];
    await user.click(currencySelect);

    // Select USD
    const usdOption = screen.getByText('دلار آمریکا (USD)');
    await user.click(usdOption);

    // Verify the selection
    expect(screen.getByText('دلار آمریکا (USD)')).toBeInTheDocument();
  });

  it('should display logo when available', async () => {
    render(<TenantSettings />);

    await waitFor(() => {
      expect(screen.getByText('اطلاعات کسب‌وکار')).toBeInTheDocument();
    });

    const logoImage = screen.getByAltText('لوگو');
    expect(logoImage).toBeInTheDocument();
    expect(logoImage).toHaveAttribute('src', 'https://example.com/logo.png');
  });

  it('should handle form validation for required fields', async () => {
    const user = userEvent.setup();
    render(<TenantSettings />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Business')).toBeInTheDocument();
    });

    // Clear the required name field
    const nameInput = screen.getByDisplayValue('Test Business');
    await user.clear(nameInput);

    const saveButton = screen.getByText('ذخیره تغییرات');
    await user.click(saveButton);

    // Should still call the service even with empty name (backend validation)
    await waitFor(() => {
      expect(mockSettingsService.updateTenantSettings).toHaveBeenCalled();
    });
  });

  it('should handle save error', async () => {
    const user = userEvent.setup();
    mockSettingsService.updateTenantSettings.mockRejectedValue(new Error('Save failed'));

    render(<TenantSettings />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Business')).toBeInTheDocument();
    });

    const saveButton = screen.getByText('ذخیره تغییرات');
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockSettingsService.updateTenantSettings).toHaveBeenCalled();
    });
  });

  it('should handle load error', async () => {
    mockSettingsService.getTenantSettings.mockRejectedValue(new Error('Load failed'));

    render(<TenantSettings />);

    await waitFor(() => {
      expect(screen.getByText('خطا در بارگذاری تنظیمات')).toBeInTheDocument();
    });
  });
});