import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

// Mock window.location
const mockLocationHref = vi.fn();
Object.defineProperty(window, 'location', {
  value: {
    href: '',
    pathname: '/dashboard',
  },
  writable: true,
});

// Test component to access auth context
const TestComponent: React.FC = () => {
  const { user, token, login, logout, isLoading, isAuthenticated, refreshToken } = useAuth();

  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'not-loading'}</div>
      <div data-testid="authenticated">{isAuthenticated ? 'authenticated' : 'not-authenticated'}</div>
      <div data-testid="user">{user ? JSON.stringify(user) : 'no-user'}</div>
      <div data-testid="token">{token || 'no-token'}</div>
      
      <button onClick={() => login('test@example.com', 'password')}>Login</button>
      <button onClick={() => logout()}>Logout</button>
      <button onClick={() => logout(true)}>Logout with Redirect</button>
      <button onClick={() => refreshToken()}>Refresh Token</button>
    </div>
  );
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <AuthProvider>
      {children}
    </AuthProvider>
  </BrowserRouter>
);

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    
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

    // Mock axios defaults
    mockedAxios.defaults = {
      headers: {
        common: {},
      },
    } as any;

    // Mock axios interceptors
    mockedAxios.interceptors = {
      response: {
        use: vi.fn(() => 1),
        eject: vi.fn(),
      },
    } as any;

    // Reset window.location
    Object.defineProperty(window, 'location', {
      value: {
        href: '',
        pathname: '/dashboard',
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with no user and no token', () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
      expect(screen.getByTestId('user')).toHaveTextContent('no-user');
      expect(screen.getByTestId('token')).toHaveTextContent('no-token');
    });

    it('should initialize with loading state', () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('loading')).toHaveTextContent('loading');
    });

    it('should initialize with existing token from localStorage', async () => {
      const mockToken = 'existing-token';
      const mockUser = {
        id: '1',
        email: 'admin@example.com',
        role: 'super_admin',
        is_super_admin: true,
      };

      vi.mocked(localStorage.getItem).mockReturnValue(mockToken);
      mockedAxios.get.mockResolvedValueOnce({ data: mockUser });

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
      expect(screen.getByTestId('token')).toHaveTextContent(mockToken);
      expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(mockUser));
    });

    it('should handle token verification failure', async () => {
      const mockToken = 'invalid-token';
      
      vi.mocked(localStorage.getItem).mockReturnValue(mockToken);
      mockedAxios.get.mockRejectedValueOnce(new Error('Token invalid'));

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
      expect(screen.getByTestId('token')).toHaveTextContent('no-token');
    });
  });

  describe('Login Flow', () => {
    it('should login successfully with valid credentials', async () => {
    const mockResponse = {
        data: {
      access_token: 'new-token',
      refresh_token: 'new-refresh',
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
          <TestComponent />
        </TestWrapper>
      );

      // Wait for initial loading to complete
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      const loginButton = screen.getByText('Login');
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
      });

      expect(mockedAxios.post).toHaveBeenCalledWith('/api/auth/super-admin/login', {
        email: 'test@example.com',
        password: 'password',
      });

      expect(screen.getByTestId('token')).toHaveTextContent('new-token');
      expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(mockResponse.data.user));
  expect(localStorage.setItem).toHaveBeenCalledWith('super_admin_token', 'new-token');
  expect(localStorage.setItem).toHaveBeenCalledWith('super_admin_refresh_token', 'new-refresh');
    });

    it('should handle login failure', async () => {
      const mockError = new Error('Login failed');
      mockedAxios.post.mockRejectedValueOnce(mockError);

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Wait for initial loading to complete
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      const loginButton = screen.getByText('Login');
      
      await expect(async () => {
        fireEvent.click(loginButton);
        await waitFor(() => {
          expect(mockedAxios.post).toHaveBeenCalled();
        });
      }).rejects.toThrow('Login failed');

      expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
    });

    it('should set axios authorization header on login', async () => {
      const mockResponse = {
        data: {
          access_token: 'new-token',
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
          <TestComponent />
        </TestWrapper>
      );

      // Wait for initial loading to complete
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      const loginButton = screen.getByText('Login');
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
      });

      expect(mockedAxios.defaults.headers.common['Authorization']).toBe('Bearer new-token');
    });
  });

  describe('Logout Flow', () => {
    it('should logout and clear all auth data', async () => {
      // First login
    const mockResponse = {
        data: {
      access_token: 'test-token',
      refresh_token: 'test-refresh',
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
          <TestComponent />
        </TestWrapper>
      );

      // Wait for initial loading to complete
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      // Login
      const loginButton = screen.getByText('Login');
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
      });

      // Logout
      const logoutButton = screen.getByText('Logout');
      fireEvent.click(logoutButton);

      expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
      expect(screen.getByTestId('user')).toHaveTextContent('no-user');
      expect(screen.getByTestId('token')).toHaveTextContent('no-token');
      expect(localStorage.removeItem).toHaveBeenCalledWith('super_admin_token');
  expect(mockedAxios.defaults.headers.common['Authorization']).toBeUndefined();
  expect(localStorage.removeItem).toHaveBeenCalledWith('super_admin_refresh_token');
    });

    it('should redirect to login page when logout with redirect is called', async () => {
      // Mock window.location.href setter
      const mockHref = vi.fn();
      Object.defineProperty(window.location, 'href', {
        set: mockHref,
        configurable: true,
      });

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Wait for initial loading to complete
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      const logoutWithRedirectButton = screen.getByText('Logout with Redirect');
      fireEvent.click(logoutWithRedirectButton);

      expect(mockHref).toHaveBeenCalledWith('/login?expired=true');
    });

    it('should not redirect if already on login page', async () => {
      // Set current path to login
      Object.defineProperty(window.location, 'pathname', {
        value: '/login',
        configurable: true,
      });

      const mockHref = vi.fn();
      Object.defineProperty(window.location, 'href', {
        set: mockHref,
        configurable: true,
      });

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Wait for initial loading to complete
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      const logoutWithRedirectButton = screen.getByText('Logout with Redirect');
      fireEvent.click(logoutWithRedirectButton);

      expect(mockHref).not.toHaveBeenCalled();
    });
  });

  describe('Token Refresh', () => {
    it('should refresh token successfully', async () => {
      const mockRefreshResponse = {
        data: {
          access_token: 'refreshed-token',
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockRefreshResponse);

      // Provide a stored refresh token
      vi.mocked(localStorage.getItem).mockImplementation((key: string) => {
        if (key === 'super_admin_refresh_token') return 'refresh-token';
        return null;
      });

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Wait for initial loading to complete
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      const refreshButton = screen.getByText('Refresh Token');
      fireEvent.click(refreshButton);

      await waitFor(() => {
  expect(mockedAxios.post).toHaveBeenCalledWith('/api/auth/refresh', { refresh_token: 'refresh-token' });
      });

      expect(screen.getByTestId('token')).toHaveTextContent('refreshed-token');
      expect(localStorage.setItem).toHaveBeenCalledWith('super_admin_token', 'refreshed-token');
      expect(mockedAxios.defaults.headers.common['Authorization']).toBe('Bearer refreshed-token');
    });

    it('should logout on refresh token failure', async () => {
      const mockError = new Error('Refresh failed');
      mockedAxios.post.mockRejectedValueOnce(mockError);

      // Provide a stored refresh token
      vi.mocked(localStorage.getItem).mockImplementation((key: string) => {
        if (key === 'super_admin_refresh_token') return 'refresh-token';
        return null;
      });

      const mockHref = vi.fn();
      Object.defineProperty(window.location, 'href', {
        set: mockHref,
        configurable: true,
      });

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Wait for initial loading to complete
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      const refreshButton = screen.getByText('Refresh Token');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockHref).toHaveBeenCalledWith('/login?expired=true');
      });

      expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
    });
  });

  describe('Session Management', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should setup session timeout after login', async () => {
      const mockResponse = {
        data: {
          access_token: 'test-token',
          user: {
            id: '1',
            email: 'admin@example.com',
            role: 'super_admin',
            is_super_admin: true,
          },
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const mockHref = vi.fn();
      Object.defineProperty(window.location, 'href', {
        set: mockHref,
        configurable: true,
      });

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Wait for initial loading to complete
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      // Login
      const loginButton = screen.getByText('Login');
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
      });

      // Fast-forward time to trigger session timeout (30 minutes)
      act(() => {
        vi.advanceTimersByTime(30 * 60 * 1000);
      });

      expect(mockHref).toHaveBeenCalledWith('/login?expired=true');
    });

    it('should reset session timer on user activity', async () => {
      const mockResponse = {
        data: {
          access_token: 'test-token',
          user: {
            id: '1',
            email: 'admin@example.com',
            role: 'super_admin',
            is_super_admin: true,
          },
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const mockHref = vi.fn();
      Object.defineProperty(window.location, 'href', {
        set: mockHref,
        configurable: true,
      });

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Wait for initial loading to complete
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      // Login
      const loginButton = screen.getByText('Login');
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
      });

      // Simulate user activity after 20 minutes
      act(() => {
        vi.advanceTimersByTime(20 * 60 * 1000);
        fireEvent.mouseMove(document);
      });

      // Fast-forward another 20 minutes (should not timeout yet)
      act(() => {
        vi.advanceTimersByTime(20 * 60 * 1000);
      });

      expect(mockHref).not.toHaveBeenCalled();

      // Fast-forward another 15 minutes (should timeout now)
      act(() => {
        vi.advanceTimersByTime(15 * 60 * 1000);
      });

      expect(mockHref).toHaveBeenCalledWith('/login?expired=true');
    });
  });

  describe('Axios Interceptors', () => {
    it('should setup response interceptor to handle 401 errors', async () => {
      const mockResponse = {
        data: {
          access_token: 'test-token',
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
          <TestComponent />
        </TestWrapper>
      );

      // Wait for initial loading to complete
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      // Verify interceptor was set up
      expect(mockedAxios.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle useAuth outside of AuthProvider', () => {
      // This should throw an error
      expect(() => {
        render(<TestComponent />);
      }).toThrow('useAuth must be used within an AuthProvider');
    });
  });
});