import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Package, 
  Calculator, 
  BarChart3, 
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const navigationItems = [
  {
    title: 'داشبورد',
    href: '/',
    icon: LayoutDashboard,
    gradient: 'from-blue-500 to-indigo-600'
  },
  {
    title: 'فاکتورها',
    href: '/invoices',
    icon: FileText,
    gradient: 'from-green-500 to-teal-600'
  },
  {
    title: 'مشتریان',
    href: '/customers',
    icon: Users,
    gradient: 'from-purple-500 to-violet-600'
  },
  {
    title: 'محصولات',
    href: '/products',
    icon: Package,
    gradient: 'from-orange-500 to-red-600'
  },
  {
    title: 'حسابداری',
    href: '/accounting',
    icon: Calculator,
    gradient: 'from-teal-500 to-blue-600'
  },
  {
    title: 'گزارشات',
    href: '/reports',
    icon: BarChart3,
    gradient: 'from-pink-500 to-rose-600'
  },
  {
    title: 'تنظیمات',
    href: '/settings',
    icon: Settings,
    gradient: 'from-slate-500 to-slate-600'
  }
];

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
  const location = useLocation();

  const isActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <Card 
      variant="professional" 
      className={cn(
        "h-full bg-gradient-to-b from-slate-50 to-slate-100 transition-all duration-300 flex flex-col",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-200/50">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">ح</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">حساب پلاس</h2>
                <p className="text-xs text-slate-600">سیستم مدیریت کسب و کار</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-8 w-8 hover:bg-slate-200/50"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          
          return (
            <Link key={item.href} to={item.href}>
              <div
                className={cn(
                  "flex items-center space-x-3 space-x-reverse p-3 rounded-lg transition-all duration-200 group",
                  active
                    ? "bg-white shadow-md border-2 border-slate-200"
                    : "hover:bg-white/50 hover:shadow-sm"
                )}
              >
                <div
                  className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-200",
                    active
                      ? `bg-gradient-to-br ${item.gradient} shadow-lg`
                      : `bg-gradient-to-br ${item.gradient} opacity-70 group-hover:opacity-100 group-hover:shadow-md`
                  )}
                >
                  <Icon className="h-4 w-4 text-white" />
                </div>
                
                {!isCollapsed && (
                  <span
                    className={cn(
                      "font-medium transition-colors duration-200",
                      active
                        ? "text-slate-900"
                        : "text-slate-700 group-hover:text-slate-900"
                    )}
                  >
                    {item.title}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-slate-200/50">
          <div className="text-center">
            <p className="text-xs text-slate-500">
              نسخه ۲.۰.۰
            </p>
          </div>
        </div>
      )}
    </Card>
  );
};

export default Sidebar;