import React from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Crown, 
  Zap, 
  AlertCircle, 
  Users, 
  Package, 
  FileText, 
  Calendar,
  ArrowUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubscriptionStatusProps {
  showUpgradePrompt?: boolean;
  compact?: boolean;
  className?: string;
}

interface UsageStats {
  users: { current: number; limit: number };
  products: { current: number; limit: number };
  customers: { current: number; limit: number };
  invoices: { current: number; limit: number };
}

const SubscriptionStatus: React.FC<SubscriptionStatusProps> = ({
  showUpgradePrompt = true,
  compact = false,
  className
}) => {
  const { tenant, isLoading } = useTenant();

  // Mock usage stats - in real implementation, this would come from API
  const usageStats: UsageStats = {
    users: { current: 1, limit: tenant?.subscription_type === 'pro' ? 5 : 1 },
    products: { current: 8, limit: tenant?.subscription_type === 'pro' ? -1 : 10 },
    customers: { current: 15, limit: tenant?.subscription_type === 'pro' ? -1 : 10 },
    invoices: { current: 25, limit: tenant?.subscription_type === 'pro' ? -1 : 10 },
  };

  if (isLoading || !tenant) {
    return (
      <Card variant="professional" className={cn("animate-pulse", className)}>
        <CardContent className="p-4">
          <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-slate-200 rounded w-1/2"></div>
        </CardContent>
      </Card>
    );
  }

  const isExpired = tenant.subscription_expires_at && 
    new Date(tenant.subscription_expires_at) < new Date();
  
  const isPro = tenant.subscription_type === 'pro' && !isExpired;
  const isFree = tenant.subscription_type === 'free';
  const needsUpgrade = isFree || isExpired;

  const getSubscriptionBadge = () => {
    if (isPro) {
      return (
        <Badge className="bg-gradient-to-r from-purple-500 to-violet-600 text-white border-0">
          <Crown className="w-3 h-3 ml-1" />
          اشتراک طلایی
        </Badge>
      );
    } else if (isExpired) {
      return (
        <Badge variant="destructive">
          <AlertCircle className="w-3 h-3 ml-1" />
          اشتراک منقضی شده
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-gradient-to-r from-green-500 to-teal-600 text-white border-0">
          <Zap className="w-3 h-3 ml-1" />
          اشتراک رایگان
        </Badge>
      );
    }
  };

  const getExpiryInfo = () => {
    if (!tenant.subscription_expires_at) return null;
    
    const expiryDate = new Date(tenant.subscription_expires_at);
    const now = new Date();
    const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysRemaining <= 0) {
      return (
        <div className="flex items-center text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 ml-1" />
          منقضی شده
        </div>
      );
    } else if (daysRemaining <= 7) {
      return (
        <div className="flex items-center text-orange-600 text-sm">
          <Calendar className="w-4 h-4 ml-1" />
          {daysRemaining} روز باقی‌مانده
        </div>
      );
    } else {
      return (
        <div className="flex items-center text-slate-600 text-sm">
          <Calendar className="w-4 h-4 ml-1" />
          {daysRemaining} روز باقی‌مانده
        </div>
      );
    }
  };

  const getUsagePercentage = (current: number, limit: number) => {
    if (limit === -1) return 0; // Unlimited
    return Math.min((current / limit) * 100, 100);
  };

  const isNearLimit = (current: number, limit: number) => {
    if (limit === -1) return false;
    return current >= limit * 0.8; // 80% threshold
  };

  if (compact) {
    return (
      <div className={cn("flex items-center space-x-3 space-x-reverse", className)}>
        {getSubscriptionBadge()}
        {getExpiryInfo()}
        {needsUpgrade && showUpgradePrompt && (
          <Button variant="gradient-purple" size="sm">
            <ArrowUp className="w-3 h-3 ml-1" />
            ارتقاء
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Subscription Info Card */}
      <Card variant="professional">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">وضعیت اشتراک</CardTitle>
            {getSubscriptionBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Expiry Info */}
          {getExpiryInfo()}
          
          {/* Upgrade Prompt */}
          {needsUpgrade && showUpgradePrompt && (
            <Alert className="border-purple-200 bg-gradient-to-r from-purple-50 to-violet-50">
              <Crown className="h-4 w-4 text-purple-600" />
              <AlertDescription className="text-purple-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">ارتقاء به اشتراک طلایی</p>
                    <p className="text-sm">دسترسی به امکانات پیشرفته و گزارش‌های تحلیلی</p>
                  </div>
                  <Button variant="gradient-purple" size="sm">
                    ارتقاء
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Usage Limits Card */}
      {isFree && (
        <Card variant="gradient-green">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">محدودیت‌های استفاده</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Users */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <Users className="w-4 h-4 ml-2 text-slate-600" />
                  <span>کاربران</span>
                </div>
                <span className={cn(
                  "font-medium",
                  isNearLimit(usageStats.users.current, usageStats.users.limit) && "text-orange-600"
                )}>
                  {usageStats.users.current} / {usageStats.users.limit}
                </span>
              </div>
              <Progress 
                value={getUsagePercentage(usageStats.users.current, usageStats.users.limit)}
                className="h-2"
              />
            </div>

            {/* Products */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <Package className="w-4 h-4 ml-2 text-slate-600" />
                  <span>محصولات</span>
                </div>
                <span className={cn(
                  "font-medium",
                  isNearLimit(usageStats.products.current, usageStats.products.limit) && "text-orange-600"
                )}>
                  {usageStats.products.current} / {usageStats.products.limit}
                </span>
              </div>
              <Progress 
                value={getUsagePercentage(usageStats.products.current, usageStats.products.limit)}
                className="h-2"
              />
            </div>

            {/* Customers */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <Users className="w-4 h-4 ml-2 text-slate-600" />
                  <span>مشتریان</span>
                </div>
                <span className={cn(
                  "font-medium",
                  isNearLimit(usageStats.customers.current, usageStats.customers.limit) && "text-orange-600"
                )}>
                  {usageStats.customers.current} / {usageStats.customers.limit}
                </span>
              </div>
              <Progress 
                value={getUsagePercentage(usageStats.customers.current, usageStats.customers.limit)}
                className="h-2"
              />
            </div>

            {/* Monthly Invoices */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <FileText className="w-4 h-4 ml-2 text-slate-600" />
                  <span>فاکتورهای ماهانه</span>
                </div>
                <span className={cn(
                  "font-medium",
                  isNearLimit(usageStats.invoices.current, usageStats.invoices.limit) && "text-orange-600"
                )}>
                  {usageStats.invoices.current} / {usageStats.invoices.limit}
                </span>
              </div>
              <Progress 
                value={getUsagePercentage(usageStats.invoices.current, usageStats.invoices.limit)}
                className="h-2"
              />
            </div>

            {/* Near Limit Warning */}
            {Object.values(usageStats).some(stat => isNearLimit(stat.current, stat.limit)) && (
              <Alert variant="warning">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  شما به محدودیت‌های اشتراک رایگان نزدیک شده‌اید. برای ادامه استفاده، اشتراک خود را ارتقاء دهید.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SubscriptionStatus;