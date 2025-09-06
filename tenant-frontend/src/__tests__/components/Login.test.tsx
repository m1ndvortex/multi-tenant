import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LoginPage from '@/pages/Login';
import { AuthProvider } from '@/contexts/AuthContext';
import { TenantProvider } from '@/contexts/TenantContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

// Mock contexts
const mockLogin = vi.fn();
const mockLogout = vi.fn();

vi.mock('@/contexts/AuthContext', async () => {
  const actual = await vi.importActual('@/contexts/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      user: null,
      token: null,
      login: mockLogin,
      logout: mockLogout,
      isLoading: false,
      isAuthenticated: false,
      refreshUser: vi.fn(),
    }),
  };
});

const mockTenant = {
  id: 'tenant-1',
  name: 'تست کسب و کار',
  domain: 'test.hesaabplus.com',
  subscription_type: 'free' as const,
  subscription_expires_at: null,
  is_active: true,
};

vi.mock('@/contexts/TenantContext', async () => {
  const actual = await vi.importActual('@/contexts/TenantContext');
  return {
    ...actual,
    useTenant: () => ({
      tenant: mockTenant,
      isLoading: false,
      refreshTenant: vi.fn(),
    }),
  };
});

// Mock theme provider
vi.mock('@/contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useTheme: () => ({
    theme: 'light',
    setTheme: vi.fn(),
    actualTheme: 'light',
  }),
}));

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TenantProvider>
            <div dir="rtl">{children}</div>
          </TenantProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('LoginPage Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders login form with Persian RTL support', () => {
    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    // Check for Persian text and RTL layout
    expect(screen.getByText('حساب پلاس')).toBeInTheDocument();
    expect(screen.getByText('سیستم مدیریت کسب و کار')).toBeInTheDocument();
    expect(screen.getByText('ورود به حساب کاربری')).toBeInTheDocument();
    expect(screen.getByLabelText('آدرس ایمیل')).toBeInTheDocument();
    expect(screen.getByLabelText('رمز عبور')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ورود به سیستم' })).toBeInTheDocument();

    // Check RTL direction
    const container = screen.getByText('حساب پلاس').closest('div');
    expect(container).toHaveAttribute('dir', 'rtl');
  });

  it('displays subscription status badge for free tier', () => {
    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    expect(screen.getByText('اشتراک رایگان')).toBeInTheDocument();
  });

  it('shows upgrade prompt for free tier users', () => {
    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    expect(screen.getByText('ارتقاء به اشتراک طلایی')).toBeInTheDocument();
    expect(screen.getByText('دسترسی به امکانات پیشرفته و گزارش‌های تحلیلی')).toBeInTheDocument();
  });

  it('validates email field with Persian error messages', async () => {
    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText('آدرس ایمیل');
    const submitButton = screen.getByRole('button', { name: 'ورود به سیستم' });

    // Test empty email
    await user.click(submitButton);
    await waitFor(() => {
      expect(screen.getByText('ایمیل الزامی است')).toBeInTheDocument();
    });

    // Test invalid email format
    await user.type(emailInput, 'invalid-email');
    await user.click(submitButton);
    await waitFor(() => {
      expect(screen.getByText('فرمت ایمیل صحیح نیست')).toBeInTheDocument();
    });
  });

  it('validates password field with Persian error messages', async () => {
    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText('آدرس ایمیل');
    const passwordInput = screen.getByLabelText('رمز عبور');
    const submitButton = screen.getByRole('button', { name: 'ورود به سیستم' });

    // Enter valid email
    await user.type(emailInput, 'test@example.com');

    // Test empty password
    await user.click(submitButton);
    await waitFor(() => {
      expect(screen.getByText('رمز عبور الزامی است')).toBeInTheDocument();
    });

    // Test short password
    await user.type(passwordInput, '123');
    await user.click(submitButton);
    await waitFor(() => {
      expect(screen.getByText('رمز عبور باید حداقل ۶ کاراکتر باشد')).toBeInTheDocument();
    });
  });

  it('toggles password visibility', async () => {
    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    const passwordInput = screen.getByLabelText('رمز عبور');
    const toggleButton = screen.getByRole('button', { name: '' }); // Eye icon button

    // Initially password should be hidden
    expect(passwordInput).toHaveAttribute('type', 'password');

    // Click to show password
    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');

    // Click to hide password again
    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('handles successful login', async () => {
    const mockOnLoginSuccess = vi.fn();
    mockLogin.mockResolvedValueOnce(undefined);

    render(
      <TestWrapper>
        <LoginPage onLoginSuccess={mockOnLoginSuccess} />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText('آدرس ایمیل');
    const passwordInput = screen.getByLabelText('رمز عبور');
    const submitButton = screen.getByRole('button', { name: 'ورود به سیستم' });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(mockOnLoginSuccess).toHaveBeenCalled();
    });
  });

  it('displays Persian error messages for different login failures', async () => {
    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText('آدرس ایمیل');
    const passwordInput = screen.getByLabelText('رمز عبور');
    const submitButton = screen.getByRole('button', { name: 'ورود به سیستم' });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    // Test 401 Unauthorized
    mockLogin.mockRejectedValueOnce({ response: { status: 401 } });
    await user.click(submitButton);
    await waitFor(() => {
      expect(screen.getByText('ایمیل یا رمز عبور اشتباه است')).toBeInTheDocument();
    });

    // Test 403 Forbidden
    mockLogin.mockRejectedValueOnce({ response: { status: 403 } });
    await user.click(submitButton);
    await waitFor(() => {
      expect(screen.getByText('حساب کاربری شما غیرفعال است')).toBeInTheDocument();
    });

    // Test 429 Too Many Requests
    mockLogin.mockRejectedValueOnce({ response: { status: 429 } });
    await user.click(submitButton);
    await waitFor(() => {
      expect(screen.getByText('تعداد تلاش‌های ورود بیش از حد مجاز. لطفاً بعداً تلاش کنید')).toBeInTheDocument();
    });

    // Test generic error
    mockLogin.mockRejectedValueOnce(new Error('Network error'));
    await user.click(submitButton);
    await waitFor(() => {
      expect(screen.getByText('خطا در ورود به سیستم. لطفاً دوباره تلاش کنید')).toBeInTheDocument();
    });
  });

  it('shows loading state during login', async () => {
    // Mock a delayed login
    mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText('آدرس ایمیل');
    const passwordInput = screen.getByLabelText('رمز عبور');
    const submitButton = screen.getByRole('button', { name: 'ورود به سیستم' });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    // Check loading state
    expect(screen.getByText('در حال ورود...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it('displays gradient design system elements', () => {
    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    // Check for gradient classes in logo
    const logo = screen.getByText('ح').closest('div');
    expect(logo).toHaveClass('bg-gradient-to-br', 'from-green-500', 'to-teal-600');

    // Check for gradient title
    const title = screen.getByText('حساب پلاس');
    expect(title).toHaveClass('bg-gradient-to-r', 'from-green-600', 'to-teal-700', 'bg-clip-text', 'text-transparent');

    // Check for gradient button
    const submitButton = screen.getByRole('button', { name: 'ورود به سیستم' });
    expect(submitButton).toHaveClass('bg-gradient-to-r', 'from-green-500', 'to-teal-600');
  });

  it('handles keyboard navigation properly', async () => {
    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText('آدرس ایمیل');
    const passwordInput = screen.getByLabelText('رمز عبور');
    const submitButton = screen.getByRole('button', { name: 'ورود به سیستم' });

    // Tab navigation
    await user.tab();
    expect(emailInput).toHaveFocus();

    await user.tab();
    expect(passwordInput).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: '' })).toHaveFocus(); // Eye icon

    await user.tab();
    expect(submitButton).toHaveFocus();

    // Enter key submission
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    
    mockLogin.mockResolvedValueOnce(undefined);
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('displays subscription validation flows correctly', () => {
    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    // Free tier should show upgrade prompt
    expect(screen.getByText('ارتقاء به اشتراک طلایی')).toBeInTheDocument();
    expect(screen.getByText('اشتراک رایگان')).toBeInTheDocument();
  });

  it('handles expired subscription display', () => {
    // Mock expired pro subscription
    vi.mocked(vi.importActual('@/contexts/TenantContext')).then(actual => {
      vi.mocked(actual.useTenant).mockReturnValue({
        tenant: {
          ...mockTenant,
          subscription_type: 'pro',
          subscription_expires_at: '2023-01-01T00:00:00Z', // Past date
        },
        isLoading: false,
        refreshTenant: vi.fn(),
      });
    });

    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    // Should show upgrade prompt for expired subscription
    expect(screen.getByText('ارتقاء به اشتراک طلایی')).toBeInTheDocument();
  });
});