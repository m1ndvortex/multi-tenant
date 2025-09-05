/**
 * Journal Entry view component for displaying entry details
 */

import React from 'react';
import { X, Edit, CheckCircle, Trash2, FileText, Calendar, Hash, Tag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { JournalEntry } from '@/services/accountingService';

interface JournalEntryViewProps {
  entry: JournalEntry;
  onClose: () => void;
  onEdit: () => void;
  onPost: () => void;
  onDelete: () => void;
}

export const JournalEntryView: React.FC<JournalEntryViewProps> = ({
  entry,
  onClose,
  onEdit,
  onPost,
  onDelete
}) => {
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

  const formatDateTime = (dateString: string) => {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card variant="professional" className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              مشاهده سند حسابداری
            </CardTitle>
            
            <div className="flex items-center gap-2">
              {!entry.is_posted && (
                <>
                  <Button
                    onClick={onEdit}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    ویرایش
                  </Button>
                  
                  <Button
                    onClick={onPost}
                    variant="gradient-green"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    ثبت سند
                  </Button>
                  
                  <Button
                    onClick={onDelete}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                    حذف
                  </Button>
                </>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Entry Header Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card variant="gradient-green" className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Hash className="h-4 w-4 text-green-700" />
                <span className="text-sm font-medium text-green-700">شماره سند</span>
              </div>
              <div className="text-lg font-bold text-green-900">
                {entry.entry_number}
              </div>
            </Card>
            
            <Card variant="gradient-blue" className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-blue-700" />
                <span className="text-sm font-medium text-blue-700">تاریخ سند</span>
              </div>
              <div className="text-lg font-bold text-blue-900">
                {formatDate(entry.entry_date)}
              </div>
            </Card>
            
            <Card variant="gradient-purple" className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-purple-700" />
                <span className="text-sm font-medium text-purple-700">وضعیت</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={entry.is_posted ? 'default' : 'secondary'} className="text-sm">
                  {entry.is_posted ? 'ثبت شده' : 'ثبت نشده'}
                </Badge>
              </div>
            </Card>
          </div>

          {/* Entry Details */}
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-slate-700">شرح سند</Label>
              <div className="mt-1 p-3 bg-slate-50 rounded-lg">
                {entry.description}
              </div>
            </div>

            {(entry.reference_type || entry.reference_number) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {entry.reference_type && (
                  <div>
                    <Label className="text-sm font-medium text-slate-700">نوع مرجع</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <Tag className="h-4 w-4 text-slate-500" />
                      <Badge variant="outline">{entry.reference_type}</Badge>
                    </div>
                  </div>
                )}
                
                {entry.reference_number && (
                  <div>
                    <Label className="text-sm font-medium text-slate-700">شماره مرجع</Label>
                    <div className="mt-1 p-2 bg-slate-50 rounded">
                      {entry.reference_number}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Journal Entry Lines */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">ردیف‌های سند</h3>
            
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-3 grid grid-cols-12 gap-2 text-sm font-medium text-slate-700">
                <div className="col-span-1">ردیف</div>
                <div className="col-span-4">حساب</div>
                <div className="col-span-3">شرح</div>
                <div className="col-span-2">بدهکار</div>
                <div className="col-span-2">بستانکار</div>
              </div>

              {entry.lines.map((line, index) => (
                <div key={line.id || index} className="p-3 border-t grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-1 text-center text-sm text-slate-500">
                    {line.line_number}
                  </div>
                  
                  <div className="col-span-4">
                    <div className="font-medium text-slate-900">
                      {line.account_code}
                    </div>
                    <div className="text-sm text-slate-600">
                      {line.account_name}
                    </div>
                  </div>
                  
                  <div className="col-span-3 text-sm text-slate-700">
                    {line.description || '-'}
                  </div>
                  
                  <div className="col-span-2 text-left">
                    {line.debit_amount > 0 ? (
                      <span className="font-medium text-green-700">
                        {formatCurrency(line.debit_amount)}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </div>
                  
                  <div className="col-span-2 text-left">
                    {line.credit_amount > 0 ? (
                      <span className="font-medium text-blue-700">
                        {formatCurrency(line.credit_amount)}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </div>
                </div>
              ))}

              {/* Totals */}
              <div className="bg-gradient-to-r from-slate-100 to-slate-200 p-3 border-t">
                <div className="grid grid-cols-12 gap-2 text-sm font-bold">
                  <div className="col-span-8 text-left">جمع کل:</div>
                  <div className="col-span-2 text-left text-green-700">
                    {formatCurrency(entry.total_debit)}
                  </div>
                  <div className="col-span-2 text-left text-blue-700">
                    {formatCurrency(entry.total_credit)}
                  </div>
                </div>
                
                <div className="mt-2 text-center">
                  {Math.abs(entry.total_debit - entry.total_credit) < 0.01 ? (
                    <Badge variant="default" className="bg-green-600">
                      سند متعادل است
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      سند متعادل نیست
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Entry Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <Label className="text-sm font-medium text-slate-700">تاریخ ایجاد</Label>
              <div className="mt-1 text-sm text-slate-600">
                {formatDateTime(entry.created_at!)}
              </div>
            </div>
            
            {entry.updated_at && entry.updated_at !== entry.created_at && (
              <div>
                <Label className="text-sm font-medium text-slate-700">آخرین به‌روزرسانی</Label>
                <div className="mt-1 text-sm text-slate-600">
                  {formatDateTime(entry.updated_at)}
                </div>
              </div>
            )}
            
            {entry.is_posted && entry.posted_at && (
              <div>
                <Label className="text-sm font-medium text-slate-700">تاریخ ثبت</Label>
                <div className="mt-1 text-sm text-slate-600">
                  {formatDateTime(entry.posted_at)}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Helper Label component if not imported
const Label: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <label className={`block text-sm font-medium ${className || ''}`}>
    {children}
  </label>
);