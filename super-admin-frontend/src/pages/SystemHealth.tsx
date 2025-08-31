import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const SystemHealth: React.FC = () => {
  return (
    <Card variant="professional">
      <CardHeader>
        <CardTitle>وضعیت سیستم</CardTitle>
      </CardHeader>
      <CardContent>
        <p>صفحه نظارت بر وضعیت سیستم در حال توسعه است...</p>
      </CardContent>
    </Card>
  );
};

export default SystemHealth;