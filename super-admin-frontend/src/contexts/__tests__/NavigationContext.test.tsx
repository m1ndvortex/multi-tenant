import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { NavigationProvider, useNavigation } from '../NavigationContext';

// Test component to access navigation context
const TestComponent: React.FC = () => {
  const { navigationState, setSidebarCollapsed, setPageInfo, toggleSidebar } = useNavigation();
  
  return (
    <div>
      <div data-testid="current-page">{navigationState.currentPage}</div>
      <div data-testid="page-title">{navigationState.pageTitle}</div>
      <div data-testid="page-description">{navigationState.pageDescription}</div>
      <div data-testid="sidebar-collapsed">{navigationState.isSidebarCollapsed.toString()}</div>
      
      <button onClick={() => setSidebarCollapsed(true)} data-testid="collapse-sidebar">
        Collapse Sidebar
      </button>
      <button onClick={() => toggleSidebar()} data-testid="toggle-sidebar">
        Toggle Sidebar
      </button>
      <button onClick={() => setPageInfo('Custom Title', 'Custom Description')} data-testid="set-page-info">
        Set Page Info
      </button>
    </div>
  );
};

const renderWithNavigationProvider = (initialEntries = ['/']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <NavigationProvider>
        <TestComponent />
      </NavigationProvider>
    </MemoryRouter>
  );
};

describe('NavigationContext', () => {
  it('provides default navigation state for home page', () => {
    renderWithNavigationProvider(['/']);
    
    expect(screen.getByTestId('current-page')).toHaveTextContent('/');
    expect(screen.getByTestId('page-title')).toHaveTextContent('داشبورد');
    expect(screen.getByTestId('page-description')).toHaveTextContent('نمای کلی سیستم و آمار کلیدی');
    expect(screen.getByTestId('sidebar-collapsed')).toHaveTextContent('false');
  });

  it('updates navigation state for tenants page', () => {
    renderWithNavigationProvider(['/tenants']);
    
    expect(screen.getByTestId('current-page')).toHaveTextContent('/tenants');
    expect(screen.getByTestId('page-title')).toHaveTextContent('مدیریت تنانت‌ها');
    expect(screen.getByTestId('page-description')).toHaveTextContent('مدیریت کاربران، اشتراک‌ها و تأیید پرداخت‌ها');
  });

  it('updates navigation state for analytics page', () => {
    renderWithNavigationProvider(['/analytics']);
    
    expect(screen.getByTestId('current-page')).toHaveTextContent('/analytics');
    expect(screen.getByTestId('page-title')).toHaveTextContent('آنالیتیکس');
    expect(screen.getByTestId('page-description')).toHaveTextContent('تحلیل رشد کاربران، درآمد و معیارهای کلیدی');
  });

  it('updates navigation state for system health page', () => {
    renderWithNavigationProvider(['/system-health']);
    
    expect(screen.getByTestId('current-page')).toHaveTextContent('/system-health');
    expect(screen.getByTestId('page-title')).toHaveTextContent('سلامت سیستم');
    expect(screen.getByTestId('page-description')).toHaveTextContent('نظارت بر عملکرد سیستم و منابع');
  });

  it('updates navigation state for backup recovery page', () => {
    renderWithNavigationProvider(['/backup-recovery']);
    
    expect(screen.getByTestId('current-page')).toHaveTextContent('/backup-recovery');
    expect(screen.getByTestId('page-title')).toHaveTextContent('پشتیبان‌گیری و بازیابی');
    expect(screen.getByTestId('page-description')).toHaveTextContent('مدیریت پشتیبان‌گیری و عملیات بازیابی');
  });

  it('updates navigation state for impersonation page', () => {
    renderWithNavigationProvider(['/impersonation']);
    
    expect(screen.getByTestId('current-page')).toHaveTextContent('/impersonation');
    expect(screen.getByTestId('page-title')).toHaveTextContent('جایگزینی کاربر');
    expect(screen.getByTestId('page-description')).toHaveTextContent('دسترسی به حساب کاربران برای پشتیبانی');
  });

  it('updates navigation state for error logging page', () => {
    renderWithNavigationProvider(['/error-logging']);
    
    expect(screen.getByTestId('current-page')).toHaveTextContent('/error-logging');
    expect(screen.getByTestId('page-title')).toHaveTextContent('مدیریت خطاها');
    expect(screen.getByTestId('page-description')).toHaveTextContent('مشاهده و تحلیل خطاهای سیستم');
  });

  it('handles unknown pages with default values', () => {
    renderWithNavigationProvider(['/unknown-page']);
    
    expect(screen.getByTestId('current-page')).toHaveTextContent('/unknown-page');
    expect(screen.getByTestId('page-title')).toHaveTextContent('صفحه نامشخص');
    expect(screen.getByTestId('page-description')).toHaveTextContent('');
  });

  it('allows setting sidebar collapsed state', () => {
    renderWithNavigationProvider();
    
    expect(screen.getByTestId('sidebar-collapsed')).toHaveTextContent('false');
    
    act(() => {
      screen.getByTestId('collapse-sidebar').click();
    });
    
    expect(screen.getByTestId('sidebar-collapsed')).toHaveTextContent('true');
  });

  it('allows toggling sidebar state', () => {
    renderWithNavigationProvider();
    
    expect(screen.getByTestId('sidebar-collapsed')).toHaveTextContent('false');
    
    act(() => {
      screen.getByTestId('toggle-sidebar').click();
    });
    
    expect(screen.getByTestId('sidebar-collapsed')).toHaveTextContent('true');
    
    act(() => {
      screen.getByTestId('toggle-sidebar').click();
    });
    
    expect(screen.getByTestId('sidebar-collapsed')).toHaveTextContent('false');
  });

  it('allows setting custom page info', () => {
    renderWithNavigationProvider();
    
    act(() => {
      screen.getByTestId('set-page-info').click();
    });
    
    expect(screen.getByTestId('page-title')).toHaveTextContent('Custom Title');
    expect(screen.getByTestId('page-description')).toHaveTextContent('Custom Description');
  });

  it('throws error when used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = () => {};
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useNavigation must be used within a NavigationProvider');
    
    console.error = originalError;
  });
});