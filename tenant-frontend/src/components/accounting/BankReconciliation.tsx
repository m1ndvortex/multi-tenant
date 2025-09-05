/**
 * Bank Reconciliation Interface with Drag-and-Drop Matching
 * Manages bank statement import, transaction matching, and reconciliation
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  Download, 
  CheckCircle, 
  AlertCircle,
  ArrowRightLeft,
  Calendar,
  DollarSign,
  FileText,
  Trash2,
  Eye
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface BankTransaction {
  id: string;
  date: string;
  description: string;
  reference: string;
  debit_amount: number;
  credit_amount: number;
  balance: number;
  is_matched: boolean;
  matched_entry_id?: string;
}

interface BookTransaction {
  id: string;
  date: string;
  description: string;
  reference: string;
  debit_amount: number;
  credit_amount: number;
  is_matched: boolean;
  matched_bank_id?: string;
}

interface ReconciliationSummary {
  bank_balance: number;
  book_balance: number;
  difference: number;
  matched_transactions: number;
  unmatched_bank: number;
  unmatched_book: number;
}

export const BankReconciliation: React.FC = () => {
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
  const [bookTransactions, setBookTransactions] = useState<BookTransaction[]>([]);
  const [reconciliationSummary, setReconciliationSummary] = useState<ReconciliationSummary>({
    bank_balance: 0,
    book_balance: 0,
    difference: 0,
    matched_transactions: 0,
    unmatched_bank: 0,
    unmatched_book: 0
  });
  const [selectedBankTransaction, setSelectedBankTransaction] = useState<string | null>(null);
  const [selectedBookTransaction, setSelectedBookTransaction] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReconciliationData();
  }, []);

  const loadReconciliationData = async () => {
    try {
      setLoading(true);
      
      // Mock bank transactions
      const mockBankTransactions: BankTransaction[] = [
        {
          id: 'bank1',
          date: '2024-03-01',
          description: 'واریز نقدی',
          reference: 'DEP001',
          debit_amount: 0,
          credit_amount: 5000000,
          balance: 15000000,
          is_matched: false
        },
        {
          id: 'bank2',
          date: '2024-03-02',
          description: 'پرداخت چک',
          reference: 'CHK001',
          debit_amount: 2000000,
          credit_amount: 0,
          balance: 13000000,
          is_matched: true,
          matched_entry_id: 'book2'
        },
        {
          id: 'bank3',
          date: '2024-03-03',
          description: 'کارمزد بانک',
          reference: 'FEE001',
          debit_amount: 50000,
          credit_amount: 0,
          balance: 12950000,
          is_matched: false
        }
      ];

      // Mock book transactions
      const mockBookTransactions: BookTransaction[] = [
        {
          id: 'book1',
          date: '2024-03-01',
          description: 'دریافت از مشتری',
          reference: 'REC001',
          debit_amount: 5000000,
          credit_amount: 0,
          is_matched: false
        },
        {
          id: 'book2',
          date: '2024-03-02',
          description: 'پرداخت به تأمین‌کننده',
          reference: 'PAY001',
          debit_amount: 0,
          credit_amount: 2000000,
          is_matched: true,
          matched_bank_id: 'bank2'
        },
        {
          id: 'book3',
          date: '2024-03-04',
          description: 'فروش نقدی',
          reference: 'SALE001',
          debit_amount: 1500000,
          credit_amount: 0,
          is_matched: false
        }
      ];

      setBankTransactions(mockBankTransactions);
      setBookTransactions(mockBookTransactions);

      // Calculate summary
      const bankBalance = mockBankTransactions[mockBankTransactions.length - 1]?.balance || 0;
      const bookBalance = mockBookTransactions.reduce((sum, t) => sum + t.debit_amount - t.credit_amount, 10000000);
      const matchedCount = mockBankTransactions.filter(t => t.is_matched).length;
      const unmatchedBank = mockBankTransactions.filter(t => !t.is_matched).length;
      const unmatchedBook = mockBookTransactions.filter(t => !t.is_matched).length;

      setReconciliationSummary({
        bank_balance: bankBalance,
        book_balance: bookBalance,
        difference: bankBalance - bookBalance,
        matched_transactions: matchedCount,
        unmatched_bank: unmatchedBank,
        unmatched_book: unmatchedBook
      });

    } catch (error) {
      console.error('Error loading reconciliation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMatch = () => {
    if (!selectedBankTransaction || !selectedBookTransaction) return;

    // Update bank transaction
    setBankTransactions(prev => prev.map(t => 
      t.id === selectedBankTransaction 
        ? { ...t, is_matched: true, matched_entry_id: selectedBookTransaction }
        : t
    ));

    // Update book transaction
    setBookTransactions(prev => prev.map(t => 
      t.id === selectedBookTransaction 
        ? { ...t, is_matched: true, matched_bank_id: selectedBankTransaction }
        : t
    ));

    // Clear selections
    setSelectedBankTransaction(null);
    setSelectedBookTransaction(null);

    // Update summary
    setReconciliationSummary(prev => ({
      ...prev,
      matched_transactions: prev.matched_transactions + 1,
      unmatched_bank: prev.unmatched_bank - 1,
      unmatched_book: prev.unmatched_book - 1
    }));
  };

  const handleUnmatch = (bankId: string, bookId: string) => {
    // Update bank transaction
    setBankTransactions(prev => prev.map(t => 
      t.id === bankId 
        ? { ...t, is_matched: false, matched_entry_id: undefined }
        : t
    ));

    // Update book transaction
    setBookTransactions(prev => prev.map(t => 
      t.id === bookId 
        ? { ...t, is_matched: false, matched_bank_id: undefined }
        : t
    ));

    // Update summary
    setReconciliationSummary(prev => ({
      ...prev,
      matched_transactions: prev.matched_transactions - 1,
      unmatched_bank: prev.unmatched_bank + 1,
      unmatched_book: prev.unmatched_book + 1
    }));
  };

  const exportReconciliation = () => {
    const reconciliationData = {
      summary: reconciliationSummary,
      bank_transactions: bankTransactions,
      book_transactions: bookTransactions,
      export_date: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(reconciliationData, null, 2)], { 
      type: 'application/json;charset=utf-8;' 
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `bank_reconciliation_${new Date().toISOString().split('T')[0]}.json`;
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

  return (
    <div className="space-y-6">
      {/* Reconciliation Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">موجودی بانک</p>
                <p className="text-2xl font-bold text-blue-900">
                  {formatCurrency(reconciliationSummary.bank_balance)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">موجودی دفتر</p>
                <p className="text-2xl font-bold text-green-900">
                  {formatCurrency(reconciliationSummary.book_balance)}
                </p>
              </div>
              <FileText className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className={`border-0 shadow-lg ${
          reconciliationSummary.difference === 0 
            ? 'bg-gradient-to-br from-green-50 to-green-100/50' 
            : 'bg-gradient-to-br from-red-50 to-red-100/50'
        }`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${
                  reconciliationSummary.difference === 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  اختلاف
                </p>
                <p className={`text-2xl font-bold ${
                  reconciliationSummary.difference === 0 ? 'text-green-900' : 'text-red-900'
                }`}>
                  {formatCurrency(Math.abs(reconciliationSummary.difference))}
                </p>
              </div>
              {reconciliationSummary.difference === 0 ? (
                <CheckCircle className="h-8 w-8 text-green-500" />
              ) : (
                <AlertCircle className="h-8 w-8 text-red-500" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">تطبیق شده</p>
                <p className="text-2xl font-bold text-purple-900">
                  {reconciliationSummary.matched_transactions}
                </p>
              </div>
              <ArrowRightLeft className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-slate-50 to-slate-100/80">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex gap-4">
              <Button className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white">
                <Upload className="h-4 w-4 ml-2" />
                بارگذاری صورتحساب بانک
              </Button>
              
              <Button
                onClick={handleMatch}
                disabled={!selectedBankTransaction || !selectedBookTransaction}
                className="bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white disabled:opacity-50"
              >
                <ArrowRightLeft className="h-4 w-4 ml-2" />
                تطبیق انتخاب شده
              </Button>
            </div>

            <Button
              onClick={exportReconciliation}
              className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white"
            >
              <Download className="h-4 w-4 ml-2" />
              خروجی گزارش
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reconciliation Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bank Transactions */}
        <Card className="border-0 shadow-lg bg-white">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="text-lg font-semibold text-gray-900">
              تراکنش‌های بانک ({bankTransactions.filter(t => !t.is_matched).length} تطبیق نشده)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              {bankTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className={`p-4 border-b border-gray-200 cursor-pointer transition-colors ${
                    transaction.is_matched 
                      ? 'bg-green-50 opacity-60' 
                      : selectedBankTransaction === transaction.id
                        ? 'bg-blue-100 border-blue-300'
                        : 'hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    if (!transaction.is_matched) {
                      setSelectedBankTransaction(
                        selectedBankTransaction === transaction.id ? null : transaction.id
                      );
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{transaction.description}</p>
                        {transaction.is_matched && (
                          <Badge className="bg-green-100 text-green-800">تطبیق شده</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{transaction.reference}</p>
                      <p className="text-xs text-gray-500">{formatDate(transaction.date)}</p>
                    </div>
                    <div className="text-left">
                      {transaction.debit_amount > 0 && (
                        <p className="text-red-600 font-medium">
                          -{formatCurrency(transaction.debit_amount)}
                        </p>
                      )}
                      {transaction.credit_amount > 0 && (
                        <p className="text-green-600 font-medium">
                          +{formatCurrency(transaction.credit_amount)}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        موجودی: {formatCurrency(transaction.balance)}
                      </p>
                    </div>
                    {transaction.is_matched && transaction.matched_entry_id && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnmatch(transaction.id, transaction.matched_entry_id!);
                        }}
                        className="text-red-600 hover:text-red-900 mr-2"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Book Transactions */}
        <Card className="border-0 shadow-lg bg-white">
          <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50">
            <CardTitle className="text-lg font-semibold text-gray-900">
              تراکنش‌های دفتر ({bookTransactions.filter(t => !t.is_matched).length} تطبیق نشده)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              {bookTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className={`p-4 border-b border-gray-200 cursor-pointer transition-colors ${
                    transaction.is_matched 
                      ? 'bg-green-50 opacity-60' 
                      : selectedBookTransaction === transaction.id
                        ? 'bg-green-100 border-green-300'
                        : 'hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    if (!transaction.is_matched) {
                      setSelectedBookTransaction(
                        selectedBookTransaction === transaction.id ? null : transaction.id
                      );
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{transaction.description}</p>
                        {transaction.is_matched && (
                          <Badge className="bg-green-100 text-green-800">تطبیق شده</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{transaction.reference}</p>
                      <p className="text-xs text-gray-500">{formatDate(transaction.date)}</p>
                    </div>
                    <div className="text-left">
                      {transaction.debit_amount > 0 && (
                        <p className="text-green-600 font-medium">
                          +{formatCurrency(transaction.debit_amount)}
                        </p>
                      )}
                      {transaction.credit_amount > 0 && (
                        <p className="text-red-600 font-medium">
                          -{formatCurrency(transaction.credit_amount)}
                        </p>
                      )}
                    </div>
                    {transaction.is_matched && transaction.matched_bank_id && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnmatch(transaction.matched_bank_id!, transaction.id);
                        }}
                        className="text-red-600 hover:text-red-900 mr-2"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};