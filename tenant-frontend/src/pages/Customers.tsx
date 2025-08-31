import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Customers: React.FC = () => {
  return (
    <Card variant="professional">
      <CardHeader>
        <CardTitle>مدیریت مشتریان</CardTitle>
      </CardHeader>
      <CardContent>
        <p>صفحه مدیریت مشتریان در حال توسعه است...</p>
      </CardContent>
    </Card>
  );
};

export default Customers;