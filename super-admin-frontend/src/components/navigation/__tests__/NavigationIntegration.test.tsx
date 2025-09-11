import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Layout from '@/components/Layout';
import { NavigationProvider } from '@/contexts/NavigationContext';
import { AuthProvider } from '@/contexts/AuthContext';

// Mock AuthContext
const mockAuthContext = {
  user: { id: '1', email: 'admin@test.com', role: 'super_admin' },
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
  loading: false
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

// Mock SuperAdminHeader
vi.mock('@/components/SuperAdminHeader', () => ({
  default: () => <div data-testid="header">Header</div>
}));

// Simple test pages
const TestDashboard = () => <div data-testid="dashboard">Dashboard Page</div>;
const TestSubscriptions = () => <div data-testid="subscriptions">Subscriptions Page</div>;
const TestOnlineUsers = () => <div data-testid="online-users">Online Users Page</div>;

const createTestWrapper = (initialRoute = '/') => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <NavigationProvider>
            <Routes>
              <Route path="/*" element={
                <Layout>
                  <Routes>
                    <Route path="/" element={<TestDashboard />} />
                    <Route path="/subscriptions" element={<TestSubscriptions />} />
                    <Route path="/online-users" element={<TestOnlineUsers />} />
                  </Routes>
                </Layout>
              } />
            </Routes>
            {children}
          </NavigationProvider>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe('Navigation Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders navigation with all routes', () => {
    const Wrapper = createTestWrapper('/');
    
    render(<div />, { wrapper: Wrapper });

    // Check that navigation items are present
    expect(screen.getByText('داشبورد')).toBeInTheDocument();
    expect(screen.getByText('مدیریت اشتراک‌ها')).toBeInTheDocument();
    expect(screen.getByText('کاربران آنلاین')).toBeInTheDocument();
    expect(screen.getByText('جایگزینی کاربر')).toBeInTheDocument();
    expect(screen.getByText('مدیریت خطاها')).toBeInTheDocument();
  });

  it('navigates between routes correctly', () => {
    const Wrapper = createTestWrapper('/');
    
    render(<div />, { wrapper: Wrapper });

    // Should show dashboard initially
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();

    // Click on subscriptions link
    const subscriptionsLink = screen.getByText('مدیریت اشتراک‌ها');
    fireEvent.click(subscriptionsLink);

    // Should navigate to subscriptions page
    expect(screen.getByTestId('subscriptions')).toBeInTheDocument();
  });

  it('highlights active route correctly', () => {
    const Wrapper = createTestWrapper('/subscriptions');
    
    render(<div />, { wrapper: Wrapper });

    const subscriptionsLink = screen.getByText('مدیریت اشتراک‌ها').closest('a');
    expect(subscriptionsLink).toHaveClass('bg-gradient-to-r');
  });

  it('displays keyboard shortcuts', () => {
    const Wrapper = createTestWrapper('/');
    
    render(<div />, { wrapper: Wrapper });

    expect(screen.getByText('Ctrl+1')).toBeInTheDocument(); // Dashboard
    expect(screen.getByText('Ctrl+3')).toBeInTheDocument(); // Subscriptions
    expect(screen.getByText('Ctrl+9')).toBeInTheDocument(); // Online Users
  });

  it('toggles sidebar collapse', () => {
    const Wrapper = createTestWrapper('/');
    
    const { container } = render(<div />, { wrapper: Wrapper });

    // Initially expanded
    expect(container.querySelector('.w-64')).toBeInTheDocument();

    // Click collapse button
    const collapseButton = screen.getByTitle('جمع کردن منو');
    fireEvent.click(collapseButton);

    // Should be collapsed
    expect(container.querySelector('.w-16')).toBeInTheDocument();
  });
});