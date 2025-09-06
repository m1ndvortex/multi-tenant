import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

interface NavigationState {
  currentPage: string;
  pageTitle: string;
  pageDescription: string;
  isSidebarCollapsed: boolean;
  breadcrumbs: BreadcrumbItem[];
}

interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: React.ReactNode;
}

interface NavigationContextType {
  navigationState: NavigationState;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setPageInfo: (title: string, description?: string) => void;
  toggleSidebar: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

interface NavigationProviderProps {
  children: ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const location = useLocation();
  const [navigationState, setNavigationState] = useState<NavigationState>({
    currentPage: '/',
    pageTitle: 'داشبورد',
    pageDescription: 'نمای کلی سیستم و آمار کلیدی',
    isSidebarCollapsed: false,
    breadcrumbs: []
  });

  const pageMap: Record<string, { title: string; description: string }> = {
    '/': {
      title: 'داشبورد',
      description: 'نمای کلی سیستم و آمار کلیدی'
    },
    '/tenants': {
      title: 'مدیریت تنانت‌ها',
      description: 'مدیریت کاربران، اشتراک‌ها و تأیید پرداخت‌ها'
    },
    '/analytics': {
      title: 'آنالیتیکس',
      description: 'تحلیل رشد کاربران، درآمد و معیارهای کلیدی'
    },
    '/system-health': {
      title: 'سلامت سیستم',
      description: 'نظارت بر عملکرد سیستم و منابع'
    },
    '/backup-recovery': {
      title: 'پشتیبان‌گیری و بازیابی',
      description: 'مدیریت پشتیبان‌گیری و عملیات بازیابی'
    },
    '/impersonation': {
      title: 'جایگزینی کاربر',
      description: 'دسترسی به حساب کاربران برای پشتیبانی'
    },
    '/error-logging': {
      title: 'مدیریت خطاها',
      description: 'مشاهده و تحلیل خطاهای سیستم'
    }
  };

  useEffect(() => {
    const currentPageInfo = pageMap[location.pathname] || {
      title: 'صفحه نامشخص',
      description: ''
    };

    setNavigationState(prev => ({
      ...prev,
      currentPage: location.pathname,
      pageTitle: currentPageInfo.title,
      pageDescription: currentPageInfo.description
    }));
  }, [location.pathname]);

  const setSidebarCollapsed = (collapsed: boolean) => {
    setNavigationState(prev => ({
      ...prev,
      isSidebarCollapsed: collapsed
    }));
  };

  const toggleSidebar = () => {
    setNavigationState(prev => ({
      ...prev,
      isSidebarCollapsed: !prev.isSidebarCollapsed
    }));
  };

  const setPageInfo = (title: string, description?: string) => {
    setNavigationState(prev => ({
      ...prev,
      pageTitle: title,
      pageDescription: description || prev.pageDescription
    }));
  };

  const contextValue: NavigationContextType = {
    navigationState,
    setSidebarCollapsed,
    setPageInfo,
    toggleSidebar
  };

  return (
    <NavigationContext.Provider value={contextValue}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = (): NavigationContextType => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

export default NavigationContext;