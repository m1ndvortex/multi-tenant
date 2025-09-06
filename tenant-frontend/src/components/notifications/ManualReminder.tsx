import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { notificationService, ManualReminderRequest } from '@/services/notificationService';
import { Send, AlertCircle, Search, RefreshCw, Mail, MessageSquare, Calendar, DollarSign } from 'lucide-react';

interface UnpaidInvoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  total_amount: number;
  due_date: string;
  days_overdue: number;
}

const ManualReminderComponent: React.FC = () => {
  const [unpaidInvoices, setUnpaidInvoices] = useState<UnpaidInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<UnpaidInvoice | null>(null);
  const [reminderForm, setReminderForm] = useState<ManualReminderRequest>({
    invoice_id: '',
    notification_type: 'email',
    custom_message: '',
  });
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadUnpaidInvoices();
  }, []);

  const loadUnpaidInvoices = async () => {
    try {
      setLoading(true);
      const data = await notificationService.getUnpaidInvoices();
      setUnpaidInvoices(data);
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در بارگذاری فاکتورهای پرداخت نشده',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUnpaidInvoices();
    setRefreshing(false);
  };

  const openReminderDialog = (invoice: UnpaidInvoice) => {
    setSelectedInvoice(invoice);
    setReminderForm({
      invoice_id: invoice.id,
      notification_type: 'email',
      custom_message: `سلام ${invoice.customer_name} عزیز،

فاکتور شماره ${invoice.invoice_number} به مبلغ ${invoice.total_amount.toLocaleString()} تومان ${invoice.days_overdue > 0 ? `${invoice.days_overdue} روز` : ''} ${invoice.days_overdue > 0 ? 'معوق' : 'نزدیک به سررسید'} است.

لطفاً در اسرع وقت نسبت به پرداخت آن اقدام فرمایید.

با تشکر`,
    });
    setDialogOpen(true);
  };

  const handleSendReminder = async () => {
    if (!selectedInvoice) return;

    setSending(true);
    try {
      const result = await notificationService.sendManualReminder(reminderForm);
      if (result.success) {
        toast({
          title: 'موفقیت',
          description: 'یادآوری با موفقیت ارسال شد',
        });
        setDialogOpen(false);
        setSelectedInvoice(null);
      } else {
        toast({
          title: 'خطا',
          description: result.message || 'خطا در ارسال یادآوری',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در ارسال یادآوری',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const getOverdueBadge = (daysOverdue: number) => {
    if (daysOverdue <= 0) {
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
          نزدیک به سررسید
        </Badge>
      );
    } else if (daysOverdue <= 7) {
      return (
        <Badge variant="destructive" className="bg-orange-100 text-orange-800 border-orange-200">
          {daysOverdue} روز معوق
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
          <AlertCircle className="h-3 w-3 mr-1" />
          {daysOverdue} روز معوق
        </Badge>
      );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fa-IR');
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString() + ' تومان';
  };

  const filteredInvoices = unpaidInvoices.filter(invoice => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      invoice.invoice_number.toLowerCase().includes(searchLower) ||
      invoice.customer_name.toLowerCase().includes(searchLower) ||
      invoice.customer_email?.toLowerCase().includes(searchLower) ||
      invoice.customer_phone?.includes(searchTerm)
    );
  });

  const canSendReminder = (invoice: UnpaidInvoice) => {
    return invoice.customer_email || invoice.customer_phone;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card variant="filter">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <Send className="h-4 w-4 text-white" />
            </div>
            ارسال یادآوری دستی
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="جستجو در فاکتورها..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
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
        </CardContent>
      </Card>

      {/* Unpaid Invoices Table */}
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
                    <TableHead>شماره فاکتور</TableHead>
                    <TableHead>مشتری</TableHead>
                    <TableHead>مبلغ</TableHead>
                    <TableHead>سررسید</TableHead>
                    <TableHead>وضعیت</TableHead>
                    <TableHead>اطلاعات تماس</TableHead>
                    <TableHead>عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        {searchTerm ? 'هیچ فاکتوری یافت نشد' : 'همه فاکتورها پرداخت شده‌اند'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="font-medium">{invoice.invoice_number}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{invoice.customer_name}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <span className="font-medium">{formatCurrency(invoice.total_amount)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span className="text-sm">{formatDate(invoice.due_date)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getOverdueBadge(invoice.days_overdue)}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm space-y-1">
                            {invoice.customer_email && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3 text-blue-600" />
                                <span>{invoice.customer_email}</span>
                              </div>
                            )}
                            {invoice.customer_phone && (
                              <div className="flex items-center gap-1">
                                <MessageSquare className="h-3 w-3 text-green-600" />
                                <span>{invoice.customer_phone}</span>
                              </div>
                            )}
                            {!invoice.customer_email && !invoice.customer_phone && (
                              <span className="text-gray-500">اطلاعات تماس ناموجود</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openReminderDialog(invoice)}
                            disabled={!canSendReminder(invoice)}
                            className="flex items-center gap-1"
                          >
                            <Send className="h-3 w-3" />
                            ارسال یادآوری
                          </Button>
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

      {/* Send Reminder Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>ارسال یادآوری</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-6">
              {/* Invoice Info */}
              <Card variant="gradient-blue">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">شماره فاکتور:</span> {selectedInvoice.invoice_number}
                    </div>
                    <div>
                      <span className="font-medium">مشتری:</span> {selectedInvoice.customer_name}
                    </div>
                    <div>
                      <span className="font-medium">مبلغ:</span> {formatCurrency(selectedInvoice.total_amount)}
                    </div>
                    <div>
                      <span className="font-medium">سررسید:</span> {formatDate(selectedInvoice.due_date)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notification Type */}
              <div>
                <Label htmlFor="notification-type">نوع اعلان</Label>
                <Select
                  value={reminderForm.notification_type}
                  onValueChange={(value: 'email' | 'sms' | 'both') => 
                    setReminderForm(prev => ({ ...prev, notification_type: value }))
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedInvoice.customer_email && (
                      <SelectItem value="email">ایمیل</SelectItem>
                    )}
                    {selectedInvoice.customer_phone && (
                      <SelectItem value="sms">پیامک</SelectItem>
                    )}
                    {selectedInvoice.customer_email && selectedInvoice.customer_phone && (
                      <SelectItem value="both">ایمیل و پیامک</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Message */}
              <div>
                <Label htmlFor="custom-message">متن پیام</Label>
                <Textarea
                  id="custom-message"
                  value={reminderForm.custom_message}
                  onChange={(e) => setReminderForm(prev => ({ ...prev, custom_message: e.target.value }))}
                  rows={6}
                  className="mt-1"
                  placeholder="متن یادآوری را وارد کنید..."
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={sending}
                >
                  انصراف
                </Button>
                <Button
                  variant="gradient-green"
                  onClick={handleSendReminder}
                  disabled={sending || !reminderForm.custom_message?.trim()}
                >
                  {sending ? 'در حال ارسال...' : 'ارسال یادآوری'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManualReminderComponent;