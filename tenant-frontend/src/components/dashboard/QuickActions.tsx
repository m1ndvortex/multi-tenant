/**
 * Quick Actions Component
 * Provides quick action buttons for common tasks
 */

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Users, 
  Package,
  Calculator,
  BarChart3,
  Settings,
  Plus,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  gradient: string;
  route: string;
  color: string;
}

interface QuickActionsProps {
  className?: string;
}

const QuickActions: React.FC<QuickActionsProps> = ({ className }) => {
  const navigate = useNavigate();

  const quickActions: QuickAction[] = [
    {
      id: 'create-invoice',
      title: 'ایجاد فاکتور',
      description: 'فاکتور جدید ایجاد کنید',
      icon: FileText,
      gradient: 'from-green-500 to-teal-600',
      route: '/invoices/create',
      color: 'green'
    },
    {
      id: 'add-customer',
      title: 'افزودن مشتری',
      description: 'مشتری جدید اضافه کنید',
      icon: Users,
      gradient: 'from-blue-500 to-indigo-600',
      route: '/customers/create',
      color: 'blue'
    },
    {
      id: 'add-product',
      title: 'افزودن محصول',
      description: 'محصول جدید اضافه کنید',
      icon: Package,
      gradient: 'from-purple-500 to-violet-600',
      route: '/products/create',
      color: 'purple'
    },
    {
      id: 'accounting',
      title: 'حسابداری',
      description: 'مدیریت حساب‌ها و تراکنش‌ها',
      icon: Calculator,
      gradient: 'from-orange-500 to-red-600',
      route: '/accounting',
      color: 'orange'
    },
    {
      id: 'reports',
      title: 'گزارش‌ها',
      description: 'مشاهده گزارش‌های تحلیلی',
      icon: BarChart3,
      gradient: 'from-pink-500 to-rose-600',
      route: '/reports',
      color: 'pink'
    },
    {
      id: 'settings',
      title: 'تنظیمات',
      description: 'مدیریت تنظیمات سیستم',
      icon: Settings,
      gradient: 'from-slate-500 to-slate-600',
      route: '/settings',
      color: 'slate'
    }
  ];

  const handleActionClick = (action: QuickAction) => {
    navigate(action.route);
  };

  const getCardVariant = (color: string) => {
    switch (color) {
      case 'green':
        return 'gradient-green';
      case 'blue':
        return 'gradient-blue';
      case 'purple':
        return 'gradient-purple';
      default:
        return 'professional';
    }
  };

  const getHoverClasses = (color: string) => {
    const hoverMap = {
      green: 'hover:shadow-green-200/50',
      blue: 'hover:shadow-blue-200/50',
      purple: 'hover:shadow-purple-200/50',
      orange: 'hover:shadow-orange-200/50',
      pink: 'hover:shadow-pink-200/50',
      slate: 'hover:shadow-slate-200/50'
    };
    
    return hoverMap[color as keyof typeof hoverMap] || 'hover:shadow-slate-200/50';
  };

  return (
    <Card variant="professional" className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Plus className="h-5 w-5 text-white" />
          </div>
          عملیات سریع
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Card
                key={action.id}
                variant={getCardVariant(action.color)}
                className={`cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl ${getHoverClasses(action.color)} group`}
                onClick={() => handleActionClick(action)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`h-12 w-12 rounded-lg bg-gradient-to-br ${action.gradient} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <ArrowLeft className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-colors duration-300" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-semibold text-slate-800 group-hover:text-slate-900 transition-colors duration-300">
                      {action.title}
                    </h3>
                    <p className="text-sm text-slate-600 group-hover:text-slate-700 transition-colors duration-300 leading-relaxed">
                      {action.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        {/* Additional Quick Stats */}
        <div className="mt-6 pt-6 border-t border-slate-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">
                <FileText className="h-6 w-6 mx-auto mb-2 text-green-500" />
                12
              </div>
              <p className="text-xs text-slate-500">فاکتور امروز</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                <Users className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                48
              </div>
              <p className="text-xs text-slate-500">مشتری فعال</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 mb-1">
                <Package className="h-6 w-6 mx-auto mb-2 text-purple-500" />
                156
              </div>
              <p className="text-xs text-slate-500">محصول</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 mb-1">
                <Calculator className="h-6 w-6 mx-auto mb-2 text-orange-500" />
                3
              </div>
              <p className="text-xs text-slate-500">سررسید امروز</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActions;