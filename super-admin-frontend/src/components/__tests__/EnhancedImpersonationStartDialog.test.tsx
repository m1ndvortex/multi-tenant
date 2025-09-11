import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import ImpersonationStartDialog from '../ImpersonationStartDialog';
import { User } from '@/types/impersonation';

// Mock the UI components
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => 
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="dialog-content">{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="dialog-description">{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="dialog-footer">{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => 
    <h2 data-testid="dialog-title">{children}</h2>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, className }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={className}
      data-variant={variant}
      data-testid="button"
    >
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor} data-testid="label">{children}</label>
  ),
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({ value, onChange, placeholder, maxLength, rows }: any) => (
    <textarea 
      value={value} 
      onChange={onChange} 
      placeholder={placeholder}
      maxLength={maxLength}
      rows={rows}
      data-testid="textarea"
    />
  ),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select" data-value={value}>
      <button onClick={() => onValueChange && onValueChange('2')}>{children}</button>
    </div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => <span>Select Value</span>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <span data-testid="badge" data-variant={variant}>{children}</span>
  ),
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, id }: any) => (
    <input 
      type="checkbox" 
      checked={checked} 
      onChange={(e) => onCheckedChange && onCheckedChange(e.target.checked)}
      id={id}
      data-testid="checkbox"
    />
  ),
}));

describe('EnhancedImpersonationStartDialog', () => {
  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    tenant_id: 'tenant-123',
    tenant_name: 'Test Tenant',
    role: 'user',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
  };

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    user: mockUser,
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders enhanced impersonation dialog with new window option', () => {
    render(<ImpersonationStartDialog {...defaultProps} />);
    
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByText('شروع جانشینی کاربر')).toBeInTheDocument();
    expect(screen.getByText('باز کردن در پنجره/تب جدید (پیشنهادی)')).toBeInTheDocument();
  });

  it('displays user information correctly', () => {
    render(<ImpersonationStartDialog {...defaultProps} />);
    
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('Test Tenant')).toBeInTheDocument();
  });

  it('shows new window advantages when window-based is selected', () => {
    render(<ImpersonationStartDialog {...defaultProps} />);
    
    expect(screen.getByText('✓ مزایای پنجره جدید:')).toBeInTheDocument();
    expect(screen.getByText('امکان کار همزمان با پنل ادمین')).toBeInTheDocument();
    expect(screen.getByText('تشخیص خودکار بسته شدن پنجره و پاک‌سازی جلسه')).toBeInTheDocument();
  });

  it('shows redirect mode warnings when window-based is unchecked', async () => {
    render(<ImpersonationStartDialog {...defaultProps} />);
    
    const checkbox = screen.getByTestId('checkbox');
    fireEvent.click(checkbox);
    
    await waitFor(() => {
      expect(screen.getByText('⚠ حالت تغییر مسیر:')).toBeInTheDocument();
      expect(screen.getByText('پنل ادمین بسته می‌شود')).toBeInTheDocument();
    });
  });

  it('calls onConfirm with enhanced data including window mode', async () => {
    render(<ImpersonationStartDialog {...defaultProps} />);
    
    // Fill in reason
    const textarea = screen.getByTestId('textarea');
    fireEvent.change(textarea, { target: { value: 'Test reason' } });
    
    // Click confirm button
    const confirmButton = screen.getByText('باز کردن در پنجره جدید');
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(defaultProps.onConfirm).toHaveBeenCalledWith({
        target_user_id: 'user-123',
        duration_hours: 2,
        reason: 'Test reason',
        is_window_based: true,
      });
    });
  });

  it('calls onConfirm with redirect mode when checkbox is unchecked', async () => {
    render(<ImpersonationStartDialog {...defaultProps} />);
    
    // Uncheck window-based option
    const checkbox = screen.getByTestId('checkbox');
    fireEvent.click(checkbox);
    
    // Click confirm button
    const confirmButton = screen.getByText('شروع جانشینی');
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(defaultProps.onConfirm).toHaveBeenCalledWith({
        target_user_id: 'user-123',
        duration_hours: 2,
        reason: undefined,
        is_window_based: false,
      });
    });
  });

  it('shows loading state correctly', () => {
    render(<ImpersonationStartDialog {...defaultProps} isLoading={true} />);
    
    expect(screen.getByText('در حال شروع...')).toBeInTheDocument();
    
    const buttons = screen.getAllByTestId('button');
    buttons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('resets form when dialog is closed', async () => {
    render(<ImpersonationStartDialog {...defaultProps} />);
    
    // Fill in some data
    const textarea = screen.getByTestId('textarea');
    fireEvent.change(textarea, { target: { value: 'Test reason' } });
    
    // Uncheck window mode
    const checkbox = screen.getByTestId('checkbox');
    fireEvent.click(checkbox);
    
    // Close dialog
    const cancelButton = screen.getByText('انصراف');
    fireEvent.click(cancelButton);
    
    await waitFor(() => {
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  it('shows character count for reason field', () => {
    render(<ImpersonationStartDialog {...defaultProps} />);
    
    const textarea = screen.getByTestId('textarea');
    fireEvent.change(textarea, { target: { value: 'Test reason' } });
    
    expect(screen.getByText('11/500 کاراکتر')).toBeInTheDocument();
  });

  it('does not render when user is null', () => {
    render(<ImpersonationStartDialog {...defaultProps} user={null} />);
    
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('shows security warning', () => {
    render(<ImpersonationStartDialog {...defaultProps} />);
    
    expect(screen.getByText('هشدار امنیتی')).toBeInTheDocument();
    expect(screen.getByText(/تمام اقدامات شما در طول جانشینی ثبت و نظارت خواهد شد/)).toBeInTheDocument();
  });

  it('changes button text based on window mode selection', async () => {
    render(<ImpersonationStartDialog {...defaultProps} />);
    
    // Initially should show new window text
    expect(screen.getByText('باز کردن در پنجره جدید')).toBeInTheDocument();
    
    // Uncheck window mode
    const checkbox = screen.getByTestId('checkbox');
    fireEvent.click(checkbox);
    
    await waitFor(() => {
      expect(screen.getByText('شروع جانشینی')).toBeInTheDocument();
    });
  });
});