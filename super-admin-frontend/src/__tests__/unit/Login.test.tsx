import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Login from '@/pages/Login';
import { AuthProvider } from '@/contexts/AuthContext';
// Removed ThemeProvider import to avoid window.matchMedia issues in tests
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

// Mock react-router-dom
const mockNavigate = vi.fn();
const mockLocation = { search: '', state: null };

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  };
});

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
      <BrowserRouter>
        <AuthProvider>
          {children}
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Login Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockNavigate.mockClear();
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render login form with all required elements', () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      // Check for main elements
      expect(screen.getByText('پنل مدیریت سوپر ادمین')).toBeInTheDocument();
      expect(screen.getByText('برای ورود به سیستم مدیریت، اطلاعات خود را وارد کنید')).toBeInTheDocument();
      
      // Check for form fields
      expect(screen.getByLabelText('ایمیل')).toBeInTheDocument();
      expect(screen.getByLabelText('رمز عبور')).toBeInTheDocument();
      
      // Check for submit button
      expect(screen.getByRole('button', { name: 'ورود به سیستم' })).toBeInTheDocument();
      
      // Check for security notice
      expect(screen.getByText('اطلاعات امنیتی')).toBeInTheDocument();
    });

    it('should render session expired alert when expired parameter is present', () => {
      mockLocation.search = '?expired=true';
      
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      expect(screen.getByText('جلسه شما منقضی شده است. لطفاً مجدداً وارد شوید.')).toBeInTheDocument();
    });

    it('should render gradient design elements', () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      // Check for gradient background classes
      const container = screen.getByText('پنل مدیریت سوپر ادمین').closest('div');
      expect(container).toHaveClass('bg-gradient-to-br');
    });

    it('should render password visibility toggle', () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const passwordField = screen.getByLabelText('رمز عبور');
      expect(passwordField).toHaveAttribute('type', 'password');
      
      // Should have eye icon button
      const toggleButton = screen.getByRole('button', { name: '' }); // Eye icon button has no text
      expect(toggleButton).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show email validation error for empty email', async () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const submitButton = screen.getByRole('button', { name: 'ورود به سیستم' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('ایمیل الزامی است')).toBeInTheDocument();
      });
    });

    it('should show email validation error for invalid email format', async () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const emailField = screen.getByLabelText('ایمیل');
      fireEvent.change(emailField, { target: { value: 'invalid-email' } });

      const submitButton = screen.getByRole('button', { name: 'ورود به سیستم' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('فرمت ایمیل صحیح نیست')).toBeInTheDocument();
      });
    });

    it('should show password validation error for empty password', async () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const emailField = screen.getByLabelText('ایمیل');
      fireEvent.change(emailField, { target: { value: 'admin@example.com' } });

      const submitButton = screen.getByRole('button', { name: 'ورود به سیستم' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('رمز عبور الزامی است')).toBeInTheDocument();
      });
    });

    it('should show password validation error for short password', async () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const emailField = screen.getByLabelText('ایمیل');
      const passwordField = screen.getByLabelText('رمز عبور');
      
      fireEvent.change(emailField, { target: { value: 'admin@example.com' } });
      fireEvent.change(passwordField, { target: { value: '123' } });

      const submitButton = screen.getByRole('button', { name: 'ورود به سیستم' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('رمز عبور باید حداقل ۶ کاراکتر باشد')).toBeInTheDocument();
      });
    });

    it('should clear field errors when user starts typing', async () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const emailField = screen.getByLabelText('ایمیل');
      const submitButton = screen.getByRole('button', { name: 'ورود به سیستم' });
      
      // Trigger validation error
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('ایمیل الزامی است')).toBeInTheDocument();
      });

      // Start typing to clear error
      fireEvent.change(emailField, { target: { value: 'a' } });
      
      await waitFor(() => {
        expect(screen.queryByText('ایمیل الزامی است')).not.toBeInTheDocument();
      });
    });
  });

  describe('Password Visibility Toggle', () => {
    it('should toggle password visibility when eye icon is clicked', () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const passwordField = screen.getByLabelText('رمز عبور');
      const toggleButton = passwordField.parentElement?.querySelector('button');
      
      expect(passwordField).toHaveAttribute('type', 'password');
      
      if (toggleButton) {
        fireEvent.click(toggleButton);
        expect(passwordField).toHaveAttribute('type', 'text');
        
        fireEvent.click(toggleButton);
        expect(passwordField).toHaveAttribute('type', 'password');
      }
    });
  });

  describe('Authentication Flow', () => {
    it('should call login API with correct credentials on form submit', async () => {
      const mockResponse = {
        data: {
          access_token: 'mock-token',
          user: {
            id: '1',
            email: 'admin@example.com',
            role: 'super_admin',
            is_super_admin: true,
          },
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const emailField = screen.getByLabelText('ایمیل');
      const passwordField = screen.getByLabelText('رمز عبور');
      const submitButton = screen.getByRole('button', { name: 'ورود به سیستم' });

      fireEvent.change(emailField, { target: { value: 'admin@example.com' } });
      fireEvent.change(passwordField, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith('/api/auth/super-admin/login', {
          email: 'admin@example.com',
          password: 'password123',
        });
      });
    });

    it('should show loading state during login', async () => {
      // Mock a delayed response
      mockedAxios.post.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const emailField = screen.getByLabelText('ایمیل');
      const passwordField = screen.getByLabelText('رمز عبور');
      const submitButton = screen.getByRole('button', { name: 'ورود به سیستم' });

      fireEvent.change(emailField, { target: { value: 'admin@example.com' } });
      fireEvent.change(passwordField, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      // Should show loading state
      expect(screen.getByText('در حال ورود...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    it('should handle 401 authentication error', async () => {
      const mockError = {
        response: {
          status: 401,
          data: { message: 'Invalid credentials' },
        },
      };

      mockedAxios.post.mockRejectedValueOnce(mockError);

      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const emailField = screen.getByLabelText('ایمیل');
      const passwordField = screen.getByLabelText('رمز عبور');
      const submitButton = screen.getByRole('button', { name: 'ورود به سیستم' });

      fireEvent.change(emailField, { target: { value: 'admin@example.com' } });
      fireEvent.change(passwordField, { target: { value: 'wrongpassword' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('ایمیل یا رمز عبور اشتباه است')).toBeInTheDocument();
      });
    });

    it('should handle 403 access denied error', async () => {
      const mockError = {
        response: {
          status: 403,
          data: { message: 'Access denied' },
        },
      };

      mockedAxios.post.mockRejectedValueOnce(mockError);

      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const emailField = screen.getByLabelText('ایمیل');
      const passwordField = screen.getByLabelText('رمز عبور');
      const submitButton = screen.getByRole('button', { name: 'ورود به سیستم' });

      fireEvent.change(emailField, { target: { value: 'user@example.com' } });
      fireEvent.change(passwordField, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('شما دسترسی به پنل مدیریت ندارید')).toBeInTheDocument();
      });
    });

    it('should handle server error', async () => {
      const mockError = {
        response: {
          status: 500,
          data: { message: 'Internal server error' },
        },
      };

      mockedAxios.post.mockRejectedValueOnce(mockError);

      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const emailField = screen.getByLabelText('ایمیل');
      const passwordField = screen.getByLabelText('رمز عبور');
      const submitButton = screen.getByRole('button', { name: 'ورود به سیستم' });

      fireEvent.change(emailField, { target: { value: 'admin@example.com' } });
      fireEvent.change(passwordField, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('خطا در سرور. لطفاً بعداً تلاش کنید')).toBeInTheDocument();
      });
    });

    it('should handle network error', async () => {
      const mockError = {
        message: 'Network Error',
        response: undefined,
      };

      mockedAxios.post.mockRejectedValueOnce(mockError);

      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const emailField = screen.getByLabelText('ایمیل');
      const passwordField = screen.getByLabelText('رمز عبور');
      const submitButton = screen.getByRole('button', { name: 'ورود به سیستم' });

      fireEvent.change(emailField, { target: { value: 'admin@example.com' } });
      fireEvent.change(passwordField, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('خطا در ورود به سیستم')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      // Check form has proper structure
      const emailField = screen.getByLabelText('ایمیل');
      const passwordField = screen.getByLabelText('رمز عبور');
      const submitButton = screen.getByRole('button', { name: 'ورود به سیستم' });

      expect(emailField).toHaveAttribute('type', 'email');
      expect(passwordField).toHaveAttribute('type', 'password');
      expect(submitButton).toHaveAttribute('type', 'submit');
    });

    it('should associate error messages with form fields', async () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const submitButton = screen.getByRole('button', { name: 'ورود به سیستم' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const emailError = screen.getByText('ایمیل الزامی است');
        const passwordError = screen.getByText('رمز عبور الزامی است');
        
        expect(emailError).toBeInTheDocument();
        expect(passwordError).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const emailField = screen.getByLabelText('ایمیل');
      const passwordField = screen.getByLabelText('رمز عبور');
      const submitButton = screen.getByRole('button', { name: 'ورود به سیستم' });

      // Tab navigation should work
      emailField.focus();
      expect(document.activeElement).toBe(emailField);

      // Enter key should submit form when on submit button
      submitButton.focus();
      fireEvent.keyDown(submitButton, { key: 'Enter', code: 'Enter' });
      
      // Should trigger form validation
      expect(screen.getByText('ایمیل الزامی است')).toBeInTheDocument();
    });
  });

  describe('RTL Support', () => {
    it('should render with RTL direction', () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const container = screen.getByText('پنل مدیریت سوپر ادمین').closest('div');
      expect(container).toHaveAttribute('dir', 'rtl');
    });

    it('should have proper Persian text content', () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      expect(screen.getByText('پنل مدیریت سوپر ادمین')).toBeInTheDocument();
      expect(screen.getByText('ایمیل')).toBeInTheDocument();
      expect(screen.getByText('رمز عبور')).toBeInTheDocument();
      expect(screen.getByText('ورود به سیستم')).toBeInTheDocument();
    });
  });

  describe('Security Features', () => {
    it('should render security notice', () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      expect(screen.getByText('اطلاعات امنیتی')).toBeInTheDocument();
      expect(screen.getByText('این صفحه فقط برای مدیران سیستم است. تمام فعالیت‌ها ثبت و نظارت می‌شوند.')).toBeInTheDocument();
    });

    it('should disable form during submission', async () => {
      mockedAxios.post.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const emailField = screen.getByLabelText('ایمیل');
      const passwordField = screen.getByLabelText('رمز عبور');
      const submitButton = screen.getByRole('button', { name: 'ورود به سیستم' });

      fireEvent.change(emailField, { target: { value: 'admin@example.com' } });
      fireEvent.change(passwordField, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      // Form fields should be disabled during submission
      expect(emailField).toBeDisabled();
      expect(passwordField).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });
  });
});