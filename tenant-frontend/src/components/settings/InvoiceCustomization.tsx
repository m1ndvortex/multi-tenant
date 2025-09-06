import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Palette, Settings, Hash, Layout } from 'lucide-react';
import TemplateDesigner from './invoice-customization/TemplateDesigner';
import BrandingCustomization from './invoice-customization/BrandingCustomization';
import CustomFieldManager from './invoice-customization/CustomFieldManager';
import NumberingSchemeManager from './invoice-customization/NumberingSchemeManager';
import InvoicePreview from './invoice-customization/InvoicePreview';

const InvoiceCustomization: React.FC = () => {
  const [activeTab, setActiveTab] = useState('templates');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100/80 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">سفارشی‌سازی فاکتور</h1>
            <p className="text-gray-600">طراحی و تنظیم قالب‌های فاکتور، برندینگ و فیلدهای سفارشی</p>
          </div>
        </div>
      </div>

      {/* Customization Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="bg-gradient-to-r from-purple-50 via-pink-50 to-blue-50 rounded-xl p-1">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 bg-transparent gap-1">
            <TabsTrigger 
              value="templates" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-purple-300"
            >
              <Layout className="h-4 w-4 ml-2" />
              قالب‌ها
            </TabsTrigger>
            <TabsTrigger 
              value="branding"
              className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-pink-300"
            >
              <Palette className="h-4 w-4 ml-2" />
              برندینگ
            </TabsTrigger>
            <TabsTrigger 
              value="custom-fields"
              className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-blue-300"
            >
              <Settings className="h-4 w-4 ml-2" />
              فیلدهای سفارشی
            </TabsTrigger>
            <TabsTrigger 
              value="numbering"
              className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-indigo-300"
            >
              <Hash className="h-4 w-4 ml-2" />
              شماره‌گذاری
            </TabsTrigger>
            <TabsTrigger 
              value="preview"
              className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-green-300"
            >
              <FileText className="h-4 w-4 ml-2" />
              پیش‌نمایش
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="templates" className="space-y-6">
          <TemplateDesigner />
        </TabsContent>

        <TabsContent value="branding" className="space-y-6">
          <BrandingCustomization />
        </TabsContent>

        <TabsContent value="custom-fields" className="space-y-6">
          <CustomFieldManager />
        </TabsContent>

        <TabsContent value="numbering" className="space-y-6">
          <NumberingSchemeManager />
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <InvoicePreview />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InvoiceCustomization;