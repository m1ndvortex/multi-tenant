import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import EnhancedTenantTable from '@/components/enhanced/EnhancedTenantTable';
import { Tenant } from '@/types/tenant';

// Mock the enhanced UI components
vi.mock('@/components/ui/enhanced-table', () => ({
  EnhancedTable: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  EnhancedTableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  EnhancedTableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  EnhancedTableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
  EnhancedTableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  EnhancedTableCell: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <td className={variant === 'tenantName' ? 'tenant-name-cell' : ''}>{children}</td>
  ),
}));

vi.mock('@/components/ui/enhanced-card', () => ({
  Card: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <div data-testid="card" className={variant}>{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/enhanced-button', () => ({
  Button: ({ children, onClick, className, title, ...props }: any) => (
    <button onClick={onClick} className={className} title={title} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: { children: React.ReactNode; variant?: string; className?: string }) => (
    <span className={`badge ${variant} ${className}`}>{children}</span>
  ),
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn(() => '2 روز پیش'),
}));

vi.mock('date-fns/locale', () => ({
  faIR: {},
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Edit: () => <span data-testid="edit-icon">Edit</span>,
  Trash2: () => <span data-testid="trash-icon">Trash</span>,
  Play: () => <span data-testid="play-icon">Play</span>,
  Pause: () => <span data-testid="pause-icon">Pause</span>,
  CheckCircle: () => <span data-testid="check-icon">Check</span>,
  UserCheck: () => <span data-testid="user-check-icon">UserCheck</span>,
  Key: () => <span data-testid="key-icon">Key</span>,
  Settings: () => <span data-testid="settings-icon">Settings</span>,
}));

describe('EnhancedTenantTable', () => {
  const mockTenants: Tenant[] = [
    {
      id: '1',
      name: 'Test Tenant 1',
      domain: 'test1.com',
      subscription_type: 'pro',
      status: 'active',
      subscription_expires_at: '2024-12-31T23:59:59Z',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      is_active: true,
      user_count: 5,
    },
    {
      id: '2',
      name: 'Test Tenant 2',
      domain: undefined,
      subscription_type: 'free',
      status: 'suspended',
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      is_active: false,
      user_count: 1,
    },
  ];

  const mockProps = {
    tenants: mockTenants,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onSuspend: vi.fn(),
    onActivate: vi.fn(),
    onConfirmPayment: vi.fn(),
    onImpersonate: vi.fn(),
    onUpdateCredentials: vi.fn(),
    onManageSubscription: vi.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders tenant table with enhanced styling', () => {
    render(<EnhancedTenantTable {...mockProps} />);
    
    expect(screen.getByTestId('card')).toBeInTheDocument();
    expect(screen.getByText('نام تنانت')).toBeInTheDocument();
    expect(screen.getByText('دامنه')).toBeInTheDocument();
    expect(screen.getByText('نوع اشتراک')).toBeInTheDocument();
    expect(screen.getByText('وضعیت')).toBeInTheDocument();
    expect(screen.getByText('انقضای اشتراک')).toBeInTheDocument();
    expect(screen.getByText('عملیات')).toBeInTheDocument();
  });

  it('displays tenant names with high-contrast styling', () => {
    render(<EnhancedTenantTable {...mockProps} />);
    
    const tenantNameCells = screen.getAllByText(/Test Tenant/);
    expect(tenantNameCells).toHaveLength(2);
    
    // Check that tenant name cells have the special styling class
    const tenantNameCell = tenantNameCells[0].closest('td');
    expect(tenantNameCell).toHaveClass('tenant-name-cell');
  });

  it('shows subscription badges with correct styling', () => {
    render(<EnhancedTenantTable {...mockProps} />);
    
    expect(screen.getByText('حرفه‌ای')).toBeInTheDocument();
    expect(screen.getByText('رایگان')).toBeInTheDocument();
  });

  it('displays status badges correctly', () => {
    render(<EnhancedTenantTable {...mockProps} />);
    
    expect(screen.getByText('فعال')).toBeInTheDocument();
    expect(screen.getByText('تعلیق')).toBeInTheDocument();
  });

  it('shows expiration information for pro tenants', () => {
    render(<EnhancedTenantTable {...mockProps} />);
    
    // Should show expiration info for pro tenant (multiple instances expected)
    expect(screen.getAllByText('2 روز پیش')).toHaveLength(3); // Expiration, last activity, created date
  });

  it('renders all action buttons with proper icons', () => {
    render(<EnhancedTenantTable {...mockProps} />);
    
    expect(screen.getAllByTestId('key-icon')).toHaveLength(2); // Update credentials
    expect(screen.getAllByTestId('settings-icon')).toHaveLength(2); // Manage subscription
    expect(screen.getAllByTestId('edit-icon')).toHaveLength(2); // Edit
    expect(screen.getAllByTestId('trash-icon')).toHaveLength(2); // Delete
    expect(screen.getByTestId('pause-icon')).toBeInTheDocument(); // Suspend (for active tenant)
    expect(screen.getByTestId('play-icon')).toBeInTheDocument(); // Activate (for suspended tenant)
  });

  it('calls onUpdateCredentials when credentials button is clicked', async () => {
    render(<EnhancedTenantTable {...mockProps} />);
    
    const credentialsButtons = screen.getAllByTitle('تغییر اطلاعات ورود');
    fireEvent.click(credentialsButtons[0]);
    
    await waitFor(() => {
      expect(mockProps.onUpdateCredentials).toHaveBeenCalledWith(mockTenants[0]);
    });
  });

  it('calls onManageSubscription when subscription management button is clicked', async () => {
    render(<EnhancedTenantTable {...mockProps} />);
    
    const subscriptionButtons = screen.getAllByTitle('مدیریت اشتراک');
    fireEvent.click(subscriptionButtons[0]);
    
    await waitFor(() => {
      expect(mockProps.onManageSubscription).toHaveBeenCalledWith(mockTenants[0]);
    });
  });

  it('calls onEdit when edit button is clicked', async () => {
    render(<EnhancedTenantTable {...mockProps} />);
    
    const editButtons = screen.getAllByTitle('ویرایش تنانت');
    fireEvent.click(editButtons[0]);
    
    await waitFor(() => {
      expect(mockProps.onEdit).toHaveBeenCalledWith(mockTenants[0]);
    });
  });

  it('calls onSuspend for active tenant', async () => {
    render(<EnhancedTenantTable {...mockProps} />);
    
    const suspendButton = screen.getByTitle('تعلیق تنانت');
    fireEvent.click(suspendButton);
    
    await waitFor(() => {
      expect(mockProps.onSuspend).toHaveBeenCalledWith(mockTenants[0]);
    });
  });

  it('calls onActivate for suspended tenant', async () => {
    render(<EnhancedTenantTable {...mockProps} />);
    
    const activateButton = screen.getByTitle('فعال‌سازی تنانت');
    fireEvent.click(activateButton);
    
    await waitFor(() => {
      expect(mockProps.onActivate).toHaveBeenCalledWith(mockTenants[1]);
    });
  });

  it('calls onDelete when delete button is clicked', async () => {
    render(<EnhancedTenantTable {...mockProps} />);
    
    const deleteButtons = screen.getAllByTitle('حذف تنانت');
    fireEvent.click(deleteButtons[0]);
    
    await waitFor(() => {
      expect(mockProps.onDelete).toHaveBeenCalledWith(mockTenants[0]);
    });
  });

  it('shows impersonate button only for active tenants when callback provided', () => {
    render(<EnhancedTenantTable {...mockProps} />);
    
    const impersonateButtons = screen.getAllByTitle('جانشینی کاربران تنانت');
    expect(impersonateButtons).toHaveLength(1); // Only for active tenant
  });

  it('calls onImpersonate when impersonate button is clicked', async () => {
    render(<EnhancedTenantTable {...mockProps} />);
    
    const impersonateButton = screen.getByTitle('جانشینی کاربران تنانت');
    fireEvent.click(impersonateButton);
    
    await waitFor(() => {
      expect(mockProps.onImpersonate).toHaveBeenCalledWith(mockTenants[0]);
    });
  });

  it('shows loading state correctly', () => {
    render(<EnhancedTenantTable {...mockProps} isLoading={true} />);
    
    expect(screen.getByText('در حال بارگذاری...')).toBeInTheDocument();
  });

  it('shows empty state when no tenants', () => {
    render(<EnhancedTenantTable {...mockProps} tenants={[]} />);
    
    expect(screen.getByText('هیچ تنانتی یافت نشد')).toBeInTheDocument();
  });

  it('displays domain correctly or shows dash for missing domain', () => {
    render(<EnhancedTenantTable {...mockProps} />);
    
    expect(screen.getByText('test1.com')).toBeInTheDocument();
    expect(screen.getAllByText('-')).toHaveLength(2); // For tenant without domain and expiration
  });

  it('shows user count for each tenant', () => {
    render(<EnhancedTenantTable {...mockProps} />);
    
    expect(screen.getByText('5')).toBeInTheDocument(); // First tenant user count
    expect(screen.getByText('1')).toBeInTheDocument(); // Second tenant user count
  });

  it('displays tenant ID in abbreviated form', () => {
    render(<EnhancedTenantTable {...mockProps} />);
    
    expect(screen.getByText('ID: 1...')).toBeInTheDocument();
    expect(screen.getByText('ID: 2...')).toBeInTheDocument();
  });

  it('applies hover effects to action buttons', () => {
    render(<EnhancedTenantTable {...mockProps} />);
    
    const credentialsButton = screen.getAllByTitle('تغییر اطلاعات ورود')[0];
    expect(credentialsButton).toHaveClass('hover:bg-purple-50');
    
    const subscriptionButton = screen.getAllByTitle('مدیریت اشتراک')[0];
    expect(subscriptionButton).toHaveClass('hover:bg-blue-50');
  });
});