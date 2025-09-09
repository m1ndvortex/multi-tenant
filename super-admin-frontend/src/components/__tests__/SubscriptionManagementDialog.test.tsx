import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import SubscriptionManagementDialog from '@/components/enhanced/SubscriptionManagementDialog';
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

vi.mock('@/components/ui/enhanced-card', () => ({
  Card: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <div data-testid="card" className={variant}>{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <select value={value} onChange={(e) => onValueChange(e.target.value)} data-testid="select">
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

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({ onChange, value, placeholder, rows, ...props }: any) => (
    <textarea 
      onChange={onChange} 
      value={value} 
      placeholder={placeholder} 
      rows={rows}
      data-testid="reason-textarea"
      {...props}
    />
  ),
}));

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="alert" className={className}>{children}</div>
  ),
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: { children: React.ReactNode; variant?: string; className?: string }) => (
    <span className={`badge ${variant} ${className}`}>{children}</span>
  ),
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn(() => '30 روز باقی‌مانده'),
}));

vi.mock('date-fns/locale', () => ({
  faIR: {},
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Calendar: () => <span data-testid="calendar-icon">Calendar</span>,
  CreditCard: () => <span data-testid="credit-card-icon">CreditCard</span>,
  Clock: () => <span data-testid="clock-icon">Clock</span>,
  AlertTriangle: () => <span data-testid="alert-triangle-icon">AlertTriangle</span>,
  CheckCircle: () => <span data-testid="check-circle-icon">CheckCircle</span>,
  ArrowUpCircle: () => <span data-testid="arrow-up-icon">ArrowUp</span>,
  ArrowDownCircle: () => <span data-testid="arrow-down-icon">ArrowDown</span>,
  Plus: () => <span data-testid="plus-icon">Plus</span>,
  Settings: () => <span data-testid="settings-icon">Settings</span>,
}));

describe('SubscriptionManagementDialog', () => {
  const mockActiveTenant: Tenant = {
    id: 'tenant-123',
    name: 'Test Tenant',
    subscription_type: 'pro',
    status: 'active',
    subscription_expires_at: '2024-12-31T23:59:59Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    is_active: true,
  };

  const mockSuspendedTenant: Tenant = {
    id: 'tenant-456',
    name: 'Suspended Tenant',
    subscription_type: 'free',
    status: 'suspended',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    is_active: false,
  };

  const mockProps = {
    tenant: mockActiveTenant,
    isOpen: true,
    onClose: vi.fn(),
    onExtendSubscription: vi.fn(),
    onChangePlan: vi.fn(),
    onActivateSubscription: vi.fn(),
    onDeactivateSubscription: vi.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog when open with tenant information', () => {
    render(<SubscriptionManagementDialog {...mockProps} />);
    
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByText('مدیریت اشتراک تنانت')).toBeInTheDocument();
    expect(screen.getByText('Test Tenant')).toBeInTheDocument();
    expect(screen.getByText('ID: tenant-1...')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<SubscriptionManagementDialog {...mockProps} isOpen={false} />);
    
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('displays current subscription status correctly', () => {
    render(<SubscriptionManagementDialog {...mockProps} />);
    
    expect(screen.getByText('وضعیت فعلی اشتراک')).toBeInTheDocument();
    expect(screen.getByText('حرفه‌ای')).toBeInTheDocument();
    expect(screen.getByText('فعال')).toBeInTheDocument();
  });

  it('shows expiration information for pro tenants', () => {
    render(<SubscriptionManagementDialog {...mockProps} />);
    
    expect(screen.getByText('تاریخ انقضا')).toBeInTheDocument();
    expect(screen.getByText('30 روز باقی‌مانده')).toBeInTheDocument();
  });

  it('renders action buttons for active pro tenant', () => {
    render(<SubscriptionManagementDialog {...mockProps} />);
    
    expect(screen.getByText('تمدید اشتراک')).toBeInTheDocument();
    expect(screen.getByText('تبدیل به رایگان')).toBeInTheDocument();
    expect(screen.getByText('تعلیق اشتراک')).toBeInTheDocument();
  });

  it('renders different action buttons for suspended tenant', () => {
    render(<SubscriptionManagementDialog {...mockProps} tenant={mockSuspendedTenant} />);
    
    expect(screen.getByText('ارتقا به حرفه‌ای')).toBeInTheDocument();
    expect(screen.getByText('فعال‌سازی اشتراک')).toBeInTheDocument();
  });

  it('shows extend subscription form when extend button is clicked', async () => {
    render(<SubscriptionManagementDialog {...mockProps} />);
    
    const extendButton = screen.getByText('تمدید اشتراک');
    fireEvent.click(extendButton);
    
    await waitFor(() => {
      expect(screen.getByText('تعداد ماه برای تمدید')).toBeInTheDocument();
      expect(screen.getByTestId('select')).toBeInTheDocument();
      expect(screen.getByTestId('reason-textarea')).toBeInTheDocument();
    });
  });

  it('shows change plan form when change plan button is clicked', async () => {
    render(<SubscriptionManagementDialog {...mockProps} />);
    
    const changePlanButton = screen.getByText('تبدیل به رایگان');
    fireEvent.click(changePlanButton);
    
    await waitFor(() => {
      expect(screen.getByText('تغییر نوع اشتراک')).toBeInTheDocument();
      expect(screen.getByText('نوع اشتراک جدید')).toBeInTheDocument();
    });
  });

  it('shows activation form when activate button is clicked', async () => {
    render(<SubscriptionManagementDialog {...mockProps} tenant={mockSuspendedTenant} />);
    
    const activateButton = screen.getByText('فعال‌سازی اشتراک');
    fireEvent.click(activateButton);
    
    await waitFor(() => {
      expect(screen.getByText('فعال‌سازی اشتراک')).toBeInTheDocument();
      expect(screen.getByText('فعال‌سازی اشتراک دسترسی کامل تنانت را بازگردانی می‌کند.')).toBeInTheDocument();
    });
  });

  it('shows deactivation form when deactivate button is clicked', async () => {
    render(<SubscriptionManagementDialog {...mockProps} />);
    
    const deactivateButton = screen.getByText('تعلیق اشتراک');
    fireEvent.click(deactivateButton);
    
    await waitFor(() => {
      expect(screen.getByText('تعلیق اشتراک')).toBeInTheDocument();
      expect(screen.getByText('تعلیق اشتراک دسترسی تنانت را محدود می‌کند.')).toBeInTheDocument();
    });
  });

  it('calls onExtendSubscription with correct parameters', async () => {
    render(<SubscriptionManagementDialog {...mockProps} />);
    
    // Click extend button
    const extendButton = screen.getByText('تمدید اشتراک');
    fireEvent.click(extendButton);
    
    await waitFor(() => {
      // Select 6 months
      const monthsSelect = screen.getByTestId('select');
      fireEvent.change(monthsSelect, { target: { value: '6' } });
      
      // Add reason
      const reasonTextarea = screen.getByTestId('reason-textarea');
      fireEvent.change(reasonTextarea, { target: { value: 'Test reason' } });
      
      // Submit
      const submitButton = screen.getByText('تمدید ۶ ماهه');
      fireEvent.click(submitButton);
    });
    
    expect(mockProps.onExtendSubscription).toHaveBeenCalledWith('tenant-123', 6, 'Test reason');
  });

  it('calls onChangePlan with correct parameters', async () => {
    render(<SubscriptionManagementDialog {...mockProps} />);
    
    // Click change plan button
    const changePlanButton = screen.getByText('تبدیل به رایگان');
    fireEvent.click(changePlanButton);
    
    await waitFor(() => {
      // Add reason
      const reasonTextarea = screen.getByTestId('reason-textarea');
      fireEvent.change(reasonTextarea, { target: { value: 'Downgrade reason' } });
      
      // Submit
      const submitButton = screen.getByText('تغییر به رایگان');
      fireEvent.click(submitButton);
    });
    
    expect(mockProps.onChangePlan).toHaveBeenCalledWith('tenant-123', 'free', 'Downgrade reason');
  });

  it('calls onActivateSubscription with correct parameters', async () => {
    render(<SubscriptionManagementDialog {...mockProps} tenant={mockSuspendedTenant} />);
    
    // Click activate button
    const activateButton = screen.getByText('فعال‌سازی اشتراک');
    fireEvent.click(activateButton);
    
    await waitFor(() => {
      // Add reason
      const reasonTextarea = screen.getByTestId('reason-textarea');
      fireEvent.change(reasonTextarea, { target: { value: 'Activation reason' } });
      
      // Submit
      const submitButtons = screen.getAllByText('فعال‌سازی اشتراک');
      const submitButton = submitButtons.find(button => button.tagName === 'BUTTON');
      fireEvent.click(submitButton!);
    });
    
    expect(mockProps.onActivateSubscription).toHaveBeenCalledWith('tenant-456', 'Activation reason');
  });

  it('calls onDeactivateSubscription with correct parameters', async () => {
    render(<SubscriptionManagementDialog {...mockProps} />);
    
    // Click deactivate button
    const deactivateButton = screen.getByText('تعلیق اشتراک');
    fireEvent.click(deactivateButton);
    
    await waitFor(() => {
      // Add reason
      const reasonTextarea = screen.getByTestId('reason-textarea');
      fireEvent.change(reasonTextarea, { target: { value: 'Suspension reason' } });
      
      // Submit
      const submitButtons = screen.getAllByText('تعلیق اشتراک');
      const submitButton = submitButtons.find(button => button.tagName === 'BUTTON');
      fireEvent.click(submitButton!);
    });
    
    expect(mockProps.onDeactivateSubscription).toHaveBeenCalledWith('tenant-123', 'Suspension reason');
  });

  it('allows canceling from action forms', async () => {
    render(<SubscriptionManagementDialog {...mockProps} />);
    
    // Click extend button
    const extendButton = screen.getByText('تمدید اشتراک');
    fireEvent.click(extendButton);
    
    await waitFor(() => {
      expect(screen.getByText('تعداد ماه برای تمدید')).toBeInTheDocument();
    });
    
    // Click cancel
    const cancelButton = screen.getByText('انصراف');
    fireEvent.click(cancelButton);
    
    await waitFor(() => {
      expect(screen.queryByText('تعداد ماه برای تمدید')).not.toBeInTheDocument();
      expect(screen.getByText('تمدید اشتراک')).toBeInTheDocument(); // Back to main buttons
    });
  });

  it('calls onClose when close button is clicked', () => {
    render(<SubscriptionManagementDialog {...mockProps} />);
    
    const closeButton = screen.getByText('بستن');
    fireEvent.click(closeButton);
    
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('shows loading state when isLoading is true', async () => {
    render(<SubscriptionManagementDialog {...mockProps} isLoading={true} />);
    
    // Click extend button
    const extendButton = screen.getByText('تمدید اشتراک');
    fireEvent.click(extendButton);
    
    await waitFor(() => {
      const submitButton = screen.getByText('در حال تمدید...');
      expect(submitButton).toBeDisabled();
    });
  });

  it('resets form when dialog opens', () => {
    const { rerender } = render(<SubscriptionManagementDialog {...mockProps} isOpen={false} />);
    
    // Open dialog and navigate to extend form
    rerender(<SubscriptionManagementDialog {...mockProps} isOpen={true} />);
    
    const extendButton = screen.getByText('تمدید اشتراک');
    fireEvent.click(extendButton);
    
    // Close and reopen dialog
    rerender(<SubscriptionManagementDialog {...mockProps} isOpen={false} />);
    rerender(<SubscriptionManagementDialog {...mockProps} isOpen={true} />);
    
    // Should be back to main view
    expect(screen.getByText('تمدید اشتراک')).toBeInTheDocument();
    expect(screen.queryByText('تعداد ماه برای تمدید')).not.toBeInTheDocument();
  });

  it('displays tenant avatar with first letter of name', () => {
    render(<SubscriptionManagementDialog {...mockProps} />);
    
    expect(screen.getByText('T')).toBeInTheDocument(); // First letter of "Test Tenant"
  });

  it('shows warning alerts in action forms', async () => {
    render(<SubscriptionManagementDialog {...mockProps} />);
    
    // Test change plan warning
    const changePlanButton = screen.getByText('تبدیل به رایگان');
    fireEvent.click(changePlanButton);
    
    await waitFor(() => {
      expect(screen.getByText('تغییر نوع اشتراک تأثیر فوری بر محدودیت‌های تنانت خواهد داشت.')).toBeInTheDocument();
    });
  });

  it('handles expired subscription display', () => {
    const expiredTenant = {
      ...mockActiveTenant,
      subscription_expires_at: '2023-01-01T00:00:00Z', // Past date
    };
    
    render(<SubscriptionManagementDialog {...mockProps} tenant={expiredTenant} />);
    
    // Should show expiration alert for expired subscription
    expect(screen.getByText('اشتراک منقضی شده است')).toBeInTheDocument();
  });

  it('does not show extend button for free tenants', () => {
    const freeTenant = {
      ...mockActiveTenant,
      subscription_type: 'free' as const,
    };
    
    render(<SubscriptionManagementDialog {...mockProps} tenant={freeTenant} />);
    
    expect(screen.queryByText('تمدید اشتراک')).not.toBeInTheDocument();
    expect(screen.getByText('ارتقا به حرفه‌ای')).toBeInTheDocument();
  });
});