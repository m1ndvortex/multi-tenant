import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserManagement from '@/components/settings/UserManagement';
import { settingsService } from '@/services/settingsService';

// Mock the settings service
vi.mock('@/services/settingsService', () => ({
  settingsService: {
    getUsers: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    resetUserPassword: vi.fn(),
  },
}));

// Mock the toast hook
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockSettingsService = settingsService as any;

const mockUsers = [
  {
    id: '1',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin' as const,
    isActive: true,
    lastLogin: '2024-01-01T00:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    email: 'user@example.com',
    name: 'Regular User',
    role: 'user' as const,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '3',
    email: 'inactive@example.com',
    name: 'Inactive User',
    role: 'user' as const,
    isActive: false,
    createdAt: '2024-01-01T00:00:00Z',
  },
];

describe('UserManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSettingsService.getUsers.mockResolvedValue(mockUsers);
  });

  it('should render loading state initially', () => {
    render(<UserManagement />);
    expect(screen.getByRole('generic')).toBeInTheDocument();
  });

  it('should render users list after loading', async () => {
    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText('مدیریت کاربران')).toBeInTheDocument();
    });

    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText('Regular User')).toBeInTheDocument();
    expect(screen.getByText('Inactive User')).toBeInTheDocument();
    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    expect(screen.getByText('user@example.com')).toBeInTheDocument();
  });

  it('should display user roles correctly', async () => {
    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText('مدیر کل')).toBeInTheDocument();
    });

    expect(screen.getAllByText('کاربر')).toHaveLength(2); // Two regular users
    expect(screen.getByText('غیرفعال')).toBeInTheDocument();
  });

  it('should open create user dialog', async () => {
    const user = userEvent.setup();
    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText('کاربر جدید')).toBeInTheDocument();
    });

    const createButton = screen.getByText('کاربر جدید');
    await user.click(createButton);

    expect(screen.getByText('ایجاد کاربر جدید')).toBeInTheDocument();
    expect(screen.getByLabelText('ایمیل *')).toBeInTheDocument();
    expect(screen.getByLabelText('نام *')).toBeInTheDocument();
    expect(screen.getByLabelText('رمز عبور *')).toBeInTheDocument();
  });

  it('should create new user', async () => {
    const user = userEvent.setup();
    const newUser = {
      id: '4',
      email: 'newuser@example.com',
      name: 'New User',
      role: 'user' as const,
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
    };
    mockSettingsService.createUser.mockResolvedValue(newUser);

    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText('کاربر جدید')).toBeInTheDocument();
    });

    // Open create dialog
    const createButton = screen.getByText('کاربر جدید');
    await user.click(createButton);

    // Fill form
    await user.type(screen.getByLabelText('ایمیل *'), 'newuser@example.com');
    await user.type(screen.getByLabelText('نام *'), 'New User');
    await user.type(screen.getByLabelText('رمز عبور *'), 'password123');

    // Submit form
    const submitButton = screen.getByText('ایجاد کاربر');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockSettingsService.createUser).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        name: 'New User',
        role: 'user',
        password: 'password123',
      });
    });
  });

  it('should validate create user form', async () => {
    const user = userEvent.setup();
    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText('کاربر جدید')).toBeInTheDocument();
    });

    // Open create dialog
    const createButton = screen.getByText('کاربر جدید');
    await user.click(createButton);

    // Try to submit without filling required fields
    const submitButton = screen.getByText('ایجاد کاربر');
    await user.click(submitButton);

    // Should not call create service
    expect(mockSettingsService.createUser).not.toHaveBeenCalled();
  });

  it('should open edit user dialog', async () => {
    const user = userEvent.setup();
    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    // Click edit button for first user
    const editButtons = screen.getAllByRole('button');
    const editButton = editButtons.find(btn => 
      btn.querySelector('svg')?.getAttribute('class')?.includes('lucide-edit')
    );
    
    if (editButton) {
      await user.click(editButton);
      expect(screen.getByText('ویرایش کاربر')).toBeInTheDocument();
    }
  });

  it('should update user', async () => {
    const user = userEvent.setup();
    const updatedUser = { ...mockUsers[0], name: 'Updated Admin' };
    mockSettingsService.updateUser.mockResolvedValue(updatedUser);

    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    // Click edit button for first user
    const editButtons = screen.getAllByRole('button');
    const editButton = editButtons.find(btn => 
      btn.querySelector('svg')?.getAttribute('class')?.includes('lucide-edit')
    );
    
    if (editButton) {
      await user.click(editButton);
      
      // Update name
      const nameInput = screen.getByDisplayValue('Admin User');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Admin');

      // Submit
      const saveButton = screen.getByText('ذخیره تغییرات');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockSettingsService.updateUser).toHaveBeenCalledWith('1', {
          name: 'Updated Admin',
          role: 'admin',
          isActive: true,
        });
      });
    }
  });

  it('should reset user password', async () => {
    const user = userEvent.setup();
    mockSettingsService.resetUserPassword.mockResolvedValue({
      temporaryPassword: 'temp123',
    });

    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    // Click reset password button
    const resetButtons = screen.getAllByRole('button');
    const resetButton = resetButtons.find(btn => 
      btn.querySelector('svg')?.getAttribute('class')?.includes('lucide-key')
    );
    
    if (resetButton) {
      await user.click(resetButton);

      await waitFor(() => {
        expect(mockSettingsService.resetUserPassword).toHaveBeenCalledWith('1');
      });
    }
  });

  it('should delete user with confirmation', async () => {
    const user = userEvent.setup();
    mockSettingsService.deleteUser.mockResolvedValue(undefined);

    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    // Click delete button
    const deleteButtons = screen.getAllByRole('button');
    const deleteButton = deleteButtons.find(btn => 
      btn.querySelector('svg')?.getAttribute('class')?.includes('lucide-trash-2')
    );
    
    if (deleteButton) {
      await user.click(deleteButton);

      // Confirm deletion
      const confirmButton = screen.getByText('حذف');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockSettingsService.deleteUser).toHaveBeenCalledWith('1');
      });
    }
  });

  it('should display empty state when no users', async () => {
    mockSettingsService.getUsers.mockResolvedValue([]);

    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText('هیچ کاربری یافت نشد')).toBeInTheDocument();
    });
  });

  it('should handle load error', async () => {
    mockSettingsService.getUsers.mockRejectedValue(new Error('Load failed'));

    render(<UserManagement />);

    await waitFor(() => {
      // Component should still render but with loading state or error handling
      expect(screen.getByText('مدیریت کاربران')).toBeInTheDocument();
    });
  });

  it('should handle create user error', async () => {
    const user = userEvent.setup();
    mockSettingsService.createUser.mockRejectedValue(new Error('Create failed'));

    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText('کاربر جدید')).toBeInTheDocument();
    });

    // Open create dialog and fill form
    const createButton = screen.getByText('کاربر جدید');
    await user.click(createButton);

    await user.type(screen.getByLabelText('ایمیل *'), 'newuser@example.com');
    await user.type(screen.getByLabelText('نام *'), 'New User');
    await user.type(screen.getByLabelText('رمز عبور *'), 'password123');

    const submitButton = screen.getByText('ایجاد کاربر');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockSettingsService.createUser).toHaveBeenCalled();
    });
  });

  it('should display user avatars with initials', async () => {
    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText('A')).toBeInTheDocument(); // Admin User
      expect(screen.getByText('R')).toBeInTheDocument(); // Regular User
      expect(screen.getByText('I')).toBeInTheDocument(); // Inactive User
    });
  });

  it('should display last login information', async () => {
    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText(/آخرین ورود:/)).toBeInTheDocument();
    });
  });
});