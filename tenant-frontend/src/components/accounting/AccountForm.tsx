/**
 * Account creation and editing form component
 */

import React, { useState, useEffect } from 'react';
import { X, Save, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { accountingService, Account, AccountHierarchy, AccountCreate, AccountUpdate } from '@/services/accountingService';

interface AccountFormProps {
  account?: Account | null;
  accounts: AccountHierarchy[];
  onSave: () => void;
  onCancel: () => void;
}

export const AccountForm: React.FC<AccountFormProps> = ({
  account,
  accounts,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    account_code: '',
    account_name: '',
    account_type: '' as 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' | '',
    parent_id: '',
    is_control_account: false,
    allow_posting: true,
    opening_balance: 0,
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    if (account) {
      setFormData({
        account_code: account.account_code,
        account_name: account.account_name,
        account_type: account.account_type,
        parent_id: account.parent_id || '',
        is_control_account: account.is_control_account,
        allow_posting: account.allow_posting,
        opening_balance: account.opening_balance,
        description: account.description || ''
      });
    }
  }, [account]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.account_code.trim()) {
      newErrors.account_code = 'کد حساب الزامی است';
    }

    if (!formData.account_name.trim()) {
      newErrors.account_name = 'نام حساب الزامی است';
    }

    if (!formData.account_type) {
      newErrors.account_type = 'نوع حساب الزامی است';
    }

    // Check for duplicate account code
    const existingAccount = flattenAccounts(accounts).find(
      acc => acc.account_code === formData.account_code && acc.id !== account?.id
    );
    if (existingAccount) {
      newErrors.account_code = 'کد حساب تکراری است';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const flattenAccounts = (accountList: AccountHierarchy[]): Account[] => {
    const result: Account[] = [];
    
    const flatten = (accounts: AccountHierarchy[]) => {
      accounts.forEach(acc => {
        result.push(acc);
        if (acc.children && acc.children.length > 0) {
          flatten(acc.children);
        }
      });
    };
    
    flatten(accountList);
    return result;
  };

  const getAvailableParentAccounts = () => {
    const flatAccounts = flattenAccounts(accounts);
    
    // Filter accounts that can be parents (same type or control accounts)
    return flatAccounts.filter(acc => {
      // Can't be parent of itself
      if (account && acc.id === account.id) return false;
      
      // Must be same type or control account
      return acc.account_type === formData.account_type || acc.is_control_account;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      if (account) {
        // Update existing account
        const updateData: AccountUpdate = {
          account_name: formData.account_name,
          account_type: formData.account_type,
          parent_id: formData.parent_id || undefined,
          is_control_account: formData.is_control_account,
          allow_posting: formData.allow_posting,
          description: formData.description || undefined
        };
        
        await accountingService.updateAccount(account.id, updateData);
        toast({
          title: 'موفقیت',
          description: 'حساب با موفقیت به‌روزرسانی شد',
        });
      } else {
        // Create new account
        const createData: AccountCreate = {
          account_code: formData.account_code,
          account_name: formData.account_name,
          account_type: formData.account_type,
          parent_id: formData.parent_id || undefined,
          is_control_account: formData.is_control_account,
          allow_posting: formData.allow_posting,
          opening_balance: formData.opening_balance,
          description: formData.description || undefined
        };
        
        await accountingService.createAccount(createData);
        toast({
          title: 'موفقیت',
          description: 'حساب جدید با موفقیت ایجاد شد',
        });
      }
      
      onSave();
    } catch (error) {
      console.error('Error saving account:', error);
      toast({
        title: 'خطا',
        description: account ? 'خطا در به‌روزرسانی حساب' : 'خطا در ایجاد حساب جدید',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card variant="professional" className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {account ? 'ویرایش حساب' : 'حساب جدید'}
            </CardTitle>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Account Code */}
              <div className="space-y-2">
                <Label htmlFor="account_code">کد حساب *</Label>
                <Input
                  id="account_code"
                  value={formData.account_code}
                  onChange={(e) => setFormData({ ...formData, account_code: e.target.value })}
                  placeholder="مثال: 1001"
                  disabled={!!account} // Can't change code for existing accounts
                  className={errors.account_code ? 'border-red-500' : ''}
                />
                {errors.account_code && (
                  <p className="text-sm text-red-600">{errors.account_code}</p>
                )}
              </div>

              {/* Account Name */}
              <div className="space-y-2">
                <Label htmlFor="account_name">نام حساب *</Label>
                <Input
                  id="account_name"
                  value={formData.account_name}
                  onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                  placeholder="نام حساب را وارد کنید"
                  className={errors.account_name ? 'border-red-500' : ''}
                />
                {errors.account_name && (
                  <p className="text-sm text-red-600">{errors.account_name}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Account Type */}
              <div className="space-y-2">
                <Label htmlFor="account_type">نوع حساب *</Label>
                <Select
                  value={formData.account_type}
                  onValueChange={(value) => setFormData({ ...formData, account_type: value as any, parent_id: '' })}
                >
                  <SelectTrigger className={errors.account_type ? 'border-red-500' : ''}>
                    <SelectValue placeholder="نوع حساب را انتخاب کنید" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asset">دارایی</SelectItem>
                    <SelectItem value="liability">بدهی</SelectItem>
                    <SelectItem value="equity">حقوق صاحبان سهام</SelectItem>
                    <SelectItem value="revenue">درآمد</SelectItem>
                    <SelectItem value="expense">هزینه</SelectItem>
                  </SelectContent>
                </Select>
                {errors.account_type && (
                  <p className="text-sm text-red-600">{errors.account_type}</p>
                )}
              </div>

              {/* Parent Account */}
              <div className="space-y-2">
                <Label htmlFor="parent_id">حساب والد</Label>
                <Select
                  value={formData.parent_id}
                  onValueChange={(value) => setFormData({ ...formData, parent_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="حساب والد را انتخاب کنید (اختیاری)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">بدون والد</SelectItem>
                    {getAvailableParentAccounts().map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.full_account_code} - {acc.account_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Opening Balance (only for new accounts) */}
            {!account && (
              <div className="space-y-2">
                <Label htmlFor="opening_balance">مانده ابتدای دوره</Label>
                <Input
                  id="opening_balance"
                  type="number"
                  value={formData.opening_balance}
                  onChange={(e) => setFormData({ ...formData, opening_balance: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">توضیحات</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="توضیحات اضافی (اختیاری)"
                rows={3}
              />
            </div>

            {/* Checkboxes */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="is_control_account"
                  checked={formData.is_control_account}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_control_account: !!checked })}
                />
                <Label htmlFor="is_control_account" className="text-sm">
                  حساب کنترل (می‌تواند والد حساب‌های مختلف باشد)
                </Label>
              </div>

              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="allow_posting"
                  checked={formData.allow_posting}
                  onCheckedChange={(checked) => setFormData({ ...formData, allow_posting: !!checked })}
                />
                <Label htmlFor="allow_posting" className="text-sm">
                  امکان ثبت مستقیم سند
                </Label>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
              >
                انصراف
              </Button>
              
              <Button
                type="submit"
                variant="gradient-green"
                disabled={loading}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {account ? 'به‌روزرسانی' : 'ایجاد حساب'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};