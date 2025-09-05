import React, { ReactNode, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from './Sidebar';
import Header from './Header';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50/30 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-lg">ح</span>
          </div>
          <p className="text-slate-600">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50/30 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center mx-auto mb-6">
            <span className="text-white font-bold text-2xl">ح</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">حساب پلاس</h1>
          <p className="text-slate-600 mb-8">سیستم مدیریت کسب و کار</p>
          <p className="text-slate-500">لطفاً وارد شوید</p>
        </div>
      </div>
    );
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