/**
 * Chart of Accounts component with hierarchical display
 */

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, ChevronRight, ChevronDown, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { accountingService, AccountHierarchy, Account, AccountCreate } from '@/services/accountingService';
import { AccountForm } from './AccountForm';

interface ChartOfAccountsProps {
  onAccountSelect?: (account: Account) => void;
  selectedAccountId?: string;
}

export const ChartOfAccounts: React.FC<ChartOfAccountsProps> = ({
  onAccountSelect,
  selectedAccountId
}) => {
  const [accounts, setAccounts] = useState<AccountHierarchy[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accountsByType, setAccountsByType] = useState<Record<string, number>>({});
  const { toast } = useToast();

  useEffect(() => {
    loadChartOfAccounts();
  }, []);

  const loadChartOfAccounts = async () => {
    try {
      setLoading(true);
      const response = await accountingService.getChartOfAccounts();
      setAccounts(response.accounts);
      setAccountsByType(response.accounts_by_type);
    } catch (error) {
      console.error('Error loading chart of accounts:', error);
      toast({
        title: 'خطا',
        description: 'خطا در بارگذاری دفتر حساب‌ها',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleNode = (accountId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedNodes(newExpanded);
  };

  const handleAccountClick = (account: Account) => {
    if (onAccountSelect) {
      onAccountSelect(account);
    }
  };

  const handleCreateAccount = () => {
    setEditingAccount(null);
    setShowAccountForm(true);
  };

  const handleEditAccount = (account: Account, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAccount(account);
    setShowAccountForm(true);
  };

  const handleDeleteAccount = async (account: Account, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm(`آیا از حذف حساب "${account.account_name}" اطمینان دارید؟`)) {
      return;
    }

    try {
      await accountingService.deleteAccount(account.id);
      toast({
        title: 'موفقیت',
        description: 'حساب با موفقیت حذف شد',
      });
      loadChartOfAccounts();
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: 'خطا',
        description: 'خطا در حذف حساب',
        variant: 'destructive',
      });
    }
  };

  const handleAccountSaved = () => {
    setShowAccountForm(false);
    setEditingAccount(null);
    loadChartOfAccounts();
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fa-IR', {
      style: 'currency',
      currency: 'IRR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const renderAccountNode = (account: AccountHierarchy, level: number = 0) => {
    const hasChildren = account.children && account.children.length > 0;
    const isExpanded = expandedNodes.has(account.id);
    const isSelected = selectedAccountId === account.id;
    const paddingLeft = level * 24;

    return (
      <div key={account.id} className="w-full">
        <div
          className={`
            flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200
            ${isSelected 
              ? 'bg-gradient-to-r from-green-50 to-teal-50 border-2 border-green-300 shadow-md' 
              : 'hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100'
            }
          `}
          style={{ paddingRight: `${paddingLeft + 12}px` }}
          onClick={() => handleAccountClick(account)}
        >
          <div className="flex items-center gap-3 flex-1">
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNode(account.id);
                }}
                className="p-1 hover:bg-white rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-slate-600" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-600" />
                )}
              </button>
            )}
            
            {!hasChildren && <div className="w-6" />}
            
            <div className="flex items-center gap-3 flex-1">
              <div className={`w-3 h-3 rounded-full ${getAccountTypeColor(account.account_type)}`} />
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-900">
                    {account.full_account_code}
                  </span>
                  <span className="text-slate-700">
                    {account.account_name}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {getAccountTypeLabel(account.account_type)}
                  </Badge>
                  
                  {account.is_control_account && (
                    <Badge variant="outline" className="text-xs">
                      حساب کنترل
                    </Badge>
                  )}
                  
                  {!account.allow_posting && (
                    <Badge variant="outline" className="text-xs text-orange-600">
                      غیرقابل ثبت
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="text-left">
                <div className="font-medium text-slate-900">
                  {formatCurrency(account.current_balance)}
                </div>
                {account.current_balance !== account.opening_balance && (
                  <div className="text-xs text-slate-500">
                    ابتدای دوره: {formatCurrency(account.opening_balance)}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => handleEditAccount(account, e)}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-4 w-4" />
            </Button>
            
            {!account.is_system_account && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => handleDeleteAccount(account, e)}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        {hasChildren && isExpanded && (
          <div className="mt-1">
            {account.children.map(child => renderAccountNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Card variant="professional">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            دفتر حساب‌ها
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card variant="professional">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              دفتر حساب‌ها
            </CardTitle>
            
            <Button
              onClick={handleCreateAccount}
              variant="gradient-green"
              size="sm"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              حساب جدید
            </Button>
          </div>
          
          {/* Account type summary */}
          <div className="flex flex-wrap gap-2 mt-4">
            {Object.entries(accountsByType).map(([type, count]) => (
              <Badge
                key={type}
                variant="outline"
                className="flex items-center gap-1"
              >
                <div className={`w-2 h-2 rounded-full ${getAccountTypeColor(type)}`} />
                {getAccountTypeLabel(type)}: {count}
              </Badge>
            ))}
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-1 group">
            {accounts.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Building2 className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p>هیچ حسابی تعریف نشده است</p>
                <Button
                  onClick={handleCreateAccount}
                  variant="outline"
                  className="mt-4"
                >
                  اولین حساب را ایجاد کنید
                </Button>
              </div>
            ) : (
              accounts.map(account => renderAccountNode(account))
            )}
          </div>
        </CardContent>
      </Card>
      
      {showAccountForm && (
        <AccountForm
          account={editingAccount}
          accounts={accounts}
          onSave={handleAccountSaved}
          onCancel={() => {
            setShowAccountForm(false);
            setEditingAccount(null);
          }}
        />
      )}
    </>
  );
};