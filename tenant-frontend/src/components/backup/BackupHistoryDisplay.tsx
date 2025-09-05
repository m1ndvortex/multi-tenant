/**
 * Backup History Display Component
 * Shows daily backup status and download links
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { backupService, BackupHistory, ExportStatus } from '@/services/backupService';
import { Download, History, FileText, Database, Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';

const BackupHistoryDisplay: React.FC = () => {
  const [backupHistory, setBackupHistory] = useState<BackupHistory[]>([]);
  const [exportHistory, setExportHistory] = useState<ExportStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'backups' | 'exports'>('backups');
  const { toast } = useToast();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const [backups, exports] = await Promise.all([
        backupService.getBackupHistory(),
        backupService.getExportHistory(),
      ]);
      setBackupHistory(backups);
      setExportHistory(exports);
    } catch (error) {
      console.error('Error loading history:', error);
      toast({
        title: "خطا در بارگذاری تاریخچه",
        description: "امکان بارگذاری تاریخچه وجود ندارد",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadBackup = async (backupId: string, backupDate: string) => {
    try {
      const blob = await backupService.downloadBackup(backupId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup-${backupDate}.zip`;
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

  const handleDownloadExport = async (exportId: string, format: string, createdAt: string) => {
    try {
      const blob = await backupService.downloadExport(exportId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `export-${format}-${createdAt.split('T')[0]}.${format}`;
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return (
      <Card variant="professional">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="gradient-purple">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-6 w-6" />
          تاریخچه پشتیبان‌گیری و خروجی
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tab Navigation */}
        <div className="flex space-x-1 space-x-reverse bg-white/30 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('backups')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              activeTab === 'backups'
                ? 'bg-white shadow-md text-purple-700'
                : 'text-purple-600 hover:text-purple-700'
            }`}
          >
            <Database className="h-4 w-4" />
            پشتیبان‌ها ({backupHistory.length})
          </button>
          <button
            onClick={() => setActiveTab('exports')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              activeTab === 'exports'
                ? 'bg-white shadow-md text-purple-700'
                : 'text-purple-600 hover:text-purple-700'
            }`}
          >
            <FileText className="h-4 w-4" />
            خروجی‌ها ({exportHistory.length})
          </button>
        </div>

        {/* Backup History */}
        {activeTab === 'backups' && (
          <div className="bg-white/50 rounded-lg overflow-hidden">
            {backupHistory.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Database className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>هنوز پشتیبانی ایجاد نشده است</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>تاریخ</TableHead>
                    <TableHead>وضعیت</TableHead>
                    <TableHead>حجم فایل</TableHead>
                    <TableHead>انقضا</TableHead>
                    <TableHead>عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backupHistory.map((backup) => (
                    <TableRow key={backup.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          {formatDate(backup.backup_date)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(backup.status)}
                          {getStatusBadge(backup.status)}
                        </div>
                      </TableCell>
                      <TableCell>{formatFileSize(backup.file_size)}</TableCell>
                      <TableCell>
                        <span className={isExpired(backup.expires_at) ? 'text-red-600' : 'text-gray-600'}>
                          {formatDate(backup.expires_at)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {backup.status === 'completed' && !isExpired(backup.expires_at) && (
                          <Button
                            variant="gradient-purple"
                            size="sm"
                            onClick={() => handleDownloadBackup(backup.id, backup.backup_date.split('T')[0])}
                            className="flex items-center gap-1"
                          >
                            <Download className="h-3 w-3" />
                            دانلود
                          </Button>
                        )}
                        {isExpired(backup.expires_at) && (
                          <span className="text-xs text-red-600">منقضی شده</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}

        {/* Export History */}
        {activeTab === 'exports' && (
          <div className="bg-white/50 rounded-lg overflow-hidden">
            {exportHistory.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>هنوز خروجی‌ای ایجاد نشده است</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>تاریخ ایجاد</TableHead>
                    <TableHead>فرمت</TableHead>
                    <TableHead>انواع داده</TableHead>
                    <TableHead>وضعیت</TableHead>
                    <TableHead>حجم فایل</TableHead>
                    <TableHead>عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exportHistory.map((exportItem) => (
                    <TableRow key={exportItem.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          {formatDate(exportItem.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{exportItem.format.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-gray-600">
                          {exportItem.data_types.join('، ')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(exportItem.status)}
                          {getStatusBadge(exportItem.status)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {exportItem.file_size ? formatFileSize(exportItem.file_size) : '-'}
                      </TableCell>
                      <TableCell>
                        {exportItem.status === 'completed' && exportItem.download_url && (
                          <Button
                            variant="gradient-purple"
                            size="sm"
                            onClick={() => handleDownloadExport(
                              exportItem.id,
                              exportItem.format,
                              exportItem.created_at
                            )}
                            className="flex items-center gap-1"
                          >
                            <Download className="h-3 w-3" />
                            دانلود
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}

        {/* Refresh Button */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={loadHistory}
            className="flex items-center gap-2"
          >
            <History className="h-4 w-4" />
            بروزرسانی تاریخچه
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BackupHistoryDisplay;