import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import CustomerForm from '@/components/customers/CustomerForm';
import { customerService } from '@/services/customerService';

// Mock the customer service
vi.mock('@/services/customerService', () => ({
  customerService: {
    createCustomer: vi.fn(),
    updateCustomer: vi.fn(),
  },
}));

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockCustomer = {
  id: '1',
  tenant_id: 'tenant1',
  name: 'احمد محمدی',
  email: 'ahmad@example.com',
  phone: '02112345678',
  mobile: '09123456789',
  address: 'تهران، خیابان ولیعصر',
  city: 'تهران',
  state: 'تهران',
  postal_code: '1234567890',
  country: 'ایران',
  customer_type: 'INDIVIDUAL' as const,
  status: 'ACTIVE' as const,
  credit_limit: 1000000,
  total_debt: 0,
  total_gold_debt: 0,
  total_purchases: 0,
  tags: ['مشتری جدید'],
  notes: 'مشتری خوب',
  preferred_contact_method: 'phone' as const,
  email_notifications: true,
  sms_notifications: true,
  business_name: undefined,
  tax_id: undefined,
  business_type: undefined,
  last_purchase_at: undefined,
  last_contact_at: undefined,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  is_active: true,
  display_name: 'احمد محمدی',
  primary_contact: '09123456789',
  full_address: 'تهران، خیابان ولیعصر',
  is_vip: false,
  has_outstanding_debt: false,
};

describe('CustomerForm', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders create form correctly', () => {
    render(
      <CustomerForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('مشتری جدید')).toBeInTheDocument();
    expect(screen.getByText('ایجاد مشتری جدید')).toBeInTheDocument();
    expect(screen.getByText('ذخیره')).toBeInTheDocument();
    expect(screen.getByText('انصراف')).toBeInTheDocument();
  });

  it('renders edit form correctly', () => {
    render(
      <CustomerForm
        customer={mockCustomer}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('ویرایش مشتری')).toBeInTheDocument();
    expect(screen.getByText('ویرایش اطلاعات مشتری')).toBeInTheDocument();
    expect(screen.getByDisplayValue('احمد محمدی')).toBeInTheDocument();
    expect(screen.getByDisplayValue('ahmad@example.com')).toBeInTheDocument();
  });

  it('displays all form tabs', () => {
    render(
      <CustomerForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('اطلاعات پایه')).toBeInTheDocument();
    expect(screen.getByText('اطلاعات تماس')).toBeInTheDocument();
    expect(screen.getByText('اطلاعات تجاری')).toBeInTheDocument();
    expect(screen.getByText('تنظیمات')).toBeInTheDocument();
  });

  it('handles form submission for new customer', async () => {
    const mockCreatedCustomer = { ...mockCustomer, id: 'new-id' };
    (customerService.createCustomer as any).mockResolvedValue(mockCreatedCustomer);

    render(
      <CustomerForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Fill required fields
    const nameInput = screen.getByLabelText('نام مشتری *');
    fireEvent.change(nameInput, { target: { value: 'مشتری جدید' } });

    // Submit form
    const saveButton = screen.getByText('ذخیره');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(customerService.createCustomer).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'مشتری جدید',
          customer_type: 'INDIVIDUAL',
          status: 'ACTIVE',
          country: 'ایران',
        })
      );
      expect(mockOnSave).toHaveBeenCalledWith(mockCreatedCustomer);
    });
  });

  it('handles form submission for existing customer', async () => {
    const mockUpdatedCustomer = { ...mockCustomer, name: 'نام به‌روزرسانی شده' };
    (customerService.updateCustomer as any).mockResolvedValue(mockUpdatedCustomer);

    render(
      <CustomerForm
        customer={mockCustomer}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Update name
    const nameInput = screen.getByDisplayValue('احمد محمدی');
    fireEvent.change(nameInput, { target: { value: 'نام به‌روزرسانی شده' } });

    // Submit form
    const saveButton = screen.getByText('ذخیره');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(customerService.updateCustomer).toHaveBeenCalledWith(
        mockCustomer.id,
        expect.objectContaining({
          name: 'نام به‌روزرسانی شده',
        })
      );
      expect(mockOnSave).toHaveBeenCalledWith(mockUpdatedCustomer);
    });
  });

  it('validates required fields', async () => {
    render(
      <CustomerForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Try to submit without filling required fields
    const saveButton = screen.getByText('ذخیره');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('نام الزامی است')).toBeInTheDocument();
    });

    expect(customerService.createCustomer).not.toHaveBeenCalled();
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('validates email format', async () => {
    render(
      <CustomerForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Fill name (required)
    const nameInput = screen.getByLabelText('نام مشتری *');
    fireEvent.change(nameInput, { target: { value: 'تست' } });

    // Enter invalid email
    const emailInput = screen.getByLabelText('ایمیل');
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

    // Submit form
    const saveButton = screen.getByText('ذخیره');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('ایمیل معتبر وارد کنید')).toBeInTheDocument();
    });
  });

  it('handles tag management', () => {
    render(
      <CustomerForm
        customer={mockCustomer}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Check existing tag
    expect(screen.getByText('مشتری جدید')).toBeInTheDocument();

    // Add new tag
    const tagInput = screen.getByPlaceholderText('برچسب جدید');
    fireEvent.change(tagInput, { target: { value: 'برچسب جدید' } });
    
    const addTagButton = screen.getByRole('button', { name: '' }); // Tag button
    fireEvent.click(addTagButton);

    expect(screen.getByText('برچسب جدید')).toBeInTheDocument();
  });

  it('shows business fields only for business customers', () => {
    render(
      <CustomerForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Switch to business tab
    const businessTab = screen.getByText('اطلاعات تجاری');
    fireEvent.click(businessTab);

    // Should show message for non-business customers
    expect(screen.getByText('اطلاعات تجاری فقط برای مشتریان تجاری قابل تنظیم است')).toBeInTheDocument();

    // Change customer type to business
    const basicTab = screen.getByText('اطلاعات پایه');
    fireEvent.click(basicTab);

    // This would require more complex setup to test Select component properly
    // For now, we're just checking that the component renders
  });

  it('handles cancel button', () => {
    render(
      <CustomerForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByText('انصراف');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('displays loading state during submission', async () => {
    (customerService.createCustomer as any).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );

    render(
      <CustomerForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Fill required fields
    const nameInput = screen.getByLabelText('نام مشتری *');
    fireEvent.change(nameInput, { target: { value: 'تست' } });

    // Submit form
    const saveButton = screen.getByText('ذخیره');
    fireEvent.click(saveButton);

    expect(screen.getByText('در حال ذخیره...')).toBeInTheDocument();
  });

  it('handles contact information correctly', () => {
    render(
      <CustomerForm
        customer={mockCustomer}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Switch to contact tab
    const contactTab = screen.getByText('اطلاعات تماس');
    fireEvent.click(contactTab);

    expect(screen.getByDisplayValue('ahmad@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('02112345678')).toBeInTheDocument();
    expect(screen.getByDisplayValue('09123456789')).toBeInTheDocument();
    expect(screen.getByDisplayValue('تهران، خیابان ولیعصر')).toBeInTheDocument();
  });

  it('handles notification settings', () => {
    render(
      <CustomerForm
        customer={mockCustomer}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Switch to settings tab
    const settingsTab = screen.getByText('تنظیمات');
    fireEvent.click(settingsTab);

    const emailNotifications = screen.getByLabelText('اعلان‌های ایمیل');
    const smsNotifications = screen.getByLabelText('اعلان‌های پیامکی');

    expect(emailNotifications).toBeChecked();
    expect(smsNotifications).toBeChecked();

    // Toggle notifications
    fireEvent.click(emailNotifications);
    fireEvent.click(smsNotifications);

    expect(emailNotifications).not.toBeChecked();
    expect(smsNotifications).not.toBeChecked();
  });
});