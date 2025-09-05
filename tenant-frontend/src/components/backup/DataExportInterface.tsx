/**
 * Data Export Interface Component
 * Handles data export with format selection and progress tracking
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { backupService, ExportRequest, ExportStatus } from '@/services/backupService';
import { Download, FileText, Calendar, CheckCircle, XCircle, Clock, X } from 'lucide-react';

const DataExportInterface: React.FC = () => {
  const [availableDataTypes, setAvailableDataTypes] = useState<string[]>([]);
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'pdf'>('csv');
  const [dateRange, setDateRange] = useState({
    start_date: '',
    end_date: '',
  });
  const [useeDateRange, setUseDateRange] = useState(false);
  const [currentExport, setCurrentExport] = useState<ExportStatus | null>(null);
  const [isCreatingExport, setIsCreatingExport] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadAvailableDataTypes();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (currentExport && (currentExport.status === 'pending' || currentExport.status === 'processing')) {
      interval = setInterval(async () => {
        try {
          const status = await backupService.getExportStatus(currentExport.id);
          setCurrentExport(status);
          
          if (status.status === 'completed' || status.status === 'failed') {
            clearInterval(interval);
            if (status.status === 'completed') {
              toast({
                title: "خروجی آماده شد",
                description: "فایل خروجی آماده دانلود است",
              });
            } else {
              toast({
                title: "خطا در تولید خروجی",
                description: status.error_message || "خطای نامشخص",
                variant: "destructive",
              });
            }
          }
        } catch (error) {
          console.error('Error checking export status:', error);
          clearInterval(interval);
        }
      }, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentExport, toast]);

  const loadAvailableDataTypes = async () => {
    try {
      setLoading(true);
      const dataTypes = await backupService.getAvailableDataTypes();
      setAvailableDataTypes(dataTypes);
      setSelectedDataTypes(dataTypes); // Select all by default
    } catch (error) {
      console.error('Error loading data types:', error);
      toast({
        title: "خطا در بارگذاری",
        description: "امکان بارگذاری انواع داده وجود ندارد",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDataTypeChange = (dataType: string, checked: boolean) => {
    if (checked) {
      setSelectedDataTypes(prev => [...prev, dataType]);
    } else {
      setSelectedDataTypes(prev => prev.filter(type => type !== dataType));
    }
  };

  const handleCreateExport = async () => {
    if (selectedDataTypes.length === 0) {
      toast({
        title: "انتخاب داده الزامی",
        description: "لطفاً حداقل یک نوع داده انتخاب کنید",
        variant: "destructive",
      });
      return;
    }

    const exportRequest: ExportRequest = {
      format: exportFormat,
      data_types: selectedDataTypes,
    };

    if (useeDateRange && dateRange.start_date && dateRange.end_date) {
      exportRequest.date_range = dateRange;
    }

    try {
      setIsCreatingExport(true);
      const exportStatus = await backupService.createExport(exportRequest);
      setCurrentExport(exportStatus);
      
      toast({
        title: "تولید خروجی شروع شد",
        description: "لطفاً منتظر بمانید...",
      });
    } catch (error: any) {
      console.error('Error creating export:', error);
      toast({
        title: "خطا در شروع تولید خروجی",
        description: error.message || "خطای نامشخص",
        variant: "destructive",
      });
    } finally {
      setIsCreatingExport(false);
    }
  };

  const handleDownloadExport = async () => {
    if (!currentExport?.download_url) return;

    try {
      const blob = await backupService.downloadExport(currentExport.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `export-${currentExport.format}-${new Date().toISOString().split('T')[0]}.${currentExport.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "دانلود شروع شد",
        description: "فایل خروجی در حال دانلود است",
      });
    } catch (error: any) {
      console.error('Error downloading export:', error);
      toast({
        title: "خطا در دانلود",
        description: error.message || "خطای نامشخص",
        variant: "destructive",
      });
    }
  };

  const handleCancelExport = async () => {
    if (!currentExport) return;

    try {
      await backupService.cancelExport(currentExport.id);
      setCurrentExport(null);
      toast({
        title: "تولید خروجی لغو شد",
        description: "عملیات تولید خروجی متوقف شد",
      });
    } catch (error: any) {
      console.error('Error canceling export:', error);
      toast({
        title: "خطا در لغو عملیات",
        description: error.message || "خطای نامشخص",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'processing':
        return <Clock className="h-5 w-5 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      processing: 'default',
      completed: 'default',
      failed: 'destructive',
    } as const;

    const labels = {
      pending: 'در انتظار',
      processing: 'در حال پردازش',
      completed: 'کامل شده',
      failed: 'ناموفق',
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDataTypeLabel = (dataType: string) => {
    const labels: Record<string, string> = {
      customers: 'مشتریان',
      products: 'محصولات',
      invoices: 'فاکتورها',
      payments: 'پرداخت‌ها',
      installments: 'اقساط',
      accounting: 'حسابداری',
      reports: 'گزارش‌ها',
    };
    return labels[dataType] || dataType;
  };

  if (loading) {
    return (
      <Card variant="professional">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="gradient-blue">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-6 w-6" />
          خروجی داده‌ها
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Export Status */}
        {currentExport && (
          <div className="bg-white/50 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(currentExport.status)}
                <span className="font-medium">وضعیت تولید خروجی</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(currentExport.status)}
                {(currentExport.status === 'pending' || currentExport.status === 'processing') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelExport}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="text-sm text-gray-600">
              <p>فرمت: {currentExport.format.toUpperCase()}</p>
              <p>انواع داده: {currentExport.data_types.map(getDataTypeLabel).join('، ')}</p>
            </div>

            {(currentExport.status === 'pending' || currentExport.status === 'processing') && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>پیشرفت</span>
                  <span>{currentExport.progress}%</span>
                </div>
                <Progress value={currentExport.progress} className="h-2" />
              </div>
            )}

            {currentExport.status === 'completed' && currentExport.file_size && (
              <div className="flex items-center justify-between">
                <span className="text-sm">حجم فایل: {formatFileSize(currentExport.file_size)}</span>
                <Button
                  variant="gradient-blue"
                  size="sm"
                  onClick={handleDownloadExport}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  دانلود
                </Button>
              </div>
            )}

            {currentExport.status === 'failed' && currentExport.error_message && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                {currentExport.error_message}
              </div>
            )}
          </div>
        )}

        {/* Export Configuration */}
        {!currentExport || (currentExport.status !== 'pending' && currentExport.status !== 'processing') && (
          <div className="bg-white/50 rounded-lg p-4 space-y-4">
            {/* Format Selection */}
            <div className="space-y-2">
              <Label>فرمت خروجی</Label>
              <Select value={exportFormat} onValueChange={(value: 'csv' | 'json' | 'pdf') => setExportFormat(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV (Excel سازگار)</SelectItem>
                  <SelectItem value="json">JSON (برنامه‌نویسی)</SelectItem>
                  <SelectItem value="pdf">PDF (چاپ و نمایش)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Data Types Selection */}
            <div className="space-y-2">
              <Label>انواع داده برای خروجی</Label>
              <div className="grid grid-cols-2 gap-2">
                {availableDataTypes.map((dataType) => (
                  <div key={dataType} className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox
                      id={dataType}
                      checked={selectedDataTypes.includes(dataType)}
                      onCheckedChange={(checked) => handleDataTypeChange(dataType, checked as boolean)}
                    />
                    <Label htmlFor={dataType} className="text-sm">
                      {getDataTypeLabel(dataType)}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="use-date-range"
                  checked={useeDateRange}
                  onCheckedChange={setUseDateRange}
                />
                <Label htmlFor="use-date-range" className="text-sm">
                  محدود کردن به بازه زمانی
                </Label>
              </div>
              
              {useeDateRange && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">از تاریخ</Label>
                    <Input
                      type="date"
                      value={dateRange.start_date}
                      onChange={(e) => setDateRange(prev => ({ ...prev, start_date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">تا تاریخ</Label>
                    <Input
                      type="date"
                      value={dateRange.end_date}
                      onChange={(e) => setDateRange(prev => ({ ...prev, end_date: e.target.value }))}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Create Export Button */}
            <Button
              variant="gradient-blue"
              onClick={handleCreateExport}
              disabled={selectedDataTypes.length === 0 || isCreatingExport}
              className="w-full flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              {isCreatingExport ? 'در حال شروع...' : 'تولید خروجی'}
            </Button>
          </div>
        )}

        {/* Info */}
        <div className="text-xs text-gray-600 bg-white/30 p-3 rounded">
          <p>• خروجی شامل داده‌های انتخاب شده در فرمت مورد نظر می‌باشد</p>
          <p>• برای مجموعه داده‌های بزرگ، زمان تولید خروجی بیشتر است</p>
          <p>• فایل‌های خروجی پس از ۲۴ ساعت حذف می‌شوند</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default DataExportInterface;