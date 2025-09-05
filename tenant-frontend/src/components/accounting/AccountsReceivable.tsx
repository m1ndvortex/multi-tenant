/**
 * Accounts Receivable Management Interface
 * Manages customer debts, aging reports, and payment tracking
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
  DollarSign
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface ReceivableEntry {
  id: string;
  customer_id: string;
  customer_name: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  original_amount: number;
  paid_amount: number;
  remaining_amount: number;
  days_overdue: number;
  status: 'current' | 'overdue_1_30' | 'overdue_31_60' | 'overdue_61_90' | 'overdue_90_plus';
  last_payment_date?: string;
}

interface AgingSummary {
  current: number;
  overdue_1_30: number;
  overdue_31_60: number;
  overdue_61_90: number;
  overdue_90_plus: number;
  total: number;
}

export const AccountsReceivable: React.FC = () => {
  const [receivables, setReceivables] = useState<ReceivableEntry[]>([]);
  const [agingSummary, setAgingSummary] = useState<AgingSummary>({
    current: 0,
    overdue_1_30: 0,
    overdue_31_60: 0,
    overdue_61_90: 0,
    overdue_90_plus: 0,
    total: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReceivables();
  }, []);

  const loadReceivables = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API call
      const mockReceivables: ReceivableEntry[] = [
        {
          id: '1',
          customer_id: 'cust1',
          customer_name: 'احمد محمدی',
          invoice_number: 'INV-001',
          invoice_date: '2024-01-15',
          due_date: '2024-02-15',
          original_amount: 5000000,
          paid_amount: 2000000,
          remaining_amount: 3000000,
          days_overdue: 45,
          status: 'overdue_31_60',
          last_payment_date: '2024-01-20'
        },
        {
          id: '2',
          customer_id: 'cust2',
          customer_name: 'فاطمه احمدی',
          invoice_number: 'INV-002',
          invoice_date: '2024-02-01',
          due_date: '2024-03-01',
          original_amount: 2500000,
          paid_amount: 0,
          remaining_amount: 2500000,
          days_overdue: 15,
          status: 'overdue_1_30'
        },
        {
          id: '3',
          customer_id: 'cust3',
          customer_name: 'علی رضایی',
          invoice_number: 'INV-003',
          invoice_date: '2024-02-20',
          due_date: '2024-03-20',
          original_amount: 1800000,
          paid_amount: 1800000,
          remaining_amount: 0,
          days_overdue: 0,
          status: 'current'
        }
      ];

      setReceivables(mockReceivables);
      
      // Calculate aging summary
      const summary = mockReceivables.reduce((acc, item) => {
        acc[item.status] += item.remaining_amount;
        acc.total += item.remaining_amount;
        return acc;
      }, {
        current: 0,
        overdue_1_30: 0,
        overdue_31_60: 0,
        overdue_61_90: 0,
        overdue_90_plus: 0,
        total: 0
      });
      
      setAgingSummary(summary);
    } catch (error) {
      console.error('Error loading receivables:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, daysOverdue: number) => {
    switch (status) {
      case 'current':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">جاری</Badge>;
      case 'overdue_1_30':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">۱-۳۰ روز</Badge>;
      case 'overdue_31_60':
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200">۳۱-۶۰ روز</Badge>;
      case 'overdue_61_90':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">۶۱-۹۰ روز</Badge>;
      case 'overdue_90_plus':
        return <Badge className="bg-red-200 text-red-900 hover:bg-red-300">بیش از ۹۰ روز</Badge>;
      default:
        return <Badge>نامشخص</Badge>;
    }
  };

  const filteredReceivables = receivables.filter(item => {
    const matchesSearch = item.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.invoice_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const exportToCSV = () => {
    const headers = ['شماره فاکتور', 'نام مشتری', 'تاریخ فاکتور', 'تاریخ سررسید', 'مبلغ اصلی', 'مبلغ پرداختی', 'مانده', 'روزهای تأخیر', 'وضعیت'];
    const csvContent = [
      headers.join(','),
      ...filteredReceivables.map(item => [
        item.invoice_number,
        item.customer_name,
        item.invoice_date,
        item.due_date,
        item.original_amount,
        item.paid_amount,
        item.remaining_amount,
        item.days_overdue,
        item.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `accounts_receivable_${new Date().toISOString().split('T')[0]}.csv`;
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
      {/* Aging Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">جاری</p>
                <p className="text-2xl font-bold text-green-900">
                  {formatCurrency(agingSummary.current)}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-50 to-yellow-100/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">۱-۳۰ روز</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {formatCurrency(agingSummary.overdue_1_30)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">۳۱-۶۰ روز</p>
                <p className="text-2xl font-bold text-orange-900">
                  {formatCurrency(agingSummary.overdue_31_60)}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-red-100/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">۶۱-۹۰ روز</p>
                <p className="text-2xl font-bold text-red-900">
                  {formatCurrency(agingSummary.overdue_61_90)}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-red-100 to-red-200/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700">+۹۰ روز</p>
                <p className="text-2xl font-bold text-red-900">
                  {formatCurrency(agingSummary.overdue_90_plus)}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">کل مانده</p>
                <p className="text-2xl font-bold text-blue-900">
                  {formatCurrency(agingSummary.total)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500" />
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
                  placeholder="جستجو در مشتریان یا شماره فاکتور..."
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
                <option value="overdue_1_30">۱-۳۰ روز</option>
                <option value="overdue_31_60">۳۱-۶۰ روز</option>
                <option value="overdue_61_90">۶۱-۹۰ روز</option>
                <option value="overdue_90_plus">بیش از ۹۰ روز</option>
              </select>
            </div>

            <div className="flex gap-2">
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

      {/* Receivables Table */}
      <Card className="border-0 shadow-lg bg-white">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="text-lg font-semibold text-gray-900">
            حساب‌های دریافتنی ({filteredReceivables.length} مورد)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    مشتری
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    شماره فاکتور
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
                {filteredReceivables.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{item.customer_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{item.invoice_number}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(item.due_date)}</div>
                      {item.days_overdue > 0 && (
                        <div className="text-xs text-red-600">
                          {item.days_overdue} روز تأخیر
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
                      {getStatusBadge(item.status, item.days_overdue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-blue-600 hover:text-blue-900"
                      >
                        جزئیات
                      </Button>
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