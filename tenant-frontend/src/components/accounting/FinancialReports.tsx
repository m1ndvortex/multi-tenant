/**
 * Financial Reports Interface component
 * Provides comprehensive financial reporting including receivables, payables, and financial statements
 */

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  FileText, 
  Users, 
  Building, 
  CreditCard, 
  BarChart3, 
  TrendingUp,
  Calculator,
  Download
} from 'lucide-react';
import { AccountsReceivable } from './AccountsReceivable';
import { AccountsPayable } from './AccountsPayable';
import { BankReconciliation } from './BankReconciliation';
import { ProfitLossStatement } from './ProfitLossStatement';
import { BalanceSheet } from './BalanceSheet';
import { TrialBalance } from './TrialBalance';

export const FinancialReports: React.FC = () => {
  const [activeTab, setActiveTab] = useState('receivables');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">گزارش‌های مالی</h1>
            <p className="text-gray-600">مدیریت حساب‌های دریافتنی، پرداختنی و گزارش‌های مالی</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 p-1 rounded-lg">
          <TabsTrigger 
            value="receivables" 
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-green-300"
          >
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">دریافتنی</span>
          </TabsTrigger>
          
          <TabsTrigger 
            value="payables"
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-red-300"
          >
            <Building className="h-4 w-4" />
            <span className="hidden sm:inline">پرداختنی</span>
          </TabsTrigger>
          
          <TabsTrigger 
            value="bank-reconciliation"
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-blue-300"
          >
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">تطبیق بانک</span>
          </TabsTrigger>
          
          <TabsTrigger 
            value="profit-loss"
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-purple-300"
          >
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">سود و زیان</span>
          </TabsTrigger>
          
          <TabsTrigger 
            value="balance-sheet"
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-indigo-300"
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">ترازنامه</span>
          </TabsTrigger>
          
          <TabsTrigger 
            value="trial-balance"
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-orange-300"
          >
            <Calculator className="h-4 w-4" />
            <span className="hidden sm:inline">تراز آزمایشی</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="receivables" className="mt-6">
          <AccountsReceivable />
        </TabsContent>

        <TabsContent value="payables" className="mt-6">
          <AccountsPayable />
        </TabsContent>

        <TabsContent value="bank-reconciliation" className="mt-6">
          <BankReconciliation />
        </TabsContent>

        <TabsContent value="profit-loss" className="mt-6">
          <ProfitLossStatement />
        </TabsContent>

        <TabsContent value="balance-sheet" className="mt-6">
          <BalanceSheet />
        </TabsContent>

        <TabsContent value="trial-balance" className="mt-6">
          <TrialBalance />
        </TabsContent>
      </Tabs>
    </div>
  );
};