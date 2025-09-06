import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { useSessionManagement } from '@/hooks/useSessionManagement';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { 
  Crown, 
  User, 
  Settings, 
  LogOut, 
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';


const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { tenant } = useTenant();
  const { toast } = useToast();
  const { timeRemaining, showWarning, extendSession } = useSessionManagement();

  const getSubscriptionBadge = () => {
    if (!tenant) return null;

    const isExpired = tenant.subscription_expires_at && 
      new Date(tenant.subscription_expires_at) < new Date();

    if (tenant.subscription_type === 'pro') {
      return (
        <Badge 
          variant={isExpired ? "destructive" : "success"}
          className="flex items-center space-x-1 space-x-reverse"
        >
          <Crown className="h-3 w-3" />
          <span>{isExpired ? 'پرو (منقضی)' : 'پرو'}</span>
        </Badge>
      );
    }

    return (
      <Badge variant="info" className="flex items-center space-x-1 space-x-reverse">
        <User className="h-3 w-3" />
        <span>رایگان</span>
      </Badge>
    );
  };

  const getSubscriptionStatus = () => {
    if (!tenant) return null;

    const isExpired = tenant.subscription_expires_at && 
      new Date(tenant.subscription_expires_at) < new Date();
    
    const daysUntilExpiry = tenant.subscription_expires_at 
      ? Math.ceil((new Date(tenant.subscription_expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      : null;

    if (tenant.subscription_type === 'free') {
      return (
        <div className="flex items-center space-x-2 space-x-reverse">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          <span className="text-sm text-slate-600">
            برای دسترسی به امکانات بیشتر، اشتراک خود را ارتقا دهید
          </span>
          <Button variant="gradient-green" size="sm">
            ارتقا به پرو
          </Button>
        </div>
      );
    }

    if (isExpired) {
      return (
        <div className="flex items-center space-x-2 space-x-reverse">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <span className="text-sm text-red-600">
            اشتراک شما منقضی شده است
          </span>
          <Button variant="gradient-green" size="sm">
            تمدید اشتراک
          </Button>
        </div>
      );
    }

    if (daysUntilExpiry && daysUntilExpiry <= 7) {
      return (
        <div className="flex items-center space-x-2 space-x-reverse">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          <span className="text-sm text-orange-600">
            اشتراک شما {daysUntilExpiry} روز دیگر منقضی می‌شود
          </span>
          <Button variant="gradient-green" size="sm">
            تمدید اشتراک
          </Button>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-2 space-x-reverse">
        <CheckCircle className="h-4 w-4 text-green-500" />
        <span className="text-sm text-slate-600">
          اشتراک فعال تا {tenant.subscription_expires_at ? 
            new Date(tenant.subscription_expires_at).toLocaleDateString('fa-IR') : 'نامحدود'}
        </span>
      </div>
    );
  };

  const getUserInitials = () => {
    if (!user?.email) return 'ک';
    const email = user.email;
    return email.charAt(0).toUpperCase();
  };

  const getRoleLabel = (role: string) => {
    const roleLabels: Record<string, string> = {
      'admin': 'مدیر',
      'manager': 'مدیر عامل',
      'user': 'کاربر',
      'accountant': 'حسابدار'
    };
    return roleLabels[role] || role;
  };

  return (
    <Card variant="filter" className="mb-6">
      <div className="p-4">
        <div className="flex items-center justify-between">
          {/* Left side - Tenant info and subscription */}
          <div className="flex items-center space-x-4 space-x-reverse">
            <div>
              <div className="flex items-center space-x-2 space-x-reverse mb-1">
                <h1 className="text-xl font-bold text-slate-800">
                  {tenant?.name || 'کسب و کار شما'}
                </h1>
                {getSubscriptionBadge()}
              </div>
              {getSubscriptionStatus()}
            </div>
          </div>

          {/* Right side - User menu */}
          <div className="flex items-center space-x-3 space-x-reverse">
            {/* User dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2 space-x-reverse p-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-sm">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900">
                      {user?.email}
                    </p>
                    <p className="text-xs text-slate-500">
                      {user?.role ? getRoleLabel(user.role) : 'کاربر'}
                    </p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>حساب کاربری</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="ml-2 h-4 w-4" />
                  <span>پروفایل</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="ml-2 h-4 w-4" />
                  <span>تنظیمات</span>
                </DropdownMenuItem>
                {tenant?.subscription_type === 'free' && (
                  <DropdownMenuItem>
                    <CreditCard className="ml-2 h-4 w-4" />
                    <span>ارتقا به پرو</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {showWarning && timeRemaining && (
                  <DropdownMenuItem onClick={extendSession} className="text-orange-600">
                    <Clock className="ml-2 h-4 w-4" />
                    <span>تمدید جلسه ({timeRemaining} دقیقه)</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  onClick={() => {
                    toast({
                      title: "خروج از سیستم",
                      description: "با موفقیت از سیستم خارج شدید",
                      variant: "default",
                    });
                    logout('خروج توسط کاربر');
                  }} 
                  className="text-red-600"
                >
                  <LogOut className="ml-2 h-4 w-4" />
                  <span>خروج</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default Header;