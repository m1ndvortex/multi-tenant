import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InvoiceDetail from '@/components/invoices/InvoiceDetail';
import { Invoice } from '@/services/invoiceService';

// Mock the UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <h3 data-testid="card-title">{children}</h3>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: any) => <span data-testid="badge" {...props}>{children}</span>,
}));

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: any) => <table data-testid="table">{children}</table>,
  TableBody: ({ children }: any) => <tbody data-testid="table-body">{children}</tbody>,
  TableCell: ({ children }: any) => <td data-testid="table-cell">{children}</td>,
  TableHead: ({ children }: any) => <th data-testid="table-head">{children}</th>,
  TableHeader: ({ children }: any) => <thead data-testid="table-header">{children}</thead>,
  TableRow: ({ children }: any) => <tr data-testid="table-row">{children}</tr>,
}));

vi.mock('@/components/ui/separator', () => ({
  Separator: (props: any) => <hr data-testid="separator" {...props} />,
}));

const mockGeneralInvoice: Invoice = {
  id: '1',
  tenant_id: 'tenant-1',
  customer_id: 'customer-1',
  invoice_number: 'INV-001',
  invoice_type: 'GENERAL',
  installment_type: 'NONE',
  subtotal: 1000000,
  tax_amount: 90000,
  total_amount: 1090000,
  discount_amount: 0,
  status: 'sent',
  is_shareable: true,
  customer_name: 'احمد محمدی',
  customer_phone: '09123456789',
  items: [
    {
      id: '1',
      description: 'محصول تست',
      quantity: 2,
      unit_price: 500000,
      line_total: 1000000,
    },
  ],
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  is_active: true,
};

const mockGoldInvoice: Invoice = {
  ...mockGeneralInvoice,
  id: '2',
  invoice_number: 'INV-002',
  invoice_type: 'GOLD',
  installment_type: 'GOLD',
  total_gold_weight: 15.5,
  gold_price_at_creation: 2500000,
  remaining_gold_weight: 5.2,
  items: [
    {
      id: '2',
      description: 'گردنبند طلا',
      quantity: 1,
      unit_price: 1000000,
      line_total: 1000000,
      weight: 15.5,
      labor_fee: 200000,
      profit: 150000,
      vat_amount: 90000,
    },
  ],
};

const mockProps = {
  onEdit: vi.fn(),
  onSend: vi.fn(),
  onDownloadPDF: vi.fn(),
  onGenerateQR: vi.fn(),
  onPrint: vi.fn(),
  onBack: vi.fn(),
};

describe('InvoiceDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders general invoice details correctly', () => {
    render(<InvoiceDetail invoice={mockGeneralInvoice} {...mockProps} />);

    // Check invoice header
    expect(screen.getByText('فاکتور INV-001')).toBeInTheDocument();
    expect(screen.getByText('فاکتور عمومی')).toBeInTheDocument();
    expect(screen.getByText('ارسال شده')).toBeInTheDocument();

    // Check customer information
    expect(screen.getByText('احمد محمدی')).toBeInTheDocument();
    expect(screen.getByText('09123456789')).toBeInTheDocument();

    // Check financial summary
    expect(screen.getAllByText('1,000,000 ریال')).toHaveLength(2); // Subtotal and item line total
    expect(screen.getByText('90,000 ریال')).toBeInTheDocument();
    expect(screen.getByText('1,090,000 ریال')).toBeInTheDocument();

    // Check invoice items
    expect(screen.getByText('محصول تست')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('500,000 ریال')).toBeInTheDocument();
  });

  it('renders gold invoice details correctly', () => {
    render(<InvoiceDetail invoice={mockGoldInvoice} {...mockProps} />);

    // Check invoice type
    expect(screen.getByText('فاکتور طلا')).toBeInTheDocument();

    // Check gold-specific information
    expect(screen.getByText('15.500 گرم')).toBeInTheDocument();
    expect(screen.getByText('2,500,000 ریال/گرم')).toBeInTheDocument();
    expect(screen.getByText('5.200 گرم')).toBeInTheDocument();

    // Check gold-specific item fields
    expect(screen.getByText('گردنبند طلا')).toBeInTheDocument();
    expect(screen.getByText('200,000 ریال')).toBeInTheDocument(); // Labor fee
    expect(screen.getByText('150,000 ریال')).toBeInTheDocument(); // Profit
  });

  it('handles action buttons correctly', () => {
    render(<InvoiceDetail invoice={mockGeneralInvoice} {...mockProps} />);

    // Test back button
    const backButton = screen.getByText('بازگشت');
    fireEvent.click(backButton);
    expect(mockProps.onBack).toHaveBeenCalledTimes(1);

    // Test edit button
    const editButton = screen.getByText('ویرایش');
    fireEvent.click(editButton);
    expect(mockProps.onEdit).toHaveBeenCalledTimes(1);

    // Test send button
    const sendButton = screen.getByText('ارسال');
    fireEvent.click(sendButton);
    expect(mockProps.onSend).toHaveBeenCalledTimes(1);

    // Test PDF download button
    const pdfButton = screen.getByText('PDF');
    fireEvent.click(pdfButton);
    expect(mockProps.onDownloadPDF).toHaveBeenCalledTimes(1);

    // Test print button
    const printButton = screen.getByText('چاپ');
    fireEvent.click(printButton);
    expect(mockProps.onPrint).toHaveBeenCalledTimes(1);

    // Test QR code button
    const qrButton = screen.getByText('QR Code');
    fireEvent.click(qrButton);
    expect(mockProps.onGenerateQR).toHaveBeenCalledTimes(1);
  });

  it('displays loading state correctly', () => {
    render(<InvoiceDetail invoice={mockGeneralInvoice} {...mockProps} isLoading={true} />);

    expect(screen.getByText('در حال بارگیری...')).toBeInTheDocument();
  });

  it('displays invoice status badges correctly', () => {
    const draftInvoice = { ...mockGeneralInvoice, status: 'draft' as const };
    const { rerender } = render(<InvoiceDetail invoice={draftInvoice} {...mockProps} />);
    expect(screen.getByText('پیش‌نویس')).toBeInTheDocument();

    const paidInvoice = { ...mockGeneralInvoice, status: 'paid' as const };
    rerender(<InvoiceDetail invoice={paidInvoice} {...mockProps} />);
    expect(screen.getByText('پرداخت شده')).toBeInTheDocument();

    const overdueInvoice = { ...mockGeneralInvoice, status: 'overdue' as const };
    rerender(<InvoiceDetail invoice={overdueInvoice} {...mockProps} />);
    expect(screen.getByText('سررسید گذشته')).toBeInTheDocument();
  });

  it('displays notes when available', () => {
    const invoiceWithNotes = {
      ...mockGeneralInvoice,
      notes: 'یادداشت داخلی تست',
      customer_notes: 'یادداشت مشتری تست',
      terms_and_conditions: 'شرایط و ضوابط تست',
    };

    render(<InvoiceDetail invoice={invoiceWithNotes} {...mockProps} />);

    expect(screen.getByText('یادداشت داخلی تست')).toBeInTheDocument();
    expect(screen.getByText('یادداشت مشتری تست')).toBeInTheDocument();
    expect(screen.getByText('شرایط و ضوابط تست')).toBeInTheDocument();
  });

  it('displays due date when available', () => {
    const invoiceWithDueDate = {
      ...mockGeneralInvoice,
      due_date: '2024-02-15',
    };

    render(<InvoiceDetail invoice={invoiceWithDueDate} {...mockProps} />);

    // Due date should be displayed in Persian format
    expect(screen.getByText('سررسید')).toBeInTheDocument();
  });

  it('displays installment type correctly', () => {
    const { rerender } = render(<InvoiceDetail invoice={mockGeneralInvoice} {...mockProps} />);
    expect(screen.getByText('نقدی')).toBeInTheDocument();

    const generalInstallmentInvoice = { ...mockGeneralInvoice, installment_type: 'GENERAL' as const };
    rerender(<InvoiceDetail invoice={generalInstallmentInvoice} {...mockProps} />);
    expect(screen.getByText('قسط عمومی')).toBeInTheDocument();

    const goldInstallmentInvoice = { ...mockGeneralInvoice, installment_type: 'GOLD' as const };
    rerender(<InvoiceDetail invoice={goldInstallmentInvoice} {...mockProps} />);
    expect(screen.getByText('قسط طلا')).toBeInTheDocument();
  });
});