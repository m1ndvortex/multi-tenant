import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import NotificationSettingsComponent from '@/components/notifications/NotificationSettings';
import NotificationHistoryComponent from '@/components/notifications/NotificationHistory';
import ManualReminderComponent from '@/components/notifications/ManualReminder';
import MarketingCampaignsComponent from '@/components/notifications/MarketingCampaigns';
import { Bell, Settings, History, Send, Megaphone } from 'lucide-react';

const Notifications: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <Card variant="filter">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Bell className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">مدیریت اعلان‌ها</h1>
              <p className="text-sm text-gray-600 mt-1">
                مدیریت تنظیمات اعلان‌ها، تاریخچه، یادآوری‌ها و کمپین‌های بازاریابی
              </p>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Notification Management Tabs */}
      <Tabs defaultValue="settings" className="space-y-6">
        <Card variant="professional">
          <CardContent className="p-6">
            <TabsList className="grid w-full grid-cols-4 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 p-1 rounded-xl">
              <TabsTrigger 
                value="settings" 
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-blue-300"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">تنظیمات</span>
              </TabsTrigger>
              <TabsTrigger 
                value="history"
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-purple-300"
              >
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">تاریخچه</span>
              </TabsTrigger>
              <TabsTrigger 
                value="reminders"
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-orange-300"
              >
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">یادآوری</span>
              </TabsTrigger>
              <TabsTrigger 
                value="campaigns"
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-pink-300"
              >
                <Megaphone className="h-4 w-4" />
                <span className="hidden sm:inline">کمپین‌ها</span>
              </TabsTrigger>
            </TabsList>
          </CardContent>
        </Card>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <NotificationSettingsComponent />
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <NotificationHistoryComponent />
        </TabsContent>

        {/* Manual Reminders Tab */}
        <TabsContent value="reminders" className="space-y-6">
          <ManualReminderComponent />
        </TabsContent>

        {/* Marketing Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-6">
          <MarketingCampaignsComponent />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Notifications;