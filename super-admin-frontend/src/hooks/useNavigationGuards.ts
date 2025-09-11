import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface RoutePermission {
  path: string;
  requiredRole: 'super_admin' | 'admin';
  description: string;
}

const useNavigationGuards = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // Define route permissions for admin-only features
  const routePermissions: RoutePermission[] = [
    {
      path: '/subscriptions',
      requiredRole: 'super_admin',
      description: 'مدیریت اشتراک‌ها نیاز به دسترسی سوپر ادمین دارد'
    },
    {
      path: '/online-users',
      requiredRole: 'super_admin',
      description: 'نظارت بر کاربران آنلاین نیاز به دسترسی سوپر ادمین دارد'
    },
    {
      path: '/impersonation',
      requiredRole: 'super_admin',
      description: 'جایگزینی کاربر نیاز به دسترسی سوپر ادمین دارد'
    },
    {
      path: '/error-logging',
      requiredRole: 'super_admin',
      description: 'مدیریت خطاها نیاز به دسترسی سوپر ادمین دارد'
    },
    {
      path: '/tenants',
      requiredRole: 'super_admin',
      description: 'مدیریت تنانت‌ها نیاز به دسترسی سوپر ادمین دارد'
    },
    {
      path: '/system-health',
      requiredRole: 'super_admin',
      description: 'نظارت بر سلامت سیستم نیاز به دسترسی سوپر ادمین دارد'
    },
    {
      path: '/backup-recovery',
      requiredRole: 'super_admin',
      description: 'پشتیبان‌گیری و بازیابی نیاز به دسترسی سوپر ادمین دارد'
    },
    {
      path: '/analytics',
      requiredRole: 'super_admin',
      description: 'آنالیتیکس نیاز به دسترسی سوپر ادمین دارد'
    }
  ];

  const checkRoutePermission = (path: string): boolean => {
    if (!isAuthenticated || !user) {
      return false;
    }

    const routePermission = routePermissions.find(route => route.path === path);
    
    if (!routePermission) {
      // If no specific permission is defined, allow access
      return true;
    }

    // Check if user has required role
    return user.role === routePermission.requiredRole;
  };

  const getRoutePermissionInfo = (path: string): RoutePermission | null => {
    return routePermissions.find(route => route.path === path) || null;
  };

  const hasAccessToRoute = (path: string): boolean => {
    return checkRoutePermission(path);
  };

  useEffect(() => {
    if (!isAuthenticated) {
      // If not authenticated, redirect to login
      if (location.pathname !== '/login') {
        navigate('/login', { replace: true });
      }
      return;
    }

    // Check if current route requires specific permissions
    const hasAccess = checkRoutePermission(location.pathname);
    
    if (!hasAccess) {
      // If user doesn't have access, redirect to dashboard
      console.warn(`Access denied to ${location.pathname}. Redirecting to dashboard.`);
      navigate('/', { replace: true });
    }
  }, [location.pathname, isAuthenticated, user, navigate]);

  return {
    checkRoutePermission,
    getRoutePermissionInfo,
    hasAccessToRoute,
    routePermissions
  };
};

export default useNavigationGuards;