import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useErrorLog, useResolveError, useDeleteError } from '@/hooks/useErrorLogging';
import { ErrorSeverity, ErrorCategory } from '@/services/errorLoggingService';
import { cn } from '@/lib/utils';

interface ErrorDetailModalProps {
  errorId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ErrorDetailModal: React.FC<ErrorDetailModalProps> = ({
  errorId,
  isOpen,
  onClose,
}) => {
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: errorLog, isLoading, error } = useErrorLog(errorId);
  const resolveErrorMutation = useResolveError();
  const deleteErrorMutation = useDeleteError();

  const handleResolve = async () => {
    if (!errorLog) return;

    try {
      await resolveErrorMutation.mutateAsync({
        errorId: errorLog.id,
        resolutionData: { notes: resolutionNotes || undefined }
      });
      onClose();
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const handleDelete = async () => {
    if (!errorLog) return;

    try {
      await deleteErrorMutation.mutateAsync(errorLog.id);
      onClose();
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const getSeverityColor = (severity: ErrorSeverity) => {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return 'text-red-600 bg-red-50 border-red-200';
      case ErrorSeverity.HIGH:
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case ErrorSeverity.MEDIUM:
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case ErrorSeverity.LOW:
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getCategoryColor = (category: ErrorCategory) => {
    switch (category) {
      case ErrorCategory.AUTHENTICATION:
        return 'text-red-700 bg-red-100';
      case ErrorCategory.AUTHORIZATION:
        return 'text-orange-700 bg-orange-100';
      case ErrorCategory.VALIDATION:
        return 'text-yellow-700 bg-yellow-100';
      case ErrorCategory.DATABASE:
        return 'text-purple-700 bg-purple-100';
      case ErrorCategory.EXTERNAL_API:
        return 'text-blue-700 bg-blue-100';
      case ErrorCategory.BUSINESS_LOGIC:
        return 'text-indigo-700 bg-indigo-100';
      case ErrorCategory.SYSTEM:
        return 'text-pink-700 bg-pink-100';
      case ErrorCategory.NETWORK:
        return 'text-cyan-700 bg-cyan-100';
      case ErrorCategory.PERFORMANCE:
        return 'text-teal-700 bg-teal-100';
      case ErrorCategory.SECURITY:
        return 'text-red-800 bg-red-200';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatCategoryName = (category: ErrorCategory) => {
    const categoryNames = {
      [ErrorCategory.AUTHENTICATION]: 'احراز هویت',
      [ErrorCategory.AUTHORIZATION]: 'مجوز دسترسی',
      [ErrorCategory.VALIDATION]: 'اعتبارسنجی',
      [ErrorCategory.DATABASE]: 'پایگاه داده',
      [ErrorCategory.API]: 'API',
      [ErrorCategory.EXTERNAL_API]: 'API خارجی',
      [ErrorCategory.EXTERNAL_SERVICE]: 'سرویس خارجی',
      [ErrorCategory.BUSINESS_LOGIC]: 'منطق کسب‌وکار',
      [ErrorCategory.SYSTEM]: 'سیستم',
      [ErrorCategory.NETWORK]: 'شبکه',
      [ErrorCategory.PERFORMANCE]: 'عملکرد',
      [ErrorCategory.SECURITY]: 'امنیت',
      [ErrorCategory.UNKNOWN]: 'نامشخص',
    };
    return categoryNames[category] || category;
  };

  const formatSeverityName = (severity: ErrorSeverity) => {
    const severityNames = {
      [ErrorSeverity.CRITICAL]: 'بحرانی',
      [ErrorSeverity.HIGH]: 'بالا',
      [ErrorSeverity.MEDIUM]: 'متوسط',
      [ErrorSeverity.LOW]: 'پایین',
    };
    return severityNames[severity] || severity;
  };

  if (error) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>خطا در دریافت جزئیات</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-slate-600 mb-4">امکان دریافت جزئیات خطا وجود ندارد</p>
            <Button variant="outline" onClick={onClose}>
              بستن
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-pink-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            جزئیات خطای API
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-8">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-slate-200 rounded w-3/4"></div>
              <div className="h-4 bg-slate-200 rounded w-1/2"></div>
              <div className="h-32 bg-slate-200 rounded"></div>
            </div>
          </div>
        ) : errorLog ? (
          <div className="space-y-6">
            {/* Error Overview */}
            <Card variant="professional">
              <CardHeader>
                <CardTitle className="text-lg">اطلاعات کلی خطا</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600">شدت خطا</label>
                    <div className="mt-1">
                      <Badge className={cn('text-sm', getSeverityColor(errorLog.severity))}>
                        {formatSeverityName(errorLog.severity)}
                      </Badge>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-slate-600">دسته‌بندی</label>
                    <div className="mt-1">
                      <Badge variant="outline" className={cn('text-sm', getCategoryColor(errorLog.category))}>
                        {formatCategoryName(errorLog.category)}
                      </Badge>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-slate-600">وضعیت</label>
                    <div className="mt-1">
                      {errorLog.is_resolved ? (
                        <Badge variant="default" className="text-sm bg-green-100 text-green-800">
                          حل شده
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-sm">
                          در انتظار حل
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-slate-600">تعداد تکرار</label>
                    <div className="mt-1 text-sm text-slate-800">
                      {errorLog.occurrence_count} بار
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-slate-600">اولین رخداد</label>
                    <div className="mt-1 text-sm text-slate-800">
                      {formatTimestamp(errorLog.first_occurrence)}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-slate-600">آخرین رخداد</label>
                    <div className="mt-1 text-sm text-slate-800">
                      {formatTimestamp(errorLog.last_occurrence)}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-600">پیام خطا</label>
                  <div className="mt-1 p-3 bg-slate-50 rounded-lg text-sm text-slate-800 font-mono">
                    {errorLog.error_message}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Information Tabs */}
            <Tabs defaultValue="request" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4 bg-gradient-to-r from-slate-50 via-slate-50 to-slate-50">
                <TabsTrigger value="request" className="data-[state=active]:bg-white data-[state=active]:shadow-md">
                  درخواست
                </TabsTrigger>
                <TabsTrigger value="context" className="data-[state=active]:bg-white data-[state=active]:shadow-md">
                  زمینه
                </TabsTrigger>
                <TabsTrigger value="stack" className="data-[state=active]:bg-white data-[state=active]:shadow-md">
                  Stack Trace
                </TabsTrigger>
                <TabsTrigger value="resolution" className="data-[state=active]:bg-white data-[state=active]:shadow-md">
                  حل مسئله
                </TabsTrigger>
              </TabsList>

              {/* Request Information */}
              <TabsContent value="request">
                <Card variant="professional">
                  <CardHeader>
                    <CardTitle>اطلاعات درخواست</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-slate-600">مسیر API</label>
                        <div className="mt-1 p-2 bg-slate-50 rounded text-sm font-mono">
                          {errorLog.method} {errorLog.endpoint}
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-slate-600">کد وضعیت HTTP</label>
                        <div className="mt-1">
                          <Badge variant={errorLog.status_code >= 500 ? 'destructive' : 'secondary'}>
                            {errorLog.status_code}
                          </Badge>
                        </div>
                      </div>
                      
                      {errorLog.request_id && (
                        <div>
                          <label className="text-sm font-medium text-slate-600">شناسه درخواست</label>
                          <div className="mt-1 p-2 bg-slate-50 rounded text-sm font-mono">
                            {errorLog.request_id}
                          </div>
                        </div>
                      )}
                      
                      {errorLog.ip_address && (
                        <div>
                          <label className="text-sm font-medium text-slate-600">آدرس IP</label>
                          <div className="mt-1 p-2 bg-slate-50 rounded text-sm font-mono">
                            {errorLog.ip_address}
                          </div>
                        </div>
                      )}
                    </div>

                    {errorLog.user_agent && (
                      <div>
                        <label className="text-sm font-medium text-slate-600">User Agent</label>
                        <div className="mt-1 p-2 bg-slate-50 rounded text-sm font-mono break-all">
                          {errorLog.user_agent}
                        </div>
                      </div>
                    )}

                    {errorLog.request_data && (
                      <div>
                        <label className="text-sm font-medium text-slate-600">داده‌های درخواست</label>
                        <div className="mt-1 p-3 bg-slate-50 rounded text-sm font-mono overflow-x-auto">
                          <pre>{JSON.stringify(errorLog.request_data, null, 2)}</pre>
                        </div>
                      </div>
                    )}

                    {errorLog.response_data && (
                      <div>
                        <label className="text-sm font-medium text-slate-600">داده‌های پاسخ</label>
                        <div className="mt-1 p-3 bg-slate-50 rounded text-sm font-mono overflow-x-auto">
                          <pre>{JSON.stringify(errorLog.response_data, null, 2)}</pre>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Context Information */}
              <TabsContent value="context">
                <Card variant="professional">
                  <CardHeader>
                    <CardTitle>اطلاعات زمینه</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {errorLog.tenant_id && (
                        <div>
                          <label className="text-sm font-medium text-slate-600">شناسه تنانت</label>
                          <div className="mt-1 p-2 bg-slate-50 rounded text-sm font-mono">
                            {errorLog.tenant_id}
                          </div>
                        </div>
                      )}
                      
                      {errorLog.user_id && (
                        <div>
                          <label className="text-sm font-medium text-slate-600">شناسه کاربر</label>
                          <div className="mt-1 p-2 bg-slate-50 rounded text-sm font-mono">
                            {errorLog.user_id}
                          </div>
                        </div>
                      )}
                      
                      {errorLog.session_id && (
                        <div>
                          <label className="text-sm font-medium text-slate-600">شناسه جلسه</label>
                          <div className="mt-1 p-2 bg-slate-50 rounded text-sm font-mono">
                            {errorLog.session_id}
                          </div>
                        </div>
                      )}
                      
                      {errorLog.error_code && (
                        <div>
                          <label className="text-sm font-medium text-slate-600">کد خطا</label>
                          <div className="mt-1 p-2 bg-slate-50 rounded text-sm font-mono">
                            {errorLog.error_code}
                          </div>
                        </div>
                      )}
                    </div>

                    {errorLog.additional_context && (
                      <div>
                        <label className="text-sm font-medium text-slate-600">اطلاعات اضافی</label>
                        <div className="mt-1 p-3 bg-slate-50 rounded text-sm font-mono overflow-x-auto">
                          <pre>{JSON.stringify(errorLog.additional_context, null, 2)}</pre>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Stack Trace */}
              <TabsContent value="stack">
                <Card variant="professional">
                  <CardHeader>
                    <CardTitle>Stack Trace</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {errorLog.stack_trace ? (
                      <div className="p-4 bg-slate-900 text-green-400 rounded-lg text-sm font-mono overflow-x-auto">
                        <pre className="whitespace-pre-wrap">{errorLog.stack_trace}</pre>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        Stack trace در دسترس نیست
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Resolution */}
              <TabsContent value="resolution">
                <Card variant="professional">
                  <CardHeader>
                    <CardTitle>مدیریت حل مسئله</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {errorLog.is_resolved ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="font-medium text-green-800">این خطا حل شده است</span>
                          </div>
                          {errorLog.resolved_at && (
                            <p className="text-sm text-green-700">
                              زمان حل: {formatTimestamp(errorLog.resolved_at)}
                            </p>
                          )}
                          {errorLog.resolved_by && (
                            <p className="text-sm text-green-700">
                              حل شده توسط: {errorLog.resolved_by}
                            </p>
                          )}
                        </div>
                        
                        {errorLog.resolution_notes && (
                          <div>
                            <label className="text-sm font-medium text-slate-600">یادداشت‌های حل مسئله</label>
                            <div className="mt-1 p-3 bg-slate-50 rounded-lg text-sm">
                              {errorLog.resolution_notes}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-slate-600">یادداشت‌های حل مسئله (اختیاری)</label>
                          <Textarea
                            value={resolutionNotes}
                            onChange={(e) => setResolutionNotes(e.target.value)}
                            placeholder="توضیحات مربوط به نحوه حل این خطا..."
                            className="mt-1"
                            rows={4}
                          />
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            variant="gradient-green"
                            onClick={handleResolve}
                            disabled={resolveErrorMutation.isPending}
                          >
                            {resolveErrorMutation.isPending ? 'در حال حل...' : 'علامت‌گذاری به عنوان حل شده'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  بستن
                </Button>
              </div>
              
              <div className="flex gap-2">
                {!showDeleteConfirm ? (
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={deleteErrorMutation.isPending}
                  >
                    حذف خطا
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowDeleteConfirm(false)}
                      size="sm"
                    >
                      انصراف
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={deleteErrorMutation.isPending}
                      size="sm"
                    >
                      {deleteErrorMutation.isPending ? 'در حال حذف...' : 'تأیید حذف'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};