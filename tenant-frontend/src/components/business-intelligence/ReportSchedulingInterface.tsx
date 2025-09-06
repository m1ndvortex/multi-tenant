import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CalendarIcon, 
  ClockIcon,
  DownloadIcon,
  MailIcon,
  SettingsIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  PlayIcon,
  PauseIcon,
  RefreshCwIcon,
  FileTextIcon,
  AlertTriangleIcon
} from 'lucide-react';
import { businessIntelligenceService } from '@/services/businessIntelligenceService';
import { toast } from '@/components/ui/use-toast';

interface ScheduledReport {
  id: string;
  name: string;
  report_type: 'sales-trend' | 'profit-loss' | 'customer-analytics' | 'aging-report' | 'dashboard-summary';
  schedule_type: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  schedule_time: string; // HH:MM format
  schedule_day?: number; // Day of week (0-6) or day of month (1-31)
  export_format: 'pdf' | 'csv' | 'json' | 'excel';
  email_recipients: string[];
  is_active: boolean;
  last_run_at?: string;
  next_run_at: string;
  created_at: string;
  parameters: Record<string, any>;
}

interface ReportSchedulingInterfaceProps {
  className?: string;
}

const ReportSchedulingInterface: React.FC<ReportSchedulingInterfaceProps> = ({ className }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingReport, setEditingReport] = useState<ScheduledReport | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    report_type: 'sales-trend' as const,
    schedule_type: 'weekly' as const,
    schedule_time: '09:00',
    schedule_day: 1,
    export_format: 'pdf' as const,
    email_recipients: [''],
    parameters: {}
  });

  const queryClient = useQueryClient();

  const { data: scheduledReports, isLoading, error, refetch } = useQuery({
    queryKey: ['scheduled-reports'],
    queryFn: () => businessIntelligenceService.getScheduledReports(),
  });

  const createReportMutation = useMutation({
    mutationFn: (data: any) => businessIntelligenceService.createScheduledReport(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
      setShowCreateForm(false);
      setFormData({
        name: '',
        report_type: 'sales-trend',
        schedule_type: 'weekly',
        schedule_time: '09:00',
        schedule_day: 1,
        export_format: 'pdf',
        email_recipients: [''],
        parameters: {}
      });
      toast({
        title: "گزارش زمان‌بندی شد",
        description: "گزارش جدید با موفقیت ایجاد و زمان‌بندی شد",
      });
    },
  });

  const updateReportMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      businessIntelligenceService.updateScheduledReport(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
      setEditingReport(null);
      toast({
        title: "گزارش بروزرسانی شد",
        description: "تنظیمات گزارش با موفقیت بروزرسانی شد",
      });
    },
  });

  const deleteReportMutation = useMutation({
    mutationFn: (id: string) => businessIntelligenceService.deleteScheduledReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
      toast({
        title: "گزارش حذف شد",
        description: "گزارش زمان‌بندی شده با موفقیت حذف شد",
      });
    },
  });

  const toggleReportMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => 
      businessIntelligenceService.toggleScheduledReport(id, active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
    },
  });

  const runReportNowMutation = useMutation({
    mutationFn: (id: string) => businessIntelligenceService.runScheduledReportNow(id),
    onSuccess: () => {
      toast({
        title: "گزارش در حال اجرا",
        description: "گزارش به صورت دستی اجرا شد و به زودی ارسال خواهد شد",
      });
    },
  });

  const getReportTypeLabel = (type: string) => {
    switch (type) {
      case 'sales-trend':
        return 'روند فروش';
      case 'profit-loss':
        return 'سود و زیان';
      case 'customer-analytics':
        return 'تحلیل مشتریان';
      case 'aging-report':
        return 'گزارش سنی';
      case 'dashboard-summary':
        return 'خلاصه داشبورد';
      default:
        return type;
    }
  };

  const getScheduleTypeLabel = (type: string) => {
    switch (type) {
      case 'daily':
        return 'روزانه';
      case 'weekly':
        return 'هفتگی';
      case 'monthly':
        return 'ماهانه';
      case 'quarterly':
        return 'فصلی';
      default:
        return type;
    }
  };

  const getFormatLabel = (format: string) => {
    switch (format) {
      case 'pdf':
        return 'PDF';
      case 'csv':
        return 'CSV';
      case 'json':
        return 'JSON';
      case 'excel':
        return 'Excel';
      default:
        return format;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      ...formData,
      email_recipients: formData.email_recipients.filter(email => email.trim() !== '')
    };

    if (editingReport) {
      updateReportMutation.mutate({ id: editingReport.id, data });
    } else {
      createReportMutation.mutate(data);
    }
  };

  const handleEdit = (report: ScheduledReport) => {
    setEditingReport(report);
    setFormData({
      name: report.name,
      report_type: report.report_type as any,
      schedule_type: report.schedule_type as any,
      schedule_time: report.schedule_time,
      schedule_day: report.schedule_day || 1,
      export_format: report.export_format as any,
      email_recipients: report.email_recipients.length > 0 ? report.email_recipients : [''],
      parameters: report.parameters
    });
    setShowCreateForm(true);
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    setEditingReport(null);
    setFormData({
      name: '',
      report_type: 'sales-trend',
      schedule_type: 'weekly',
      schedule_time: '09:00',
      schedule_day: 1,
      export_format: 'pdf',
      email_recipients: [''],
      parameters: {}
    });
  };

  const addEmailRecipient = () => {
    setFormData(prev => ({
      ...prev,
      email_recipients: [...prev.email_recipients, '']
    }));
  };

  const removeEmailRecipient = (index: number) => {
    setFormData(prev => ({
      ...prev,
      email_recipients: prev.email_recipients.filter((_, i) => i !== index)
    }));
  };

  const updateEmailRecipient = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      email_recipients: prev.email_recipients.map((email, i) => i === index ? value : email)
    }));
  };

  if (isLoading) {
    return (
      <Card variant="professional" className={className}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <CalendarIcon className="h-5 w-5 text-green-600" />
            زمان‌بندی و خودکارسازی گزارشات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card variant="professional" className={className}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <CalendarIcon className="h-5 w-5 text-green-600" />
            زمان‌بندی و خودکارسازی گزارشات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">خطا در بارگذاری گزارشات زمان‌بندی شده</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="flex items-center gap-2"
            >
              <RefreshCwIcon className="h-4 w-4" />
              تلاش مجدد
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="professional" className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <CalendarIcon className="h-5 w-5 text-green-600" />
            زمان‌بندی و خودکارسازی گزارشات
          </CardTitle>
          <Button
            variant="gradient-green"
            size="sm"
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2"
          >
            <PlusIcon className="h-4 w-4" />
            گزارش جدید
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {showCreateForm && (
          <Card variant="filter" className="mb-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">
                {editingReport ? 'ویرایش گزارش زمان‌بندی شده' : 'ایجاد گزارش زمان‌بندی شده جدید'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      نام گزارش
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      نوع گزارش
                    </label>
                    <select
                      value={formData.report_type}
                      onChange={(e) => setFormData(prev => ({ ...prev, report_type: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="sales-trend">روند فروش</option>
                      <option value="profit-loss">سود و زیان</option>
                      <option value="customer-analytics">تحلیل مشتریان</option>
                      <option value="aging-report">گزارش سنی</option>
                      <option value="dashboard-summary">خلاصه داشبورد</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      دوره زمان‌بندی
                    </label>
                    <select
                      value={formData.schedule_type}
                      onChange={(e) => setFormData(prev => ({ ...prev, schedule_type: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="daily">روزانه</option>
                      <option value="weekly">هفتگی</option>
                      <option value="monthly">ماهانه</option>
                      <option value="quarterly">فصلی</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      زمان اجرا
                    </label>
                    <input
                      type="time"
                      value={formData.schedule_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, schedule_time: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  
                  {(formData.schedule_type === 'weekly' || formData.schedule_type === 'monthly') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {formData.schedule_type === 'weekly' ? 'روز هفته' : 'روز ماه'}
                      </label>
                      <input
                        type="number"
                        min={formData.schedule_type === 'weekly' ? 0 : 1}
                        max={formData.schedule_type === 'weekly' ? 6 : 31}
                        value={formData.schedule_day}
                        onChange={(e) => setFormData(prev => ({ ...prev, schedule_day: parseInt(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      فرمت خروجی
                    </label>
                    <select
                      value={formData.export_format}
                      onChange={(e) => setFormData(prev => ({ ...prev, export_format: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="pdf">PDF</option>
                      <option value="csv">CSV</option>
                      <option value="json">JSON</option>
                      <option value="excel">Excel</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    گیرندگان ایمیل
                  </label>
                  {formData.email_recipients.map((email, index) => (
                    <div key={index} className="flex items-center gap-2 mb-2">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => updateEmailRecipient(index, e.target.value)}
                        placeholder="آدرس ایمیل"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      {formData.email_recipients.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeEmailRecipient(index)}
                          className="h-10 w-10 p-0"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addEmailRecipient}
                    className="flex items-center gap-2"
                  >
                    <PlusIcon className="h-4 w-4" />
                    افزودن ایمیل
                  </Button>
                </div>
                
                <div className="flex items-center gap-3 pt-4">
                  <Button
                    type="submit"
                    variant="gradient-green"
                    disabled={createReportMutation.isPending || updateReportMutation.isPending}
                  >
                    {editingReport ? 'بروزرسانی' : 'ایجاد'} گزارش
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                  >
                    انصراف
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {!scheduledReports || scheduledReports.length === 0 ? (
          <div className="text-center py-8">
            <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">هنوز گزارش زمان‌بندی شده‌ای ایجاد نشده است</p>
            <p className="text-sm text-gray-500 mt-2">
              با ایجاد گزارشات زمان‌بندی شده، به صورت خودکار گزارشات را دریافت کنید
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {scheduledReports.map((report: ScheduledReport) => (
              <div
                key={report.id}
                className="p-4 rounded-lg border border-gray-200 bg-white hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">{report.name}</h4>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {getReportTypeLabel(report.report_type)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {getScheduleTypeLabel(report.schedule_type)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {getFormatLabel(report.export_format)}
                      </Badge>
                      <Badge 
                        variant={report.is_active ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {report.is_active ? 'فعال' : 'غیرفعال'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => runReportNowMutation.mutate(report.id)}
                      className="h-8 w-8 p-0"
                      title="اجرای فوری"
                    >
                      <PlayIcon className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleReportMutation.mutate({ 
                        id: report.id, 
                        active: !report.is_active 
                      })}
                      className="h-8 w-8 p-0"
                      title={report.is_active ? 'غیرفعال کردن' : 'فعال کردن'}
                    >
                      {report.is_active ? (
                        <PauseIcon className="h-4 w-4" />
                      ) : (
                        <PlayIcon className="h-4 w-4" />
                      )}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(report)}
                      className="h-8 w-8 p-0"
                      title="ویرایش"
                    >
                      <EditIcon className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteReportMutation.mutate(report.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      title="حذف"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <ClockIcon className="h-4 w-4" />
                    <span>زمان اجرا: {report.schedule_time}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <MailIcon className="h-4 w-4" />
                    <span>{report.email_recipients.length} گیرنده</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    <span>اجرای بعدی: {formatDate(report.next_run_at)}</span>
                  </div>
                </div>
                
                {report.last_run_at && (
                  <div className="mt-2 text-xs text-gray-500">
                    آخرین اجرا: {formatDate(report.last_run_at)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReportSchedulingInterface;