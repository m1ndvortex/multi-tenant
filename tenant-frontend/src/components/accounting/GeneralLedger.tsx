/**
 * General Ledger component with search and filtering
 */

import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, BookOpen, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { accountingService, GeneralLedgerResponse, GeneralLedgerFilter, Account } from '@/services/accountingService';

interface GeneralLedgerProps {
  selectedAccountId?: string;
  onAccountSelect?: (accountId: string) => void;
}

export const GeneralLedger: React.FC<GeneralLedgerProps> = ({
  selectedAccountId,
  onAccountSelect
}) => {
  const [ledgerData, setLedgerData] = useState<GeneralLedgerResponse | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<GeneralLedgerFilter>({
    account_id: selectedAccountId || '',
    date_from: '',
    date_to: '',
    posted_only: true,
    include_opening_balance: true
  });
  const { toast } = useToast();

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccountId) {
      setFilters(prev => ({ ...prev, account_id: selectedAccountId }));
    }
  }, [selectedAccountId]);

  useEffect(() => {
    if (filters.account_id) {
      loadGeneralLedger();
    }
  }, [filters.account_id]);

  const loadAccounts = async () => {
    try {
      const accountsData = await accountingService.getAccounts();
      setAccounts(accountsData);
    } catch (error) {
      console.error('Error loading accounts:', error);
      toast({
        title: 'خطا',
        description: 'خطا در بارگذاری حساب‌ها',
        variant: 'destructive',
      });
    }
  };

  const loadGeneralLedger = async () => {
    if (!filters.account_id) {
      return;
    }

    try {
      setLoading(true);
      const data = await accountingService.getGeneralLedger(filters);
      setLedgerData(data);
    } catch (error) {
      console.error('Error loading general ledger:', error);
      toast({
        title: 'خطا',
        description: 'خطا در بارگذاری دفتر کل',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAccountChange = (accountId: string) => {
    setFilters(prev => ({ ...prev, account_id: accountId }));
    if (onAccountSelect) {
      onAccountSelect(accountId);
    }
  };

  const handleApplyFilters = () => {
    loadGeneralLedger();
    setShowFilters(false);
  };

  const handleResetFilters = () => {
    setFilters({
      account_id: filters.account_id, // Keep selected account
      date_from: '',
      date_to: '',
      posted_only: true,
      include_opening_balance: true
    });
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
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(dateString));
  };

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return 'text-green-700';
    if (balance < 0) return 'text-red-700';
    return 'text-slate-700';
  };

  const getBalanceIcon = (balance: number) => {
    if (balance > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (balance < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return null;
  };

  return (
    <Card variant="professional">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            دفتر کل
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              فیلتر
            </Button>
            
            {filters.account_id && (
              <Button
                onClick={loadGeneralLedger}
                variant="gradient-green"
                size="sm"
                disabled={loading}
              >
                {loading ? 'در حال بارگذاری...' : 'بارگذاری'}
              </Button>
            )}
          </div>
        </div>
        
        {/* Account Selection */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="account_select">انتخاب حساب</Label>
            <Select value={filters.account_id} onValueChange={handleAccountChange}>
              <SelectTrigger>
                <SelectValue placeholder="حساب مورد نظر را انتخاب کنید" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map(account => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.account_code} - {account.account_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Filters Panel */}
          {showFilters && (
            <Card variant="filter" className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date_from">از تاریخ</Label>
                  <Input
                    id="date_from"
                    type="date"
                    value={filters.date_from}
                    onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="date_to">تا تاریخ</Label>
                  <Input
                    id="date_to"
                    type="date"
                    value={filters.date_to}
                    onChange={(e) => setFilters(prev => ({ ...prev, date_to: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>نوع اسناد</Label>
                  <Select
                    value={filters.posted_only ? 'posted' : 'all'}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, posted_only: value === 'posted' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">همه اسناد</SelectItem>
                      <SelectItem value="posted">فقط ثبت شده</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>مانده ابتدای دوره</Label>
                  <Select
                    value={filters.include_opening_balance ? 'yes' : 'no'}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, include_opening_balance: value === 'yes' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">نمایش</SelectItem>
                      <SelectItem value="no">عدم نمایش</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center justify-end gap-2 mt-4">
                <Button
                  onClick={handleResetFilters}
                  variant="outline"
                  size="sm"
                >
                  پاک کردن
                </Button>
                
                <Button
                  onClick={handleApplyFilters}
                  variant="gradient-green"
                  size="sm"
                >
                  اعمال فیلتر
                </Button>
              </div>
            </Card>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        ) : !filters.account_id ? (
          <div className="text-center py-8 text-slate-500">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <p>لطفاً حساب مورد نظر را انتخاب کنید</p>
          </div>
        ) : !ledgerData ? (
          <div className="text-center py-8 text-slate-500">
            <p>برای مشاهده دفتر کل، دکمه بارگذاری را کلیک کنید</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Account Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card variant="gradient-green" className="p-4">
                <div className="text-sm font-medium text-green-700 mb-1">مانده ابتدای دوره</div>
                <div className="text-lg font-bold text-green-900">
                  {formatCurrency(ledgerData.opening_balance)}
                </div>
              </Card>
              
              <Card variant="gradient-blue" className="p-4">
                <div className="text-sm font-medium text-blue-700 mb-1">کل بدهکار</div>
                <div className="text-lg font-bold text-blue-900">
                  {formatCurrency(ledgerData.total_debits)}
                </div>
              </Card>
              
              <Card variant="gradient-purple" className="p-4">
                <div className="text-sm font-medium text-purple-700 mb-1">کل بستانکار</div>
                <div className="text-lg font-bold text-purple-900">
                  {formatCurrency(ledgerData.total_credits)}
                </div>
              </Card>
              
              <Card variant="professional" className="p-4">
                <div className="text-sm font-medium text-slate-700 mb-1">مانده پایان دوره</div>
                <div className={`text-lg font-bold flex items-center gap-2 ${getBalanceColor(ledgerData.closing_balance)}`}>
                  {getBalanceIcon(ledgerData.closing_balance)}
                  {formatCurrency(Math.abs(ledgerData.closing_balance))}
                </div>
              </Card>
            </div>

            {/* Account Information */}
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-slate-900">
                    {ledgerData.account.account_code} - {ledgerData.account.account_name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">
                      {ledgerData.account.account_type === 'asset' && 'دارایی'}
                      {ledgerData.account.account_type === 'liability' && 'بدهی'}
                      {ledgerData.account.account_type === 'equity' && 'حقوق صاحبان سهام'}
                      {ledgerData.account.account_type === 'revenue' && 'درآمد'}
                      {ledgerData.account.account_type === 'expense' && 'هزینه'}
                    </Badge>
                    
                    {ledgerData.period_from && ledgerData.period_to && (
                      <Badge variant="secondary">
                        {formatDate(ledgerData.period_from)} تا {formatDate(ledgerData.period_to)}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Ledger Entries */}
            {ledgerData.entries.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p>هیچ تراکنشی برای این حساب یافت نشد</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-3 grid grid-cols-12 gap-2 text-sm font-medium text-slate-700">
                  <div className="col-span-2">تاریخ</div>
                  <div className="col-span-2">شماره سند</div>
                  <div className="col-span-3">شرح</div>
                  <div className="col-span-1">مرجع</div>
                  <div className="col-span-1">بدهکار</div>
                  <div className="col-span-1">بستانکار</div>
                  <div className="col-span-2">مانده</div>
                </div>

                {ledgerData.entries.map((entry, index) => (
                  <div
                    key={index}
                    className={`p-3 border-t grid grid-cols-12 gap-2 items-center hover:bg-slate-50 transition-colors ${
                      entry.is_opening_balance ? 'bg-gradient-to-r from-green-50 to-teal-50' : ''
                    }`}
                  >
                    <div className="col-span-2 text-sm">
                      {entry.is_opening_balance ? 'مانده ابتدای دوره' : formatDate(entry.entry_date)}
                    </div>
                    
                    <div className="col-span-2 text-sm font-medium">
                      {entry.is_opening_balance ? '-' : entry.entry_number}
                    </div>
                    
                    <div className="col-span-3 text-sm">
                      {entry.description}
                    </div>
                    
                    <div className="col-span-1 text-xs text-slate-500">
                      {entry.reference_number || '-'}
                    </div>
                    
                    <div className="col-span-1 text-left text-sm">
                      {entry.debit_amount > 0 ? (
                        <span className="text-green-700 font-medium">
                          {formatCurrency(entry.debit_amount)}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </div>
                    
                    <div className="col-span-1 text-left text-sm">
                      {entry.credit_amount > 0 ? (
                        <span className="text-blue-700 font-medium">
                          {formatCurrency(entry.credit_amount)}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </div>
                    
                    <div className="col-span-2 text-left">
                      <div className={`text-sm font-medium flex items-center gap-1 ${getBalanceColor(entry.running_balance)}`}>
                        {getBalanceIcon(entry.running_balance)}
                        {formatCurrency(Math.abs(entry.running_balance))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};