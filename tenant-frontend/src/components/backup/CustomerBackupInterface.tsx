/**
 * Customer Self-Backup Interface Component
 * Handles daily backup creation with limit enforcement and local download
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { backupService, BackupStatus, DailyBackupLimit } from '@/services/backupService';
import { Download, Database, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

const CustomerBackupInterface: React.FC = () => {
  const [dailyLimit, setDailyLimit] = useState<DailyBackupLimit | null>(null);
  const [currentBackup, setCurrentBackup] = useState<BackupStatus | null>(null);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadDailyLimit();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (currentBackup && (currentBackup.status === 'pending' || currentBackup.status === 'processing')) {
      interval = setInterval(async () => {
        try {
          const status = await backupService.getBackupStatus(currentBackup.id);
          setCurrentBackup(status);
          
          if (status.status === 'completed' || status.status === 'failed') {
            clearInterval(interval);
            if (status.status === 'completed') {
              toast({
                title: "پشتیبان‌گیری کامل شد",
                description: "فایل پشتیبان آماده دانلود است",
              });
            } else {
              toast({
                title: "خطا در پشتیبان‌گیری",
                description: status.error_message || "خطای نامشخص",
                variant: "destructive",
              });
            }
            await loadDailyLimit(); // Refresh daily limit
          }
        } catch (error) {
          console.error('Error checking backup status:', error);
          clearInterval(interval);
        }
      }, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentBackup, toast]);

  const loadDailyLimit = async () => {
    try {
      setLoading(true);
      const limit = await backupService.checkDailyBackupLimit();
      setDailyLimit(limit);
    } catch (error) {
      console.error('Error loading daily limit:', error);
      toast({
        title: "خطا در بارگذاری اطلاعات",
        description: "امکان بررسی محدودیت روزانه وجود ندارد",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    if (!dailyLimit?.can_backup) {
      toast({
        title: "محدودیت روزانه",
        description: "امروز قبلاً پشتیبان‌گیری انجام داده‌اید",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsCreatingBackup(true);
      const backup = await backupService.createBackup();
      setCurrentBackup(backup);
      
      toast({
        title: "پشتیبان‌گیری شروع شد",
        description: "لطفاً منتظر بمانید...",
      });
    } catch (error: any) {
      console.error('Error creating backup:', error);
      toast({
        title: "خطا در شروع پشتیبان‌گیری",
        description: error.message || "خطای نامشخص",
        variant: "destructive",
      });
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleDownloadBackup = async () => {
    if (!currentBackup?.download_url) return;

    try {
      const blob = await backupService.downloadBackup(currentBackup.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "دانلود شروع شد",
        description: "فایل پشتیبان در حال دانلود است",
      });
    } catch (error: any) {
      console.error('Error downloading backup:', error);
      toast({
        title: "خطا در دانلود",
        description: error.message || "خطای نامشخص",
        variant: "destructive",
      });
    }
  };

  const handleCancelBackup = async () => {
    if (!currentBackup) return;

    try {
      await backupService.cancelBackup(currentBackup.id);
      setCurrentBackup(null);
      toast({
        title: "پشتیبان‌گیری لغو شد",
        description: "عملیات پشتیبان‌گیری متوقف شد",
      });
    } catch (error: any) {
      console.error('Error canceling backup:', error);
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

  if (loading) {
    return (
      <Card variant="professional">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="gradient-green">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-6 w-6" />
          پشتیبان‌گیری خودکار
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Daily Limit Info */}
        <div className="bg-white/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">محدودیت روزانه:</span>
            <Badge variant={dailyLimit?.can_backup ? 'default' : 'secondary'}>
              {dailyLimit?.backups_today || 0} از {dailyLimit?.max_daily_backups || 1}
            </Badge>
          </div>
          {!dailyLimit?.can_backup && dailyLimit?.next_backup_available_at && (
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <AlertCircle className="h-4 w-4" />
              پشتیبان‌گیری بعدی: {new Date(dailyLimit.next_backup_available_at).toLocaleString('fa-IR')}
            </div>
          )}
        </div>

        {/* Current Backup Status */}
        {currentBackup && (
          <div className="bg-white/50 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(currentBackup.status)}
                <span className="font-medium">وضعیت پشتیبان‌گیری</span>
              </div>
              {getStatusBadge(currentBackup.status)}
            </div>

            {(currentBackup.status === 'pending' || currentBackup.status === 'processing') && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>پیشرفت</span>
                  <span>{currentBackup.progress}%</span>
                </div>
                <Progress value={currentBackup.progress} className="h-2" />
              </div>
            )}

            {currentBackup.status === 'completed' && currentBackup.file_size && (
              <div className="flex items-center justify-between">
                <span className="text-sm">حجم فایل: {formatFileSize(currentBackup.file_size)}</span>
                <Button
                  variant="gradient-green"
                  size="sm"
                  onClick={handleDownloadBackup}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  دانلود
                </Button>
              </div>
            )}

            {currentBackup.status === 'failed' && currentBackup.error_message && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                {currentBackup.error_message}
              </div>
            )}

            {(currentBackup.status === 'pending' || currentBackup.status === 'processing') && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelBackup}
                className="w-full"
              >
                لغو عملیات
              </Button>
            )}
          </div>
        )}

        {/* Create Backup Button */}
        {!currentBackup || (currentBackup.status !== 'pending' && currentBackup.status !== 'processing') && (
          <Button
            variant="gradient-green"
            onClick={handleCreateBackup}
            disabled={!dailyLimit?.can_backup || isCreatingBackup}
            className="w-full flex items-center gap-2"
          >
            <Database className="h-4 w-4" />
            {isCreatingBackup ? 'در حال شروع...' : 'ایجاد پشتیبان جدید'}
          </Button>
        )}

        {/* Info */}
        <div className="text-xs text-gray-600 bg-white/30 p-3 rounded">
          <p>• پشتیبان‌گیری شامل تمام اطلاعات کسب‌وکار شما می‌باشد</p>
          <p>• هر روز فقط یک بار امکان پشتیبان‌گیری وجود دارد</p>
          <p>• فایل پشتیبان به صورت محلی دانلود می‌شود</p>
          <p>• فایل‌های پشتیبان پس از ۷ روز حذف می‌شوند</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomerBackupInterface;