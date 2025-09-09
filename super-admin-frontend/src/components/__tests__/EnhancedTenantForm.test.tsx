import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import EnhancedTenantForm from '@/components/enhanced/EnhancedTenantForm';
import { Tenant } from '@/types/tenant';

// Mock UI components
vi.mock('@/components/ui/enhanced-button', () => ({
  Button: ({ children, onClick, disabled, variant, type, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant} type={type} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/enhanced-input', () => ({
  Input: ({ onChange, value, placeholder, type, required, ...props }: any) => (
    <input 
      onChange={onChange} 
      value={value} 
      placeholder={placeholder} 
      type={type}
      required={required}
      data-testid={props.id || 'input'}
      {...props}
    />
  ),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <select value={value} onChange={(e) => onValueChange(e.target.value)} data-testid={`select-${value || 'default'}`}>
      {children}
    </select>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder: string }) => <span>{placeholder}</span>,
}));

vi.mock('@/components/ui/enhanced-card', () => ({
  Card: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <div data-testid="card" className={variant}>{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="alert">{children}</div>
  ),
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: { children: React.ReactNode; variant?: string; className?: string }) => (
    <span className={`badge ${variant} ${className}`}>{children}</span>
  ),
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({ onChange, value, placeholder, rows, ...props }: any) => (
    <textarea 
      onChange={onChange} 
      value={value} 
      placeholder={placeholder} 
      rows={rows}
      data-testid={props.id || 'textarea'}
      {...props}
    />
  ),
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Building2: () => <span data-testid="building-icon">Building</span>,
  Globe: () => <span data-testid="globe-icon">Globe</span>,
  Calendar: () => <span data-testid="calendar-icon">Calendar</span>,
  Users: () => <span data-testid="users-icon">Users</span>,
  Package: () => <span data-testid="package-icon">Package</span>,
  FileText: () => <span data-testid="file-text-icon">FileText</span>,
  AlertTriangle: () => <span data-testid="alert-triangle-icon">AlertTriangle</span>,
  Info: () => <span data-testid="info-icon">Info</span>,
}));

describe('EnhancedTenantForm', () => {
  const mockTenant: Tenant = {
    id: 'tenant-123',
    name: 'Test Tenant',
    domain: 'test.com',
    subscription_type: 'pro',
    subscription_expires_at: '2024-12-31T23:59:59Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    is_active: true,
  };

  const mockProps = {
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form for creating new tenant', () => {
    render(<EnhancedTenantForm {...mockProps} />);
    
    expect(screen.getByText('ایجاد تنانت جدید')).toBeInTheDocument();
    expect(screen.getByText('ایجاد تنانت')).toBeInTheDocument();
  });

  it('renders form for editing existing tenant', () => {
    render(<EnhancedTenantForm {...mockProps} tenant={mockTenant} />);
    
    expect(screen.getByText('ویرایش جامع تنانت')).toBeInTheDocument();
    expect(screen.getByText('به‌روزرسانی تنانت')).toBeInTheDocument();
  });

  it('populates form fields when editing tenant', () => {
    render(<EnhancedTenantForm {...mockProps} tenant={mockTenant} />);
    
    expect(screen.getByDisplayValue('Test Tenant')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2024-12-31')).toBeInTheDocument();
  });

  it('renders all basic information fields', () => {
    render(<EnhancedTenantForm {...mockProps} />);
    
    expect(screen.getByTestId('name')).toBeInTheDocument();
    expect(screen.getByTestId('domain')).toBeInTheDocument();
    expect(screen.getByTestId('email')).toBeInTheDocument();
    expect(screen.getByTestId('phone')).toBeInTheDocument();
    expect(screen.getByTestId('address')).toBeInTheDocument();
  });

  it('renders subscription type selector', () => {
    render(<EnhancedTenantForm {...mockProps} />);
    
    expect(screen.getByText('نوع اشتراک')).toBeInTheDocument();
    expect(screen.getByText('رایگان')).toBeInTheDocument();
    expect(screen.getByText('حرفه‌ای')).toBeInTheDocument();
  });

  it('shows expiration date field only for pro subscription', async () => {
    render(<EnhancedTenantForm {...mockProps} />);
    
    // Initially free subscription, no expiration field
    expect(screen.queryByTestId('subscription_expires_at')).not.toBeInTheDocument();
    
    // Change to pro subscription
    const subscriptionSelect = screen.getByTestId('select-free');
    fireEvent.change(subscriptionSelect, { target: { value: 'pro' } });
    
    await waitFor(() => {
      expect(screen.getByTestId('subscription_expires_at')).toBeInTheDocument();
    });
  });

  it('auto-adjusts limits when subscription type changes', async () => {
    render(<EnhancedTenantForm {...mockProps} />);
    
    // Show advanced settings
    const advancedToggle = screen.getByText('نمایش');
    fireEvent.click(advancedToggle);
    
    await waitFor(() => {
      expect(screen.getByTestId('max_users')).toBeInTheDocument();
    });
    
    // Change to pro subscription
    const subscriptionSelect = screen.getByTestId('select-free');
    fireEvent.change(subscriptionSelect, { target: { value: 'pro' } });
    
    await waitFor(() => {
      expect(screen.getByDisplayValue(5)).toBeInTheDocument(); // max_users for pro
      expect(screen.getByDisplayValue(-1)).toBeInTheDocument(); // unlimited products
    });
  });

  it('shows subscription limits information', () => {
    render(<EnhancedTenantForm {...mockProps} />);
    
    expect(screen.getByText('محدودیت‌های اشتراک رایگان:')).toBeInTheDocument();
    expect(screen.getByText('۱ کاربر')).toBeInTheDocument();
    expect(screen.getByText('تا ۱۰ محصول')).toBeInTheDocument();
    expect(screen.getByText('تا ۱۰ مشتری')).toBeInTheDocument();
    expect(screen.getByText('تا ۱۰ فاکتور در ماه')).toBeInTheDocument();
  });

  it('toggles advanced settings visibility', async () => {
    render(<EnhancedTenantForm {...mockProps} />);
    
    // Initially hidden
    expect(screen.queryByTestId('max_users')).not.toBeInTheDocument();
    
    // Show advanced settings
    const showButton = screen.getByText('نمایش');
    fireEvent.click(showButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('max_users')).toBeInTheDocument();
      expect(screen.getByTestId('max_products')).toBeInTheDocument();
      expect(screen.getByTestId('max_customers')).toBeInTheDocument();
      expect(screen.getByTestId('max_monthly_invoices')).toBeInTheDocument();
      expect(screen.getByTestId('notes')).toBeInTheDocument();
    });
    
    // Hide advanced settings
    const hideButton = screen.getByText('مخفی کردن');
    fireEvent.click(hideButton);
    
    await waitFor(() => {
      expect(screen.queryByTestId('max_users')).not.toBeInTheDocument();
    });
  });

  it('shows advanced settings by default when editing tenant', () => {
    render(<EnhancedTenantForm {...mockProps} tenant={mockTenant} />);
    
    expect(screen.getByTestId('max_users')).toBeInTheDocument();
    expect(screen.getByText('مخفی کردن')).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(<EnhancedTenantForm {...mockProps} />);
    
    const submitButton = screen.getByText('ایجاد تنانت');
    expect(submitButton).toBeDisabled(); // Name is required and empty
    
    const nameInput = screen.getByTestId('name');
    fireEvent.change(nameInput, { target: { value: 'Test Tenant' } });
    
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('calls onSubmit with correct data when form is submitted', async () => {
    render(<EnhancedTenantForm {...mockProps} />);
    
    const nameInput = screen.getByTestId('name');
    const domainInput = screen.getByTestId('domain');
    const emailInput = screen.getByTestId('email');
    
    fireEvent.change(nameInput, { target: { value: 'Test Tenant' } });
    fireEvent.change(domainInput, { target: { value: 'test.com' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    
    const form = nameInput.closest('form');
    fireEvent.submit(form!);
    
    await waitFor(() => {
      expect(mockProps.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Tenant',
          domain: 'test.com',
          email: 'test@example.com',
          subscription_type: 'free',
          is_active: true,
        })
      );
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(<EnhancedTenantForm {...mockProps} />);
    
    const cancelButton = screen.getByText('انصراف');
    fireEvent.click(cancelButton);
    
    expect(mockProps.onCancel).toHaveBeenCalled();
  });

  it('shows loading state when isLoading is true', () => {
    render(<EnhancedTenantForm {...mockProps} isLoading={true} />);
    
    expect(screen.getByText('در حال پردازش...')).toBeInTheDocument();
    
    const submitButton = screen.getByText('در حال پردازش...');
    const cancelButton = screen.getByText('انصراف');
    
    expect(submitButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it('updates limits display when subscription type changes', async () => {
    render(<EnhancedTenantForm {...mockProps} />);
    
    // Initially shows free limits
    expect(screen.getByText('محدودیت‌های اشتراک رایگان:')).toBeInTheDocument();
    
    // Change to pro subscription
    const subscriptionSelect = screen.getByTestId('select-free');
    fireEvent.change(subscriptionSelect, { target: { value: 'pro' } });
    
    await waitFor(() => {
      expect(screen.getByText('محدودیت‌های اشتراک حرفه‌ای:')).toBeInTheDocument();
      expect(screen.getByText('تا ۵ کاربر')).toBeInTheDocument();
      expect(screen.getByText('نامحدود')).toBeInTheDocument();
    });
  });

  it('sets default expiration date when upgrading to pro', async () => {
    render(<EnhancedTenantForm {...mockProps} />);
    
    // Change to pro subscription
    const subscriptionSelect = screen.getByTestId('select-free');
    fireEvent.change(subscriptionSelect, { target: { value: 'pro' } });
    
    await waitFor(() => {
      const expirationInput = screen.getByTestId('subscription_expires_at');
      expect(expirationInput).toHaveValue(expect.stringMatching(/\d{4}-\d{2}-\d{2}/));
    });
  });

  it('handles advanced settings input changes', async () => {
    render(<EnhancedTenantForm {...mockProps} />);
    
    // Show advanced settings
    const advancedToggle = screen.getByText('نمایش');
    fireEvent.click(advancedToggle);
    
    await waitFor(() => {
      const maxUsersInput = screen.getByTestId('max_users');
      fireEvent.change(maxUsersInput, { target: { value: 10 } });
      expect(maxUsersInput).toHaveValue(10);
    });
  });

  it('shows warning about advanced settings changes', async () => {
    render(<EnhancedTenantForm {...mockProps} />);
    
    // Show advanced settings
    const advancedToggle = screen.getByText('نمایش');
    fireEvent.click(advancedToggle);
    
    await waitFor(() => {
      expect(screen.getByText(/تغییر این تنظیمات تأثیر مستقیم بر عملکرد تنانت خواهد داشت/)).toBeInTheDocument();
    });
  });

  it('handles textarea inputs correctly', async () => {
    render(<EnhancedTenantForm {...mockProps} />);
    
    const addressInput = screen.getByTestId('address');
    fireEvent.change(addressInput, { target: { value: 'Test Address' } });
    
    expect(addressInput).toHaveValue('Test Address');
    
    // Show advanced settings to access notes
    const advancedToggle = screen.getByText('نمایش');
    fireEvent.click(advancedToggle);
    
    await waitFor(() => {
      const notesInput = screen.getByTestId('notes');
      fireEvent.change(notesInput, { target: { value: 'Test Notes' } });
      expect(notesInput).toHaveValue('Test Notes');
    });
  });
});