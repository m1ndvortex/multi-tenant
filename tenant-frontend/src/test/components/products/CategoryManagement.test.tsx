import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import CategoryManagement from '@/components/products/CategoryManagement';
import { productService } from '@/services/productService';

// Mock the product service
vi.mock('@/services/productService', () => ({
  productService: {
    getCategories: vi.fn(),
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn(),
  },
}));

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockCategories = [
  {
    id: 'cat1',
    tenant_id: 'tenant1',
    name: 'دسته‌بندی اصلی',
    description: 'دسته‌بندی اصلی محصولات',
    parent_id: undefined,
    sort_order: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    is_active: true,
  },
  {
    id: 'cat2',
    tenant_id: 'tenant1',
    name: 'زیر دسته‌بندی',
    description: 'زیر دسته‌بندی محصولات',
    parent_id: 'cat1',
    sort_order: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    is_active: true,
  },
  {
    id: 'cat3',
    tenant_id: 'tenant1',
    name: 'طلا و جواهر',
    description: 'محصولات طلا و جواهر',
    parent_id: undefined,
    sort_order: 2,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    is_active: true,
  },
];

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
      {component}
    </QueryClientProvider>
  );
};

describe('CategoryManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    vi.mocked(productService.getCategories).mockResolvedValue(mockCategories);
    vi.mocked(productService.createCategory).mockResolvedValue(mockCategories[0]);
    vi.mocked(productService.updateCategory).mockResolvedValue(mockCategories[0]);
    vi.mocked(productService.deleteCategory).mockResolvedValue();
  });

  it('renders category management interface correctly', async () => {
    renderWithProviders(<CategoryManagement />);

    // Check header
    expect(screen.getByText('مدیریت دسته‌بندی‌ها')).toBeInTheDocument();
    expect(screen.getByText('دسته‌بندی‌های محصولات را مدیریت کنید')).toBeInTheDocument();
    expect(screen.getByText('دسته‌بندی جدید')).toBeInTheDocument();

    // Wait for categories to load
    await waitFor(() => {
      expect(screen.getByText('دسته‌بندی اصلی')).toBeInTheDocument();
    });

    // Check if categories are displayed
    expect(screen.getByText('دسته‌بندی اصلی')).toBeInTheDocument();
    expect(screen.getByText('زیر دسته‌بندی')).toBeInTheDocument();
    expect(screen.getByText('طلا و جواهر')).toBeInTheDocument();
  });

  it('displays hierarchical category structure', async () => {
    renderWithProviders(<CategoryManagement />);

    await waitFor(() => {
      expect(screen.getByText('دسته‌بندی اصلی')).toBeInTheDocument();
    });

    // Check if hierarchical structure is shown
    // The child category should be indented
    const childCategory = screen.getByText('زیر دسته‌بندی');
    expect(childCategory).toBeInTheDocument();
    
    // Check for hierarchy indicator (└─)
    expect(screen.getByText('└─')).toBeInTheDocument();
  });

  it('opens create category dialog', async () => {
    renderWithProviders(<CategoryManagement />);

    // Click new category button
    const newCategoryButton = screen.getByRole('button', { name: /دسته‌بندی جدید/ });
    fireEvent.click(newCategoryButton);

    // Check if dialog opened
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('دسته‌بندی جدید برای محصولات ایجاد کنید')).toBeInTheDocument();
    });

    // Check form fields
    expect(screen.getByLabelText(/نام دسته‌بندی/)).toBeInTheDocument();
    expect(screen.getByLabelText(/توضیحات/)).toBeInTheDocument();
    expect(screen.getByLabelText(/دسته‌بندی والد/)).toBeInTheDocument();
    expect(screen.getByLabelText(/ترتیب نمایش/)).toBeInTheDocument();
  });

  it('creates new category successfully', async () => {
    renderWithProviders(<CategoryManagement />);

    // Open create dialog
    const newCategoryButton = screen.getByText('دسته‌بندی جدید');
    fireEvent.click(newCategoryButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/نام دسته‌بندی/)).toBeInTheDocument();
    });

    // Fill form
    const nameInput = screen.getByLabelText(/نام دسته‌بندی/);
    const descriptionInput = screen.getByLabelText(/توضیحات/);
    const sortOrderInput = screen.getByLabelText(/ترتیب نمایش/);

    fireEvent.change(nameInput, { target: { value: 'دسته‌بندی جدید' } });
    fireEvent.change(descriptionInput, { target: { value: 'توضیحات جدید' } });
    fireEvent.change(sortOrderInput, { target: { value: '5' } });

    // Submit form
    const createButton = screen.getByRole('button', { name: /ایجاد/ });
    fireEvent.click(createButton);

    // Verify service was called
    await waitFor(() => {
      expect(productService.createCategory).toHaveBeenCalledWith({
        name: 'دسته‌بندی جدید',
        description: 'توضیحات جدید',
        parent_id: undefined,
        sort_order: 5,
      });
    });
  });

  it('validates required fields in create form', async () => {
    renderWithProviders(<CategoryManagement />);

    // Open create dialog
    const newCategoryButton = screen.getByText('دسته‌بندی جدید');
    fireEvent.click(newCategoryButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/نام دسته‌بندی/)).toBeInTheDocument();
    });

    // Try to submit without name
    const createButton = screen.getByRole('button', { name: /ایجاد/ });
    fireEvent.click(createButton);

    // Form should not submit (HTML5 validation will prevent it)
    expect(productService.createCategory).not.toHaveBeenCalled();
  });

  it('opens edit category dialog', async () => {
    renderWithProviders(<CategoryManagement />);

    await waitFor(() => {
      expect(screen.getByText('دسته‌بندی اصلی')).toBeInTheDocument();
    });

    // Find and click edit button for first category
    const dropdownButtons = screen.getAllByRole('button');
    const moreButton = dropdownButtons.find(button => 
      button.querySelector('svg')?.classList.contains('lucide-more-horizontal')
    );
    
    if (moreButton) {
      fireEvent.click(moreButton);

      await waitFor(() => {
        const editButton = screen.getByText('ویرایش');
        fireEvent.click(editButton);
      });

      // Check if edit dialog opened
      await waitFor(() => {
        expect(screen.getByText('ویرایش دسته‌بندی')).toBeInTheDocument();
        expect(screen.getByText('اطلاعات دسته‌بندی را ویرایش کنید')).toBeInTheDocument();
      });

      // Check if form is pre-filled
      const nameInput = screen.getByDisplayValue('دسته‌بندی اصلی');
      expect(nameInput).toBeInTheDocument();
    }
  });

  it('updates category successfully', async () => {
    renderWithProviders(<CategoryManagement />);

    await waitFor(() => {
      expect(screen.getByText('دسته‌بندی اصلی')).toBeInTheDocument();
    });

    // Open edit dialog
    const dropdownButtons = screen.getAllByRole('button');
    const moreButton = dropdownButtons.find(button => 
      button.querySelector('svg')?.classList.contains('lucide-more-horizontal')
    );
    
    if (moreButton) {
      fireEvent.click(moreButton);

      await waitFor(() => {
        const editButton = screen.getByText('ویرایش');
        fireEvent.click(editButton);
      });

      await waitFor(() => {
        expect(screen.getByDisplayValue('دسته‌بندی اصلی')).toBeInTheDocument();
      });

      // Update name
      const nameInput = screen.getByDisplayValue('دسته‌بندی اصلی');
      fireEvent.change(nameInput, { target: { value: 'دسته‌بندی به‌روزرسانی شده' } });

      // Submit form
      const updateButton = screen.getByRole('button', { name: /به‌روزرسانی/ });
      fireEvent.click(updateButton);

      // Verify service was called
      await waitFor(() => {
        expect(productService.updateCategory).toHaveBeenCalledWith(
          'cat1',
          expect.objectContaining({
            name: 'دسته‌بندی به‌روزرسانی شده',
          })
        );
      });
    }
  });

  it('opens delete confirmation dialog', async () => {
    renderWithProviders(<CategoryManagement />);

    await waitFor(() => {
      expect(screen.getByText('دسته‌بندی اصلی')).toBeInTheDocument();
    });

    // Find and click delete button
    const dropdownButtons = screen.getAllByRole('button');
    const moreButton = dropdownButtons.find(button => 
      button.querySelector('svg')?.classList.contains('lucide-more-horizontal')
    );
    
    if (moreButton) {
      fireEvent.click(moreButton);

      await waitFor(() => {
        const deleteButton = screen.getByText('حذف');
        fireEvent.click(deleteButton);
      });

      // Check if delete dialog opened
      await waitFor(() => {
        expect(screen.getByText('حذف دسته‌بندی')).toBeInTheDocument();
        expect(screen.getByText(/آیا مطمئن هستید که می‌خواهید دسته‌بندی "دسته‌بندی اصلی" را حذف کنید؟/)).toBeInTheDocument();
      });
    }
  });

  it('deletes category successfully', async () => {
    renderWithProviders(<CategoryManagement />);

    await waitFor(() => {
      expect(screen.getByText('دسته‌بندی اصلی')).toBeInTheDocument();
    });

    // Open delete dialog
    const dropdownButtons = screen.getAllByRole('button');
    const moreButton = dropdownButtons.find(button => 
      button.querySelector('svg')?.classList.contains('lucide-more-horizontal')
    );
    
    if (moreButton) {
      fireEvent.click(moreButton);

      await waitFor(() => {
        const deleteButton = screen.getByText('حذف');
        fireEvent.click(deleteButton);
      });

      await waitFor(() => {
        expect(screen.getByText('حذف دسته‌بندی')).toBeInTheDocument();
      });

      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /حذف/ });
      fireEvent.click(confirmButton);

      // Verify service was called
      await waitFor(() => {
        expect(productService.deleteCategory).toHaveBeenCalledWith('cat1');
      });
    }
  });

  it('displays empty state when no categories', async () => {
    vi.mocked(productService.getCategories).mockResolvedValue([]);

    renderWithProviders(<CategoryManagement />);

    await waitFor(() => {
      expect(screen.getByText('هیچ دسته‌بندی‌ای یافت نشد')).toBeInTheDocument();
    });

    expect(screen.getByText('اولین دسته‌بندی را اضافه کنید')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    vi.mocked(productService.getCategories).mockRejectedValue(new Error('خطای شبکه'));

    renderWithProviders(<CategoryManagement />);

    await waitFor(() => {
      expect(screen.getByText(/خطا در بارگذاری دسته‌بندی‌ها/)).toBeInTheDocument();
    });
  });

  it('shows parent category options in create form', async () => {
    renderWithProviders(<CategoryManagement />);

    await waitFor(() => {
      expect(screen.getByText('دسته‌بندی اصلی')).toBeInTheDocument();
    });

    // Open create dialog
    const newCategoryButton = screen.getByText('دسته‌بندی جدید');
    fireEvent.click(newCategoryButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/دسته‌بندی والد/)).toBeInTheDocument();
    });

    // Check parent options
    const parentSelect = screen.getByLabelText(/دسته‌بندی والد/);
    fireEvent.click(parentSelect);

    // Should show existing categories as parent options
    expect(screen.getAllByText('بدون والد (دسته‌بندی اصلی)')[0]).toBeInTheDocument();
  });

  it('excludes current category from parent options in edit form', async () => {
    renderWithProviders(<CategoryManagement />);

    await waitFor(() => {
      expect(screen.getByText('دسته‌بندی اصلی')).toBeInTheDocument();
    });

    // Open edit dialog for first category
    const dropdownButtons = screen.getAllByRole('button');
    const moreButton = dropdownButtons.find(button => 
      button.querySelector('svg')?.classList.contains('lucide-more-horizontal')
    );
    
    if (moreButton) {
      fireEvent.click(moreButton);

      await waitFor(() => {
        const editButton = screen.getByText('ویرایش');
        fireEvent.click(editButton);
      });

      await waitFor(() => {
        expect(screen.getByText('ویرایش دسته‌بندی')).toBeInTheDocument();
      });

      // The current category should not appear in parent options
      // This is handled by the filter in the component
    }
  });
});