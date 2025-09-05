/**
 * Balance Sheet Component
 * Generates comprehensive balance sheet with assets, liabilities, and equity
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Calendar,
  Building,
  CreditCard,
  PieChart,
  FileText,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface BSAccount {
  account_code: string;
  account_name: string;
  current_balance: number;
  previous_balance: number;
  variance: number;
  variance_percentage: number;
}

interface BSCategory {
  category: string;
  category_name: string;
  accounts: BSAccount[];
  total_current: number;
  total_previous: number;
  total_variance: number;
}

interface BalanceSheetData {
  as_of_date: string;
  previous_date: string;
  asset_categories: BSCategory[];
  liability_categories: BSCategory[];
  equity_categories: BSCategory[];
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
  total_liabilities_equity: number;
  is_balanced: boolean;
  balance_difference: number;
}

export const BalanceSheet: React.FC = () => {
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetData | null>(null);
  const [asOfDate, setAsOfDate] = useState('2024-03-31');
  const [loading, setLoading] = useState(true);
  const [showComparison, setShowComparison] = useState(true);

  useEffect(() => {
    loadBalanceSheet();
  }, [asOfDate]);

  const loadBalanceSheet = async () => {
    try {
      setLoading(true);
      
      // Mock Balance Sheet data
      const mockBalanceSheet: BalanceSheetData = {
        as_of_date: asOfDate,
        previous_date: '2023-12-31',
        asset_categories: [
          {
            category: 'current_assets',
            category_name: 'دارایی‌های جاری',
            total_current: 35000000,
            total_previous: 28000000,
            total_variance: 7000000,
            accounts: [
              {
                account_code: '1001',
                account_name: 'نقد و بانک',
                current_balance: 15000000,
                previous_balance: 12000000,
                variance: 3000000,
                variance_percentage: 25.0
              },
              {
                account_code: '1002',
                account_name: 'حساب‌های دریافتنی',
                current_balance: 12000000,
                previous_balance: 10000000,
                variance: 2000000,
                variance_percentage: 20.0
              },
              {
                account_code: '1003',
                account_name: 'موجودی کالا',
                current_balance: 8000000,
                previous_balance: 6000000,
                variance: 2000000,
                variance_percentage: 33.33
              }
            ]
          },
          {
            category: 'fixed_assets',
            category_name: 'دارایی‌های ثابت',
            total_current: 25000000,
            total_previous: 27000000,
            total_variance: -2000000,
            accounts: [
              {
                account_code: '1201',
                account_name: 'ساختمان',
                current_balance: 20000000,
                previous_balance: 22000000,
                variance: -2000000,
                variance_percentage: -9.09
              },
              {
                account_code: '1202',
                account_name: 'تجهیزات',
                current_balance: 5000000,
                previous_balance: 5000000,
                variance: 0,
                variance_percentage: 0
              }
            ]
          }
        ],
        liability_categories: [
          {
            category: 'current_liabilities',
            category_name: 'بدهی‌های جاری',
            total_current: 18000000,
            total_previous: 15000000,
            total_variance: 3000000,
            accounts: [
              {
                account_code: '2001',
                account_name: 'حساب‌های پرداختنی',
                current_balance: 10000000,
                previous_balance: 8000000,
                variance: 2000000,
                variance_percentage: 25.0
              },
              {
                account_code: '2002',
                account_name: 'مالیات پرداختنی',
                current_balance: 3000000,
                previous_balance: 2500000,
                variance: 500000,
                variance_percentage: 20.0
              },
              {
                account_code: '2003',
                account_name: 'حقوق پرداختنی',
                current_balance: 5000000,
                previous_balance: 4500000,
                variance: 500000,
                variance_percentage: 11.11
              }
            ]
          },
          {
            category: 'long_term_liabilities',
            category_name: 'بدهی‌های بلندمدت',
            total_current: 12000000,
            total_previous: 15000000,
            total_variance: -3000000,
            accounts: [
              {
                account_code: '2101',
                account_name: 'وام بانکی',
                current_balance: 12000000,
                previous_balance: 15000000,
                variance: -3000000,
                variance_percentage: -20.0
              }
            ]
          }
        ],
        equity_categories: [
          {
            category: 'equity',
            category_name: 'حقوق صاحبان سهام',
            total_current: 30000000,
            total_previous: 25000000,
            total_variance: 5000000,
            accounts: [
              {
                account_code: '3001',
                account_name: 'سرمایه',
                current_balance: 20000000,
                previous_balance: 20000000,
                variance: 0,
                variance_percentage: 0
              },
              {
                account_code: '3002',
                account_name: 'سود انباشته',
                current_balance: 10000000,
                previous_balance: 5000000,
                variance: 5000000,
                variance_percentage: 100.0
              }
            ]
          }
        ],
        total_assets: 60000000,
        total_liabilities: 30000000,
        total_equity: 30000000,
        total_liabilities_equity: 60000000,
        is_balanced: true,
        balance_difference: 0
      };

      setBalanceSheet(mockBalanceSheet);
    } catch (error) {
      console.error('Error loading balance sheet:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    console.log('Exporting Balance Sheet to PDF...');
  };

  const exportToCSV = () => {
    if (!balanceSheet) return;

    const headers = ['کد حساب', 'نام حساب', 'موجودی جاری', 'موجودی قبل', 'تغییرات', 'درصد تغییر'];
    const csvData = [];

    // Add assets data
    csvData.push(['', 'دارایی‌ها', '', '', '', '']);
    balanceSheet.asset_categories.forEach(category => {
      csvData.push(['', category.category_name, '', '', '', '']);
      category.accounts.forEach(account => {
        csvData.push([
          account.account_code,
          account.account_name,
          account.current_balance,
          account.previous_balance,
          account.variance,
          account.variance_percentage
        ]);
      });
    });

    // Add liabilities data
    csvData.push(['', 'بدهی‌ها', '', '', '', '']);
    balanceSheet.liability_categories.forEach(category => {
      csvData.push(['', category.category_name, '', '', '', '']);
      category.accounts.forEach(account => {
        csvData.push([
          account.account_code,
          account.account_name,
          account.current_balance,
          account.previous_balance,
          account.variance,
          account.variance_percentage
        ]);
      });
    });

    // Add equity data
    csvData.push(['', 'حقوق صاحبان سهام', '', '', '', '']);
    balanceSheet.equity_categories.forEach(category => {
      csvData.push(['', category.category_name, '', '', '', '']);
      category.accounts.forEach(account => {
        csvData.push([
          account.account_code,
          account.account_name,
          account.current_balance,
          account.previous_balance,
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
    link.download = `balance_sheet_${asOfDate}.csv`;
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

  if (!balanceSheet) {
    return (
      <Card className="border-0 shadow-lg bg-white">
        <CardContent className="p-12 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">خطا در بارگذاری ترازنامه</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">کل دارایی‌ها</p>
                <p className="text-2xl font-bold text-blue-900">
                  {formatCurrency(balanceSheet.total_assets)}
                </p>
              </div>
              <Building className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-red-100/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">کل بدهی‌ها</p>
                <p className="text-2xl font-bold text-red-900">
                  {formatCurrency(balanceSheet.total_liabilities)}
                </p>
              </div>
              <CreditCard className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">حقوق مالکانه</p>
                <p className="text-2xl font-bold text-green-900">
                  {formatCurrency(balanceSheet.total_equity)}
                </p>
              </div>
              <PieChart className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className={`border-0 shadow-lg ${
          balanceSheet.is_balanced 
            ? 'bg-gradient-to-br from-green-50 to-green-100/50' 
            : 'bg-gradient-to-br from-red-50 to-red-100/50'
        }`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${
                  balanceSheet.is_balanced ? 'text-green-600' : 'text-red-600'
                }`}>
                  وضعیت تراز
                </p>
                <p className={`text-lg font-bold ${
                  balanceSheet.is_balanced ? 'text-green-900' : 'text-red-900'
                }`}>
                  {balanceSheet.is_balanced ? 'متعادل' : 'نامتعادل'}
                </p>
                {!balanceSheet.is_balanced && (
                  <p className="text-xs text-red-600">
                    اختلاف: {formatCurrency(balanceSheet.balance_difference)}
                  </p>
                )}
              </div>
              {balanceSheet.is_balanced ? (
                <TrendingUp className="h-8 w-8 text-green-500" />
              ) : (
                <AlertCircle className="h-8 w-8 text-red-500" />
              )}
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
                <span className="text-sm text-gray-600">تا تاریخ:</span>
                <Input
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
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

      {/* Balance Sheet */}
      <Card className="border-0 shadow-lg bg-white">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
          <CardTitle className="text-xl font-bold text-center text-gray-900">
            ترازنامه
          </CardTitle>
          <p className="text-center text-gray-600">
            تا تاریخ {formatDate(balanceSheet.as_of_date)}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">شرح</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">موجودی جاری</th>
                  {showComparison && (
                    <>
                      <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">موجودی قبل</th>
                      <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">تغییرات</th>
                      <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">درصد</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {/* Assets Section */}
                <tr className="bg-blue-50">
                  <td className="px-6 py-4 font-bold text-blue-800">دارایی‌ها</td>
                  <td className="px-6 py-4 font-bold text-blue-800">
                    {formatCurrency(balanceSheet.total_assets)}
                  </td>
                  {showComparison && (
                    <>
                      <td className="px-6 py-4"></td>
                      <td className="px-6 py-4"></td>
                      <td className="px-6 py-4"></td>
                    </>
                  )}
                </tr>
                
                {balanceSheet.asset_categories.map((category) => (
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
                        <td className="px-6 py-3">{formatCurrency(account.current_balance)}</td>
                        {showComparison && (
                          <>
                            <td className="px-6 py-3">{formatCurrency(account.previous_balance)}</td>
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

                {/* Liabilities Section */}
                <tr className="bg-red-50">
                  <td className="px-6 py-4 font-bold text-red-800">بدهی‌ها</td>
                  <td className="px-6 py-4 font-bold text-red-800">
                    {formatCurrency(balanceSheet.total_liabilities)}
                  </td>
                  {showComparison && (
                    <>
                      <td className="px-6 py-4"></td>
                      <td className="px-6 py-4"></td>
                      <td className="px-6 py-4"></td>
                    </>
                  )}
                </tr>

                {balanceSheet.liability_categories.map((category) => (
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
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-green-100 text-green-800'
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
                        <td className="px-6 py-3">{formatCurrency(account.current_balance)}</td>
                        {showComparison && (
                          <>
                            <td className="px-6 py-3">{formatCurrency(account.previous_balance)}</td>
                            <td className="px-6 py-3">{formatCurrency(account.variance)}</td>
                            <td className="px-6 py-3">
                              <Badge className={
                                account.variance >= 0 
                                  ? 'bg-red-100 text-red-800' 
                                  : 'bg-green-100 text-green-800'
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

                {/* Equity Section */}
                <tr className="bg-green-50">
                  <td className="px-6 py-4 font-bold text-green-800">حقوق صاحبان سهام</td>
                  <td className="px-6 py-4 font-bold text-green-800">
                    {formatCurrency(balanceSheet.total_equity)}
                  </td>
                  {showComparison && (
                    <>
                      <td className="px-6 py-4"></td>
                      <td className="px-6 py-4"></td>
                      <td className="px-6 py-4"></td>
                    </>
                  )}
                </tr>

                {balanceSheet.equity_categories.map((category) => (
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
                        <td className="px-6 py-3">{formatCurrency(account.current_balance)}</td>
                        {showComparison && (
                          <>
                            <td className="px-6 py-3">{formatCurrency(account.previous_balance)}</td>
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

                {/* Total Liabilities + Equity */}
                <tr className="border-t-2 bg-purple-100">
                  <td className="px-6 py-4 font-bold text-lg text-purple-800">
                    کل بدهی‌ها + حقوق مالکانه
                  </td>
                  <td className="px-6 py-4 font-bold text-lg text-purple-800">
                    {formatCurrency(balanceSheet.total_liabilities_equity)}
                  </td>
                  {showComparison && (
                    <>
                      <td className="px-6 py-4"></td>
                      <td className="px-6 py-4"></td>
                      <td className="px-6 py-4"></td>
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