import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import useNavigationPersistence from '../useNavigationPersistence';

const mockLocation = { pathname: '/' };
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useLocation: () => mockLocation
  };
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('useNavigationPersistence', () => {
  beforeEach(() => {
    localStorage.clear();
    mockLocation.pathname = '/';
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useNavigationPersistence(), { wrapper });
    expect(result.current.navigationState.lastVisitedRoute).toBe('/');
  });

  it('updates sidebar state', () => {
    const { result } = renderHook(() => useNavigationPersistence(), { wrapper });
    
    act(() => {
      result.current.updateSidebarState(true);
    });

    expect(result.current.navigationState.sidebarCollapsed).toBe(true);
  });

  it('persists to localStorage', () => {
    const { result } = renderHook(() => useNavigationPersistence(), { wrapper });
    
    act(() => {
      result.current.updateSidebarState(true);
    });

    const saved = JSON.parse(localStorage.getItem('hesaabplus_navigation_state') || '{}');
    expect(saved.sidebarCollapsed).toBe(true);
  });
});