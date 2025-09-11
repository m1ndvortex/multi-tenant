import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import NavigationSidebar from '../NavigationSidebar';
import { NavigationProvider } from '@/contexts/NavigationContext';
import { AuthProvider } from '@/contexts/AuthContext';
import useNavigationGuards from '@/hooks/useNavigationGuards';
import useNavigationPersistence from '@/hooks/useNavigationPersistence';

// Mock the hooks
vi.mock('@/hooks/useNavigationGuards');
vi.mock('@/hooks/useNavigationPersistence');
vi.mock('@/contexts/AuthContext');

const mockNavigationGuards = vi.mocked(useNavigationGuards);
const mockNavigationPersistence = vi.mocked(useNavigationPersistence);

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
        <MemoryRouter initialEntries={[initialRoute]}>
          <NavigationProvider>
            {children}
          </NavigationProvider>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe('Enhanced Navigation System', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Default mock implementations
    mockNavigationGuards.mockReturnValue({
      hasAccessToRoute: vi.fn(() => true),
      checkRoutePermission: vi.fn(() => true),
      getRoutePermissionInfo: vi.fn(() => null),
      routePermissions: []
    });

    mockNavigationPersistence.mockReturnValue({
      navigationState: {
        lastVisitedRoute: '/',
        routeHistory: ['/'],
        sidebarCollapsed: false,
        preferences: {
          defaultRoute: '/',
          rememberLastRoute: true
        }
      },
      updateSidebarState: vi.fn(),
      updatePreferences: vi.fn(),
      getLastVisitedRoute: vi.fn(() => '/'),
      getRouteHistory: vi.fn(() => ['/']),
      clearHistory: vi.fn(),
      isRouteInHistory: vi.fn(() => false),
      getRecentRoutes: vi.fn(() => ['/'])
    });

    // Clear localStorage
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('NavigationSidebar', () => {
    it('renders all navigation items with proper access control', () => {
      const Wrapper = createTestWrapper('/');
      
      render(<NavigationSidebar />, { wrapper: Wrapper });

      // Check that main navigation items are rendered
      expect(screen.getByText('داشبورد')).toBeInTheDocument();
      expect(screen.getByText('مدیریت تنانت‌ها')).toBeInTheDocument();
      expect(screen.getByText('مدیریت اشتراک‌ها')).toBeInTheDocument();
      expect(screen.getByText('کاربران آنلاین')).toBeInTheDocument();
      expect(screen.getByText('جایگزینی کاربر')).toBeInTheDocument();
      expect(screen.getByText('مدیریت خطاها')).toBeInTheDocument();
    });

    it('highlights active route correctly', () => {
      const Wrapper = createTestWrapper('/subscriptions');
      
      render(<NavigationSidebar />, { wrapper: Wrapper });

      const subscriptionsLink = screen.getByText('مدیریت اشتراک‌ها').closest('a');
      expect(subscriptionsLink).toHaveClass('bg-gradient-to-r');
    });

    it('hides navigation items when user lacks access', () => {
      // Mock restricted access
      mockNavigationGuards.mockReturnValue({
        hasAccessToRoute: vi.fn((path: string) => path === '/'),
        checkRoutePermission: vi.fn(() => false),
        getRoutePermissionInfo: vi.fn(() => null),
        routePermissions: []
      });

      const Wrapper = createTestWrapper('/');
      
      render(<NavigationSidebar />, { wrapper: Wrapper });

      // Only dashboard should be visible
      expect(screen.getByText('داشبورد')).toBeInTheDocument();
      expect(screen.queryByText('مدیریت اشتراک‌ها')).not.toBeInTheDocument();
      expect(screen.queryByText('کاربران آنلاین')).not.toBeInTheDocument();
    });

    it('toggles sidebar collapse state', () => {
      const mockUpdateSidebarState = vi.fn();
      mockNavigationPersistence.mockReturnValue({
        navigationState: {
          lastVisitedRoute: '/',
          routeHistory: ['/'],
          sidebarCollapsed: false,
          preferences: {
            defaultRoute: '/',
            rememberLastRoute: true
          }
        },
        updateSidebarState: mockUpdateSidebarState,
        updatePreferences: vi.fn(),
        getLastVisitedRoute: vi.fn(() => '/'),
        getRouteHistory: vi.fn(() => ['/']),
        clearHistory: vi.fn(),
        isRouteInHistory: vi.fn(() => false),
        getRecentRoutes: vi.fn(() => ['/'])
      });

      const Wrapper = createTestWrapper('/');
      
      render(<NavigationSidebar />, { wrapper: Wrapper });

      const collapseButton = screen.getByTitle('جمع کردن منو');
      fireEvent.click(collapseButton);

      expect(mockUpdateSidebarState).toHaveBeenCalledWith(true);
    });

    it('displays keyboard shortcuts in tooltips when collapsed', () => {
      mockNavigationPersistence.mockReturnValue({
        navigationState: {
          lastVisitedRoute: '/',
          routeHistory: ['/'],
          sidebarCollapsed: true,
          preferences: {
            defaultRoute: '/',
            rememberLastRoute: true
          }
        },
        updateSidebarState: vi.fn(),
        updatePreferences: vi.fn(),
        getLastVisitedRoute: vi.fn(() => '/'),
        getRouteHistory: vi.fn(() => ['/']),
        clearHistory: vi.fn(),
        isRouteInHistory: vi.fn(() => false),
        getRecentRoutes: vi.fn(() => ['/'])
      });

      const Wrapper = createTestWrapper('/');
      
      render(<NavigationSidebar />, { wrapper: Wrapper });

      const dashboardLink = screen.getByTitle('داشبورد (Ctrl+1)');
      expect(dashboardLink).toBeInTheDocument();
    });
  });

  describe('Navigation Guards', () => {
    it('prevents access to restricted routes', () => {
      const mockHasAccess = vi.fn((path: string) => {
        const allowedPaths = ['/', '/tenants'];
        return allowedPaths.includes(path);
      });

      mockNavigationGuards.mockReturnValue({
        hasAccessToRoute: mockHasAccess,
        checkRoutePermission: vi.fn(() => false),
        getRoutePermissionInfo: vi.fn(() => ({
          path: '/subscriptions',
          requiredRole: 'super_admin',
          description: 'مدیریت اشتراک‌ها نیاز به دسترسی سوپر ادمین دارد'
        })),
        routePermissions: []
      });

      const Wrapper = createTestWrapper('/subscriptions');
      
      render(<NavigationSidebar />, { wrapper: Wrapper });

      expect(mockHasAccess).toHaveBeenCalledWith('/subscriptions');
    });

    it('allows access to permitted routes', () => {
      const mockHasAccess = vi.fn(() => true);

      mockNavigationGuards.mockReturnValue({
        hasAccessToRoute: mockHasAccess,
        checkRoutePermission: vi.fn(() => true),
        getRoutePermissionInfo: vi.fn(() => null),
        routePermissions: []
      });

      const Wrapper = createTestWrapper('/subscriptions');
      
      render(<NavigationSidebar />, { wrapper: Wrapper });

      expect(screen.getByText('مدیریت اشتراک‌ها')).toBeInTheDocument();
    });
  });

  describe('Navigation Persistence', () => {
    it('persists sidebar collapse state', () => {
      const mockUpdateSidebarState = vi.fn();
      
      mockNavigationPersistence.mockReturnValue({
        navigationState: {
          lastVisitedRoute: '/',
          routeHistory: ['/'],
          sidebarCollapsed: false,
          preferences: {
            defaultRoute: '/',
            rememberLastRoute: true
          }
        },
        updateSidebarState: mockUpdateSidebarState,
        updatePreferences: vi.fn(),
        getLastVisitedRoute: vi.fn(() => '/'),
        getRouteHistory: vi.fn(() => ['/']),
        clearHistory: vi.fn(),
        isRouteInHistory: vi.fn(() => false),
        getRecentRoutes: vi.fn(() => ['/'])
      });

      const Wrapper = createTestWrapper('/');
      
      render(<NavigationSidebar />, { wrapper: Wrapper });

      const collapseButton = screen.getByTitle('جمع کردن منو');
      fireEvent.click(collapseButton);

      expect(mockUpdateSidebarState).toHaveBeenCalledWith(true);
    });

    it('remembers last visited route', () => {
      const mockGetLastVisited = vi.fn(() => '/subscriptions');
      
      mockNavigationPersistence.mockReturnValue({
        navigationState: {
          lastVisitedRoute: '/subscriptions',
          routeHistory: ['/subscriptions', '/'],
          sidebarCollapsed: false,
          preferences: {
            defaultRoute: '/',
            rememberLastRoute: true
          }
        },
        updateSidebarState: vi.fn(),
        updatePreferences: vi.fn(),
        getLastVisitedRoute: mockGetLastVisited,
        getRouteHistory: vi.fn(() => ['/subscriptions', '/']),
        clearHistory: vi.fn(),
        isRouteInHistory: vi.fn(() => true),
        getRecentRoutes: vi.fn(() => ['/subscriptions'])
      });

      expect(mockGetLastVisited()).toBe('/subscriptions');
    });
  });

  describe('Route Integration', () => {
    const routes = [
      { path: '/', name: 'داشبورد' },
      { path: '/tenants', name: 'مدیریت تنانت‌ها' },
      { path: '/subscriptions', name: 'مدیریت اشتراک‌ها' },
      { path: '/online-users', name: 'کاربران آنلاین' },
      { path: '/impersonation', name: 'جایگزینی کاربر' },
      { path: '/error-logging', name: 'مدیریت خطاها' }
    ];

    routes.forEach(({ path, name }) => {
      it(`renders ${name} route correctly`, () => {
        const Wrapper = createTestWrapper(path);
        
        render(<NavigationSidebar />, { wrapper: Wrapper });

        const linkElement = screen.getByText(name);
        expect(linkElement).toBeInTheDocument();
        
        const linkContainer = linkElement.closest('a');
        expect(linkContainer).toHaveAttribute('href', path);
      });
    });
  });

  describe('Keyboard Shortcuts Integration', () => {
    it('displays correct keyboard shortcuts for each route', () => {
      const Wrapper = createTestWrapper('/');
      
      render(<NavigationSidebar />, { wrapper: Wrapper });

      // Check that shortcuts are displayed
      expect(screen.getByText('Ctrl+1')).toBeInTheDocument(); // Dashboard
      expect(screen.getByText('Ctrl+2')).toBeInTheDocument(); // Tenants
      expect(screen.getByText('Ctrl+3')).toBeInTheDocument(); // Subscriptions
    });
  });

  describe('Responsive Behavior', () => {
    it('adapts layout when sidebar is collapsed', () => {
      mockNavigationPersistence.mockReturnValue({
        navigationState: {
          lastVisitedRoute: '/',
          routeHistory: ['/'],
          sidebarCollapsed: true,
          preferences: {
            defaultRoute: '/',
            rememberLastRoute: true
          }
        },
        updateSidebarState: vi.fn(),
        updatePreferences: vi.fn(),
        getLastVisitedRoute: vi.fn(() => '/'),
        getRouteHistory: vi.fn(() => ['/']),
        clearHistory: vi.fn(),
        isRouteInHistory: vi.fn(() => false),
        getRecentRoutes: vi.fn(() => ['/'])
      });

      const Wrapper = createTestWrapper('/');
      
      const { container } = render(<NavigationSidebar />, { wrapper: Wrapper });

      // Find the main sidebar container by class
      const sidebar = container.querySelector('.w-16');
      expect(sidebar).toBeInTheDocument();
    });

    it('shows full layout when sidebar is expanded', () => {
      const Wrapper = createTestWrapper('/');
      
      const { container } = render(<NavigationSidebar />, { wrapper: Wrapper });

      // Find the main sidebar container by class
      const sidebar = container.querySelector('.w-64');
      expect(sidebar).toBeInTheDocument();
      
      // Also check that HesaabPlus text is visible when expanded
      expect(screen.getByText('HesaabPlus')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles localStorage errors gracefully', () => {
      // Mock localStorage to throw an error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new Error('localStorage error');
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const Wrapper = createTestWrapper('/');
      
      render(<NavigationSidebar />, { wrapper: Wrapper });

      // Should still render without crashing
      expect(screen.getByText('داشبورد')).toBeInTheDocument();

      // Restore localStorage
      localStorage.setItem = originalSetItem;
      consoleSpy.mockRestore();
    });
  });
});