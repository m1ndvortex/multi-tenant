import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import InvoiceList from '@/components/invoices/InvoiceList';
import { Invoice } from '@/services/invoiceService';
import { Customer } from '@/services/customerService';

// Mock the UI components that might be missing
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div data-testid="card-content" {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div data-testid="card-header" {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h3 data-testid="card-title" {...props}>{children}</h3>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} data-testid="button" {...props}>{children}</button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input data-testid="input" {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: any) => <label data-testid="label" {...props}>{children}</label>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, ...props }: any) => (
    <div data-testid="select" {...props}>
      <select onChange={(e) => onValueChange?.(e.target.value)}>
        {children}
      </select>
    </div>
  ),
  SelectContent: ({ children, ...props }: any) => <div data-testid="select-content" {...props}>{children}</div>,
  SelectItem: ({ children, value, ...props }: any) => (
    <option value={value} data-testid="select-item" {...props}>{children}</option>
  ),
  SelectTrigger: ({ children, ...props }: any) => <div data-testid="select-trigger" {...props}>{children}</div>,
  SelectValue: ({ placeholder, ...props }: any) => <span data-testid="select-value" {...props}>{placeholder}</span>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: any) => <span data-testid="badge" {...props}>{children}</span>,
}));

vi.mock('@/components/ui/table', () => ({
  Table: ({ children, ...props }: any) => <table data-testid="table" {...props}>{children}</table>,
  TableBody: ({ children, ...props }: any) => <tbody data-testid="table-body" {...props}>{children}</tbody>,
  TableCell: ({ children, ...props }: any) => <td data-testid="table-cell" {...props}>{children}</td>,
  TableHead: ({ children, ...props }: any) => <th data-testid="table-head" {...props}>{children}</th>,
  TableHeader: ({ children, ...props }: any) => <thead data-testid="table-header" {...props}>{children}</thead>,
  TableRow: ({ children, ...props }: any) => <tr data-testid="table-row" {...props}>{children}</tr>,
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
];

const mockInvoices: Invoice[] = [
  {
    id: '1',
    tenant_id: 'tenant1',
    customer_id: '1',
    invoice_number: 'INV-001',
    invoice_type: 'GENERAL',
    installment_type: 'NONE',
    subtotal: 2000000,
    tax_amount: 200000,
    total_amount: 2200000,
    discount_amount: 0,
    qr_code_token: 'qr123',
    is_shareable: true,
    status: 'sent',
    due_date: '2024-02-01',
    notes: 'فاکتور تست',
    customer_notes: 'یادداشت مشتری',
    terms_and_conditions: 'شرایط و ضوابط',
    customer_name: 'احمد محمدی',
    customer_phone: '09123456789',
    items: [
      {
        id: '1',
        description: 'محصول تست',
        quantity: 2,
        unit_price: 1000000,
        line_total: 2000000,
        tax_rate: 10,
      },
    ],
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:00Z',
    is_active: true,
  },
  {
    id: '2',
    tenant_id: 'tenant1',
    customer_id: '1',
    invoice_number: 'INV-002',
    invoice_type: 'GOLD',
    installment_type: 'GOLD',
    subtotal: 15000000,
    tax_amount: 0,
    total_amount: 15000000,
    total_gold_weight: 5.5,
    gold_price_at_creation: 2500000,
    remaining_gold_weight: 2.5,
    qr_code_token: 'qr456',
    is_shareable: true,
    status: 'paid',
    customer_name: 'احمد محمدی',
    customer_phone: '09123456789',
    items: [
      {
        id: '2',
        description: 'گردنبند طلا',
        quantity: 1,
        unit_price: 0,
        line_total: 15000000,
        weight: 5.5,
        labor_fee: 500000,
        profit: 1000000,
        vat_amount: 0,
        gold_purity: 18,
      },
    ],
    created_at: '2024-01-02T10:00:00Z',
    updated_at: '2024-01-02T10:00:00Z',
    is_active: true,
  },
  {
    id: '3',
    tenant_id: 'tenant1',
    customer_id: '1',
    invoice_number: 'INV-003',
    invoice_type: 'GENERAL',
    installment_type: 'NONE',
    subtotal: 1000000,
    tax_amount: 100000,
    total_amount: 1100000,
    qr_code_token: 'qr789',
    is_shareable: true,
    status: 'overdue',
    due_date: '2024-01-15',
    customer_name: 'احمد محمدی',
    customer_phone: '09123456789',
    items: [
      {
        id: '3',
        description: 'خدمات مشاوره',
        quantity: 1,
        unit_price: 1000000,
        line_total: 1000000,
        tax_rate: 10,
      },
    ],
    created_at: '2024-01-03T10:00:00Z',
    updated_at: '2024-01-03T10:00:00Z',
    is_active: true,
  },
];

describe('InvoiceList', () => {
  const mockHandlers = {
    onSearch: vi.fn(),
    onPageChange: vi.fn(),
    onView: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onSend: vi.fn(),
    onDownloadPDF: vi.fn(),
    onGenerateQR: vi.fn(),
    onCreateNew: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderInvoiceList = (props = {}) => {
    return render(
      <InvoiceList
        invoices={mockInvoices}
        customers={mockCustomers}
        total={mockInvoices.length}
        page={1}
        perPage={20}
        isLoading={false}
        {...mockHandlers}
        {...props}
      />
    );
  };

  describe('Header and Navigation', () => {
    it('should render header with title and create button', () => {
      renderInvoiceList();
      
      expect(screen.getByText('مدیریت فاکتورها')).toBeInTheDocument();
      expect(screen.getByText('فاکتور جدید')).toBeInTheDocument();
    });

    it('should call onCreateNew when create button is clicked', async () => {
      const user = userEvent.setup();
      renderInvoiceList();
      
      const createButton = screen.getByText('فاکتور جدید');
      await user.click(createButton);
      
      expect(mockHandlers.onCreateNew).toHaveBeenCalled();
    });
  });

  describe('Filters', () => {
    it('should render all filter fields', () => {
      renderInvoiceList();
      
      expect(screen.getByPlaceholderText('شماره فاکتور، نام مشتری...')).toBeInTheDocument();
      expect(screen.getByText('همه انواع')).toBeInTheDocument();
      expect(screen.getByText('همه وضعیت‌ها')).toBeInTheDocument();
      expect(screen.getByText('همه مشتریان')).toBeInTheDocument();
    });

    it('should call onSearch when search input changes', async () => {
      const user = userEvent.setup();
      renderInvoiceList();
      
      const searchInput = screen.getByPlaceholderText('شماره فاکتور، نام مشتری...');
      await user.type(searchInput, 'INV-001');
      
      await waitFor(() => {
        expect(mockHandlers.onSearch).toHaveBeenCalledWith(
          expect.objectContaining({
            query: 'INV-001',
            page: 1,
          })
        );
      });
    });

    it('should call onSearch when invoice type filter changes', async () => {
      const user = userEvent.setup();
      renderInvoiceList();
      
      const typeSelect = screen.getByDisplayValue('همه انواع');
      await user.click(typeSelect);
      
      const goldOption = screen.getByText('طلا');
      await user.click(goldOption);
      
      expect(mockHandlers.onSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          invoice_type: 'GOLD',
          page: 1,
        })
      );
    });

    it('should call onSearch when status filter changes', async () => {
      const user = userEvent.setup();
      renderInvoiceList();
      
      const statusSelect = screen.getByDisplayValue('همه وضعیت‌ها');
      await user.click(statusSelect);
      
      const paidOption = screen.getByText('پرداخت شده');
      await user.click(paidOption);
      
      expect(mockHandlers.onSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'paid',
          page: 1,
        })
      );
    });

    it('should show additional filters when filter button is clicked', async () => {
      const user = userEvent.setup();
      renderInvoiceList();
      
      const filterButton = screen.getByText('فیلترهای بیشتر');
      await user.click(filterButton);
      
      expect(screen.getByText('از تاریخ')).toBeInTheDocument();
      expect(screen.getByText('تا تاریخ')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('حداقل مبلغ (ریال)')).toBeInTheDocument();
    });
  });

  describe('Invoice Table', () => {
    it('should render table headers', () => {
      renderInvoiceList();
      
      expect(screen.getByText('شماره فاکتور')).toBeInTheDocument();
      expect(screen.getAllByText('مشتری')).toHaveLength(2); // 1 in table header + 1 in filter label
      expect(screen.getByText('نوع')).toBeInTheDocument();
      expect(screen.getByText('مبلغ')).toBeInTheDocument();
      expect(screen.getByText('وضعیت')).toBeInTheDocument();
      expect(screen.getByText('تاریخ')).toBeInTheDocument();
      expect(screen.getByText('عملیات')).toBeInTheDocument();
    });

    it('should render invoice data correctly', () => {
      renderInvoiceList();
      
      // Check invoice numbers
      expect(screen.getByText('INV-001')).toBeInTheDocument();
      expect(screen.getByText('INV-002')).toBeInTheDocument();
      expect(screen.getByText('INV-003')).toBeInTheDocument();
      
      // Check customer names (appears in table rows and filter dropdown)
      expect(screen.getAllByText('احمد محمدی')).toHaveLength(4);
      
      // Check amounts
      expect(screen.getByText('2,200,000 ریال')).toBeInTheDocument();
      expect(screen.getByText('15,000,000 ریال')).toBeInTheDocument();
      expect(screen.getByText('1,100,000 ریال')).toBeInTheDocument();
    });

    it('should show correct invoice type badges', () => {
      renderInvoiceList();
      
      expect(screen.getAllByText('عمومی')).toHaveLength(3); // 2 in table + 1 in filter dropdown
      expect(screen.getByText('طلا')).toBeInTheDocument();
    });

    it('should show correct status badges', () => {
      renderInvoiceList();
      
      expect(screen.getAllByText('ارسال شده')).toHaveLength(2); // 1 in table + 1 in filter dropdown
      expect(screen.getByText('پرداخت شده')).toBeInTheDocument();
      expect(screen.getByText('سررسید گذشته')).toBeInTheDocument();
    });

    it('should show gold weight for gold invoices', () => {
      renderInvoiceList();
      
      expect(screen.getByText('5.500 گرم')).toBeInTheDocument();
    });

    it('should show due dates when available', () => {
      renderInvoiceList();
      
      // Note: Dates will be formatted in Persian calendar
      expect(screen.getAllByText(/سررسید:/)).toHaveLength(2); // Multiple invoices with due dates
    });
  });

  describe('Action Buttons', () => {
    it('should render all action buttons for each invoice', () => {
      renderInvoiceList();
      
      // Each invoice should have 6 action buttons
      const viewButtons = screen.getAllByTitle('مشاهده');
      const editButtons = screen.getAllByTitle('ویرایش');
      const sendButtons = screen.getAllByTitle('ارسال');
      const downloadButtons = screen.getAllByTitle('دانلود PDF');
      const qrButtons = screen.getAllByTitle('QR Code');
      const deleteButtons = screen.getAllByTitle('حذف');
      
      expect(viewButtons).toHaveLength(3);
      expect(editButtons).toHaveLength(3);
      expect(sendButtons).toHaveLength(3);
      expect(downloadButtons).toHaveLength(3);
      expect(qrButtons).toHaveLength(3);
      expect(deleteButtons).toHaveLength(3);
    });

    it('should call onView when view button is clicked', async () => {
      const user = userEvent.setup();
      renderInvoiceList();
      
      const viewButtons = screen.getAllByTitle('مشاهده');
      await user.click(viewButtons[0]);
      
      expect(mockHandlers.onView).toHaveBeenCalledWith(mockInvoices[0]);
    });

    it('should call onEdit when edit button is clicked', async () => {
      const user = userEvent.setup();
      renderInvoiceList();
      
      const editButtons = screen.getAllByTitle('ویرایش');
      await user.click(editButtons[0]);
      
      expect(mockHandlers.onEdit).toHaveBeenCalledWith(mockInvoices[0]);
    });

    it('should call onSend when send button is clicked', async () => {
      const user = userEvent.setup();
      renderInvoiceList();
      
      const sendButtons = screen.getAllByTitle('ارسال');
      await user.click(sendButtons[0]);
      
      expect(mockHandlers.onSend).toHaveBeenCalledWith(mockInvoices[0]);
    });

    it('should call onDownloadPDF when download button is clicked', async () => {
      const user = userEvent.setup();
      renderInvoiceList();
      
      const downloadButtons = screen.getAllByTitle('دانلود PDF');
      await user.click(downloadButtons[0]);
      
      expect(mockHandlers.onDownloadPDF).toHaveBeenCalledWith(mockInvoices[0]);
    });

    it('should call onGenerateQR when QR button is clicked', async () => {
      const user = userEvent.setup();
      renderInvoiceList();
      
      const qrButtons = screen.getAllByTitle('QR Code');
      await user.click(qrButtons[0]);
      
      expect(mockHandlers.onGenerateQR).toHaveBeenCalledWith(mockInvoices[0]);
    });

    it('should call onDelete when delete button is clicked', async () => {
      const user = userEvent.setup();
      renderInvoiceList();
      
      const deleteButtons = screen.getAllByTitle('حذف');
      await user.click(deleteButtons[0]);
      
      expect(mockHandlers.onDelete).toHaveBeenCalledWith(mockInvoices[0]);
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no invoices', () => {
      renderInvoiceList({ invoices: [] });
      
      expect(screen.getByText('هیچ فاکتوری یافت نشد')).toBeInTheDocument();
      expect(screen.getByText('ایجاد اولین فاکتور')).toBeInTheDocument();
    });

    it('should call onCreateNew from empty state button', async () => {
      const user = userEvent.setup();
      renderInvoiceList({ invoices: [] });
      
      const createButton = screen.getByText('ایجاد اولین فاکتور');
      await user.click(createButton);
      
      expect(mockHandlers.onCreateNew).toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when isLoading is true', () => {
      renderInvoiceList({ isLoading: true });
      
      expect(screen.getByText('در حال بارگیری...')).toBeInTheDocument();
      expect(screen.getByText('در حال بارگیری...')).toBeInTheDocument(); // Loading text
    });
  });

  describe('Pagination', () => {
    it('should show pagination when total exceeds perPage', () => {
      renderInvoiceList({ total: 50, perPage: 20 });
      
      expect(screen.getByText('نمایش 1 تا 20 از 50 فاکتور')).toBeInTheDocument();
      expect(screen.getByText('صفحه 1 از 3')).toBeInTheDocument();
      expect(screen.getByText('قبلی')).toBeInTheDocument();
      expect(screen.getByText('بعدی')).toBeInTheDocument();
    });

    it('should not show pagination when total is less than perPage', () => {
      renderInvoiceList({ total: 3, perPage: 20 });
      
      expect(screen.queryByText('قبلی')).not.toBeInTheDocument();
      expect(screen.queryByText('بعدی')).not.toBeInTheDocument();
    });

    it('should call onPageChange when next button is clicked', async () => {
      const user = userEvent.setup();
      renderInvoiceList({ total: 50, perPage: 20, page: 1 });
      
      const nextButton = screen.getByText('بعدی');
      await user.click(nextButton);
      
      expect(mockHandlers.onPageChange).toHaveBeenCalledWith(2);
    });

    it('should call onPageChange when previous button is clicked', async () => {
      const user = userEvent.setup();
      renderInvoiceList({ total: 50, perPage: 20, page: 2 });
      
      const prevButton = screen.getByText('قبلی');
      await user.click(prevButton);
      
      expect(mockHandlers.onPageChange).toHaveBeenCalledWith(1);
    });

    it('should disable previous button on first page', () => {
      renderInvoiceList({ total: 50, perPage: 20, page: 1 });
      
      const prevButton = screen.getByText('قبلی');
      expect(prevButton).toBeDisabled();
    });

    it('should disable next button on last page', () => {
      renderInvoiceList({ total: 50, perPage: 20, page: 3 });
      
      const nextButton = screen.getByText('بعدی');
      expect(nextButton).toBeDisabled();
    });
  });

  describe('Responsive Design', () => {
    it('should render properly on different screen sizes', () => {
      renderInvoiceList();
      
      // Check that the table is responsive
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
      
      // Check that filters are in a responsive grid
      const filterContainer = screen.getByText('جستجو').closest('.grid');
      expect(filterContainer).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-4');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      renderInvoiceList();
      
      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'شماره فاکتور' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'مشتری' })).toBeInTheDocument();
    });

    it('should have proper button titles for screen readers', () => {
      renderInvoiceList();
      
      expect(screen.getAllByTitle('مشاهده')).toHaveLength(3);
      expect(screen.getAllByTitle('ویرایش')).toHaveLength(3);
      expect(screen.getAllByTitle('حذف')).toHaveLength(3);
    });
  });
});