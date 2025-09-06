import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import InvoiceCustomization from '@/components/settings/InvoiceCustomization';
import { invoiceCustomizationService } from '@/services/invoiceCustomizationService';

// Mock the service
vi.mock('@/services/invoiceCustomizationService', () => ({
  invoiceCustomizationService: {
    getTemplates: vi.fn(),
    getTemplate: vi.fn(),
    createTemplate: vi.fn(),
    updateTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
    getCustomFields: vi.fn(),
    createCustomField: vi.fn(),
    updateCustomField: vi.fn(),
    deleteCustomField: vi.fn(),
    getNumberingSchemes: vi.fn(),
    createNumberingScheme: vi.fn(),
    previewInvoiceNumbers: vi.fn(),
    getBrandingConfigs: vi.fn(),
    createBranding: vi.fn(),
    updateBranding: vi.fn(),
    deleteBranding: vi.fn(),
    uploadLogo: vi.fn(),
  },
}));

// Mock drag and drop
vi.mock('@hello-pangea/dnd', () => ({
  DragDropContext: ({ children }: any) => <div data-testid="drag-drop-context">{children}</div>,
  Droppable: ({ children }: any) => (
    <div data-testid="droppable">
      {children({ innerRef: vi.fn(), droppableProps: {}, placeholder: null }, {})}
    </div>
  ),
  Draggable: ({ children }: any) => (
    <div data-testid="draggable">
      {children({ innerRef: vi.fn(), draggableProps: {}, dragHandleProps: {} }, {})}
    </div>
  ),
}));

// Mock toast
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockTemplates = [
  {
    id: '1',
    tenant_id: 'tenant-1',
    name: 'قالب عمومی',
    description: 'قالب پیش‌فرض برای فاکتورهای عمومی',
    template_type: 'GENERAL' as const,
    is_active: true,
    is_default: true,
    layout_config: null,
    header_config: null,
    footer_config: null,
    item_table_config: null,
    branding_config: null,
    custom_css: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    tenant_id: 'tenant-1',
    name: 'قالب طلا',
    description: 'قالب مخصوص فاکتورهای طلا',
    template_type: 'GOLD' as const,
    is_active: true,
    is_default: false,
    layout_config: null,
    header_config: null,
    footer_config: null,
    item_table_config: null,
    branding_config: null,
    custom_css: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const mockCustomFields = [
  {
    id: '1',
    tenant_id: 'tenant-1',
    template_id: '1',
    field_name: 'custom_field_1',
    display_name: 'فیلد سفارشی 1',
    field_type: 'TEXT' as const,
    is_required: false,
    is_line_item_field: true,
    default_value: '',
    validation_rules: {},
    select_options: [],
    display_order: 0,
    column_width: '100px',
    is_visible_on_print: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const mockBrandingConfigs = [
  {
    id: '1',
    tenant_id: 'tenant-1',
    name: 'برندینگ پیش‌فرض',
    description: 'تنظیمات برندینگ پیش‌فرض',
    logo_url: null,
    logo_width: null,
    logo_height: null,
    primary_color: '#3B82F6',
    secondary_color: '#10B981',
    accent_color: '#F59E0B',
    text_color: '#1F2937',
    background_color: '#FFFFFF',
    font_family: 'Inter',
    header_font_size: '24px',
    body_font_size: '14px',
    company_name: 'شرکت نمونه',
    company_address: 'آدرس نمونه',
    company_phone: '021-12345678',
    company_email: 'info@example.com',
    company_website: 'https://example.com',
    tax_id: '123456789',
    is_active: true,
    is_default: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const mockNumberingSchemes = [
  {
    id: '1',
    tenant_id: 'tenant-1',
    template_id: '1',
    name: 'طرح شماره‌گذاری پیش‌فرض',
    description: 'طرح پیش‌فرض برای شماره‌گذاری فاکتورها',
    prefix: 'INV-',
    suffix: '',
    number_format: '{prefix}{year}{month:02d}{sequence:04d}{suffix}',
    current_sequence: 1,
    sequence_reset_frequency: 'YEARLY' as const,
    last_reset_date: null,
    is_active: true,
    is_default: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('InvoiceCustomization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    vi.mocked(invoiceCustomizationService.getTemplates).mockResolvedValue({
      templates: mockTemplates,
      total: mockTemplates.length,
      page: 1,
      per_page: 50,
    });
    
    vi.mocked(invoiceCustomizationService.getCustomFields).mockResolvedValue({
      custom_fields: mockCustomFields,
      total: mockCustomFields.length,
    });
    
    vi.mocked(invoiceCustomizationService.getBrandingConfigs).mockResolvedValue({
      branding_configs: mockBrandingConfigs,
      total: mockBrandingConfigs.length,
    });
    
    vi.mocked(invoiceCustomizationService.getNumberingSchemes).mockResolvedValue({
      numbering_schemes: mockNumberingSchemes,
      total: mockNumberingSchemes.length,
    });
  });

  describe('Component Rendering', () => {
    it('renders main invoice customization interface', async () => {
      renderWithQueryClient(<InvoiceCustomization />);

      expect(screen.getByText('سفارشی‌سازی فاکتور')).toBeInTheDocument();
      expect(screen.getByText('طراحی و تنظیم قالب‌های فاکتور، برندینگ و فیلدهای سفارشی')).toBeInTheDocument();
    });

    it('renders all customization tabs', async () => {
      renderWithQueryClient(<InvoiceCustomization />);

      expect(screen.getByText('قالب‌ها')).toBeInTheDocument();
      expect(screen.getByText('برندینگ')).toBeInTheDocument();
      expect(screen.getByText('فیلدهای سفارشی')).toBeInTheDocument();
      expect(screen.getByText('شماره‌گذاری')).toBeInTheDocument();
      expect(screen.getByText('پیش‌نمایش')).toBeInTheDocument();
    });

    it('shows templates tab by default', async () => {
      renderWithQueryClient(<InvoiceCustomization />);

      // Wait for templates to load
      await waitFor(() => {
        expect(screen.getByText('قالب‌های فاکتور')).toBeInTheDocument();
      });
    });
  });

  describe('Template Designer', () => {
    it('loads and displays templates', async () => {
      renderWithQueryClient(<InvoiceCustomization />);

      await waitFor(() => {
        expect(screen.getByText('قالب عمومی')).toBeInTheDocument();
        expect(screen.getByText('قالب طلا')).toBeInTheDocument();
      });

      expect(invoiceCustomizationService.getTemplates).toHaveBeenCalled();
    });

    it('allows creating new template', async () => {
      vi.mocked(invoiceCustomizationService.createTemplate).mockResolvedValue({
        ...mockTemplates[0],
        id: '3',
        name: 'قالب جدید',
      });

      renderWithQueryClient(<InvoiceCustomization />);

      await waitFor(() => {
        expect(screen.getByText('قالب‌های فاکتور')).toBeInTheDocument();
      });

      // Click new template button
      const newButton = screen.getByRole('button', { name: /جدید/i });
      fireEvent.click(newButton);

      // Fill form
      const nameInput = screen.getByLabelText(/نام قالب/i);
      fireEvent.change(nameInput, { target: { value: 'قالب جدید' } });

      // Submit form
      const createButton = screen.getByRole('button', { name: /ایجاد قالب/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(invoiceCustomizationService.createTemplate).toHaveBeenCalledWith({
          name: 'قالب جدید',
          description: '',
          template_type: 'GENERAL',
          is_active: true,
          is_default: false,
          layout_config: expect.any(Object),
        });
      });
    });

    it('shows drag and drop interface for layout elements', async () => {
      renderWithQueryClient(<InvoiceCustomization />);

      await waitFor(() => {
        expect(screen.getByText('قالب عمومی')).toBeInTheDocument();
      });

      // Click on a template to select it
      fireEvent.click(screen.getByText('قالب عمومی'));

      await waitFor(() => {
        expect(screen.getByTestId('drag-drop-context')).toBeInTheDocument();
        expect(screen.getByText('طراحی چیدمان قالب')).toBeInTheDocument();
      });
    });
  });

  describe('Branding Customization', () => {
    it('switches to branding tab and loads branding configs', async () => {
      renderWithQueryClient(<InvoiceCustomization />);

      // Switch to branding tab
      const brandingTab = screen.getByText('برندینگ');
      fireEvent.click(brandingTab);

      await waitFor(() => {
        expect(screen.getByText('تنظیمات برندینگ')).toBeInTheDocument();
        expect(screen.getByText('برندینگ پیش‌فرض')).toBeInTheDocument();
      });

      expect(invoiceCustomizationService.getBrandingConfigs).toHaveBeenCalled();
    });

    it('allows creating new branding configuration', async () => {
      vi.mocked(invoiceCustomizationService.createBranding).mockResolvedValue({
        ...mockBrandingConfigs[0],
        id: '2',
        name: 'برندینگ جدید',
      });

      renderWithQueryClient(<InvoiceCustomization />);

      // Switch to branding tab
      fireEvent.click(screen.getByText('برندینگ'));

      await waitFor(() => {
        expect(screen.getByText('تنظیمات برندینگ')).toBeInTheDocument();
      });

      // Click new branding button
      const newButton = screen.getByRole('button', { name: /جدید/i });
      fireEvent.click(newButton);

      // Fill form
      const nameInput = screen.getByLabelText(/نام تنظیمات/i);
      fireEvent.change(nameInput, { target: { value: 'برندینگ جدید' } });

      // Submit form
      const createButton = screen.getByRole('button', { name: /ایجاد/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(invoiceCustomizationService.createBranding).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'برندینگ جدید',
          })
        );
      });
    });

    it('shows color picker inputs for branding colors', async () => {
      renderWithQueryClient(<InvoiceCustomization />);

      // Switch to branding tab
      fireEvent.click(screen.getByText('برندینگ'));

      await waitFor(() => {
        expect(screen.getByText('برندینگ پیش‌فرض')).toBeInTheDocument();
      });

      // Select branding config
      fireEvent.click(screen.getByText('برندینگ پیش‌فرض'));

      await waitFor(() => {
        expect(screen.getByLabelText(/رنگ اصلی/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/رنگ فرعی/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/رنگ تاکیدی/i)).toBeInTheDocument();
      });
    });
  });

  describe('Custom Field Manager', () => {
    it('switches to custom fields tab and loads fields', async () => {
      renderWithQueryClient(<InvoiceCustomization />);

      // Switch to custom fields tab
      const customFieldsTab = screen.getByText('فیلدهای سفارشی');
      fireEvent.click(customFieldsTab);

      await waitFor(() => {
        expect(screen.getByText('مدیریت فیلدهای سفارشی')).toBeInTheDocument();
      });

      expect(invoiceCustomizationService.getTemplates).toHaveBeenCalled();
    });

    it('allows creating new custom field', async () => {
      vi.mocked(invoiceCustomizationService.createCustomField).mockResolvedValue({
        ...mockCustomFields[0],
        id: '2',
        field_name: 'new_field',
        display_name: 'فیلد جدید',
      });

      renderWithQueryClient(<InvoiceCustomization />);

      // Switch to custom fields tab
      fireEvent.click(screen.getByText('فیلدهای سفارشی'));

      await waitFor(() => {
        expect(screen.getByText('مدیریت فیلدهای سفارشی')).toBeInTheDocument();
      });

      // Click new field button
      const newButton = screen.getByRole('button', { name: /فیلد جدید/i });
      fireEvent.click(newButton);

      // Fill form
      const fieldNameInput = screen.getByLabelText(/نام فیلد/i);
      const displayNameInput = screen.getByLabelText(/نام نمایشی/i);
      
      fireEvent.change(fieldNameInput, { target: { value: 'new_field' } });
      fireEvent.change(displayNameInput, { target: { value: 'فیلد جدید' } });

      // Submit form
      const createButton = screen.getByRole('button', { name: /ایجاد/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(invoiceCustomizationService.createCustomField).toHaveBeenCalledWith(
          expect.objectContaining({
            field_name: 'new_field',
            display_name: 'فیلد جدید',
            template_id: mockTemplates[0].id,
          })
        );
      });
    });

    it('shows field type selection with icons', async () => {
      renderWithQueryClient(<InvoiceCustomization />);

      // Switch to custom fields tab
      fireEvent.click(screen.getByText('فیلدهای سفارشی'));

      await waitFor(() => {
        expect(screen.getByText('مدیریت فیلدهای سفارشی')).toBeInTheDocument();
      });

      // Click new field button
      const newButton = screen.getByRole('button', { name: /فیلد جدید/i });
      fireEvent.click(newButton);

      // Check field type selector
      expect(screen.getByLabelText(/نوع فیلد/i)).toBeInTheDocument();
    });
  });

  describe('Numbering Scheme Manager', () => {
    it('switches to numbering tab and loads schemes', async () => {
      renderWithQueryClient(<InvoiceCustomization />);

      // Switch to numbering tab
      const numberingTab = screen.getByText('شماره‌گذاری');
      fireEvent.click(numberingTab);

      await waitFor(() => {
        expect(screen.getByText('طرح‌های شماره‌گذاری')).toBeInTheDocument();
        expect(screen.getByText('طرح شماره‌گذاری پیش‌فرض')).toBeInTheDocument();
      });

      expect(invoiceCustomizationService.getNumberingSchemes).toHaveBeenCalled();
    });

    it('allows creating new numbering scheme', async () => {
      vi.mocked(invoiceCustomizationService.createNumberingScheme).mockResolvedValue({
        ...mockNumberingSchemes[0],
        id: '2',
        name: 'طرح جدید',
      });

      renderWithQueryClient(<InvoiceCustomization />);

      // Switch to numbering tab
      fireEvent.click(screen.getByText('شماره‌گذاری'));

      await waitFor(() => {
        expect(screen.getByText('طرح‌های شماره‌گذاری')).toBeInTheDocument();
      });

      // Click new scheme button
      const newButton = screen.getByRole('button', { name: /جدید/i });
      fireEvent.click(newButton);

      // Fill form
      const nameInput = screen.getByLabelText(/نام طرح/i);
      fireEvent.change(nameInput, { target: { value: 'طرح جدید' } });

      // Submit form
      const createButton = screen.getByRole('button', { name: /ایجاد/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(invoiceCustomizationService.createNumberingScheme).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'طرح جدید',
          })
        );
      });
    });

    it('shows format variables help', async () => {
      renderWithQueryClient(<InvoiceCustomization />);

      // Switch to numbering tab
      fireEvent.click(screen.getByText('شماره‌گذاری'));

      await waitFor(() => {
        expect(screen.getByText('طرح شماره‌گذاری پیش‌فرض')).toBeInTheDocument();
      });

      // Select a scheme
      fireEvent.click(screen.getByText('طرح شماره‌گذاری پیش‌فرض'));

      await waitFor(() => {
        expect(screen.getByText('متغیرهای قابل استفاده:')).toBeInTheDocument();
        expect(screen.getByText('{prefix}')).toBeInTheDocument();
        expect(screen.getByText('{year}')).toBeInTheDocument();
      });
    });
  });

  describe('Invoice Preview', () => {
    it('switches to preview tab and shows preview controls', async () => {
      renderWithQueryClient(<InvoiceCustomization />);

      // Switch to preview tab
      const previewTab = screen.getByText('پیش‌نمایش');
      fireEvent.click(previewTab);

      await waitFor(() => {
        expect(screen.getByText('پیش‌نمایش فاکتور')).toBeInTheDocument();
        expect(screen.getByLabelText(/نوع فاکتور/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/قالب/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/برندینگ/i)).toBeInTheDocument();
      });
    });

    it('allows switching between general and gold invoice types', async () => {
      renderWithQueryClient(<InvoiceCustomization />);

      // Switch to preview tab
      fireEvent.click(screen.getByText('پیش‌نمایش'));

      await waitFor(() => {
        expect(screen.getByLabelText(/نوع فاکتور/i)).toBeInTheDocument();
      });

      // Check that both options are available
      const typeSelect = screen.getByLabelText(/نوع فاکتور/i);
      fireEvent.click(typeSelect);

      await waitFor(() => {
        expect(screen.getByText('عمومی')).toBeInTheDocument();
        expect(screen.getByText('طلا')).toBeInTheDocument();
      });
    });

    it('shows print and download buttons', async () => {
      renderWithQueryClient(<InvoiceCustomization />);

      // Switch to preview tab
      fireEvent.click(screen.getByText('پیش‌نمایش'));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /چاپ/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /دانلود PDF/i })).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles template loading errors gracefully', async () => {
      vi.mocked(invoiceCustomizationService.getTemplates).mockRejectedValue(
        new Error('Network error')
      );

      renderWithQueryClient(<InvoiceCustomization />);

      // Should still render the interface
      expect(screen.getByText('سفارشی‌سازی فاکتور')).toBeInTheDocument();
    });

    it('handles template creation errors', async () => {
      vi.mocked(invoiceCustomizationService.createTemplate).mockRejectedValue(
        new Error('Creation failed')
      );

      renderWithQueryClient(<InvoiceCustomization />);

      await waitFor(() => {
        expect(screen.getByText('قالب‌های فاکتور')).toBeInTheDocument();
      });

      // Try to create template
      const newButton = screen.getByRole('button', { name: /جدید/i });
      fireEvent.click(newButton);

      const nameInput = screen.getByLabelText(/نام قالب/i);
      fireEvent.change(nameInput, { target: { value: 'قالب جدید' } });

      const createButton = screen.getByRole('button', { name: /ایجاد قالب/i });
      fireEvent.click(createButton);

      // Should handle error gracefully
      await waitFor(() => {
        expect(invoiceCustomizationService.createTemplate).toHaveBeenCalled();
      });
    });
  });

  describe('Form Validation', () => {
    it('validates required fields in template creation', async () => {
      renderWithQueryClient(<InvoiceCustomization />);

      await waitFor(() => {
        expect(screen.getByText('قالب‌های فاکتور')).toBeInTheDocument();
      });

      // Click new template button
      const newButton = screen.getByRole('button', { name: /جدید/i });
      fireEvent.click(newButton);

      // Try to submit without name
      const createButton = screen.getByRole('button', { name: /ایجاد قالب/i });
      fireEvent.click(createButton);

      // Should not call service
      expect(invoiceCustomizationService.createTemplate).not.toHaveBeenCalled();
    });

    it('validates field name format in custom fields', async () => {
      renderWithQueryClient(<InvoiceCustomization />);

      // Switch to custom fields tab
      fireEvent.click(screen.getByText('فیلدهای سفارشی'));

      await waitFor(() => {
        expect(screen.getByText('مدیریت فیلدهای سفارشی')).toBeInTheDocument();
      });

      // Click new field button
      const newButton = screen.getByRole('button', { name: /فیلد جدید/i });
      fireEvent.click(newButton);

      // Enter invalid field name
      const fieldNameInput = screen.getByLabelText(/نام فیلد/i);
      const displayNameInput = screen.getByLabelText(/نام نمایشی/i);
      
      fireEvent.change(fieldNameInput, { target: { value: 'Invalid Field Name' } });
      fireEvent.change(displayNameInput, { target: { value: 'فیلد نامعتبر' } });

      // Try to submit
      const createButton = screen.getByRole('button', { name: /ایجاد/i });
      fireEvent.click(createButton);

      // Should not call service due to validation
      expect(invoiceCustomizationService.createCustomField).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', async () => {
      renderWithQueryClient(<InvoiceCustomization />);

      // Check for proper form labels
      await waitFor(() => {
        expect(screen.getByText('قالب‌های فاکتور')).toBeInTheDocument();
      });

      // Click new template button
      const newButton = screen.getByRole('button', { name: /جدید/i });
      fireEvent.click(newButton);

      // Check form accessibility
      expect(screen.getByLabelText(/نام قالب/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/توضیحات/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/نوع قالب/i)).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      renderWithQueryClient(<InvoiceCustomization />);

      await waitFor(() => {
        expect(screen.getByText('قالب‌های فاکتور')).toBeInTheDocument();
      });

      // Tab navigation should work
      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBeGreaterThan(0);
      
      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('tabindex');
      });
    });
  });
});