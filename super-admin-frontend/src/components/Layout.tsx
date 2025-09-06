import React, { ReactNode } from 'react';
import NavigationSidebar from '@/components/navigation/NavigationSidebar';
import Breadcrumb from '@/components/navigation/Breadcrumb';
import UserProfileDropdown from '@/components/navigation/UserProfileDropdown';
import { useNavigation } from '@/contexts/NavigationContext';
import useKeyboardShortcuts from '@/hooks/useKeyboardShortcuts';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { navigationState } = useNavigation();
  useKeyboardShortcuts(); // Enable keyboard shortcuts

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex" dir="rtl">
      {/* Sidebar */}
      <NavigationSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2">
                <h2 className="text-2xl font-semibold text-slate-800">
                  {navigationState.pageTitle}
                </h2>
                {/* Quick Actions */}
                <div className="flex items-center gap-2">
                  <button
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors duration-200"
                    title="جستجوی سراسری (Ctrl+/)"
                  >
                    <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                  <button
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors duration-200"
                    title="اعلان‌ها"
                  >
                    <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM10.07 2.82l3.12 3.12M7.05 5.84l3.12 3.12M4.03 8.86l3.12 3.12M1.01 11.88l3.12 3.12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 mb-2">
                    {navigationState.pageDescription}
                  </p>
                  <Breadcrumb />
                </div>
              </div>
            </div>
            
            {/* User Profile Dropdown */}
            <UserProfileDropdown />
          </div>
        </header>

        {/* Page Content */}
        <main className={cn(
          "flex-1 overflow-auto transition-all duration-300",
          navigationState.isSidebarCollapsed ? "ml-16" : "ml-64"
        )}>
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;