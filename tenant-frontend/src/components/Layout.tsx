import React, { ReactNode } from 'react';
import { Card } from '@/components/ui/card';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50/30 to-white">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-4">
            HesaabPlus
          </h1>
          <p className="text-xl text-slate-600">
            سیستم مدیریت کسب و کار
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