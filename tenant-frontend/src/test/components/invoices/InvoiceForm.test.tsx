import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import InvoiceForm from '@/components/invoices/InvoiceForm';
import { Customer } from '@/services/customerService';
import { Product } from '@/services/productService';
import { InvoiceCreate } from '@/services/invoiceService';

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock the invoice service
vi.mock('@/services/invoiceService', () => ({
  invoiceService: {
    getCurrentGoldPrice: vi.fn().mockResolvedValue({ price: 2500000, updated_at: '2024-01-01' }),
  },
}));

const mockCustomers: Customer[] = [
  {
    id: '1',
    tenant_id: 'tenant1',
    name: 'احمد محمدی',
    email: 'ahmad@example.com',
    phone: '09123456789',
    mobile: '09123456789',
    address: 'تهران، خیابان ولیعصر',
    city: 'تهران',
    state: 'تهران',
    postal_code: '1234567890',
    country: 'ایران',
    customer_type: 'INDIVIDUAL',
    status: 'ACTIVE',
    credit_limit: 10000000,
    total_debt: 500000,
    total_gold_debt: 0,
    total_purchases: 2000000,
    tags: ['vip'],
    notes: 'مشتری ویژه',
    preferred_contact_method: 'phone',
    email_notifications: true,
    sms_notifications: true,
    last_purchase_at: '2024-01-01',
    last_contact_at: '2024-01-01',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    is_active: true,
    display_name: 'احمد محمدی',
    primary_contact: '09123456789',
    full_address: 'تهران، خیابان ولیعصر',
    is_vip: true,
    has_outstanding_debt: true,
  },
  {
    id: '2',
    tenant_id: 'tenant1',
    name: 'فاطمه احمدی',
    email: 'fateme@example.com',
    phone: '09987654321',
    mobile: '09987654321',
    address: 'اصفهان، خیابان چهارباغ',
    city: 'اصفهان',
    state: 'اصفهان',
    postal_code: '0987654321',
    country: 'ایران',
    customer_type: 'INDIVIDUAL',
    status: 'ACTIVE',
    credit_limit: 5000000,
    total_debt: 0,
    total_gold_debt: 2.5,
    total_purchases: 1500000,
    tags: [],
    preferred_contact_method: 'email',
    email_notifications: true,
    sms_notifications: false,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    is_active: true,
    display_name: 'فاطمه احمدی',
    primary_contact: 'fateme@example.com',
    full_address: 'اصفهان، خیابان چهارباغ',
    is_vip: false,
    has_outstanding_debt: false,
  },
];

const mockProducts: Product[] = [
  {
    id: '1',
    tenant_id: 'tenant1',
    name: 'گردنبند طلا',
    description: 'گردنبند طلای 18 عیار',
    sku: 'GOLD-001',
    barcode: '1234567890',
    category_id: 'cat1',
    tags: ['طلا', 'گردنبند'],
    cost_price: 2000000,
    selling_price: 2500000,
    min_price: 2200000,
    max_price: 3000000,
    is_gold_product: true,
    gold_purity: 18,
    weight_per_unit: 5.5,
    track_inventory: true,
    stock_quantity: 10,
    reserved_quantity: 0,
    min_stock_level: 2,
    max_stock_level: 50,
    status: 'ACTIVE',
    is_service: false,
    length: 45,
    width: 2,
    height: 1,
    weight: 5.5,
    manufacturer: 'طلاسازی ایران',
    brand: 'ایران طلا',
    model: 'کلاسیک',
    notes: 'محصول پرفروش',
    images: ['image1.jpg'],
    available_quantity: 10,
    stock_status: 'in_stock',
    profit_margin: 25,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    is_active: true,
  },
  {
    id: '2',
    tenant_id: 'tenant1',
    name: 'کیف چرمی',
    description: 'کیف چرمی دستدوز',
    sku: 'BAG-001',
    category_id: 'cat2',
    tags: ['کیف', 'چرم'],
    cost_price: 800000,
    selling_price: 1200000,
    is_gold_product: false,
    track_inventory: true,
    stock_quantity: 25,
    reserved_quantity: 0,
    min_stock_level: 5,
    status: 'ACTIVE',
    is_service: false,
    manufacturer: 'چرم ایران',
    brand: 'ایران چرم',
    images: ['image2.jpg'],
    available_quantity: 25,
    stock_status: 'in_stock',
    profit_margin: 50,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    is_active: true,
  },
];

describe('InvoiceForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderInvoiceForm = (props = {}) => {
    return render(
      <InvoiceForm
        customers={mockCustomers}
        products={mockProducts}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        {...props}
      />
    );
  };

  describe('Invoice Type Selection', () => {
    it('should render invoice type selection tabs', () => {
      renderInvoiceForm();
      
      expect(screen.getByText('فاکتور عمومی')).toBeInTheDocument();
      expect(screen.getByText('فاکتور طلا')).toBeInTheDocument();
      expect(screen.getByText('کالاها و خدمات معمولی')).toBeInTheDocument();
      expect(screen.getByText('محصولات طلا با وزن و عیار')).toBeInTheDocument();
    });

    it('should default to general invoice type', () => {
      renderInvoiceForm();
      
      const generalTab = screen.getByRole('tab', { name: /فاکتور عمومی/ });
      expect(generalTab).toHaveAttribute('data-state', 'active');
    });

    it('should switch to gold invoice type when clicked', async () => {
      const user = userEvent.setup();
      renderInvoiceForm();
      
      const goldTab = screen.getByRole('tab', { name: /فاکتور طلا/ });
      await user.click(goldTab);
      
      expect(goldTab).toHaveAttribute('data-state', 'active');
      expect(screen.getByText('قیمت طلا (ریال در گرم)')).toBeInTheDocument();
    });

    it('should show gold price input when gold type is selected', async () => {
      const user = userEvent.setup();
      renderInvoiceForm();
      
      const goldTab = screen.getByRole('tab', { name: /فاکتور طلا/ });
      await user.click(goldTab);
      
      expect(screen.getByLabelText('قیمت طلا (ریال در گرم)')).toBeInTheDocument();
      expect(screen.getByText('بروزرسانی')).toBeInTheDocument();
    });

    it('should load current gold price when switching to gold type', async () => {
      const user = userEvent.setup();
      renderInvoiceForm();
      
      const goldTab = screen.getByRole('tab', { name: /فاکتور طلا/ });
      await user.click(goldTab);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('2500000')).toBeInTheDocument();
      });
    });
  });

  describe('Customer Selection', () => {
    it('should render customer selection dropdown', () => {
      renderInvoiceForm();
      
      expect(screen.getByText('انتخاب مشتری *')).toBeInTheDocument();
      expect(screen.getByText('مشتری را انتخاب کنید')).toBeInTheDocument();
    });

    it('should show customer information when selected', async () => {
      const user = userEvent.setup();
      renderInvoiceForm();
      
      const customerSelects = screen.getAllByRole('combobox');
      const customerSelect = customerSelects[0]; // First combobox is customer select
      await user.click(customerSelect);
      
      const customerOption = screen.getByText('احمد محمدی');
      await user.click(customerOption);
      
      await waitFor(() => {
        expect(screen.getByText('احمد محمدی')).toBeInTheDocument();
        expect(screen.getByText('تلفن: 09123456789')).toBeInTheDocument();
        expect(screen.getByText('بدهی: 500,000 ریال')).toBeInTheDocument();
      });
    });
  });

  describe('Invoice Items Management', () => {
    it('should render initial invoice item', () => {
      renderInvoiceForm();
      
      expect(screen.getByText('آیتم 1')).toBeInTheDocument();
      expect(screen.getByLabelText('توضیحات *')).toBeInTheDocument();
      expect(screen.getByLabelText('مقدار *')).toBeInTheDocument();
      expect(screen.getByLabelText('قیمت واحد *')).toBeInTheDocument();
    });

    it('should add new item when add button is clicked', async () => {
      const user = userEvent.setup();
      renderInvoiceForm();
      
      const addButton = screen.getByText('افزودن آیتم');
      await user.click(addButton);
      
      expect(screen.getByText('آیتم 2')).toBeInTheDocument();
    });

    it('should remove item when remove button is clicked', async () => {
      const user = userEvent.setup();
      renderInvoiceForm();
      
      // Add a second item first
      const addButton = screen.getByText('افزودن آیتم');
      await user.click(addButton);
      
      // Remove the second item
      const removeButtons = screen.getAllByTitle('حذف');
      await user.click(removeButtons[1]);
      
      expect(screen.queryByText('آیتم 2')).not.toBeInTheDocument();
    });

    it('should not allow removing the last item', async () => {
      const user = userEvent.setup();
      renderInvoiceForm();
      
      const removeButton = screen.getByRole('button', { name: /trash2/i });
      await user.click(removeButton);
      
      // Should still have the item
      expect(screen.getByText('آیتم 1')).toBeInTheDocument();
    });

    it('should show gold-specific fields when gold invoice type is selected', async () => {
      const user = userEvent.setup();
      renderInvoiceForm();
      
      const goldTab = screen.getByRole('tab', { name: /فاکتور طلا/ });
      await user.click(goldTab);
      
      await waitFor(() => {
        expect(screen.getByLabelText('وزن (گرم)')).toBeInTheDocument();
        expect(screen.getByLabelText('اجرت (ریال)')).toBeInTheDocument();
        expect(screen.getByLabelText('سود (ریال)')).toBeInTheDocument();
        expect(screen.getByLabelText('مالیات (ریال)')).toBeInTheDocument();
        expect(screen.getByLabelText('عیار طلا')).toBeInTheDocument();
      });
    });

    it('should populate item fields when product is selected', async () => {
      const user = userEvent.setup();
      renderInvoiceForm();
      
      const productSelects = screen.getAllByRole('combobox');
      const productSelect = productSelects[1]; // Second combobox is product select
      await user.click(productSelect);
      
      const productOption = screen.getByText('گردنبند طلا');
      await user.click(productOption);
      
      await waitFor(() => {
        const descriptionInput = screen.getByDisplayValue('گردنبند طلا');
        const priceInput = screen.getByDisplayValue('2500000');
        expect(descriptionInput).toBeInTheDocument();
        expect(priceInput).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Calculations', () => {
    it('should calculate item total for general invoice', async () => {
      const user = userEvent.setup();
      renderInvoiceForm();
      
      // Fill in item details
      const quantityInputs = screen.getAllByLabelText('مقدار *');
      const priceInputs = screen.getAllByLabelText('قیمت واحد *');
      
      await user.clear(quantityInputs[0]);
      await user.type(quantityInputs[0], '2');
      await user.clear(priceInputs[0]);
      await user.type(priceInputs[0], '1000000');
      
      await waitFor(() => {
        expect(screen.getByText('2,000,000 ریال')).toBeInTheDocument();
      });
    });

    it('should calculate item total for gold invoice', async () => {
      const user = userEvent.setup();
      renderInvoiceForm();
      
      // Switch to gold invoice
      const goldTab = screen.getByRole('tab', { name: /فاکتور طلا/ });
      await user.click(goldTab);
      
      await waitFor(() => {
        expect(screen.getByLabelText('وزن (گرم)')).toBeInTheDocument();
      });
      
      // Fill in gold item details
      const quantityInputs = screen.getAllByLabelText('مقدار *');
      const weightInputs = screen.getAllByLabelText('وزن (گرم)');
      const laborInputs = screen.getAllByLabelText('اجرت (ریال)');
      
      await user.clear(quantityInputs[0]);
      await user.type(quantityInputs[0], '1');
      await user.clear(weightInputs[0]);
      await user.type(weightInputs[0], '5');
      await user.clear(laborInputs[0]);
      await user.type(laborInputs[0], '500000');
      
      await waitFor(() => {
        // Gold value (5g * 2,500,000) + labor (500,000) = 13,000,000
        expect(screen.getByText('13,000,000 ریال')).toBeInTheDocument();
      });
    });

    it('should update invoice totals when items change', async () => {
      const user = userEvent.setup();
      renderInvoiceForm();
      
      const quantityInputs = screen.getAllByLabelText('مقدار *');
      const priceInputs = screen.getAllByLabelText('قیمت واحد *');
      
      await user.clear(quantityInputs[0]);
      await user.type(quantityInputs[0], '3');
      await user.clear(priceInputs[0]);
      await user.type(priceInputs[0], '1500000');
      
      await waitFor(() => {
        expect(screen.getByText('4,500,000 ریال')).toBeInTheDocument();
      });
    });

    it('should show gold weight total for gold invoices', async () => {
      const user = userEvent.setup();
      renderInvoiceForm();
      
      // Switch to gold invoice
      const goldTab = screen.getByRole('tab', { name: /فاکتور طلا/ });
      await user.click(goldTab);
      
      await waitFor(() => {
        expect(screen.getByLabelText('وزن (گرم)')).toBeInTheDocument();
      });
      
      const quantityInputs = screen.getAllByLabelText('مقدار *');
      const weightInputs = screen.getAllByLabelText('وزن (گرم)');
      
      await user.clear(quantityInputs[0]);
      await user.type(quantityInputs[0], '2');
      await user.clear(weightInputs[0]);
      await user.type(weightInputs[0], '3.5');
      
      await waitFor(() => {
        expect(screen.getByText('7.000 گرم')).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('should show validation error when customer is not selected', async () => {
      const user = userEvent.setup();
      renderInvoiceForm();
      
      const submitButton = screen.getByText('ایجاد فاکتور');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('انتخاب مشتری الزامی است')).toBeInTheDocument();
      });
    });

    it('should show validation error for empty item description', async () => {
      const user = userEvent.setup();
      renderInvoiceForm();
      
      // Select a customer
      const customerSelects = screen.getAllByRole('combobox');
      const customerSelect = customerSelects[0];
      await user.click(customerSelect);
      const customerOption = screen.getByText('احمد محمدی');
      await user.click(customerOption);
      
      const submitButton = screen.getByText('ایجاد فاکتور');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('توضیحات الزامی است')).toBeInTheDocument();
      });
    });

    it('should validate quantity is greater than zero', async () => {
      const user = userEvent.setup();
      renderInvoiceForm();
      
      const quantityInputs = screen.getAllByLabelText('مقدار *');
      const quantityInput = quantityInputs[0];
      await user.clear(quantityInput);
      await user.type(quantityInput, '0');
      
      const submitButton = screen.getByText('ایجاد فاکتور');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('مقدار باید بیشتر از صفر باشد')).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should submit general invoice with correct data', async () => {
      const user = userEvent.setup();
      renderInvoiceForm();
      
      // Select customer
      const customerSelects = screen.getAllByRole('combobox');
      const customerSelect = customerSelects[0];
      await user.click(customerSelect);
      const customerOption = screen.getByText('احمد محمدی');
      await user.click(customerOption);
      
      // Fill item details
      const descriptionInputs = screen.getAllByLabelText('توضیحات *');
      const quantityInputs = screen.getAllByLabelText('مقدار *');
      const priceInputs = screen.getAllByLabelText('قیمت واحد *');
      
      await user.type(descriptionInputs[0], 'محصول تست');
      await user.clear(quantityInputs[0]);
      await user.type(quantityInputs[0], '2');
      await user.clear(priceInputs[0]);
      await user.type(priceInputs[0], '1000000');
      
      const submitButton = screen.getByText('ایجاد فاکتور');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            customer_id: '1',
            invoice_type: 'GENERAL',
            items: expect.arrayContaining([
              expect.objectContaining({
                description: 'محصول تست',
                quantity: 2,
                unit_price: 1000000,
              }),
            ]),
          })
        );
      });
    });

    it('should submit gold invoice with correct data', async () => {
      const user = userEvent.setup();
      renderInvoiceForm();
      
      // Switch to gold invoice
      const goldTab = screen.getByRole('tab', { name: /فاکتور طلا/ });
      await user.click(goldTab);
      
      await waitFor(() => {
        expect(screen.getByLabelText('وزن (گرم)')).toBeInTheDocument();
      });
      
      // Select customer
      const customerSelects = screen.getAllByRole('combobox');
      const customerSelect = customerSelects[0];
      await user.click(customerSelect);
      const customerOption = screen.getByText('احمد محمدی');
      await user.click(customerOption);
      
      // Fill item details
      const descriptionInputs = screen.getAllByLabelText('توضیحات *');
      const quantityInputs = screen.getAllByLabelText('مقدار *');
      const weightInputs = screen.getAllByLabelText('وزن (گرم)');
      const laborInputs = screen.getAllByLabelText('اجرت (ریال)');
      
      await user.type(descriptionInputs[0], 'گردنبند طلا');
      await user.clear(quantityInputs[0]);
      await user.type(quantityInputs[0], '1');
      await user.clear(weightInputs[0]);
      await user.type(weightInputs[0], '5.5');
      await user.clear(laborInputs[0]);
      await user.type(laborInputs[0], '500000');
      
      const submitButton = screen.getByText('ایجاد فاکتور');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            customer_id: '1',
            invoice_type: 'GOLD',
            gold_price_at_creation: 2500000,
            items: expect.arrayContaining([
              expect.objectContaining({
                description: 'گردنبند طلا',
                quantity: 1,
                weight: 5.5,
                labor_fee: 500000,
              }),
            ]),
          })
        );
      });
    });

    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      renderInvoiceForm();
      
      const cancelButton = screen.getByText('انصراف');
      await user.click(cancelButton);
      
      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('should show loading state when submitting', () => {
      renderInvoiceForm({ isLoading: true });
      
      expect(screen.getByText('در حال ایجاد...')).toBeInTheDocument();
      expect(screen.getByText('در حال ایجاد...')).toBeDisabled();
    });

    it('should disable cancel button when loading', () => {
      renderInvoiceForm({ isLoading: true });
      
      const cancelButton = screen.getByText('انصراف');
      expect(cancelButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for form fields', () => {
      renderInvoiceForm();
      
      expect(screen.getByText('انتخاب مشتری *')).toBeInTheDocument();
      expect(screen.getAllByLabelText('توضیحات *')).toHaveLength(1);
      expect(screen.getAllByLabelText('مقدار *')).toHaveLength(1);
      expect(screen.getAllByLabelText('قیمت واحد *')).toHaveLength(1);
    });

    it('should have proper ARIA attributes for tabs', () => {
      renderInvoiceForm();
      
      const generalTab = screen.getByRole('tab', { name: /فاکتور عمومی/ });
      const goldTab = screen.getByRole('tab', { name: /فاکتور طلا/ });
      
      expect(generalTab).toHaveAttribute('data-state', 'active');
      expect(goldTab).toHaveAttribute('data-state', 'inactive');
    });
  });
});