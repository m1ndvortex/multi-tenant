import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Products: React.FC = () => {
  return (
    <Card variant="professional">
      <CardHeader>
        <CardTitle>مدیریت محصولات</CardTitle>
      </CardHeader>
      <CardContent>
        <p>صفحه مدیریت محصولات در حال توسعه است...</p>
      </CardContent>
    </Card>
  );
};

export default Products;