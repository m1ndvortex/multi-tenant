/**
 * Profit & Loss Statement Component
 * Generates comprehensive P&L reports with category breakdowns and export functionality
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  FileText,
  Filter
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface PLAccount {
  account_code: string;
  account_name: string;
  account_type: 'revenue' | 'expense';
  current_period: number;
  previous_period: number;
  variance: number;
  variance_percentage: number;
}

interface PLCategory {
  category: string;
  category_name: string;
  accounts: PLAccount[];
  total_current: number;
  total_previous: number;
  total_variance: number;
}

interface PLStatement {
  period_from: string;
  period_to: string;
  previous_period_from: string;
  previous_period_to: string;
  revenue_categories: PLCategory[];
  expense_categories: PLCategory[];
  total_revenue: number;
  total_expenses: number;
  gross_profit: number;
  net_profit: number;
  previous_net_profit: number;
  profit_variance: number;
  profit_margin: number;
}

export const ProfitLossStatement: React.FC = () => {
  const [plStatement, setPLStatement] = useState<PLStatement | null>(null);
  const [dateFrom, setDateFrom] = useState('2024-01-01');
  const [dateTo, setDateTo] = useState('2024-03-31');
  const [loading, setLoading] = useState(true);
  const [showComparison, setShowComparison] = useState(true);

  useEffect(() => {
    loadPLStatement();
  }, [dateFrom, dateTo]);

  const loadPLStatement = async () => {
    try {
      setLoading(true);
      
      // Mock P&L data
      const mockPLStatement: PLStatement = {
        period_from: dateFrom,
        period_to: dateTo,
        previous_period_from: '2023-01-01',
        previous_period_to: '2023-03-31',
        revenue_categories: [
          {
            category: 'sales_revenue',
            category_name: 'درآمد فروش',
            total_current: 45000000,
            total_previous: 38000000,
            total_variance: 7000000,
            accounts: [
              {
                account_code: '4001',
                account_name: 'فروش کالا',
                account_type: 'revenue',
                current_period: 40000000,
                previous_period: 35000000,
                variance: 5000000,
                variance_percentage: 14.29
              },
              {
                account_code: '4002',
                account_name: 'فروش خدمات',
                account_type: 'revenue',
                current_period: 5000000,
                previous_period: 3000000,
                variance: 2000000,
                variance_percentage: 66.67
              }
            ]
          },
          {
            category: 'other_revenue',
            category_name: 'سایر درآمدها',
            total_current: 2000000,
            total_previous: 1500000,
            total_variance: 500000,
            accounts: [
              {
                account_code: '4101',
                account_name: 'درآمد سود بانکی',
                account_type: 'revenue',
                current_period: 2000000,
                previous_period: 1500000,
                variance: 500000,
                variance_percentage: 33.33
              }
            ]
          }
        ],
        expense_categories: [
          {
            category: 'cost_of_goods',
            category_name: 'بهای تمام شده کالای فروخته شده',
            total_current: 25000000,
            total_previous: 22000000,
            total_variance: 3000000,
            accounts: [
              {
                account_code: '5001',
                account_name: 'خرید کالا',
                account_type: 'expense',
                current_period: 25000000,
                previous_period: 22000000,
                variance: 3000000,
                variance_percentage: 13.64
              }
            ]
          },
          {
            category: 'operating_expenses',
            category_name: 'هزینه‌های عملیاتی',
            total_current: 12000000,
            total_previous: 10000000,
            total_variance: 2000000,
            accounts: [
              {
                account_code: '6001',
                account_name: 'حقوق و دستمزد',
                account_type: 'expense',
                current_period: 8000000,
                previous_period: 7000000,
                variance: 1000000,
                variance_percentage: 14.29
              },
              {
                account_code: '6002',
                account_name: 'اجاره',
                account_type: 'expense',
                current_period: 2000000,
                previous_period: 1800000,
                variance: 200000,
                variance_percentage: 11.11
              },
              {
                account_code: '6003',
                account_name: 'برق و گاز',
                account_type: 'expense',
                current_period: 2000000,
                previous_period: 1200000,
                variance: 800000,
                variance_percentage: 66.67
              }
            ]
          }
        ],
        total_revenue: 47000000,
        total_expenses: 37000000,
        gross_profit: 22000000,
        net_profit: 10000000,
        previous_net_profit: 7500000,
        profit_variance: 2500000,
        profit_margin: 21.28
      };

      setPLStatement(mockPLStatement);
    } catch (error) {
      console.error('Error loading P&L statement:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    // Mock PDF export
    console.log('Exporting P&L to PDF...');
  };

  const exportToCSV = () => {
    if (!plStatement) return;

    const headers = ['کد حساب', 'نام حساب', 'دوره جاری', 'دوره قبل', 'تغییرات', 'درصد تغییر'];
    const csvData = [];

    // Add revenue data
    csvData.push(['', 'درآمدها', '', '', '', '']);
    plStatement.revenue_categories.forEach(category => {
      csvData.push(['', category.category_name, '', '', '', '']);
      category.accounts.forEach(account => {
        csvData.push([
          account.account_code,
          account.account_name,
          account.current_period,
          account.previous_period,
          account.variance,
          account.variance_percentage
        ]);
      });
    });

    // Add expense data
    csvData.push(['', 'هزینه‌ها', '', '', '', '']);
    plStatement.expense_categories.forEach(category => {
      csvData.push(['', category.category_name, '', '', '', '']);
      category.accounts.forEach(account => {
        csvData.push([
          account.account_code,
          account.account_name,
          account.current_period,
          account.previous_period,
          account.variance,
          account.variance_percentage
        ]);
      });
    });

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `profit_loss_${dateFrom}_to_${dateTo}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
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

  if (!plStatement) {
    return (
      <Card className="border-0 shadow-lg bg-white">
        <CardContent className="p-12 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">خطا در بارگذاری گزارش سود و زیان</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">کل درآمد</p>
                <p className="text-2xl font-bold text-green-900">
                  {formatCurrency(plStatement.total_revenue)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-red-100/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">کل هزینه‌ها</p>
                <p className="text-2xl font-bold text-red-900">
                  {formatCurrency(plStatement.total_expenses)}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">سود ناخالص</p>
                <p className="text-2xl font-bold text-blue-900">
                  {formatCurrency(plStatement.gross_profit)}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className={`border-0 shadow-lg ${
          plStatement.net_profit >= 0 
            ? 'bg-gradient-to-br from-purple-50 to-purple-100/50' 
            : 'bg-gradient-to-br from-red-50 to-red-100/50'
        }`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${
                  plStatement.net_profit >= 0 ? 'text-purple-600' : 'text-red-600'
                }`}>
                  سود خالص
                </p>
                <p className={`text-2xl font-bold ${
                  plStatement.net_profit >= 0 ? 'text-purple-900' : 'text-red-900'
                }`}>
                  {formatCurrency(plStatement.net_profit)}
                </p>
                <p className="text-xs text-gray-600">
                  حاشیه سود: {plStatement.profit_margin.toFixed(2)}%
                </p>
              </div>
              <DollarSign className={`h-8 w-8 ${
                plStatement.net_profit >= 0 ? 'text-purple-500' : 'text-red-500'
              }`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-slate-50 to-slate-100/80">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="flex gap-2 items-center">
                <Calendar className="h-4 w-4 text-gray-500" />
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-40"
                />
                <span className="text-gray-500">تا</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-40"
                />
              </div>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showComparison}
                  onChange={(e) => setShowComparison(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">مقایسه با دوره قبل</span>
              </label>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={exportToCSV}
                className="bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white"
              >
                <Download className="h-4 w-4 ml-2" />
                CSV
              </Button>
              <Button
                onClick={exportToPDF}
                className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white"
              >
                <Download className="h-4 w-4 ml-2" />
                PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* P&L Statement */}
      <Card className="border-0 shadow-lg bg-white">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50">
          <CardTitle className="text-xl font-bold text-center text-gray-900">
            گزارش سود و زیان
          </CardTitle>
          <p className="text-center text-gray-600">
            از {formatDate(plStatement.period_from)} تا {formatDate(plStatement.period_to)}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">شرح</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">دوره جاری</th>
                  {showComparison && (
                    <>
                      <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">دوره قبل</th>
                      <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">تغییرات</th>
                      <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">درصد</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {/* Revenue Section */}
                <tr className="bg-green-50">
                  <td className="px-6 py-4 font-bold text-green-800">درآمدها</td>
                  <td className="px-6 py-4 font-bold text-green-800">
                    {formatCurrency(plStatement.total_revenue)}
                  </td>
                  {showComparison && (
                    <>
                      <td className="px-6 py-4"></td>
                      <td className="px-6 py-4"></td>
                      <td className="px-6 py-4"></td>
                    </>
                  )}
                </tr>
                
                {plStatement.revenue_categories.map((category) => (
                  <React.Fragment key={category.category}>
                    <tr className="bg-gray-50">
                      <td className="px-6 py-3 font-semibold text-gray-700 pr-8">
                        {category.category_name}
                      </td>
                      <td className="px-6 py-3 font-semibold text-gray-700">
                        {formatCurrency(category.total_current)}
                      </td>
                      {showComparison && (
                        <>
                          <td className="px-6 py-3 font-semibold text-gray-700">
                            {formatCurrency(category.total_previous)}
                          </td>
                          <td className="px-6 py-3 font-semibold text-gray-700">
                            {formatCurrency(category.total_variance)}
                          </td>
                          <td className="px-6 py-3">
                            <Badge className={
                              category.total_variance >= 0 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }>
                              {((category.total_variance / category.total_previous) * 100).toFixed(1)}%
                            </Badge>
                          </td>
                        </>
                      )}
                    </tr>
                    {category.accounts.map((account) => (
                      <tr key={account.account_code} className="hover:bg-gray-50">
                        <td className="px-6 py-3 pr-12">
                          <span className="text-gray-600 text-sm">{account.account_code}</span>
                          <span className="mr-2">{account.account_name}</span>
                        </td>
                        <td className="px-6 py-3">{formatCurrency(account.current_period)}</td>
                        {showComparison && (
                          <>
                            <td className="px-6 py-3">{formatCurrency(account.previous_period)}</td>
                            <td className="px-6 py-3">{formatCurrency(account.variance)}</td>
                            <td className="px-6 py-3">
                              <Badge className={
                                account.variance >= 0 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }>
                                {account.variance_percentage.toFixed(1)}%
                              </Badge>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}

                {/* Expense Section */}
                <tr className="bg-red-50">
                  <td className="px-6 py-4 font-bold text-red-800">هزینه‌ها</td>
                  <td className="px-6 py-4 font-bold text-red-800">
                    ({formatCurrency(plStatement.total_expenses)})
                  </td>
                  {showComparison && (
                    <>
                      <td className="px-6 py-4"></td>
                      <td className="px-6 py-4"></td>
                      <td className="px-6 py-4"></td>
                    </>
                  )}
                </tr>

                {plStatement.expense_categories.map((category) => (
                  <React.Fragment key={category.category}>
                    <tr className="bg-gray-50">
                      <td className="px-6 py-3 font-semibold text-gray-700 pr-8">
                        {category.category_name}
                      </td>
                      <td className="px-6 py-3 font-semibold text-gray-700">
                        ({formatCurrency(category.total_current)})
                      </td>
                      {showComparison && (
                        <>
                          <td className="px-6 py-3 font-semibold text-gray-700">
                            ({formatCurrency(category.total_previous)})
                          </td>
                          <td className="px-6 py-3 font-semibold text-gray-700">
                            ({formatCurrency(category.total_variance)})
                          </td>
                          <td className="px-6 py-3">
                            <Badge className={
                              category.total_variance <= 0 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }>
                              {((category.total_variance / category.total_previous) * 100).toFixed(1)}%
                            </Badge>
                          </td>
                        </>
                      )}
                    </tr>
                    {category.accounts.map((account) => (
                      <tr key={account.account_code} className="hover:bg-gray-50">
                        <td className="px-6 py-3 pr-12">
                          <span className="text-gray-600 text-sm">{account.account_code}</span>
                          <span className="mr-2">{account.account_name}</span>
                        </td>
                        <td className="px-6 py-3">({formatCurrency(account.current_period)})</td>
                        {showComparison && (
                          <>
                            <td className="px-6 py-3">({formatCurrency(account.previous_period)})</td>
                            <td className="px-6 py-3">({formatCurrency(account.variance)})</td>
                            <td className="px-6 py-3">
                              <Badge className={
                                account.variance <= 0 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }>
                                {account.variance_percentage.toFixed(1)}%
                              </Badge>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}

                {/* Net Profit */}
                <tr className={`border-t-2 ${
                  plStatement.net_profit >= 0 ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  <td className={`px-6 py-4 font-bold text-lg ${
                    plStatement.net_profit >= 0 ? 'text-green-800' : 'text-red-800'
                  }`}>
                    سود خالص
                  </td>
                  <td className={`px-6 py-4 font-bold text-lg ${
                    plStatement.net_profit >= 0 ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {formatCurrency(plStatement.net_profit)}
                  </td>
                  {showComparison && (
                    <>
                      <td className={`px-6 py-4 font-bold ${
                        plStatement.previous_net_profit >= 0 ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {formatCurrency(plStatement.previous_net_profit)}
                      </td>
                      <td className={`px-6 py-4 font-bold ${
                        plStatement.profit_variance >= 0 ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {formatCurrency(plStatement.profit_variance)}
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={
                          plStatement.profit_variance >= 0 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }>
                          {((plStatement.profit_variance / plStatement.previous_net_profit) * 100).toFixed(1)}%
                        </Badge>
                      </td>
                    </>
                  )}
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};