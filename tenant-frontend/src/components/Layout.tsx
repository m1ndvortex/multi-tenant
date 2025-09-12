import React, { ReactNode, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSessionManagement } from '@/hooks/useSessionManagement';
import { useOnlineActivity } from '@/hooks/useOnlineActivity';
import Sidebar from './Sidebar';
import Header from './Header';
import LoginPage from '@/pages/Login';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();
  
  // Initialize session management
  useSessionManagement({
    timeoutMinutes: 30,
    warningMinutes: 5,
    checkIntervalSeconds: 60
  });

  // Send periodic presence heartbeats when authenticated
  useOnlineActivity({ intervalMs: 60_000, immediate: true });

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50/30 to-white flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-white font-bold text-lg">ح</span>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-slate-200 rounded w-24 mx-auto animate-pulse"></div>
            <p className="text-slate-600">در حال بارگذاری...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50/30 to-white flex" dir="rtl">
      {/* Sidebar */}
      <div className={cn(
        "transition-all duration-300 flex-shrink-0",
        sidebarCollapsed ? "w-16" : "w-64"
      )}>
        <div className="h-screen p-4">
          <Sidebar 
            isCollapsed={sidebarCollapsed} 
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <div className="p-4 pb-0">
          <Header />
        </div>
        
        <main className="flex-1 p-4">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;