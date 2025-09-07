import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useOnlineUsers } from '@/hooks/useOnlineUsers';
import SystemStatusIndicator from './SystemStatusIndicator';
import NotificationCenter from './NotificationCenter';
import QuickSearchModal from './QuickSearchModal';
import HeaderActions from './HeaderActions';

interface SuperAdminHeaderProps {
  className?: string;
}

const SuperAdminHeader: React.FC<SuperAdminHeaderProps> = ({ className }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { data: dashboardStats } = useDashboardStats();
  const { data: onlineData } = useOnlineUsers();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+/ or Cmd+/ for search
      if ((event.ctrlKey || event.metaKey) && event.key === '/') {
        event.preventDefault();
        setIsSearchOpen(true);
      }
      // Escape to close modals
      if (event.key === 'Escape') {
        setIsSearchOpen(false);
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <header className={cn(
        "bg-white/90 backdrop-blur-sm border-b border-slate-200/50 shadow-sm sticky top-0 z-40",
        className
      )}>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left Section - Branding and Navigation */}
            <div className="flex items-center gap-6">
              {/* Platform Branding */}
              <Link to="/" className="flex items-center gap-3 group">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="hidden md:block">
                  <h1 className="text-xl font-bold text-slate-800 group-hover:text-green-600 transition-colors">
                    HesaabPlus
                  </h1>
                  <p className="text-sm text-slate-600">
                    Super Admin Panel
                  </p>
                </div>
              </Link>

              {/* System Status Indicator */}
              <SystemStatusIndicator 
                systemHealth={dashboardStats?.system_health}
                className="hidden lg:flex"
              />
            </div>

            {/* Center Section - Quick Stats */}
            <div className="hidden xl:flex items-center gap-6">
              <div className="flex items-center gap-4">
                {/* Active Tenants */}
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {dashboardStats?.active_tenants || 0}
                  </p>
                  <p className="text-xs text-slate-600">تنانت فعال</p>
                </div>
                
                {/* Online Users */}
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {onlineData?.total_count || 0}
                  </p>
                  <p className="text-xs text-slate-600">کاربر آنلاین</p>
                </div>
                
                {/* Monthly Revenue */}
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    ${dashboardStats?.mrr?.toLocaleString() || 0}
                  </p>
                  <p className="text-xs text-slate-600">درآمد ماهانه</p>
                </div>
              </div>
            </div>

            {/* Right Section - Actions and User */}
            <div className="flex items-center gap-3">
              {/* Quick Search */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSearchOpen(true)}
                className="hover:bg-slate-100 relative group"
                title="جستجوی سراسری (Ctrl+/)"
              >
                <svg className="w-5 h-5 text-slate-600 group-hover:text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  Ctrl+/
                </div>
              </Button>

              {/* Notifications */}
              <NotificationCenter 
                isOpen={isNotificationsOpen}
                onToggle={() => setIsNotificationsOpen(!isNotificationsOpen)}
              />

              {/* Header Actions */}
              <HeaderActions />

              {/* User Profile */}
              <div className="flex items-center gap-3 pl-3 border-r border-slate-200">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-slate-800">Super Admin</p>
                  <p className="text-xs text-slate-600">{user?.email || 'admin@hesaabplus.com'}</p>
                </div>
                <div className="relative group">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center shadow-lg cursor-pointer group-hover:shadow-xl transition-all duration-300">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  
                  {/* User Dropdown */}
                  <div className="absolute left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200/50 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="font-semibold text-slate-800">Super Admin</p>
                      <p className="text-sm text-slate-600">{user?.email || 'admin@hesaabplus.com'}</p>
                    </div>
                    
                    <div className="py-2">
                      <button className="w-full flex items-center gap-3 px-4 py-2 text-right hover:bg-slate-50 transition-colors">
                        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-sm text-slate-700">تنظیمات پروفایل</span>
                      </button>
                      
                      <button className="w-full flex items-center gap-3 px-4 py-2 text-right hover:bg-slate-50 transition-colors">
                        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-sm text-slate-700">تنظیمات سیستم</span>
                      </button>
                    </div>
                    
                    <div className="border-t border-slate-100 pt-2">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2 text-right hover:bg-red-50 transition-colors text-red-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span className="text-sm font-medium">خروج از سیستم</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Quick Search Modal */}
      <QuickSearchModal 
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  );
};

export default SuperAdminHeader;