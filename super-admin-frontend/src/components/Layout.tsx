import React, { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
// import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: ReactNode;
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  gradient: string;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const navItems: NavItem[] = [
    {
      path: '/',
      label: 'داشبورد',
      gradient: 'from-green-500 to-teal-600',
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
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      path: '/analytics',
      label: 'آنالیتیکس',
      gradient: 'from-purple-500 to-violet-600',
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
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex" dir="rtl">
      {/* Sidebar */}
      <div className={cn(
        "bg-gradient-to-b from-slate-50 to-slate-100 border-l border-slate-200/50 shadow-xl transition-all duration-300",
        isSidebarCollapsed ? "w-16" : "w-64"
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
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-300 group",
                  isActive
                    ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg`
                    : "hover:bg-slate-200/50 text-slate-700 hover:text-slate-900"
                )}
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
                  <span className="font-medium">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-800">
                پلتفرم مدیریت سیستم حسابداری
              </h2>
              <p className="text-slate-600">
                مدیریت و نظارت بر تمامی تنانت‌ها و عملکرد سیستم
              </p>
            </div>
            
            {/* User Info */}
            <div className="flex items-center gap-4">
              <div className="text-left">
                <p className="text-sm font-medium text-slate-800">Super Admin</p>
                <p className="text-xs text-slate-600">admin@hesaabplus.com</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;