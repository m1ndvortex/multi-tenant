import { renderHook } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import useNavigationGuards from '../useNavigationGuards';

const mockAuthContext = {
  user: null,
  isAuthenticated: false,
  login: vi.fn(),
  logout: vi.fn(),
  loading: false
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/' })
  };
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('useNavigationGuards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthContext.user = null;
    mockAuthContext.isAuthenticated = false;
  });

  it('denies access when user is not authenticated', () => {
    const { result } = renderHook(() => useNavigationGuards(), { wrapper });
    expect(result.current.checkRoutePermission('/subscriptions')).toBe(false);
  });

  it('allows access for super admin', () => {
    mockAuthContext.user = { id: '1', email: 'admin@test.com', role: 'super_admin' };
    mockAuthContext.isAuthenticated = true;

    const { result } = renderHook(() => useNavigationGuards(), { wrapper });
    expect(result.current.hasAccessToRoute('/subscriptions')).toBe(true);
  });

  it('provides route permissions list', () => {
    const { result } = renderHook(() => useNavigationGuards(), { wrapper });
    expect(result.current.routePermissions).toHaveLength(8);
  });
});