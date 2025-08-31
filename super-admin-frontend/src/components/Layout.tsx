import React, { ReactNode } from 'react';
import { Card } from '@/components/ui/card';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-4">
            HesaabPlus Super Admin
          </h1>
          <p className="text-xl text-slate-600">
            پلتفرم مدیریت سیستم حسابداری
          </p>
        </div>
        
        <Card variant="professional" className="max-w-6xl mx-auto">
          <div className="p-8">
            {children}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Layout;