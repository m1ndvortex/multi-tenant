import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const Dashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-slate-800 mb-2 text-center">
          سیستم آماده است
        </h2>
        <p className="text-slate-600 text-center">
          اپلیکیشن مدیریت کسب و کار با موفقیت راه‌اندازی شد
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card variant="gradient-green">
          <CardHeader>
            <CardTitle className="text-green-800">Backend API</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-green-700">http://localhost:8000</p>
            <Button variant="gradient-green" className="mt-4">
              بررسی وضعیت API
            </Button>
          </CardContent>
        </Card>
        
        <Card variant="gradient-blue">
          <CardHeader>
            <CardTitle className="text-blue-800">Super Admin</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-blue-700">http://localhost:3000</p>
            <Button variant="gradient-blue" className="mt-4">
              پنل مدیریت
            </Button>
          </CardContent>
        </Card>
        
        <Card variant="gradient-purple">
          <CardHeader>
            <CardTitle className="text-purple-800">Tenant App</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-purple-700">http://localhost:3001</p>
            <Button variant="gradient-purple" className="mt-4">
              مدیریت کسب و کار
            </Button>
          </CardContent>
        </Card>
      </div>
      
      <Card variant="filter">
        <CardHeader>
          <CardTitle className="text-slate-800">ویژگی‌های کلیدی</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
            <div>• مدیریت فاکتور دوگانه</div>
            <div>• سیستم اقساط طلا</div>
            <div>• حسابداری جامع</div>
            <div>• گزارش‌گیری پیشرفته</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;