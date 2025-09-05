/**
 * Accounts Payable Management Interface
 * Manages supplier bills, payment scheduling, and payable tracking
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter, 
  Download, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Plus,
  Edit
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface PayableEntry {
  id: string;
  supplier_id: string;
  supplier_name: string;
  bill_number: string;
  bill_date: string;
  due_date: string;
  original_amount: number;
  paid_amount: number;
  remaining_amount: number;
  days_until_due: number;
  status: 'current' | 'due_soon' | 'overdue' | 'paid';
  last_payment_date?: string;
  description?: string;
}

interface PayableSummary {
  current: number;
  due_soon: number;
  overdue: number;
  paid: number;
  total_outstanding: number;
}

export const AccountsPayable: React.FC = () => {
  const [payables, setPayables] = useState<PayableEntry[]>([]);
  const [payableSummary, setPayableSummary] = useState<PayableSummary>({
    current: 0,
    due_soon: 0,
    overdue: 0,
    paid: 0,
    total_outstanding: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayables();
  }, []);

  const loadPayables = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API call
      const mockPayables: PayableEntry[] = [
        {
          id: '1',
          supplier_id: 'sup1',
          supplier_name: 'شرکت پخش مواد غذایی',
          bill_number: 'BILL-001',
          bill_date: '2024-02-01',
          due_date: '2024-03-01',
          original_amount: 8000000,
          paid_amount: 3000000,
          remaining_amount: 5000000,
          days_until_due: -10,
          status: 'overdue',
          description: 'خرید مواد اولیه'
        },
        {
          id: '2',
          supplier_id: 'sup2',
          supplier_name: 'شرکت حمل و نقل سریع',
          bill_number: 'BILL-002',
          bill_date: '2024-02-15',
          due_date: '2024-03-15',
          original_amount: 1500000,
          paid_amount: 0,
          remaining_amount: 1500000,
          days_until_due: 5,
          status: 'due_soon',
          description: 'هزینه حمل و نقل'
        },
        {
          id: '3',
          supplier_id: 'sup3',
          supplier_name: 'شرکت برق و گاز',
          bill_number: 'BILL-003',
          bill_date: '2024-02-20',
          due_date: '2024-04-20',
          original_amount: 2200000,
          paid_amount: 2200000,
          remaining_amount: 0,
          days_until_due: 0,
          status: 'paid',
          description: 'قبض برق و گاز'
        }
      ];

      setPayables(mockPayables);
      
      // Calculate payable summary
      const summary = mockPayables.reduce((acc, item) => {
        if (item.status === 'paid') {
          acc.paid += item.original_amount;
        } else {
          acc.total_outstanding += item.remaining_amount;
          acc[item.status] += item.remaining_amount;
        }
        return acc;
      }, {
        current: 0,
        due_soon: 0,
        overdue: 0,
        paid: 0,
        total_outstanding: 0
      });
      
      setPayableSummary(summary);
    } catch (error) {
      console.error('Error loading payables:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, daysUntilDue: number) => {
    switch (status) {
      case 'current':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">جاری</Badge>;
      case 'due_soon':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">نزدیک سررسید</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">سررسید گذشته</Badge>;
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">پرداخت شده</Badge>;
      default:
        return <Badge>نامشخص</Badge>;
    }
  };

  const filteredPayables = payables.filter(item => {
    const matchesSearch = item.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.bill_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const exportToCSV = () => {
    const headers = ['شماره قبض', 'نام تأمین‌کننده', 'تاریخ قبض', 'تاریخ سررسید', 'مبلغ اصلی', 'مبلغ پرداختی', 'مانده', 'وضعیت', 'توضیحات'];
    const csvContent = [
      headers.join(','),
      ...filteredPayables.map(item => [
        item.bill_number,
        item.supplier_name,
        item.bill_date,
        item.due_date,
        item.original_amount,
        item.paid_amount,
        item.remaining_amount,
        item.status,
        item.description || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `accounts_payable_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payable Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">جاری</p>
                <p className="text-2xl font-bold text-blue-900">
                  {formatCurrency(payableSummary.current)}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-50 to-yellow-100/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">نزدیک سررسید</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {formatCurrency(payableSummary.due_soon)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-red-100/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">سررسید گذشته</p>
                <p className="text-2xl font-bold text-red-900">
                  {formatCurrency(payableSummary.overdue)}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">پرداخت شده</p>
                <p className="text-2xl font-bold text-green-900">
                  {formatCurrency(payableSummary.paid)}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">کل بدهی</p>
                <p className="text-2xl font-bold text-purple-900">
                  {formatCurrency(payableSummary.total_outstanding)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-slate-50 to-slate-100/80">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="جستجو در تأمین‌کنندگان یا شماره قبض..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 w-64"
                />
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">همه وضعیت‌ها</option>
                <option value="current">جاری</option>
                <option value="due_soon">نزدیک سررسید</option>
                <option value="overdue">سررسید گذشته</option>
                <option value="paid">پرداخت شده</option>
              </select>
            </div>

            <div className="flex gap-2">
              <Button
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
              >
                <Plus className="h-4 w-4 ml-2" />
                قبض جدید
              </Button>
              <Button
                onClick={exportToCSV}
                className="bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white"
              >
                <Download className="h-4 w-4 ml-2" />
                خروجی CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payables Table */}
      <Card className="border-0 shadow-lg bg-white">
        <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50">
          <CardTitle className="text-lg font-semibold text-gray-900">
            حساب‌های پرداختنی ({filteredPayables.length} مورد)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    تأمین‌کننده
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    شماره قبض
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    تاریخ سررسید
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    مبلغ اصلی
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    پرداختی
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    مانده
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    وضعیت
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    عملیات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayables.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{item.supplier_name}</div>
                      {item.description && (
                        <div className="text-xs text-gray-500">{item.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{item.bill_number}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(item.due_date)}</div>
                      {item.days_until_due < 0 && (
                        <div className="text-xs text-red-600">
                          {Math.abs(item.days_until_due)} روز تأخیر
                        </div>
                      )}
                      {item.days_until_due > 0 && item.days_until_due <= 7 && (
                        <div className="text-xs text-yellow-600">
                          {item.days_until_due} روز مانده
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatCurrency(item.original_amount)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatCurrency(item.paid_amount)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{formatCurrency(item.remaining_amount)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(item.status, item.days_until_due)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="h-3 w-3 ml-1" />
                          ویرایش
                        </Button>
                        {item.remaining_amount > 0 && (
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                          >
                            پرداخت
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};