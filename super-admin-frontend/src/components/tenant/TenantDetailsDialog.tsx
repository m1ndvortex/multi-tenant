/**
 * Tenant Details Dialog
 * Dialog for viewing comprehensive tenant information and audit logs
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Building2, 
  CreditCard, 
  Users, 
  Package, 
  UserCheck,
  Receipt,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Globe,
  Clock,
  FileText,
  Activity,
  AlertCircle
} from 'lucide-react';
import { Tenant } from '@/types/tenant';
import { useEnhancedTenantDetails, useTenantAuditLog } from '@/hooks/useEnhancedTenants';

interface TenantDetailsDialogProps {
  tenant: Tenant | null;
  isOpen: boolean;
  onClose: () => void;
}

const TenantDetailsDialog: React.FC<TenantDetailsDialogProps> = ({
  tenant,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  const { data: enhancedTenant } = useEnhancedTenantDetails(
    tenant?.id || ''
  );
  const { data: auditLog, isLoading: isLoadingAudit } = useTenantAuditLog(
    tenant?.id || ''
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">فعال</Badge>;
      case 'suspended':
        return <Badge variant="error">تعلیق</Badge>;
      case 'pending':
        return <Badge variant="secondary">در انتظار</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">لغو شده</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getSubscriptionBadge = (type: string) => {
    switch (type) {
      case 'free':
        return <Badge variant="secondary">رایگان</Badge>;
      case 'pro':
        return <Badge variant="gradient-green">حرفه‌ای</Badge>;
      case 'enterprise':
        return <Badge variant="gradient-purple">سازمانی</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUsagePercentage = (current: number, max: number) => {
    if (max === -1) return 0; // Unlimited
    if (max === 0) return 0;
    return Math.min((current / max) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-orange-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (!tenant) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            جزئیات تنانت: {tenant.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              نمای کلی
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              اشتراک
            </TabsTrigger>
            <TabsTrigger value="usage" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              آمار استفاده
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              تاریخچه تغییرات
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Basic Information */}
            <Card variant="professional">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  اطلاعات پایه
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-slate-500" />
                      <span className="font-medium">نام:</span>
                      <span>{tenant.name}</span>
                    </div>
                    
                    {enhancedTenant?.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-slate-500" />
                        <span className="font-medium">ایمیل:</span>
                        <span>{enhancedTenant.email}</span>
                      </div>
                    )}
                    
                    {enhancedTenant?.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-slate-500" />
                        <span className="font-medium">تلفن:</span>
                        <span>{enhancedTenant.phone}</span>
                      </div>
                    )}
                    
                    {tenant.domain && (
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-slate-500" />
                        <span className="font-medium">دامنه:</span>
                        <span className="text-blue-600">{tenant.domain}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">وضعیت:</span>
                      {getStatusBadge(tenant.status || (tenant.is_active ? 'active' : 'suspended'))}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="font-medium">نوع اشتراک:</span>
                      {getSubscriptionBadge(tenant.subscription_type)}
                    </div>
                    
                    {enhancedTenant?.business_type && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">نوع کسب‌وکار:</span>
                        <span>{enhancedTenant.business_type}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-500" />
                      <span className="font-medium">تاریخ ایجاد:</span>
                      <span>{formatDate(tenant.created_at)}</span>
                    </div>
                  </div>
                </div>
                
                {enhancedTenant?.address && (
                  <div className="pt-4 border-t">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-slate-500 mt-1" />
                      <div>
                        <span className="font-medium">آدرس:</span>
                        <p className="text-slate-600 mt-1">{enhancedTenant.address}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Owner Information */}
            {enhancedTenant?.owner_email && (
              <Card variant="gradient-blue">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <UserCheck className="h-5 w-5" />
                    اطلاعات مالک
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-900">ایمیل:</span>
                      <span className="text-blue-800">{enhancedTenant.owner_email}</span>
                    </div>
                    {enhancedTenant.owner_name && (
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-blue-900">نام:</span>
                        <span className="text-blue-800">{enhancedTenant.owner_name}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Subscription Tab */}
          <TabsContent value="subscription" className="space-y-4">
            <Card variant="professional">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  جزئیات اشتراک
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">نوع اشتراک:</span>
                      {getSubscriptionBadge(tenant.subscription_type)}
                    </div>
                    
                    {enhancedTenant?.subscription_starts_at && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-500" />
                        <span className="font-medium">شروع اشتراک:</span>
                        <span>{formatDate(enhancedTenant.subscription_starts_at)}</span>
                      </div>
                    )}
                    
                    {enhancedTenant?.subscription_expires_at && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-500" />
                        <span className="font-medium">انقضای اشتراک:</span>
                        <span>{formatDate(enhancedTenant.subscription_expires_at)}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    {enhancedTenant && (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">وضعیت اشتراک:</span>
                          <Badge variant={enhancedTenant.is_subscription_active ? "success" : "error"}>
                            {enhancedTenant.is_subscription_active ? 'فعال' : 'غیرفعال'}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="font-medium">روزهای باقی‌مانده:</span>
                          <span className={enhancedTenant.days_until_expiry <= 7 ? 'text-red-600 font-bold' : ''}>
                            {enhancedTenant.days_until_expiry} روز
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="font-medium">واحد پول:</span>
                          <span>{enhancedTenant.currency}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="font-medium">منطقه زمانی:</span>
                          <span>{enhancedTenant.timezone}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Usage Tab */}
          <TabsContent value="usage" className="space-y-4">
            {enhancedTenant && (
              <>
                {/* Usage Statistics */}
                <Card variant="professional">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      آمار استفاده
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Users */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-slate-500" />
                            <span className="font-medium">کاربران</span>
                          </div>
                          <span className="text-sm">
                            {enhancedTenant.current_usage?.users || 0} / {enhancedTenant.max_users === -1 ? '∞' : enhancedTenant.max_users}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${getUsageColor(
                              getUsagePercentage(enhancedTenant.current_usage?.users || 0, enhancedTenant.max_users)
                            )}`}
                            style={{
                              width: `${getUsagePercentage(enhancedTenant.current_usage?.users || 0, enhancedTenant.max_users)}%`
                            }}
                          />
                        </div>
                      </div>

                      {/* Products */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-slate-500" />
                            <span className="font-medium">محصولات</span>
                          </div>
                          <span className="text-sm">
                            {enhancedTenant.current_usage?.products || 0} / {enhancedTenant.max_products === -1 ? '∞' : enhancedTenant.max_products}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${getUsageColor(
                              getUsagePercentage(enhancedTenant.current_usage?.products || 0, enhancedTenant.max_products)
                            )}`}
                            style={{
                              width: `${getUsagePercentage(enhancedTenant.current_usage?.products || 0, enhancedTenant.max_products)}%`
                            }}
                          />
                        </div>
                      </div>

                      {/* Customers */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-4 w-4 text-slate-500" />
                            <span className="font-medium">مشتریان</span>
                          </div>
                          <span className="text-sm">
                            {enhancedTenant.current_usage?.customers || 0} / {enhancedTenant.max_customers === -1 ? '∞' : enhancedTenant.max_customers}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${getUsageColor(
                              getUsagePercentage(enhancedTenant.current_usage?.customers || 0, enhancedTenant.max_customers)
                            )}`}
                            style={{
                              width: `${getUsagePercentage(enhancedTenant.current_usage?.customers || 0, enhancedTenant.max_customers)}%`
                            }}
                          />
                        </div>
                      </div>

                      {/* Monthly Invoices */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Receipt className="h-4 w-4 text-slate-500" />
                            <span className="font-medium">فاکتور ماهانه</span>
                          </div>
                          <span className="text-sm">
                            {enhancedTenant.current_usage?.monthly_invoices || 0} / {enhancedTenant.max_monthly_invoices === -1 ? '∞' : enhancedTenant.max_monthly_invoices}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${getUsageColor(
                              getUsagePercentage(enhancedTenant.current_usage?.monthly_invoices || 0, enhancedTenant.max_monthly_invoices)
                            )}`}
                            style={{
                              width: `${getUsagePercentage(enhancedTenant.current_usage?.monthly_invoices || 0, enhancedTenant.max_monthly_invoices)}%`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Activity Information */}
                <Card variant="gradient-green">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      اطلاعات فعالیت
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-green-800">
                      {enhancedTenant.last_activity_at && (
                        <p>آخرین فعالیت: {formatDate(enhancedTenant.last_activity_at)}</p>
                      )}
                      {enhancedTenant.last_credential_update && (
                        <p>آخرین تغییر اطلاعات ورود: {formatDate(enhancedTenant.last_credential_update)}</p>
                      )}
                      <p>آخرین به‌روزرسانی: {formatDate(enhancedTenant.updated_at)}</p>
                      <p>تعداد کل تغییرات: {enhancedTenant.total_audit_entries}</p>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Audit Tab */}
          <TabsContent value="audit" className="space-y-4">
            <Card variant="professional">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  تاریخچه تغییرات
                  {auditLog && (
                    <Badge variant="secondary" className="mr-2">
                      {auditLog.total_entries} مورد
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingAudit ? (
                  <div className="text-center py-8">در حال بارگذاری...</div>
                ) : auditLog && auditLog.entries.length > 0 ? (
                  <ScrollArea className="h-96">
                    <div className="space-y-3">
                      {auditLog.entries.map((entry, index) => (
                        <Card key={index} variant="gradient-blue" className="p-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Badge variant="secondary">{entry.action}</Badge>
                              <span className="text-sm text-blue-700">
                                {formatDate(entry.timestamp)}
                              </span>
                            </div>
                            <div className="text-sm text-blue-800">
                              <p>ادمین: {entry.admin_email}</p>
                              {entry.reason && <p>دلیل: {entry.reason}</p>}
                              {entry.ip_address && <p>IP: {entry.ip_address}</p>}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    <p>هیچ تغییری ثبت نشده است</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            بستن
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TenantDetailsDialog;