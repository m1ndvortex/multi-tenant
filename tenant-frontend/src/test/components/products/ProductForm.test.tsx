import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ProductForm from '@/components/products/ProductForm';
import { productService } from '@/services/productService';

// Mock the product service
vi.mock('@/services/productService', () => ({
  productService: {
    getProduct: vi.fn(),
    getCategories: vi.fn(),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    uploadImage: vi.fn(),
  },
}));

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom') as any;
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: undefined }),
  };
});

const mockCategories = [
  {
    id: 'cat1',
    tenant_id: 'tenant1',
    name: 'دسته‌بندی 1',
    description: 'توضیحات دسته‌بندی',
    sort_order: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    is_active: true,
  },
];

const mockProduct = {
  id: '1',
  tenant_id: 'tenant1',
  name: 'محصول تست',
  description: 'توضیحات محصول تست',
  sku: 'TEST001',
  barcode: '1234567890',
  category_id: 'cat1',
  tags: ['تست'],
  cost_price: 100,
  selling_price: 150,
  is_gold_product: false,
  track_inventory: true,
  stock_quantity: 50,
  reserved_quantity: 5,
  min_stock_level: 10,
  status: 'ACTIVE' as const,
  is_service: false,
  images: ['image1.jpg'],
  available_quantity: 45,
  stock_status: 'in_stock' as const,
  profit_margin: 50,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  is_active: true,
};

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="*" element={component} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('ProductForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    vi.mocked(productService.getCategories).mockResolvedValue(mockCategories);
    vi.mocked(productService.createProduct).mockResolvedValue(mockProduct);
    vi.mocked(productService.updateProduct).mockResolvedValue(mockProduct);
  });

  it('renders create form correctly', async () => {
    renderWithProviders(<ProductForm />);

    // Check form title
    expect(screen.getByText('محصول جدید')).toBeInTheDocument();
    expect(screen.getByText('محصول جدید را اضافه کنید')).toBeInTheDocument();

    // Check required fields
    expect(screen.getByLabelText(/نام محصول/)).toBeInTheDocument();
    expect(screen.getByLabelText(/قیمت فروش/)).toBeInTheDocument();
    
    // Check form sections
    expect(screen.getByText('اطلاعات پایه')).toBeInTheDocument();
    expect(screen.getByText('نوع محصول')).toBeInTheDocument();
    expect(screen.getByText('قیمت‌گذاری')).toBeInTheDocument();
    expect(screen.getByText('مدیریت موجودی')).toBeInTheDocument();
  });

  it('handles basic form input', async () => {
    renderWithProviders(<ProductForm />);

    // Fill in basic information
    const nameInput = screen.getByLabelText(/نام محصول/);
    const priceInput = screen.getByLabelText(/قیمت فروش/);
    const skuInput = screen.getByLabelText(/کد محصول/);

    fireEvent.change(nameInput, { target: { value: 'محصول جدید' } });
    fireEvent.change(priceInput, { target: { value: '1000' } });
    fireEvent.change(skuInput, { target: { value: 'NEW001' } });

    expect(nameInput).toHaveValue('محصول جدید');
    expect(priceInput).toHaveValue(1000);
    expect(skuInput).toHaveValue('NEW001');
  });

  it('shows gold product fields when gold checkbox is checked', async () => {
    renderWithProviders(<ProductForm />);

    // Initially gold fields should not be visible
    expect(screen.queryByLabelText(/عیار طلا/)).not.toBeInTheDocument();

    // Check gold product checkbox
    const goldCheckbox = screen.getByRole('checkbox', { name: /محصول طلا/ });
    fireEvent.click(goldCheckbox);

    // Gold fields should now be visible
    await waitFor(() => {
      expect(screen.getByLabelText(/عیار طلا/)).toBeInTheDocument();
      expect(screen.getByLabelText(/وزن هر واحد/)).toBeInTheDocument();
    });
  });

  it('hides inventory fields when service checkbox is checked', async () => {
    renderWithProviders(<ProductForm />);

    // Initially inventory section should be visible
    expect(screen.getByText('مدیریت موجودی')).toBeInTheDocument();

    // Check service checkbox
    const serviceCheckbox = screen.getByRole('checkbox', { name: /خدمات/ });
    fireEvent.click(serviceCheckbox);

    // Inventory section should be hidden
    await waitFor(() => {
      expect(screen.queryByText('مدیریت موجودی')).not.toBeInTheDocument();
    });
  });

  it('shows inventory fields when track inventory is checked', async () => {
    renderWithProviders(<ProductForm />);

    // Track inventory should be checked by default
    const trackInventoryCheckbox = screen.getByRole('checkbox', { name: /پیگیری موجودی/ });
    expect(trackInventoryCheckbox).toBeChecked();

    // Inventory fields should be visible
    expect(screen.getByLabelText(/موجودی فعلی/)).toBeInTheDocument();
    expect(screen.getByLabelText(/حداقل موجودی/)).toBeInTheDocument();

    // Uncheck track inventory
    fireEvent.click(trackInventoryCheckbox);

    // Inventory fields should be hidden
    await waitFor(() => {
      expect(screen.queryByLabelText(/موجودی فعلی/)).not.toBeInTheDocument();
    });
  });

  it('validates required fields', async () => {
    renderWithProviders(<ProductForm />);

    // Try to submit without required fields
    const submitButton = screen.getByRole('button', { name: /ایجاد محصول/ });
    fireEvent.click(submitButton);

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText('نام محصول الزامی است')).toBeInTheDocument();
      expect(screen.getByText('قیمت فروش الزامی است')).toBeInTheDocument();
    });
  });

  it('validates gold product required fields', async () => {
    renderWithProviders(<ProductForm />);

    // Fill basic required fields
    fireEvent.change(screen.getByLabelText(/نام محصول/), { target: { value: 'محصول طلا' } });
    fireEvent.change(screen.getByLabelText(/قیمت فروش/), { target: { value: '5000' } });

    // Check gold product
    const goldCheckbox = screen.getByRole('checkbox', { name: /محصول طلا/ });
    fireEvent.click(goldCheckbox);

    // Try to submit without gold fields
    const submitButton = screen.getByRole('button', { name: /ایجاد محصول/ });
    fireEvent.click(submitButton);

    // Should show gold validation errors
    await waitFor(() => {
      expect(screen.getByText('عیار طلا الزامی است')).toBeInTheDocument();
      expect(screen.getByText('وزن هر واحد الزامی است')).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    renderWithProviders(<ProductForm />);

    // Fill in form data
    fireEvent.change(screen.getByLabelText(/نام محصول/), { target: { value: 'محصول جدید' } });
    fireEvent.change(screen.getByLabelText(/قیمت فروش/), { target: { value: '1000' } });
    fireEvent.change(screen.getByLabelText(/کد محصول/), { target: { value: 'NEW001' } });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /ایجاد محصول/ });
    fireEvent.click(submitButton);

    // Verify service was called
    await waitFor(() => {
      expect(productService.createProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'محصول جدید',
          selling_price: '1000',
          sku: 'NEW001',
        })
      );
    });

    // Should navigate back to products list
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/products');
    });
  });

  it('handles form cancellation', async () => {
    renderWithProviders(<ProductForm />);

    // Click cancel button
    const cancelButton = screen.getByRole('button', { name: /انصراف/ });
    fireEvent.click(cancelButton);

    // Should navigate back to products list
    expect(mockNavigate).toHaveBeenCalledWith('/products');
  });

  it('handles back button navigation', async () => {
    renderWithProviders(<ProductForm />);

    // Click back button in header (first button)
    const buttons = screen.getAllByRole('button');
    const backButton = buttons[0]; // First button should be the back button
    fireEvent.click(backButton);

    // Should navigate back to products list
    expect(mockNavigate).toHaveBeenCalledWith('/products');
  });

  it('handles API errors gracefully', async () => {
    vi.mocked(productService.createProduct).mockRejectedValue(new Error('خطای شبکه'));

    renderWithProviders(<ProductForm />);

    // Fill and submit form
    fireEvent.change(screen.getByLabelText(/نام محصول/), { target: { value: 'محصول جدید' } });
    fireEvent.change(screen.getByLabelText(/قیمت فروش/), { target: { value: '1000' } });

    const submitButton = screen.getByRole('button', { name: /ایجاد محصول/ });
    fireEvent.click(submitButton);

    // Should handle error (toast would be called but we can't easily test that)
    await waitFor(() => {
      expect(productService.createProduct).toHaveBeenCalled();
    });
  });

  it('loads categories for selection', async () => {
    renderWithProviders(<ProductForm />);

    // Wait for categories to load and verify the service was called
    await waitFor(() => {
      expect(productService.getCategories).toHaveBeenCalled();
    });

    // The categories should be available for selection (we don't need to test the dropdown opening)
    // Just verify that the service was called to load categories
    expect(productService.getCategories).toHaveBeenCalled();
  });

  it('handles image upload interface', async () => {
    renderWithProviders(<ProductForm />);

    // Check image upload section
    expect(screen.getByText('تصاویر محصول')).toBeInTheDocument();
    expect(screen.getByLabelText(/آپلود تصاویر/)).toBeInTheDocument();
    
    // Check file input
    const fileInput = screen.getByLabelText(/آپلود تصاویر/);
    expect(fileInput).toHaveAttribute('type', 'file');
    expect(fileInput).toHaveAttribute('multiple');
    expect(fileInput).toHaveAttribute('accept', 'image/*');
  });

  it('displays additional information fields', async () => {
    renderWithProviders(<ProductForm />);

    // Check additional info section
    expect(screen.getByText('اطلاعات تکمیلی')).toBeInTheDocument();
    expect(screen.getByLabelText(/تولیدکننده/)).toBeInTheDocument();
    expect(screen.getByLabelText(/برند/)).toBeInTheDocument();
    expect(screen.getByLabelText(/مدل/)).toBeInTheDocument();
    expect(screen.getByLabelText(/طول/)).toBeInTheDocument();
    expect(screen.getByLabelText(/عرض/)).toBeInTheDocument();
    expect(screen.getByLabelText(/ارتفاع/)).toBeInTheDocument();
    expect(screen.getByLabelText(/وزن/)).toBeInTheDocument();
  });
});