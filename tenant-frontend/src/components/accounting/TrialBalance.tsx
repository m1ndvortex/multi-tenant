/**
 * Trial Balance component for displaying account balances
 */

import React, { useState, useEffect } from 'react';
import { Calculator, Calendar, Download, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { accountingService, TrialBalanceResponse } from '@/services/accountingService';

export const TrialBalance: React.FC = () => {
  const [trialBalance, setTrialBalance] = useState<TrialBalanceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const { toast } = useToast();

  useEffect(() => {
    loadTrialBalance();
  }, []);

  const loadTrialBalance = async () => {
    try {
      setLoading(true);
      const data = await accountingService.getTrialBalance(asOfDate);
      setTrialBalance(data);
    } catch (error) {
      console.error('Error loading trial balance:', error);
      toast({
        title: 'خطا',
        description: 'خطا در بارگذاری تراز آزمایشی',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (date: string) => {
    setAsOfDate(date);
  };

  const handleRefresh = () => {
    loadTrialBalance();
  };

  const handleExport = () => {
    if (!trialBalance) return;

    // Create CSV content
    const headers = ['کد حساب', 'نام حساب', 'نوع حساب', 'مانده بدهکار', 'مانده بستانکار'];
    const rows = trialBalance.entries.map(entry => [
      entry.account_code,
      entry.account_name,
      getAccountTypeLabel(entry.account_type),
      entry.debit_balance.toString(),
      entry.credit_balance.toString()
    ]);
    
    // Add totals row
    rows.push(['', '', 'جمع کل', trialBalance.total_debits.toString(), trialBalance.total_credits.toString()]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    // Create and download file
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `trial-balance-${asOfDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fa-IR', {
      style: 'currency',
      currency: 'IRR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(dateString));
  };

  const getAccountTypeLabel = (type: string) => {
    const labels = {
      asset: 'دارایی',
      liability: 'بدهی',
      equity: 'حقوق صاحبان سهام',
      revenue: 'درآمد',
      expense: 'هزینه'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getAccountTypeColor = (type: string) => {
    const colors = {
      asset: 'bg-gradient-to-r from-green-500 to-teal-600',
      liability: 'bg-gradient-to-r from-red-500 to-pink-600',
      equity: 'bg-gradient-to-r from-blue-500 to-indigo-600',
      revenue: 'bg-gradient-to-r from-purple-500 to-violet-600',
      expense: 'bg-gradient-to-r from-orange-500 to-amber-600'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-500';
  };

  // Group entries by account type
  const groupedEntries = trialBalance?.entries.reduce((groups, entry) => {
    const type = entry.account_type;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(entry);
    return groups;
  }, {} as Record<string, typeof trialBalance.entries>) || {};

  return (
    <Card variant="professional">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            تراز آزمایشی
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={handleExport}
              variant="outline"
              size="sm"
              disabled={!trialBalance}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              خروجی CSV
            </Button>
            
            <Button
              onClick={handleRefresh}
              variant="gradient-green"
              size="sm"
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              بارگذاری
            </Button>
          </div>
        </div>
        
        {/* Date Filter */}
        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-500" />
            <Label htmlFor="as_of_date">تا تاریخ:</Label>
          </div>
          
          <Input
            id="as_of_date"
            type="date"
            value={asOfDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-48"
          />
          
          {trialBalance && (
            <Badge variant="outline" className="flex items-center gap-1">
              {formatDate(trialBalance.as_of_date)}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        ) : !trialBalance ? (
          <div className="text-center py-8 text-slate-500">
            <Calculator className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <p>برای مشاهده تراز آزمایشی، دکمه بارگذاری را کلیک کنید</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card variant="gradient-green" className="p-4">
                <div className="text-sm font-medium text-green-700 mb-1">کل بدهکار</div>
                <div className="text-lg font-bold text-green-900">
                  {formatCurrency(trialBalance.total_debits)}
                </div>
              </Card>
              
              <Card variant="gradient-blue" className="p-4">
                <div className="text-sm font-medium text-blue-700 mb-1">کل بستانکار</div>
                <div className="text-lg font-bold text-blue-900">
                  {formatCurrency(trialBalance.total_credits)}
                </div>
              </Card>
              
              <Card variant="professional" className="p-4">
                <div className="text-sm font-medium text-slate-700 mb-1">وضعیت تعادل</div>
                <div className="flex items-center gap-2">
                  <Badge variant={trialBalance.is_balanced ? 'default' : 'destructive'}>
                    {trialBalance.is_balanced ? 'متعادل' : 'نامتعادل'}
                  </Badge>
                  {trialBalance.is_balanced && (
                    <span className="text-green-600 text-lg">✓</span>
                  )}
                </div>
              </Card>
            </div>

            {/* Trial Balance Table */}
            {trialBalance.entries.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Calculator className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p>هیچ حسابی با مانده یافت نشد</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedEntries).map(([accountType, entries]) => (
                  <div key={accountType} className="space-y-2">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-3 h-3 rounded-full ${getAccountTypeColor(accountType)}`} />
                      <h3 className="text-lg font-medium text-slate-900">
                        {getAccountTypeLabel(accountType)}
                      </h3>
                      <Badge variant="secondary">
                        {entries.length} حساب
                      </Badge>
                    </div>
                    
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-3 grid grid-cols-12 gap-2 text-sm font-medium text-slate-700">
                        <div className="col-span-2">کد حساب</div>
                        <div className="col-span-6">نام حساب</div>
                        <div className="col-span-2">مانده بدهکار</div>
                        <div className="col-span-2">مانده بستانکار</div>
                      </div>

                      {entries.map((entry, index) => (
                        <div
                          key={`${accountType}-${index}`}
                          className="p-3 border-t grid grid-cols-12 gap-2 items-center hover:bg-slate-50 transition-colors"
                        >
                          <div className="col-span-2 font-medium text-slate-900">
                            {entry.account_code}
                          </div>
                          
                          <div className="col-span-6 text-slate-700">
                            {entry.account_name}
                          </div>
                          
                          <div className="col-span-2 text-left">
                            {entry.debit_balance > 0 ? (
                              <span className="font-medium text-green-700">
                                {formatCurrency(entry.debit_balance)}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </div>
                          
                          <div className="col-span-2 text-left">
                            {entry.credit_balance > 0 ? (
                              <span className="font-medium text-blue-700">
                                {formatCurrency(entry.credit_balance)}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Subtotals for each account type */}
                      <div className="bg-gradient-to-r from-slate-100 to-slate-200 p-3 border-t">
                        <div className="grid grid-cols-12 gap-2 text-sm font-bold">
                          <div className="col-span-8 text-left">
                            جمع {getAccountTypeLabel(accountType)}:
                          </div>
                          <div className="col-span-2 text-left text-green-700">
                            {formatCurrency(entries.reduce((sum, entry) => sum + entry.debit_balance, 0))}
                          </div>
                          <div className="col-span-2 text-left text-blue-700">
                            {formatCurrency(entries.reduce((sum, entry) => sum + entry.credit_balance, 0))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Grand Totals */}
                <div className="border-2 border-slate-300 rounded-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-slate-200 to-slate-300 p-4">
                    <div className="grid grid-cols-12 gap-2 text-base font-bold text-slate-900">
                      <div className="col-span-8 text-left">جمع کل:</div>
                      <div className="col-span-2 text-left text-green-700">
                        {formatCurrency(trialBalance.total_debits)}
                      </div>
                      <div className="col-span-2 text-left text-blue-700">
                        {formatCurrency(trialBalance.total_credits)}
                      </div>
                    </div>
                    
                    <div className="mt-2 text-center">
                      {trialBalance.is_balanced ? (
                        <Badge variant="default" className="bg-green-600">
                          تراز متعادل است ✓
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          تراز متعادل نیست - اختلاف: {formatCurrency(Math.abs(trialBalance.total_debits - trialBalance.total_credits))}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};