import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Accounting: React.FC = () => {
  return (
    <Card variant="professional">
      <CardHeader>
        <CardTitle>حسابداری</CardTitle>
      </CardHeader>
      <CardContent>
        <p>صفحه حسابداری در حال توسعه است...</p>
      </CardContent>
    </Card>
  );
};

export default Accounting;