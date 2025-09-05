import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { notificationService, NotificationHistory } from '@/services/notificationService';
import { History, Mail, MessageSquare, Search, Filter, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';

const NotificationHistoryComponent: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
  });
  const [filters, setFilters] = useState({
    notification_type: 'all',
    status: 'all',
    date_from: '',
    date_to: '',
    search: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    loadNotificationHistory();
  }, [pagination.page, filters]);

  const loadNotificationHistory = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(filters.notification_type !== 'all' && { notification_type: filters.notification_type as 'email' | 'sms' }),
        ...(filters.status !== 'all' && { status: filters.status as 'sent' | 'failed' | 'pending' }),
        ...(filters.date_from && { date_from: filters.date_from }),
        ...(filters.date_to && { date_to: filters.date_to }),
      };

      const data = await notificationService.getNotificationHistory(params);
      setNotifications(data.notifications);
      setPagination(prev => ({
        ...prev,
        total: data.total,
      }));
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در بارگذاری تاریخچه اعلان‌ها',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNotificationHistory();
    setRefreshing(false);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      notification_type: 'all',
      status: 'all',
      date_from: '',
      date_to: '',
      search: '',
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            ارسال شده
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            ناموفق
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            در انتظار
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    return type === 'email' ? (
      <Mail className="h-4 w-4 text-blue-600" />
    ) : (
      <MessageSquare className="h-4 w-4 text-green-600" />
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredNotifications = notifications.filter(notification => {
    if (!filters.search) return true;
    const searchLower = filters.search.toLowerCase();
    return (
      notification.recipient_email?.toLowerCase().includes(searchLower) ||
      notification.recipient_phone?.includes(filters.search) ||
      notification.subject?.toLowerCase().includes(searchLower) ||
      notification.message.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card variant="filter">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <History className="h-4 w-4 text-white" />
            </div>
            تاریخچه اعلان‌ها
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="جستجو در اعلان‌ها..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <Select
                value={filters.notification_type}
                onValueChange={(value) => handleFilterChange('notification_type', value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="نوع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه</SelectItem>
                  <SelectItem value="email">ایمیل</SelectItem>
                  <SelectItem value="sms">پیامک</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.status}
                onValueChange={(value) => handleFilterChange('status', value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="وضعیت" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه</SelectItem>
                  <SelectItem value="sent">ارسال شده</SelectItem>
                  <SelectItem value="failed">ناموفق</SelectItem>
                  <SelectItem value="pending">در انتظار</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={clearFilters}
                className="px-3"
                aria-label="پاک کردن فیلترها"
              >
                <Filter className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-3"
                aria-label="بروزرسانی"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Date Range */}
          <div className="flex gap-4 mt-4">
            <div>
              <Input
                type="date"
                placeholder="از تاریخ"
                value={filters.date_from}
                onChange={(e) => handleFilterChange('date_from', e.target.value)}
                className="w-40"
              />
            </div>
            <div>
              <Input
                type="date"
                placeholder="تا تاریخ"
                value={filters.date_to}
                onChange={(e) => handleFilterChange('date_to', e.target.value)}
                className="w-40"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Table */}
      <Card variant="professional">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" data-testid="loading-spinner"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>نوع</TableHead>
                    <TableHead>گیرنده</TableHead>
                    <TableHead>موضوع/پیام</TableHead>
                    <TableHead>وضعیت</TableHead>
                    <TableHead>تاریخ ارسال</TableHead>
                    <TableHead>خطا</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNotifications.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        هیچ اعلانی یافت نشد
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredNotifications.map((notification) => (
                      <TableRow key={notification.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTypeIcon(notification.notification_type)}
                            <span className="text-sm">
                              {notification.notification_type === 'email' ? 'ایمیل' : 'پیامک'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {notification.recipient_email || notification.recipient_phone}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            {notification.subject && (
                              <div className="font-medium text-sm mb-1">
                                {notification.subject}
                              </div>
                            )}
                            <div className="text-sm text-gray-600 truncate">
                              {notification.message}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(notification.status)}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {notification.sent_at ? formatDate(notification.sent_at) : '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {notification.error_message && (
                            <div className="text-sm text-red-600 max-w-xs truncate">
                              {notification.error_message}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.total > pagination.limit && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            نمایش {((pagination.page - 1) * pagination.limit) + 1} تا{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} از{' '}
            {pagination.total} اعلان
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
            >
              قبلی
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page * pagination.limit >= pagination.total}
            >
              بعدی
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationHistoryComponent;