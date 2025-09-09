import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import TenantCredentialsDialog from '@/components/enhanced/TenantCredentialsDialog';
import { Tenant } from '@/types/tenant';

// Mock UI components
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => 
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/enhanced-button', () => ({
  Button: ({ children, onClick, disabled, variant, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/enhanced-input', () => ({
  Input: ({ onChange, value, placeholder, type, ...props }: any) => (
    <input 
      onChange={onChange} 
      value={value} 
      placeholder={placeholder} 
      type={type}
      data-testid={props.id || 'input'}
      {...props}
    />
  ),
}));

vi.mock('@/components/ui/enhanced-card', () => ({
  Card: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <div data-testid="card" className={variant}>{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="alert" className={className}>{children}</div>
  ),
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Eye: () => <span data-testid="eye-icon">Eye</span>,
  EyeOff: () => <span data-testid="eye-off-icon">EyeOff</span>,
  Key: () => <span data-testid="key-icon">Key</span>,
  Mail: () => <span data-testid="mail-icon">Mail</span>,
  AlertTriangle: () => <span data-testid="alert-triangle-icon">AlertTriangle</span>,
  CheckCircle: () => <span data-testid="check-circle-icon">CheckCircle</span>,
}));

describe('TenantCredentialsDialog', () => {
  const mockTenant: Tenant = {
    id: 'tenant-123',
    name: 'Test Tenant',
    subscription_type: 'pro',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    is_active: true,
  };

  const mockProps = {
    tenant: mockTenant,
    isOpen: true,
    onClose: vi.fn(),
    onUpdateCredentials: vi.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog when open with tenant information', () => {
    render(<TenantCredentialsDialog {...mockProps} />);
    
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByText('تغییر اطلاعات ورود تنانت')).toBeInTheDocument();
    expect(screen.getByText('Test Tenant')).toBeInTheDocument();
    expect(screen.getByText('ID: tenant-1...')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<TenantCredentialsDialog {...mockProps} isOpen={false} />);
    
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('renders email and password input fields', () => {
    render(<TenantCredentialsDialog {...mockProps} />);
    
    expect(screen.getByTestId('email')).toBeInTheDocument();
    expect(screen.getByTestId('password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('example@domain.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('رمز عبور قوی وارد کنید')).toBeInTheDocument();
  });

  it('shows password visibility toggle button', () => {
    render(<TenantCredentialsDialog {...mockProps} />);
    
    const toggleButton = screen.getByTestId('eye-icon').closest('button');
    expect(toggleButton).toBeInTheDocument();
  });

  it('toggles password visibility when eye icon is clicked', async () => {
    render(<TenantCredentialsDialog {...mockProps} />);
    
    const passwordInput = screen.getByTestId('password');
    const toggleButton = screen.getByTestId('eye-icon').closest('button');
    
    expect(passwordInput).toHaveAttribute('type', 'password');
    
    fireEvent.click(toggleButton!);
    
    await waitFor(() => {
      expect(passwordInput).toHaveAttribute('type', 'text');
      expect(screen.getByTestId('eye-off-icon')).toBeInTheDocument();
    });
  });

  it('validates email format and shows error for invalid email', async () => {
    render(<TenantCredentialsDialog {...mockProps} />);
    
    const emailInput = screen.getByTestId('email');
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    
    await waitFor(() => {
      expect(screen.getByText('فرمت ایمیل صحیح نیست')).toBeInTheDocument();
    });
  });

  it('validates password strength and shows feedback', async () => {
    render(<TenantCredentialsDialog {...mockProps} />);
    
    const passwordInput = screen.getByTestId('password');
    fireEvent.change(passwordInput, { target: { value: 'weak' } });
    
    await waitFor(() => {
      expect(screen.getByText('قدرت رمز عبور:')).toBeInTheDocument();
      expect(screen.getByText('ضعیف')).toBeInTheDocument();
      expect(screen.getByText('برای بهبود رمز عبور:')).toBeInTheDocument();
    });
  });

  it('shows strong password indicator for good passwords', async () => {
    render(<TenantCredentialsDialog {...mockProps} />);
    
    const passwordInput = screen.getByTestId('password');
    fireEvent.change(passwordInput, { target: { value: 'StrongPassword123!' } });
    
    await waitFor(() => {
      expect(screen.getByText('قوی')).toBeInTheDocument();
      expect(screen.getByText('رمز عبور قوی است و آماده استفاده می‌باشد.')).toBeInTheDocument();
    });
  });

  it('disables submit button when form is invalid', () => {
    render(<TenantCredentialsDialog {...mockProps} />);
    
    const submitButton = screen.getByText('به‌روزرسانی اطلاعات ورود');
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when valid email is provided', async () => {
    render(<TenantCredentialsDialog {...mockProps} />);
    
    const emailInput = screen.getByTestId('email');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    
    await waitFor(() => {
      const submitButton = screen.getByText('به‌روزرسانی اطلاعات ورود');
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('enables submit button when strong password is provided', async () => {
    render(<TenantCredentialsDialog {...mockProps} />);
    
    const passwordInput = screen.getByTestId('password');
    fireEvent.change(passwordInput, { target: { value: 'StrongPassword123!' } });
    
    await waitFor(() => {
      const submitButton = screen.getByText('به‌روزرسانی اطلاعات ورود');
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('calls onUpdateCredentials with correct data when form is submitted', async () => {
    render(<TenantCredentialsDialog {...mockProps} />);
    
    const emailInput = screen.getByTestId('email');
    const passwordInput = screen.getByTestId('password');
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'StrongPassword123!' } });
    
    await waitFor(() => {
      const submitButton = screen.getByText('به‌روزرسانی اطلاعات ورود');
      expect(submitButton).not.toBeDisabled();
    });
    
    const form = screen.getByTestId('email').closest('form');
    fireEvent.submit(form!);
    
    await waitFor(() => {
      expect(mockProps.onUpdateCredentials).toHaveBeenCalledWith('tenant-123', {
        email: 'test@example.com',
        password: 'StrongPassword123!',
      });
    });
  });

  it('calls onUpdateCredentials with only email when only email is provided', async () => {
    render(<TenantCredentialsDialog {...mockProps} />);
    
    const emailInput = screen.getByTestId('email');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    
    await waitFor(() => {
      const submitButton = screen.getByText('به‌روزرسانی اطلاعات ورود');
      expect(submitButton).not.toBeDisabled();
    });
    
    const form = screen.getByTestId('email').closest('form');
    fireEvent.submit(form!);
    
    await waitFor(() => {
      expect(mockProps.onUpdateCredentials).toHaveBeenCalledWith('tenant-123', {
        email: 'test@example.com',
      });
    });
  });

  it('calls onClose when cancel button is clicked', () => {
    render(<TenantCredentialsDialog {...mockProps} />);
    
    const cancelButton = screen.getByText('انصراف');
    fireEvent.click(cancelButton);
    
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('shows loading state when isLoading is true', () => {
    render(<TenantCredentialsDialog {...mockProps} isLoading={true} />);
    
    expect(screen.getByText('در حال به‌روزرسانی...')).toBeInTheDocument();
    
    const submitButton = screen.getByText('در حال به‌روزرسانی...');
    const cancelButton = screen.getByText('انصراف');
    
    expect(submitButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it('resets form when dialog opens with new tenant', () => {
    const { rerender } = render(<TenantCredentialsDialog {...mockProps} isOpen={false} />);
    
    // Open dialog and fill form
    rerender(<TenantCredentialsDialog {...mockProps} isOpen={true} />);
    
    const emailInput = screen.getByTestId('email');
    const passwordInput = screen.getByTestId('password');
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    // Close and reopen dialog
    rerender(<TenantCredentialsDialog {...mockProps} isOpen={false} />);
    rerender(<TenantCredentialsDialog {...mockProps} isOpen={true} />);
    
    expect(screen.getByTestId('email')).toHaveValue('');
    expect(screen.getByTestId('password')).toHaveValue('');
  });

  it('shows warning alert about credential changes', () => {
    render(<TenantCredentialsDialog {...mockProps} />);
    
    expect(screen.getByText(/تغییر اطلاعات ورود تنانت تأثیر مستقیم بر دسترسی کاربران خواهد داشت/)).toBeInTheDocument();
  });

  it('displays tenant avatar with first letter of name', () => {
    render(<TenantCredentialsDialog {...mockProps} />);
    
    expect(screen.getByText('T')).toBeInTheDocument(); // First letter of "Test Tenant"
  });

  it('shows password strength requirements', async () => {
    render(<TenantCredentialsDialog {...mockProps} />);
    
    const passwordInput = screen.getByTestId('password');
    fireEvent.change(passwordInput, { target: { value: 'weak' } });
    
    await waitFor(() => {
      expect(screen.getByText('حداقل ۸ کاراکتر')).toBeInTheDocument();
      expect(screen.getByText('حداقل یک حرف بزرگ انگلیسی')).toBeInTheDocument();
      expect(screen.getByText('حداقل یک عدد')).toBeInTheDocument();
      expect(screen.getByText('حداقل یک کاراکتر خاص')).toBeInTheDocument();
    });
  });
});