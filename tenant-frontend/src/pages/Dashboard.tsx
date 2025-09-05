import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import UserManagement from '@/components/UserManagement';
import { 
  BarChart3, 
  FileText, 
  Users, 
  Package,
  TrendingUp,
  DollarSign
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const stats = [
    {
      title: 'فاکتورهای امروز',
      value: '12',
      change: '+2.5%',
      icon: FileText,
      gradient: 'from-green-500 to-teal-600'
    },
    {
      title: 'مشتریان فعال',
      value: '48',
      change: '+5.2%',
      icon: Users,
      gradient: 'from-blue-500 to-indigo-600'
    },
    {
      title: 'محصولات',
      value: '156',
      change: '+1.8%',
      icon: Package,
      gradient: 'from-purple-500 to-violet-600'
    },
    {
      title: 'فروش امروز',
      value: '2,450,000',
      change: '+8.1%',
      icon: DollarSign,
      gradient: 'from-orange-500 to-red-600'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <Card variant="gradient-green">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 mb-2">
                خوش آمدید به داشبورد
              </h1>
              <p className="text-slate-600">
                مدیریت کسب و کار خود را از اینجا شروع کنید
              </p>
            </div>
            <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-green-600 to-teal-700 flex items-center justify-center">
              <BarChart3 className="h-8 w-8 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} variant="professional">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">{stat.title}</p>
                    <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                    <div className="flex items-center mt-2">
                      <TrendingUp className="h-3 w-3 text-green-500 ml-1" />
                      <span className="text-xs text-green-600">{stat.change}</span>
                    </div>
                  </div>
                  <div className={`h-12 w-12 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* User Management */}
      <UserManagement />

      {/* Quick Actions */}
      <Card variant="professional">
        <CardHeader>
          <CardTitle>عملیات سریع</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card variant="gradient-green" className="p-4 cursor-pointer hover:shadow-lg transition-shadow">
              <div className="flex items-center space-x-3 space-x-reverse">
                <FileText className="h-8 w-8 text-green-600" />
                <div>
                  <h3 className="font-semibold text-slate-800">ایجاد فاکتور</h3>
                  <p className="text-sm text-slate-600">فاکتور جدید ایجاد کنید</p>
                </div>
              </div>
            </Card>
            
            <Card variant="gradient-blue" className="p-4 cursor-pointer hover:shadow-lg transition-shadow">
              <div className="flex items-center space-x-3 space-x-reverse">
                <Users className="h-8 w-8 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-slate-800">افزودن مشتری</h3>
                  <p className="text-sm text-slate-600">مشتری جدید اضافه کنید</p>
                </div>
              </div>
            </Card>
            
            <Card variant="gradient-purple" className="p-4 cursor-pointer hover:shadow-lg transition-shadow">
              <div className="flex items-center space-x-3 space-x-reverse">
                <Package className="h-8 w-8 text-purple-600" />
                <div>
                  <h3 className="font-semibold text-slate-800">افزودن محصول</h3>
                  <p className="text-sm text-slate-600">محصول جدید اضافه کنید</p>
                </div>
              </div>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;