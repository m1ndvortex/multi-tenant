/**
 * Journal Entry creation and editing form component
 */

// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { accountingService, JournalEntry, JournalEntryCreate, JournalEntryUpdate, Account } from '@/services/accountingService';

interface JournalEntryFormProps {
  entry?: JournalEntry | null;
  onSave: () => void;
  onCancel: () => void;
}

interface JournalEntryLineForm {
  id?: string;
  account_id: string;
  description: string;
  debit_amount: number;
  credit_amount: number;
  line_number: number;
}

export const JournalEntryForm: React.FC<JournalEntryFormProps> = ({
  entry,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    description: '',
    reference_type: '',
    reference_number: ''
  });
  const [lines, setLines] = useState<JournalEntryLineForm[]>([
    { account_id: '', description: '', debit_amount: 0, credit_amount: 0, line_number: 1 },
    { account_id: '', description: '', debit_amount: 0, credit_amount: 0, line_number: 2 }
  ]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    loadAccounts();
    
    if (entry) {
      setFormData({
        entry_date: entry.entry_date.split('T')[0],
        description: entry.description,
        reference_type: entry.reference_type || '',
        reference_number: entry.reference_number || ''
      });
      
      setLines(entry.lines.map(line => ({
        id: line.id,
        account_id: line.account_id,
        description: line.description || '',
        debit_amount: line.debit_amount,
        credit_amount: line.credit_amount,
        line_number: line.line_number
      })));
    }
  }, [entry]);

  const loadAccounts = async () => {
    try {
      const accountsData = await accountingService.getAccounts();
      // Filter accounts that allow posting
      setAccounts(accountsData.filter(acc => acc.allow_posting));
    } catch (error) {
      console.error('Error loading accounts:', error);
      toast({
        title: 'خطا',
        description: 'خطا در بارگذاری حساب‌ها',
        variant: 'destructive',
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.description.trim()) {
      newErrors.description = 'شرح سند الزامی است';
    }

    if (lines.length < 2) {
      newErrors.lines = 'سند باید حداقل ۲ ردیف داشته باشد';
    }

    // Validate each line
    let hasValidLine = false;
    lines.forEach((line, index) => {
      if (!line.account_id) {
        newErrors[`line_${index}_account`] = 'انتخاب حساب الزامی است';
      }
      
      if (line.debit_amount === 0 && line.credit_amount === 0) {
        newErrors[`line_${index}_amount`] = 'مبلغ بدهکار یا بستانکار الزامی است';
      }
      
      if (line.debit_amount > 0 && line.credit_amount > 0) {
        newErrors[`line_${index}_amount`] = 'نمی‌توان هم بدهکار و هم بستانکار داشت';
      }
      
      if (line.debit_amount > 0 || line.credit_amount > 0) {
        hasValidLine = true;
      }
    });

    if (!hasValidLine) {
      newErrors.lines = 'حداقل یک ردیف باید مبلغ داشته باشد';
    }

    // Check if debits equal credits
    const totalDebits = lines.reduce((sum, line) => sum + line.debit_amount, 0);
    const totalCredits = lines.reduce((sum, line) => sum + line.credit_amount, 0);
    
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      newErrors.balance = `سند متعادل نیست: بدهکار ${totalDebits.toLocaleString('fa-IR')} - بستانکار ${totalCredits.toLocaleString('fa-IR')}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      if (entry) {
        // Update existing entry (only description and reference fields)
        const updateData: JournalEntryUpdate = {
          description: formData.description,
          reference_type: formData.reference_type || undefined,
          reference_number: formData.reference_number || undefined
        };
        
        await accountingService.updateJournalEntry(entry.id!, updateData);
        toast({
          title: 'موفقیت',
          description: 'سند با موفقیت به‌روزرسانی شد',
        });
      } else {
        // Create new entry
        const createData: JournalEntryCreate = {
          entry_date: formData.entry_date,
          description: formData.description,
          reference_type: formData.reference_type || undefined,
          reference_number: formData.reference_number || undefined,
          lines: lines.map(line => ({
            account_id: line.account_id,
            description: line.description || undefined,
            debit_amount: line.debit_amount,
            credit_amount: line.credit_amount,
            line_number: line.line_number
          }))
        };
        
        await accountingService.createJournalEntry(createData);
        toast({
          title: 'موفقیت',
          description: 'سند جدید با موفقیت ایجاد شد',
        });
      }
      
      onSave();
    } catch (error) {
      console.error('Error saving journal entry:', error);
      toast({
        title: 'خطا',
        description: entry ? 'خطا در به‌روزرسانی سند' : 'خطا در ایجاد سند جدید',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addLine = () => {
    const newLine: JournalEntryLineForm = {
      account_id: '',
      description: '',
      debit_amount: 0,
      credit_amount: 0,
      line_number: lines.length + 1
    };
    setLines([...lines, newLine]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 2) {
      toast({
        title: 'خطا',
        description: 'سند باید حداقل ۲ ردیف داشته باشد',
        variant: 'destructive',
      });
      return;
    }
    
    const newLines = lines.filter((_, i) => i !== index);
    // Update line numbers
    newLines.forEach((line, i) => {
      line.line_number = i + 1;
    });
    setLines(newLines);
  };

  const updateLine = (index: number, field: keyof JournalEntryLineForm, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    
    // If updating debit, clear credit and vice versa
    if (field === 'debit_amount' && value > 0) {
      newLines[index].credit_amount = 0;
    } else if (field === 'credit_amount' && value > 0) {
      newLines[index].debit_amount = 0;
    }
    
    setLines(newLines);
  };

  const getAccountName = (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId);
    return account ? `${account.account_code} - ${account.account_name}` : '';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fa-IR').format(amount);
  };

  const totalDebits = lines.reduce((sum, line) => sum + line.debit_amount, 0);
  const totalCredits = lines.reduce((sum, line) => sum + line.credit_amount, 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card variant="professional" className="w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {entry ? 'ویرایش سند حسابداری' : 'سند حسابداری جدید'}
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
            {/* Entry Header */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entry_date">تاریخ سند *</Label>
                <Input
                  id="entry_date"
                  type="date"
                  value={formData.entry_date}
                  onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                  disabled={!!entry} // Can't change date for existing entries
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference_number">شماره مرجع</Label>
                <Input
                  id="reference_number"
                  value={formData.reference_number}
                  onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                  placeholder="شماره مرجع (اختیاری)"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">شرح سند *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="شرح سند را وارد کنید"
                rows={2}
                className={errors.description ? 'border-red-500' : ''}
              />
              {errors.description && (
                <p className="text-sm text-red-600">{errors.description}</p>
              )}
            </div>

            {/* Journal Entry Lines */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">ردیف‌های سند</h3>
                <Button
                  type="button"
                  onClick={addLine}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  disabled={!!entry} // Can't add lines to existing entries
                >
                  <Plus className="h-4 w-4" />
                  افزودن ردیف
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-3 grid grid-cols-12 gap-2 text-sm font-medium text-slate-700">
                  <div className="col-span-4">حساب</div>
                  <div className="col-span-3">شرح</div>
                  <div className="col-span-2">بدهکار</div>
                  <div className="col-span-2">بستانکار</div>
                  <div className="col-span-1">عملیات</div>
                </div>

                {lines.map((line, index) => (
                  <div key={index} className="p-3 border-t grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4">
                      <Select
                        value={line.account_id}
                        onValueChange={(value) => updateLine(index, 'account_id', value)}
                        disabled={!!entry} // Can't change accounts for existing entries
                      >
                        <SelectTrigger className={errors[`line_${index}_account`] ? 'border-red-500' : ''}>
                          <SelectValue placeholder="انتخاب حساب" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map(account => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.account_code} - {account.account_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors[`line_${index}_account`] && (
                        <p className="text-xs text-red-600 mt-1">{errors[`line_${index}_account`]}</p>
                      )}
                    </div>

                    <div className="col-span-3">
                      <Input
                        value={line.description}
                        onChange={(e) => updateLine(index, 'description', e.target.value)}
                        placeholder="شرح ردیف"
                      />
                    </div>

                    <div className="col-span-2">
                      <Input
                        type="number"
                        value={line.debit_amount || ''}
                        onChange={(e) => updateLine(index, 'debit_amount', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        size="sm"
                        disabled={!!entry} // Can't change amounts for existing entries
                        className={errors[`line_${index}_amount`] ? 'border-red-500' : ''}
                      />
                    </div>

                    <div className="col-span-2">
                      <Input
                        type="number"
                        value={line.credit_amount || ''}
                        onChange={(e) => updateLine(index, 'credit_amount', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        size="sm"
                        disabled={!!entry} // Can't change amounts for existing entries
                        className={errors[`line_${index}_amount`] ? 'border-red-500' : ''}
                      />
                    </div>

                    <div className="col-span-1">
                      {!entry && (
                        <Button
                          type="button"
                          onClick={() => removeLine(index)}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          disabled={lines.length <= 2}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {errors[`line_${index}_amount`] && (
                      <div className="col-span-12">
                        <p className="text-xs text-red-600">{errors[`line_${index}_amount`]}</p>
                      </div>
                    )}
                  </div>
                ))}

                {/* Totals */}
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-3 border-t">
                  <div className="grid grid-cols-12 gap-2 text-sm font-medium">
                    <div className="col-span-7 text-left">جمع کل:</div>
                    <div className="col-span-2 text-center">
                      {formatCurrency(totalDebits)}
                    </div>
                    <div className="col-span-2 text-center">
                      {formatCurrency(totalCredits)}
                    </div>
                    <div className="col-span-1 text-center">
                      {isBalanced ? (
                        <span className="text-green-600">✓</span>
                      ) : (
                        <span className="text-red-600">✗</span>
                      )}
                    </div>
                  </div>
                  
                  {errors.balance && (
                    <p className="text-sm text-red-600 mt-2">{errors.balance}</p>
                  )}
                </div>
              </div>

              {errors.lines && (
                <p className="text-sm text-red-600">{errors.lines}</p>
              )}
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
                disabled={loading || !isBalanced}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {entry ? 'به‌روزرسانی' : 'ایجاد سند'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};