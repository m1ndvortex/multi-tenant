import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import CustomerList from '@/components/customers/CustomerList';
import { customerService } from '@/services/customerService';

// Mock the customer service
vi.mock('@/services/customerService', () => ({
  customerService: {
    getCustomers: vi.fn(),
  },
}));

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockCustomers = [
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
    customer_type: 'INDIVIDUAL' as const,
    status: 'ACTIVE' as const,
    credit_limit: 1000000,
    total_debt: 500000,
    total_gold_debt: 0,
    total_purchases: 2000000,
    tags: ['مشتری ویژه', 'تهران'],
    notes: 'مشتری خوب',
    preferred_contact_method: 'phone' as const,
    email_notifications: true,
    sms_notifications: true,
    business_name: null,
    tax_id: null,
    business_type: null,
    last_purchase_at: '2024-01-15T10:00:00Z',
    last_contact_at: '2024-01-20T15:30:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-20T15:30:00Z',
    is_active: true,
    display_name: 'احمد محمدی',
    primary_contact: '09123456789',
    full_address: 'تهران، خیابان ولیعصر',
    is_vip: false,
    has_outstanding_debt: true,
  },
  {
    id: '2',
    tenant_id: 'tenant1',
    name: 'شرکت طلای پارس',
    email: 'info@goldpars.com',
    phone: '02112345678',
    mobile: null,
    address: 'تهران، بازار طلا',
    city: 'تهران',
    state: 'تهران',
    postal_code: '1234567891',
    country: 'ایران',
    customer_type: 'BUSINESS' as const,
    status: 'ACTIVE' as const,
    credit_limit: 5000000,
    total_debt: 0,
    total_gold_debt: 2.5,
    total_purchases: 10000000,
    tags: ['عمده فروش', 'طلا'],
    notes: 'مشتری عمده فروش',
    preferred_contact_method: 'email' as const,
    email_notifications: true,
    sms_notifications: false,
    business_name: 'شرکت طلای پارس',
    tax_id: '123456789',
    business_type: 'طلا فروشی',
    last_purchase_at: '2024-01-18T14:00:00Z',
    last_contact_at: '2024-01-19T09:00:00Z',
    created_at: '2023-12-01T00:00:00Z',
    updated_at: '2024-01-19T09:00:00Z',
    is_active: true,
    display_name: 'شرکت طلای پارس',
    primary_contact: 'info@goldpars.com',
    full_address: 'تهران، بازار طلا',
    is_vip: false,
    has_outstanding_debt: false,
  },
];

const mockCustomerListResponse = {
  customers: mockCustomers,
  total: 2,
  page: 1,
  per_page: 20,
  total_pages: 1,
};

describe('CustomerList', () => {
  const mockOnSelectCustomer = vi.fn();
  const mockOnCreateCustomer = vi.fn();
  const mockOnShowSegmentation = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (customerService.getCustomers as any).mockResolvedValue(mockCustomerListResponse);
  });

  it('renders customer list with header and stats', async () => {
    render(
      <CustomerList
        onSelectCustomer={mockOnSelectCustomer}
        onCreateCustomer={mockOnCreateCustomer}
        onShowSegmentation={mockOnShowSegmentation}
      />
    );

    // Check header
    expect(screen.getByText('مدیریت مشتریان')).toBeInTheDocument();
    expect(screen.getByText('مدیریت اطلاعات مشتریان و تعاملات')).toBeInTheDocument();

    // Check buttons
    expect(screen.getByText('مشتری جدید')).toBeInTheDocument();
    expect(screen.getByText('بخش‌بندی و بازاریابی')).toBeInTheDocument();

    // Wait for customers to load
    await waitFor(() => {
      expect(screen.getByText('احمد محمدی')).toBeInTheDocument();
      expect(screen.getByText('شرکت طلای پارس')).toBeInTheDocument();
    });

    // Check stats cards
    expect(screen.getByText('کل مشتریان')).toBeInTheDocument();
    expect(screen.getByText('مشتریان فعال')).toBeInTheDocument();
    expect(screen.getByText('مشتریان VIP')).toBeInTheDocument();
    expect(screen.getByText('دارای بدهی')).toBeInTheDocument();
  });

  it('displays customer information correctly', async () => {
    render(
      <CustomerList
        onSelectCustomer={mockOnSelectCustomer}
        onCreateCustomer={mockOnCreateCustomer}
      />
    );

    await waitFor(() => {
      // Check first customer
      expect(screen.getByText('احمد محمدی')).toBeInTheDocument();
      expect(screen.getByText('09123456789')).toBeInTheDocument();
      expect(screen.getAllByText('تهران').length).toBeGreaterThan(0);
      expect(screen.getByText('شخصی')).toBeInTheDocument();
      expect(screen.getAllByText('فعال').length).toBeGreaterThan(0);

      // Check second customer
      expect(screen.getByText('شرکت طلای پارس')).toBeInTheDocument();
      expect(screen.getByText('info@goldpars.com')).toBeInTheDocument();
      expect(screen.getByText('تجاری')).toBeInTheDocument();
    });
  });

  it('handles customer selection', async () => {
    render(
      <CustomerList
        onSelectCustomer={mockOnSelectCustomer}
        onCreateCustomer={mockOnCreateCustomer}
      />
    );

    await waitFor(() => {
      const customerRow = screen.getByText('احمد محمدی').closest('tr');
      expect(customerRow).toBeInTheDocument();
    });

    // Click on customer row
    const customerRow = screen.getByText('احمد محمدی').closest('tr');
    fireEvent.click(customerRow!);

    expect(mockOnSelectCustomer).toHaveBeenCalledWith(mockCustomers[0]);
  });

  it('handles create customer button click', async () => {
    render(
      <CustomerList
        onSelectCustomer={mockOnSelectCustomer}
        onCreateCustomer={mockOnCreateCustomer}
      />
    );

    const createButton = screen.getByText('مشتری جدید');
    fireEvent.click(createButton);

    expect(mockOnCreateCustomer).toHaveBeenCalled();
  });

  it('handles segmentation button click', async () => {
    render(
      <CustomerList
        onSelectCustomer={mockOnSelectCustomer}
        onCreateCustomer={mockOnCreateCustomer}
        onShowSegmentation={mockOnShowSegmentation}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('بخش‌بندی و بازاریابی')).toBeInTheDocument();
    });

    const segmentationButton = screen.getByText('بخش‌بندی و بازاریابی');
    fireEvent.click(segmentationButton);

    expect(mockOnShowSegmentation).toHaveBeenCalled();
  });

  it('handles search functionality', async () => {
    render(
      <CustomerList
        onSelectCustomer={mockOnSelectCustomer}
        onCreateCustomer={mockOnCreateCustomer}
      />
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText('جستجو در نام، ایمیل، تلفن...')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('جستجو در نام، ایمیل، تلفن...');
    fireEvent.change(searchInput, { target: { value: 'احمد' } });

    await waitFor(() => {
      expect(customerService.getCustomers).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'احمد',
          page: 1,
        })
      );
    });
  });

  it('handles filter changes', async () => {
    render(
      <CustomerList
        onSelectCustomer={mockOnSelectCustomer}
        onCreateCustomer={mockOnCreateCustomer}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('احمد محمدی')).toBeInTheDocument();
    });

    // Test that filter components are rendered
    expect(screen.getByPlaceholderText('جستجو در نام، ایمیل، تلفن...')).toBeInTheDocument();
    
    // Note: Testing Select components requires more complex setup
    // For now, we're just checking that the component renders with filters
  });

  it('displays correct customer stats', async () => {
    render(
      <CustomerList
        onSelectCustomer={mockOnSelectCustomer}
        onCreateCustomer={mockOnCreateCustomer}
      />
    );

    await waitFor(() => {
      // Check that customer data is loaded
      expect(screen.getByText('احمد محمدی')).toBeInTheDocument();
      expect(screen.getByText('شرکت طلای پارس')).toBeInTheDocument();
      
      // Check stats cards exist
      expect(screen.getByText('کل مشتریان')).toBeInTheDocument();
      expect(screen.getByText('مشتریان فعال')).toBeInTheDocument();
      expect(screen.getByText('مشتریان VIP')).toBeInTheDocument();
      expect(screen.getByText('دارای بدهی')).toBeInTheDocument();
    });
  });

  it('displays debt information correctly', async () => {
    render(
      <CustomerList
        onSelectCustomer={mockOnSelectCustomer}
        onCreateCustomer={mockOnCreateCustomer}
      />
    );

    await waitFor(() => {
      // Check that customers are loaded and table is rendered
      expect(screen.getByText('احمد محمدی')).toBeInTheDocument();
      expect(screen.getByText('شرکت طلای پارس')).toBeInTheDocument();
      
      // Check that debt columns exist
      expect(screen.getByText('بدهی ریالی')).toBeInTheDocument();
      expect(screen.getByText('بدهی طلا')).toBeInTheDocument();
    });
  });

  it('handles loading state', () => {
    (customerService.getCustomers as any).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );

    render(
      <CustomerList
        onSelectCustomer={mockOnSelectCustomer}
        onCreateCustomer={mockOnCreateCustomer}
      />
    );

    expect(screen.getByText('در حال بارگذاری...')).toBeInTheDocument();
  });

  it('handles empty state', async () => {
    (customerService.getCustomers as any).mockResolvedValue({
      customers: [],
      total: 0,
      page: 1,
      per_page: 20,
      total_pages: 0,
    });

    render(
      <CustomerList
        onSelectCustomer={mockOnSelectCustomer}
        onCreateCustomer={mockOnCreateCustomer}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('مشتری یافت نشد')).toBeInTheDocument();
    });
  });

  it('displays customer tags correctly', async () => {
    render(
      <CustomerList
        onSelectCustomer={mockOnSelectCustomer}
        onCreateCustomer={mockOnCreateCustomer}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('مشتری ویژه')).toBeInTheDocument();
      expect(screen.getAllByText('تهران').length).toBeGreaterThan(0);
      expect(screen.getByText('عمده فروش')).toBeInTheDocument();
      expect(screen.getByText('طلا')).toBeInTheDocument();
    });
  });
});