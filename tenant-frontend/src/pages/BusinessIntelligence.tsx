import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BrainIcon, 
  BarChart3Icon, 
  BellIcon, 
  CalendarIcon,
  TrendingUpIcon,
  RefreshCwIcon
} from 'lucide-react';
import BusinessInsightsWidget from '@/components/business-intelligence/BusinessInsightsWidget';
import KPIDashboard from '@/components/business-intelligence/KPIDashboard';
import AlertSystemInterface from '@/components/business-intelligence/AlertSystemInterface';
import ReportSchedulingInterface from '@/components/business-intelligence/ReportSchedulingInterface';

const BusinessIntelligence: React.FC = () => {
  const [activeTab, setActiveTab] = useState('insights');
  const [kpiPeriod, setKpiPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  const handleRefreshAll = () => {
    // This would trigger a refresh of all components
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50/30 to-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
              <BrainIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">هوش تجاری</h1>
              <p className="text-gray-600 mt-1">تحلیل‌های هوشمند، شاخص‌های عملکرد و هشدارهای کسب‌وکار</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshAll}
              className="flex items-center gap-2"
            >
              <RefreshCwIcon className="h-4 w-4" />
              بروزرسانی همه
            </Button>
          </div>
        </div>

        {/* Business Intelligence Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-gradient-to-r from-purple-50 via-violet-50 to-indigo-50 p-1 rounded-xl">
            <TabsTrigger 
              value="insights" 
              className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-purple-300"
            >
              <BrainIcon className="h-4 w-4" />
              تحلیل‌های هوشمند
            </TabsTrigger>
            <TabsTrigger 
              value="kpis"
              className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-blue-300"
            >
              <BarChart3Icon className="h-4 w-4" />
              شاخص‌های عملکرد
            </TabsTrigger>
            <TabsTrigger 
              value="alerts"
              className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-orange-300"
            >
              <BellIcon className="h-4 w-4" />
              هشدارها و اعلان‌ها
            </TabsTrigger>
            <TabsTrigger 
              value="scheduling"
              className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-green-300"
            >
              <CalendarIcon className="h-4 w-4" />
              زمان‌بندی گزارشات
            </TabsTrigger>
          </TabsList>

          {/* Business Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Business Insights Widget */}
              <BusinessInsightsWidget className="lg:col-span-2" />
              
              {/* Quick KPI Overview */}
              <Card variant="gradient-blue" className="p-6">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg font-bold">
                    <TrendingUpIcon className="h-5 w-5 text-blue-600" />
                    خلاصه شاخص‌های کلیدی
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-white/50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">+12.5%</div>
                      <div className="text-sm text-gray-600">رشد درآمد</div>
                    </div>
                    <div className="text-center p-4 bg-white/50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">+8.3%</div>
                      <div className="text-sm text-gray-600">رشد مشتریان</div>
                    </div>
                    <div className="text-center p-4 bg-white/50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">94.2%</div>
                      <div className="text-sm text-gray-600">رضایت مشتریان</div>
                    </div>
                    <div className="text-center p-4 bg-white/50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">15.7%</div>
                      <div className="text-sm text-gray-600">حاشیه سود</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Alerts Preview */}
              <AlertSystemInterface 
                className="lg:col-span-1" 
                showFilters={false}
                maxAlerts={5}
              />
            </div>
          </TabsContent>

          {/* KPIs Tab */}
          <TabsContent value="kpis" className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">شاخص‌های کلیدی عملکرد</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">دوره:</span>
                <div className="flex gap-1">
                  {[
                    { value: 'daily', label: 'روزانه' },
                    { value: 'weekly', label: 'هفتگی' },
                    { value: 'monthly', label: 'ماهانه' },
                  ].map((period) => (
                    <Button
                      key={period.value}
                      variant={kpiPeriod === period.value ? "gradient-blue" : "outline"}
                      size="sm"
                      onClick={() => setKpiPeriod(period.value as any)}
                    >
                      {period.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            
            <KPIDashboard period={kpiPeriod} />
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-6">
            <AlertSystemInterface showFilters={true} />
          </TabsContent>

          {/* Report Scheduling Tab */}
          <TabsContent value="scheduling" className="space-y-6">
            <ReportSchedulingInterface />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default BusinessIntelligence;