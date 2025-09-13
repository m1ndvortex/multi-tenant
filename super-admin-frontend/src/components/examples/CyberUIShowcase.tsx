/**
 * Cybersecurity UI Components Showcase
 * Demonstrates all enhanced UI components with cybersecurity theming
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Users, 
  Activity, 
  Database, 
  Filter,
  Settings
} from 'lucide-react';

// Import all enhanced components
import { Badge, StatusBadge, NumberBadge } from '@/components/ui/badge';
import { CyberProgress, SystemHealthProgress, LoadingProgress } from '@/components/ui/progress';
import { 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell,
  GlassTable,
  DataTable 
} from '@/components/ui/table';
import { 
  CyberStatCardSkeleton,
  CyberChartSkeleton,
  CyberUserListSkeleton,
  CyberAlertSkeleton,
  LoadingScanLine
} from '@/components/ui/skeleton';
import {
  Form,
  FormField,
  FormLabel,
  FormMessage,
  FormGroup,
  FormActions,
  useFormValidation
} from '@/components/ui/form';
import {
  LoadingSpinner,
  ScanningLoader,
  PulseLoader,
  MatrixLoader,
  SystemStatusLoader,
  FullPageLoader,
  ButtonLoader
} from '@/components/ui/loading';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CyberUIShowcase: React.FC<{ rtl?: boolean }> = ({ rtl = false }) => {
  const [loading, setLoading] = useState(false);
  const [showFullPageLoader, setShowFullPageLoader] = useState(false);
  const [selectedTab, setSelectedTab] = useState('badges');

  const formValidation = useFormValidation({
    username: '',
    email: '',
    role: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const isValid = formValidation.validate({
      username: (value) => !value ? 'Username is required' : null,
      email: (value) => !value ? 'Email is required' : !/\S+@\S+\.\S+/.test(value) ? 'Invalid email' : null,
      role: (value) => !value ? 'Role is required' : null,
    });

    setTimeout(() => {
      setLoading(false);
      if (isValid) {
        alert('Form submitted successfully!');
      }
    }, 2000);
  };

  const sampleTableData = [
    ['John Doe', 'Admin', 'Online', '2024-01-15'],
    ['Jane Smith', 'User', 'Offline', '2024-01-14'],
    ['Bob Johnson', 'Moderator', 'Online', '2024-01-13'],
    ['Alice Brown', 'User', 'Error', '2024-01-12'],
  ];

  const tabs = [
    { id: 'badges', label: rtl ? 'نشان‌ها' : 'Badges', icon: Shield },
    { id: 'progress', label: rtl ? 'نوار پیشرفت' : 'Progress', icon: Activity },
    { id: 'tables', label: rtl ? 'جداول' : 'Tables', icon: Database },
    { id: 'forms', label: rtl ? 'فرم‌ها' : 'Forms', icon: Settings },
    { id: 'loading', label: rtl ? 'بارگذاری' : 'Loading', icon: Users },
    { id: 'skeletons', label: rtl ? 'اسکلتون' : 'Skeletons', icon: Filter },
  ];

  const renderBadgesSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className={`text-lg font-semibold text-[#00D4FF] mb-4 ${rtl ? 'font-[Vazirmatn]' : ''}`}>
          {rtl ? 'نشان‌های پایه' : 'Basic Badges'}
        </h3>
        <div className="flex flex-wrap gap-3">
          <Badge variant="cyber-primary" animated rtl={rtl}>Primary</Badge>
          <Badge variant="cyber-success" animated rtl={rtl}>Success</Badge>
          <Badge variant="cyber-warning" animated rtl={rtl}>Warning</Badge>
          <Badge variant="cyber-danger" animated rtl={rtl}>Danger</Badge>
          <Badge variant="cyber-info" animated rtl={rtl}>Info</Badge>
          <Badge variant="cyber-purple" animated rtl={rtl}>Purple</Badge>
          <Badge variant="cyber-gradient" animated rtl={rtl}>Gradient</Badge>
          <Badge variant="cyber-glass" animated rtl={rtl}>Glass</Badge>
        </div>
      </div>

      <div>
        <h3 className={`text-lg font-semibold text-[#00D4FF] mb-4 ${rtl ? 'font-[Vazirmatn]' : ''}`}>
          {rtl ? 'نشان‌های وضعیت' : 'Status Badges'}
        </h3>
        <div className="flex flex-wrap gap-3">
          <StatusBadge status="online" rtl={rtl}>{rtl ? 'آنلاین' : 'Online'}</StatusBadge>
          <StatusBadge status="offline" rtl={rtl}>{rtl ? 'آفلاین' : 'Offline'}</StatusBadge>
          <StatusBadge status="error" rtl={rtl}>{rtl ? 'خطا' : 'Error'}</StatusBadge>
          <StatusBadge status="warning" rtl={rtl}>{rtl ? 'هشدار' : 'Warning'}</StatusBadge>
          <StatusBadge status="success" rtl={rtl}>{rtl ? 'موفق' : 'Success'}</StatusBadge>
        </div>
      </div>

      <div>
        <h3 className={`text-lg font-semibold text-[#00D4FF] mb-4 ${rtl ? 'font-[Vazirmatn]' : ''}`}>
          {rtl ? 'نشان‌های عددی' : 'Number Badges'}
        </h3>
        <div className="flex flex-wrap gap-3">
          <NumberBadge value={42} variant="primary" rtl={rtl} />
          <NumberBadge value={1337} variant="success" rtl={rtl} />
          <NumberBadge value={999} variant="warning" rtl={rtl} />
          <NumberBadge value={0} variant="danger" rtl={rtl} />
        </div>
      </div>
    </div>
  );

  const renderProgressSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className={`text-lg font-semibold text-[#00D4FF] mb-4 ${rtl ? 'font-[Vazirmatn]' : ''}`}>
          {rtl ? 'نوارهای پیشرفت سایبری' : 'Cyber Progress Bars'}
        </h3>
        <div className="space-y-4">
          <CyberProgress value={75} variant="primary" animated showValue rtl={rtl} />
          <CyberProgress value={60} variant="success" animated showValue rtl={rtl} />
          <CyberProgress value={40} variant="warning" animated showValue rtl={rtl} />
          <CyberProgress value={20} variant="danger" animated showValue rtl={rtl} />
        </div>
      </div>

      <div>
        <h3 className={`text-lg font-semibold text-[#00D4FF] mb-4 ${rtl ? 'font-[Vazirmatn]' : ''}`}>
          {rtl ? 'وضعیت سلامت سیستم' : 'System Health Status'}
        </h3>
        <div className="space-y-4">
          <SystemHealthProgress 
            value={95} 
            label={rtl ? 'پردازنده' : 'CPU Usage'} 
            status="healthy" 
            rtl={rtl} 
          />
          <SystemHealthProgress 
            value={78} 
            label={rtl ? 'حافظه' : 'Memory Usage'} 
            status="warning" 
            rtl={rtl} 
          />
          <SystemHealthProgress 
            value={30} 
            label={rtl ? 'فضای دیسک' : 'Disk Space'} 
            status="critical" 
            rtl={rtl} 
          />
        </div>
      </div>

      <div>
        <h3 className={`text-lg font-semibold text-[#00D4FF] mb-4 ${rtl ? 'font-[Vazirmatn]' : ''}`}>
          {rtl ? 'بارگذاری نامحدود' : 'Indeterminate Loading'}
        </h3>
        <LoadingProgress indeterminate rtl={rtl} />
      </div>
    </div>
  );

  const renderTablesSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className={`text-lg font-semibold text-[#00D4FF] mb-4 ${rtl ? 'font-[Vazirmatn]' : ''}`}>
          {rtl ? 'جدول سایبری' : 'Cyber Table'}
        </h3>
        <DataTable
          headers={rtl ? ['نام', 'نقش', 'وضعیت', 'تاریخ'] : ['Name', 'Role', 'Status', 'Date']}
          data={sampleTableData}
          variant="cyber"
          animated
          rtl={rtl}
          onRowClick={(index) => console.log('Row clicked:', index)}
        />
      </div>

      <div>
        <h3 className={`text-lg font-semibold text-[#00D4FF] mb-4 ${rtl ? 'font-[Vazirmatn]' : ''}`}>
          {rtl ? 'جدول شیشه‌ای' : 'Glass Table'}
        </h3>
        <GlassTable animated rtl={rtl}>
          <TableHeader variant="glass" rtl={rtl}>
            <TableRow variant="glass" rtl={rtl}>
              <TableHead variant="glass" rtl={rtl}>{rtl ? 'شناسه' : 'ID'}</TableHead>
              <TableHead variant="glass" rtl={rtl}>{rtl ? 'نام کاربری' : 'Username'}</TableHead>
              <TableHead variant="glass" rtl={rtl}>{rtl ? 'ایمیل' : 'Email'}</TableHead>
              <TableHead variant="glass" rtl={rtl}>{rtl ? 'عملیات' : 'Actions'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody animated rtl={rtl}>
            {[1, 2, 3].map((id) => (
              <TableRow key={id} variant="glass" animated rtl={rtl}>
                <TableCell variant="glass" rtl={rtl}>{id}</TableCell>
                <TableCell variant="glass" rtl={rtl}>user{id}</TableCell>
                <TableCell variant="glass" rtl={rtl}>user{id}@example.com</TableCell>
                <TableCell variant="glass" rtl={rtl}>
                  <Button variant="cyber-outline" size="sm">
                    {rtl ? 'ویرایش' : 'Edit'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </GlassTable>
      </div>
    </div>
  );

  const renderFormsSection = () => (
    <div className="space-y-6">
      <Form variant="cyber" animated rtl={rtl} onSubmit={handleSubmit}>
        <FormGroup 
          title={rtl ? 'اطلاعات کاربر' : 'User Information'} 
          description={rtl ? 'لطفاً اطلاعات کاربر را وارد کنید' : 'Please enter user information'}
          rtl={rtl}
        >
          <FormField rtl={rtl}>
            <FormLabel variant="cyber" required rtl={rtl}>
              {rtl ? 'نام کاربری' : 'Username'}
            </FormLabel>
            <Input
              variant="cyber-neon"
              placeholder={rtl ? 'نام کاربری خود را وارد کنید' : 'Enter your username'}
              value={formValidation.values.username}
              onChange={(e) => formValidation.setValue('username', e.target.value)}
              className={rtl ? 'text-right' : ''}
            />
            <FormMessage variant="danger" rtl={rtl}>
              {formValidation.errors.username}
            </FormMessage>
          </FormField>

          <FormField rtl={rtl}>
            <FormLabel variant="cyber" required rtl={rtl}>
              {rtl ? 'ایمیل' : 'Email'}
            </FormLabel>
            <Input
              variant="cyber-glass"
              type="email"
              placeholder={rtl ? 'ایمیل خود را وارد کنید' : 'Enter your email'}
              value={formValidation.values.email}
              onChange={(e) => formValidation.setValue('email', e.target.value)}
              className={rtl ? 'text-right' : ''}
            />
            <FormMessage variant="danger" rtl={rtl}>
              {formValidation.errors.email}
            </FormMessage>
          </FormField>

          <FormField rtl={rtl}>
            <FormLabel variant="cyber" required rtl={rtl}>
              {rtl ? 'نقش' : 'Role'}
            </FormLabel>
            <Select 
              value={formValidation.values.role} 
              onValueChange={(value) => formValidation.setValue('role', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={rtl ? 'نقش را انتخاب کنید' : 'Select a role'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">{rtl ? 'مدیر' : 'Admin'}</SelectItem>
                <SelectItem value="user">{rtl ? 'کاربر' : 'User'}</SelectItem>
                <SelectItem value="moderator">{rtl ? 'ناظر' : 'Moderator'}</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage variant="danger" rtl={rtl}>
              {formValidation.errors.role}
            </FormMessage>
          </FormField>
        </FormGroup>

        <FormActions rtl={rtl}>
          <Button 
            type="button" 
            variant="cyber-outline" 
            onClick={formValidation.reset}
          >
            {rtl ? 'پاک کردن' : 'Clear'}
          </Button>
          <Button type="submit" variant="cyber-primary" disabled={loading}>
            <ButtonLoader loading={loading} variant="cyber" rtl={rtl}>
              {rtl ? 'ارسال' : 'Submit'}
            </ButtonLoader>
          </Button>
        </FormActions>
      </Form>
    </div>
  );

  const renderLoadingSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className={`text-lg font-semibold text-[#00D4FF] mb-4 ${rtl ? 'font-[Vazirmatn]' : ''}`}>
          {rtl ? 'اسپینرهای بارگذاری' : 'Loading Spinners'}
        </h3>
        <div className="flex flex-wrap gap-6 items-center">
          <LoadingSpinner variant="cyber" size="sm" />
          <LoadingSpinner variant="cyber" size="default" />
          <LoadingSpinner variant="cyber" size="lg" />
          <LoadingSpinner variant="cyber" size="xl" />
        </div>
      </div>

      <div>
        <h3 className={`text-lg font-semibold text-[#00D4FF] mb-4 ${rtl ? 'font-[Vazirmatn]' : ''}`}>
          {rtl ? 'بارگذار اسکن' : 'Scanning Loader'}
        </h3>
        <ScanningLoader rtl={rtl} height="h-2" speed={1.5} />
      </div>

      <div>
        <h3 className={`text-lg font-semibold text-[#00D4FF] mb-4 ${rtl ? 'font-[Vazirmatn]' : ''}`}>
          {rtl ? 'بارگذار پالس' : 'Pulse Loaders'}
        </h3>
        <div className="flex flex-wrap gap-6 items-center">
          <PulseLoader variant="cyber" size="sm" />
          <PulseLoader variant="success" size="default" />
          <PulseLoader variant="warning" size="lg" />
        </div>
      </div>

      <div>
        <h3 className={`text-lg font-semibold text-[#00D4FF] mb-4 ${rtl ? 'font-[Vazirmatn]' : ''}`}>
          {rtl ? 'بارگذار ماتریکس' : 'Matrix Loader'}
        </h3>
        <MatrixLoader rtl={rtl} />
      </div>

      <div>
        <h3 className={`text-lg font-semibold text-[#00D4FF] mb-4 ${rtl ? 'font-[Vazirmatn]' : ''}`}>
          {rtl ? 'بارگذار وضعیت سیستم' : 'System Status Loader'}
        </h3>
        <SystemStatusLoader rtl={rtl} />
      </div>

      <div>
        <h3 className={`text-lg font-semibold text-[#00D4FF] mb-4 ${rtl ? 'font-[Vazirmatn]' : ''}`}>
          {rtl ? 'بارگذار تمام صفحه' : 'Full Page Loader'}
        </h3>
        <Button 
          variant="cyber-primary" 
          onClick={() => setShowFullPageLoader(true)}
        >
          {rtl ? 'نمایش بارگذار تمام صفحه' : 'Show Full Page Loader'}
        </Button>
        <FullPageLoader 
          visible={showFullPageLoader} 
          variant="scanning"
          message={rtl ? 'در حال بارگذاری داده‌ها...' : 'Loading data...'}
          rtl={rtl}
        />
        {showFullPageLoader && (
          <Button 
            variant="cyber-outline" 
            onClick={() => setShowFullPageLoader(false)}
            className="mt-2"
          >
            {rtl ? 'بستن' : 'Close'}
          </Button>
        )}
      </div>
    </div>
  );

  const renderSkeletonsSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className={`text-lg font-semibold text-[#00D4FF] mb-4 ${rtl ? 'font-[Vazirmatn]' : ''}`}>
          {rtl ? 'اسکلتون کارت آمار' : 'Stat Card Skeleton'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <CyberStatCardSkeleton rtl={rtl} />
          <CyberStatCardSkeleton rtl={rtl} />
          <CyberStatCardSkeleton rtl={rtl} />
        </div>
      </div>

      <div>
        <h3 className={`text-lg font-semibold text-[#00D4FF] mb-4 ${rtl ? 'font-[Vazirmatn]' : ''}`}>
          {rtl ? 'اسکلتون نمودار' : 'Chart Skeleton'}
        </h3>
        <CyberChartSkeleton height="h-64" rtl={rtl} />
      </div>

      <div>
        <h3 className={`text-lg font-semibold text-[#00D4FF] mb-4 ${rtl ? 'font-[Vazirmatn]' : ''}`}>
          {rtl ? 'اسکلتون لیست کاربران' : 'User List Skeleton'}
        </h3>
        <CyberUserListSkeleton count={3} rtl={rtl} />
      </div>

      <div>
        <h3 className={`text-lg font-semibold text-[#00D4FF] mb-4 ${rtl ? 'font-[Vazirmatn]' : ''}`}>
          {rtl ? 'اسکلتون هشدارها' : 'Alerts Skeleton'}
        </h3>
        <CyberAlertSkeleton count={2} rtl={rtl} />
      </div>

      <div>
        <h3 className={`text-lg font-semibold text-[#00D4FF] mb-4 ${rtl ? 'font-[Vazirmatn]' : ''}`}>
          {rtl ? 'خط اسکن بارگذاری' : 'Loading Scan Line'}
        </h3>
        <LoadingScanLine rtl={rtl} className="h-2" />
      </div>
    </div>
  );

  const renderContent = () => {
    switch (selectedTab) {
      case 'badges':
        return renderBadgesSection();
      case 'progress':
        return renderProgressSection();
      case 'tables':
        return renderTablesSection();
      case 'forms':
        return renderFormsSection();
      case 'loading':
        return renderLoadingSection();
      case 'skeletons':
        return renderSkeletonsSection();
      default:
        return renderBadgesSection();
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-[#0B0E1A] to-[#1A1D29] p-6 ${rtl ? 'font-[Vazirmatn]' : ''}`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className={`text-4xl font-bold text-[#00D4FF] mb-2 drop-shadow-[0_0_20px_rgba(0,212,255,0.5)] ${rtl ? 'font-[Vazirmatn]' : ''}`}>
            {rtl ? 'نمایشگاه اجزای رابط کاربری سایبری' : 'Cybersecurity UI Components Showcase'}
          </h1>
          <p className={`text-white/70 text-lg ${rtl ? 'font-[Vazirmatn]' : ''}`}>
            {rtl ? 'مجموعه کاملی از اجزای رابط کاربری با تم سایبری، افکت‌های شیشه‌ای و انیمیشن‌های نئون' : 'Complete collection of cybersecurity-themed UI components with glassmorphism and neon effects'}
          </p>
        </motion.div>

        {/* Navigation Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className={`flex flex-wrap gap-2 p-2 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md ${rtl ? 'flex-row-reverse' : ''}`}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300
                  ${selectedTab === tab.id 
                    ? 'bg-[#00D4FF]/20 text-[#00D4FF] shadow-[0_0_15px_rgba(0,212,255,0.3)]' 
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }
                  ${rtl ? 'flex-row-reverse font-[Vazirmatn]' : ''}
                `}
              >
                <tab.icon className="h-4 w-4" />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Content */}
        <motion.div
          key={selectedTab}
          initial={{ opacity: 0, x: rtl ? 20 : -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="glass-card-crypto rounded-2xl p-8"
        >
          {renderContent()}
        </motion.div>
      </div>
    </div>
  );
};

export default CyberUIShowcase;