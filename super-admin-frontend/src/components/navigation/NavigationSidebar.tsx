import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  gradient: string;
  section: string;
  shortcut?: string;
}

interface NavigationSidebarProps {
  className?: string;
}

const NavigationSidebar: React.FC<NavigationSidebarProps> = ({ className }) => {
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const navItems: NavItem[] = [
    {
      path: '/',
      label: 'داشبورد',
      gradient: 'from-green-500 to-teal-600',
      section: 'main',
      shortcut: 'Ctrl+1',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
        </svg>
      ),
    },
    {
      path: '/tenants',
      label: 'مدیریت تنانت‌ها',
      gradient: 'from-blue-500 to-indigo-600',
      section: 'management',
      shortcut: 'Ctrl+2',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      path: '/subscriptions',
      label: 'مدیریت اشتراک‌ها',
      gradient: 'from-emerald-500 to-teal-600',
      section: 'management',
      shortcut: 'Ctrl+3',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      path: '/analytics',
      label: 'آنالیتیکس',
      gradient: 'from-purple-500 to-violet-600',
      section: 'analytics',
      shortcut: 'Ctrl+4',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      path: '/system-health',
      label: 'سلامت سیستم',
      gradient: 'from-teal-500 to-cyan-600',
      section: 'monitoring',
      shortcut: 'Ctrl+5',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      path: '/backup-recovery',
      label: 'پشتیبان‌گیری',
      gradient: 'from-orange-500 to-red-600',
      section: 'operations',
      shortcut: 'Ctrl+6',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
        </svg>
      ),
    },
    {
      path: '/impersonation',
      label: 'جایگزینی کاربر',
      gradient: 'from-pink-500 to-rose-600',
      section: 'operations',
      shortcut: 'Ctrl+7',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      path: '/error-logging',
      label: 'مدیریت خطاها',
      gradient: 'from-red-500 to-pink-600',
      section: 'monitoring',
      shortcut: 'Ctrl+8',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      path: '/online-users',
      label: 'کاربران آنلاین',
      gradient: 'from-cyan-500 to-blue-600',
      section: 'monitoring',
      shortcut: 'Ctrl+9',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
        </svg>
      ),
    },
  ];

  const sections = {
    main: 'اصلی',
    management: 'مدیریت',
    analytics: 'تحلیل و گزارش',
    monitoring: 'نظارت',
    operations: 'عملیات'
  };

  const groupedNavItems = navItems.reduce((acc, item) => {
    if (!acc[item.section]) {
      acc[item.section] = [];
    }
    acc[item.section].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  return (
    <div className={cn(
      "bg-gradient-to-b from-slate-50 to-slate-100 border-l border-slate-200/50 shadow-xl transition-all duration-300 flex flex-col",
      isSidebarCollapsed ? "w-16" : "w-64",
      className
    )}>
      {/* Header */}
      <div className="p-6 border-b border-slate-200/50">
        <div className="flex items-center justify-between">
          {!isSidebarCollapsed && (
            <div>
              <h1 className="text-xl font-bold text-slate-800">
                HesaabPlus
              </h1>
              <p className="text-sm text-slate-600">
                Super Admin
              </p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hover:bg-slate-200/50"
            title={isSidebarCollapsed ? "گسترش منو" : "جمع کردن منو"}
          >
            <svg 
              className={cn(
                "w-5 h-5 transition-transform duration-300",
                isSidebarCollapsed && "rotate-180"
              )} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        {Object.entries(groupedNavItems).map(([sectionKey, items]) => (
          <div key={sectionKey}>
            {!isSidebarCollapsed && (
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-3">
                {sections[sectionKey as keyof typeof sections]}
              </h3>
            )}
            <div className="space-y-1">
              {items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-300 group relative",
                      isActive
                        ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg`
                        : "hover:bg-slate-200/50 text-slate-700 hover:text-slate-900"
                    )}
                    title={isSidebarCollapsed ? `${item.label} (${item.shortcut})` : undefined}
                  >
                    <div className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300",
                      isActive
                        ? "bg-white/20"
                        : `bg-gradient-to-br ${item.gradient} text-white shadow-md group-hover:shadow-lg`
                    )}>
                      {item.icon}
                    </div>
                    {!isSidebarCollapsed && (
                      <div className="flex-1 flex items-center justify-between">
                        <span className="font-medium">{item.label}</span>
                        {item.shortcut && (
                          <span className={cn(
                            "text-xs px-2 py-1 rounded transition-colors duration-200",
                            isActive 
                              ? "bg-white/20 text-white/80" 
                              : "bg-slate-200/50 text-slate-500"
                          )}>
                            {item.shortcut}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Active indicator */}
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/50 rounded-r-full" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      {!isSidebarCollapsed && (
        <div className="p-4 border-t border-slate-200/50">
          <div className="text-xs text-slate-500 text-center">
            <p>نسخه 2.0.0</p>
            <p className="mt-1">© 2024 HesaabPlus</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default NavigationSidebar;