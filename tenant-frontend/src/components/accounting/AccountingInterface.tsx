/**
 * Main Accounting Interface component that combines Chart of Accounts and General Ledger
 */

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, BookOpen, FileText, Calculator, BarChart3 } from 'lucide-react';
import { ChartOfAccounts } from './ChartOfAccounts';
import { GeneralLedger } from './GeneralLedger';
import { JournalEntries } from './JournalEntries';
import { TrialBalance } from './TrialBalance';
import { FinancialReports } from './FinancialReports';
import { Account } from '@/services/accountingService';

export const AccountingInterface: React.FC = () => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [activeTab, setActiveTab] = useState('chart-of-accounts');

  const handleAccountSelect = (account: Account) => {
    setSelectedAccountId(account.id);
    setActiveTab('general-ledger');
  };

  const handleAccountSelectFromLedger = (accountId: string) => {
    setSelectedAccountId(accountId);
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-gradient-to-r from-green-50 via-teal-50 to-blue-50 p-1 rounded-lg">
          <TabsTrigger 
            value="chart-of-accounts" 
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-green-300"
          >
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">دفتر حساب‌ها</span>
          </TabsTrigger>
          
          <TabsTrigger 
            value="general-ledger"
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-blue-300"
          >
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">دفتر کل</span>
          </TabsTrigger>
          
          <TabsTrigger 
            value="journal-entries"
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-purple-300"
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">اسناد حسابداری</span>
          </TabsTrigger>
          
          <TabsTrigger 
            value="trial-balance"
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-orange-300"
          >
            <Calculator className="h-4 w-4" />
            <span className="hidden sm:inline">تراز آزمایشی</span>
          </TabsTrigger>
          
          <TabsTrigger 
            value="financial-reports"
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-indigo-300"
          >
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">گزارش‌های مالی</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chart-of-accounts" className="mt-6">
          <ChartOfAccounts 
            onAccountSelect={handleAccountSelect}
            selectedAccountId={selectedAccountId}
          />
        </TabsContent>

        <TabsContent value="general-ledger" className="mt-6">
          <GeneralLedger 
            selectedAccountId={selectedAccountId}
            onAccountSelect={handleAccountSelectFromLedger}
          />
        </TabsContent>

        <TabsContent value="journal-entries" className="mt-6">
          <JournalEntries />
        </TabsContent>

        <TabsContent value="trial-balance" className="mt-6">
          <TrialBalance />
        </TabsContent>

        <TabsContent value="financial-reports" className="mt-6">
          <FinancialReports />
        </TabsContent>
      </Tabs>
    </div>
  );
};