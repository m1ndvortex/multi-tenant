import React, { ReactNode } from 'react';
import NavigationSidebar from '@/components/navigation/NavigationSidebar';
import SuperAdminHeader from '@/components/SuperAdminHeader';
import Breadcrumb from '@/components/navigation/Breadcrumb';
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
        {/* Enhanced Header */}
        <SuperAdminHeader />

        {/* Page Header with Breadcrumb */}
        <div className="bg-white/60 backdrop-blur-sm border-b border-slate-200/30 px-6 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-800 mb-1">
                {navigationState.pageTitle}
              </h2>
              <div className="flex items-center gap-4">
                <p className="text-sm text-slate-600">
                  {navigationState.pageDescription}
                </p>
                <Breadcrumb />
              </div>
            </div>
          </div>
        </div>

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