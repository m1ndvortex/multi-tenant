import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import { AuthProvider } from '@/contexts/AuthContext';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

// Mock react-router-dom Navigate component
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Navigate: ({ to, state, replace }: any) => {
      mockNavigate(to, { state, replace });
      return <div data-testid="navigate">Redirecting to {to}</div>;
    },
  };
});

// Test components
const ProtectedContent: React.FC = () => (
  <div data-testid="protected-content">Protected Content</div>
);

const TestWrapper: React.FC<{ children: React.ReactNode; initialToken?: string }> = ({ 
  children, 
  initialToken = null 
}) => {
  // Mock localStorage
  vi.mocked(localStorage.getItem).mockReturnValue(initialToken);

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              {children}
            </ProtectedRoute>
          } />
          <Route path="/" element={
            <ProtectedRoute>
              {children}
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('ProtectedRoute Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    // Mock axios defaults and interceptors
    mockedAxios.defaults = {
      headers: {
        common: {},
      },
    } as any;

    mockedAxios.interceptors = {
      response: {
        use: vi.fn(() => 1),
        eject: vi.fn(),
      },
    } as any;
  });

  describe('Loading State', () => {
    it('should show loading spinner while checking authentication', () => {
      // Mock a delayed response to keep loading state
      mockedAxios.get.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      render(
        <TestWrapper initialToken="test-token">
          <ProtectedContent />
        </TestWrapper>
      );

      expect(screen.getByText('در حال بررسی احراز هویت...')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should show loading spinner with proper styling', () => {
      mockedAxios.get.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      render(
        <TestWrapper initialToken="test-token">
          <ProtectedContent />
        </TestWrapper>
      );

      const loadingContainer = screen.getByText('در حال بررسی احراز هویت...').closest('div');
      expect(loadingContainer).toHaveClass('min-h-screen');
      expect(loadingContainer).toHaveClass('bg-gradient-to-br');
      expect(loadingContainer).toHaveClass('from-slate-50');
      expect(loadingContainer).toHaveClass('to-slate-100');
    });
  });

  describe('Unauthenticated Access', () => {
    it('should redirect to login when no token exists', async () => {
      render(
        <TestWrapper>
          <ProtectedContent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login', {
          state: { from: { pathname: '/' } },
          replace: true,
        });
      });

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should redirect to login when token verification fails', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Token invalid'));

      render(
        <TestWrapper initialToken="invalid-token">
          <ProtectedContent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login', {
          state: { from: { pathname: '/' } },
          replace: true,
        });
      });

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should preserve the attempted route in navigation state', async () => {
      // Change the current path to dashboard
      window.history.pushState({}, '', '/dashboard');

      render(
        <TestWrapper>
          <ProtectedContent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login', {
          state: { from: { pathname: '/dashboard' } },
          replace: true,
        });
      });
    });
  });

  describe('Authenticated Access', () => {
    it('should render protected content when user is authenticated', async () => {
      const mockUser = {
        id: '1',
        email: 'admin@example.com',
        role: 'super_admin',
        is_super_admin: true,
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockUser });

      render(
        <TestWrapper initialToken="valid-token">
          <ProtectedContent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });

      expect(screen.queryByText('در حال بررسی احراز هویت...')).not.toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should not show loading state after authentication is confirmed', async () => {
      const mockUser = {
        id: '1',
        email: 'admin@example.com',
        role: 'super_admin',
        is_super_admin: true,
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockUser });

      render(
        <TestWrapper initialToken="valid-token">
          <ProtectedContent />
        </TestWrapper>
      );

      // Initially should show loading
      expect(screen.getByText('در حال بررسی احراز هویت...')).toBeInTheDocument();

      // After authentication, should show content
      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });

      expect(screen.queryByText('در حال بررسی احراز هویت...')).not.toBeInTheDocument();
    });
  });

  describe('Multiple Children', () => {
    it('should render multiple children when authenticated', async () => {
      const mockUser = {
        id: '1',
        email: 'admin@example.com',
        role: 'super_admin',
        is_super_admin: true,
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockUser });

      render(
        <TestWrapper initialToken="valid-token">
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('child-1')).toBeInTheDocument();
        expect(screen.getByTestId('child-2')).toBeInTheDocument();
      });
    });

    it('should not render any children when not authenticated', async () => {
      render(
        <TestWrapper>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled();
      });

      expect(screen.queryByTestId('child-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('child-2')).not.toBeInTheDocument();
    });
  });

  describe('Authentication State Changes', () => {
    it('should handle authentication state changes properly', async () => {
      const mockUser = {
        id: '1',
        email: 'admin@example.com',
        role: 'super_admin',
        is_super_admin: true,
      };

      // First render with valid token
      mockedAxios.get.mockResolvedValueOnce({ data: mockUser });

      const { rerender } = render(
        <TestWrapper initialToken="valid-token">
          <ProtectedContent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });

      // Rerender with no token (simulating logout)
      vi.mocked(localStorage.getItem).mockReturnValue(null);
      
      rerender(
        <TestWrapper initialToken={null}>
          <ProtectedContent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login', {
          state: { from: { pathname: '/' } },
          replace: true,
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors during token verification', async () => {
      const networkError = new Error('Network Error');
      mockedAxios.get.mockRejectedValueOnce(networkError);

      render(
        <TestWrapper initialToken="test-token">
          <ProtectedContent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login', {
          state: { from: { pathname: '/' } },
          replace: true,
        });
      });

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should handle 401 errors during token verification', async () => {
      const authError = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' },
        },
      };
      mockedAxios.get.mockRejectedValueOnce(authError);

      render(
        <TestWrapper initialToken="expired-token">
          <ProtectedContent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login', {
          state: { from: { pathname: '/' } },
          replace: true,
        });
      });

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should handle 403 errors during token verification', async () => {
      const forbiddenError = {
        response: {
          status: 403,
          data: { message: 'Forbidden' },
        },
      };
      mockedAxios.get.mockRejectedValueOnce(forbiddenError);

      render(
        <TestWrapper initialToken="insufficient-permissions-token">
          <ProtectedContent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login', {
          state: { from: { pathname: '/' } },
          replace: true,
        });
      });

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper loading state accessibility', () => {
      mockedAxios.get.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      render(
        <TestWrapper initialToken="test-token">
          <ProtectedContent />
        </TestWrapper>
      );

      const loadingText = screen.getByText('در حال بررسی احراز هویت...');
      expect(loadingText).toBeInTheDocument();
      
      // Should be visible to screen readers
      expect(loadingText).not.toHaveAttribute('aria-hidden', 'true');
    });

    it('should not have any accessibility violations in loading state', () => {
      mockedAxios.get.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      render(
        <TestWrapper initialToken="test-token">
          <ProtectedContent />
        </TestWrapper>
      );

      const container = screen.getByText('در حال بررسی احراز هویت...').closest('div');
      
      // Should have proper structure
      expect(container).toHaveClass('min-h-screen');
      expect(container).toHaveClass('flex');
      expect(container).toHaveClass('items-center');
      expect(container).toHaveClass('justify-center');
    });
  });

  describe('Performance', () => {
    it('should not cause unnecessary re-renders', async () => {
      const mockUser = {
        id: '1',
        email: 'admin@example.com',
        role: 'super_admin',
        is_super_admin: true,
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockUser });

      const renderSpy = vi.fn();
      
      const TestChild: React.FC = () => {
        renderSpy();
        return <div data-testid="test-child">Test Child</div>;
      };

      render(
        <TestWrapper initialToken="valid-token">
          <TestChild />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('test-child')).toBeInTheDocument();
      });

      // Should render only once after authentication is confirmed
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });
  });
});